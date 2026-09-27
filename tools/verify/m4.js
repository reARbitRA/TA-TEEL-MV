// §9 verification harness — M4 (full audio sync + 29 achievements + render polish)
//
// Architecture: same v3 plan as m1–m3 (see m3.js header).
//  • Phase 0 — REAL audio: the M4 sync law itself. The simulation must be glued
//    to song time: player displacement ≈ walkSpeed × ΔaudioTime (NOT wall),
//    simGap bounded, rAF alive, visibilitychange auto-pauses, pause freezes.
//  • Phase A — virtual clock: 29 word-icons unlock exactly on the locked
//    timeline (incl. the catch-up path), saddam 3-state, pulse-no-recount,
//    m2 candle still works (refactor regression), m7→m9 route to the stamp,
//    free roam keeps the dock lit.
//  • Phase B — staged shots + in-page gold-pixel dock checks.
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '..', '..');
const REPO = '/home/user/TA-TEEL-MV';
const OUTDIR = process.argv[2] || '/tmp/m4-shots';
const RECORD = process.argv.includes('--record');
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
  setTimeout(() => { console.log('WATCHDOG: total timeout'); done(3); }, RECORD ? 700000 : 480000);

  const waitGame = async (fnStr, timeout = 30000, poll = 200) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      if (await page.evaluate(fnStr)) return true;
      await sleep(poll);
    }
    return false;
  };

  const staged = async (name, o) => {
    try {
      const idMatch = o.endState
        ? `window.__game.state === ${JSON.stringify(o.endState)}`
        : `window.__game.missionState.id === ${JSON.stringify(o.id)} && window.__game.missionState.fade < 0.5`;
      if (o.preSeek != null) {
        await page.evaluate((s) => window.__game.seek(s), o.preSeek);
        await waitGame(idMatch, 15000, 150);
      }
      await page.evaluate((s) => window.__game.seek(s), o.seek);
      await waitGame(idMatch, 15000, 150);
      if (o.hops) {
        for (const h of o.hops) {
          await page.evaluate((x, y) => window.__game.teleport(x, y), h[0], h[1]);
          await sleep(300);
        }
      }
      if (o.x != null) await page.evaluate((x, y) => window.__game.teleport(x, y), o.x, o.y);
      await sleep(o.settle || 700);
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

  // title shot (shadow dock preview visible on title now)
  await sleep(1000);
  await page.screenshot({ path: path.join(OUTDIR, '01-title.jpg'), type: 'jpeg', quality: 88 })
    .then(() => check('shot captured 01-title', true))
    .catch(() => check('shot captured 01-title', false));

  /* ============ PHASE 0 — REAL AUDIO: the sync law ============ */
  await page.click('canvas', { offset: { x: 640, y: 448 } });
  await page.waitForFunction(() => window.__game.state === 'play', { timeout: 10000 });
  await sleep(1200);
  g = await page.evaluate(() => ({ t: window.__game.audioTime, st: window.__game.audioState }));
  check('audio playing', g.st === 4 && g.t > 0.8, `t=${g.t.toFixed(2)} state=${g.st}`);

  // rAF alive in real mode
  await page.evaluate(() => {
    window.__rafN = 0;
    const t0 = performance.now();
    const tick = () => { window.__rafN++; if (performance.now() - t0 < 1500) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  await sleep(1700);
  const rafN = await page.evaluate(() => window.__rafN);
  check('rAF delivery >= 50/s (real-audio mode)', rafN >= 75, (rafN / 1.5).toFixed(1) + '/s over 1.5s');

  // SYNC LAW: walk east for ~2.2s wall — displacement must track AUDIO time
  const pre = await page.evaluate(() => ({
    t: window.__game.audioTime, x: window.__game.player.x, gap: window.__game.achState.simGap,
  }));
  await page.keyboard.down('KeyD');
  const gaps = [];
  for (let i = 0; i < 11; i++) {
    await sleep(200);
    gaps.push(await page.evaluate(() => window.__game.achState.simGap));
  }
  await page.keyboard.up('KeyD');
  const post = await page.evaluate(() => ({
    t: window.__game.audioTime, x: window.__game.player.x,
  }));
  const dA = post.t - pre.t, dX = Math.abs(post.x - pre.x);
  const vWalk = 150, errA = Math.abs(dX - vWalk * dA), errW = Math.abs(dX - vWalk * 2.2);
  check('simulation glued to song time (Δpos ≈ v·Δaudio)', errA <= Math.max(0.45 * vWalk * dA, 0.7 * errW),
    `Δx=${dX.toFixed(0)}px Δaudio=${dA.toFixed(2)}s (expect ~${(vWalk * dA).toFixed(0)}) errAudio=${errA.toFixed(0)} errWall=${errW.toFixed(0)}`);
  const maxGap = Math.max(...gaps.map(v => Math.abs(v == null ? 0 : v)));
  check('sim↔audio gap bounded (<0.5s)', gaps.every(v => v != null) && maxGap < 0.5,
    'maxGap=' + maxGap.toFixed(3) + ' samples=' + gaps.length);

  // pause freezes both; resume continues
  await page.evaluate(() => window.__game.pause());
  await sleep(400);
  const pz = await page.evaluate(() => ({ p: window.__game.paused, a: window.__game.audioPaused, t: window.__game.audioTime }));
  await sleep(700);
  const pz2 = await page.evaluate(() => window.__game.audioTime);
  check('pause freezes audio+game', pz.p && pz.a && Math.abs(pz2 - pz.t) < 0.05, `t ${pz.t.toFixed(2)}→${pz2.toFixed(2)}`);
  await page.evaluate(() => window.__game.resume());
  await sleep(300);
  check('resume restarts audio clock', await page.evaluate(() => !window.__game.audioPaused));

  // visibilitychange (hidden tab) auto-pauses
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await sleep(300);
  check('hidden tab auto-pauses', await page.evaluate(() => window.__game.paused && window.__game.audioPaused));
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
    window.__game.resume();
  });

  /* ============ switch to the deterministic virtual clock ============ */
  await page.evaluate(() => window.__game.setVirtual(true, 0));
  await sleep(300);
  check('virtual clock engaged (song parked)',
    await page.evaluate(() => window.__game.virtual && window.__game.audioPaused));

  /* ============ PHASE A — achievements on the locked timeline ============ */
  // in-page ticker (the clock) + phase-A script
  await page.evaluate((REC) => {
    const G = window.__game;
    const RECORD = REC;
    window.__m4log = []; window.__m4done = false; window.__m4err = null;
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
    const ck = (name, ok, detail) => window.__m4log.push({ name, ok: !!ok, detail: String(detail) });
    const waitT = (fn, timeout, poll) => new Promise(res => {
      const t0 = performance.now(); poll = poll || 120;
      const iv = setInterval(() => {
        let v = false;
        try { v = fn(); } catch (e) {}
        if (v || performance.now() - t0 > timeout) { clearInterval(iv); res(v); }
      }, poll);
    });
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
    // gold pixels inside the dock band (screen-space, live canvas read)
    window.__dockGold = () => {
      try {
        const s = SCALE;
        const d = ctx.getImageData(355 * s, 148 * s, 570 * s, 82 * s).data;
        let gold = 0;
        for (let i = 0; i < d.length; i += 4)
          if (d[i] > 150 && d[i + 1] > 110 && d[i + 2] < 130 && d[i] > d[i + 2] + 40) gold++;
        return gold;
      } catch (e) { return -1; }
    };

    (async () => {
      /* --- A1: word-icons unlock exactly on the locked timeline --- */
      G.seek(0);
      await sleep2(300);
      let a = G.achState;
      ck('ach run starts dark (0/29)', a.count === 0 && a.lit.length === 0, 'count=' + a.count);
      const shadowGold = window.__dockGold();

      const stops = [
        [8.73, ['chador', 'turbine']],
        [24.94, ['fuse']],
        [42.39, ['gemini', 'grok']],
        [52.37, ['gpt']],
        [59.85, ['sepah']],
        [67.33, ['elevator']],
        [79.80, ['bitcoin', 'maman']],
        [89.77, ['iraq', 'baath']],
        [97.26, ['darkweb', 'haraj', 'russia']],
        [104.74, ['toosi', 'taalim', 'putin', 'rahbar']],
        [113.47, ['pump']],
        [122.19, ['nimrod']],
        [132.17, ['khook']],
        [142.14, ['mack']],
      ];
      let expected = 0;
      for (const [t, ids] of stops) {
        G.seek(t); await sleep2(260);
        expected += ids.length;
        a = G.achState;
        const want = ids.every(id => a.lit.includes(id));
        ck('ach ' + ids.join('+') + ' lit at ' + t.toFixed(2) + 's', want && a.count === expected,
          'count=' + a.count + ' (expect ' + expected + ') saddam=' + a.saddam);
      }
      a = G.achState;
      ck('ach saddam smiles at «بازسازیِ حزبِ بعث»', a.saddam === 1, 'saddam=' + a.saddam);
      const litGold = window.__dockGold();
      ck('ach dock glows gold when lit (pixel check)', litGold > shadowGold * 1.6 + 200,
        'gold px ' + shadowGold + ' → ' + litGold);

      /* --- A2: catch-up — one big seek fires every crossed step --- */
      G.seek(178.0); await sleep2(300);
      a = G.achState;
      // through n24 (177.06): all but velayat? no — velayat@167.08, eskandar@172.07, bundle/tether/flush@177.06 → 28
      ck('ach catch-up on seek (28/29 after 177.06)', a.count === 28 && a.lit.includes('velayat') && a.lit.includes('eskandar') && a.lit.includes('bundle'),
        'count=' + a.count + ' missing=' + ['hospital'].filter(id => !a.lit.includes(id)));

      /* --- A3: pulse ≠ new unlock; saddam widens --- */
      G.seek(187.6); await sleep2(350); // n25 کُروسِ آکاپلا: saddam:2 + pulse
      a = G.achState;
      ck('ach chorus pulse pops without recount', a.count === 28 && a.popping.length >= 3 && a.saddam === 2,
        'count=' + a.count + ' popping=' + a.popping.length + ' saddam=' + a.saddam);

      /* --- A4: last word (بیمارستان) → 29/29 exactly at the stamp screams --- */
      G.seek(306.0); await sleep2(300);
      a = G.achState;
      ck('ach hospital completes the 29 at 305.48', a.count === 29 && a.lit.length === 29, 'count=' + a.count);

      /* --- A5: mission logic intact after the dt refactor (m2 candle) --- */
      G.seek(33.9);
      await waitT(() => G.missionState.id === 'm2', 8000, 150);
      await waitT(() => G.missionState.fade < 0.4, 5000, 120);
      const l0 = G.missionState.m2light;
      const em = G.missionState.m2embers.filter(e => !e.got).slice(0, 2);
      for (const e of em) await drive(e.x, e.y, { run: true, timeout: 8000 });
      await sleep2(400);
      const l1 = G.missionState.m2light;
      ck('missions still tick (m2 embers relight)', l1 > l0, 'light ' + l0 + '→' + l1);

      /* --- A6: the back half — m7→m9 route + stamp (record segment) --- */
      if (RECORD) { window.__recFrames.length = 0; window.__recLastT = -1; window.__recT0 = undefined; }
      G.seek(201.0);
      await waitT(() => G.missionState.id === 'm7' && G.missionState.phase === 'lead', 8000);
      G.resetCounts();
      await sleep2(700);
      for (const leg of [[1860, 900], [1860, 851]]) {
        await drive(leg[0], leg[1], { timeout: 6000 });
        await sleep2(400);
      }
      await drive(1860, 1090, { timeout: 9000 });
      await drive(1860, 810, { timeout: 8000 });
      await waitT(() => G.missionState.m7relights >= 1, 5000, 100);
      let s = G.missionState;
      ck('m7 candle route intact', s.m7relights >= 1 && s.m7lit >= 8,
        'relights=' + s.m7relights + ' lit=' + s.m7lit);
      await drive(1946, 760, { timeout: 6000, tol: 10 }); // deep past the door: the 24px chain needs the player ~east of x1914 for ≥6 candles inside the r130 zone
      await waitT(() => G.missionState.done || G.time > 211.8, 12000, 100);
      ck('m7 done', G.missionState.done, 'lit=' + G.missionState.m7lit);

      await waitT(() => G.missionState.id === 'm8' && G.missionState.phase === 'gather', 30000, 150);
      for (const spot of [[1520, 590], [1500, 520], [1470, 470], [1470, 420], [1560, 470], [1440, 560]]) {
        await drive(spot[0], spot[1], { run: true, timeout: 7000 });
        if (G.missionState.m8group >= 6) break;
      }
      await waitT(() => G.missionState.m8group >= 6, 6000, 100);
      for (let i = 0; i < 24 && G.time < 248; i++) {
        const lx = G.missionState.m8line;
        if (lx >= 1700) break;
        await drive(lx - 60, 520, { timeout: 1400 });
      }
      await waitT(() => G.missionState.phase === 'break' || G.time > 248.5, 20000, 100);
      await drive(1720, 530, { run: true, timeout: 8000 });
      await sleep2(1700);
      await waitT(() => G.missionState.done || G.time > 248.9, 6000, 100);
      s = G.missionState;
      ck('m8 line broken + bed', s.done && s.m8bed === true, 'line=' + s.m8line + ' bed=' + s.m8bed);

      await waitT(() => G.missionState.id === 'm9' && G.missionState.phase === 'light', 60000, 150);
      const patchDots = [
        [[2114, 672], [2100, 700], [2128, 716]],
        [[2230, 560], [2258, 576], [2244, 532]],
        [[2050, 500], [2028, 496], [2014, 452]],
      ];
      for (let pi = 0; pi < patchDots.length; pi++) {
        for (const d of patchDots[pi]) await drive(d[0], d[1], { run: true, timeout: 8000 });
        await waitT(() => G.missionState.m9patches >= pi + 1, 4000, 100);
      }
      s = G.missionState;
      ck('m9 three patches → finale', s.done && s.m9patches === 3 && s.m9finale > 0,
        'patches=' + s.m9patches + ' finale=' + s.m9finale);

      /* --- A7: song end → stamp; dock all-lit; free roam keeps it --- */
      G.seek(320.6);
      await waitT(() => G.missionState.ended === true, 15000, 100);
      a = G.achState;
      ck('ended: stamp + full dock (29/29)', G.missionState.ended === true && !!G.missionState.frZone && a.count === 29,
        'count=' + a.count + ' frZone=' + !!G.missionState.frZone);

      if (RECORD) { window.__recT1 = G.time; window.__recOn = false; }
      /* revive for phase B staging (ended parks the tick pipeline) */
      GAME.state = 'play'; GAME.freeroam = false; GAME.endedAt = null; GAME.vt = 300;
      window.__m4done = true;
    })().catch(e => { window.__m4err = String(e && e.message || e); window.__m4done = true; })
  }, RECORD);

  /* liveness */
  {
    const tA = Date.now();
    let nLast = 0;
    while (Date.now() - tA < 420000) {
      const st = await page.evaluate(() => ({
        vt: window.__game.time,
        done: window.__m4done, err: window.__m4err, n: window.__m4log.length,
      }));
      if (st.done) { if (st.err) check('phase A script error', false, st.err); break; }
      if (st.n > nLast) { nLast = st.n; console.log(ts() + '       | phase A @ vt=' + st.vt.toFixed(1) + ' (' + st.n + ' checks)'); }
      await sleep(2000);
    }
    const log = await page.evaluate(() => window.__m4log);
    if (!log.length) check('phase A produced results', false, 'empty log');
    for (const e of log) check('[A] ' + e.name, e.ok, e.detail);

    /* ---------- recording assembly ---------- */
    if (RECORD) {
      const frames = [];
      for (;;) {
        const chunk = await page.evaluate(() => (window.__recFrames || []).splice(0, 24));
        if (!chunk.length) break;
        for (const d of chunk) frames.push(Buffer.from(d.split(',')[1], 'base64'));
      }
      const span = await page.evaluate(() => ({
        t0: window.__recT0 || 0, t1: window.__recT1 || window.__game.time }));
      const fps = frames.length > 1 ? (frames.length - 1) / Math.max(1, span.t1 - span.t0) : 5;
      check('recording captured frames', frames.length >= 150,
        frames.length + ' frames, ' + (span.t1 - span.t0).toFixed(1) + 's of game time, ' + fps.toFixed(2) + 'fps true rate');
      if (frames.length >= 150) {
        const fdir = path.join(OUTDIR, 'frames'); fs.mkdirSync(fdir, { recursive: true });
        frames.forEach((b, i) => fs.writeFileSync(path.join(fdir, 'f' + String(i).padStart(5, '0') + '.jpg'), b));
        const recDir = path.join(ROOT, 'game', 'recordings'); fs.mkdirSync(recDir, { recursive: true });
        const out = path.join(recDir, 'm4-playthrough.mp4');
        const ff = '/home/user/pylibs/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2';
        const args = ['-y', '-framerate', fps.toFixed(4), '-i', path.join(fdir, 'f%05d.jpg'),
          '-ss', span.t0.toFixed(2), '-t', (span.t1 - span.t0 + 0.3).toFixed(2), '-i', path.join(ROOT, 'BARGH (4).mp3'),
          '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23',
          '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', out];
        const r = require('child_process').spawnSync(ff, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        const ok = r.status === 0 && fs.existsSync(out) && fs.statSync(out).size > 100000;
        check('recording assembled (m4-playthrough.mp4)', ok,
          ok ? (frames.length + ' frames, ' + (fs.statSync(out).size / 1e6).toFixed(1) + 'MB, song ' + span.t0.toFixed(1) + '-' + span.t1.toFixed(1) + 's muxed')
             : 'ffmpeg: ' + r.stderr.toString().slice(-300));
      }
    }
  }

  /* ============ PHASE B — staged shots ============ */
  // unlock moment with toast + popping icons (n12: bitcoin+maman at 79.80)
  try {
    await page.evaluate(() => { window.__game.seek(79.5); });
    await waitGame('window.__game.time > 79.9 && window.__game.achState.count >= 10', 8000, 120);
    await page.evaluate(() => { window.__game.seek(79.5); }); // re-arm for the toast window
    await waitGame('window.__game.achState.count >= 10 && window.__game.achState.toast', 8000, 60);
    await page.evaluate(() => window.__game.hold(true));
    await sleep(120);
    await page.screenshot({ path: path.join(OUTDIR, 'ach-unlock.jpg'), type: 'jpeg', quality: 88 });
    await page.evaluate(() => window.__game.hold(false));
    check('staged shot ach-unlock.jpg', true, '');
  } catch (e) { check('staged shot ach-unlock.jpg', false, String(e && e.message || e)); try { await page.evaluate(() => window.__game.hold(false)); } catch (_) {} }

  await staged('ach-dock-midrun.jpg', { id: 'm4', preSeek: 96.0, seek: 100.0, x: 1150, y: 260, settle: 900 }); // roof, 15 lit
  await staged('saddam-smile.jpg', { id: 'm4', preSeek: 96.0, seek: 99.0, x: 1150, y: 260, settle: 700 });     // saddam=1 smile in dock
  await staged('m7-dock.jpg', { id: 'm7', seek: 204.0, x: 1860, y: 880, settle: 900 });                        // dock over gameplay
  await staged('stamp-ended.jpg', { endState: 'ended', seek: 321.7, settle: 1100 });                           // all-lit payoff
  // free roam: dock stays lit while the song loops
  try {
    await page.evaluate(() => window.__game.setVirtual(true, 321.8));
    await waitGame('window.__game.state === "ended"', 15000, 150);
    await page.click('canvas', { offset: { x: 640, y: 604 } });
    await waitGame('window.__game.missionState.freeroam === true', 8000, 100);
    await page.evaluate(() => window.__game.teleport(1150, 330));
    await sleep(1200);
    const frAch = await page.evaluate(() => window.__game.achState.count);
    await page.evaluate(() => window.__game.hold(true));
    await sleep(150);
    await page.screenshot({ path: path.join(OUTDIR, 'freeroam-dock.jpg'), type: 'jpeg', quality: 88 });
    await page.evaluate(() => window.__game.hold(false));
    check('free roam keeps the dock lit (29)', frAch === 29, 'count=' + frAch);
    check('staged shot freeroam-dock.jpg', true, '');
  } catch (e) {
    check('staged shot freeroam-dock.jpg', false, String(e && e.message || e));
    try { await page.evaluate(() => window.__game.hold(false)); } catch (_) {}
  }

  /* ---------- final ---------- */
  check('zero console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  check('zero page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
  check('zero failed requests', failedReqs.length === 0, failedReqs.slice(0, 3).join(' | '));

  done(results.fail.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
