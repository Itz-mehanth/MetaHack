import type { Sfx } from './sfx.js';

/**
 * One sound design per weapon. Every weapon in the arsenal gets its own
 * recipe for the moments that matter: `fire` (a shot, a throw), `draw` (blades
 * coming out), `swing` (the air tearing) and `hit` (steel, fire or thunder
 * meeting something). Recipes are built from the synth blocks in sfx.ts
 * (sweeps, FM bells, gritty waveshaped tones, noise bursts, sub thumps) so no
 * audio file is ever downloaded. Rapid-fire weapons stay cheap: only a few
 * nodes per shot.
 */

export type WeaponPart = 'fire' | 'draw' | 'swing' | 'hit';

type Recipe = (s: Sfx, power: number) => void;
type Recipes = Partial<Record<WeaponPart, Recipe>>;

/** A minor pentatonic ladder, so VESPER's runes ring like a spell instrument. */
const RUNES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];
let rune = 0;
const nextRune = (): number => {
  rune = (rune + 1 + Math.floor(Math.random() * 3)) % RUNES.length;
  return RUNES[rune];
};

/** A scatter of tiny fire pops. */
const crackle = (s: Sfx, count: number, span: number, gain = 0.1): void => {
  for (let i = 0; i < count; i += 1) s.noiseSweep('highpass', 4500, 2200, 0.025, gain, 0.02 + Math.random() * span);
};

