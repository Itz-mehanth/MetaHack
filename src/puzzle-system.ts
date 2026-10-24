import {
  AudioUtils,
  Color,
  createSystem,
  type Entity,
  Grabbed,
  GrabSystem,
  LineBasicMaterial,
  type Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  OneHandGrabbable,
  PointLight,
  Quaternion,
  Vector3,
} from '@iwsdk/core';
import { validatePlacement } from './gameplay/placement.js';
import { PuzzleProgress } from './gameplay/progress.js';
import { PieceState, PuzzlePiece, PuzzleRig, PuzzleSlot } from './puzzle-components.js';
import { puzzles } from './puzzles/catalog.js';
import type { PieceDef, Pose, PuzzleDef, SlotDef } from './puzzles/types.js';

const SNAP_SECONDS = 0.18;
const RETURN_SECONDS = 0.45;
const REJECT_SECONDS = 0.5;
const REJECT_COLOR = new Color('#FF3B30');

interface PieceRuntime {
  def: PieceDef;
  entity: Entity;
  object: Object3D;
  material: MeshStandardMaterial;
  baseGlow: number;
  glow: number;
  fromPos: Vector3;
  fromQuat: Quaternion;
  toPos: Vector3;
  toQuat: Quaternion;
  progress: number;
  duration: number;
}

interface SlotRuntime {
  def: SlotDef;
  object: Object3D;
  fill: MeshBasicMaterial;
  edges: LineBasicMaterial;
  color: Color;
  near: number;
  reject: number;
}

/**
 * Bridges grabbing to the pure puzzle rules: spawns a rig's pieces and ghost
 * slots from puzzle data, validates each release, then snaps or returns the
 * piece with visual and audio feedback. Knows shapes only by id; visuals come
 * from the `piece-<shape>` and `ghost-<shape>` manifest assets.
 */
