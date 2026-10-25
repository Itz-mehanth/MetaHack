import { ENEMIES, type EnemyKind, type WaveDef } from './missions.js';
import { ENEMY_COINS, STAGES, type Stage } from './progression.js';

/**
 * Pure run state for one stage: phases, waves, health, score, combo and the
 * coins collected from kills. Times are seconds of game time supplied by the
 * caller. Menus decide what happens after victory or defeat.
 */

export type Phase = 'title' | 'intro' | 'fighting' | 'cleared' | 'victory' | 'defeat';

/** First wave: stage name, then a 3-2-1 countdown. */
export const FIRST_INTRO_SECONDS = 4;
export const INTRO_SECONDS = 2.5;
export const CLEARED_SECONDS = 2.5;
export const COMBO_WINDOW = 2.5;
/** Gap between enemies inside one spawn group. */
export const BURST_GAP = 0.18;

export interface SpawnOrder {
  kind: EnemyKind;
  speed: number;
}

export interface RunOptions {
  maxHealth: number;
  /** Multiplies every wave's enemy speed (difficulty). */
  speedScale: number;
}

export class Run {
  phase: Phase = 'title';
  stage: Stage = STAGES[0];
  wave = 0;
  maxHealth = 5;
  health = 5;
  score = 0;
  combo = 0;
  bestCombo = 0;
  kills = 0;
  coins = 0;
  private speedScale = 1;
  private phaseTime = 0;
  private spawned = 0;
  private alive = 0;
  private spawnTimer = 0;
  private burstLeft = 0;
  private bossSpawned = false;
  private comboTimer = 0;

  constructor(private readonly random: () => number = Math.random) {}

  get waveDef(): WaveDef {
    const waves = this.stage.waves;
    return waves[Math.min(this.wave, waves.length - 1)];
  }

  get totalWaves(): number {
    return this.stage.waves.length;
  }

  get aliveCount(): number {
    return this.alive;
  }

  /** Seconds spent in the current phase. */
  get elapsedInPhase(): number {
    return this.phaseTime;
  }

  get introLength(): number {
    return this.wave === 0 ? FIRST_INTRO_SECONDS : INTRO_SECONDS;
  }

  /** Starts a fresh run of `stage` (defaults to the current one). */
  start(stage: Stage = this.stage, options: RunOptions = { maxHealth: this.maxHealth, speedScale: this.speedScale }): void {
    this.stage = stage;
    this.maxHealth = options.maxHealth;
    this.speedScale = options.speedScale;
    this.wave = 0;
    this.health = this.maxHealth;
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.kills = 0;
    this.coins = 0;
    this.alive = 0;
    this.enter('intro');
  }

  /** Abandons any run and returns to the menus. */
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
    if (this.phase === 'intro' && this.phaseTime >= this.introLength) {
      this.spawned = 0;
      this.spawnTimer = 0;
      this.burstLeft = 0;
      this.bossSpawned = false;
      this.enter('fighting');
    } else if (this.phase === 'cleared' && this.phaseTime >= CLEARED_SECONDS) {
      this.wave += 1;
      this.enter('intro');
    } else if (this.phase === 'fighting' && this.waveDef.boss && !this.bossSpawned) {
      // The boss arrives first and counts as alive, but not toward the wave count.
      this.bossSpawned = true;
      this.alive += 1;
      this.spawnTimer = 3;
      return { kind: 'boss', speed: 0 };
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
        return { kind, speed: def.speed * this.speedScale };
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
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.comboTimer = COMBO_WINDOW;
    this.score += ENEMIES[kind].score * Math.min(this.combo, 8);
    this.coins += ENEMY_COINS[kind];
    return this.checkWaveEnd();
  }

  /** Damage from something outside the wave count (boss orbs, minions). */
  damage(amount: number): void {
    if (this.phase !== 'fighting') return;
    this.health -= amount;
    this.combo = 0;
    if (this.health <= 0) {
      this.health = 0;
      this.enter('defeat');
    }
  }

  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
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
