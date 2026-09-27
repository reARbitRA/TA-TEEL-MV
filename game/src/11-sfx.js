/* ---------- 11 · SFX: synthesized Web Audio (game-design §7 — no files, no network) ---------- */
const SFX = {
  ctx: null, master: null,
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);
    } catch (e) { /* headless / no audio device — SFX simply silent */ }
  },
  tone(freq, dur, type, gain, slideTo) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain || 0.5, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, freq, q, gain) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1800; f.Q.value = q || 0.8;
    const g = this.ctx.createGain(); g.gain.value = gain || 0.5;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  },
  /* named cues */
  step() { this.noise(0.05, 700, 1.2, 0.05); },
  ember() { this.tone(880, 0.18, 'sine', 0.4, 1320); this.tone(1760, 0.25, 'sine', 0.15); },
  wind() { this.noise(0.5, 600, 0.4, 0.5); this.tone(300, 0.4, 'triangle', 0.12, 140); },
  spark() { // جرقه‌ی فیوز
    for (let i = 0; i < 5; i++) setTimeout(() => this.noise(0.06, 2600 + Math.random() * 1800, 2, 0.6), i * 55);
    this.tone(2200, 0.3, 'square', 0.12, 300);
  },
  tvBlip() { this.tone(1200, 0.08, 'square', 0.3); setTimeout(() => this.tone(900, 0.1, 'square', 0.25), 90); this.noise(0.25, 3000, 1, 0.3); },
  caught() { this.tone(140, 0.5, 'sawtooth', 0.5, 60); this.noise(0.4, 300, 0.6, 0.4); },
  complete() { this.tone(523, 0.14, 'triangle', 0.4); setTimeout(() => this.tone(659, 0.14, 'triangle', 0.4), 120); setTimeout(() => this.tone(784, 0.3, 'triangle', 0.4), 240); },
  heatTick() { this.noise(0.1, 500, 0.7, 0.06); },
  ting(hi) { // آچیومنت — زنگِ ظریفِ فلزیِ تذهیب (achievements-list.md)
    this.tone(hi ? 1560 : 1040, 0.5, 'sine', 0.3, hi ? 2100 : 1300);
    this.tone(hi ? 3120 : 2080, 0.32, 'sine', 0.09);
  },
};
