import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  OctahedronGeometry,
  Points,
  PointsMaterial,
  RingGeometry,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  TetrahedronGeometry,
  Vector3,
} from '@iwsdk/core';
import { type ChapterBeat, chapterBeats, chapterCast, chapterRecap } from './chapter-script.js';
import { Caption, clamp01, createDome, glowTexture, hit, outBack, ramp, ringTexture, smooth, titleCard, type TitleCard } from './cinema-kit.js';
import type { CinemaHooks } from './cinema.js';
import { HEROES, type HeroId } from './heroes.js';
import { drawIcon, iconsReady } from './icons.js';
import { lookFor, type WorldLook } from './worlds.js';
import { WORLDS } from './progression.js';
import type { Sfx } from './sfx.js';

/**
 * The story movie that opens a hero's journey (about 45 seconds, all around
 * the player): the region as it was, the boss who came for its Anchor, the
 * boss's declaration, the region falling (its skyline crumbling under the
 * boss's black sun), the road of three trials (two lords, then the boss), and
 * the hero rising. Narration and captions come from chapter-script.ts and
 * public/vo; the pacing follows the lengths of the recorded lines, so a
 * re-recorded voice never needs a retimed movie. Skippable at any time.
 *
 * Like the opening movie everything on screen is a function of the clock
 * `t` (only the shard burst keeps physics), so frames can be scrubbed.
 */

interface Skyline {
  readonly shape: 'box' | 'cone';
  readonly h: readonly [number, number];
  readonly w: readonly [number, number];
  readonly lift: readonly [number, number];
  readonly tilt: number;
}

/** What each region's horizon is made of. */
const SKYLINES: Readonly<Record<string, Skyline>> = {
  'neon-grid': { shape: 'box', h: [0.5, 2.3], w: [0.18, 0.46], lift: [0, 0], tilt: 0 },
  'ember-foundry': { shape: 'box', h: [0.35, 1.5], w: [0.4, 0.95], lift: [0, 0], tilt: 0 },
  'storm-peak': { shape: 'cone', h: [0.9, 2.7], w: [0.6, 1.2], lift: [0, 0], tilt: 0 },
  'frost-spire': { shape: 'cone', h: [1.0, 3.1], w: [0.25, 0.55], lift: [0, 0], tilt: 0 },
  'void-rift': { shape: 'box', h: [0.8, 2.8], w: [0.1, 0.26], lift: [0, 0.9], tilt: 0.35 },
  'scrap-wastes': { shape: 'box', h: [0.3, 1.3], w: [0.3, 0.85], lift: [0, 0], tilt: 0.15 },
  'moon-temple': { shape: 'cone', h: [0.5, 1.5], w: [0.45, 1.0], lift: [0, 0], tilt: 0 },
  'sky-ruins': { shape: 'box', h: [0.2, 0.45], w: [0.7, 1.4], lift: [0.2, 1.8], tilt: 0.1 },
  'iron-bastion': { shape: 'box', h: [0.6, 1.7], w: [0.5, 1.15], lift: [0, 0], tilt: 0 },
  'veil-sanctum': { shape: 'cone', h: [1.1, 2.9], w: [0.3, 0.65], lift: [0, 0], tilt: 0 },
};

const COUNT = 72;
const SHARDS = 140;
const RINGS = 6;
const PATH_POINTS = 28;
const BASE_Y = -1.1;
/** Seconds each line's recorded tail adds after the last word. */
const TAIL = 0.45;

/** Where the three trials sit (stage space, forward is -Z) and where the path starts. */
const PATH_START = new Vector3(0, -0.85, -1.3);
const GATES: readonly Vector3[] = [new Vector3(-1.0, -0.1, -2.7), new Vector3(0.9, 0.45, -3.7), new Vector3(0, 1.0, -4.7)];
const WHITE = new Color('#FFFFFF');
const Z_AXIS = new Vector3(0, 0, 1);

/** A small repeatable random number generator (the same chapter always looks the same). */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hashOf = (text: string): number => [...text].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

interface Key {
  t: number;
  top: Color;
  horizon: Color;
  ground: Color;
  cloud: Color;
  accent: Color;
  stars: number;
  dread: number;
}

/** A label under a trial's gate: a small caption, the lord's name and the place. */
function labelCard(top: string, main: string, sub: string, color: string): { sprite: Sprite; material: SpriteMaterial } {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 224;
  const g = c.getContext('2d')!;
  const draw = (): void => {
    g.clearRect(0, 0, 640, 224);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.fillStyle = 'rgba(6,2,15,0.66)';
    g.beginPath();
    g.roundRect(10, 10, 620, 204, 26);
    g.fill();
    g.font = "700 34px Rajdhani, 'Segoe UI', system-ui, sans-serif";
    g.fillStyle = color;
    g.fillText(top, 320, 44);
    let size = 76;
    g.font = `${size}px 'Bangers', 'Impact', sans-serif`;
    const width = g.measureText(main).width;
    if (width > 580) {
      size = Math.floor((size * 580) / width);
      g.font = `${size}px 'Bangers', 'Impact', sans-serif`;
    }
    g.lineWidth = 10;
    g.strokeStyle = '#06020F';
    g.strokeText(main, 320, 112);
    g.fillStyle = '#FFFFFF';
    g.fillText(main, 320, 112);
    g.font = "600 32px Rajdhani, 'Segoe UI', system-ui, sans-serif";
    g.fillStyle = 'rgba(233,252,255,0.9)';
    g.fillText(sub, 320, 178);
  };
  draw();
  const texture = new CanvasTexture(c);
  void document.fonts?.load('80px Bangers').then(() => {
    draw();
    texture.needsUpdate = true;
  });
  const material = new SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, opacity: 0 });
  const sprite = new Sprite(material);
  sprite.scale.set(1.5, 0.525, 1);
  sprite.renderOrder = 78;
  sprite.visible = false;
  return { sprite, material };
}

export class ChapterCinema {
  readonly group = new Group();
  active = false;
  /** Seconds into the movie. */
  t = 0;

