/* ---------- 03 · timeline: the song is the clock ----------
   TIMELINE injected at build time from docs/timing-map.md (v8, locked 25 Sep 2026).
   Lines are byte-exact; never edited by hand (tools/gen_timeline.py). */

const STEPS = TIMELINE.steps; // {n,t,beat,sc,line,scene,ev}
const SONG = { bpm: TIMELINE.bpm, beat: TIMELINE.beatPeriod, duration: TIMELINE.duration, beats: TIMELINE.beats };

/* step index for a given song time */
function stepIndexAt(t) {
  let i = 0;
  for (let k = 0; k < STEPS.length; k++) { if (t >= STEPS[k].t - 1e-4) i = k; else break; }
  return i;
}
/* parse the ev column into a structured object: "chador:1, up:'a','b'" → {chador:1, up:['a','b']}
   (M4 fix: quoted lists span commas — a naive comma-split drops every icon
   after the first; the list regex consumes them whole, scalars after) */
for (const S of STEPS) {
  const o = {};
  if (S.ev && S.ev !== '—') {
    let m;
    const reList = /([a-z]+)\s*:\s*((?:'[^']*'\s*,?\s*)+)/g;
    while ((m = reList.exec(S.ev))) o[m[1]] = m[2].match(/'([^']*)'/g).map(s => s.slice(1, -1));
    const reScalar = /([a-z]+)\s*:\s*([0-9]+)/g;
    while ((m = reScalar.exec(S.ev))) if (!o[m[1]]) o[m[1]] = parseInt(m[2], 10);
  }
  S.evObj = o;
}
/* beat phase 0..1 (for gentle HUD/world pulse) */
function beatPhase(t) { return (t / SONG.beat) % 1; }

/* mission windows (game-design §4; open/close on the locked timeline) */
const MISSIONS = [
  { id: 'm1', t0: 0.00,   t1: 33.67,  arena: 'majles',    title: 'مأموریت ۱ · مجلسِ شورایی',            obj: 'پنهان‌کاری پشتِ ستون‌ها؛ دیده نشو' },
  { id: 'm2', t0: 33.67,  t1: 42.39,  arena: 'candle',    title: 'مأموریت ۲ · تولدِ راوی',               obj: 'در تاریکی، اخگرها را جمع کن' },
  { id: 'm3', t0: 42.39,  t1: 79.80,  arena: 'raaviRoom', title: 'مأموریت ۳ · اتاقِ چهل‌درجه',            obj: 'کنارِ پنکه خنک شو؛ پیش از ۴۸ درجه فرار کن' },
  { id: 'm4', t0: 79.80,  t1: 122.19, arena: 'roof',      title: 'مأموریت ۴ · کجاشون؟ — پشت‌بام',        obj: '۴ مدالیونِ پنهان را پیدا کن' },
  { id: 'm5', t0: 122.19, t1: 157.11, arena: 'chalipa',   title: 'مأموریت ۵ · خیابانِ دوزخ',              obj: 'از تقاطعِ چلیپا عبور کن' },
  { id: 'm6', t0: 157.11, t1: 172.07, arena: 'clock',     title: 'مأموریت ۶ · پل — زمزمه/فریاد/سکوت',    obj: 'از پل رد شو؛ در بلک‌اوت پنهان شو' },
  { id: 'c1', t0: 172.07, t1: 187.03, arena: 'chalipa',   title: 'میان‌بند · سکوتِ تبلیغاتی',             obj: '', cut: true },
  { id: 'c2', t0: 187.03, t1: 199.50, arena: 'war',       title: 'میان‌بند · کُروسِ آکاپلا',              obj: '', cut: true },
  { id: 'm7', t0: 199.50, t1: 211.97, arena: 'parade',    title: 'مأموریت ۷ · رژه‌ی شمع‌ها',              obj: 'رودِ شمع‌ها را تا درِ نیروگاه برسان' },
  { id: 'm8', t0: 211.97, t1: 249.37, arena: 'war',       title: 'مأموریت ۸ · انفجارِ نهایی',             obj: 'جمع شو؛ خطِ بسیجی را عقب بران؛ تخت را بشکن' },
  { id: 'm9', t0: 249.37, t1: 321.69, arena: 'plant',     title: 'مأموریت ۹ · پایانِ پایدار',             obj: 'سه وصلهٔ ∷∷∷ را روشن کن' },
];
function missionAt(t) {
  for (const m of MISSIONS) if (t >= m.t0 && t < m.t1) return m;
  return MISSIONS[MISSIONS.length - 1];
}
