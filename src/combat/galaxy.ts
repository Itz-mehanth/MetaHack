import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
} from '@iwsdk/core';

/**
 * The war for the Anchors as a table-top hologram galaxy: one planet per
 * hero's region in a ring around OBLIVAX's core. Each planet shows its
 * hero colour, three level moons (lit when cleared), the Anchor gem above
 * it (gold once recovered), and a beam to the core that lights up with the
 * Anchor. The core opens when CONVERGENCE is ready. Poke a planet to pick it.
 */

export interface GalaxyNode {
  readonly id: string;
  readonly name: string;
  readonly region: string;
  readonly color: string;
  readonly cleared: number;
  readonly stars: number;
  readonly owned: boolean;
  readonly anchor: boolean;
}

const RADIUS = 0.3;
const FONT = "'Bangers', 'Impact', sans-serif";

interface Planet {
  root: Group;
  body: Mesh;
  material: MeshStandardMaterial;
  halo: Mesh;
  haloMaterial: MeshBasicMaterial;
  moons: Mesh[];
  moonMaterials: MeshBasicMaterial[];
  gem: Mesh;
  gemMaterial: MeshBasicMaterial;
  beam: Mesh;
  beamMaterial: MeshBasicMaterial;
  label: Sprite;
  canvas: HTMLCanvasElement;
  texture: CanvasTexture;
  node: GalaxyNode | null;
}

export class Galaxy {
  readonly group = new Group();
  visible = false;
  /** Selected planet index; -1 = the OBLIVAX core. */
  selected = 0;
  private readonly planets: Planet[] = [];
  private readonly core: Mesh;
  private readonly coreMaterial: MeshBasicMaterial;
  private readonly coreRing: Mesh;
  private readonly coreRingMaterial: MeshBasicMaterial;
  private readonly coreLabel: Sprite;
  private readonly coreCanvas: HTMLCanvasElement;
  private readonly coreTexture: CanvasTexture;
  private finale = false;
  private readonly flat = new Vector3();
  private readonly p = new Vector3();

