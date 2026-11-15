import {
  AdditiveBlending,
  BackSide,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  OctahedronGeometry,
  RingGeometry,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TetrahedronGeometry,
  Vector3,
} from '@iwsdk/core';
import { MOVIE_LINES, movieLine } from './cinema-script.js';
import { drawIcon, iconsReady } from './icons.js';
import { HEROES } from './heroes.js';
import type { Sfx } from './sfx.js';
import { Caption, clamp01, createDome, glowTexture, hit, outBack, planetMaterial, ramp, ringTexture, SPEAKER_COLOR, smooth, titleCard, type TitleCard } from './cinema-kit.js';

/**
 * The opening movie: ~53 seconds that play all around the player, in a
 * headset or on a screen. Nine Anchors hold the sky together; OBLIVAX, a black
 * sun with eyes, opens in it; worlds shatter; the Hollow Legion's ship and
 * drop pods darken the horizon; the erasure reaches the player's own room;
 * nine heroes rise; and the title lands. A narrator, OBLIVAX, VEX and ECHO
 * speak (rendered voice-over, see scripts/vo) over captions. Skippable at any
 * time.
 *
 * Everything on screen is a pure function of the movie clock `t`, so the
 * sequence can be scrubbed and tested; only the shard burst keeps its own
 * physics. One sky-sphere shader, a handful of additive meshes, no
 * per-frame allocation.
 */

export const MOVIE_SECONDS = 55;

// -------------------------------------------------------------- timeline (seconds)
const T = {
  anchors: 1.6,
  dark: 8.6,
  voidOpen: 9.2,
  oblivax: 11.8,
  eyes: 13.2,
  rip: 20.4,
  shatter: 21.6,
  ship: 24.6,
  vex: 25.4,
  room: 36.2,
  roomEnd: 40.2,
  heroes: 40.6,
  hands: 45.6,
  title: 48.1,
  reveal: 51.8,
} as const;

/** When each voice line starts. */
const VOICE_AT: Readonly<Record<string, number>> = { m01: 1.0, m02: 8.9, m03: 11.6, m04: 19.2, m05: 25.0, m06: 30.4, m07: 36.0, m08: 40.2, m09: 45.6, m10: 47.7 };

// -------------------------------------------------------------- looks
interface Look {
  readonly t: number;
  readonly top: string;
  readonly horizon: string;
  readonly ground: string;
  readonly cloud: string;
  readonly accent: string;
  readonly stars: number;
  readonly dread: number;
}

const LOOKS: readonly Look[] = [
  { t: 0, top: '#02040E', horizon: '#06122C', ground: '#010207', cloud: '#101A44', accent: '#3DF5FF', stars: 1, dread: 0 },
  { t: 4, top: '#06143A', horizon: '#1B6AA8', ground: '#02060F', cloud: '#2B2F86', accent: '#3DF5FF', stars: 1, dread: 0 },
  { t: 8.4, top: '#05102A', horizon: '#18527F', ground: '#02050C', cloud: '#2A2A70', accent: '#3DF5FF', stars: 1, dread: 0 },
  { t: 12, top: '#020006', horizon: '#3A0A28', ground: '#010003', cloud: '#2A0830', accent: '#FF4FD8', stars: 0.15, dread: 0.15 },
  { t: 19, top: '#080010', horizon: '#5A0F3A', ground: '#010003', cloud: '#3A0A3A', accent: '#FF4FD8', stars: 0, dread: 0.3 },
  { t: 22.5, top: '#0A0210', horizon: '#FF4A1A', ground: '#0A0204', cloud: '#7A1228', accent: '#FF7A2A', stars: 0, dread: 0.6 },
  { t: 27, top: '#0A0218', horizon: '#9A2BE0', ground: '#06010C', cloud: '#5A1478', accent: '#C04DFF', stars: 0, dread: 0.5 },
  { t: 35.5, top: '#06000E', horizon: '#7A1FB0', ground: '#030006', cloud: '#3A0A4A', accent: '#FF4FD8', stars: 0, dread: 0.7 },
  { t: 39.8, top: '#06000E', horizon: '#7A1FB0', ground: '#030006', cloud: '#3A0A4A', accent: '#FF4FD8', stars: 0, dread: 0.6 },
  { t: 40.4, top: '#031030', horizon: '#2FA8E8', ground: '#02060F', cloud: '#2A4FA0', accent: '#FFD23F', stars: 1, dread: 0 },
  { t: 48, top: '#04153A', horizon: '#FFD23F', ground: '#03080F', cloud: '#2A6FC0', accent: '#FFFFFF', stars: 1, dread: 0 },
  { t: MOVIE_SECONDS, top: '#04153A', horizon: '#FFD23F', ground: '#03080F', cloud: '#2A6FC0', accent: '#FFFFFF', stars: 1, dread: 0 },
];

