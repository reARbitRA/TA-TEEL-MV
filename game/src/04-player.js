/* ---------- 04 · player: راوی (punk narrator, top-down) ----------
   Code-drawn per style-bible §5: from above = a moving point of light with two
   rings of glass (round spectacles) on an indigo broad-shouldered teardrop body.
   Candle-flame head: 3-frame tongue loop (gta-pipeline §4). */

const player = {
  x: 230, y: 340,          // start: street south of the council hall
  vx: 0, vy: 0, dir: -Math.PI / 2, // facing north
  r: CFG.PLAYER_R,
  running: false, moving: false,
  walkPhase: 0, flameT: 0,
  dead: false,
};
const DUST = []; // run-dust puffs (world-space, transient)

function playerUpdate(dt, input) {
  if (player.dead) return;
  const sp = (input.run ? CFG.PLAYER_RUN : CFG.PLAYER_WALK);
  let ax = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let ay = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const len = Math.hypot(ax, ay);
  if (len > 0) { ax /= len; ay /= len; player.dir = Math.atan2(ay, ax); }
  player.moving = len > 0;
  player.running = input.run && len > 0;
  const target = player.moving ? sp : 0;
  // smooth accel
  const k = Math.min(1, dt * 10);
  player.vx = lerp(player.vx, ax * target, k);
  player.vy = lerp(player.vy, ay * target, k);
  // axis-separated move + slide
  moveAxis('x', player.vx * dt);
  moveAxis('y', player.vy * dt);
  player.x = clamp(player.x, 24, CFG.WW - 24);
  player.y = clamp(player.y, 24, CFG.WH - 24);
  player.walkPhase += Math.hypot(player.vx, player.vy) * dt * 0.06;
  player.flameT += dt;
  // run dust: a puff of street dust behind the sprint (render polish M4)
  player._dustT = (player._dustT || 0) - dt;
  if (player.running && player._dustT <= 0) {
    player._dustT = 0.16;
    DUST.push({ x: player.x - Math.cos(player.dir) * 10, y: player.y - Math.sin(player.dir) * 10 + 6, r: 3, a: .34 });
  }
  for (let i = DUST.length - 1; i >= 0; i--) {
    const d = DUST[i];
    d.r += 14 * dt; d.a -= .8 * dt; d.y -= 6 * dt;
    if (d.a <= 0) DUST.splice(i, 1);
  }
}

function moveAxis(axis, d) {
  if (!d) return;
  // substep large moves (verification harness can tick with dt up to .25s);
  // at the shipped 60fps |d| <= ~12.5px and this is a single step, unchanged
  const n = Math.max(1, Math.ceil(Math.abs(d) / 24));
  const step = d / n;
  for (let i = 0; i < n; i++) moveAxisStep(axis, step);
}
function moveAxisStep(axis, d) {
  player[axis] += d;
  // circles
  for (const c of SOLID.circles) {
    const dx = player.x - c.x, dy = player.y - c.y;
    const rr = c.r + player.r;
    if (dx * dx + dy * dy < rr * rr) {
      const dl = Math.hypot(dx, dy) || 1;
      const push = rr - dl;
      player.x += dx / dl * push; player.y += dy / dl * push;
    }
  }
  // rects
  for (const rc of SOLID.rects) {
    if (circleRect(player.x, player.y, player.r, rc)) {
      if (axis === 'x') {
        if (d > 0) player.x = rc.x - player.r; else player.x = rc.x + rc.w + player.r;
      } else {
        if (d > 0) player.y = rc.y - player.r; else player.y = rc.y + rc.h + player.r;
      }
    }
  }
}
function circleRect(cx, cy, r, rc) {
  const nx = clamp(cx, rc.x, rc.x + rc.w), ny = clamp(cy, rc.y, rc.y + rc.h);
  return dist2(cx, cy, nx, ny) < r * r;
}

