/* ---------- 07 · HUD: tazhib frame + painted widgets (hud-demo spec, ASSETS.md) ----------
   Behaviors: Persian digits (۰–۹), flash 0.35s on change, RTL meters (fill from right),
   gauge needle 15..48° over 180° sweep, clamp ≥0, song timer = official game clock. */

const HUD = {
  widgets: {},           // id -> {value, shown, flashT, ...}
  ticker: { stepIdx: -1, flashT: 0 },
  banner: null,          // {title, sub, t}
  zoneCap: null,         // {name, t}
  fps: 60, _fpsAcc: 0, _fpsN: 0,
};
function hudWidget(id) {
  if (!HUD.widgets[id]) HUD.widgets[id] = { value: 0, shown: null, flashT: 0 };
  return HUD.widgets[id];
}
function hudSet(id, v) {
  const w = hudWidget(id);
  v = Math.max(0, v); // no negatives (ASSETS.md rule)
  if (v !== w.shown) { w.shown = v; w.flashT = .35; }
  w.value = v;
}

/* --- painted pieces --- */
function hudPanel(c2, x, y, w, h) {
  const im = img('panel');
  if (im) { c2.drawImage(im, x, y, w, h); return; }
  c2.fillStyle = PAL.panel; c2.fillRect(x, y, w, h);
  c2.strokeStyle = PAL.goldDim; c2.strokeRect(x, y, w, h);
}
function hudMedallion(c2, x, y, r, iconKey) {
  const im = iconKey && img('icons:' + iconKey);
  c2.save();
  c2.beginPath(); c2.arc(x, y, r, 0, TAU); c2.closePath();
  c2.fillStyle = PAL.bg; c2.fill();
  c2.clip();
  if (im) {
    const s = 2 * r / Math.min(im.width, im.height);
    c2.drawImage(im, x - im.width * s / 2, y - im.height * s / 2, im.width * s, im.height * s);
  }
  c2.restore();
  c2.strokeStyle = PAL.gold; c2.lineWidth = 3; c2.beginPath(); c2.arc(x, y, r, 0, TAU); c2.stroke();
  c2.strokeStyle = PAL.goldDim; c2.lineWidth = 1.2; c2.beginPath(); c2.arc(x, y, r + 4, 0, TAU); c2.stroke();
}
/* counter widget: plaque + medallion (right, RTL) + big number + caption */
function hudCounter(c2, x, y, w, h, iconKey, value, caption, sub) {
  const wd = hudWidget('c:' + caption);
  if (wd.shown === null) wd.shown = value;
  const flash = wd.flashT > 0;
  if (flash) wd.flashT -= FRAME_DT;
  hudPanel(c2, x, y, w, h);
  c2.save();
  if (flash) { c2.filter = 'brightness(1.9)'; }
  hudMedallion(c2, x + w - h * .68, y + h / 2, h * .38, iconKey);
  c2.textAlign = 'center';
  c2.fillStyle = flash ? '#fff6d8' : PAL.ink;
  c2.font = Math.round(h * .5) + 'px ' + CFG.FONT;
  c2.fillText(fa(value), x + w * .42, y + h * .58);
  c2.font = Math.round(h * .2) + 'px ' + CFG.FONT;
  c2.fillStyle = '#8b93a8';
  c2.fillText(caption, x + w * .42, y + h * .84);
  c2.restore();
  if (sub) { /* extra slot row (used by rooftop questions in M2) */ }
}
/* meter: track image + gold fill from the RIGHT (RTL), 0..max */
function hudMeter(c2, x, y, w, value, max, unit) {
  const h = 30;
  const im = img('track');
  if (im) c2.drawImage(im, x, y, w, h);
  else { c2.fillStyle = PAL.panel; c2.fillRect(x, y, w, h); c2.strokeStyle = PAL.goldDim; c2.strokeRect(x, y, w, h); }
  const p = clamp(value / max, 0, 1);
  const fw = (w - w * .08) * p;
  if (fw > 0) {
    const gr = c2.createLinearGradient(x + w, 0, x, 0);
    gr.addColorStop(0, '#d9b23c'); gr.addColorStop(1, '#f0d68a');
    c2.fillStyle = gr;
    c2.fillRect(x + w - w * .04 - fw, y + h * .26, fw, h * .48);
  }
  c2.textAlign = 'center'; c2.font = '15px ' + CFG.FONT;
  c2.fillStyle = PAL.ink;
  c2.fillText(fa(Math.round(value)) + (unit || ''), x + w / 2, y + h - 9);
}
/* gauge: ring image + needle (15..48 → -90..+90 deg) */
function hudGauge(c2, x, y, r, value, caption) {
  const im = img('ring');
  c2.save();
  if (im) c2.drawImage(im, x - r, y - r, r * 2, r * 2);
  else { c2.strokeStyle = PAL.gold; c2.lineWidth = 4; c2.beginPath(); c2.arc(x, y, r, 0, TAU); c2.stroke(); }
  const ang = (clamp(value, 15, 48) - 15) / 33 * 180 - 90;
  c2.translate(x, y); c2.rotate(ang * Math.PI / 180);
  c2.fillStyle = PAL.ink; c2.beginPath();
  c2.roundRect(-2, -r * .72, 4, r * .72, 2); c2.fill();
  c2.restore();
  c2.textAlign = 'center'; c2.font = Math.round(r * .42) + 'px ' + CFG.FONT;
  c2.fillStyle = PAL.ink; c2.fillText(fa(Math.round(value)) + '°', x, y + r * .5);
  c2.font = Math.round(r * .22) + 'px ' + CFG.FONT; c2.fillStyle = '#8b93a8';
  c2.fillText(caption, x, y + r * .78);
}

