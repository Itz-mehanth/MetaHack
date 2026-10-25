import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  TorusGeometry,
  Vector3,
} from '@iwsdk/core';
import { bevelBox } from '../scene-assets/lib/hardsurface.js';

/** WebXR hand joints in spec order; indices below refer to this list. */
export const HAND_JOINTS = [
  'wrist',
  'thumb-metacarpal',
  'thumb-phalanx-proximal',
  'thumb-phalanx-distal',
  'thumb-tip',
  'index-finger-metacarpal',
  'index-finger-phalanx-proximal',
  'index-finger-phalanx-intermediate',
  'index-finger-phalanx-distal',
  'index-finger-tip',
  'middle-finger-metacarpal',
  'middle-finger-phalanx-proximal',
  'middle-finger-phalanx-intermediate',
  'middle-finger-phalanx-distal',
  'middle-finger-tip',
  'ring-finger-metacarpal',
  'ring-finger-phalanx-proximal',
  'ring-finger-phalanx-intermediate',
  'ring-finger-phalanx-distal',
  'ring-finger-tip',
  'pinky-finger-metacarpal',
  'pinky-finger-phalanx-proximal',
  'pinky-finger-phalanx-intermediate',
  'pinky-finger-phalanx-distal',
  'pinky-finger-tip',
] as const;

export const J = {
  wrist: 0,
  thumbTip: 4,
  indexMeta: 5,
  middleMeta: 10,
  middleProx: 11,
  pinkyMeta: 20,
  knuckles: [6, 11, 16, 21],
  tips: [9, 14, 19, 24],
} as const;

/** World-space pose of every joint of one hand, refreshed each frame. */
export class HandPose {
  tracked = false;
  readonly positions = new Float32Array(HAND_JOINTS.length * 3);
  readonly quaternions = new Float32Array(HAND_JOINTS.length * 4);
  readonly radii = new Float32Array(HAND_JOINTS.length);

  position(i: number, out: Vector3): Vector3 {
    return out.fromArray(this.positions, i * 3);
  }

  quaternion(i: number, out: Quaternion): Quaternion {
    return out.fromArray(this.quaternions, i * 4);
  }
}

/** Finger bone segments (from joint, to joint) that carry an armor plate. */
const SEGMENTS: ReadonlyArray<readonly [number, number]> = [
  [1, 2], [2, 3], [3, 4],
  [6, 7], [7, 8], [8, 9],
  [11, 12], [12, 13], [13, 14],
  [16, 17], [17, 18], [18, 19],
  [21, 22], [22, 23], [23, 24],
];
const KNUCKLES = [6, 11, 16, 21];

const armorMaterial = new MeshStandardMaterial({
  color: '#2A2D38',
  metalness: 0.9,
  roughness: 0.28,
});
const trimMaterial = new MeshStandardMaterial({
  color: '#8A8FA3',
  metalness: 1,
  roughness: 0.2,
});

/**
 * Original sci-fi gauntlet rebuilt every frame from tracked joints: a wrist
 * cuff, a back plate with a glowing core, knuckle guards, plated finger
 * segments and a palm emitter ring. All finger plates share two instanced
 * meshes, so a hand costs a handful of draw calls.
 */
export class Gauntlet {
  readonly group = new Group();
  /** Centre of the palm surface and the direction out of it (world space). */
  readonly palmPoint = new Vector3();
  readonly palmNormal = new Vector3(0, 0, -1);
  readonly accent: MeshBasicMaterial;
  private readonly plates: InstancedMesh;
  private readonly seams: InstancedMesh;
  private readonly guards: InstancedMesh;
  private readonly back: Mesh;
  private readonly core: Mesh;
  private readonly cuff: Mesh;
  private readonly cuffRings: Mesh[];
  private readonly emitter: Mesh;
  private readonly emitterMaterial: MeshBasicMaterial;

  private readonly a = new Vector3();
  private readonly b = new Vector3();
  private readonly up = new Vector3();
  private readonly q = new Quaternion();
  private readonly s = new Vector3();
  private readonly m = new Matrix4();

