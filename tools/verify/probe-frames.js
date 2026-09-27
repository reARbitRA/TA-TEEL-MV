// probe: does the page run at full speed with ZERO evaluate churn?
// in-page: drive m1 start → (200,225), log fps/pos/vt every 500ms; fetch once at end.
const path = require('path');
(async () => {
  const c = require('@sparticuz/chromium').default;
  const exe = await c.executablePath();
  const puppeteer = require('puppeteer-core');
  const browser = await puppeteer.launch({
    executablePath: exe,
    args: [...c.args, '--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files'],
    headless: 'shell',
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  page.on('pageerror', e => console.log('PAGEERROR', e.message.slice(0, 300)));
  await page.goto('file:///home/user/TA-TEEL-MV/game.html', { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__game && window.__game.state === 'title', { timeout: 20000 });
  await page.click('canvas', { offset: { x: 640, y: 448 } });
  await page.waitForFunction(() => window.__game.state === 'play', { timeout: 10000 });
  await page.evaluate(() => { window.__game.setVirtual(true, 0); });
  // fresh m1 via double swap
  await page.evaluate(() => window.__game.seek(35.0));
  await new Promise(r => setTimeout(r, 1500));
  await page.evaluate(() => window.__game.seek(0.0));
  await new Promise(r => setTimeout(r, 1500));

  // install in-page logger + drive, then GO DARK (no evaluates) for 12s
  await page.evaluate(() => {
    window.__log = [];
    window.__game.drive({ x: 200, y: 225, run: false, tol: 16 });
    const t0 = performance.now();
    window.__int = setInterval(() => {
      const g = window.__game;
      window.__log.push({
        wall: Math.round(performance.now() - t0),
        fps: +g.fps.toFixed(1),
        p: g.player,
        vt: +g.time.toFixed(2),
        arrived: g.driveArrived,
        paused: g.paused,
      });
      if (window.__log.length >= 24) clearInterval(window.__int);
    }, 500);
  });
  await new Promise(r => setTimeout(r, 13500)); // total silence
  const log = await page.evaluate(() => window.__log);
  for (const e of log) console.log(JSON.stringify(e));
  process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
