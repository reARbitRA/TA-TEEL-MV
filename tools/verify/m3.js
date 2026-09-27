// §9 verification harness — M3 (missions 7–9 + stamp + free roam, scripted end-to-end)
//
// ARCHITECTURE (v3 — after headless timing forensics):
//  • The bundled headless chromium runs the REAL-audio clock at 0.33×–10× and
//    drops the page to ~0.3× wall speed under CDP-evaluate churn (documented
//    artifact of the sandbox build; real devices pace by OS audio — the game's
//    audio-clock law is correct and stays). → mission verification runs on the
//    deterministic VIRTUAL clock (__game.setVirtual) with the song parked.
//  • Phase A therefore runs ENTIRELY IN-PAGE as a fire-and-forget async
//    script, and the CLOCK is an in-page interval (100ms → vtAdvance(0.1)):
//    CDP-evaluate round-trips vary 30–500ms, so harness-paced ticking either
//    bursts (flash-closing mission windows) or crawls (0.15x). The interval
//    advances vt at exactly <=1.0x wall. The harness only polls liveness.
//  • Real-audio playback is still verified live for ~2s before the switch.
//  • Phase B: staged screenshots via seek+teleport+parked CDP capture (loop
//    parked via hold() → screenshots are fast and reliable).
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '..', '..');
const REPO = '/home/user/TA-TEEL-MV';
const OUTDIR = process.argv[2] || '/tmp/m3-shots';
const RECORD = process.argv.includes('--record'); // gameplay video: capture + ffmpeg
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
  const done = (code) => {
    try {
      fs.writeFileSync(path.join(OUTDIR, 'results.json'), JSON.stringify(results, null, 2));
      console.log('\n=== SUMMARY: ' + results.pass.length + ' passed, ' + results.fail.length + ' failed ===');
      if (results.fail.length) console.log('FAILURES:\n' + results.fail.join('\n'));
    } catch (e) {}
    process.exit(code);
  };
  setTimeout(() => { console.log('WATCHDOG: total timeout'); done(3); }, 480000);

  /* harness-side wait (phase B only — tolerates the churn slowdown) */
  const waitGame = async (fnStr, timeout = 30000, poll = 200) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      if (await page.evaluate(fnStr)) return true;
      await sleep(poll);
    }
    return false;
  };

  /* staged screenshot (phase B). Steps:
     1. optional preSeek — land INSIDE the mission first, so the follow-up seek
        fires its step event (spark/pin) on the live mission impl (a single
        seek from a later window would hand the step event to the no-impl
        placeholder and lose it);
     2. final seek — mission swap (if any) runs, teleport-to-start happens;
     3. wait for the swap to land (id match + fade mostly in), then teleport
        to the staged spot and let it settle live;
     4. park the loop (hold) → CDP jpeg capture, in-page toDataURL fallback. */
  const staged = async (name, o) => {
    try {
      const idMatch = o.endState
        ? `window.__game.state === ${JSON.stringify(o.endState)}`
        : `window.__game.missionState.id === ${JSON.stringify(o.id)} && window.__game.missionState.fade < 0.5`;
      if (o.preSeek != null) {
        await page.evaluate((s) => window.__game.seek(s), o.preSeek);
        await waitGame(idMatch, 15000, 150); // in-page ticker runs the swap/fade
      }
      await page.evaluate((s) => window.__game.seek(s), o.seek);
      await waitGame(idMatch, 15000, 150);
      if (o.hops) { // multi-teleport sequence (e.g. find all four medallions)
        for (const h of o.hops) {
          await page.evaluate((x, y) => window.__game.teleport(x, y), h[0], h[1]);
          await sleep(300);
        }
      }
      if (o.x != null) await page.evaluate((x, y) => window.__game.teleport(x, y), o.x, o.y);
      await sleep(o.settle || 700); // ~0.7s of live game (ticker) — banner + motion
      await page.evaluate(() => window.__game.hold(true));
      await sleep(150);
      const file = path.join(OUTDIR, name.replace(/[.]png$/, '.jpg'));
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
        } catch (e2) {}
      }
      await page.evaluate(() => window.__game.hold(false));
      check('staged shot ' + name, ok);
    } catch (e) { check('staged shot ' + name, false, e.message); }
  };

  await page.goto('file://' + path.join(REPO, 'game.html'), { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__game && window.__game.state === 'title', { timeout: 20000 });

  let g = await page.evaluate(() => window.__game.images);
  check('all images load', g.loaded === g.total && g.failed.length === 0, `${g.loaded}/${g.total}`);

  // title shot (no audio yet — plain CDP)
  await sleep(1000);
  await page.screenshot({ path: path.join(OUTDIR, '01-title.jpg'), type: 'jpeg', quality: 88 })
    .then(() => check('shot captured 01-title', true))
    .catch(() => check('shot captured 01-title', false));

  /* ---------- real-audio segment (short; headless clock may drift) ---------- */
  await page.click('canvas', { offset: { x: 640, y: 448 } });
  await page.waitForFunction(() => window.__game.state === 'play', { timeout: 10000 });
  await sleep(2000);
  g = await page.evaluate(() => ({ t: window.__game.audioTime, st: window.__game.audioState, sfx: window.__game.sfxState }));
  check('audio playing', g.st === 4 && g.t > 1.5, `t=${g.t.toFixed(2)} state=${g.st}`);
  check('SFX context created', g.sfx === 'running' || g.sfx === 'suspended', 'state=' + g.sfx);

  /* honest frame-delivery check in REAL mode (fresh page, rAF still 60/s —
     the bundled headless renderer virtualizes all in-page clocks and decays
     frame delivery to ~7/s after ~20s of software rendering; the GAME.fps
     getter is dt-capped and over-reports under that decay, so we count
     real rAF callbacks instead). */
  await page.evaluate(() => {
    window.__rafN = 0;
    const t0 = performance.now();
    const tick = () => { window.__rafN++; if (performance.now() - t0 < 2000) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  await sleep(2100);
  const rafN = await page.evaluate(() => window.__rafN);
  check('rAF delivery >= 55/s (real-audio mode)', rafN >= 110, (rafN / 2).toFixed(1) + '/s over 2s');

  /* ---------- switch to the deterministic virtual clock ---------- */
  await page.evaluate(() => window.__game.setVirtual(true, 0));
  await sleep(300);
  check('virtual clock engaged (song parked)',
    await page.evaluate(() => window.__game.virtual && window.__game.audioPaused));

  /* ================= PHASE A — in-page virtual-clock gameplay ================= */
  await page.evaluate((REC) => {
    const G = window.__game;
    const RECORD = REC;
    window.__m3log = []; window.__m3done = false; window.__m3err = null;
    if (RECORD) {
      window.__recFrames = []; window.__recOn = true; window.__recLastT = -1;
      window.__recSrc = document.querySelector('canvas');
      const rc = document.createElement('canvas'); rc.width = 960; rc.height = 540;
      window.__recCtx = rc.getContext('2d');
    }
    window.__vtN = 0;
    window.__vtIv = setInterval(() => {
      const n = ++window.__vtN;
      G.vtAdvance(0.1, (n % 3) !== 0);
      if (G.time < window.__recLastT) window.__recLastT = G.time;
      if (RECORD && n % 3 === 0 && window.__recOn && G.time - window.__recLastT >= 0.29) {
        window.__recLastT = G.time;
        if (window.__recFrames.length === 0) window.__recT0 = G.time;
        window.__recCtx.drawImage(window.__recSrc, 0, 0, 960, 540);
        window.__recFrames.push(window.__recCtx.canvas.toDataURL('image/jpeg', 0.72));
      }
    }, 100);

    const sleep2 = (ms) => new Promise(r => setTimeout(r, ms));
    const marks = [{ w: performance.now(), v: G.time }];
    const mark = (name) => {
      const m0 = marks[marks.length - 1], w1 = performance.now(), v1 = G.time;
      ck('rate ' + name, true, 'vt/wall=' + ((v1 - m0.v) / ((w1 - m0.w) / 1000)).toFixed(2));
      marks.push({ w: w1, v: v1 });
    };
    const drive = (x, y, o) => {
      o = o || {};
      G.drive({ x, y, run: !!o.run, tol: o.tol || 24 });
      return new Promise(res => {
        const t0 = performance.now(), limit = o.timeout || 15000;
        const iv = setInterval(() => {
          if (G.driveArrived || performance.now() - t0 > limit) {
            clearInterval(iv); G.drive(null); res(G.driveArrived);
          }
        }, 80);
      });
    };
    const waitT = (fn, timeout, poll) => new Promise(res => {
      const t0 = performance.now(); poll = poll || 120;
      const iv = setInterval(() => {
        let v = false;
        try { v = fn(); } catch (e) {}
        if (v || performance.now() - t0 > timeout) { clearInterval(iv); res(v); }
      }, poll);
    });
    const ck = (name, ok, detail) => {
      window.__m3log.push({ name, ok: !!ok, detail: String(detail) });
    };

    (async () => {
      /* open straight into the m7 window */
      G.seek(201.0);
      await waitT(() => G.missionState.id === 'm7' && G.missionState.phase === 'lead', 8000);
      G.resetCounts();
      if (RECORD) { window.__recFrames.length = 0; window.__recLastT = -1; window.__recT0 = undefined; }
      await sleep2(700);
      let s = G.missionState;
      mark('boot');
      ck('m7 opens on the boulevard', s.id === 'm7' && s.phase === 'lead' && s.m7lit === 10,
        'id=' + s.id + ' phase=' + s.phase + ' lit=' + s.m7lit + ' p=' + JSON.stringify(G.player));

      /* ---------- MISSION 7 (199.50→211.97) — the candle parade ---------- */
      for (const leg of [[1860, 900], [1860, 851]]) {
        await drive(leg[0], leg[1], { timeout: 6000 });
        await sleep2(400);
      }
      s = G.missionState;
      const gustKilled = s.m7lit;
      ck('m7 parade column moves with gusts active', s.m7order >= 0 && s.m7lit <= 10,
        'lit=' + s.m7lit + ' order=' + s.m7order + ' p=' + JSON.stringify(G.player));
      // relight pass: the wind snuffs STRAGGLERS — double back down the column,
      // then walk north again over the dead flame (ضربهٔ نور en route)
      await drive(1860, 1090, { timeout: 9000 });
      await drive(1860, 810, { timeout: 8000 });
      await waitT(() => G.missionState.m7relights >= 1, 5000, 100);
      s = G.missionState;
      mark('m7-parade');
      ck('m7 dead candle relit by walking (ضربهٔ نور)', s.m7relights >= 1 && s.m7lit >= 8,
        'relights=' + s.m7relights + ' lit=' + s.m7lit + ' (killed to ' + gustKilled + ')');
      await drive(1946, 760, { timeout: 6000, tol: 10 }); // deep into the west gap (≥6 of the 24px-spaced chain inside the r130 door zone even at 9 lit)
      await waitT(() => G.missionState.done || G.time > 211.8, 12000, 100);
      s = G.missionState;
      mark('m7-door');
      ck('m7 river of candles reaches the plant door', s.done && s.m7arrived,
        'done=' + s.done + ' lit=' + s.m7lit + ' p=' + JSON.stringify(G.player) + ' vt=' + G.time.toFixed(1));

      /* ---------- MISSION 8 (211.97→249.37) — the final blast ---------- */
      await waitT(() => G.missionState.id === 'm8' && G.missionState.phase === 'gather', 30000, 150);
      G.resetCounts(); s = G.missionState;
      mark('m8-open');
      ck('m8 opens at the war plaza', s.id === 'm8' && s.phase === 'gather' && s.m8group === 0 && s.m8line === 1580,
        'id=' + s.id + ' phase=' + s.phase + ' p=' + JSON.stringify(G.player));
      for (const spot of [[1520, 590], [1500, 520], [1470, 470], [1470, 420], [1560, 470], [1440, 560]]) {
        await drive(spot[0], spot[1], { run: true, timeout: 7000 });
        if (G.missionState.m8group >= 6) break;
      }
      await waitT(() => G.missionState.m8group >= 6, 6000, 100);
      s = G.missionState;
      mark('m8-gather');
      ck('m8 crowd gathered by touch (≥۶)', s.m8group >= 6 && s.phase === 'push',
        'group=' + s.m8group + ' phase=' + s.phase);
      for (let i = 0; i < 24 && G.time < 248; i++) {
        const lx = G.missionState.m8line;
        if (lx >= 1700) break;
        await drive(lx - 60, 520, { timeout: 1400 });
      }
      await waitT(() => G.missionState.phase === 'break' || G.time > 248.5, 20000, 100);
      s = G.missionState;
      mark('m8-push');
      ck('m8 basiji line pushed back (sweep waves)', s.phase === 'break' && s.m8line >= 1700,
        'line=' + s.m8line + ' sweeps=' + s.m8sweeps + ' phase=' + s.phase);
      await drive(1720, 530, { run: true, timeout: 8000 });
      await sleep2(1700);
      await waitT(() => G.missionState.done || G.time > 248.9, 6000, 100);
      s = G.missionState;
      mark('m8-bed');
      ck('m8 queen bed broken', s.done && s.m8bed === true,
        'bed=' + s.m8bed + ' line=' + s.m8line + ' sweeps=' + s.m8sweeps + ' vt=' + G.time.toFixed(1));

      /* ---------- MISSION 9 (249.37→321.69) — the lasting end ---------- */
      await waitT(() => G.missionState.id === 'm9' && G.missionState.phase === 'light', 60000, 150);
      G.resetCounts(); s = G.missionState;
      mark('m9-open');
      ck('m9 opens in the plant yard', s.id === 'm9' && s.phase === 'light' && s.m9patches === 0,
        'id=' + s.id + ' p=' + JSON.stringify(G.player));
      const patchDots = [
        [[2114, 672], [2100, 700], [2128, 716]],
        [[2230, 560], [2258, 576], [2244, 532]],
        [[2050, 500], [2028, 496], [2014, 452]],
      ];
      for (let pi = 0; pi < patchDots.length; pi++) {
        for (const d of patchDots[pi]) {
          await drive(d[0], d[1], { run: true, timeout: 8000 });
        }
        await waitT(() => G.missionState.m9patches >= pi + 1, 4000, 100);
        ck('m9 patch ' + (pi + 1) + ' lit (∷∷∷)', G.missionState.m9patches >= pi + 1,
          'patches=' + G.missionState.m9patches);
      }
      s = G.missionState;
      mark('m9-patches');
      ck('m9 all three patches = finale (done, zoom-out)', s.done && s.m9patches === 3 && s.m9finale > 0,
        'patches=' + s.m9patches + ' finale=' + s.m9finale + ' vt=' + G.time.toFixed(1));

      /* ---------- song end → the «تعطیل» stamp + free roam ---------- */
      G.seek(320.6);
      await waitT(() => G.missionState.ended === true, 15000, 100);
      s = G.missionState;
      mark('ended');
      ck('song end = ended screen with stamp + free-roam button', s.ended === true && !!s.frZone,
        'ended=' + s.ended + ' frZone=' + JSON.stringify(s.frZone));

      if (RECORD) { window.__recT1 = G.time; window.__recOn = false; } // span end = last captured moment
      /* revive for phase B staging: the ended state parks the tick pipeline
         (vtAdvance early-returns) — staged seeks would render nothing. */
      GAME.state = 'play'; GAME.freeroam = false; GAME.endedAt = null; GAME.vt = 300;
      window.__m3done = true;
    })().catch(e => { window.__m3err = String(e && e.message || e); window.__m3done = true; })
  }, RECORD);

  /* liveness only
  /* liveness only — the in-page interval is the clock; it keeps the game
     live through phase B too (hold() pauses it per screenshot). */
  {
    const tA = Date.now();
    let nLast = 0;
    while (Date.now() - tA < 360000) {
      const st = await page.evaluate(() => ({
        vt: window.__game.time,
        done: window.__m3done, err: window.__m3err, n: window.__m3log.length,
      }));
      if (st.done) { if (st.err) check('phase A script error', false, st.err); break; }
      if (st.n > nLast) { nLast = st.n; console.log(ts() + '       | phase A @ vt=' + st.vt.toFixed(1) + ' (' + st.n + ' checks)'); }
      await sleep(2000);
    }
    const log = await page.evaluate(() => window.__m3log);
    if (!log.length) check('phase A produced results', false, 'empty log');
    for (const e of log) check('[A] ' + e.name, e.ok, e.detail);

    /* ---------- gameplay recording: pull frames, assemble with ffmpeg ---------- */
    if (RECORD) {
      const tRec = Date.now();
      const frames = [];
      for (;;) {
        const chunk = await page.evaluate(() => (window.__recFrames || []).splice(0, 24));
        if (!chunk.length) break;
        for (const d of chunk) frames.push(Buffer.from(d.split(',')[1], 'base64'));
      }
      const span = await page.evaluate(() => ({
        t0: window.__recT0 || 0, t1: window.__recT1 || window.__game.time }));
      const fps = frames.length > 1 ? (frames.length - 1) / Math.max(1, span.t1 - span.t0) : 5;
      check('recording captured frames', frames.length >= 150, // M3 scenes are render-heavy
        frames.length + ' frames, ' + (span.t1 - span.t0).toFixed(1) + 's of game time, ' + fps.toFixed(2) + 'fps true rate');
      if (frames.length >= 150) {
        const fdir = path.join(OUTDIR, 'frames'); fs.mkdirSync(fdir, { recursive: true });
        frames.forEach((b, i) => fs.writeFileSync(path.join(fdir, 'f' + String(i).padStart(5, '0') + '.jpg'), b));
        const recDir = path.join(ROOT, 'game', 'recordings'); fs.mkdirSync(recDir, { recursive: true });
        const out = path.join(recDir, 'm3-playthrough.mp4');
        const ff = '/home/user/pylibs/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2';
        const args = ['-y', '-framerate', fps.toFixed(4), '-i', path.join(fdir, 'f%05d.jpg'),
          '-ss', span.t0.toFixed(2), '-t', (span.t1 - span.t0 + 0.3).toFixed(2), '-i', path.join(ROOT, 'BARGH (4).mp3'),
          '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23',
          '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', out];
        const r = require('child_process').spawnSync(ff, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        const ok = r.status === 0 && fs.existsSync(out) && fs.statSync(out).size > 100000;
        check('recording assembled (m2-playthrough.mp4)', ok,
          ok ? (frames.length + ' frames, ' + (fs.statSync(out).size / 1e6).toFixed(1) + 'MB, song 0-' + vtEnd.toFixed(1) + 's muxed, ' + ((Date.now() - tRec) / 1000).toFixed(0) + 's wall')
             : 'ffmpeg: ' + r.stderr.toString().slice(-300));
      }
    }
  }

  /* ================= PHASE B — staged screenshots ================= */
  await staged('m7-parade.jpg', { id: 'm7', seek: 204.0, x: 1860, y: 880, settle: 900 });
  await staged('m8-line.jpg', { id: 'm8', seek: 218.0, x: 1540, y: 520, settle: 900 });
  await staged('m8-bed.jpg', { id: 'm8', seek: 242.0, x: 1690, y: 530, settle: 900 });
  await staged('m9-patch.jpg', { id: 'm9', seek: 256.0, x: 2060, y: 520, settle: 900 });
  await staged('m9-finale.jpg', { id: 'm9', seek: 258.0,
    hops: [[2114, 672], [2100, 700], [2128, 716], [2230, 560], [2258, 576], [2244, 532], [2028, 496], [2014, 452]],
    x: 2100, y: 560, settle: 4500 });
  await staged('stamp-ended.jpg', { endState: 'ended', seek: 321.7, settle: 1100 });
  // free roam: click the ended-screen button, then a city shot
  try {
    await page.evaluate(() => window.__game.setVirtual(true, 321.8));
    await waitGame('window.__game.state === "ended"', 15000, 150);
    await page.click('canvas', { offset: { x: 640, y: 604 } });
    await waitGame('window.__game.missionState.freeroam === true', 8000, 100);
    await page.evaluate(() => window.__game.teleport(1150, 330));
    await sleep(1200);
    await page.evaluate(() => window.__game.hold(true));
    await sleep(150);
    await page.screenshot({ path: path.join(OUTDIR, 'freeroam.jpg'), type: 'jpeg', quality: 88 });
    await page.evaluate(() => window.__game.hold(false));
    check('staged shot freeroam.jpg', true, '');
  } catch (e) {
    check('staged shot freeroam.jpg', false, String(e && e.message || e));
    try { await page.evaluate(() => window.__game.hold(false)); } catch (_) {}
  }
  /* ---------- final ---------- */
  check('zero console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  check('zero page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
  check('zero failed requests', failedReqs.length === 0, failedReqs.slice(0, 3).join(' | '));

  done(results.fail.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
