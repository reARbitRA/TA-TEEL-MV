// probe: why did the m5→m6 mission swap freeze? sample MSTATE internals around 155→175.
const path = require('path');
const REPO = '/home/user/TA-TEEL-MV';
const sleep = ms => new Promise(r => setTimeout(r, ms));
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
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));
  await page.goto('file://' + path.join(REPO, 'game.html'), { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__game && window.__game.state === 'title', { timeout: 20000 });
  await page.click('canvas', { offset: { x: 640, y: 448 } });
  await page.waitForFunction(() => window.__game.state === 'play', { timeout: 10000 });
  await page.evaluate(() => window.__game.setVirtual(true, 0));
  await sleep(300);
  // all synchronous: seek into m4, warm the fade, then sample around the m5→m6 boundary
  const out = await page.evaluate(() => {
    const G = window.__game;
    G.seek(81.0);
    for (let i = 0; i < 60; i++) G.vtAdvance(0.1, true); // ~6s: fade out, swap, fade in
    const log = [];
    for (let i = 0; i < 1000; i++) {
      G.vtAdvance(0.1, true); // no render
      const t = G.time;
      if (i % 10 === 0 || (t > 155 && i % 3 === 0)) {
        log.push(t.toFixed(1) + ' id=' + MSTATE.id + ' mdef=' + (missionAt(t) || { id: '?' }).id +
          ' fadeDir=' + MSTATE.fadeDir + ' fadeA=' + MSTATE.fadeA.toFixed(2) +
          ' pend=' + (MSTATE.pending ? MSTATE.pending.id : '-') +
          ' m=' + (MSTATE.m ? MSTATE.m.id : 'null') + ' phase=' + MSTATE.phase);
      }
      if (t > 176) break;
    }
    return log;
  });
  for (const l of out) console.log(l);
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
