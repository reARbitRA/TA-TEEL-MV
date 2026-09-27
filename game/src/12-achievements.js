/* ---------- 12 · achievements: 29 word-icons of the song (achievements-list.md)
   Every symbolic word of the lyric = one lapis-hell icon slot. Before its word
   arrives the slot holds the icon's SHADOW (dark, dashed gold ring). When the
   word is sung (locked timeline ev: up/pulse/saddam) the icon lights: gold
   flash, spark burst, «تینگ». It stays lit until the end of the run.
   Saddam (بعث) is three-state: shadow-frown → blind smile → wider smile.
   Painters ported verbatim from the approved demo (archive/achievements-demo2.html).
   Unlock times come ONLY from the locked timeline (v8) — no new numbers. */

const ACH = {
  saddam: 0,          // 0 frown · 1 smile · 2 wider smile
  lit: {},            // id -> true once unlocked
  pop: {},            // id -> pop timer (s)
  ripple: {},         // id -> ripple timer (s)
  count: 0,
  toast: null,        // {text, t}
  sparks: [],         // screen-space burst particles
  _cache: {},         // id -> [canvas(state0..2 for baath)]
  _booted: false,
};

const ACH_ORDER = ['chador','fuse','turbine','gemini','grok','gpt','sepah','bitcoin','maman','iraq','baath','haraj','darkweb','russia','toosi','taalim','putin','rahbar','pump','nimrod','khook','mack','elevator','hospital','tether','flush','bundle','velayat','eskandar'];
const ACH_NAMES = { chador:'چادرِ سیاه', fuse:'فیوز', turbine:'توربینِ آخوند', gemini:'جمینای', grok:'گراک', gpt:'جی‌پی‌تی', sepah:'سِپاه', bitcoin:'بیتکوین', maman:'ماماناشون', iraq:'عراق', baath:'بعث · صدام', haraj:'حراج', darkweb:'دارکوب', russia:'روسیه', toosi:'طوسی', taalim:'تعلیماتِ دینی', putin:'پوتین', rahbar:'رهبر', pump:'پمپِ آب', nimrod:'نمرود', khook:'خوک‌دونی', mack:'کامیونِ ماک', elevator:'آسانسور', hospital:'بیمارستان · دعا', tether:'تتر', flush:'رویال فلش', bundle:'باندِل', velayat:'ولایتِ فقیه', eskandar:'اسکندر کوتی' };

