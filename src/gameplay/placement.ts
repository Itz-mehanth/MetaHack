import type { Pose, PuzzleDef, Quat } from '../puzzles/types.js';
import type { PuzzleProgress } from './progress.js';
import { angleBetween, distance, IDENTITY, multiply } from './math.js';

export type PlacementResult =
  | { ok: true; slotId: string; snapPose: Pose }
  | {
      ok: false;
      reason: 'already-placed' | 'too-far' | 'locked' | 'wrong-rotation';
      /** Nearest empty slot of the piece's shape, when one exists. */
      slotId?: string;
    };

/**
 * Decides whether a released piece fits a slot. Only empty slots of the same
 * shape are candidates; the nearest one is judged. The snap rotation is the
 * symmetric equivalent of the slot rotation closest to the piece, so a snap
 * never visibly spins the piece.
 */
export function validatePlacement(
  puzzle: PuzzleDef,
  progress: PuzzleProgress,
  pieceId: string,
  pose: Pose,
): PlacementResult {
  const piece = puzzle.pieces.find((p) => p.id === pieceId);
  if (piece == null) throw new Error(`Unknown piece "${pieceId}"`);
  if (progress.isPlaced(pieceId)) return { ok: false, reason: 'already-placed' };

  let nearest: (typeof puzzle.slots)[number] | undefined;
  let nearestDistance = Infinity;
  for (const slot of puzzle.slots) {
    if (slot.shape !== piece.shape || progress.isFilled(slot.id)) continue;
    const d = distance(pose.position, slot.pose.position);
    if (d < nearestDistance) {
      nearest = slot;
      nearestDistance = d;
    }
  }
  if (nearest == null || nearestDistance > puzzle.tolerance.position) {
    return { ok: false, reason: 'too-far', slotId: nearest?.id };
  }
  if (!progress.isUnlocked(nearest.id)) {
    return { ok: false, reason: 'locked', slotId: nearest.id };
  }

  const shape = puzzle.shapes[piece.shape];
  if (shape == null) throw new Error(`Unknown shape "${piece.shape}"`);
  let snapRotation: Quat = nearest.pose.rotation;
  let best = Infinity;
  for (const symmetry of [IDENTITY, ...shape.symmetries]) {
    const candidate = multiply(nearest.pose.rotation, symmetry);
    const angle = angleBetween(pose.rotation, candidate);
    if (angle < best) {
      best = angle;
      snapRotation = candidate;
    }
  }
  if (!shape.freeRotation && best > puzzle.tolerance.angleDeg) {
    return { ok: false, reason: 'wrong-rotation', slotId: nearest.id };
  }
  return {
    ok: true,
    slotId: nearest.id,
    snapPose: { position: nearest.pose.position, rotation: snapRotation },
  };
}