  constructor(handedness: 'left' | 'right', accent: Color) {
    this.group.name = `Gauntlet-${handedness}`;
    this.accent = new MeshBasicMaterial({ color: accent.clone(), toneMapped: false });
    this.emitterMaterial = new MeshBasicMaterial({ color: accent.clone(), toneMapped: false, transparent: true, opacity: 0.6 });

    const unit = new BoxGeometry(1, 1, 1);
    this.plates = new InstancedMesh(bevelBox(1, 1, 1, 0.12, 0.2, 2), armorMaterial, SEGMENTS.length);
    this.plates.name = 'FingerPlates';
    this.seams = new InstancedMesh(unit, this.accent, SEGMENTS.length);
    this.seams.name = 'FingerSeams';
    this.guards = new InstancedMesh(bevelBox(1, 1, 1, 0.2, 0.3, 2), trimMaterial, KNUCKLES.length);
    this.guards.name = 'KnuckleGuards';
    for (const mesh of [this.plates, this.seams, this.guards]) mesh.frustumCulled = false;

    this.back = new Mesh(bevelBox(0.078, 0.014, 0.082, 0.004, 0.012, 2), armorMaterial);
    this.back.name = 'BackPlate';
    this.core = new Mesh(new CylinderGeometry(0.014, 0.014, 0.004, 6), this.accent);
    this.core.name = 'BackCore';

    const cuffGeometry = new CylinderGeometry(0.043, 0.04, 0.075, 24, 1, true);
    cuffGeometry.rotateX(Math.PI / 2);
    this.cuff = new Mesh(cuffGeometry, armorMaterial);
    this.cuff.name = 'Cuff';
    const ringGeometry = new TorusGeometry(0.044, 0.003, 6, 32);
    this.cuffRings = [new Mesh(ringGeometry, this.accent), new Mesh(ringGeometry, this.accent)];
    this.cuffRings[0].position.z = -0.035;
    this.cuffRings[1].position.z = 0.03;
    this.cuff.add(...this.cuffRings);

    this.emitter = new Mesh(new TorusGeometry(0.016, 0.0035, 6, 24), this.emitterMaterial);
    this.emitter.name = 'PalmEmitter';

    this.group.add(this.plates, this.seams, this.guards, this.back, this.core, this.cuff, this.emitter);
    this.group.visible = false;
  }

  setAccent(color: Color): void {
    this.accent.color.copy(color);
    this.emitterMaterial.color.copy(color);
  }

  /** `charge` 0..1 brightens the palm emitter as a blast arms. */
  update(pose: HandPose, charge: number, time: number): void {
    this.group.visible = pose.tracked;
    if (!pose.tracked) return;

    for (let i = 0; i < SEGMENTS.length; i += 1) {
      const [from, to] = SEGMENTS[i];
      pose.position(from, this.a);
      pose.position(to, this.b);
      pose.quaternion(from, this.q);
      const length = this.a.distanceTo(this.b);
      const radius = pose.radii[from] || 0.009;
      this.up.set(0, 1, 0).applyQuaternion(this.q);
      this.a.add(this.b).multiplyScalar(0.5).addScaledVector(this.up, radius * 0.8);
      this.s.set(radius * 2.2, 0.0065, length * 0.88);
      this.plates.setMatrixAt(i, this.m.compose(this.a, this.q, this.s));
      this.a.addScaledVector(this.up, 0.0035);
      this.s.set(radius * 0.5, 0.0012, length * 0.7);
      this.seams.setMatrixAt(i, this.m.compose(this.a, this.q, this.s));
    }
    for (let i = 0; i < KNUCKLES.length; i += 1) {
      const joint = KNUCKLES[i];
      pose.position(joint, this.a);
      pose.quaternion(joint, this.q);
      const radius = pose.radii[joint] || 0.01;
      this.up.set(0, 1, 0).applyQuaternion(this.q);
      this.a.addScaledVector(this.up, radius * 0.9);
      this.s.set(radius * 2.4, 0.011, 0.02);
      this.guards.setMatrixAt(i, this.m.compose(this.a, this.q, this.s));
    }
    this.plates.instanceMatrix.needsUpdate = true;
    this.seams.instanceMatrix.needsUpdate = true;
    this.guards.instanceMatrix.needsUpdate = true;

    // Back plate spans wrist to middle knuckle, riding on the back of the hand.
    pose.position(J.wrist, this.a);
    pose.position(J.middleProx, this.b);
    pose.quaternion(J.middleMeta, this.q);
    this.up.set(0, 1, 0).applyQuaternion(this.q);
    this.a.lerp(this.b, 0.55);
    this.back.position.copy(this.a).addScaledVector(this.up, 0.019);
    this.back.quaternion.copy(this.q);
    this.core.position.copy(this.a).addScaledVector(this.up, 0.027);
    this.core.quaternion.copy(this.q);
    this.core.scale.setScalar(1 + Math.sin(time * 3) * 0.12);

    // Palm emitter sits on the palm side, facing out of the palm. WebXR's
    // joint -Y points into the palm, so -Y of the metacarpal is the aim axis.
    pose.position(J.wrist, this.s);
    this.palmNormal.copy(this.up).negate();
    this.palmPoint.copy(this.s).lerp(this.b, 0.5).addScaledVector(this.palmNormal, 0.022);
    this.emitter.position.copy(this.palmPoint);
    this.emitter.quaternion.copy(this.q);
    this.emitter.rotateX(Math.PI / 2);
    this.emitter.scale.setScalar(1 + charge * 0.5);
    this.emitterMaterial.opacity = 0.45 + charge * 0.55;

    // Cuff wraps the forearm just behind the wrist (+Z points to the elbow).
    pose.position(J.wrist, this.a);
    pose.quaternion(J.wrist, this.q);
    this.cuff.quaternion.copy(this.q);
    this.s.set(0, 0, 0.045).applyQuaternion(this.q);
    this.cuff.position.copy(this.a).add(this.s);
    this.cuff.scale.set(1.12, 0.82, 1);
  }
}
