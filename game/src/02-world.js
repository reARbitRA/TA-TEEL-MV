/* ---------- 02 · world: one continuous painted night city ----------
   Layout blueprint = animatic.html (same seed, same streets, same 9 locations).
   9 arena plates composited as gold-framed illuminated insets (style-bible §4). */

const WORLD = document.createElement('canvas');
WORLD.width = CFG.WW; WORLD.height = CFG.WH;
const wc = WORLD.getContext('2d');

const SOLID = { rects: [], circles: [] };
const rect = (x, y, w, h, tag) => SOLID.rects.push({ x, y, w, h, tag: tag || 'b' });
const circ = (x, y, r, tag) => SOLID.circles.push({ x, y, r, tag: tag || 'p' });

/* --- 9 arenas (anchor = camera/gameplay center; zone = caption bounds) --- */
const ARENAS = {
  majles:    { x: 220,  y: 175,  plate: 'loc1', name: 'مجلسِ شورایی',                 inset: [72, 72, 296, 206] },
  candle:    { x: 650,  y: 530,  plate: 'loc2', name: 'اتاقِ زادگاهِ شمع',             inset: [572, 462, 156, 126] },
  raaviRoom: { x: 650,  y: 195,  plate: 'loc3', name: 'اتاقِ چهل‌درجه',                inset: [472, 102, 376, 176] },
  roof:      { x: 1150, y: 195,  plate: 'loc4', name: 'پشت‌بام',                       inset: [972, 102, 356, 176] },
  chalipa:   { x: 1380, y: 330,  plate: 'loc5', name: 'چلیپا — چهارراهِ دوزخ',        inset: [1310, 252, 140, 156] },
  clock:     { x: 900,  y: 1000, plate: 'loc6', name: 'پل و میدانِ ساعتِ دیوانه',      inset: [818, 918, 164, 164] },
  parade:    { x: 1860, y: 1130, plate: 'loc7', name: 'بلوارِ رژهٔ شمع‌ها',             inset: [1814, 942, 92, 368] },
  war:       { x: 1630, y: 520,  plate: 'loc8', name: 'میدانِ نبردِ نهایی',            inset: [1420, 370, 400, 290] },
  plant:     { x: 2100, y: 420,  plate: 'loc9', name: 'نیروگاهِ سه‌فاز',                inset: [1930, 95, 382, 540] },
};

function shadowRectW(x, y, w, h, fill) {
  wc.fillStyle = 'rgba(10,12,25,.42)'; wc.fillRect(x + 16, y + 12, w, h);
  wc.fillStyle = fill; wc.fillRect(x, y, w, h);
}
function building(x, y, w, h) {
  shadowRectW(x, y, w, h, PAL.roofs[(R() * PAL.roofs.length) | 0]);
  wc.fillStyle = 'rgba(240,200,140,.14)'; wc.fillRect(x, y, w, 3);
  // warm windows: tiny lit dots on the street-facing edges (render polish M4)
  const nWin = (R() * 5) | 0;
  for (let i = 0; i < nWin; i++) {
    const wx = x + 6 + R() * (w - 14), wy = y + 6 + R() * (h - 14);
    wc.fillStyle = R() < .3 ? 'rgba(245,230,168,.5)' : 'rgba(240,200,120,.34)';
    wc.fillRect(wx, wy, 3.5, 3.5);
  }
  if (R() < .6) {
    wc.fillStyle = 'rgba(10,12,25,.35)';
    const n = 1 + (R() * 3 | 0);
    for (let i = 0; i < n; i++) {
      const bx = x + 8 + R() * (w - 30), by = y + 8 + R() * (h - 30);
      if (R() < .5) { wc.beginPath(); wc.arc(bx + 8, by + 8, 7 + R() * 6, 0, 7); wc.fill(); }
      else wc.fillRect(bx, by, 14, 12);
    }
  }
  if (R() < .28) {
    wc.fillStyle = '#2e2a20'; wc.fillRect(x + 10, y + 10, w * .42, h * .42);
    wc.fillStyle = '#3b4a34'; wc.beginPath(); wc.arc(x + w * .3, y + h * .3, 12, 0, 7); wc.fill();
  }
  wc.strokeStyle = 'rgba(10,12,25,.5)'; wc.lineWidth = 2; wc.strokeRect(x, y, w, h);
  rect(x, y, w, h);
}
function treeW(x, y, r) {
  wc.fillStyle = 'rgba(10,12,25,.4)'; wc.beginPath(); wc.arc(x + 8, y + 7, r, 0, 7); wc.fill();
  wc.fillStyle = '#3b4a34'; wc.beginPath(); wc.arc(x, y, r, 0, 7); wc.fill();
  wc.fillStyle = '#46583d'; wc.beginPath(); wc.arc(x - r * .25, y - r * .25, r * .55, 0, 7); wc.fill();
}
function carStaticW(x, y, rot, col) {
  wc.save(); wc.translate(x, y); wc.rotate(rot);
  wc.fillStyle = 'rgba(10,12,25,.45)'; wc.fillRect(-17, -7, 36, 16);
  wc.fillStyle = col; wc.beginPath(); wc.roundRect(-18, -8, 36, 16, 5); wc.fill();
  wc.fillStyle = '#141824'; wc.fillRect(-6, -6, 12, 12); wc.restore();
  rect(x - 19, y - 19, 38, 38, 'car'); // coarse solid for parked cars
}

