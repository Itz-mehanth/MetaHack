import {
  AnimationMixer,
  type AnimationAction,
  type AnimationClip,
  BackSide,
  Box3,
  type BufferGeometry,
  Group,
  LoopOnce,
  LoopRepeat,
  MeshBasicMaterial,
  type Object3D,
  SkinnedMesh,
  Vector3,
} from '@iwsdk/core';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

export type ClipName = 'idle' | 'walk' | 'run' | 'attack' | 'hit' | 'death';

/** Clip to use when a creature's file lacks the one asked for. */
const FALLBACK: Readonly<Record<ClipName, readonly ClipName[]>> = {
  idle: ['idle', 'walk', 'run'],
  walk: ['walk', 'run', 'idle'],
  run: ['run', 'walk', 'idle'],
  attack: ['attack', 'run', 'walk', 'idle'],
  hit: ['hit', 'idle'],
  death: ['death', 'hit', 'idle'],
};

export type GrabZone = 'head' | 'arm' | 'leg';

/** Skeleton bones that count as grab zones (humanoids; blobs and flyers have only a head). */
const ZONE_BONES: readonly (readonly [GrabZone, string])[] = [
  ['head', 'Head'],
  ['arm', 'LowerArm.L'],
  ['arm', 'LowerArm.R'],
  ['leg', 'LowerLeg.L'],
  ['leg', 'LowerLeg.R'],
];

let outlineMaterial: MeshBasicMaterial | null = null;

/** Ink for the outline: the skinned mesh drawn again from behind, pushed out along its normals. */
function getOutlineMaterial(): MeshBasicMaterial {
  if (outlineMaterial) return outlineMaterial;
  const material = new MeshBasicMaterial({ color: '#0A0A12', side: BackSide });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <skinning_vertex>', '#include <skinning_vertex>\n  transformed += normalize(objectNormal) * 0.03;');
  };
  outlineMaterial = material;
  return material;
}

/**
 * One animated creature: a cloned skinned model scaled to a target height,
 * its mixer and its standard clips (idle, walk, run, attack, hit, death).
 * The group's origin is where the combat system wants the body centre, so
 * walkers are lifted by their chest height and flyers are centred.
 */
export class CreatureModel {
  /** Place this in the world; its origin is the body centre. */
  readonly group = new Group();
  readonly height: number;
  private readonly mixer: AnimationMixer;
  private readonly actions = new Map<ClipName, AnimationAction>();
  private readonly durations = new Map<ClipName, number>();
  private current: ClipName | '' = '';
  private currentAction: AnimationAction | null = null;
  private once = false;
  /** Ink outlines on every creature; the quality governor turns them off to save a skinned draw each. */
  static ink = true;
  private readonly outlines: Object3D[] = [];
  private inkOn = true;
  /** Bones a free hand can take hold of. */
  readonly zones: { name: GrabZone; bone: Object3D }[] = [];

  /**
   * `lift` is the height of the body centre above the feet (walkers), or
   * null to centre the model on its own middle (flyers).
   */
  constructor(source: Object3D, clips: readonly AnimationClip[], height: number, lift: number | null) {
    const model = clone(source);
    // Measure the rest pose, scale to the target height, stand it on y = 0.
    model.updateMatrixWorld(true);
    const box = new Box3().setFromObject(model);
    const size = box.getSize(new Vector3());
    const scale = height / Math.max(0.01, size.y);
    model.scale.multiplyScalar(scale);
    model.updateMatrixWorld(true);
    box.setFromObject(model);
    const centre = box.getCenter(new Vector3());
    model.position.x -= centre.x;
    model.position.z -= centre.z;
    model.position.y -= lift == null ? centre.y : box.min.y + lift;
    this.height = height;
    this.group.add(model);
    model.traverse((child) => {
      const skinned = child as SkinnedMesh;
      if (!skinned.isSkinnedMesh) return;
      skinned.frustumCulled = false;
      const outline = new SkinnedMesh(skinned.geometry as BufferGeometry, getOutlineMaterial());
      outline.name = 'Outline';
      outline.bind(skinned.skeleton, skinned.bindMatrix);
      outline.frustumCulled = false;
      skinned.parent!.add(outline);
      this.outlines.push(outline);
    });
    for (const [name, bone] of ZONE_BONES) {
      const found = model.getObjectByName(bone);
      if (found) this.zones.push({ name, bone: found });
    }
    this.mixer = new AnimationMixer(model);
    for (const clip of clips) {
      const name = clip.name as ClipName;
      this.actions.set(name, this.mixer.clipAction(clip));
      this.durations.set(name, clip.duration);
    }
  }

  private actionFor(name: ClipName): { action: AnimationAction; clip: ClipName } | null {
    for (const option of FALLBACK[name]) {
      const action = this.actions.get(option);
      if (action) return { action, clip: option };
    }
    return null;
  }

  /** Seconds the clip runs at normal speed. */
  duration(name: ClipName): number {
    const found = this.actionFor(name);
    return found ? (this.durations.get(found.clip) ?? 1) : 1;
  }

  /** The clip now playing (as asked for, not as substituted). */
  get playing(): ClipName | '' {
    return this.current;
  }

  /** A one-shot clip has run to its end. */
  get finished(): boolean {
    const action = this.currentAction;
    return this.once && action != null && action.time >= action.getClip().duration - 1e-3;
  }

  /**
   * Cross-fades to `name`. Looping clips ignore a repeat request (but keep
   * `speed` current); `once` clips restart and hold their last pose.
   */
  play(name: ClipName, speed = 1, once = false, fade = 0.15): void {
    const found = this.actionFor(name);
    if (found == null) return;
    const next = found.action;
    if (this.current === name && !once) {
      next.timeScale = speed;
      return;
    }
    const previous = this.currentAction;
    next.reset();
    next.setLoop(once ? LoopOnce : LoopRepeat, Infinity);
    next.clampWhenFinished = once;
    next.timeScale = speed;
    next.enabled = true;
    next.setEffectiveWeight(1);
    if (previous && previous !== next) next.crossFadeFrom(previous, fade, false);
    next.play();
    this.current = name;
    this.currentAction = next;
    this.once = once;
  }

  /** Speed of the clip now playing (0 freezes it, e.g. while webbed). */
  setSpeed(speed: number): void {
    if (this.currentAction) this.currentAction.timeScale = speed;
  }

  update(dt: number): void {
    if (this.inkOn !== CreatureModel.ink) {
      this.inkOn = CreatureModel.ink;
      for (const outline of this.outlines) outline.visible = this.inkOn;
    }
    this.mixer.update(dt);
  }

  /** Back to a clean idle for the next spawn. */
  reset(): void {
    this.mixer.stopAllAction();
    this.current = '';
    this.currentAction = null;
    this.once = false;
    this.play('idle');
  }
}
