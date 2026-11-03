import { describe, expect, it } from 'vitest';
import { FrameStats, HITCH_MS, MAX_TIER, planFor, QualityGovernor } from './quality.js';

/** Feeds `seconds` of frames at `ms` each; returns the tiers the governor moved to. */
function run(governor: QualityGovernor, ms: number, seconds: number): number[] {
  const moves: number[] = [];
  for (let t = 0; t < seconds; t += ms / 1000) {
    const moved = governor.push(ms);
    if (moved >= 0) moves.push(moved);
  }
  return moves;
}

describe('FrameStats', () => {
  it('summarises a steady 72 fps run', () => {
    const stats = new FrameStats(60);
    for (let i = 0; i < 60; i += 1) stats.push(13.9);
    expect(stats.fps()).toBeCloseTo(72, 0);
    expect(stats.slowShare()).toBe(0);
    expect(stats.p95Ms()).toBeCloseTo(13.9, 1);
  });

  it('sees slow frames and a heavy tail', () => {
    const stats = new FrameStats(100);
    for (let i = 0; i < 100; i += 1) stats.push(i % 10 === 0 ? 40 : 13.9);
    expect(stats.slowShare()).toBeCloseTo(0.1, 5);
    expect(stats.p95Ms()).toBe(40);
  });

  it('keeps only the newest frames', () => {
    const stats = new FrameStats(10);
    for (let i = 0; i < 10; i += 1) stats.push(40);
    for (let i = 0; i < 10; i += 1) stats.push(10);
    expect(stats.avgMs()).toBeCloseTo(10, 5);
  });
});

describe('QualityGovernor', () => {
  it('stays put at a healthy frame rate', () => {
    const governor = new QualityGovernor();
    expect(run(governor, 13.9, 60)).toEqual([]);
    expect(governor.tier).toBe(0);
  });

  it('steps down while frames run slow, one tier at a time', () => {
    const governor = new QualityGovernor();
    const moves = run(governor, 24, 30);
    expect(moves[0]).toBe(1);
    expect(moves.every((tier, i) => tier === i + 1)).toBe(true);
    expect(governor.tier).toBeLessThanOrEqual(MAX_TIER);
  });

  it('stops at the lowest tier', () => {
    const governor = new QualityGovernor();
    run(governor, 30, 120);
    expect(governor.tier).toBe(MAX_TIER);
  });

  it('ignores hitches such as a level load', () => {
    const governor = new QualityGovernor();
    for (let i = 0; i < 20; i += 1) governor.push(HITCH_MS + 50);
    expect(run(governor, 13.9, 10)).toEqual([]);
    expect(governor.tier).toBe(0);
  });

  it('recovers a tier only after a long clean stretch', () => {
    const governor = new QualityGovernor();
    run(governor, 24, 6);
    expect(governor.tier).toBeGreaterThan(0);
    const before = governor.tier;
    governor.settle(0); // drop the half-finished slow window
    expect(run(governor, 13.9, 20)).toEqual([]);
    const moves = run(governor, 13.9, 20);
    expect(moves[0]).toBe(before - 1);
  });

  it('does not move while settling or when locked', () => {
    const governor = new QualityGovernor();
    governor.settle(5);
    expect(run(governor, 40, 4)).toEqual([]);
    governor.locked = true;
    expect(run(governor, 40, 30)).toEqual([]);
    expect(governor.tier).toBe(0);
  });
});

describe('planFor', () => {
  it('turns things down as the tier rises', () => {
    expect(planFor(0).ink).toBe(true);
    expect(planFor(1).ink).toBe(false);
    expect(planFor(3).particles).toBeLessThan(planFor(1).particles);
    expect(planFor(3).ground).toBe(false);
    expect(planFor(99)).toBe(planFor(MAX_TIER));
  });
});
