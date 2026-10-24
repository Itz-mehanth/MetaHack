import { createComponent, Types } from '@iwsdk/core';

/** Lifecycle of one puzzle piece, driven by PuzzleSystem. */
export const PieceState = {
  Loose: 'Loose',
  Held: 'Held',
  Snapping: 'Snapping',
  Placed: 'Placed',
  Returning: 'Returning',
} as const;

/**
 * Marks the node every puzzle pose is relative to. PuzzleSystem spawns the
 * named level's pieces and ghost slots as its children.
 */
export const PuzzleRig = createComponent('PuzzleRig', {
  levelId: { type: Types.String, default: 'level-1' },
});

/** A grabbable piece spawned from puzzle data. */
export const PuzzlePiece = createComponent('PuzzlePiece', {
  pieceId: { type: Types.String, default: '' },
  state: { type: Types.Enum, enum: PieceState, default: PieceState.Loose },
});

/** A ghost outline marking where a piece belongs. */
export const PuzzleSlot = createComponent('PuzzleSlot', {
  slotId: { type: Types.String, default: '' },
});