  private readonly stage = new Group();
  private readonly dome: { mesh: Mesh; material: ShaderMaterial };
  private readonly glow = glowTexture();
  private readonly ringTex = ringTexture();
  private readonly voidDir = new Vector3(0, 0.22, -1).normalize();
  private readonly boxes: InstancedMesh;
  private readonly cones: InstancedMesh;
  private skyline: InstancedMesh;
  private readonly ax = new Float32Array(COUNT);
  private readonly az = new Float32Array(COUNT);
  private readonly sw = new Float32Array(COUNT);
  private readonly sh = new Float32Array(COUNT);
  private readonly lift = new Float32Array(COUNT);
  private readonly tiltDir = new Float32Array(COUNT);
  private readonly delay = new Float32Array(COUNT);
  private readonly ang = new Float32Array(COUNT);
  private readonly fell = new Uint8Array(COUNT);
  private shape: Skyline = SKYLINES['neon-grid'];
  private readonly shards: InstancedMesh;
  private readonly shardPos = new Float32Array(SHARDS * 3);
  private readonly shardVel = new Float32Array(SHARDS * 3);
  private readonly shardLife = new Float32Array(SHARDS);
  private shardNext = 0;
  private readonly rings: Array<{ mesh: Mesh; t: number; size: number; life: number }> = [];
  private readonly gem: Mesh;
  private readonly gemHalo: Sprite;
  private readonly gemBeam: Mesh;
  private readonly path: Points;
  private readonly pathPositions = new Float32Array(PATH_POINTS * 3);
  private readonly gates: Array<{ ring: Mesh; diamond: Mesh; halo: Sprite; label: { sprite: Sprite; material: SpriteMaterial } | null }> = [];
  private readonly pillar: Mesh;
  private readonly pillarBase: Mesh;
  private readonly icon: Sprite;
  private titles: { region: TitleCard; boss: TitleCard; hero: TitleCard; trial: TitleCard } | null = null;
  /** `full` is the hero's opening story; `recap` is the short road scene before level 2 or 3. */
  private mode: 'full' | 'recap' = 'full';
  private level = 1;
  private readonly caption = new Caption(236, 1.9);
  private readonly hint = new Caption(160, 0.9);
  private readonly dummy = new Object3D();
  private readonly tmp = new Vector3();
  private readonly tmp2 = new Vector3();
  private readonly colorA = new Color();
  private readonly colorB = new Color();

  private flat = false;
  private yaw = 0;
  private captionYaw = 0;
  private done: (() => void) | null = null;
  private hooks: CinemaHooks | null = null;
  private sfx: Sfx | null = null;
  private fired = new Set<string>();
  private hold = 0;
  private quiet = false;
  private skipping = -1;
  private dom: HTMLElement | null = null;
  private beats: ChapterBeat[] = [];
  private starts: number[] = [];
  private lens: number[] = [];
  private end = 50;
  private planned = false;
  private keys: Key[] = [];
  private bossColor = '#FF4FD8';
  private bossColorC = new Color();
  private heroColor = new Color('#3DF5FF');
  private gemColor = new Color('#3DF5FF');
  private eyeMode = 0;
  private voidMax = 0.4;
  private worldId = 'neon-grid';
  private heroId: HeroId = 'arc';
  private places: [string, string, string] = ['', '', ''];
  private lordNames: [string, string] = ['', ''];

