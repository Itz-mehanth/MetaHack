import {
  AdditiveBlending,
  Color,
  createSystem,
  IcosahedronGeometry,
  type Light,
  PointLight,
  CylinderGeometry,
  DoubleSide,
  Euler,
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
import { Armory, TierAura } from './combat/armory.js';
import { HeroCarousel } from './combat/carousel.js';
import { applyRealism, loadSurfaceMaps } from './combat/materials.js';
import { Claws } from './combat/claws.js';
import { segmentDistance, Sword } from './combat/sword.js';
import { PsiLink } from './combat/telekinesis.js';
import { CLAP_TIP, Coach, HERO_TIPS, type Tip } from './combat/coach.js';
import { BloodPools, BloodScreen, captureParts, Gibs, type Part, type PartName, restorePart } from './combat/bodies.js';
import { Galaxy } from './combat/galaxy.js';
import { lookFor, WORLD_LOOKS } from './combat/worlds.js';
import { TWIST_INFO, type TwistId, twistFor } from './combat/twists.js';
import { ARSENAL, equippedWeapon, type WeaponDef } from './combat/arsenal.js';
import { Erasure } from './combat/erasure.js';
import {
  anchorLine,
  chapterCall,
  CONVERGENCE_AT,
  ECHO,
  FINALE,
  FINALE_DONE,
  FINALE_PHASES,
  finalePhase,
  isSagaStage,
  OBLIVAX,
  PROLOGUE,
  PROLOGUE_DONE,
  PROLOGUE_ERASE_AT,
  PROLOGUE_ERASURE,
  PROLOGUE_HEROES,
  SAGA_STORY,
  anchorsRecovered,
  finaleUnlocked,
} from './combat/saga.js';
import { addOutline, Onomatopoeia } from './combat/comic.js';
import { Gauntlet, HAND_JOINTS, HandPose, J } from './combat/gauntlet.js';
import { fingerExtension, type HandJoints, isBlastPose, isFist, isOpenPalm, isWebPose } from './combat/gestures.js';
import { type HeroId, HEROES } from './combat/heroes.js';
import { Lightning } from './combat/lightning.js';
import { HoloMap } from './combat/holomap.js';
import { GameMenus, wrap } from './combat/menus.js';
import { ENEMIES, type EnemyKind } from './combat/missions.js';
import { Music } from './combat/music.js';
import { Panel } from './combat/panel-ui.js';
import {
  DIFFICULTY,
  ENEMY_COINS,
  equippedColor,
  hasUnlock,
  isStageUnlocked,
  maxHealth,
  type Profile,
  recordResult,
  type Stage,
  STAGES,
  upgradeLevel,
  weaponTier,
} from './combat/progression.js';
import { loadProfile, resetProfile, saveProfile } from './combat/save.js';
import { applyTheme, setFlash, type Theme, THEMES } from './combat/themes.js';
import { chapterFor, chapterForWorld, type Line, type LevelStory, levelStory } from './combat/story.js';
import { createCocoon, WebStrand } from './combat/web.js';
import { WristButton } from './combat/wrist.js';
import { Hud } from './combat/hud.js';
import { type Phase, Run } from './combat/run.js';
import { Sfx } from './combat/sfx.js';
import { createGlowSprite, Flashes, getGlowTexture, Particles } from './combat/vfx.js';

type Handedness = 'left' | 'right';
/** The bits of MeshStandardMaterial the arsenal recolours. */
type MeshStandardMaterialLike = { color: Color; emissive?: Color; emissiveIntensity?: number; metalness?: number };
type Triple = [number, number, number];

const FIRE_COOLDOWN = 0.26;
const ARM_TIME = 0.08;
const BOLT_SPEED = 14;
const BOLT_LIFE = 1.6;
const AIM_ASSIST_COS = 0.985;
const CRESCENT_SPEED = 9;
const CRESCENT_MIN_SWING = 2.4;
const CRESCENT_COOLDOWN = 0.35;
const HAMMER_REACH = 0.25;
const HAMMER_THROW_MIN = 1.3;
const HAMMER_RETURN_SPEED = 13;
const HAMMER_HEAD_RADIUS = 0.14;
const HAMMER_FLIGHT = 2.6;
const RECALL_DELAY = 0.45;
const PINCH_DISTANCE = 0.03;

type HammerState = 'floating' | 'gripped' | 'docked' | 'flying' | 'returning';
type WebState = 'idle' | 'flying' | 'tethered' | 'retracting';

const ARROW_GRAVITY = 1.2;
const NOCK_REACH = 0.3;
const PINCH_RELEASE = 0.065;
const WEB_SPEED = 30;
const WEB_FLIGHT = 0.7;
const WEB_COOLDOWN = 0.3;
const YANK_SPEED = 1.3;
const HOMING_RATE = 3;
const AIM_SMOOTHING = 0.45;
const EMERGE_TIME = 0.9;
const SLOWMO_SECONDS = 0.8;
const SLOWMO_SCALE = 0.25;
const SWORD_WAVE_SPEED = 3.4;
const SWORD_WAVE_COOLDOWN = 0.45;
const X_STRIKE_COOLDOWN = 2.5;
/** Seconds each coach tip stays up. */
const TIP_SECONDS = 3.4;
/** Walkers stop this far from the player (horizontal) to strike. */
const MELEE_RANGE = 1.05;
/** Seconds a killed walker takes to fall, lie, and sink away. */
const DEATH_FALL = 0.6;
const DEATH_LIE = 1.8;
const DEATH_SINK = 1;
const ICHOR = new Color('#B0000C');
const ICHOR_DARK = new Color('#4A0004');
const DUST = new Color('#9A8F80');
/** Mean finger extension: open to aim, curled to grab, opened again to throw. */
const PSI_OPEN = 1.6;
const PSI_GRAB = 1.5;
const PSI_RELEASE = 1.62;
const PSI_LOCK_GRACE = 0.45;
const PSI_THROW_MIN = 1.5;
const PSI_GRAVITY = 3;

const CYAN = new Color('#3DF5FF');
const WHITE = new Color('#FFFFFF');
const ORANGE = new Color('#FF8A1F');
const MAGENTA = new Color('#FF2D6F');
const GOLD = new Color('#FFD23F');
const PINK = new Color('#FF2D9A');
const EMBER = new Color('#FF6A1A');
const VIOLET = new Color('#9D8CFF');
const GREEN = new Color('#39FF88');
const BLOSSOM = new Color('#FF9AD5');
const PSI = new Color('#E05CFF');
const MINT = new Color('#3DFFC8');

const ENEMY_ASSET: Readonly<Record<EnemyKind, string>> = {
  drone: 'alien-grunt',
  armored: 'alien-brute',
  swarmer: 'alien-stalker',
  titan: 'alien-colossus',
  blade: 'alien-reaver',
  boss: '',
  orb: 'orb',
  pod: 'pod',
};
/** Bosses are loaded separately, one per region. */
const ENEMY_POOL: Readonly<Record<EnemyKind, number>> = { drone: 12, armored: 8, swarmer: 14, titan: 5, blade: 8, boss: 0, orb: 32, pod: 5 };
/** Walking pace relative to the wave speed: heavies lumber. */
const PACE: Partial<Record<EnemyKind, number>> = { armored: 0.8, titan: 0.55, blade: 1.05 };
const ENEMY_COLOR: Readonly<Record<EnemyKind, Color>> = {
  drone: MAGENTA,
  armored: ORANGE,
  swarmer: EMBER,
  titan: VIOLET,
  blade: new Color('#FF3355'),
  boss: new Color('#FF3B5C'),
  orb: ORANGE,
  pod: GOLD,
};
const OBLIVAX_COLOR = new Color(OBLIVAX.color);
const REGIONS = ['neon-grid', 'ember-foundry', 'storm-peak', 'frost-spire', 'void-rift', 'scrap-wastes', 'moon-temple', 'sky-ruins', 'iron-bastion', 'oblivion'];
type PickupKind = 'heal' | 'rapid' | 'power';
const BUFF_SECONDS = 8;

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
  sword: Sword;
  /** Enemy skewered on this hand's blade, if any. */
  skewer: Drone | null;
  /** Blade tip velocity this frame (swords and claws). */
  tipVel: Vector3;
  /** Seconds the sword stays lit after the fist last read as closed. */
  swordHold: number;
  psi: PsiLink;
  held: Throwable | null;
  aimObject: Throwable | null;
  aimDrone: Drone | null;
  aimTime: number;
  release: number;
}

/** A meteor or lightning strike: warning circle, then impact. */
interface Meteor {
  rock: Mesh;
  marker: Mesh;
  markerMaterial: MeshBasicMaterial;
  target: Vector3;
  t: number;
  state: 'off' | 'warn';
}

/** Something PSION can lift: a floor prop, or a slot carrying a lifted alien. */
interface Throwable {
  object: Object3D;
  drone: Drone | null;
  radius: number;
  state: 'off' | 'spawn' | 'rest' | 'held' | 'flying';
  /** Flung (hits and blasts on impact) rather than dropped. */
  thrown: boolean;
  velocity: Vector3;
  previous: Vector3;
  spin: Vector3;
  home: Vector3;
  t: number;
  bashAt: number;
}

type DroneState = 'off' | 'emerging' | 'approach' | 'charge' | 'boss' | 'fly' | 'hold' | 'aim' | 'melee' | 'shot';

/** Animated joints of a walking alien. */
interface Rig {
  legL: Object3D;
  legR: Object3D;
  kneeL: Object3D;
  kneeR: Object3D;
  armL: Object3D;
  armR: Object3D;
  armLRest: number;
  armRRest: number;
  muzzle: Object3D | null;
  elbowL: Object3D;
  elbowR: Object3D;
  elbowLRest: number;
  elbowRRest: number;
  upper: Object3D;
  upperRest: number;
  bladeBase: Object3D | null;
  bladeTip: Object3D | null;
}

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
  /** Whether the Run tracks it (wave enemies) or not (orbs, minions, pods). */
  counted: boolean;
  /** Boss region id. */
  world: string;
  maxHp: number;
  attackTimer: number;
  bossPhase: number;
  rig: Rig | null;
  stride: number;
  /** Soft contact shadow on the floor (walkers only). */
  blob: Mesh | null;
  /** Held or thrown by PSION: the walker AI is suspended. */
  lifted: boolean;
  bladeHitAt: number;
  /** Severable body parts (walkers). */
  parts: Partial<Record<PartName, Part>>;
  /** Seconds into its death (-1: alive or gone). The state is already 'off'. */
  dying: number;
  feet: Vector3;
  knock: Vector3;
  /** Hit flinch seconds left; stunned seconds after a parry. */
  stagger: number;
  stun: number;
  /** Melee cycle: 0 ready, 1 wind-up, 2 strike, 3 recover; `melee` is the stage time. */
  meleeStage: number;
  melee: number;
  /** Rifle volleys fired before pushing in to melee range. */
  volleys: number;
  push: boolean;
  /** Stalker dash: seconds left; cooldown. */
  dash: number;
  dashCool: number;
  /** Dead body skewered on hand `heldBy`'s blade (-1: none). */
  heldBy: number;
  /** Burning / electrocuted seconds left, and the damage-tick timer. */
  burn: number;
  shock: number;
  dotTimer: number;
  /** Dropping from the ceiling: height of the chest and fall speed (0: grounded). */
  dropY: number;
  dropV: number;
  /** Dead body flung through the air. */
  flying: boolean;
  fly: Vector3;
  bowlAt: number;
}