export class PuzzleSystem extends createSystem({
  rigs: { required: [PuzzleRig] },
  held: { required: [PuzzlePiece, Grabbed] },
}) {
  puzzle: PuzzleDef | null = null;
  progress: PuzzleProgress | null = null;

  private rig: Entity | null = null;
  private rigObject: Object3D | null = null;
  private pieces: PieceRuntime[] = [];
  private slots: SlotRuntime[] = [];
  private winLight: PointLight | null = null;
  private celebrate = -1;
  private resetting = false;
  private listeners = new Set<() => void>();
  private tmpPos = new Vector3();
  private tmpQuat = new Quaternion();
  private rigQuat = new Quaternion();

  init(): void {
    this.cleanupFuncs.push(
      this.queries.rigs.subscribe('qualify', (rig) => void this.setupRig(rig)),
      this.queries.held.subscribe('qualify', (entity) => this.onGrab(entity)),
      this.queries.held.subscribe('disqualify', (entity) => this.onRelease(entity)),
    );
  }

  /** Registers a callback for placement, completion and restart. */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Returns every piece to its start and clears progress. */
  restart(): void {
    const grab = this.world.getSystem(GrabSystem);
    this.resetting = true;
    for (const piece of this.pieces) {
      if (piece.entity.hasComponent(Grabbed)) grab?.forceRelease(piece.entity);
    }
    this.resetting = false;
    this.progress?.reset();
    for (const piece of this.pieces) {
      this.rigObject?.attach(piece.object);
      applyPose(piece.object, piece.def.spawn);
      piece.glow = 0;
      piece.duration = 0;
      piece.entity.setValue(PuzzlePiece, 'state', PieceState.Loose);
      if (!piece.entity.hasComponent(OneHandGrabbable)) {
        piece.entity.addComponent(OneHandGrabbable);
      }
    }
    for (const slot of this.slots) slot.reject = 0;
    this.celebrate = -1;
    if (this.winLight) this.winLight.intensity = 0;
    this.notify();
  }

  private async setupRig(rig: Entity): Promise<void> {
    const levelId = rig.getValue(PuzzleRig, 'levelId') ?? '';
    const puzzle = puzzles[levelId];
    if (puzzle == null || rig.object3D == null) {
      console.warn(`[PuzzleSystem] Unknown puzzle "${levelId}"`);
      return;
    }
    this.puzzle = puzzle;
    this.progress = new PuzzleProgress(puzzle);
    this.rig = rig;
    this.rigObject = rig.object3D;

    for (const def of puzzle.slots) {
      const object = await this.world.assets.instantiate(`ghost-${def.shape}`);
      object.name = `Slot-${def.id}`;
      applyPose(object, def.pose);
      const fill = (object.getObjectByName('Fill') as Mesh).material as MeshBasicMaterial;
      const edgesMesh = object.getObjectByName('Edges') as Mesh;
      const edges = (edgesMesh.material as LineBasicMaterial).clone();
      edgesMesh.material = edges;
      const fillClone = fill.clone();
      (object.getObjectByName('Fill') as Mesh).material = fillClone;
      const entity = this.world.createTransformEntity(object, { parent: rig });
      entity.addComponent(PuzzleSlot, { slotId: def.id });
      this.slots.push({
        def,
        object,
        fill: fillClone,
        edges,
        color: edges.color.clone(),
        near: 0,
        reject: 0,
      });
    }

    for (const def of puzzle.pieces) {
      const object = await this.world.assets.instantiate(`piece-${def.shape}`);
      object.name = `Piece-${def.id}`;
      applyPose(object, def.spawn);
      const body = object.getObjectByName('Body') as Mesh;
      const source = body.material as MeshStandardMaterial;
      const material = source.clone();
      const baseGlow = source.emissive.getHex() === 0 ? 0 : source.emissiveIntensity * 0.4;
      material.emissive.copy(source.color);
      material.emissiveIntensity = baseGlow;
      body.material = material;
      const entity = this.world.createTransformEntity(object, { parent: rig });
      entity.addComponent(PuzzlePiece, { pieceId: def.id, state: PieceState.Loose });
      entity.addComponent(OneHandGrabbable);
      this.pieces.push({
        def,
        entity,
        object,
        material,
        baseGlow,
        glow: 0,
        fromPos: new Vector3(),
        fromQuat: new Quaternion(),
        toPos: new Vector3(),
        toQuat: new Quaternion(),
        progress: 0,
        duration: 0,
      });
    }

    const top = puzzle.slots[puzzle.slots.length - 1];
    this.winLight = new PointLight('#FFB347', 0, 1.5, 2);
    this.winLight.name = 'WinLight';
    this.winLight.position.fromArray(top.pose.position);
    this.world.createTransformEntity(this.winLight, { parent: rig });
    this.notify();
  }

  update(delta: number, time: number): void {
    if (this.rigObject == null || this.puzzle == null || this.progress == null) return;
    const tolerance = this.puzzle.tolerance.position;

    for (const slot of this.slots) slot.near = 0;
    for (const piece of this.pieces) {
      const state = piece.entity.getValue(PuzzlePiece, 'state');
      if (state === PieceState.Held) {
        this.toRigLocal(piece.object, this.tmpPos, this.tmpQuat);
        for (const slot of this.slots) {
          if (slot.def.shape !== piece.def.shape) continue;
          const d = this.tmpPos.distanceTo(slot.object.position);
          const near = 1 - (d - tolerance) / (tolerance * 2);
          slot.near = Math.max(slot.near, Math.min(1, near));
        }
      } else if (piece.duration > 0) {
        piece.progress = Math.min(1, piece.progress + delta / piece.duration);
        const e = piece.progress * piece.progress * (3 - 2 * piece.progress);
        piece.object.position.lerpVectors(piece.fromPos, piece.toPos, e);
        piece.object.quaternion.slerpQuaternions(piece.fromQuat, piece.toQuat, e);
        if (piece.progress >= 1) this.finishTween(piece);
      }
      piece.glow = Math.max(0, piece.glow - delta * 1.5);
      const placed = state === PieceState.Placed;
      const pulse = this.celebrate >= 0 ? 0.6 + 0.4 * Math.sin(time * 4) : 0;
      piece.material.emissiveIntensity =
        piece.baseGlow + (placed ? 0.15 : 0) + piece.glow * 1.2 + pulse;
    }

    for (const slot of this.slots) {
      const filled = this.progress.isFilled(slot.def.id);
      slot.object.visible = !filled;
      if (filled) continue;
      const unlocked = this.progress.isUnlocked(slot.def.id);
      slot.reject = Math.max(0, slot.reject - delta);
      slot.fill.opacity = unlocked ? 0.16 + slot.near * 0.3 : 0.04;
      slot.edges.opacity = unlocked ? 0.65 + slot.near * 0.35 : 0.2;
      slot.edges.color.copy(slot.color).lerp(REJECT_COLOR, slot.reject / REJECT_SECONDS);
    }

    if (this.celebrate >= 0 && this.winLight) {
      this.celebrate += delta;
      this.winLight.intensity = Math.min(1, this.celebrate) * 1.5;
    }
  }

  private onGrab(entity: Entity): void {
    const piece = this.pieceOf(entity);
    if (piece == null) return;
    piece.duration = 0;
    entity.setValue(PuzzlePiece, 'state', PieceState.Held);
    this.progress?.start(performance.now());
  }

  private onRelease(entity: Entity): void {
    const piece = this.pieceOf(entity);
    if (piece == null || this.resetting || this.puzzle == null || this.progress == null) return;
    if (this.rigObject && piece.object.parent !== this.rigObject) {
      this.rigObject.attach(piece.object);
    }
    this.toRigLocal(piece.object, this.tmpPos, this.tmpQuat);
    const result = validatePlacement(this.puzzle, this.progress, piece.def.id, {
      position: [this.tmpPos.x, this.tmpPos.y, this.tmpPos.z],
      rotation: [this.tmpQuat.x, this.tmpQuat.y, this.tmpQuat.z, this.tmpQuat.w],
    });
    if (result.ok && this.progress.place(piece.def.id, result.slotId, performance.now())) {
      entity.removeComponent(OneHandGrabbable);
      entity.setValue(PuzzlePiece, 'state', PieceState.Snapping);
      this.startTween(piece, result.snapPose, SNAP_SECONDS);
      return;
    }
    if (!result.ok && result.reason !== 'too-far' && result.slotId) {
      const slot = this.slots.find((s) => s.def.id === result.slotId);
      if (slot) slot.reject = REJECT_SECONDS;
    }
    entity.setValue(PuzzlePiece, 'state', PieceState.Returning);
    this.startTween(piece, piece.def.spawn, RETURN_SECONDS);
  }

  private startTween(piece: PieceRuntime, target: Pose, duration: number): void {
    piece.fromPos.copy(piece.object.position);
    piece.fromQuat.copy(piece.object.quaternion);
    piece.toPos.fromArray(target.position);
    piece.toQuat.fromArray(target.rotation);
    piece.progress = 0;
    piece.duration = duration;
  }

  private finishTween(piece: PieceRuntime): void {
    piece.duration = 0;
    const state = piece.entity.getValue(PuzzlePiece, 'state');
    if (state === PieceState.Snapping) {
      piece.entity.setValue(PuzzlePiece, 'state', PieceState.Placed);
      piece.glow = 1;
      if (this.rig) AudioUtils.play(this.rig);
      if (this.progress?.isComplete) this.celebrate = 0;
      this.notify();
    } else if (state === PieceState.Returning) {
      piece.entity.setValue(PuzzlePiece, 'state', PieceState.Loose);
    }
  }

  private pieceOf(entity: Entity): PieceRuntime | undefined {
    return this.pieces.find((piece) => piece.entity === entity);
  }

  /** Writes an object's pose relative to the rig, without allocating. */
  private toRigLocal(object: Object3D, position: Vector3, rotation: Quaternion): void {
    const rig = this.rigObject!;
    object.getWorldPosition(position);
    rig.worldToLocal(position);
    object.getWorldQuaternion(rotation);
    rig.getWorldQuaternion(this.rigQuat);
    rotation.premultiply(this.rigQuat.invert());
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}

function applyPose(object: Object3D, pose: Pose): void {
  object.position.fromArray(pose.position);
  object.quaternion.fromArray(pose.rotation);
}
