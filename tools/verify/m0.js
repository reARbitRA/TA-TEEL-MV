// §9 verification harness — M0 (puppeteer-core + bundled Chromium; Playwright CDN blocked in sandbox)
// Asserts: zero console errors · all images load · audio reaches playing ·
//          60s scripted input without exceptions · fps >= 55 · clock integrity · screenshots.
// NOTE: page.screenshot() pumps the audio clock in this headless build — every
// screenshot is wrapped in __game.hold() (frozen clock) and the clock is
// asserted unchanged across each capture.
const path = require('path');
const fs = require('fs');
const REPO = '/home/user/TA-TEEL-MV';
const OUTDIR = process.argv[2] || '/tmp/m0-shots';
fs.mkdirSync(OUTDIR, { recursive: true });

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
  const consoleErrors = [], pageErrors = [], failedReqs = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('requestfailed', r => {
    const et = r.failure() && r.failure().errorText;
    // media seeks abort in-flight range requests on the song — benign, not a page error
    if (et === 'net::ERR_ABORTED' && decodeURIComponent(r.url()).includes('BARGH (4).mp3')) return;
    failedReqs.push(r.url() + ' :: ' + et);
  });

  const results = { pass: [], fail: [] };
  const T0 = Date.now();
  const ts = () => ((Date.now() - T0) / 1000).toFixed(1).padStart(6) + 's';
  const check = (name, ok, detail) => {
    (ok ? results.pass : results.fail).push(name + (detail ? ' — ' + detail : ''));
    console.log(ts() + ' ' + (ok ? 'PASS' : 'FAIL') + ' | ' + name + (detail ? ' | ' + detail : ''));
  };
  // watchdog: always write results, never hang the CI
  const done = (code) => {
    try {
      fs.writeFileSync(path.join(OUTDIR, 'results.json'), JSON.stringify(results, null, 2));
      console.log('\n=== SUMMARY: ' + results.pass.length + ' passed, ' + results.fail.length + ' failed ===');
      if (results.fail.length) console.log('FAILURES:\n' + results.fail.join('\n'));
    } catch (e) {}
    process.exit(code);
  };
  setTimeout(() => { console.log('WATCHDOG: total timeout'); done(3); }, 240000);
  /* screenshot: park loop + freeze clock → CDP shot (fast) with in-page fallback */
  const shot = async (name) => {
    const file = path.join(OUTDIR, name.replace(/[.]png$/, '.jpg'));
    const before = await page.evaluate(() => window.__game.audioTime);
    await page.evaluate(() => window.__game.hold(true));
    await sleep(150);
    let ok = false;
    try {
      await Promise.race([
        page.screenshot({ path: file, type: 'jpeg', quality: 88 }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('cdp timeout')), 20000)),
      ]);
      ok = true;
    } catch (e) {
      try {
        const dataUrl = await page.evaluate(() => window.__game.snapshot());
        fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
        ok = true;
      } catch (e2) { console.log(ts() + '  shot fail ' + name + ': ' + e2.message); }
    }
    const after = await page.evaluate(() => window.__game.audioTime); // read while still held
    await page.evaluate(() => window.__game.hold(false));
    check('shot captured ' + name, ok);
    check('clock frozen during shot ' + name, Math.abs(after - before) < 0.05, `t ${before.toFixed(2)}→${after.toFixed(2)}`);
  };

  await page.goto('file://' + path.join(REPO, 'game.html'), { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__game && window.__game.state === 'title', { timeout: 20000 });

  // 1 — images
  let g = await page.evaluate(() => window.__game.images);
  check('all images load', g.loaded === g.total && g.failed.length === 0,
    `${g.loaded}/${g.total} failed=[${g.failed.join(', ')}]`);

  // 2 — title screenshot (audio not yet playing — safe without hold)
  await sleep(1200);
  await shot('01-title.jpg'); // audio not playing — hold is a no-op at title

  // 3 — start game → audio playing at ~1x
  await page.click('canvas', { offset: { x: 640, y: 448 } });
  await page.waitForFunction(() => window.__game.state === 'play', { timeout: 10000 });
  const tA = await page.evaluate(() => window.__game.audioTime);
  await sleep(3000);
  const tB = await page.evaluate(() => window.__game.audioTime);
  g = await page.evaluate(() => ({ paused: window.__game.audioPaused, state: window.__game.audioState }));
  check('audio playing', !g.paused && g.state === 4, `readyState=${g.state}`);
  check('audio clock ~realtime', tB - tA > 2.4 && tB - tA < 3.6, `Δt=${(tB - tA).toFixed(2)}s over 3.0s wall`);

  // 4 — HUD state change (step 2 at t=8.73): seek to 9s
  await page.evaluate(() => window.__game.seek(9.0));
  await sleep(600);
  g = await page.evaluate(() => ({ step: window.__game.step, mission: window.__game.mission }));
  check('timeline step advance on seek', g.step === 2 && g.mission === 'm1', `step=${g.step} mission=${g.mission}`);
  await shot('02-hud-step2.png');

  // 5 — 60 seconds of scripted input (walk patterns) with fps sampling
  const fpsSamples = [];
  const key = async (code, ms) => {
    await page.keyboard.down(code); await sleep(ms); await page.keyboard.up(code);
  };
  const t0 = Date.now();
  const script = [
    ['KeyW', 8000], ['KeyA', 4000], ['KeyD', 6000], ['KeyS', 3000],
    ['KeyW', 5000, true], ['KeyD', 7000, true], ['KeyS', 4000], ['KeyA', 6000],
    ['KeyW', 6000, true], ['KeyD', 4000], ['KeyS', 5000], ['KeyA', 5000, true],
  ];
  for (const [code, ms, run] of script) {
    if (run) await page.keyboard.down('ShiftLeft');
    await key(code, ms);
    if (run) await page.keyboard.up('ShiftLeft');
    const s = await page.evaluate(() => ({ fps: window.__game.fps, p: window.__game.player, err: window.__game.errors.length }));
    fpsSamples.push(s.fps);
    if (s.err > 0) break;
  }
  const elapsed = (Date.now() - t0) / 1000;
  const p0 = await page.evaluate(() => window.__game.player);
  const minFps = Math.min(...fpsSamples);
  check('60s scripted input, no exceptions', pageErrors.length === 0 && elapsed >= 55,
    `elapsed=${elapsed.toFixed(1)}s pos=${JSON.stringify(p0)} pageErrors=${pageErrors.length}`);
  check('player moved under input', p0.x !== 230 || p0.y !== 340, `pos=${JSON.stringify(p0)}`);
  check('fps >= 55 (sampled)', minFps >= 55, `min=${minFps.toFixed(1)} avg=${(fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length).toFixed(1)} samples=[${fpsSamples.map(f => f.toFixed(0)).join(',')}]`);
  await shot('03-walk-city.png');

  // 6 — pause/resume integrity (real pause, no screenshot)
  await page.keyboard.press('KeyP');
  await sleep(300);
  let p1 = await page.evaluate(() => ({ paused: window.__game.paused, audio: window.__game.audioPaused, t: window.__game.audioTime }));
  await sleep(1200);
  let p2 = await page.evaluate(() => ({ paused: window.__game.paused, t: window.__game.audioTime }));
  check('pause freezes audio+game', p1.paused && p1.audio && Math.abs(p2.t - p1.t) < 0.05, `t ${p1.t.toFixed(2)}→${p2.t.toFixed(2)}`);
  await page.keyboard.press('KeyP');
  await sleep(400);

  // 7 — arena tour (hold-protected screenshots)
  const arenas = [
    ['majles', 220, 300], ['candle', 650, 640], ['raaviRoom', 650, 320], ['roof', 1150, 300],
    ['chalipa', 1380, 430], ['clock', 900, 1060], ['parade', 1860, 1250], ['war', 1630, 700], ['plant', 1980, 620],
  ];
  for (const [name, x, y] of arenas) {
    await page.evaluate((x, y) => window.__game.teleport(x, y), x, y);
    await sleep(280);
    const s = await page.evaluate(() => ({ errs: window.__game.errors, fps: window.__game.fps, state: window.__game.state }));
    check('arena visit: ' + name, s.errs.length === 0 && s.fps > 30 && s.state === 'play', `fps=${s.fps.toFixed(0)} state=${s.state}`);
    if (['majles', 'chalipa', 'plant', 'war', 'parade'].includes(name)) {
      await shot('arena-' + name + '.png');
    }
  }

  // 8 — seek near song end → ended state
  await page.evaluate(() => window.__game.seek(320.5));
  await sleep(2600);
  g = await page.evaluate(() => window.__game.state);
  check('song end → ended state', g === 'ended', 'state=' + g);
  await shot('04-ended.jpg'); // no audio playing at ended

  // 9 — failures of any kind
  check('zero failed requests', failedReqs.length === 0, failedReqs.slice(0, 3).join(' | '));
  check('zero console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  check('zero page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

  done(results.fail.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
