/**
 * Web Audio sound design, synthesised live so no audio assets download.
 * Every effect is layered: a transient (noise click or crack), a body (a
 * pitched sweep or partials), often a sub-bass thump, and a send into a
 * shared hall reverb so impacts have weight and space. Call `unlock()` from
 * a user gesture (entering XR) before playing.
 */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private reverb: GainNode | null = null;
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
      const ctx = new Ctor();
      this.ctx = ctx;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.ratio.value = 8;
      limiter.connect(ctx.destination);
      this.master = ctx.createGain();
      this.master.gain.value = 0.5 * this.sfxVolume;
      this.master.connect(limiter);
      this.musicOut = ctx.createGain();
      this.musicOut.gain.value = 0.35 * this.musicVolume;
      this.musicOut.connect(limiter);
      const length = ctx.sampleRate;
      this.noise = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      // A short hall for effects.
      const irLength = Math.floor(ctx.sampleRate * 1.6);
      const ir = ctx.createBuffer(2, irLength, ctx.sampleRate);
      for (let c = 0; c < 2; c += 1) {
        const d = ir.getChannelData(c);
        for (let i = 0; i < irLength; i += 1) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLength, 3);
      }
      const convolver = ctx.createConvolver();
      convolver.buffer = ir;
      const wet = ctx.createGain();
      wet.gain.value = 0.5;
      this.reverb = ctx.createGain();
      this.reverb.connect(convolver).connect(wet).connect(this.master);
      for (const listener of this.listeners) listener(ctx);
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

  // ---------------------------------------------------------------- building blocks

  private out(node: AudioNode, reverb: number): void {
    node.connect(this.master!);
    if (reverb > 0 && this.reverb) {
      const send = this.ctx!.createGain();
      send.gain.value = reverb;
      node.connect(send).connect(this.reverb);
    }
  }

  /** A pitched sweep from `from` to `to` Hz. */
  private tone(type: OscillatorType, from: number, to: number, duration: number, gain: number, delay = 0, reverb = 0): void {
    if (this.ctx == null || this.master == null) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + duration);
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(amp);
    this.out(amp, reverb);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  /** Filtered noise: cutoff from `from` to `to` Hz over `duration`. */
  private noiseSweep(type: BiquadFilterType, from: number, to: number, duration: number, gain: number, delay = 0, reverb = 0, q = 0.8, attack = 0): void {
    if (this.ctx == null || this.master == null || this.noise == null) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = duration > 0.9;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(from, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(30, to), t + duration);
    const amp = this.ctx.createGain();
    if (attack > 0) {
      amp.gain.setValueAtTime(0.001, t);
      amp.gain.exponentialRampToValueAtTime(gain, t + attack);
    } else amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter).connect(amp);
    this.out(amp, reverb);
    src.start(t, Math.random() * 0.4);
    src.stop(t + duration + 0.02);
  }

  /** Inharmonic partials of struck metal. */
  private metal(base: number, duration: number, gain: number, reverb = 0.3): void {
    for (const [ratio, level] of [[1, 1], [2.76, 0.6], [5.4, 0.35], [8.93, 0.2]] as const) {
      this.tone('sine', base * ratio, base * ratio * 0.995, duration * (1.2 - ratio * 0.08), gain * level, 0, reverb);
    }
  }

  /** A deep sub-bass thump for weight. */
  private thump(gain: number, length = 0.35, from = 110, delay = 0): void {
    this.tone('sine', from, 35, length, gain, delay);
  }

  // ---------------------------------------------------------------- UI and flow

  click(): void {
    this.tone('square', 1800, 1200, 0.04, 0.08);
    this.tone('sine', 900, 500, 0.08, 0.14);
  }

  denied(): void {
    this.tone('square', 220, 160, 0.12, 0.12);
    this.tone('square', 180, 120, 0.14, 0.1, 0.1);
  }

  coin(): void {
    this.tone('square', 988, 988, 0.08, 0.1);
    this.tone('square', 1319, 1319, 0.3, 0.1, 0.08, 0.3);
    this.tone('sine', 2637, 2637, 0.3, 0.05, 0.08, 0.3);
  }

  beep(go = false): void {
    if (go) {
      this.tone('sawtooth', 220, 880, 0.4, 0.18, 0, 0.4);
      this.tone('square', 880, 880, 0.5, 0.08, 0.05, 0.4);
      this.thump(0.5, 0.5);
    } else this.tone('square', 660, 660, 0.12, 0.13, 0, 0.2);
  }

  tick(): void {
    this.tone('square', 1800 + Math.random() * 400, 1500, 0.025, 0.03);
  }

  radio(): void {
    this.noiseSweep('bandpass', 3000, 3000, 0.08, 0.15, 0, 0, 2);
    this.tone('square', 1200, 1200, 0.05, 0.05);
    this.tone('square', 900, 900, 0.05, 0.05, 0.07);
  }

  swap(): void {
    this.tone('sine', 300, 1200, 0.25, 0.12, 0, 0.3);
    this.noiseSweep('bandpass', 800, 4000, 0.25, 0.15, 0, 0.2, 3);
  }

  wave(): void {
    this.tone('sawtooth', 110, 220, 0.5, 0.12, 0, 0.5);
    this.tone('square', 330, 660, 0.3, 0.08, 0.15, 0.4);
    this.thump(0.4);
  }

  victory(): void {
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone('triangle', f, f, 0.5, 0.15, i * 0.11, 0.5));
    this.tone('sawtooth', 262, 262, 1.2, 0.06, 0.5, 0.6);
    this.thump(0.5, 0.6, 90, 0.5);
  }

  defeat(): void {
    [392, 330, 262, 196].forEach((f, i) => this.tone('sawtooth', f, f * 0.97, 0.5, 0.1, i * 0.2, 0.5));
    this.thump(0.5, 1, 80, 0.6);
  }

  /** Boss warning: a two-tone siren over a rumble. */
  klaxon(): void {
    for (let i = 0; i < 4; i += 1) {
      this.tone('sawtooth', 660, 640, 0.28, 0.08, i * 0.6, 0.3);
      this.tone('sawtooth', 440, 430, 0.28, 0.08, i * 0.6 + 0.3, 0.3);
    }
    this.noiseSweep('lowpass', 200, 60, 2.4, 0.3, 0, 0.3, 0.8, 0.5);
  }

  /** The jump between worlds: a long rising whoosh, then a boom. */
  warp(): void {
    this.noiseSweep('bandpass', 200, 3800, 4, 0.5, 0, 0.3, 2, 3.4);
    this.tone('sine', 50, 260, 3.9, 0.15);
    this.tone('sawtooth', 80, 400, 3.9, 0.04);
    this.thump(0.7, 1.2, 120, 4.05);
    this.noiseSweep('lowpass', 3000, 80, 1.4, 0.6, 4.05, 0.6);
  }

  // ---------------------------------------------------------------- weapons

  /** Palm blast: a sharp zap with a crack and a thump. */
  blast(): void {
    this.tone('sawtooth', 1600, 160, 0.16, 0.14);
    this.tone('square', 3200, 900, 0.05, 0.05);
    this.noiseSweep('highpass', 6000, 2000, 0.05, 0.25);
    this.thump(0.25, 0.15, 160);
  }

  laser(): void {
    this.tone('sawtooth', 180, 160, 0.09, 0.05);
    this.tone('square', 1400, 1300, 0.06, 0.02);
  }

  /** Shotgun: a huge crack and boom, then the pump racks. */
  shotgun(): void {
    this.noiseSweep('lowpass', 6000, 200, 0.4, 0.8, 0, 0.4);
    this.thump(0.8, 0.4, 140);
    this.tone('square', 900, 700, 0.04, 0.08, 0.32);
    this.tone('square', 700, 1000, 0.05, 0.08, 0.42);
    this.noiseSweep('bandpass', 2000, 2000, 0.05, 0.25, 0.32, 0, 4);
  }

  /** One SMG / minigun round. */
  rattle(): void {
    this.noiseSweep('bandpass', 3000, 1200, 0.05, 0.35, 0, 0, 1.2);
    this.thump(0.15, 0.06, 180);
  }

  enemyShot(): void {
    this.tone('sawtooth', 520, 120, 0.2, 0.08, 0, 0.2);
    this.tone('square', 260, 80, 0.14, 0.05);
  }

  /** Blades sliding out: a ringing steel shing. */
  shing(): void {
    this.noiseSweep('highpass', 2500, 8000, 0.25, 0.3);
    this.metal(1800, 0.6, 0.05, 0.4);
  }

  /** A blade cutting flesh: whoosh, wet tear, low hit. */
  slash(): void {
    this.noiseSweep('bandpass', 500, 4500, 0.12, 0.45, 0, 0, 1.5);
    this.noiseSweep('lowpass', 1500, 200, 0.18, 0.35, 0.03);
    this.thump(0.25, 0.12, 130);
  }

  /** A slash wave or a thrown weapon: a fast airy swoosh. */
  crescent(): void {
    this.noiseSweep('bandpass', 400, 3500, 0.28, 0.4, 0, 0.2, 2.5, 0.06);
    this.tone('sawtooth', 300, 1100, 0.2, 0.06);
  }

  /** Blades or a shield meeting: bright struck metal. */
  clang(): void {
    this.metal(1150, 0.9, 0.09, 0.45);
    this.noiseSweep('highpass', 5000, 3000, 0.06, 0.3);
    this.thump(0.2, 0.1, 200);
  }

  creak(): void {
    this.tone('triangle', 120, 220, 0.5, 0.07);
    this.noiseSweep('bandpass', 400, 900, 0.5, 0.08, 0, 0, 6);
  }

  twang(power: number): void {
    this.tone('triangle', 200 + power * 120, 90, 0.3, 0.25);
    this.noiseSweep('highpass', 3000, 8000, 0.15 + power * 0.15, 0.2 + power * 0.25);
    if (power > 0.9) this.tone('sine', 900, 1800, 0.4, 0.06, 0, 0.4);
  }

  thwip(): void {
    this.noiseSweep('highpass', 3000, 7000, 0.12, 0.35);
    this.tone('sine', 1800, 500, 0.08, 0.12);
  }

  splat(): void {
    this.noiseSweep('lowpass', 1600, 150, 0.16, 0.45);
    this.thump(0.2, 0.1, 150);
  }

  yank(): void {
    this.tone('sawtooth', 120, 600, 0.15, 0.2);
    this.noiseSweep('lowpass', 3000, 200, 0.4, 0.5, 0, 0.3);
    this.thump(0.4, 0.3);
  }

  catchHammer(): void {
    this.metal(240, 0.35, 0.07, 0.2);
    this.thump(0.35, 0.18, 140);
    this.noiseSweep('lowpass', 2500, 300, 0.1, 0.25);
  }

  /** Hammer impact: lightning crack, metal and a deep boom. */
  thunderHit(): void {
    this.noiseSweep('highpass', 6000, 1500, 0.2, 0.6, 0, 0.3);
    this.noiseSweep('lowpass', 2000, 80, 0.7, 0.5, 0.02, 0.5);
    this.metal(310, 0.5, 0.05, 0.4);
    this.thump(0.6, 0.5, 120);
  }

  thunder(): void {
    this.noiseSweep('highpass', 5000, 1200, 0.15, 0.45, 0, 0.4);
    this.noiseSweep('lowpass', 900, 50, 2.2, 0.6, 0.05, 0.6, 0.8, 0.15);
    this.thump(0.5, 1.4, 70);
  }

  explode(big = false): void {
    this.noiseSweep('lowpass', big ? 5000 : 3500, 60, big ? 1.1 : 0.6, big ? 0.8 : 0.55, 0, big ? 0.6 : 0.35);
    this.thump(big ? 0.8 : 0.55, big ? 0.9 : 0.45, big ? 130 : 160);
    // Debris crackle.
    for (let i = 0; i < (big ? 6 : 3); i += 1) this.noiseSweep('highpass', 4000, 2000, 0.03, 0.12, 0.08 + Math.random() * 0.4);
  }

  ping(): void {
    this.metal(900, 0.15, 0.04, 0.1);
    this.noiseSweep('bandpass', 2000, 800, 0.06, 0.2, 0, 0, 2);
  }

  /** Player hit: a heavy impact and a distorted thud. */
  hurt(): void {
    this.tone('sawtooth', 220, 45, 0.4, 0.3);
    this.noiseSweep('lowpass', 1200, 100, 0.3, 0.45);
    this.thump(0.6, 0.3, 90);
    // A body blow you can feel in the headset's speakers.
    this.thump(0.9, 0.4, 55);
  }

  portal(): void {
    this.tone('sine', 70, 420, 0.6, 0.12, 0, 0.5);
    this.noiseSweep('bandpass', 300, 1800, 0.6, 0.15, 0, 0.4, 4, 0.2);
  }

  /** A prop breaking apart: crunching wood and metal. */
  shatter(): void {
    this.noiseSweep('bandpass', 1800, 400, 0.25, 0.5, 0, 0.2, 1.2);
    for (let i = 0; i < 4; i += 1) this.noiseSweep('highpass', 3000, 1500, 0.04, 0.2, 0.03 + Math.random() * 0.15);
    this.metal(520, 0.3, 0.04, 0.2);
    this.thump(0.35, 0.2, 140);
  }

  /** Telekinetic lift: a rising hum. */
  lift(): void {
    this.tone('sine', 140, 520, 0.45, 0.14, 0, 0.4);
    this.tone('triangle', 280, 1040, 0.35, 0.05, 0, 0.3);
  }

  sizzle(): void {
    this.noiseSweep('highpass', 3000, 6000, 0.12, 0.1);
  }
}
