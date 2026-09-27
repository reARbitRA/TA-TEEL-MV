// probe: m6 rotunda crossing, fully synchronous (no wall-time waits)
const path = require('path');
const REPO = '/home/user/TA-TEEL-MV';
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

  const out = await page.evaluate(() => {
    const G = window.__game;
    const log = [];
    const adv = (n) => { for (let i = 0; i < n; i++) G.vtAdvance(0.1, true); };
    const syncDrive = (x, y, maxTicks) => {
      G.drive({ x, y, run: true, tol: 22 });
      for (let i = 0; i < maxTicks; i++) {
        G.vtAdvance(0.1, true);
        if (G.driveArrived) break;
      }
      const ok = G.driveArrived; G.drive(null);
      return ok;
    };
    G.seek(168.0); // m6 blackout window (step 22 @167.08 already fired? check)
    adv(15);
    log.push('t=' + G.time.toFixed(1) + ' id=' + MSTATE.id + ' dark=' + M6.blackout + ' phase=' + MSTATE.phase + ' p=' + JSON.stringify(G.player));
    if (!M6.blackout) { // fire it via seek-back if the step got eaten by the swap
      G.seek(166.5); adv(10);
      log.push('after re-seek: dark=' + M6.blackout + ' (step22 re-fired on crossing)');
    }
    syncDrive(934, 1160, 60);
    log.push('park: p=' + JSON.stringify(G.player) + ' t=' + G.time.toFixed(1) + ' div=' + M6.div.x.toFixed(0));
    // wait for the div's west pause then dash
    let dashed = 0;
    const trail = [];
    for (let i = 0; i < 350 && G.time < 172.0; i++) {
      G.vtAdvance(0.1, true);
      const dv = M6.div;
      if (dashed === 0 && dv.x <= 884) { G.drive({ x: 934, y: 1215, run: true, tol: 22 }); dashed = 1; }
      if (dashed === 1 && G.driveArrived) { G.drive(null); G.drive({ x: 930, y: 1300, run: true, tol: 22 }); dashed = 2; }
      if (dashed === 2 && G.driveArrived) { G.drive(null); dashed = 3; }
      if (i % 4 === 0) trail.push(G.time.toFixed(1) + ' p(' + G.player.x + ',' + G.player.y + ') div(' + dv.x.toFixed(0) + (dv.pauseT > 0 ? 'R' : '') + ')');
    }
    G.drive(null);
    log.push('dashed=' + dashed + ' crossed=' + M6.crossed + ' spots=' + M6.spots + ' t=' + G.time.toFixed(1));
    log.push(trail.join('\n'));
    return log;
  });
  for (const l of out) console.log(l);
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
