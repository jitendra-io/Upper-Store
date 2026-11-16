/**
 * Cloudflare Pages Edge Function: /api/download
 * 
 * Intercepts binary package downloads (.apk, .exe, .zip) at Cloudflare's global edge.
 * Fetches the binary from GitHub Releases / storage with redirect: 'follow'
 * and streams it directly to the user's browser.
 * 
 * Result:
 * 1. 100% Hidden GitHub URL - Chrome download tray says "Downloaded from upperstore.pages.dev"
 * 2. 0% Load on Render backend
 * 3. Gigabit global CDN streaming with edge caching
 */

// Dynamic helper to extract extension from URL or filename
const detectExtension = (targetUrl) => {
  if (!targetUrl || typeof targetUrl !== 'string') return '';
  const clean = targetUrl.split('?')[0].split('#')[0].toLowerCase();
  
  // Compound extensions
  const compoundMatch = clean.match(/\.tar\.(gz|bz2|xz|zst|br)$/i);
  if (compoundMatch) return compoundMatch[0].toLowerCase();

  // General extension
  const match = clean.match(/\.([a-zA-Z0-9_-]{1,15})$/i);
  if (match) {
    const ext = match[0].toLowerCase();
    const webExts = ['.html', '.htm', '.php', '.asp', '.aspx', '.jsp', '.cgi'];
    if (!webExts.includes(ext)) return ext;
  }
  return '';
};

