import {
  AdditiveBlending,
  Color,
  createSystem,
  CylinderGeometry,
  DoubleSide,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  PlaneGeometry,
  Quaternion,
  RingGeometry,
  TorusGeometry,
  type Sprite,
  Vector3,
  VisibilityState,
  XRPlane,
} from '@iwsdk/core';
import { Bow, MAX_DRAW } from './combat/bow.js';
import { HeroCarousel } from './combat/carousel.js';
import { Claws } from './combat/claws.js';
import { addOutline, Onomatopoeia } from './combat/comic.js';
import { Gauntlet, HAND_JOINTS, HandPose, J } from './combat/gauntlet.js';
import { type HandJoints, isBlastPose, isFist, isOpenPalm, isWebPose } from './combat/gestures.js';
import { type HeroId, HEROES } from './combat/heroes.js';
import { Lightning } from './combat/lightning.js';
import { GameMenus } from './combat/menus.js';
import { ENEMIES, type EnemyKind } from './combat/missions.js';
import { Music } from './combat/music.js';
import { Panel } from './combat/panel-ui.js';
import {
  DIFFICULTY,
  equippedColor,
  maxHealth,
  type Profile,
  recordResult,
  type Stage,
  upgradeLevel,
} from './combat/progression.js';
import { loadProfile, resetProfile, saveProfile } from './combat/save.js';
import { applyTheme, setFlash, type Theme, THEMES } from './combat/themes.js';
import { createCocoon, WebStrand } from './combat/web.js';
import { WristButton } from './combat/wrist.js';
import { Hud } from './combat/hud.js';
import { type Phase, Run } from './combat/run.js';
import { Sfx } from './combat/sfx.js';
import { createGlowSprite, Flashes, Particles } from './combat/vfx.js';

type Handedness = 'left' | 'right';
type Triple = [number, number, number];

const FIRE_COOLDOWN = 0.26;
const ARM_TIME = 0.08;
const BOLT_SPEED = 14;
const BOLT_LIFE = 1.6;
const AIM_ASSIST_COS = 0.985;
const CRESCENT_SPEED = 9;
const CRESCENT_MIN_SWING = 2.4;
const CRESCENT_COOLDOWN = 0.35;
const HAMMER_REACH = 0.2;
const HAMMER_THROW_MIN = 1.3;
const HAMMER_RETURN_SPEED = 13;
const HAMMER_HEAD_RADIUS = 0.14;
const HAMMER_FLIGHT = 2.6;
const RECALL_DELAY = 0.45;
const PINCH_DISTANCE = 0.03;

type HammerState = 'floating' | 'gripped' | 'docked' | 'flying' | 'returning';
type WebState = 'idle' | 'flying' | 'tethered' | 'retracting';

const ARROW_GRAVITY = 1.2;
const NOCK_REACH = 0.15;
const PINCH_RELEASE = 0.045;
const WEB_SPEED = 16;
const WEB_FLIGHT = 0.7;
const WEB_COOLDOWN = 0.45;
const YANK_SPEED = 1.3;
const HOMING_RATE = 3;
const AIM_SMOOTHING = 0.45;
const EMERGE_TIME = 0.9;
const SLOWMO_SECONDS = 0.8;
const SLOWMO_SCALE = 0.25;

const CYAN = new Color('#3DF5FF');
const WHITE = new Color('#FFFFFF');
const ORANGE = new Color('#FF8A1F');
const MAGENTA = new Color('#FF2D6F');
const GOLD = new Color('#FFD23F');
const PINK = new Color('#FF2D9A');
const EMBER = new Color('#FF6A1A');
const VIOLET = new Color('#9D8CFF');

const ENEMY_ASSET: Readonly<Record<EnemyKind, string>> = {
  drone: 'drone',
  armored: 'drone-armored',
  swarmer: 'swarmer',
  titan: 'titan',
};
const ENEMY_POOL: Readonly<Record<EnemyKind, number>> = { drone: 14, armored: 8, swarmer: 22, titan: 6 };
const ENEMY_COLOR: Readonly<Record<EnemyKind, Color>> = {
  drone: MAGENTA,
  armored: ORANGE,
  swarmer: EMBER,
  titan: VIOLET,
};

interface HandState {
  handedness: Handedness;
  tracked: boolean;
  joints: HandJoints;
  armTime: number;
  cooldown: number;
  palm: Vector3;
  normal: Vector3;
  glow: Sprite;
  beam: Mesh;
  beamMaterial: MeshBasicMaterial;
  pose: HandPose;
  gauntlet: Gauntlet;
  visualHidden: boolean;
  claws: Claws;
  web: WebStrand;
  webState: WebState;
  webVelocity: Vector3;
  webTarget: Drone | null;
  webTime: number;
  webCooldown: number;
  wristPrev: Vector3;
  indexTip?: Vector3;
  prevTip: Vector3;
  hasPrevTip: boolean;
  slashCooldown: number;
}

type DroneState = 'off' | 'emerging' | 'approach' | 'charge';

interface Drone {
  object: Object3D;
  ring: Object3D;
  eye: Object3D;
  kind: EnemyKind;
  hp: number;
  state: DroneState;
  t: number;
  speed: number;
  phase: number;
  spawn: Vector3;
  normal: Vector3;
  offset: Vector3;
  portal: Mesh;
  portalMaterial: MeshBasicMaterial;
  /** Elapsed time when the hammer last hit it, so one contact = one hit. */
  hammerHitAt: number;
  /** Seconds left webbed in place. */
  snare: number;
  cocoon: Mesh;
}

interface Bolt {
  object: Group;
  bolt: Object3D;
  crescent: Object3D;
  kind: 'bolt' | 'crescent' | 'arrow';
  arrow: Object3D;
  pierceLeft: number;
  gravity: number;
  radius: number;
  damage: number;
  speed: number;
  active: boolean;
  life: number;
  position: Vector3;
  previous: Vector3;
  velocity: Vector3;
  target: Drone | null;
}

function triple(): Triple {
  return [0, 0, 0];
}

function emptyHand(): HandJoints {
  return {
    wrist: triple(),
    thumbTip: triple(),
    indexMeta: triple(),
    pinkyMeta: triple(),
    knuckles: [triple(), triple(), triple(), triple()],
    tips: [triple(), triple(), triple(), triple()],
  };
}

/** Gesture slots paired with the HAND_JOINTS index each one copies. */
function jointSlots(hand: HandJoints): Array<[Triple, number]> {
  const slots: Array<[Triple, number]> = [
    [hand.wrist as Triple, J.wrist],
    [hand.thumbTip as Triple, J.thumbTip],
    [hand.indexMeta as Triple, J.indexMeta],
    [hand.pinkyMeta as Triple, J.pinkyMeta],
  ];
  for (let i = 0; i < 4; i += 1) {
    slots.push([hand.knuckles[i] as Triple, J.knuckles[i]]);
    slots.push([hand.tips[i] as Triple, J.tips[i]]);
  }
  return slots;
}

/**
 * The whole Day 1 combat loop: palm-blaster input from tracked hands, pooled
 * bolts with aim assist, drones that breach detected walls (or a fallback
 * ring), wave flow from the pure `Run`, effects, sound and the HUD.
 */
