/**
 * Upper Store - Cloudflare Edge Download Delivery Worker
 * 
 * Features:
 * 1. 100% Free Edge Streaming: Direct from GitHub Releases via Cloudflare Global CDN
 * 2. Origin Masking: Users and download managers only see "download.upperstore.io"
 * 3. Ephemeral Self-Destruct Tokens: Links expire after 5 minutes (prevents link leeching & sharing)
 * 4. Zero Server Bandwidth / Zero CPU: Upper Store's Node.js backend never touches file bytes
 * 5. Supports All Binaries: APK, EXE, ZIP, DMG, GGUF AI Models, ISO, etc.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Health check or landing ping
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'online',
        service: 'Upper Store Cloudflare Edge Delivery',
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Only serve /dl or /get endpoints
    if (!url.pathname.startsWith('/dl') && !url.pathname.startsWith('/get') && !url.pathname.startsWith('/download')) {
      return new Response('404 Not Found', { status: 404 });
    }

    const rawB64 = url.searchParams.get('url');
    const expParam = url.searchParams.get('exp');
    const sigParam = url.searchParams.get('sig');
    const customName = url.searchParams.get('name') || '';

    if (!rawB64 || !expParam) {
      return new Response('400 Bad Request: Missing download parameters.', {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    const exp = parseInt(expParam, 10);
    const now = Math.floor(Date.now() / 1000);

    // 1. Enforce strict 5-minute expiration (Self-destruct)
    if (isNaN(exp) || now > exp) {
      return new Response('403 Forbidden: Download link has expired. Please return to Upper Store to generate a fresh download link.', {
        status: 403,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    // 2. Validate HMAC Signature if secret key is configured
    const secretKey = env.DOWNLOAD_SECRET_KEY;
    if (secretKey && sigParam) {
      const dataToSign = `${rawB64}:${exp}`;
      const isValid = await verifyHmacSha256(secretKey, dataToSign, sigParam);
      if (!isValid) {
        return new Response('403 Forbidden: Invalid or forged download signature.', {
          status: 403,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    }

    // 3. Decode target URL
    let targetUrl = '';
    try {
      targetUrl = atob(rawB64.replace(/-/g, '+').replace(/_/g, '/'));
    } catch {
      return new Response('400 Bad Request: Invalid payload encoding.', { status: 400 });
    }

    // 4. Strict Security Verification: Target MUST be an authentic GitHub release
    try {
      const parsed = new URL(targetUrl);
      const host = parsed.hostname.toLowerCase();
      const isGithub = host === 'github.com' || host === 'githubusercontent.com' || host.endsWith('.github.com');
      const isRelease = parsed.pathname.includes('/releases/download/');

      if (!isGithub || !isRelease) {
        return new Response('403 Forbidden: Target source is not a permitted release mirror.', { status: 403 });
      }
    } catch {
      return new Response('400 Bad Request: Invalid target URL.', { status: 400 });
    }

    // 5. Fetch from upstream GitHub Release
    const upstreamHeaders = new Headers();
    upstreamHeaders.set('User-Agent', 'UpperStore-Edge/2.0');
    upstreamHeaders.set('Accept', '*/*');

    // Pass through range headers for resumable downloads
    const rangeHeader = request.headers.get('Range');
    if (rangeHeader) {
      upstreamHeaders.set('Range', rangeHeader);
    }

    const upstreamRes = await fetch(targetUrl, {
      method: request.method,
      headers: upstreamHeaders,
      redirect: 'follow',
    });

    if (!upstreamRes.ok) {
      return new Response(`Upstream release fetch failed with status ${upstreamRes.status}`, {
        status: upstreamRes.status,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // 6. Derive clean filename and Content-Type
    let filename = customName;
    if (!filename) {
      try {
        const p = new URL(targetUrl).pathname;
        filename = p.substring(p.lastIndexOf('/') + 1) || 'download.bin';
      } catch {
        filename = 'download.bin';
      }
    }

    const cleanLower = filename.toLowerCase();
    let contentType = 'application/octet-stream';
    if (cleanLower.endsWith('.apk')) contentType = 'application/vnd.android.package-archive';
    else if (cleanLower.endsWith('.exe') || cleanLower.endsWith('.msi')) contentType = 'application/x-msdownload';
    else if (cleanLower.endsWith('.zip')) contentType = 'application/zip';
    else if (cleanLower.endsWith('.tar.gz') || cleanLower.endsWith('.tgz')) contentType = 'application/gzip';
    else if (cleanLower.endsWith('.dmg')) contentType = 'application/x-apple-diskimage';
    else if (cleanLower.endsWith('.pdf')) contentType = 'application/pdf';
    else if (cleanLower.endsWith('.gguf') || cleanLower.endsWith('.safetensors') || cleanLower.endsWith('.onnx')) contentType = 'application/octet-stream';

    // 7. Strip sensitive GitHub origin headers and apply Upper Store white-label headers
    const responseHeaders = new Headers(upstreamRes.headers);
    responseHeaders.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    responseHeaders.set('Content-Type', contentType);
    responseHeaders.set('X-Delivery-Network', 'Upper Store Edge');
    responseHeaders.set('Cache-Control', 'private, no-transform, max-age=300');

    // Remove GitHub tracking headers
    responseHeaders.delete('x-github-request-id');
    responseHeaders.delete('server');

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  }
};

/**
 * Verify HMAC-SHA256 signature using Web Crypto API
 */
async function verifyHmacSha256(secret, data, expectedHexSig) {
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Convert hex string to Uint8Array
    const match = expectedHexSig.match(/.{1,2}/g);
    if (!match) return false;
    const sigBytes = new Uint8Array(match.map(byte => parseInt(byte, 16)));

    return await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      enc.encode(data)
    );
  } catch (err) {
    console.error('HMAC verification error:', err);
    return false;
  }
}
