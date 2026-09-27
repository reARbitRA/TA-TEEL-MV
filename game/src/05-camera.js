/* ---------- 05 · camera: soft follow + hand jitter (animatic language) ---------- */
const cam = { x: 230, y: 300, z: CFG.ZOOM, tx: 230, ty: 300, tz: CFG.ZOOM, shake: 0 };
function cameraUpdate(dt, t) {
  cam.tx = player.x; cam.ty = player.y;
  const k = Math.min(1, dt * 3.2);
  cam.x = lerp(cam.x, cam.tx, k);
  cam.y = lerp(cam.y, cam.ty, k);
  cam.z = lerp(cam.z, cam.tz, Math.min(1, dt * 2));
  cam.shake = Math.max(0, cam.shake - dt * 2.2);
}
function cameraTransform(c2, t) {
  const jx = Math.sin(t * .33) * 3 + (cam.shake > 0 ? Math.sin(t * 61) * cam.shake * 6 : 0);
  const jy = Math.cos(t * .27) * 3 + (cam.shake > 0 ? Math.cos(t * 53) * cam.shake * 6 : 0);
  const s = cam.z;
  c2.setTransform(s * SCALE, 0, 0, s * SCALE,
    CFG.W / 2 - (cam.x + jx) * s * SCALE,
    CFG.H / 2 - (cam.y + jy) * s * SCALE);
}