interface Pickup {
  object: Object3D;
  kind: PickupKind;
  active: boolean;
  life: number;
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
  /** Base size multiplier (crescents). */
  scale: number;
  /** Explodes on impact with this radius (rockets, blast arrows); 0 = no. */
  blast: number;
  /** Chains lightning on hit (storm arrows). */
  zap: boolean;
  /** Seconds of burning applied on hit. */
  burn: number;
  /** Homing strength multiplier (rockets home hard). */
  homing: number;
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
  private pickups: Pickup[] = [];
  private buffRapid = 0;
  private buffPower = 0;
  private overdrive = 0;
  private clapArmed = false;
  private shockwave: Mesh | null = null;
  private shockwaveTime = -1;
  private hostagesSaved = 0;
  private hostagesTotal = 0;
  /** Seconds since entering MR, for the room-scan sweep (-1: idle). */
  private scanTime = -1;
  private scanMaterial = new MeshBasicMaterial({
    color: '#3DF5FF',
    transparent: true,
    opacity: 0,
    wireframe: true,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  private carousel = new HeroCarousel();
  private armory = new Armory();
  private weaponDisplays = new Map<string, Object3D>();
  private hammerAura: TierAura | null = null;
  private gunAura: TierAura | null = null;
  private bowAura: TierAura | null = null;
  private weaponTierNow = 0;
  private holomap = new HoloMap();
  private markers = new Map<string, Object3D>();
  private debris: Throwable[] = [];
  private liftSlots: Throwable[] = [];
  private xCooldown = 0;
  private bladesCrossed = false;
  private swordGrip = new Vector3();
  private crossPoint = new Vector3();
  private xDir = new Vector3();
  private xRight = new Vector3();
  private xUp = new Vector3();
  private xDiag = new Vector3();
  private impactPoint = new Vector3();
  private yAxis = new Vector3(0, 1, 0);
  private coach = new Coach();
  private gibs!: Gibs;
  private blood = new BloodScreen();
  private gore = new Particles(600, 0.028, false);
  private pools!: BloodPools;
  private galaxy = new Galaxy(HEROES.length);
  private galaxyPokeCooldown = 0;
  /** How far the level's world tears into the room in MR (VR shows it all). */
  private riftLevel = 0;
  /** The current level's twist and its state. */
  private twist: TwistId = 'none';
  private gravityScale = 1;
  private twistTimer = 0;
  private meteors: Meteor[] = [];
  private lights: { light: Light; base: number }[] = [];
  private handLight = new PointLight('#FFFFFF', 0, 5, 2);
  private sky = new Vector3();
  private envBase = -1;
  /** Equipped arsenal weapon for the current hero, and its colour. */
  private weaponDef: WeaponDef = ARSENAL[0];
  private weaponColor = new Color('#3DF5FF');
  private weaponModels = new Map<string, Object3D>();
  private guns = new Map<string, Object3D>();
  private gunSpin = 0;
  private gunShots = 0;
  private hammerPainted = false;
  /** VANGUARD's shield: worn on the off-hand forearm, thrown, or flying home. */
  private shield: Object3D | null = null;
  private shieldState: 'worn' | 'flying' | 'returning' = 'worn';
  private shieldNormal = new Vector3(0, 0, 1);
  private shieldVel = new Vector3();
  private shieldPrev = new Vector3();
  private shieldTarget: Drone | null = null;
  private shieldLast: Drone | null = null;
  private shieldBounces = 0;
  private shieldTime = 0;
  private shieldBasis = new Matrix4();
  private sx = new Vector3();
  private sy = new Vector3();
  private sz = new Vector3();
  /** How the next damageDrone call landed: drives flinch, fall and cuts. */
  private hitStyle: 'blast' | 'slice' | 'impale' | 'dot' = 'blast';
  private hitPoint = new Vector3();
  private hitDir = new Vector3();
  private cutNormal = new Vector3();
  private hitSet = false;
  private bladeA = new Vector3();
  private bladeB = new Vector3();
  private camQuat = new Quaternion();
  private sa = new Vector3();
  private sb = new Vector3();
  private sc = new Vector3();
  private erasure = new Erasure(OBLIVAX.color);
  private eraseTarget = 0;
  private veilTarget = 0;
  /** Scripted saga mission running, if any. */
  private script: 'prologue' | 'finale' | null = null;
  private scriptWave = -1;
  /** Seconds into the prologue erasure cutscene (-1: not started). */
  private erasing = -1;
  /** OBLIVAX ignores damage (cutscene, CONVERGENCE). */
  private bossLocked = false;
  private finaleIndex = -1;
  /** Seconds into CONVERGENCE (-1: not started); `volley` once the clap lands. */
  private convergence = -1;
  private volley = -1;
  private volleyTimer = 0;
  private holograms: Object3D[] = [];
  private tipQueue: readonly Tip[] = [];
  private tipIndex = 0;
  private tipTimer = 0;
  private accentHex = '#3DF5FF';
  /** Elapsed time to auto-start the prologue on a first XR session (-1: none). */
  private autoPrologueAt = -1;
  private mapPokeCooldown = 0;
  private story: LevelStory | null = null;
  private taunt = '';
  private tauntWave = -1;
  private tx: {
    lines: readonly Line[];
    index: number;
    /** Reading time left once the line has finished typing. */
    timer: number;
    done: () => void;
    /** Current line, pre-wrapped for the panel. */
    full: string;
    typed: number;
    shown: number;
    glitch: number;
    blink: number;
  } | null = null;
  private pendingReward: Parameters<GameMenus['showResults']>[0] | null = null;
  private comic!: Onomatopoeia;
  private comicCooldown = 0;
  private swipeCooldown = 0;
  private swipePrev = [new Vector3(), new Vector3()];
  private swipeValid = [false, false];
  /** Sideways distance of the current stroke, per hand (m, signed). */
  private swipeStroke = [0, 0];
  /** After a step, a hand must slow down before its next stroke counts. */
  private swipeLatched = [false, false];
  private swipeStill = [0, 0];
  /** Direction of the last step, so the hand's return stroke is ignored. */
  private swipeDir = 0;
  private bow!: Bow;
  /** Hand holding the bow (-1: loose in the world). */
  private bowHolder = -1;
  private bowOpen = 0;
  private bowLoose = { position: new Vector3(), velocity: new Vector3(), quaternion: new Quaternion(), resting: false, recall: -1 };
  private blaster: Object3D | null = null;
  private blasterMuzzle: Object3D | null = null;
  private gunHolder = -1;
  private gunOpen = 0;
  private gunLoose = { position: new Vector3(), velocity: new Vector3(), quaternion: new Quaternion(), resting: false, recall: -1 };
  private triggerArmed = true;
  private gunCooldown = 0;
  private gunKick = 0;
  /** Hammer physics once it has been used: falls and rests on surfaces. */
  private hammerHover = true;
  private hammerLetGo = 0;
  private hammerFall = new Vector3();
  private hammerResting = false;
  private basis = new Matrix4();
  private lieQuat = new Quaternion();
  private lieEuler = new Euler();
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
    this.root.add(this.armory.group);
    this.root.add(this.holomap.group);
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
      mapSelect: (index) => {
        this.holomap.selected = index;
        this.sfx.swap();
      },
      txNext: () => this.nextTransmissionLine(),
      txSkip: () => this.endTransmission(),
      story: () => this.startStage('arc', PROLOGUE),
      finale: () => this.startStage('arc', FINALE),
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
      const sword = new Sword(handedness, CYAN);
      this.root.add(sword.group, sword.trail);
      const psi = new PsiLink(CYAN);
      this.root.add(psi.group);
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
        sword,
        skewer: null,
        tipVel: new Vector3(),
        swordHold: 0,
        psi,
        held: null,
        aimObject: null,
        aimDrone: null,
        aimTime: -10,
        release: 0,
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
        scale: 1,
        blast: 0,
        zap: false,
        burn: 0,
        homing: 1,
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
    this.world.camera.add(this.blood.mesh);
    this.gibs = new Gibs(this.root);
    this.pools = new BloodPools(this.root);
    this.root.add(this.handLight);
    const rockGeometry = new IcosahedronGeometry(0.16, 1);
    const markerGeometry = new RingGeometry(0.6, 0.75, 40);
    markerGeometry.rotateX(-Math.PI / 2);
    for (let i = 0; i < 6; i += 1) {
      const rock = new Mesh(rockGeometry, new MeshBasicMaterial({ color: '#FF7A1A', toneMapped: false }));
      rock.visible = false;
      const markerMaterial = new MeshBasicMaterial({ color: '#FF2A2A', transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, side: DoubleSide });
      const marker = new Mesh(markerGeometry, markerMaterial);
      marker.visible = false;
      this.root.add(rock, marker);
      this.meteors.push({ rock, marker, markerMaterial, target: new Vector3(), t: 0, state: 'off' as const });
    }
    this.root.add(this.gore.points, this.galaxy.group);

    const xr = this.world.renderer.xr;
    const onSessionStart = () => {
      this.sfx.unlock();
      this.hudPlaced = false;
      if (this.panel.visible) this.replaceMenuAt = this.elapsed + 0.6;
      this.music.play(this.run.phase === 'title' ? 'menu' : this.run.stage.world.id);
      this.scanTime = 0;
      if (!hasUnlock(this.profile, PROLOGUE_DONE) && this.run.phase === 'title' && this.tx == null) this.autoPrologueAt = this.elapsed + 3;
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
          ring: object.getObjectByName('Ring') ?? new Group(),
          eye: object.getObjectByName('Eye') ?? new Group(),
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
          counted: true,
          world: '',
          maxHp: 1,
          attackTimer: 0,
          bossPhase: 1,
          rig: this.findRig(object),
          stride: 0,
          blob: ENEMIES[kind].ground ? this.makeBlob() : null,
          lifted: false,
          bladeHitAt: -10,
          parts: ENEMIES[kind].ground ? captureParts(object) : {},
          dying: -1,
          feet: new Vector3(),
          knock: new Vector3(),
          stagger: 0,
          stun: 0,
          meleeStage: 0,
          melee: 0,
          volleys: 0,
          push: false,
          dash: 0,
          dashCool: 0,
          heldBy: -1,
          burn: 0,
          shock: 0,
          dotTimer: 0,
          dropY: 0,
          dropV: 0,
          flying: false,
          fly: new Vector3(),
          bowlAt: -10,
        });
        // Yaw first, then pitch about the body's own side axis (falls, flinches).
        object.rotation.order = 'YXZ';
      }
    }
    // One boss per region, plus pickup pools.
    for (const region of REGIONS) {
      const object = await this.world.assets.instantiate(`boss-${region}`);
      object.name = `Boss-${region}`;
      addOutline(object, 0.06, (m) => m.name === 'Body' || m.name === 'Head');
      object.visible = false;
      this.root.add(object);
      const portalMaterial = new MeshBasicMaterial({
        color: '#FF3B5C',
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        side: DoubleSide,
        depthWrite: false,
      });
      const portal = new Mesh(portalGeometry, portalMaterial);
      portal.visible = false;
      this.root.add(portal);
      const cocoon = createCocoon();
      this.root.add(cocoon);
      this.drones.push({
        object,
        ring: object.getObjectByName('Ring') ?? new Group(),
        eye: object.getObjectByName('Eye') ?? new Group(),
        kind: 'boss',
        hp: 0,
        state: 'off',
        t: 0,
        speed: 0,
        phase: 0,
        spawn: new Vector3(),
        normal: new Vector3(),
        offset: new Vector3(),
        portal,
        portalMaterial,
        hammerHitAt: -10,
        snare: 0,
        cocoon,
        counted: true,
        world: region,
        maxHp: 1,
        attackTimer: 0,
        bossPhase: 1,
        rig: null,
        stride: 0,
        blob: null,
        lifted: false,
        bladeHitAt: -10,
        parts: {},
        dying: -1,
        feet: new Vector3(),
        knock: new Vector3(),
        stagger: 0,
        stun: 0,
        meleeStage: 0,
        melee: 0,
        volleys: 0,
        push: false,
        dash: 0,
        dashCool: 0,
        heldBy: -1,
        burn: 0,
        shock: 0,
        dotTimer: 0,
        dropY: 0,
        dropV: 0,
        flying: false,
        fly: new Vector3(),
        bowlAt: -10,
      });
    }
    for (const kind of ['heal', 'rapid', 'power'] as const) {
      for (let n = 0; n < 5; n += 1) {
        const object = await this.world.assets.instantiate(`pickup-${kind}`);
        object.visible = false;
        this.root.add(object);
        this.pickups.push({ object, kind, active: false, life: 0 });
      }
    }
    this.shockwave = new Mesh(
      new TorusGeometry(1, 0.03, 8, 96),
      new MeshBasicMaterial({ color: '#FFD23F', transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
    );
    this.shockwave.visible = false;
    this.root.add(this.shockwave);
    this.hammer = await this.world.assets.instantiate('hammer');
    this.hammer.name = 'StormHammer';
    this.hammer.visible = false;
    this.root.add(this.hammer);
    this.hammerHead = this.hammer.getObjectByName('Head') ?? this.hammer;
    this.blaster = await this.world.assets.instantiate('blaster');
    this.blaster.name = 'PlasmaPistol';
    this.blaster.visible = false;
    this.root.add(this.blaster);
    this.blasterMuzzle = this.blaster.getObjectByName('Muzzle') ?? this.blaster;
    addOutline(this.blaster, 0.08, (m) => m.name === 'Body');
    this.guns.set('havoc-pistol', this.blaster);
    for (const [id, asset] of [['havoc-smg', 'gun-smg'], ['havoc-shotgun', 'gun-shotgun'], ['havoc-minigun', 'gun-minigun']] as const) {
      const gun = await this.world.assets.instantiate(asset);
      gun.visible = false;
      addOutline(gun, 0.08, (m) => m.name === 'Body');
      this.root.add(gun);
      this.guns.set(id, gun);
    }
    this.hammerAura = new TierAura(0.13, this.accent);
    this.hammerHead.add(this.hammerAura.group);
    this.gunAura = new TierAura(0.07, this.accent);
    this.gunAura.group.position.set(0, 0.06, 0.08);
    this.blaster.add(this.gunAura.group);
    this.bowAura = new TierAura(0.1, this.accent);
    this.bow.group.add(this.bowAura.group);
    addOutline(this.hammer, 0.08, (m) => m.parent?.name === 'Head' || m.name === 'Handle');
    for (const hero of HEROES) {
      const figure = await this.world.assets.instantiate(`hero-${hero.id}`);
      const pedestal = await this.world.assets.instantiate('pedestal');
      addOutline(figure, 0.07, (m) => (m.material as { name?: string }).name !== 'accent');
      this.carousel.add(hero.id, figure, pedestal);
      const marker = await this.world.assets.instantiate(`hero-${hero.id}`);
      this.markers.set(hero.id, marker);
      const display = { tempest: 'hammer', havoc: 'blaster' }[hero.id as string] ?? `weapon-${hero.id}`;
      this.weaponDisplays.set(hero.id, await this.world.assets.instantiate(display));
    }
    // CONVERGENCE: life-size hologram of every hero.
    for (const hero of HEROES) {
      const figure = await this.world.assets.instantiate(`hero-${hero.id}`);
      const color = new Color(hero.color);
      const body = new MeshBasicMaterial({ color: color.clone().multiplyScalar(0.6), transparent: true, opacity: 0.45, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
      const edge = new MeshBasicMaterial({ color, transparent: true, opacity: 0.7, wireframe: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
      const meshes: Mesh[] = [];
      figure.traverse((o) => {
        if ((o as Mesh).isMesh) meshes.push(o as Mesh);
      });
      for (const mesh of meshes) {
        mesh.material = body;
        mesh.add(new Mesh(mesh.geometry, edge));
      }
      figure.userData.color = color;
      figure.visible = false;
      this.root.add(figure);
      this.holograms.push(figure);
    }
    this.root.add(this.coach.group, this.erasure.mesh);
    this.shield = await this.world.assets.instantiate('shield');
    this.shield.name = 'VanguardShield';
    this.shield.visible = false;
    addOutline(this.shield, 0.05, (m) => m.name === 'Body');
    this.root.add(this.shield);
    // Real models of every arsenal weapon for the armory projector.
    for (const weapon of ARSENAL) this.weaponModels.set(weapon.id, await this.buildWeaponModel(weapon));
    // PSION's props, plus slots that carry lifted aliens.
    for (const kind of ['crate', 'barrel', 'boulder', 'girder', 'crate', 'boulder'] as const) {
      const object = await this.world.assets.instantiate(`debris-${kind}`);
      addOutline(object, 0.03);
      object.visible = false;
      this.root.add(object);
      this.debris.push(this.makeThrowable(object, (object.userData.radius as number | undefined) ?? 0.3));
    }
    for (let k = 0; k < 4; k += 1) this.liftSlots.push(this.makeThrowable(new Group(), 0.3));
    this.showMenu('main');
    this.ready = true;
    this.installDebugHooks();
    void this.loadRealism();
  }

  /** Swaps flat materials for CC0 PBR surface maps once they have loaded. */
  private async loadRealism(): Promise<void> {
    const maps = await loadSurfaceMaps();
    if (maps == null) return;
    for (const drone of this.drones) {
      if (ENEMIES[drone.kind].ground) applyRealism(drone.object, maps, 'skin');
    }
    applyRealism(this.root, maps, 'fabric');
    for (const marker of this.markers.values()) applyRealism(marker, maps, 'fabric');
  }

  private blobMaterial = new MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.5, depthWrite: false });

  private makeBlob(): Mesh {
    if (this.blobMaterial.map == null) this.blobMaterial.map = getGlowTexture();
    const blob = new Mesh(new PlaneGeometry(1, 1), this.blobMaterial);
    blob.rotation.x = -Math.PI / 2;
    blob.visible = false;
    blob.renderOrder = 1;
    this.root.add(blob);
    return blob;
  }

  private findRig(object: Object3D): Rig | null {
    const get = (name: string) => object.getObjectByName(name);
    const legL = get('LegL');
    const legR = get('LegR');
    const kneeL = get('KneeL');
    const kneeR = get('KneeR');
    const armL = get('ArmL');
    const armR = get('ArmR');
    const elbowL = get('ElbowL');
    const elbowR = get('ElbowR');
    const upper = get('Upper');
    if (!legL || !legR || !kneeL || !kneeR || !armL || !armR || !elbowL || !elbowR || !upper) return null;
    return {
      legL,
      legR,
      kneeL,
      kneeR,
      armL,
      armR,
      armLRest: armL.rotation.x,
      armRRest: armR.rotation.x,
      muzzle: get('Muzzle') ?? null,
      elbowL,
      elbowR,
      elbowLRest: elbowL.rotation.x,
      elbowRRest: elbowR.rotation.x,
      upper,
      upperRest: upper.rotation.x,
      bladeBase: get('BladeBase') ?? null,
      bladeTip: get('BladeTip') ?? null,
    };
  }

  /**
   * `?autostart=<stage id>&hero=<hero id>` jumps straight into a mission
   * (for testing and recording); `window.__surge()` reports the game state.
   */
  private installDebugHooks(): void {
    (window as unknown as { __surge: () => object }).__surge = () => ({
      phase: this.run.phase,
      wave: this.run.wave,
      health: this.run.health,
      transmission: this.tx != null,
      script: this.script,
      hero: this.hero,
      erase: Math.round(this.erasure.progress * 100) / 100,
      coach: this.coach.visible,
      screen: this.menus.screen,
      panel: this.panel.visible,
      live: this.powersLive,
      enemies: this.drones.filter((d) => d.state !== 'off').map((d) => `${d.kind}:${d.state}`),
    });
    // Test hook: set the boss to a health fraction (e.g. to reach CONVERGENCE).
    (window as unknown as { __surgeBoss: (f: number) => void }).__surgeBoss = (f: number) => {
      const boss = this.findBoss();
      if (boss) boss.hp = boss.maxHp * f;
    };
    (window as unknown as { __surgeSkip: () => void }).__surgeSkip = () => this.endTransmission();
    (window as unknown as { __surgeClear: () => void }).__surgeClear = () => {
      let k = 0;
      for (const drone of this.drones) {
        if (drone.state === 'off' || drone.kind === 'boss' || drone.kind === 'pod') continue;
        k += 1;
        if (k % 2 === 1) this.markHit('slice', drone.object.position, this.v1.set(1, 0.2, 0), this.v2.set(0, 1, 0));
        this.damageDrone(drone, 999, true);
      }
    };
    const params = new URLSearchParams(window.location.search);
    const screen = params.get('menu');
    if (screen === 'garage' || screen === 'heroes' || screen === 'map' || screen === 'settings' || screen === 'galaxy') {
      const hero = HEROES.find((h) => h.id === params.get('hero'))?.id;
      if (hero) this.menus.hero = hero;
      if (screen === 'garage') this.menus.handle({ id: 'garage', point: this.v1.set(0, 0, 0) });
      this.showMenu(screen);
      return;
    }
    const stage = [...STAGES, PROLOGUE, FINALE].find((s) => s.id === params.get('autostart'));
    if (stage == null) return;
    const hero = (HEROES.find((h) => h.id === params.get('hero'))?.id ?? 'arc') as HeroId;
    if (params.has('skipstory') && !isSagaStage(stage)) {
      this.story = levelStory(stage.world.id, stage.number) ?? null;
      this.launchStage(hero, stage);
    } else this.startStage(hero, stage);
  }

  update(delta: number, time: number): void {
    // One bad frame must never freeze the game: log (throttled) and carry on.
    try {
      this.frame(delta, time);
    } catch (error) {
      if (time - this.lastErrorAt > 2) {
        this.lastErrorAt = time;
        console.error('[Combat] frame error', error);
      }
    }
  }

  private lastErrorAt = -10;

  private frame(delta: number, time: number): void {
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
    this.updateSwords(realDt, time);
    this.updateShield(realDt);
    this.updatePsion(realDt, dt, time);
    this.updateScript(realDt, time);
    if (!this.paused) this.updateTwist(dt, time);
    this.coach.update(realDt, this.head, this.forward);
    this.erasure.update(realDt, time, this.head, this.eraseTarget, this.veilTarget);
    this.updateHammer(realDt, time);
    this.updateBow(realDt);
    this.updateGun(realDt);
    this.updateWebs(realDt, time);
    this.updatePowerups(realDt, dt, time);

    if (!this.paused) {
      const order = this.run.update(dt);
      if (order) this.spawnDrone(order.kind, order.speed);
      this.updateDrones(dt, time);
      this.updateBlobs();
      this.updateBolts(dt);
      this.onPhaseChange();
      this.updateCountdown();
      this.updateTaunts();
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
    this.updateRoomScan(realDt);
    this.carousel.update(realDt, time, this.head);
    this.armory.update(time);
    for (const aura of [this.hammerAura, this.gunAura, this.bowAura]) aura?.update(time);
    if (this.weaponTierNow > 0 && this.powersLive && (this.hero === 'arc' || this.hero === 'talon' || this.hero === 'weaver' || this.hero === 'psion')) {
      // Worn powers: tier sparks swirl around the hands.
      for (const hand of this.hands) {
        if (!hand.tracked || Math.random() > this.weaponTierNow * 0.08) continue;
        this.v1.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.12).add(hand.gauntlet.palmPoint);
        this.v2.set(0, 0.2, 0);
        this.particles.emit(this.v1, this.v2, this.accent, 0.5, 0.5, -0.2);
      }
    }
    this.holomap.update(realDt, time, this.head);
    this.updateMapPoke(realDt);
    this.updateGalaxyPoke(realDt);
    this.galaxy.update(realDt, time);
    this.updateTransmission(realDt);
    this.updateSwipe(realDt);
    if (this.damageMaterial.opacity > 0) {
      this.damageMaterial.opacity = Math.max(0, this.damageMaterial.opacity - realDt * 1.2);
      this.damage.visible = this.damageMaterial.opacity > 0;
    }
    this.blood.update(realDt, this.run.phase === 'fighting' && this.run.health <= 1 ? 1 : this.run.phase === 'fighting' && this.run.health <= 2 ? 0.4 : 0);
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
      if (hand.armTime >= ARM_TIME && this.weaponDef.id === 'arc-beam') {
        this.updateLaser(hand, dt);
        continue;
      }
      if (hand.armTime >= ARM_TIME && hand.cooldown <= 0 && this.weaponDef.id === 'arc-rockets') {
        hand.cooldown = 1.3 * (1 - 0.1 * this.level('arc-rate')) * (this.buffRapid > 0 ? 0.5 : 1);
        this.fireRockets(hand.palm, hand.normal);
        continue;
      }
      if (hand.armTime >= ARM_TIME && hand.cooldown <= 0) {
        hand.cooldown = FIRE_COOLDOWN * (1 - 0.1 * this.level('arc-rate')) * (this.buffRapid > 0 ? 0.5 : 1);
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

  /** Plays the level's intro transmission (if any), then the level. */
  private startStage(hero: HeroId, stage: Stage): void {
    this.autoPrologueAt = -1;
    const saga = isSagaStage(stage);
    if (saga) {
      this.script = stage.id === FINALE.id ? 'finale' : 'prologue';
      hero = this.script === 'finale' ? FINALE_PHASES[0].hero : PROLOGUE_HEROES[0];
      this.story = SAGA_STORY[this.script];
    } else {
      this.endScript();
      this.menus.hero = hero;
      this.story = levelStory(stage.world.id, stage.number) ?? null;
    }
    this.hero = hero;
    this.setTheme(stage.world.id);
    this.music.play(stage.world.id);
    let intro = this.story?.intro ?? [];
    if (!saga && stage.number === 1 && hasUnlock(this.profile, PROLOGUE_DONE)) {
      const chapter = chapterForWorld(stage.world.id);
      if (chapter) intro = [chapterCall(chapter.region, HEROES.find((h) => h.id === hero)!.name), ...intro];
    }
    if (intro.length > 0) this.beginTransmission(intro, () => this.launchStage(hero, stage));
    else this.launchStage(hero, stage);
  }

  /** Starts `stage` with `hero`, applying difficulty, upgrades and skin. */
  private launchStage(hero: HeroId, stage: Stage): void {
    this.hero = hero;
    if (!isSagaStage(stage)) this.menus.hero = hero;
    this.panel.hide();
    this.paused = false;
    this.resultTimer = -1;
    this.lastCount = -1;
    this.taunt = '';
    this.tauntWave = 0;
    for (const drone of this.drones) {
      if (drone.state !== 'off') this.retireDrone(drone);
    }
    for (const bolt of this.bolts) if (bolt.active) this.retireBolt(bolt);
    this.syncMap();
    this.syncArmory();
    this.setTheme(stage.world.id);
    this.music.play(stage.world.id);
    const frenzy = !isSagaStage(stage) && twistFor(stage.id) === 'frenzy';
    this.run.start(stage, {
      maxHealth: maxHealth(this.profile),
      speedScale: DIFFICULTY[this.profile.settings.difficulty].speed * (frenzy ? 1.3 : 1),
      spawnScale: frenzy ? 0.55 : 1,
    });
    this.lastPhase = 'intro';
    this.sfx.wave();
    this.buffRapid = 0;
    this.buffPower = 0;
    this.overdrive = 0;
    for (const pickup of this.pickups) this.retirePickup(pickup);
    this.xCooldown = 0;
    this.resetScript();
    this.equipHero(hero);
    // Each level is its own world, tearing through the room in MR.
    const look = isSagaStage(stage) ? WORLD_LOOKS.oblivion : lookFor(stage.id, stage.world.id);
    this.erasure.setLook(look);
    this.riftLevel = look.rift;
    this.pools.clear();
    this.setTwist(isSagaStage(stage) ? 'none' : twistFor(stage.id));
    this.spawnPods(this.story?.hostages ?? 0);
  }

  /** Equips `hero` (also mid-stage): skin, wrist label, weapon, props, coach tips. */
  private equipHero(hero: HeroId): void {
    this.hero = hero;
    this.weaponDef = equippedWeapon(this.profile, hero);
    this.applySkin();
    this.applyArsenal();
    const def = HEROES.find((h) => h.id === hero)!;
    this.wrist.setHero(`${def.name} | PAUSE`, this.accent);
    if (hero === 'tempest') this.summonHammer();
    // Bow and pistol start in hand (bow in the off hand, pistol in the main hand).
    this.bowHolder = hero === 'orion' ? (this.profile.settings.leftHanded ? 1 : 0) : -1;
    this.bowLoose.recall = -1;
    this.gunHolder = hero === 'havoc' ? (this.profile.settings.leftHanded ? 0 : 1) : -1;
    this.gunLoose.recall = -1;
    this.hideDebris();
    if (hero === 'psion') this.placeDebris();
    this.applyWeaponTier();
    this.teach(HERO_TIPS[hero]);
  }

  /** Queues coach tips; they cycle while the stage runs. */
  private teach(tips: readonly Tip[]): void {
    this.tipQueue = tips;
    this.tipIndex = 0;
    this.tipTimer = 0;
  }

  private applySkin(): void {
    this.accent.set(equippedColor(this.profile, this.hero));
    this.accentHex = `#${this.accent.getHexString()}`;
    this.weaponColor.set(this.weaponDef.hero === this.hero && this.weaponDef.color ? this.weaponDef.color : this.accent);
    this.bow.setColor(this.weaponColor);
    for (const hand of this.hands) {
      hand.gauntlet.setAccent(this.accent);
      hand.gauntlet.setStyle(this.hero);
      hand.claws.setColor(this.weaponColor);
      hand.web.setColor(this.weaponColor);
      hand.sword.setColor(this.weaponColor);
      hand.psi.setColor(this.accent);
      hand.beamMaterial.color.copy(this.accent);
      hand.glow.material.color.copy(this.accent);
    }
  }

  /** Left wrist: pause during a stage, resume when paused, else go back. */
  private wristPressed(): void {
    this.flashes.spawn(this.wrist.center, WHITE, 0.05, 0.3, 0.25);
    // The wrist button always skips a transmission.
    if (this.tx != null || this.menus.screen === 'transmission') {
      this.sfx.click();
      this.endTransmission();
      return;
    }
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
    this.endScript();
    this.paused = false;
    this.resultTimer = -1;
    this.run.toTitle();
    for (const drone of this.drones) {
      if (drone.state !== 'off') this.retireDrone(drone);
    }
    this.tx = null;
    this.hideDebris();
    this.showMenu('map');
  }

  private showMenu(screen: Parameters<GameMenus['open']>[0]): void {
    this.world.camera.getWorldPosition(this.head);
    this.world.camera.getWorldDirection(this.forward);
    this.menus.open(screen);
    this.panel.setContent(this.menus.content());
    this.placePanel();
    this.panel.show();
    this.syncCarousel();
    this.syncMap();
    this.syncArmory();
    this.syncGalaxy();
    if (screen !== 'pause' && screen !== 'transmission') this.music.play('menu');
  }

  /** The hero screen sits low and close so the 3D heroes stay in view. */
  private placePanel(): void {
    if (this.menus.screen === 'heroes') this.panel.place(this.head, this.forward, 0.42, 0.58);
    else if (this.menus.screen === 'map') this.panel.place(this.head, this.forward, 0.55, 0.02);
    else if (this.menus.screen === 'garage') this.panel.place(this.head, this.forward, 0.42, 0.58);
    else if (this.menus.screen === 'galaxy') this.panel.place(this.head, this.forward, 0.8, -0.06);
    else this.panel.place(this.head, this.forward);
  }

  /** Shows the war map only on the map screen, reflecting progress. */
  private syncMap(): void {
    const on = this.panel.visible && this.menus.screen === 'map';
    if (!on) {
      if (this.holomap.visible) this.holomap.hide();
      return;
    }
    const chapter = chapterFor(this.hero);
    this.holomap.build(chapter, equippedColor(this.profile, this.hero), this.markers.get(this.hero) ?? null);
    this.menus.chapterStages().forEach((stage, i) => {
      const unlocked = isStageUnlocked(this.profile, stage);
      const stars = this.profile.stars[stage.id] ?? 0;
      this.holomap.setNode(i, !unlocked ? 'locked' : stars > 0 ? 'cleared' : 'open', stars, `${i + 1}. ${chapter.levels[i].location}`);
    });
    this.holomap.selected = this.menus.mapLevel;
    if (!this.holomap.visible) this.holomap.show(this.head, this.forward);
  }

  /** Poking a node on the war map selects that level. */
  /** Shows the galaxy only on its screen, reflecting every hero's progress. */
  private syncGalaxy(): void {
    const on = this.panel.visible && this.menus.screen === 'galaxy';
    if (!on) {
      if (this.galaxy.visible) this.galaxy.hide();
      return;
    }
    const p = this.profile;
    const nodes = HEROES.map((h) => {
      const chapter = chapterFor(h.id);
      const cleared = [1, 2, 3].filter((n) => (p.stars[`${chapter.worldId}-${n}`] ?? 0) > 0).length;
      const stars = [1, 2, 3].reduce((sum, n) => sum + (p.stars[`${chapter.worldId}-${n}`] ?? 0), 0);
      return { id: h.id, name: h.name, region: chapter.region, color: equippedColor(p, h.id), cleared, stars, owned: p.heroes.includes(h.id), anchor: cleared >= 3 };
    });
    this.galaxy.build(nodes, finaleUnlocked(p), anchorsRecovered(p).length);
    this.galaxy.selected = this.menus.galaxyIndex;
    if (!this.galaxy.visible) this.galaxy.show(this.head, this.forward);
  }

  /** Poking a planet picks that hero's front; the core starts the finale. */
  private updateGalaxyPoke(dt: number): void {
    this.galaxyPokeCooldown -= dt;
    if (!this.galaxy.visible || this.galaxyPokeCooldown > 0) return;
    const index = this.galaxy.poked(this.tips);
    if (index === -2 || index === this.menus.galaxyIndex) return;
    this.galaxyPokeCooldown = 0.4;
    if (index === -1) {
      if (finaleUnlocked(this.profile)) this.startStage('arc', FINALE);
      else this.sfx.denied();
      return;
    }
    this.menus.galaxyIndex = index;
    this.galaxy.selected = index;
    this.v1.copy(this.tips[0] ?? this.head);
    this.flashes.spawn(this.v1, this.accent, 0.02, 0.2, 0.25);
    this.sfx.swap();
    this.panel.setContent(this.menus.content());
  }

  private updateMapPoke(dt: number): void {
    this.mapPokeCooldown -= dt;
    if (!this.holomap.visible || this.mapPokeCooldown > 0) return;
    const index = this.holomap.pokedNode(this.tips);
    if (index < 0 || index === this.menus.mapLevel) return;
    this.mapPokeCooldown = 0.4;
    this.menus.mapLevel = index;
    this.holomap.selected = index;
    this.sfx.click();
    this.panel.setContent(this.menus.content());
  }

  // ---------------------------------------------------------------- story

  /** Shows `lines` as a skippable transmission, then calls `done`. */
  private beginTransmission(lines: readonly Line[], done: () => void): void {
    if (lines.length === 0) {
      done();
      return;
    }
    this.tx = { lines, index: -1, timer: 0, done, full: '', typed: 0, shown: -1, glitch: 0, blink: 0 };
    this.panel.hide();
    this.advanceTransmission();
  }

  private advanceTransmission(): void {
    const tx = this.tx;
    if (tx == null) return;
    tx.index += 1;
    if (tx.index >= tx.lines.length) {
      this.endTransmission();
      return;
    }
    const line = tx.lines[tx.index];
    const chapter = chapterForWorld(this.run.stage.world.id) ?? chapterFor(this.hero);
    const hero = HEROES.find((h) => h.id === this.hero)!;
    const s = line.speaker;
    const name =
      s === 'vex' ? 'WARLORD VEX' : s === 'oblivax' ? OBLIVAX.name : s === 'echo' ? ECHO.name : s === 'villain' ? chapter.villain.name : s === 'hero' ? hero.name : 'CIVILIAN';
    const title =
      s === 'vex' ? 'Herald of the Unmaker' : s === 'oblivax' ? OBLIVAX.title : s === 'echo' ? ECHO.title : s === 'villain' ? chapter.villain.title : s === 'hero' ? hero.power : 'Rescued';
    const color =
      s === 'vex' ? '#C04DFF' : s === 'oblivax' ? OBLIVAX.color : s === 'echo' ? ECHO.color : s === 'villain' ? chapter.villain.color : s === 'hero' ? equippedColor(this.profile, this.hero) : '#FFE58A';
    // The line types itself out; reading time starts once it is complete.
    tx.full = wrap(line.text, 34);
    tx.typed = 0;
    tx.shown = -1;
    tx.glitch = 1;
    tx.timer = 1.4 + tx.full.length * 0.035;
    this.menus.transmission = { speaker: line.speaker, name, title, color, text: '', index: tx.index, total: tx.lines.length, glitch: 1 };
    this.sfx.radio();
    if (this.menus.screen === 'transmission' && this.panel.visible) this.panel.setContent(this.menus.content());
    else this.showMenu('transmission');
  }

  /**
   * Ends the transmission. Hides the panel and runs the follow-up first, so
   * nothing that fails afterwards (e.g. stopping speech) can leave a dead
   * panel on screen. With no transmission running, recovers the menus.
   */
  private endTransmission(): void {
    const tx = this.tx;
    this.tx = null;
    this.panel.hide();
    if (tx == null) {
      if (this.run.phase === 'title') this.showMenu('map');
      return;
    }
    try {
      tx.done();
    } catch (error) {
      console.error('[Combat] transmission follow-up failed', error);
      this.recoverMenus();
    }
  }

  /** NEXT: finish typing the current line, or move to the next one. */
  private nextTransmissionLine(): void {
    const tx = this.tx;
    if (tx == null) return;
    if (tx.typed < tx.full.length) {
      tx.typed = tx.full.length;
      this.renderTransmission(true);
    } else this.advanceTransmission();
  }

  /** Pushes the typed portion of the line (with cursor and glitch) to the panel. */
  private renderTransmission(force = false): void {
    const tx = this.tx;
    const view = this.menus.transmission;
    if (tx == null || view == null) return;
    const count = Math.min(tx.full.length, Math.floor(tx.typed));
    const typing = count < tx.full.length;
    const cursor = typing || Math.floor(tx.blink * 2) % 2 === 0 ? '\u258C' : ' ';
    const text = `${tx.full.slice(0, count)}${cursor}`;
    const glitch = Math.round(tx.glitch * 10) / 10;
    if (!force && text === view.text && glitch === view.glitch) return;
    view.text = text;
    view.glitch = glitch;
    if (this.panel.visible && this.menus.screen === 'transmission') this.panel.setContent(this.menus.content());
  }

  /** Last-resort recovery after an unexpected error: back to the war map. */
  private recoverMenus(): void {
    this.tx = null;
    this.paused = false;
    this.resultTimer = -1;
    try {
      if (this.run.phase !== 'title') this.run.toTitle();
      this.showMenu('map');
    } catch (error) {
      console.error('[Combat] menu recovery failed', error);
      this.panel.hide();
    }
  }

  private updateTransmission(dt: number): void {
    // Watchdog: a transmission panel with nothing playing must never linger.
    if (this.tx == null) {
      if (this.panel.visible && this.menus.screen === 'transmission') this.endTransmission();
      return;
    }
    if (this.paused) return;
    const tx = this.tx;
    tx.glitch = Math.max(0, tx.glitch - dt * 2.5);
    if (tx.typed < tx.full.length) {
      // Typewriter: about 32 characters a second, with soft key clicks.
      const before = Math.floor(tx.typed);
      tx.typed = Math.min(tx.full.length, tx.typed + dt * 32);
      const after = Math.floor(tx.typed);
      if (after - tx.shown >= 2 || after >= tx.full.length) {
        tx.shown = after;
        if (after > before && tx.full[after - 1] !== ' ') this.sfx.tick();
        this.renderTransmission();
      }
      return;
    }
    tx.blink += dt;
    this.renderTransmission();
    tx.timer -= dt;
    if (tx.timer > 0) return;
    try {
      this.advanceTransmission();
    } catch (error) {
      console.error('[Combat] transmission failed', error);
      this.endTransmission();
    }
  }

  /** The villain shouts at the start of each later wave. */
  private updateTaunts(): void {
    const run = this.run;
    if (this.story == null || run.phase !== 'intro' || run.wave === 0 || run.wave === this.tauntWave) return;
    this.tauntWave = run.wave;
    const taunts = this.story.taunts;
    this.taunt = taunts[(run.wave - 1) % taunts.length];
  }

  /** Shows the hero carousel only on the hero screen, in sync with its focus. */
  /**
   * Room-scan sweep on entering MR: every detected wall and surface lights
   * up as a pulsing hologram grid for a few seconds, then fades away.
   */
  private updateRoomScan(dt: number): void {
    if (this.scanTime < 0) return;
    this.scanTime += dt;
    if (!this.isPassthrough()) {
      if (this.scanTime > 1) this.scanTime = -1;
      return;
    }
    const duration = 4;
    const done = this.scanTime >= duration;
    let walls = 0;
    let surfaces = 0;
    for (const entity of this.queries.planes.entities) {
      const plane = entity.getValue(XRPlane, '_plane') as XRPlane | undefined;
      const mesh = entity.object3D as Mesh | undefined;
      if (plane == null || mesh == null || !(mesh as Mesh).isMesh) continue;
      if (plane.orientation === 'vertical') walls += 1;
      else surfaces += 1;
      if (done) {
        if (mesh.userData.scanOriginal) {
          mesh.material = mesh.userData.scanOriginal;
          mesh.userData.scanOriginal = undefined;
          mesh.visible = false;
        }
        continue;
      }
      if (!mesh.userData.scanOriginal) mesh.userData.scanOriginal = mesh.material;
      mesh.material = this.scanMaterial;
      mesh.visible = true;
    }
    const t = this.scanTime / duration;
    this.scanMaterial.opacity = (1 - t) * (0.55 + 0.35 * Math.sin(this.scanTime * 14));
    if (this.scanTime - dt < 0.8 && this.scanTime >= 0.8 && walls + surfaces > 0) {
      this.v1.copy(this.head).addScaledVector(this.forward, 1.2);
      this.comic.pop('ROOM SCANNED!', this.v1, CYAN, 0.7);
      this.sfx.radio();
    }
    if (done) this.scanTime = -1;
  }

  /** Shows the holographic armory only on the garage screen. */
  private syncArmory(): void {
    const on = this.panel.visible && this.menus.screen === 'garage';
    if (!on) {
      if (this.armory.visible) this.armory.hide();
      return;
    }
    const hero = this.menus.garageHeroId;
    const id = this.menus.garageWeaponId;
    const def = ARSENAL.find((w) => w.id === id);
    const model = this.weaponModels.get(id) ?? this.weaponDisplays.get(hero);
    if (model) this.armory.setWeapon(id, model, def?.color ?? equippedColor(this.profile, hero), weaponTier(this.profile, hero));
    if (!this.armory.visible) this.armory.show(this.head, this.forward);
  }

  /** Weapon tier visuals in a mission: auras on held weapons, sparks on hands. */
  private applyWeaponTier(): void {
    this.weaponTierNow = weaponTier(this.profile, this.hero);
    for (const aura of [this.hammerAura, this.gunAura, this.bowAura]) aura?.set(this.weaponTierNow, this.accent);
  }

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
  /**
   * Carousel swipe: one deliberate sideways stroke of an open hand steps
   * exactly one hero. A stroke has to travel 12 cm at speed; the hand must
   * then slow down before another stroke counts, and the return stroke the
   * other way is ignored for a moment. Pokes (index only) never swipe.
   */
  private updateSwipe(dt: number): void {
    this.swipeCooldown -= dt;
    if (!this.carousel.visible || dt <= 0) return;
    this.v3.set(-this.forward.z, 0, this.forward.x).normalize();
    for (let i = 0; i < this.hands.length; i += 1) {
      const hand = this.hands[i];
      const point = hand.gauntlet.palmPoint;
      if (!hand.pose.tracked) {
        this.swipeValid[i] = false;
        this.swipeStroke[i] = 0;
        continue;
      }
      const prev = this.swipePrev[i];
      const speed = this.v4.subVectors(point, prev).dot(this.v3) / dt;
      const valid = this.swipeValid[i];
      prev.copy(point);
      this.swipeValid[i] = true;
      if (!valid) continue;
      if (this.swipeLatched[i]) {
        this.swipeStill[i] = Math.abs(speed) < 0.35 ? this.swipeStill[i] + dt : 0;
        if (this.swipeStill[i] > 0.12) this.swipeLatched[i] = false;
        continue;
      }
      if (!isOpenPalm(hand.joints) || point.distanceTo(this.head) > 0.8 || Math.abs(speed) < 0.4) {
        this.swipeStroke[i] = 0;
        continue;
      }
      // Accumulate while moving one way; a change of direction starts over.
      if (this.swipeStroke[i] !== 0 && Math.sign(speed) !== Math.sign(this.swipeStroke[i])) this.swipeStroke[i] = 0;
      this.swipeStroke[i] += speed * dt;
      const stroke = this.swipeStroke[i];
      if (Math.abs(stroke) < 0.12 || Math.abs(speed) < 0.8) continue;
      const dir = Math.sign(stroke);
      this.swipeStroke[i] = 0;
      this.swipeLatched[i] = true;
      this.swipeStill[i] = 0;
      if (dir === -this.swipeDir && this.swipeCooldown > 0) continue;
      this.swipeDir = dir;
      this.swipeCooldown = 0.7;
      if (this.menus.moveFocus(dir < 0 ? 1 : -1)) {
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
    try {
      handle();
    } catch (error) {
      console.error('[Combat] menu action failed', error);
      this.recoverMenus();
      return;
    }
    if (!this.panel.visible) {
      this.syncCarousel();
      this.syncMap();
      this.syncArmory();
      this.syncGalaxy();
      return;
    }
    if (this.menus.screen !== before) this.placePanel();
    this.panel.setContent(this.menus.content());
    this.syncCarousel();
    this.syncMap();
    this.syncArmory();
    this.syncGalaxy();
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
    if (isSagaStage(run.stage)) {
      this.finishFinale(won);
      return;
    }
    const reward = recordResult(this.profile, run.stage, {
      won,
      health: run.health,
      maxHealth: run.maxHealth,
      killCoins: run.coins,
      hostagesSaved: this.hostagesSaved,
      hostagesTotal: this.hostagesTotal,
    });
    saveProfile(this.profile);
    const info = { won, stage: run.stage, reward, score: run.score, kills: run.kills, bestCombo: run.bestCombo, saved: this.hostagesSaved, hostages: this.hostagesTotal };
    if (won && this.story) {
      let outro = this.story.outro;
      const chapter = chapterForWorld(run.stage.world.id);
      if (run.stage.number === 3 && chapter && hasUnlock(this.profile, PROLOGUE_DONE)) {
        outro = [...outro, anchorLine(chapter.region, anchorsRecovered(this.profile).length)];
      }
      this.beginTransmission(outro, () => this.presentResults(info));
      return;
    }
    this.presentResults(info);
  }

  private presentResults(info: Parameters<GameMenus['showResults']>[0]): void {
    if (info.reward.coins > 0) this.sfx.coin();
    if (info.reward.unlocked) this.sfx.victory();
    this.menus.showResults(info);
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
      } else if (ambient === 'snow') {
        // Slow drifting snowfall.
        this.v1.y = 2.5 + Math.random();
        this.v2.set((Math.random() - 0.5) * 0.2, -0.35 - Math.random() * 0.2, (Math.random() - 0.5) * 0.2);
        this.particles.emit(this.v1, this.v2, WHITE, 7, 0, 0);
      } else if (ambient === 'void') {
        // Glitch motes rising toward the rift.
        this.v2.set((Math.random() - 0.5) * 0.4, 0.4 + Math.random() * 0.6, (Math.random() - 0.5) * 0.4);
        this.particles.emit(this.v1, this.v2, Math.random() < 0.5 ? VIOLET : GREEN, 3, 0, 0);
      } else if (ambient === 'petals') {
        // Blossom petals drifting down through the moonlight.
        this.v1.y = 2.2 + Math.random() * 1.2;
        this.v2.set(0.4 + Math.random() * 0.3, -0.3 - Math.random() * 0.2, (Math.random() - 0.5) * 0.3);
        this.particles.emit(this.v1, this.v2, Math.random() < 0.75 ? BLOSSOM : WHITE, 7, 0, 0);
      } else if (ambient === 'motes') {
        // Pebbles and psychic motes floating up into the sky.
        this.v1.y = Math.random() * 0.8;
        this.v2.set((Math.random() - 0.5) * 0.1, 0.12 + Math.random() * 0.15, (Math.random() - 0.5) * 0.1);
        this.particles.emit(this.v1, this.v2, Math.random() < 0.5 ? PSI : MINT, 9, 0, 0);
      } else if (ambient === 'dust') {
        // Low, wind-blown dust.
        this.v1.y = Math.random() * 1.2;
        this.v2.set(2 + Math.random(), 0.05, (Math.random() - 0.5) * 0.4);
        this.particles.emit(this.v1, this.v2, Math.random() < 0.6 ? GOLD : EMBER, 2.5, 0, 0);
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
  /**
   * Height of the surface under `point`: the highest detected horizontal
   * plane (real table, desk or floor in MR) beneath it, else the floor (0).
   */
  private surfaceBelow(point: Vector3): number {
    let best = 0;
    for (const entity of this.queries.planes.entities) {
      const plane = entity.getValue(XRPlane, '_plane') as XRPlane | undefined;
      const object = entity.object3D;
      if (plane == null || object == null || plane.orientation !== 'horizontal') continue;
      object.getWorldPosition(this.v4);
      if (this.v4.y > point.y + 0.02 || this.v4.y <= best) continue;
      this.v3.copy(point);
      object.worldToLocal(this.v3);
      let minX = Infinity;
      let maxX = -Infinity;
      let minZ = Infinity;
      let maxZ = -Infinity;
      for (const corner of plane.polygon) {
        minX = Math.min(minX, corner.x);
        maxX = Math.max(maxX, corner.x);
        minZ = Math.min(minZ, corner.z);
        maxZ = Math.max(maxZ, corner.z);
      }
      if (this.v3.x >= minX && this.v3.x <= maxX && this.v3.z >= minZ && this.v3.z <= maxZ) best = this.v4.y;
    }
    return best;
  }

  /** Centre of the tube formed by the curled fingers of hand `index`. */
  private gripPoint(index: number, out: Vector3): Vector3 {
    const pose = this.hands[index].pose;
    pose.position(7, this.v1);
    pose.position(22, this.v2);
    out.addVectors(this.v1, this.v2);
    pose.position(12, this.v1);
    pose.position(17, this.v2);
    return out.add(this.v1).add(this.v2).multiplyScalar(0.25).lerp(this.hands[index].gauntlet.palmPoint, 0.35);
  }

  /**
   * Shared physics for a loose weapon: recalled toward an open palm, or
   * falling under gravity until it rests flat on the surface beneath it.
   * Returns the hand index that caught it, or -1.
   */
  private updateLoose(loose: { position: Vector3; velocity: Vector3; quaternion: Quaternion; resting: boolean; recall: number }, dt: number, restHeight: number, lie: Quaternion): number {
    if (loose.recall >= 0) {
      const hand = this.hands[loose.recall];
      if (!hand.tracked) {
        loose.recall = -1;
        return -1;
      }
      this.v1.subVectors(hand.gauntlet.palmPoint, loose.position);
      const distance = this.v1.length();
      if (distance < 0.12) {
        const caught = loose.recall;
        loose.recall = -1;
        return caught;
      }
      loose.position.addScaledVector(this.v1.normalize(), Math.min(distance, (6 + distance * 6) * dt));
      loose.resting = false;
      return -1;
    }
    if (!loose.resting) {
      loose.velocity.y -= 9.8 * dt;
      loose.position.addScaledVector(loose.velocity, dt);
      const floor = this.surfaceBelow(loose.position) + restHeight;
      if (loose.position.y <= floor) {
        loose.position.y = floor;
        loose.velocity.set(0, 0, 0);
        loose.resting = true;
        loose.quaternion.copy(lie);
        this.particles.burst(loose.position, WHITE, 12, 0.6, 0.3, this.v2);
        this.sfx.catchHammer();
      }
    }
    // Pick it up with a fist, or call it with an open palm aimed at it.
    for (let i = 0; i < this.hands.length; i += 1) {
      const hand = this.hands[i];
      if (!hand.tracked) continue;
      const near = hand.gauntlet.palmPoint.distanceTo(loose.position);
      if (near < 0.35 && this.isGripping(i)) return i;
      if (near > 0.45 && isOpenPalm(hand.joints)) {
        this.v1.subVectors(loose.position, hand.gauntlet.palmPoint).normalize();
        if (this.v1.dot(hand.gauntlet.palmNormal) > 0.65) {
          loose.recall = i;
          this.sfx.portal();
        }
      }
    }
    return -1;
  }

  // ---------------------------------------------------------------- HAVOC

  private updateGun(dt: number): void {
    const gun = this.blaster;
    if (gun == null) return;
    const active = this.powersLive && this.hero === 'havoc';
    gun.visible = active;
    if (!active) return;
    this.gunCooldown -= dt;
    this.gunKick = Math.max(0, this.gunKick - dt * 8);
    if (this.gunHolder < 0) {
      this.lieQuat.setFromEuler(this.lieEuler.set(0, 0, Math.PI / 2));
      const caught = this.updateLoose(this.gunLoose, dt, 0.02, this.lieQuat);
      gun.position.copy(this.gunLoose.position);
      gun.quaternion.copy(this.gunLoose.quaternion);
      if (caught >= 0) {
        this.gunHolder = caught;
        this.triggerArmed = false;
        this.sfx.catchHammer();
      }
      return;
    }
    const hand = this.hands[this.gunHolder];
    if (!hand.tracked) {
      gun.visible = false;
      return;
    }
    const e = fingerExtension(hand.joints);
    // Let go: middle and ring fingers open.
    if (e[1] > 1.65 && e[2] > 1.65) this.gunOpen += dt;
    else this.gunOpen = 0;
    if (this.gunOpen > 0.3) {
      this.gunHolder = -1;
      this.gunLoose.position.copy(gun.position);
      this.gunLoose.velocity.set(0, 0, 0);
      this.gunLoose.quaternion.copy(gun.quaternion);
      this.gunLoose.resting = false;
      return;
    }
    // Barrel along the back-of-hand line, top along the back of the hand.
    const pose = hand.pose;
    pose.position(J.wrist, this.v1);
    pose.position(J.middleProx, this.v2);
    this.hz.subVectors(this.v2, this.v1).normalize();
    pose.quaternion(J.middleMeta, this.hammerQuat);
    this.hy.set(0, 1, 0).applyQuaternion(this.hammerQuat);
    this.hy.addScaledVector(this.hz, -this.hy.dot(this.hz)).normalize();
    this.hx.crossVectors(this.hy, this.hz);
    this.basis.makeBasis(this.hx, this.hy, this.hz);
    gun.quaternion.setFromRotationMatrix(this.basis);
    gun.rotateX(-this.gunKick * 0.5);
    this.gripPoint(this.gunHolder, gun.position);
    // Trigger: curl the index finger; holding it curled keeps firing.
    const curled = e[0] < 1.4;
    if (e[0] > 1.6) this.triggerArmed = true;
    const type = this.weaponDef.id;
    // Minigun barrels spin up while the trigger is held.
    this.gunSpin = type === 'havoc-minigun' ? Math.max(0, Math.min(1, this.gunSpin + (curled ? dt * 2 : -dt))) : 0;
    const barrels = gun.getObjectByName('Barrels');
    if (barrels) barrels.rotation.z += dt * this.gunSpin * 45;
    const pump = gun.getObjectByName('Pump');
    if (pump) pump.position.z = 0.24 - Math.max(0, this.gunCooldown - 0.45) * 0.25;
    const base = type === 'havoc-smg' ? 0.085 : type === 'havoc-shotgun' ? 0.8 : type === 'havoc-minigun' ? 0.05 : 0.34;
    const auto = base * (1 - 0.1 * this.level('havoc-rate')) * (this.buffRapid > 0 ? 0.5 : 1);
    const ready = type !== 'havoc-minigun' || this.gunSpin > 0.6;
    if (curled && ready && this.gunCooldown <= 0) {
      this.triggerArmed = false;
      this.gunCooldown = auto;
      this.shootGun();
    }
  }

  private shootGun(): void {
    const gun = this.blaster!;
    gun.updateMatrixWorld();
    this.blasterMuzzle!.getWorldPosition(this.v3);
    this.v4.set(0, 0, 1).transformDirection(gun.matrixWorld);
    const type = this.weaponDef.id;
    const pellets = type === 'havoc-shotgun' ? 7 : 1;
    const spread = type === 'havoc-shotgun' ? 0.09 : type === 'havoc-smg' ? 0.035 : type === 'havoc-minigun' ? 0.05 : 0;
    const damage = (type === 'havoc-shotgun' ? 1 : type === 'havoc-pistol' ? 1 + Math.floor(this.level('havoc-damage') / 2) : 0.5) * (1 + 0.15 * this.level('havoc-damage'));
    this.sa.copy(this.v4);
    for (let k = 0; k < pellets; k += 1) {
      this.sb.copy(this.sa);
      if (spread > 0) this.sb.add(this.sc.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(spread * 2)).normalize();
      const bolt = this.fire(this.v3, this.sb, true);
      if (bolt) {
        bolt.damage = damage;
        bolt.pierceLeft = this.level('havoc-pierce') > 0 ? Math.ceil(this.level('havoc-pierce') / 2) : 0;
        if (spread > 0) bolt.target = null;
      }
    }
    this.gunKick = type === 'havoc-shotgun' ? 2.2 : type === 'havoc-pistol' ? 1 : 0.35;
    this.flashes.spawn(this.v3, this.weaponColor, 0.05, type === 'havoc-shotgun' ? 0.6 : 0.3, 0.12);
    this.particles.burst(this.v3, this.weaponColor, type === 'havoc-shotgun' ? 20 : 6, 1.2, 0.15, this.v2);
    if (type === 'havoc-shotgun') this.sfx.shotgun();
    else if (type === 'havoc-pistol') this.sfx.blast();
    else if ((this.gunShots += 1) % 2 === 0) this.sfx.rattle();
  }

  private updateBow(dt: number): void {
    const active = this.powersLive && this.hero === 'orion';
    if (!active) {
      this.bow.group.visible = false;
      this.drawing = false;
      return;
    }
    if (this.bowHolder < 0) {
      this.drawing = false;
      this.lieQuat.setFromEuler(this.lieEuler.set(-Math.PI / 2, 0, 0));
      const caught = this.updateLoose(this.bowLoose, dt, 0.03, this.lieQuat);
      this.bow.showFree(this.bowLoose.position, this.bowLoose.quaternion);
      if (caught >= 0) this.bowHolder = caught;
      return;
    }
    const bowIndex = this.bowHolder;
    const drawIndex = 1 - bowIndex;
    const bowHand = this.hands[bowIndex];
    if (!bowHand.tracked) {
      this.bow.group.visible = false;
      this.drawing = false;
      return;
    }
    // Let go: an open bow hand (while not drawing) drops the bow.
    if (!this.drawing && isOpenPalm(bowHand.joints)) this.bowOpen += dt;
    else this.bowOpen = 0;
    if (this.bowOpen > 0.35) {
      this.bowHolder = -1;
      this.bowLoose.position.copy(this.bow.group.position);
      this.bowLoose.velocity.set(0, 0, 0);
      this.bowLoose.quaternion.copy(this.bow.group.quaternion);
      this.bowLoose.resting = false;
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
      if (!this.drawing && pinch < PINCH_DISTANCE * 1.4 && this.nock.distanceTo(this.bow.restNock) < NOCK_REACH) {
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
    const extra = Math.max(fullDraw ? this.level('orion-volley') : 0, this.weaponDef.id === 'orion-volley' ? 2 : 0);
    for (let k = 0; k <= extra; k += 1) {
      const bolt = this.bolts.find((b) => !b.active);
      if (bolt == null) break;
      this.v4.copy(this.bow.aim);
      if (k > 0) {
        this.v1.set(0, 1, 0).cross(this.v4).normalize();
        this.v4.addScaledVector(this.v1, (k % 2 === 1 ? 1 : -1) * 0.07 * Math.ceil(k / 2)).normalize();
      }
      bolt.kind = 'arrow';
      bolt.blast = this.weaponDef.id === 'orion-blast' ? 1.2 : 0;
      bolt.zap = this.weaponDef.id === 'orion-storm';
      bolt.burn = 0;
      bolt.homing = 1;
      bolt.radius = 0.05;
      bolt.damage = fullDraw ? 2 : 1;
      bolt.speed = speed;
      bolt.pierceLeft = this.weaponDef.id === 'orion-storm' ? 99 : this.level('orion-pierce') + (fullDraw ? 1 : 0);
      bolt.gravity = ARROW_GRAVITY * (1 - power * 0.6);
      bolt.target = null;
      if (this.profile.settings.aimAssist) {
        let best = 0.95;
        for (const drone of this.drones) {
          if (drone.state === 'off' || drone.kind === 'pod') continue;
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
          if (hand.webCooldown <= 0) {
            // Web-shooter pose, or thrust an open palm at them.
            if (isWebPose(hand.joints)) this.shootWeb(index, false);
            else if (isOpenPalm(hand.joints) && this.v2.dot(hand.gauntlet.palmNormal) > 1.3) this.shootWeb(index, true);
          }
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
            // Splat: the glob hits like a bullet and wraps them up.
            this.flashes.spawn(hit.object.position, WHITE, 0.1, 0.7, 0.2);
            this.particles.burst(hit.object.position, WHITE, 30, 2.2, 0.35, this.v1);
            this.markHit('blast', hit.object.position, hand.webVelocity);
            hit.snare = 4 + 0.8 * this.level('weaver-snare');
            hand.webTarget = hit;
            hand.webState = 'tethered';
            hand.webTime = 0;
            this.particles.burst(hit.object.position, WHITE, 20, 1.5, 0.3, this.v1);
            this.sfx.splat();
            if (this.weaponDef.id === 'weaver-electro') hit.shock = 5;
            if (this.weaponDef.id === 'weaver-burst') this.webNet(hit);
            this.damageDrone(hit, 2);
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
          // Yank: fist and pull back toward the body rips them apart.
          this.v1.subVectors(this.head, target.object.position).normalize();
          if (isFist(hand.joints) && this.v2.dot(this.v1) > YANK_SPEED) {
            this.yank(hand, target);
            break;
          }
          // Fling: whip the hand any way and the webbed enemy goes flying.
          const whip = this.v2.length();
          if (!isFist(hand.joints) && whip > 1.8 && hand.webTime > 0.15 && ENEMIES[target.kind].ground) {
            this.v1.copy(this.v2).normalize().multiplyScalar(Math.min(15, Math.max(7, whip * 5)));
            this.v1.y += 2.5;
            if (this.flingDrone(target, this.v1)) {
              this.sfx.yank();
              this.comic.pop('YOINK!', this.v4.copy(target.object.position).setY(target.object.position.y + 0.4), this.accent, 0.4);
              hand.webTarget = null;
              hand.webState = 'retracting';
            }
          }
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

  private shootWeb(index: number, fromPalm: boolean): void {
    const hand = this.hands[index];
    this.webAim(index, this.v3, this.v4);
    if (fromPalm) {
      this.v3.copy(hand.gauntlet.palmPoint);
      this.v4.copy(hand.gauntlet.palmNormal);
    }
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
    hand.webCooldown = WEB_COOLDOWN * (this.buffRapid > 0 ? 0.5 : 1);
    this.sfx.thwip();
  }

  /** Rips a webbed enemy apart; the blast hurts enemies around it. */
  private yank(hand: HandState, target: Drone): void {
    const damage = 5 + this.level('weaver-yank');
    this.v1.copy(target.object.position);
    this.sfx.yank();
    this.flashes.spawn(this.v1, this.accent, 0.1, 0.9, 0.3);
    this.particles.burst(this.v1, WHITE, 40, 3, 0.5, this.v2);
    target.snare = 0;
    this.damageDrone(target, damage);
    for (const drone of this.drones) {
      if (drone === target || drone.state === 'off') continue;
      if (drone.object.position.distanceTo(this.v1) < 1.3) this.damageDrone(drone, 3);
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
    this.hammerHover = true;
    this.hammerResting = false;
    this.hammerVelocity.set(0, 0, 0);
    this.flashes.spawn(this.hammer.position, VIOLET, 0.1, 0.6, 0.4);
    this.lightningFx.strike(this.head, this.hammer.position, VIOLET);
  }

  private isGripping(index: number): boolean {
    const hand = this.hands[index];
    if (!hand.tracked) return false;
    if (isFist(hand.joints)) return true;
    const e = fingerExtension(hand.joints);
    if ((e[0] + e[1] + e[2] + e[3]) / 4 < 1.5) return true;
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
        if (this.hammerHover) {
          // Freshly summoned: hover until first grabbed.
          hammer.position.y += Math.sin(time * 2) * 0.03 * dt;
          hammer.rotation.y += dt * 0.6;
        } else if (!this.hammerResting) {
          // Dropped: fall and settle flat on the floor or a real surface.
          this.hammerFall.y -= 9.8 * dt;
          hammer.position.addScaledVector(this.hammerFall, dt);
          hammer.rotateX(dt * 4);
          const floor = this.surfaceBelow(hammer.position) + 0.055;
          if (hammer.position.y <= floor) {
            hammer.position.y = floor;
            this.hammerFall.set(0, 0, 0);
            this.hammerResting = true;
            hammer.rotation.set(0, hammer.rotation.y, Math.PI / 2);
            this.particles.burst(hammer.position, VIOLET, 20, 0.8, 0.4, this.v2);
            this.sfx.catchHammer();
          }
        }
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
        this.hammerLetGo = this.isGripping(i) ? 0 : this.hammerLetGo + dt;
        if (this.hammerLetGo > 0.06) {
          this.hammerLetGo = 0;
          const speed = this.hammerVelocity.length();
          if (speed > HAMMER_THROW_MIN) this.throwHammer(speed);
          else this.dropHammer(this.hammerVelocity, 0.5);
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
        else if (!isOpenPalm(hand.joints) && this.hammerTime > 0.6) this.dropHammer(this.hammerVelocity.set(0, 0, 0), 0);
        break;
      }
      case 'flying': {
        this.hammerVelocity.y -= 2.5 * dt;
        hammer.position.addScaledVector(this.hammerVelocity, dt);
        hammer.rotateX(-dt * 18);
        if (this.hammerTime > HAMMER_FLIGHT || hammer.position.distanceTo(this.head) > 14) {
          this.dropHammer(this.hammerVelocity, 0.3);
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
      const fire = this.weaponDef.id === 'tempest-inferno';
      this.particles.emit(this.hammerHeadPos, this.v2.set(0, fire ? 0.6 : 0, 0), Math.random() < 0.3 ? WHITE : this.weaponColor, fire ? 0.6 : 0.35, 0, fire ? -0.4 : 0);
      if (this.weaponDef.id === 'tempest-thunder' && Math.random() < (moving ? 0.25 : 0.08)) {
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
        const hammerType = this.weaponDef.id;
        if (hammerType === 'tempest-inferno') drone.burn = Math.max(drone.burn, 4);
        this.damageDrone(drone, (this.hammerState === 'flying' ? 3 : 2) + Math.floor(this.level('tempest-impact') / 2) + (hammerType === 'tempest-godbreaker' ? 1 : 0));
        if (hammerType === 'tempest-thunder') this.chainLightning(this.v1, drone);
        else if (hammerType === 'tempest-inferno') this.explodeAt(this.v1, 1.1, 1);
        else this.quake(this.v1);
        if (this.hammerState === 'flying') this.hammerVelocity.multiplyScalar(0.8);
      }
    }
  }

  /** Lets the hammer go: it falls (with some of `velocity`) and settles. */
  private dropHammer(velocity: Vector3, keep: number): void {
    this.hammerState = 'floating';
    this.hammerHover = false;
    this.hammerResting = false;
    this.hammerFall.copy(velocity).multiplyScalar(keep);
  }

  private grabHammer(index: number): void {
    this.hammerHover = false;
    this.hammerResting = false;
    this.hammerHand = index;
    this.hammerState = 'gripped';
    this.hammerTime = 0;
    this.hammerVelocity.set(0, 0, 0);
    this.sfx.catchHammer();
  }

  private throwHammer(speed: number): void {
    const boosted = Math.min(16, Math.max(7, speed * 2.4));
    if (this.profile.settings.aimAssist && this.hammer) {
      this.v1.copy(this.hammerVelocity).normalize();
      let best = 0.85;
      for (const drone of this.drones) {
        if (drone.state === 'off' || drone.state === 'emerging' || drone.kind === 'pod' || drone.kind === 'orb') continue;
        const cos = this.v2.subVectors(drone.object.position, this.hammer.position).normalize().dot(this.v1);
        if (cos > best) {
          best = cos;
          this.v3.copy(this.v2);
        }
      }
      if (best > 0.85) this.hammerVelocity.copy(this.v3);
    }
    this.hammerVelocity.setLength(boosted);
    this.hammerState = 'flying';
    this.hammerTime = 0;
    this.sfx.crescent();
    this.flashes.spawn(this.hammer!.position, VIOLET, 0.1, 0.5, 0.2);
  }

  private recallHammer(index: number): void {
    this.hammerResting = false;
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
      claws.lengthScale = (1 + 0.12 * this.level('talon-reach')) * (this.weaponDef.id === 'talon-phase' ? 1.35 : 1);
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
      hand.tipVel.copy(this.v3).divideScalar(dt);
      const index = this.hands.indexOf(hand);
      if (hand.skewer == null) this.tryImpale(index, claws.base, claws.tip, claws.direction);


      for (const drone of this.drones) {
        if (drone.state === 'off' || drone.state === 'emerging' || this.elapsed - drone.bladeHitAt < 0.25) continue;
        if (!this.bladeHits(drone, claws.base, claws.tip, hand.prevTip)) continue;
        drone.bladeHitAt = this.elapsed;
        this.sfx.slash();
        this.v4.subVectors(claws.tip, hand.prevTip);
        this.v2.crossVectors(this.v4, claws.direction);
        this.markHit('slice', this.hitPoint, this.v4, this.v2);
        if (this.weaponDef.id === 'talon-molten') drone.burn = Math.max(drone.burn, 3);
        this.damageDrone(drone, 2);
      }

      this.checkParry(claws.base, claws.tip);
      if (speed > CRESCENT_MIN_SWING && hand.slashCooldown <= 0) {
        hand.slashCooldown = CRESCENT_COOLDOWN * (1 - 0.12 * this.level('talon-tempo')) * (this.buffRapid > 0 ? 0.5 : 1);
        this.v4.subVectors(claws.tip, hand.prevTip).normalize();
        this.fireCrescent(claws.tip, this.v4, claws.direction);
      }
      hand.prevTip.copy(claws.tip);
    }
  }

  /** Slash wave; radius/damage/scale default to TALON's (with upgrades). */
  private fireCrescent(origin: Vector3, direction: Vector3, bladeDirection: Vector3, radius?: number, damage?: number, scale = 1, quiet = false): void {
    const bolt = this.bolts.find((b) => !b.active);
    if (bolt == null) return;
    bolt.kind = 'crescent';
    bolt.blast = 0;
    bolt.zap = false;
    bolt.burn = this.weaponDef.id === 'ronin-flame' || this.weaponDef.id === 'talon-molten' ? 3 : 0;
    bolt.homing = 1;
    bolt.radius = radius ?? 0.24 + 0.03 * this.level('talon-wave');
    bolt.damage = damage ?? 2 + Math.floor(this.level('talon-wave') / 2);
    bolt.scale = scale;
    bolt.speed = CRESCENT_SPEED;
    bolt.target = null;
    bolt.bolt.visible = false;
    bolt.crescent.visible = true;
    bolt.arrow.visible = false;
    bolt.pierceLeft = 99;
    bolt.gravity = 0;
    bolt.crescent.scale.setScalar(scale);
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
    if (quiet) return;
    this.flashes.spawn(origin, this.accent, 0.05, 0.35, 0.18);
    this.sfx.crescent();
  }

  // ---------------------------------------------------------------- arsenal

  /** Builds the armory's real model of `weapon` (cloned, own materials). */
  private async buildWeaponModel(weapon: WeaponDef): Promise<Object3D> {
    const asset =
      weapon.id === 'havoc-pistol'
        ? 'blaster'
        : weapon.hero === 'havoc'
          ? `gun-${weapon.id.slice(6)}`
          : weapon.hero === 'tempest'
            ? 'hammer'
            : `weapon-${weapon.hero}`;
    const model = await this.world.assets.instantiate(asset);
    if (weapon.hero === 'tempest') this.paintHammer(model, weapon.id);
    else if (weapon.color) this.tint(model, weapon.color);
    if (weapon.id === 'ronin-void' || weapon.id === 'talon-phase') model.scale.setScalar(1.2);
    return model;
  }

  /** Recolours every glowing part of `model` (materials cloned first). */
  private tint(model: Object3D, color: string): void {
    model.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      const m = mesh.material as unknown as MeshStandardMaterialLike;
      if (!m.emissive || (m.emissiveIntensity ?? 0) < 1.5) return;
      const copy = (m as unknown as { clone(): MeshStandardMaterialLike }).clone();
      copy.color.set(color);
      copy.emissive?.set(color);
      mesh.material = copy as unknown as Mesh['material'];
    });
  }

  /**
   * Hammer looks: THUNDERCLAP (violet runes), INFERNO (charred head, fire
   * runes), GODBREAKER (gold, bigger). Materials are cloned once per model.
   */
  private paintHammer(model: Object3D, id: string): void {
    model.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      let m = mesh.material as unknown as MeshStandardMaterialLike;
      if (!mesh.userData.painted) {
        m = (m as unknown as { clone(): MeshStandardMaterialLike }).clone();
        mesh.material = m as unknown as Mesh['material'];
        mesh.userData.painted = true;
        mesh.userData.base = { color: m.color.getHex(), emissive: m.emissive?.getHex() ?? 0 };
      }
      const base = mesh.userData.base as { color: number; emissive: number };
      const glowing = (m.emissiveIntensity ?? 0) >= 1.5;
      m.color.setHex(base.color);
      if (m.emissive) m.emissive.setHex(base.emissive);
      if (id === 'tempest-inferno') {
        if (glowing) {
          m.color.set('#FF5A1F');
          m.emissive!.set('#FF5A1F');
        } else if ((m.metalness ?? 0) > 0.8) m.color.set('#2A1A14');
      } else if (id === 'tempest-godbreaker') {
        if (glowing) {
          m.color.set('#FFD23F');
          m.emissive!.set('#FFD23F');
        } else if ((m.metalness ?? 0) > 0.8) m.color.set('#8C6A2A');
      }
    });
    model.scale.setScalar(id === 'tempest-godbreaker' ? 1.35 : 1);
  }

  /** Applies the equipped weapon to the hero's live gear (gun model, hammer). */
  private applyArsenal(): void {
    const id = this.weaponDef.id;
    if (this.hero === 'havoc') {
      const gun = this.guns.get(id) ?? this.guns.get('havoc-pistol')!;
      for (const g of this.guns.values()) g.visible = false;
      if (gun !== this.blaster && this.gunAura) gun.add(this.gunAura.group);
      this.blaster = gun;
      this.blasterMuzzle = gun.getObjectByName('Muzzle') ?? gun;
      this.gunSpin = 0;
    }
    if (this.hero === 'tempest' && this.hammer) {
      this.paintHammer(this.hammer, id);
      this.hammerPainted = true;
    }
    if (this.hero === 'vanguard' && this.shield) {
      this.tint(this.shield, this.weaponDef.color ?? this.accentHex);
      this.shieldState = 'worn';
    }
  }

  /** ARC's PROTON BEAM: a continuous laser that burns the first thing it touches. */
  private updateLaser(hand: HandState, dt: number): void {
    const palm = hand.palm;
    const dir = hand.normal;
    let best: Drone | null = null;
    let distance = 12;
    for (const drone of this.drones) {
      if (drone.state === 'off' || drone.state === 'emerging') continue;
      this.v1.subVectors(drone.object.position, palm);
      const t = this.v1.dot(dir);
      if (t <= 0 || t > distance) continue;
      this.v2.copy(dir).multiplyScalar(t);
      if (this.v1.sub(this.v2).length() > ENEMIES[drone.kind].radius + 0.05) continue;
      best = drone;
      distance = t;
    }
    hand.beam.visible = true;
    hand.beam.position.copy(palm);
    this.v1.copy(palm).add(dir);
    hand.beam.lookAt(this.v1);
    hand.beam.scale.set(7 + Math.random() * 2, 7 + Math.random() * 2, distance);
    hand.beamMaterial.opacity = 0.9;
    hand.beamMaterial.color.copy(this.weaponColor);
    this.v3.copy(palm).addScaledVector(dir, distance);
    hand.glow.visible = true;
    hand.glow.position.copy(palm);
    hand.glow.scale.setScalar(0.12 + Math.random() * 0.03);
    this.v2.set((Math.random() - 0.5) * 1.5, Math.random() * 1.5, (Math.random() - 0.5) * 1.5);
    this.particles.emit(this.v3, this.v2, Math.random() < 0.5 ? WHITE : ORANGE, 0.3, 1, 2);
    hand.cooldown -= dt;
    if (best && hand.cooldown <= 0) {
      hand.cooldown = 0.1;
      this.markHit('blast', best.object.position, dir);
      this.damageDrone(best, 0.4 * (1 + 0.2 * this.level('arc-power')));
      this.flashes.spawn(this.v3, this.weaponColor, 0.05, 0.25, 0.1);
      this.sfx.laser();
    }
  }

  /** ARC's SWARM ROCKETS: four homing rockets, each a small explosion. */
  private fireRockets(palm: Vector3, dir: Vector3): void {
    this.v3.set(0, 1, 0).cross(dir).normalize();
    for (let k = 0; k < 4; k += 1) {
      this.v4.copy(dir).addScaledVector(this.v3, (k - 1.5) * 0.25).addScaledVector(this.v1.set(0, 1, 0), 0.25).normalize();
      const bolt = this.fire(palm, this.v4, true);
      if (bolt == null) break;
      bolt.speed = 8;
      bolt.velocity.setLength(8);
      bolt.homing = 3;
      bolt.blast = 0.8;
      bolt.damage = 2 + Math.floor(this.level('arc-power') / 2);
      // Spread the salvo across different targets.
      let n = 0;
      for (const drone of this.drones) {
        if (drone.state === 'off' || drone.state === 'emerging' || drone.kind === 'pod' || drone.kind === 'orb') continue;
        if (n++ === k) bolt.target = drone;
      }
    }
    this.flashes.spawn(palm, ORANGE, 0.05, 0.4, 0.2);
    this.sfx.crescent();
  }

  /** An explosion: flash, fire and smoke, damage in `radius`. */
  private explodeAt(at: Vector3, radius: number, damage: number): void {
    this.impactPoint.copy(at);
    const p = this.impactPoint;
    this.flashes.spawn(p, ORANGE, 0.2, radius * 1.6, 0.4);
    this.flashes.spawn(p, WHITE, 0.1, radius * 0.6, 0.15);
    this.particles.burst(p, ORANGE, 40, 3, 0.5, this.v2);
    this.particles.burst(p, DUST, 20, 1.5, 0.8, this.v2);
    this.sfx.explode(false);
    for (const drone of this.drones) {
      if (drone.state === 'off' || drone.kind === 'pod' || drone.kind === 'orb') continue;
      if (drone.object.position.distanceTo(p) > radius + ENEMIES[drone.kind].radius) continue;
      this.v1.subVectors(drone.object.position, p);
      this.markHit('blast', drone.object.position, this.v1);
      this.damageDrone(drone, damage);
    }
  }

  /** GODBREAKER: a ground quake ring that hits everything nearby. */
  private quake(at: Vector3): void {
    this.impactPoint.copy(at);
    if (this.shockwave) {
      this.shockwave.position.set(at.x, 0.05, at.z);
      this.shockwave.rotation.set(Math.PI / 2, 0, 0);
      this.shockwave.visible = true;
      (this.shockwave.material as MeshBasicMaterial).color.set('#FFD23F');
      this.shockwaveTime = 0.3;
    }
    this.particles.burst(this.impactPoint, DUST, 40, 2.5, 0.8, this.v2);
    this.particles.burst(this.impactPoint, GOLD, 30, 3, 0.4, this.v2);
    this.sfx.thunder();
    for (const drone of this.drones) {
      if (drone.state === 'off' || drone.kind === 'pod' || drone.kind === 'orb' || !ENEMIES[drone.kind].ground) continue;
      this.v1.set(drone.object.position.x - at.x, 0, drone.object.position.z - at.z);
      if (this.v1.length() > 2.2) continue;
      this.markHit('blast', drone.object.position, this.v1.setY(0.6));
      this.damageDrone(drone, 2);
    }
  }

  /** BURST WEB: the web blooms into a net that catches everyone nearby. */
  private webNet(hit: Drone): void {
    this.particles.burst(hit.object.position, WHITE, 60, 3, 0.4, this.v1);
    for (const drone of this.drones) {
      if (drone === hit || drone.state === 'off' || !ENEMIES[drone.kind].ground) continue;
      if (drone.object.position.distanceTo(hit.object.position) > 1.6) continue;
      drone.snare = 4;
      this.lightningFx.strike(hit.object.position, drone.object.position, WHITE, 0.2);
      this.damageDrone(drone, 1);
    }
  }

  /** Burning and electrocution: damage ticks with fire or sparks. */
  private updateAfflictions(drone: Drone, dt: number): void {
    const at = drone.object.position;
    drone.dotTimer -= dt;
    if (drone.burn > 0) {
      drone.burn -= dt;
      this.v1.set((Math.random() - 0.5) * 0.3, (Math.random() - 0.2) * 0.6, (Math.random() - 0.5) * 0.3).add(at);
      this.v2.set(0, 0.8 + Math.random() * 0.5, 0);
      this.particles.emit(this.v1, this.v2, Math.random() < 0.5 ? ORANGE : EMBER, 0.45, 0.5, -0.5);
    }
    if (drone.shock > 0) {
      drone.shock -= dt;
      if (Math.random() < 0.3) {
        this.v1.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.6).add(at);
        this.lightningFx.strike(at, this.v1, CYAN, 0.1);
      }
    }
    if (drone.dotTimer <= 0) {
      drone.dotTimer = 0.5;
      this.markHit('dot', at, this.v1.set(0, 1, 0));
      this.damageDrone(drone, drone.shock > 0 ? 0.7 : 0.5, true);
      if (drone.burn > 0) this.sfx.sizzle();
    }
  }

  // ---------------------------------------------------------------- twists

  private setTwist(twist: TwistId): void {
    this.twist = twist;
    this.twistTimer = 2.5;
    this.gravityScale = twist === 'lowgrav' ? 0.3 : 1;
    this.gibs.gravity = 9.8 * this.gravityScale;
    for (const m of this.meteors) this.retireMeteor(m);
    this.applyDarkness(twist === 'blackout');
    this.handLight.intensity = 0;
  }

  /**
   * Dims (or restores) the scene lights and the HDRI environment. Reapplied
   * every blackout frame, since the environment may finish loading later.
   */
  private applyDarkness(dark: boolean): void {
    if (this.lights.length === 0) {
      this.world.scene.traverse((o) => {
        const light = o as Light;
        if (light.isLight && light !== this.handLight) this.lights.push({ light, base: light.intensity });
      });
    }
    for (const { light, base } of this.lights) light.intensity = dark ? base * 0.12 : base;
    const scene = this.world.scene as unknown as { environmentIntensity?: number };
    if (this.envBase < 0) this.envBase = scene.environmentIntensity ?? 1;
    scene.environmentIntensity = dark ? this.envBase * 0.08 : this.envBase;
    this.erasure.dim = dark ? 0.75 : 0;
  }

  /** Runs the level's twist: meteors, lightning, blackout light, floaty motes. */
  private updateTwist(dt: number, time: number): void {
    const fighting = this.run.phase === 'fighting' && this.script == null;
    if (this.armory.visible) {
      // A key light on the weapon in the armory.
      this.handLight.color.set('#FFFFFF');
      this.handLight.intensity = 5;
      this.handLight.position.copy(this.armory.group.position).add(this.v1.set(0.3, 0.4, 0)).addScaledVector(this.forward, -0.4);
    } else if (this.twist !== 'blackout') this.handLight.intensity = 0;
    if (this.twist === 'blackout') {
      this.applyDarkness(this.run.phase !== 'title');
      // The only light is the player's hands.
      const hand = this.hands[1].tracked ? this.hands[1] : this.hands[0];
      const on = this.run.phase !== 'title' && hand.tracked;
      this.handLight.intensity = on ? 3.2 : 0;
      this.handLight.color.copy(this.accent).lerp(WHITE, 0.5);
      if (on) this.handLight.position.copy(hand.gauntlet.palmPoint).addScaledVector(hand.gauntlet.palmNormal, 0.1);
      this.veilTarget = this.run.phase === 'title' ? 0 : this.isPassthrough() ? 0.55 : 0;
    } else if (this.twist === 'lowgrav' && fighting && Math.random() < dt * 6) {
      // Pebbles drifting upward.
      this.v1.set(this.head.x + (Math.random() - 0.5) * 6, 0.05, this.head.z + (Math.random() - 0.5) * 6);
      this.v2.set(0, 0.2 + Math.random() * 0.2, 0);
      this.particles.emit(this.v1, this.v2, DUST, 6, 0, -0.02);
    }
    const falling = this.twist === 'meteors' || this.twist === 'lightning';
    if (falling && fighting) {
      this.twistTimer -= dt;
      if (this.twistTimer <= 0) {
        this.twistTimer = 1.8 + Math.random() * 1.6;
        this.spawnMeteor();
      }
    }
    for (const m of this.meteors) this.updateMeteor(m, dt, time);
  }

  /** Marks a strike point: often near an alien, sometimes right by the player. */
  private spawnMeteor(): void {
    const m = this.meteors.find((x) => x.state === 'off');
    if (m == null) return;
    const near = Math.random() < 0.35;
    let target: Drone | null = null;
    if (!near) {
      for (const drone of this.drones) {
        if (drone.state !== 'off' && ENEMIES[drone.kind].ground && drone.state !== 'emerging' && Math.random() < 0.5) {
          target = drone;
          break;
        }
      }
    }
    if (target) m.target.set(target.object.position.x, 0, target.object.position.z);
    else {
      const a = Math.random() * Math.PI * 2;
      const r = near ? 0.3 + Math.random() * 0.5 : 1.2 + Math.random() * 2.5;
      m.target.set(this.head.x + Math.cos(a) * r, 0, this.head.z + Math.sin(a) * r);
    }
    m.state = 'warn';
    m.t = 0;
    m.marker.position.set(m.target.x, 0.01, m.target.z);
    m.marker.visible = true;
    const lightning = this.twist === 'lightning';
    m.markerMaterial.color.set(lightning ? '#B6A6FF' : '#FF2A2A');
    (m.rock.material as MeshBasicMaterial).color.set(lightning ? '#FFFFFF' : '#FF7A1A');
  }

  private updateMeteor(m: Meteor, dt: number, time: number): void {
    if (m.state === 'off') return;
    m.t += dt;
    const WARN = 1.4;
    const FALL = 0.35;
    if (m.state === 'warn') {
      const p = Math.min(1, m.t / WARN);
      m.marker.scale.setScalar(0.4 + p * 0.6);
      m.markerMaterial.opacity = 0.35 + 0.45 * Math.abs(Math.sin(time * (6 + p * 14)));
      if (this.twist === 'meteors' && m.t > WARN - FALL) {
        // The rock streaks in from the sky.
        const f = (m.t - (WARN - FALL)) / FALL;
        this.sky.set(m.target.x + 3, 9, m.target.z - 2);
        m.rock.visible = true;
        m.rock.position.copy(this.sky).lerp(m.target, f);
        m.rock.rotation.x += dt * 9;
        this.v2.set(0, 0, 0);
        this.particles.emit(m.rock.position, this.v2, ORANGE, 0.5, 0, -0.2);
      }
      if (m.t >= WARN) this.impactMeteor(m);
    }
  }

  private impactMeteor(m: Meteor): void {
    const lightning = this.twist === 'lightning';
    const at = this.v3.set(m.target.x, 0.2, m.target.z);
    if (lightning) {
      this.sky.set(m.target.x, 9, m.target.z);
      this.lightningFx.strike(this.sky, at, VIOLET, 0.35);
      this.lightning = 1;
      this.sfx.thunderHit();
    } else this.sfx.explode(true);
    const color = lightning ? VIOLET : ORANGE;
    this.flashes.spawn(at, color, 0.3, 2.2, 0.5);
    this.flashes.spawn(at, WHITE, 0.1, 0.9, 0.2);
    this.particles.burst(at, color, 60, 4, 0.6, this.v2);
    this.particles.burst(at, DUST, 30, 2, 0.8, this.v2);
    // Crushes aliens in the circle...
    for (const drone of this.drones) {
      if (drone.state === 'off' || drone.kind === 'pod' || drone.kind === 'boss') continue;
      this.v4.set(drone.object.position.x - at.x, 0, drone.object.position.z - at.z);
      if (this.v4.length() > 0.9 + ENEMIES[drone.kind].radius) continue;
      this.markHit('blast', drone.object.position, this.v4.setY(0.5));
      this.damageDrone(drone, 3);
    }
    // ...and the player, if they stayed in it.
    this.v4.set(this.head.x - at.x, 0, this.head.z - at.z);
    if (this.v4.length() < 0.75) this.hurtPlayer(1, false, at);
    this.retireMeteor(m);
  }

  private retireMeteor(m: Meteor): void {
    m.state = 'off';
    m.rock.visible = false;
    m.marker.visible = false;
  }

  // ---------------------------------------------------------------- saga

  private resetScript(): void {
    this.scriptWave = -1;
    this.erasing = -1;
    this.bossLocked = false;
    this.finaleIndex = -1;
    this.convergence = -1;
    this.volley = -1;
    for (const figure of this.holograms) figure.visible = false;
    this.eraseTarget = this.script === 'finale' ? 0.45 : 0;
    this.veilTarget = this.script === 'finale' ? 0.2 : 0;
  }

  /** Leaves any saga mission: back to the player's own hero, world restored. */
  private endScript(): void {
    if (this.twist !== 'none') this.setTwist('none');
    if (this.script != null) {
      this.script = null;
      this.hero = this.menus.hero;
      this.applySkin();
      this.hideDebris();
    }
    this.resetScript();
    this.tipQueue = [];
    this.coach.hide();
  }

  private findBoss(): Drone | null {
    for (const drone of this.drones) if (drone.kind === 'boss' && drone.state === 'boss') return drone;
    return null;
  }

  /** Coach tips, the prologue tutorial and the finale's hero relay. */
  private updateScript(dt: number, time: number): void {
    if (this.autoPrologueAt > 0 && this.elapsed > this.autoPrologueAt) {
      this.autoPrologueAt = -1;
      if (this.run.phase === 'title' && this.tx == null && !hasUnlock(this.profile, PROLOGUE_DONE)) this.startStage('arc', PROLOGUE);
    }
    const running = this.run.phase !== 'title' && !this.panel.visible && !this.paused;
    if (!running) {
      if (this.coach.visible) this.coach.hide();
    } else if (this.tipQueue.length > 0) {
      this.tipTimer += dt;
      if (this.tipTimer > TIP_SECONDS) {
        this.tipTimer = 0;
        this.tipIndex += 1;
        // The tutorial keeps repeating until the wave is beaten; missions show tips once.
        if (this.tipIndex >= this.tipQueue.length) {
          if (this.script === 'prologue') this.tipIndex = 0;
          else this.tipQueue = [];
        }
      }
      if (this.tipQueue.length > 0) {
        const n = this.tipQueue.length;
        this.coach.show(this.tipQueue[this.tipIndex], this.accentHex, n > 1 ? `${this.tipIndex + 1} / ${n}` : '');
      } else this.coach.hide();
    }
    if (this.script === 'prologue') this.updatePrologue(dt);
    else if (this.script === 'finale') this.updateFinale(dt, time);
    else if (this.run.phase === 'title') this.eraseTarget = 0;
    else this.eraseTarget = this.isPassthrough() ? this.riftLevel : 1;
  }

  private updatePrologue(dt: number): void {
    const run = this.run;
    if (run.phase === 'intro' && run.wave !== this.scriptWave) {
      this.scriptWave = run.wave;
      const next = PROLOGUE_HEROES[Math.min(run.wave, PROLOGUE_HEROES.length - 1)];
      if (run.wave > 0) this.swapFx(next);
      this.equipHero(next);
      if (run.waveDef.boss) {
        this.teach([{ gesture: 'palm', title: 'BLAST OBLIVAX!', sub: 'Aim your open palm at the glowing core.' }]);
        this.eraseTarget = 0.12;
        this.veilTarget = 0.1;
      }
    }
    const boss = this.findBoss();
    if (boss && this.erasing < 0 && boss.hp / boss.maxHp < PROLOGUE_ERASE_AT) {
      // He stops playing: the room starts to vanish.
      this.erasing = 0;
      this.bossLocked = true;
      this.tipQueue = [];
      this.coach.hide();
      this.eraseTarget = 0.55;
      this.veilTarget = 0.35;
      for (const drone of this.drones) {
        if (drone !== boss && drone.state !== 'off' && drone.kind !== 'pod') this.explodeDrone(drone, false);
      }
      this.v1.copy(boss.object.position).setY(boss.object.position.y + 1.2);
      this.comic.pop('ERASED!', this.v1, OBLIVAX_COLOR, 1);
      this.flashes.spawn(boss.object.position, OBLIVAX_COLOR, 0.5, 4, 1.2);
      this.sfx.thunder();
      this.slowmo = 1.5;
    }
    if (this.erasing >= 0 && this.tx == null) {
      this.erasing += dt;
      if (this.erasing > 3) {
        this.erasing = -10;
        this.beginTransmission(PROLOGUE_ERASURE, () => this.finishPrologue());
      }
    }
  }

  private finishPrologue(): void {
    if (!hasUnlock(this.profile, PROLOGUE_DONE)) {
      this.profile.unlocks.push(PROLOGUE_DONE);
      this.profile.coins += 300;
    }
    saveProfile(this.profile);
    for (const drone of this.drones) if (drone.state !== 'off') this.retireDrone(drone);
    this.run.toTitle();
    this.endScript();
    this.sfx.victory();
    this.showMenu('main');
  }

  private updateFinale(dt: number, time: number): void {
    const boss = this.findBoss();
    if (boss && this.convergence < 0) {
      const fraction = boss.hp / boss.maxHp;
      // Reality grows back as OBLIVAX weakens.
      this.eraseTarget = 0.1 + 0.35 * fraction;
      const phase = finalePhase(fraction);
      if (phase >= 0 && phase !== this.finaleIndex) {
        const first = this.finaleIndex < 0;
        this.finaleIndex = phase;
        const step = FINALE_PHASES[phase];
        if (!first) this.swapFx(step.hero);
        if (step.hero !== this.hero) this.equipHero(step.hero);
        this.taunt = step.call;
        this.v1.copy(this.head).addScaledVector(this.forward, 1.4);
        this.comic.pop(step.call.split(':')[0] + '!', this.v1, this.accent, 0.6);
      }
      if (fraction <= CONVERGENCE_AT) this.startConvergence(boss);
    }
    if (this.convergence >= 0) this.updateConvergence(dt, time, boss);
  }

  /** Flash and callout when the relay hands over to another hero. */
  private swapFx(hero: HeroId): void {
    const def = HEROES.find((h) => h.id === hero)!;
    const color = new Color(def.color);
    this.v1.copy(this.head).addScaledVector(this.forward, 0.9);
    this.flashes.spawn(this.v1, color, 0.2, 2.2, 0.5);
    this.particles.burst(this.v1, color, 60, 2.5, 0.5, this.v2);
    this.comic.pop(`${def.name}!`, this.v1, color, 0.7);
    this.sfx.swap();
  }

  /** Every hero appears as a hologram; one clap and they all fire. */
  private startConvergence(boss: Drone): void {
    this.convergence = 0;
    this.bossLocked = true;
    this.eraseTarget = 0.1;
    this.veilTarget = 0;
    this.teach([]);
    this.hideDebris();
    this.coach.show(CLAP_TIP, this.accentHex);
    for (const drone of this.drones) {
      if (drone !== boss && drone.state !== 'off' && drone.kind !== 'pod') this.explodeDrone(drone, false);
    }
    this.v3.set(this.forward.x, 0, this.forward.z);
    if (this.v3.lengthSq() < 1e-4) this.v3.set(0, 0, -1);
    this.v3.normalize();
    const count = this.holograms.length;
    this.holograms.forEach((figure, i) => {
      // Flanking the player on both sides, leaving the view of OBLIVAX clear.
      const half = Math.ceil(count / 2);
      const side = i < half ? -1 : 1;
      const k = i < half ? i : i - half;
      const a = side * (0.75 + (k / Math.max(1, half - 1)) * 1.6);
      const c = Math.cos(a);
      const s = Math.sin(a);
      figure.position.set(this.head.x + (this.v3.x * c - this.v3.z * s) * 2.1, 0, this.head.z + (this.v3.x * s + this.v3.z * c) * 2.1);
      figure.lookAt(boss.object.position.x, 0, boss.object.position.z);
      figure.scale.setScalar(0.01);
      figure.visible = true;
    });
    this.v1.copy(this.head).addScaledVector(this.forward, 1.5);
    this.comic.pop('CONVERGENCE!', this.v1, GOLD, 1.1);
    this.flashes.spawn(this.v1, WHITE, 0.3, 3, 0.8);
    this.sfx.thunder();
    this.sfx.victory();
  }

  private updateConvergence(dt: number, time: number, boss: Drone | null): void {
    this.convergence += dt;
    const rise = Math.min(1, this.convergence / 1.2);
    this.holograms.forEach((figure, i) => {
      figure.scale.setScalar(1.75 * rise);
      figure.position.y = Math.sin(time * 2 + i) * 0.02;
    });
    if (boss == null) return;
    if (this.volley < 0) {
      // Wait for the clap (palms meet); never stall a player without hands.
      const left = this.hands[0];
      const right = this.hands[1];
      const clap = left.tracked && right.tracked && left.gauntlet.palmPoint.distanceTo(right.gauntlet.palmPoint) < 0.1;
      if ((clap && this.convergence > 0.8) || this.convergence > 10) {
        this.volley = 0;
        this.volleyTimer = 0;
        this.coach.hide();
        this.comic.pop('TOGETHER!', this.v1.copy(this.head).addScaledVector(this.forward, 1), WHITE, 0.9);
        this.sfx.thunderHit();
      }
      return;
    }
    this.volley += dt;
    this.volleyTimer -= dt;
    if (this.volleyTimer <= 0 && this.volley < 2) {
      // Every hero fires a beam into the Unmaker's core.
      this.volleyTimer = 0.12;
      const figure = this.holograms[Math.floor(Math.random() * this.holograms.length)];
      this.v1.copy(figure.position).setY(1.3);
      boss.eye.getWorldPosition(this.v2);
      this.lightningFx.strike(this.v1, this.v2, figure.userData.color as Color, 0.35);
      this.flashes.spawn(this.v2, figure.userData.color as Color, 0.3, 1.6, 0.3);
      this.particles.burst(this.v2, figure.userData.color as Color, 30, 4, 0.5, this.v3);
      this.sfx.blast();
    }
    if (this.volley >= 2) {
      this.volley = -1;
      this.convergence = -1;
      this.bossLocked = false;
      this.eraseTarget = 0;
      for (const figure of this.holograms) figure.visible = false;
      this.defeatBoss(boss);
    }
  }

  /** Finale over: the ending, then results. */
  private finishFinale(won: boolean): void {
    const run = this.run;
    let coins = run.coins;
    let unlocked: string | undefined;
    if (won) {
      coins += 1000;
      if (!hasUnlock(this.profile, FINALE_DONE)) {
        this.profile.unlocks.push(FINALE_DONE);
        unlocked = FINALE_DONE;
      }
    }
    this.profile.coins += coins;
    saveProfile(this.profile);
    const info = {
      won,
      stage: run.stage,
      reward: { stars: won ? 3 : 0, coins, newBest: won, unlocked },
      score: run.score,
      kills: run.kills,
      bestCombo: run.bestCombo,
      saved: 0,
      hostages: 0,
    };
    this.eraseTarget = 0;
    this.veilTarget = 0;
    const done = () => {
      this.endScript();
      this.presentResults(info);
    };
    if (won && this.story) this.beginTransmission(this.story.outro, done);
    else done();
  }

  // ---------------------------------------------------------------- VANGUARD

  /** The worn shield faces the attacker: the strike is blocked. */
  private shieldBlocks(from: Vector3): boolean {
    if (this.hero !== 'vanguard' || this.shieldState !== 'worn' || this.shield == null || !this.shield.visible) return false;
    this.shield.getWorldPosition(this.sa);
    if (this.sa.distanceTo(this.head) > 0.75) return false;
    this.sb.subVectors(from, this.sa).normalize();
    return this.sb.dot(this.shieldNormal) > 0.2;
  }

  /**
   * VANGUARD: the shield rides the off-hand forearm, facing out of the back
   * of the hand. It blocks blades, deflects shots back at enemies, bashes
   * when swung, and is thrown with a fast swing and an open hand: it
   * ricochets between enemies, then flies home. The other fist punches.
   */
  private updateShield(dt: number): void {
    const shield = this.shield;
    if (shield == null) return;
    const active = this.powersLive && this.hero === 'vanguard';
    if (!active) {
      shield.visible = false;
      this.shieldState = 'worn';
      return;
    }
    const holder = this.profile.settings.leftHanded ? 1 : 0;
    const hand = this.hands[holder];
    const force = this.level('vanguard-force');
    this.updatePunch(this.hands[1 - holder], dt, force);
    this.shieldTime += dt;
    if (this.shieldState === 'worn') {
      if (!hand.tracked) {
        shield.visible = false;
        return;
      }
      shield.visible = true;
      const pose = hand.pose;
      pose.position(J.wrist, this.v1);
      pose.position(J.middleProx, this.v2);
      this.sy.subVectors(this.v2, this.v1).normalize();
      this.sz.copy(hand.gauntlet.palmNormal).negate();
      this.sy.addScaledVector(this.sz, -this.sy.dot(this.sz)).normalize();
      this.sx.crossVectors(this.sy, this.sz);
      this.shieldBasis.makeBasis(this.sx, this.sy, this.sz);
      shield.quaternion.setFromRotationMatrix(this.shieldBasis);
      this.shieldPrev.copy(shield.position);
      shield.position.copy(this.v1).addScaledVector(this.sz, 0.07).addScaledVector(this.sy, -0.03);
      this.shieldNormal.copy(this.sz);
      if (dt > 0) this.shieldVel.lerp(this.v3.subVectors(shield.position, this.shieldPrev).divideScalar(dt), 0.5);
      const speed = this.shieldVel.length();
      // Deflect shots that touch the shield back at the enemy.
      for (const shot of this.drones) {
        if ((shot.state !== 'shot' && shot.state !== 'fly') || shot.object.position.distanceTo(shield.position) > 0.32) continue;
        this.retireDrone(shot);
        this.deflect(shield.position);
      }
      this.checkParry(this.v4.copy(shield.position).addScaledVector(this.sx, -0.24), this.v3.copy(shield.position).addScaledVector(this.sx, 0.24));
      // Bash enemies with a fast swing.
      if (speed > 2) {
        for (const drone of this.drones) {
          if (drone.state === 'off' || drone.state === 'emerging' || this.elapsed - drone.bladeHitAt < 0.4) continue;
          if (drone.object.position.distanceTo(shield.position) > ENEMIES[drone.kind].radius + 0.25) continue;
          drone.bladeHitAt = this.elapsed;
          this.markHit('blast', drone.object.position, this.shieldVel);
          this.damageDrone(drone, 2 + Math.floor(force / 2));
          this.sfx.clang();
        }
      }
      // Throw: swing and open the hand.
      const e = fingerExtension(hand.joints);
      const open = (e[0] + e[1] + e[2] + e[3]) / 4 > 1.6;
      if (open && speed > 2.2 && this.shieldTime > 0.4) this.throwShield(speed);
      return;
    }
    shield.visible = true;
    this.shieldPrev.copy(shield.position);
    if (this.shieldState === 'flying') {
      const target = this.shieldTarget;
      if (target && target.state !== 'off') {
        // Ricochet homing.
        this.v1.subVectors(target.object.position, shield.position).normalize().multiplyScalar(this.shieldVel.length());
        this.shieldVel.lerp(this.v1, Math.min(1, dt * 6));
      }
      shield.position.addScaledVector(this.shieldVel, dt);
      shield.rotateZ(dt * 25);
      this.v2.set(0, 0, 0);
      this.particles.emit(this.shieldPrev, this.v2, this.weaponColor, 0.3, 0);
      for (const drone of this.drones) {
        if (drone.state === 'off' || drone.state === 'emerging' || drone === this.shieldLast || drone.kind === 'orb') continue;
        if (!this.segmentHits(this.shieldPrev, shield.position, drone.object.position, ENEMIES[drone.kind].radius + 0.22)) continue;
        this.shieldLast = drone;
        this.v4.copy(drone.object.position);
        this.markHit('blast', drone.object.position, this.shieldVel);
        if (this.weaponDef.id === 'vanguard-solar') drone.burn = Math.max(drone.burn, 3);
        this.damageDrone(drone, 3 + Math.floor(force / 2));
        if (this.weaponDef.id === 'vanguard-storm') this.chainLightning(this.v4, drone);
        this.sfx.clang();
        this.flashes.spawn(this.v4, WHITE, 0.1, 0.8, 0.2);
        this.particles.burst(this.v4, this.weaponColor, 30, 2.5, 0.3, this.v2);
        if (this.comicCooldown <= 0) {
          this.comicCooldown = 0.3;
          this.comic.random('vanguard', this.v1.copy(this.v4).setY(this.v4.y + 0.4), this.weaponColor, 0.4);
        }
        // Bounce to the next nearest enemy, or come home.
        this.shieldBounces -= 1;
        this.shieldTarget = this.shieldBounces > 0 ? this.nearestEnemy(this.v4, drone, 7) : null;
        if (this.shieldTarget == null) this.shieldState = 'returning';
        break;
      }
      if (this.shieldTime > 3 || shield.position.distanceTo(this.head) > 16) this.shieldState = 'returning';
      return;
    }
    // Returning to the shield arm.
    if (!hand.tracked) return;
    hand.pose.position(J.wrist, this.v1);
    this.v2.subVectors(this.v1, shield.position);
    const distance = this.v2.length();
    if (distance < 0.18) {
      this.shieldState = 'worn';
      this.shieldTime = 0;
      this.sfx.catchHammer();
      this.flashes.spawn(this.v1, this.weaponColor, 0.05, 0.4, 0.2);
      return;
    }
    shield.position.addScaledVector(this.v2.normalize(), Math.min(distance, 15 * dt));
    shield.rotateZ(dt * 25);
  }

  private throwShield(speed: number): void {
    const shield = this.shield!;
    this.shieldState = 'flying';
    this.shieldTime = 0;
    this.shieldLast = null;
    this.shieldBounces = 2 + this.level('vanguard-ricochet') + (this.weaponDef.id === 'vanguard-storm' ? 2 : 0);
    this.v1.copy(this.shieldVel).normalize();
    // The first target: the enemy nearest the throw line.
    let best = this.profile.settings.aimAssist ? 0.7 : 0.9;
    this.shieldTarget = null;
    for (const drone of this.drones) {
      if (drone.state === 'off' || drone.state === 'emerging' || drone.kind === 'orb' || drone.kind === 'pod') continue;
      const cos = this.v2.subVectors(drone.object.position, shield.position).normalize().dot(this.v1);
      if (cos > best) {
        best = cos;
        this.shieldTarget = drone;
      }
    }
    this.shieldVel.copy(this.v1).multiplyScalar(Math.min(18, Math.max(11, speed * 4)));
    this.sfx.crescent();
  }

  private nearestEnemy(from: Vector3, skip: Drone | null, range: number): Drone | null {
    let best: Drone | null = null;
    let distance = range;
    for (const drone of this.drones) {
      if (drone === skip || drone.state === 'off' || drone.state === 'emerging' || drone.kind === 'orb' || drone.kind === 'pod') continue;
      const d = drone.object.position.distanceTo(from);
      if (d < distance) {
        distance = d;
        best = drone;
      }
    }
    return best;
  }

  /** A shot hits the shield and flies back at the nearest enemy. */
  private deflect(at: Vector3): void {
    this.sfx.clang();
    this.particles.burst(at, GOLD, 20, 2, 0.25, this.v2);
    const target = this.nearestEnemy(at, null, 20);
    if (target == null) return;
    this.v1.subVectors(target.object.position, at).normalize();
    const bolt = this.fire(this.v2.copy(at).addScaledVector(this.v1, 0.3), this.v1, true);
    if (bolt) {
      bolt.damage = 2 + Math.floor(this.level('vanguard-guard') / 2);
      bolt.target = target;
    }
  }

  /** A fast fist that lands on a body hits hard. */
  private updatePunch(hand: HandState, dt: number, force: number): void {
    if (!hand.tracked || dt <= 0) return;
    hand.pose.position(J.middleProx, this.v1);
    const speed = this.v2.subVectors(this.v1, hand.prevTip).length() / dt;
    hand.prevTip.copy(this.v1);
    if (speed < 1.6 || !isFist(hand.joints)) return;
    for (const drone of this.drones) {
      if (drone.state === 'off' || drone.state === 'emerging' || drone.kind === 'orb' || this.elapsed - drone.bladeHitAt < 0.3) continue;
      if (drone.object.position.distanceTo(this.v1) > ENEMIES[drone.kind].radius + 0.12) continue;
      drone.bladeHitAt = this.elapsed;
      this.markHit('blast', drone.object.position, this.v2);
      this.damageDrone(drone, 1 + Math.floor(force / 2));
      this.sfx.catchHammer();
      this.flashes.spawn(this.v1, WHITE, 0.05, 0.5, 0.15);
      this.comic.pop('POW!', this.v4.copy(this.v1).setY(this.v1.y + 0.2), this.weaponColor, 0.35);
      break;
    }
  }

  // ---------------------------------------------------------------- RONIN

  /**
   * RONIN: a fist ignites a katana in that hand. Blades cut on contact,
   * fast swings throw slash waves, and crossing both blades fires an
   * X-strike.
   */
  private updateSwords(dt: number, time: number): void {
    const active = this.powersLive && this.hero === 'ronin';
    this.xCooldown -= dt;
    for (let i = 0; i < this.hands.length; i += 1) {
      const hand = this.hands[i];
      const sword = hand.sword;
      // A fist can read as open for a frame mid-swing; keep the blade lit.
      if (active && hand.tracked && isFist(hand.joints)) hand.swordHold = 0.25;
      else hand.swordHold -= dt;
      const lit = active && hand.tracked && hand.swordHold > 0;
      const was = sword.extension > 0.5;
      sword.lengthScale = (1 + 0.08 * this.level('ronin-edge')) * (this.weaponDef.id === 'ronin-void' ? 1.25 : 1);
      if (hand.tracked) this.gripPoint(i, this.swordGrip);
      sword.update(hand.pose, this.swordGrip, lit, dt, time);
      if (lit && !was && sword.extension > 0.5) {
        this.sfx.shing();
        this.particles.burst(sword.base, this.accent, 16, 1.2, 0.25, this.v2);
      }
      if (sword.extension < 0.9 || dt <= 0) {
        hand.hasPrevTip = false;
        continue;
      }
      if (!hand.hasPrevTip) {
        hand.prevTip.copy(sword.tip);
        hand.hasPrevTip = true;
        continue;
      }
      hand.tipVel.subVectors(sword.tip, hand.prevTip).divideScalar(dt);
      if (hand.skewer == null) this.tryImpale(i, sword.base, sword.tip, sword.direction);
      const damage = 2 + Math.floor(this.level('ronin-edge') / 2);
      for (const drone of this.drones) {
        if (drone.state === 'off' || drone.state === 'emerging' || this.elapsed - drone.bladeHitAt < 0.3) continue;
        if (!this.bladeHits(drone, sword.base, sword.tip, hand.prevTip)) continue;
        drone.bladeHitAt = this.elapsed;
        this.sfx.slash();
        this.particles.burst(this.hitPoint, WHITE, 18, 2.5, 0.25, this.v2);
        this.v4.subVectors(sword.tip, hand.prevTip);
        this.v2.crossVectors(this.v4, sword.direction);
        this.markHit('slice', this.hitPoint, this.v4, this.v2);
        if (this.weaponDef.id === 'ronin-flame') drone.burn = Math.max(drone.burn, 3);
        this.damageDrone(drone, damage);
      }
      hand.slashCooldown -= dt;
      if (sword.speed > SWORD_WAVE_SPEED && hand.slashCooldown <= 0) {
        hand.slashCooldown = SWORD_WAVE_COOLDOWN * (this.buffRapid > 0 ? 0.5 : 1);
        const wave = this.level('ronin-wave');
        this.v4.subVectors(sword.tip, hand.prevTip).normalize();
        this.fireCrescent(sword.tip, this.v4, sword.direction, 0.3 + 0.04 * wave, 2 + Math.ceil(wave / 2), 1.5 + 0.12 * wave);
      }
      // Weapon tier (and the flame blade): flames lick up the blade.
      const flame = this.weaponDef.id === 'ronin-flame';
      if ((this.weaponTierNow > 0 || flame) && Math.random() < (flame ? 0.9 : this.weaponTierNow * 0.15)) {
        this.v1.copy(sword.base).lerp(sword.tip, Math.random());
        this.v2.set((Math.random() - 0.5) * 0.1, 0.3 + Math.random() * 0.3, (Math.random() - 0.5) * 0.1);
        this.particles.emit(this.v1, this.v2, Math.random() < 0.3 ? WHITE : this.accent, 0.35, 0.5, -0.4);
      }
      hand.prevTip.copy(sword.tip);
    }
    for (const hand of this.hands) if (hand.sword.extension > 0.9) this.checkParry(hand.sword.base, hand.sword.tip);
    // Cross both blades for an X-strike.
    const left = this.hands[0].sword;
    const right = this.hands[1].sword;
    if (!active || left.extension < 0.9 || right.extension < 0.9) {
      this.bladesCrossed = false;
      return;
    }
    const gap = segmentDistance(left.base, left.tip, right.base, right.tip, this.crossPoint, this.v2, this.v3, this.v4);
    if (gap < 0.05 && !this.bladesCrossed) {
      this.bladesCrossed = true;
      this.sfx.clang();
      this.flashes.spawn(this.crossPoint, WHITE, 0.05, 0.4, 0.15);
      this.particles.burst(this.crossPoint, GOLD, 30, 2.5, 0.3, this.v2);
      if (this.xCooldown <= 0) this.xStrike();
    } else if (gap > 0.12) this.bladesCrossed = false;
  }

  /** Two huge crescents in an X from where the blades crossed. */
  private xStrike(): void {
    this.xCooldown = X_STRIKE_COOLDOWN * (1 - 0.12 * this.level('ronin-cross'));
    const at = this.crossPoint;
    // Along the gaze, snapped to the most centred enemy.
    this.xDir.copy(this.forward);
    let best = 0.88;
    for (const drone of this.drones) {
      if (drone.state === 'off' || drone.state === 'emerging' || drone.state === 'shot' || drone.kind === 'pod') continue;
      const cos = this.v2.subVectors(drone.object.position, at).normalize().dot(this.forward);
      if (cos > best) {
        best = cos;
        this.xDir.copy(this.v2);
      }
    }
    this.xRight.set(0, 1, 0).cross(this.xDir).normalize();
    this.xUp.crossVectors(this.xDir, this.xRight).normalize();
    const damage = 5 + this.level('ronin-cross');
    for (let k = 0; k < 2; k += 1) {
      this.xDiag.copy(this.xRight).multiplyScalar(k === 0 ? 1 : -1).add(this.xUp).normalize();
      this.fireCrescent(at, this.xDir, this.xDiag, 0.55, damage, 2.6, true);
    }
    this.flashes.spawn(at, this.accent, 0.2, 1.6, 0.45);
    this.particles.burst(at, this.accent, 70, 4, 0.5, this.v2);
    this.v1.copy(at).addScaledVector(this.xDir, 0.6);
    this.comic.pop('X-STRIKE!', this.v1, this.accent, 0.8);
    this.sfx.thunderHit();
    this.sfx.crescent();
  }

  // ---------------------------------------------------------------- PSION

  private makeThrowable(object: Object3D, radius: number): Throwable {
    return {
      object,
      drone: null,
      radius,
      state: 'off',
      thrown: false,
      velocity: new Vector3(),
      previous: new Vector3(),
      spin: new Vector3(),
      home: new Vector3(),
      t: 0,
      bashAt: -10,
    };
  }

  /** Scatters PSION's props across the floor in a front arc. */
  private placeDebris(): void {
    this.v3.set(this.forward.x, 0, this.forward.z);
    if (this.v3.lengthSq() < 1e-4) this.v3.set(0, 0, -1);
    this.v3.normalize();
    const count = this.debris.length;
    this.debris.forEach((item, i) => {
      const angle = (i / Math.max(1, count - 1) - 0.5) * 2.4;
      const distance = 1.4 + (i % 2) * 0.9;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      item.home.set(this.v3.x * c - this.v3.z * s, 0, this.v3.x * s + this.v3.z * c);
      item.home.multiplyScalar(distance).add(this.head);
      item.home.y = item.radius * 0.8;
      this.spawnDebris(item);
    });
  }

  private spawnDebris(item: Throwable): void {
    item.state = 'spawn';
    item.thrown = false;
    item.t = 0;
    item.velocity.set(0, 0, 0);
    item.object.position.copy(item.home);
    item.object.rotation.set(0, Math.random() * Math.PI * 2, 0);
    item.object.scale.setScalar(0.01);
    item.object.visible = true;
    this.flashes.spawn(item.home, this.accent, 0.1, 0.9, 0.4);
  }

  private hideDebris(): void {
    for (const hand of this.hands) {
      hand.held = null;
      hand.psi.hide();
    }
    for (const item of this.debris) {
      item.state = 'off';
      item.object.visible = false;
    }
    for (const slot of this.liftSlots) this.freeSlot(slot);
  }

  private freeSlot(slot: Throwable): void {
    if (slot.drone) slot.drone.lifted = false;
    slot.drone = null;
    slot.state = 'off';
  }

  /** Walkers can be lifted; a Colossus only with IRON WILL level 3. */
  private liftable(drone: Drone): boolean {
    if (drone.lifted || !ENEMIES[drone.kind].ground) return false;
    if (drone.state !== 'approach' && drone.state !== 'aim' && drone.state !== 'melee') return false;
    return drone.kind !== 'titan' || this.level('psion-grip') >= 3;
  }

  /**
   * PSION: point an open palm at a prop or an alien to lock on, close the
   * hand to lift it, move the hand to steer it (amplified like a long
   * lever), then fling and open the hand to throw.
   */
  private updatePsion(realDt: number, dt: number, time: number): void {
    const active = this.powersLive && this.hero === 'psion';
    for (const item of this.debris) {
      if (item.state !== 'spawn') continue;
      item.t += realDt;
      item.object.scale.setScalar(Math.min(1, item.t / 0.5));
      if (item.t >= 0.5) item.state = 'rest';
    }
    for (let i = 0; i < this.hands.length; i += 1) {
      const hand = this.hands[i];
      const psi = hand.psi;
      if (!active || !hand.tracked) {
        if (hand.held) this.releaseHeld(i, false);
        hand.aimObject = null;
        hand.aimDrone = null;
        psi.hide();
        continue;
      }
      const e = fingerExtension(hand.joints);
      const curl = (e[0] + e[1] + e[2] + e[3]) / 4;
      if (hand.held == null) {
        if (curl > PSI_OPEN) this.psiAim(i);
        else if (this.elapsed - hand.aimTime > PSI_LOCK_GRACE) {
          hand.aimObject = null;
          hand.aimDrone = null;
        }
        const aimed = hand.aimObject?.object.position ?? hand.aimDrone?.object.position ?? null;
        const radius = hand.aimObject?.radius ?? (hand.aimDrone ? ENEMIES[hand.aimDrone.kind].radius : 0.3);
        psi.aim(aimed, radius, this.head, time);
        psi.link(hand.gauntlet.palmPoint, hand.gauntlet.palmNormal, null, 0, time);
        if (aimed && curl < PSI_GRAB && this.elapsed - hand.aimTime < PSI_LOCK_GRACE) this.psiGrab(i);
        continue;
      }
      psi.aim(null, 0, this.head, time);
      if (curl > PSI_RELEASE) hand.release += realDt;
      else hand.release = 0;
      if (hand.release > 0.05) {
        this.releaseHeld(i, true);
        psi.hide();
        continue;
      }
      const item = hand.held;
      if (item.drone && (item.drone.state === 'off' || !item.drone.lifted)) {
        // Destroyed while held.
        this.freeSlot(item);
        hand.held = null;
        psi.hide();
        continue;
      }
      this.holdThrowable(i, item, realDt, time);
      psi.link(hand.gauntlet.palmPoint, hand.gauntlet.palmNormal, item.object.position, item.radius, time);
    }
    for (const item of this.debris) if (item.state === 'flying') this.updateThrowable(item, dt);
    for (const slot of this.liftSlots) if (slot.state === 'flying') this.updateThrowable(slot, dt);
  }

  /** Locks hand `i` onto the prop or alien nearest its palm direction. */
  private psiAim(i: number): void {
    const hand = this.hands[i];
    const origin = hand.gauntlet.palmPoint;
    const direction = hand.gauntlet.palmNormal;
    const reach = 9 + 1.5 * this.level('psion-grip');
    let best = this.profile.settings.aimAssist ? 0.9 : 0.94;
    let object: Throwable | null = null;
    let enemy: Drone | null = null;
    for (const item of this.debris) {
      if (item.state !== 'rest') continue;
      this.v1.subVectors(item.object.position, origin);
      const distance = this.v1.length();
      if (distance > reach) continue;
      const cos = this.v1.divideScalar(Math.max(1e-4, distance)).dot(direction);
      if (cos > best) {
        best = cos;
        object = item;
      }
    }
    for (const drone of this.drones) {
      if (drone.state === 'off' || !this.liftable(drone)) continue;
      this.v1.subVectors(drone.object.position, origin);
      const distance = this.v1.length();
      if (distance > reach) continue;
      const cos = this.v1.divideScalar(Math.max(1e-4, distance)).dot(direction);
      if (cos > best) {
        best = cos;
        object = null;
        enemy = drone;
      }
    }
    if (object || enemy) {
      if (object !== hand.aimObject || enemy !== hand.aimDrone) this.sfx.ping();
      hand.aimObject = object;
      hand.aimDrone = enemy;
      hand.aimTime = this.elapsed;
    } else if (this.elapsed - hand.aimTime > PSI_LOCK_GRACE) {
      hand.aimObject = null;
      hand.aimDrone = null;
    }
  }

  private psiGrab(i: number): void {
    const hand = this.hands[i];
    let item = hand.aimObject;
    const drone = hand.aimDrone;
    hand.aimObject = null;
    hand.aimDrone = null;
    if (item == null && drone != null) {
      if (!this.liftable(drone)) return;
      item = this.liftSlots.find((s) => s.state === 'off') ?? null;
      if (item == null) return;
      item.object = drone.object;
      item.drone = drone;
      item.radius = ENEMIES[drone.kind].radius;
      drone.lifted = true;
    }
    if (item == null || (item.drone == null && item.state !== 'rest')) return;
    item.state = 'held';
    item.thrown = false;
    item.previous.copy(item.object.position);
    item.velocity.set(0, 0, 0);
    hand.held = item;
    hand.release = 0;
    const at = item.object.position;
    this.sfx.lift();
    this.flashes.spawn(at, this.accent, 0.1, 0.8, 0.3);
    this.particles.burst(at, this.accent, 26, 1.4, 0.4, this.v2);
    if (drone && this.comicCooldown <= 0) {
      this.comicCooldown = 0.5;
      this.v1.copy(at).setY(at.y + 0.4);
      this.comic.pop('LIFT!', this.v1, this.accent, 0.4);
    }
  }

  /** Steers a held object: the hand's offset from the chest on a long lever. */
  private holdThrowable(i: number, item: Throwable, dt: number, time: number): void {
    const hand = this.hands[i];
    this.v1.copy(this.head);
    this.v1.y -= 0.3;
    this.v2.subVectors(hand.gauntlet.palmPoint, this.v1);
    const reach = this.v2.length();
    this.v2.divideScalar(Math.max(1e-4, reach));
    const distance = Math.min(3.2, Math.max(0.8, 1.1 + (reach - 0.3) * 5));
    this.v3.copy(this.v1).addScaledVector(this.v2, distance);
    this.v3.y = Math.max(this.v3.y, item.radius + (item.drone ? 0.6 : 0.15));
    const position = item.object.position;
    item.previous.copy(position);
    position.lerp(this.v3, Math.min(1, dt * 9));
    position.y += Math.sin(time * 3 + i * 2) * 0.002;
    if (dt > 0) {
      this.v4.subVectors(position, item.previous).divideScalar(dt);
      item.velocity.lerp(this.v4, 0.45);
    }
    const drone = item.drone;
    if (drone) {
      // A lifted alien struggles helplessly.
      this.faceHead(drone.object);
      drone.object.rotation.x = Math.sin(time * 9 + i) * 0.25;
      const rig = drone.rig;
      if (rig) {
        const kick = Math.sin(time * 14 + i) * 0.7;
        rig.legL.rotation.x = kick;
        rig.legR.rotation.x = -kick;
        rig.armL.rotation.x = rig.armLRest - kick * 0.8;
        rig.armR.rotation.x = rig.armRRest + kick * 0.8;
      }
    } else {
      item.object.rotation.x += dt * 0.5;
      item.object.rotation.y += dt * 0.8;
    }
    if (Math.random() < 0.3) {
      this.v1.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(item.radius * 2).add(position);
      this.v2.set(0, 0.3, 0);
      this.particles.emit(this.v1, this.v2, this.accent, 0.5, 0.5, -0.2);
    }
    // Bash: swing a held object through enemies.
    if (item.velocity.lengthSq() > 9 && this.elapsed - item.bashAt > 0.35) {
      for (const target of this.drones) {
        if (target.state === 'off' || target.state === 'emerging' || target === drone) continue;
        if (position.distanceTo(target.object.position) > item.radius + ENEMIES[target.kind].radius) continue;
        item.bashAt = this.elapsed;
        this.flashes.spawn(target.object.position, WHITE, 0.1, 0.6, 0.15);
        this.sfx.catchHammer();
        this.damageDrone(target, 2);
        break;
      }
    }
  }

  /** Lets go of hand `i`'s object: thrown if flung fast, else it drops. */
  private releaseHeld(i: number, flung: boolean): void {
    const hand = this.hands[i];
    const item = hand.held;
    hand.held = null;
    hand.release = 0;
    if (item == null) return;
    item.state = 'flying';
    item.t = 0;
    item.thrown = false;
    const speed = item.velocity.length();
    if (!flung || speed < PSI_THROW_MIN) return;
    // Aim assist: snap to the enemy nearest the throw line.
    const position = item.object.position;
    this.v1.copy(item.velocity).divideScalar(speed);
    let best = this.profile.settings.aimAssist ? 0.8 : 0.95;
    for (const drone of this.drones) {
      if (drone.state === 'off' || drone.state === 'emerging' || drone.state === 'shot' || drone === item.drone) continue;
      if (drone.kind === 'pod' || drone.kind === 'orb') continue;
      const cos = this.v2.subVectors(drone.object.position, position).normalize().dot(this.v1);
      if (cos > best) {
        best = cos;
        this.v3.copy(this.v2);
      }
    }
    if (best > (this.profile.settings.aimAssist ? 0.8 : 0.95)) this.v1.copy(this.v3);
    item.velocity.copy(this.v1).multiplyScalar(Math.min(20, Math.max(9, speed * 1.6)));
    item.spin.set(Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5);
    item.thrown = true;
    this.flashes.spawn(position, this.accent, 0.1, 0.7, 0.2);
    this.sfx.crescent();
  }

  private updateThrowable(item: Throwable, dt: number): void {
    if (dt <= 0) return;
    const drone = item.drone;
    if (drone && (drone.state === 'off' || !drone.lifted)) {
      this.freeSlot(item);
      return;
    }
    item.t += dt;
    const position = item.object.position;
    item.previous.copy(position);
    item.velocity.y -= (item.thrown ? PSI_GRAVITY : 9.8) * this.gravityScale * dt;
    position.addScaledVector(item.velocity, dt);
    if (item.thrown) {
      item.object.rotation.x += item.spin.x * dt;
      item.object.rotation.y += item.spin.y * dt;
      item.object.rotation.z += item.spin.z * dt;
      this.v2.set(0, 0, 0);
      this.particles.emit(item.previous, this.v2, this.accent, 0.3, 0);
    }
    let hit: Drone | null = null;
    if (item.thrown) {
      for (const target of this.drones) {
        if (target.state === 'off' || target.state === 'emerging' || target === drone) continue;
        if (this.segmentHits(item.previous, position, target.object.position, ENEMIES[target.kind].radius + item.radius)) {
          hit = target;
          break;
        }
      }
    }
    const floor = drone ? ENEMIES[drone.kind].ground!.chest : this.surfaceBelow(position) + item.radius * 0.8;
    if (hit == null && position.y > floor && item.t < 4) return;
    if (item.thrown) this.psiImpact(position, hit, drone);
    if (drone) {
      position.y = floor;
      this.freeSlot(item);
      drone.object.rotation.set(0, drone.object.rotation.y, 0);
      if (item.thrown) this.damageDrone(drone, 3 + this.level('psion-mass'));
      return;
    }
    if (hit) {
      // Bounce off whatever it hit, then fall.
      item.velocity.multiplyScalar(-0.25);
      item.velocity.y = 2;
      item.thrown = false;
      return;
    }
    if (position.distanceTo(this.head) > 6 || item.t >= 4) {
      this.spawnDebris(item);
      return;
    }
    position.y = floor;
    item.object.rotation.set(0, item.object.rotation.y, 0);
    item.velocity.set(0, 0, 0);
    item.state = 'rest';
    this.particles.burst(position, WHITE, 12, 0.8, 0.3, this.v2);
    this.sfx.catchHammer();
  }

  /** A thrown object lands: blast damage around it, extra on a direct hit. */
  private psiImpact(at: Vector3, hit: Drone | null, thrown: Drone | null): void {
    const inferno = this.weaponDef.id === 'psion-inferno';
    const radius = 1 + 0.2 * this.level('psion-quake') + (inferno ? 0.6 : 0);
    const damage = 3 + Math.ceil(this.level('psion-mass') / 2);
    this.impactPoint.copy(at);
    for (const drone of this.drones) {
      if (drone.state === 'off' || drone === thrown) continue;
      if (drone.object.position.distanceTo(this.impactPoint) > radius + ENEMIES[drone.kind].radius) continue;
      if (inferno) drone.burn = Math.max(drone.burn, 3);
      this.damageDrone(drone, drone === hit ? damage + 2 : damage);
    }
    if (inferno) this.particles.burst(this.impactPoint, ORANGE, 50, 3, 0.7, this.v2);
    const p = this.impactPoint;
    this.flashes.spawn(p, this.accent, 0.2, 1.4 + radius * 0.3, 0.45);
    this.flashes.spawn(p, WHITE, 0.1, 0.6, 0.15);
    this.particles.burst(p, this.accent, 60, 4, 0.5, this.v2);
    this.particles.burst(p, GOLD, 25, 3, 0.4, this.v2);
    this.sfx.thunderHit();
    if (this.comicCooldown <= 0) {
      this.comicCooldown = 0.35;
      this.v1.copy(p).setY(p.y + 0.4);
      this.comic.random(this.hero, this.v1, this.accent, 0.5);
    }
  }

  // ---------------------------------------------------------------- bolts

  private fire(origin: Vector3, direction: Vector3, quiet = false): Bolt | null {
    const bolt = this.bolts.find((b) => !b.active);
    if (bolt == null) return null;
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
    bolt.blast = 0;
    bolt.zap = false;
    bolt.burn = 0;
    bolt.homing = 1;
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
    if (quiet) return bolt;
    this.flashes.spawn(origin, this.accent, 0.05, 0.25, 0.15);
    this.sfx.blast();
    return bolt;
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
      this.steer(bolt, Math.min(1, dt * HOMING_RATE * bolt.homing));
      if (bolt.gravity > 0) bolt.velocity.y -= bolt.gravity * this.gravityScale * dt;
      bolt.previous.copy(bolt.position);
      bolt.position.addScaledVector(bolt.velocity, dt);
      bolt.object.position.copy(bolt.position);
      this.v1.copy(bolt.position).add(bolt.velocity);
      bolt.object.lookAt(this.v1);
      this.v2.set(0, 0, 0);
      const crescent = bolt.kind === 'crescent';
      this.particles.emit(bolt.previous, this.v2, bolt.blast > 0 ? ORANGE : bolt.zap ? VIOLET : bolt.kind === 'bolt' ? CYAN : this.weaponColor, crescent ? 0.3 : 0.18, 0);
      if (bolt.blast > 0 && bolt.kind === 'bolt') this.particles.emit(bolt.previous, this.v2.set(0, 0.3, 0), DUST, 0.6, 0.5, -0.2);
      if (crescent) bolt.crescent.scale.setScalar(bolt.scale * (1 + (BOLT_LIFE - bolt.life) * 1.2));


      for (const drone of this.drones) {
        if (drone.state === 'off') continue;
        const radius = ENEMIES[drone.kind].radius + bolt.radius;
        if (this.segmentHits(bolt.previous, bolt.position, drone.object.position, radius)) {
          if (crescent) this.markHit('slice', drone.object.position, bolt.velocity, bolt.object.up);
          else this.markHit('blast', drone.object.position, bolt.velocity);
          if (bolt.burn > 0) drone.burn = Math.max(drone.burn, bolt.burn);
          this.v4.copy(drone.object.position);
          this.damageDrone(drone, bolt.damage);
          if (bolt.zap) this.chainLightning(this.v4, drone);
          if (bolt.blast > 0) {
            this.explodeAt(bolt.position, bolt.blast, 2);
            this.retireBolt(bolt);
            break;
          }
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

  private spawnDrone(kind: EnemyKind, speed: number, counted = true): Drone | null {
    if (kind === 'boss') return this.spawnBoss();
    const drone = this.drones.find((d) => d.state === 'off' && d.dying < 0 && d.kind === kind);
    if (drone == null) {
      // Pool exhausted: count it as killed so the wave can still finish.
      if (counted) this.run.kill(kind);
      return null;
    }
    drone.counted = counted;
    this.pickSpawn(drone.spawn, drone.normal);
    const ground = ENEMIES[kind].ground;
    if (ground) {
      // Walkers step out of the portal at floor level.
      drone.normal.y = 0;
      if (drone.normal.lengthSq() < 1e-4) drone.normal.set(0, 0, 1);
      drone.normal.normalize();
      drone.spawn.y = ground.chest;
      drone.stride = 0;
      drone.stagger = 0;
      drone.stun = 0;
      drone.meleeStage = 0;
      drone.volleys = 0;
      drone.push = false;
      drone.dash = 0;
      drone.dashCool = 1 + Math.random() * 2;
      drone.object.rotation.x = 0;
      drone.dropY = 0;
      drone.dropV = 0;
      if (this.twist === 'ceiling' && Math.random() < 0.7) {
        // Through the ceiling, close by: a portal overhead, then a drop.
        const a = Math.random() * Math.PI * 2;
        const r = 1.8 + Math.random() * 1.4;
        drone.spawn.set(this.head.x + Math.cos(a) * r, 3.1, this.head.z + Math.sin(a) * r);
        drone.normal.set(0, -1, 0);
        drone.dropY = 3.1;
      }
    }
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
    return drone;
  }

  // ---------------------------------------------------------------- bosses

  /** The region's lieutenant tears through a giant portal ahead. */
  private spawnBoss(): Drone | null {
    const region = this.run.stage.world.id;
    const boss = this.drones.find((d) => d.kind === 'boss' && d.world === region);
    if (boss == null) {
      this.run.kill('boss');
      return null;
    }
    const oblivax = region === 'oblivion';
    const scale = oblivax ? (this.script === 'finale' ? 3.2 : 1.5) : 1 + Math.min(5, REGIONS.indexOf(region)) * 0.2;
    boss.counted = true;
    boss.maxHp = ENEMIES.boss.hp * scale;
    boss.hp = boss.maxHp;
    boss.bossPhase = 1;
    boss.attackTimer = 4;
    boss.state = 'emerging';
    boss.t = 0;
    this.v1.set(this.forward.x, 0, this.forward.z);
    if (this.v1.lengthSq() < 1e-4) this.v1.set(0, 0, -1);
    this.v1.normalize();
    boss.spawn.copy(this.head).addScaledVector(this.v1, oblivax ? 6 : 4.6);
    boss.spawn.y = this.head.y + (oblivax ? 0.55 : 0.35);
    boss.normal.copy(this.v1).negate();
    boss.object.position.copy(boss.spawn);
    boss.object.scale.setScalar(0.01);
    boss.object.visible = true;
    boss.portal.position.copy(boss.spawn);
    this.v2.copy(boss.spawn).add(boss.normal);
    boss.portal.lookAt(this.v2);
    boss.portal.visible = true;
    boss.portalMaterial.opacity = 1;
    this.particles.burst(boss.spawn, ENEMY_COLOR.boss, 160, 3, 0.9, this.v2);
    this.flashes.spawn(boss.spawn, ENEMY_COLOR.boss, 0.5, 3, 0.8);
    this.sfx.thunder();
    this.riftLevel = Math.min(0.6, this.riftLevel + 0.15);
    this.music.play(oblivax ? 'oblivion' : 'void-rift');
    const villain = oblivax ? OBLIVAX.name : chapterForWorld(region)?.villain.name ?? 'BOSS';
    this.comic.pop('BOSS!', this.v2.copy(boss.spawn).setY(boss.spawn.y + 0.9), ENEMY_COLOR.boss, 0.9);
    this.taunt = `${villain} has arrived!`;
    return boss;
  }

  /** Boss AI: strafe, fire orb volleys, summon minions at each phase. */
  private updateBoss(boss: Drone, dt: number, time: number): void {
    const object = boss.object;
    this.v3.set(-boss.normal.z, 0, boss.normal.x).normalize();
    object.position.copy(boss.spawn).addScaledVector(boss.normal, 0.6);
    object.position.addScaledVector(this.v3, Math.sin(time * 0.6) * (boss.world === 'oblivion' ? 0.5 : 1.4));
    object.position.y += Math.sin(time * 1.3) * 0.25;
    object.lookAt(this.head);
    boss.eye.scale.setScalar(1 + Math.sin(time * 6) * 0.15);
    if (this.bossLocked) return;
    const fraction = boss.hp / boss.maxHp;
    const phase = fraction > 0.66 ? 1 : fraction > 0.33 ? 2 : 3;
    if (phase !== boss.bossPhase) {
      boss.bossPhase = phase;
      const taunts = this.story?.taunts ?? [];
      const taunt = taunts[(phase - 1) % Math.max(1, taunts.length)] ?? 'ENOUGH!';
      this.taunt = taunt;
      this.comic.pop('RAAAGH!', this.v2.copy(object.position).setY(object.position.y + 0.9), ENEMY_COLOR.boss, 0.8);
      this.flashes.spawn(object.position, ENEMY_COLOR.boss, 0.5, 2.5, 0.6);
      const minion = REGIONS.indexOf(boss.world) === 1 ? 'swarmer' : 'drone';
      for (let i = 0; i < phase + 1; i += 1) this.spawnDrone(minion, 0.9 + phase * 0.2, false);
    }
    boss.attackTimer -= dt;
    if (boss.attackTimer <= 0) {
      boss.attackTimer = 3.4 - phase * 0.7;
      for (let i = 0; i < phase + 1; i += 1) {
        this.v1.copy(object.position);
        this.v1.x += (Math.random() - 0.5) * 0.9;
        this.v1.y += (Math.random() - 0.5) * 0.5;
        this.spawnOrb(this.v1, 1.8 + phase * 0.45);
      }
      this.sfx.blast();
    }
  }

  private spawnOrb(from: Vector3, speed: number): void {
    const orb = this.drones.find((d) => d.state === 'off' && d.kind === 'orb');
    if (orb == null) return;
    orb.counted = false;
    orb.hp = 1;
    orb.state = 'fly';
    orb.t = 0;
    orb.speed = speed;
    orb.object.position.copy(from);
    orb.object.scale.setScalar(1);
    orb.object.visible = true;
    orb.portal.visible = false;
  }

  // ---------------------------------------------------------------- hostages

  /** Hostage pods hover in an arc around the player. */
  private spawnPods(count: number): void {
    this.hostagesSaved = 0;
    this.hostagesTotal = count;
    this.v1.set(this.forward.x, 0, this.forward.z);
    if (this.v1.lengthSq() < 1e-4) this.v1.set(0, 0, -1);
    this.v1.normalize();
    let placed = 0;
    for (const pod of this.drones) {
      if (placed >= count) break;
      if (pod.kind !== 'pod' || pod.state !== 'off') continue;
      const angle = count === 1 ? 0 : -1.1 + (2.2 * placed) / (count - 1);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const x = this.v1.x * cos - this.v1.z * sin;
      const z = this.v1.x * sin + this.v1.z * cos;
      pod.counted = false;
      pod.hp = ENEMIES.pod.hp;
      pod.state = 'hold';
      pod.t = Math.random() * 6;
      pod.spawn.set(this.head.x + x * 2.3, this.head.y - 0.25 + (placed % 2) * 0.3, this.head.z + z * 2.3);
      pod.object.position.copy(pod.spawn);
      pod.object.scale.setScalar(1);
      pod.object.visible = true;
      pod.object.lookAt(this.head.x, pod.spawn.y, this.head.z);
      pod.portal.visible = false;
      placed += 1;
    }
  }

  private freePod(pod: Drone): void {
    this.hostagesSaved += 1;
    const at = pod.object.position;
    this.flashes.spawn(at, GOLD, 0.2, 1.2, 0.6);
    for (let i = 0; i < 30; i += 1) {
      this.v1.set((Math.random() - 0.5) * 0.3, Math.random() * 0.2, (Math.random() - 0.5) * 0.3).add(at);
      this.v2.set(0, 1.5 + Math.random() * 2, 0);
      this.particles.emit(this.v1, this.v2, Math.random() < 0.5 ? GOLD : WHITE, 1.2, 0.2, -0.5);
    }
    this.comic.pop('THANK YOU!', this.v1.copy(at).setY(at.y + 0.35), GOLD, 0.5);
    this.sfx.coin();
    this.run.coins += ENEMY_COINS.pod;
    this.run.score += ENEMIES.pod.score;
    this.retireDrone(pod);
  }

  // ---------------------------------------------------------------- power-ups & overdrive

  /** Damage multiplier from the hero's power core and the power buff. */
  private damageScale(): number {
    return (hasUnlock(this.profile, `core-${this.hero}`) ? 1.25 : 1) * (this.buffPower > 0 ? 2 : 1);
  }

  private dropPickup(at: Vector3): void {
    if (Math.random() > 0.15) return;
    const roll = Math.random();
    const kind: PickupKind = this.run.health < this.run.maxHealth && roll < 0.4 ? 'heal' : roll < 0.7 ? 'rapid' : 'power';
    const pickup = this.pickups.find((p) => !p.active && p.kind === kind);
    if (pickup == null) return;
    pickup.active = true;
    pickup.life = 10;
    pickup.object.position.copy(at);
    pickup.object.visible = true;
  }

  private retirePickup(pickup: Pickup): void {
    pickup.active = false;
    pickup.object.visible = false;
  }

  private updatePowerups(realDt: number, dt: number, time: number): void {
    if (this.paused) return;
    this.buffRapid = Math.max(0, this.buffRapid - dt);
    this.buffPower = Math.max(0, this.buffPower - dt);
    // Pickups drift toward the player; touch one with either hand to take it.
    for (const pickup of this.pickups) {
      if (!pickup.active) continue;
      pickup.life -= dt;
      if (pickup.life <= 0 || this.run.phase === 'title') {
        this.retirePickup(pickup);
        continue;
      }
      const object = pickup.object;
      this.v1.copy(this.head).addScaledVector(this.forward, 0.45);
      this.v1.y -= 0.25;
      this.v2.subVectors(this.v1, object.position);
      if (this.v2.length() > 0.05) object.position.addScaledVector(this.v2.normalize(), 0.35 * dt);
      object.rotation.y += dt * 2;
      object.scale.setScalar(1 + Math.sin(time * 5) * 0.1);
      for (const hand of this.hands) {
        if (!hand.tracked) continue;
        if (hand.gauntlet.palmPoint.distanceTo(object.position) > 0.16 && (hand.indexTip?.distanceTo(object.position) ?? 1) > 0.12) continue;
        this.collect(pickup);
        break;
      }
    }
    // OVERDRIVE: clap the palms together once the meter is full.
    if (!hasUnlock(this.profile, `overdrive-${this.hero}`) || !this.powersLive) {
      this.clapArmed = false;
    } else if (this.hands[0].tracked && this.hands[1].tracked) {
      const gap = this.hands[0].gauntlet.palmPoint.distanceTo(this.hands[1].gauntlet.palmPoint);
      if (gap > 0.22) this.clapArmed = true;
      if (this.clapArmed && gap < 0.09 && this.overdrive >= 1) {
        this.clapArmed = false;
        this.v1.addVectors(this.hands[0].gauntlet.palmPoint, this.hands[1].gauntlet.palmPoint).multiplyScalar(0.5);
        this.unleashOverdrive(this.v1);
      }
    }
    if (this.shockwave && this.shockwaveTime >= 0) {
      this.shockwaveTime += realDt;
      const t = this.shockwaveTime / 0.7;
      if (t >= 1) {
        this.shockwave.visible = false;
        this.shockwaveTime = -1;
      } else {
        this.shockwave.scale.setScalar(0.2 + t * 6);
        (this.shockwave.material as MeshBasicMaterial).opacity = 1 - t;
      }
    }
  }

  private collect(pickup: Pickup): void {
    const at = pickup.object.position;
    this.flashes.spawn(at, WHITE, 0.05, 0.4, 0.25);
    this.sfx.coin();
    if (pickup.kind === 'heal') {
      this.run.heal(1);
      this.comic.pop('HEAL!', at, new Color('#39FF88'), 0.35);
    } else if (pickup.kind === 'rapid') {
      this.buffRapid = BUFF_SECONDS;
      this.comic.pop('RAPID!', at, GOLD, 0.35);
    } else {
      this.buffPower = BUFF_SECONDS;
      this.comic.pop('POWER!', at, MAGENTA, 0.35);
    }
    this.retirePickup(pickup);
  }

  private chargeOverdrive(amount: number): void {
    if (!hasUnlock(this.profile, `overdrive-${this.hero}`)) return;
    const before = this.overdrive;
    this.overdrive = Math.min(1, this.overdrive + amount);
    if (before < 1 && this.overdrive >= 1) this.sfx.swap();
  }

  /** Shockwave from the clap: wrecks everything nearby, hurts the boss. */
  private unleashOverdrive(at: Vector3): void {
    this.overdrive = 0;
    this.slowmo = 1.1;
    this.sfx.explode(true);
    this.sfx.thunder();
    this.flashes.spawn(at, this.accent, 0.2, 3, 0.8);
    this.particles.burst(at, this.accent, 160, 5, 0.9, this.v2);
    this.comic.pop('SURGE!', this.v2.copy(at).setY(at.y + 0.3), this.accent, 0.8);
    if (this.shockwave) {
      this.shockwave.position.copy(at);
      this.shockwave.rotation.set(Math.PI / 2, 0, 0);
      (this.shockwave.material as MeshBasicMaterial).color.copy(this.accent);
      this.shockwave.visible = true;
      this.shockwaveTime = 0;
    }
    for (const drone of this.drones) {
      if (drone.state === 'off' || drone.kind === 'pod') continue;
      if (drone.object.position.distanceTo(at) > 5.5) continue;
      this.damageDrone(drone, drone.kind === 'boss' ? 8 : 6, true);
    }
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
      if (d <= 2.6 || d >= 8) continue;
      if (!this.profile.settings.allAround) {
        // Front arc only (about +/-100 degrees from where the player faces).
        this.v2.subVectors(this.v1, this.head).setY(0).normalize();
        this.v3.set(this.forward.x, 0, this.forward.z).normalize();
        if (this.v2.dot(this.v3) < -0.17) continue;
      }
      walls.push(object);
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
    const angle = (Math.random() - 0.5) * (this.profile.settings.allAround ? Math.PI * 2 : Math.PI * 0.8);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = this.v1.x * cos - this.v1.z * sin;
    const z = this.v1.x * sin + this.v1.z * cos;
    const ringRadius = 4.5 + Math.random() * 2;
    position.set(this.head.x + x * ringRadius, this.head.y + (Math.random() - 0.35) * 1.0, this.head.z + z * ringRadius);
    normal.set(-x, 0, -z);
  }

  private updateDrones(dt: number, time: number): void {
    this.gibs.update(dt, (at, velocity, heavy) => this.gore.emit(at, velocity, heavy ? ICHOR_DARK : ICHOR, 0.7, 0.5, 6));
    this.gore.update(dt);
    this.pools.update(dt);
    for (const drone of this.drones) {
      if (drone.state === 'off') {
        if (drone.dying >= 0) this.updateDeath(drone, dt);
        continue;
      }
      drone.t += dt;
      drone.ring.rotation.z += dt * (drone.state === 'charge' ? 18 : 4);
      const object = drone.object;

      if (drone.portal.visible) {
        const p = Math.min(1, drone.t / EMERGE_TIME);
        drone.portal.scale.setScalar(0.2 + p * ENEMIES[drone.kind].radius * 7);
        drone.portalMaterial.opacity = drone.state === 'emerging' ? 1 : Math.max(0, drone.portalMaterial.opacity - dt * 1.5);
        if (drone.portalMaterial.opacity <= 0) drone.portal.visible = false;
      }

      if (drone.burn > 0 || drone.shock > 0) this.updateAfflictions(drone, dt);
      if ((drone.state as DroneState) === 'off') continue;
      if (drone.state === 'boss') {
        this.updateBoss(drone, dt, time);
        continue;
      }
      if (drone.lifted) continue;
      if (drone.state === 'hold') {
        // Hostage pod: hover, spin the bars, wave for help.
        drone.object.position.copy(drone.spawn);
        drone.object.position.y += Math.sin(time * 1.5 + drone.t) * 0.04;
        const bars = drone.object.getObjectByName('Bars');
        if (bars) bars.rotation.y += dt * 0.8;
        const civilian = drone.object.getObjectByName('Civilian');
        if (civilian) civilian.rotation.z = Math.sin(time * 6 + drone.t) * 0.15;
        continue;
      }
      if (drone.state === 'shot') {
        // Enemy plasma shot: straight line, so it can be dodged or shot down.
        drone.object.position.addScaledVector(drone.offset, dt);
        drone.ring.rotation.x += dt * 8;
        const distance = drone.object.position.distanceTo(this.head);
        if (distance < 0.28 || drone.t > 6) {
          this.retireDrone(drone);
          if (distance < 0.28) this.hurtPlayer(ENEMIES.orb.damage, false, drone.object.position);
        }
        continue;
      }
      if ((drone.state === 'approach' || drone.state === 'aim' || drone.state === 'melee') && ENEMIES[drone.kind].ground) {
        this.updateWalker(drone, dt, time);
        continue;
      }
      if (drone.state === 'fly') {
        // Boss orb: home in on the player's head.
        this.v1.subVectors(this.head, drone.object.position);
        const distance = this.v1.length();
        drone.object.position.addScaledVector(this.v1.normalize(), drone.speed * dt);
        drone.ring.rotation.x += dt * 6;
        if (distance < 0.3 || drone.t > 8) {
          this.retireDrone(drone);
          if (distance < 0.3) this.hurtPlayer(ENEMIES.orb.damage, false, drone.object.position);
        }
        continue;
      }
      if (drone.state === 'emerging') {
        const p = Math.min(1, drone.t / EMERGE_TIME);
        object.scale.setScalar(p);
        object.position.copy(drone.spawn).addScaledVector(drone.normal, 0.35 * p);
        if (ENEMIES[drone.kind].ground) this.faceHead(object);
        else object.lookAt(this.head);
        if (p >= 1) {
          drone.state = drone.kind === 'boss' ? 'boss' : 'approach';
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
        this.hurtPlayer(def.damage, drone.counted);
      }
    }
  }

  private hurtPlayer(damage: number, counted: boolean, from?: Vector3): void {
    // The prologue teaches; it never kills.
    if (this.script === 'prologue') damage = 0;
    // Blood on the side of the view the hit came from.
    let angle = Math.random() * Math.PI * 2;
    if (from) {
      this.world.camera.getWorldQuaternion(this.camQuat).invert();
      this.sa.subVectors(from, this.head).applyQuaternion(this.camQuat);
      angle = Math.atan2(this.sa.y, this.sa.x) - Math.PI;
    }
    this.blood.hit(angle, damage > 0 ? 1 : 0.5);
    if (counted) this.run.hit(damage);
    else this.run.damage(damage);
    this.damageMaterial.opacity = 0.18;
    this.damage.visible = true;
    this.sfx.hurt();
    this.v1.copy(this.head).addScaledVector(this.forward, 0.6);
    this.comic.random('hurt', this.v1, MAGENTA, 0.3);
  }

  /** `raw` skips the hero damage multiplier (already applied, or environmental). */
  /** Keeps each walker's contact shadow under its feet. */
  private updateBlobs(): void {
    for (const drone of this.drones) {
      const blob = drone.blob;
      if (blob == null) continue;
      blob.visible = (drone.state !== 'off' || drone.dying >= 0) && drone.state !== 'shot';
      if (!blob.visible) continue;
      const position = drone.object.position;
      blob.position.set(position.x, 0.006, position.z);
      blob.scale.setScalar(ENEMIES[drone.kind].radius * (drone.dying >= 0 ? 4.2 : 3.2) * Math.max(0.01, drone.object.scale.x));
    }
  }

  /** Turns an upright walker to face the player (yaw only). */
  private faceHead(object: Object3D): void {
    object.rotation.set(0, Math.atan2(this.head.x - object.position.x, this.head.z - object.position.z), 0);
  }

  /**
   * Walking alien. Gunners advance to their range and fire a volley or two,
   * then push in; everyone ends up in melee range for a telegraphed strike
   * that a blade can parry and a step back can dodge. Stalkers dash in.
   * Walk cycle: legs, knees, counter-swinging arms, hip sway and bob.
   */
  private updateWalker(drone: Drone, dt: number, time: number): void {
    const def = ENEMIES[drone.kind];
    const ground = def.ground!;
    const object = drone.object;
    const rig = drone.rig;
    this.v1.set(this.head.x - object.position.x, 0, this.head.z - object.position.z);
    const distance = this.v1.length();
    this.v1.normalize();
    this.v3.set(-this.v1.z, 0, this.v1.x);
    this.faceHead(object);
    object.rotation.x = 0;
    if (drone.snare > 0) {
      drone.snare = Math.max(0, drone.snare - dt);
      drone.cocoon.visible = drone.snare > 0;
      drone.cocoon.position.copy(object.position);
      drone.cocoon.scale.setScalar(def.radius * 1.35 * (1 + Math.sin(time * 6) * 0.04));
      drone.cocoon.rotation.y += dt * 0.8;
      object.position.y = ground.chest;
      return;
    }
    if (drone.dropY > 0) {
      // Falling from the ceiling; a heavy landing.
      drone.dropV += 9.8 * this.gravityScale * dt;
      drone.dropY -= drone.dropV * dt;
      object.position.y = Math.max(ground.chest, drone.dropY);
      if (rig) {
        rig.legL.rotation.x = -0.4;
        rig.legR.rotation.x = 0.3;
        rig.armL.rotation.x = rig.armLRest - 1.2;
        rig.armR.rotation.x = rig.armRRest - 1.2;
      }
      if (drone.dropY <= ground.chest) {
        drone.dropY = 0;
        drone.stagger = 0.35;
        drone.knock.set(0, 0, 0);
        this.v2.set(object.position.x, 0.02, object.position.z);
        this.particles.burst(this.v2, DUST, 24, 1.5, 0.5, this.v4);
        this.sfx.catchHammer();
      }
      return;
    }
    if (drone.stagger > 0) {
      // Knocked back a step, upper body thrown back.
      const k = drone.stagger / 0.35;
      drone.stagger -= dt;
      object.position.addScaledVector(drone.knock, dt * 1.4 * k);
      object.position.y = ground.chest;
      if (rig) rig.upper.rotation.x = rig.upperRest - 0.45 * k;
      return;
    }
    if (drone.stun > 0) {
      // Parried: reeling, wide open.
      drone.stun -= dt;
      object.position.y = ground.chest - 0.04;
      object.rotation.z = Math.sin(time * 9) * 0.06;
      if (rig) {
        rig.upper.rotation.x = rig.upperRest - 0.35;
        rig.armR.rotation.x = rig.armRRest + 0.6;
      }
      if (drone.stun <= 0) object.rotation.z = 0;
      return;
    }
    const meleeHero = this.hero === 'ronin' || this.hero === 'talon' || this.hero === 'tempest';
    let moving = false;
    let pace = 1;
    if (drone.state === 'approach') {
      const ranged = ground.stopDistance > 0 && !drone.push;
      const target = ranged ? ground.stopDistance : MELEE_RANGE;
      if (distance <= target + 0.08) {
        drone.state = ranged ? 'aim' : 'melee';
        drone.attackTimer = 0.6 + Math.random() * (ranged ? ground.fireInterval : 0.5);
        drone.meleeStage = 0;
        drone.melee = 0;
      } else {
        // Stalkers dash in from mid range.
        drone.dashCool -= dt;
        if (drone.kind === 'swarmer' && drone.dash <= 0 && drone.dashCool <= 0 && distance > 1.8 && distance < 3.8) {
          drone.dash = 0.35;
          drone.dashCool = 2.5 + Math.random() * 1.5;
          this.particles.burst(object.position, ENEMY_COLOR.swarmer, 12, 1.2, 0.3, this.v2);
          this.sfx.crescent();
        }
        if (drone.dash > 0) {
          drone.dash -= dt;
          pace = 4;
        }
        const step = Math.min(distance - target, drone.speed * (PACE[drone.kind] ?? 1) * pace * dt);
        object.position.addScaledVector(this.v1, step);
        object.position.addScaledVector(this.v3, Math.sin(time * 2 + drone.phase) * def.weave * dt);
        drone.stride += step;
        moving = true;
      }
    } else if (drone.state === 'aim') {
      // Holding at range: shuffle sideways and fire; then push in.
      if (distance > ground.stopDistance + 1.2) drone.state = 'approach';
      const shuffle = Math.sin(time * 0.8 + drone.phase) * 0.25 * dt;
      object.position.addScaledVector(this.v3, shuffle);
      drone.stride += Math.abs(shuffle);
      drone.attackTimer -= dt;
      if (drone.attackTimer <= 0) {
        drone.attackTimer = ground.fireInterval * (0.8 + Math.random() * 0.4);
        this.enemyFire(drone, ground.shots, ground.shotSpeed);
        drone.volleys += 1;
        if (drone.volleys >= (meleeHero ? 1 : 2)) {
          drone.push = true;
          drone.state = 'approach';
        }
      }
    } else {
      if (distance > MELEE_RANGE + 0.6 && drone.meleeStage !== 2) {
        drone.state = 'approach';
        drone.meleeStage = 0;
      } else if (distance < MELEE_RANGE - 0.25) {
        // Too close: step back to sword's length.
        object.position.addScaledVector(this.v1, -0.6 * dt);
      }
      this.updateMelee(drone, dt);
    }
    object.position.y = ground.chest;
    if (rig == null) return;
    // Walk cycle.
    const cadence = drone.kind === 'swarmer' ? 9 : drone.kind === 'titan' ? 4.5 : 6.5;
    const p = drone.stride * cadence;
    const amp = moving ? Math.min(0.7, 0.45 * pace) : 0.06;
    const s = Math.sin(p);
    rig.legL.rotation.x = s * amp;
    rig.legR.rotation.x = -s * amp;
    // Knees bend while each leg swings forward.
    rig.kneeL.rotation.x = Math.max(0, Math.cos(p)) * amp * 1.4 + 0.08;
    rig.kneeR.rotation.x = Math.max(0, -Math.cos(p)) * amp * 1.4 + 0.08;
    if (drone.meleeStage === 0 || drone.state !== 'melee') {
      const swing = drone.kind === 'swarmer' || drone.kind === 'blade' ? s * amp * 0.7 : s * amp * 0.12;
      rig.armL.rotation.x = rig.armLRest - swing;
      rig.armR.rotation.x = rig.armRRest + swing;
      rig.elbowR.rotation.x = rig.elbowRRest;
      // Lean into a run; twist the torso against the stride.
      rig.upper.rotation.x = rig.upperRest + (moving ? 0.12 * pace * 0.5 : 0);
      rig.upper.rotation.y = s * amp * 0.25;
    }
    object.rotation.z = Math.sin(p) * amp * 0.06;
    object.position.y = ground.chest + Math.abs(Math.cos(p)) * (moving ? (this.gravityScale < 1 ? 0.12 : 0.03) : 0.004) - (moving ? 0.015 : 0);
  }

  /** Telegraphed strike: wind up, swing (dodge by stepping back), recover. */
  private updateMelee(drone: Drone, dt: number): void {
    const rig = drone.rig;
    const def = ENEMIES[drone.kind];
    const windup = drone.kind === 'blade' ? 0.75 : drone.kind === 'swarmer' ? 0.45 : drone.kind === 'titan' ? 0.9 : 0.65;
    const recover = drone.kind === 'swarmer' ? 0.5 : drone.kind === 'blade' ? 0.7 : 1.0;
    drone.melee += dt;
    if (drone.meleeStage === 0) {
      drone.attackTimer -= dt;
      if (drone.attackTimer <= 0) {
        drone.meleeStage = 1;
        drone.melee = 0;
        this.sfx.creak();
      }
    } else if (drone.meleeStage === 1 && drone.melee >= windup) {
      drone.meleeStage = 2;
      drone.melee = 0;
      // The swing lands unless the player stepped out of reach.
      this.sa.set(this.head.x - drone.object.position.x, 0, this.head.z - drone.object.position.z);
      if (this.sa.length() <= MELEE_RANGE + 0.45) {
        if (this.shieldBlocks(drone.object.position)) {
          // Blocked: the attacker reels.
          drone.meleeStage = 3;
          drone.stun = 1;
          this.sfx.clang();
          this.shield!.getWorldPosition(this.sc);
          this.particles.burst(this.sc, GOLD, 30, 2.5, 0.3, this.v2);
          this.comic.pop('BLOCKED!', this.v4.copy(this.sc).setY(this.sc.y + 0.25), this.weaponColor, 0.4);
        } else {
          this.hurtPlayer(def.damage, false, drone.object.position);
          this.sfx.slash();
        }
      } else this.sfx.crescent();
    } else if (drone.meleeStage === 2 && drone.melee >= 0.16) {
      drone.meleeStage = 3;
      drone.melee = 0;
    } else if (drone.meleeStage === 3 && drone.melee >= recover) {
      drone.meleeStage = 0;
      drone.attackTimer = 0.2 + Math.random() * 0.6;
    }
    if (rig == null) return;
    // Pose: raise the weapon arm, swing it down across the body, settle.
    let raise = 0;
    if (drone.meleeStage === 1) raise = Math.min(1, drone.melee / windup);
    else if (drone.meleeStage === 2) raise = 1 - 2.2 * Math.min(1, drone.melee / 0.16);
    else if (drone.meleeStage === 3) raise = -1.2 * (1 - Math.min(1, drone.melee / recover));
    rig.armR.rotation.x = rig.armRRest - 1.7 * raise;
    rig.elbowR.rotation.x = rig.elbowRRest - 0.5 * Math.max(0, raise);
    rig.upper.rotation.y = -0.45 * raise;
    rig.upper.rotation.x = rig.upperRest + (raise < 0 ? 0.2 : -0.08 * raise);
    if (drone.kind === 'swarmer') rig.armL.rotation.x = rig.armLRest - 1.4 * raise;
    // The weapon glows hotter through the wind-up.
    drone.eye.scale.setScalar(1 + Math.max(0, raise) * 0.6);
  }

  /** A player blade (base..tip) meeting an enemy weapon mid-swing parries it. */
  private checkParry(base: Vector3, tip: Vector3): void {
    for (const drone of this.drones) {
      if (drone.state !== 'melee' || drone.rig?.bladeBase == null || drone.rig.bladeTip == null) continue;
      const windup = drone.kind === 'blade' ? 0.75 : drone.kind === 'swarmer' ? 0.45 : drone.kind === 'titan' ? 0.9 : 0.65;
      const open = (drone.meleeStage === 1 && drone.melee > windup * 0.4) || drone.meleeStage === 2;
      if (!open) continue;
      drone.rig.bladeBase.getWorldPosition(this.bladeA);
      drone.rig.bladeTip.getWorldPosition(this.bladeB);
      if (segmentDistance(base, tip, this.bladeA, this.bladeB, this.sc, this.sa, this.sb, this.v4) > 0.12) continue;
      drone.meleeStage = 3;
      drone.melee = 0;
      drone.stun = drone.kind === 'titan' ? 0.8 : 1.3;
      this.sfx.clang();
      this.flashes.spawn(this.sc, WHITE, 0.1, 0.7, 0.2);
      this.particles.burst(this.sc, GOLD, 40, 3, 0.35, this.v2);
      this.v1.copy(this.sc).setY(this.sc.y + 0.25);
      this.comic.pop('PARRY!', this.v1, GOLD, 0.45);
      this.slowmo = Math.max(this.slowmo, 0.25);
    }
  }

  /**
   * Blade segment (base..tip, previous tip) against an enemy's body. Walkers
   * are tested as a capsule from the knees to the head so a cut anywhere on
   * the body counts. Writes the contact point to `hitPoint`.
   */
  private bladeHits(drone: Drone, base: Vector3, tip: Vector3, prevTip: Vector3): boolean {
    const def = ENEMIES[drone.kind];
    const at = drone.object.position;
    if (def.ground == null || drone.lifted) {
      const radius = def.radius + 0.05;
      if (this.segmentHits(base, tip, at, radius) || this.segmentHits(prevTip, tip, at, radius)) {
        this.hitPoint.copy(at);
        return true;
      }
      return false;
    }
    const scale = def.ground.chest / 1.15;
    this.sa.set(at.x, at.y - 0.75 * scale, at.z);
    this.sb.set(at.x, at.y + 0.55 * scale, at.z);
    const radius = def.radius * 0.75 + 0.06;
    let d = segmentDistance(base, tip, this.sa, this.sb, this.hitPoint, this.bladeA, this.bladeB, this.v4);
    if (d <= radius) return true;
    // Swept: the arc the tip and mid-blade travelled since last frame.
    this.sc.copy(base).lerp(tip, 0.5);
    d = segmentDistance(prevTip, tip, this.sa, this.sb, this.hitPoint, this.bladeA, this.bladeB, this.v4);
    if (d <= radius) return true;
    d = segmentDistance(this.sc, prevTip, this.sa, this.sb, this.hitPoint, this.bladeA, this.bladeB, this.v4);
    return d <= radius;
  }

  /** Alien ichor: a spray along `direction` at `at`. */
  private bleed(at: Vector3, direction: Vector3, count: number): void {
    for (let i = 0; i < count; i += 1) {
      this.v2.set(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).multiplyScalar(1.6).addScaledVector(direction, 1.8 + Math.random() * 1.5);
      this.gore.emit(at, this.v2, Math.random() < 0.35 ? ICHOR_DARK : ICHOR, 0.6 + Math.random() * 0.5, 0.6, 8);
    }
  }

  /**
   * A walker dies like a body: knocked back, legs give, it hits the floor,
   * lies still, then sinks away. Blade kills sever a part: a horizontal cut
   * halves it at the waist, a high cut takes the head, others take an arm.
   */
  private killWalker(drone: Drone, big: boolean): void {
    const def = ENEMIES[drone.kind];
    const object = drone.object;
    drone.state = 'off';
    drone.dying = 0;
    drone.snare = 0;
    drone.cocoon.visible = false;
    drone.lifted = false;
    drone.stagger = 0;
    drone.stun = 0;
    drone.eye.scale.setScalar(1);
    drone.portal.visible = false;
    object.rotation.z = 0;
    drone.feet.set(object.position.x, 0, object.position.z);
    drone.knock.copy(this.hitDir).setY(0);
    if (drone.knock.lengthSq() < 1e-4) drone.knock.set(object.position.x - this.head.x, 0, object.position.z - this.head.z);
    drone.knock.normalize().multiplyScalar(this.hitStyle === 'slice' ? 0.3 : big ? 1.4 : 0.9);
    const chest = def.ground!.chest;
    const scale = chest / 1.15;
    this.pools.spill(drone.feet.x + drone.knock.x * 0.6, drone.feet.z + drone.knock.z * 0.6, big ? 1.5 : 0.9 * scale);
    if (this.hitStyle === 'impale') {
      this.bleed(this.hitPoint, this.hitDir, 30);
      this.sfx.splat();
    } else if (this.hitStyle === 'slice') {
      // Sever along the blade's cut plane.
      let name: PartName = 'Upper';
      if (this.hitPoint.y > object.position.y + 0.28 * scale) name = 'Head';
      else if (Math.abs(this.cutNormal.y) < 0.55) {
        this.sa.set(Math.cos(object.rotation.y), 0, -Math.sin(object.rotation.y));
        name = this.sb.subVectors(this.hitPoint, object.position).dot(this.sa) >= 0 ? 'ArmR' : 'ArmL';
      }
      const part = drone.parts[name];
      if (part) {
        this.sc.copy(this.hitDir).multiplyScalar(name === 'Upper' ? 1.6 : 2.2);
        this.sc.y += name === 'Head' ? 3 : name === 'Upper' ? 1.8 : 1.4;
        this.gibs.throw(part, this.sc, name === 'Upper' ? 6 : 12);
      }
      this.bleed(this.hitPoint, this.hitDir, 40);
      this.flashes.spawn(this.hitPoint, ICHOR, 0.1, 0.8, 0.25);
      this.sfx.splat();
      this.sfx.slash();
    } else {
      this.bleed(object.position, this.hitDir, big ? 30 : 18);
      this.flashes.spawn(object.position, ENEMY_COLOR[drone.kind], 0.1, big ? 1.4 : 0.7, 0.3);
      this.sfx.explode(big);
    }
  }

  /**
   * A thrust that drives the blade tip into a walker's body impales it: a
   * killing blow leaves the body skewered on the blade (bleeding) until the
   * hand flings it off, opens, or it slides off.
   */
  private tryImpale(index: number, base: Vector3, tip: Vector3, direction: Vector3): void {
    const hand = this.hands[index];
    if (hand.tipVel.dot(direction) < 0.9) return;
    for (const drone of this.drones) {
      const def = ENEMIES[drone.kind];
      if (def.ground == null || drone.state === 'off' || drone.state === 'emerging' || drone.lifted) continue;
      if (this.elapsed - drone.bladeHitAt < 0.3) continue;
      const scale = def.ground.chest / 1.15;
      const at = drone.object.position;
      this.sa.set(at.x, at.y - 0.6 * scale, at.z);
      this.sb.set(at.x, at.y + 0.45 * scale, at.z);
      if (segmentDistance(tip, tip, this.sa, this.sb, this.sc, this.bladeA, this.bladeB, this.v4) > def.radius * 0.8) continue;
      drone.bladeHitAt = this.elapsed;
      this.markHit('impale', tip, direction);
      this.damageDrone(drone, 4);
      this.sfx.slash();
      // damageDrone may have killed it.
      if ((drone.state as DroneState) === 'off' && drone.dying >= 0) {
        drone.heldBy = index;
        drone.t = 0;
        hand.skewer = drone;
        this.v1.copy(tip).setY(tip.y + 0.3);
        this.comic.pop('SKEWERED!', this.v1, ICHOR, 0.45);
      } else this.bleed(tip, direction, 20);
      return;
    }
    void base;
  }

  /** A body hanging on a blade: dangles, bleeds, flies off when flung. */
  private updateSkewered(drone: Drone, dt: number): void {
    const hand = this.hands[drone.heldBy];
    const blade = this.hero === 'ronin' ? hand.sword : this.hero === 'talon' ? hand.claws : null;
    if (blade == null || !hand.tracked || blade.extension < 0.6) {
      this.releaseBody(drone, this.v1.set(0, 0, 0));
      return;
    }
    drone.t += dt;
    const object = drone.object;
    this.sb.copy(blade.base).lerp(blade.tip, 0.65);
    object.position.copy(this.sb);
    object.position.y -= 0.12;
    this.faceHead(object);
    object.rotation.x = -0.35;
    const rig = drone.rig;
    if (rig) {
      const sway = Math.sin(this.elapsed * 5) * 0.2;
      rig.kneeL.rotation.x = 0.7 + sway;
      rig.kneeR.rotation.x = 0.5 - sway;
      rig.legL.rotation.x = 0.3 + sway;
      rig.legR.rotation.x = -0.1 - sway;
      rig.armL.rotation.x = 0.3;
      rig.armR.rotation.x = 0.2;
      rig.upper.rotation.x = rig.upperRest + 0.5;
    }
    if (Math.random() < 0.5) {
      this.v2.set((Math.random() - 0.5) * 0.3, -0.5, (Math.random() - 0.5) * 0.3);
      this.gore.emit(object.position, this.v2, Math.random() < 0.4 ? ICHOR_DARK : ICHOR, 0.8, 0.3, 8);
    }
    // Fling it off with a hard swing, or it slides off after a while.
    if (drone.t > 0.25 && hand.tipVel.length() > 3) {
      this.v1.copy(hand.tipVel).multiplyScalar(1.3);
      this.v1.y += 1.5;
      this.releaseBody(drone, this.v1);
      this.comic.pop('FLING!', this.v4.copy(object.position).setY(object.position.y + 0.4), this.accent, 0.4);
      this.sfx.crescent();
    } else if (drone.t > 4) this.releaseBody(drone, this.v1.set(0, 0, 0));
  }

  private releaseBody(drone: Drone, velocity: Vector3): void {
    for (const hand of this.hands) if (hand.skewer === drone) hand.skewer = null;
    drone.heldBy = -1;
    drone.flying = true;
    drone.fly.copy(velocity);
  }

  /** A thrown body tumbles, knocks over the living, and lands lying down. */
  private updateAirborne(drone: Drone, dt: number): void {
    const object = drone.object;
    const chest = ENEMIES[drone.kind].ground!.chest;
    drone.fly.y -= 9.8 * this.gravityScale * dt;
    object.position.addScaledVector(drone.fly, dt);
    object.rotation.x -= dt * (2 + drone.fly.length() * 0.5);
    if (Math.random() < 0.6) this.gore.emit(object.position, this.v2.set(0, 0, 0), ICHOR, 0.6, 0.5, 6);
    // Bowling: a flying body knocks into the living.
    if (drone.fly.lengthSq() > 9 && this.elapsed - drone.bowlAt > 0.3) {
      for (const other of this.drones) {
        if (other === drone || other.state === 'off' || other.state === 'emerging' || !ENEMIES[other.kind].ground) continue;
        if (other.object.position.distanceTo(object.position) > ENEMIES[other.kind].radius + 0.35) continue;
        drone.bowlAt = this.elapsed;
        this.markHit('blast', other.object.position, drone.fly);
        this.damageDrone(other, 2);
        this.sfx.catchHammer();
        break;
      }
    }
    if (object.position.y > chest * 0.22) return;
    drone.flying = false;
    drone.feet.set(object.position.x, 0, object.position.z);
    drone.knock.set(0, 0, 0);
    drone.dying = drone.kind === 'titan' ? DEATH_FALL * 1.5 : DEATH_FALL;
    this.pools.spill(drone.feet.x, drone.feet.z, 1);
    this.particles.burst(drone.feet, DUST, 20, 1.2, 0.5, this.v2);
    this.bleed(object.position, this.v2.set(0, 1, 0), 16);
    this.sfx.catchHammer();
  }

  /** Throws a living walker (webs): it flies and crashes into whatever it hits. */
  private flingDrone(drone: Drone, velocity: Vector3): boolean {
    const slot = this.liftSlots.find((s) => s.state === 'off');
    if (slot == null || drone.lifted) return false;
    slot.object = drone.object;
    slot.drone = drone;
    slot.radius = ENEMIES[drone.kind].radius;
    drone.lifted = true;
    drone.snare = 0;
    drone.cocoon.visible = false;
    slot.state = 'flying';
    slot.thrown = true;
    slot.t = 0;
    slot.velocity.copy(velocity);
    slot.previous.copy(drone.object.position);
    slot.spin.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 8);
    return true;
  }

  /** Falling, lying and sinking; then the pooled body is put back together. */
  private updateDeath(drone: Drone, dt: number): void {
    if (drone.heldBy >= 0) {
      this.updateSkewered(drone, dt);
      return;
    }
    if (drone.flying) {
      this.updateAirborne(drone, dt);
      return;
    }
    const def = ENEMIES[drone.kind];
    const object = drone.object;
    const rig = drone.rig;
    const chest = def.ground!.chest;
    const fall = drone.kind === 'titan' ? DEATH_FALL * 1.5 : DEATH_FALL;
    const before = drone.dying;
    drone.dying += dt;
    const p = Math.min(1, drone.dying / fall);
    const e = p * p;
    // Knockback slide while toppling.
    drone.feet.addScaledVector(drone.knock, dt * 2 * (1 - p));
    const legsOnly = drone.parts.Upper != null && drone.parts.Upper.object.parent !== drone.parts.Upper.parent;
    const pitch = -(legsOnly ? 1.1 : 1.45) * e;
    object.rotation.x = pitch;
    this.sa.set(0, Math.cos(pitch) * chest * (legsOnly ? 0.75 : 1), Math.sin(pitch) * chest).applyAxisAngle(this.yAxis, object.rotation.y);
    object.position.copy(drone.feet).add(this.sa);
    object.position.y += 0.12 * e;
    if (rig) {
      rig.kneeL.rotation.x = 1.3 * e;
      rig.kneeR.rotation.x = 1.0 * e;
      rig.legL.rotation.x = 0.5 * e;
      rig.legR.rotation.x = 0.2 * e;
      rig.armL.rotation.x = rig.armLRest - 1.6 * e;
      rig.armR.rotation.x = rig.armRRest - 1.2 * e;
      rig.upper.rotation.x = rig.upperRest - 0.3 * e;
    }
    if (before < fall && drone.dying >= fall) {
      // Thud.
      this.particles.burst(drone.feet, DUST, drone.kind === 'titan' ? 40 : 20, 1.2, 0.5, this.v2);
      this.sfx.catchHammer();
    }
    if (drone.dying > fall + DEATH_LIE) {
      object.position.y -= dt * 0.35;
      this.gibs.sink(drone.parts, dt * 0.35);
    }
    if (drone.dying > fall + DEATH_LIE + DEATH_SINK) this.endDeath(drone);
  }

  /** Death over: hide the body and reassemble it for the next spawn. */
  private endDeath(drone: Drone): void {
    for (const hand of this.hands) if (hand.skewer === drone) hand.skewer = null;
    drone.heldBy = -1;
    drone.flying = false;
    drone.dying = -1;
    drone.object.visible = false;
    drone.object.rotation.x = 0;
    this.gibs.recall(drone.parts);
    for (const part of Object.values(drone.parts)) if (part) restorePart(part);
    const rig = drone.rig;
    if (rig) {
      rig.legL.rotation.x = 0;
      rig.legR.rotation.x = 0;
      rig.kneeL.rotation.x = 0;
      rig.kneeR.rotation.x = 0;
      rig.armL.rotation.x = rig.armLRest;
      rig.armR.rotation.x = rig.armRRest;
      rig.elbowR.rotation.x = rig.elbowRRest;
      rig.upper.rotation.set(rig.upperRest, 0, 0);
    }
  }

  /** Fires `shots` plasma bolts from a walker's muzzle at the player's head. */
  private enemyFire(drone: Drone, shots: number, speed: number): void {
    if (drone.rig?.muzzle) drone.rig.muzzle.getWorldPosition(this.v4);
    else this.v4.copy(drone.object.position);
    this.flashes.spawn(this.v4, ENEMY_COLOR[drone.kind], 0.05, 0.3, 0.15);
    this.sfx.enemyShot();
    for (let i = 0; i < shots; i += 1) {
      const shot = this.drones.find((d) => d.state === 'off' && d.kind === 'orb');
      if (shot == null) return;
      this.v2.copy(this.head);
      if (i > 0) {
        this.v2.x += (Math.random() - 0.5) * 0.6;
        this.v2.y += (Math.random() - 0.5) * 0.3;
      }
      shot.counted = false;
      shot.hp = 1;
      shot.state = 'shot';
      shot.t = 0;
      shot.object.position.copy(this.v4);
      shot.offset.subVectors(this.v2, this.v4).normalize().multiplyScalar(speed);
      shot.object.scale.setScalar(0.8);
      shot.object.visible = true;
      shot.portal.visible = false;
    }
  }

  /** Records how the next hit lands (style, point, travel direction, cut plane). */
  private markHit(style: 'blast' | 'slice' | 'impale' | 'dot', point: Vector3, direction: Vector3, cutNormal?: Vector3): void {
    this.hitStyle = style;
    this.hitPoint.copy(point);
    this.hitDir.copy(direction).normalize();
    if (cutNormal) this.cutNormal.copy(cutNormal).normalize();
    else this.cutNormal.set(0, 1, 0);
    this.hitSet = true;
  }

  private damageDrone(drone: Drone, amount = 1, raw = false): void {
    if (drone.state === 'off') return;
    if (!this.hitSet) {
      // Default: a blast from the player's direction.
      this.hitStyle = 'blast';
      this.hitPoint.copy(drone.object.position);
      this.hitDir.subVectors(drone.object.position, this.head).normalize();
    }
    this.hitSet = false;
    if (drone.stun > 0) amount *= 2;
    if (drone.kind === 'boss' && this.bossLocked) {
      this.flashes.spawn(drone.object.position, OBLIVAX_COLOR, 0.2, 0.9, 0.2);
      return;
    }
    drone.hp -= raw ? amount : amount * this.damageScale();
    if (drone.kind === 'boss') this.chargeOverdrive(0.02);
    if (drone.hp > 0) {
      this.flashes.spawn(drone.object.position, WHITE, 0.1, drone.kind === 'boss' ? 0.8 : 0.4, 0.12);
      if (ENEMIES[drone.kind].ground && this.hitStyle !== 'dot') {
        this.bleed(this.hitPoint, this.hitDir, 14);
        // Flinch: knocked back a step, a hit interrupts a wind-up.
        drone.stagger = drone.kind === 'titan' ? 0.15 : 0.35;
        drone.knock.copy(this.hitDir).setY(0);
        if (drone.meleeStage === 1) drone.meleeStage = 3;
        drone.melee = 0;
      } else this.particles.burst(drone.object.position, GOLD, 14, 2, 0.3, this.v2);
      this.sfx.ping();
      return;
    }
    if (drone.kind === 'pod') {
      this.freePod(drone);
      return;
    }
    if (drone.kind === 'boss') {
      this.defeatBoss(drone);
      return;
    }
    if (!drone.counted) {
      this.explodeDrone(drone, false);
      return;
    }
    this.chargeOverdrive(0.1);
    this.dropPickup(drone.object.position);
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

  private defeatBoss(boss: Drone): void {
    const at = this.v4.copy(boss.object.position);
    this.comic.pop('KA-BOOM!', this.v1.copy(at).setY(at.y + 0.6), GOLD, 1.0);
    for (let k = 0; k < 4; k += 1) this.flashes.spawn(at, k % 2 ? WHITE : ENEMY_COLOR.boss, 0.3, 3 + k, 0.9 + k * 0.2);
    this.particles.burst(at, ENEMY_COLOR.boss, 250, 6, 1.2, this.v2);
    this.particles.burst(at, GOLD, 120, 8, 0.8, this.v2);
    // Everything the boss summoned goes with it.
    for (const drone of this.drones) {
      if (drone !== boss && drone.state !== 'off' && !drone.counted && drone.kind !== 'pod') this.explodeDrone(drone, false);
    }
    this.slowmo = 2;
    this.sfx.explode(true);
    this.sfx.thunder();
    this.explodeDrone(boss, true);
    this.run.kill('boss');
  }

  private explodeDrone(drone: Drone, big: boolean): void {
    if (drone.rig && ENEMIES[drone.kind].ground && drone.object.visible) {
      this.killWalker(drone, big);
      return;
    }
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
    drone.lifted = false;
    drone.object.rotation.x = 0;
  }

  /** Removes an enemy silently (restart or quit). */
  private retireDrone(drone: Drone): void {
    if (drone.dying >= 0) this.endDeath(drone);
    drone.state = 'off';
    drone.object.visible = false;
    drone.portal.visible = false;
    drone.eye.scale.setScalar(1);
    drone.snare = 0;
    drone.cocoon.visible = false;
    drone.lifted = false;
    drone.object.rotation.x = 0;
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
        if (drone.state === 'off') continue;
        if (drone.kind === 'pod') this.retireDrone(drone);
        else this.explodeDrone(drone, false);
      }
      if (phase === 'victory') {
        // The world withdraws from the room once it is won.
        this.riftLevel = 0;
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
          message = this.story ? this.story.location : `${run.stage.world.name} ${run.stage.number}`;
          hint = TWIST_INFO[this.twist].name ? `TWIST: ${TWIST_INFO[this.twist].name}  |  ${TWIST_INFO[this.twist].hint}` : `${run.stage.name}  |  ${run.stage.objective}`;
        } else if (run.wave === 0) {
          message = String(Math.max(1, 3 - Math.floor(run.elapsedInPhase - 1)));
          hint = 'Get ready  |  left wrist = pause';
        } else {
          message = `WAVE ${run.wave + 1}`;
          const villain = chapterForWorld(run.stage.world.id)?.villain.name;
          if (this.taunt && villain) hint = `${villain}: "${this.taunt}"`;
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
    const boss = this.drones.find((d) => d.kind === 'boss' && (d.state === 'boss' || d.state === 'emerging'));
    this.hud.extras.boss = boss ? { name: chapterForWorld(boss.world)?.villain.name ?? 'BOSS', fraction: boss.hp / boss.maxHp } : null;
    // Threats out of view: count hostiles beyond ~55 degrees to each side.
    let left = 0;
    let right = 0;
    this.v3.set(this.forward.x, 0, this.forward.z).normalize();
    this.v4.set(-this.v3.z, 0, this.v3.x);
    for (const drone of this.drones) {
      if (drone.state === 'off' || drone.kind === 'pod' || drone.kind === 'orb') continue;
      this.v1.subVectors(drone.object.position, this.head).setY(0).normalize();
      if (this.v1.dot(this.v3) > 0.57) continue;
      if (this.v1.dot(this.v4) >= 0) right += 1;
      else left += 1;
    }
    this.hud.extras.left = left;
    this.hud.extras.right = right;
    this.hud.extras.overdrive = hasUnlock(this.profile, `overdrive-${this.hero}`) ? this.overdrive : null;
    this.hud.extras.buffs = [
      this.buffRapid > 0 ? `RAPID ${Math.ceil(this.buffRapid)}s` : '',
      this.buffPower > 0 ? `POWER ${Math.ceil(this.buffPower)}s` : '',
    ]
      .filter(Boolean)
      .join('  ');
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
