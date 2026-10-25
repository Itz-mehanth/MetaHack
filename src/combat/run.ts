import { ENEMIES, type EnemyKind, type Mission, MISSIONS, type WaveDef } from './missions.js';

/**
 * Pure run state for one mission: phases, waves, health, score, combo.
 * Times are seconds of game time supplied by the caller.
 */

export type Phase = 'title' | 'intro' | 'fighting' | 'cleared' | 'victory' | 'defeat';

export const MAX_HEALTH = 5;
export const INTRO_SECONDS = 3;
export const CLEARED_SECONDS = 2.5;
export const RESULT_SECONDS = 5;
export const COMBO_WINDOW = 2.5;
/** Gap between enemies inside one spawn group. */
export const BURST_GAP = 0.18;

export interface SpawnOrder {
  kind: EnemyKind;
  speed: number;
}

export class Run {
  phase: Phase = 'title';
  mission: Mission = MISSIONS[0];
  wave = 0;
  health = MAX_HEALTH;
  score = 0;
  combo = 0;
  kills = 0;
  private phaseTime = 0;
  private spawned = 0;
  private alive = 0;
  private spawnTimer = 0;
  private burstLeft = 0;
  private comboTimer = 0;

  constructor(private readonly random: () => number = Math.random) {}

  get waveDef(): WaveDef {
    const waves = this.mission.waves;
    return waves[Math.min(this.wave, waves.length - 1)];
  }

  get totalWaves(): number {
    return this.mission.waves.length;
  }

  get aliveCount(): number {
    return this.alive;
  }

  /** Seconds spent in the current phase. */
  get elapsedInPhase(): number {
    return this.phaseTime;
  }

  /** Starts a fresh run of `mission` (defaults to the current one). */
  start(mission: Mission = this.mission): void {
    this.mission = mission;
    this.wave = 0;
    this.health = MAX_HEALTH;
    this.score = 0;
    this.combo = 0;
    this.kills = 0;
    this.alive = 0;
    this.enter('intro');
  }

  /** Abandons any run and returns to hero select. */
  toTitle(): void {
    this.alive = 0;
    this.combo = 0;
    this.enter('title');
  }

  /** Advances timers; returns a spawn order when an enemy should appear. */
  update(dt: number): SpawnOrder | null {
    this.phaseTime += dt;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
    if (this.phase === 'intro' && this.phaseTime >= INTRO_SECONDS) {
      this.spawned = 0;
      this.spawnTimer = 0;
      this.burstLeft = 0;
      this.enter('fighting');
    } else if (this.phase === 'cleared' && this.phaseTime >= CLEARED_SECONDS) {
      this.wave += 1;
      this.enter('intro');
    } else if ((this.phase === 'victory' || this.phase === 'defeat') && this.phaseTime >= RESULT_SECONDS) {
      this.toTitle();
    } else if (this.phase === 'fighting' && this.spawned < this.waveDef.count) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const def = this.waveDef;
        if (this.burstLeft <= 0) this.burstLeft = def.burst ?? 1;
        this.burstLeft -= 1;
        this.spawnTimer = this.burstLeft > 0 ? BURST_GAP : def.interval;
        this.spawned += 1;
        this.alive += 1;
        const kind = def.kinds[Math.min(def.kinds.length - 1, Math.floor(this.random() * def.kinds.length))];
        return { kind, speed: def.speed };
      }
    }
    return null;
  }

  /** Records a kill; returns true when it was the last enemy of the wave. */
  kill(kind: EnemyKind = 'drone'): boolean {
    if (this.phase !== 'fighting') return false;
    this.alive = Math.max(0, this.alive - 1);
    this.kills += 1;
    this.combo += 1;
    this.comboTimer = COMBO_WINDOW;
    this.score += ENEMIES[kind].score * Math.min(this.combo, 8);
    return this.checkWaveEnd();
  }

  /** An enemy reached the player and detonated. */
  hit(damage = 1): void {
    if (this.phase !== 'fighting') return;
    this.alive = Math.max(0, this.alive - 1);
    this.health -= damage;
    this.combo = 0;
    if (this.health <= 0) {
      this.health = 0;
      this.enter('defeat');
      return;
    }
    this.checkWaveEnd();
  }

  private checkWaveEnd(): boolean {
    if (this.spawned < this.waveDef.count || this.alive > 0) return false;
    this.enter(this.wave + 1 >= this.totalWaves ? 'victory' : 'cleared');
    return true;
  }

  private enter(phase: Phase): void {
    this.phase = phase;
    this.phaseTime = 0;
  }
}