const RECIPES: Readonly<Record<string, Recipes>> = {
  // ------------------------------------------------------------ ARC
  'arc-repulsor': {
    fire: (s) => {
      s.tone('sawtooth', 2600, 180, 0.15, 0.13);
      s.fm(1200, 2.01, 900, 380, 0.11, 0.07);
      s.noiseSweep('highpass', 8000, 3000, 0.04, 0.26);
      s.thump(0.45, 0.14, 170);
      s.tone('sine', 120, 55, 0.12, 0.2, 0.01);
    },
  },
  'arc-beam': {
    // Played ten times a second: overlapping hums make one continuous beam.
    fire: (s) => {
      s.hum('sawtooth', 120, 108, 0.16, 0.2, 55, 0.7);
      s.grit('square', 440, 470, 0.12, 0.08, 6);
      s.noiseSweep('bandpass', 3200, 1800, 0.12, 0.2, 0, 0.1, 3);
    },
  },
  'arc-rockets': {
    fire: (s) => {
      for (let k = 0; k < 4; k += 1) {
        const d = k * 0.08;
        s.thump(0.5, 0.3, 95, d);
        s.noiseSweep('bandpass', 500, 2800, 0.45, 0.26, d, 0.1, 1.4);
        s.tone('sawtooth', 100 + k * 25, 360 + k * 40, 0.4, 0.07, d, 0.3);
      }
      s.noiseSweep('highpass', 4000, 9000, 0.5, 0.1, 0.1);
    },
  },

  // ------------------------------------------------------------ TALON
  'talon-steel': {
    draw: (s) => {
      s.shing();
      s.thump(0.15, 0.1, 200);
    },
    hit: (s) => {
      s.slash();
      s.metal(1500, 0.18, 0.04, 0.2);
    },
  },
  'talon-molten': {
    draw: (s) => {
      s.shing();
      s.noiseSweep('lowpass', 600, 4200, 0.4, 0.34, 0.02, 0.3, 0.8, 0.12);
      crackle(s, 5, 0.5);
    },
    hit: (s) => {
      s.slash();
      s.thump(0.35, 0.2, 90);
      s.noiseSweep('lowpass', 2500, 300, 0.3, 0.3, 0.02, 0.2);
      crackle(s, 4, 0.3, 0.12);
    },
  },
  'talon-phase': {
    draw: (s) => {
      s.metal(2400, 0.8, 0.05, 0.5);
      s.fm(1800, 1.5, 400, 3000, 0.5, 0.05, 0, 0.5);
      s.noiseSweep('highpass', 3000, 9000, 0.4, 0.18, 0, 0.3, 0.8, 0.25);
    },
    hit: (s) => {
      s.noiseSweep('bandpass', 3000, 800, 0.15, 0.35, 0, 0.3, 3);
      s.tone('sine', 1800, 300, 0.18, 0.1, 0, 0.3);
      s.thump(0.2, 0.1, 150);
    },
  },

  // ------------------------------------------------------------ TEMPEST
  'tempest-thunder': {
    fire: (s) => {
      s.crescent();
      s.hum('sawtooth', 70, 140, 0.45, 0.06, 18, 0.6, 0.1, 0.4);
    },
    hit: (s) => s.thunderHit(),
  },
  'tempest-inferno': {
    fire: (s) => {
      s.crescent();
      s.noiseSweep('lowpass', 400, 2600, 0.5, 0.3, 0, 0.3, 0.8, 0.1);
    },
    hit: (s) => {
      s.noiseSweep('lowpass', 3500, 80, 1.0, 0.7, 0, 0.5);
      s.fm(150, 1, 100, 38, 0.8, 0.28);
      s.thump(0.7, 0.6, 110);
      crackle(s, 8, 0.7, 0.14);
    },
  },
  'tempest-godbreaker': {
    fire: (s) => {
      s.crescent();
      s.tone('sawtooth', 60, 30, 0.7, 0.2, 0, 0.5);
    },
    hit: (s) => {
      s.thump(1.0, 1.1, 75);
      s.thump(0.6, 0.5, 130, 0.04);
      s.metal(110, 1.5, 0.13, 0.8);
      s.noiseSweep('lowpass', 1500, 40, 1.7, 0.75, 0, 0.7);
      s.noiseSweep('highpass', 7000, 1500, 0.2, 0.5, 0.01, 0.4);
      for (let i = 0; i < 6; i += 1) s.noiseSweep('bandpass', 1500, 500, 0.08, 0.14, 0.2 + Math.random() * 0.7, 0.3, 1);
    },
  },

  // ------------------------------------------------------------ ORION
  'orion-longbow': {
    fire: (s, p) => {
      s.twang(p);
      s.noiseSweep('bandpass', 1500, 5000, 0.3, 0.1 + 0.1 * p, 0.02, 0.1, 2);
    },
  },
  'orion-volley': {
    fire: (s, p) => {
      s.twang(p);
      s.tone('triangle', 260 + p * 120, 110, 0.22, 0.14, 0.06);
      s.tone('triangle', 320 + p * 120, 130, 0.22, 0.12, 0.12);
      s.noiseSweep('bandpass', 1800, 6000, 0.4, 0.14, 0.02, 0.2, 2);
    },
  },
  'orion-blast': {
    fire: (s, p) => {
      s.twang(p);
      s.tone('sawtooth', 300, 900, 0.5, 0.04, 0.05, 0.2);
      s.noiseSweep('highpass', 5000, 8000, 0.5, 0.08);
      s.thump(0.3, 0.2, 100, 0.02);
    },
  },
  'orion-storm': {
    fire: (s, p) => {
      s.twang(p);
      s.grit('square', 3000, 400, 0.18, 0.08, 8);
      crackle(s, 5, 0.25, 0.14);
      s.fm(2200, 3, 1500, 600, 0.3, 0.05, 0.02, 0.4);
    },
  },

  // ------------------------------------------------------------ WEAVER
  'weaver-silk': {
    fire: (s) => s.thwip(),
  },
  'weaver-electro': {
    fire: (s) => {
      s.thwip();
      s.hum('square', 90, 70, 0.3, 0.07, 70, 1);
      s.grit('sawtooth', 2400, 300, 0.12, 0.06, 7, 0.03);
    },
  },
  'weaver-burst': {
    fire: (s) => {
      s.thwip();
      s.noiseSweep('highpass', 1500, 6000, 0.28, 0.3, 0.03, 0.2, 0.7);
      s.tone('sine', 700, 200, 0.2, 0.1, 0.03);
    },
  },

  // ------------------------------------------------------------ HAVOC
  'havoc-pistol': {
    fire: (s) => {
      s.tone('sawtooth', 900, 70, 0.13, 0.16);
      s.noiseSweep('bandpass', 3600, 900, 0.05, 0.4, 0, 0, 1.2);
      s.thump(0.55, 0.16, 120);
      s.metal(2100, 0.25, 0.03, 0.3);
    },
  },
  'havoc-smg': {
    fire: (s) => {
      s.noiseSweep('bandpass', 4200, 1800, 0.04, 0.5, 0, 0, 1.5);
      s.tone('square', 1700 + Math.random() * 300, 700, 0.04, 0.09);
      s.thump(0.25, 0.06, 200);
    },
  },
  'havoc-shotgun': {
    fire: (s) => {
      s.shotgun();
      s.metal(190, 0.5, 0.05, 0.5);
    },
  },
  'havoc-minigun': {
    fire: (s) => {
      s.thump(0.22, 0.07, 140);
      s.noiseSweep('lowpass', 3000, 600, 0.06, 0.28);
      s.tone('sawtooth', 70, 55, 0.07, 0.08);
    },
  },
  'havoc-launcher': {
    fire: (s) => {
      s.launch();
      s.tone('sawtooth', 70, 35, 0.4, 0.2);
    },
  },

  // ------------------------------------------------------------ RONIN
  'ronin-katana': {
    draw: (s) => s.shing(),
    swing: (s) => {
      s.swish();
      s.tone('sine', 900, 2400, 0.1, 0.05);
    },
    hit: (s) => {
      s.slash();
      s.metal(2000, 0.2, 0.04, 0.25);
    },
  },
  'ronin-flame': {
    draw: (s) => {
      s.shing();
      s.noiseSweep('lowpass', 500, 4000, 0.35, 0.3, 0.03, 0.3, 0.8, 0.1);
      crackle(s, 4, 0.4);
    },
    swing: (s) => {
      s.swish();
      s.noiseSweep('lowpass', 500, 2500, 0.25, 0.2, 0, 0.1, 0.8, 0.05);
    },
    hit: (s) => {
      s.slash();
      s.thump(0.3, 0.2, 90);
      crackle(s, 5, 0.3, 0.13);
    },
  },
  'ronin-void': {
    draw: (s) => {
      s.shing();
      s.fm(300, 0.5, 200, 60, 0.7, 0.12, 0, 0.6);
    },
    swing: (s) => {
      s.swish();
      s.tone('sine', 400, 120, 0.3, 0.12, 0, 0.4);
      s.fm(220, 1.5, 150, 80, 0.3, 0.06);
    },
    hit: (s) => {
      s.slash();
      s.grit('sawtooth', 2000, 200, 0.16, 0.1, 6);
      s.noiseSweep('bandpass', 4000, 300, 0.2, 0.3, 0, 0.4, 3);
    },
  },

  // ------------------------------------------------------------ VANGUARD
  'vanguard-aegis': {
    fire: (s) => {
      s.hum('triangle', 500, 900, 0.5, 0.12, 22, 0.5, 0, 0.2);
      s.noiseSweep('bandpass', 700, 3000, 0.4, 0.2, 0, 0.1, 1.5, 0.05);
    },
    hit: (s) => s.clang(),
  },
  'vanguard-solar': {
    fire: (s) => {
      s.hum('triangle', 500, 900, 0.5, 0.1, 22, 0.5, 0, 0.2);
      s.noiseSweep('lowpass', 600, 3000, 0.45, 0.28, 0, 0.2, 0.8, 0.08);
      crackle(s, 4, 0.4);
    },
    hit: (s) => {
      s.clang();
      crackle(s, 4, 0.3, 0.12);
    },
  },
  'vanguard-storm': {
    fire: (s) => {
      s.hum('triangle', 500, 900, 0.5, 0.1, 22, 0.5, 0, 0.2);
      s.grit('square', 2800, 500, 0.15, 0.07, 8, 0.05);
      crackle(s, 4, 0.3, 0.14);
    },
    hit: (s) => {
      s.clang();
      s.grit('sawtooth', 2400, 300, 0.14, 0.08, 7);
    },
  },

  // ------------------------------------------------------------ VESPER
  'vesper-sigil': {
    fire: (s) => {
      const f = nextRune();
      s.fm(f, 3.01, f * 0.6, f * 0.98, 0.35, 0.17, 0, 0.5);
      s.tone('sine', f * 2, f * 2, 0.25, 0.06, 0.02, 0.5);
      s.noiseSweep('highpass', 6000, 9000, 0.08, 0.1);
    },
  },
  'vesper-astral': {
    fire: (s) => {
      const f = nextRune() * 0.5;
      s.fm(f, 2, f * 0.8, f * 3, 0.45, 0.09, 0, 0.6);
      s.tone('triangle', f * 2, f * 4, 0.4, 0.04, 0.05, 0.5);
      s.noiseSweep('highpass', 5000, 10000, 0.3, 0.07, 0, 0.3, 0.8, 0.15);
    },
  },
  'vesper-nova': {
    fire: (s) => {
      const f = nextRune();
      s.fm(f, 3.01, f * 0.6, f * 0.98, 0.35, 0.08, 0, 0.5);
      s.thump(0.4, 0.3, 85, 0.02);
      s.noiseSweep('lowpass', 2000, 100, 0.3, 0.22, 0.04, 0.4);
      s.tone('sine', f * 0.5, f * 0.25, 0.5, 0.06, 0.1, 0.6);
    },
  },

  // ------------------------------------------------------------ PSION
  'psion-mind': {
    fire: (s) => {
      s.fm(180, 1, 120, 40, 0.5, 0.15, 0, 0.5);
      s.noiseSweep('lowpass', 1800, 150, 0.35, 0.25, 0, 0.3);
    },
  },
  'psion-inferno': {
    fire: (s) => {
      s.fm(180, 1, 120, 40, 0.5, 0.13, 0, 0.5);
      s.noiseSweep('lowpass', 600, 3500, 0.4, 0.3, 0, 0.3, 0.8, 0.1);
      crackle(s, 5, 0.5);
    },
  },
};

const FALLBACK: Readonly<Record<WeaponPart, (s: Sfx, power: number) => void>> = {
  fire: (s) => s.blast(),
  draw: (s) => s.shing(),
  swing: (s) => s.swish(),
  hit: (s) => s.slash(),
};

/** Every weapon id with a sound design (the audition page lists these). */
export const WEAPON_SOUND_IDS: readonly string[] = Object.keys(RECIPES);

/** The parts a weapon has its own sound for. */
export function weaponParts(id: string): WeaponPart[] {
  return Object.keys(RECIPES[id] ?? {}) as WeaponPart[];
}

/** Plays `part` of weapon `id`; unknown weapons or parts fall back to the generic sound. */
export function playWeapon(s: Sfx, id: string, part: WeaponPart, power: number): void {
  (RECIPES[id]?.[part] ?? FALLBACK[part])(s, power);
}
