// audio.js — one clear job: every sound the game makes, synthesized live
// with WebAudio. No audio files, no network, all original.
// The engine is created on the first user gesture (browsers block audio
// before that) and every effect is a short oscillator/noise burst.

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  // A short tone: frequency slides from `from` to `to` over `dur` seconds.
  tone(from, to, dur, type = 'sine', volume = 0.25, when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t0 + dur);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // A burst of filtered noise (chop, sizzle, trash).
  noise(dur, volume = 0.2, freq = 1200, when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  pickup() { this.tone(520, 760, 0.07, 'square', 0.12); }
  place() { this.tone(260, 170, 0.09, 'sine', 0.22); }
  chop() {
    this.noise(0.06, 0.3, 2400);
    this.noise(0.06, 0.3, 2400, 0.09);
    this.noise(0.06, 0.3, 2400, 0.18);
  }
  sizzle() { this.noise(0.35, 0.14, 5200); }
  done() {
    this.tone(880, 880, 0.1, 'sine', 0.2);
    this.tone(1318, 1318, 0.16, 'sine', 0.2, 0.09);
  }
  serve() {
    this.tone(659, 659, 0.09, 'triangle', 0.22);
    this.tone(880, 880, 0.09, 'triangle', 0.22, 0.08);
    this.tone(1175, 1175, 0.18, 'triangle', 0.22, 0.16);
  }
  error() { this.tone(150, 90, 0.18, 'sawtooth', 0.16); }
  walkout() {
    this.tone(392, 392, 0.14, 'triangle', 0.18);
    this.tone(311, 311, 0.14, 'triangle', 0.18, 0.13);
    this.tone(233, 220, 0.3, 'triangle', 0.18, 0.26);
  }
  tick() { this.tone(1050, 1050, 0.05, 'square', 0.08); }
  start() {
    this.tone(523, 523, 0.1, 'triangle', 0.2);
    this.tone(659, 659, 0.1, 'triangle', 0.2, 0.09);
    this.tone(784, 784, 0.2, 'triangle', 0.22, 0.18);
  }
  gameOver() {
    this.tone(523, 523, 0.16, 'triangle', 0.2);
    this.tone(659, 659, 0.16, 'triangle', 0.2, 0.15);
    this.tone(784, 784, 0.16, 'triangle', 0.2, 0.3);
    this.tone(1047, 1047, 0.34, 'triangle', 0.22, 0.45);
  }
}
