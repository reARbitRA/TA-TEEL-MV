// probe C: rAF duty-cycle over 60s under different launch flags.
// usage: node probe-rate.js ["flag1","flag2",...]
const extra = process.argv[2] ? JSON.parse(process.argv[2]) : [];
(async () => {
  const c = require('@sparticuz/chromium').default;
  const exe = await c.executablePath();
  const puppeteer = require('puppeteer-core');
  const browser = await puppeteer.launch({
    executablePath: exe,
    args: [...c.args, '--autoplay-policy=no-user-gesture-required',
      '--allow-file-access-from-files', ...extra],
    headless: process.env.HL || 'shell',
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  page.on('pageerror', e => console.log('PAGEERROR', e.message.slice(0, 200)));
  await page.goto('file:///home/user/TA-TEEL-MV/game.html', { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__game && window.__game.state === 'title', { timeout: 20000 });
  await page.click('canvas', { offset: { x: 640, y: 448 } });
  await page.waitForFunction(() => window.__game.state === 'play', { timeout: 10000 });
  await page.evaluate(() => { window.__game.setVirtual(true, 0); });

  // self-measuring windows: rAF count vs wall time (ground truth, no dt cap)
  await page.evaluate(() => {
    const G = window.__game;
    window.__rate = [];
    const w0 = performance.now();
    let n = 0, last = w0;
    const frames = [];
    function tick(t) { n++; last = t; requestAnimationFrame(tick); }
    requestAnimationFrame(tick);
    const iv = setInterval(() => {
      const w1 = performance.now();
      window.__rate.push({
        wall: Math.round(w1 - w0),
        rafPerSec: +(n / ((w1 - (window.__lastMark || w0)) / 1000)).toFixed(1),
        vtPerSec: +((G.time - (window.__lastVt || 0)) / ((w1 - (window.__lastMark || w0)) / 1000)).toFixed(3),
        fpsGetter: +G.fps.toFixed(0),
      });
      window.__lastMark = w1; window.__lastVt = G.time; n = 0;
    }, 5000);
    setTimeout(() => clearInterval(iv), 152000);
  });
  await new Promise(r => setTimeout(r, 158000)); // silence
  const rate = await page.evaluate(() => window.__rate);
  console.log('FLAGS: ' + JSON.stringify(extra));
  for (const r of rate) console.log(JSON.stringify(r));
  process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
