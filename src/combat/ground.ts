import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  RepeatWrapping,
  ShapeUtils,
  SRGBColorSpace,
  Vector2,
} from '@iwsdk/core';

const MAX_VERTS = 8 * 66;
const SIZE = 512;
/** Radius of the VR / flat-screen floor disc, and tiles per metre (matches the MR floor). */
const DISC_RADIUS = 26;
const TILES_PER_METRE = 0.6;
/** How much of the scanned floor polygon is painted (the edges are the least reliable). */
const INSET = 0.94;

export type GroundStyle = 'grid' | 'lava' | 'rock' | 'ice' | 'void' | 'sand' | 'garden' | 'moss' | 'plate' | 'rune';

/** The ground each world paints over the scanned floor. */
export function groundStyleFor(worldId: string): GroundStyle {
  if (worldId.startsWith('neon')) return 'grid';
  if (worldId.startsWith('ember')) return 'lava';
  if (worldId.startsWith('storm')) return 'rock';
  if (worldId.startsWith('frost')) return 'ice';
  if (worldId.startsWith('void') || worldId.startsWith('oblivion')) return 'void';
  if (worldId.startsWith('scrap')) return 'sand';
  if (worldId.startsWith('moon')) return 'garden';
  if (worldId.startsWith('sky')) return 'moss';
  if (worldId.startsWith('iron')) return 'plate';
  if (worldId.startsWith('veil')) return 'rune';
  return 'rock';
}

/** Mid-dark ground colours for worlds whose own ground tone is nearly black. */
const STYLE_BASE: Partial<Record<GroundStyle, string>> = {
  garden: '#18391E',
  moss: '#17413A',
  ice: '#1D4660',
  sand: '#5A4426',
  rock: '#1B1F38',
  plate: '#1F2733',
};

