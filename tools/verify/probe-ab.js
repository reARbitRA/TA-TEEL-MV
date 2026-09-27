// probe B: why does the page slow to ~0.2x while the player STANDS in the
// witness zone (vs 0.85x while driving, 1.0x standing elsewhere)?
// A/B in one page, ZERO harness evaluates during measurement windows.
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
  await page.evaluate(() => window.__game.seek(35.0));
  await new Promise(r => setTimeout(r, 1500));
  await page.evaluate(() => window.__game.seek(0.0));
  await new Promise(r => setTimeout(r, 1500));

  // in-page A/B measurement, self-contained, results fetched afterwards
  await page.evaluate(() => {
    const G = window.__game;
    window.__ab = [];
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const drive = (x, y, o) => {
      o = o || {};
      G.drive({ x, y, run: !!o.run, tol: o.tol || 16 });
      return new Promise(res => {
        const t0 = performance.now();
        const iv = setInterval(() => {
          if (G.driveArrived || performance.now() - t0 > (o.timeout || 15000)) {
            clearInterval(iv); G.drive(null); res(G.driveArrived);
          }
        }, 80);
      });
    };
    const measure = (label) => {
      const w0 = performance.now(), v0 = G.time, f0 = G.fps;
      const mem = performance.memory ? performance.memory.usedJSHeapSize : 0;
      return sleep(12000).then(() => {
        const w1 = performance.now(), v1 = G.time;
        window.__ab.push({
          label,
          rate: +((v1 - v0) / ((w1 - w0) / 1000)).toFixed(2),
          fpsNow: +G.fps.toFixed(1), fps0: +f0.toFixed(1),
          heapDeltaMB: performance.memory ?
            +(((performance.memory.usedJSHeapSize - mem) / 1048576)).toFixed(1) : -1,
          p: G.player, vt: +G.time.toFixed(1),
          mission: G.missionState.id, phase: G.missionState.phase,
          seen: G.missionState.seen, witnessed: G.missionState.witnessed,
        });
      });
    };
    (async () => {
      // A: drive to the witness spot, latch witness, then STAND 12s
      await drive(240, 296, {}); await drive(240, 240, {});
      await drive(110, 210, {}); await drive(110, 156, {}); await drive(182, 152, {});
      await sleep(600);
      await measure('stand-witness-zone');
      // B: drive around the south floor 12s
      const drv = drive(240, 296, { timeout: 12000 });
      await measure('drive-door');
      await drv;
      // C: stand again, outside the zone (door column)
      await measure('stand-door');
      // D: witness zone again (cumulative-time check)
      await drive(110, 156, {}); await drive(182, 152, {});
      await sleep(400);
      await measure('stand-witness-zone-again');
    })().catch(e => { window.__ab.push({ label: 'ERROR', err: String(e) }); });
  });

  // total silence while measurements run (4 x ~12s + drives ~10s)
  await new Promise(r => setTimeout(r, 75000));
  const ab = await page.evaluate(() => window.__ab);
  for (const e of ab) console.log(JSON.stringify(e));
  process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