export interface CinemaHooks {
  /** The room being eaten, 0..0.6: the host drives the world's erasure sphere. */
  erase(level: number): void;
  /** Controller or phone rumble, 0..1. */
  rumble(strength: number): void;
  /** Music intensity: 0 calm, 1 tense, 2 huge. */
  intensity(level: number): void;
}

const SHARDS = 220;
const PLANET_COLORS = ['#3DF5FF', '#FF6A1A', '#9D8CFF', '#9FE8FF', '#FFB01F', '#4DA6FF'];
const POD_GEOMETRY = new CylinderGeometry(0.05, 0, 1, 6, 1, true);
const WHITE = new Color('#FFFFFF');
const Y_AXIS = new Vector3(0, 1, 0);
const Z_AXIS = new Vector3(0, 0, 1);
const PODS = 22;
const ANCHOR_COUNT = 9;
const PLANETS = 6;
const RINGS = 8;

export class Cinema {
  readonly group = new Group();
  active = false;
  /** Seconds into the movie. */
  t = 0;

  private readonly dome: Mesh;
  private readonly material: ShaderMaterial;
  private readonly stage = new Group();
  private readonly glow = glowTexture();
  private readonly ringTex = ringTexture();
  private readonly anchors: Array<{ gem: Mesh; halo: Sprite; beam: Mesh; color: Color }> = [];
  private readonly planets: Array<{ mesh: Mesh; shattered: boolean; at: number; base: Vector3 }> = [];
  private readonly pods: Array<{ mesh: Mesh; from: Vector3; to: Vector3; start: number; landed: boolean }> = [];
  private readonly rings: Array<{ mesh: Mesh; t: number; size: number; life: number }> = [];
  private readonly shards: InstancedMesh;
  private readonly shardPos = new Float32Array(SHARDS * 3);
  private readonly shardVel = new Float32Array(SHARDS * 3);
  private readonly shardLife = new Float32Array(SHARDS);
  private shardNext = 0;
  private readonly ship = new Group();
  private readonly shipGlow: Sprite[] = [];
  private readonly heroes: Array<{ pillar: Mesh; icon: Sprite; base: Mesh; color: Color; x: number }> = [];
  private readonly palms: Sprite[] = [];
  private readonly titles: Record<'oblivax' | 'vex' | 'surge', TitleCard>;
  private readonly caption = new Caption(236, 1.9);
  private readonly hint = new Caption(160, 0.9);
  private readonly dummy = new Object3D();
  private readonly tmp = new Vector3();
  private readonly tmp2 = new Vector3();
  private readonly dir = new Vector3();
  private readonly colorA = new Color();
  private readonly colorB = new Color();
  private readonly voidDir = new Vector3(0, 0.22, -1).normalize();

  private flat = false;
  private yaw = 0;
  private captionYaw = 0;
  private done: (() => void) | null = null;
  private hooks: CinemaHooks | null = null;
  private sfx: Sfx | null = null;
  private fired = new Set<string>();
  private shardsCount = 0;
  private hold = 0;
  private skipping = -1;
  private readonly bars: HTMLElement | null = null;
  private dom: HTMLElement | null = null;
  private lastErase = -1;
  private quiet = false;

