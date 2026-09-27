/* ---------- 10 · missions 1–3 (M1 build) ----------
   Council stealth · candle birth · 40° room.
   Design law: the song clock never stops — failure = fast-retry, windows auto-advance. */

const MSTATE = {
  id: null, m: null, mt: 0,       // active mission + mission time
  phase: '', objText: '', done: false, caught: 0, heatDeaths: 0,
  fadeA: 0, fadeDir: 0, pending: null,
};
const WIDGETS = {
  gauge: { on: false, value: 27, cap: 48 },
  outage: { on: false, value: 0, cap: 48 },
};
const FLASH = { white: 0, red: 0 };

/* ---------- helpers ---------- */
function inRect(x, y, r) { return x > r[0] && x < r[0] + r[2] && y > r[1] && y < r[1] + r[3]; }
function segBlocked(x1, y1, x2, y2) {
  // occlusion by furniture solids (pillars/table) — sampled every 10px
  const d = Math.hypot(x2 - x1, y2 - y1), n = Math.max(2, Math.floor(d / 10));
  for (let i = 1; i < n; i++) {
    const px = x1 + (x2 - x1) * i / n, py = y1 + (y2 - y1) * i / n;
    for (const rc of SOLID.rects) if (rc.tag === 'furn' && circleRect(px, py, 2, rc)) return true;
    for (const cc of SOLID.circles) if (cc.tag === 'furn' && dist2(px, py, cc.x, cc.y) < (cc.r + 2) * (cc.r + 2)) return true;
  }
  return false;
}
function wedgeVisible(gx, gy, dir, range, halfA, px, py) {
  const dx = px - gx, dy = py - gy, d = Math.hypot(dx, dy);
  if (d > range) return false;
  let a = Math.atan2(dy, dx) - dir;
  while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU;
  if (Math.abs(a) > halfA) return false;
  return !segBlocked(gx, gy, px, py);
}

/* ---------- generic top-down entity drawing (miniature canon) ---------- */
function drawTurbanElder(c2, x, y, dir, t) {
  // jinn-flavored council elder from above: cream robe circle + gold turban ring + ember gaze
  c2.save(); c2.translate(x, y);
  c2.fillStyle = 'rgba(10,12,25,.45)'; c2.beginPath(); c2.ellipse(4, 6, 10, 6, 0, 0, TAU); c2.fill();
  c2.fillStyle = '#e8dcc0'; c2.beginPath(); c2.arc(0, 0, 9, 0, TAU); c2.fill();
  c2.strokeStyle = '#c9b78a'; c2.lineWidth = 1; c2.stroke();
  c2.strokeStyle = PAL.gold; c2.lineWidth = 2.4; c2.beginPath(); c2.arc(0, 0, 5.2, 0, TAU); c2.stroke(); // عمامه
  // ember eyes in facing direction
  const ex = Math.cos(dir), ey = Math.sin(dir);
  c2.fillStyle = '#e2622b';
  c2.beginPath(); c2.arc(ex * 4 - ey * 2.6, ey * 4 + ex * 2.6, 1.4, 0, TAU); c2.fill();
  c2.beginPath(); c2.arc(ex * 4 + ey * 2.6, ey * 4 - ex * 2.6, 1.4, 0, TAU); c2.fill();
  // smoke wisp (jinn flavor)
  const p = (t * .5) % 1;
  c2.strokeStyle = 'rgba(160,160,170,' + (0.4 * (1 - p)) + ')'; c2.lineWidth = 2;
  c2.beginPath(); c2.moveTo(-ex * 6, -ey * 6);
  c2.quadraticCurveTo(-ex * 8 + Math.sin(t * 3) * 3, -ey * 8 - p * 10, -ex * 6, -ey * 6 - p * 20); c2.stroke();
  c2.restore();
}
function drawPuff(c2, x, y, r, a) {
  // north-wind puff = Persian cloud-band cluster
  c2.save(); c2.translate(x, y); c2.globalAlpha = a;
  c2.strokeStyle = '#cfd8e8'; c2.lineWidth = r * .3;
  for (let i = -1; i <= 1; i++) {
    c2.beginPath();
    c2.moveTo(-r + i * r * .5, r * .2);
    c2.bezierCurveTo(-r * .7 + i * r * .5, -r * .8, r * .2 + i * r * .5, -r * .85, r * .35 + i * r * .5, -r * .15);
    c2.stroke();
  }
  c2.globalAlpha = 1; c2.restore();
}
function drawEmber(c2, x, y, t) {
  const pl = .6 + .4 * Math.sin(t * 5 + x);
  const g = c2.createRadialGradient(x, y, 0, x, y, 16 * pl);
  g.addColorStop(0, 'rgba(245,220,140,.95)'); g.addColorStop(1, 'rgba(232,184,74,0)');
  c2.fillStyle = g; c2.beginPath(); c2.arc(x, y, 16 * pl, 0, TAU); c2.fill();
  c2.fillStyle = '#f5e6a8'; c2.beginPath(); c2.arc(x, y, 3.2, 0, TAU); c2.fill();
  cloudBand(c2, x + 6, y + 6, 2.2, 'rgba(240,214,138,.9)'); // signature
}

/* ============================================================
   MISSION 1 — مجلسِ شورایی · stealth (steps 1–5 · 0→33.67s)
   ============================================================ */
const M1 = {
  id: 'm1', arena: 'majles', tz: 1.45,
  start: { x: 240, y: 330 },
  fuse: { x: 152, y: 122 },
  goal: null, sparked: false, witnessed: false, escaped: false, escapedInTime: false,
  guards: [],
  open() {
    this.sparked = false; this.witnessed = false; this.escaped = false; this.escapedInTime = false;
    this.goal = { x: this.fuse.x + 26, y: this.fuse.y + 34 };
    this.guards = [
      { x: 150, y: 132, dir: 0, wps: [[150, 132], [310, 132]], wi: 1, sp: 52, alert: 0, freeze: 0 },
      { x: 310, y: 246, dir: Math.PI, wps: [[310, 246], [150, 246]], wi: 1, sp: 46, alert: 0, freeze: 0 },
    ];
    MSTATE.phase = 'infiltrate';
    MSTATE.objText = 'به گوشِ چادر، کنارِ فیوز، نزدیک شو — دیده نشو';
  },
  update(dt, t, mt) {
    // guards patrol + vision
    for (const g of this.guards) {
      if (g.freeze > 0) { g.freeze -= dt; continue; }
      const wp = g.wps[g.wi];
      const dx = wp[0] - g.x, dy = wp[1] - g.y, d = Math.hypot(dx, dy);
      if (d < 4) { g.wi = (g.wi + 1) % g.wps.length; continue; }
      g.dir = Math.atan2(dy, dx);
      g.x += dx / d * g.sp * dt; g.y += dy / d * g.sp * dt;
    }
    if (MSTATE.phase === 'infiltrate') {
      let seen = false;
      for (const g of this.guards) {
        if (wedgeVisible(g.x, g.y, g.dir, 150, 0.55, player.x, player.y)) { seen = true; g.alert = Math.min(1, g.alert + dt / 0.7); }
        else g.alert = Math.max(0, g.alert - dt / 1.2);
        if (g.alert >= 1) { this.caught(); return; }
      }
      MSTATE.seen = seen;
      // witness zone
      if (!this.witnessed && dist2(player.x, player.y, this.goal.x, this.goal.y) < 42 * 42) {
        this.witnessed = true;
        MSTATE.objText = 'شاهدم — تا لحظه‌ی جرقه همین‌جا کم‌نور بمان';
        SFX.ember();
      }
    } else if (MSTATE.phase === 'escape') {
      // out of the council walls?
      if (!inRect(player.x, player.y, [60, 60, 320, 230]) && !this.escaped) {
        this.escaped = true; this.escapedInTime = true;
        this.finish();
      }
    }
  },
  onStep(n) {
    if (n === 4 && !this.sparked) { // گوشِ چادر به فیوز گرفت — جرقه
      this.sparked = true;
      MSTATE.phase = 'escape';
      MSTATE.objText = 'فرار کن! پیش از واژگونی بیرون برو';
      SFX.spark(); cam.shake = 1;
      if (dist2(player.x, player.y, this.goal.x, this.goal.y) < 90 * 90) this.witnessed = true;
    }
  },
  caught() {
    SFX.caught(); FLASH.red = .85; cam.shake = 1;
    MSTATE.caught++;
    player.x = this.start.x; player.y = this.start.y;
    for (const g of this.guards) { g.alert = 0; g.freeze = 1.2; }
    MSTATE.objText = 'دیدندت! دوباره — پشتِ ستون‌ها و میز';
  },
  finish() {
    MSTATE.done = true;
    const rank = this.escapedInTime ? (this.witnessed ? 'کامل — شاهدِ جرقه و فرار' : 'فرار — بی‌شاهدی') : 'ناقص';
    showBanner('مأموریت ۱ کامل شد', rank);
    SFX.complete();
  },
  close() {
    if (!MSTATE.done) { // window ended
      showBanner('مأموریت ۱ گذشت', this.witnessed ? 'جرقه را دیدی — داستان ادامه دارد' : 'چادر خودش گرفت — داستان ادامه دارد');
    }
  },
  drawWorld(c2, t, mt) {
    // (pillars + medallion are painted into the static world — see 02-world.js)
    // fuse box + chador corner (NW)
    c2.fillStyle = '#26211a'; c2.fillRect(this.fuse.x - 10, this.fuse.y - 10, 20, 16);
    c2.strokeStyle = PAL.goldDim; c2.lineWidth = 1.5; c2.strokeRect(this.fuse.x - 10, this.fuse.y - 10, 20, 16);
    // چادرِ سیاه: کابلی، لِه‌شده در فیوز
    c2.fillStyle = '#14121c';
    c2.beginPath();
    c2.moveTo(this.fuse.x + 4, this.fuse.y + 8);
    c2.quadraticCurveTo(this.fuse.x + 30, this.fuse.y + 2, this.fuse.x + 26, this.fuse.y + 30);
    c2.quadraticCurveTo(this.fuse.x + 6, this.fuse.y + 26, this.fuse.x + 4, this.fuse.y + 8);
    c2.fill();
    c2.strokeStyle = '#3a3450'; c2.lineWidth = 1; c2.stroke();
    // goal marker (soft pulse ring)
    if (MSTATE.phase === 'infiltrate') {
      const pl = .5 + .5 * Math.sin(t * 3);
      c2.strokeStyle = 'rgba(217,178,60,' + (0.25 + .3 * pl) + ')'; c2.lineWidth = 2;
      c2.beginPath(); c2.arc(this.goal.x, this.goal.y, 16 + pl * 5, 0, TAU); c2.stroke();
    }
    // spark burst + gold crack on the carpet
    if (this.sparked) {
      const age = mt - 24.94;
      if (age > 0 && age < 1.6) {
        burstWorld(c2, this.fuse.x + 8, this.fuse.y + 6, 20 + Math.sin(t * 22) * 8, '#f0d070', 10);
      }
      c2.strokeStyle = 'rgba(240,220,150,.85)'; c2.lineWidth = 2;
      c2.beginPath(); c2.moveTo(146, 132); c2.lineTo(240, 152); c2.lineTo(282, 224); c2.stroke();
    }
    // guards + cones
    for (const g of this.guards) {
      const seenNow = g.alert > 0.02;
      const gr = c2.createRadialGradient(g.x, g.y, 10, g.x, g.y, 150);
      const col = seenNow ? '226,60,50' : '217,178,60';
      gr.addColorStop(0, 'rgba(' + col + ',' + (0.10 + g.alert * 0.16) + ')');
      gr.addColorStop(1, 'rgba(' + col + ',0)');
      c2.fillStyle = gr;
      c2.beginPath(); c2.moveTo(g.x, g.y);
      c2.arc(g.x, g.y, 150, g.dir - 0.55, g.dir + 0.55); c2.closePath(); c2.fill();
      drawTurbanElder(c2, g.x, g.y, g.dir, t);
    }
  },
};