/* tiny Safavid cloud-band flourish — the hidden signature of this build */
function cloudBand(c2, x, y, s, col) {
  c2.strokeStyle = col || PAL.goldHi; c2.lineWidth = Math.max(1, s * .16);
  c2.beginPath();
  c2.moveTo(x - s, y);
  c2.bezierCurveTo(x - s * .7, y - s * .9, x + s * .2, y - s * .95, x + s * .35, y - s * .25);
  c2.bezierCurveTo(x + s * .9, y - s * .45, x + s, y + s * .35, x + s * .25, y + s * .3);
  c2.stroke();
}

/* plate inset: painted arena floor blended into the city, gold tazhib keyline */
function plateInset(key, x, y, w, h) {
  const im = img('plates:' + key);
  if (!im) return;
  wc.save();
  wc.beginPath(); wc.rect(x, y, w, h); wc.clip();
  // cover-fit
  const s = Math.max(w / im.width, h / im.height);
  const dw = im.width * s, dh = im.height * s;
  wc.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  // feather the inset into the night: dark edges
  const g = wc.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, 'rgba(13,21,38,.55)'); g.addColorStop(.18, 'rgba(13,21,38,0)');
  g.addColorStop(.82, 'rgba(13,21,38,0)'); g.addColorStop(1, 'rgba(13,21,38,.55)');
  wc.fillStyle = g; wc.fillRect(x, y, w, h);
  const g2 = wc.createLinearGradient(x, y, x + w, y);
  g2.addColorStop(0, 'rgba(13,21,38,.55)'); g2.addColorStop(.15, 'rgba(13,21,38,0)');
  g2.addColorStop(.85, 'rgba(13,21,38,0)'); g2.addColorStop(1, 'rgba(13,21,38,.55)');
  wc.fillStyle = g2; wc.fillRect(x, y, w, h);
  // gentle night-grade so plates sit in the same lamp-lit world
  wc.fillStyle = 'rgba(13,21,38,.18)'; wc.fillRect(x, y, w, h);
  wc.restore();
  // gold tazhib keyline + inner dim line
  wc.strokeStyle = PAL.gold; wc.lineWidth = 2.5; wc.strokeRect(x, y, w, h);
  wc.strokeStyle = PAL.goldDim; wc.lineWidth = 1; wc.strokeRect(x - 3.5, y - 3.5, w + 7, h + 7);
  // hidden signature: tiny cloud-band in each corner
  const s2 = 5;
  cloudBand(wc, x + 8, y + 8, s2); cloudBand(wc, x + w - 8, y + 8, s2);
  cloudBand(wc, x + 8, y + h - 8, s2); cloudBand(wc, x + w - 8, y + h - 8, s2);
}