export class CombatSystem extends createSystem({
  planes: { required: [XRPlane] },
}) {
  readonly run = new Run();

  private root!: Group;
  private particles!: Particles;
  private flashes!: Flashes;
  private hud!: Hud;
  private wrist!: WristButton;
  hero: HeroId = 'arc';
  private sfx = new Sfx();
  private hands: HandState[] = [];
  private handSlots: Array<Array<[Triple, number]>> = [];
  private playerQuat = new Quaternion();
  private jointQuat = new Quaternion();
  private drones: Drone[] = [];
  private bolts: Bolt[] = [];
  private profile: Profile = loadProfile();
  private panel!: Panel;
  private menus!: GameMenus;
  private music!: Music;
  private paused = false;
  private resultTimer = -1;
  private lastCount = -1;
  private accent = new Color('#3DF5FF');
  private lightningFx!: Lightning;
  private carousel = new HeroCarousel();
  private comic!: Onomatopoeia;
  private comicCooldown = 0;
  private swipeCooldown = 0;
  private swipePrev = [new Vector3(), new Vector3()];
  private swipeValid = [false, false];
  private bow!: Bow;
  private drawing = false;
  private nock = new Vector3();
  private hammer: Object3D | null = null;
  private hammerHead: Object3D | null = null;
  private hammerState: HammerState = 'floating';
  private hammerHand = 1;
  private hammerTime = 0;
  private hammerVelocity = new Vector3();
  private hammerPrev = new Vector3();
  private hammerHeadPos = new Vector3();
  private hammerHeadPrev = new Vector3();
  private hammerBasis = new Matrix4();
  private hammerQuat = new Quaternion();
  private hx = new Vector3();
  private hy = new Vector3();
  private hz = new Vector3();
  private theme: Theme = THEMES['neon-grid'];
  private ambientTimer = 0;
  private lightning = 0;
  private nextStrike = 4;
  private tips: Vector3[] = [];
  private arena: Object3D | null = null;
  private damage!: Mesh;
  private damageMaterial!: MeshBasicMaterial;
  private lastPhase: Phase = 'title';
  private slowmo = 0;
  private elapsed = 0;
  private hudPlaced = false;
  private ready = false;
  private powersLive = false;
  /** Elapsed time at which to re-place the menu once XR head tracking settles. */
  private replaceMenuAt = -1;

  private head = new Vector3();
  private headTriple: Triple = [0, 0, 0];
  private forward = new Vector3();
  private v1 = new Vector3();
  private v2 = new Vector3();
  private v3 = new Vector3();
  private v4 = new Vector3();

  init(): void {
    this.root = new Group();
    this.root.name = 'Combat';
    this.world.createTransformEntity(this.root, { persistent: true });

    this.particles = new Particles();
    this.root.add(this.particles.points);
    this.flashes = new Flashes(this.root);
    this.hud = new Hud();
    this.root.add(this.hud.mesh);
    this.wrist = new WristButton();
    this.root.add(this.wrist.group);
    this.wrist.setHero('ARC', CYAN);
    this.lightningFx = new Lightning(this.root);
    this.bow = new Bow(new Color('#5DFFB0'));
    this.root.add(this.bow.group);
    this.root.add(this.carousel.group);
    this.comic = new Onomatopoeia(this.root);
    this.panel = new Panel();
    this.root.add(this.panel.group);
    this.music = new Music(this.sfx);
    this.sfx.setVolumes(this.profile.settings.sfx, this.profile.settings.music);
    this.menus = new GameMenus(this.profile, {
      play: (hero, stage) => this.startStage(hero, stage),
      resume: () => this.resumeStage(),
      restart: () => this.startStage(this.hero, this.run.stage),
      quit: () => this.quitToMenu(),
      changed: () => this.profileChanged(),
      preview: (worldId) => this.setTheme(worldId),
      denied: () => this.sfx.denied(),
      bought: () => this.sfx.coin(),
      focus: (index) => this.focusHero(index),
      resetProgress: () => {
        this.profile = resetProfile();
        this.menus.setProfile(this.profile);
        this.profileChanged();
      },
    });

    // Unit-length beam along +Z, starting at its origin.
    const beamGeometry = new CylinderGeometry(0.0025, 0.0012, 1, 6, 1, true);
    beamGeometry.rotateX(Math.PI / 2);
    beamGeometry.translate(0, 0, 0.5);
    for (const handedness of ['left', 'right'] as const) {
      const glow = createGlowSprite(CYAN, 0);
      glow.name = `PalmGlow-${handedness}`;
      this.root.add(glow);
      const joints = emptyHand();
      const gauntlet = new Gauntlet(handedness, CYAN);
      this.root.add(gauntlet.group);
      const claws = new Claws(handedness, PINK);
      this.root.add(claws.group);
      const web = new WebStrand(this.root, PINK);
      const beamMaterial = new MeshBasicMaterial({
        color: CYAN,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const beam = new Mesh(beamGeometry, beamMaterial);
      beam.name = `AimBeam-${handedness}`;
      beam.visible = false;
      this.root.add(beam);
      this.hands.push({
        handedness,
        tracked: false,
        joints,
        armTime: 0,
        cooldown: 0,
        palm: new Vector3(),
        normal: new Vector3(),
        glow,
        beam,
        beamMaterial,
        pose: new HandPose(),
        gauntlet,
        visualHidden: false,
        claws,
        web,
        webState: 'idle',
        webVelocity: new Vector3(),
        webTarget: null,
        webTime: 0,
        webCooldown: 0,
        wristPrev: new Vector3(),
        prevTip: new Vector3(),
        hasPrevTip: false,
        slashCooldown: 0,
      });
      this.handSlots.push(jointSlots(joints));
    }

    const boltCore = new CylinderGeometry(0.011, 0.011, 0.24, 6);
    boltCore.rotateX(Math.PI / 2);
    const boltMaterial = new MeshBasicMaterial({ color: '#E8FFFF' });
    // Crescent shockwave: an arc centred on local +Y, facing local +Z.
    const crescentGeometry = new TorusGeometry(0.22, 0.014, 6, 28, Math.PI * 0.7);
    crescentGeometry.rotateZ(Math.PI / 2 - Math.PI * 0.35);
    const crescentCore = new MeshBasicMaterial({ color: '#FFFFFF', toneMapped: false });
    const crescentSheath = new MeshBasicMaterial({
      color: PINK,
      transparent: true,
      opacity: 0.8,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    // Flying arrow: shaft and head along +Z (bolts look along their velocity).
    const arrowShaftGeometry = new CylinderGeometry(0.004, 0.004, 0.55, 6);
    arrowShaftGeometry.rotateX(Math.PI / 2);
    arrowShaftGeometry.translate(0, 0, -0.25);
    const arrowShaftMaterial = new MeshBasicMaterial({ color: '#E8FFF4', toneMapped: false });
    const arrowHeadGeometry = new CylinderGeometry(0, 0.016, 0.06, 4);
    arrowHeadGeometry.rotateX(Math.PI / 2);
    arrowHeadGeometry.translate(0, 0, 0.03);
    const arrowHeadMaterial = new MeshBasicMaterial({ color: '#5DFFB0', toneMapped: false });
    for (let i = 0; i < 40; i += 1) {
      const object = new Group();
      object.name = `Bolt-${i}`;
      const boltVisual = new Group();
      const glow = createGlowSprite(CYAN, 0.9);
      glow.scale.setScalar(0.2);
      boltVisual.add(new Mesh(boltCore, boltMaterial), glow);
      const crescent = new Group();
      const inner = new Mesh(crescentGeometry, crescentCore);
      inner.scale.set(0.97, 0.97, 0.4);
      const outer = new Mesh(crescentGeometry, crescentSheath);
      outer.scale.set(1, 1, 2.5);
      crescent.add(inner, outer);
      const arrow = new Group();
      const arrowShaft = new Mesh(arrowShaftGeometry, arrowShaftMaterial);
      const arrowHead = new Mesh(arrowHeadGeometry, arrowHeadMaterial);
      const arrowGlow = createGlowSprite('#5DFFB0', 0.8);
      arrowGlow.scale.setScalar(0.12);
      arrowGlow.position.z = 0.05;
      arrow.add(arrowShaft, arrowHead, arrowGlow);
      object.add(boltVisual, crescent, arrow);
      object.visible = false;
      this.root.add(object);
      this.bolts.push({
        object,
        bolt: boltVisual,
        crescent,
        arrow,
        pierceLeft: 0,
        gravity: 0,
        kind: 'bolt',
        radius: 0.06,
        damage: 1,
        speed: BOLT_SPEED,
        active: false,
        life: 0,
        position: new Vector3(),
        previous: new Vector3(),
        velocity: new Vector3(),
        target: null,
      });
    }

    this.damageMaterial = new MeshBasicMaterial({
      color: '#FF1744',
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
    });
    this.damage = new Mesh(new PlaneGeometry(2, 2), this.damageMaterial);
    this.damage.name = 'DamageFlash';
    this.damage.position.z = -0.25;
    this.damage.renderOrder = 30;
    this.damage.visible = false;
    this.world.camera.add(this.damage);

    const xr = this.world.renderer.xr;
    const onSessionStart = () => {
      this.sfx.unlock();
      this.hudPlaced = false;
      if (this.panel.visible) this.replaceMenuAt = this.elapsed + 0.6;
      this.music.play(this.run.phase === 'title' ? 'menu' : this.run.stage.world.id);
    };
    xr.addEventListener('sessionstart', onSessionStart);
    const canvas = this.world.renderer.domElement;
    const onPointer = (event: PointerEvent) => this.desktopFire(event);
    canvas.addEventListener('pointerdown', onPointer);
    this.cleanupFuncs.push(
      () => xr.removeEventListener('sessionstart', onSessionStart),
      () => canvas.removeEventListener('pointerdown', onPointer),
    );

    void this.loadModels();
  }

  private async loadModels(): Promise<void> {
    this.arena = await this.world.assets.instantiate('arena');
    this.arena.name = 'Arena';
    this.root.add(this.arena);
    applyTheme(this.arena, this.theme);
    const portalGeometry = new RingGeometry(0.17, 0.26, 48);
    let index = 0;
    for (const kind of Object.keys(ENEMY_POOL) as EnemyKind[]) {
      for (let n = 0; n < ENEMY_POOL[kind]; n += 1) {
        const i = index++;
        const object = await this.world.assets.instantiate(ENEMY_ASSET[kind]);
        object.name = `Enemy-${kind}-${n}`;
        addOutline(object, 0.1, (m) => m.name === 'Body');
        object.visible = false;
        this.root.add(object);
        const portalMaterial = new MeshBasicMaterial({
          color: ENEMY_COLOR[kind],
          transparent: true,
          opacity: 0,
          blending: AdditiveBlending,
          side: DoubleSide,
          depthWrite: false,
        });
        const cocoon = createCocoon();
        this.root.add(cocoon);
        const portal = new Mesh(portalGeometry, portalMaterial);
        portal.name = `Portal-${i}`;
        portal.visible = false;
        this.root.add(portal);
        this.drones.push({
          object,
          ring: object.getObjectByName('Ring')!,
          eye: object.getObjectByName('Eye')!,
          kind,
          hp: 0,
          state: 'off',
          t: 0,
          speed: 1,
          phase: 0,
          spawn: new Vector3(),
          normal: new Vector3(),
          offset: new Vector3(),
          portal,
          portalMaterial,
          hammerHitAt: -10,
          snare: 0,
          cocoon,
        });
      }
    }
    this.hammer = await this.world.assets.instantiate('hammer');
    this.hammer.name = 'StormHammer';
    this.hammer.visible = false;
    this.root.add(this.hammer);
    this.hammerHead = this.hammer.getObjectByName('Head') ?? this.hammer;
    addOutline(this.hammer, 0.08, (m) => m.parent?.name === 'Head' || m.name === 'Handle');
    for (const hero of HEROES) {
      const figure = await this.world.assets.instantiate(`hero-${hero.id}`);
      const pedestal = await this.world.assets.instantiate('pedestal');
      addOutline(figure, 0.07, (m) => (m.material as { name?: string }).name !== 'accent');
      this.carousel.add(hero.id, figure, pedestal);
    }
    this.showMenu('main');
    this.ready = true;
  }

  update(delta: number, time: number): void {
    if (!this.ready) return;
    if (this.arena) this.arena.visible = !this.isPassthrough();
    if (this.world.visibilityState.peek() === VisibilityState.VisibleBlurred) return;
    const realDt = Math.min(delta, 0.05);
    this.elapsed = time;
    if (this.slowmo > 0) this.slowmo -= realDt;
    const dt = this.slowmo > 0 ? realDt * SLOWMO_SCALE : realDt;

    this.world.camera.getWorldPosition(this.head);
    this.headTriple[0] = this.head.x;
    this.headTriple[1] = this.head.y;
    this.headTriple[2] = this.head.z;
    this.world.camera.getWorldDirection(this.forward);

    this.readHands();
    for (const hand of this.hands) hand.gauntlet.update(hand.pose, Math.min(1, hand.armTime / ARM_TIME), time);
    if (this.wrist.update(this.hands[0].pose, this.hands[1].pose, realDt)) this.wristPressed();

    this.tips.length = 0;
    for (const hand of this.hands) {
      if (!hand.pose.tracked) continue;
      hand.indexTip ??= new Vector3();
      const tip = hand.indexTip;
      this.tips.push(hand.pose.position(9, tip));
    }
    if (this.replaceMenuAt > 0 && time > this.replaceMenuAt) {
      this.replaceMenuAt = -1;
      if (this.panel.visible) this.panel.place(this.head, this.forward);
    }
    const event = this.panel.update(realDt, this.tips);
    if (event) this.onPanelEvent(event.point, () => this.menus.handle(event));

    // Powers work during a stage (including intros, for warm-up) but not in
    // menus or while paused.
    const live = !this.paused && !this.panel.visible && this.run.phase !== 'title';
    this.powersLive = live;
    this.updateHands(realDt);
    this.updateClaws(realDt);
    this.updateHammer(realDt, time);
    this.updateBow();
    this.updateWebs(realDt, time);

    if (!this.paused) {
      const order = this.run.update(dt);
      if (order) this.spawnDrone(order.kind, order.speed);
      this.updateDrones(dt, time);
      this.updateBolts(dt);
      this.onPhaseChange();
      this.updateCountdown();
      this.updateResults(realDt);
    }
    this.updateAmbient(realDt, time);

    if (!this.paused) {
      this.particles.update(dt);
      this.flashes.update(dt);
      this.lightningFx.update(dt);
      this.comic.update(realDt);
    }
    this.comicCooldown -= realDt;
    this.carousel.update(realDt, time, this.head);
    this.updateSwipe(realDt);
    if (this.damageMaterial.opacity > 0) {
      this.damageMaterial.opacity = Math.max(0, this.damageMaterial.opacity - realDt * 1.2);
      this.damage.visible = this.damageMaterial.opacity > 0;
    }
    this.updateHud(realDt);
  }

  /** True in an MR session, where the real room replaces the arena. */
  private isPassthrough(): boolean {
    const session = this.world.renderer.xr.getSession();
    return session != null && session.environmentBlendMode !== 'opaque';
  }

  // ---------------------------------------------------------------- hands

  private readHands(): void {
    const xr = this.world.renderer.xr;
    for (const hand of this.hands) {
      hand.tracked = false;
      hand.pose.tracked = false;
    }
    const frame = xr.getFrame();
    const space = xr.getReferenceSpace();
    const session = xr.getSession();
    if (frame == null || space == null || session == null || frame.getJointPose == null) return;
    const origin = this.world.player.matrixWorld;
    this.world.player.getWorldQuaternion(this.playerQuat);
    for (const source of session.inputSources) {
      if (source.hand == null) continue;
      const index = source.handedness === 'left' ? 0 : source.handedness === 'right' ? 1 : -1;
      if (index < 0) continue;
      const hand = this.hands[index];
      const pose = hand.pose;
      let ok = true;
      for (let j = 0; j < HAND_JOINTS.length; j += 1) {
        const jointSpace = source.hand.get(HAND_JOINTS[j]);
        const jointPose = jointSpace ? frame.getJointPose(jointSpace, space) : undefined;
        if (jointPose == null) {
          ok = false;
          break;
        }
        const p = jointPose.transform.position;
        const o = jointPose.transform.orientation;
        this.v1.set(p.x, p.y, p.z).applyMatrix4(origin);
        this.v1.toArray(pose.positions, j * 3);
        this.jointQuat.set(o.x, o.y, o.z, o.w).premultiply(this.playerQuat);
        this.jointQuat.toArray(pose.quaternions, j * 4);
        pose.radii[j] = jointPose.radius ?? 0.01;
      }
      if (!ok) continue;
      for (const [slot, joint] of this.handSlots[index]) {
        slot[0] = pose.positions[joint * 3];
        slot[1] = pose.positions[joint * 3 + 1];
        slot[2] = pose.positions[joint * 3 + 2];
      }
      hand.tracked = true;
      pose.tracked = true;
      if (!hand.visualHidden) {
        // The gauntlet replaces IWSDK's default hand model.
        this.world.input.xr.visualAdapters.hand[hand.handedness].toggleVisual(false);
        hand.visualHidden = true;
      }
    }
    // Re-hide after any loss: a reconnecting hand may restore the default model.
    for (const hand of this.hands) if (!hand.tracked) hand.visualHidden = false;
  }

  private updateHands(dt: number): void {
    for (const hand of this.hands) {
      hand.cooldown -= dt;
      const posed = this.powersLive && this.hero === 'arc' && hand.tracked && isBlastPose(hand.joints, hand.handedness, this.headTriple);
      if (!posed) {
        hand.armTime = 0;
        hand.glow.material.opacity = Math.max(0, hand.glow.material.opacity - dt * 6);
        hand.glow.visible = hand.glow.material.opacity > 0;
        hand.beamMaterial.opacity = Math.max(0, hand.beamMaterial.opacity - dt * 6);
        hand.beam.visible = hand.beamMaterial.opacity > 0;
        continue;
      }
      // Aim from the gauntlet's palm emitter so shots leave exactly where the
      // ring glows; lightly smooth the direction to take out tracking jitter.
      const gauntlet = hand.gauntlet;
      if (hand.armTime === 0) hand.normal.copy(gauntlet.palmNormal);
      else hand.normal.lerp(gauntlet.palmNormal, AIM_SMOOTHING).normalize();
      hand.palm.copy(gauntlet.palmPoint).addScaledVector(hand.normal, 0.015);
      hand.armTime += dt;
      hand.beam.visible = true;
      hand.beam.position.copy(hand.palm);
      this.v1.copy(hand.palm).add(hand.normal);
      hand.beam.lookAt(this.v1);
      hand.beam.scale.set(1, 1, 3);
      hand.beamMaterial.opacity = 0.12 + 0.28 * Math.min(1, hand.armTime / ARM_TIME);
      hand.glow.visible = true;
      hand.glow.position.copy(hand.palm);
      const ready = Math.min(1, hand.armTime / ARM_TIME);
      hand.glow.material.opacity = 0.35 + 0.5 * ready;
      hand.glow.scale.setScalar(0.06 + 0.05 * ready + Math.max(0, hand.cooldown) * 0.3);
      if (hand.armTime >= ARM_TIME && hand.cooldown <= 0) {
        hand.cooldown = FIRE_COOLDOWN * (1 - 0.1 * this.level('arc-rate'));
        this.fire(hand.palm, hand.normal);
        // Split beam: extra bolts fanned a few degrees either side.
        const extra = Math.ceil(this.level('arc-split') / 2);
        for (let k = 1; k <= extra; k += 1) {
          const side = k % 2 === 1 ? 1 : -1;
          this.v3.set(0, 1, 0).cross(hand.normal).normalize();
          this.v4.copy(hand.normal).addScaledVector(this.v3, side * 0.1 * Math.ceil(k / 2)).normalize();
          this.fire(hand.palm, this.v4, true);
        }
      }
    }
  }

  private desktopFire(event: PointerEvent): void {
    this.sfx.unlock();
    if (!this.ready || this.world.visibilityState.peek() !== VisibilityState.NonImmersive) return;
    const rect = this.world.renderer.domElement.getBoundingClientRect();
    this.v3
      .set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1, 0.5)
      .unproject(this.world.camera);
    this.world.camera.getWorldPosition(this.v4);
    this.v3.sub(this.v4).normalize();
    const panelEvent = this.panel.click(this.v4, this.v3);
    if (panelEvent) {
      this.onPanelEvent(panelEvent.point, () => this.menus.handle(panelEvent));
      return;
    }
    if (this.panel.visible || this.paused || this.run.phase === 'title') return;
    this.v4.addScaledVector(this.v3, 0.3);
    this.fire(this.v4, this.v3);
  }


  // ---------------------------------------------------------------- heroes

  /** Upgrade level for `id` from the saved profile. */
  private level(id: string): number {
    return upgradeLevel(this.profile, id);
  }

  /** Starts `stage` with `hero`, applying difficulty, upgrades and skin. */
  private startStage(hero: HeroId, stage: Stage): void {
    this.hero = hero;
    this.menus.hero = hero;
    this.applySkin();
    const def = HEROES.find((h) => h.id === hero)!;
    this.wrist.setHero(`${def.name} | PAUSE`, this.accent);
    this.panel.hide();
    this.paused = false;
    this.resultTimer = -1;
    this.lastCount = -1;
    for (const drone of this.drones) {
      if (drone.state !== 'off') this.retireDrone(drone);
    }
    for (const bolt of this.bolts) if (bolt.active) this.retireBolt(bolt);
    this.setTheme(stage.world.id);
    this.music.play(stage.world.id);
    this.run.start(stage, {
      maxHealth: maxHealth(this.profile),
      speedScale: DIFFICULTY[this.profile.settings.difficulty].speed,
    });
    this.lastPhase = 'intro';
    this.sfx.wave();
    if (hero === 'tempest') this.summonHammer();
  }

  private applySkin(): void {
    this.accent.set(equippedColor(this.profile, this.hero));
    this.bow.setColor(this.accent);
    for (const hand of this.hands) {
      hand.gauntlet.setAccent(this.accent);
      hand.claws.setColor(this.accent);
      hand.web.setColor(this.accent);
      hand.beamMaterial.color.copy(this.accent);
      hand.glow.material.color.copy(this.accent);
    }
  }

  /** Left wrist: pause during a stage, resume when paused, else go back. */
  private wristPressed(): void {
    this.flashes.spawn(this.wrist.center, WHITE, 0.05, 0.3, 0.25);
    if (this.paused) {
      this.resumeStage();
      return;
    }
    if (!this.panel.visible && this.run.phase !== 'title') {
      this.paused = true;
      this.sfx.click();
      this.showMenu('pause');
      return;
    }
    if (this.panel.visible && this.menus.screen !== 'main' && this.menus.screen !== 'results') {
      this.sfx.click();
      this.showMenu('main');
    }
  }

  private resumeStage(): void {
    this.paused = false;
    this.panel.hide();
    this.sfx.click();
  }

  private quitToMenu(): void {
    this.paused = false;
    this.resultTimer = -1;
    this.run.toTitle();
    for (const drone of this.drones) {
      if (drone.state !== 'off') this.retireDrone(drone);
    }
    this.showMenu('main');
  }

  private showMenu(screen: Parameters<GameMenus['open']>[0]): void {
    this.world.camera.getWorldPosition(this.head);
    this.world.camera.getWorldDirection(this.forward);
    this.menus.open(screen);
    this.panel.setContent(this.menus.content());
    this.placePanel();
    this.panel.show();
    this.syncCarousel();
    if (screen !== 'pause') this.music.play('menu');
  }

  /** The hero screen sits low and close so the 3D heroes stay in view. */
  private placePanel(): void {
    if (this.menus.screen === 'heroes') this.panel.place(this.head, this.forward, 0.42, 0.58);
    else this.panel.place(this.head, this.forward);
  }

  /** Shows the hero carousel only on the hero screen, in sync with its focus. */
  private syncCarousel(): void {
    const on = this.panel.visible && this.menus.screen === 'heroes';
    if (on && !this.carousel.visible) {
      this.carousel.setFocus(this.menus.heroFocus);
      this.carousel.show(this.head, this.forward);
    } else if (!on && this.carousel.visible) this.carousel.hide();
    if (!on) return;
    this.carousel.setFocus(this.menus.heroFocus);
    for (const hero of HEROES) {
      this.carousel.setInfo(hero.id, hero.name, this.menus.heroStatus(hero.id), equippedColor(this.profile, hero.id));
    }
  }

  /** Spotlight a hero in the carousel with a little show of their power. */
  private focusHero(index: number): void {
    this.carousel.setFocus(index);
    const hero = HEROES[index];
    const color = new Color(equippedColor(this.profile, hero.id));
    this.carousel.focusPoint(this.v1);
    this.flashes.spawn(this.v1, color, 0.1, 0.8, 0.4);
    this.particles.burst(this.v1, color, 40, 1.5, 0.6, this.v2);
    this.comic.random(hero.id, this.v1.setY(this.v1.y + 0.5), color, 0.45);
    this.sfx.swap();
  }

  /** Sideways hand swipes spin the carousel. */
  private updateSwipe(dt: number): void {
    this.swipeCooldown -= dt;
    if (!this.carousel.visible || dt <= 0) return;
    this.v3.set(-this.forward.z, 0, this.forward.x).normalize();
    for (let i = 0; i < this.hands.length; i += 1) {
      const hand = this.hands[i];
      if (!hand.pose.tracked || hand.indexTip == null) {
        this.swipeValid[i] = false;
        continue;
      }
      const prev = this.swipePrev[i];
      const speed = this.v4.subVectors(hand.indexTip, prev).dot(this.v3) / dt;
      const valid = this.swipeValid[i];
      prev.copy(hand.indexTip);
      this.swipeValid[i] = true;
      if (!valid || this.swipeCooldown > 0 || Math.abs(speed) < 1.0) continue;
      if (hand.indexTip.distanceTo(this.head) > 0.8) continue;
      if (this.menus.moveFocus(speed < 0 ? 1 : -1)) {
        this.swipeCooldown = 0.45;
        this.focusHero(this.menus.heroFocus);
        this.panel.setContent(this.menus.content());
      }
    }
  }

  /** Touch feedback for a panel press, then the menu action and a redraw. */
  private onPanelEvent(point: Vector3, handle: () => void): void {
    this.flashes.spawn(point, this.accent, 0.02, 0.14, 0.2);
    this.particles.burst(point, this.accent, 10, 0.4, 0.2, this.v2);
    this.sfx.click();
    const before = this.menus.screen;
    handle();
    if (!this.panel.visible) {
      this.syncCarousel();
      return;
    }
    if (this.menus.screen !== before) this.placePanel();
    this.panel.setContent(this.menus.content());
    this.syncCarousel();
  }

  private profileChanged(): void {
    saveProfile(this.profile);
    this.sfx.setVolumes(this.profile.settings.sfx, this.profile.settings.music);
    this.applySkin();
  }

  /** Big 3-2-1 beeps during the first intro, then FIGHT. */
  private updateCountdown(): void {
    const run = this.run;
    let count = -1;
    if (run.phase === 'intro' && run.wave === 0 && run.elapsedInPhase >= 1) {
      count = Math.max(1, 3 - Math.floor(run.elapsedInPhase - 1));
    } else if (run.phase === 'fighting' && run.wave === 0 && run.elapsedInPhase < 0.1) {
      count = 0;
    }
    if (count === this.lastCount || count < 0) return;
    this.lastCount = count;
    this.sfx.beep(count === 0);
  }

  /** Shows the results panel a moment after a stage ends. */
  private updateResults(dt: number): void {
    if (this.resultTimer < 0) return;
    this.resultTimer += dt;
    if (this.resultTimer < 2.2) return;
    this.resultTimer = -1;
    const run = this.run;
    const won = run.phase === 'victory';
    const reward = recordResult(this.profile, run.stage, {
      won,
      health: run.health,
      maxHealth: run.maxHealth,
      killCoins: run.coins,
    });
    saveProfile(this.profile);
    if (reward.coins > 0) this.sfx.coin();
    this.menus.showResults({ won, stage: run.stage, reward, score: run.score, kills: run.kills, bestCombo: run.bestCombo });
    this.panel.setContent(this.menus.content());
    this.world.camera.getWorldPosition(this.head);
    this.world.camera.getWorldDirection(this.forward);
    this.panel.place(this.head, this.forward);
    this.panel.show();
    this.music.play('menu');
  }

  private setTheme(id: string): void {
    this.theme = THEMES[id] ?? THEMES['neon-grid'];
    if (this.arena) applyTheme(this.arena, this.theme);
    this.lightning = 0;
    this.nextStrike = 3;
  }

  /** Theme ambience in VR: data motes, rising embers or lightning. */
  private updateAmbient(dt: number, time: number): void {
    if (this.arena == null || !this.arena.visible) return;
    const ambient = this.theme.ambient;
    this.ambientTimer += dt;
    const rate = ambient === 'embers' ? 0.015 : ambient === 'data' ? 0.08 : 0.05;
    while (this.ambientTimer > rate) {
      this.ambientTimer -= rate;
      const a = Math.random() * Math.PI * 2;
      const r = 1.2 + Math.random() * 6;
      this.v1.set(this.head.x + Math.cos(a) * r, ambient === 'embers' ? Math.random() * 0.4 : Math.random() * 3, this.head.z + Math.sin(a) * r);
      if (ambient === 'embers') {
        this.v2.set((Math.random() - 0.5) * 0.3, 0.6 + Math.random() * 0.9, (Math.random() - 0.5) * 0.3);
        this.particles.emit(this.v1, this.v2, Math.random() < 0.3 ? GOLD : EMBER, 3 + Math.random() * 2, 0.15, -0.1);
      } else if (ambient === 'data') {
        this.v2.set(0, 0.15 + Math.random() * 0.2, 0);
        this.particles.emit(this.v1, this.v2, Math.random() < 0.5 ? CYAN : PINK, 4, 0, 0);
      } else {
        // Wind-blown storm sparks.
        this.v2.set(1.5 + Math.random(), -0.4, (Math.random() - 0.5) * 0.5);
        this.particles.emit(this.v1, this.v2, VIOLET, 2, 0, 0);
      }
    }
    if (ambient === 'storm') {
      this.nextStrike -= dt;
      if (this.nextStrike <= 0) {
        this.nextStrike = 4 + Math.random() * 6;
        this.lightning = 1;
        this.sfx.thunder();
      }
    }
    if (this.lightning > 0) {
      this.lightning = Math.max(0, this.lightning - dt * 1.8);
      const flicker = this.lightning * (0.55 + 0.45 * Math.sin(time * 60));
      setFlash(this.arena, flicker);
    }
  }

  // ---------------------------------------------------------------- ORION

  /** Midpoint of thumb and index tips into `out`; returns their distance. */
  private pinchPoint(index: number, out: Vector3): number {
    const pose = this.hands[index].pose;
    pose.position(4, this.v1);
    pose.position(9, out);
    const distance = this.v1.distanceTo(out);
    out.add(this.v1).multiplyScalar(0.5);
    return distance;
  }

  /** Bow in one hand, draw the string with a pinch of the other. */
  private updateBow(): void {
    const active = this.powersLive && this.hero === 'orion';
    const bowIndex = this.profile.settings.leftHanded ? 1 : 0;
    const drawIndex = 1 - bowIndex;
    const bowHand = this.hands[bowIndex];
    if (!active || !bowHand.tracked) {
      this.bow.group.visible = false;
      this.drawing = false;
      return;
    }
    // Grip in the finger tube, as with the hammer.
    const pose = bowHand.pose;
    pose.position(7, this.v1);
    pose.position(22, this.v2);
    this.v3.addVectors(this.v1, this.v2);
    pose.position(12, this.v1);
    pose.position(17, this.v2);
    this.v3.add(this.v1).add(this.v2).multiplyScalar(0.25).lerp(bowHand.gauntlet.palmPoint, 0.35);

    const drawHand = this.hands[drawIndex];
    if (drawHand.tracked) {
      const pinch = this.pinchPoint(drawIndex, this.nock);
      if (!this.drawing && pinch < PINCH_DISTANCE && this.nock.distanceTo(this.bow.restNock) < NOCK_REACH) {
        this.drawing = true;
        this.sfx.creak();
      }
      if (this.drawing) {
        const draw = this.bow.update(pose, this.v3, this.nock);
        if (pinch > PINCH_RELEASE) {
          this.drawing = false;
          if (draw > 0.1) this.loose(draw);
        }
        return;
      }
    } else this.drawing = false;
    this.bow.update(pose, this.v3, null);
  }

  private loose(draw: number): void {
    const full = MAX_DRAW * (1 - 0.08 * this.level('orion-draw'));
    const power = Math.min(1, draw / full);
    const fullDraw = power >= 0.95;
    const speed = 10 + 18 * power;
    const extra = fullDraw ? this.level('orion-volley') : 0;
    for (let k = 0; k <= extra; k += 1) {
      const bolt = this.bolts.find((b) => !b.active);
      if (bolt == null) break;
      this.v4.copy(this.bow.aim);
      if (k > 0) {
        this.v1.set(0, 1, 0).cross(this.v4).normalize();
        this.v4.addScaledVector(this.v1, (k % 2 === 1 ? 1 : -1) * 0.07 * Math.ceil(k / 2)).normalize();
      }
      bolt.kind = 'arrow';
      bolt.radius = 0.05;
      bolt.damage = fullDraw ? 2 : 1;
      bolt.speed = speed;
      bolt.pierceLeft = this.level('orion-pierce') + (fullDraw ? 1 : 0);
      bolt.gravity = ARROW_GRAVITY * (1 - power * 0.6);
      bolt.target = null;
      if (this.profile.settings.aimAssist) {
        let best = AIM_ASSIST_COS;
        for (const drone of this.drones) {
          if (drone.state === 'off') continue;
          const cos = this.v2.subVectors(drone.object.position, this.bow.riser).normalize().dot(this.v4);
          if (cos > best) {
            best = cos;
            bolt.target = drone;
          }
        }
      }
      bolt.bolt.visible = false;
      bolt.crescent.visible = false;
      bolt.arrow.visible = true;
      bolt.active = true;
      bolt.life = BOLT_LIFE * 1.5;
      bolt.position.copy(this.bow.riser).addScaledVector(this.v4, 0.1);
      bolt.previous.copy(bolt.position);
      bolt.velocity.copy(this.v4).multiplyScalar(speed);
      bolt.object.up.set(0, 1, 0);
      bolt.object.position.copy(bolt.position);
      bolt.object.visible = true;
    }
    this.flashes.spawn(this.bow.riser, this.accent, 0.05, fullDraw ? 0.5 : 0.25, 0.2);
    this.sfx.twang(power);
  }

  // ---------------------------------------------------------------- WEAVER

  /** Web origin (just past the wrist) and aim (wrist to knuckles). */
  private webAim(index: number, origin: Vector3, direction: Vector3): void {
    const pose = this.hands[index].pose;
    pose.position(J.wrist, origin);
    pose.position(J.middleProx, direction);
    direction.sub(origin).normalize();
    origin.addScaledVector(direction, 0.04);
  }

  private updateWebs(dt: number, time: number): void {
    const active = this.powersLive && this.hero === 'weaver';
    for (let index = 0; index < this.hands.length; index += 1) {
      const hand = this.hands[index];
      hand.webCooldown -= dt;
      if (!active || !hand.tracked) {
        hand.web.hide();
        hand.webState = 'idle';
        hand.webTarget = null;
        continue;
      }
      this.webAim(index, this.v3, this.v4);
      // Wrist velocity, for the yank.
      hand.pose.position(J.wrist, this.v1);
      if (dt > 0) this.v2.subVectors(this.v1, hand.wristPrev).divideScalar(dt);
      else this.v2.set(0, 0, 0);
      hand.wristPrev.copy(this.v1);
      hand.webTime += dt;

      switch (hand.webState) {
        case 'idle':
          hand.web.hide();
          if (hand.webCooldown <= 0 && isWebPose(hand.joints)) this.shootWeb(index);
          break;
        case 'flying': {
          this.v1.copy(hand.web.head);
          hand.web.head.addScaledVector(hand.webVelocity, dt);
          let hit: Drone | null = null;
          for (const drone of this.drones) {
            if (drone.state === 'off' || drone.state === 'emerging') continue;
            if (this.segmentHits(this.v1, hand.web.head, drone.object.position, ENEMIES[drone.kind].radius + 0.06)) {
              hit = drone;
              break;
            }
          }
          if (hit) {
            hit.snare = 2.5 + 0.8 * this.level('weaver-snare');
            hand.webTarget = hit;
            hand.webState = 'tethered';
            hand.webTime = 0;
            this.particles.burst(hit.object.position, WHITE, 20, 1.5, 0.3, this.v1);
            this.sfx.splat();
            this.damageDrone(hit, 1);
          } else if (hand.webTime > WEB_FLIGHT) {
            hand.webState = 'retracting';
          }
          hand.web.draw(this.v3, time, 1);
          break;
        }
        case 'tethered': {
          const target = hand.webTarget;
          if (target == null || target.state === 'off' || target.snare <= 0) {
            hand.webState = 'retracting';
            hand.webTarget = null;
            break;
          }
          hand.web.head.copy(target.object.position);
          hand.web.draw(this.v3, time, 0.3);
          // Yank: fist and pull back toward the body.
          this.v1.subVectors(this.head, target.object.position).normalize();
          if (isFist(hand.joints) && this.v2.dot(this.v1) > YANK_SPEED) this.yank(hand, target);
          break;
        }
        case 'retracting': {
          this.v1.subVectors(this.v3, hand.web.head);
          const step = 25 * dt;
          if (this.v1.length() <= step) {
            hand.webState = 'idle';
            hand.web.hide();
            break;
          }
          hand.web.head.addScaledVector(this.v1.normalize(), step);
          hand.web.draw(this.v3, time, 0.6);
          break;
        }
      }
    }
  }

  private shootWeb(index: number): void {
    const hand = this.hands[index];
    this.webAim(index, this.v3, this.v4);
    // Gentle aim assist toward the most centred enemy.
    if (this.profile.settings.aimAssist) {
      let best = 0.97;
      for (const drone of this.drones) {
        if (drone.state === 'off' || drone.state === 'emerging') continue;
        const cos = this.v1.subVectors(drone.object.position, this.v3).normalize().dot(this.v4);
        if (cos > best) {
          best = cos;
          this.v2.copy(this.v1);
        }
      }
      if (best > 0.97) this.v4.copy(this.v2);
    }
    hand.web.head.copy(this.v3);
    hand.webVelocity.copy(this.v4).multiplyScalar(WEB_SPEED * (1 + 0.15 * this.level('weaver-range')));
    hand.webState = 'flying';
    hand.webTime = 0;
    hand.webCooldown = WEB_COOLDOWN;
    this.sfx.thwip();
  }

  /** Rips a webbed enemy apart; the blast hurts enemies around it. */
  private yank(hand: HandState, target: Drone): void {
    const damage = 3 + this.level('weaver-yank');
    this.v1.copy(target.object.position);
    this.sfx.yank();
    this.flashes.spawn(this.v1, this.accent, 0.1, 0.9, 0.3);
    this.particles.burst(this.v1, WHITE, 40, 3, 0.5, this.v2);
    target.snare = 0;
    this.damageDrone(target, damage);
    for (const drone of this.drones) {
      if (drone === target || drone.state === 'off') continue;
      if (drone.object.position.distanceTo(this.v1) < 0.9) this.damageDrone(drone, 2);
    }
    hand.webTarget = null;
    hand.webState = 'retracting';
  }

  // ---------------------------------------------------------------- TEMPEST

  /** Puts the hammer hovering in front of the right shoulder. */
  private summonHammer(): void {
    if (this.hammer == null) return;
    this.v1.set(this.forward.x, 0, this.forward.z);
    if (this.v1.lengthSq() < 1e-4) this.v1.set(0, 0, -1);
    this.v1.normalize();
    this.hammer.position.copy(this.head).addScaledVector(this.v1, 0.4);
    this.hammer.position.x += -this.v1.z * 0.2;
    this.hammer.position.z += this.v1.x * 0.2;
    this.hammer.position.y -= 0.3;
    this.hammer.quaternion.identity();
    this.hammerState = 'floating';
    this.hammerVelocity.set(0, 0, 0);
    this.flashes.spawn(this.hammer.position, VIOLET, 0.1, 0.6, 0.4);
    this.lightningFx.strike(this.head, this.hammer.position, VIOLET);
  }

  private isGripping(index: number): boolean {
    const hand = this.hands[index];
    if (!hand.tracked) return false;
    if (isFist(hand.joints)) return true;
    hand.pose.position(4, this.v1);
    hand.pose.position(9, this.v2);
    return this.v1.distanceTo(this.v2) < PINCH_DISTANCE;
  }

  /** Open palm pointed at the hammer. */
  private isRecalling(index: number): boolean {
    const hand = this.hands[index];
    if (!hand.tracked || this.hammer == null || !isOpenPalm(hand.joints)) return false;
    this.v1.subVectors(this.hammer.position, hand.gauntlet.palmPoint);
    if (this.v1.length() < 0.35) return false;
    return this.v1.normalize().dot(hand.gauntlet.palmNormal) > 0.6;
  }

  /** Sets the hammer in the fist: handle toward the thumb, head pointing forward. */
  /**
   * Seats the hammer in the fist. In a real grip the handle runs through the
   * tube formed by the curled fingers, so its axis goes from the pinky's to
   * the index finger's middle joint (thumb side up) and its centre sits
   * between that tube and the palm. The head points along wrist-to-knuckles.
   */
  private poseInHand(index: number, out: Vector3): void {
    const pose = this.hands[index].pose;
    pose.position(7, this.v1);
    pose.position(22, this.v2);
    this.hy.subVectors(this.v1, this.v2).normalize();
    out.addVectors(this.v1, this.v2);
    pose.position(12, this.v1);
    pose.position(17, this.v2);
    out.add(this.v1).add(this.v2).multiplyScalar(0.25);
    out.lerp(this.hands[index].gauntlet.palmPoint, 0.35);
    pose.position(J.wrist, this.v1);
    pose.position(J.middleProx, this.v2);
    this.hx.subVectors(this.v2, this.v1);
    this.hx.addScaledVector(this.hy, -this.hx.dot(this.hy)).normalize();
    this.hz.crossVectors(this.hx, this.hy);
    this.hammerBasis.makeBasis(this.hx, this.hy, this.hz);
    this.hammer!.quaternion.setFromRotationMatrix(this.hammerBasis);
  }

  private updateHammer(dt: number, time: number): void {
    const hammer = this.hammer;
    if (hammer == null || this.hammerHead == null) return;
    hammer.visible = this.hero === 'tempest' && this.powersLive;
    if (!hammer.visible || dt <= 0) return;
    this.hammerTime += dt;
    this.hammerPrev.copy(hammer.position);
    this.hammerHead.getWorldPosition(this.hammerHeadPrev);

    switch (this.hammerState) {
      case 'floating': {
        hammer.position.y += Math.sin(time * 2) * 0.03 * dt;
        hammer.rotation.y += dt * 0.6;
        for (let i = 0; i < this.hands.length; i += 1) {
          const hand = this.hands[i];
          if (!hand.tracked) continue;
          if (this.isGripping(i) && hand.gauntlet.palmPoint.distanceTo(hammer.position) < HAMMER_REACH) {
            this.grabHammer(i);
            break;
          }
          if (this.isRecalling(i)) {
            this.recallHammer(i);
            break;
          }
        }
        break;
      }
      case 'gripped': {
        const i = this.hammerHand;
        if (!this.hands[i].tracked) {
          this.hammerState = 'floating';
          break;
        }
        this.poseInHand(i, this.v3);
        hammer.position.copy(this.v3);
        this.v4.subVectors(hammer.position, this.hammerPrev).divideScalar(dt);
        this.hammerVelocity.lerp(this.v4, 0.5);
        if (!this.isGripping(i)) {
          const speed = this.hammerVelocity.length();
          if (speed > HAMMER_THROW_MIN) this.throwHammer(speed);
          else this.hammerState = 'docked';
        }
        break;
      }
      case 'docked': {
        const i = this.hammerHand;
        const hand = this.hands[i];
        if (!hand.tracked) {
          this.hammerState = 'floating';
          break;
        }
        this.v3.copy(hand.gauntlet.palmPoint).addScaledVector(hand.gauntlet.palmNormal, 0.07);
        hammer.position.lerp(this.v3, Math.min(1, dt * 18));
        hammer.rotation.y += dt * 2;
        if (this.isGripping(i)) this.grabHammer(i);
        else if (!isOpenPalm(hand.joints) && this.hammerTime > 0.6) this.hammerState = 'floating';
        break;
      }
      case 'flying': {
        this.hammerVelocity.y -= 2.5 * dt;
        hammer.position.addScaledVector(this.hammerVelocity, dt);
        hammer.rotateX(-dt * 18);
        if (this.hammerTime > HAMMER_FLIGHT || hammer.position.distanceTo(this.head) > 14) {
          this.hammerState = 'floating';
          this.hammerVelocity.set(0, 0, 0);
          break;
        }
        if (this.hammerTime > RECALL_DELAY) {
          for (let i = 0; i < this.hands.length; i += 1) {
            if (this.isRecalling(i)) {
              this.recallHammer(i);
              break;
            }
          }
        }
        break;
      }
      case 'returning': {
        const hand = this.hands[this.hammerHand];
        if (!hand.tracked) {
          this.hammerState = 'floating';
          break;
        }
        this.v3.copy(hand.gauntlet.palmPoint).addScaledVector(hand.gauntlet.palmNormal, 0.07);
        this.v4.subVectors(this.v3, hammer.position);
        const distance = this.v4.length();
        const returnSpeed = HAMMER_RETURN_SPEED * (1 + 0.15 * this.level('tempest-recall'));
        const step = returnSpeed * dt;
        if (distance <= Math.max(0.1, step)) {
          hammer.position.copy(this.v3);
          this.hammerState = 'docked';
          this.hammerTime = 0;
          this.flashes.spawn(this.v3, VIOLET, 0.1, 0.5, 0.25);
          this.particles.burst(this.v3, VIOLET, 30, 1.5, 0.3, this.v2);
          this.sfx.catchHammer();
          break;
        }
        this.hammerVelocity.copy(this.v4).setLength(returnSpeed);
        hammer.position.addScaledVector(this.v4.normalize(), step);
        hammer.rotateX(-dt * 22);
        break;
      }
    }

    // Trail and hits for a moving hammer.
    this.hammerHead.getWorldPosition(this.hammerHeadPos);
    const moving = this.hammerState === 'flying' || this.hammerState === 'returning';
    const swinging = this.hammerState === 'gripped' && this.hammerVelocity.length() > 1.2;
    if (moving || swinging) {
      this.v2.set(0, 0, 0);
      this.particles.emit(this.hammerHeadPos, this.v2, Math.random() < 0.3 ? WHITE : VIOLET, 0.35, 0, 0);
      if (Math.random() < (moving ? 0.25 : 0.08)) {
        this.v1.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.5).add(this.hammerHeadPos);
        this.lightningFx.strike(this.hammerHeadPos, this.v1, VIOLET, 0.12);
      }
      for (const drone of this.drones) {
        if (drone.state === 'off' || drone.state === 'emerging') continue;
        if (this.elapsed - drone.hammerHitAt < 0.35) continue;
        const radius = ENEMIES[drone.kind].radius + HAMMER_HEAD_RADIUS;
        if (!this.segmentHits(this.hammerHeadPrev, this.hammerHeadPos, drone.object.position, radius)) continue;
        drone.hammerHitAt = this.elapsed;
        this.v1.copy(drone.object.position);
        this.sfx.thunderHit();
        this.flashes.spawn(this.v1, WHITE, 0.1, 0.7, 0.2);
        this.damageDrone(drone, (this.hammerState === 'flying' ? 3 : 2) + Math.floor(this.level('tempest-impact') / 2));
        this.chainLightning(this.v1, drone);
        if (this.hammerState === 'flying') this.hammerVelocity.multiplyScalar(0.8);
      }
    }
  }

  private grabHammer(index: number): void {
    this.hammerHand = index;
    this.hammerState = 'gripped';
    this.hammerTime = 0;
    this.hammerVelocity.set(0, 0, 0);
    this.sfx.catchHammer();
  }

  private throwHammer(speed: number): void {
    const boosted = Math.min(16, Math.max(7, speed * 2.4));
    this.hammerVelocity.setLength(boosted);
    this.hammerState = 'flying';
    this.hammerTime = 0;
    this.sfx.crescent();
    this.flashes.spawn(this.hammer!.position, VIOLET, 0.1, 0.5, 0.2);
  }

  private recallHammer(index: number): void {
    this.hammerHand = index;
    this.hammerState = 'returning';
    this.hammerTime = 0;
    this.sfx.portal();
    this.lightningFx.strike(this.hands[index].gauntlet.palmPoint, this.hammer!.position, VIOLET, 0.3);
  }

  /** Arcs lightning from `from` to up to three nearby enemies for 1 damage each. */
  private chainLightning(from: Vector3, skip: Drone): void {
    let jumps = 0;
    const chain = this.level('tempest-chain');
    for (const drone of this.drones) {
      if (jumps >= 3 + chain) break;
      if (drone === skip || drone.state === 'off' || drone.state === 'emerging') continue;
      if (drone.object.position.distanceTo(from) > 3 + chain * 0.5) continue;
      jumps += 1;
      this.lightningFx.strike(from, drone.object.position, VIOLET, 0.3);
      this.particles.burst(drone.object.position, VIOLET, 16, 1.5, 0.3, this.v2);
      this.damageDrone(drone, 1);
    }
  }

  /** TALON: fist extends blades; contact cuts, fast swings throw crescents. */
  private updateClaws(dt: number): void {
    for (const hand of this.hands) {
      const claws = hand.claws;
      const out = this.powersLive && this.hero === 'talon' && hand.tracked && isFist(hand.joints);
      const wasOut = claws.extension > 0.5;
      claws.lengthScale = 1 + 0.12 * this.level('talon-reach');
      claws.update(hand.pose, out, dt, this.elapsed);
      hand.slashCooldown -= dt;
      if (out && !wasOut && claws.extension > 0.5) this.sfx.shing();
      if (claws.extension < 0.8 || dt <= 0) {
        hand.hasPrevTip = false;
        continue;
      }
      if (!hand.hasPrevTip) {
        hand.prevTip.copy(claws.tip);
        hand.hasPrevTip = true;
        continue;
      }
      const speed = this.v3.subVectors(claws.tip, hand.prevTip).length() / dt;


      for (const drone of this.drones) {
        if (drone.state === 'off' || drone.state === 'emerging') continue;
        const radius = ENEMIES[drone.kind].radius + 0.03;
        const at = drone.object.position;
        if (this.segmentHits(claws.base, claws.tip, at, radius) || this.segmentHits(hand.prevTip, claws.tip, at, radius)) {
          this.sfx.slash();
          this.damageDrone(drone, 2);
        }
      }

      if (speed > CRESCENT_MIN_SWING && hand.slashCooldown <= 0) {
        hand.slashCooldown = CRESCENT_COOLDOWN * (1 - 0.12 * this.level('talon-tempo'));
        this.v4.subVectors(claws.tip, hand.prevTip).normalize();
        this.fireCrescent(claws.tip, this.v4, claws.direction);
      }
      hand.prevTip.copy(claws.tip);
    }
  }

  private fireCrescent(origin: Vector3, direction: Vector3, bladeDirection: Vector3): void {
    const bolt = this.bolts.find((b) => !b.active);
    if (bolt == null) return;
    bolt.kind = 'crescent';
    bolt.radius = 0.24 + 0.03 * this.level('talon-wave');
    bolt.damage = 2 + Math.floor(this.level('talon-wave') / 2);
    bolt.speed = CRESCENT_SPEED;
    bolt.target = null;
    bolt.bolt.visible = false;
    bolt.crescent.visible = true;
    bolt.arrow.visible = false;
    bolt.pierceLeft = 99;
    bolt.gravity = 0;
    bolt.crescent.scale.setScalar(1);
    bolt.active = true;
    bolt.life = BOLT_LIFE;
    bolt.position.copy(origin);
    bolt.previous.copy(origin);
    bolt.velocity.copy(direction).multiplyScalar(CRESCENT_SPEED);
    // Lay the arc along the blade: local up is perpendicular to swing and blade.
    bolt.object.up.crossVectors(direction, bladeDirection);
    if (bolt.object.up.lengthSq() < 1e-6) bolt.object.up.set(0, 1, 0);
    bolt.object.up.normalize();
    bolt.object.position.copy(origin);
    this.v1.copy(origin).add(direction);
    bolt.object.lookAt(this.v1);
    bolt.object.visible = true;
    this.flashes.spawn(origin, this.accent, 0.05, 0.35, 0.18);
    this.sfx.crescent();
  }

  // ---------------------------------------------------------------- bolts

  private fire(origin: Vector3, direction: Vector3, quiet = false): void {
    const bolt = this.bolts.find((b) => !b.active);
    if (bolt == null) return;
    bolt.target = null;
    let best = this.profile.settings.aimAssist ? AIM_ASSIST_COS : 2;
    for (const drone of this.drones) {
      if (drone.state === 'off') continue;
      const cos = this.v2.subVectors(drone.object.position, origin).normalize().dot(direction);
      if (cos > best) {
        best = cos;
        bolt.target = drone;
      }
    }
    bolt.kind = 'bolt';
    bolt.radius = 0.06;
    bolt.damage = 1 + Math.floor(this.level('arc-power') / 2);
    bolt.speed = BOLT_SPEED;
    bolt.bolt.visible = true;
    bolt.crescent.visible = false;
    bolt.arrow.visible = false;
    bolt.pierceLeft = 0;
    bolt.gravity = 0;
    bolt.active = true;
    bolt.life = BOLT_LIFE;
    bolt.position.copy(origin);
    bolt.previous.copy(origin);
    bolt.velocity.copy(direction).multiplyScalar(BOLT_SPEED);
    bolt.object.up.set(0, 1, 0);
    bolt.object.visible = true;
    bolt.object.position.copy(origin);
    if (quiet) return;
    this.flashes.spawn(origin, this.accent, 0.05, 0.25, 0.15);
    this.sfx.blast();
  }

  /** Turns a bolt toward its target by `amount` (1 = straight at it). */
  private steer(bolt: Bolt, amount: number): void {
    if (bolt.gravity > 0 && bolt.target == null) return;
    const target = bolt.target;
    if (target == null) return;
    const point = target.state === 'off' ? null : target.object.position;
    if (point == null) {
      bolt.target = null;
      return;
    }
    this.v2.subVectors(point, bolt.position).normalize().multiplyScalar(bolt.speed);
    bolt.velocity.lerp(this.v2, amount).setLength(bolt.speed);
  }

  private updateBolts(dt: number): void {
    for (const bolt of this.bolts) {
      if (!bolt.active) continue;
      bolt.life -= dt;
      if (bolt.life <= 0) {
        this.retireBolt(bolt);
        continue;
      }
      this.steer(bolt, Math.min(1, dt * HOMING_RATE));
      if (bolt.gravity > 0) bolt.velocity.y -= bolt.gravity * dt;
      bolt.previous.copy(bolt.position);
      bolt.position.addScaledVector(bolt.velocity, dt);
      bolt.object.position.copy(bolt.position);
      this.v1.copy(bolt.position).add(bolt.velocity);
      bolt.object.lookAt(this.v1);
      this.v2.set(0, 0, 0);
      const crescent = bolt.kind === 'crescent';
      this.particles.emit(bolt.previous, this.v2, bolt.kind === 'bolt' ? CYAN : this.accent, crescent ? 0.3 : 0.18, 0);
      if (crescent) bolt.crescent.scale.setScalar(1 + (BOLT_LIFE - bolt.life) * 1.2);


      for (const drone of this.drones) {
        if (drone.state === 'off') continue;
        const radius = ENEMIES[drone.kind].radius + bolt.radius;
        if (this.segmentHits(bolt.previous, bolt.position, drone.object.position, radius)) {
          this.damageDrone(drone, bolt.damage);
          // Crescents and piercing arrows cut through what they hit.
          if (bolt.pierceLeft > 0) {
            bolt.pierceLeft -= 1;
            continue;
          }
          this.retireBolt(bolt);
          break;
        }
      }
    }
  }

  private retireBolt(bolt: Bolt): void {
    bolt.active = false;
    bolt.object.visible = false;
    bolt.target = null;
  }

  /** Whether segment a→b passes within `radius` of `center`. */
  private segmentHits(a: Vector3, b: Vector3, center: Vector3, radius: number): boolean {
    this.v3.subVectors(b, a);
    const lengthSq = this.v3.lengthSq();
    let t = lengthSq > 0 ? this.v4.subVectors(center, a).dot(this.v3) / lengthSq : 0;
    t = Math.max(0, Math.min(1, t));
    this.v4.copy(a).addScaledVector(this.v3, t);
    return this.v4.distanceToSquared(center) <= radius * radius;
  }

  // ---------------------------------------------------------------- drones

  private spawnDrone(kind: EnemyKind, speed: number): void {
    const drone = this.drones.find((d) => d.state === 'off' && d.kind === kind);
    if (drone == null) {
      // Pool exhausted: count it as killed so the wave can still finish.
      this.run.kill(kind);
      return;
    }
    this.pickSpawn(drone.spawn, drone.normal);
    drone.hp = ENEMIES[kind].hp;
    drone.state = 'emerging';
    drone.t = 0;
    drone.speed = speed;
    drone.phase = Math.random() * Math.PI * 2;
    drone.offset.set((Math.random() - 0.5) * 1.0, (Math.random() - 0.3) * 0.5, 0);
    drone.object.position.copy(drone.spawn);
    drone.object.scale.setScalar(0.01);
    drone.object.visible = true;
    drone.portal.position.copy(drone.spawn);
    this.v1.copy(drone.spawn).add(drone.normal);
    drone.portal.lookAt(this.v1);
    drone.portal.scale.setScalar(0.01);
    drone.portal.visible = true;
    drone.portalMaterial.opacity = 1;
    this.particles.burst(drone.spawn, ENEMY_COLOR[kind], kind === 'titan' ? 60 : 24, 1.2, 0.5, this.v2);
    this.sfx.portal();
  }

  /** A point on a detected wall facing the player, else a ring in front. */
  private pickSpawn(position: Vector3, normal: Vector3): void {
    const walls: Object3D[] = [];
    for (const entity of this.queries.planes.entities) {
      const plane = entity.getValue(XRPlane, '_plane') as XRPlane | undefined;
      const object = entity.object3D;
      if (plane == null || object == null || plane.orientation !== 'vertical') continue;
      object.getWorldPosition(this.v1);
      const d = this.v1.distanceTo(this.head);
      if (d > 1.8 && d < 7) walls.push(object);
    }
    if (walls.length > 0) {
      const wall = walls[Math.floor(Math.random() * walls.length)];
      position.set((Math.random() - 0.5) * 1.2, 0, (Math.random() - 0.5) * 1.2);
      wall.localToWorld(position);
      position.y = Math.min(Math.max(position.y, this.head.y - 0.5), this.head.y + 0.7);
      normal.set(0, 1, 0).transformDirection(wall.matrixWorld);
      this.v1.subVectors(this.head, position);
      if (normal.dot(this.v1) < 0) normal.negate();
      position.addScaledVector(normal, 0.05);
      return;
    }
    this.v1.set(this.forward.x, 0, this.forward.z);
    if (this.v1.lengthSq() < 1e-4) this.v1.set(0, 0, -1);
    this.v1.normalize();
    const angle = (Math.random() - 0.5) * (Math.PI * 0.8);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = this.v1.x * cos - this.v1.z * sin;
    const z = this.v1.x * sin + this.v1.z * cos;
    position.set(this.head.x + x * 3.5, this.head.y + (Math.random() - 0.35) * 1.0, this.head.z + z * 3.5);
    normal.set(-x, 0, -z);
  }

  private updateDrones(dt: number, time: number): void {
    for (const drone of this.drones) {
      if (drone.state === 'off') continue;
      drone.t += dt;
      drone.ring.rotation.z += dt * (drone.state === 'charge' ? 18 : 4);
      const object = drone.object;

      if (drone.portal.visible) {
        const p = Math.min(1, drone.t / EMERGE_TIME);
        drone.portal.scale.setScalar(0.2 + p * ENEMIES[drone.kind].radius * 7);
        drone.portalMaterial.opacity = drone.state === 'emerging' ? 1 : Math.max(0, drone.portalMaterial.opacity - dt * 1.5);
        if (drone.portalMaterial.opacity <= 0) drone.portal.visible = false;
      }

      if (drone.state === 'emerging') {
        const p = Math.min(1, drone.t / EMERGE_TIME);
        object.scale.setScalar(p);
        object.position.copy(drone.spawn).addScaledVector(drone.normal, 0.35 * p);
        object.lookAt(this.head);
        if (p >= 1) {
          drone.state = 'approach';
          drone.t = 0;
        }
        continue;
      }

      const def = ENEMIES[drone.kind];
      if (drone.snare > 0) {
        drone.snare = Math.max(0, drone.snare - dt);
        drone.cocoon.visible = drone.snare > 0;
        drone.cocoon.position.copy(object.position);
        drone.cocoon.scale.setScalar(def.radius * 1.35 * (1 + Math.sin(time * 6) * 0.04));
        drone.cocoon.rotation.y += dt * 0.8;
        if (drone.state === 'charge') drone.t -= dt;
        object.position.x += (Math.random() - 0.5) * 0.004;
        continue;
      }
      if (drone.state === 'approach') {
        // Hover point: in front of the face, offset so drones fan out.
        this.v1.copy(this.head).addScaledVector(this.forward, 0.3);
        this.v1.x += drone.offset.x;
        this.v1.y += drone.offset.y;
        this.v2.subVectors(this.v1, object.position);
        const step = drone.speed * dt;
        if (this.v2.length() > step) this.v2.setLength(step);
        object.position.add(this.v2);
        const weave = def.weave * (drone.kind === 'swarmer' ? 3 : 1);
        object.position.y += Math.sin(time * 3 * (drone.kind === 'swarmer' ? 2.5 : 1) + drone.phase) * weave * dt;
        object.position.x += Math.cos(time * 2.2 * (drone.kind === 'swarmer' ? 2.5 : 1) + drone.phase) * weave * dt;
        object.lookAt(this.head);
        if (object.position.distanceTo(this.head) < def.chargeDistance) {
          drone.state = 'charge';
          drone.t = 0;
        }
        continue;
      }

      // Charging: shake, flash the eye, then detonate on the player.
      const s = 1 + Math.sin(drone.t * 40) * 0.15;
      drone.eye.scale.setScalar(s * (1 + drone.t));
      object.position.x += (Math.random() - 0.5) * 0.01;
      object.position.y += (Math.random() - 0.5) * 0.01;
      if (drone.t >= def.chargeTime) {
        this.explodeDrone(drone, false);
        this.run.hit(def.damage);
        this.damageMaterial.opacity = 0.55;
        this.damage.visible = true;
        this.sfx.hurt();
        this.v1.copy(this.head).addScaledVector(this.forward, 0.6);
        this.comic.random('hurt', this.v1, MAGENTA, 0.3);
      }
    }
  }

  private damageDrone(drone: Drone, amount = 1): void {
    drone.hp -= amount;
    if (drone.hp > 0) {
      this.flashes.spawn(drone.object.position, WHITE, 0.1, 0.4, 0.12);
      this.particles.burst(drone.object.position, GOLD, 14, 2, 0.3, this.v2);
      this.sfx.ping();
      return;
    }
    const last = this.run.kill(drone.kind);
    const big = last || drone.kind === 'titan';
    // Comic word for the kill, rate-limited so swarms don't flood the view.
    if (big || this.comicCooldown <= 0) {
      this.comicCooldown = 0.35;
      this.comic.random(big ? 'big' : this.hero, drone.object.position, big ? GOLD : this.accent, big ? 0.6 : 0.35);
    }
    this.explodeDrone(drone, big);
    if (last) this.slowmo = SLOWMO_SECONDS;
  }

  private explodeDrone(drone: Drone, big: boolean): void {
    const at = drone.object.position;
    const color = ENEMY_COLOR[drone.kind];
    this.flashes.spawn(at, color, 0.1, big ? 1.6 : 0.9, big ? 0.6 : 0.35);
    this.flashes.spawn(at, WHITE, 0.05, big ? 0.6 : 0.35, 0.15);
    this.particles.burst(at, color, big ? 90 : 45, big ? 3.5 : 2.5, 0.7, this.v2);
    this.particles.burst(at, GOLD, big ? 40 : 18, big ? 5 : 3.5, 0.4, this.v2);
    this.sfx.explode(big);
    drone.state = 'off';
    drone.object.visible = false;
    drone.eye.scale.setScalar(1);
    drone.snare = 0;
    drone.cocoon.visible = false;
  }

  /** Removes an enemy silently (restart or quit). */
  private retireDrone(drone: Drone): void {
    drone.state = 'off';
    drone.object.visible = false;
    drone.portal.visible = false;
    drone.eye.scale.setScalar(1);
    drone.snare = 0;
    drone.cocoon.visible = false;
  }

  // ---------------------------------------------------------------- phases

  private onPhaseChange(): void {
    const phase = this.run.phase;
    if (phase === this.lastPhase) return;
    this.lastPhase = phase;
    if (phase === 'intro') this.sfx.wave();
    if (phase === 'victory' || phase === 'defeat') {
      this.resultTimer = 0;
      for (const drone of this.drones) {
        if (drone.state !== 'off') this.explodeDrone(drone, false);
      }
      if (phase === 'victory') {
        this.sfx.victory();
        this.slowmo = SLOWMO_SECONDS;
      } else {
        this.sfx.defeat();
      }
    }
  }

  // ---------------------------------------------------------------- HUD

  private updateHud(dt: number): void {
    const run = this.run;
    let message = '';
    let hint = '';
    switch (run.phase) {
      case 'title':
        break;
      case 'intro':
        if (run.wave === 0 && run.elapsedInPhase < 1) {
          message = `${run.stage.world.name} ${run.stage.number}`;
          hint = `${run.stage.name}  |  ${run.stage.objective}`;
        } else if (run.wave === 0) {
          message = String(Math.max(1, 3 - Math.floor(run.elapsedInPhase - 1)));
          hint = 'Get ready  |  left wrist = pause';
        } else {
          message = `WAVE ${run.wave + 1}`;
        }
        break;
      case 'fighting':
        if (run.wave === 0 && run.elapsedInPhase < 0.8) message = 'FIGHT!';
        break;
      case 'cleared':
        message = 'CLEARED';
        break;
      case 'victory':
        message = 'VICTORY';
        break;
      case 'defeat':
        message = 'BREACHED';
        break;
    }
    if (this.paused) message = 'PAUSED';
    this.hud.mesh.visible = run.phase !== 'title' && !(this.panel.visible && !this.paused);
    this.hud.update(run, message, hint);

    // Float above and ahead of the player's gaze, catching up lazily.
    this.v1.set(this.forward.x, 0, this.forward.z);
    if (this.v1.lengthSq() < 1e-4) this.v1.set(0, 0, -1);
    this.v1.normalize();
    this.v2.copy(this.head).addScaledVector(this.v1, 1.6);
    this.v2.y = this.head.y + 0.42;
    const mesh = this.hud.mesh;
    if (!this.hudPlaced) {
      mesh.position.copy(this.v2);
      this.hudPlaced = true;
    } else {
      mesh.position.lerp(this.v2, Math.min(1, dt * 2));
    }
    mesh.lookAt(this.head);
  }
}