/* --- tazhib frame (animatic language, always alive; corner pulse on the beat) --- */
function tazhibFrame(c2) {
  c2.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  const ph = beatPhase(gameTime()); // 0..1 within each beat
  const pk = Math.pow(1 - ph, 2);   // fresh beat → bright corner pulse
  c2.strokeStyle = PAL.gold; c2.lineWidth = 3; c2.strokeRect(7, 7, CFG.W - 14, CFG.H - 14);
  c2.strokeStyle = 'rgba(138,109,29,' + (.75 + .25 * pk).toFixed(3) + ')'; c2.lineWidth = 1;
  c2.strokeRect(15, 15, CFG.W - 30, CFG.H - 30);
  const c = (x, y) => {
    c2.save();
    c2.translate(x, y);
    c2.scale(1 + .06 * pk, 1 + .06 * pk);
    c2.translate(-x, -y);
    c2.fillStyle = PAL.gold;
    c2.beginPath();
    c2.moveTo(x, y); c2.lineTo(x + (x < CFG.W / 2 ? 26 : -26), y);
    c2.lineTo(x + (x < CFG.W / 2 ? 26 : -26), y + (y < CFG.H / 2 ? 8 : -8));
    c2.lineTo(x + (x < CFG.W / 2 ? 8 : -8), y + (y < CFG.H / 2 ? 8 : -8));
    c2.lineTo(x + (x < CFG.W / 2 ? 8 : -8), y + (y < CFG.H / 2 ? 26 : -26));
    c2.closePath(); c2.fill();
    // ring of dots
    c2.strokeStyle = PAL.goldDim; c2.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU;
      c2.beginPath(); c2.arc(x + (x < CFG.W / 2 ? 13 : -13) + Math.cos(a) * 9, y + (y < CFG.H / 2 ? 13 : -13) + Math.sin(a) * 9, 1.6, 0, TAU); c2.stroke();
    }
    // hidden signature: cloud-band in the corner ornament
    cloudBand(c2, x + (x < CFG.W / 2 ? 13 : -13), y + (y < CFG.H / 2 ? 13 : -13), 3.2, 'rgba(217,178,60,.9)');
    c2.restore();
  };
  c(22, 22); c(CFG.W - 22, 22); c(22, CFG.H - 22); c(CFG.W - 22, CFG.H - 22);
  c2.fillStyle = 'rgba(217,178,60,.8)';
  c2.font = '13px ' + CFG.FONT; c2.textAlign = 'left';
  c2.fillText('K1RT!0NARi', 26, CFG.H - 24);
}