/* wall ring with door gap (axis aligned). side: N/S/E/W */
function wallsWithGap(x, y, w, h, t, side, g0, g1, tag) {
  if (side === 'S') {
    rect(x, y, w, t, tag); rect(x, y + h - t, g0 - x, t, tag); rect(g1, y + h - t, x + w - g1, t, tag);
  } else if (side === 'N') {
    rect(x, y + h - t, w, t, tag); rect(x, y, g0 - x, t, tag); rect(g1, y, x + w - g1, t, tag);
  } else if (side === 'E') {
    rect(x, y, t, h, tag); rect(x + w - t, y, t, g0 - y, tag); rect(x + w - t, g1, t, y + h - g1, tag);
  } else {
    rect(x + w - t, y, t, h, tag); rect(x, y, t, g0 - y, tag); rect(x, g1, t, y + h - g1, tag);
  }
}
function drawWalls(x, y, w, h, t, side, g0, g1) {
  wc.fillStyle = '#26211a';
  const seg = (sx, sy, sw, sh) => { wc.fillRect(sx, sy, sw, sh); };
  if (side === 'S') { seg(x, y, w, t); seg(x, y + h - t, g0 - x, t); seg(g1, y + h - t, x + w - g1, t); }
  if (side === 'N') { seg(x, y + h - t, w, t); seg(x, y, g0 - x, t); seg(g1, y, x + w - g1, t); }
  if (side === 'E') { seg(x, y, t, h); seg(x + w - t, y, t, g0 - y); seg(x + w - t, g1, t, y + h - g1); }
  if (side === 'W') { seg(x + w - t, y, t, h); seg(x, y, t, g0 - y); seg(x, g1, t, y + h - g1); }
  wc.strokeStyle = PAL.goldDim; wc.lineWidth = 1.5;
  wc.strokeRect(x - .5, y - .5, w + 1, h + 1);
}

