const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

async function main() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProc = spawn(chromePath, [
    '--headless',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,800',
    '--user-data-dir=' + require('os').tmpdir() + '/chrome-frames-' + Date.now(),
    'http://localhost:5173/products'
  ]);

  try {
    await new Promise(r => setTimeout(r, 2500));

    const targets = await new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:9222/json', res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);
    });

    const page = targets.find(t => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    let id = 1;
    const send = (method, params = {}) => new Promise((resolve) => {
      const msgId = id++;
      const handler = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === msgId) {
          ws.removeEventListener('message', handler);
          resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });

    await new Promise(r => ws.onopen = r);

    await send('Runtime.enable');
    await send('Page.enable');

    // Inject VIP user session
    await send('Runtime.evaluate', {
      expression: `
        localStorage.setItem('upper_user_token', 'mock_token');
        localStorage.setItem('upper_user_data', JSON.stringify({
          email: 'kumar.jkm.io@gmail.com',
          displayName: 'jitendra.io',
          username: 'jitendra',
          photoURL: 'https://lh3.googleusercontent.com/a/ACg8ocKM88nUyOR-8nvQS0G_SpwV1N7zokOJ55Ckwqm0y73AIzTFWxE=s96-c',
          membership: {
            plan: 'elite',
            badge: 'purple',
            validUntil: '2028-12-31T23:59:59.000Z'
          }
        }));
        location.reload();
      `
    });

    console.log('Reloaded with VIP user, waiting for page load...');
    await new Promise(r => setTimeout(r, 2500));

    // Click the 5-star rating badge
    const clickRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const badge = document.querySelector('.star-rating-badge');
          if (!badge) return 'No badge';
          badge.click();
          return 'Clicked';
        })()
      `,
      returnByValue: true
    });
    console.log('Click result:', clickRes.result.value);

    const outDir = path.join(__dirname, 'frames');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    // Capture 12 frames over 3 seconds
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 250));
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const buf = Buffer.from(shot.data, 'base64');
      fs.writeFileSync(path.join(outDir, `frame_${i}.png`), buf);
      console.log(`Saved frame_${i}.png (${buf.length} bytes)`);
    }

  } finally {
    chromeProc.kill();
  }
}

main().catch(console.error);

