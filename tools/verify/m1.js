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
const OUTDIR = process.argv[2] || '/tmp/m1-shots';
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
    window.__m1log = []; window.__m1done = false; window.__m1err = null;
    /* THE CLOCK (in-page): interval-paced 0.1s simulation ticks. Immune to
       CDP evaluate RTT; vt advances at <= 1.0x wall, never faster. */
    if (RECORD) {
      /* gameplay recorder: JPEG frames keyed to GAME time (one per ~0.2s of
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
      /* capture one frame per fresh render, ~0.3s of GAME time apart; frames
         are keyed to game time so the video is pace-true however wall time
         stretches under the software renderer. */
      if (G.time < window.__recLastT) window.__recLastT = G.time; // seek-back tolerance
      if (RECORD && n % 3 === 0 && window.__recOn && G.time - window.__recLastT >= 0.29) {
        window.__recLastT = G.time;
        if (window.__recFrames.length === 0) window.__recT0 = G.time;
        window.__recCtx.drawImage(window.__recSrc, 0, 0, 960, 540);
        window.__recFrames.push(window.__recCtx.canvas.toDataURL('image/jpeg', 0.72));
      }
    }, 100);
    const ck = (name, ok, detail) => window.__m1log.push({ name, ok: !!ok, detail: detail == null ? '' : String(detail) });
    const sleep2 = (ms) => new Promise(r => setTimeout(r, ms));
    const marks = [{ w: performance.now(), v: G.time }];
    const mark = (name) => {
      const m0 = marks[marks.length - 1], w1 = performance.now(), v1 = G.time;
      ck('rate ' + name, true, 'vt/wall=' + ((v1 - m0.v) / ((w1 - m0.w) / 1000)).toFixed(2));
      marks.push({ w: w1, v: v1 });
    };
    /* in-page autopilot wait (setInterval — no CDP cost) */
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

    (async () => {
      /* clean m1 reopen (the real-audio segment may have drifted deep into m1):
         jump to m2 window → back to t=0 — the swap machinery resets all
         mission impl state and teleports to the mission start. */
      G.seek(35.0);
      await waitT(() => G.missionState.id === 'm2', 8000);
      G.seek(0.0);
      await waitT(() => G.missionState.id === 'm1' && G.missionState.phase === 'infiltrate', 8000);
      G.resetCounts();
      if (RECORD) { // drop the reset-dance pre-roll; video starts at m1 t=0
        window.__recFrames.length = 0; window.__recLastT = -1; window.__recT0 = undefined;
      }
      await sleep2(700);

      /* ---------- MISSION 1 (0 → 33.67s) — council stealth ---------- */
      let s = G.missionState;
      ck('m1 opens at t=0', s.id === 'm1' && s.phase === 'infiltrate' && !s.sparked,
        'id=' + s.id + ' phase=' + s.phase + ' p=' + JSON.stringify(G.player));

      /* deterministic stealth plan (guard cycles are fixed from t=0:
         g1 patrols y=132, x 150<->310 @52 (3.08s per run, E first);
         g2 patrols y=246, x 310<->150 @46 (3.48s per run, W first);
         the table 'furn' rect [140,166,160,20] blocks guard LOS; the spark
         at 24.94 grants witness within 90px of the goal (178,156)).
         ZERO-EXPOSURE ROUTE:
         - the start (240,330) and staging (240,310) are table-blocked from
           g1 and out of both cones -> stand there freely;
         - g2's opening W-run [0,3.48] endangers the south floor only while
           x2>239 (t<1.54). Transit at t~1.8: (240,240) -> (180,192) — the
           table's south face PINS the player at y=196, 40px from the goal ->
           witness latches; g1 never sees through the table; g2 is E-bound.
         - retreat before g2's next W-run (t<6.96): one diagonal leg
           (240,310) straight through the door gap (crossing x~227).
         - stand at staging through the spark (24.94): phase flips to escape
           and the player is ALREADY outside the council rect -> escaped
           latches on the same tick (rank: full witness + escape). */
      let witnessed = false, lastErr = '';
      const catches = []; // telemetry: where each caught happened
      let caughtSeen = 0;
      const catchIv = setInterval(() => {
        const st = G.missionState;
        if (st.id === 'm1' && st.caught > caughtSeen) {
          caughtSeen = st.caught;
          catches.push({ vt: +G.time.toFixed(1), p: G.player, g: st.m1guards });
        }
      }, 80);
      await waitT(() => G.time >= 1.8, 20000, 100); // g2 clears the danger arc
      for (let attempt = 0; attempt < 2 && !witnessed && G.time < 5.8; attempt++) {
        if (attempt) await sleep2(400);
        await drive(240, 240, { run: true, timeout: 8000 }); // in through the door
        await drive(180, 192, { timeout: 8000, tol: 12 });   // pinned at the table face
        await waitT(() => G.missionState.witnessed, 3000, 100);
        witnessed = G.missionState.witnessed;
        if (!witnessed) lastErr = 'no witness latch p=' + JSON.stringify(G.player);
      }
      s = G.missionState;
      mark('m1-witness');
      ck('m1 witness the fuse corner', s.witnessed && s.caught === 0,
        'witnessed=' + s.witnessed + ' caught=' + s.caught + ' ' + lastErr + ' p=' + JSON.stringify(G.player) +
        (catches.length ? ' catches=' + JSON.stringify(catches) : ''));

      // retreat to staging before g2's next W-run (6.96): the table face is
      // only safe while g2 is E-bound. Staging is safe forever.
      await waitT(() => G.time >= 6.2, 20000, 100);
      await drive(240, 310, { run: true, timeout: 9000 }); // diagonal through the gap

      // step 4 (24.94): the spark auto-fires; the player is already outside
      // the council rect at staging -> escape latches on the spark tick
      await waitT(() => G.time >= 25.6, 40000, 100);
      s = G.missionState;
      mark('m1-spark');
      ck('m1 spark fires on step 4', s.sparked && s.phase === 'escape',
        't=' + G.time.toFixed(1) + ' phase=' + s.phase);

      // retreat through the door gap before g2's W-run, then out
      let escaped = false;
      for (let i = 0; i < 3 && !escaped && G.time < 32.0; i++) {
        if (i) await sleep2(1400);
        await drive(240, 310, { run: true, timeout: 9000 }); // diagonal through the gap
        await drive(240, 345, { timeout: 6000 });
        s = G.missionState;
        escaped = s.escaped;
      }
      mark('m1-escape');
      ck('m1 escaped the council', s.escaped,
        'escaped=' + s.escaped + ' caught=' + s.caught + ' vt=' + G.time.toFixed(1) +
        ' p=' + JSON.stringify(G.player) + (catches.length ? ' catches=' + JSON.stringify(catches) : ''));
      clearInterval(catchIv); // telemetry covers the whole m1 segment
      /* ---------- MISSION 2 (33.67 → 42.39s) — candle birth ---------- */
      await waitT(() => (G.time >= 34.4 && G.missionState.id === 'm2') || G.time > 36.5, 40000, 200);
      await sleep2(450); // fade in
      s = G.missionState;
      mark('m2-open');
            ck('m2 opens (fade transition)', s.id === 'm2' && s.phase === 'gather',
        'id=' + s.id + ' phase=' + s.phase);

      /* fixed collection route (near-optimal order, ~430px total; pickup
         radius 22 vs drive tol 18) — the window is only 8.7 virtual s, so
         no nearest-recompute chatter; leave by 39.3 for door margin */
      const m2Route = [[660, 570], [600, 560], [650, 520], [615, 492], [688, 490], [700, 555]];
      let outageMax = 0;
      for (const wp of m2Route) {
        if (G.time > 39.8 || G.missionState.id !== 'm2') break;
        const st0 = G.missionState; // skip embers already picked up (puff drift)
        if (st0.m2embers) {
          const e = st0.m2embers.reduce((a, b) =>
            (Math.hypot(a.x - wp[0], a.y - wp[1]) <= Math.hypot(b.x - wp[0], b.y - wp[1]) ? a : b));
          if (e.got) continue;
        }
        await drive(wp[0], wp[1], { timeout: 4500, tol: 18 });
        outageMax = Math.max(outageMax, G.missionState.outage);
      }
      s = G.missionState;
      mark('m2-embers');
      ck('m2 embers collected (light grows)', s.id === 'm2' && s.m2level >= 4,
        'level=' + s.m2level + '/6 light=' + s.m2light + ' vt=' + G.time.toFixed(1));
      ck('m2 outage meter fills in darkness', outageMax > 3, 'outageMax=' + outageMax + 'h');
      if (s.id === 'm2' && s.m2level >= 6) {
        await drive(650, 448, { timeout: 6000, tol: 20 }); // north door: arrival below the y<470 trigger
        await sleep2(300);
        s = G.missionState;
        ck('m2 exit completes mission', s.done,
          'done=' + s.done + ' level=' + s.m2level + ' p=' + JSON.stringify(G.player));
      } else {
        ck('m2 exit completes mission', false, 'level ' + s.m2level + ' at vt ' + G.time.toFixed(1));
      }

      /* ---------- MISSION 3 (42.39 → 79.80s) — 40° room ---------- */
      await waitT(() => (G.time >= 43.4 && G.missionState.id === 'm3') || G.time > 45.5, 40000, 200);
      s = G.missionState;
      ck('m3 opens', s.id === 'm3' && s.phase === 'survive',
        'id=' + s.id + ' phase=' + s.phase + ' temp=' + s.temp);

      // hold beside the fan (solid circle r26 → rest at ~(648,235)); ambient
      // heat stays survivable — sample the hold, then leave BEFORE the pin
      await drive(648, 235, { timeout: 8000, tol: 20 });
      let fanMax = 0;
      while (G.time < 70.5) {
        const st = G.missionState;
        if (st.id !== 'm3') break; // window closed unexpectedly
        fanMax = Math.max(fanMax, st.temp);
        await sleep2(300);
      }
      s = G.missionState;
      mark('m3-fanhold');
      ck('m3 temp survives with fan', s.id === 'm3' && fanMax < 44 && s.temp < 44,
        'temp=' + s.temp + ' fanMax=' + fanMax);

      /* step 11 flips the phase to escape; the escape latches on the first
         escape-phase tick with the player inside the roof rect. A POST-pin
         run cannot beat the 79.8 close, so the exit+street+roof legs all run
         PRE-pin and the player WAITS at the roof edge for the flip.
         NOTE: on success the mission sets done and the runner ADVANCES (and
         resets MSTATE) within ~2s — so the checks read latched timestamps
         from this sampler, not the (possibly already reset) live state. */
      let pinT = 0, escT = 0, heatMax = 0;
      const m3Iv = setInterval(() => {
        const st = G.missionState;
        if (st.id === 'm3') {
          if (st.pin && !pinT) pinT = +G.time.toFixed(1);
          if (st.escaped && !escT) escT = +G.time.toFixed(1);
          heatMax = Math.max(heatMax, st.heatDeaths || 0);
        }
      }, 80);
      const dts = [];
      /* EAST exit (NOT the S door): a seeded random parked car sits at
         ~(668,268) — its 38x38 solid x 649–687 blocks the door gap x 640–690.
         The room has no E/W walls ('S' walls emit only N + S segments), and:
         (a) random cars exist only in bands y 249–287 / 373–411 — the room
             midline y~235 is clear by construction (disc bottom 245 < 249);
         (b) cars are excluded within 80px of VX streets — the x=900 street
             keeps the x 820–980 corridor car-free for the south drop. */
      await drive(885, 230, { run: true, timeout: 8000 }); dts.push('eastOut@' + G.time.toFixed(1));
      await drive(885, 300, { run: true, timeout: 8000 }); dts.push('dropS@' + G.time.toFixed(1));
      /* street route west of the chalipa car cluster: the landmark cars at
         (1360,296)/(1424,292) solid x 1341–1443 wedge any north run at
         x>1341; the roof cell (block 2,0) is open — enter it from the south
         at x=1240 (the roof-side furn x 1244–1256 clears the target). */
      let m3ok = true;
      m3ok = await drive(1240, 330, { run: true, timeout: 12000 }) && m3ok; dts.push('street@' + G.time.toFixed(1));
      m3ok = await drive(1240, 188, { timeout: 8000 }) && m3ok; dts.push('roof@' + G.time.toFixed(1));
      await waitT(() => (pinT && escT) || G.time > 79, 30000, 120);
      clearInterval(m3Iv);
      s = G.missionState;
      mark('m3-roof');
      ck('m3 GPS pin drops on step 11', pinT > 0,
        'pinT=' + pinT + ' escT=' + escT + ' now=' + G.time.toFixed(1) + ' id=' + s.id +
        ' p=' + JSON.stringify(G.player));
      ck('m3 escaped to the roof', escT > 0 && heatMax === 0,
        'escaped@' + escT + ' heatDeaths=' + heatMax + ' now=' + G.time.toFixed(1) +
        ' p=' + JSON.stringify(G.player) + ' ' + dts.join(' ') + (m3ok ? '' : ' (drive stall)'));

      await waitT(() => G.time >= 80.5 && G.mission === 'm4', 120000, 250);
      ck('m4 window arrives after m3 (free-walk guard)', G.mission === 'm4',
        'mission=' + G.mission);
    })().catch(e => { window.__m1err = String(e && e.message || e); })
      .then(() => { window.__m1done = true; window.__recOn = false; });
  }, RECORD);

  /* liveness only — the in-page interval is the clock; it keeps the game
     live through phase B too (hold() pauses it per screenshot). */
  {
    const tA = Date.now();
    let nLast = 0;
    while (Date.now() - tA < 360000) {
      const st = await page.evaluate(() => ({
        vt: window.__game.time,
        done: window.__m1done, err: window.__m1err, n: window.__m1log.length,
      }));
      if (st.done) { if (st.err) check('phase A script error', false, st.err); break; }
      if (st.n > nLast) { nLast = st.n; console.log(ts() + '       | phase A @ vt=' + st.vt.toFixed(1) + ' (' + st.n + ' checks)'); }
      await sleep(2000);
    }
    const log = await page.evaluate(() => window.__m1log);
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
        const out = path.join(recDir, 'm1-playthrough.mp4');
        const ff = '/home/user/pylibs/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2';
        const args = ['-y', '-framerate', fps.toFixed(4), '-i', path.join(fdir, 'f%05d.jpg'),
          '-ss', span.t0.toFixed(2), '-t', (span.t1 - span.t0 + 0.3).toFixed(2), '-i', path.join(ROOT, 'BARGH (4).mp3'),
          '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23',
          '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', out];
        const r = require('child_process').spawnSync(ff, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        const ok = r.status === 0 && fs.existsSync(out) && fs.statSync(out).size > 100000;
        check('recording assembled (m1-playthrough.mp4)', ok,
          ok ? (frames.length + ' frames, ' + (fs.statSync(out).size / 1e6).toFixed(1) + 'MB, song 0-' + vtEnd.toFixed(1) + 's muxed, ' + ((Date.now() - tRec) / 1000).toFixed(0) + 's wall')
             : 'ffmpeg: ' + r.stderr.toString().slice(-300));
      }
    }
  }

  /* ================= PHASE B — staged screenshots ================= */
  await staged('m1-witness.jpg', { id: 'm1', seek: 20.0, x: 185, y: 190 });          // sneak near the fuse corner, cones visible
  await staged('m1-spark.jpg', { id: 'm1', preSeek: 20.0, seek: 26.5, x: 210, y: 220, settle: 700 }); // spark burst + gold crack
  await staged('m2-birth.jpg', { id: 'm2', seek: 35.5, x: 650, y: 545 });            // newborn flame in darkness
  await staged('m3-fan-temp.jpg', { id: 'm3', seek: 52.0, x: 640, y: 228 });         // fan + heat rings + gauge
  await staged('m3-escape-run.jpg', { id: 'm3', preSeek: 60.5, seek: 74.5, x: 1000, y: 330 }); // pin phase, running the street
  await staged('m3-roof.jpg', { id: 'm3', preSeek: 60.5, seek: 78.0, x: 1200, y: 190 });      // arrived on the roof

  /* ---------- final ---------- */
  check('zero console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  check('zero page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
  check('zero failed requests', failedReqs.length === 0, failedReqs.slice(0, 3).join(' | '));

  done(results.fail.length ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
