import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  type Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Line,
  LineBasicMaterial,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  type Quaternion,
  SphereGeometry,
  TorusGeometry,
  type Sprite,
  Vector3,
} from '@iwsdk/core';
import { type HandPose, J } from './gauntlet.js';
import { createGlowSprite } from './vfx.js';

/** Bow geometry in its local frame: riser at the origin, +X toward the target, +Y up. */
const TIP_BACK = 0.15;
const TIP_HEIGHT = 0.38;
export const MAX_DRAW = 0.55;
export const ARROW_LENGTH = 0.62;
const UNIT_X = new Vector3(1, 0, 0);
const LIMB_START = 0.06;
const SEGMENTS = 20;

/** Centre line of the upper limb at t = 0..1: sweeps back, then the tip flicks forward (a recurve). */
function limbPoint(t: number, out: Vector3): Vector3 {
  return out.set(-0.205 * Math.pow(t, 1.7) + 0.055 * Math.pow(t, 5), LIMB_START + (TIP_HEIGHT - LIMB_START) * t, 0);
}

/**
 * A tapered beam along the upper limb: rectangular section (`depth` along the
 * limb's normal toward the target, `width` across it) shrinking toward the
 * tip, shifted `offset` along the normal. The lower limb mirrors it.
 */
function loft(depth: (t: number) => number, width: (t: number) => number, offset: (t: number) => number, from = 0, to = 1): BufferGeometry {
  const positions: number[] = [];
  const index: number[] = [];
  const a = new Vector3();
  const b = new Vector3();
  const tangent = new Vector3();
  for (let i = 0; i <= SEGMENTS; i += 1) {
    const t = from + ((to - from) * i) / SEGMENTS;
    limbPoint(t, a);
    limbPoint(Math.min(1, t + 0.01), b);
    limbPoint(Math.max(0, t - 0.01), tangent);
    tangent.subVectors(b, tangent).normalize();
    // Normal in the XY plane, pointing toward the target (+X).
    const nx = tangent.y;
    const ny = -tangent.x;
    const d = depth(t);
    const w = width(t);
    const o = offset(t);
    for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      positions.push(a.x + nx * (o + u * d), a.y + ny * (o + u * d), v * w);
    }
  }
  for (let i = 0; i < SEGMENTS; i += 1) {
    const r = i * 4;
    for (let k = 0; k < 4; k += 1) {
      const k2 = (k + 1) % 4;
      index.push(r + k, r + 4 + k, r + k2, r + k2, r + 4 + k, r + 4 + k2);
    }
  }
  const last = SEGMENTS * 4;
  index.push(0, 1, 2, 0, 2, 3, last, last + 2, last + 1, last, last + 3, last + 2);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * ORION's energy bow, held in a fist: a recurve with layered armoured limbs,
 * glowing edge lines and crystal tips on a sculpted riser, an energy string
 * that gathers light at the nock as it is drawn, and a fletched, barbed
 * arrow.
 */
export class Bow {
  readonly group = new Group();
  /** World-space riser point and aim direction (riser minus nock). */
  readonly riser = new Vector3();
  readonly aim = new Vector3(1, 0, 0);
  /** Where the string rests when not drawn, in world space. */
  readonly restNock = new Vector3();
  private readonly limbMaterial: MeshStandardMaterial;
  private readonly glow: MeshBasicMaterial;
  private readonly vaneMaterial: MeshBasicMaterial;
  private readonly stringMaterial: LineBasicMaterial;
  private readonly stringPositions = new Float32Array(9);
  private readonly string: Line;
  private readonly arrow: Group;
  private readonly arrowHead: Group;
  private readonly nockGlow: Sprite;
  private readonly tipGlows: Sprite[] = [];
  private readonly basis = new Matrix4();
  private readonly inverse = new Matrix4();
  private readonly x = new Vector3();
  private readonly y = new Vector3();
  private readonly z = new Vector3();
  private readonly a = new Vector3();
  private readonly b = new Vector3();
  private readonly local = new Vector3();
  private time = 0;

