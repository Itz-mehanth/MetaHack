import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  RepeatWrapping,
  SRGBColorSpace,
} from '@iwsdk/core';

const MAX_VERTS = 8 * 66;
const SIZE = 512;

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
  c.fillStyle = base;
  c.fillRect(0, 0, SIZE, SIZE);
  // Wrap-around drawing: every stroke is repeated at the edges so the tile tiles.
  const wrap = (draw: (dx: number, dy: number) => void) => {
    for (const dx of [-SIZE, 0, SIZE]) for (const dy of [-SIZE, 0, SIZE]) draw(dx, dy);
  };
  const speckle = (count: number, colors: string[], min: number, max: number) => {
    for (let i = 0; i < count; i += 1) {
      c.fillStyle = colors[Math.floor(rand() * colors.length)];
      c.globalAlpha = 0.15 + rand() * 0.4;
      const r = min + rand() * (max - min);
      const x = rand() * SIZE;
      const y = rand() * SIZE;
      wrap((dx, dy) => {
        c.beginPath();
        c.arc(x + dx, y + dy, r, 0, Math.PI * 2);
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
      speckle(320, ['#20243A', '#3A4060', '#101428'], 3, 18);
      cracks(5, '#0A0C18', 3, 0);
      cracks(2, glow, 2, 12);
      break;
    case 'ice':
      speckle(200, ['#CFF4FF', '#7FD0F0', '#FFFFFF'], 3, 20);
      cracks(12, '#EAFBFF', 2, 8);
      cracks(4, glow, 3, 14);
      break;
    case 'void':
      speckle(400, ['#2A0A4A', '#0A0018', glow], 2, 14);
      cracks(7, glow, 3, 20);
      break;
    case 'sand':
      speckle(500, ['#C89A5A', '#8A6A3A', '#E0BC7A'], 2, 12);
      cracks(4, '#4A3418', 2, 0);
      break;
    case 'garden': {
      // Lawn, flower beds and stepping stones.
      speckle(700, ['#2E6A2A', '#4A9A3A', '#1E4A20'], 2, 9);
      for (let i = 0; i < 70; i += 1) {
        const x = rand() * SIZE;
        const y = rand() * SIZE;
        c.fillStyle = ['#FF9AD5', '#FFFFFF', '#FFE070', '#B6A6FF'][Math.floor(rand() * 4)];
        wrap((dx, dy) => {
          c.beginPath();
          c.arc(x + dx, y + dy, 3 + rand() * 3, 0, Math.PI * 2);
          c.fill();
        });
      }
      c.fillStyle = '#9A9A92';
      for (let i = 0; i < 6; i += 1) {
        const x = (i % 3) * 170 + 40;
        const y = Math.floor(i / 3) * 256 + 70;
        c.beginPath();
        c.ellipse(x, y, 54, 38, rand(), 0, Math.PI * 2);
        c.fill();
      }
      break;
    }
    case 'moss':
      speckle(600, ['#3A7A5A', '#5ABA8A', '#2A5A4A', glow], 2, 10);
      cracks(3, '#0A2A20', 3, 0);
      break;
    case 'plate': {
      speckle(120, ['#3A4A5A', '#1A2230'], 3, 10);
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
  }

  /** Repaints for a world (no-op when unchanged). */
  setStyle(style: GroundStyle, base: string, glow: string): void {
    const key = `${style}|${base}|${glow}`;
    if (key === this.key) return;
    this.key = key;
    this.style = style;
    paint(this.canvas.getContext('2d')!, style, base, glow);
    this.texture.needsUpdate = true;
  }

  /** Replaces the covered area with `polygons` (flat x,y,z triples, world space) or a disc. */
  setFloor(polygons: readonly (readonly number[])[], fallbackX: number, fallbackZ: number): void {
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
      if (corners < 3 || n + corners * 3 > MAX_VERTS) continue;
      let cx = 0;
      let cy = 0;
      let cz = 0;
      for (let i = 0; i < corners; i += 1) {
        cx += poly[i * 3];
        cy += poly[i * 3 + 1];
        cz += poly[i * 3 + 2];
      }
      cx /= corners;
      cy /= corners;
      cz /= corners;
      for (let i = 0; i < corners; i += 1) {
        const j = (i + 1) % corners;
        push(cx, cy, cz);
        push(poly[i * 3], poly[i * 3 + 1], poly[i * 3 + 2]);
        push(poly[j * 3], poly[j * 3 + 1], poly[j * 3 + 2]);
      }
    }
    if (n === 0) {
      // No scanned floor yet: a disc around the player.
      const steps = 24;
      for (let i = 0; i < steps; i += 1) {
        const a = (i / steps) * Math.PI * 2;
        const b = ((i + 1) / steps) * Math.PI * 2;
        push(fallbackX, 0, fallbackZ);
        push(fallbackX + Math.cos(a) * 2.4, 0, fallbackZ + Math.sin(a) * 2.4);
        push(fallbackX + Math.cos(b) * 2.4, 0, fallbackZ + Math.sin(b) * 2.4);
      }
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
