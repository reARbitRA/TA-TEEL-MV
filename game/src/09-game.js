/* ---------- 09 · game: state machine, song clock, loop ----------
   The song IS the clock: gameTime() = audio.currentTime. Pause song → pause game. */

const GAME = {
  state: 'loading',   // loading → title → play → ended
  paused: false,
  hold: false,        // verification hold (clock frozen, no overlay)
  virtual: false, vt: 0, // verification virtual clock (harness-paced; song parked)
  drive: null, driveArrived: false, // verification autopilot
  stepIdx: -1,
  missionShown: null,
  zone: null,
  startedAt: 0,
  fps: 60, _fpsAcc: 0, _fpsN: 0, _fpsT: 0,
};
let FRAME_DT = 1 / 60;
function gameTime() { return GAME.virtual ? GAME.vt : (song.currentTime || 0); }

/* verification autopilot: drives the same input struct the keyboard writes to */
function driveStep() {
  const d = GAME.drive;
  const dx = d.x - player.x, dy = d.y - player.y;
  if (Math.hypot(dx, dy) < (d.tol || 14)) {
    input.up = input.down = input.left = input.right = 0; input.run = 0;
    GAME.driveArrived = true;
    return;
  }
  input.left = dx < -8 ? 1 : 0; input.right = dx > 8 ? 1 : 0;
  input.up = dy < -8 ? 1 : 0; input.down = dy > 8 ? 1 : 0;
  // walk the last stretch: at coarse harness ticks a running step (~62px)
  // can overshoot the tolerance band and oscillate; walking (~37px) converges
  input.run = (d.run && Math.hypot(dx, dy) >= 50) ? 1 : 0;
  GAME.driveArrived = false;
}

/* pause/resume — audio and game freeze together */
function setPause(p) {
  if (GAME.state !== 'play') return;
  GAME.paused = p;
  if (GAME.virtual) return; // virtual clock: park/unpark via __game.hold, song stays parked
  if (p) song.pause(); else song.play().catch(() => {});
}
function togglePause() { setPause(!GAME.paused); }

/* start: user gesture unlocks audio */
/* free roam: the whole city, no mission windows — unlocked by the stamp */
function startFreeRoam() {
  if (GAME.state !== 'ended' && GAME.state !== 'title') return;
  try { localStorage.setItem('teatil-freeroam', '1'); } catch (e) {}
  GAME.freeroam = true;
  GAME.state = 'play';
  GAME.startedAt = performance.now();
  GAME.stepIdx = -1; GAME.missionShown = null;
  song.currentTime = 0;
  song.loop = true;
  const pr = song.play();
  if (pr && pr.catch) pr.catch(() => {});
  SFX.ensure();
  MSTATE.m = null; MSTATE.id = 'free'; MSTATE.fadeA = 0; MSTATE.fadeDir = 0; MSTATE.pending = null;
  MSTATE.objText = 'شهرِ آزاد — شهر مالِ توست'; MSTATE.done = false;
  player.x = 1200; player.y = 560; player.vx = player.vy = 0;
  cam.x = 1200; cam.y = 560; cam.tz = CFG.ZOOM;
  initTraffic();
}
function startGame() {
  if (GAME.state !== 'title') return;
  song.currentTime = 0;
  GAME._simT = null; GAME._tPrev = null;
  const pr = song.play();
  if (pr && pr.catch) pr.catch(err => { __errors.push('audio play rejected: ' + err.message); });
  SFX.ensure();
  achReset(); // a fresh run starts all 29 word-icons in shadow
  GAME.state = 'play';
  GAME.startedAt = performance.now();
  GAME.stepIdx = -1;
  GAME.missionShown = null;
  MSTATE.id = null; MSTATE.m = null; MSTATE.fadeA = 0; MSTATE.fadeDir = 0; MSTATE.pending = null;
  MSTATE.objText = ''; MSTATE.done = false; MSTATE.caught = 0; MSTATE.heatDeaths = 0;
  initTraffic();
}

