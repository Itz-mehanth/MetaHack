/**
 * Theme-agnostic puzzle data. Gameplay code only reads these types; it never
 * knows what a shape looks like. Poses are relative to the puzzle rig (the
 * forge plate's top-centre), in metres, with rotations as [x, y, z, w].
 */

export type Vec3 = readonly [number, number, number];
export type Quat = readonly [number, number, number, number];

export interface Pose {
  readonly position: Vec3;
  readonly rotation: Quat;
}

export interface ShapeDef {
  /**
   * Rotations that map the shape onto itself (identity is implied). Any of
   * them counts as a correct orientation, and a snap settles on the nearest.
   */
  readonly symmetries: readonly Quat[];
  /** Any orientation is accepted; the snap still settles on a symmetry. */
  readonly freeRotation?: boolean;
}

export interface SlotDef {
  readonly id: string;
  readonly shape: string;
  readonly pose: Pose;
  /** Slot ids that must be filled before this slot accepts a piece. */
  readonly requires: readonly string[];
}

export interface PieceDef {
  readonly id: string;
  readonly shape: string;
  /** Where the piece rests, and returns to on a failed placement. */
  readonly spawn: Pose;
}

export interface PuzzleDef {
  readonly id: string;
  readonly title: string;
  readonly shapes: Readonly<Record<string, ShapeDef>>;
  readonly slots: readonly SlotDef[];
  readonly pieces: readonly PieceDef[];
  readonly tolerance: {
    /** Max distance (m) between piece and slot centres. */
    readonly position: number;
    /** Max orientation error (degrees) after symmetry. */
    readonly angleDeg: number;
  };
}
