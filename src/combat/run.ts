/**
 * Pure run state for the wave shooter: phases, waves, health, score, combo.
 * Times are seconds of game time supplied by the caller.
 */

export type Phase = 'title' | 'intro' | 'fighting' | 'cleared' | 'victory' | 'defeat';

export interface WaveDef {
  readonly count: number;
  readonly interval: number;
  readonly speed: number;
  /** Share of drones (0..1) that are armored and take two hits. */
  readonly armored: number;
}

export const WAVES: readonly WaveDef[] = [
  { count: 4, interval: 1.8, speed: 0.7, armored: 0 },
  { count: 6, interval: 1.5, speed: 0.8, armored: 0 },
  { count: 8, interval: 1.3, speed: 0.9, armored: 0.25 },
  { count: 10, interval: 1.1, speed: 1.0, armored: 0.35 },
  { count: 12, interval: 0.9, speed: 1.1, armored: 0.5 },
];

export const MAX_HEALTH = 5;
export const INTRO_SECONDS = 2.5;
export const CLEARED_SECONDS = 2.5;
export const COMBO_WINDOW = 2.5;

export interface SpawnOrder {
  armored: boolean;
  speed: number;
}

export class Run {
  phase: Phase = 'title';
  wave = 0;
  health = MAX_HEALTH;
  score = 0;
  combo = 0;
  kills = 0;
  private phaseTime = 0;
  private spawned = 0;
  private alive = 0;
  private spawnTimer = 0;
  private comboTimer = 0;

  constructor(private readonly random: () => number = Math.random) {}

  get waveDef(): WaveDef {
    return WAVES[Math.min(this.wave, WAVES.length - 1)];
  }

  get totalWaves(): number {
    return WAVES.length;
  }

  get aliveCount(): number {
    return this.alive;
  }

  /** Seconds spent in the current phase. */
  get elapsedInPhase(): number {
    return this.phaseTime;
  }

  /** Starts a fresh run from the title, victory or defeat screen. */
  start(): void {
    this.wave = 0;
    this.health = MAX_HEALTH;
    this.score = 0;
    this.combo = 0;
    this.kills = 0;
    this.alive = 0;
    this.enter('intro');
  }

  /** Advances timers; returns a spawn order when a drone should appear. */
  update(dt: number): SpawnOrder | null {
    this.phaseTime += dt;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
    if (this.phase === 'intro' && this.phaseTime >= INTRO_SECONDS) {
      this.spawned = 0;
      this.spawnTimer = 0;
      this.enter('fighting');
    } else if (this.phase === 'cleared' && this.phaseTime >= CLEARED_SECONDS) {
      this.wave += 1;
      this.enter('intro');
    } else if (this.phase === 'fighting' && this.spawned < this.waveDef.count) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = this.waveDef.interval;
        this.spawned += 1;
        this.alive += 1;
        return { armored: this.random() < this.waveDef.armored, speed: this.waveDef.speed };
      }
    }
    return null;
  }

  /** Records a kill; returns true when it was the last drone of the wave. */
  kill(): boolean {
    if (this.phase !== 'fighting') return false;
    this.alive = Math.max(0, this.alive - 1);
    this.kills += 1;
    this.combo += 1;
    this.comboTimer = COMBO_WINDOW;
    this.score += 100 * Math.min(this.combo, 8);
    return this.checkWaveEnd();
  }

  /** A drone reached the player and exploded. */
  hit(): void {
    if (this.phase !== 'fighting') return;
    this.alive = Math.max(0, this.alive - 1);
    this.health -= 1;
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
    this.enter(this.wave + 1 >= WAVES.length ? 'victory' : 'cleared');
    return true;
  }

  private enter(phase: Phase): void {
    this.phase = phase;
    this.phaseTime = 0;
  }
}
