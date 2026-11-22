// audio.js — every sound is a small WebAudio synth: no audio files, no
// network. The context is created on the first user gesture; in a headless
// playtest it simply stays silent and every call is a safe no-op.
export class Sounds {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  ensure() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    } catch (e) {
      this.ctx = null;
    }
  }

  tone(freq, seconds, type, gain, when = 0, slideTo = null) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime + when;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + seconds);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain || 0.12, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(t0);
      osc.stop(t0 + seconds + 0.05);
    } catch (e) { /* silent in headless runs */ }
  }

  // Two-note chime when a piece of loot lands in the bag.
  pickup() {
    this.tone(660, 0.12, 'triangle', 0.14);
    this.tone(990, 0.22, 'triangle', 0.14, 0.09);
  }

  // A guard half-sees Mara: a short, low sting.
  noticed() {
    this.tone(220, 0.18, 'sawtooth', 0.08, 0, 180);
  }

  // A guard is sure: the alarm sting.
  alert() {
    this.tone(440, 0.14, 'square', 0.1);
    this.tone(440, 0.14, 'square', 0.1, 0.16);
    this.tone(587, 0.3, 'square', 0.1, 0.32);
  }

  // Caught: a falling phrase.
  caught() {
    this.tone(392, 0.25, 'sawtooth', 0.12, 0, 196);
    this.tone(262, 0.5, 'sawtooth', 0.12, 0.22, 131);
  }

  // Level clear: a rising arpeggio.
  clear() {
    this.tone(523, 0.14, 'triangle', 0.13);
    this.tone(659, 0.14, 'triangle', 0.13, 0.12);
    this.tone(784, 0.14, 'triangle', 0.13, 0.24);
    this.tone(1047, 0.3, 'triangle', 0.13, 0.36);
  }

  // The whole job done: the getaway jingle.
  win() {
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((n, i) => this.tone(n, 0.2, 'triangle', 0.12, i * 0.13));
  }

  // Smoke pellet: a soft noise puff.
  smoke() {
    this.tone(180, 0.3, 'sine', 0.07, 0, 90);
  }

  // EMP pulse: a zap that drops in pitch.
  emp() {
    this.tone(1200, 0.25, 'square', 0.07, 0, 120);
  }

  click() {
    this.tone(880, 0.05, 'sine', 0.05);
  }
}
