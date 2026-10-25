/**
 * Tiny Web Audio synthesiser so combat sounds need no asset downloads.
 * Call `unlock()` from a user gesture (entering XR) before playing.
 */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;

  unlock(): void {
    if (this.ctx == null) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (Ctor == null) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      const length = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private tone(type: OscillatorType, from: number, to: number, duration: number, gain: number, delay = 0): void {
    if (this.ctx == null || this.master == null) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + duration);
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(amp).connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  private hiss(duration: number, cutoff: number, gain: number): void {
    if (this.ctx == null || this.master == null || this.noise == null) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, t);
    filter.frequency.exponentialRampToValueAtTime(60, t + duration);
    const amp = this.ctx.createGain();
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter).connect(amp).connect(this.master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + duration + 0.02);
  }

  blast(): void {
    this.tone('sawtooth', 1400, 180, 0.16, 0.18);
    this.tone('square', 2600, 900, 0.06, 0.05);
  }

  explode(big = false): void {
    this.hiss(big ? 0.9 : 0.5, big ? 3200 : 2200, big ? 0.7 : 0.5);
    this.tone('sine', 120, 40, big ? 0.6 : 0.35, 0.5);
  }

  ping(): void {
    this.tone('triangle', 900, 700, 0.08, 0.15);
  }

  hurt(): void {
    this.tone('sawtooth', 220, 50, 0.4, 0.4);
    this.hiss(0.3, 900, 0.4);
  }

  portal(): void {
    this.tone('sine', 80, 400, 0.6, 0.12);
  }

  wave(): void {
    this.tone('square', 220, 440, 0.25, 0.12);
    this.tone('square', 330, 660, 0.25, 0.1, 0.15);
  }

  victory(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.tone('triangle', f, f, 0.35, 0.18, i * 0.12));
  }

  defeat(): void {
    [392, 330, 262, 196].forEach((f, i) => this.tone('sawtooth', f, f * 0.98, 0.4, 0.12, i * 0.18));
  }
}