function buildWorld() {
  const WW = CFG.WW, WH = CFG.WH, HY = CFG.HY, VX = CFG.VX, RW = CFG.RW;
  // ground
  wc.fillStyle = PAL.ground; wc.fillRect(0, 0, WW, WH);
  wc.fillStyle = 'rgba(10,12,25,.25)';
  for (let i = 0; i < 420; i++) wc.fillRect(R() * WW, R() * WH, 10 + R() * 40, 6 + R() * 18);
  // river
  wc.fillStyle = PAL.river; wc.fillRect(0, CFG.RIVER_Y, WW, CFG.RIVER_H);
  wc.strokeStyle = '#2a3a3a'; wc.lineWidth = 4;
  for (let i = 0; i < 26; i++) {
    wc.beginPath(); wc.moveTo(R() * WW, 1140 + R() * 140); wc.lineTo(R() * WW, 1140 + R() * 140); wc.stroke();
  }
  for (const bx of CFG.BRIDGES) {
    wc.fillStyle = PAL.deck; wc.fillRect(bx, 1122, RW + 8, 176);
    wc.strokeStyle = PAL.gold; wc.lineWidth = 2; wc.setLineDash([10, 8]);
    wc.beginPath(); wc.moveTo(bx + 4, 1126); wc.lineTo(bx + 4, 1294);
    wc.moveTo(bx + RW + 4, 1126); wc.lineTo(bx + RW + 4, 1294); wc.stroke(); wc.setLineDash([]);
  }
  // river collision (walkable only on bridge decks)
  rect(0, CFG.RIVER_Y, CFG.BRIDGES[0], CFG.RIVER_H, 'river');
  rect(CFG.BRIDGES[0] + RW + 8, CFG.RIVER_Y, CFG.BRIDGES[1] - CFG.BRIDGES[0] - RW - 8, CFG.RIVER_H, 'river');
  rect(CFG.BRIDGES[1] + RW + 8, CFG.RIVER_Y, WW - CFG.BRIDGES[1] - RW - 8, CFG.RIVER_H, 'river');
  // streets
  for (const y of HY) {
    wc.fillStyle = PAL.sidewalk; wc.fillRect(0, y - 46, WW, RW + 18);
    wc.fillStyle = PAL.street; wc.fillRect(0, y - RW / 2, WW, RW);
    wc.strokeStyle = PAL.dash; wc.lineWidth = 3; wc.setLineDash([18, 26]);
    wc.beginPath(); wc.moveTo(0, y); wc.lineTo(WW, y); wc.stroke(); wc.setLineDash([]);
  }
  for (const x of VX) {
    wc.fillStyle = PAL.sidewalk; wc.fillRect(x - 46, 0, RW + 18, WH);
    wc.fillStyle = PAL.street; wc.fillRect(x - RW / 2, 0, RW, WH);
    wc.strokeStyle = PAL.dash; wc.lineWidth = 3; wc.setLineDash([18, 26]);
    wc.beginPath(); wc.moveTo(x, 0); wc.lineTo(x, WH); wc.stroke(); wc.setLineDash([]);
  }
  // lamp pools (static)
  const pool = (x, y) => {
    const g = wc.createRadialGradient(x, y, 0, x, y, 50);
    g.addColorStop(0, 'rgba(230,170,100,.13)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    wc.fillStyle = g; wc.fillRect(x - 50, y - 50, 100, 100);
    wc.fillStyle = '#f5cd8f'; wc.beginPath(); wc.arc(x, y, 2.6, 0, 7); wc.fill();
  };
  for (const y of HY) for (let x = 90; x < WW; x += 180) { if (VX.some(v => Math.abs(v - x) < 70)) continue; pool(x, y); }
  for (const x of VX) for (let y = 120; y < 1100; y += 190) { if (HY.some(h => Math.abs(h - y) < 80)) continue; pool(x, y); }
  // crosswalk at chalipa (1380×330)
  wc.fillStyle = 'rgba(220,200,160,.45)';
  for (let s = 0; s < 6; s++) {
    const o = 1346 + s * 12;
    wc.fillRect(o, 262, 8, 20); wc.fillRect(o, 378, 8, 20);
    wc.fillRect(1318, 296 + s * 12, 20, 8); wc.fillRect(1422, 296 + s * 12, 20, 8);
  }
  // city blocks (same cell grid as animatic; landmark cells skipped)
  const CX = [[60, 374], [466, 854], [946, 1334], [1426, 1774], [1946, 2340]];
  const CY = [[60, 284], [376, 654], [746, 1024]];
  const SKIPCELL = { '0,0': 1, '1,0': 1, '2,0': 1, '3,0': 1, '4,0': 1, '4,1': 1, '4,2': 1, '1,1': 1, '3,1': 1 };
  for (let cyi = 0; cyi < 3; cyi++) for (let cxi = 0; cxi < 5; cxi++) {
    if (SKIPCELL[cxi + ',' + cyi]) continue;
    const x0 = CX[cxi][0], x1 = CX[cxi][1], y0 = CY[cyi][0], y1 = CY[cyi][1], w = x1 - x0, h = y1 - y0;
    const nx = 1 + (R() * 2 | 0), ny = 1 + (R() * 2 | 0);
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      const bw = w / nx, bh = h / ny;
      if (R() < .14) continue;
      building(x0 + i * bw + 5, y0 + j * bh + 5, bw - 10, bh - 10);
    }
    if (R() < .7) treeW(x0 + 18 + R() * (w - 36), y1 - 16, 8 + R() * 7);
  }
  // street trees
  for (let i = 0; i < 26; i++) {
    const onH = R() < .5; const y = HY[R() * 3 | 0] + (R() < .5 ? -64 : 64), x = 80 + R() * (WW - 160);
    if (VX.some(v => Math.abs(v - x) < 60)) continue; treeW(x, y, 7 + R() * 6);
  }
  // parked cars
  for (let i = 0; i < 16; i++) {
    const y = HY[R() * 3 | 0] + (R() < .5 ? -62 : 62), x = 100 + R() * (WW - 200);
    if (VX.some(v => Math.abs(v - x) < 80)) continue;
    carStaticW(x, y, 0, ['#3a3f52', '#5a3a2e', '#2f4a3f', '#4a4436'][R() * 4 | 0]);
  }
  buildLandmarks();
}

