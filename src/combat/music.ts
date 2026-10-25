import type { Sfx } from './sfx.js';

/**
 * Procedural synthwave sequencer: kick, snare, hats, bass, arpeggio and pad,
 * scheduled ahead on the Web Audio clock. Each world has its own tempo,
 * key, chord loop and feel; tracks switch on the next bar.
 */

interface TrackDef {
  bpm: number;
  /** MIDI note of the key's root (bass octave). */
  root: number;
  /** Scale intervals in semitones. */
  scale: readonly number[];
  /** Chord roots as scale degrees, one per bar. */
  chords: readonly number[];
  kick: string;
  snare: string;
  hat: string;
  /** Arp pattern: scale-degree offsets from the chord root, '.' = rest. */
  arp: string;
  arpWave: OscillatorType;
  bassWave: OscillatorType;
  bassCutoff: number;
  pad: number;
}

const MINOR = [0, 2, 3, 5, 7, 8, 10];
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];

/** 16-step patterns: x = hit, o = soft hit, . = rest. */
export const TRACKS: Readonly<Record<string, TrackDef>> = {
  menu: {
    bpm: 92,
    root: 45,
    scale: MINOR,
    chords: [0, 5, 2, 6],
    kick: 'x.......x.......',
    snare: '................',
    hat: '..o...o...o...o.',
    arp: '0.2.4.7.4.2.0.2.',
    arpWave: 'triangle',
    bassWave: 'sine',
    bassCutoff: 400,
    pad: 0.05,
  },
  'neon-grid': {
    bpm: 112,
    root: 45,
    scale: MINOR,
    chords: [0, 5, 2, 6],
    kick: 'x...x...x...x...',
    snare: '....x.......x...',
    hat: '..x...x...x...x.',
    arp: '0240724042702407',
    arpWave: 'square',
    bassWave: 'sawtooth',
    bassCutoff: 700,
    pad: 0.035,
  },
  'ember-foundry': {
    bpm: 128,
    root: 38,
    scale: PHRYGIAN,
    chords: [0, 1, 0, 6],
    kick: 'x...x...x...x.x.',
    snare: '....x.......x..o',
    hat: 'oxoxoxoxoxoxoxox',
    arp: '0.1.0.4.0.1.0.7.',
    arpWave: 'sawtooth',
    bassWave: 'sawtooth',
    bassCutoff: 900,
    pad: 0.02,
  },
  'storm-peak': {
    bpm: 88,
    root: 40,
    scale: MINOR,
    chords: [0, 5, 3, 4],
    kick: 'x.....x...x.....',
    snare: '........x.......',
    hat: 'o...o...o...o...',
    arp: '0...4...7...9...',
    arpWave: 'triangle',
    bassWave: 'sawtooth',
    bassCutoff: 500,
    pad: 0.06,
  },
  'frost-spire': {
    bpm: 104,
    root: 42,
    scale: DORIAN,
    chords: [0, 3, 5, 4],
    kick: 'x.......x.x.....',
    snare: '....x.......x...',
    hat: '..o.o...o.o...o.',
    arp: '7.4.2.0.9.7.4.2.',
    arpWave: 'triangle',
    bassWave: 'triangle',
    bassCutoff: 600,
    pad: 0.04,
  },
  'scrap-wastes': {
    bpm: 100,
    root: 40,
    scale: DORIAN,
    chords: [0, 3, 0, 4],
    kick: 'x.....x.x.......',
    snare: '....x.......x...',
    hat: 'x.o.x.o.x.o.x.o.',
    arp: '0.4.7.4.0.4.9.7.',
    arpWave: 'triangle',
    bassWave: 'square',
    bassCutoff: 650,
    pad: 0.03,
  },
  'void-rift': {
    bpm: 120,
    root: 36,
    scale: MINOR,
    chords: [0, 1, 5, 4],
    kick: 'x..x..x...x..x..',
    snare: '....x.......x...',
    hat: 'xoxoxoxoxoxoxoxo',
    arp: '0.7.1.7.0.7.3.6.',
    arpWave: 'square',
    bassWave: 'sawtooth',
    bassCutoff: 450,
    pad: 0.05,
  },
};

const LOOKAHEAD = 0.2;

