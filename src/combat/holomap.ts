import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  Line,
  LineDashedMaterial,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  OctahedronGeometry,
  PlaneGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
} from '@iwsdk/core';
import type { Chapter } from './story.js';

const MAP_RADIUS = 0.36;
const FONT = "'Bangers', 'Impact', sans-serif";

export type NodeState = 'locked' | 'open' | 'cleared';

interface MapNode {
  group: Group;
  pillar: MeshBasicMaterial;
  ring: Mesh;
  label: Mesh;
  canvas: HTMLCanvasElement;
  texture: CanvasTexture;
  state: NodeState;
  stars: number;
  boss: boolean;
}

function holo(color: Color | string, opacity: number): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
  });
}

/** Deterministic pseudo-random numbers so each region's terrain is stable. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Holographic war-room table showing one hero's region: stylised terrain,
 * level nodes on a dashed route, a radar sweep, and the hero's figure on
 * the selected node. Rebuilt whenever the chapter changes.
 */
export class HoloMap {
  readonly group = new Group();
  visible = false;
  selected = 0;
  private content = new Group();
  private nodes: MapNode[] = [];
  private sweep: Mesh | null = null;
  private marker: Object3D | null = null;
  private chapterId = '';
  private readonly flat = new Vector3();
  private readonly tmp = new Vector3();

  constructor() {
    this.group.name = 'HoloMap';
    this.group.visible = false;
    this.group.add(this.content);
  }

