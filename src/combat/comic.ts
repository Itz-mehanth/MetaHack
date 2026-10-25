import {
  BackSide,
  CanvasTexture,
  type Color,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  type Vector3,
} from '@iwsdk/core';

/**
 * Comic-book flourishes: onomatopoeia bursts that pop out of hits, and
 * inverted-hull ink outlines for chunky silhouettes. Original style; no
 * third-party characters or logos.
 */

export const WORDS: Readonly<Record<string, readonly string[]>> = {
  arc: ['ZAP!', 'ZZAK!', 'BLAM!', 'POW!'],
  talon: ['SHINK!', 'SLASH!', 'SKRAK!', 'RIP!'],
  tempest: ['KRAKOOM!', 'WHAM!', 'BOOM!', 'KRAK!'],
  orion: ['THOK!', 'FWIP!', 'TWANG!', 'SPLAT!'],
  weaver: ['THWIP!', 'YOINK!', 'SNAP!', 'THWAK!'],
  havoc: ['BANG!', 'PEW!', 'KAPOW!', 'BLAM!'],
  ronin: ['SHING!', 'SLICE!', 'ZANN!', 'SHAK!'],
  psion: ['CRUNCH!', 'SMASH!', 'WHUMP!', 'CRASH!'],
  vanguard: ['KLANG!', 'WHANG!', 'BONG!', 'THWACK!'],
  hurt: ['OOF!', 'ARGH!'],
  big: ['KA-BOOM!', 'BOOM!'],
};

const FONT = "'Bangers', 'Impact', sans-serif";

function starburst(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, spikes: number): void {
  c.beginPath();
  for (let i = 0; i < spikes * 2; i += 1) {
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.68;
    const x = cx + Math.cos(a) * rr * 1.25;
    const y = cy + Math.sin(a) * rr * 0.8;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
}

interface Pop {
  sprite: Sprite;
  material: SpriteMaterial;
  age: number;
  life: number;
  size: number;
  spin: number;
}

/** Pooled onomatopoeia sprites with a cached texture per word and colour. */
export class Onomatopoeia {
  private readonly cache = new Map<string, CanvasTexture>();
  private readonly pool: Pop[] = [];
  private next = 0;

  constructor(parent: Object3D, count = 10) {
    for (let i = 0; i < count; i += 1) {
      const material = new SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
      const sprite = new Sprite(material);
      sprite.name = `ComicWord-${i}`;
      sprite.visible = false;
      sprite.renderOrder = 40;
      parent.add(sprite);
      this.pool.push({ sprite, material, age: 1, life: 1, size: 0.3, spin: 0 });
    }
    // Re-render cached words once the comic font has loaded.
    void document.fonts?.load(`64px Bangers`).then(() => {
      for (const [key, texture] of this.cache) this.paint(texture.image as HTMLCanvasElement, key);
      for (const texture of this.cache.values()) texture.needsUpdate = true;
    });
  }

  private paint(canvas: HTMLCanvasElement, key: string): void {
    const [word, color] = key.split('|');
    const c = canvas.getContext('2d')!;
    c.clearRect(0, 0, canvas.width, canvas.height);
    starburst(c, 256, 128, 110, 12);
    c.fillStyle = color;
    c.fill();
    c.lineWidth = 10;
    c.strokeStyle = '#0A0A12';
    c.stroke();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const size = word.length > 6 ? 82 : 104;
    c.font = `${size}px ${FONT}`;
    c.save();
    c.translate(256, 132);
    c.rotate(-0.08);
    c.lineWidth = 16;
    c.strokeStyle = '#0A0A12';
    c.lineJoin = 'round';
    c.strokeText(word, 0, 0);
    c.fillStyle = '#FFF6D6';
    c.fillText(word, 0, 0);
    c.restore();
  }

  private texture(word: string, color: Color): CanvasTexture {
    const key = `${word}|#${color.getHexString()}`;
    let texture = this.cache.get(key);
    if (texture == null) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      this.paint(canvas, key);
      texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;
      this.cache.set(key, texture);
    }
    return texture;
  }

  /** Pops `word` at `at`; `size` is its width in metres. */
  pop(word: string, at: Vector3, color: Color, size = 0.35): void {
    const p = this.pool[this.next];
    this.next = (this.next + 1) % this.pool.length;
    p.material.map = this.texture(word, color);
    p.material.needsUpdate = true;
    p.sprite.position.copy(at);
    p.sprite.position.y += 0.12;
    p.age = 0;
    p.life = 0.75;
    p.size = size;
    p.spin = (Math.random() - 0.5) * 0.4;
    p.sprite.visible = true;
  }

  random(set: string, at: Vector3, color: Color, size?: number): void {
    const words = WORDS[set] ?? WORDS.big;
    this.pop(words[Math.floor(Math.random() * words.length)], at, color, size);
  }

  update(dt: number): void {
    for (const p of this.pool) {
      if (!p.sprite.visible) continue;
      p.age += dt;
      const t = p.age / p.life;
      if (t >= 1) {
        p.sprite.visible = false;
        continue;
      }
      // Overshoot pop-in, hold, then shrink away.
      const pop = t < 0.15 ? (t / 0.15) * 1.25 : t < 0.25 ? 1.25 - ((t - 0.15) / 0.1) * 0.25 : 1;
      const out = t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
      p.sprite.scale.set(p.size * pop, p.size * 0.5 * pop, 1);
      p.material.opacity = out;
      p.material.rotation = p.spin;
      p.sprite.position.y += dt * 0.15;
    }
  }
}

const inkMaterial = new MeshBasicMaterial({ color: '#05050A', side: BackSide });

/**
 * Adds an ink outline (an inflated, back-faced copy) to the meshes under
 * `root`. `filter` limits it to chosen meshes to keep draw calls down.
 */
export function addOutline(root: Object3D, thickness = 0.06, filter?: (mesh: Mesh) => boolean): void {
  const meshes: Mesh[] = [];
  root.traverse((o) => {
    const mesh = o as Mesh;
    if (mesh.isMesh && mesh.name !== 'Outline' && (filter == null || filter(mesh))) meshes.push(mesh);
  });
  for (const mesh of meshes) {
    const outline = new Mesh(mesh.geometry, inkMaterial);
    outline.name = 'Outline';
    outline.scale.setScalar(1 + thickness);
    mesh.add(outline);
  }
}