/** Tiny seeded random so a style always paints the same tile. */
function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Paints one seamless tile for `style` in the world's colours. */
function paint(c: CanvasRenderingContext2D, style: GroundStyle, base: string, glow: string): void {
  const rand = rng(style.length * 977 + 13);
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = STYLE_BASE[style] ?? base;
  c.fillRect(0, 0, SIZE, SIZE);
  // Wrap-around drawing: every stroke is repeated at the edges so the tile tiles.
  const wrap = (draw: (dx: number, dy: number) => void) => {
    for (const dx of [-SIZE, 0, SIZE]) for (const dy of [-SIZE, 0, SIZE]) draw(dx, dy);
  };
  const speckle = (count: number, colors: string[], min: number, max: number, amp = 0.22) => {
    for (let i = 0; i < count; i += 1) {
      c.fillStyle = colors[Math.floor(rand() * colors.length)];
      c.globalAlpha = 0.04 + rand() * amp;
      const r = min + rand() * (max - min);
      const squash = 0.45 + rand() * 0.55;
      const turn = rand() * Math.PI;
      const x = rand() * SIZE;
      const y = rand() * SIZE;
      wrap((dx, dy) => {
        c.beginPath();
        c.ellipse(x + dx, y + dy, r, r * squash, turn, 0, Math.PI * 2);
        c.fill();
      });
    }
    c.globalAlpha = 1;
  };
  const cracks = (count: number, color: string, width: number, shadow: number) => {
    c.strokeStyle = color;
    c.lineWidth = width;
    c.shadowColor = color;
    c.shadowBlur = shadow;
    for (let i = 0; i < count; i += 1) {
      let x = rand() * SIZE;
      let y = rand() * SIZE;
      let a = rand() * Math.PI * 2;
      const pts: [number, number][] = [[x, y]];
      for (let k = 0; k < 7; k += 1) {
        a += (rand() - 0.5) * 1.2;
        x += Math.cos(a) * (24 + rand() * 40);
        y += Math.sin(a) * (24 + rand() * 40);
        pts.push([x, y]);
      }
      wrap((dx, dy) => {
        c.beginPath();
        c.moveTo(pts[0][0] + dx, pts[0][1] + dy);
        for (const p of pts) c.lineTo(p[0] + dx, p[1] + dy);
        c.stroke();
      });
    }
    c.shadowBlur = 0;
  };
  switch (style) {
    case 'grid': {
      speckle(60, [glow], 1, 3);
      c.strokeStyle = glow;
      c.shadowColor = glow;
      c.shadowBlur = 8;
      c.lineWidth = 3;
      for (let i = 0; i <= 4; i += 1) {
        const p = (i * SIZE) / 4;
        c.beginPath();
        c.moveTo(p, 0);
        c.lineTo(p, SIZE);
        c.moveTo(0, p);
        c.lineTo(SIZE, p);
        c.stroke();
      }
      c.shadowBlur = 0;
      break;
    }
    case 'lava':
      speckle(260, ['#1A0A04', '#3A1A0A', '#2A1208'], 4, 22);
      cracks(9, glow, 5, 18);
      cracks(9, '#FFE08A', 1.5, 6);
      break;
    case 'rock':
      speckle(90, ['#2C3156', '#0E1124', '#3B4270'], 14, 46, 0.3);
      speckle(260, ['#3A4060', '#0A0C18'], 2, 9, 0.35);
      cracks(5, '#080A16', 3, 0);
      cracks(2, glow, 2, 12);
      break;
    case 'ice':
      speckle(60, ['#A8E8FF', '#5FB4DA', '#E8FBFF'], 22, 70, 0.16);
      speckle(150, ['#FFFFFF'], 1, 3, 0.7);
      cracks(14, '#EAFBFF', 1.6, 8);
      cracks(4, glow, 3, 14);
      break;
    case 'void':
      speckle(400, ['#2A0A4A', '#0A0018', glow], 2, 14);
      cracks(7, glow, 3, 20);
      break;
    case 'sand':
      speckle(80, ['#C89A5A', '#7A5A30', '#E0BC7A'], 16, 54, 0.2);
      speckle(500, ['#E0BC7A', '#6A4A24'], 1, 5, 0.4);
      cracks(4, '#3A2810', 2, 0);
      break;
    case 'garden': {
      // Lawn in soft patches, thousands of grass blades, a few flowers, and worn paving stones.
      speckle(70, ['#2F6B30', '#17391C', '#3E8A3A'], 20, 60, 0.3);
      c.lineCap = 'round';
      for (let i = 0; i < 2600; i += 1) {
        const x = rand() * SIZE;
        const y = rand() * SIZE;
        const a = -Math.PI / 2 + (rand() - 0.5) * 0.9;
        const len = 5 + rand() * 9;
        c.strokeStyle = ['#2F6F34', '#46903F', '#1F5226', '#5CA64A'][Math.floor(rand() * 4)];
        c.globalAlpha = 0.3 + rand() * 0.35;
        c.lineWidth = 1.3;
        wrap((dx, dy) => {
          c.beginPath();
          c.moveTo(x + dx, y + dy);
          c.lineTo(x + dx + Math.cos(a) * len, y + dy + Math.sin(a) * len);
          c.stroke();
        });
      }
      c.globalAlpha = 1;
      for (let i = 0; i < 26; i += 1) {
        const x = rand() * SIZE;
        const y = rand() * SIZE;
        c.fillStyle = ['#FF9AD5', '#FFFFFF', '#FFE070', '#B6A6FF'][Math.floor(rand() * 4)];
        wrap((dx, dy) => {
          c.beginPath();
          c.arc(x + dx, y + dy, 2.2 + rand() * 1.8, 0, Math.PI * 2);
          c.fill();
        });
      }
      // Stepping stones: a loose path of irregular slabs.
      for (let i = 0; i < 3; i += 1) {
        const x = 70 + i * 170 + rand() * 30;
        const y = 120 + Math.sin(i * 1.7) * 120 + 130 + rand() * 20;
        c.fillStyle = '#7C7B72';
        c.beginPath();
        c.ellipse(x, y, 40 + rand() * 12, 28 + rand() * 8, rand() * 0.8, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = '#4A4A44';
        c.lineWidth = 3;
        c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.10)';
        c.beginPath();
        c.ellipse(x - 6, y - 5, 24, 14, 0.3, 0, Math.PI * 2);
        c.fill();
      }
      break;
    }
    case 'moss':
      speckle(80, ['#2E7A5C', '#12362C', '#3E9A74'], 18, 56, 0.3);
      speckle(300, ['#5ABA8A', glow], 1.5, 5, 0.35);
      cracks(3, '#082018', 3, 0);
      break;
    case 'plate': {
      speckle(60, ['#2E3A4A', '#141A24'], 16, 48, 0.25);
      c.strokeStyle = '#0A1018';
      c.lineWidth = 6;
      c.strokeRect(0, 0, SIZE, SIZE);
      c.strokeRect(SIZE / 2 - 3, SIZE / 2 - 3, 6, 6);
      c.strokeStyle = glow;
      c.lineWidth = 3;
      c.shadowColor = glow;
      c.shadowBlur = 10;
      c.beginPath();
      c.moveTo(0, SIZE / 2);
      c.lineTo(SIZE, SIZE / 2);
      c.stroke();
      c.shadowBlur = 0;
      break;
    }
    case 'rune':
      speckle(180, ['#2A1A4A', '#0A0618'], 3, 14);
      c.strokeStyle = glow;
      c.shadowColor = glow;
      c.shadowBlur = 16;
      c.lineWidth = 4;
      for (const r of [190, 150, 90]) {
        c.beginPath();
        c.arc(SIZE / 2, SIZE / 2, r, 0, Math.PI * 2);
        c.stroke();
      }
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2;
        c.beginPath();
        c.moveTo(SIZE / 2 + Math.cos(a) * 90, SIZE / 2 + Math.sin(a) * 90);
        c.lineTo(SIZE / 2 + Math.cos(a) * 190, SIZE / 2 + Math.sin(a) * 190);
        c.stroke();
      }
      c.shadowBlur = 0;
      break;
  }
}