/* ============================================================
   MISSION 2 — تولدِ راوی · candle birth (step 6 · 33.67→42.39s)
   ============================================================ */
const M2 = {
  id: 'm2', arena: 'candle', tz: 1.6,
  start: { x: 650, y: 545 },
  embers: [], puffs: [], light: 70, level: 0,
  open() {
    this.embers = [[600, 560], [700, 555], [615, 492], [688, 490], [650, 520], [660, 570]].map(p => ({ x: p[0], y: p[1], got: false }));
    this.puffs = [
      { x: 540, y: 485, vx: 46, r: 20 }, { x: 760, y: 540, vx: -40, r: 22 }, { x: 560, y: 582, vx: 52, r: 18 },
    ];
    this.light = 70; this.level = 0;
    MSTATE.phase = 'gather';
    MSTATE.objText = 'شمعِ تازه‌زاده‌ای — اخگرها را جمع کن، از نورت دور بمان';
    WIDGETS.outage.on = true; WIDGETS.outage.value = 0;
  },
  update(dt, t, mt) {
    // outage fills while the world is dark (ASSETS.md)
    WIDGETS.outage.value = Math.min(48, WIDGETS.outage.value + dt * 5.5);
    // puffs drift
    for (const p of this.puffs) {
      p.x += p.vx * dt;
      if (p.x < 540 && p.vx < 0) p.x = 762;
      if (p.x > 762 && p.vx > 0) p.x = 540;
      if (dist2(player.x, player.y, p.x, p.y) < (p.r + 12) * (p.r + 12)) {
        this.light = Math.max(46, this.light - 26 * dt);
        if (!p.hissT || t - p.hissT > 0.6) { SFX.wind(); p.hissT = t; }
        // soft push away
        const dx = player.x - p.x, dy = player.y - p.y, d = Math.hypot(dx, dy) || 1;
        player.x += dx / d * 60 * dt; player.y += dy / d * 60 * dt;
      }
    }
    // embers
    for (const e of this.embers) {
      if (!e.got && dist2(player.x, player.y, e.x, e.y) < 22 * 22) {
        e.got = true; this.level++; this.light = Math.min(210, this.light + 24);
        SFX.ember();
        if (this.level >= 6) { MSTATE.phase = 'exit'; MSTATE.objText = 'شعله‌ات کامل شد — به درِ شمالی برس'; }
      }
    }
    // exit zone (north door)
    if (this.level >= 6 && player.y < 470 && Math.abs(player.x - 650) < 40) {
      MSTATE.done = true;
      showBanner('مأموریت ۲ کامل شد', 'شمع زاده شد — ' + fa(6) + ' از ' + fa(6) + ' اخگر');
      SFX.complete();
    }
  },
  close() {
    WIDGETS.outage.on = false; WIDGETS.outage.value = 0; // بازگشتِ نور = صفر
    if (!MSTATE.done) {
      showBanner('مأموریت ۲ گذشت', 'شعله را برداشت (' + fa(this.level) + '/۶) — تولد کامل شد');
      this.light = 210;
    }
  },
  drawWorld(c2, t, mt) {
    // absolute darkness with the newborn flame as the only light
    const g = c2.createRadialGradient(player.x, player.y, this.light * .35, player.x, player.y, this.light * 1.35);
    g.addColorStop(0, 'rgba(1,2,6,0)');
    g.addColorStop(.55, 'rgba(1,2,6,.72)');
    g.addColorStop(1, 'rgba(1,2,6,.97)');
    c2.fillStyle = g;
    c2.fillRect(player.x - 1600, player.y - 1000, 3200, 2000);
    // puffs + embers shine through the dark
    for (const p of this.puffs) drawPuff(c2, p.x, p.y, p.r, .8);
    for (const e of this.embers) if (!e.got) drawEmber(c2, e.x, e.y, t);
    // exit glow when ready
    if (this.level >= 6) {
      const pl = .5 + .5 * Math.sin(t * 4);
      const gg = c2.createRadialGradient(650, 462, 0, 650, 462, 46);
      gg.addColorStop(0, 'rgba(245,230,168,' + (.35 + .3 * pl) + ')'); gg.addColorStop(1, 'rgba(245,230,168,0)');
      c2.fillStyle = gg; c2.fillRect(604, 416, 92, 92);
    }
  },
};

/* ============================================================
   MISSION 3 — اتاقِ چهل‌درجه (steps 7–11 · 42.39→79.80s)
   ============================================================ */