  constructor() {
    const dome = createDome(this.voidDir);
    this.dome = dome;
    this.group.add(dome.mesh, this.stage);
    this.group.visible = false;
    this.group.name = 'ChapterCinema';

    const silhouette = new MeshBasicMaterial({ color: '#FFFFFF', transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
    const box = new BoxGeometry(1, 1, 1);
    box.translate(0, 0.5, 0);
    const cone = new ConeGeometry(0.5, 1, 5);
    cone.translate(0, 0.5, 0);
    this.boxes = new InstancedMesh(box, silhouette, COUNT);
    this.cones = new InstancedMesh(cone, silhouette, COUNT);
    for (const mesh of [this.boxes, this.cones]) {
      mesh.frustumCulled = false;
      mesh.renderOrder = 62;
      mesh.visible = false;
      this.stage.add(mesh);
    }
    this.skyline = this.boxes;

    this.shards = new InstancedMesh(new TetrahedronGeometry(0.05), new MeshBasicMaterial({ color: '#FFFFFF', transparent: true, depthTest: false, depthWrite: false, toneMapped: false }), SHARDS);
    this.shards.frustumCulled = false;
    this.shards.renderOrder = 67;
    this.shards.visible = false;
    this.stage.add(this.shards);

    for (let i = 0; i < RINGS; i += 1) {
      const mesh = new Mesh(new RingGeometry(0.86, 1, 48), new MeshBasicMaterial({ map: this.ringTex, color: '#FFFFFF', transparent: true, opacity: 0, blending: AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false, side: DoubleSide }));
      mesh.renderOrder = 68;
      mesh.visible = false;
      this.stage.add(mesh);
      this.rings.push({ mesh, t: 9, size: 1, life: 1 });
    }

    // The region's Anchor: a gem with a halo and a column of light.
    this.gem = new Mesh(new OctahedronGeometry(0.2), new MeshBasicMaterial({ color: '#FFFFFF', transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    this.gem.renderOrder = 66;
    this.gemHalo = new Sprite(new SpriteMaterial({ map: this.glow, color: '#FFFFFF', transparent: true, blending: AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false }));
    this.gemHalo.renderOrder = 65;
    this.gemBeam = new Mesh(new CylinderGeometry(0.02, 0.02, 9, 6, 1, true), new MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.3, blending: AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false, side: DoubleSide }));
    this.gemBeam.renderOrder = 64;
    this.gem.visible = this.gemHalo.visible = this.gemBeam.visible = false;
    this.stage.add(this.gemBeam, this.gem, this.gemHalo);

    // The road: a trail of light through three gates.
    const pathGeometry = new BufferGeometry();
    pathGeometry.setAttribute('position', new Float32BufferAttribute(this.pathPositions, 3));
    this.path = new Points(pathGeometry, new PointsMaterial({ size: 0.16, map: this.glow, color: '#FFFFFF', transparent: true, blending: AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false, sizeAttenuation: true }));
    this.path.frustumCulled = false;
    this.path.renderOrder = 63;
    this.path.visible = false;
    this.stage.add(this.path);
    for (let i = 0; i < 3; i += 1) {
      const ring = new Mesh(new RingGeometry(0.32, 0.36, 48), new MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0, blending: AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false, side: DoubleSide }));
      ring.renderOrder = 66;
      const diamond = new Mesh(new OctahedronGeometry(i === 2 ? 0.2 : 0.13), new MeshBasicMaterial({ color: '#FFFFFF', transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
      diamond.renderOrder = 67;
      const halo = new Sprite(new SpriteMaterial({ map: this.glow, color: '#FFFFFF', transparent: true, blending: AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false }));
      halo.renderOrder = 65;
      ring.visible = diamond.visible = halo.visible = false;
      this.stage.add(ring, diamond, halo);
      this.gates.push({ ring, diamond, halo, label: null });
    }

    // The hero: a column of light and an icon.
    this.pillar = new Mesh(new CylinderGeometry(0.16, 0.24, 7, 14, 1, true), new MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.35, blending: AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false, side: DoubleSide }));
    this.pillar.renderOrder = 64;
    this.pillarBase = new Mesh(new RingGeometry(0.3, 0.46, 40), new MeshBasicMaterial({ color: '#FFFFFF', transparent: true, blending: AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false, side: DoubleSide }));
    this.pillarBase.rotation.x = -Math.PI / 2;
    this.pillarBase.renderOrder = 65;
    this.icon = new Sprite(new SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    this.icon.renderOrder = 66;
    this.pillar.visible = this.pillarBase.visible = this.icon.visible = false;
    this.stage.add(this.pillar, this.pillarBase, this.icon);

    this.group.add(this.caption.sprite, this.hint.sprite);
    this.shards.count = SHARDS;
  }

  /**
   * Starts `hero`'s story movie around `head`, facing `forward`. `flat` is a
   * screen (letterbox bars and a SKIP button); `done` runs once when it ends
   * or is skipped.
   */
  start(sfx: Sfx, hooks: CinemaHooks, head: Vector3, forward: Vector3, flat: boolean, hero: HeroId, level: number, done: () => void): void {
    this.sfx = sfx;
    this.hooks = hooks;
    this.flat = flat;
    this.done = done;
    this.heroId = hero;
    this.t = 0;
    this.hold = 3.2;
    this.skipping = -1;
    this.planned = false;
    this.fired.clear();
    this.shardLife.fill(0);
    this.fell.fill(0);
    this.shardNext = 0;
    this.yaw = Math.atan2(-forward.x, -forward.z);
    this.captionYaw = this.yaw;
    this.stage.rotation.set(0, this.yaw, 0);
    this.group.position.copy(head);

    const info = HEROES.find((h) => h.id === hero)!;
    const cast = chapterCast(hero);
    this.worldId = cast.world;
    this.places = cast.places;
    this.lordNames = cast.lords;
    this.bossColor = cast.bossColor;
    this.bossColorC.set(cast.bossColor);
    this.heroColor.set(info.color);
    this.gemColor.set(WORLDS.find((w) => w.id === cast.world)?.color ?? info.color);
    this.mode = level > 1 ? 'recap' : 'full';
    this.level = level;
    this.beats = this.mode === 'recap' ? [chapterRecap(hero, level)] : chapterBeats(hero, info.name);
    const h = hashOf(cast.boss);
    this.eyeMode = h % 5;
    this.voidMax = 0.34 + ((h >>> 3) % 13) / 100;
    this.dome.material.uniforms.uEyeMode.value = this.eyeMode;

    this.buildLook(cast.world);
    this.buildSkyline(cast.world, h);
    if (this.mode === 'recap') this.boxes.visible = this.cones.visible = false;
    this.buildLabels(cast, info.name, info.power, info.color);
    this.buildIcon(hero, info.color);
    this.gem.visible = this.gemHalo.visible = this.gemBeam.visible = false;
    this.group.visible = true;
    this.active = true;
    for (const beat of this.beats) void sfx.loadVoice(beat.id);
    hooks.intensity(0);
    if (flat) this.mountDom();
  }

  /** Test hook: jumps the clock to `t` without replaying the sounds before it. */
  seek(t: number): void {
    this.hold = 0;
    if (!this.planned) this.plan();
    this.t = t;
    this.quiet = true;
  }

  skip(): void {
    if (!this.active || this.skipping >= 0) return;
    this.skipping = 0;
    this.sfx?.stopVoice();
  }

  dispose(): void {
    this.unmountDom();
  }

  // ---------------------------------------------------------------- set-up

  private buildLook(world: string): void {
    const peace = lookFor(`${world}-1`, world);
    const menace = lookFor(`${world}-3`, world);
    // Colour keys are placed once the line lengths are known (see plan()).
    this.keys = [];
    this.peace = peace;
    this.menace = menace;
  }

  private peace: WorldLook = lookFor('neon-grid-1', 'neon-grid');
  private menace: WorldLook = lookFor('neon-grid-3', 'neon-grid');

  private buildSkyline(world: string, seed: number): void {
    this.shape = SKYLINES[world] ?? SKYLINES['neon-grid'];
    this.skyline = this.shape.shape === 'cone' ? this.cones : this.boxes;
    this.boxes.visible = this.shape.shape === 'box';
    this.cones.visible = this.shape.shape === 'cone';
    const random = seeded(seed);
    const range = (r: readonly [number, number]): number => r[0] + (r[1] - r[0]) * random();
    for (let i = 0; i < COUNT; i += 1) {
      const a = this.flat ? (i / (COUNT - 1) - 0.5) * 2 * 1.15 : (i / COUNT) * Math.PI * 2 + (random() - 0.5) * 0.04;
      const radius = 4.7 + random() * 1.3;
      this.ang[i] = a;
      this.ax[i] = Math.sin(a) * radius;
      this.az[i] = -Math.cos(a) * radius;
      this.sw[i] = range(this.shape.w);
      this.sh[i] = range(this.shape.h);
      this.lift[i] = range(this.shape.lift);
      this.tiltDir[i] = (random() - 0.5) * 2;
      // The ruin spreads outward from the boss, straight ahead.
      this.delay[i] = (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) / Math.PI) * 4.4 + random() * 0.5;
      const dark = 0.55 + random() * 0.45;
      this.skyline.setColorAt(i, this.colorA.set('#0A0714').multiplyScalar(dark).lerp(this.colorB.set(this.peace.accent), 0.012));
    }
    if (this.skyline.instanceColor) this.skyline.instanceColor.needsUpdate = true;
  }

  private buildLabels(cast: ReturnType<typeof chapterCast>, heroName: string, power: string, heroColor: string): void {
    for (const gate of this.gates) {
      if (gate.label) {
        this.stage.remove(gate.label.sprite);
        gate.label.material.map?.dispose();
        gate.label.material.dispose();
        gate.label = null;
      }
    }
    const make = (i: number, top: string, main: string, sub: string, color: string): void => {
      const label = labelCard(top, main, sub, color);
      this.stage.add(label.sprite);
      this.gates[i].label = label;
    };
    const defeated = this.mode === 'recap' ? this.level - 1 : 0;
    const top = (i: number, base: string): string => (i < defeated ? 'DEFEATED' : this.mode === 'recap' && i === this.level - 1 ? `NEXT: ${base}` : base);
    const tint = (i: number, color: string): string => (i < defeated ? '#39FF88' : color);
    make(0, top(0, 'TRIAL 1 - A LORD'), cast.lords[0].toUpperCase(), cast.places[0].toUpperCase(), tint(0, '#3DF5FF'));
    make(1, top(1, 'TRIAL 2 - A LORD'), cast.lords[1].toUpperCase(), cast.places[1].toUpperCase(), tint(1, '#FFD23F'));
    make(2, top(2, 'TRIAL 3 - THE BOSS'), cast.boss.toUpperCase(), cast.places[2].toUpperCase(), tint(2, cast.bossColor));
    if (this.titles) {
      for (const card of Object.values(this.titles)) {
        this.stage.remove(card.sprite);
        card.material.map?.dispose();
        card.material.dispose();
      }
    }
    const region = titleCard(cast.region.toUpperCase(), 'AN ANCHOR WORLD', '#' + new Color(this.peace.accent).getHexString(), 3.5);
    const boss = titleCard(cast.boss.toUpperCase(), cast.bossTitle.toUpperCase(), cast.bossColor, 3.6);
    const hero = titleCard(heroName, power.toUpperCase(), heroColor, 3.4);
    const final = this.level >= 3;
    const trial = titleCard(final ? 'THE FINAL TRIAL' : `TRIAL ${this.level}`, (final ? cast.boss : cast.lords[Math.max(0, this.level - 1)]).toUpperCase(), final ? cast.bossColor : '#FFD23F', 3.6);
    this.titles = { region, boss, hero, trial };
    this.stage.add(region.sprite, boss.sprite, hero.sprite, trial.sprite);
  }

  private buildIcon(hero: HeroId, color: string): void {
    const material = this.icon.material as SpriteMaterial;
    (this.pillar.material as MeshBasicMaterial).color.set(color);
    (this.pillarBase.material as MeshBasicMaterial).color.set(color);
    void iconsReady.then(() => {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      drawIcon(c.getContext('2d')!, hero, 128, 128, 210, color, 26);
      material.map?.dispose();
      material.map = new CanvasTexture(c);
      material.needsUpdate = true;
    });
  }

  /** Beat start times from the recorded lengths (estimated for a line that did not load). */
  private plan(): void {
    const sfx = this.sfx!;
    this.lens = this.beats.map((b) => Math.max(2.2, sfx.voiceLength(b.id) || b.text.length / 13 + 0.8));
    if (this.mode === 'recap') {
      this.starts = [0.9];
      this.end = 0.9 + this.lens[0] - TAIL + 2.6;
      const m = this.menace;
      const horizon = '#' + new Color(m.horizon).lerp(this.bossColorC, 0.3).multiplyScalar(0.8).getHexString();
      const key = (t: number): Key => ({ t, top: new Color(m.top), horizon: new Color(horizon), ground: new Color(m.ground), cloud: new Color(m.cloud), accent: new Color(this.bossColor), stars: 0.2, dread: 0.5 });
      this.keys = [key(0), key(this.end)];
      this.planned = true;
      return;
    }
    const gaps = [1.3, 0.9, 0.5, 0.9, 1.0, 0.8];
    this.starts = [];
    let at = gaps[0];
    for (let i = 0; i < this.beats.length; i += 1) {
      this.starts.push(at);
      at += this.lens[i] - TAIL + (gaps[i + 1] ?? 0);
    }
    const last = this.beats.length - 1;
    this.end = this.starts[last] + this.lens[last] + 2.8;
    const S = this.starts;
    const peace = this.peace;
    const menace = this.menace;
    const key = (t: number, top: string, horizon: string, ground: string, cloud: string, accent: string, stars: number, dread: number): Key => ({ t, top: new Color(top), horizon: new Color(horizon), ground: new Color(ground), cloud: new Color(cloud), accent: new Color(accent), stars, dread });
    const ruin = new Color(menace.horizon).lerp(this.bossColorC, 0.5);
    this.keys = [
      key(0, peace.top, peace.horizon, peace.ground, peace.cloud, peace.accent, Math.max(0.5, peace.stars), 0),
      key(S[1] + 0.2, peace.top, peace.horizon, peace.ground, peace.cloud, peace.accent, Math.max(0.5, peace.stars), 0),
      key(S[1] + 3.6, menace.top, menace.horizon, menace.ground, menace.cloud, this.bossColor, 0.2, 0.3),
      key(S[3], menace.top, menace.horizon, menace.ground, menace.cloud, this.bossColor, 0.1, 0.35),
      key(S[3] + 4.5, '#0A0210', '#' + ruin.getHexString(), '#050105', menace.cloud, this.bossColor, 0, 0.7),
      key(S[4] + 1.5, '#06010C', '#' + new Color(menace.horizon).lerp(this.bossColorC, 0.3).multiplyScalar(0.7).getHexString(), '#030105', menace.cloud, this.bossColor, 0.1, 0.5),
      key(S[last] - 0.2, '#06010C', '#' + new Color(menace.horizon).lerp(this.bossColorC, 0.3).multiplyScalar(0.7).getHexString(), '#030105', menace.cloud, this.bossColor, 0.1, 0.5),
      key(S[last] + 1.4, peace.top, '#' + new Color(peace.horizon).lerp(this.heroColor, 0.35).getHexString(), peace.ground, peace.cloud, '#' + this.heroColor.getHexString(), 1, 0),
      key(this.end, peace.top, '#' + new Color(peace.horizon).lerp(this.heroColor, 0.35).getHexString(), peace.ground, peace.cloud, '#' + this.heroColor.getHexString(), 1, 0),
    ];
    this.planned = true;
  }

  private mountDom(): void {
    this.unmountDom();
    const root = document.createElement('div');
    root.id = 'cinema-ui';
    root.style.cssText = 'position:fixed;inset:0;z-index:9000;pointer-events:none';
    const bar = 'position:absolute;left:0;right:0;height:9vh;background:#000;transition:transform .8s ease';
    root.innerHTML = `<div style="${bar};top:0;transform:translateY(-100%)"></div><div style="${bar};bottom:0;transform:translateY(100%)"></div>`;
    const skip = document.createElement('button');
    skip.textContent = 'SKIP ▸';
    skip.style.cssText =
      "position:absolute;right:max(14px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));pointer-events:auto;font:19px Bangers,Impact,sans-serif;letter-spacing:.08em;padding:8px 16px;border-radius:10px;border:3px solid #06020F;background:#FFD23F;color:#06020F;cursor:pointer;box-shadow:3px 3px 0 #06020F;opacity:0;transition:opacity .5s";
    skip.addEventListener('click', (event) => {
      event.stopPropagation();
      this.skip();
    });
    root.appendChild(skip);
    document.body.appendChild(root);
    this.dom = root;
    requestAnimationFrame(() => {
      (root.children[0] as HTMLElement).style.transform = 'none';
      (root.children[1] as HTMLElement).style.transform = 'none';
      skip.style.opacity = '1';
    });
  }

  private unmountDom(): void {
    this.dom?.remove();
    this.dom = null;
  }

  // ---------------------------------------------------------------- effects

  private ring(position: Vector3, color: string, size: number, life: number): void {
    let pick = this.rings[0];
    for (const ring of this.rings) if (ring.t >= ring.life) pick = ring;
    pick.t = 0;
    pick.size = size;
    pick.life = life;
    pick.mesh.position.copy(position);
    pick.mesh.quaternion.setFromUnitVectors(Z_AXIS, this.tmp2.copy(position).negate().normalize());
    (pick.mesh.material as MeshBasicMaterial).color.set(color);
    pick.mesh.visible = true;
  }

  private burst(position: Vector3, color: Color, count: number, speed: number): void {
    for (let k = 0; k < count; k += 1) {
      const i = this.shardNext;
      this.shardNext = (this.shardNext + 1) % SHARDS;
      this.shardPos[i * 3] = position.x;
      this.shardPos[i * 3 + 1] = position.y;
      this.shardPos[i * 3 + 2] = position.z;
      const a = Math.random() * Math.PI * 2;
      const e = (Math.random() - 0.3) * 2;
      const v = speed * (0.4 + Math.random());
      this.shardVel[i * 3] = Math.cos(a) * Math.cos(e) * v;
      this.shardVel[i * 3 + 1] = Math.sin(e) * v;
      this.shardVel[i * 3 + 2] = Math.sin(a) * Math.cos(e) * v;
      this.shardLife[i] = 1.2 + Math.random() * 1.1;
      this.shards.setColorAt(i, this.colorB.copy(color).lerp(WHITE, Math.random() * 0.35));
    }
    if (this.shards.instanceColor) this.shards.instanceColor.needsUpdate = true;
    this.shards.visible = true;
  }

  private cue(name: string, at: number, run: () => void): void {
    if (this.t >= at && !this.fired.has(name)) {
      this.fired.add(name);
      if (!this.quiet) run();
    }
  }

  // ---------------------------------------------------------------- frame

  update(dt: number, head: Vector3, headYaw: number): void {
    if (!this.active) return;
    const sfx = this.sfx!;
    this.group.position.copy(head);
    if (this.hold > 0) {
      // Wait (at most 3.2 s) for every line to be ready so the pacing can follow them.
      this.hold = this.beats.every((b) => sfx.voiceLength(b.id) > 0) ? 0 : this.hold - dt;
      if (this.hold <= 0 && !this.planned) this.plan();
    } else {
      if (!this.planned) this.plan();
      this.t += dt;
    }
    if (this.skipping >= 0) {
      this.skipping += dt;
      if (this.skipping > 0.7) {
        this.finish();
        return;
      }
    }
    if (!this.planned) {
      this.dome.material.uniforms.uBlack.value = 1;
      return;
    }
    const t = this.t;
    const S = this.starts;
    const last = this.beats.length - 1;
    const u = this.dome.material.uniforms;
    const skipFade = this.skipping >= 0 ? clamp01(this.skipping / 0.6) : 0;

    if (this.mode === 'recap') {
      this.updateRecap(t, dt, headYaw, skipFade);
      if (t >= this.end) this.finish();
      return;
    }
    this.applyLook(t);

    // ---- the boss's black sun: opens with the arrival, calls out, then waits at the end of the road
    const open = ramp(t, S[1] + 1.0, S[2] + 1.6);
    const wait = 1 - 0.5 * ramp(t, S[4] + 0.5, S[4] + 3);
    const away = 1 - ramp(t, S[last] + 0.2, S[last] + 2.4);
    u.uVoid.value = (0.1 * ramp(t, S[1] + 0.6, S[1] + 1.4) + (this.voidMax - 0.1) * open) * wait * away;
    u.uEyes.value = ramp(t, S[2] - 0.2, S[2] + 1.2) * away;
    u.uPulse.value = hit(t, S[2], 1.4) * 0.8 + hit(t, S[3], 1.2) * 0.8 + hit(t, S[4] + this.lens[4] * 0.74, 1.6) * 0.8;
    u.uFlash.value = Math.min(1, hit(t, S[1] + 1.0, 5) * 0.35 + hit(t, S[2], 4) * 0.3 + hit(t, S[3] + 1.2, 3) * 0.55 + hit(t, S[last] + 0.7, 2.6) * 0.7);
    u.uBlack.value = Math.max(1 - ramp(t, 0.1, 1.9), skipFade);
    u.uDissolve.value = ramp(t, this.end - 2.4, this.end - 0.2);
    u.uTime.value = t + 3;

    this.updateSkyline(t, dt);
    this.updateGem(t);
    const roadLen = this.lens[4];
    this.updateRoad(t, S[4], roadLen, S[5], [S[4] + roadLen * 0.2, S[4] + roadLen * 0.48, S[4] + roadLen * 0.76], 0);
    this.updateHero(t);
    this.updateShards(dt);
    this.updateRings(dt);
    this.updateTitles(t);
    this.cues(t);
    this.quiet = false;
    this.updateCaption(t, headYaw, dt, skipFade);
    if (t >= this.end) this.finish();
  }

  /** The sky's colours at time `t`, eased between the planned keys. */
  private applyLook(t: number): void {
    const u = this.dome.material.uniforms;
    let k = 0;
    while (k < this.keys.length - 2 && t >= this.keys[k + 1].t) k += 1;
    const a = this.keys[k];
    const b = this.keys[k + 1];
    const f = smooth((t - a.t) / Math.max(0.001, b.t - a.t));
    (u.uTop.value as Color).copy(a.top).lerp(b.top, f);
    (u.uHorizon.value as Color).copy(a.horizon).lerp(b.horizon, f);
    (u.uGround.value as Color).copy(a.ground).lerp(b.ground, f);
    (u.uCloud.value as Color).copy(a.cloud).lerp(b.cloud, f);
    (u.uAccent.value as Color).copy(a.accent).lerp(b.accent, f);
    u.uStars.value = a.stars + (b.stars - a.stars) * f;
    u.uDread.value = a.dread + (b.dread - a.dread) * f;
  }

  /** The short road scene before level 2 or 3: the boss waiting, the lords fallen or still ahead. */
  private updateRecap(t: number, dt: number, headYaw: number, skipFade: number): void {
    const u = this.dome.material.uniforms;
    const start = this.starts[0];
    const length = this.lens[0];
    const defeated = this.level - 1;
    const lit = [0, 1, 2].map((i) => (i < defeated ? 0.3 + i * 0.25 : i === defeated ? start + length * 0.25 : 1e9));
    this.applyLook(t);
    u.uVoid.value = this.voidMax * 0.6 * ramp(t, 0.2, 1.6);
    u.uEyes.value = ramp(t, 0.5, 1.7);
    u.uPulse.value = hit(t, lit[defeated], 1.6) * 0.8;
    u.uFlash.value = Math.min(1, hit(t, 0.3, 4) * 0.3 + (this.level >= 3 ? hit(t, lit[defeated], 3) * 0.4 : 0));
    u.uBlack.value = Math.max(1 - ramp(t, 0.1, 1.1), skipFade);
    u.uDissolve.value = ramp(t, this.end - 1.8, this.end - 0.1);
    u.uTime.value = t + 3;
    this.gem.visible = this.gemHalo.visible = this.gemBeam.visible = false;
    this.pillar.visible = this.pillarBase.visible = this.icon.visible = false;
    this.updateRoad(t, 0.2, length, this.end - 2.2, lit, defeated);
    this.updateShards(dt);
    this.updateRings(dt);
    this.updateTitles(t);
    this.recapCues(t, lit[defeated]);
    this.quiet = false;
    this.updateCaption(t, headYaw, dt, skipFade);
  }

  private recapCues(t: number, current: number): void {
    const sfx = this.sfx!;
    const hooks = this.hooks!;
    this.cue('drone', 0.2, () => sfx.drone(this.end * 0.5, 55));
    this.cue('riser', 0.3, () => {
      sfx.riser(1.8);
      hooks.intensity(this.level >= 3 ? 2 : 1);
    });
    const id = this.beats[0].id;
    if (t >= this.starts[0] && !this.fired.has('v0')) {
      if (this.quiet || t > this.starts[0] + 1.2) this.fired.add('v0');
      else if (sfx.voiceLength(id) > 0) {
        this.fired.add('v0');
        sfx.speak(id);
      }
    }
    this.cue('current', current, () => {
      sfx.metal(440 * Math.pow(1.335, this.level - 1), 1.2, 0.07, 0.6);
      sfx.boom(this.level >= 3 ? 0.9 : 0.5);
      hooks.rumble(this.level >= 3 ? 1 : 0.6);
    });
  }

  private updateSkyline(t: number, dt: number): void {
    const S = this.starts;
    const mesh = this.skyline;
    const accent = this.bossColorC;
    for (let i = 0; i < COUNT; i += 1) {
      const order = Math.abs(Math.atan2(Math.sin(this.ang[i]), Math.cos(this.ang[i]))) / Math.PI;
      const rise = outBack((t - (0.5 + order * 1.4)) / 1.2);
      const f = clamp01((t - (S[3] + 0.2 + this.delay[i])) / 2.0);
      if (f > 0.04 && this.fell[i] === 0) {
        this.fell[i] = 1;
        if (i % 3 === 0 && !this.quiet) {
          this.tmp.set(this.ax[i], BASE_Y + this.sh[i] * 0.6 + this.lift[i], this.az[i]);
          this.burst(this.tmp, accent, 3, 1.8);
        }
      }
      const shrink = f > 0.72 ? 1 - (f - 0.72) / 0.28 : 1;
      const live = Math.max(0, rise) * Math.max(0, shrink);
      this.dummy.position.set(this.ax[i], BASE_Y + this.lift[i] - f * f * 1.5, this.az[i]);
      this.dummy.rotation.set(0, -this.ang[i], f * this.tiltDir[i] * 1.2 + this.shape.tilt * this.tiltDir[i] * Math.min(1, rise));
      const width = this.sw[i] * live;
      this.dummy.scale.set(width, Math.max(0.0001, this.sh[i] * live * (1 - 0.3 * f)), width);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(i, this.dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    void dt;
  }

  private updateGem(t: number): void {
    const S = this.starts;
    const born = ramp(t, 1.4, 2.4);
    const pulled = (t - (S[3] + 0.9)) / 2.0;
    const fly = clamp01(pulled);
    const alive = born > 0.01 && pulled < 1.02;
    this.gem.visible = this.gemHalo.visible = alive;
    this.gemBeam.visible = alive && fly < 0.2;
    if (!alive) return;
    const ease = fly * fly * (3 - 2 * fly);
    const x = 0 + (0 - 0) * ease;
    const y = 0.45 + Math.sin(t * 1.5) * 0.06 * (1 - fly) + (1.1 - 0.45) * ease + Math.sin(ease * Math.PI) * 0.9;
    const z = -3.0 + (-4.8 + 3.0) * ease;
    this.gem.position.set(x, y, z);
    this.gemHalo.position.copy(this.gem.position);
    this.gemBeam.position.set(0, y - 3.6, z);
    const size = Math.max(0.01, outBack((t - 1.4) / 0.8) * (fly > 0.8 ? 1 - (fly - 0.8) * 5 : 1));
    this.gem.scale.setScalar(size * (1 + 0.1 * Math.sin(t * 5)));
    this.gem.rotation.set(t * 0.9, t * 1.6, 0);
    this.gemHalo.scale.setScalar((1.1 + 0.2 * Math.sin(t * 3)) * size * (1 + fly));
    (this.gem.material as MeshBasicMaterial).color.copy(this.gemColor);
    (this.gemHalo.material as SpriteMaterial).color.copy(this.gemColor);
    (this.gemBeam.material as MeshBasicMaterial).color.copy(this.gemColor);
    (this.gemBeam.material as MeshBasicMaterial).opacity = 0.3 * (1 - fly * 4);
    if (!this.fired.has('rip') && fly > 0.95) {
      this.fired.add('rip');
      if (!this.quiet) {
        this.ring(this.tmp.set(0, 1.1, -4.8), '#' + this.bossColorC.getHexString(), 1.6, 1.2);
        this.sfx!.boom(0.7);
      }
    }
  }

  private updateRoad(t: number, from: number, length: number, fadeAt: number, lit: readonly number[], defeated: number): void {
    const draw = ramp(t, from + 0.4, from + length * 0.78) * (1 - ramp(t, fadeAt + 0.2, fadeAt + 1.4));
    // The trail through the gates.
    const stops = [PATH_START, GATES[0], GATES[1], GATES[2]];
    for (let i = 0; i < PATH_POINTS; i += 1) {
      const x = (i / (PATH_POINTS - 1)) * 3;
      const seg = Math.min(2, Math.floor(x));
      const e = smooth(x - seg);
      this.tmp.copy(stops[seg]).lerp(stops[seg + 1], e);
      this.pathPositions[i * 3] = this.tmp.x + Math.sin(x * 2.2 + t) * 0.03;
      this.pathPositions[i * 3 + 1] = this.tmp.y + Math.cos(x * 3 + t) * 0.03;
      this.pathPositions[i * 3 + 2] = this.tmp.z;
    }
    const attribute = this.path.geometry.getAttribute('position');
    attribute.needsUpdate = true;
    this.path.geometry.setDrawRange(0, Math.floor(PATH_POINTS * draw));
    this.path.visible = draw > 0.02;
    (this.path.material as PointsMaterial).color.set(this.bossColor).lerp(WHITE, 0.4);

    for (let i = 0; i < 3; i += 1) {
      const gate = this.gates[i];
      const showAt = from + 0.2 + i * 0.5;
      const ghost = ramp(t, showAt, showAt + 0.6);
      const on = outBack((t - lit[i]) / 0.55);
      const fade = 1 - ramp(t, fadeAt + 0.2, fadeAt + 1.4);
      const visible = ghost > 0.01 && fade > 0.01;
      gate.ring.visible = gate.diamond.visible = gate.halo.visible = visible;
      // Labels show once a gate is lit; in the recap the gates still ahead are labelled too.
      if (gate.label) gate.label.sprite.visible = visible && (t >= lit[i] - 0.2 || (this.mode === 'recap' && ghost > 0.9));
      if (!visible) continue;
      const color = i < defeated ? '#39FF88' : i === 2 ? this.bossColor : i === 0 ? '#3DF5FF' : '#FFD23F';
      const gp = GATES[i];
      gate.ring.position.copy(gp);
      gate.ring.quaternion.setFromUnitVectors(Z_AXIS, this.tmp.copy(gp).negate().normalize());
      gate.diamond.position.copy(gp);
      gate.halo.position.copy(gp);
      const size = ghost * (0.6 + 0.4 * Math.min(1, Math.max(0, on)));
      gate.ring.scale.setScalar(Math.max(0.01, size) * (1 + hit(t, lit[i], 4) * 0.8));
      (gate.ring.material as MeshBasicMaterial).color.set(color);
      (gate.ring.material as MeshBasicMaterial).opacity = (0.25 + 0.55 * clamp01(on)) * fade;
      gate.diamond.scale.setScalar(Math.max(0.01, on) * (1 + 0.15 * Math.sin(t * 4 + i)));
      gate.diamond.rotation.set(t * 0.8, t * 1.4, 0);
      (gate.diamond.material as MeshBasicMaterial).color.set(color);
      (gate.diamond.material as MeshBasicMaterial).opacity = fade;
      gate.halo.scale.setScalar((0.8 + 0.7 * clamp01(on) + hit(t, lit[i], 3) * 0.6) * (i === 2 ? 1.4 : 1));
      (gate.halo.material as SpriteMaterial).color.set(color);
      (gate.halo.material as SpriteMaterial).opacity = clamp01(on) * fade;
      if (gate.label) {
        gate.label.sprite.position.set(gp.x, gp.y + 0.66 + (i === 2 ? 0.1 : 0), gp.z);
        gate.label.material.opacity = (this.mode === 'recap' && t < lit[i] ? 0.55 * ramp(t, showAt + 0.3, showAt + 0.9) : clamp01((t - lit[i]) / 0.4)) * fade;
      }
    }
  }

  private updateHero(t: number): void {
    const S = this.starts;
    const last = this.beats.length - 1;
    const rise = ramp(t, S[last] + 0.1, S[last] + 1.1);
    const fade = 1 - ramp(t, this.end - 2.2, this.end - 0.4);
    const flare = hit(t, S[last] + 0.9, 2.4);
    const show = rise > 0.01 && fade > 0.01;
    this.pillar.visible = this.pillarBase.visible = this.icon.visible = show;
    if (!show) return;
    this.pillar.position.set(0, 1.2, -3.0);
    this.pillar.scale.set(1 + flare * 1.4, rise, 1 + flare * 1.4);
    (this.pillar.material as MeshBasicMaterial).opacity = (0.3 + flare * 0.5) * fade * rise;
    this.pillarBase.position.set(0, -1.4, -3.0);
    this.pillarBase.scale.setScalar(1 + flare * 1.2);
    (this.pillarBase.material as MeshBasicMaterial).opacity = rise * fade;
    this.icon.position.set(0, 0.55 + Math.sin(t * 2) * 0.05, -3.0);
    this.icon.scale.setScalar(Math.max(0.001, 1.1 * outBack((t - S[last] - 0.4) / 0.5) * (1 + flare * 0.3)));
    (this.icon.material as SpriteMaterial).opacity = fade;
  }

  private updateShards(dt: number): void {
    if (!this.shards.visible) return;
    let any = false;
    for (let i = 0; i < SHARDS; i += 1) {
      const life = this.shardLife[i];
      if (life <= 0) {
        this.dummy.position.set(0, -50, 0);
        this.dummy.scale.setScalar(0.0001);
      } else {
        any = true;
        this.shardLife[i] = life - dt;
        const o = i * 3;
        this.shardVel[o + 1] -= dt * 1.1;
        this.shardPos[o] += this.shardVel[o] * dt;
        this.shardPos[o + 1] += this.shardVel[o + 1] * dt;
        this.shardPos[o + 2] += this.shardVel[o + 2] * dt;
        this.dummy.position.set(this.shardPos[o], this.shardPos[o + 1], this.shardPos[o + 2]);
        this.dummy.rotation.set(life * 6 + i, life * 4, i);
        this.dummy.scale.setScalar(Math.min(1.5, life) * (0.8 + (i % 5) * 0.25));
      }
      this.dummy.updateMatrix();
      this.shards.setMatrixAt(i, this.dummy.matrix);
    }
    this.shards.instanceMatrix.needsUpdate = true;
    if (!any) this.shards.visible = false;
  }

  private updateRings(dt: number): void {
    for (const ring of this.rings) {
      if (ring.t >= ring.life) {
        ring.mesh.visible = false;
        continue;
      }
      ring.t += dt;
      const x = clamp01(ring.t / ring.life);
      ring.mesh.scale.setScalar(0.2 + ring.size * (1 - (1 - x) * (1 - x)) * 2.2);
      (ring.mesh.material as MeshBasicMaterial).opacity = (1 - x) * 0.9;
    }
  }

  private updateTitles(t: number): void {
    if (this.titles == null) return;
    const S = this.starts;
    const last = this.beats.length - 1;
    const show = (card: TitleCard, at: number, until: number, y: number, z: number): void => {
      const x = (t - at) / 0.32;
      const on = t >= at && t < until + 0.5;
      card.sprite.visible = on;
      if (!on) return;
      const slam = 1 + (1 - outBack(x)) * 1.7;
      card.sprite.position.set(0, y, z);
      card.sprite.scale.set(card.width * slam, card.width * 0.375 * slam, 1);
      card.material.opacity = clamp01(x * 3) * (1 - ramp(t, until, until + 0.5));
    };
    if (this.mode === 'recap') {
      show(this.titles.trial, 0.5, this.starts[0] + this.lens[0] * 0.45, 0.8, -3.1);
      return;
    }
    show(this.titles.region, 1.5, S[1] - 0.5, 0.6, -3.1);
    show(this.titles.boss, S[1] + 1.3, S[2] - 0.2, 0.7, -3.1);
    show(this.titles.hero, S[last] + 0.7, this.end - 2.0, 0.55, -3.0);
  }

  private cues(t: number): void {
    const sfx = this.sfx!;
    const hooks = this.hooks!;
    const S = this.starts;
    const last = this.beats.length - 1;
    this.cue('drone', 0.4, () => sfx.drone(this.end * 0.5, 55));
    for (let i = 0; i < this.beats.length; i += 1) {
      const id = this.beats[i].id;
      if (t < S[i] || this.fired.has(`v${i}`)) continue;
      if (this.quiet || t > S[i] + 1.2) this.fired.add(`v${i}`);
      else if (sfx.voiceLength(id) > 0) {
        this.fired.add(`v${i}`);
        sfx.speak(id);
      }
    }
    this.cue('chime', 1.4, () => {
      sfx.metal(660, 1.6, 0.05, 0.7);
      sfx.metal(990, 1.8, 0.03, 0.7);
    });
    this.cue('arrival', S[1] + 0.8, () => {
      sfx.riser(2.4);
      hooks.intensity(1);
    });
    this.cue('boss', S[1] + 1.3, () => {
      sfx.boom(1);
      hooks.rumble(0.9);
    });
    this.cue('declare', S[2], () => {
      sfx.boom(0.8);
      hooks.intensity(2);
    });
    this.cue('fall', S[3], () => {
      sfx.riser(1.8);
      sfx.glass();
      hooks.rumble(0.8);
    });
    for (let n = 1; n <= 4; n += 1) {
      this.cue(`crumble${n}`, S[3] + 0.8 + n * 1.2, () => {
        sfx.glass();
        sfx.boom(0.4);
      });
    }
    this.cue('road', S[4], () => {
      sfx.riser(2);
      hooks.intensity(1);
    });
    const lit = [S[4] + this.lens[4] * 0.2, S[4] + this.lens[4] * 0.48, S[4] + this.lens[4] * 0.76];
    lit.forEach((at, i) => {
      this.cue(`gate${i}`, at, () => {
        sfx.metal(440 * Math.pow(1.335, i), 1.2, 0.07, 0.6);
        if (i === 2) {
          sfx.boom(0.9);
          hooks.rumble(1);
        }
      });
    });
    this.cue('hero', S[last] + 0.1, () => {
      sfx.boom(0.6);
      hooks.intensity(2);
    });
    this.cue('title', S[last] + 0.9, () => sfx.stinger());
  }

  private updateCaption(t: number, headYaw: number, dt: number, skipFade: number): void {
    let delta = headYaw - this.captionYaw;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    this.captionYaw += delta * Math.min(1, dt * 3);
    const dist = 1.7;
    const at = (sprite: Sprite, pitch: number): void => {
      sprite.position.set(-Math.sin(this.captionYaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, -Math.cos(this.captionYaw) * Math.cos(pitch) * dist);
    };
    let text = '';
    let color = '#FFFFFF';
    let alpha = 0;
    for (let i = 0; i < this.beats.length; i += 1) {
      const start = this.starts[i];
      const length = this.lens[i];
      if (t >= start && t < start + length + 0.2) {
        const beat = this.beats[i];
        text = beat.text;
        color = beat.voice === 'echo' ? '#3DF5FF' : beat.voice === 'narrator' ? '#FFFFFF' : this.bossColor;
        alpha = clamp01((t - start) / 0.25) * (1 - ramp(t, start + length - TAIL, start + length + 0.2));
      }
    }
    const fade = this.skipping >= 0 ? 1 - clamp01(this.skipping / 0.4) : 1;
    this.caption.set(text, color, alpha * fade);
    at(this.caption.sprite, -0.3);
    const hintAlpha = this.flat ? 0 : ramp(t, 2.5, 3.5) * (1 - ramp(t, this.end - 3, this.end - 2)) * 0.8 * fade;
    this.hint.set('PINCH TO SKIP', '#E9FCFF', hintAlpha, true);
    at(this.hint.sprite, -0.52);
    void skipFade;
  }

  private finish(): void {
    if (!this.active) return;
    this.active = false;
    this.group.visible = false;
    this.sfx?.stopVoice();
    this.hooks?.erase(0);
    this.hooks?.intensity(0);
    this.unmountDom();
    const done = this.done;
    this.done = null;
    done?.();
  }
}

