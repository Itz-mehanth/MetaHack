/**
 * Frame-time statistics and the quality governor. Pure TypeScript (no Three.js,
 * no DOM) so it is unit-tested. The combat system feeds it every frame's
 * duration; when frames run slow it steps the game down a quality tier, and it
 * steps back up only after a long clean stretch.
 */

/** A frame longer than this is below ~55 fps. */
export const SLOW_FRAME_MS = 1000 / 55;
/** Frames longer than this are loading hitches or a tab switch, not load. */
export const HITCH_MS = 250;

export const MAX_TIER = 3;

/** What each tier turns down. Tier 0 is full quality. */
export interface QualityPlan {
  /** Ink outlines on creatures (a second skinned draw each). */
  ink: boolean;
  /** Share of particles actually emitted. */
  particles: number;
  /** Share of the wave's normal crowd cap kept alive at once. */
  crowd: number;
  /** Hand and weapon aura sparks. */
  auras: boolean;
  /** The painted MR floor. */
  ground: boolean;
}

const PLANS: readonly QualityPlan[] = [
  { ink: true, particles: 1, crowd: 1, auras: true, ground: true },
  { ink: false, particles: 0.75, crowd: 1, auras: true, ground: true },
  { ink: false, particles: 0.55, crowd: 0.8, auras: false, ground: true },
  { ink: false, particles: 0.35, crowd: 0.6, auras: false, ground: false },
];

export function planFor(tier: number): QualityPlan {
  return PLANS[Math.max(0, Math.min(MAX_TIER, tier))];
}

/** Rolling frame times (ms) with cheap summaries. Allocation-free after construction. */
export class FrameStats {
  private readonly ring: Float32Array;
  private readonly sorted: Float32Array;
  private count = 0;
  private next = 0;

  constructor(private readonly size = 180) {
    this.ring = new Float32Array(size);
    this.sorted = new Float32Array(size);
  }

  push(ms: number): void {
    this.ring[this.next] = ms;
    this.next = (this.next + 1) % this.size;
    this.count = Math.min(this.size, this.count + 1);
  }

  get frames(): number {
    return this.count;
  }

  avgMs(): number {
    if (this.count === 0) return 0;
    let sum = 0;
    for (let i = 0; i < this.count; i += 1) sum += this.ring[i];
    return sum / this.count;
  }

  /** The frame time 95% of frames beat. */
  p95Ms(): number {
    if (this.count === 0) return 0;
    for (let i = 0; i < this.count; i += 1) this.sorted[i] = this.ring[i];
    const view = this.sorted.subarray(0, this.count);
    view.sort();
    return view[Math.min(this.count - 1, Math.floor(this.count * 0.95))];
  }

  /** Share of recent frames slower than `thresholdMs`. */
  slowShare(thresholdMs = SLOW_FRAME_MS): number {
    if (this.count === 0) return 0;
    let slow = 0;
    for (let i = 0; i < this.count; i += 1) if (this.ring[i] > thresholdMs) slow += 1;
    return slow / this.count;
  }

  fps(): number {
    const avg = this.avgMs();
    return avg > 0 ? 1000 / avg : 0;
  }

  clear(): void {
    this.count = 0;
    this.next = 0;
  }
}

/**
 * Watches frame times in windows. Many slow frames in a window drop one tier;
 * a long run of clean windows raises one tier again. Hitches are ignored.
 */
export class QualityGovernor {
  tier = 0;
  /** True while a tier is forced (?q=N); the governor then never moves. */
  locked = false;

  private windowTime = 0;
  private windowFrames = 0;
  private windowSlow = 0;
  private windowSum = 0;
  private grace = 0;
  private cooldown = 0;
  private clean = 0;

  /** Seconds of a window, and of clean play needed to step back up. */
  constructor(
    private readonly windowSeconds = 1.5,
    private readonly recoverSeconds = 30,
    private readonly slowShareLimit = 0.08,
    private readonly avgLimitMs = 16,
  ) {}

  /** Starts a settling period (after a session or stage starts) where nothing changes. */
  settle(seconds = 4): void {
    this.grace = seconds;
    this.windowTime = 0;
    this.windowFrames = 0;
    this.windowSlow = 0;
    this.windowSum = 0;
  }

  /** Feeds one frame; returns the new tier if it changed, else -1. */
  push(ms: number): number {
    if (this.locked || ms > HITCH_MS || ms <= 0) return -1;
    const seconds = ms / 1000;
    if (this.grace > 0) {
      this.grace -= seconds;
      return -1;
    }
    this.windowTime += seconds;
    this.windowFrames += 1;
    this.windowSum += ms;
    if (ms > SLOW_FRAME_MS) this.windowSlow += 1;
    if (this.windowTime < this.windowSeconds) return -1;

    const share = this.windowSlow / this.windowFrames;
    const avg = this.windowSum / this.windowFrames;
    const length = this.windowTime;
    this.windowTime = 0;
    this.windowFrames = 0;
    this.windowSlow = 0;
    this.windowSum = 0;
    this.cooldown = Math.max(0, this.cooldown - length);

    if (share > this.slowShareLimit || avg > this.avgLimitMs) {
      this.clean = 0;
      if (this.tier < MAX_TIER && this.cooldown <= 0) {
        this.tier += 1;
        this.cooldown = 4;
        return this.tier;
      }
      return -1;
    }
    if (share < 0.01) this.clean += length;
    else this.clean = 0;
    if (this.tier > 0 && this.clean >= this.recoverSeconds && this.cooldown <= 0) {
      this.tier -= 1;
      this.clean = 0;
      // Stepping back up is the risky move: wait longer before judging it.
      this.cooldown = 12;
      return this.tier;
    }
    return -1;
  }
}