const M3 = {
  id: 'm3', arena: 'raaviRoom', tz: 1.5,
  start: { x: 650, y: 200 },
  temp: 27, fan: { x: 610, y: 235, r: 60 }, pin: false, tv: 0, escaped: false,
  open() {
    this.temp = 27; this.pin = false; this.tv = 0; this.escaped = false;
    MSTATE.phase = 'survive';
    MSTATE.objText = 'گرما بالا می‌رود — کنارِ پنکه خنک شو';
    WIDGETS.gauge.on = true; WIDGETS.gauge.value = 27;
    cam.tz = this.tz;
  },
  update(dt, t, mt) {
    // temperature model — after the GPS pin the heat turns deadly (گرمای مرگبار)
    const nearFan = dist2(player.x, player.y, this.fan.x, this.fan.y) < this.fan.r * this.fan.r;
    const rise = this.pin ? 1.9 : 0.62;
    if (nearFan) this.temp = Math.max(16, this.temp - (this.pin ? 3.2 : 4.6) * dt);
    else this.temp = Math.min(48, this.temp + rise * dt);
    WIDGETS.gauge.value = this.temp;
    if (this.temp > 40 && Math.random() < dt * 1.2) SFX.heatTick();
    // death at 48°
    if (this.temp >= 48) {
      SFX.caught(); FLASH.red = .9; cam.shake = 1;
      MSTATE.heatDeaths++;
      this.temp = 40;
      player.x = this.start.x; player.y = this.start.y;
      MSTATE.objText = 'گرما گرفتت! سرد شو و ادامه بده';
    }
    // escape phase after the GPS pin (step 11 · 72.32)
    if (this.pin && !this.escaped) {
      if (inRect(player.x, player.y, ARENAS.roof.inset)) {
        this.escaped = true; MSTATE.done = true;
        showBanner('مأموریت ۳ کامل شد', 'به پشت‌بام رسیدی — ' + fa(Math.round(this.temp)) + ' درجه');
        SFX.complete();
      }
    }
  },
  onStep(n) {
    if (n === 9) { this.tv = 3.0; SFX.tvBlip(); }          // یِهو تَرَق! صفحه سیاهید
    if (n === 11) {                                         // (Sharing current location)
      this.pin = true; MSTATE.phase = 'escape';
      MSTATE.objText = 'پین افتاد! پیش از گرمای مرگبار به پشت‌بام برس';
      cam.tz = 1.06;
      SFX.tvBlip();
    }
  },
  close() {
    WIDGETS.gauge.on = false;
    if (!MSTATE.done) showBanner('مأموریت ۳ گذشت', this.temp >= 47 ? 'سوزاندی اما زنده‌ای — داستان ادامه دارد' : 'پشت‌بام مالِ سکانسِ بعد شد');
  },
  drawWorld(c2, t, mt) {
    // heat waves from above (animatic scene-3 language) — intensity by temp
    const hi = Math.max(0, (this.temp - 27) / 21);
    for (let i = 0; i < 3; i++) {
      const rr = ((t * 34) + i * 60) % 180;
      c2.strokeStyle = 'rgba(226,120,60,' + (0.32 * (1 - rr / 180) * hi).toFixed(3) + ')';
      c2.lineWidth = 3;
      c2.beginPath(); c2.arc(650, 195, rr + 20, 0, TAU); c2.stroke();
    }
    // fan (spinning) + cool zone
    c2.strokeStyle = 'rgba(140,190,230,' + (0.10 + 0.06 * Math.sin(t * 2)) + ')';
    c2.lineWidth = 2; c2.setLineDash([6, 6]);
    c2.beginPath(); c2.arc(this.fan.x, this.fan.y, this.fan.r, 0, TAU); c2.stroke(); c2.setLineDash([]);
    c2.save(); c2.translate(this.fan.x, this.fan.y); c2.rotate(t * (5 + hi * 3));
    c2.strokeStyle = '#55524a'; c2.lineWidth = 5;
    for (let i = 0; i < 3; i++) {
      const b = i * 2.094;
      c2.beginPath(); c2.moveTo(0, 0); c2.lineTo(Math.cos(b) * 22, Math.sin(b) * 22); c2.stroke();
    }
    c2.fillStyle = '#1d232b'; c2.beginPath(); c2.arc(0, 0, 7, 0, TAU); c2.fill();
    cloudBand(c2, 0, -14, 3, 'rgba(217,178,60,.7)'); // signature
    c2.restore();
    // TV announcement flicker
    if (this.tv > 0) {
      this.tv -= FRAME_DT;
      if (Math.sin(t * 18) > -.2) {
        c2.fillStyle = 'rgba(140,170,230,.5)'; c2.fillRect(700, 102, 90, 46);
        const g = c2.createRadialGradient(745, 125, 0, 745, 125, 90);
        g.addColorStop(0, 'rgba(140,170,230,.2)'); g.addColorStop(1, 'rgba(140,170,230,0)');
        c2.fillStyle = g; c2.fillRect(655, 35, 180, 180);
      }
    }
    // red GPS pin (drops at step 11)
    if (this.pin) {
      const by = 240 - Math.abs(Math.sin(t * 4)) * 16;
      c2.fillStyle = 'rgba(10,12,25,.5)'; c2.beginPath(); c2.ellipse(700, 252, 12, 5, 0, 0, TAU); c2.fill();
      c2.fillStyle = '#d93a3a';
      c2.beginPath();
      c2.moveTo(700, by + 24); c2.quadraticCurveTo(686, by, 700, by - 12); c2.quadraticCurveTo(714, by, 700, by + 24); c2.fill();
      c2.fillStyle = PAL.ink; c2.beginPath(); c2.arc(700, by + 2, 4.5, 0, TAU); c2.fill();
    }
  },
};

/* burst helper in world space (animatic language) */
function burstWorld(c2, x, y, r, col, n) {
  c2.strokeStyle = col; c2.lineWidth = 2.5;
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, l = r * (.6 + Math.random() * .6);
    c2.beginPath();
    c2.moveTo(x + Math.cos(a) * r * .2, y + Math.sin(a) * r * .2);
    c2.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c2.stroke();
  }
}

/* ---------- registry & framework ---------- */
/* ============================================================
   MISSION 4 — کجاشون؟ (steps 12–16 · 79.80→122.19s · roof)
   ============================================================ */
const M4 = {
  id: 'm4', arena: 'roof', tz: 1.5,
  start: { x: 1150, y: 195 },
  spots: [
    { x: 1015, y: 165, who: 'calf',    found: false, popT: 0 }, // پشتِ مخزنِ آب
    { x: 1225, y: 190, who: 'saddam',  found: false, popT: 0 }, // کنارِ آنتن
    { x: 1160, y: 235, who: 'angel',   found: false, popT: 0 }, // بینِ بشقاب‌ها
    { x: 1305, y: 150, who: 'basiji',  found: false, popT: 0 }, // جان‌پناهِ شرقی
  ],
  found: 0, hookAt: null,
  open() {
    this.found = 0; this.hookAt = null;
    for (const sp of this.spots) { sp.found = false; sp.popT = 0; }
    MSTATE.phase = 'search';
    MSTATE.objText = '۴ مدالیونِ پنهان را پیدا کن';
    cam.tz = this.tz;
  },
  update(dt, t, mt) {
    for (const sp of this.spots) {
      if (sp.popT > 0) sp.popT -= dt;
      if (!sp.found && dist2(player.x, player.y, sp.x, sp.y) < 26 * 26) {
        sp.found = true; sp.popT = .6; this.found++;
        // each medallion asks its question: the LIVE lyric line, byte-exact
        showBanner('مدالیونِ ' + fa(this.found) + ' از ' + fa(4) + ' — ' + this.whoName(sp.who),
                   STEPS[stepIndexAt(t)].line);
        FLASH.white = .35; SFX.ember();
        if (this.found >= 4) this.hookAt = mt + 1.5; // let the 4th question breathe
      }
    }
    if (this.hookAt != null && mt >= this.hookAt) {
      this.hookAt = null;
      MSTATE.done = true; MSTATE.phase = 'hook';
      showBanner('مأموریت ۴ کامل شد', 'چهار پرسش، چهار مدالیون — هوک!');
      FLASH.white = .8; SFX.complete();
    }
  },
  whoName(w) {
    return w === 'calf' ? 'گوسالهٔ طلایی' : w === 'saddam' ? 'صدام' :
           w === 'angel' ? 'فرشتهٔ رباتیک' : 'بسیجی';
  },
  onStep() { /* the ticker carries each step's line; questions latch at find-time */ },
  close() {
    if (!MSTATE.done) showBanner('مأموریت ۴ گذشت', fa(this.found) + ' پرسش از ' + fa(4) + ' — هوک ناتمام ماند');
  },
  drawWorld(c2, t, mt) {
    for (const sp of this.spots) {
      if (sp.found) {
        // medallion pop (scale-in) then resting ring + portrait
        const k = sp.popT > 0 ? 1 + sp.popT * .9 : 1;
        c2.save(); c2.translate(sp.x, sp.y); c2.scale(k, k);
        c2.strokeStyle = PAL.gold; c2.lineWidth = 3;
        c2.beginPath(); c2.arc(0, 0, 16, 0, TAU); c2.stroke();
        c2.strokeStyle = PAL.goldDim; c2.lineWidth = 1.2;
        c2.beginPath(); c2.arc(0, 0, 20, 0, TAU); c2.stroke();
        const im = sp.who !== 'saddam' ? img('icons:' + sp.who) : null;
        if (im) c2.drawImage(im, -13, -13, 26, 26);
        else { // saddam: code-drawn three-state glyph (cap + mustache)
          c2.fillStyle = '#2f4a3a'; c2.beginPath(); c2.arc(0, -3, 8, Math.PI, 0); c2.fill();
          c2.fillRect(-8, -3, 16, 3);
          c2.fillStyle = '#14161f'; c2.fillRect(-6, 4, 12, 2.6);
          c2.fillStyle = '#e2622b'; c2.fillRect(-4, 0, 2, 2); c2.fillRect(2, 0, 2, 2);
        }
        cloudBand(c2, 14, -12, 2.2, 'rgba(217,178,60,.7)'); // signature
        c2.restore();
      } else {
        // hidden: a faint glint only when the player is near
        const d = Math.hypot(player.x - sp.x, player.y - sp.y);
        if (d < 52) {
          const a = .25 + .2 * Math.sin(t * 6 + sp.x);
          c2.strokeStyle = 'rgba(240,214,138,' + a.toFixed(2) + ')';
          c2.lineWidth = 1.6;
          c2.beginPath(); c2.arc(sp.x, sp.y, 7 + 2 * Math.sin(t * 3), 0, TAU); c2.stroke();
          cloudBand(c2, sp.x + 8, sp.y - 6, 1.8, 'rgba(217,178,60,' + (a * .7).toFixed(2) + ')');
        }
      }
    }
  },
  drawHUD(c2, t) {
    hudCounter(c2, CFG.W / 2 - 300, 100, 300, 62, 'candle', this.found, 'پرسش‌های پشت‌بام — از ۴');
  },
};