/* --- painters (44×44 logical; ported byte-exact from the approved demo) --- */
function achEll(c, x, y, rx, ry, f) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.fillStyle = f; c.fill(); }
function achRRect(c, x, y, w, h, r, f) { c.beginPath(); c.roundRect(x, y, w, h, r); c.fillStyle = f; c.fill(); }
function achStar4(c, x, y, r, f) { c.fillStyle = f; c.beginPath(); for (let i = 0; i < 8; i++) { const R = i % 2 ? r * .35 : r, a = i * Math.PI / 4; c.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); } c.closePath(); c.fill(); }
const ACH_P = {
  chador(c){c.fillStyle='#141216';c.beginPath();c.moveTo(22,6);c.quadraticCurveTo(6,14,7,38);c.lineTo(37,38);c.quadraticCurveTo(38,14,22,6);c.fill();achEll(c,22,14,7,5,'#1d1a1f')},
  fuse(c){achRRect(c,14,10,16,24,4,'#7a6b45');achRRect(c,12,8,20,5,2,'#8a6d1d');achRRect(c,12,31,20,5,2,'#8a6d1d');c.strokeStyle='#e2622b';c.lineWidth=2;c.beginPath();c.moveTo(17,16);c.lineTo(24,24);c.lineTo(20,30);c.stroke()},
  turbine(c){for(let i=0;i<6;i++){c.save();c.translate(22,22);c.rotate(i*Math.PI/3);achRRect(c,8,-4,13,8,2,'#5a5f6b');c.restore()}achEll(c,22,22,9,9,'#e8dcc8');achEll(c,22,22,6.5,6.5,'#f5ecd7');c.fillStyle='#3d2f22';c.beginPath();c.ellipse(22,25,6,3,0,0,Math.PI);c.fill()},
  gemini(c){achStar4(c,15,16,10,'#d9b23c');achStar4(c,29,28,7,'#f0d070');c.strokeStyle='#8a6d1d';c.lineWidth=1.5;c.beginPath();c.moveTo(18,19);c.lineTo(26,25);c.stroke()},
  grok(c){achEll(c,22,22,15,13,'#20242a');c.fillStyle='#e2622b';c.fillRect(12,19,20,5);achEll(c,22,32,5,3,'#20242a')},
  gpt(c){achRRect(c,15,6,14,8,2,'#8a6d1d');achRRect(c,13,14,18,20,4,'#e8c65a');achEll(c,22,24,7,7,'#f5ecd7');c.strokeStyle='#8a6d1d';c.lineWidth=1.5;c.beginPath();c.moveTo(22,14);c.lineTo(22,17);c.moveTo(16,26);c.lineTo(11,31);c.moveTo(28,26);c.lineTo(33,31);c.stroke()},
  sepah(c){achRRect(c,8,10,28,22,3,'#3a3f4a');c.fillStyle='#000';c.fillRect(10,12,24,18);c.fillStyle='#141216';c.beginPath();c.moveTo(22,15);c.lineTo(27,25);c.lineTo(22,23);c.lineTo(17,25);c.closePath();c.fill();c.fillStyle='#e2622b';c.fillRect(12,32,20,2)},
  bitcoin(c){achEll(c,22,22,16,16,'#d9b23c');achEll(c,22,22,13,13,'#c9a232');c.strokeStyle='#8a6d1d';c.lineWidth=2.5;c.beginPath();c.moveTo(14,14);c.quadraticCurveTo(10,8,16,7);c.moveTo(30,14);c.quadraticCurveTo(34,8,28,7);c.stroke();c.fillStyle='#f5ecd7';c.font='900 16px Tahoma';c.textAlign='center';c.fillText('₿',22,28);c.textAlign='start'},
  maman(c){c.fillStyle='#e2622b';c.beginPath();c.moveTo(22,34);c.bezierCurveTo(4,22,10,7,22,13);c.bezierCurveTo(34,7,40,22,22,34);c.fill();achRRect(c,15,22,14,12,3,'#d9b23c')},
  iraq(c){c.strokeStyle='#d9b23c';c.lineWidth=2;c.beginPath();c.moveTo(6,32);c.quadraticCurveTo(22,26,38,32);c.moveTo(6,37);c.quadraticCurveTo(22,31,38,37);c.stroke();achRRect(c,20,14,4,16,2,'#8a744e');for(let i=0;i<5;i++){const a=-Math.PI/2+(i-2)*.5;c.beginPath();c.moveTo(22,15);c.lineTo(22+Math.cos(a)*9,15+Math.sin(a)*9);c.strokeStyle='#4a5d3a';c.lineWidth=2.5;c.stroke()}},
  baath(c,s){ // صدام: s=0 سایه‌اخمو، 1 لبخند، 2 لبخندِ بازتر
    const smile=s===0?-1:s===1?1:2;
    achEll(c,22,22,15,16,'#c99b6f');
    c.fillStyle='#3d5a2e';c.beginPath();c.moveTo(8,12);c.quadraticCurveTo(22,-2,36,12);c.lineTo(36,16);c.quadraticCurveTo(22,6,8,16);c.closePath();c.fill();
    achEll(c,14,19,2.4,s?1.6:1.8,'#141216');achEll(c,30,19,2.4,s?1.6:1.8,'#141216');
    achEll(c,22,25,7,3.5,'#3d2f22');
    c.strokeStyle='#5a1010';c.lineWidth=2;c.beginPath();
    if(s===0)c.arc(22,33,5,Math.PI*1.15,Math.PI*1.85);
    else{c.arc(22,27+(s===2?-1:0),s===2?8:6,Math.PI*.15,Math.PI*.85);c.stroke();c.fillStyle='#fff';const w=s===2?12:8;achRRect(c,22-w/2,29+(s===2?1:0),w,s===2?4:3,1,'#fff');
     return}
    c.stroke()},
  haraj(c){c.save();c.translate(22,20);c.rotate(-.6);achRRect(c,-3,-14,6,20,2,'#8a744e');achRRect(c,-9,4,18,5,2,'#d9b23c');c.restore();achEll(c,14,34,5,3,'#d9b23c');achEll(c,24,36,5,3,'#d9b23c');achEll(c,31,32,4,2.5,'#d9b23c')},
  darkweb(c){c.strokeStyle='#5a5f6b';c.lineWidth=1.4;for(let r=6;r<=18;r+=6){c.beginPath();c.arc(22,22,r,0,7);c.stroke()}for(let i=0;i<8;i++){const a=i*Math.PI/4;c.beginPath();c.moveTo(22,22);c.lineTo(22+Math.cos(a)*18,22+Math.sin(a)*18);c.stroke()}achEll(c,28,15,4.5,3.5,'#141216');achEll(c,26.8,14.4,1,1,'#e2622b');achEll(c,29.2,14.4,1,1,'#e2622b')},
  russia(c){achEll(c,22,26,12,10,'#6b5a3d');achEll(c,13,18,4,4,'#6b5a3d');achEll(c,31,18,4,4,'#6b5a3d');achEll(c,22,30,5,3.5,'#3d2f22');c.fillStyle='#d9b23c';c.beginPath();c.moveTo(15,12);c.quadraticCurveTo(22,4,29,12);c.quadraticCurveTo(26,10,24,13);c.quadraticCurveTo(22,11,20,13);c.quadraticCurveTo(18,10,15,12);c.fill()},
  toosi(c){achRRect(c,18,12,8,16,4,'#2c313a');achEll(c,22,10,6,4,'#141216');c.strokeStyle='#d9b23c';c.lineWidth=2;c.beginPath();c.arc(22,20,13,Math.PI*1.1,Math.PI*1.9);c.stroke();c.strokeStyle='#5a5f6b';c.beginPath();c.moveTo(22,28);c.lineTo(22,36);c.stroke()},
  taalim(c){c.fillStyle='#8a744e';c.beginPath();c.moveTo(22,16);c.lineTo(38,22);c.lineTo(22,28);c.lineTo(6,22);c.closePath();c.fill();c.strokeStyle='#e2622b';c.lineWidth=2.4;c.beginPath();c.moveTo(24,13);c.quadraticCurveTo(34,10,31,20);c.stroke();achStar4(c,31,19,3,'#f0d070')},
  putin(c){achEll(c,22,23,12,14,'#c99b6f');c.fillStyle='#141216';c.beginPath();c.ellipse(22,9,10,6,0,0,7);c.fill();achEll(c,17,20,1.8,1.5,'#141216');achEll(c,27,20,1.8,1.5,'#141216');c.strokeStyle='#141216';c.lineWidth=1.6;c.beginPath();c.moveTo(13,16);c.lineTo(20,17);c.moveTo(24,17);c.lineTo(31,16);c.stroke();c.strokeStyle='#8a5a4a';c.lineWidth=2;c.beginPath();c.moveTo(18,30);c.lineTo(26,30);c.stroke()},
  rahbar(c){achRRect(c,10,10,24,26,3,'#8a6d1d');achRRect(c,13,13,18,20,2,'#141216');c.strokeStyle='#d9b23c';c.lineWidth=2;c.beginPath();c.moveTo(22,4);c.lineTo(26,10);c.lineTo(18,10);c.closePath();c.fillStyle='#d9b23c';c.fill();achRRect(c,19,20,6,13,2,'#d9b23c')},
  pump(c){achRRect(c,12,16,20,16,4,'#5a5f6b');achRRect(c,20,8,4,10,1,'#8a744e');c.beginPath();c.moveTo(32,20);c.lineTo(38,16);c.strokeStyle='#8a744e';c.lineWidth=3;c.stroke();achEll(c,14,36,2,3,'#3a5a6b');achEll(c,20,38,2,3,'#3a5a6b')},
  nimrod(c){c.fillStyle='#e2622b';c.beginPath();c.moveTo(22,36);c.bezierCurveTo(2,22,12,6,22,14);c.bezierCurveTo(32,6,42,22,22,36);c.fill();achEll(c,22,22,5,5,'#0d1526');c.fillStyle='#d9b23c';c.beginPath();c.moveTo(22,2);c.quadraticCurveTo(26,6,22,9);c.quadraticCurveTo(18,6,22,2);c.fill()},
  khook(c){achEll(c,22,22,13,11,'#d9a0a0');achEll(c,22,25,7,5,'#b87a7a');achEll(c,19.5,25,1.5,2,'#141216');achEll(c,24.5,25,1.5,2,'#141216');achEll(c,12,13,3,4,'#d9a0a0');achEll(c,32,13,3,4,'#d9a0a0');achEll(c,22,34,6,2.5,'#d9b23c')},
  mack(c){achEll(c,22,22,15,13,'#5a5f6b');achEll(c,22,24,10,8,'#c9c4b8');achEll(c,22,21,5,3.5,'#141216');achEll(c,17,17,2,2,'#141216');achEll(c,27,17,2,2,'#141216');c.strokeStyle='#8a6d1d';c.lineWidth=2;c.beginPath();c.arc(22,22,13,Math.PI*.2,Math.PI*.8);c.stroke()},
  elevator(c){achRRect(c,12,6,20,32,2,'#2c313a');c.strokeStyle='#8a6d1d';c.lineWidth=2;c.beginPath();c.moveTo(22,6);c.lineTo(22,38);c.stroke();c.fillStyle='#0d1526';c.fillRect(13,7,8,30);achEll(c,17,22,2.5,3,'#e2622b');achEll(c,17,22,1,1.2,'#fff')},
  hospital(c){c.fillStyle='#d9b23c';c.fillRect(17,10,10,24);c.fillRect(10,17,24,10);c.strokeStyle='#4a5d3a';c.lineWidth=1.6;c.beginPath();c.arc(22,22,17,0,7);c.stroke();for(let i=0;i<10;i++){const a=i*.63;achEll(c,22+Math.cos(a)*17,22+Math.sin(a)*17,1.6,1.6,'#4a5d3a')}},
  tether(c){achEll(c,22,22,15,15,'#d9b23c');achEll(c,22,22,12,12,'#1d5c4a');c.strokeStyle='#3affc8';c.lineWidth=3;c.beginPath();c.moveTo(22,12);c.lineTo(22,28);c.moveTo(15,22);c.lineTo(22,32);c.lineTo(29,22);c.moveTo(15,17);c.lineTo(29,17);c.stroke()},
  flush(c){for(let i=0;i<5;i++){c.save();c.translate(22,30);c.rotate(-.9+i*.22);achRRect(c,-4,-24,8,16,1,'#e8dcc8');c.fillStyle='#e2622b';c.fillRect(-4,-24,8,5);c.restore()}c.fillStyle='#d9b23c';c.beginPath();c.moveTo(14,7);c.lineTo(17,2);c.lineTo(20,7);c.lineTo(24,2);c.lineTo(27,7);c.lineTo(30,3);c.lineTo(29,10);c.lineTo(15,10);c.closePath();c.fill()},
  bundle(c){achRRect(c,9,18,26,17,2,'#d9b23c');c.fillStyle='#e2622b';c.fillRect(20,18,4,17);c.fillRect(9,24,26,4);achStar4(c,22,10,6,'#f5e6a8');c.strokeStyle='#f5e6a8';c.lineWidth=1.5;for(let i=0;i<4;i++){const a=-.9+i*.6;c.beginPath();c.moveTo(22,14);c.lineTo(22+Math.cos(a)*20,14+Math.sin(a)*20);c.globalAlpha=.5;c.stroke();c.globalAlpha=1}},
  velayat(c){c.strokeStyle='#d9b23c';c.lineWidth=2.4;c.beginPath();c.moveTo(22,6);c.lineTo(22,24);c.moveTo(10,12);c.lineTo(34,12);c.stroke();c.beginPath();c.moveTo(10,12);c.lineTo(6,22);c.lineTo(14,22);c.closePath();c.strokeStyle='#8a6d1d';c.stroke();c.beginPath();c.moveTo(34,12);c.lineTo(30,22);c.lineTo(38,22);c.closePath();c.stroke();achEll(c,10,27,6,3,'#141216');achStar4(c,34,28,4,'#d9b23c');achStar4(c,37,26,3,'#d9b23c');achStar4(c,31,26,3,'#d9b23c')},
  eskandar(c){achEll(c,22,22,14,13,'#c99b6f');c.strokeStyle='#e2622b';c.lineWidth=2;for(let i=0;i<3;i++){c.beginPath();c.arc(22,20,4+i*3,Math.PI*.1,Math.PI*.9);c.stroke()}c.fillStyle='#141216';c.beginPath();c.moveTo(12,13);c.quadraticCurveTo(16,6,20,12);c.fill();c.beginPath();c.moveTo(24,12);c.quadraticCurveTo(28,6,32,13);c.fill();c.fillStyle='#e2622b';c.beginPath();c.moveTo(19,27);c.quadraticCurveTo(22,33,26,26);c.fill()},
};

