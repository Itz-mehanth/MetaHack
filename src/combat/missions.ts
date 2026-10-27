/** Pure enemy and wave data. No Three.js; numbers are metres/seconds. */

/**
 * Enemy kinds. The walking Hollow Legion aliens keep their original ids:
 * drone = Grunt (rifle), armored = Brute (heavy), swarmer = Stalker
 * (melee sprinter), titan = Colossus (giant cannon), blade = Reaver
 * (energy swordsman). flyer = a creature that circles overhead, spits
 * plasma and dive-bombs (creatures only). boss, orb (enemy shot) and pod
 * (hostage cage) are special.
 */
export type EnemyKind = 'drone' | 'armored' | 'swarmer' | 'titan' | 'blade' | 'flyer' | 'boss' | 'orb' | 'pod';

export interface EnemyDef {
  readonly name: string;
  readonly hp: number;
  /** Hit radius in metres, around the torso. */
  readonly radius: number;
  /** Melee: distance from the head at which it starts its lunge (0 = never). */
  readonly chargeDistance: number;
  readonly chargeTime: number;
  /** Side-to-side sway (m/s) while approaching. */
  readonly weave: number;
  /** Damage dealt to the player by a lunge or a shot. */
  readonly damage: number;
  readonly score: number;
  /** Walks on the floor; `chest` is its torso height above the floor. */
  readonly ground?: { readonly chest: number; readonly stopDistance: number; readonly fireInterval: number; readonly shotSpeed: number; readonly shots: number };
}

export const ENEMIES: Readonly<Record<EnemyKind, EnemyDef>> = {
  drone: {
    name: 'GRUNT',
    hp: 1,
    radius: 0.32,
    chargeDistance: 0,
    chargeTime: 99,
    weave: 0.15,
    damage: 1,
    score: 100,
    ground: { chest: 1.15, stopDistance: 2.6, fireInterval: 3.2, shotSpeed: 2.6, shots: 1 },
  },
  armored: {
    name: 'BRUTE',
    hp: 3,
    radius: 0.4,
    chargeDistance: 0,
    chargeTime: 99,
    weave: 0.1,
    damage: 1,
    score: 250,
    ground: { chest: 1.32, stopDistance: 2.2, fireInterval: 2.6, shotSpeed: 3, shots: 2 },
  },
  swarmer: {
    name: 'STALKER',
    hp: 1,
    radius: 0.3,
    chargeDistance: 0.85,
    chargeTime: 0.45,
    weave: 0.5,
    damage: 1,
    score: 80,
    ground: { chest: 1.0, stopDistance: 0, fireInterval: 0, shotSpeed: 0, shots: 0 },
  },
  titan: {
    name: 'COLOSSUS',
    hp: 8,
    radius: 0.6,
    chargeDistance: 0,
    chargeTime: 99,
    weave: 0.05,
    damage: 2,
    score: 700,
    ground: { chest: 1.72, stopDistance: 3.2, fireInterval: 3.6, shotSpeed: 2.2, shots: 3 },
  },
  blade: {
    name: 'REAVER',
    hp: 3,
    radius: 0.34,
    chargeDistance: 0,
    chargeTime: 99,
    weave: 0.25,
    damage: 1,
    score: 300,
    ground: { chest: 1.17, stopDistance: 0, fireInterval: 0, shotSpeed: 0, shots: 0 },
  },
  /** Airborne creature: no `ground`; circles the player, shoots, then dives. */
  flyer: { name: 'FLYER', hp: 3, radius: 0.42, chargeDistance: 0, chargeTime: 99, weave: 0, damage: 1, score: 200 },
  boss: { name: 'BOSS', hp: 40, radius: 0.85, chargeDistance: 0, chargeTime: 99, weave: 0, damage: 3, score: 5000 },
  orb: { name: 'SHOT', hp: 1, radius: 0.1, chargeDistance: 0.35, chargeTime: 0.05, weave: 0, damage: 1, score: 25 },
  /** Hostage pod: never moves or attacks; destroying it frees the civilian. */
  pod: { name: 'CAGE', hp: 3, radius: 0.24, chargeDistance: 0, chargeTime: 99, weave: 0, damage: 0, score: 300 },
};

export interface WaveDef {
  readonly count: number;
  /** Seconds between spawn groups. */
  readonly interval: number;
  readonly speed: number;
  /** Enemy kinds drawn at random for each spawn; repeat an entry to weight it. */
  readonly kinds: readonly EnemyKind[];
  /** Enemies per spawn group (swarms arrive in packs). */
  readonly burst?: number;
  /** Most enemies of this wave on the field at once; the rest wait their turn. */
  readonly alive?: number;
  /** The region's boss joins this wave; it must fall before the wave ends. */
  readonly boss?: boolean;
  /** A giant elite of this kind closes the level (non-boss levels). */
  readonly champion?: EnemyKind;
}
