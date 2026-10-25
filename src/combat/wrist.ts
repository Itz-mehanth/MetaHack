import {
  AdditiveBlending,
  CanvasTexture,
  type Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from '@iwsdk/core';
import { type HandPose, J } from './gauntlet.js';

/**
 * Holographic hero-select button on top of the left wrist cuff, with a
 * floating name label. Tapping it with the other index fingertip cycles the
 * hero; `pressed()` reports a debounced tap.
 */
export class WristButton {
  readonly group = new Group();
  readonly center = new Vector3();
  private readonly disc: MeshBasicMaterial;
  private readonly halo: MeshBasicMaterial;
  private readonly labelCanvas: HTMLCanvasElement;
  private readonly labelTexture: CanvasTexture;
  private readonly label: Mesh;
  private readonly q = new Quaternion();
  private readonly up = new Vector3();
  private readonly back = new Vector3();
  private cooldown = 0;
  private pulse = 0;
  private lastName = '';

  constructor() {
    this.group.name = 'HeroButton';
    this.disc = new MeshBasicMaterial({ color: '#3DF5FF', toneMapped: false, transparent: true, opacity: 0.9 });
    this.halo = new MeshBasicMaterial({
      color: '#3DF5FF',
      transparent: true,
      opacity: 0.35,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const disc = new Mesh(new CylinderGeometry(0.014, 0.014, 0.004, 6), this.disc);
    const halo = new Mesh(new CylinderGeometry(0.022, 0.022, 0.001, 6), this.halo);
    halo.position.y = -0.002;

    this.labelCanvas = document.createElement('canvas');
    this.labelCanvas.width = 256;
    this.labelCanvas.height = 64;
    this.labelTexture = new CanvasTexture(this.labelCanvas);
    this.labelTexture.colorSpace = SRGBColorSpace;
    this.label = new Mesh(
      new PlaneGeometry(0.08, 0.02),
      new MeshBasicMaterial({ map: this.labelTexture, transparent: true, depthWrite: false, toneMapped: false }),
    );
    this.label.position.set(0, 0.012, 0.03);
    this.label.rotation.x = -Math.PI / 2;
    this.label.rotation.z = Math.PI;

    this.group.add(disc, halo, this.label);
    this.group.visible = false;
  }

  setHero(name: string, color: Color): void {
    this.disc.color.copy(color);
    this.halo.color.copy(color);
    if (name === this.lastName) return;
    this.lastName = name;
    const c = this.labelCanvas.getContext('2d')!;
    c.clearRect(0, 0, 256, 64);
    c.font = "900 38px 'Orbitron', sans-serif";
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#FFFFFF';
    c.shadowColor = `#${color.getHexString()}`;
    c.shadowBlur = 14;
    c.fillText(name, 128, 34);
    this.labelTexture.needsUpdate = true;
  }

  /** Poses the button on the back of the wrist; returns true on a new tap. */
  update(left: HandPose, right: HandPose, dt: number): boolean {
    this.cooldown -= dt;
    this.pulse = Math.max(0, this.pulse - dt * 3);
    this.group.visible = left.tracked;
    if (!left.tracked) return false;
    left.position(J.wrist, this.center);
    left.quaternion(J.wrist, this.q);
    this.up.set(0, 1, 0).applyQuaternion(this.q);
    this.back.set(0, 0, 1).applyQuaternion(this.q);
    this.center.addScaledVector(this.up, 0.05).addScaledVector(this.back, 0.045);
    this.group.position.copy(this.center);
    this.group.quaternion.copy(this.q);
    this.group.scale.setScalar(1 + this.pulse * 0.4);
    this.halo.opacity = 0.35 + this.pulse * 0.6;

    if (!right.tracked || this.cooldown > 0) return false;
    right.position(9, this.back);
    if (this.back.distanceTo(this.center) > 0.028) return false;
    this.cooldown = 0.7;
    this.pulse = 1;
    return true;
  }
}