/* draw راوی — world coords, top-down, rotating toward dir */
function playerDraw(c2) {
  const t = player.flameT;
  const bob = player.moving ? Math.sin(player.walkPhase * TAU) * 1.2 : 0;
  const x = player.x, y = player.y + bob;
  // run-dust puffs (behind the body)
  for (const d of DUST) {
    c2.fillStyle = 'rgba(201,160,106,' + Math.max(0, d.a).toFixed(3) + ')';
    c2.beginPath(); c2.arc(d.x, d.y, d.r, 0, TAU); c2.fill();
  }
  // small cut-out shadow
  c2.fillStyle = 'rgba(10,12,25,.5)';
  c2.beginPath(); c2.ellipse(x + 4, y + 8, 14, 8, 0, 0, TAU); c2.fill();
  const spr = img('playerSprite');
  if (spr) {
    /* painted sprite (user-approved M1 swap) — faces up(-y), rotated toward
       dir exactly like the code-drawn original; breath/pulse keep the flame
       alive over the static painting. Code-drawn body below stays fallback. */
    c2.save(); c2.translate(x, y); c2.rotate(player.dir + Math.PI / 2);
    const h = 50, w = h * (spr.width / spr.height);
    const br = 1 + .03 * Math.sin(t * 7.3) + (player.running ? .03 * Math.sin(player.walkPhase * TAU * 2) : 0);
    c2.scale(br, br);
    c2.drawImage(spr, -w / 2, -h / 2, w, h);
    // soft candle glow so the painted flame still reads as living light
    const fl = Math.sin(t * 9) * .5 + Math.sin(t * 23) * .5;
    const g = c2.createRadialGradient(0, -h * .36, 0, 0, -h * .36, 15 + fl * 3);
    g.addColorStop(0, 'rgba(245,230,168,.30)'); g.addColorStop(.5, 'rgba(232,184,74,.16)'); g.addColorStop(1, 'rgba(232,184,74,0)');
    c2.fillStyle = g; c2.beginPath(); c2.arc(0, -h * .36, 15 + fl * 3, 0, TAU); c2.fill();
    c2.restore();
    return;
  }
  // body: indigo broad-shouldered teardrop, rotated toward dir
  c2.save(); c2.translate(x, y); c2.rotate(player.dir + Math.PI / 2); // sprite drawn facing up(-y)
  // shoulders (broad, flat)
  c2.fillStyle = '#232a44';
  c2.beginPath();
  c2.moveTo(-11, 6); c2.quadraticCurveTo(-13, -4, -6, -8);
  c2.lineTo(6, -8); c2.quadraticCurveTo(13, -4, 11, 6);
  c2.quadraticCurveTo(0, 11, -11, 6); c2.closePath(); c2.fill();
  c2.strokeStyle = '#141a2e'; c2.lineWidth = 1.5; c2.stroke();
  // jacket hint (punk: stud row)
  c2.fillStyle = PAL.goldHi;
  for (let i = -1; i <= 1; i++) c2.fillRect(i * 5 - 1, 2, 2, 2);
  // head: flame seen from above = glowing core
  const fl = Math.sin(t * 9) * .5 + Math.sin(t * 23) * .5; // 3-tongue flicker
  const g = c2.createRadialGradient(0, -3, 0, 0, -3, 13 + fl * 3);
  g.addColorStop(0, 'rgba(245,230,168,.95)'); g.addColorStop(.5, 'rgba(232,184,74,.55)'); g.addColorStop(1, 'rgba(232,184,74,0)');
  c2.fillStyle = g; c2.beginPath(); c2.arc(0, -3, 13 + fl * 3, 0, TAU); c2.fill();
  c2.fillStyle = PAL.flame; c2.beginPath(); c2.arc(0, -4, 5 + fl * 1.4, 0, TAU); c2.fill();
  c2.fillStyle = '#fff8dc'; c2.beginPath(); c2.arc(0, -5, 2.2, 0, TAU); c2.fill();
  // two rings of glass (round spectacles) at leading edge — the top-down signature
  c2.strokeStyle = 'rgba(240,214,138,.95)'; c2.lineWidth = 1.4;
  c2.beginPath(); c2.arc(-3.4, -7.5, 2.5, 0, TAU); c2.stroke();
  c2.beginPath(); c2.arc(3.4, -7.5, 2.5, 0, TAU); c2.stroke();
  // hidden signature: tiny cloud-band on the jacket hem
  cloudBand(c2, 0, 8, 2.6, 'rgba(217,178,60,.8)');
  c2.restore();
}