function buildLandmarks() {
  const A = ARENAS;
  /* ۱ — مجلسِ شورایی (pillars + medallion painted in buildLandmarks above) */
  plateInset('loc1', ...A.majles.inset);
  drawWalls(60, 60, 320, 230, 10, 'S', 210, 270); wallsWithGap(60, 60, 320, 230, 10, 'S', 210, 270, 'wall');
  rect(140, 166, 160, 20, 'furn'); // long table
  // carpet medallion + four gold pillars (hiding cover — mission 1)
  wc.strokeStyle = PAL.gold; wc.lineWidth = 2;
  wc.beginPath(); wc.arc(220, 175, 30, 0, TAU); wc.stroke();
  for (const [px, py] of [[124, 124], [316, 124], [124, 226], [316, 226]]) {
    wc.fillStyle = 'rgba(10,12,25,.4)'; wc.beginPath(); wc.arc(px + 3, py + 3, 9, 0, TAU); wc.fill();
    wc.fillStyle = '#c9a06a'; wc.beginPath(); wc.arc(px, py, 9, 0, TAU); wc.fill();
    wc.strokeStyle = PAL.goldDim; wc.lineWidth = 2; wc.beginPath(); wc.arc(px, py, 9, 0, TAU); wc.stroke();
    cloudBand(wc, px + 4, py - 5, 2, 'rgba(217,178,60,.8)'); // hidden signature
    circ(px, py, 10, 'furn');
  }
  // signature: tazhib corner of the courtyard (project law — animatic signature kept)
  wc.strokeStyle = PAL.goldHi; wc.lineWidth = 1.4;
  const sx = 232, sy = 170;
  wc.beginPath(); wc.moveTo(sx, sy); wc.lineTo(sx + 16, sy); wc.lineTo(sx + 16, sy + 5);
  wc.lineTo(sx + 5, sy + 5); wc.lineTo(sx + 5, sy + 16); wc.lineTo(sx, sy + 16); wc.closePath(); wc.stroke();
  wc.beginPath(); wc.arc(sx + 8, sy + 8, 3.4, 0, 7); wc.stroke();

  /* ۲ — اتاقِ زادگاهِ شمع */
  plateInset('loc2', ...A.candle.inset);
  drawWalls(560, 450, 180, 150, 8, 'N', 628, 672); wallsWithGap(560, 450, 180, 150, 8, 'N', 628, 672, 'wall');

  /* ۳ — اتاقِ چهل‌درجه */
  plateInset('loc3', ...A.raaviRoom.inset);
  drawWalls(460, 90, 400, 200, 10, 'S', 640, 690); wallsWithGap(460, 90, 400, 200, 10, 'S', 640, 690, 'wall');
  rect(480, 110, 110, 70, 'furn');   // bed
  rect(640, 120, 180, 60, 'furn');   // desk
  rect(700, 102, 90, 46, 'furn');    // TV
  circ(610, 235, 26, 'furn');        // fan

  /* ۴ — پشت‌بام */
  plateInset('loc4', ...A.roof.inset);
  drawWalls(960, 90, 380, 200, 8, 'E', 160, 200); wallsWithGap(960, 90, 380, 200, 8, 'E', 160, 200, 'wall');
  circ(1050, 140, 26, 'furn');       // water tank
  circ(1100, 240, 14, 'furn'); circ(1210, 230, 14, 'furn'); // dishes
  // antenna
  wc.strokeStyle = '#14161f'; wc.lineWidth = 3;
  wc.beginPath(); wc.moveTo(1250, 120); wc.lineTo(1250, 170); wc.moveTo(1230, 130); wc.lineTo(1270, 130); wc.stroke();
  rect(1244, 114, 12, 62, 'furn');

  /* ۵ — چلیپا (چهارراه) */
  plateInset('loc5', ...A.chalipa.inset);
  // crash cars + transformer prop placed as painted cut-outs
  carStaticW(1360, 296, .5, '#3a3f52'); carStaticW(1414, 362, 2.1, '#5a3a2e');
  carStaticW(1344, 368, -.4, '#2f4a3f'); carStaticW(1424, 292, 1.2, '#4a4436');
  // billboard 4:3 structure (scene-5 cutscene anchor)
  wc.fillStyle = '#46503f'; wc.fillRect(1520, 190, 120, 64);
  wc.strokeStyle = PAL.gold; wc.lineWidth = 4; wc.strokeRect(1524, 194, 112, 56);
  rect(1520, 190, 120, 64, 'furn');
  // turbine platform (scene 5)
  wc.fillStyle = '#23252f'; wc.beginPath(); wc.arc(1720, 200, 44, 0, 7); wc.fill();
  wc.strokeStyle = PAL.goldDim; wc.lineWidth = 3; wc.beginPath(); wc.arc(1720, 200, 44, 0, 7); wc.stroke();
  circ(1720, 200, 40, 'furn');

  /* ۶ — پل و ساعتِ دیوانه */
  plateInset('loc6', ...A.clock.inset);
  wc.fillStyle = '#2e2a24'; wc.beginPath(); wc.arc(900, 1000, 92, 0, 7); wc.fill();
  wc.strokeStyle = PAL.gold; wc.lineWidth = 5; wc.beginPath(); wc.arc(900, 1000, 92, 0, 7); wc.stroke();
  wc.strokeStyle = PAL.goldDim; wc.lineWidth = 2; wc.beginPath(); wc.arc(900, 1000, 78, 0, 7); wc.stroke();
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU;
    wc.fillStyle = PAL.dash; wc.beginPath(); wc.arc(900 + Math.cos(a) * 84, 1000 + Math.sin(a) * 84, 4, 0, 7); wc.fill();
  }
  wc.fillStyle = PAL.gold; wc.beginPath(); wc.arc(900, 1000, 8, 0, 7); wc.fill();
  circ(900, 1000, 12, 'furn'); // clock pedestal

  /* ۷ — بلوارِ رژه */
  plateInset('loc7', ...A.parade.inset);

  /* ۸ — میدانِ نبرد */
  plateInset('loc8', ...A.war.inset);
  wc.strokeStyle = 'rgba(201,160,106,.15)'; wc.lineWidth = 2;
  for (let i = 1; i < 8; i++) { wc.beginPath(); wc.moveTo(1420 + i * 50, 370); wc.lineTo(1420 + i * 50, 660); wc.stroke(); }
  for (let i = 1; i < 6; i++) { wc.beginPath(); wc.moveTo(1420, 370 + i * 48); wc.lineTo(1820, 370 + i * 48); wc.stroke(); }
  circ(1630, 430, 26, 'furn'); // pool

  /* ۹ — نیروگاهِ سه‌فاز */
  plateInset('loc9', ...A.plant.inset);
  drawWalls(1908, 68, 424, 954, 12, 'W', 720, 800, 'wall');
  wallsWithGap(1908, 68, 424, 954, 12, 'W', 720, 800, 'wall');
  for (let i = 0; i < 3; i++) { // chimneys
    wc.fillStyle = 'rgba(10,12,25,.5)'; wc.beginPath(); wc.arc(2010 + i * 90, 150, 30, 0, 7); wc.fill();
    wc.fillStyle = '#4a4436'; wc.beginPath(); wc.arc(2000 + i * 90, 140, 30, 0, 7); wc.fill();
    wc.fillStyle = '#1d1b18'; wc.beginPath(); wc.arc(2000 + i * 90, 140, 16, 0, 7); wc.fill();
    circ(2000 + i * 90, 140, 30, 'furn');
  }
  wc.fillStyle = '#3f4a5a'; wc.fillRect(1960, 230, 300, 130); // turbine hall
  wc.fillStyle = 'rgba(240,200,140,.12)'; wc.fillRect(1960, 230, 300, 6);
  rect(1960, 230, 300, 130, 'furn');
  wc.fillStyle = '#55524a'; for (let i = 0; i < 5; i++) { wc.fillRect(1980 + i * 60, 390, 40, 40); rect(1980 + i * 60, 390, 40, 40, 'furn'); }
  wc.fillStyle = '#1d1b18'; wc.beginPath(); wc.arc(2100, 560, 44, 0, 7); wc.fill(); // eternal fire pit
  wc.strokeStyle = PAL.goldDim; wc.lineWidth = 3; wc.beginPath(); wc.arc(2100, 560, 44, 0, 7); wc.stroke();
  circ(2100, 560, 44, 'furn');
  wc.fillStyle = '#3a332a'; wc.fillRect(1876, 730, 28, 60); // gate
  wc.fillStyle = PAL.gold; wc.font = '11px monospace'; wc.textAlign = 'left';
  wc.fillText('K1RT!0NARi', 1908, 752); // signature door plate
  for (let i = 0; i < 3; i++) { wc.fillStyle = PAL.gold; wc.fillRect(1880 + i * 9, 790, 6, 22); } // ∷∷∷ patches

  /* painted cut-out props (statics) */
  placeProps();
}