/* --- minimap (north-up, mission dots) --- */
const MINI = { w: 168, h: 94, x: 24, y: 46, cv: null };
function buildMinimap() {
  MINI.cv = document.createElement('canvas');
  MINI.cv.width = MINI.w * 2; MINI.cv.height = MINI.h * 2;
  const mc = MINI.cv.getContext('2d');
  mc.drawImage(WORLD, 0, 0, MINI.cv.width, MINI.cv.height);
  // hidden signature on minimap frame
}
function drawMinimap(c2, t) {
  const { x, y, w, h } = MINI;
  c2.save();
  c2.globalAlpha = .92;
  c2.fillStyle = '#0b101c'; c2.fillRect(x - 3, y - 3, w + 6, h + 6);
  c2.drawImage(MINI.cv, x, y, w, h);
  c2.globalAlpha = 1;
  // mission dots (current mission pulses)
  const m = missionAt(gameTime());
  if (m && m.arena) {
    const A = ARENAS[m.arena];
    const px = x + A.x / CFG.WW * w, py = y + A.y / CFG.WH * h;
    const pl = .5 + .5 * Math.sin(t * 4);
    c2.fillStyle = PAL.gold;
    c2.beginPath(); c2.arc(px, py, 3 + pl * 1.6, 0, TAU); c2.fill();
  }
  // player dot
  const qx = x + player.x / CFG.WW * w, qy = y + player.y / CFG.WH * h;
  c2.fillStyle = PAL.flame;
  c2.beginPath(); c2.arc(qx, qy, 3, 0, TAU); c2.fill();
  c2.strokeStyle = 'rgba(245,230,168,.7)'; c2.lineWidth = 1;
  c2.beginPath(); c2.arc(qx, qy, 5.5, 0, TAU); c2.stroke();
  // frame
  c2.strokeStyle = PAL.goldDim; c2.lineWidth = 1.5; c2.strokeRect(x - 3, y - 3, w + 6, h + 6);
  cloudBand(c2, x + 7, y + 7, 2.4, 'rgba(217,178,60,.85)'); // signature
  c2.restore();
}

/* --- top HUD: scene chip (right), timer plaque (center) --- */
function drawTopHUD(c2, t, stepIdx) {
  const S = STEPS[stepIdx] || STEPS[0];
  // scene chip — top right (RTL first)
  c2.font = '17px ' + CFG.FONT;
  const label = 'گامِ ' + fa(stepIdx + 1) + ' از ' + fa(STEPS.length) + ' · ' + S.sc;
  const tw = c2.measureText(label).width;
  const bx = CFG.W - 28 - tw - 26, by = 28;
  c2.fillStyle = PAL.panel; c2.fillRect(bx, by, tw + 26, 30);
  c2.strokeStyle = PAL.goldDim; c2.strokeRect(bx, by, tw + 26, 30);
  c2.fillStyle = PAL.gold; c2.textAlign = 'right';
  c2.fillText(label, CFG.W - 41, by + 21);
  // timer plaque — top center
  const tw2 = 300, th = 62, tx = CFG.W / 2 - tw2 / 2, ty = 24;
  hudCounter(c2, tx, ty, tw2, th, null, faClock(gameTime()), 'زمانِ آهنگ — ساعتِ بازی');
  // (icon slot unused for timer; draw a small flame mark)
  const fx = tx + tw2 - th * .68, fy = ty + th / 2;
  const fl = Math.sin(t * 9) * .5 + Math.sin(t * 23) * .5;
  const g = c2.createRadialGradient(fx, fy, 0, fx, fy, 16 + fl * 3);
  g.addColorStop(0, 'rgba(245,230,168,.95)'); g.addColorStop(1, 'rgba(232,184,74,0)');
  c2.fillStyle = g; c2.beginPath(); c2.arc(fx, fy, 16 + fl * 3, 0, TAU); c2.fill();
  c2.fillStyle = PAL.flame; c2.beginPath(); c2.arc(fx, fy, 5 + fl * 1.4, 0, TAU); c2.fill();
}

/* --- bottom: lyric ticker (byte-exact lines, flash on step change) --- */
function drawTicker(c2, t, stepIdx) {
  const S = STEPS[stepIdx] || STEPS[0];
  const barH = 74, by = CFG.H - 20 - barH, bx = 28, bw = CFG.W - 56;
  const tk = HUD.ticker;
  if (tk.stepIdx !== stepIdx) { tk.stepIdx = stepIdx; tk.flashT = .35; }
  if (tk.flashT > 0) tk.flashT -= FRAME_DT;
  c2.save();
  c2.fillStyle = 'rgba(9,13,26,.9)';
  c2.beginPath(); c2.roundRect(bx, by, bw, barH, 10); c2.fill();
  c2.strokeStyle = tk.flashT > 0 ? PAL.goldHi : PAL.goldDim; c2.lineWidth = tk.flashT > 0 ? 2.5 : 1.5;
  c2.stroke();
  if (tk.flashT > 0) { c2.fillStyle = 'rgba(240,214,138,.08)'; c2.fillRect(bx, by, bw, barH); }
  // scene label (gold, right)
  c2.textAlign = 'right';
  c2.fillStyle = PAL.gold; c2.font = '16px ' + CFG.FONT;
  c2.fillText(S.sc, bx + bw - 18, by + 24);
  // step time chip
  c2.textAlign = 'left'; c2.fillStyle = '#8b93a8'; c2.font = '14px ' + CFG.FONT;
  c2.fillText(faClock(S.t), bx + 18, by + 24);
  // lyric line (byte-exact), auto-fit
  const line = S.line === '—' ? '♪' : S.line;
  let fs = 21;
  c2.font = fs + 'px ' + CFG.FONT;
  while (c2.measureText(line).width > bw - 36 && fs > 12) { fs--; c2.font = fs + 'px ' + CFG.FONT; }
  c2.textAlign = 'center'; c2.fillStyle = PAL.ink;
  c2.fillText(line, bx + bw / 2, by + 52);
  c2.restore();
}