/* pre-render every icon at 2× (baath: 3 states) */
function achBoot() {
  if (ACH._booted) return;
  ACH._booted = true;
  for (const id of ACH_ORDER) {
    const states = id === 'baath' ? [0, 1, 2] : [0];
    ACH._cache[id] = states.map(s => {
      const cvv = document.createElement('canvas');
      cvv.width = 88; cvv.height = 88;
      const cc = cvv.getContext('2d');
      cc.scale(2, 2);
      if (id === 'baath') ACH_P.baath(cc, s); else ACH_P[id](cc);
      return cvv;
    });
  }
}

/* --- layout: two rows top-center (15 + 14), counter in the last cell --- */
const ACH_CELL = 38, ACH_DISC = 34;
const ACH_X0 = (CFG.W - 15 * ACH_CELL) / 2; // centered block of 15 cells
const ACH_ROWS = [{ y: 150, n: 15 }, { y: 190, n: 15 }]; // row2: 14 icons + counter
function achSlotPos(i) {
  const row = i < 15 ? 0 : 1, col = i < 15 ? i : i - 15;
  // RTL fill: first icon at the right end of its row
  return { x: ACH_X0 + 15 * ACH_CELL - ACH_CELL / 2 - col * ACH_CELL, y: ACH_ROWS[row].y + ACH_CELL / 2 };
}
function achCounterPos() { return { x: ACH_X0 + ACH_CELL / 2, y: ACH_ROWS[1].y + ACH_CELL / 2 }; }