const PROPS = [
  // chalipa hazards
  { k: 'transformer', x: 1316, y: 408, w: 54, h: 40, r: [26, 20] },
  { k: 'wreck', x: 1444, y: 396, w: 34, h: 54, r: [17, 27] },
  { k: 'wreck', x: 1312, y: 270, w: 34, h: 54, r: [17, 27] },
  // lamps along parade + bridge approach
  { k: 'lamp', x: 1804, y: 1000, w: 40, h: 43, r: [8, 8], c: true },
  { k: 'lamp', x: 1916, y: 1120, w: 40, h: 43, r: [8, 8], c: true },
  { k: 'lamp', x: 812, y: 1108, w: 40, h: 43, r: [8, 8], c: true },
  { k: 'lamp', x: 990, y: 1108, w: 40, h: 43, r: [8, 8], c: true },
  { k: 'lamp', x: 1482, y: 268, w: 40, h: 43, r: [8, 8], c: true },
  // trees on parade median & plant yard
  { k: 'tree', x: 1776, y: 1060, w: 46, h: 46, r: [14, 14], c: true },
  { k: 'tree', x: 1948, y: 1220, w: 46, h: 46, r: [14, 14], c: true },
  { k: 'tree', x: 2270, y: 660, w: 46, h: 46, r: [14, 14], c: true },
  { k: 'tree', x: 1244, y: 1104, w: 46, h: 46, r: [14, 14], c: true },
  // barriers: parade start, bridge mouth, chalipa
  { k: 'barrier', x: 1860, y: 1290, w: 52, h: 18, r: [26, 9] },
  { k: 'barrier', x: 830, y: 1112, w: 18, h: 52, r: [9, 26] },
  { k: 'barrier', x: 964, y: 1112, w: 18, h: 52, r: [9, 26] },
  { k: 'barrier', x: 1358, y: 244, w: 18, h: 52, r: [9, 26] },
  { k: 'barrier', x: 1406, y: 416, w: 18, h: 52, r: [9, 26] },
  // dumpster at ringmaster's dump (south bank, bridge 1)
  { k: 'dumpster', x: 1002, y: 1324, w: 48, h: 36, r: [24, 18] },
  { k: 'dumpster', x: 1730, y: 1310, w: 48, h: 36, r: [24, 18] },
  // water tanks (plant side yard)
  { k: 'tank', x: 2272, y: 240, w: 52, h: 52, r: [24, 24], c: true },
  { k: 'tank', x: 2272, y: 310, w: 52, h: 52, r: [24, 24], c: true },
  // bread oven by the parade crowd
  { k: 'oven', x: 1788, y: 1150, w: 44, h: 44, r: [20, 20], c: true },
];
function placeProps() {
  for (const p of PROPS) {
    const im = img('props:' + p.k);
    if (im) wc.drawImage(im, p.x - p.w / 2, p.y - p.h / 2, p.w, p.h);
    if (p.c) circ(p.x, p.y, p.r[0], 'prop');
    else rect(p.x - p.r[0], p.y - p.r[1], p.r[0] * 2, p.r[1] * 2, 'prop');
  }
}
