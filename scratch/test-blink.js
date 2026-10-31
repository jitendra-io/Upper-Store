const { spawn } = require('child_process');
const http = require('http');

async function main() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProc = spawn(chromePath, [
    '--headless',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--user-data-dir=' + require('os').tmpdir() + '/chrome-test-' + Date.now(),
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
    if (!page) {
      console.log('No page target found');
      return;
    }

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

    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        console.log('[Browser Console]', msg.params.type, msg.params.args.map(a => a.value || a.description).join(' '));
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        console.error('[Browser Error]', msg.params.exceptionDetails);
      }
    });

    await send('Runtime.enable');

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

    console.log('Reloading with VIP user...');
    await new Promise(r => setTimeout(r, 2500));

    // Evaluate click on the first star rating badge
    const clickResult = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const badge = document.querySelector('.star-rating-badge');
          if (!badge) return 'No star rating badge found!';
          badge.click();
          return 'Clicked star rating badge! Found: ' + badge.innerText;
        })()
      `,
      returnByValue: true
    });
    console.log('Click result:', clickResult.result.value);

    // Now monitor DOM and state over 8 seconds with higher sampling
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 300));
      const modalInfo = await send('Runtime.evaluate', {
        expression: `
          (() => {
            const modal = document.querySelector('.reviews-modal-card');
            const backdrop = document.querySelector('.reviews-modal-backdrop');
            const loading = document.querySelector('.reviews-loading');
            const reviewsCount = document.querySelectorAll('.review-comment-card').length;
            const avatars = document.querySelectorAll('.vip-avatar-wrap');
            return {
              hasModal: !!modal,
              hasLoading: !!loading,
              reviewsCount,
              avatarsCount: avatars.length,
              modalHtmlLen: modal ? modal.innerHTML.length : 0
            };
          })()
        `,
        returnByValue: true
      });
      console.log(`[T+${(i+1)*300}ms]`, modalInfo.result.value);
    }

  } finally {
    chromeProc.kill();
  }
}

main().catch(console.error);