/**
 * The scanned floor, repainted as another world: only the floor polygons are
 * covered (walls, furniture and the rest of the room stay passthrough).
 */
export class Ground {
  readonly mesh: Mesh;
  /** The painted floor for VR and flat screens: a big disc that fades out; the owner parents it to the arena. */
  readonly disc: Mesh;
  private readonly discTexture: CanvasTexture;
  private readonly material: MeshBasicMaterial;
  private readonly texture: CanvasTexture;
  private readonly canvas: HTMLCanvasElement;
  private readonly positions = new Float32Array(MAX_VERTS * 3);
  private readonly uvs = new Float32Array(MAX_VERTS * 2);
  private readonly geometry = new BufferGeometry();
  private count = 0;
  private style: GroundStyle | '' = '';
  private key = '';
  private opacity = 0;

  constructor(parent: Object3D) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = SIZE;
    this.canvas.height = SIZE;
    this.texture = new CanvasTexture(this.canvas);
    this.texture.wrapS = RepeatWrapping;
    this.texture.wrapT = RepeatWrapping;
    this.texture.colorSpace = SRGBColorSpace;
    this.material = new MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.geometry.setAttribute('position', new BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('uv', new BufferAttribute(this.uvs, 2));
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -2;
    this.mesh.visible = false;
    parent.add(this.mesh);

    this.discTexture = new CanvasTexture(this.canvas);
    this.discTexture.wrapS = RepeatWrapping;
    this.discTexture.wrapT = RepeatWrapping;
    this.discTexture.colorSpace = SRGBColorSpace;
    this.discTexture.anisotropy = 4;
    const tiles = DISC_RADIUS * 2 * TILES_PER_METRE;
    this.discTexture.repeat.set(tiles, tiles);
    const discGeometry = new CircleGeometry(DISC_RADIUS, 72);
    discGeometry.rotateX(-Math.PI / 2);
    const discMaterial = new MeshBasicMaterial({ map: this.discTexture, transparent: true, depthWrite: false, toneMapped: false });
    discMaterial.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vRad;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>\n  vRad = length(position.xz) / ${DISC_RADIUS.toFixed(1)};`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vRad;')
        .replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.a *= 1.0 - smoothstep(0.3, 1.0, vRad);');
    };
    this.disc = new Mesh(discGeometry, discMaterial);
    this.disc.name = 'GroundDisc';
    this.disc.position.y = 0.002;
    this.disc.renderOrder = -3;
    this.disc.frustumCulled = false;
    this.disc.visible = false;
  }

  /** True when the current world paints its own ground (the neon grid keeps the arena's shader grid). */
  get painted(): boolean {
    return this.style !== '' && this.style !== 'grid';
  }

  /**
   * Keeps the VR disc's pattern fixed in the world while the arena follows the
   * player: `x`, `z` are the arena's position.
   */
  syncDisc(x: number, z: number, show: boolean): void {
    this.disc.visible = show && this.painted;
    if (!this.disc.visible) return;
    const half = DISC_RADIUS * TILES_PER_METRE;
    this.discTexture.offset.set(x * TILES_PER_METRE - half, -z * TILES_PER_METRE - half);
  }

  /** Repaints for a world (no-op when unchanged). */
  setStyle(style: GroundStyle, base: string, glow: string): void {
    const key = `${style}|${base}|${glow}`;
    if (key === this.key) return;
    this.key = key;
    this.style = style;
    paint(this.canvas.getContext('2d')!, style, base, glow);
    this.texture.needsUpdate = true;
    this.discTexture.needsUpdate = true;
  }

  /**
   * Replaces the covered area with the scanned floor `polygons` (flat x,y,z
   * triples, world space), each triangulated properly (rooms are rarely
   * convex) and pulled in a little so the paint never spills past the edge.
   * With no scan there is no ground: only what the headset found is covered.
   */
  setFloor(polygons: readonly (readonly number[])[]): void {
    let n = 0;
    const push = (x: number, y: number, z: number) => {
      if (n >= MAX_VERTS) return;
      this.positions[n * 3] = x;
      this.positions[n * 3 + 1] = y + 0.004;
      this.positions[n * 3 + 2] = z;
      this.uvs[n * 2] = x * 0.6;
      this.uvs[n * 2 + 1] = z * 0.6;
      n += 1;
    };
    for (const poly of polygons) {
      const corners = poly.length / 3;
      if (corners < 3 || n + (corners - 2) * 3 > MAX_VERTS) continue;
      let cx = 0;
      let cz = 0;
      let cy = 0;
      for (let i = 0; i < corners; i += 1) {
        cx += poly[i * 3];
        cy += poly[i * 3 + 1];
        cz += poly[i * 3 + 2];
      }
      cx /= corners;
      cy /= corners;
      cz /= corners;
      const pts: Vector2[] = [];
      for (let i = 0; i < corners; i += 1) pts.push(new Vector2(cx + (poly[i * 3] - cx) * INSET, cz + (poly[i * 3 + 2] - cz) * INSET));
      const tris = ShapeUtils.triangulateShape(pts, []);
      for (const t of tris) for (const k of t) push(pts[k].x, cy, pts[k].y);
    }
    this.count = n;
    this.geometry.setDrawRange(0, n);
    (this.geometry.attributes.position as BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.uv as BufferAttribute).needsUpdate = true;
  }

  /** Fades toward `on` and hides when gone. */
  update(dt: number, on: boolean, strength: number): void {
    const target = on && this.count > 0 && this.style !== '' ? strength : 0;
    this.opacity += (target - this.opacity) * Math.min(1, dt * 2);
    this.material.opacity = this.opacity;
    this.mesh.visible = this.opacity > 0.01;
  }
}
