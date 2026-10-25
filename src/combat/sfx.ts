/**
 * Tiny Web Audio synthesiser so combat sounds need no asset downloads.
 * Call `unlock()` from a user gesture (entering XR) before playing.
 */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  /** Music bus, created with the context; see Music. */
  musicOut: GainNode | null = null;
  private sfxVolume = 0.8;
  private musicVolume = 0.6;
  private readonly listeners: Array<(ctx: AudioContext) => void> = [];

  unlock(): void {
    if (this.ctx == null) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (Ctor == null) return;
      this.ctx = new Ctor();
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.ratio.value = 8;
      limiter.connect(this.ctx.destination);
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5 * this.sfxVolume;
      this.master.connect(limiter);
      this.musicOut = this.ctx.createGain();
      this.musicOut.gain.value = 0.35 * this.musicVolume;
      this.musicOut.connect(limiter);
      const length = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      for (const listener of this.listeners) listener(this.ctx);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /** Runs `listener` once the audio context exists (immediately if it does). */
  onReady(listener: (ctx: AudioContext) => void): void {
    if (this.ctx) listener(this.ctx);
    else this.listeners.push(listener);
  }

  get noiseBuffer(): AudioBuffer | null {
    return this.noise;
  }

  setVolumes(sfx: number, music: number): void {
    this.sfxVolume = sfx;
    this.musicVolume = music;
    if (this.master) this.master.gain.value = 0.5 * sfx;
    if (this.musicOut) this.musicOut.gain.value = 0.35 * music;
  }

  /** UI press. */
  click(): void {
    this.tone('square', 1800, 1200, 0.05, 0.12);
    this.tone('sine', 600, 400, 0.06, 0.15);
  }

  /** Refused: locked or not enough coins. */
  denied(): void {
    this.tone('square', 220, 160, 0.12, 0.15);
    this.tone('square', 180, 120, 0.14, 0.12, 0.1);
  }

  /** Purchase or reward. */
  coin(): void {
    this.tone('square', 988, 988, 0.08, 0.12);
    this.tone('square', 1319, 1319, 0.25, 0.12, 0.08);
  }

  /** Countdown tick; `go` for the final FIGHT. */
  beep(go = false): void {
    if (go) {
      this.tone('sawtooth', 440, 880, 0.35, 0.2);
      this.tone('square', 880, 880, 0.4, 0.1);
    } else this.tone('square', 660, 660, 0.12, 0.15);
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

  private hissHigh(duration: number, gain: number): void {
    if (this.ctx == null || this.master == null || this.noise == null) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2500, t);
    filter.frequency.exponentialRampToValueAtTime(7000, t + duration);
    const amp = this.ctx.createGain();
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter).connect(amp).connect(this.master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + duration + 0.02);
  }

  /** Blades sliding out. */
  shing(): void {
    this.hissHigh(0.25, 0.35);
    this.tone('triangle', 2400, 3600, 0.2, 0.08);
  }

  /** Blade contact. */
  slash(): void {
    this.hissHigh(0.12, 0.5);
    this.tone('sawtooth', 600, 120, 0.12, 0.15);
  }

  /** The jump between worlds: a long rising whoosh, then a boom. */
  warp(): void {
    if (this.ctx == null || this.master == null || this.noise == null) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2;
    filter.frequency.setValueAtTime(200, t);
    filter.frequency.exponentialRampToValueAtTime(3500, t + 3.8);
    const amp = this.ctx.createGain();
    amp.gain.setValueAtTime(0.001, t);
    amp.gain.exponentialRampToValueAtTime(0.5, t + 3.6);
    amp.gain.exponentialRampToValueAtTime(0.001, t + 4.3);
    src.connect(filter).connect(amp).connect(this.master);
    src.start(t);
    src.stop(t + 4.4);
    this.tone('sine', 60, 240, 3.8, 0.15);
    this.tone('sine', 90, 30, 0.9, 0.5, 4.1);
  }

  /** Boss warning: a two-tone siren. */
  klaxon(): void {
    for (let i = 0; i < 4; i += 1) {
      this.tone('square', 660, 660, 0.28, 0.08, i * 0.6);
      this.tone('square', 440, 440, 0.28, 0.08, i * 0.6 + 0.3);
    }
  }

  /** Laser beam burning a target. */
  laser(): void {
    this.tone('sawtooth', 180, 160, 0.09, 0.05);
    this.tone('square', 1400, 1300, 0.06, 0.02);
  }

  /** Shotgun blast and pump. */
  shotgun(): void {
    this.hiss(0.35, 3500, 0.7);
    this.tone('sawtooth', 160, 50, 0.3, 0.45);
    this.tone('square', 900, 700, 0.05, 0.08, 0.32);
    this.tone('square', 700, 900, 0.05, 0.08, 0.42);
  }

  /** One minigun / SMG round: short and light. */
  rattle(): void {
    this.tone('square', 900 + Math.random() * 200, 200, 0.05, 0.07);
    this.hiss(0.05, 4000, 0.12);
  }

  /** Burning tick. */
  sizzle(): void {
    this.hissHigh(0.12, 0.12);
  }

  /** Two blades crossing: a bright metallic ring. */
  clang(): void {
    this.tone('triangle', 2350, 2200, 0.45, 0.12);
    this.tone('square', 3520, 3300, 0.12, 0.04);
    this.hissHigh(0.1, 0.4);
  }

  /** Telekinetic lift: a rising hum. */
  lift(): void {
    this.tone('sine', 140, 520, 0.45, 0.16);
    this.tone('triangle', 280, 1040, 0.35, 0.05);
  }

  /** Thrown shockwave. */
  crescent(): void {
    this.tone('sawtooth', 300, 1200, 0.18, 0.12);
    this.hissHigh(0.2, 0.25);
  }

  /** Hero switch. */
  swap(): void {
    this.tone('square', 660, 990, 0.1, 0.1);
    this.tone('square', 990, 1320, 0.1, 0.08, 0.08);
  }

  /** Alien rifle shot: lower and buzzier than the player's blasts. */
  enemyShot(): void {
    this.tone('sawtooth', 520, 140, 0.18, 0.08);
    this.tone('square', 260, 90, 0.12, 0.05);
  }

  /** Soft typewriter key click. */
  tick(): void {
    this.tone('square', 1800 + Math.random() * 400, 1500, 0.025, 0.035);
  }

  /** Radio blip at the start of a transmission line. */
  radio(): void {
    this.hiss(0.08, 4000, 0.15);
    this.tone('square', 1200, 1200, 0.05, 0.06);
    this.tone('square', 900, 900, 0.05, 0.06, 0.07);
  }

  /** Bowstring being drawn. */
  creak(): void {
    this.tone('triangle', 120, 220, 0.5, 0.08);
  }

  /** Arrow released; `power` 0..1 brightens it. */
  twang(power: number): void {
    this.tone('triangle', 180 + power * 120, 90, 0.25, 0.25);
    this.hissHigh(0.15 + power * 0.15, 0.2 + power * 0.25);
  }

  /** Web fired. */
  thwip(): void {
    this.hissHigh(0.12, 0.35);
    this.tone('sine', 1600, 500, 0.08, 0.12);
  }

  /** Web sticks to something. */
  splat(): void {
    this.hiss(0.12, 1200, 0.35);
  }

  /** Webbed enemy ripped apart. */
  yank(): void {
    this.tone('sawtooth', 120, 600, 0.15, 0.25);
    this.hiss(0.4, 3000, 0.5);
  }

  /** Hammer smacks into a hand. */
  catchHammer(): void {
    this.tone('square', 180, 90, 0.12, 0.25);
    this.hiss(0.1, 2500, 0.25);
  }

  /** Hammer impact with a lightning crack. */
  thunderHit(): void {
    this.hiss(0.5, 5000, 0.6);
    this.tone('sawtooth', 160, 40, 0.35, 0.4);
    this.tone('square', 1800, 400, 0.08, 0.1);
  }

  thunder(): void {
    this.hiss(1.8, 900, 0.6);
    this.tone('sine', 70, 30, 1.4, 0.4);
  }

  victory(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.tone('triangle', f, f, 0.35, 0.18, i * 0.12));
  }

  defeat(): void {
    [392, 330, 262, 196].forEach((f, i) => this.tone('sawtooth', f, f * 0.98, 0.4, 0.12, i * 0.18));
  }
}
