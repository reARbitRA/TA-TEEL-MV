/* ---------- 06 · traffic: living streets (animatic traffic, collidable) ---------- */
const CAR_COLS = ['#3a3f52', '#5a3a2e', '#2f4a3f', '#4a4436', '#513c2e'];
const cars = [];
function initTraffic() {
  cars.length = 0;
  for (let i = 0; i < 7; i++) {
    const row = CFG.HY[i % 3], dir = i % 2 ? 1 : -1;
    cars.push({ axis: 'h', row, dir, lane: dir * 20, x: (i * 337) % CFG.WW, y: row + dir * 20, sp: 62 + i * 12 });
  }
  for (let i = 0; i < 3; i++) {
    const dir = i % 2 ? 1 : -1;
    cars.push({ axis: 'v', col: CFG.VX[3], dir, lane: dir * 20, x: CFG.VX[3] + dir * 20, y: 300 + i * 300, sp: 55 + i * 16 });
  }
}
function trafficUpdate(dt) {
  for (const c of cars) {
    if (c.axis === 'h') {
      c.x += c.dir * c.sp * dt;
      if (c.dir > 0 && c.x > CFG.WW + 100) c.x = -100;
      if (c.dir < 0 && c.x < -100) c.x = CFG.WW + 100;
      c.y = c.row + c.lane;
    } else {
      c.y += c.dir * c.sp * dt;
      // skip the river (no cars on the bridge of the parade street)
      if (c.y > 1090 && c.y < 1120 && c.dir > 0) c.y = 1130;
      if (c.y > 1300) c.y = -100;
      if (c.y < -100) c.y = 1300;
      c.x = c.col + c.lane;
    }
  }
}
function carSolid(px, py, pr) {
  // traffic cars are soft-solid: push the player out gently
  for (const c of cars) {
    const rr = 15 + pr;
    if (dist2(px, py, c.x, c.y) < rr * rr) {
      const dx = px - c.x, dy = py - c.y, dl = Math.hypot(dx, dy) || 1;
      player.x = c.x + dx / dl * rr; player.y = c.y + dy / dl * rr;
      cam.shake = Math.min(1, cam.shake + .3);
    }
  }
}
function trafficDraw(c2, t) {
  for (const c of cars) {
    c2.save(); c2.translate(c.x, c.y);
    if (c.axis === 'h') c2.rotate(c.dir < 0 ? Math.PI : 0);
    else c2.rotate(c.dir < 0 ? -Math.PI / 2 : Math.PI / 2);
    c2.fillStyle = 'rgba(10,12,25,.45)'; c2.fillRect(-16, 4, 34, 12);
    c2.fillStyle = c.col0 || CAR_COLS[(c.sp | 0) % 5];
    c2.beginPath(); c2.roundRect(-18, -8, 36, 16, 5); c2.fill();
    c2.fillStyle = '#141824'; c2.fillRect(-6, -6, 12, 12);
    // headlight beam on the road + glow at the nose (polish M4)
    const fl = .85 + .15 * Math.sin(t * 13 + c.x * .01);
    c2.fillStyle = 'rgba(240,200,120,.10)';
    c2.beginPath(); c2.moveTo(18, -7); c2.lineTo(64, -15); c2.lineTo(64, 15); c2.lineTo(18, 7); c2.closePath(); c2.fill();
    c2.fillStyle = 'rgba(240,200,120,' + (.18 * fl).toFixed(3) + ')';
    c2.beginPath(); c2.ellipse(44, 0, 22, 13, 0, 0, TAU); c2.fill();
    const g = c2.createRadialGradient(20, 0, 0, 20, 0, 26);
    g.addColorStop(0, 'rgba(240,200,120,.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c2.fillStyle = g; c2.fillRect(-6, -26, 52, 52);
    // taillights (two vermilion sparks at the rear)
    c2.fillStyle = 'rgba(200,60,44,' + (.8 * fl).toFixed(3) + ')';
    c2.fillRect(-19, -6, 3, 3); c2.fillRect(-19, 3, 3, 3);
    c2.restore();
  }
}
