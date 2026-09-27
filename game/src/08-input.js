/* ---------- 08 · input: keyboard + virtual D-pad (mobile) ---------- */
const input = { up: 0, down: 0, left: 0, right: 0, run: 0, act: 0, strike: 0 };
const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run', KeyE: 'act', Space: 'strike',
};
window.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  if (e.code === 'KeyP' || e.code === 'Escape') { togglePause(); return; }
  const k = KEYMAP[e.code];
  if (k) { input[k] = 1; e.preventDefault(); }
  if (e.code === 'Enter' && GAME.state === 'title') startGame();
});
window.addEventListener('keyup', e => {
  const k = KEYMAP[e.code];
  if (k) input[k] = 0;
});
window.addEventListener('blur', () => { for (const k in input) input[k] = 0; if (GAME.state === 'play') setPause(true); });

/* --- touch: virtual D-pad (left) + buttons (right) --- */
const TOUCH = { on: false, pad: { cx: 118, cy: CFG.H - 118, r: 74 }, btns: [], active: {} };
function initTouch() {
  TOUCH.on = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (!TOUCH.on) return;
  TOUCH.btns = [
    { id: 'run', label: 'دویدن', cx: CFG.W - 84, cy: CFG.H - 172, r: 30 },
    { id: 'act', label: 'تعامل', cx: CFG.W - 152, cy: CFG.H - 110, r: 34 },
    { id: 'strike', label: '⚡', cx: CFG.W - 66, cy: CFG.H - 92, r: 38 },
  ];
  const hit = (x, y) => {
    const p = TOUCH.pad;
    const dx = x - p.cx, dy = y - p.cy, d = Math.hypot(dx, dy);
    if (d < p.r + 16) return { type: 'pad', dx, dy };
    for (const b of TOUCH.btns) {
      if (Math.hypot(x - b.cx, y - b.cy) < b.r + 10) return { type: b.id };
    }
    return null;
  };
  const down = e => {
    for (const t of e.changedTouches) {
      const { x, y } = clientToLogical(t.clientX, t.clientY);
      const h = hit(x, y);
      if (!h) continue;
      TOUCH.active[t.identifier] = h;
      if (h.type !== 'pad') input[h.type] = 1;
    }
    if (e.cancelable) e.preventDefault();
  };
  const move = e => {
    for (const t of e.changedTouches) {
      const h = TOUCH.active[t.identifier];
      if (!h || h.type !== 'pad') continue;
      const { x, y } = clientToLogical(t.clientX, t.clientY);
      h.dx = x - TOUCH.pad.cx; h.dy = y - TOUCH.pad.cy;
    }
    if (e.cancelable) e.preventDefault();
  };
  const up = e => {
    for (const t of e.changedTouches) {
      const h = TOUCH.active[t.identifier];
      if (!h) continue;
      if (h.type !== 'pad') input[h.type] = 0;
      else { input.up = input.down = input.left = input.right = 0; }
      delete TOUCH.active[t.identifier];
    }
    if (e.cancelable) e.preventDefault();
  };
  cv.addEventListener('touchstart', down, { passive: false });
  cv.addEventListener('touchmove', move, { passive: false });
  cv.addEventListener('touchend', up, { passive: false });
  cv.addEventListener('touchcancel', up, { passive: false });
}
function touchPoll() {
  if (!TOUCH.on) return;
  for (const id in TOUCH.active) {
    const h = TOUCH.active[id];
    if (h.type !== 'pad') continue;
    const d = Math.hypot(h.dx, h.dy), dead = 14;
    input.up = h.dy < -dead ? 1 : 0;
    input.down = h.dy > dead ? 1 : 0;
    input.left = h.dx < -dead ? 1 : 0;
    input.right = h.dx > dead ? 1 : 0;
    input.run = d > TOUCH.pad.r * .82 ? 1 : 0;
  }
}
function drawTouch(c2) {
  if (!TOUCH.on || GAME.state !== 'play') return;
  const p = TOUCH.pad;
  c2.save(); c2.globalAlpha = .3;
  c2.strokeStyle = PAL.gold; c2.lineWidth = 2;
  c2.beginPath(); c2.arc(p.cx, p.cy, p.r, 0, TAU); c2.stroke();
  c2.fillStyle = PAL.panel; c2.fill();
  c2.globalAlpha = .8; c2.fillStyle = PAL.goldHi;
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
    c2.beginPath();
    c2.moveTo(p.cx + dx * p.r * .62, p.cy + dy * p.r * .62);
    c2.lineTo(p.cx + dx * p.r * .42 - dy * 8, p.cy + dy * p.r * .42 + dx * 8);
    c2.lineTo(p.cx + dx * p.r * .42 + dy * 8, p.cy + dy * p.r * .42 - dx * 8);
    c2.closePath(); c2.fill();
  }
  for (const b of TOUCH.btns) {
    c2.globalAlpha = .3;
    c2.strokeStyle = PAL.gold; c2.beginPath(); c2.arc(b.cx, b.cy, b.r, 0, TAU); c2.stroke();
    c2.fillStyle = PAL.panel; c2.fill();
    c2.globalAlpha = .85; c2.fillStyle = PAL.ink;
    c2.font = Math.round(b.r * .5) + 'px ' + CFG.FONT; c2.textAlign = 'center';
    c2.fillText(b.label, b.cx, b.cy + b.r * .18);
  }
  c2.restore();
}