// Map package extension to proper MIME Content-Type
const getMimeTypeForExtension = (ext) => {
  const e = (ext || '').toLowerCase().replace(/^\./, '');
  const mimeMap = {
    apk: 'application/vnd.android.package-archive',
    aab: 'application/octet-stream',
    vsix: 'application/vnd.visx',
    crx: 'application/x-chrome-extension',
    xpi: 'application/x-xpinstall',
    whl: 'application/x-wheel+zip',
    jar: 'application/java-archive',
    exe: 'application/x-msdownload',
    msi: 'application/x-msdownload',
    zip: 'application/zip',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    'tar.gz': 'application/gzip',
    tgz: 'application/gzip',
    bz2: 'application/x-bzip2',
    xz: 'application/x-xz',
    dmg: 'application/x-apple-diskimage',
    pkg: 'application/octet-stream',
    deb: 'application/vnd.debian.binary-package',
    rpm: 'application/x-rpm',
    appimage: 'application/octet-stream',
    iso: 'application/x-iso9660-image',
    pdf: 'application/pdf',
    json: 'application/json',
    gguf: 'application/octet-stream',
    safetensors: 'application/octet-stream',
    onnx: 'application/octet-stream',
    bin: 'application/octet-stream',
  };
  return mimeMap[e] || 'application/octet-stream';
};

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const productId = url.searchParams.get('id');
  const encodedFile = url.searchParams.get('file');
  let customName = url.searchParams.get('name') || '';

  let targetUrl = '';

  // 1. Resolve Target URL via product ID if provided
  if (productId) {
    try {
      const backendUrl = 'https://upper-store.onrender.com';
      const prodRes = await fetch(`${backendUrl}/api/products/${encodeURIComponent(productId)}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'UpperStore-Cloudflare-Worker/1.0'
        }
      });

      if (prodRes.ok) {
        const product = await prodRes.json();
        targetUrl = product.apkFile;
        const exactDevFn = product.originalFilename || product.securityDetails?.fileName || '';
        if (exactDevFn && detectExtension(exactDevFn)) {
          customName = exactDevFn;
        } else if (!customName && product.title) {
          const ext = detectExtension(targetUrl) || '.bin';
          customName = `${product.title.replace(/[^a-zA-Z0-9._-]/g, '_')}${ext}`;
        }
      }
    } catch (err) {
      console.error('Error fetching product from backend:', err);
    }
  }

  // 2. Fallback to obfuscated file parameter
  if (!targetUrl && encodedFile) {
    try {
      let b64 = encodedFile.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      targetUrl = atob(b64);
    } catch (e) {
      targetUrl = decodeURIComponent(encodedFile);
    }
  }

  if (targetUrl && targetUrl.startsWith('/')) {
    targetUrl = `https://upper-store.onrender.com${targetUrl}`;
  }

  if (!targetUrl || targetUrl === '#' || !targetUrl.startsWith('http')) {
    return new Response(
      JSON.stringify({ error: 'Download file not found or invalid URL.' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const detectedExt = detectExtension(targetUrl);

  // If user requested direct redirect mode, or if target is a GitHub release/tag/repo webpage
  const cleanTarget = targetUrl.split('?')[0].toLowerCase();
  const hasReleaseDownload = cleanTarget.includes('/releases/download/');
  const hasDetectedExt = Boolean(detectedExt);
  const isWebPage = cleanTarget.includes('/releases/tag/') || 
                    cleanTarget.endsWith('/releases') || 
                    cleanTarget.includes('/tree/') || 
                    cleanTarget.includes('/blob/') ||
                    (!hasReleaseDownload && !hasDetectedExt);

  if (url.searchParams.get('mode') === 'redirect' || isWebPage) {
    return Response.redirect(targetUrl, 302);
  }

  try {
    // 3. Fetch binary from GitHub Releases / remote storage
    // GitHub redirects release downloads to AWS S3; redirect: 'follow' resolves this transparently at the edge
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'UpperStore-Cloudflare-Proxy/1.0',
        'Accept': '*/*'
      },
      redirect: 'follow'
    });

    if (!upstreamRes.ok) {
      return new Response(`Upstream storage returned error ${upstreamRes.status}`, {
        status: upstreamRes.status
      });
    }

    // If upstream returns an HTML error/webpage instead of a binary file, return error without leaking upstream URL
    const upContentType = upstreamRes.headers.get('content-type') || '';
    if (upContentType.includes('text/html')) {
      return new Response(JSON.stringify({ error: 'Upstream release asset not found or inaccessible.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. Derive clean, safe filename with authentic extension
    let finalFileName = customName;
    if (!finalFileName) {
      try {
        const pathname = new URL(targetUrl).pathname;
        finalFileName = decodeURIComponent(pathname.substring(pathname.lastIndexOf('/') + 1)) || `package${detectedExt || '.bin'}`;
      } catch (e) {
        finalFileName = `package${detectedExt || '.bin'}`;
      }
    }

    // If finalFileName ends with placeholder (.bin or .apk) while targetUrl has distinct authentic extension, replace it
    if (detectedExt && detectedExt !== '.bin') {
      if (finalFileName.toLowerCase().endsWith('.bin') || finalFileName.toLowerCase().endsWith('.apk')) {
        finalFileName = finalFileName.replace(/\.(bin|apk)$/i, '') + detectedExt;
      }
    }

    // If filename has no extension, append detected extension
    if (!/\.[a-zA-Z0-9_-]{1,15}$/.test(finalFileName)) {
      finalFileName += (detectedExt || '.bin');
    }

    // 5. Derive Content-Type
    const cleanFileLower = finalFileName.toLowerCase();
    let contentType = upstreamRes.headers.get('content-type') || '';
    if (!contentType || contentType.includes('text/plain') || contentType.includes('application/octet-stream')) {
      contentType = getMimeTypeForExtension(detectedExt || cleanFileLower.match(/\.[a-zA-Z0-9_-]+$/)?.[0] || '');
    } else if (cleanFileLower.endsWith('.vsix')) {
      contentType = 'application/vnd.visx';
    } else if (cleanFileLower.endsWith('.apk')) {
      contentType = 'application/vnd.android.package-archive';
    }

    // 6. Build headers to force file download dialog in browser with RFC 6266 compliance
    const responseHeaders = new Headers();
    const safeAsciiFilename = finalFileName.replace(/["\r\n\\]/g, '_');
    responseHeaders.set('Content-Disposition', `attachment; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodeURIComponent(finalFileName)}`);
    responseHeaders.set('Content-Type', contentType);

    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }

    // Edge CDN caching: Cache release packages at the Cloudflare edge for 24 hours
    responseHeaders.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    // 7. Stream the response directly to the user
    return new Response(upstreamRes.body, {
      status: 200,
      headers: responseHeaders
    });
  } catch (error) {
    return new Response(`Cloudflare edge download proxy error: ${error.message}`, {
      status: 500
    });
  }
}
