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
        if (!customName && product.title) {
          const rawExt = targetUrl ? targetUrl.split('?')[0].toLowerCase() : '';
          const ext = rawExt.endsWith('.exe') ? '.exe' : (rawExt.endsWith('.zip') ? '.zip' : '.apk');
          customName = `${product.title.replace(/[^a-zA-Z0-9_-]/g, '_')}${ext}`;
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

  if (!targetUrl || targetUrl === '#' || !targetUrl.startsWith('http')) {
    return new Response(
      JSON.stringify({ error: 'Download file not found or invalid URL.' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // If user requested direct redirect mode, or if target is a GitHub release/tag/repo webpage
  const cleanTarget = targetUrl.split('?')[0].toLowerCase();
  const isWebPage = cleanTarget.includes('/releases/tag/') || 
                    cleanTarget.endsWith('/releases') || 
                    cleanTarget.includes('/tree/') || 
                    cleanTarget.includes('/blob/') ||
                    (!cleanTarget.includes('/releases/download/') && !/\.(apk|exe|zip|dmg|tar\.gz|msi|pkg|bin|pdf)$/i.test(cleanTarget));

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

    // If upstream returns an HTML webpage instead of a binary file, redirect directly to GitHub
    const upContentType = upstreamRes.headers.get('content-type') || '';
    if (upContentType.includes('text/html')) {
      return Response.redirect(targetUrl, 302);
    }

    // 4. Derive clean, safe filename
    let finalFileName = customName;
    if (!finalFileName) {
      try {
        const pathname = new URL(targetUrl).pathname;
        finalFileName = pathname.substring(pathname.lastIndexOf('/') + 1) || 'package.apk';
      } catch (e) {
        finalFileName = 'package.apk';
      }
    }

    // Ensure correct extension
    const cleanLower = targetUrl.split('?')[0].toLowerCase();
    let detectedExt = '.apk';
    if (cleanLower.endsWith('.exe')) detectedExt = '.exe';
    else if (cleanLower.endsWith('.zip')) detectedExt = '.zip';
    else if (cleanLower.endsWith('.dmg')) detectedExt = '.dmg';
    else if (cleanLower.endsWith('.tar.gz')) detectedExt = '.tar.gz';
    else if (cleanLower.endsWith('.pdf')) detectedExt = '.pdf';
    else if (cleanLower.endsWith('.json')) detectedExt = '.json';
    else if (cleanLower.endsWith('.txt')) detectedExt = '.txt';

    // If filename has no extension, append detected extension
    if (!/\.[a-zA-Z0-9]{2,5}$/.test(finalFileName)) {
      finalFileName += detectedExt;
    }

    // 5. Derive Content-Type
    let contentType = upstreamRes.headers.get('content-type') || 'application/octet-stream';
    if (finalFileName.endsWith('.apk')) {
      contentType = 'application/vnd.android.package-archive';
    } else if (finalFileName.endsWith('.exe')) {
      contentType = 'application/x-msdownload';
    } else if (finalFileName.endsWith('.zip')) {
      contentType = 'application/zip';
    }

    // 6. Build headers to force file download dialog in browser
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Disposition', `attachment; filename="${encodeURIComponent(finalFileName)}"`);
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
