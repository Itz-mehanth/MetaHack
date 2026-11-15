import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
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
/** Fingertip-end segments, left bare by a fingerless glove. */
const DISTAL = new Set([2, 5, 8, 11, 14]);
const TIPS = [4, 9, 14, 19, 24];

/** Per-hero glove: base finish, trim colour and which extras it wears. */
const STYLES: Readonly<Record<string, { armor: string; metal: number; rough: number; trim: string; emitter: boolean; fingerless?: boolean }>> = {
  arc: { armor: '#2A2D38', metal: 0.9, rough: 0.28, trim: '#8A8FA3', emitter: true },
  talon: { armor: '#17121A', metal: 0.85, rough: 0.3, trim: '#6A1438', emitter: false },
  tempest: { armor: '#232A44', metal: 0.9, rough: 0.25, trim: '#C9A24A', emitter: false },
  orion: { armor: '#4A3420', metal: 0.05, rough: 0.8, trim: '#8C6A3A', emitter: false },
  weaver: { armor: '#141A30', metal: 0.4, rough: 0.5, trim: '#C02838', emitter: false },
  havoc: { armor: '#3A3024', metal: 0.2, rough: 0.75, trim: '#5A5040', emitter: false, fingerless: true },
  ronin: { armor: '#121218', metal: 0.6, rough: 0.18, trim: '#C9973A', emitter: false },
  psion: { armor: '#1E1430', metal: 0.7, rough: 0.3, trim: '#B9A6FF', emitter: false },
  vanguard: { armor: '#1C2A4A', metal: 0.85, rough: 0.3, trim: '#C8D0DC', emitter: false },
};