/* ---- boot: load everything, build world, show title ---- */
async function boot() {
  // font first (Lalezar embedded base64)
  try { await document.fonts.load('30px Lalezar'); await document.fonts.ready; } catch (e) { /* Tahoma fallback */ }
  await Promise.all(flattenAssets());
  buildWorld();
  buildMinimap();
  initTraffic();
  initTouch();
  GAME.state = 'title';
  requestAnimationFrame(loop);
}

/* ---- per-step / per-mission timeline reactions ---- */
function timelineTick(t) {
  const idx = stepIndexAt(t);
  if (idx !== GAME.stepIdx) {
    // catch-up: after a stall (hidden tab, GC, buffering) several steps may
    // have been crossed — fire every one of them in order, none skipped.
    const backward = idx < GAME.stepIdx;
    const from = backward ? idx : GAME.stepIdx + 1;
    for (let i = from; i <= idx; i++) {
      const S = STEPS[i], EV = (S && S.evObj) || {};
      // generic screen events (animatic flash language)
      if (EV.white) FLASH.white = .95;
      else if (EV.flash) FLASH.white = .68;
      if (EV.grave || EV.stamp || EV.end) cam.shake = Math.min(1, cam.shake + .35);
      if (EV.chador) cam.shake = Math.min(1, cam.shake + .3);
      // word-icons of the song (29 achievements)
      achStepEvent(S, EV);
      // route to the active mission
      missionStepEvent(S.n);
    }
    GAME.stepIdx = idx;
  }
  const m = missionAt(t);
  if (m && m.id !== GAME.missionShown) {
    GAME.missionShown = m.id;
    if (!m.cut) showBanner(m.title, m.obj);
    else showBanner(m.title, ''); // auto cutscene marker (full cutscenes land M2)
  }
  // zone captions
  const z = zoneAt(player.x, player.y);
  if (z && (!GAME.zone || GAME.zone.name !== z.name)) { GAME.zone = z; zoneCaption(z.name); }
  if (!z) GAME.zone = null;
}

/* ---- render one frame ---- */
function render(t) {
  const c2 = ctx;
  c2.setTransform(1, 0, 0, 1, 0, 0);
  c2.fillStyle = '#070b16';
  c2.fillRect(0, 0, cv.width, cv.height);
  // world
  cameraTransform(c2, t);
  c2.imageSmoothingEnabled = true;
  c2.drawImage(WORLD, 0, 0);
  trafficDraw(c2, t);
  playerDraw(c2);
  missionDrawWorld(c2, t);
  // screen-space layers
  c2.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  // flash overlays (white = story flashes; red = caught/heat)
  if (FLASH.white > 0) { c2.fillStyle = 'rgba(255,255,255,' + FLASH.white.toFixed(3) + ')'; c2.fillRect(0, 0, CFG.W, CFG.H); }
  if (FLASH.red > 0) {
    const g = c2.createRadialGradient(CFG.W / 2, CFG.H / 2, CFG.H * .25, CFG.W / 2, CFG.H / 2, CFG.H * .75);
    g.addColorStop(0, 'rgba(163,20,20,0)'); g.addColorStop(1, 'rgba(163,20,20,' + FLASH.red.toFixed(3) + ')');
    c2.fillStyle = g; c2.fillRect(0, 0, CFG.W, CFG.H);
  }
  // vignette
  const g = c2.createRadialGradient(CFG.W / 2, CFG.H / 2, CFG.H * .42, CFG.W / 2, CFG.H / 2, CFG.H * .78);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(4,7,14,.55)');
  c2.fillStyle = g; c2.fillRect(0, 0, CFG.W, CFG.H);
  // film grain (subtle, animatic language)
  c2.fillStyle = 'rgba(255,255,255,.03)';
  for (let i = 0; i < 60; i++) c2.fillRect(Math.random() * CFG.W, Math.random() * CFG.H, 1.4, 1.4);

  if (GAME.state === 'title') { drawTitle(c2, t); tazhibFrame(c2); return; }
  if (GAME.state === 'ended') { drawEnded(c2, t); tazhibFrame(c2); return; }

  // HUD
  drawTopHUD(c2, t, Math.max(0, GAME.stepIdx));
  drawAchievements(c2, t); // 29 word-icons (achievements-list.md)
  missionDrawHUD(c2, t);
  drawTicker(c2, t, Math.max(0, GAME.stepIdx));
  drawMinimap(c2, t);
  drawGuide(c2, t);
  drawBanner(c2, FRAME_DT);
  drawZoneCap(c2, FRAME_DT);
  drawTouch(c2);
  if (GAME.paused) drawPause(c2);
  if (DEBUG) drawDebug(c2);
  tazhibFrame(c2);
}