function freq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class Music {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private track: TrackDef | null = null;
  private pending: TrackDef | null = null;
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;

  constructor(private readonly sfx: Sfx) {
    sfx.onReady((ctx) => {
      this.ctx = ctx;
      this.out = sfx.musicOut;
      if (this.pending) this.start();
    });
  }

  /** Switches to `name` at the next bar (or now if nothing is playing). */
  play(name: string): void {
    const def = TRACKS[name] ?? TRACKS.menu;
    if (def === this.track && this.timer != null) return;
    this.pending = def;
    if (this.ctx && this.timer == null) this.start();
  }

  stop(): void {
    if (this.timer != null) window.clearInterval(this.timer);
    this.timer = null;
    this.track = null;
  }

  private start(): void {
    if (this.ctx == null || this.timer != null) return;
    this.track = this.pending;
    this.pending = null;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 50);
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (ctx == null || this.track == null) return;
    while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
      if (this.step % 16 === 0 && this.pending) {
        this.track = this.pending;
        this.pending = null;
        this.step = 0;
      }
      this.playStep(this.track, this.step, this.nextTime);
      this.nextTime += 60 / this.track.bpm / 4;
      this.step += 1;
    }
  }

  private playStep(t: TrackDef, step: number, time: number): void {
    const i = step % 16;
    const bar = Math.floor(step / 16) % t.chords.length;
    const chord = t.chords[bar];
    const stepLength = 60 / t.bpm / 4;
    const note = (degree: number, octave: number) => {
      const d = chord + degree;
      const scaleIndex = ((d % t.scale.length) + t.scale.length) % t.scale.length;
      const octaves = Math.floor(d / t.scale.length);
      return t.root + t.scale[scaleIndex] + 12 * (octave + octaves);
    };

    if (t.kick[i] !== '.') this.kick(time, t.kick[i] === 'x' ? 0.9 : 0.5);
    if (t.snare[i] !== '.') this.snare(time, t.snare[i] === 'x' ? 0.35 : 0.18);
    if (t.hat[i] !== '.') this.hat(time, t.hat[i] === 'x' ? 0.12 : 0.06);
    if (i % 2 === 0) this.voice(t.bassWave, freq(note(0, 0)), time, stepLength * 1.8, 0.22, t.bassCutoff);
    const a = t.arp[i];
    if (a !== '.') this.voice(t.arpWave, freq(note(Number(a), 2)), time, stepLength * 0.8, 0.06, 3200);
    if (i === 0 && t.pad > 0) {
      for (const degree of [0, 2, 4]) {
        const f = freq(note(degree, 1));
        this.voice('sawtooth', f * 1.003, time, stepLength * 16, t.pad, 1400, 0.4);
        this.voice('sawtooth', f * 0.997, time, stepLength * 16, t.pad, 1400, 0.4);
      }
    }
  }

  private voice(type: OscillatorType, f: number, time: number, length: number, gain: number, cutoff: number, attack = 0.005): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = f;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.exponentialRampToValueAtTime(gain, time + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + length);
    osc.connect(filter).connect(amp).connect(this.out!);
    osc.start(time);
    osc.stop(time + length + 0.05);
  }

  private kick(time: number, gain: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.18);
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gain, time);
    amp.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
    osc.connect(amp).connect(this.out!);
    osc.start(time);
    osc.stop(time + 0.3);
  }

  private noiseHit(time: number, gain: number, type: BiquadFilterType, cutoff: number, length: number): void {
    const ctx = this.ctx!;
    const buffer = this.sfx.noiseBuffer;
    if (buffer == null) return;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = cutoff;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gain, time);
    amp.gain.exponentialRampToValueAtTime(0.001, time + length);
    src.connect(filter).connect(amp).connect(this.out!);
    src.start(time, Math.random() * 0.5);
    src.stop(time + length + 0.02);
  }

  private snare(time: number, gain: number): void {
    this.noiseHit(time, gain, 'bandpass', 1800, 0.16);
    this.voice('triangle', 190, time, 0.08, gain * 0.5, 2000);
  }

  private hat(time: number, gain: number): void {
    this.noiseHit(time, gain, 'highpass', 8000, 0.04);
  }
}
