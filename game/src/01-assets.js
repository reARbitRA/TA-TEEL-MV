/* ---------- 01 · assets ---------- */
const ASSETS = {
  // painted player sprite (user-approved M1 swap; code-drawn remains fallback)
  playerSprite: 'game-assets/sprites/raavi-gta.png',
  // painted HUD frames (game-assets/hud)
  panel: 'game-assets/hud/hud-counter-panel.png',
  ring: 'game-assets/hud/hud-gauge-ring.png',
  track: 'game-assets/hud/hud-meter-track.png',
  // icons (jinn-flavored akhund/basiji are current)
  icons: {
    raavi: 'game-assets/icons/raavi-icon.png',
    basiji: 'game-assets/icons/basiji-icon.png',
    zanVazir: 'game-assets/icons/zan-vazir-icon.png',
    candle: 'game-assets/icons/candle-hero-icon.png',
    divche: 'game-assets/icons/divche-icon.png',
    turbine: 'game-assets/icons/turbine-akhund-icon.png',
    angel: 'game-assets/icons/robot-angel-icon.png',
    calf: 'game-assets/icons/golden-calf-icon.png',
    achFlush: 'game-assets/icons/ach-royal-flush-icon.png',
    achMack: 'game-assets/icons/ach-mack-truck-icon.png',
  },
  // top-down cut-out props
  props: {
    lamp: 'game-assets/statics/props/static-lamp.png',
    tree: 'game-assets/statics/props/static-tree.png',
    wreck: 'game-assets/statics/props/static-wreck.png',
    barrier: 'game-assets/statics/props/static-barrier.png',
    tank: 'game-assets/statics/props/static-tank.png',
    dumpster: 'game-assets/statics/props/static-dumpster.png',
    transformer: 'game-assets/statics/props/static-transformer.png',
    oven: 'game-assets/statics/props/static-oven.png',
  },
  // 9 arena plates (loc5: MB repaint preferred per user decision 25 Sep 2026)
  plates: {
    loc1: 'game-assets/locations/loc1-majles.jpg',
    loc2: 'game-assets/locations/loc2-candle-room.jpg',
    loc3: 'game-assets/locations/loc3-raavi-room.jpg',
    loc4: 'game-assets/locations/loc4-roof.jpg',
    loc5: 'game-assets/locations/loc5-chalipa-MB.jpg',
    loc6: 'game-assets/locations/loc6-bridge-clock.jpg',
    loc7: 'game-assets/locations/loc7-parade.jpg',
    loc8: 'game-assets/locations/loc8-war-square.jpg',
    loc9: 'game-assets/locations/loc9-power-plant.jpg',
  },
};

const IMG = {};          // loaded Image objects by short key
const LOAD = { done: 0, total: 0, failed: [], byKey: {} };
function loadImage(key, src) {
  LOAD.total++;
  const im = new Image();
  im.decoding = 'sync';
  return new Promise(res => {
    im.onload = () => { LOAD.done++; LOAD.byKey[key] = true; IMG[key] = im; res(true); };
    im.onerror = () => { LOAD.done++; LOAD.failed.push(src); LOAD.byKey[key] = false; IMG[key] = null; res(false); };
    im.src = src;
  });
}
function flattenAssets() {
  const jobs = [];
  for (const k in ASSETS) {
    const v = ASSETS[k];
    if (typeof v === 'string') jobs.push(loadImage(k, v));
    else for (const kk in v) jobs.push(loadImage(k + ':' + kk, v[kk]));
  }
  return jobs;
}
function img(key) { return IMG[key] || null; }
/* draw a cut-out prop centered at (x,y) at world scale */
function drawProp(key, x, y, w, h, alpha) {
  const im = img('props:' + key);
  if (!im) return;
  if (alpha !== undefined) ctx.globalAlpha = alpha;
  ctx.drawImage(im, x - w / 2, y - h / 2, w, h);
  if (alpha !== undefined) ctx.globalAlpha = 1;
}