/* --- mission banner + zone caption --- */
function drawBanner(c2, dt) {
  if (!HUD.banner) return;
  const b = HUD.banner;
  b.t -= dt;
  if (b.t <= 0) { HUD.banner = null; return; }
  const a = Math.min(1, b.t / .8) * Math.min(1, (BANNER_T - b.t) / .35);
  c2.save(); c2.globalAlpha = a;
  const bw = 620, bh = 74, bx = CFG.W / 2 - bw / 2, by = 110;
  c2.fillStyle = 'rgba(9,13,26,.88)';
  c2.beginPath(); c2.roundRect(bx, by, bw, bh, 12); c2.fill();
  c2.strokeStyle = PAL.gold; c2.lineWidth = 2; c2.stroke();
  c2.textAlign = 'center'; c2.fillStyle = PAL.gold; c2.font = '26px ' + CFG.FONT;
  c2.fillText(b.title, CFG.W / 2, by + 32);
  if (b.sub) { c2.fillStyle = PAL.ink; c2.font = '17px ' + CFG.FONT; c2.fillText(b.sub, CFG.W / 2, by + 58); }
  c2.restore();
}
const BANNER_T = 4.2;
function showBanner(title, sub) { HUD.banner = { title, sub, t: BANNER_T }; }

function drawZoneCap(c2, dt) {
  if (!HUD.zoneCap) return;
  const z = HUD.zoneCap;
  z.t -= dt;
  if (z.t <= 0) { HUD.zoneCap = null; return; }
  const a = Math.min(1, z.t / .5) * Math.min(1, (2.6 - z.t) / .35);
  c2.save(); c2.globalAlpha = a;
  c2.font = '22px ' + CFG.FONT; c2.textAlign = 'right';
  const tw = c2.measureText(z.name).width;
  const bx = CFG.W - 46 - tw - 28, by = CFG.H - 122;
  c2.fillStyle = 'rgba(9,13,26,.82)'; c2.fillRect(bx, by, tw + 28, 38);
  c2.strokeStyle = PAL.goldDim; c2.strokeRect(bx, by, tw + 28, 38);
  c2.fillStyle = PAL.goldHi; c2.fillText(z.name, CFG.W - 60, by + 26);
  c2.restore();
}
function zoneCaption(name) { HUD.zoneCap = { name, t: 2.6 }; }

/* current zone test (arena insets padded) */
function zoneAt(x, y) {
  for (const k in ARENAS) {
    const A = ARENAS[k], I = A.inset;
    if (x > I[0] - 24 && x < I[0] + I[2] + 24 && y > I[1] - 24 && y < I[1] + I[3] + 24) return A;
  }
  return null;
}

/* guide arrow toward current mission arena */
function drawGuide(c2, t) {
  const m = missionAt(gameTime());
  if (!m || !m.arena) return;
  const A = ARENAS[m.arena];
  const dx = A.x - player.x, dy = A.y - player.y;
  if (dx * dx + dy * dy < 200 * 200) return; // close enough
  const ang = Math.atan2(dy, dx);
  const cx = CFG.W / 2 + Math.cos(ang) * 300, cy = CFG.H / 2 + Math.sin(ang) * 300 * (CFG.H / CFG.W) * 1.2;
  const pl = .6 + .4 * Math.sin(t * 5);
  c2.save(); c2.translate(cx, cy); c2.rotate(ang);
  c2.globalAlpha = .55 * pl;
  c2.fillStyle = PAL.gold;
  c2.beginPath(); c2.moveTo(16, 0); c2.lineTo(-8, -10); c2.lineTo(-3, 0); c2.lineTo(-8, 10); c2.closePath(); c2.fill();
  c2.restore();
}