/* ============================================================
   MISSION 5 — خیابانِ دوزخ (steps 17–20 · 122.19→157.11s · chalipa)
   ============================================================ */
const M5 = {
  id: 'm5', arena: 'chalipa', tz: 1.35,
  start: { x: 1150, y: 330 },
  arc: { x: 1316, y: 408, r: 86, cyc: 2.6, on: 0.9 },
  shocks: 0, billboard: 0, seenBB: false, crossed: false,
  open() {
    this.shocks = 0; this.billboard = 0; this.seenBB = false; this.crossed = false;
    MSTATE.phase = 'cross';
    MSTATE.objText = 'از تقاطعِ چلیپا عبور کن — زمان‌بندیِ قوسِ برق';
    cam.tz = this.tz;
  },
  arcOn(mt) { const p = (mt % this.arc.cyc + this.arc.cyc) % this.arc.cyc; return p >= this.arc.cyc - this.arc.on; },
  update(dt, t, mt) {
    // periodic transformer arc — timing hazard (street line sits inside r86)
    if (this.arcOn(mt)) {
      const d = Math.hypot(player.x - this.arc.x, player.y - this.arc.y);
      if (d < this.arc.r + player.r) {
        this.shocks++;
        const nx = (player.x - this.arc.x) / (d || 1), ny = (player.y - this.arc.y) / (d || 1);
        player.x = this.arc.x + nx * (this.arc.r + 12); player.y = this.arc.y + ny * (this.arc.r + 12);
        player.vx = nx * 60; player.vy = ny * 60;
        FLASH.red = .6; cam.shake = 1; SFX.spark();
      }
    }
    // billboard 4:3 cutscene — mid-crossing, clock never stops
    if (!this.seenBB && player.x >= 1400) { this.seenBB = true; this.billboard = 3.0; SFX.tvBlip(); }
    if (this.billboard > 0) this.billboard -= dt;
    // east exit past the wreck (open street y≈300-360)
    if (!this.crossed && player.x > 1485 && player.y > 250 && player.y < 420) {
      this.crossed = true; MSTATE.done = true;
      showBanner('مأموریت ۵ کامل شد', 'از خیابانِ دوزخ عبور کردی');
      FLASH.white = .6; SFX.complete();
    }
  },
  close() {
    if (!MSTATE.done) showBanner('مأموریت ۵ گذشت', this.shocks >= 1 ? 'برق گرفتت — داستان ادامه دارد' : 'دوزخ نگذشت — داستان ادامه دارد');
  },
  drawWorld(c2, t, mt) {
    // transformer arc: danger ring + cloud-band lightning when ON
    const on = this.arcOn(mt);
    c2.setLineDash(on ? [] : [6, 6]);
    c2.strokeStyle = on ? 'rgba(226,98,43,.85)' : 'rgba(140,170,230,.35)';
    c2.lineWidth = on ? 3 : 1.6;
    c2.beginPath(); c2.arc(this.arc.x, this.arc.y, this.arc.r, 0, TAU); c2.stroke();
    c2.setLineDash([]);
    if (on) {
      for (let i = 0; i < 4; i++) {
        const a = t * 3 + i * Math.PI / 2, r0 = 22;
        c2.strokeStyle = 'rgba(240,214,138,' + (.5 + .3 * Math.sin(t * 17 + i)).toFixed(2) + ')';
        c2.lineWidth = 2.4;
        c2.beginPath(); c2.moveTo(this.arc.x + Math.cos(a) * r0, this.arc.y + Math.sin(a) * r0);
        const mx = this.arc.x + Math.cos(a + .3) * this.arc.r * .55, my = this.arc.y + Math.sin(a + .3) * this.arc.r * .55;
        c2.lineTo(mx, my); c2.lineTo(this.arc.x + Math.cos(a + .12) * this.arc.r, this.arc.y + Math.sin(a + .12) * this.arc.r);
        c2.stroke();
      }
    }
    // smoke wisps over the wreck cars (cloud-band, alive)
    for (const w of [[1312, 262], [1444, 388]]) {
      const p = (t * .35 + w[0]) % 1;
      c2.globalAlpha = .5 * (1 - p);
      cloudBand(c2, w[0] + Math.sin(t + w[1]) * 6, w[1] - p * 34, 5 + p * 9, 'rgba(90,96,110,.5)');
      c2.globalAlpha = 1;
    }
  },
  drawHUD(c2, t) {
    // billboard 4:3 — «موتورِ فساد» (cutscene overlay, world keeps running)
    if (this.billboard > 0) {
      const a = Math.min(1, this.billboard / .6) * Math.min(1, (3.0 - this.billboard) / .35);
      c2.save(); c2.globalAlpha = a;
      c2.fillStyle = 'rgba(4,6,14,.72)';
      c2.fillRect(0, 0, CFG.W, CFG.H);
      const bw = 560, bh = 420, bx = CFG.W / 2 - bw / 2, by = 130;
      c2.fillStyle = '#26211a'; c2.fillRect(bx, by, bw, bh);
      c2.strokeStyle = PAL.gold; c2.lineWidth = 6; c2.strokeRect(bx, by, bw, bh);
      c2.strokeStyle = PAL.goldDim; c2.lineWidth = 2; c2.strokeRect(bx + 10, by + 10, bw - 20, bh - 20);
      // 4:3 screen: static + the engine of corruption (gear + cloud-band exhaust)
      const scx = bx + bw / 2, scy = by + bh / 2 - 26;
      for (let i = 0; i < 26; i++) {
        c2.fillStyle = 'rgba(140,170,230,' + (.04 + .05 * Math.random()).toFixed(3) + ')';
        c2.fillRect(bx + 14 + Math.random() * (bw - 28), by + 14 + Math.random() * (bh - 120), 3, 3);
      }
      c2.save(); c2.translate(scx, scy); c2.rotate(t * .8);
      c2.strokeStyle = '#8b93a8'; c2.lineWidth = 7;
      for (let i = 0; i < 8; i++) { const g = i * TAU / 8; c2.beginPath(); c2.moveTo(Math.cos(g) * 34, Math.sin(g) * 34); c2.lineTo(Math.cos(g) * 50, Math.sin(g) * 50); c2.stroke(); }
      c2.strokeStyle = PAL.gold; c2.lineWidth = 4; c2.beginPath(); c2.arc(0, 0, 34, 0, TAU); c2.stroke();
      c2.fillStyle = '#14161f'; c2.beginPath(); c2.arc(0, 0, 14, 0, TAU); c2.fill();
      c2.restore();
      cloudBand(c2, scx + 64, scy - 40, 7, 'rgba(120,126,140,.6)');
      cloudBand(c2, scx + 78, scy - 12, 5, 'rgba(120,126,140,.45)');
      c2.textAlign = 'center'; c2.fillStyle = PAL.goldHi;
      c2.font = '34px ' + CFG.FONT;
      c2.fillText('موتورِ فساد', CFG.W / 2, by + bh - 58);
      c2.font = '17px ' + CFG.FONT; c2.fillStyle = '#8b93a8';
      c2.fillText('بیلبوردِ ۴:۳ — چلیپا', CFG.W / 2, by + bh - 30);
      c2.restore();
    }
  },
};

/* ============================================================
   MISSION 6 — پل (steps 21–23 · 157.11→172.07s · clock/bridge)
   ============================================================ */