  constructor(count: number) {
    this.group.name = 'Galaxy';
    this.group.visible = false;
    const disc = new Mesh(
      new CylinderGeometry(RADIUS + 0.08, RADIUS + 0.08, 0.004, 64, 1, true),
      new MeshBasicMaterial({ color: '#3DF5FF', transparent: true, opacity: 0.25, blending: AdditiveBlending, depthWrite: false }),
    );
    this.group.add(disc);
    const orbit = new Mesh(
      new TorusGeometry(RADIUS, 0.0015, 4, 96),
      new MeshBasicMaterial({ color: '#3DF5FF', transparent: true, opacity: 0.4, blending: AdditiveBlending, depthWrite: false }),
    );
    orbit.rotation.x = Math.PI / 2;
    this.group.add(orbit);

    this.coreMaterial = new MeshBasicMaterial({ color: '#2A0A2A' });
    this.core = new Mesh(new IcosahedronGeometry(0.05, 2), this.coreMaterial);
    this.coreRingMaterial = new MeshBasicMaterial({ color: '#FF4FD8', transparent: true, opacity: 0.6, blending: AdditiveBlending, depthWrite: false });
    this.coreRing = new Mesh(new TorusGeometry(0.075, 0.004, 6, 48), this.coreRingMaterial);
    this.core.position.y = 0.06;
    this.coreRing.position.y = 0.06;
    this.coreCanvas = document.createElement('canvas');
    this.coreCanvas.width = 512;
    this.coreCanvas.height = 160;
    this.coreTexture = new CanvasTexture(this.coreCanvas);
    this.coreTexture.colorSpace = SRGBColorSpace;
    this.coreLabel = new Sprite(new SpriteMaterial({ map: this.coreTexture, depthTest: false, transparent: true }));
    this.coreLabel.scale.set(0.2, 0.0625, 1);
    this.coreLabel.position.y = 0.17;
    this.coreLabel.renderOrder = 15;
    this.group.add(this.core, this.coreRing, this.coreLabel);

    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2 - Math.PI / 2;
      const root = new Group();
      root.position.set(Math.cos(a) * RADIUS, 0.05, Math.sin(a) * RADIUS);
      const material = new MeshStandardMaterial({ color: '#FFFFFF', emissive: '#FFFFFF', emissiveIntensity: 0.35, roughness: 0.6 });
      const body = new Mesh(new SphereGeometry(0.035, 24, 16), material);
      const haloMaterial = new MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.5, blending: AdditiveBlending, depthWrite: false });
      const halo = new Mesh(new TorusGeometry(0.05, 0.003, 4, 40), haloMaterial);
      halo.rotation.x = Math.PI / 2 - 0.4;
      const moons: Mesh[] = [];
      const moonMaterials: MeshBasicMaterial[] = [];
      for (let k = 0; k < 3; k += 1) {
        const m = new MeshBasicMaterial({ color: '#555566' });
        const moon = new Mesh(new SphereGeometry(0.008, 10, 8), m);
        moons.push(moon);
        moonMaterials.push(m);
        root.add(moon);
      }
      const gemMaterial = new MeshBasicMaterial({ color: '#666677', wireframe: true });
      const gem = new Mesh(new OctahedronGeometry(0.014), gemMaterial);
      gem.position.y = 0.065;
      gem.scale.y = 1.6;
      // Beam from this planet to the core, laid along the floor of the disc.
      const beamMaterial = new MeshBasicMaterial({ color: '#FFD23F', transparent: true, opacity: 0.08, blending: AdditiveBlending, depthWrite: false });
      const beam = new Mesh(new CylinderGeometry(0.0025, 0.0025, RADIUS, 6), beamMaterial);
      beam.position.set(-Math.cos(a) * RADIUS * 0.5, -0.04, -Math.sin(a) * RADIUS * 0.5);
      beam.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(-Math.cos(a), 0, -Math.sin(a)));
      const canvas = document.createElement('canvas');
      canvas.width = 384;
      canvas.height = 160;
      const texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;
      const label = new Sprite(new SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
      label.scale.set(0.1, 0.042, 1);
      label.position.y = 0.105;
      label.renderOrder = 15;
      root.add(body, halo, gem, beam, label);
      this.group.add(root);
      this.planets.push({ root, body, material, halo, haloMaterial, moons, moonMaterials, gem, gemMaterial, beam, beamMaterial, label, canvas, texture, node: null });
    }
  }

  /** Updates every planet from progress; `finale` opens the core. */
  build(nodes: readonly GalaxyNode[], finale: boolean, anchors: number): void {
    nodes.forEach((node, i) => {
      const planet = this.planets[i];
      if (planet == null) return;
      planet.node = node;
      const color = new Color(node.color);
      planet.material.color.copy(color).multiplyScalar(node.owned ? 1 : 0.35);
      planet.material.emissive.copy(color);
      planet.material.emissiveIntensity = node.owned ? 0.5 : 0.12;
      planet.haloMaterial.color.copy(color);
      planet.moonMaterials.forEach((m, k) => m.color.set(k < node.cleared ? node.color : '#3A3A48'));
      planet.gemMaterial.color.set(node.anchor ? '#FFD23F' : '#666677');
      planet.gemMaterial.wireframe = !node.anchor;
      planet.beamMaterial.opacity = node.anchor ? 0.75 : 0.08;
      this.drawLabel(planet, node);
    });
    this.finale = finale;
    this.coreMaterial.color.set(finale ? '#FFFFFF' : '#2A0A2A');
    const c = this.coreCanvas.getContext('2d')!;
    c.clearRect(0, 0, 512, 160);
    c.textAlign = 'center';
    c.lineJoin = 'round';
    c.font = `72px ${FONT}`;
    c.lineWidth = 12;
    c.strokeStyle = '#0A0A12';
    c.strokeText('OBLIVAX', 256, 62);
    c.fillStyle = '#FF4FD8';
    c.fillText('OBLIVAX', 256, 62);
    c.font = `44px ${FONT}`;
    const sub = finale ? 'CONVERGENCE READY!' : `ANCHORS ${anchors}/9 - NEED 3`;
    c.lineWidth = 9;
    c.strokeText(sub, 256, 128);
    c.fillStyle = finale ? '#FFD23F' : '#E9FCFF';
    c.fillText(sub, 256, 128);
    this.coreTexture.needsUpdate = true;
  }

  private drawLabel(planet: Planet, node: GalaxyNode): void {
    const c = planet.canvas.getContext('2d')!;
    c.clearRect(0, 0, 384, 160);
    c.textAlign = 'center';
    c.lineJoin = 'round';
    c.font = `64px ${FONT}`;
    c.lineWidth = 11;
    c.strokeStyle = '#0A0A12';
    c.strokeText(node.name, 192, 58);
    c.fillStyle = node.owned ? node.color : '#8A8A99';
    c.fillText(node.name, 192, 58);
    c.font = `38px ${FONT}`;
    c.lineWidth = 8;
    const status = node.anchor ? 'ANCHOR SECURED' : node.owned ? `${node.cleared}/3 CLEARED` : 'LOCKED HERO';
    c.strokeText(status, 192, 118);
    c.fillStyle = node.anchor ? '#FFD23F' : '#E9FCFF';
    c.fillText(status, 192, 118);
    planet.texture.needsUpdate = true;
  }

  /** Floats the galaxy at chest height in front of the player, within reach. */
  show(head: Vector3, forward: Vector3, distance = 0.5, drop = 0.38): void {
    this.flat.set(forward.x, 0, forward.z);
    if (this.flat.lengthSq() < 1e-4) this.flat.set(0, 0, -1);
    this.flat.normalize();
    this.group.position.copy(head).addScaledVector(this.flat, distance);
    this.group.position.y = head.y - drop;
    this.group.rotation.set(0, Math.atan2(this.flat.x, this.flat.z) + Math.PI, 0);
    this.visible = true;
    this.group.visible = true;
  }

  hide(): void {
    this.visible = false;
    this.group.visible = false;
  }

  /** Planet index along a ray (screen play: a tap), -1 for the core, or -2 for nothing. */
  pick(origin: Vector3, direction: Vector3): number {
    if (!this.visible) return -2;
    let best = -2;
    let closest = Infinity;
    const test = (index: number, radius: number) => {
      this.p.sub(origin);
      const along = this.p.dot(direction);
      if (along <= 0) return;
      const miss = Math.sqrt(Math.max(0, this.p.lengthSq() - along * along));
      if (miss < radius && along < closest) {
        closest = along;
        best = index;
      }
    };
    this.core.getWorldPosition(this.p);
    test(-1, 0.07);
    for (let i = 0; i < this.planets.length; i += 1) {
      this.planets[i].body.getWorldPosition(this.p);
      test(i, 0.055);
    }
    return best;
  }

  /** Planet index under a fingertip, -1 for the core, or -2 for nothing. */
  poked(tips: readonly Vector3[]): number {
    if (!this.visible) return -2;
    for (const tip of tips) {
      this.core.getWorldPosition(this.p);
      if (this.p.distanceTo(tip) < 0.06) return -1;
      for (let i = 0; i < this.planets.length; i += 1) {
        this.planets[i].body.getWorldPosition(this.p);
        if (this.p.distanceTo(tip) < 0.05) return i;
      }
    }
    return -2;
  }

  update(dt: number, time: number): void {
    if (!this.visible) return;
    for (let i = 0; i < this.planets.length; i += 1) {
      const planet = this.planets[i];
      const selected = i === this.selected;
      planet.body.rotation.y += dt * 0.6;
      planet.body.position.y = Math.sin(time * 1.4 + i) * 0.006;
      const s = selected ? 1.35 + Math.sin(time * 5) * 0.05 : 1;
      planet.body.scale.setScalar(s);
      planet.halo.scale.setScalar(s);
      planet.haloMaterial.opacity = selected ? 0.95 : 0.3;
      planet.moons.forEach((moon, k) => {
        const a = time * (0.9 + k * 0.3) + (k * Math.PI * 2) / 3;
        moon.position.set(Math.cos(a) * 0.055, Math.sin(a * 0.7) * 0.01, Math.sin(a) * 0.055);
      });
      planet.gem.rotation.y += dt * (planet.node?.anchor ? 2.5 : 0.5);
      if (planet.node?.anchor) planet.beamMaterial.opacity = 0.5 + Math.sin(time * 4 + i) * 0.25;
    }
    const pulse = this.finale ? 1 + Math.sin(time * 6) * 0.12 : 1;
    this.core.scale.setScalar((this.selected === -1 ? 1.3 : 1) * pulse);
    this.core.rotation.y += dt * 0.4;
    this.coreRing.rotation.set(Math.PI / 2 + Math.sin(time) * 0.3, time * 0.7, 0);
    this.coreRingMaterial.opacity = this.finale ? 0.9 : 0.35;
  }
}