  /** Builds the map for `chapter` in its hero's `color`. */
  build(chapter: Chapter, color: string, marker: Object3D | null): void {
    if (this.chapterId === chapter.hero && this.marker === marker) return;
    this.chapterId = chapter.hero;
    this.group.remove(this.content);
    this.content = new Group();
    this.group.add(this.content);
    this.nodes = [];
    const c = new Color(color);
    const villain = new Color(chapter.villain.color);

    // Table: dark glass disc, glowing rim, rings and spokes.
    const base = new Mesh(new CylinderGeometry(MAP_RADIUS + 0.04, MAP_RADIUS + 0.06, 0.03, 48), new MeshBasicMaterial({ color: '#06040E', transparent: true, opacity: 0.85 }));
    base.position.y = -0.02;
    const rim = new Mesh(new TorusGeometry(MAP_RADIUS + 0.04, 0.004, 6, 96), holo(c, 0.9));
    rim.rotation.x = Math.PI / 2;
    this.content.add(base, rim);
    for (const r of [0.33, 0.66, 1]) {
      const ring = new Mesh(new TorusGeometry(MAP_RADIUS * r, 0.0012, 4, 80), holo(c, 0.25));
      ring.rotation.x = Math.PI / 2;
      this.content.add(ring);
    }
    for (let i = 0; i < 12; i += 1) {
      const spoke = new Mesh(new BoxGeometry(0.0015, 0.0005, MAP_RADIUS), holo(c, 0.15));
      const a = (i / 12) * Math.PI * 2;
      spoke.position.set(Math.sin(a) * MAP_RADIUS * 0.5, 0, Math.cos(a) * MAP_RADIUS * 0.5);
      spoke.rotation.y = a;
      this.content.add(spoke);
    }

    // Terrain in the region's style.
    const random = seeded(chapter.hero.length * 7919 + chapter.region.length * 104729);
    const terrain = holo(c, 0.32);
    const enemyZone = holo(villain, 0.28);
    for (let i = 0; i < 38; i += 1) {
      const a = random() * Math.PI * 2;
      const r = Math.sqrt(random()) * MAP_RADIUS * 0.92;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const h = 0.02 + random() * 0.07;
      let geometry: BufferGeometry;
      if (chapter.worldId === 'neon-grid') geometry = new BoxGeometry(0.025, h, 0.025);
      else if (chapter.worldId === 'ember-foundry') geometry = new ConeGeometry(0.03, h, 5);
      else if (chapter.worldId === 'storm-peak') geometry = new IcosahedronGeometry(0.018 + random() * 0.015, 0);
      else if (chapter.worldId === 'frost-spire') geometry = new ConeGeometry(0.012, h * 1.6, 4);
      else geometry = new OctahedronGeometry(0.02 + random() * 0.012, 0);
      const piece = new Mesh(geometry, random() < 0.3 ? enemyZone : terrain);
      piece.position.set(x, chapter.worldId === 'storm-peak' ? 0.03 + random() * 0.05 : h / 2, z);
      piece.rotation.y = random() * Math.PI;
      this.content.add(piece);
    }

    // Route between levels.
    const points = chapter.levels.map((l) => new Vector3(l.map[0] * MAP_RADIUS, 0.012, l.map[1] * MAP_RADIUS));
    const route = new Line(
      new BufferGeometry().setFromPoints(points),
      new LineDashedMaterial({ color: c, dashSize: 0.015, gapSize: 0.01, transparent: true, opacity: 0.9 }),
    );
    route.computeLineDistances();
    this.content.add(route);

    // Level nodes.
    chapter.levels.forEach((level, i) => {
      const group = new Group();
      group.position.copy(points[i]);
      const boss = i === chapter.levels.length - 1;
      const pillar = holo(boss ? villain : c, 0.8);
      const column = new Mesh(new CylinderGeometry(0.012, 0.018, boss ? 0.09 : 0.05, 10), pillar);
      column.position.y = boss ? 0.045 : 0.025;
      const ring = new Mesh(new TorusGeometry(boss ? 0.04 : 0.03, 0.003, 6, 32), holo(boss ? villain : c, 0.9));
      ring.rotation.x = Math.PI / 2;
      const pad = new Mesh(new CircleGeometry(boss ? 0.04 : 0.03, 24), holo(boss ? villain : c, 0.2));
      pad.rotation.x = -Math.PI / 2;
      group.add(column, ring, pad);
      if (boss) {
        const crown = new Mesh(new OctahedronGeometry(0.02, 0), holo(villain, 0.9));
        crown.position.y = 0.11;
        crown.name = 'Crown';
        group.add(crown);
      }
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 160;
      const texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;
      const label = new Mesh(
        new PlaneGeometry(0.16, 0.05),
        new MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }),
      );
      label.position.y = boss ? 0.16 : 0.1;
      group.add(label);
      this.content.add(group);
      const node: MapNode = { group, pillar, ring, label, canvas, texture, state: 'locked', stars: 0, boss };
      this.nodes.push(node);
      this.drawLabel(node, `${i + 1}. ${level.location}`);
    });

    // Radar sweep.
    this.sweep = new Mesh(new CircleGeometry(MAP_RADIUS, 32, 0, 0.5), holo(c, 0.12));
    this.sweep.rotation.x = -Math.PI / 2;
    this.sweep.position.y = 0.003;
    this.content.add(this.sweep);

    // Hero figure on the selected node.
    this.marker = marker;
    if (marker) {
      marker.scale.setScalar(0.09);
      this.content.add(marker);
    }
    void document.fonts?.load(`32px Bangers`).then(() => {
      chapter.levels.forEach((level, i) => this.drawLabel(this.nodes[i], `${i + 1}. ${level.location}`));
    });
  }

  private drawLabel(node: MapNode | undefined, text: string): void {
    if (node == null) return;
    const c = node.canvas.getContext('2d')!;
    c.clearRect(0, 0, 512, 160);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `64px ${FONT}`;
    c.lineWidth = 10;
    c.lineJoin = 'round';
    c.strokeStyle = '#05050A';
    c.strokeText(text, 256, 56);
    c.fillStyle = node.state === 'locked' ? '#7A7A8A' : '#FFF6D6';
    c.fillText(text, 256, 56);
    const stars = node.state === 'locked' ? 'LOCKED' : '★'.repeat(node.stars) + '☆'.repeat(3 - node.stars);
    c.font = `52px ${FONT}`;
    c.strokeText(stars, 256, 124);
    c.fillStyle = node.state === 'locked' ? '#7A7A8A' : '#FFD23F';
    c.fillText(stars, 256, 124);
    node.texture.needsUpdate = true;
  }

  setNode(index: number, state: NodeState, stars: number, text: string): void {
    const node = this.nodes[index];
    if (node == null) return;
    if (node.state === state && node.stars === stars) return;
    node.state = state;
    node.stars = stars;
    this.drawLabel(node, text);
  }

  /** Floats the table at waist height ahead of `head`. */
  show(head: Vector3, forward: Vector3): void {
    this.flat.set(forward.x, 0, forward.z);
    if (this.flat.lengthSq() < 1e-4) this.flat.set(0, 0, -1);
    this.flat.normalize();
    this.group.position.copy(head).addScaledVector(this.flat, 0.62);
    this.group.position.y = head.y - 0.62;
    this.group.rotation.set(0, Math.atan2(this.flat.x, this.flat.z) + Math.PI, 0);
    this.visible = true;
    this.group.visible = true;
  }

  hide(): void {
    this.visible = false;
    this.group.visible = false;
  }

  /** Index of the node a fingertip is touching, or -1. */
  pokedNode(tips: readonly Vector3[]): number {
    if (!this.visible) return -1;
    for (const tip of tips) {
      for (let i = 0; i < this.nodes.length; i += 1) {
        this.nodes[i].group.getWorldPosition(this.tmp);
        this.tmp.y += 0.04;
        if (this.tmp.distanceTo(tip) < 0.05 && this.nodes[i].state !== 'locked') return i;
      }
    }
    return -1;
  }

  update(dt: number, time: number, head: Vector3): void {
    if (!this.visible) return;
    if (this.sweep) this.sweep.rotation.z = -time * 1.2;
    this.nodes.forEach((node, i) => {
      const selected = i === this.selected;
      const pulse = selected ? 0.6 + 0.4 * Math.sin(time * 5) : 0.5;
      node.pillar.opacity = node.state === 'locked' ? 0.15 : node.state === 'cleared' ? 0.9 : pulse;
      if (node.state === 'cleared') node.pillar.color.set('#FFD23F');
      node.ring.scale.setScalar(selected ? 1.2 + 0.15 * Math.sin(time * 4) : 1);
      node.ring.rotation.z += dt * (selected ? 2 : 0.4);
      const crown = node.group.getObjectByName('Crown');
      if (crown) crown.rotation.y += dt * 1.5;
      node.label.lookAt(head);
    });
    const target = this.nodes[this.selected];
    if (this.marker && target) {
      this.tmp.copy(target.group.position);
      this.tmp.y = 0.06 + Math.sin(time * 3) * 0.005;
      this.marker.position.lerp(this.tmp, Math.min(1, dt * 5));
      this.marker.rotation.y += dt * 0.8;
    }
  }
}
