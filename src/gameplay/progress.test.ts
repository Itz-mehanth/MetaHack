import { describe, expect, it } from 'vitest';
import { level1 } from '../puzzles/level1.js';
import { PuzzleProgress } from './progress.js';

describe('PuzzleProgress', () => {
  it('starts empty with only base slots unlocked', () => {
    const progress = new PuzzleProgress(level1);
    expect(progress.placedCount).toBe(0);
    expect(progress.totalCount).toBe(4);
    expect(progress.isComplete).toBe(false);
    expect(progress.isUnlocked('pillar-left')).toBe(true);
    expect(progress.isUnlocked('pillar-right')).toBe(true);
    expect(progress.isUnlocked('lintel')).toBe(false);
    expect(progress.isUnlocked('capstone')).toBe(false);
  });

  it('enforces bottom-up order', () => {
    const progress = new PuzzleProgress(level1);
    expect(progress.place('lintel', 'lintel', 0)).toBe(false);
    expect(progress.place('pillar-a', 'pillar-left', 0)).toBe(true);
    expect(progress.isUnlocked('lintel')).toBe(false);
    expect(progress.place('pillar-b', 'pillar-right', 0)).toBe(true);
    expect(progress.isUnlocked('lintel')).toBe(true);
    expect(progress.place('capstone', 'capstone', 0)).toBe(false);
    expect(progress.place('lintel', 'lintel', 0)).toBe(true);
    expect(progress.place('capstone', 'capstone', 0)).toBe(true);
    expect(progress.isComplete).toBe(true);
  });

  it('rejects occupied slots, double placement and shape mismatches', () => {
    const progress = new PuzzleProgress(level1);
    expect(progress.place('pillar-a', 'pillar-left', 0)).toBe(true);
    expect(progress.place('pillar-b', 'pillar-left', 0)).toBe(false);
    expect(progress.place('pillar-a', 'pillar-right', 0)).toBe(false);
    expect(progress.place('capstone', 'pillar-right', 0)).toBe(false);
    expect(progress.slotOf('pillar-a')).toBe('pillar-left');
    expect(progress.placedCount).toBe(1);
  });

  it('times from the first interaction and freezes on completion', () => {
    const progress = new PuzzleProgress(level1);
    expect(progress.elapsed(500)).toBe(0);
    progress.start(1000);
    progress.place('pillar-a', 'pillar-left', 2000);
    progress.place('pillar-b', 'pillar-right', 3000);
    progress.place('lintel', 'lintel', 4000);
    expect(progress.elapsed(5000)).toBe(4000);
    progress.place('capstone', 'capstone', 6000);
    expect(progress.elapsed(99999)).toBe(5000);
  });

  it('reset clears placements and timer', () => {
    const progress = new PuzzleProgress(level1);
    progress.place('pillar-a', 'pillar-left', 10);
    progress.reset();
    expect(progress.placedCount).toBe(0);
    expect(progress.isPlaced('pillar-a')).toBe(false);
    expect(progress.elapsed(100)).toBe(0);
    expect(progress.place('pillar-a', 'pillar-left', 0)).toBe(true);
  });
});