  constructor() {
    const dome = createDome(this.voidDir);
    this.material = dome.material;
    this.dome = dome.mesh;
    this.group.add(this.dome, this.stage);
    this.group.visible = false;
    this.group.name = 'Cinema';

    const additive = (map: CanvasTexture | null, color: string, opacity = 1, side = DoubleSide): MeshBasicMaterial =>
      new MeshBasicMaterial({ map, color, transparent: true, opacity, blending: AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false, side });

    // Anchors: a gem, a halo and a column of light each.
    const gemGeometry = new OctahedronGeometry(0.15);
    const beamGeometry = new CylinderGeometry(0.018, 0.018, 9, 6, 1, true);
    for (let i = 0; i < ANCHOR_COUNT; i += 1) {
      const color = new Color(HEROES[i % HEROES.length].color);
      const gem = new Mesh(gemGeometry, new MeshBasicMaterial({ color, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
      gem.renderOrder = 66;
      const halo = new Sprite(new SpriteMaterial({ map: this.glow, color, transparent: true, blending: AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false }));
      halo.renderOrder = 65;
      const beam = new Mesh(beamGeometry, additive(null, '#FFFFFF', 0.3));
      (beam.material as MeshBasicMaterial).color.copy(color);
      beam.renderOrder = 64;
      this.stage.add(beam, gem, halo);
      this.anchors.push({ gem, halo, beam, color });
      gem.visible = halo.visible = beam.visible = false;
    }

    // Planets that shatter.
    const planetGeometry = new SphereGeometry(1, 20, 14);
    const palette = PLANET_COLORS;
    for (let i = 0; i < PLANETS; i += 1) {
      const mesh = new Mesh(planetGeometry, planetMaterial(palette[i]));
      mesh.renderOrder = 62;
      mesh.visible = false;
      this.stage.add(mesh);
      this.planets.push({ mesh, shattered: false, at: T.shatter + i * 0.55, base: new Vector3() });
    }

    // Shards (one instanced draw call), shockwave rings, Legion drop pods.
    this.shards = new InstancedMesh(new TetrahedronGeometry(0.05), new MeshBasicMaterial({ color: '#FFFFFF', transparent: true, depthTest: false, depthWrite: false, toneMapped: false }), SHARDS);
    this.shards.frustumCulled = false;
    this.shards.renderOrder = 67;
    this.shards.visible = false;
    this.stage.add(this.shards);
    for (let i = 0; i < RINGS; i += 1) {
      const mesh = new Mesh(new RingGeometry(0.86, 1, 48), additive(this.ringTex, '#FFFFFF', 0));
      mesh.renderOrder = 68;
      mesh.visible = false;
      this.stage.add(mesh);
      this.rings.push({ mesh, t: 9, size: 1, life: 1 });
    }
    for (let i = 0; i < PODS; i += 1) {
      const mesh = new Mesh(POD_GEOMETRY, additive(null, i % 2 === 0 ? '#FF7A2A' : '#C04DFF', 0.95));
      mesh.renderOrder = 68;
      mesh.visible = false;
      this.stage.add(mesh);
      this.pods.push({ mesh, from: new Vector3(), to: new Vector3(), start: 0, landed: false });
    }

    // The Hollow Legion's flagship: a dark wedge with a purple rim and engine fire.
    const hull = new Mesh(new CylinderGeometry(0.15, 1.5, 7, 4, 1), new MeshBasicMaterial({ color: '#07040C', transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    hull.rotation.set(0, 0, Math.PI / 2);
    hull.scale.set(0.34, 1, 1);
    hull.renderOrder = 64;
    const rim = new Mesh(hull.geometry, new MeshBasicMaterial({ color: '#9A3BFF', transparent: true, opacity: 0.85, blending: AdditiveBlending, side: BackSide, depthTest: false, depthWrite: false, toneMapped: false }));
    rim.rotation.copy(hull.rotation);
    rim.scale.set(0.4, 1.03, 1.1);
    rim.renderOrder = 63;
    const tower = new Mesh(new CylinderGeometry(0.1, 0.5, 1.6, 4, 1), hull.material);
    tower.position.set(0.6, 0.55, 0);
    tower.rotation.y = Math.PI / 4;
    tower.renderOrder = 64;
    this.ship.add(rim, hull, tower);
    for (const [x, z, s] of [[3.4, 0.15, 1.2], [3.4, -0.15, 1.2], [3.2, 0, 1.8]] as const) {
      const engine = new Sprite(new SpriteMaterial({ map: this.glow, color: '#FF7A2A', transparent: true, blending: AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false }));
      engine.position.set(x, 0, z);
      engine.scale.setScalar(s);
      engine.renderOrder = 65;
      this.ship.add(engine);
      this.shipGlow.push(engine);
    }
    this.ship.visible = false;
    this.stage.add(this.ship);

    // Heroes: a column of light and an icon each.
    const pillarGeometry = new CylinderGeometry(0.1, 0.16, 7, 12, 1, true);
    for (let i = 0; i < HEROES.length; i += 1) {
      const color = new Color(HEROES[i].color);
      const pillar = new Mesh(pillarGeometry, additive(null, HEROES[i].color, 0.4));
      pillar.renderOrder = 64;
      const base = new Mesh(new RingGeometry(0.22, 0.34, 32), additive(null, HEROES[i].color, 0.9));
      base.rotation.x = -Math.PI / 2;
      base.renderOrder = 65;
      const icon = new Sprite(new SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
      icon.renderOrder = 66;
      pillar.visible = base.visible = icon.visible = false;
      this.stage.add(pillar, base, icon);
      this.heroes.push({ pillar, icon, base, color, x: 0 });
    }
    void iconsReady.then(() => {
      HEROES.forEach((hero, i) => {
        const c = document.createElement('canvas');
        c.width = c.height = 128;
        const g = c.getContext('2d')!;
        drawIcon(g, hero.id, 64, 64, 104, hero.color, 14);
        const material = this.heroes[i].icon.material as SpriteMaterial;
        material.map = new CanvasTexture(c);
        material.needsUpdate = true;
      });
    });

    // Palm glows: the player's own hands light up when the ECHO line says "your hands".
    for (let i = 0; i < 2; i += 1) {
      const sprite = new Sprite(new SpriteMaterial({ map: this.glow, color: '#FFD23F', transparent: true, blending: AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false }));
      sprite.renderOrder = 85;
      sprite.visible = false;
      this.group.add(sprite);
      this.palms.push(sprite);
    }

    this.titles = {
      oblivax: titleCard('OBLIVAX', 'THE UNMAKER', '#FF4FD8', 3.4),
      vex: titleCard('WARLORD VEX', 'HERALD OF THE UNMAKER', '#C04DFF', 3.6),
      surge: titleCard('SURGE', 'HANDS OF HEROES', '#3DF5FF', 3.8),
    };
    this.stage.add(this.titles.oblivax.sprite, this.titles.vex.sprite, this.titles.surge.sprite);
    this.group.add(this.caption.sprite, this.hint.sprite);
    this.shards.count = SHARDS;
  }

  /**
   * Starts the movie around `head`, facing `forward`. `flat` is a screen
   * (letterbox bars and a SKIP button); `done` runs once when it ends or is skipped.
   */
  start(sfx: Sfx, hooks: CinemaHooks, head: Vector3, forward: Vector3, flat: boolean, done: () => void): void {
    this.sfx = sfx;
    this.hooks = hooks;
    this.flat = flat;
    this.done = done;
    this.t = 0;
    this.hold = 2.5;
    this.skipping = -1;
    this.fired.clear();
    this.shardsCount = 0;
    this.shardLife.fill(0);
    this.lastErase = -1;
    this.yaw = Math.atan2(-forward.x, -forward.z);
    this.captionYaw = this.yaw;
    this.stage.rotation.set(0, this.yaw, 0);
    this.group.position.copy(head);
    this.group.visible = true;
    this.active = true;
    for (const planet of this.planets) planet.shattered = false;
    for (const pod of this.pods) pod.landed = false;
    this.layout();
    for (const line of MOVIE_LINES) void sfx.loadVoice(line.id);
    hooks.intensity(0);
    if (flat) this.mountDom();
  }

  /** Test hook: jumps the clock to `t` without replaying the sounds before it. */
  seek(t: number): void {
    this.hold = 0;
    this.t = t;
    this.quiet = true;
  }

  /** Cuts to the end: the voice stops and the movie fades out. */
  skip(): void {
    if (!this.active || this.skipping >= 0) return;
    this.skipping = 0;
    this.sfx?.stopVoice();
  }

  dispose(): void {
    this.unmountDom();
  }

  /** Arranges the set pieces (once per run: depends on flat versus headset). */
  private layout(): void {
    const span = this.flat ? 0.95 : Math.PI;
    for (let i = 0; i < ANCHOR_COUNT; i += 1) {
      const a = this.flat ? (i / (ANCHOR_COUNT - 1) - 0.5) * 2 * span : (i / ANCHOR_COUNT) * Math.PI * 2;
      const r = 3.3;
      const y = Math.sin(i * 2.1) * 0.35 - 0.1;
      const anchor = this.anchors[i];
      anchor.gem.position.set(Math.sin(a) * r, y, -Math.cos(a) * r);
      anchor.halo.position.copy(anchor.gem.position);
      anchor.beam.position.set(anchor.gem.position.x, y - 3.6, anchor.gem.position.z);
    }
    for (let i = 0; i < PLANETS; i += 1) {
      const a = this.flat ? (i / (PLANETS - 1) - 0.5) * 2 * 1.0 : (i / PLANETS) * Math.PI * 2 + 0.4;
      const e = 0.18 + (i % 3) * 0.2;
      const r = 5;
      const planet = this.planets[i];
      planet.base.set(Math.sin(a) * Math.cos(e) * r, Math.sin(e) * r - 0.2, -Math.cos(a) * Math.cos(e) * r);
      planet.mesh.position.copy(planet.base);
      planet.mesh.scale.setScalar(0.36 + (i % 3) * 0.14);
    }
    for (let i = 0; i < HEROES.length; i += 1) {
      const a = (i / (HEROES.length - 1) - 0.5) * 2 * (this.flat ? 0.7 : 1.35);
      const r = 3.4;
      const hero = this.heroes[i];
      hero.x = a;
      hero.pillar.position.set(Math.sin(a) * r, 1.2, -Math.cos(a) * r);
      hero.base.position.set(Math.sin(a) * r, -1.4, -Math.cos(a) * r);
      hero.icon.position.set(Math.sin(a) * r, 0.25, -Math.cos(a) * r);
      hero.icon.scale.setScalar(0.72);
    }
    for (let i = 0; i < PODS; i += 1) {
      const pod = this.pods[i];
      const a = this.flat ? (i / (PODS - 1) - 0.5) * 2 * 0.8 : Math.random() * Math.PI * 2;
      pod.from.set(Math.sin(a) * 3.6, 2.4 + (i % 4) * 0.35, -Math.cos(a) * 3.6);
      pod.to.set(Math.sin(a + 0.25) * 5.4, -1.3, -Math.cos(a + 0.25) * 5.4);
      pod.start = T.vex + 0.4 + (i / PODS) * 8 + (i % 3) * 0.17;
      pod.landed = false;
    }
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

  private ring(position: Vector3, color: string, size: number, life: number): void {
    let pick = this.rings[0];
    for (const ring of this.rings) if (ring.t >= ring.life) pick = ring;
    pick.t = 0;
    pick.size = size;
    pick.life = life;
    pick.mesh.position.copy(position);
    pick.mesh.quaternion.setFromUnitVectors(Z_AXIS, this.dir.copy(position).negate().normalize());
    (pick.mesh.material as MeshBasicMaterial).color.set(color);
    pick.mesh.visible = true;
  }

  private burst(position: Vector3, color: string, count: number, speed: number): void {
    this.colorA.set(color);
    for (let k = 0; k < count; k += 1) {
      const i = this.shardNext;
      this.shardNext = (this.shardNext + 1) % SHARDS;
      this.shardPos[i * 3] = position.x;
      this.shardPos[i * 3 + 1] = position.y;
      this.shardPos[i * 3 + 2] = position.z;
      const a = Math.random() * Math.PI * 2;
      const e = (Math.random() - 0.5) * 2.4;
      const v = speed * (0.4 + Math.random());
      this.shardVel[i * 3] = Math.cos(a) * Math.cos(e) * v;
      this.shardVel[i * 3 + 1] = Math.sin(e) * v;
      this.shardVel[i * 3 + 2] = Math.sin(a) * Math.cos(e) * v;
      this.shardLife[i] = 1.4 + Math.random() * 1.2;
      this.shards.setColorAt(i, this.colorB.copy(this.colorA).lerp(WHITE, Math.random() * 0.4));
    }
    if (this.shards.instanceColor) this.shards.instanceColor.needsUpdate = true;
    this.shards.visible = true;
  }

  /** One-time cues (sounds, hooks) when the clock passes `at`. */
  private cue(name: string, at: number, run: () => void): void {
    if (this.t >= at && !this.fired.has(name)) {
      this.fired.add(name);
      if (!this.quiet) run();
    }
  }

  update(dt: number, head: Vector3, palms: readonly Vector3[], tracked: readonly boolean[], headYaw: number): void {
    if (!this.active) return;
    const sfx = this.sfx!;
    this.group.position.copy(head);
    // Hold on black until the first voice line is ready (or 2.5 s), then run the clock.
    if (this.hold > 0) {
      this.hold = sfx.voiceLength('m01') > 0 ? 0 : this.hold - dt;
    } else this.t += dt;
    if (this.skipping >= 0) {
      this.skipping += dt;
      if (this.skipping > 0.7) {
        this.finish();
        return;
      }
    }
    const t = this.t;
    const u = this.material.uniforms;
    const skipFade = this.skipping >= 0 ? clamp01(this.skipping / 0.6) : 0;

    // ---- sky look
    let k = 0;
    while (k < LOOKS.length - 2 && t >= LOOKS[k + 1].t) k += 1;
    const a = LOOKS[k];
    const b = LOOKS[k + 1];
    const f = smooth((t - a.t) / Math.max(0.001, b.t - a.t));
    (u.uTop.value as Color).set(a.top).lerp(this.colorA.set(b.top), f);
    (u.uHorizon.value as Color).set(a.horizon).lerp(this.colorA.set(b.horizon), f);
    (u.uGround.value as Color).set(a.ground).lerp(this.colorA.set(b.ground), f);
    (u.uCloud.value as Color).set(a.cloud).lerp(this.colorA.set(b.cloud), f);
    (u.uAccent.value as Color).set(a.accent).lerp(this.colorA.set(b.accent), f);
    u.uStars.value = a.stars + (b.stars - a.stars) * f;
    u.uDread.value = a.dread + (b.dread - a.dread) * f;

    // ---- the black sun
    const pinprick = ramp(t, T.voidOpen, T.voidOpen + 1.5) * 0.1;
    const grow = ramp(t, T.oblivax - 0.2, T.oblivax + 5);
    u.uVoid.value = (pinprick + 0.4 * grow) * (1 - ramp(t, T.room, T.room + 2.6));
    u.uEyes.value = ramp(t, T.eyes, T.eyes + 1.1) * (1 - ramp(t, T.room - 0.5, T.room + 1.2)) * (t > 31 && t < 31.35 ? 0.1 : 1);
    u.uPulse.value = hit(t, T.rip, 1.3) * 0.8 + hit(t, T.title, 1.6) * 1.0;
    // The first Anchors are ripped away: the void flares with each.
    u.uFlash.value = Math.min(1, hit(t, T.oblivax + 0.1, 3.2) * 0.55 + hit(t, T.title, 2.6) + this.planetFlash(t) + hit(t, T.heroes - 0.2, 4) * 0.5);
    u.uBlack.value = Math.max(1 - ramp(t, 0.1, 2.2), skipFade);
    // The room is eaten (dissolve opens the dome), the heroes close it again, and the end reveals the room.
    const eaten = ramp(t, T.room, T.room + 1.6) * (1 - ramp(t, T.roomEnd - 0.6, T.roomEnd));
    u.uDissolve.value = Math.max(eaten * 0.62, ramp(t, T.reveal, T.reveal + 2.2));
    u.uTime.value = t + 3;

    // ---- host hooks
    const erase = eaten * 0.55;
    if (Math.abs(erase - this.lastErase) > 0.01) {
      this.lastErase = erase;
      this.hooks!.erase(erase);
    }

    this.updateAnchors(t);
    this.updatePlanets(t, dt);
    this.updatePods(t);
    this.updateShip(t);
    this.updateHeroes(t);
    this.updateShards(dt);
    this.updateRings(dt);
    this.updateTitles(t);
    this.updatePalms(t, palms, tracked);
    this.cues(t);
    this.quiet = false;
    this.updateCaption(t, head, headYaw, dt);

    if (t >= MOVIE_SECONDS) this.finish();
  }

  private planetFlash(t: number): number {
    let flash = 0;
    for (const planet of this.planets) flash += hit(t, planet.at, 7) * 0.35;
    return flash;
  }

  private updateAnchors(t: number): void {
    const target = this.tmp.set(0, 0.9, -4.7);
    for (let i = 0; i < ANCHOR_COUNT; i += 1) {
      const anchor = this.anchors[i];
      const born = T.anchors + i * 0.38;
      const pop = outBack((t - born) / 0.6);
      const pulled = (t - (T.rip + i * 0.3)) / 1.5;
      const fly = clamp01(pulled);
      const alive = t >= born && pulled < 1.05;
      anchor.gem.visible = anchor.halo.visible = alive;
      anchor.beam.visible = alive && pulled < 0.25;
      if (!alive) continue;
      // Home position on the ring, pulled toward the void along an arc.
      const baseX = Math.sin(this.ringAngle(i)) * 3.3;
      const baseZ = -Math.cos(this.ringAngle(i)) * 3.3;
      const baseY = Math.sin(i * 2.1) * 0.35 - 0.1 + Math.sin(t * 1.4 + i) * 0.06;
      const ease = fly * fly * (3 - 2 * fly);
      anchor.gem.position.set(baseX + (target.x - baseX) * ease, baseY + (target.y - baseY) * ease + Math.sin(ease * Math.PI) * 1.4, baseZ + (target.z - baseZ) * ease);
      anchor.halo.position.copy(anchor.gem.position);
      anchor.beam.position.set(baseX, baseY - 3.6, baseZ);
      const shrink = fly > 0.8 ? 1 - (fly - 0.8) * 5 : 1;
      const size = Math.max(0.01, pop * shrink) * (1 + 0.12 * Math.sin(t * 5 + i));
      anchor.gem.scale.setScalar(size);
      anchor.gem.rotation.y = t * 1.6 + i;
      anchor.gem.rotation.x = t * 0.9;
      anchor.halo.scale.setScalar((0.9 + 0.2 * Math.sin(t * 3 + i)) * Math.max(0.01, pop * shrink) * (1 + fly * 1.2));
      (anchor.beam.material as MeshBasicMaterial).opacity = 0.3 * pop * (1 - fly * 4);
    }
  }

  /** Azimuth of Anchor `i` on the ring (matches layout()). */
  private ringAngle(i: number): number {
    return this.flat ? (i / (ANCHOR_COUNT - 1) - 0.5) * 2 * 0.95 : (i / ANCHOR_COUNT) * Math.PI * 2;
  }

  private updatePlanets(t: number, dt: number): void {
    for (let i = 0; i < PLANETS; i += 1) {
      const planet = this.planets[i];
      const appear = ramp(t, 3.0 + i * 0.5, 4.2 + i * 0.5);
      planet.mesh.visible = !planet.shattered && appear > 0.01 && t < T.shatter + 10;
      if (planet.mesh.visible) {
        const quake = t > T.rip ? (Math.sin(t * 60 + i) * 0.015) * ramp(t, T.rip, planet.at) : 0;
        planet.mesh.position.set(planet.base.x + quake, planet.base.y + quake, planet.base.z);
        const base = 0.36 + (i % 3) * 0.14;
        planet.mesh.scale.setScalar(base * appear);
        planet.mesh.rotation.y += dt * 0.2;
      }
      if (!planet.shattered && t >= planet.at) {
        planet.shattered = true;
        planet.mesh.visible = false;
        this.burst(planet.base, PLANET_COLORS[i], 26, 2.6);
        this.ring(planet.base, PLANET_COLORS[i], 0.9, 1.0);
        if (i % 2 === 0) {
          this.sfx!.glass();
          this.hooks!.rumble(0.7);
        } else this.sfx!.boom(0.4);
      }
    }
  }

  private updatePods(t: number): void {
    for (const pod of this.pods) {
      const x = (t - pod.start) / 0.95;
      const visible = x >= 0 && x < 1.25;
      pod.mesh.visible = visible;
      if (!visible) continue;
      const head = clamp01(x);
      const tail = clamp01(x - 0.28);
      // A tapered streak from the tail to the glowing head, long axis along the path.
      const p0 = this.tmp.copy(pod.from).lerp(pod.to, head * head);
      const p1 = this.tmp2.copy(pod.from).lerp(pod.to, tail * tail);
      const length = Math.max(0.05, p0.distanceTo(p1));
      this.dir.subVectors(p0, p1).normalize();
      pod.mesh.position.addVectors(p0, p1).multiplyScalar(0.5);
      pod.mesh.scale.set(1, length, 1);
      pod.mesh.quaternion.setFromUnitVectors(Y_AXIS, this.dir);
      (pod.mesh.material as MeshBasicMaterial).opacity = x > 1 ? 1 - (x - 1) * 4 : 0.95;
      if (!pod.landed && x >= 1) {
        pod.landed = true;
        this.ring(pod.to, '#FF7A2A', 0.9, 0.7);
        this.burst(pod.to, '#FF7A2A', 4, 1.2);
      }
    }
  }

  private updateShip(t: number): void {
    const x = (t - T.ship) / 8.2;
    this.ship.visible = x >= 0 && x <= 1;
    if (!this.ship.visible) return;
    const sweep = (x - 0.5) * 2;
    const around = this.flat ? 0.9 : 1;
    this.ship.position.set(-sweep * 6 * around, 1.1 + Math.cos(sweep * 1.4) * 0.35, -4.6);
    this.ship.rotation.set(0, 0, 0.04 * sweep);
    this.ship.scale.setScalar(0.5 + (1 - sweep * sweep) * 0.25);
    for (const engine of this.shipGlow) (engine.material as SpriteMaterial).opacity = 0.7 + 0.3 * Math.sin(t * 17 + engine.position.z * 9);
  }

  private updateHeroes(t: number): void {
    for (let i = 0; i < HEROES.length; i += 1) {
      const hero = this.heroes[i];
      const born = T.heroes + 0.4 + i * 0.2;
      const rise = ramp(t, born, born + 0.7);
      const flare = hit(t, T.title, 2.4);
      const fade = 1 - ramp(t, T.reveal - 0.4, T.reveal + 1.4);
      const show = rise > 0.01 && fade > 0.01;
      hero.pillar.visible = hero.base.visible = hero.icon.visible = show;
      if (!show) continue;
      hero.pillar.scale.set(1 + flare * 1.6, rise, 1 + flare * 1.6);
      (hero.pillar.material as MeshBasicMaterial).opacity = (0.28 + flare * 0.5) * fade * rise;
      (hero.base.material as MeshBasicMaterial).opacity = rise * fade;
      hero.base.scale.setScalar(1 + flare * 1.5);
      const iconScale = 0.72 * outBack((t - born - 0.25) / 0.5) * (1 + flare * 0.5);
      hero.icon.scale.setScalar(Math.max(0.001, iconScale));
      hero.icon.position.y = 0.25 + Math.sin(t * 2 + i) * 0.06;
      (hero.icon.material as SpriteMaterial).opacity = fade;
    }
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
        this.shardVel[o + 1] -= dt * 0.9;
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
    show(this.titles.oblivax, T.oblivax + 0.5, T.oblivax + 4.2, 0.55, -3.1);
    show(this.titles.vex, T.vex + 0.2, T.vex + 3.6, 0.6, -3.1);
    show(this.titles.surge, T.title, T.reveal - 0.2, 0.5, -3.0);
  }

  private updatePalms(t: number, palms: readonly Vector3[], tracked: readonly boolean[]): void {
    const glow = ramp(t, T.hands, T.hands + 1.2) * (1 - ramp(t, T.reveal, T.reveal + 1.2));
    const burst = hit(t, T.title, 3);
    for (let i = 0; i < 2; i += 1) {
      const sprite = this.palms[i];
      const on = glow > 0.01 && tracked[i] === true;
      sprite.visible = on;
      if (!on) continue;
      sprite.position.copy(palms[i]).sub(this.group.position);
      sprite.scale.setScalar(0.2 + glow * 0.18 + burst * 0.5 + Math.sin(t * 9) * 0.03);
      (sprite.material as SpriteMaterial).opacity = glow;
    }
  }

  private cues(t: number): void {
    const sfx = this.sfx!;
    const hooks = this.hooks!;
    this.cue('drone', 0.4, () => sfx.drone(16, 55));
    for (const line of MOVIE_LINES) {
      const at = VOICE_AT[line.id];
      if (t < at || this.fired.has(line.id)) continue;
      // A line still downloading waits a moment; after that the movie goes on without it.
      if (this.quiet || t > at + 1.2) this.fired.add(line.id);
      else if (sfx.voiceLength(line.id) > 0) {
        this.fired.add(line.id);
        sfx.speak(line.id);
      }
    }
    this.cue('riser1', T.dark, () => {
      sfx.riser(3.2);
      hooks.intensity(1);
    });
    this.cue('open', T.oblivax - 0.3, () => {
      sfx.boom(1.1);
      hooks.rumble(1);
      hooks.intensity(2);
    });
    this.cue('eyes', T.eyes, () => sfx.drone(8, 41));
    this.cue('rip', T.rip, () => {
      sfx.riser(1.6);
      hooks.rumble(0.6);
    });
    this.cue('ship', T.ship, () => sfx.passby(7));
    this.cue('vex', T.vex + 0.2, () => {
      sfx.boom(0.8);
      hooks.rumble(0.8);
    });
    this.cue('room', T.room - 0.2, () => {
      sfx.riser(3);
      hooks.intensity(1);
    });
    this.cue('hope', T.heroes - 0.2, () => {
      hooks.intensity(2);
      sfx.boom(0.6);
    });
    for (let i = 0; i < HEROES.length; i += 1) {
      this.cue(`hero${i}`, T.heroes + 0.4 + i * 0.2, () => sfx.metal(520 * Math.pow(1.122, i * 1.3), 0.9, 0.05, 0.6));
    }
    this.cue('hands', T.hands + 0.6, () => sfx.riser(2.3));
    this.cue('title', T.title, () => {
      sfx.stinger();
      hooks.rumble(1);
    });
  }

  private updateCaption(t: number, head: Vector3, headYaw: number, dt: number): void {
    // The caption sits low in front of where the player looks, easing after their head.
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
    for (const line of MOVIE_LINES) {
      const start = VOICE_AT[line.id];
      const length = Math.max(2, this.sfx!.voiceLength(line.id) || 3);
      if (t >= start && t < start + length + 0.4) {
        text = line.text;
        color = SPEAKER_COLOR[line.voice];
        alpha = clamp01((t - start) / 0.25) * (1 - ramp(t, start + length, start + length + 0.4));
      }
    }
    const skipFade = this.skipping >= 0 ? 1 - clamp01(this.skipping / 0.4) : 1;
    this.caption.set(text, color, alpha * skipFade);
    at(this.caption.sprite, -0.3);
    const hintAlpha = this.flat ? 0 : ramp(t, 2.5, 3.5) * (1 - ramp(t, MOVIE_SECONDS - 3, MOVIE_SECONDS - 2)) * 0.8 * skipFade;
    this.hint.set('HOLD A PINCH TO SKIP', '#E9FCFF', hintAlpha, true);
    at(this.hint.sprite, -0.52);
    void head;
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