/* --- events: called once per crossed timeline step (locked ev column) --- */
function achStepEvent(S, EV) {
  if (!EV) return;
  if (EV.up) for (const id of EV.up) achUnlock(id);
  if (EV.pulse) for (const id of EV.pulse) achPulse(id);
  if (EV.saddam && EV.saddam > ACH.saddam) {
    ACH.saddam = EV.saddam;
    FLASH.white = Math.max(FLASH.white, .85); // the «برق می‌آید و می‌رود» flash
    achToast(ACH.saddam === 1 ? '😱 اخمویِ صدام باز شد به لبخند!' : '😁 لبخندِ صدام بازتر شد!');
    achPulse('baath'); SFX.ting(true);
  }
}
function achUnlock(id) {
  if (!ACH_ORDER.includes(id)) return;
  if (ACH.lit[id]) { achPulse(id); return; } // repeated word = fresh spark only
  ACH.lit[id] = true; ACH.count++;
  ACH.pop[id] = .55; ACH.ripple[id] = .7;
  achBurst(id, true); SFX.ting(ACH.count % 7 === 1);
  achToast('🏆 ' + ACH_NAMES[id] + ' — باز شد!');
}
function achPulse(id) {
  if (!ACH_ORDER.includes(id)) return;
  ACH.pop[id] = .55;
  achBurst(id, false);
}
function achToast(text) { ACH.toast = { text, t: 2.4 }; }
function achBurst(id, big) {
  const p = achSlotPos(ACH_ORDER.indexOf(id));
  for (let i = 0; i < (big ? 20 : 12); i++) {
    const a = Math.random() * 7, v = 1.6 + Math.random() * 3;
    ACH.sparks.push({ x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.3, life: 1 });
  }
}

