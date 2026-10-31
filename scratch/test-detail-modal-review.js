const { spawn } = require('child_process');
const http = require('http');

async function main() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProc = spawn(chromePath, [
    '--headless',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--user-data-dir=' + require('os').tmpdir() + '/chrome-test-detail-' + Date.now(),
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

    console.log('Opening product detail modal...');
    // Click 'Get' button on the first product card to open ProductDetailModal
    const openDetail = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = document.querySelector('.product-card .download-btn');
          if (!btn) return 'No Get button found';
          btn.click();
          return 'Clicked Get button';
        })()
      `,
      returnByValue: true
    });
    console.log('Open Detail result:', openDetail.result.value);

    await new Promise(r => setTimeout(r, 1000));

    // Now click the 5-star rating badge INSIDE ProductDetailModal
    const clickStarInDetail = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const badge = document.querySelector('.product-detail-modal-card .star-rating-badge');
          if (!badge) return 'No star rating badge inside detail modal';
          badge.click();
          return 'Clicked star badge inside ProductDetailModal';
        })()
      `,
      returnByValue: true
    });
    console.log('Click star in detail result:', clickStarInDetail.result.value);

    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 300));
      const status = await send('Runtime.evaluate', {
        expression: `
          (() => {
            const reviewsModals = document.querySelectorAll('.reviews-modal-card').length;
            const detailModals = document.querySelectorAll('.product-detail-modal-card').length;
            const backdrops = document.querySelectorAll('.reviews-modal-backdrop').length;
            return {
              reviewsModals,
              detailModals,
              backdrops
            };
          })()
        `,
        returnByValue: true
      });
      console.log(`[T+${(i+1)*300}ms]`, status.result.value);
    }
  } finally {
    chromeProc.kill();
  }
}

main().catch(console.error);

