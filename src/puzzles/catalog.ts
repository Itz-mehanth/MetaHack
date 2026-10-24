import { level1 } from './level1.js';
import type { PuzzleDef } from './types.js';

/** Every playable puzzle, keyed by the id a PuzzleRig names. */
export const puzzles: Readonly<Record<string, PuzzleDef>> = {
  [level1.id]: level1,
};