const M6 = {
  id: 'm6', arena: 'clock', tz: 1.5,
  start: { x: 900, y: 880 }, // north approach — outside the hand band (r 18..90)
  clock: { x: 900, y: 1000, r: 80, rIn: 42, w: .22, sp: 1.7 }, // annulus 42..90 — the pocket r 22..42 is safe
  /* dump obstacles: junk1 forces the approach east of the deck center;
     junk2 sits WEST of the sneak channel (x 926..938) so the dash stays dark */
  junk: [{ x: 878, y: 1150, r: 16 }, { x: 896, y: 1248, r: 14 }],
  /* the matchlight div: short beat x 880<->928 at y 1215 with a 1.2s rest at
     each end; matchlight r46 — the east channel is dark while it rests west */
  div: { x: 905, y: 1215, dir: -1, sp: 38, light: 44, minX: 880, maxX: 928, pause: 1.6, pauseT: 0 }, // mid-deck, already walking west
  sweeps: 0, spots: 0, blackout: false, crossed: false,
  open() {
    this.sweeps = 0; this.spots = 0; this.blackout = false; this.crossed = false;
    this.div = { x: 905, y: 1215, dir: -1, sp: 38, light: 44, minX: 880, maxX: 928, pause: 1.6, pauseT: 0 };
    MSTATE.phase = 'whisper';
    MSTATE.objText = 'از روتوندای ساعتِ دیوانه رد شو';
    cam.tz = this.tz;
  },
  update(dt, t, mt) {
    // sweeping clock hands — two radial beams 180° apart
    if (MSTATE.phase === 'whisper') {
      const dx = player.x - this.clock.x, dy = player.y - this.clock.y, d = Math.hypot(dx, dy);
      if (d > this.clock.rIn && d < this.clock.r + player.r) { // annulus — the pocket (r<42) is safe
        const pa = Math.atan2(dy, dx);
        for (const off of [0, Math.PI]) {
          let da = pa - (mt * this.clock.sp + off);
          da = Math.atan2(Math.sin(da), Math.cos(da));
          if (Math.abs(da) < this.clock.w) {
            this.sweeps++;
            const nx = dx / (d || 1), ny = dy / (d || 1);
            player.x = this.clock.x + nx * (this.clock.r + 16);
            player.y = this.clock.y + ny * (this.clock.r + 16);
            FLASH.red = .5; cam.shake = .8; SFX.caught();
            break;
          }
        }
      }
    }
    // dump obstacles: soft radial push (mission-local, world untouched)
    for (const o of this.junk) {
      const dx = player.x - o.x, dy = player.y - o.y, d = Math.hypot(dx, dy);
      if (d < o.r + player.r && d > 0) {
        player.x = o.x + dx / d * (o.r + player.r);
        player.y = o.y + dy / d * (o.r + player.r);
      }
    }
    // the matchlight div (after the blackout) — beats x 880<->928, rests at the ends
    if (this.blackout) {
      const dv = this.div;
      if (dv.pauseT > 0) { dv.pauseT -= dt; }
      else {
        dv.x += dv.dir * dv.sp * dt;
        if (dv.x >= dv.maxX) { dv.x = dv.maxX; dv.dir = -1; dv.pauseT = dv.pause; }
        if (dv.x <= dv.minX) { dv.x = dv.minX; dv.dir = 1; dv.pauseT = dv.pause; }
      }
      const d = Math.hypot(player.x - dv.x, player.y - dv.y);
      if (d < this.div.light) {
        this.spots++;
        player.x = 904; player.y = 1130; player.vx = player.vy = 0;
        FLASH.red = .8; cam.shake = 1; SFX.caught();
      }
    }
    // south bank reached
    if (!this.crossed && player.y >= 1300) {
      this.crossed = true; MSTATE.done = true;
      showBanner('مأموریت ۶ کامل شد', 'از پل رد شدی — در تاریکی');
      FLASH.white = .6; SFX.complete();
    }
  },
  onStep(n) {
    if (n === 22) { // step 22 @167.08 — «یا اسکندر» — blackout
      this.blackout = true; MSTATE.phase = 'blackout';
      MSTATE.objText = 'بلک‌اوت — از نورِ کبریتِ دیوچه پنهان شو';
      FLASH.white = .5; SFX.wind();
    }
  },
  close() {
    if (!MSTATE.done) showBanner('مأموریت ۶ گذشت', this.blackout ? 'کبریت دیدتت — داستان ادامه دارد' : 'پل باقی ماند — داستان ادامه دارد');
  },
  drawWorld(c2, t, mt) {
    // crazy clock: face + two sweeping hands (vermilion beams)
    c2.save(); c2.translate(this.clock.x, this.clock.y);
    c2.strokeStyle = PAL.goldDim; c2.lineWidth = 2;
    c2.beginPath(); c2.arc(0, 0, this.clock.r, 0, TAU); c2.stroke();
    c2.strokeStyle = PAL.gold; c2.lineWidth = 1.4;
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12; c2.beginPath(); c2.moveTo(Math.cos(a) * (this.clock.r - 8), Math.sin(a) * (this.clock.r - 8)); c2.lineTo(Math.cos(a) * (this.clock.r - 2), Math.sin(a) * (this.clock.r - 2)); c2.stroke(); }
    c2.strokeStyle = 'rgba(240,214,138,.28)'; c2.lineWidth = 1.6;
    c2.beginPath(); c2.arc(0, 0, this.clock.rIn, 0, TAU); c2.stroke(); // the safe pocket
    for (const off of [0, Math.PI]) {
      const a = mt * this.clock.sp + off;
      c2.save(); c2.rotate(a);
      c2.strokeStyle = 'rgba(163,40,42,.9)'; c2.lineWidth = 7;
      c2.beginPath(); c2.moveTo(this.clock.rIn - 2, 0); c2.lineTo(this.clock.r - 6, 0); c2.stroke();
      c2.strokeStyle = 'rgba(240,214,138,.8)'; c2.lineWidth = 2;
      c2.beginPath(); c2.moveTo(this.clock.rIn + 4, 0); c2.lineTo(this.clock.r - 8, 0); c2.stroke();
      c2.fillStyle = PAL.gold; c2.beginPath(); c2.arc(this.clock.r - 12, 0, 4, 0, TAU); c2.fill();
      c2.restore();
    }
    c2.fillStyle = '#14161f'; c2.beginPath(); c2.arc(0, 0, 9, 0, TAU); c2.fill();
    c2.strokeStyle = PAL.gold; c2.lineWidth = 2; c2.stroke();
    c2.restore();
    // dump obstacles (chalipa-junk style, with the cloud-band signature)
    for (const o of this.junk) {
      c2.fillStyle = '#2f3547'; c2.beginPath(); c2.arc(o.x, o.y, o.r, 0, TAU); c2.fill();
      c2.strokeStyle = '#14161f'; c2.lineWidth = 2; c2.stroke();
      c2.fillStyle = '#3a4a5e'; c2.fillRect(o.x - o.r * .5, o.y - 4, o.r, 8);
      cloudBand(c2, o.x + 4, o.y - o.r - 4, 2.2, 'rgba(217,178,60,.6)');
    }
    // blackout: near-black world, a light circle around the player, the div's match
    if (this.blackout) {
      c2.save();
      c2.fillStyle = 'rgba(2,3,8,.93)';
      c2.beginPath(); c2.rect(cam.x - 2000, cam.y - 1200, 4000, 2400);
      c2.arc(player.x, player.y, 92, 0, TAU, true); c2.fill(); // hole
      const g = c2.createRadialGradient(player.x, player.y, 40, player.x, player.y, 110);
      g.addColorStop(0, 'rgba(232,184,74,.16)'); g.addColorStop(1, 'rgba(232,184,74,0)');
      c2.fillStyle = g; c2.beginPath(); c2.arc(player.x, player.y, 110, 0, TAU); c2.fill();
      // divche + matchlight (drawn OVER the dark)
      const dv = this.div, fl = Math.sin(t * 21) * .5 + Math.sin(t * 33) * .5;
      const mg = c2.createRadialGradient(dv.x, dv.y - 8, 0, dv.x, dv.y - 8, dv.light);
      mg.addColorStop(0, 'rgba(245,200,120,.55)'); mg.addColorStop(.5, 'rgba(226,120,60,.22)'); mg.addColorStop(1, 'rgba(226,120,60,0)');
      c2.fillStyle = mg; c2.beginPath(); c2.arc(dv.x, dv.y - 8, dv.light, 0, TAU); c2.fill();
      c2.fillStyle = '#e2622b'; c2.beginPath(); c2.arc(dv.x, dv.y - 8, 4 + fl, 0, TAU); c2.fill();
      c2.fillStyle = '#fff8dc'; c2.beginPath(); c2.arc(dv.x, dv.y - 8, 1.8, 0, TAU); c2.fill();
      c2.fillStyle = '#1d232b'; c2.beginPath(); c2.arc(dv.x, dv.y, 9, 0, TAU); c2.fill();
      c2.strokeStyle = '#a3282a'; c2.lineWidth = 2; c2.stroke();
      c2.fillStyle = '#e2622b'; c2.beginPath(); c2.arc(dv.x - 3, dv.y - 2, 1.4, 0, TAU); c2.arc(dv.x + 3, dv.y - 2, 1.4, 0, TAU); c2.fill(); // ember eyes
      cloudBand(c2, dv.x + 8, dv.y - 16, 2, 'rgba(217,178,60,.55)'); // signature
      c2.restore();
    }
  },
};