/** Armour colours of a hero's glove, for the matching forearm sleeves. */
export function styleColors(hero: string): { armor: string; trim: string } {
  const st = STYLES[hero] ?? STYLES.arc;
  return { armor: st.armor, trim: st.trim };
}


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
  private readonly armor: MeshStandardMaterial;
  private readonly trim: MeshStandardMaterial;
  /** Hero-specific extras, keyed by hero id; only the current one shows. */
  private readonly extras = new Map<string, Group>();
  private readonly orbits: Mesh[] = [];
  private readonly tipGlows: InstancedMesh;
  private style = 'arc';
  private fingerless = false;

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

    this.armor = new MeshStandardMaterial({ color: '#2A2D38', metalness: 0.9, roughness: 0.28 });
    this.trim = new MeshStandardMaterial({ color: '#8A8FA3', metalness: 1, roughness: 0.2 });
    const armorMaterial = this.armor;
    const trimMaterial = this.trim;
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

    this.tipGlows = new InstancedMesh(new SphereGeometry(1, 8, 6), this.accent, TIPS.length);
    this.tipGlows.name = 'TipGlows';
    this.tipGlows.frustumCulled = false;
    this.tipGlows.visible = false;

    this.group.add(this.plates, this.seams, this.guards, this.back, this.core, this.cuff, this.emitter, this.tipGlows);
    this.buildExtras();
    this.group.visible = false;
  }

  /**
   * Extras per hero, parented to the back plate (x across the hand, y out
   * of the back, -z toward the fingers) or the cuff (+z toward the elbow).
   */
  private buildExtras(): void {
    const add = (hero: string, parent: Mesh, ...meshes: Mesh[]) => {
      let group = this.extras.get(`${hero}:${parent.name}`);
      if (group == null) {
        group = new Group();
        group.visible = false;
        parent.add(group);
        this.extras.set(`${hero}:${parent.name}`, group);
      }
      group.add(...meshes);
    };
    const at = (mesh: Mesh, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
      mesh.position.set(x, y, z);
      mesh.rotation.set(rx, ry, rz);
      return mesh;
    };
    // TALON: three blade housings along the back of the hand.
    for (const x of [-0.022, 0, 0.022]) {
      add('talon', this.back, at(new Mesh(new BoxGeometry(0.009, 0.014, 0.075), this.trim), x, 0.012, -0.008));
      add('talon', this.back, at(new Mesh(new BoxGeometry(0.003, 0.003, 0.06), this.accent), x, 0.02, -0.008));
    }
    // TEMPEST: storm coil and a crest spike.
    add('tempest', this.back, at(new Mesh(new TorusGeometry(0.02, 0.0035, 6, 24), this.accent), 0, 0.012, 0, Math.PI / 2));
    add('tempest', this.back, at(new Mesh(new ConeGeometry(0.008, 0.035, 4), this.trim), 0, 0.012, 0.03, -Math.PI / 2));
    add('tempest', this.cuff, at(new Mesh(new TorusGeometry(0.047, 0.004, 4, 32), this.trim), 0, 0, 0));
    // ORION: long leather bracer with laced straps.
    const bracer = new CylinderGeometry(0.047, 0.052, 0.13, 20, 1, true);
    bracer.rotateX(Math.PI / 2);
    add('orion', this.cuff, at(new Mesh(bracer, this.armor), 0, 0, 0.1));
    for (const z of [0.06, 0.1, 0.14]) add('orion', this.cuff, at(new Mesh(new TorusGeometry(0.05, 0.003, 4, 24), this.trim), 0, 0, z));
    // WEAVER: web cartridge under the wrist, with a nozzle.
    const cartridge = new CylinderGeometry(0.011, 0.011, 0.05, 12);
    cartridge.rotateX(Math.PI / 2);
    add('weaver', this.cuff, at(new Mesh(cartridge, this.accent), 0, -0.042, -0.005));
    add('weaver', this.cuff, at(new Mesh(new CylinderGeometry(0.004, 0.006, 0.02, 8), this.trim), 0, -0.042, -0.035, Math.PI / 2));
    // HAVOC: ammo cells on the back of the wrist.
    for (const x of [-0.016, 0, 0.016]) {
      add('havoc', this.cuff, at(new Mesh(new CylinderGeometry(0.0055, 0.0055, 0.03, 8), this.accent), x, 0.045, 0, Math.PI / 2));
    }
    // RONIN: layered lacquer plates (kote) with a gold edge, and a cord.
    for (const [z, k] of [[0.022, 0], [-0.004, 1], [-0.03, 2]] as const) {
      add('ronin', this.back, at(new Mesh(bevelBox(0.07 - k * 0.006, 0.006, 0.03, 0.002), this.armor), 0, 0.014 + k * 0.003, z, -0.12));
      add('ronin', this.back, at(new Mesh(new BoxGeometry(0.07 - k * 0.006, 0.002, 0.003), this.trim), 0, 0.018 + k * 0.003, z - 0.015));
    }
    add('ronin', this.cuff, at(new Mesh(new TorusGeometry(0.046, 0.005, 6, 32), new MeshStandardMaterial({ color: '#8A1020', roughness: 0.8 })), 0, 0, 0.0));
    // VANGUARD: armoured knuckle bar and a bracer with a star-free hex stud.
    add('vanguard', this.back, at(new Mesh(new BoxGeometry(0.075, 0.012, 0.018), this.trim), 0, 0.014, -0.035));
    const vbracer = new CylinderGeometry(0.047, 0.05, 0.1, 20, 1, true);
    vbracer.rotateX(Math.PI / 2);
    add('vanguard', this.cuff, at(new Mesh(vbracer, this.armor), 0, 0, 0.08));
    add('vanguard', this.cuff, at(new Mesh(new CylinderGeometry(0.012, 0.012, 0.006, 6), this.accent), 0, 0.05, 0.08, 0, 0, 0));
    // PSION: two rings orbiting the wrist (animated) and glowing fingertips.
    for (let i = 0; i < 2; i += 1) {
      const ring = new Mesh(new TorusGeometry(0.058 + i * 0.012, 0.0025, 4, 40), this.accent);
      this.orbits.push(ring);
      add('psion', this.cuff, ring);
    }
  }

  /** Switches to `hero`'s glove: finish, trim, extras, fingerless or not. */
  setStyle(hero: string): void {
    const style = STYLES[hero] ?? STYLES.arc;
    if (hero === this.style && this.armor.color.getHexString() === style.armor.slice(1).toLowerCase()) return;
    this.style = hero;
    this.armor.color.set(style.armor);
    this.armor.metalness = style.metal;
    this.armor.roughness = style.rough;
    this.trim.color.set(style.trim);
    this.emitter.visible = style.emitter;
    this.fingerless = style.fingerless === true;
    this.tipGlows.visible = hero === 'psion';
    for (const [key, group] of this.extras) group.visible = key.startsWith(`${hero}:`);
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
      const bare = this.fingerless && DISTAL.has(i);
      this.s.set(bare ? 0 : radius * 2.2, bare ? 0 : 0.0065, bare ? 0 : length * 0.88);
      this.plates.setMatrixAt(i, this.m.compose(this.a, this.q, this.s));
      this.a.addScaledVector(this.up, 0.0035);
      if (bare) this.s.set(0, 0, 0);
      else this.s.set(radius * 0.5, 0.0012, length * 0.7);
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

    if (this.style === 'psion') {
      this.orbits[0].rotation.set(time * 2.1, time * 1.3, 0);
      this.orbits[1].rotation.set(-time * 1.6, 0, time * 2.4);
      for (let i = 0; i < TIPS.length; i += 1) {
        pose.position(TIPS[i], this.a);
        this.s.setScalar(0.006 + Math.sin(time * 6 + i) * 0.0015);
        this.tipGlows.setMatrixAt(i, this.m.compose(this.a, this.q.identity(), this.s));
      }
      this.tipGlows.instanceMatrix.needsUpdate = true;
    }
  }
}
