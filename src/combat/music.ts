import type { Sfx } from './sfx.js';

/**
 * Track definitions: each world's tempo, key, scale, chord loop, drum
 * patterns and arpeggio. The engine below turns them into a full score.
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
/** Japanese-flavoured pentatonic (hirajoshi), extended to seven degrees. */
const HIRAJOSHI = [0, 2, 3, 7, 8, 12, 14];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];

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
  'iron-bastion': {
    bpm: 108,
    root: 43,
    scale: MINOR,
    chords: [0, 5, 3, 4],
    kick: 'x...x...x...x...',
    snare: '....x..o....x.oo',
    hat: 'x.x.x.x.x.x.x.x.',
    arp: '0.0.4.0.7.0.4.2.',
    arpWave: 'square',
    bassWave: 'sawtooth',
    bassCutoff: 700,
    pad: 0.04,
  },
  oblivion: {
    bpm: 132,
    root: 33,
    scale: PHRYGIAN,
    chords: [0, 1, 0, 4],
    kick: 'x...x...x...x.x.',
    snare: '....x.......x...',
    hat: 'xoxoxoxoxoxoxoxo',
    arp: '0.1.4.1.0.1.5.4.',
    arpWave: 'sawtooth',
    bassWave: 'sawtooth',
    bassCutoff: 550,
    pad: 0.07,
  },
  'moon-temple': {
    bpm: 116,
    root: 40,
    scale: HIRAJOSHI,
    chords: [0, 3, 0, 4],
    kick: 'x.....x...x.....',
    snare: '....x.......x.x.',
    hat: '..x...x...x...xx',
    arp: '0.2.4.3.0.2.6.4.',
    arpWave: 'triangle',
    bassWave: 'sawtooth',
    bassCutoff: 600,
    pad: 0.04,
  },
  'sky-ruins': {
    bpm: 96,
    root: 41,
    scale: LYDIAN,
    chords: [0, 1, 5, 4],
    kick: 'x.......x...x...',
    snare: '....x.......x...',
    hat: 'o.o.o.o.o.o.o.o.',
    arp: '0.4.6.4.0.4.6.5.',
    arpWave: 'sine',
    bassWave: 'triangle',
    bassCutoff: 500,
    pad: 0.07,
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
/** Bars in one song loop: intro 0-3, full 4-11, climax 12-15. */
const SONG_BARS = 16;

function freq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Seeded PRNG so each track always gets the same melody. */
function seeded(text: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** A four-bar lead melody: per 16th step, a scale degree or null. */
function compose(name: string): (number | null)[] {
  const random = seeded(name);
  const rhythms = ['x.x.x..xx...x.x.', 'x..x..x.x.x.x...', 'x...x.xxx...x...', 'x.xx..x.x..xx...'];
  const melody: (number | null)[] = [];
  let degree = 4;
  for (let bar = 0; bar < 4; bar += 1) {
    const rhythm = rhythms[Math.floor(random() * rhythms.length)];
    for (let i = 0; i < 16; i += 1) {
      if (rhythm[i] !== 'x') {
        melody.push(null);
        continue;
      }
      // A singable random walk, resolving home at the end of the phrase.
      degree = Math.max(0, Math.min(9, degree + Math.round((random() - 0.5) * 4)));
      melody.push(bar === 3 && i >= 12 ? 0 : degree);
    }
  }
  return melody;
}

interface Voice {
  type: OscillatorType;
  freqs: number[];
  time: number;
  length: number;
  gain: number;
  cutoff: number;
  attack?: number;
  /** Filter opens from `cutoff` to this and back (brass). */
  open?: number;
  reverb?: number;
  delay?: number;
  vibrato?: number;
  filter?: BiquadFilterType;
  q?: number;
}

/**
 * Cinematic adventure score, synthesised live: epic drums (kick, snare,
 * war drums, toms, crash), sub bass, a detuned string section, brass
 * stabs, a choir pad, bells, an arpeggio and a lead melody unique to each
 * track, all through a shared reverb and a tempo-synced echo. Each track
 * plays as a 16-bar song (intro, full, climax with a drum fill), and the
 * arrangement follows the action: calm in menus, full in combat, huge at
 * bosses (`setIntensity`). Tracks switch on the next bar.
 */
export class Music {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private reverbIn: GainNode | null = null;
  private delayIn: GainNode | null = null;
  private delay: DelayNode | null = null;
  private track: TrackDef | null = null;
  private trackName = '';
  private pending: TrackDef | null = null;
  private pendingName = '';
  private melody: (number | null)[] = [];
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;
  private intensity = 0;

  constructor(private readonly sfx: Sfx) {
    sfx.onReady((ctx) => {
      this.ctx = ctx;
      this.out = sfx.musicOut;
      this.buildBus(ctx);
      if (this.pending) this.start();
    });
  }

  /** 0 calm (menus), 1 combat, 2 boss. Takes effect on the next step. */
  setIntensity(level: number): void {
    this.intensity = level;
  }

  /** Switches to `name` at the next bar (or now if nothing is playing). */
  play(name: string): void {
    const def = TRACKS[name] ?? TRACKS.menu;
    if (def === this.track && this.timer != null) return;
    this.pending = def;
    this.pendingName = name;
    if (this.ctx && this.timer == null) this.start();
  }

  stop(): void {
    if (this.timer != null) window.clearInterval(this.timer);
    this.timer = null;
    this.track = null;
  }

  /** Reverb (generated impulse) and a feedback echo, both into the music bus. */
  private buildBus(ctx: AudioContext): void {
    const out = this.out!;
    const seconds = 2.8;
    const length = Math.floor(ctx.sampleRate * seconds);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let c = 0; c < 2; c += 1) {
      const data = impulse.getChannelData(c);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.6);
    }
    const convolver = ctx.createConvolver();
    convolver.buffer = impulse;
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    this.reverbIn = ctx.createGain();
    this.reverbIn.connect(convolver).connect(wet).connect(out);
    this.delay = ctx.createDelay(2);
    const feedback = ctx.createGain();
    feedback.gain.value = 0.38;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2600;
    this.delayIn = ctx.createGain();
    this.delayIn.connect(this.delay);
    this.delay.connect(tone).connect(feedback).connect(this.delay);
    const delayOut = ctx.createGain();
    delayOut.gain.value = 0.5;
    tone.connect(delayOut).connect(out);
    tone.connect(this.reverbIn);
  }

  private start(): void {
    if (this.ctx == null || this.timer != null) return;
    this.switchTrack();
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 50);
  }

  private switchTrack(): void {
    this.track = this.pending;
    this.trackName = this.pendingName;
    this.pending = null;
    this.melody = compose(this.trackName);
    // Dotted-eighth echo, in time with the track.
    if (this.track && this.delay && this.ctx) this.delay.delayTime.setValueAtTime((60 / this.track.bpm) * 0.75, this.ctx.currentTime);
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (ctx == null || this.track == null) return;
    while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
      if (this.step % 16 === 0 && this.pending) {
        this.switchTrack();
        this.step = 0;
      }
      this.playStep(this.track!, this.step, this.nextTime);
      this.nextTime += 60 / this.track!.bpm / 4;
      this.step += 1;
    }
  }

  private playStep(t: TrackDef, step: number, time: number): void {
    const i = step % 16;
    const songBar = Math.floor(step / 16) % SONG_BARS;
    const chord = t.chords[songBar % t.chords.length];
    const sixteenth = 60 / t.bpm / 4;
    const bar = sixteenth * 16;
    const level = this.trackName === 'menu' ? 0 : this.intensity;
    const intro = songBar < 4;
    const climax = songBar >= 12;
    const note = (degree: number, octave: number) => {
      const d = chord + degree;
      const n = t.scale.length;
      const scaleIndex = ((d % n) + n) % n;
      return t.root + t.scale[scaleIndex] + 12 * (octave + Math.floor(d / n));
    };
    const melodyNote = (degree: number, octave: number) => {
      const n = t.scale.length;
      return t.root + t.scale[((degree % n) + n) % n] + 12 * (octave + Math.floor(degree / n));
    };

    // ---- drums
    if (level === 0) {
      // Calm: a distant war drum on the bar, a soft pulse.
      if (i === 0) this.taiko(time, 0.35);
      if (i === 8 && songBar % 2 === 1) this.taiko(time, 0.2);
    } else {
      const kickHit = t.kick[i] !== '.' && !(intro && i % 8 !== 0);
      if (kickHit) this.kick(time, t.kick[i] === 'x' ? 0.85 : 0.45);
      if (!intro && t.snare[i] !== '.') this.snare(time, t.snare[i] === 'x' ? 0.32 : 0.16, climax);
      const hats = level === 2 ? true : t.hat[i] !== '.';
      if (!intro && hats) this.hat(time, t.hat[i] === 'x' || level === 2 ? 0.08 : 0.045);
      if ((level === 2 || climax) && i % 4 === 0) this.taiko(time, level === 2 ? 0.55 : 0.4);
      if (i === 0 && (songBar === 0 || songBar === 4 || songBar === 12)) this.crash(time);
      // Drum fill into the next loop.
      if (songBar === SONG_BARS - 1 && i >= 8) this.tom(time, 220 - (i - 8) * 14, 0.3 + (i - 8) * 0.03);
      if (songBar === 11 && i >= 12) this.snare(time, 0.12 + (i - 12) * 0.05, false);
    }

    // ---- bass: sub + saw, eighths in combat, long notes when calm
    if (level === 0) {
      if (i === 0) this.voice({ type: 'sine', freqs: [freq(note(0, -1))], time, length: bar, gain: 0.22, cutoff: 400, attack: 0.3 });
    } else if (i % 2 === 0) {
      const f = freq(note(0, 0));
      this.voice({ type: t.bassWave, freqs: [f], time, length: sixteenth * 1.9, gain: 0.16, cutoff: t.bassCutoff * 1.6, open: t.bassCutoff * 3 });
      if (i % 4 === 0) this.voice({ type: 'sine', freqs: [f / 2], time, length: sixteenth * 3.8, gain: 0.2, cutoff: 300 });
    }

    // ---- strings (and choir at bosses): a new chord each bar
    if (i === 0) {
      const strings = [0, 2, 4].map((d) => freq(note(d, 1)));
      this.voice({ type: 'sawtooth', freqs: strings.flatMap((f) => [f * 0.996, f, f * 1.004]), time, length: bar * 1.05, gain: 0.018 + t.pad * 0.3, cutoff: level === 0 ? 1100 : 1800, attack: level === 0 ? 1.2 : 0.5, reverb: 0.6 });
      if (level === 2 || this.trackName === 'oblivion') {
        const choir = [0, 2, 4].map((d) => freq(note(d, 1)));
        for (const formant of [720, 1150]) {
          this.voice({ type: 'sawtooth', freqs: choir, time, length: bar, gain: 0.05, cutoff: formant, filter: 'bandpass', q: 6, attack: 0.7, reverb: 0.8 });
        }
      }
    }

    // ---- brass stabs: heroic hits in combat
    if (level >= 1 && !intro && (i === 0 || (i === 6 && (climax || level === 2)))) {
      const brass = [0, 2, 4].map((d) => freq(note(d, 1)));
      this.voice({ type: 'sawtooth', freqs: brass.flatMap((f) => [f * 0.997, f * 1.003]), time, length: sixteenth * (i === 0 ? 5 : 3), gain: 0.05, cutoff: 350, open: 2600, attack: 0.03, reverb: 0.35 });
    }

    // ---- arpeggio through the echo
    const a = t.arp[i];
    if (a !== '.' && (level >= 1 || i % 4 === 0)) {
      this.voice({ type: t.arpWave, freqs: [freq(note(Number(a), 2))], time, length: sixteenth * 0.9, gain: level === 0 ? 0.03 : 0.045, cutoff: 3000, delay: 0.35, reverb: 0.2 });
    }

    // ---- lead melody (climax; also as bells when calm)
    const m = this.melody[(songBar % 4) * 16 + i];
    if (m != null) {
      if (level === 0 && !intro) this.bell(time, freq(melodyNote(m, 2)), 0.06);
      else if (level >= 1 && climax) {
        this.voice({ type: 'sawtooth', freqs: [freq(melodyNote(m, 2)) * 0.998, freq(melodyNote(m, 2)) * 1.002], time, length: sixteenth * 2.6, gain: 0.05, cutoff: 2600, attack: 0.02, vibrato: 5, delay: 0.3, reverb: 0.35 });
      }
    }
  }

  private connect(node: AudioNode, reverb = 0, delay = 0): void {
    const ctx = this.ctx!;
    node.connect(this.out!);
    if (reverb > 0 && this.reverbIn) {
      const send = ctx.createGain();
      send.gain.value = reverb;
      node.connect(send).connect(this.reverbIn);
    }
    if (delay > 0 && this.delayIn) {
      const send = ctx.createGain();
      send.gain.value = delay;
      node.connect(send).connect(this.delayIn);
    }
  }

  private voice(v: Voice): void {
    const ctx = this.ctx!;
    const filter = ctx.createBiquadFilter();
    filter.type = v.filter ?? 'lowpass';
    filter.Q.value = v.q ?? 0.7;
    filter.frequency.setValueAtTime(v.cutoff, v.time);
    if (v.open) {
      filter.frequency.exponentialRampToValueAtTime(v.open, v.time + Math.min(0.12, v.length * 0.3));
      filter.frequency.exponentialRampToValueAtTime(v.cutoff * 1.2, v.time + v.length);
    }
    const amp = ctx.createGain();
    const attack = v.attack ?? 0.005;
    amp.gain.setValueAtTime(0.0001, v.time);
    amp.gain.exponentialRampToValueAtTime(v.gain, v.time + attack);
    amp.gain.setValueAtTime(v.gain, v.time + Math.max(attack, v.length * 0.6));
    amp.gain.exponentialRampToValueAtTime(0.0001, v.time + v.length);
    filter.connect(amp);
    this.connect(amp, v.reverb, v.delay);
    let lfo: OscillatorNode | null = null;
    if (v.vibrato) {
      lfo = ctx.createOscillator();
      lfo.frequency.value = v.vibrato;
      const depth = ctx.createGain();
      depth.gain.value = v.freqs[0] * 0.006;
      lfo.connect(depth);
      lfo.start(v.time);
      lfo.stop(v.time + v.length + 0.05);
      for (const f of v.freqs) {
        const osc = ctx.createOscillator();
        osc.type = v.type;
        osc.frequency.value = f;
        depth.connect(osc.frequency);
        osc.connect(filter);
        osc.start(v.time);
        osc.stop(v.time + v.length + 0.05);
      }
      return;
    }
    for (const f of v.freqs) {
      const osc = ctx.createOscillator();
      osc.type = v.type;
      osc.frequency.value = f;
      osc.connect(filter);
      osc.start(v.time);
      osc.stop(v.time + v.length + 0.05);
    }
  }

  private noiseHit(time: number, gain: number, type: BiquadFilterType, cutoff: number, length: number, reverb = 0): void {
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
    src.connect(filter).connect(amp);
    this.connect(amp, reverb);
    src.start(time, Math.random() * 0.5);
    src.stop(time + length + 0.02);
  }

  private drum(time: number, from: number, to: number, length: number, gain: number, reverb = 0): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(from, time);
    osc.frequency.exponentialRampToValueAtTime(to, time + length * 0.6);
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gain, time);
    amp.gain.exponentialRampToValueAtTime(0.001, time + length);
    osc.connect(amp);
    this.connect(amp, reverb);
    osc.start(time);
    osc.stop(time + length + 0.02);
  }

  /** Punchy kick: pitch-swept body and a click. */
  private kick(time: number, gain: number): void {
    this.drum(time, 170, 42, 0.3, gain);
    this.noiseHit(time, gain * 0.25, 'highpass', 3000, 0.012);
  }

  private snare(time: number, gain: number, big: boolean): void {
    this.noiseHit(time, gain, 'bandpass', 1900, big ? 0.22 : 0.15, 0.3);
    this.drum(time, 240, 160, 0.1, gain * 0.6);
  }

  private hat(time: number, gain: number): void {
    this.noiseHit(time, gain, 'highpass', 8500, 0.035);
  }

  /** Big low war drum. */
  private taiko(time: number, gain: number): void {
    this.drum(time, 110, 52, 0.55, gain, 0.4);
    this.noiseHit(time, gain * 0.4, 'lowpass', 500, 0.12);
  }

  private tom(time: number, pitch: number, gain: number): void {
    this.drum(time, pitch, pitch * 0.6, 0.25, gain, 0.25);
  }

  private crash(time: number): void {
    this.noiseHit(time, 0.12, 'highpass', 5500, 1.6, 0.5);
  }

  /** Bell: a sine with an inharmonic partial, long ring through the echo. */
  private bell(time: number, f: number, gain: number): void {
    this.voice({ type: 'sine', freqs: [f], time, length: 1.4, gain, cutoff: 6000, delay: 0.4, reverb: 0.5 });
    this.voice({ type: 'sine', freqs: [f * 2.76], time, length: 0.5, gain: gain * 0.3, cutoff: 8000, reverb: 0.3 });
  }
}