/* ---- auto cutscenes (steps 24-25): image + song-synced text only ---- */
function makeCut(id, start, title) {
  return {
    id, start, tz: 1.1,
    open() { MSTATE.phase = 'cut'; MSTATE.objText = ''; cam.tz = 1.1; },
    update() {}, close() {},
    drawWorld(c2, t, mt) {
      // slow golden breathing frame over the world; the ticker carries the lyric
      const a = .12 + .08 * Math.sin(mt * 1.4);
      c2.fillStyle = 'rgba(2,3,8,' + a.toFixed(3) + ')';
      c2.fillRect(cam.x - 2000, cam.y - 1200, 4000, 2400);
    },
  };
}
const C1 = makeCut('c1', { x: 904, y: 1310 }, 'میان‌بند · سکوتِ تبلیغاتی');
const C2 = makeCut('c2', { x: 1630, y: 520 }, 'میان‌بند · کُروسِ آکاپلا');

/* ---- follow-chain: a parade snake (candles / people) behind the player ---- */
function chainFollow(list, dt, spacing, speed) {
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    const ax = i === 0 ? player.x : list[i - 1].x;
    const ay = i === 0 ? player.y : list[i - 1].y;
    const dx = ax - c.x, dy = ay - c.y, d = Math.hypot(dx, dy);
    if (d > spacing) {
      const sp = Math.min(speed, (d - spacing) * 4 + 30);
      c.x += dx / d * sp * dt; c.y += dy / d * sp * dt;
    }
  }
}

/* ============================================================
   MISSION 7 — رژهٔ شمع‌ها (step 26 · 199.50→211.97s · parade)
   ============================================================ */
const M7 = {
  id: 'm7', arena: 'parade', tz: 1.45,
  start: { x: 1860, y: 1000 },
  candles: [], gusts: [], windT: 0, relights: 0, order: 1, arrived: false,
  door: { x: 1914, y: 760 },
  open() {
    this.candles = [];
    for (let i = 0; i < 10; i++) this.candles.push({ x: 1860 + (i % 2 ? 7 : -7), y: 1030 + i * 26, lit: true });
    this.gusts = []; // puff visuals (each gust event animates ~1s over its victim)
    this.windT = 0; this.relights = 0; this.order = 1; this.arrived = false;
    MSTATE.phase = 'lead';
    MSTATE.objText = 'رودِ شمع‌ها را تا درِ نیروگاه برسان — صف را منظم نگه دار';
    cam.tz = this.tz;
  },
  update(dt, t, mt) {
    const lit = this.candles.filter(c => c.lit);
    chainFollow(lit, dt, 24, 138);
    // رطوبت و باد: every ~4.2s the wind snuffs the candle FARTHEST from the
    // player (the straggler) — a tight, well-led column is a safe column.
    this.windT += dt;
    if (this.windT > 4.2) {
      this.windT = 0;
      if (lit.length > 6) {
        let worst = null, wd = -1;
        for (const c of lit) {
          const d = dist2(c.x, c.y, player.x, player.y);
          if (d > wd) { wd = d; worst = c; }
        }
        if (worst && wd > 60 * 60 && wd < 260 * 260) { // a straggler, not a lost soul
          worst.lit = false;
          this.gusts.push({ x: worst.x, y: worst.y, t: 1.0 });
          SFX.wind();
        }
      }
    }
    for (let i = this.gusts.length - 1; i >= 0; i--) {
      this.gusts[i].t -= dt;
      this.gusts[i].y -= 26 * dt; // the puff rolls away north
      if (this.gusts[i].t <= 0) this.gusts.splice(i, 1);
    }
    // ضربهٔ نور: walk to a dead candle to relight it
    for (const c of this.candles) {
      if (!c.lit && dist2(player.x, player.y, c.x, c.y) < 28 * 28) {
        c.lit = true; this.relights++;
        FLASH.white = Math.max(FLASH.white, .18); SFX.ember();
      }
    }
    // سنجهٔ صف: mean gap vs the ideal 24px
    let sum = 0, n = 0;
    for (let i = 1; i < lit.length; i++) { sum += Math.hypot(lit[i].x - lit[i - 1].x, lit[i].y - lit[i - 1].y); n++; }
    this.order = n ? clamp(1 - Math.abs(sum / n - 24) / 40, 0, 1) : 0;
    // arrival: the player through the west gap + ≥۶ lit candles streamed in
    const litNear = lit.filter(c => dist2(c.x, c.y, this.door.x, this.door.y) < 130 * 130).length;
    if (!this.arrived && player.x > 1898 && player.y > 716 && player.y < 804 && litNear >= 6) {
      this.arrived = true; MSTATE.done = true;
      showBanner('مأموریت ۷ کامل شد', 'رودِ شمع‌ها به درِ نیروگاه رسید');
      FLASH.white = .7; SFX.complete();
    }
  },
  close() {
    if (!MSTATE.done) showBanner('مأموریت ۷ گذشت',
      fa(this.candles.filter(c => c.lit).length) + ' شمعِ روشن — رژه ادامه دارد');
  },
  drawWorld(c2, t, mt) {
    // door glow at the plant's west gap
    const pl = .5 + .5 * Math.sin(t * 3);
    const g = c2.createRadialGradient(1914, 760, 0, 1914, 760, 52);
    g.addColorStop(0, 'rgba(245,230,168,' + (.28 + .22 * pl).toFixed(2) + ')');
    g.addColorStop(1, 'rgba(245,230,168,0)');
    c2.fillStyle = g; c2.fillRect(1862, 708, 104, 104);
    for (const c of this.candles) {
      // candle NPC: ivory wax disc + flame (or a smoke wisp when dead)
      c2.fillStyle = c.lit ? '#efe6cf' : '#6a6f7d';
      c2.beginPath(); c2.arc(c.x, c.y, 5, 0, TAU); c2.fill();
      c2.strokeStyle = 'rgba(20,22,31,.5)'; c2.lineWidth = 1; c2.stroke();
      if (c.lit) {
        const fl = .6 + .4 * Math.sin(t * 7 + c.y);
        c2.fillStyle = 'rgba(232,184,74,.18)';
        c2.beginPath(); c2.arc(c.x, c.y - 2, 12 * fl, 0, TAU); c2.fill();
        c2.fillStyle = '#f5e6a8'; c2.beginPath(); c2.arc(c.x, c.y - 2, 2.2, 0, TAU); c2.fill();
      } else {
        c2.strokeStyle = 'rgba(160,166,180,.5)'; c2.lineWidth = 1.4;
        c2.beginPath(); c2.moveTo(c.x, c.y - 6);
        c2.bezierCurveTo(c.x + 3, c.y - 12, c.x - 3, c.y - 16, c.x + 2, c.y - 22); c2.stroke();
      }
    }
    for (const g2 of this.gusts) drawPuff(c2, g2.x, g2.y, 12 + 8 * (1 - g2.t), .85 * g2.t);
  },
  drawHUD(c2, t) {
    hudCounter(c2, CFG.W / 2 + 30, 100, 300, 62, 'candle', this.candles.filter(c => c.lit).length, 'شمع‌های روشن — از ۱۰');
    hudMeter(c2, CFG.W / 2 - 190, 100, 170, this.order * 100, 100, '٪');
  },
};

/* ============================================================
   MISSION 8 — انفجارِ نهایی (steps 27–28,31 · 211.97→249.37s · war)
   ============================================================ */
