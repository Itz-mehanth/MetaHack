import type { PuzzleDef, SlotDef } from '../puzzles/types.js';

/**
 * Which pieces sit in which slots, which slots are unlocked, and the session
 * timer. Times are caller-supplied milliseconds so this stays pure.
 */
export class PuzzleProgress {
  private readonly slotById = new Map<string, SlotDef>();
  private readonly shapeByPiece = new Map<string, string>();
  private readonly occupant = new Map<string, string>();
  private readonly slotOfPiece = new Map<string, string>();
  private startedAt: number | null = null;
  private finishedAt: number | null = null;

  constructor(readonly puzzle: PuzzleDef) {
    for (const slot of puzzle.slots) this.slotById.set(slot.id, slot);
    for (const piece of puzzle.pieces) this.shapeByPiece.set(piece.id, piece.shape);
  }

  get placedCount(): number {
    return this.occupant.size;
  }

  get totalCount(): number {
    return this.puzzle.slots.length;
  }

  get isComplete(): boolean {
    return this.occupant.size === this.puzzle.slots.length;
  }

  isFilled(slotId: string): boolean {
    return this.occupant.has(slotId);
  }

  isPlaced(pieceId: string): boolean {
    return this.slotOfPiece.has(pieceId);
  }

  slotOf(pieceId: string): string | undefined {
    return this.slotOfPiece.get(pieceId);
  }

  isUnlocked(slotId: string): boolean {
    const slot = this.slotById.get(slotId);
    return slot != null && slot.requires.every((id) => this.occupant.has(id));
  }

  /** Starts the timer on the first interaction; later calls are ignored. */
  start(now: number): void {
    if (this.startedAt == null) this.startedAt = now;
  }

  /** Elapsed play time in ms, frozen once the puzzle is complete. */
  elapsed(now: number): number {
    if (this.startedAt == null) return 0;
    return (this.finishedAt ?? now) - this.startedAt;
  }

  /**
   * Records a placement. Returns false, changing nothing, unless the slot
   * exists, is empty and unlocked, the piece is loose, and the shapes match.
   */
  place(pieceId: string, slotId: string, now: number): boolean {
    const slot = this.slotById.get(slotId);
    const shape = this.shapeByPiece.get(pieceId);
    if (
      slot == null ||
      shape !== slot.shape ||
      this.occupant.has(slotId) ||
      this.slotOfPiece.has(pieceId) ||
      !this.isUnlocked(slotId)
    ) {
      return false;
    }
    this.start(now);
    this.occupant.set(slotId, pieceId);
    this.slotOfPiece.set(pieceId, slotId);
    if (this.isComplete) this.finishedAt = now;
    return true;
  }

  reset(): void {
    this.occupant.clear();
    this.slotOfPiece.clear();
    this.startedAt = null;
    this.finishedAt = null;
  }
}
