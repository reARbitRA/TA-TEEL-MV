// §9 verification harness — M1 (missions 1–3 scripted end-to-end + core checks)
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
const OUTDIR = process.argv[2] || '/tmp/m2-shots';
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
      const idMatch = `window.__game.missionState.id === ${JSON.stringify(o.id)} && window.__game.missionState.fade < 0.5`;
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
      await page.evaluate((x, y) => window.__game.teleport(x, y), o.x, o.y);
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
    window.__m2log = []; window.__m2done = false; window.__m2err = null;
    if (RECORD) {
      /* gameplay recorder: JPEG frames keyed to GAME time (one per ~0.3s of
         vt) — the assembled video is game-time-accurate no matter how wall
         time stretches under the software renderer. */
      window.__recFrames = []; window.__recOn = true; window.__recLastT = -1;
      window.__recSrc = document.querySelector('canvas');
      const rc = document.createElement('canvas'); rc.width = 960; rc.height = 540;
      window.__recCtx = rc.getContext('2d');
    }
    window.__vtN = 0;
    window.__vtIv = setInterval(() => {
      const n = ++window.__vtN;
      G.vtAdvance(0.1, (n % 3) !== 0); // render every 3rd tick (timer health)
      if (G.time < window.__recLastT) window.__recLastT = G.time; // seek-back tolerance
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
      window.__m2log.push({ name, ok: !!ok, detail: String(detail) });
    };

    (async () => {
      /* open straight into the m4 window (fresh boot at t~0 -> seek) */
      G.seek(81.0);
      await waitT(() => G.missionState.id === 'm4' && G.missionState.phase === 'search', 8000);
      G.resetCounts();
      if (RECORD) { window.__recFrames.length = 0; window.__recLastT = -1; window.__recT0 = undefined; }
      await sleep2(700);
      let s = G.missionState;
      mark('boot');
      ck('m4 opens on the roof', s.id === 'm4' && s.phase === 'search' && s.m4found === 0,
        'id=' + s.id + ' phase=' + s.phase + ' found=' + s.m4found + ' p=' + JSON.stringify(G.player));

      /* ---------- MISSION 4 (79.80 → 122.19) — roof medallions ----------
         spots: tank (1015,165) calf · antenna (1225,190) saddam ·
         dishes (1160,235) angel · parapet (1305,150) basiji.
         each find banners the LIVE lyric line (byte-exact via STEPS). */
      /* spot route with waypoints: the antenna rect (1244..1256, 114..176)
         blocks the direct spot3->spot4 diagonal — go around its south side. */
      const spots = [
        [[1015, 165]], [[1225, 190]], [[1160, 235]],
        [[1230, 196], [1280, 196], [1305, 150]],
      ];
      const qLines = [], bLines = [];
      let ok4 = true;
      for (let i = 0; i < spots.length; i++) {
        for (let w = 0; w < spots[i].length; w++) {
          ok4 = await drive(spots[i][w][0], spots[i][w][1], { run: true, timeout: 9000 }) && ok4;
        }
        await waitT(() => G.missionState.m4found === i + 1, 3000, 100);
        const live = STEPS[stepIndexAt(G.time)].line;
        const ban = HUD.banner ? HUD.banner.sub : '';
        qLines.push(live); bLines.push(ban);
        ck('m4 medallion ' + (i + 1) + ' found', G.missionState.m4found === i + 1,
          'found=' + G.missionState.m4found + ' q="' + live + '"');
      }
      ck('m4 questions byte-exact (banner === live lyric line, all 4)',
        qLines.length === 4 && qLines.every((l, i) => l && l.length > 3 && l === bLines[i]),
        qLines.map((l, i) => (l === bLines[i] ? '✓' : '✗')).join('') + ' ' + qLines[0].slice(0, 60));
      await waitT(() => G.missionState.done, 5000, 100); // hook banner lands ~1.5s after find 4
      s = G.missionState;
      mark('m4-find');
      ck('m4 all four = hook (done)', s.done && s.m4found === 4,
        'done=' + s.done + ' found=' + s.m4found + ' banner=' + (HUD.banner ? HUD.banner.title : '') + (ok4 ? '' : ' (drive stall)'));

      /* ---------- MISSION 5 (122.19 → 157.11) — hell crossroads ----------
         arc: (1316,408) r86, ON the last 0.9s of each 2.6s cycle (mt = t−122.19).
         street y≈330 is INSIDE the arc zone -> crossing needs the OFF window. */
      await waitT(() => G.missionState.id === 'm5' && G.missionState.phase === 'cross', 60000, 150); // ~35vt of game time away
      G.resetCounts(); s = G.missionState;
      mark('m5-open');
      ck('m5 opens at the chalipa', s.id === 'm5' && s.phase === 'cross' && s.m5shocks === 0,
        'id=' + s.id + ' phase=' + s.phase + ' p=' + JSON.stringify(G.player));

      await drive(1250, 332, { run: true, timeout: 9000 }); // stage west, outside r86
      // deliberate shock: step into the zone while the arc is ON (hazard proof)
      await waitT(() => G.missionState.m5arc === true, 20000, 100);
      await drive(1310, 340, { timeout: 8000 });
      await waitT(() => G.missionState.m5shocks >= 1, 3000, 100);
      s = G.missionState;
      ck('m5 transformer arc shocks (timed hazard)', s.m5shocks >= 1,
        'shocks=' + s.m5shocks + ' p=' + JSON.stringify(G.player));

      // re-stage and cross during the OFF window
      await drive(1250, 332, { run: true, timeout: 9000 });
      await waitT(() => G.missionState.m5arc === false, 20000, 100);
      await drive(1420, 335, { run: true, timeout: 12000 }); // east — billboard fires mid-leg
      await waitT(() => G.missionState.m5bb > 0, 5000, 100);
      ck('m5 billboard 4:3 cutscene fires mid-crossing', G.missionState.m5bb > 0,
        'billboard=' + (G.missionState.m5bb || 0).toFixed(1) + 's p=' + JSON.stringify(G.player));
      await drive(1500, 340, { run: true, timeout: 12000 }); // past the wreck, open street
      await waitT(() => G.missionState.done || G.time > 156, 8000, 100);
      s = G.missionState;
      mark('m5-cross');
      ck('m5 crossed hell street (done)', s.done && s.m5crossed,
        'done=' + s.done + ' crossed=' + s.m5crossed + ' shocks=' + s.m5shocks + ' vt=' + G.time.toFixed(1));

      /* ---------- MISSION 6 (157.11 → 172.07) — bridge + blackout ----------
         hands: two radial beams 180° apart at 1.7 rad/s around (900,1000),
         band r 18..90; pivot (r<18) is safe. step 21 (167.08) = blackout. */
      await waitT(() => G.missionState.id === 'm6' && G.missionState.phase === 'whisper', 60000, 150); // ~22vt of game time away
      G.resetCounts(); s = G.missionState;
      mark('m6-open');
      ck('m6 opens at the crazy clock', s.id === 'm6' && s.phase === 'whisper' && s.m6sweeps === 0,
        'id=' + s.id + ' phase=' + s.phase + ' p=' + JSON.stringify(G.player));

      // hand-gap helper: a hand JUST PASSED this angle (0.25..0.6 rad behind) -> ~1.3s clear
      const handJustPassed = (ang) => {
        const mt = G.time - 157.11;
        if (mt < 0.2) return false; // not in m6 yet — no garbage timing
        for (const off of [0, Math.PI]) {
          let da = (mt * 1.7 + off - ang) % (Math.PI * 2);
          if (da < 0) da += Math.PI * 2;
          if (da > 0.25 && da < 0.6) return true;
        }
        return false;
      };
      await waitT(() => handJustPassed(-Math.PI / 2), 20000, 60); // entry angle (north)
      await drive(912, 984, { run: true, timeout: 8000 });        // dash into the safe pocket (NE of the pedestal)
      await drive(940, 1000, { run: true, timeout: 8000 });       // east of the pedestal (r 40 — pocket)
      await waitT(() => handJustPassed(Math.PI / 2), 20000, 60);  // exit angle (south)
      await drive(940, 1050, { run: true, timeout: 8000 });       // south-east, clear of the pedestal
      await drive(904, 1090, { run: true, timeout: 9000 });       // out of the rotunda
      s = G.missionState;
      ck('m6 clock hands dodged', s.m6sweeps <= 1,
        'sweeps=' + s.m6sweeps + ' p=' + JSON.stringify(G.player));

      // slalom to the bridge mouth; wait for the blackout (step 21 · 167.08)
      await drive(934, 1160, { run: true, timeout: 9000 });
      await waitT(() => G.missionState.m6dark === true, 30000, 120); // step 22 @167.08
      s = G.missionState;
      mark('m6-dark');
      ck('m6 blackout falls on step 22 (یا اسکندر)', s.m6dark === true && s.phase === 'blackout',
        'dark=' + s.m6dark + ' phase=' + s.phase + ' div=' + JSON.stringify(s.m6div) + ' vt=' + G.time.toFixed(1));

      /* the matchlight div: patrols x 880<->928 at y 1215, sp 38, 1.2s pause
         at each end, matchlight r46. The east channel (x~932) is dark while
         the div rests at the WEST end — dash south during its west pause. */
      await waitT(() => { const d = G.missionState.m6div; return d && d.x <= 884; }, 20000, 80);
      // east channel past the resting div (junk2 stays clear), then deep onto
      // the south street — the drive tol stops short, so aim past y>=1300.
      await drive(940, 1245, { run: true, timeout: 8000 });
      await drive(900, 1330, { run: true, timeout: 9000, tol: 18 });
      await waitT(() => G.missionState.done || G.time > 171.5, 8000, 100);
      s = G.missionState;
      mark('m6-cross');
      ck('m6 sneaked past the matchlight (done)', s.done && s.m6crossed && s.m6spots === 0,
        'done=' + s.done + ' crossed=' + s.m6crossed + ' spots=' + s.m6spots + ' vt=' + G.time.toFixed(1));

      /* ---------- c1 cutscene (172.07 → 187.03) — ad silence ---------- */
      await waitT(() => G.missionState.id === 'c1', 30000, 150);
      s = G.missionState;
      ck('c1 interlude takes over (no gameplay)', s.id === 'c1' && s.phase === 'cut',
        'id=' + s.id + ' phase=' + s.phase + ' vt=' + G.time.toFixed(1));

      /* end of the M2 playthrough (m4 → m6 → c1). stop capturing + release. */
      if (RECORD) window.__recOn = false;
      window.__m2done = true;
    })().catch(e => { window.__m2err = String(e && e.message || e); window.__m2done = true; })
  }, RECORD);

  /* liveness only — the in-page interval is the clock; it keeps the game
     live through phase B too (hold() pauses it per screenshot). */
  {
    const tA = Date.now();
    let nLast = 0;
    while (Date.now() - tA < 360000) {
      const st = await page.evaluate(() => ({
        vt: window.__game.time,
        done: window.__m2done, err: window.__m2err, n: window.__m2log.length,
      }));
      if (st.done) { if (st.err) check('phase A script error', false, st.err); break; }
      if (st.n > nLast) { nLast = st.n; console.log(ts() + '       | phase A @ vt=' + st.vt.toFixed(1) + ' (' + st.n + ' checks)'); }
      await sleep(2000);
    }
    const log = await page.evaluate(() => window.__m2log);
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
        t0: window.__recT0 || 0, t1: window.__game.time }));
      const fps = frames.length > 1 ? (frames.length - 1) / Math.max(1, span.t1 - span.t0) : 5;
      check('recording captured frames', frames.length >= 200,
        frames.length + ' frames, ' + (span.t1 - span.t0).toFixed(1) + 's of game time, ' + fps.toFixed(2) + 'fps true rate');
      if (frames.length >= 200) {
        const fdir = path.join(OUTDIR, 'frames'); fs.mkdirSync(fdir, { recursive: true });
        frames.forEach((b, i) => fs.writeFileSync(path.join(fdir, 'f' + String(i).padStart(5, '0') + '.jpg'), b));
        const recDir = path.join(ROOT, 'game', 'recordings'); fs.mkdirSync(recDir, { recursive: true });
        const out = path.join(recDir, 'm2-playthrough.mp4');
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
  await staged('m4-medallion.jpg', { id: 'm4', seek: 85.0, x: 1000, y: 178 });               // found medallion pop + question
  await staged('m4-hook.jpg', { id: 'm4', seek: 118.0, hops: [[1005, 172], [1218, 197], [1152, 242], [1298, 156]], x: 1150, y: 200, settle: 900 }); // all four medallions
  await staged('m5-arc.jpg', { id: 'm5', seek: 123.4, x: 1272, y: 366 });                    // transformer arc ON (mt~1.9)
  await staged('m5-billboard.jpg', { id: 'm5', seek: 126.0, x: 1412, y: 342 });              // 4:3 billboard cutscene
  await staged('m6-hands.jpg', { id: 'm6', seek: 160.0, x: 900, y: 928 });                   // crazy clock sweeping
  await staged('m6-blackout.jpg', { id: 'm6', preSeek: 160.0, seek: 168.5, x: 904, y: 1105 }); // darkness + matchlight div (step 22 fires live)
  /* ---------- final ---------- */
  check('zero console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  check('zero page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
  check('zero failed requests', failedReqs.length === 0, failedReqs.slice(0, 3).join(' | '));

  done(results.fail.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
