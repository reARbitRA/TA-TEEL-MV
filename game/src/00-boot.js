'use strict';
/* ============================================================
   «تعطیل (برقِ من)» — playable music video · classic GTA 1/2
   M0 — walkable painted city + HUD + song clock
   Style: Persian Safavid miniature (lapis/gold/vermilion), top-down, north-up.
   ============================================================ */

/* ---------- 00 · config, palette, utils ---------- */
const CFG = {
  W: 1280, H: 720,              // logical canvas size (letterboxed)
  WW: 2400, WH: 1350,           // world size (from animatic blueprint)
  HY: [330, 700, 1070],         // horizontal street centers
  VX: [420, 900, 1380, 1860],   // vertical street centers
  RW: 80,                       // street width
  RIVER_Y: 1130, RIVER_H: 160,
  BRIDGES: [860, 1820],         // bridge deck x (width RW+8)
  ZOOM: 1.22,                   // walking camera zoom
  PLAYER_WALK: 150, PLAYER_RUN: 250, PLAYER_R: 10,
  FONT: 'Lalezar, Tahoma, "Segoe UI", sans-serif',
};
const PAL = { // locked palette (style-bible §2.6)
  gold: '#d9b23c', goldDim: '#8a6d1d', goldHi: '#f0d68a',
  ink: '#efe6cd', bg: '#0d1526', night: '#0d1526',
  ember: '#e2622b', blood: '#a3282a', flame: '#f5e6a8',
  ground: '#342b24', street: '#1f2129', sidewalk: '#4a3a2c',
  dash: '#c9a06a', river: '#14232b', deck: '#3a332a',
  roofs: ['#212f44', '#46503f', '#5a4632', '#6b5138', '#2a2333', '#3f4a5a', '#513c2e'],
  panel: 'rgba(10,15,30,.82)',
};
const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const faClock = s => { s = Math.max(0, Math.floor(s)); return fa(Math.floor(s / 60)) + ':' + fa(String(s % 60).padStart(2, '0')); };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dist2 = (x1, y1, x2, y2) => (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
const TAU = Math.PI * 2;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
const R = mulberry32(1408); // same seed as animatic → same city

/* ---------- loader state / global refs ---------- */
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const song = document.getElementById('song');
song.volume = 1;

/* viewport scaling (letterbox 1280×720 logical, DPR aware) */
let VW = CFG.W, VH = CFG.H, DPR = 1, SCALE = 1;
function fitCanvas() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth, h = window.innerHeight;
  const s = Math.min(w / CFG.W, h / CFG.H);
  cv.width = Math.round(CFG.W * s * DPR);
  cv.height = Math.round(CFG.H * s * DPR);
  cv.style.width = Math.round(CFG.W * s) + 'px';
  cv.style.height = Math.round(CFG.H * s) + 'px';
  cv.style.position = 'absolute';
  cv.style.left = Math.round((w - CFG.W * s) / 2) + 'px';
  cv.style.top = Math.round((h - CFG.H * s) / 2) + 'px';
  VW = cv.width; VH = cv.height;
  SCALE = cv.width / CFG.W;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

/* screen (logical 1280×720) ←→ client coords, for touch input */
function clientToLogical(cx, cy) {
  const r = cv.getBoundingClientRect();
  return { x: (cx - r.left) / r.width * CFG.W, y: (cy - r.top) / r.height * CFG.H };
}

/* error capture for verification protocol */
const __errors = [];
window.addEventListener('error', e => __errors.push(String(e.message || e)));
window.addEventListener('unhandledrejection', e => __errors.push('rejection: ' + String(e.reason)));

/* hidden debug switch (?debug=1) */
const DEBUG = /[?&]debug=1/.test(location.search);