function drawTitle(c2, t) {
  c2.fillStyle = 'rgba(7,11,22,.78)'; c2.fillRect(0, 0, CFG.W, CFG.H);
  // title: the final stamp as a promise
  c2.save();
  c2.translate(CFG.W / 2, CFG.H * .34);
  c2.rotate(-.06);
  const pl = 1 + Math.sin(t * 2.2) * .012;
  c2.scale(pl, pl);
  c2.font = '128px ' + CFG.FONT; c2.textAlign = 'center';
  c2.lineWidth = 10; c2.strokeStyle = PAL.blood; c2.strokeText('تعطیل', 0, 0);
  c2.fillStyle = PAL.blood; c2.fillText('تعطیل', 0, 0);
  c2.strokeStyle = 'rgba(163,40,42,.5)'; c2.lineWidth = 3;
  c2.strokeRect(-190, -110, 380, 160);
  c2.restore();
  c2.textAlign = 'center';
  c2.fillStyle = PAL.ink; c2.font = '34px ' + CFG.FONT;
  c2.fillText('«تعطیل (برقِ من)» — موزیک‌ویدیوی قابلِ بازی', CFG.W / 2, CFG.H * .34 + 90);
  c2.fillStyle = '#8b93a8'; c2.font = '19px ' + CFG.FONT;
  c2.fillText('آهنگ، ساعتِ بازی است — ۹ مأموریت، ۹ سکانس، یک مُهر', CFG.W / 2, CFG.H * .34 + 124);
  // start button
  const bw = 260, bh = 62, bx = CFG.W / 2 - bw / 2, by = CFG.H * .58;
  const hov = 1 + Math.sin(t * 3) * .03;
  c2.save(); c2.translate(CFG.W / 2, by + bh / 2); c2.scale(hov, hov);
  c2.fillStyle = '#141a2e'; c2.fillRect(-bw / 2, -bh / 2, bw, bh);
  c2.strokeStyle = PAL.gold; c2.lineWidth = 2; c2.strokeRect(-bw / 2, -bh / 2, bw, bh);
  c2.fillStyle = PAL.gold; c2.font = '30px ' + CFG.FONT;
  c2.fillText('▶ شروع', 0, 11);
  c2.restore();
  c2.fillStyle = '#8b93a8'; c2.font = '16px ' + CFG.FONT;
  c2.fillText('WASD / فلش‌ها: راه‌رفتن · Shift: دویدن · E: تعامل · Space: ضربه‌ی نور · P: توقف', CFG.W / 2, CFG.H * .58 + 96);
  c2.fillText('موبایل: دی‌پدِ لمسی خودکار روشن می‌شود', CFG.W / 2, CFG.H * .58 + 122);
  // invisible click zone handled in input
  if (freeroamUnlocked()) { // second button: the open city (below the hints)
    const bw2 = 260, bh2 = 50, by2 = CFG.H * .58 + 148;
    c2.save(); c2.translate(CFG.W / 2, by2 + bh2 / 2);
    c2.fillStyle = '#141a2e'; c2.fillRect(-bw2 / 2, -bh2 / 2, bw2, bh2);
    c2.strokeStyle = PAL.goldDim; c2.lineWidth = 2; c2.strokeRect(-bw2 / 2, -bh2 / 2, bw2, bh2);
    c2.fillStyle = PAL.goldDim; c2.font = '23px ' + CFG.FONT;
    c2.fillText('🌌 شهرِ آزاد', 0, 9);
    c2.restore();
    GAME._frTitleZone = { bx: CFG.W / 2 - bw2 / 2, by: by2, bw: bw2, bh: bh2 };
  } else GAME._frTitleZone = null;
  // 29 shadow word-icons — the promise of the run (achievements-list.md)
  drawAchievements(c2, t, 'title');
  c2.fillStyle = 'rgba(139,147,168,.55)'; c2.font = '13px ' + CFG.FONT;
  c2.fillText('۹ مأموریت · ۲ میان‌بند · ۲۹ واژهٔ روشن‌شونده · مُهرِ پایانی — آهنگ تمام شود، بازی مُهر می‌خورد', CFG.W / 2, CFG.H - 56);
}
function freeroamUnlocked() {
  try { return localStorage.getItem('teatil-freeroam') === '1' || GAME.freeroam; } catch (e) { return !!GAME.freeroam; }
}
function drawEnded(c2, t) {
  c2.fillStyle = 'rgba(4,6,14,.9)'; c2.fillRect(0, 0, CFG.W, CFG.H);
  const et = GAME.endedAt ? Math.min(1, (performance.now() - GAME.endedAt) / 1000 / .5) : 1;
  // THE STAMP — «تعطیل» slams in (scale 2.3→1 + a shake at contact)
  const k = 2.3 - 1.3 * et;
  const shake = et < 1 ? (1 - et) * 6 : 0;
  c2.save();
  c2.translate(CFG.W / 2 + Math.sin(t * 61) * shake, CFG.H * .36 + Math.cos(t * 53) * shake);
  c2.rotate(-.07);
  c2.scale(k, k);
  c2.font = '150px ' + CFG.FONT; c2.textAlign = 'center';
  c2.lineWidth = 12; c2.strokeStyle = PAL.blood; c2.strokeText('تعطیل', 0, 0);
  c2.fillStyle = PAL.blood; c2.fillText('تعطیل', 0, 0);
  c2.strokeStyle = 'rgba(217,178,60,.85)'; c2.lineWidth = 3.5;
  c2.strokeRect(-215, -124, 430, 178);
  c2.font = '20px ' + CFG.FONT; c2.fillStyle = PAL.gold;
  c2.fillText('آهنگ تمام شد — شهر، روشن ماند', 0, 116);
  c2.restore();
  // credits
  c2.textAlign = 'center'; c2.fillStyle = PAL.ink; c2.font = '21px ' + CFG.FONT;
  c2.fillText('«تعطیل (برقِ من)» — موزیک‌ویدیوی قابلِ بازی', CFG.W / 2, CFG.H * .58);
  c2.fillStyle = '#8b93a8'; c2.font = '16px ' + CFG.FONT;
  const cr = [
    'طراحی و توسعه: ایجنتِ Arena.ai',
    'هنر: قواعدِ مینیاتورِ صفوی — لاجورد و طلا و شنگرف',
    'موتور: Canvas ۲D + Web Audio — تک‌فایل، بدونِ شبکه',
    'ساعتِ بازی: خودِ آهنگ — ' + faClock(gameTime()) + ' / ' + faClock(SONG.duration),
  ];
  cr.forEach((l, i) => c2.fillText(l, CFG.W / 2, CFG.H * .58 + 34 + i * 26));
  // all-lit payoff: the 29 word-icons of the song, every one burning
  drawAchievements(c2, t, 'ended');
  c2.textAlign = 'center'; c2.font = '17px ' + CFG.FONT;
  c2.fillStyle = ACH.count >= 29 ? PAL.goldHi : PAL.ink;
  c2.fillText('دستاوردها: ' + fa(ACH.count) + ' از ' + fa(29), CFG.W / 2, 548);
  // free-roam button
  const bw = 320, bh = 56, bx = CFG.W / 2 - bw / 2, by = CFG.H * .8;
  const hov = 1 + Math.sin(t * 3) * .025;
  c2.save(); c2.translate(CFG.W / 2, by + bh / 2); c2.scale(hov, hov);
  c2.fillStyle = '#141a2e'; c2.fillRect(-bw / 2, -bh / 2, bw, bh);
  c2.strokeStyle = PAL.gold; c2.lineWidth = 2; c2.strokeRect(-bw / 2, -bh / 2, bw, bh);
  c2.fillStyle = PAL.gold; c2.font = '26px ' + CFG.FONT;
  c2.fillText('🌌 ورود به شهرِ آزاد', 0, 10);
  c2.restore();
  GAME._frZone = { bx, by, bw, bh };
}
function drawPause(c2) {
  if (GAME.hold) return; // verification hold: freeze clock w/o overlay (screenshot-safe)
  c2.fillStyle = 'rgba(7,11,22,.6)'; c2.fillRect(0, 0, CFG.W, CFG.H);
  c2.textAlign = 'center'; c2.fillStyle = PAL.gold; c2.font = '54px ' + CFG.FONT;
  c2.fillText('⏸ توقف', CFG.W / 2, CFG.H / 2 - 8);
  c2.fillStyle = '#8b93a8'; c2.font = '18px ' + CFG.FONT;
  c2.fillText('P یا Esc برای ادامه', CFG.W / 2, CFG.H / 2 + 36);
}
function drawDebug(c2) {
  c2.textAlign = 'left'; c2.font = '13px monospace'; c2.fillStyle = '#7fe08a';
  const lines = [
    'fps ' + GAME.fps.toFixed(1),
    't ' + gameTime().toFixed(2) + ' step ' + (GAME.stepIdx + 1),
    'pos ' + Math.round(player.x) + ',' + Math.round(player.y),
    'solids ' + SOLID.rects.length + 'r/' + SOLID.circles.length + 'c',
  ];
  lines.forEach((l, i) => c2.fillText(l, 24, 640 + i * 16));
}