const M8 = {
  id: 'm8', arena: 'war', tz: 1.3,
  start: { x: 1500, y: 620 },
  people: [], lineX: 1580, sweepT: 0, prevBx: 1810, sweepHits: 0,
  bed: { x: 1720, y: 530 }, bedT: 0, bedBroken: false, hits: 0,
  open() {
    this.people = [[1470, 420], [1520, 590], [1460, 630], [1560, 470], [1500, 520], [1440, 560], [1540, 620], [1470, 470]]
      .map(p => ({ x: p[0], y: p[1], joined: false }));
    this.lineX = 1580; this.sweepT = 0; this.prevBx = 1810; this.sweepHits = 0;
    this.bedT = 0; this.bedBroken = false; this.hits = 0;
    MSTATE.phase = 'gather';
    MSTATE.objText = 'مردم را با لمس جذب کن — گروه بساز (۶ نفر)';
    cam.tz = this.tz;
  },
  sweepX() { // light shaft sweeping west across the plaza each 5.5s (1.2s pass)
    const p = this.sweepT % 5.5;
    if (p > 1.2) return null;
    return 1810 - (p / 1.2) * 420;
  },
  update(dt, t, mt) {
    for (const p of this.people) {
      if (!p.joined && dist2(player.x, player.y, p.x, p.y) < 28 * 28) {
        p.joined = true; SFX.ember(); FLASH.white = Math.max(FLASH.white, .15);
      }
    }
    const group = this.people.filter(p => p.joined);
    chainFollow(group, dt, 26, 135);
    if (MSTATE.phase === 'gather') {
      if (group.length >= 6) {
        MSTATE.phase = 'push';
        MSTATE.objText = 'خطِ بسیجی‌ها را عقب بران — جاروبِ نورِ نیروگاه موج می‌سازد';
        showBanner('گروه کامل شد', fa(group.length) + ' نفر پشتِ تو');
      }
    } else if (MSTATE.phase === 'push') {
      this.lineX -= 12 * dt; // the line creeps west on its own
      let push = 0;
      if (Math.abs(player.x - this.lineX) < 70 && player.y > 380 && player.y < 650) push += 55;
      for (const p of group) if (Math.abs(p.x - this.lineX) < 95 && p.y > 380 && p.y < 650) push += 9;
      this.lineX += push * dt;
      // the light sweep
      this.sweepT += dt;
      const bx = this.sweepX();
      if (bx !== null) {
        if (this.prevBx !== null && this.prevBx > this.lineX && bx <= this.lineX) {
          this.lineX += 70; this.sweepHits++;
          FLASH.white = .5; cam.shake = .8; SFX.spark();
        }
        this.prevBx = bx;
      } else this.prevBx = 1810;
      // the shove: the line reaching the player
      const dxl = this.lineX - player.x;
      if (dxl > -10 && dxl < 24 && player.y > 380 && player.y < 650) {
        player.x -= 46; this.hits++;
        FLASH.red = .5; cam.shake = .7; SFX.caught();
      }
      if (this.lineX >= 1700) {
        MSTATE.phase = 'break';
        MSTATE.objText = 'تختِ ملکه را بشکن';
        showBanner('خط شکست', 'حالا خودِ تخت');
        FLASH.white = .5;
      }
    } else if (MSTATE.phase === 'break') {
      if (dist2(player.x, player.y, this.bed.x, this.bed.y) < 34 * 34) {
        this.bedT += dt;
        if (this.bedT >= 1.2 && !this.bedBroken) {
          this.bedBroken = true; MSTATE.done = true;
          showBanner('مأموریت ۸ کامل شد', 'تختِ ملکه شکست — تَعْ—طیل!');
          FLASH.white = .95; cam.shake = 1; SFX.spark(); SFX.complete();
        }
      } else this.bedT = Math.max(0, this.bedT - dt * .6);
    }
  },
  close() {
    if (!MSTATE.done) showBanner('مأموریت ۸ گذشت',
      this.bedBroken ? '' : (MSTATE.phase === 'break' ? 'تخت پابرجا ماند — داستان ادامه دارد' : 'خطِ بسیجی ایستاد — داستان ادامه دارد'));
  },
  drawWorld(c2, t, mt) {
    // the queen's bed (always present at the plaza's east; حاج‌خانوم beside it)
    c2.save(); c2.translate(this.bed.x, this.bed.y);
    if (!this.bedBroken) {
      c2.fillStyle = 'rgba(10,12,25,.42)'; c2.fillRect(-26, -14, 68, 48);
      c2.fillStyle = '#d9b23c'; c2.fillRect(-32, -20, 64, 40); // mattress
      c2.strokeStyle = PAL.gold; c2.lineWidth = 3; c2.strokeRect(-32, -20, 64, 40);
      c2.fillStyle = '#a3282a'; c2.fillRect(-32, -20, 64, 10); // vermilion sheet
      c2.fillStyle = '#f0d68a'; c2.fillRect(-28, -16, 14, 8); // pillow
      c2.strokeStyle = PAL.goldHi; c2.lineWidth = 2; // canopy posts
      c2.strokeRect(-40, -28, 80, 56);
    } else {
      c2.rotate(.12);
      c2.fillStyle = '#d9b23c'; c2.fillRect(-44, -14, 34, 30); c2.fillRect(12, -8, 32, 26);
      c2.strokeStyle = '#a3282a'; c2.lineWidth = 2.4;
      c2.beginPath(); c2.moveTo(-8, -12); c2.lineTo(-16, 10); c2.moveTo(0, -14); c2.lineTo(6, 12); c2.stroke();
    }
    c2.restore();
    const q = img('icons:zan-vazir');
    if (q) c2.drawImage(q, this.bed.x - 64, this.bed.y - 24, 34, 34);
    // progress ring while breaking
    if (MSTATE.phase === 'break' && !this.bedBroken && this.bedT > 0) {
      c2.strokeStyle = PAL.goldHi; c2.lineWidth = 4;
      c2.beginPath(); c2.arc(this.bed.x, this.bed.y, 40, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, this.bedT / 1.2)); c2.stroke();
    }
    // people (top-down): joined ones carry a flame
    for (const p of this.people) {
      c2.fillStyle = p.joined ? '#efe6cf' : '#b9bdc9';
      c2.beginPath(); c2.arc(p.x, p.y, 6, 0, TAU); c2.fill();
      c2.strokeStyle = p.joined ? PAL.goldDim : 'rgba(20,22,31,.4)'; c2.lineWidth = 1.2; c2.stroke();
      if (p.joined) {
        c2.fillStyle = '#f5e6a8'; c2.beginPath(); c2.arc(p.x, p.y - 8, 2.4, 0, TAU); c2.fill();
      }
    }
    // the basiji line (7 top-down figures facing west + the battle-line arc)
    for (let i = 0; i < 7; i++) {
      const by = 400 + i * 36;
      c2.fillStyle = '#2f4a3a'; c2.beginPath(); c2.arc(this.lineX, by, 8, 0, TAU); c2.fill();
      c2.strokeStyle = '#14161f'; c2.lineWidth = 1.6; c2.stroke();
      c2.fillStyle = 'rgba(163,40,42,.8)'; // west-facing threat wedge
      c2.beginPath(); c2.moveTo(this.lineX - 16, by); c2.lineTo(this.lineX - 5, by - 5); c2.lineTo(this.lineX - 5, by + 5); c2.closePath(); c2.fill();
    }
    c2.strokeStyle = 'rgba(163,40,42,.35)'; c2.lineWidth = 2; c2.setLineDash([10, 8]);
    c2.beginPath(); c2.moveTo(this.lineX - 12, 392); c2.lineTo(this.lineX - 12, 624); c2.stroke(); c2.setLineDash([]);
    // the light sweep shaft
    const bx = this.sweepX();
    if (bx !== null) {
      const g = c2.createLinearGradient(bx + 26, 0, bx - 26, 0);
      g.addColorStop(0, 'rgba(240,214,138,0)'); g.addColorStop(.5, 'rgba(240,214,138,.4)'); g.addColorStop(1, 'rgba(240,214,138,0)');
      c2.fillStyle = g; c2.fillRect(bx - 26, 360, 52, 300);
    }
  },
  drawHUD(c2, t) {
    hudCounter(c2, CFG.W / 2 + 30, 100, 300, 62, null, this.people.filter(p => p.joined).length, 'گروه — از ۸');
    if (MSTATE.phase !== 'gather') {
      hudMeter(c2, CFG.W / 2 - 190, 100, 170, (this.lineX - 1580) / 1.2, 100, '٪');
    }
  },
};

/* ============================================================
   MISSION 9 — پایانِ پایدار (steps 29–36 · 249.37→321.69s · plant)
   ============================================================ */
