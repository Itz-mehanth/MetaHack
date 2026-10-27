import {
  AdditiveBlending,
  BoxGeometry,
  type Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  Quaternion,
  RingGeometry,
  Vector3,
} from '@iwsdk/core';
import { createGlowSprite } from './vfx.js';
import { styleColors } from './gauntlet.js';

/**
 * A partial suit: armoured forearm sleeves from each gauntlet toward an
 * estimated elbow, and a glowing chest emblem that only shows when the player
 * looks down. No helmet, torso or legs: there is no body tracking, so
 * anything bigger would swim, and the real view stays clear in passthrough.
 */

const SLEEVE = 0.2;

interface Sleeve {
  group: Group;
}

export class Suit {
  private readonly sleeves: Sleeve[] = [];
  private readonly armor = new MeshStandardMaterial({ color: '#2A2D38', metalness: 0.85, roughness: 0.3 });
  private readonly trim = new MeshStandardMaterial({ color: '#8A8FA3', metalness: 1, roughness: 0.2 });
  private readonly glow = new MeshBasicMaterial({ color: '#3DF5FF', toneMapped: false });
  private readonly emblem = new Group();
  private readonly emblemGlow = new MeshBasicMaterial({ color: '#3DF5FF', transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
  private readonly sprite;
  private readonly q = new Quaternion();
  private readonly up = new Vector3(0, 1, 0);
  private readonly shoulder = new Vector3();
  private readonly dir = new Vector3();
  private readonly right = new Vector3();
  private readonly flat = new Vector3();

  constructor(parent: Object3D, color: Color) {
    const tube = new CylinderGeometry(0.06, 0.047, SLEEVE, 14, 1, true);
    const band = new CylinderGeometry(0.0635, 0.0635, 0.012, 14, 1, true);
    const strip = new BoxGeometry(0.008, SLEEVE * 0.9, 0.004);
    for (let i = 0; i < 2; i += 1) {
      const group = new Group();
      const body = new Mesh(tube, this.armor);
      body.material.side = 2;
      group.add(body);
      for (const y of [-0.07, 0.01, 0.08]) {
        const b = new Mesh(band, this.trim);
        b.position.y = y;
        group.add(b);
      }
      const s = new Mesh(strip, this.glow);
      s.position.set(0, 0, 0.056);
      group.add(s);
      group.visible = false;
      parent.add(group);
      this.sleeves.push({ group });
    }
    // Chest emblem: a hex plate with a glowing ring and core.
    this.emblem.add(new Mesh(new CylinderGeometry(0.085, 0.085, 0.012, 6), this.armor), new Mesh(new RingGeometry(0.045, 0.062, 6), this.emblemGlow));
    this.emblem.children[0].rotation.x = Math.PI / 2;
    this.emblem.children[1].position.z = 0.012;
    this.sprite = createGlowSprite(color, 0.9);
    this.sprite.scale.setScalar(0.12);
    this.sprite.position.z = 0.03;
    this.emblem.add(this.sprite);
    this.emblem.visible = false;
    parent.add(this.emblem);
    this.setStyle('arc', color);
  }

  /** Restyles for `hero`: its glove's armour and trim, and the glow colour. */
  setStyle(hero: string, color: Color): void {
    const { armor, trim } = styleColors(hero);
    this.armor.color.set(armor);
    this.trim.color.set(trim);
    this.glow.color.copy(color);
    this.emblemGlow.color.copy(color);
    this.sprite.material.color.copy(color);
  }

  /**
   * Poses the sleeves (`wrists` in world space, left then right; null when a
   * hand is not tracked) and the emblem; `head`/`forward` place the shoulders.
   */
  update(wrists: ReadonlyArray<Vector3 | null>, head: Vector3, forward: Vector3, time: number): void {
    this.flat.set(forward.x, 0, forward.z);
    if (this.flat.lengthSq() < 1e-4) this.flat.set(0, 0, -1);
    this.flat.normalize();
    this.right.set(-this.flat.z, 0, this.flat.x);
    for (let i = 0; i < 2; i += 1) {
      const wrist = wrists[i];
      const sleeve = this.sleeves[i].group;
      sleeve.visible = wrist != null;
      if (wrist == null) continue;
      // The elbow is on the line to the shoulder, a little low.
      this.shoulder.copy(head).addScaledVector(this.right, i === 0 ? -0.2 : 0.2);
      this.shoulder.y -= 0.25;
      this.dir.subVectors(this.shoulder, wrist);
      this.dir.y -= 0.12;
      this.dir.normalize();
      sleeve.position.copy(wrist).addScaledVector(this.dir, SLEEVE * 0.5 + 0.03);
      this.q.setFromUnitVectors(this.up, this.dir);
      sleeve.quaternion.copy(this.q);
      // The wide end (the cylinder's +Y) faces the elbow.
    }
    // The emblem rides below the chin and shows when looking down.
    const down = Math.max(0, Math.min(1, (-forward.y - 0.3) / 0.35));
    this.emblem.visible = down > 0.02;
    if (this.emblem.visible) {
      this.emblem.position.copy(head).addScaledVector(this.flat, 0.13);
      this.emblem.position.y -= 0.27;
      this.dir.subVectors(head, this.emblem.position).normalize();
      this.emblem.lookAt(this.emblem.position.x + this.dir.x, this.emblem.position.y + this.dir.y, this.emblem.position.z + this.dir.z);
      this.emblem.scale.setScalar(down * (1 + Math.sin(time * 3) * 0.04));
    }
  }

  hide(): void {
    for (const s of this.sleeves) s.group.visible = false;
    this.emblem.visible = false;
  }
}