/* hidden tab → audio keeps playing while rAF stops; the song-clock law says
   the game must never run apart from the song — so freeze both together */
document.addEventListener('visibilitychange', () => {
  if (document.hidden && GAME.state === 'play' && !GAME.paused && !GAME.virtual) setPause(true);
});

/* title / ended clicks */
cv.addEventListener('pointerdown', e => {
  const { x, y } = clientToLogical(e.clientX, e.clientY);
  const inZone = (z) => z && x > z.bx && x < z.bx + z.bw && y > z.by && y < z.by + z.bh;
  if (GAME.state === 'title') {
    if (x > CFG.W / 2 - 140 && x < CFG.W / 2 + 140 && y > CFG.H * .58 - 10 && y < CFG.H * .58 + 72) startGame();
    else if (freeroamUnlocked() && inZone(GAME._frTitleZone)) startFreeRoam();
  } else if (GAME.state === 'ended') {
    if (inZone(GAME._frZone)) startFreeRoam();
  }
});

/* ---- main loop ---- */
let LAST = performance.now();
function loop(now) {
  /* verification virtual mode: the bundled headless renderer virtualizes
     every in-page clock (rAF timestamps, performance.now() — they advance
     per DELIVERED frame, not per wall second, and delivery decays to
     ~7/s after ~20s of software rendering). No in-page clock can pace the
     virtual game time, so in virtual mode the rAF loop parks completely
     and the HARNESS advances the simulation tick-by-tick via
     __game.vtAdvance(d) (same update pipeline, exact dt, one render per
     tick). The shipped audio-clock law is untouched — real devices and
     real-audio runs are 100% rAF-driven below. */
  if (GAME.virtual) { GAME._parked = true; return; }
  const dt = Math.min(.05, (now - LAST) / 1000);
  LAST = now;
  FRAME_DT = dt;
  // fps
  GAME._fpsAcc += dt; GAME._fpsN++;
  if (GAME._fpsAcc >= .5) { GAME.fps = GAME._fpsN / GAME._fpsAcc; GAME._fpsAcc = 0; GAME._fpsN = 0; }

  const t = gameTime();
  /* FULL AUDIO SYNC (M4): the song is not just the clock reading — the
     simulation GLUES itself to song time. Each frame advances by wall dt
     plus a gentle 10%/frame correction toward the audio clock (no stutter
     on browsers that quantize currentTime, no double-advance after stalls),
     and hard-resyncs when the gap exceeds .5s (hidden tab, seek, loop):
     the world never runs apart from the song. The clock itself always
     reads audio.currentTime — the law is untouched. */
  let simDt = dt;
  if (!GAME.virtual && GAME.state === 'play' && !GAME.paused) {
    if (GAME._simT == null) GAME._simT = t;
    const err = t - GAME._simT;
    if (Math.abs(err) > .5) { GAME._simT = t; }          // hard resync
    else simDt = Math.max(.001, dt + clamp(err * .1, -.02, .02)); // smooth chase
    GAME._simT += simDt;
  } else GAME._simT = null;

  if (GAME.state === 'play' && !GAME.paused) {
    if (GAME.virtual) GAME.vt += dt;
    if (GAME.drive) driveStep();
    timelineTick(t);
    missionTick(simDt, t);
    achTick(simDt);
    touchPoll();
    playerUpdate(simDt, input);
    trafficUpdate(simDt);
    carSolid(player.x, player.y, player.r);
    cameraUpdate(simDt, t);
    // flash decay
    FLASH.white = Math.max(0, FLASH.white - dt * 1.9);
    FLASH.red = Math.max(0, FLASH.red - dt * 1.4);
    // song over → the final stamp (freeroam loops the song instead)
    if (t >= SONG.duration - .05 || (!GAME.freeroam && song.ended)) {
      if (GAME.freeroam) { GAME.vt = 0; song.currentTime = 0; }
      else { GAME.state = 'ended'; GAME.endedAt = performance.now(); }
    }
  } else if (GAME.state === 'title') {
    cameraUpdate(dt, t);
  }
  render(performance.now() / 1000);
  if (GAME.holdStop) { GAME._parked = true; return; } // parked for capture — no rAF while held
  requestAnimationFrame(loop);
}

