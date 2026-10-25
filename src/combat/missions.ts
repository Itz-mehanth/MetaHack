/** Pure enemy and wave data. No Three.js; numbers are metres/seconds. */

export type EnemyKind = 'drone' | 'armored' | 'swarmer' | 'titan';

export interface EnemyDef {
  readonly hp: number;
  /** Hit radius in metres. */
  readonly radius: number;
  /** Distance from the head at which it starts its self-destruct charge. */
  readonly chargeDistance: number;
  readonly chargeTime: number;
  /** Side-to-side weave amplitude (m/s) while approaching. */
  readonly weave: number;
  /** Damage dealt to the player when the charge completes. */
  readonly damage: number;
  readonly score: number;
}

export const ENEMIES: Readonly<Record<EnemyKind, EnemyDef>> = {
  drone: { hp: 1, radius: 0.16, chargeDistance: 0.75, chargeTime: 0.9, weave: 0.25, damage: 1, score: 100 },
  armored: { hp: 2, radius: 0.21, chargeDistance: 0.75, chargeTime: 0.9, weave: 0.2, damage: 1, score: 200 },
  swarmer: { hp: 1, radius: 0.12, chargeDistance: 0.6, chargeTime: 0.5, weave: 0.9, damage: 1, score: 80 },
  titan: { hp: 6, radius: 0.38, chargeDistance: 1.1, chargeTime: 1.6, weave: 0.1, damage: 2, score: 600 },
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
}
