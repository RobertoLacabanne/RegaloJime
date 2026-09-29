// Sonido muy suave con WebAudio: una nota de caja de música por paso,
// escala pentatónica ascendente; un arpegio al final.
const NOTES = [587.33, 659.25, 739.99, 880, 987.77, 1174.66, 1318.51, 1479.98, 1760];

export class Chime {
  constructor() {
    this.ctx = null;
    let saved = null;
    try { saved = localStorage.getItem('ramo-mute'); } catch (e) { /* sin almacenamiento */ }
    this.muted = saved === '1';
  }

  ensure() {
    if (this.ctx || this.muted) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.out = this.ctx.createGain();
    this.out.gain.value = 0.5;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3200;
    this.out.connect(lp).connect(this.ctx.destination);
  }

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('ramo-mute', m ? '1' : '0'); } catch (e) { /* nada */ }
    if (!m) this.ensure();
  }

  pluck(freq, when = 0, vol = 0.07) {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const t = this.ctx.currentTime + when;
    for (const [mult, v, type] of [[1, 1, 'sine'], [2, 0.25, 'sine'], [3.01, 0.08, 'triangle']]) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.value = freq * mult;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol * v, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6 / mult);
      o.connect(g).connect(this.out);
      o.start(t);
      o.stop(t + 1.8);
    }
  }

  step(i) {
    this.pluck(NOTES[i % NOTES.length] / (i >= NOTES.length ? 2 : 1));
  }

  finale() {
    [0, 2, 4, 5, 7, 8].forEach((k, i) => this.pluck(NOTES[k] / 2, i * 0.16, 0.06));
  }
}