/* --- simulation (dt from the game loop; sparks/toast decay) --- */
function achTick(dt) {
  if (ACH.toast) { ACH.toast.t -= dt; if (ACH.toast.t <= 0) ACH.toast = null; }
  for (const k in ACH.pop) { ACH.pop[k] -= dt; if (ACH.pop[k] <= 0) delete ACH.pop[k]; }
  for (const k in ACH.ripple) { ACH.ripple[k] -= dt; if (ACH.ripple[k] <= 0) delete ACH.ripple[k]; }
  if (ACH.sparks.length) {
    ACH.sparks = ACH.sparks.filter(s => {
      const k = dt * 20; // demo steps sparks every 50ms; per-frame units
      s.x += s.vx * k; s.y += s.vy * k; s.vy += .13 * k; s.life -= .022 * k;
      return s.life > 0;
    });
  }
}
function achReset() {
  ACH.lit = {}; ACH.count = 0; ACH.saddam = 0;
  ACH.pop = {}; ACH.ripple = {}; ACH.toast = null; ACH.sparks = [];
}

/* --- draw: shadow slots → lit icons → pops/ripples/sparks → counter → toast --- */
function achIconCanvas(id) {
  const st = ACH._cache[id];
  if (!st) return null;
  return id === 'baath' ? st[Math.min(ACH.saddam, 2)] : st[0];
}
function drawAchievements(c2, t, mode) {
  // mode: undefined = live HUD · 'ended' = payoff tableau (all-lit, small) · 'title' = shadow preview
  achBoot();
  const ended = mode === 'ended', title = mode === 'title';
  const cell = (ended || title) ? 30 : ACH_CELL, disc = (ended || title) ? 26 : ACH_DISC;
  const x0 = (CFG.W - 15 * cell) / 2;
  const ry1 = title ? 88 : ended ? 470 : ACH_ROWS[0].y;
  const ry2 = title ? 122 : ended ? 500 : ACH_ROWS[1].y;
  for (let i = 0; i < ACH_ORDER.length; i++) {
    const row = i < 15 ? 0 : 1, col = i < 15 ? i : i - 15;
    const cx = x0 + 15 * cell - cell / 2 - col * cell, cy = (row ? ry2 : ry1) + cell / 2;
    const id = ACH_ORDER[i];
    const lit = ended || ACH.lit[id];
    const pop = ACH.pop[id] || 0;
    // demo curve: 0%→scale .4, 45%→1.5, 100%→1 over .55s
    const popS = pop > .3
      ? .4 + 1.1 * ((0.55 - pop) / .25)
      : 1 + .5 * (pop / .3);
    c2.save();
    c2.translate(cx, cy);
    c2.scale(popS, popS);
    if (id === 'baath' && ACH.saddam === 2 && !ended) c2.scale(1.15, 1.15);
    // disc
    c2.beginPath(); c2.arc(0, 0, disc / 2 + 1.5, 0, TAU);
    c2.fillStyle = lit ? '#101a30' : 'rgba(16,22,40,.55)';
    c2.fill();
    if (!lit) { c2.setLineDash([3, 3]); c2.strokeStyle = '#4a3f1c'; c2.lineWidth = 1.4; c2.stroke(); c2.setLineDash([]); }
    // icon
    const ic = achIconCanvas(id);
    if (ic) {
      c2.save();
      if (!lit) c2.globalAlpha = .22;
      c2.drawImage(ic, -disc / 2 + 1, -disc / 2 + 1, disc - 2, disc - 2);
      c2.restore();
    }
    if (lit && !title) {
      const pl = .75 + .25 * Math.sin(t * 3 + i);
      c2.beginPath(); c2.arc(0, 0, disc / 2 + 2.5, 0, TAU);
      c2.strokeStyle = 'rgba(217,178,60,' + (.55 + .3 * pl).toFixed(3) + ')'; c2.lineWidth = 1.8; c2.stroke();
    }
    c2.restore();
    // ripple
    const rp = ACH.ripple[id] || 0;
    if (rp > 0) {
      const k = 1 - rp / .7;
      c2.beginPath(); c2.arc(cx, cy, disc / 2 + 3 + k * 26, 0, TAU);
      c2.strokeStyle = 'rgba(217,178,60,' + (.8 * (1 - k)).toFixed(3) + ')'; c2.lineWidth = 2; c2.stroke();
    }
  }
  // counter cell (row 2, right→left means the counter sits at the LEFT end)
  const cp = { x: x0 + cell / 2, y: ry2 + cell / 2 };
  c2.save();
  c2.translate(cp.x, cp.y);
  c2.fillStyle = 'rgba(9,13,26,.85)';
  c2.beginPath(); c2.roundRect(-cell / 2, -cell / 2, cell, cell, 6); c2.fill();
  c2.strokeStyle = PAL.goldDim; c2.lineWidth = 1.2; c2.stroke();
  cloudBand(c2, -cell / 2 + 5, -cell / 2 + 5, 2, 'rgba(217,178,60,.7)'); // signature
  c2.textAlign = 'center';
  c2.fillStyle = ended || ACH.count >= 29 ? PAL.goldHi : PAL.ink;
  c2.font = '15px ' + CFG.FONT;
  c2.fillText(fa(ended ? 29 : ACH.count), 0, -1);
  c2.fillStyle = '#8b93a8'; c2.font = '10px ' + CFG.FONT;
  c2.fillText('از ' + fa(29), 0, 12);
  c2.restore();
  // toast plaque above the ticker
  if (ACH.toast && !ended && !title) {
    const a = Math.min(1, ACH.toast.t / .4);
    c2.save(); c2.globalAlpha = a;
    c2.font = '19px ' + CFG.FONT;
    const tw = c2.measureText(ACH.toast.text).width;
    const bw = tw + 44, bx = CFG.W / 2 - bw / 2, by = CFG.H - 128;
    c2.fillStyle = 'rgba(9,13,26,.9)';
    c2.beginPath(); c2.roundRect(bx, by, bw, 36, 9); c2.fill();
    c2.strokeStyle = PAL.gold; c2.lineWidth = 1.6; c2.stroke();
    c2.fillStyle = PAL.goldHi; c2.textAlign = 'center';
    c2.fillText(ACH.toast.text, CFG.W / 2, by + 25);
    c2.restore();
  }
  // sparks (screen-space)
  if (ACH.sparks.length) {
    c2.save();
    for (const s of ACH.sparks) {
      c2.globalAlpha = Math.max(0, s.life);
      c2.fillStyle = '#f5e6a8';
      c2.beginPath(); c2.arc(s.x, s.y, 1.8, 0, TAU); c2.fill();
    }
    c2.restore();
  }
}
