import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  Points,
  PointsMaterial,
  QuadraticBezierCurve3,
  RepeatWrapping,
  RingGeometry,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from '@iwsdk/core';
import { createGlowSprite } from './vfx.js';

/**
 * The war for the Anchors as a big holographic galaxy: OBLIVAX's black hole
 * (accretion disc, jets) at the heart of a spiral of stars, with one world
 * per hero scattered along the arms. Each world is a textured planet with an
 * atmosphere, three orbiting level moons (lit when cleared) and an Anchor
 * gem that becomes a column of light to the core once recovered. Lanes link
 * the worlds (bright where both heroes are yours) with energy pulses racing
 * along them. The core opens when CONVERGENCE is ready. Poke or tap a planet
 * to pick it.
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

const MAP_RADIUS = 0.58;
const ARMS = [0.22, 0.34, 0.47];
const FONT = "'Bangers', 'Impact', sans-serif";

interface Planet {
  root: Group;
  body: Mesh;
  material: MeshBasicMaterial;
  texture: CanvasTexture;
  atmosphere: Mesh;
  atmosphereMaterial: MeshBasicMaterial;
  halo: Mesh;
  haloMaterial: MeshBasicMaterial;
  moons: Mesh[];
  moonMaterials: MeshBasicMaterial[];
  gem: Mesh;
  gemMaterial: MeshBasicMaterial;
  column: Mesh;
  columnMaterial: MeshBasicMaterial;
  label: Sprite;
  canvas: HTMLCanvasElement;
  labelTexture: CanvasTexture;
  node: GalaxyNode | null;
}

interface Lane {
  curve: QuadraticBezierCurve3;
  material: MeshBasicMaterial;
  pulse: Sprite;
  speed: number;
  lit: boolean;
}

/** A planet surface: bands and storms in the hero's colour. */
function planetTexture(color: string, seed: number): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const c = canvas.getContext('2d')!;
  const base = new Color(color);
  const dark = base.clone().multiplyScalar(0.3);
  const g = c.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, `#${dark.getHexString()}`);
  g.addColorStop(0.5, `#${base.getHexString()}`);
  g.addColorStop(1, `#${dark.getHexString()}`);
  c.fillStyle = g;
  c.fillRect(0, 0, 256, 128);
  let s = seed * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  // Cloud bands and swirls.
  for (let i = 0; i < 26; i += 1) {
    const y = rnd() * 128;
    c.fillStyle = `rgba(255,255,255,${0.04 + rnd() * 0.1})`;
    c.fillRect(0, y, 256, 2 + rnd() * 7);
  }
  for (let i = 0; i < 40; i += 1) {
    c.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '0,0,0'},${0.05 + rnd() * 0.12})`;
    c.beginPath();
    c.ellipse(rnd() * 256, rnd() * 128, 6 + rnd() * 22, 2 + rnd() * 7, 0, 0, Math.PI * 2);
    c.fill();
  }
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = RepeatWrapping;
  return t;
}

/** The spiral of stars on the table. */
function spiralTexture(): CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const c = canvas.getContext('2d')!;
  const mid = size / 2;
  const g = c.createRadialGradient(mid, mid, 0, mid, mid, mid);
  g.addColorStop(0, 'rgba(255,79,216,0.55)');
  g.addColorStop(0.25, 'rgba(120,60,200,0.22)');
  g.addColorStop(1, 'rgba(20,10,60,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, size, size);
  let s = 12345;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let arm = 0; arm < 3; arm += 1) {
    for (let i = 0; i < 700; i += 1) {
      const t = rnd();
      const radius = 14 + t * (mid - 24);
      const angle = (arm / 3) * Math.PI * 2 + t * 4.2 + (rnd() - 0.5) * (0.5 - t * 0.25);
      const x = mid + Math.cos(angle) * radius;
      const y = mid + Math.sin(angle) * radius;
      const hot = rnd() < 0.15;
      c.fillStyle = hot ? `rgba(255,255,255,${0.5 + rnd() * 0.4})` : `rgba(${100 + (rnd() * 120) | 0},${160 + (rnd() * 80) | 0},255,${0.4 + rnd() * 0.5})`;
      c.fillRect(x, y, hot ? 3 : 2, hot ? 3 : 2);
    }
  }
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** A glowing accretion disc: bright inner edge, streaks, soft outer fade. */
function discTexture(): CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const c = canvas.getContext('2d')!;
  const mid = size / 2;
  const g = c.createRadialGradient(mid, mid, mid * 0.36, mid, mid, mid);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,170,230,0.95)');
  g.addColorStop(0.5, 'rgba(255,79,216,0.5)');
  g.addColorStop(1, 'rgba(90,20,120,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, size, size);
  for (let i = 0; i < 90; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const r0 = mid * (0.4 + Math.random() * 0.5);
    c.strokeStyle = `rgba(255,255,255,${Math.random() * 0.18})`;
    c.lineWidth = 1;
    c.beginPath();
    c.arc(mid, mid, r0, a, a + 0.3 + Math.random() * 0.6);
    c.stroke();
  }
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export class Galaxy {
  readonly group = new Group();
  visible = false;
  /** Selected planet index; -1 = the OBLIVAX core. */
  selected = 0;
  private readonly world = new Group();
  private readonly planets: Planet[] = [];
  private readonly lanes: Lane[] = [];
  private readonly core: Mesh;
  private readonly coreMaterial: MeshBasicMaterial;
  private readonly discs: Mesh[] = [];
  private readonly coreGlow: Sprite;
  private readonly jets: Mesh[] = [];
  private readonly jetMaterial: MeshBasicMaterial;
  private readonly spiral: Mesh;
  private readonly stars: Points;
  private readonly selector: Mesh;
  private readonly selectorMaterial: MeshBasicMaterial;
  private readonly coreLabel: Sprite;
  private readonly coreCanvas: HTMLCanvasElement;
  private readonly coreTexture: CanvasTexture;
  private finale = false;
  private scale = 1;
  private readonly flat = new Vector3();
  private readonly p = new Vector3();

  constructor(count: number) {
    this.group.name = 'Galaxy';
    this.group.visible = false;
    this.group.add(this.world);

    // The table: a spiral of stars, rim ticks, and a starfield dome behind.
    this.spiral = new Mesh(
      new CircleGeometry(MAP_RADIUS, 64),
      new MeshBasicMaterial({ map: spiralTexture(), transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
    );
    this.spiral.rotation.x = -Math.PI / 2;
    this.world.add(this.spiral);
    for (const [r, o] of [[MAP_RADIUS, 0.55], [MAP_RADIUS * 0.8, 0.22], [MAP_RADIUS * 0.58, 0.18], [MAP_RADIUS * 0.36, 0.16]] as const) {
      const ring = new Mesh(new TorusGeometry(r, 0.0016, 4, 128), new MeshBasicMaterial({ color: '#3DF5FF', transparent: true, opacity: o, blending: AdditiveBlending, depthWrite: false }));
      ring.rotation.x = Math.PI / 2;
      this.world.add(ring);
    }
    const ticks = new Mesh(
      new RingGeometry(MAP_RADIUS + 0.01, MAP_RADIUS + 0.03, 120, 1),
      new MeshBasicMaterial({ color: '#3DF5FF', transparent: true, opacity: 0.35, wireframe: true, blending: AdditiveBlending, depthWrite: false }),
    );
    ticks.rotation.x = -Math.PI / 2;
    this.world.add(ticks);
    const starPositions = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const b = Math.acos(1 - Math.random() * 1.15);
      const r = 0.7 + Math.random() * 0.5;
      starPositions[i * 3] = Math.cos(a) * Math.sin(b) * r;
      starPositions[i * 3 + 1] = Math.cos(b) * r * 0.9 - 0.05;
      starPositions[i * 3 + 2] = Math.sin(a) * Math.sin(b) * r;
    }
    const starGeometry = new BufferGeometry();
    starGeometry.setAttribute('position', new BufferAttribute(starPositions, 3));
    this.stars = new Points(starGeometry, new PointsMaterial({ color: '#CFEFFF', size: 0.007, transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
    this.group.add(this.stars);
    for (const [x, z, color, size] of [[-0.5, -0.45, '#FF4FD8', 0.9], [0.55, -0.35, '#3DF5FF', 0.8], [0.1, -0.7, '#9D8CFF', 1.1]] as const) {
      const cloud = createGlowSprite(color, 0.28);
      cloud.position.set(x, 0.15, z);
      cloud.scale.setScalar(size);
      this.group.add(cloud);
    }

    // OBLIVAX: a black hole with two counter-rotating accretion discs and jets.
    this.coreMaterial = new MeshBasicMaterial({ color: '#000000' });
    this.core = new Mesh(new SphereGeometry(0.045, 24, 16), this.coreMaterial);
    this.core.position.y = 0.05;
    const disc = discTexture();
    for (const tilt of [0.35, -0.2]) {
      const d = new Mesh(new RingGeometry(0.05, 0.16, 64), new MeshBasicMaterial({ map: disc, transparent: true, side: 2, blending: AdditiveBlending, depthWrite: false, toneMapped: false }));
      d.position.y = 0.05;
      d.rotation.x = Math.PI / 2 + tilt;
      this.discs.push(d);
      this.world.add(d);
    }
    this.jetMaterial = new MeshBasicMaterial({ color: '#FF4FD8', transparent: true, opacity: 0.35, blending: AdditiveBlending, depthWrite: false });
    for (const sign of [1, -1]) {
      const jet = new Mesh(new CylinderGeometry(0.002, 0.014, 0.28, 8, 1, true), this.jetMaterial);
      jet.position.y = 0.05 + sign * 0.15;
      if (sign < 0) jet.rotation.x = Math.PI;
      this.jets.push(jet);
      this.world.add(jet);
    }
    this.coreGlow = createGlowSprite('#FF4FD8', 0.6);
    this.coreGlow.position.y = 0.05;
    this.coreGlow.scale.setScalar(0.5);
    this.coreCanvas = document.createElement('canvas');
    this.coreCanvas.width = 512;
    this.coreCanvas.height = 160;
    this.coreTexture = new CanvasTexture(this.coreCanvas);
    this.coreTexture.colorSpace = SRGBColorSpace;
    this.coreLabel = new Sprite(new SpriteMaterial({ map: this.coreTexture, depthTest: false, transparent: true }));
    this.coreLabel.scale.set(0.3, 0.094, 1);
    this.coreLabel.position.y = 0.34;
    this.coreLabel.renderOrder = 15;
    this.world.add(this.core, this.coreGlow, this.coreLabel);

    // Selection brackets that ride on the chosen world.
    this.selectorMaterial = new MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false });
    this.selector = new Mesh(new TorusGeometry(0.085, 0.003, 4, 6), this.selectorMaterial);
    this.selector.rotation.x = Math.PI / 2;
    this.world.add(this.selector);

    // Worlds scattered along the three arms, with lanes between neighbours and to the core.
    const spots: Vector3[] = [];
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2 - Math.PI / 2 + (i % 3) * 0.16;
      const r = ARMS[i % 3];
      const root = new Group();
      root.position.set(Math.cos(a) * r, 0.05, Math.sin(a) * r);
      spots.push(root.position.clone());
      const texture = planetTexture('#FFFFFF', i + 1);
      const material = new MeshBasicMaterial({ map: texture, color: '#FFFFFF', toneMapped: false });
      const body = new Mesh(new SphereGeometry(0.045, 28, 20), material);
      const atmosphereMaterial = new MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.35, blending: AdditiveBlending, depthWrite: false, side: BackSide });
      const atmosphere = new Mesh(new SphereGeometry(0.056, 20, 14), atmosphereMaterial);
      const haloMaterial = new MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.3, blending: AdditiveBlending, depthWrite: false });
      const halo = new Mesh(new TorusGeometry(0.075, 0.0022, 4, 56), haloMaterial);
      halo.rotation.x = Math.PI / 2 - 0.4;
      const moons: Mesh[] = [];
      const moonMaterials: MeshBasicMaterial[] = [];
      for (let k = 0; k < 3; k += 1) {
        const m = new MeshBasicMaterial({ color: '#555566' });
        const moon = new Mesh(new SphereGeometry(0.0095, 10, 8), m);
        moons.push(moon);
        moonMaterials.push(m);
        root.add(moon);
        const orbit = new Mesh(new TorusGeometry(0.07 + k * 0.012, 0.0008, 3, 48), new MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.12, blending: AdditiveBlending, depthWrite: false }));
        orbit.rotation.x = Math.PI / 2 + (k - 1) * 0.35;
        root.add(orbit);
      }
      const gemMaterial = new MeshBasicMaterial({ color: '#666677', wireframe: true });
      const gem = new Mesh(new OctahedronGeometry(0.016), gemMaterial);
      gem.position.y = 0.1;
      gem.scale.y = 1.6;
      const columnMaterial = new MeshBasicMaterial({ color: '#FFD23F', transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false });
      const column = new Mesh(new CylinderGeometry(0.004, 0.012, 0.3, 8, 1, true), columnMaterial);
      column.position.y = 0.25;
      const canvas = document.createElement('canvas');
      canvas.width = 384;
      canvas.height = 160;
      const labelTexture = new CanvasTexture(canvas);
      labelTexture.colorSpace = SRGBColorSpace;
      const label = new Sprite(new SpriteMaterial({ map: labelTexture, depthTest: false, transparent: true }));
      label.scale.set(0.16, 0.067, 1);
      label.position.y = 0.16;
      label.renderOrder = 15;
      root.add(body, atmosphere, halo, gem, column, label);
      this.world.add(root);
      this.planets.push({ root, body, material, texture, atmosphere, atmosphereMaterial, halo, haloMaterial, moons, moonMaterials, gem, gemMaterial, column, columnMaterial, label, canvas, labelTexture, node: null });
    }
    const makeLane = (from: Vector3, to: Vector3, lift: number, bend: number) => {
      const mid = from.clone().lerp(to, 0.5);
      mid.y += lift;
      mid.x += -(to.z - from.z) * bend;
      mid.z += (to.x - from.x) * bend;
      const curve = new QuadraticBezierCurve3(from.clone(), mid, to.clone());
      const material = new MeshBasicMaterial({ color: '#3DF5FF', transparent: true, opacity: 0.12, blending: AdditiveBlending, depthWrite: false });
      this.world.add(new Mesh(new TubeGeometry(curve, 28, 0.0016, 4), material));
      const pulse = createGlowSprite('#FFFFFF', 0.9);
      pulse.scale.setScalar(0.022);
      pulse.visible = false;
      this.world.add(pulse);
      this.lanes.push({ curve, material, pulse, speed: 0.12 + Math.random() * 0.1, lit: false });
    };
    // Neighbour lanes (lane i links world i and i+1), then one lane per world to the core.
    for (let i = 0; i < count; i += 1) makeLane(spots[i], spots[(i + 1) % count], 0.06, 0.12);
    for (let i = 0; i < count; i += 1) makeLane(spots[i], new Vector3(0, 0.05, 0), 0.04, -0.08);
  }

  /** Updates every planet and lane from progress; `finale` opens the core. */
  build(nodes: readonly GalaxyNode[], finale: boolean, anchors: number): void {
    const count = this.planets.length;
    nodes.forEach((node, i) => {
      const planet = this.planets[i];
      if (planet == null) return;
      if (planet.node == null || planet.node.color !== node.color) {
        planet.texture.dispose();
        planet.texture = planetTexture(node.color, i + 1);
        planet.material.map = planet.texture;
        planet.material.needsUpdate = true;
      }
      planet.node = node;
      const color = new Color(node.color);
      planet.material.color.set(node.owned ? '#FFFFFF' : '#555566');
      planet.atmosphereMaterial.color.copy(color);
      planet.atmosphereMaterial.opacity = node.owned ? 0.4 : 0.12;
      planet.haloMaterial.color.copy(color);
      planet.moonMaterials.forEach((m, k) => m.color.set(k < node.cleared ? node.color : '#3A3A48'));
      planet.gemMaterial.color.set(node.anchor ? '#FFD23F' : '#666677');
      planet.gemMaterial.wireframe = !node.anchor;
      planet.columnMaterial.opacity = node.anchor ? 0.5 : 0;
      this.drawLabel(planet, node);
    });
    // Lanes light up between worlds you own, and from every Anchor to the core.
    for (let i = 0; i < count; i += 1) {
      const a = nodes[i];
      const b = nodes[(i + 1) % count];
      const lit = !!a && !!b && a.owned && b.owned;
      this.setLane(this.lanes[i], lit, lit ? a.color : '#3DF5FF');
      const anchored = !!a && a.anchor;
      this.setLane(this.lanes[count + i], anchored, anchored ? '#FFD23F' : '#FF4FD8');
    }
    this.finale = finale;
    this.coreMaterial.color.set(finale ? '#331133' : '#000000');
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
    const sub = finale ? 'CONVERGENCE READY!' : `ANCHORS ${anchors}/${count} - NEED 3`;
    c.lineWidth = 9;
    c.strokeText(sub, 256, 128);
    c.fillStyle = finale ? '#FFD23F' : '#E9FCFF';
    c.fillText(sub, 256, 128);
    this.coreTexture.needsUpdate = true;
  }

  private setLane(lane: Lane | undefined, lit: boolean, color: string): void {
    if (lane == null) return;
    lane.lit = lit;
    lane.material.color.set(color);
    lane.material.opacity = lit ? 0.6 : 0.1;
    lane.pulse.material.color.set(color);
    lane.pulse.visible = lit;
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
    planet.labelTexture.needsUpdate = true;
  }

  /**
   * Floats the galaxy in front of the player. `scale` makes it bigger; the
   * default fills a good part of the view at arm's length.
   */
  show(head: Vector3, forward: Vector3, distance = 0.5, drop = 0.38, scale = 1.25, tilt = 0): void {
    this.flat.set(forward.x, 0, forward.z);
    if (this.flat.lengthSq() < 1e-4) this.flat.set(0, 0, -1);
    this.flat.normalize();
    this.group.position.copy(head).addScaledVector(this.flat, distance + 0.35 * scale);
    this.group.position.y = head.y - drop;
    this.group.rotation.set(tilt, Math.atan2(this.flat.x, this.flat.z) + Math.PI, 0, 'YXZ');
    this.scale = scale;
    this.group.scale.setScalar(scale);
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
    test(-1, 0.09 * this.scale);
    for (let i = 0; i < this.planets.length; i += 1) {
      this.planets[i].body.getWorldPosition(this.p);
      test(i, 0.07 * this.scale);
    }
    return best;
  }

  /** Planet index under a fingertip, -1 for the core, or -2 for nothing. */
  poked(tips: readonly Vector3[]): number {
    if (!this.visible) return -2;
    for (const tip of tips) {
      this.core.getWorldPosition(this.p);
      if (this.p.distanceTo(tip) < 0.08 * this.scale) return -1;
      for (let i = 0; i < this.planets.length; i += 1) {
        this.planets[i].body.getWorldPosition(this.p);
        if (this.p.distanceTo(tip) < 0.065 * this.scale) return i;
      }
    }
    return -2;
  }

  update(dt: number, time: number): void {
    if (!this.visible) return;
    this.spiral.rotation.z += dt * 0.03;
    this.stars.rotation.y += dt * 0.01;
    for (let i = 0; i < this.planets.length; i += 1) {
      const planet = this.planets[i];
      const selected = i === this.selected;
      planet.body.rotation.y += dt * (0.5 + (i % 3) * 0.15);
      planet.root.position.y = 0.05 + Math.sin(time * 1.2 + i) * 0.005;
      const s = selected ? 1.3 + Math.sin(time * 5) * 0.05 : 1;
      planet.body.scale.setScalar(s);
      planet.atmosphere.scale.setScalar(s);
      planet.halo.scale.setScalar(s * (selected ? 1.1 : 1));
      planet.halo.rotation.z += dt * 0.5;
      planet.haloMaterial.opacity = selected ? 0.95 : 0.25;
      planet.moons.forEach((moon, k) => {
        const a = time * (0.9 + k * 0.35) + (k * Math.PI * 2) / 3;
        const r = 0.07 + k * 0.012;
        moon.position.set(Math.cos(a) * r, Math.sin(a * 0.7) * 0.02 * (k - 1), Math.sin(a) * r);
      });
      planet.gem.rotation.y += dt * (planet.node?.anchor ? 2.5 : 0.5);
      if (planet.node?.anchor) planet.columnMaterial.opacity = 0.4 + Math.sin(time * 4 + i) * 0.15;
      planet.label.visible = true;
    }
    const pulse = this.finale ? 1 + Math.sin(time * 6) * 0.12 : 1;
    this.core.scale.setScalar((this.selected === -1 ? 1.3 : 1) * pulse);
    this.discs[0].rotation.z += dt * 0.9;
    this.discs[1].rotation.z -= dt * 0.6;
    this.coreGlow.scale.setScalar((this.finale ? 0.75 : 0.5) * (1 + Math.sin(time * 3) * 0.08));
    this.jetMaterial.opacity = this.finale ? 0.7 : 0.3;
    // Energy racing along every lit lane.
    for (const lane of this.lanes) {
      if (!lane.lit) continue;
      const t = (time * lane.speed) % 1;
      lane.curve.getPoint(t, this.p);
      lane.pulse.position.copy(this.p);
    }
    // The selector rides on the chosen world (or the core).
    if (this.selected >= 0 && this.planets[this.selected]) this.selector.position.copy(this.planets[this.selected].root.position);
    else this.selector.position.set(0, 0.05, 0);
    this.selector.rotation.z += dt * 1.2;
    this.selector.scale.setScalar(this.selected === -1 ? 1.5 : 1);
    this.selectorMaterial.opacity = 0.6 + Math.sin(time * 6) * 0.3;
  }
}