  constructor(color: Color) {
    this.group.name = 'LightBow';
    this.limbMaterial = new MeshStandardMaterial({ color: '#1E2430', metalness: 0.9, roughness: 0.3 });
    this.limbMaterial.name = 'metal';
    const trim = new MeshStandardMaterial({ color: '#C9CED8', metalness: 1, roughness: 0.14 });
    trim.name = 'trim';
    const dark = new MeshStandardMaterial({ color: '#0F1218', metalness: 0.5, roughness: 0.5 });
    dark.name = 'dark';
    this.glow = new MeshBasicMaterial({ color: color.clone(), toneMapped: false });
    this.vaneMaterial = new MeshBasicMaterial({ color: color.clone(), toneMapped: false, side: DoubleSide });

    // Limbs: a dark armoured spine, a silver inner layer, a glowing back edge and plates.
    const spine = loft((t) => 0.017 * (1 - 0.4 * t), (t) => 0.028 * (1 - 0.5 * t), () => 0);
    const innerLayer = loft(() => 0.006, (t) => 0.02 * (1 - 0.5 * t), (t) => -0.02 * (1 - 0.4 * t), 0.08, 0.96);
    const edge = loft(() => 0.004, () => 0.007, (t) => 0.018 * (1 - 0.4 * t) + 0.003);
    const plate = new BoxGeometry(0.022, 0.06, 0.056);
    const fin = new ConeGeometry(0.01, 0.07, 4);
    const tangent = new Vector3();
    const centre = new Vector3();
    for (const side of [1, -1]) {
      const limb = new Group();
      limb.scale.y = side;
      limb.add(new Mesh(spine, this.limbMaterial), new Mesh(innerLayer, trim), new Mesh(edge, this.glow));
      for (const t of [0.3, 0.52, 0.74]) {
        limbPoint(t, centre);
        limbPoint(Math.min(1, t + 0.01), tangent).sub(limbPoint(t - 0.01, this.a)).normalize();
        const armour = new Mesh(plate, t === 0.52 ? trim : this.limbMaterial);
        armour.scale.set(1, 1 - 0.3 * t, 1 - 0.4 * t);
        armour.position.set(centre.x + tangent.y * 0.022, centre.y - tangent.x * 0.022, 0);
        armour.rotation.z = Math.atan2(tangent.y, tangent.x) - Math.PI / 2;
        limb.add(armour);
      }
      // Crystal tip with a swept fin behind it.
      const tip = new Mesh(new OctahedronGeometry(0.014, 0), this.glow);
      tip.position.set(-TIP_BACK, TIP_HEIGHT + 0.004, 0);
      tip.scale.y = 1.7;
      const tipFin = new Mesh(fin, trim);
      tipFin.position.set(-TIP_BACK - 0.012, TIP_HEIGHT - 0.02, 0);
      tipFin.rotation.z = 0.5;
      const glowSprite = createGlowSprite(color, 0.5);
      glowSprite.position.copy(tip.position);
      glowSprite.scale.setScalar(0.07);
      this.tipGlows.push(glowSprite);
      // A swept energy blade beyond the tip: the bow's silhouette.
      const tipBlade = new Mesh(new ConeGeometry(0.016, 0.16, 4), this.glow);
      tipBlade.position.set(-TIP_BACK - 0.03, TIP_HEIGHT + 0.07, 0);
      tipBlade.rotation.z = 0.45;
      tipBlade.scale.z = 0.5;
      limb.add(tip, tipFin, tipBlade, glowSprite);
      this.group.add(limb);
    }

    // Riser: a sculpted block with a dark grip, shoulders, a glowing core strip and an arrow shelf.
    const riser = new Mesh(new BoxGeometry(0.042, 0.22, 0.05), this.limbMaterial);
    const grip = new Mesh(new CylinderGeometry(0.025, 0.022, 0.12, 10), dark);
    grip.position.x = -0.004;
    const coreStrip = new Mesh(new BoxGeometry(0.006, 0.17, 0.008), this.glow);
    coreStrip.position.x = 0.023;
    const shelf = new Mesh(new BoxGeometry(0.05, 0.012, 0.014), trim);
    shelf.position.set(0.032, 0.045, 0);
    const sight = new Mesh(new SphereGeometry(0.01, 10, 8), this.glow);
    sight.position.set(0.06, 0.05, 0);
    this.group.add(riser, grip, coreStrip, shelf, sight);
    for (const side of [1, -1]) {
      const shoulder = new Mesh(new BoxGeometry(0.056, 0.06, 0.056), trim);
      shoulder.position.set(-0.012, side * 0.1, 0);
      shoulder.rotation.z = -side * 0.35;
      const guard = new Mesh(new BoxGeometry(0.02, 0.03, 0.05), this.limbMaterial);
      guard.position.set(0.012, side * 0.075, 0);
      this.group.add(shoulder, guard);
    }

    this.stringMaterial = new LineBasicMaterial({
      color: color.clone(),
      transparent: true,
      opacity: 0.9,
      blending: AdditiveBlending,
      toneMapped: false,
    });
    const stringGeometry = new BufferGeometry();
    stringGeometry.setAttribute('position', new BufferAttribute(this.stringPositions, 3));
    this.string = new Line(stringGeometry, this.stringMaterial);
    this.string.frustumCulled = false;
    this.nockGlow = createGlowSprite(color, 0);
    this.nockGlow.visible = false;

    // Arrow along +X with its nock at the origin: shaft, glowing bands, three fletching vanes and a barbed head.
    this.arrow = new Group();
    this.arrow.name = 'DrawnArrow';
    const shaftGeometry = new CylinderGeometry(0.0045, 0.0045, ARROW_LENGTH, 6);
    shaftGeometry.rotateZ(-Math.PI / 2);
    shaftGeometry.translate(ARROW_LENGTH / 2, 0, 0);
    this.arrow.add(new Mesh(shaftGeometry, new MeshBasicMaterial({ color: '#E8FFF4', toneMapped: false })));
    for (const x of [0.16, 0.3, 0.44]) {
      const band = new Mesh(new TorusGeometry(0.0075, 0.0025, 4, 10), this.glow);
      band.rotation.y = Math.PI / 2;
      band.position.x = x;
      this.arrow.add(band);
    }
    const vane = new BufferGeometry();
    vane.setAttribute('position', new BufferAttribute(new Float32Array([0, 0, 0, 0.09, 0, 0, 0.02, 0.028, 0, 0.09, 0, 0, 0.11, 0.028, 0, 0.02, 0.028, 0]), 3));
    vane.computeVertexNormals();
    for (let k = 0; k < 3; k += 1) {
      const v = new Mesh(vane, this.vaneMaterial);
      v.rotation.x = (k / 3) * Math.PI * 2;
      v.position.x = 0.01;
      this.arrow.add(v);
    }
    this.arrowHead = new Group();
    const blade = new CylinderGeometry(0, 0.014, 0.06, 4);
    blade.rotateZ(-Math.PI / 2);
    blade.translate(ARROW_LENGTH + 0.03, 0, 0);
    this.arrowHead.add(new Mesh(blade, this.glow));
    for (const sign of [1, -1]) {
      const barb = new Mesh(new ConeGeometry(0.006, 0.03, 4), this.glow);
      barb.position.set(ARROW_LENGTH - 0.004, sign * 0.014, 0);
      barb.rotation.z = -Math.PI / 2 - sign * 0.6;
      this.arrowHead.add(barb);
    }
    this.arrow.add(this.arrowHead);
    this.arrow.visible = false;

    this.group.add(this.string, this.arrow, this.nockGlow);
    this.group.visible = false;
  }