const M9 = {
  id: 'm9', arena: 'plant', tz: 1.25,
  start: { x: 1946, y: 780 },
  patches: [], ghosts: [], finale: 0,
  open() {
    this.patches = [
      [[2000, 480], [2028, 496], [2014, 452]],
      [[2100, 700], [2128, 716], [2114, 672]],
      [[2230, 560], [2258, 576], [2244, 532]],
    ].map(g => ({ dots: g.map(d => ({ x: d[0], y: d[1], lit: false })), lit: 0, on: false }));
    this.ghosts = [];
    for (let i = 0; i < 10; i++) this.ghosts.push({ a: i / 10 * Math.PI * 2, r: 130 + (i % 3) * 30, w: .25 + (i % 5) * .06, x: 0, y: 0 });
    this.finale = 0;
    MSTATE.phase = 'light';
    MSTATE.objText = 'سه وصلهٔ ∷∷∷ را روشن کن';
    cam.tz = this.tz;
  },
  update(dt, t, mt) {
    for (const p of this.patches) {
      if (p.on) continue;
      for (const d of p.dots) {
        if (!d.lit && dist2(player.x, player.y, d.x, d.y) < 24 * 24) {
          d.lit = true; p.lit++;
          SFX.ember(); FLASH.white = Math.max(FLASH.white, .2);
          if (p.lit >= 3) {
            p.on = true; SFX.complete();
            const k = this.patches.filter(x => x.on).length;
            showBanner('وصلهٔ ' + fa(k) + ' روشن شد', '∷∷∷');
            if (k >= 3 && this.finale === 0) {
              this.finale = .001; MSTATE.done = true;
              showBanner('مأموریت ۹ کامل شد', 'پایانِ پایدار — شهر روشن می‌شود');
              FLASH.white = .9; cam.shake = .9;
            }
          }
        }
      }
    }
    // ارواحِ تماشاگر: pale ghosts orbiting the player
    for (const g of this.ghosts) {
      g.a += g.w * dt;
      g.x = player.x + Math.cos(g.a) * g.r;
      g.y = player.y + Math.sin(g.a) * g.r * .8;
    }
    // the finale: golden zoom-out to the shining city (till the song ends)
    if (this.finale > 0) {
      this.finale += dt;
      cam.tz = Math.max(.52, cam.tz - dt * .17);
    }
  },
  close() {
    if (!MSTATE.done) showBanner('مأموریت ۹ گذشت',
      'وصله‌های روشن: ' + fa(this.patches.filter(p => p.on).length) + ' از ۳');
  },
  drawWorld(c2, t, mt) {
    // آتشِ ابدی — the eternal flame at the yard's heart
    const fl = 1 + .18 * Math.sin(t * 3.1) + .08 * Math.sin(t * 9.7);
    const g = c2.createRadialGradient(2100, 560, 0, 2100, 560, 60 * fl);
    g.addColorStop(0, 'rgba(245,220,140,.85)'); g.addColorStop(.5, 'rgba(226,98,43,.35)'); g.addColorStop(1, 'rgba(226,98,43,0)');
    c2.fillStyle = g; c2.beginPath(); c2.arc(2100, 560, 60 * fl, 0, TAU); c2.fill();
    c2.fillStyle = '#f5e6a8'; c2.beginPath(); c2.arc(2100, 560, 7, 0, TAU); c2.fill();
    cloudBand(c2, 2108, 548, 3.2, 'rgba(217,178,60,.8)'); // signature
    // patches ∷∷∷
    for (const p of this.patches) {
      for (const d of p.dots) {
        if (d.lit) {
          const fl2 = .6 + .4 * Math.sin(t * 6 + d.x);
          const gg = c2.createRadialGradient(d.x, d.y, 0, d.x, d.y, 18 * fl2);
          gg.addColorStop(0, 'rgba(245,220,140,.95)'); gg.addColorStop(1, 'rgba(232,184,74,0)');
          c2.fillStyle = gg; c2.beginPath(); c2.arc(d.x, d.y, 18 * fl2, 0, TAU); c2.fill();
          c2.fillStyle = '#f5e6a8'; c2.beginPath(); c2.arc(d.x, d.y, 3.4, 0, TAU); c2.fill();
        } else {
          drawEmber(c2, d.x, d.y, t);
        }
      }
      if (p.on) { // the patch ring snaps on
        c2.strokeStyle = 'rgba(240,214,138,' + (.25 + .15 * Math.sin(t * 4)).toFixed(2) + ')';
        c2.lineWidth = 2;
        c2.beginPath(); c2.arc(p.dots[0].x + 14, p.dots[0].y + 22, 34, 0, TAU); c2.stroke();
        cloudBand(c2, p.dots[0].x + 26, p.dots[0].y + 4, 2.6, 'rgba(217,178,60,.7)');
      }
    }
    // ghosts (pale, cheap: two flat circles each)
    for (const gh of this.ghosts) {
      c2.fillStyle = 'rgba(200,215,240,.10)';
      c2.beginPath(); c2.arc(gh.x, gh.y, 13, 0, TAU); c2.fill();
      c2.fillStyle = 'rgba(214,226,246,.16)';
      c2.beginPath(); c2.arc(gh.x, gh.y, 6, 0, TAU); c2.fill();
    }
    // finale warm wash
    if (this.finale > 0) {
      const k = Math.min(1, this.finale / 4);
      c2.fillStyle = 'rgba(240,200,120,' + (.08 * k * (1 + .3 * Math.sin(t * 2))).toFixed(3) + ')';
      c2.fillRect(cam.x - 2000, cam.y - 1200, 4000, 2400);
    }
  },
  drawHUD(c2, t) {
    hudCounter(c2, CFG.W / 2 + 30, 100, 300, 62, 'candle', this.patches.filter(p => p.on).length, 'وصله‌های روشن — از ۳');
  },
};

const MISSION_IMPL = { m1: M1, m2: M2, m3: M3, m4: M4, m5: M5, m6: M6, c1: C1, c2: C2, m7: M7, m8: M8, m9: M9 };

function missionTick(dt, t) {
  if (GAME.freeroam) return; // the open city — no windows, no swaps
  const mdef = missionAt(t);
  // fade transition between arenas
  if (MSTATE.fadeDir === 0 && mdef.id !== MSTATE.id) {
    if (MSTATE.m && MSTATE.m.close) MSTATE.m.close();
    MSTATE.pending = mdef;
    MSTATE.fadeDir = 1; // fade out
  }
  if (MSTATE.fadeDir === 1) {
    MSTATE.fadeA = Math.min(1, MSTATE.fadeA + dt * 3);
    if (MSTATE.fadeA >= 1) {
      const impl = MISSION_IMPL[MSTATE.pending.id];
      MSTATE.id = MSTATE.pending.id; MSTATE.mt = 0; MSTATE.done = false; MSTATE.phase = '';
      if (!impl) { // milestone not built yet (m4+ until M2/M3 land) — free walk, no mission logic
        MSTATE.m = null; MSTATE.objText = '';
        MSTATE.fadeDir = -1;
        return;
      }
      MSTATE.m = impl;
      player.x = impl.start.x; player.y = impl.start.y;
      player.vx = player.vy = 0;
      cam.x = player.x; cam.y = player.y;
      cam.tz = impl.tz || CFG.ZOOM;
      MSTATE.fadeDir = -1;
      MSTATE.seen = false;
      if (impl.open) impl.open();
      // (window-open banner comes from timelineTick — no duplicate here)
    }
  } else if (MSTATE.fadeDir === -1) {
    MSTATE.fadeA = Math.max(0, MSTATE.fadeA - dt * 2.2);
    if (MSTATE.fadeA <= 0) MSTATE.fadeDir = 0;
  }
  if (MSTATE.m) {
    MSTATE.mt = t - missionAt(t).t0;
    MSTATE.m.update(dt, t, MSTATE.mt);
  }
}
function missionStepEvent(n) {
  if (MSTATE.m && MSTATE.m.onStep) MSTATE.m.onStep(n);
}
function missionDrawWorld(c2, t) {
  if (MSTATE.m && MSTATE.m.drawWorld && GAME.state === 'play') MSTATE.m.drawWorld(c2, t, MSTATE.mt);
  if (MSTATE.fadeA > 0) {
    c2.fillStyle = 'rgba(2,3,8,' + MSTATE.fadeA + ')';
    c2.fillRect(cam.x - 2000, cam.y - 1200, 4000, 2400);
  }
}
function missionDrawHUD(c2, t) {
  // active widgets (ASSETS.md placements, under minimap — RTL)
  if (WIDGETS.outage.on) {
    hudMeter(c2, 24, 158, 168, WIDGETS.outage.value, 48, ' ساعت');
  }
  if (WIDGETS.gauge.on) {
    hudGauge(c2, 24 + 84, 158 + 96 + 42, 52, WIDGETS.gauge.value, 'درجهٔ اتاق');
  }
  // objective line under the timer plaque
  if (MSTATE.objText && GAME.state === 'play') {
    c2.textAlign = 'center'; c2.font = '18px ' + CFG.FONT;
    const pulse = MSTATE.seen ? 'rgba(226,98,43,' + (0.75 + 0.25 * Math.sin(t * 10)) + ')' : 'rgba(240,214,138,.92)';
    c2.fillStyle = pulse;
    c2.fillText('◈ ' + MSTATE.objText, CFG.W / 2, 108);
  }
}
