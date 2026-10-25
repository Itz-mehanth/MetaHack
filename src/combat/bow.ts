import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  type Color,
  CylinderGeometry,
  Group,
  Line,
  LineBasicMaterial,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from '@iwsdk/core';
import { type HandPose, J } from './gauntlet.js';

/** Bow geometry in its local frame: riser at the origin, +X toward the target, +Y up. */
const TIP_BACK = 0.15;
const TIP_HEIGHT = 0.38;
const HALF_ANGLE = 2 * Math.atan(TIP_BACK / TIP_HEIGHT);
const RADIUS = TIP_HEIGHT / Math.sin(HALF_ANGLE);
export const MAX_DRAW = 0.55;
export const ARROW_LENGTH = 0.62;
const UNIT_X = new Vector3(1, 0, 0);

/**
 * ORION's energy bow, held in a fist: riser through the curled fingers,
 * limbs arcing back toward the archer, a glowing string, and an arrow that
 * appears on the string while it is drawn.
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
  private readonly stringMaterial: LineBasicMaterial;
  private readonly stringPositions = new Float32Array(9);
  private readonly string: Line;
  private readonly arrow: Group;
  private readonly arrowHead: Mesh;
  private readonly basis = new Matrix4();
  private readonly inverse = new Matrix4();
  private readonly x = new Vector3();
  private readonly y = new Vector3();
  private readonly z = new Vector3();
  private readonly a = new Vector3();
  private readonly b = new Vector3();
  private readonly local = new Vector3();

  constructor(color: Color) {
    this.group.name = 'LightBow';
    this.limbMaterial = new MeshStandardMaterial({ color: '#1E2430', metalness: 0.9, roughness: 0.3 });
    this.glow = new MeshBasicMaterial({ color: color.clone(), toneMapped: false });

    const limbGeometry = new TorusGeometry(RADIUS, 0.009, 6, 40, HALF_ANGLE * 2);
    limbGeometry.rotateZ(-HALF_ANGLE);
    limbGeometry.translate(-RADIUS, 0, 0);
    const limb = new Mesh(limbGeometry, this.limbMaterial);
    const edge = new Mesh(new TorusGeometry(RADIUS + 0.008, 0.0035, 4, 40, HALF_ANGLE * 2), this.glow);
    edge.geometry.rotateZ(-HALF_ANGLE);
    edge.geometry.translate(-RADIUS - 0.008, 0, 0);
    const grip = new Mesh(new CylinderGeometry(0.018, 0.018, 0.12, 10), this.limbMaterial);
    const gem = new Mesh(new SphereGeometry(0.016, 12, 8), this.glow);
    gem.position.x = 0.02;

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

    // Arrow along +X with its nock at the origin.
    this.arrow = new Group();
    this.arrow.name = 'DrawnArrow';
    const shaftGeometry = new CylinderGeometry(0.004, 0.004, ARROW_LENGTH, 6);
    shaftGeometry.rotateZ(-Math.PI / 2);
    shaftGeometry.translate(ARROW_LENGTH / 2, 0, 0);
    const shaft = new Mesh(shaftGeometry, new MeshBasicMaterial({ color: '#E8FFF4', toneMapped: false }));
    const headGeometry = new CylinderGeometry(0, 0.014, 0.05, 4);
    headGeometry.rotateZ(-Math.PI / 2);
    headGeometry.translate(ARROW_LENGTH + 0.025, 0, 0);
    this.arrowHead = new Mesh(headGeometry, this.glow);
    this.arrow.add(shaft, this.arrowHead);
    this.arrow.visible = false;

    this.group.add(limb, edge, grip, gem, this.string, this.arrow);
    this.group.visible = false;
  }

  setColor(color: Color): void {
    this.glow.color.copy(color);
    this.stringMaterial.color.copy(color);
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
    if (this.arrow.visible) {
      this.arrow.position.copy(this.local);
      // Point the arrow's +X from the nock at the riser.
      this.a.copy(this.local).negate().normalize();
      this.arrow.quaternion.setFromUnitVectors(UNIT_X, this.a);
      this.arrowHead.scale.setScalar(1 + Math.min(1, draw / MAX_DRAW) * 0.8);
    }
    return draw;
  }
}