  /** Shows the bow loose in the world (dropped or flying back), unstrung. */
  showFree(position: Vector3, quaternion: Quaternion): void {
    this.group.visible = true;
    this.group.position.copy(position);
    this.group.quaternion.copy(quaternion);
    this.group.updateMatrixWorld();
    this.arrow.visible = false;
    const p = this.stringPositions;
    p[0] = -TIP_BACK;
    p[1] = TIP_HEIGHT;
    p[2] = 0;
    p[3] = -TIP_BACK;
    p[4] = 0;
    p[5] = 0;
    p[6] = -TIP_BACK;
    p[7] = -TIP_HEIGHT;
    p[8] = 0;
    this.string.geometry.attributes.position.needsUpdate = true;
    this.restNock.set(-TIP_BACK, 0, 0).applyMatrix4(this.group.matrixWorld);
  }

  setColor(color: Color): void {
    this.glow.color.copy(color);
    this.stringMaterial.color.copy(color);
    this.vaneMaterial.color.copy(color);
    this.nockGlow.material.color.copy(color);
    for (const glowSprite of this.tipGlows) glowSprite.material.color.copy(color);
  }

  /**
   * Poses the bow in `pose`'s fist. `nock` is the drawing hand's pinch point
   * (world) or null when not drawing; returns the draw distance in metres.
   */
  update(pose: HandPose, grip: Vector3, nock: Vector3 | null): number {
    this.group.visible = pose.tracked;
    if (!pose.tracked) return 0;
    // Up: through the curled fingers (pinky to index middle joints).
    pose.position(7, this.a);
    pose.position(22, this.b);
    this.y.subVectors(this.a, this.b).normalize();
    // Forward: toward the target. While drawing, that is nock to riser.
    if (nock) this.x.subVectors(grip, nock);
    else {
      pose.position(J.wrist, this.a);
      pose.position(J.middleProx, this.b);
      this.x.subVectors(this.b, this.a);
    }
    this.x.addScaledVector(this.y, -this.x.dot(this.y)).normalize();
    this.z.crossVectors(this.x, this.y);
    this.basis.makeBasis(this.x, this.y, this.z);
    this.group.position.copy(grip);
    this.group.quaternion.setFromRotationMatrix(this.basis);
    this.group.updateMatrixWorld();

    this.riser.copy(grip);
    this.aim.copy(this.x);
    this.restNock.set(-TIP_BACK, 0, 0).applyMatrix4(this.group.matrixWorld);

    let draw = 0;
    this.local.set(-TIP_BACK, 0, 0);
    if (nock) {
      this.inverse.copy(this.group.matrixWorld).invert();
      this.local.copy(nock).applyMatrix4(this.inverse);
      // Keep the nock behind the riser and within the maximum draw.
      this.local.x = Math.min(this.local.x, -TIP_BACK);
      draw = Math.min(MAX_DRAW, -this.local.x - TIP_BACK);
      this.local.x = -TIP_BACK - draw;
    }
    const p = this.stringPositions;
    p[0] = -TIP_BACK;
    p[1] = TIP_HEIGHT;
    p[2] = 0;
    p[3] = this.local.x;
    p[4] = this.local.y;
    p[5] = this.local.z;
    p[6] = -TIP_BACK;
    p[7] = -TIP_HEIGHT;
    p[8] = 0;
    this.string.geometry.attributes.position.needsUpdate = true;
    this.stringMaterial.opacity = 0.6 + Math.min(1, draw / MAX_DRAW) * 0.4;

    this.arrow.visible = nock != null && draw > 0.04;
    const pull = Math.min(1, draw / MAX_DRAW);
    this.time += 0.016;
    // Light gathers at the nock and the limb tips as the string comes back.
    this.nockGlow.visible = pull > 0.05;
    if (this.nockGlow.visible) {
      this.nockGlow.position.copy(this.local);
      this.nockGlow.scale.setScalar(0.05 + pull * 0.12 + Math.sin(this.time * 40) * 0.01 * pull);
      this.nockGlow.material.opacity = 0.4 + pull * 0.6;
    }
    for (const glowSprite of this.tipGlows) glowSprite.scale.setScalar(0.07 + pull * 0.09);
    if (this.arrow.visible) {
      this.arrow.position.copy(this.local);
      // Point the arrow's +X from the nock at the riser.
      this.a.copy(this.local).negate().normalize();
      this.arrow.quaternion.setFromUnitVectors(UNIT_X, this.a);
      this.arrowHead.scale.setScalar(1 + pull * 0.6);
    }
    return draw;
  }
}