/* ---------- verification hooks (§9 protocol) ---------- */
window.__game = {
  get state() { return GAME.state; },
  get paused() { return GAME.paused; },
  get fps() { return GAME.fps; },
  get audioTime() { return song.currentTime; },
  get time() { return gameTime(); }, // active clock (virtual or audio)
  get virtual() { return GAME.virtual; },
  get audioDuration() { return song.duration; },
  get audioPaused() { return song.paused; },
  get audioState() { return song.readyState; },
  get step() { return GAME.stepIdx + 1; },
  get mission() { const m = missionAt(gameTime()); return m && m.id; },
  get missionState() {
    return {
      id: MSTATE.id, phase: MSTATE.phase, obj: MSTATE.objText, done: MSTATE.done,
      seen: !!MSTATE.seen, caught: MSTATE.caught, heatDeaths: MSTATE.heatDeaths,
      sparked: !!(MSTATE.m && MSTATE.m.sparked), witnessed: !!(MSTATE.m && MSTATE.m.witnessed),
      escaped: !!(MSTATE.m && MSTATE.m.escaped), m2level: MSTATE.m === M2 ? M2.level : -1,
      m2light: MSTATE.m === M2 ? Math.round(M2.light) : -1,
      temp: MSTATE.m === M3 ? +M3.temp.toFixed(1) : -1, pin: !!(MSTATE.m && MSTATE.m.pin),
      outage: +WIDGETS.outage.value.toFixed(1), fade: +MSTATE.fadeA.toFixed(2),
      m2embers: MSTATE.m === M2 ? M2.embers.map(e => ({ x: e.x, y: e.y, got: e.got })) : null,
      m1goal: MSTATE.m === M1 ? M1.goal : null,
      m1guards: (MSTATE.m === M1 && MSTATE.m.guards) ?
        MSTATE.m.guards.map(g => ({ x: Math.round(g.x), y: Math.round(g.y), dir: +g.dir.toFixed(2), alert: +g.alert.toFixed(2) })) : null,
      m4found: MSTATE.m === M4 ? M4.found : -1,
      m5arc: MSTATE.m === M5 ? M5.arcOn(MSTATE.mt) : null,
      m5shocks: MSTATE.m === M5 ? M5.shocks : -1, m5bb: MSTATE.m === M5 ? M5.billboard : -1,
      m5crossed: MSTATE.m === M5 ? M5.crossed : null,
      m6sweeps: MSTATE.m === M6 ? M6.sweeps : -1, m6spots: MSTATE.m === M6 ? M6.spots : -1,
      m6dark: MSTATE.m === M6 ? M6.blackout : null, m6crossed: MSTATE.m === M6 ? M6.crossed : null,
      m6div: MSTATE.m === M6 ? { x: +M6.div.x.toFixed(0), y: +M6.div.y.toFixed(0) } : null,
      m7lit: MSTATE.m === M7 ? M7.candles.filter(c => c.lit).length : -1,
      m7order: MSTATE.m === M7 ? +M7.order.toFixed(2) : -1,
      m7relights: MSTATE.m === M7 ? M7.relights : -1, m7arrived: MSTATE.m === M7 ? M7.arrived : null,
      m8group: MSTATE.m === M8 ? M8.people.filter(p => p.joined).length : -1,
      m8line: MSTATE.m === M8 ? +M8.lineX.toFixed(0) : -1, m8sweeps: MSTATE.m === M8 ? M8.sweepHits : -1,
      m8hits: MSTATE.m === M8 ? M8.hits : -1, m8bed: MSTATE.m === M8 ? M8.bedBroken : null,
      m9patches: MSTATE.m === M9 ? M9.patches.filter(p => p.on).length : -1,
      m9finale: MSTATE.m === M9 ? +M9.finale.toFixed(1) : -1,
      freeroam: !!GAME.freeroam, ended: GAME.state === 'ended', frZone: GAME._frZone || null,
    };
  },
  get achState() {
    return {
      count: ACH.count, saddam: ACH.saddam,
      lit: ACH_ORDER.filter(id => ACH.lit[id]),
      popping: ACH_ORDER.filter(id => ACH.pop[id]),
      toast: ACH.toast ? ACH.toast.text : null,
      /* live audio↔simulation gap (real-audio mode): |gap| stays < a few ms
         while the song plays — the M4 sync law, measurable */
      simGap: (GAME._simT != null && !GAME.virtual) ? +(gameTime() - GAME._simT).toFixed(3) : null,
    };
  },
  get player() { return { x: Math.round(player.x), y: Math.round(player.y) }; },
  get images() { return { loaded: LOAD.done, total: LOAD.total, failed: LOAD.failed }; },
  get errors() { return __errors; },
  get solids() { return { rects: SOLID.rects.length, circles: SOLID.circles.length }; },
  seek(sec) {
    if (GAME.virtual) GAME.vt = sec;
    else { song.currentTime = sec; GAME._simT = null; GAME._tPrev = null; } // resync the chaser
    if (GAME.state === 'play') timelineTick(sec);
  },
  teleport(x, y) { player.x = x; player.y = y; cam.x = x; cam.y = y; },
  /* verification: deterministic virtual clock (song parked; vt advances at wall rate) */
  setVirtual(on, t0) {
    GAME.virtual = !!on;
    if (on) { GAME.vt = (t0 != null) ? t0 : (song.currentTime || 0); song.pause(); }
    else {
      song.currentTime = GAME.vt; song.play().catch(() => {});
      GAME._parked = false; LAST = performance.now(); requestAnimationFrame(loop);
    }
  },
  /* harness-paced simulation tick (virtual mode only): advance the exact
     same update pipeline as the rAF loop by dt seconds and render once.
     Returns the new virtual time. */
  vtAdvance(d, skipRender) {
    if (!GAME.virtual || GAME.state !== 'play' || GAME.paused) return gameTime();
    const dt = Math.min(.25, Math.max(.001, +d || 0));
    GAME.vt += dt;
    const t = GAME.vt;
    if (GAME.drive) driveStep();
    timelineTick(t);
    missionTick(dt, t);
    achTick(dt);
    touchPoll();
    playerUpdate(dt, input);
    trafficUpdate(dt);
    carSolid(player.x, player.y, player.r);
    cameraUpdate(dt, t);
    FLASH.white = Math.max(0, FLASH.white - dt * 1.9);
    FLASH.red = Math.max(0, FLASH.red - dt * 1.4);
    if (t >= SONG.duration - .05) {
      if (GAME.freeroam) GAME.vt = 0; // the open city loops forever
      else { GAME.state = 'ended'; GAME.endedAt = performance.now(); render(performance.now() / 1000); return t; } // draw the stamp NOW
    }
    /* render thinning: a full 1280x720 software render costs ~140ms on the
       bundled headless build — rendering on EVERY 100ms tick saturates the
       renderer and starves the timer queue. Verification only needs state;
       visuals come from the fresh frame rendered on hold()-park. */
    if (!skipRender) render(performance.now() / 1000);
    return t;
  },
  /* verification autopilot: {x,y,run,tol} or null to stop */
  drive(target) {
    if (!target) { GAME.drive = null; input.up = input.down = input.left = input.right = input.run = 0; return; }
    GAME.drive = { x: target.x, y: target.y, run: !!target.run, tol: target.tol || 14 };
    GAME.driveArrived = false;
  },
  get driveArrived() { return !!GAME.driveArrived; },
  /* verification: zero the lifetime counters (after real-audio drift segment) */
  resetCounts() { MSTATE.caught = 0; MSTATE.heatDeaths = 0; },
  /* verification hold: pause the audio clock without the pause overlay,
     so screenshots can be taken without the headless compositor pumping the
     audio clock (documented artifact of the bundled chromium build). */
  hold(v) {
    if (GAME.virtual) { // virtual mode: freeze game only (song already parked)
      GAME.hold = GAME.holdStop = !!v; GAME.paused = !!v;
      if (v) render(performance.now() / 1000); // fresh frame for capture
      if (!v && GAME._parked) { GAME._parked = false; LAST = performance.now(); requestAnimationFrame(loop); }
      return;
    }
    if (v && GAME.state === 'play' && !GAME.paused) {
      GAME.hold = true; GAME.paused = true; GAME.holdStop = true;
      song.pause();
    } else if (!v && GAME.hold) {
      GAME.hold = false; GAME.paused = false; GAME.holdStop = false;
      song.play().catch(() => {});
      if (GAME._parked) { GAME._parked = false; LAST = performance.now(); requestAnimationFrame(loop); }
    }
  },
  get sfxState() { return (typeof SFX !== 'undefined' && SFX.ctx) ? SFX.ctx.state : 'none'; },
  /* in-page capture (verification): JPEG data-URL of the live canvas.
     Faster and more reliable than CDP screenshots in the bundled chromium. */
  snapshot() { return cv.toDataURL('image/jpeg', 0.9); },
  start: startGame,
  pause: () => setPause(true),
  resume: () => setPause(false),
};

boot();
