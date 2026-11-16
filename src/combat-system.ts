import {
  AdditiveBlending,
  AssetManager,
  BackSide,
  BoxGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  createSystem,
  SpriteMaterial,
  Sprite as ThreeSprite,
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
  SphereGeometry,
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
import { CLAP_TIP, Coach, HERO_TIPS, SCREEN_TIPS, type Tip } from './combat/coach.js';
import { BloodPools, BloodScreen, captureParts, Gibs, type Part, type PartName, restorePart } from './combat/bodies.js';
import { Galaxy } from './combat/galaxy.js';
import { Shards, type ShardStuff } from './combat/shards.js';
import { createRagdoll, RAG, Room, type Verlet } from './combat/physics.js';
import { lookFor, transitFor, WORLD_LOOKS } from './combat/worlds.js';
import { CHAMPIONS, TWIST_INFO, type TwistId, twistFor } from './combat/twists.js';
import { bossRound, championName, dailyStage, dayKey, endlessStage, endlessWorldOf, recordEndless } from './combat/endless.js';
import { Transit } from './combat/transit.js';
import { ARSENAL, equippedWeapon, finishFor, type WeaponDef } from './combat/arsenal.js';
import { applyFinish } from './scene-assets/lib/forge.js';
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
import { fingerExtension, type HandJoints, isBlastPose, isFist, isOpenPalm, isPinchPose, isWebPose, setSensitivity, tuning } from './combat/gestures.js';
import { type HeroId, HEROES } from './combat/heroes.js';
import { Lightning } from './combat/lightning.js';
import { CreatureModel, type GrabZone } from './combat/creature.js';
import { Ground, groundStyleFor } from './combat/ground.js';
import { PadInput } from './combat/pad.js';
import { CLICK_STILL, GAZE_DWELL, GazeDwell, PINCH_ON, PinchEdge, SKIP_PINCH, SkipPinch } from './combat/gaze.js';
import { ShieldGauge } from './combat/shieldgauge.js';
import { Vitals } from './combat/vitals.js';
import { MenuHandle } from './combat/menuhandle.js';
import {
  copyRig,
  DEFAULT_PREFS,
  dragRig,
  freshRig,
  glideRig,
  isLost,
  newRig,
  prefsFrom,
  type MenuRig,
  rigGap,
  type RigPrefs,
  sanitizePrefs,
} from './combat/menurig.js';
import { skipHiddenBranches } from './combat/sceneperf.js';
import type { WeaponPart } from './combat/weaponsfx.js';
import { Cinema, type CinemaHooks } from './combat/cinema.js';
import { ChapterCinema } from './combat/chaptercinema.js';
import { storySeen } from './combat/chapter-script.js';
import { MOVIE_SEEN } from './combat/cinema-script.js';
import { type BoardEntry, type BoardMode, recordScore, scoreLabel } from './combat/leaderboard.js';
import { fetchBoard, postScore } from './combat/netboard.js';
import { callId, erasureId, introId, outroId, sagaIntroId, sagaOutroId, tauntId } from './combat/voice.js';
import { buildSquad, nextInSquad, SWAP_COOLDOWN, TAG_BUFF_SECONDS, TAG_DAMAGE } from './combat/squad.js';
import { PerfHud, type PerfReadout } from './combat/perfhud.js';
import { SquadBar } from './combat/squadbar.js';
import { BlobShadows } from './combat/shadows.js';
import { FloorGlow, ScorchMarks, Telegraphs, WallCracks } from './combat/decals.js';
import { DEFAULT_ROOM, RoomBackdrop } from './combat/roombackdrop.js';
import { Scenery } from './combat/scenery.js';
import { FrameStats, planFor, QualityGovernor, type QualityPlan } from './combat/quality.js';
import { BeamFx } from './combat/beamfx.js';
import { Haptics } from './combat/haptics.js';
import { RoomBorder } from './combat/roomborder.js';
import { Suit } from './combat/suit.js';
import { roomSpots, type Segment, wallSegment } from './combat/roomgeo.js';
import { BOSSES, CUTE_PACK, ROLE_HEIGHT, ROLE_POOL, ROSTER, speciesById, speciesFor, voicePitch } from './combat/creatures.js';
import { HoloMap } from './combat/holomap.js';
import { GameMenus, wrap } from './combat/menus.js';
import { ENEMIES, type EnemyKind } from './combat/missions.js';
import { Music } from './combat/music.js';
import { PANEL_H_M, Panel } from './combat/panel-ui.js';
import { newView, Pilot } from './combat/pilot.js';
import { AttractBot, Director, REEL_CROWD, REEL_KINDS, SHOT_SECONDS, SHOWCASE } from './combat/attract.js';
import { ScreenInput } from './combat/screen-input.js';
import { shell } from './shell.js';
import {
  DIFFICULTY,
  ENEMY_COINS,
  enemyToughness,
  missionsCleared,
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
import { WebShots } from './combat/webshot.js';
import { WristButton } from './combat/wrist.js';
import { Hud } from './combat/hud.js';
import { FIRST_INTRO_SECONDS, type Phase, Run, type SpawnOrder } from './combat/run.js';
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
const PINCH_DISTANCE = 0.034;

type HammerState = 'floating' | 'gripped' | 'docked' | 'flying' | 'returning';
type WebState = 'idle' | 'flying' | 'tethered' | 'retracting';

const ARROW_GRAVITY = 1.2;
const NOCK_REACH = 0.3;
const PINCH_RELEASE = 0.065;
const WEB_SPEED = 26;
const WEB_FLIGHT = 0.9;
const WEB_COOLDOWN = 0.17;
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

/** How to swap heroes, by input kind. */
const SWAP_TIP_PAD: Tip = { gesture: 'trigger', title: 'TAG IN', sub: 'Press the thumbstick to swap to the next hero.' };
const SWAP_TIP_FLAT: Tip = { gesture: 'fist', title: 'TAG IN', sub: 'Press Q or the TAG IN button to swap to the next hero.' };

/** Shown first when the controller fallback switches on. */
const PAD_TIP: Tip = { gesture: 'trigger', title: 'CONTROLLER MODE', sub: 'Trigger: attack. Grip or A: special. B: pause. Put the controllers down to use your hands.' };
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
const BLOOD_RED = new Color('#C01818');
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
  flyer: '',
  boss: '',
  orb: 'orb',
  pod: 'pod',
};
/** Bosses are loaded separately, one per region. */
const ENEMY_POOL: Readonly<Record<EnemyKind, number>> = { drone: 12, armored: 8, swarmer: 14, titan: 5, blade: 8, flyer: 0, boss: 0, orb: 32, pod: 5 };
/** Walking pace relative to the wave speed: heavies lumber. */
const PACE: Partial<Record<EnemyKind, number>> = { armored: 0.8, titan: 0.55, blade: 1.05 };
const ENEMY_COLOR: Readonly<Record<EnemyKind, Color>> = {
  drone: MAGENTA,
  armored: ORANGE,
  swarmer: EMBER,
  titan: VIOLET,
  blade: new Color('#FF3355'),
  flyer: CYAN,
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
  /** Katana tip last frame (each blade weapon keeps its own, or they reset each other). */
  prevTip: Vector3;
  hasPrevTip: boolean;
  clawPrev: Vector3;
  hasClawPrev: boolean;
  /** Knuckles last frame, for VANGUARD's punch speed. */
  punchPrev: Vector3;
  slashCooldown: number;
  sword: Sword;
  /** Enemy skewered on this hand's blade, if any. */
  skewer: Drone | null;
  /** Palm velocity (m/s, smoothed) for slaps and shoves. */
  palmVel: Vector3;
  palmPrev: Vector3;
  palmValid: boolean;
  /** HAND DEBUG readout above the wrist. */
  debug: Sprite;
  debugCanvas: HTMLCanvasElement;
  debugTexture: CanvasTexture;
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
  /** A universal grab: this hand holds a creature by a bone (`held` is its slot). */
  grabZone: GrabZone | null;
  grabOffset: Vector3;
  grabLoose: number;
  grabRingAt: number;
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
  /** Prop kind (crate, barrel, explosive, boulder, girder; 'slot' for lifted aliens). */
  kind: string;
  hp: number;
  /** Explosive barrels: seconds until the blast once lit (-1: not lit). */
  fuse: number;
  /** Seconds until a destroyed prop rebuilds (-1: it stays gone). */
  respawn: number;
  /** Part of the current level's set. */
  placed: boolean;
}

/** Hit points per prop kind; girders cannot break. */
const PROP_HP: Readonly<Record<string, number>> = { crate: 2, barrel: 2, explosive: 1, boulder: 5, girder: Infinity, slot: Infinity };

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
  head: Object3D | null;
  /** legL, legR, kneeL, kneeR, armL, armR, elbowL, elbowR, upper; and their rest poses. */
  bones: Object3D[];
  rest: Quaternion[];
  headRest: Quaternion | null;
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
  /** A level champion: scale and name. */
  size: number;
  champion: string;
  /** Burning / electrocuted seconds left, and the damage-tick timer. */
  burn: number;
  shock: number;
  dotTimer: number;
  /** Ragdoll slot while the body is simulated (-1: none); posed by a ragdoll; first touchdown done. */
  ragdoll: number;
  posed: boolean;
  landed: boolean;
  /** Length of the current flinch (heavier blows stagger longer). */
  staggerMax: number;
  /** Dropping from the ceiling: height of the chest and fall speed (0: grounded). */
  dropY: number;
  dropV: number;
  /** Dead body flung through the air. */
  flying: boolean;
  fly: Vector3;
  bowlAt: number;
  /** '' for the original humanoid aliens, else the creature species id. */
  species: string;
  /** Animated model of a creature (null for humanoids and bosses). */
  creature: CreatureModel | null;
  /** Torso height above the floor for creatures (0: use the role's own). */
  chest: number;
  /** When it last blocked a cut (duellists only). */
  guardAt: number;
  /** Sidestep: seconds left, its direction, and the cooldown before the next. */
  dodge: number;
  dodgeDir: Vector3;
  dodgeCool: number;
  /** A wave's last enemy: bigger, tougher, drops a power-up. */
  elite: boolean;
  /** A walker stepped forward this frame, at `moveSpeed` m/s (picks the walk or run clip). */
  moving: boolean;
  moveSpeed: number;
  /** A small creature's voice pitch (0: silent), the travel (walkers, m) or time (flyers, s) until its next sound, and how tightly it packs into a crowd (1: like a humanoid). */
  voice: number;
  chirp: number;
  pack: number;
}

interface Pickup {
  object: Object3D;
  kind: PickupKind;
  active: boolean;
  life: number;
}

interface Bolt {
  object: Group;
  /** HELLFIRE's missile body (shown instead of the bolt glow). */
  missile: Group;
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
  /** Impact force: how hard a hit knocks the target back (ragdolls fly further). */
  force: number;
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

const RIG_KEY = 'handforge.menurig.v1';
/** Small creatures only patter and chirp within this many metres, no more often than this many seconds apart overall. */
const CRITTER_RANGE = 9;
const CRITTER_GAP = 0.09;
/** Ids the gaze can rest on in the galaxy (a planet each, or the core). */
const GALAXY_REST = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11', 'p12', 'p13', 'p14', 'p15'];
/** A pinch on the menu handle lets go past this gap between thumb and index tips (m); wider than a click so a drag does not drop. */
const RIG_LET_GO = 0.055;

/** Where the player last left their menu (relative to their head), from this browser's storage. */
function loadRigPrefs(): RigPrefs {
  try {
    const raw = window.localStorage.getItem(RIG_KEY);
    return sanitizePrefs(raw ? JSON.parse(raw) : null);
  } catch {
    return sanitizePrefs(null);
  }
}

function saveRigPrefs(prefs: RigPrefs): void {
  try {
    window.localStorage.setItem(RIG_KEY, JSON.stringify(prefs));
  } catch {
    // Storage can be blocked; the menu simply opens at the default spot next time.
  }
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
  private shards!: Shards;
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
  private transit = new Transit();
  /** A boss or champion announced by the siren, arriving shortly. */
  private pending: (SpawnOrder & { t: number }) | null = null;
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
  private hitForce = 1;
  /** Seconds of hit-stop left: the world nearly freezes when a heavy blow lands. */
  private hitStop = 0;
  private debugTimer = 0;
  private shoveAt = -10;
  /** The player's room (MR planes) for collisions, rebuilt twice a second. */
  private room = new Room();
  private roomTimer = 0;
  private ragdolls: { body: Verlet; drone: Drone | null }[] = [];
  private ra = new Vector3();
  private rb = new Vector3();
  private rc = new Vector3();
  private rd = new Vector3();
  private re = new Vector3();
  private rv = new Vector3();
  private rq = new Quaternion();
  private rq2 = new Quaternion();
  private rqi = new Quaternion();
  private rm = new Matrix4();
  private readonly gibCollide = (p: Vector3, v: Vector3, r: number): number => {
    if (!this.room.collide(p, r)) return -2;
    this.room.bounce(v, 0.3, 0.35);
    return this.room.normal[1];
  };
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
    /** Voice-over file id of each line (null: silent). */
    voice: readonly (string | null)[];
    /** The line's voice still to start (waits for its download), and how long we have waited. */
    pending: string | null;
    wait: number;
    /** Typewriter speed, characters a second (follows the voice once it is known). */
    speed: number;
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
  /** Boss fight state: shield until the adds fall, entrance lockout, attack cycle, death throes. */
  private bossShield = 0;
  private bossIntro = 0;
  private bossCycle = 0;
  private bossShieldMesh: Mesh | null = null;
  private bossDeath = 0;
  private bossDeathTick = 0;
  private readonly bossDeathAt = new Vector3();
  private elapsed = 0;
  private hudPlaced = false;
  private ready = false;
  private powersLive = false;
  /** Elapsed time at which to re-place the menu once XR head tracking settles. */
  private replaceMenuAt = -1;
  /**
   * Where the open menu stands: the point its panel and 3D props are measured from,
   * and the way it faces. Set when a menu opens fresh, then fixed until the player
   * drags it by the handle or brings it back (see anchorMenu and updateMenuRig).
   */
  private readonly menuDir = new Vector3(0, 0, -1);
  private readonly menuOrigin = new Vector3();
  private readonly rig: MenuRig = newRig();
  private readonly rigNext: MenuRig = newRig();
  private readonly rigStart: MenuRig = newRig();
  private readonly rigGoal: MenuRig = newRig();
  private rigPrefs: RigPrefs = loadRigPrefs();
  private rigGliding = false;
  private readonly menuHandle = new MenuHandle();
  /** The hand holding the handle (0 or 1), or -1. */
  private rigHand = -1;
  private readonly rigHandStart = new Vector3();
  private readonly rigPoint = new Vector3();
  private readonly rigPinched = [false, false];
  private readonly rigNear = [false, false];
  private rigChipArmed = true;
  private rigLostFor = 0;
  private rigShownFor = 0;
  /** Test only: shows the handle on a flat screen (1 plain, 2 hand near, 3 held, 4 over the chip, 5 first-time hint). */
  private rigDebug = 0;

  private head = new Vector3();
  private headTriple: Triple = [0, 0, 0];
  private forward = new Vector3();
  private v1 = new Vector3();
  private v2 = new Vector3();
  private v3 = new Vector3();
  private v4 = new Vector3();
  /** Screen play (phone, tablet, monitor): puppet hands driven by taps and swipes. */
  private screen!: ScreenInput;
  private readonly pilot = new Pilot();
  private readonly pilotView = newView();
  private puppetPoses: [HandPose, HandPose] | null = null;
  private readonly screenEuler = new Euler(0, 0, 0, 'YXZ');
  private readonly screenRay = new Vector3();
  /** No headset session: the page is played on a flat screen. */
  private flat = true;
  private frameDt = 0;
  private webShots!: WebShots;
  private senseAt = -10;
  private roomAsked = false;
  /** Which power-ups are on ('', 'rapid', 'power', 'both') and the colour they give the kit. */
  private buffKey = '';
  private readonly fistAt = [-10, -10];
  private readonly meteorArmed = [false, false];
  /** Wall footprints from the scan, and a counter that changes when they do. */
  private wallSegs: Segment[] = [];
  private wallVersion = 0;
  private roomBorder!: RoomBorder;
  private ground!: Ground;
  private groundFor = '';
  private perfHud!: PerfHud;
  /** Tag team: the mission's squad, the strip showing it, and the swap state. */
  private squad: HeroId[] = [];
  private squadBar!: SquadBar;
  /** The shield gauge at the bottom of the view and the state behind it (hits, warnings, heartbeat). */
  private shieldGauge!: ShieldGauge;
  private readonly vitals = new Vitals();
  /** How far the music is muffled now (0 clear .. 1), so the filter is only touched on a change. */
  private muffled = 0;
  /** One pinch detector per hand for tagging a hero in from the strip, and where the pinch is. */
  /** How long the gaze has rested on one button, and the last pinch point of each hand (for how fast it moves). */
  private readonly gazeDwell = new GazeDwell();
  private readonly gazePrev = [new Vector3(), new Vector3()];
  private readonly gazeSeen = [false, false];
  private readonly gazeSpeed = [0, 0];
  /** When a small creature last made a sound (a crowd must patter, not roar). */
  private critterAt = -10;
  /** Skips a movie with a firm pinch that begins during it (see SkipPinch). */
  private readonly skipPinch = new SkipPinch();
  /** The headset's system menu was up on the last frame. */
  private wasBlurred = false;
  /** A black sphere that fades away as a session starts, hiding the first frames' settling. */
  private veil!: Mesh<SphereGeometry, MeshBasicMaterial>;
  private veilT = 9;
  private swapCooldown = 0;
  private tagBuff = 0;
  private squadHintUntil = 0;
  /** Head-height sampling at the start of an XR session, for AUTO seated play. */
  private autoSeated = false;
  private seatSum = 0;
  private seatCount = 0;
  private seatUntil = 0;
  private readonly windHead = new WeakMap<Drone, Float32Array>();
  /** Controller fallback: no hands tracked, a controller in use (see pad.ts). */
  private pad = false;
  private noHandTime = 0;
  private readonly padInput = new PadInput();
  private padRay!: Mesh;
  /** Gaze and pinch menus: the reticle, the eye ray (when the headset has one) and each hand's pinch. */
  private gazeReticle!: Mesh;
  private readonly pinchEdges = [new PinchEdge(), new PinchEdge()];
  /** The opening movie (cinema.ts) and this system's side of it. */
  private readonly cinema = new Cinema();
  /** The story movie that opens a hero's journey (chaptercinema.ts). */
  private readonly chapterCinema = new ChapterCinema();
  private cinemaErase = 0;
  private movieOffered = false;
  private readonly moviePalms = [new Vector3(), new Vector3()];
  private readonly movieTracked = [false, false];
  /** Opened with a debug link: no automatic movie. */
  private readonly deepLinked = ['autostart', 'menu', 'movie', 'chapter'].some((key) => new URLSearchParams(window.location.search).has(key));
  private readonly eyeOrigin = new Vector3();
  private readonly eyeDir = new Vector3();
  private eyeValid = false;
  private readonly gazePoint = new Vector3();
  private gazeArm = 0;
  private gazePulse = 0;
  private readonly padQuat = new Quaternion();
  private readonly padForward = new Vector3(0, 0, -1);
  private shadows!: BlobShadows;
  private floorGlow!: FloorGlow;
  private scorch!: ScorchMarks;
  private cracks!: WallCracks;
  private telegraphs!: Telegraphs;
  private scenery: Scenery | null = null;
  /** The REAL ROOM backdrop (a photographed HDR room) and whether it is on; `?room=<id>` forces it, `?room=0` forces it off. */
  private backdrop: RoomBackdrop | null = null;
  private roomShown = false;
  private readonly roomParam = new URLSearchParams(window.location.search).get('room');
  private readonly frameStats = new FrameStats();
  private readonly governor = new QualityGovernor();
  private quality: QualityPlan = planFor(0);
  private perfOn = false;
  /** ?perf=1 / ?perf=0 are remembered; ?q=0..3 pins a quality tier for testing. */
  private perfParam: boolean | null = null;
  private suit!: Suit;
  private readonly suitWrists: Array<Vector3 | null> = [null, null];
  private buffTint: Color | null = null;
  private shieldTrail = 0;
  private readonly swishArmed = [true, true];
  private readonly haptics = new Haptics();
  private handBeams: BeamFx[] = [];
  private chestBeam!: BeamFx;
  private reactor!: Sprite;
  private readonly laserUsed = [false, false];
  private uniState: 'idle' | 'ready' | 'firing' = 'idle';
  private uniCharge = 0;
  private uniReady = 0;
  private uniTime = 0;
  private uniTick = 0;
  private uniCooldown = 0;
  private readonly uniAim = new Vector3(0, 0, -1);
  private readonly chest = new Vector3();
  /** Creature pools being built or built, by `kind:species`. */
  private readonly creaturePools = new Map<string, Promise<void>>();
  private readonly bloodColors = new Map<string, Color>();
  private stormCharge = 0;
  private stormActive = 0;
  private stormGap = 0;
  private stormCooldown = 0;
  private zapTimer = 0;
  private zapSound = -10;
  private crackleTimer = 0;
  private readonly crackleHand = [0, 0];
  private readonly wristVel = new Vector3();
  private screenTipHero = '';
  private screenTipIndex = -1;
  /** Pointer driving the hands this frame: the player's, or the reel bot's. */
  private aimNdc: { x: number; y: number } = { x: 0, y: 0 };
  /** The attract reel playing behind the landing page (see attract.ts). */
  private attract = false;
  private readonly noReel = new URLSearchParams(window.location.search).get('reel') === '0';
  private readonly bot = new AttractBot();
  private readonly director = new Director();
  private shotIndex = -1;
  private shotTime = 0;
  private reelYaw = Number.NaN;
  private readonly reelTargets = new Float32Array(16);
  private readonly reelDepths = new Float32Array(8);
  private reelSound = false;
  private screenAspect = 0;
  /** A giant OBLIVAX far beyond the reel's fight. */
  private looming: Object3D | null = null;

  init(): void {
    this.root = new Group();
    this.root.name = 'Combat';
    // Thousands of pooled objects sit hidden under here; Three must not walk them every frame.
    if (!new URLSearchParams(window.location.search).has('allnodes')) skipHiddenBranches(this.root);
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
    this.webShots = new WebShots(this.root, PINK);
    this.roomBorder = new RoomBorder(this.root, CYAN);
    this.ground = new Ground(this.root);
    this.perfHud = new PerfHud(this.world.camera);
    this.squadBar = new SquadBar(this.world.camera);
    this.shieldGauge = new ShieldGauge(this.world.camera);
    {
      const rayGeometry = new BoxGeometry(0.004, 0.004, 1);
      rayGeometry.translate(0, 0, -0.5);
      this.padRay = new Mesh(rayGeometry, new MeshBasicMaterial({ color: '#8CF6FF', transparent: true, opacity: 0.55, depthWrite: false, blending: AdditiveBlending, toneMapped: false }));
      this.padRay.name = 'PadRay';
      this.padRay.frustumCulled = false;
      this.padRay.visible = false;
      this.padRay.renderOrder = 20;
      this.root.add(this.padRay);
      this.gazeReticle = new Mesh(new RingGeometry(0.007, 0.011, 28), new MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.9, depthTest: false, depthWrite: false, blending: AdditiveBlending, toneMapped: false }));
      this.gazeReticle.name = 'GazeReticle';
      this.gazeReticle.frustumCulled = false;
      this.gazeReticle.visible = false;
      this.gazeReticle.renderOrder = 40;
      this.root.add(this.gazeReticle);
    }
    this.shadows = new BlobShadows(this.root);
    this.floorGlow = new FloorGlow(this.root);
    this.scorch = new ScorchMarks(this.root);
    this.cracks = new WallCracks(this.root);
    this.telegraphs = new Telegraphs(this.root);
    // Bright flashes near the floor light it up (in passthrough, the real floor).
    this.flashes.onSpawn = (position, color, to, duration) => {
      if (to < 0.9 || position.y > 2.4 || !this.quality.auras) return;
      const radius = Math.min(2.6, 0.5 + to * 0.7) * (1 - position.y / 3.2);
      this.floorGlow.add(position.x, position.z, 0, radius, color, Math.min(1, 0.3 + to * 0.14), duration * 1.3);
    };
    {
      const params = new URLSearchParams(window.location.search);
      try {
        if (params.has('perf')) window.localStorage.setItem('surge.perf', params.get('perf') === '0' ? '0' : '1');
        this.perfParam = window.localStorage.getItem('surge.perf') === '1' ? true : null;
      } catch {
        this.perfParam = params.get('perf') === '1' ? true : null;
      }
      // Frame-rate experiments on a headset: ?idle=1 runs none of the game (only the frame counter), so the
      // headset's and the renderer's own cost shows; ?off=ground,particles,ink,auras turns those parts off.
      this.idle = params.get('idle') === '1';
      for (const name of (params.get('off') ?? '').split(',')) if (name.trim() !== '') this.off.add(name.trim().toLowerCase());
      if (this.off.size > 0) this.applyQuality(this.governor.tier);
      const forced = Number(params.get('q'));
      if (params.has('q') && Number.isFinite(forced)) {
        this.governor.tier = Math.max(0, Math.min(3, Math.round(forced)));
        this.governor.locked = true;
        this.applyQuality(this.governor.tier);
      }
      (window as unknown as { __surgePerf: () => PerfReadout }).__surgePerf = () => this.perfReadout();
      // Scene-graph size by branch (every object is visited by Three each frame, visible or not): where the nodes are.
      (window as unknown as { __surgeNodes: () => unknown }).__surgeNodes = () => {
        const count = (o: { children: readonly unknown[] }): number => {
          let n = 1;
          for (const c of o.children as { children: readonly unknown[] }[]) n += count(c);
          return n;
        };
        const rows: { path: string; nodes: number; visible: boolean }[] = [];
        let total = 0;
        for (const a of this.world.scene.children) {
          const nodes = count(a);
          total += nodes;
          const name = a.name || a.type;
          rows.push({ path: name, nodes, visible: a.visible });
          for (const b of a.children) rows.push({ path: `${name} > ${b.name || b.type}`, nodes: count(b), visible: b.visible });
        }
        rows.sort((x, y) => y.nodes - x.nodes);
        return { total, top: rows.slice(0, 28) };
      };
      (window as unknown as { __surgeWorld: () => unknown }).__surgeWorld = () => ({
        arena: this.arena?.visible ?? null,
        arenaPos: this.arena ? [this.arena.position.x, this.arena.position.z] : null,
        disc: this.ground.disc.visible,
        discParent: this.ground.disc.parent?.name ?? null,
        painted: this.ground.painted,
        scenery: this.scenery ? this.scenery.group.children.map((m) => `${m.name}:${(m as unknown as { count: number }).count}:${m.visible}`) : null,
        stage: this.run.stage.id,
        theme: this.theme.accent,
      });
    }
    this.suit = new Suit(this.root, CYAN);
    this.handBeams = [new BeamFx(this.root, WHITE), new BeamFx(this.root, WHITE)];
    this.chestBeam = new BeamFx(this.root, CYAN);
    this.reactor = createGlowSprite(CYAN, 0);
    this.reactor.visible = false;
    this.root.add(this.reactor);
    this.bow = new Bow(new Color('#5DFFB0'));
    this.root.add(this.bow.group);
    this.root.add(this.carousel.group);
    this.root.add(this.armory.group);
    this.root.add(this.holomap.group);
    this.comic = new Onomatopoeia(this.root);
    this.panel = new Panel();
    this.root.add(this.panel.group);
    this.menuHandle.mount(this.panel.group, PANEL_H_M);
    this.music = new Music(this.sfx);
    this.sfx.setVolumes(this.profile.settings.sfx, this.profile.settings.music);
    setSensitivity(this.profile.settings.gestures);
    this.menus = new GameMenus(this.profile, {
      play: (hero, stage) => this.startStage(hero, stage),
      resume: () => this.resumeStage(),
      restart: () => this.startStage(this.hero, this.run.stage),
      skipTraining: () => this.skipTraining(),
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
      endless: (hero, daily) => this.startEndless(hero, daily),
      story: () => this.startStage('arc', PROLOGUE),
      movie: () => this.playMovie(() => this.showMenu('howto')),
      board: (hero) => this.loadNetBoard(hero),
      chapterMovie: (hero) => this.playChapterMovie(hero, () => this.showMenu('map')),
      finale: () => this.startStage('arc', FINALE),
      exit: () => {
        // Leave the headset session (MR or VR); on a screen, back to the home page.
        if (this.world.renderer.xr.isPresenting) this.world.exitXR();
        else shell.goHome?.();
      },
      scanRoom: () => this.requestRoomCapture(true),
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
        clawPrev: new Vector3(),
        hasClawPrev: false,
        punchPrev: new Vector3(),
        slashCooldown: 0,
        sword,
        skewer: null,
        palmVel: new Vector3(),
        palmPrev: new Vector3(),
        palmValid: false,
        ...this.makeDebugLabel(),
        tipVel: new Vector3(),
        swordHold: 0,
        psi,
        held: null,
        aimObject: null,
        aimDrone: null,
        aimTime: -10,
        release: 0,
        grabZone: null,
        grabOffset: new Vector3(),
        grabLoose: 0,
        grabRingAt: 0,
      });
      this.handSlots.push(jointSlots(joints));
    }

    const boltCore = new CylinderGeometry(0.011, 0.011, 0.24, 6);
    boltCore.rotateX(Math.PI / 2);
    const boltMaterial = new MeshBasicMaterial({ color: '#E8FFFF' });
    // Crescent shockwave: an arc centred on local +Y, facing local +Z.
    const missileBodyGeometry = new CylinderGeometry(0.022, 0.022, 0.26, 10);
    const missileNoseGeometry = new ConeGeometry(0.022, 0.09, 10);
    const missileFinGeometry = new BoxGeometry(0.075, 0.004, 0.06);
    const missileSteel = new MeshBasicMaterial({ color: '#C9CED8', toneMapped: false });
    const missileRed = new MeshBasicMaterial({ color: '#FF3B1F', toneMapped: false });
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
      // A missile: body, red nose, fins and an exhaust flame.
      const missile = new Group();
      missile.visible = false;
      const missileBody = new Mesh(missileBodyGeometry, missileSteel);
      missileBody.rotation.x = Math.PI / 2;
      const missileNose = new Mesh(missileNoseGeometry, missileRed);
      missileNose.rotation.x = Math.PI / 2;
      missileNose.position.z = 0.15;
      missile.add(missileBody, missileNose);
      for (let f = 0; f < 4; f += 1) {
        const fin = new Mesh(missileFinGeometry, missileRed);
        fin.rotation.z = (f / 4) * Math.PI * 2;
        fin.position.z = -0.07;
        missile.add(fin);
      }
      const flame = createGlowSprite('#FF8A1F', 0.95);
      flame.scale.setScalar(0.16);
      flame.position.z = -0.14;
      missile.add(flame);
      object.add(boltVisual, crescent, arrow, missile);
      object.visible = false;
      this.root.add(object);
      this.bolts.push({
        object,
        missile,
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
        force: 1,
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
    for (let i = 0; i < 8; i += 1) this.ragdolls.push({ body: createRagdoll(), drone: null });
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
    this.veil = new Mesh(new SphereGeometry(2, 16, 12), new MeshBasicMaterial({ color: '#000000', side: BackSide, transparent: true, opacity: 1, depthTest: false, depthWrite: false, toneMapped: false }));
    this.veil.frustumCulled = false;
    this.veil.renderOrder = 200;
    this.veil.visible = false;
    this.root.add(this.gore.points, this.galaxy.group, this.transit.mesh, this.cinema.group, this.chapterCinema.group, this.veil);

    const xr = this.world.renderer.xr;
    const onSessionStart = () => {
      if (this.attract) this.stopAttract();
      this.roomAsked = false;
      this.governor.settle(6);
      this.seatSum = 0;
      this.seatCount = 0;
      this.seatUntil = this.elapsed + 3.5;
      this.autoSeated = false;
      this.requestFrameRate(xr.getSession());
      this.sfx.unlock();
      this.veilT = 0;
      this.veil.visible = true;
      void this.warmShaders();
      this.hudPlaced = false;
      if (this.panel.visible) this.replaceMenuAt = this.elapsed + 0.6;
      this.music.play(this.run.phase === 'title' ? 'menu' : this.run.stage.world.id);
      this.scanTime = 0;
      if (!hasUnlock(this.profile, PROLOGUE_DONE) && this.run.phase === 'title' && this.tx == null) this.autoPrologueAt = this.elapsed + 3;
    };
    xr.addEventListener('sessionstart', onSessionStart);
    const canvas = this.world.renderer.domElement;
    this.screen = new ScreenInput(canvas);
    this.screen.onPause = () => this.wristPressed();
    this.aimNdc = this.screen.ndc;
    shell.unlockAudio = () => this.sfx.unlock();
    const unlock = () => this.sfx.unlock();
    canvas.addEventListener('pointerdown', unlock);
    const onKey = (event: KeyboardEvent) => {
      if (this.movieActive) {
        if (event.key === 'Escape' || event.key === ' ' || event.key === 'Enter') this.skipMovie(1, 'key');
      } else if (this.panel.visible && this.menus.typeName(event.key)) {
        event.preventDefault();
        this.panel.setContent(this.menus.content());
      }
    };
    window.addEventListener('keydown', onKey);
    this.cleanupFuncs.push(
      () => xr.removeEventListener('sessionstart', onSessionStart),
      () => canvas.removeEventListener('pointerdown', unlock),
      () => window.removeEventListener('keydown', onKey),
      () => this.screen.dispose(),
    );

    void this.loadModels();
  }

  private async loadModels(): Promise<void> {
    this.arena = await this.world.assets.instantiate('arena');
    this.arena.name = 'Arena';
    this.root.add(this.arena);
    this.arena.add(this.ground.disc);
    this.scenery = new Scenery(this.arena);
    this.backdrop = new RoomBackdrop(this.arena);
    this.styleWorld(this.stageWorld());
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
        this.makeDrone(object, kind, portalGeometry, i);
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
        ragdoll: -1,
        posed: false,
        landed: false,
        staggerMax: 0.35,
        size: 1,
        champion: '',
        burn: 0,
        shock: 0,
        dotTimer: 0,
        dropY: 0,
        dropV: 0,
        flying: false,
        fly: new Vector3(),
        bowlAt: -10,
        species: '',
        creature: null,
        chest: 0,
        guardAt: -10,
        dodge: 0,
        dodgeDir: new Vector3(),
        dodgeCool: 0,
        elite: false,
        moving: false,
        moveSpeed: 0,
        voice: 0,
        chirp: 0,
        pack: 1,
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
    for (const [id, asset] of [['havoc-smg', 'gun-smg'], ['havoc-shotgun', 'gun-shotgun'], ['havoc-minigun', 'gun-minigun'], ['havoc-launcher', 'gun-launcher']] as const) {
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
    addOutline(this.hammer, 0.08, (m) => m.name === 'Block' || m.name === 'Handle');
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
    // A shield you can see your own fist behind.
    this.shield.scale.setScalar(0.85);
    this.shield.visible = false;
    addOutline(this.shield, 0.05, (m) => m.name === 'Body');
    this.root.add(this.shield);
    // Real models of every arsenal weapon for the armory projector.
    for (const weapon of ARSENAL) this.weaponModels.set(weapon.id, await this.buildWeaponModel(weapon));
    // PSION's props, plus slots that carry lifted aliens.
    for (const kind of ['crate', 'barrel', 'boulder', 'girder', 'crate', 'boulder', 'explosive', 'explosive'] as const) {
      const object = await this.world.assets.instantiate(`debris-${kind}`);
      addOutline(object, 0.03);
      object.visible = false;
      this.root.add(object);
      this.debris.push(this.makeThrowable(object, (object.userData.radius as number | undefined) ?? 0.3, kind));
    }
    this.shards = new Shards(this.root);
    for (let k = 0; k < 4; k += 1) this.liftSlots.push(this.makeThrowable(new Group(), 0.3));
    // The attract reel's sky: OBLIVAX looming over the battlefield.
    this.looming = await this.world.assets.instantiate('boss-oblivion');
    this.looming.name = 'LoomingOblivax';
    this.looming.visible = false;
    // The sky is a transparent sphere a few metres out, drawn after opaque
    // objects; his own transparent copies draw right after it, so he stands
    // in the sky instead of behind it.
    this.looming.traverse((child) => {
      const mesh = child as Mesh;
      if (!mesh.isMesh) return;
      const material = (mesh.material as MeshBasicMaterial).clone();
      material.transparent = true;
      material.depthWrite = true;
      mesh.material = material;
      mesh.renderOrder = -4;
    });
    this.root.add(this.looming);
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

  /** Adds a pooled enemy (portal, cocoon, shadow and all) around `object`. */
  private makeDrone(object: Object3D, kind: EnemyKind, portalGeometry: RingGeometry, index: number, extra: { species?: string; creature?: CreatureModel | null } = {}): Drone {
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
    portal.name = `Portal-${index}`;
    portal.visible = false;
    this.root.add(portal);
    const creature = extra.creature ?? null;
    const drone: Drone = {
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
      rig: creature ? null : this.findRig(object),
      stride: 0,
      blob: ENEMIES[kind].ground ? this.makeBlob() : null,
      lifted: false,
      bladeHitAt: -10,
      parts: ENEMIES[kind].ground && !creature ? captureParts(object) : {},
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
      ragdoll: -1,
      posed: false,
      landed: false,
      staggerMax: 0.35,
      size: 1,
      champion: '',
      burn: 0,
      shock: 0,
      dotTimer: 0,
      dropY: 0,
      dropV: 0,
      flying: false,
      fly: new Vector3(),
      bowlAt: -10,
      species: extra.species ?? '',
      creature,
      chest: 0,
      guardAt: -10,
      dodge: 0,
      dodgeDir: new Vector3(),
      dodgeCool: 0,
      elite: false,
      moving: false,
      moveSpeed: 0,
      voice: 0,
      chirp: 0,
      pack: 1,
    };
    this.drones.push(drone);
    return drone;
  }

  // ---------------------------------------------------------------- creatures

  /**
   * Loads and pools the creatures a world fields (a no-op once they exist).
   * A failed download leaves that role to the humanoid aliens.
   */
  private prepareCreatures(worldId: string): Promise<void> {
    const jobs: Promise<void>[] = [];
    for (const [kind, id] of Object.entries(ROSTER[worldId] ?? {}) as Array<[EnemyKind, string]>) {
      const key = `${kind}:${id}`;
      let job = this.creaturePools.get(key);
      if (job == null) {
        job = this.buildCreaturePool(kind, id).catch((error) => {
          console.warn(`creature ${id} failed to load`, error);
        });
        this.creaturePools.set(key, job);
      }
      jobs.push(job);
    }
    const boss = BOSSES[worldId];
    if (boss) {
      const key = `boss:${boss.species}`;
      let job = this.creaturePools.get(key);
      if (job == null) {
        job = this.buildBossCreature(worldId, boss.species, boss.height).catch((error) => {
          console.warn(`boss ${boss.species} failed to load`, error);
        });
        this.creaturePools.set(key, job);
      }
      jobs.push(job);
    }
    return Promise.all(jobs).then(() => undefined);
  }

  /**
   * Compiles the shaders of everything in the scene, hidden pools included, ahead of time.
   * Otherwise each one is built the first time its enemy, boss or effect appears, in the middle
   * of a frame, as a hitch of tens to hundreds of milliseconds. Never waits more than 3 s, and
   * only ever an optimisation: a failure is ignored. (Test hook: `__surgeWarmMs`.)
   */
  private warmShaders(): Promise<void> {
    const started = performance.now();
    const renderer = this.world.renderer;
    const done = new Promise<void>((resolve) => {
      try {
        void renderer.compileAsync(this.world.scene, this.world.camera).then(
          () => resolve(),
          () => resolve(),
        );
      } catch {
        resolve();
      }
    });
    const limit = new Promise<void>((resolve) => window.setTimeout(resolve, 3000));
    return Promise.race([done, limit]).then(() => {
      (window as unknown as { __surgeWarmMs?: number }).__surgeWarmMs = Math.round(performance.now() - started);
    });
  }

  /** The region boss as a giant creature (the mech stays as the fallback). */
  private async buildBossCreature(worldId: string, id: string, height: number): Promise<void> {
    const gltf = await AssetManager.loadGLTFById(`creature-${id}`);
    const creature = new CreatureModel(gltf.scene, gltf.animations, height, null);
    creature.reset();
    const object = new Group();
    object.name = `BossCreature-${worldId}`;
    object.add(creature.group);
    object.visible = false;
    object.rotation.order = 'YXZ';
    this.root.add(object);
    const drone = this.makeDrone(object, 'boss', new RingGeometry(0.17, 0.26, 48), 2000 + this.drones.length, { species: id, creature });
    drone.world = worldId;
  }

  private async buildCreaturePool(kind: EnemyKind, id: string): Promise<void> {
    const species = speciesById(id);
    const height = ROLE_HEIGHT[kind];
    const count = ROLE_POOL[kind];
    if (species == null || height == null || count == null) return;
    const gltf = await AssetManager.loadGLTFById(`creature-${id}`);
    // The torso sits at 55% of the body's height, so what you see is what the hit areas cover.
    const lift = ENEMIES[kind].ground ? height * species.scale * 0.55 : null;
    const portalGeometry = new RingGeometry(0.17, 0.26, 48);
    for (let n = 0; n < count; n += 1) {
      const creature = new CreatureModel(gltf.scene, gltf.animations, height * species.scale, lift);
      creature.reset();
      const object = new Group();
      object.name = `Creature-${id}-${kind}-${n}`;
      object.add(creature.group);
      object.visible = false;
      object.rotation.order = 'YXZ';
      this.root.add(object);
      const drone = this.makeDrone(object, kind, portalGeometry, 1000 + this.drones.length, { species: id, creature });
      if (lift != null) drone.chest = lift;
      // The small, cute families get a voice and pack in close.
      if (species.family !== 'big') {
        drone.voice = voicePitch(species.id);
        drone.pack = CUTE_PACK;
      }
    }
  }

  /** Torso height of a walker: the creature's own, else its role's. */
  private chestOf(drone: Drone): number {
    return drone.chest > 0 ? drone.chest : ENEMIES[drone.kind].ground!.chest;
  }

  /** Ichor colour of a creature (undefined: the humanoids' red). */
  private bloodOf(drone: Drone): Color | undefined {
    if (drone.species === '') return undefined;
    let color = this.bloodColors.get(drone.species);
    if (color == null) {
      color = new Color(speciesById(drone.species)?.blood ?? '#B0000C');
      this.bloodColors.set(drone.species, color);
    }
    return color;
  }

  /** Picks the creature's base clip (walk, run or idle) unless a hit or strike is still playing. */
  private animateCreature(drone: Drone): void {
    const creature = drone.creature!;
    const playing = creature.playing;
    if (drone.snare > 0) {
      creature.play('idle', 0.4);
      return;
    }
    if (drone.stun > 0) {
      creature.play('hit', 0.5);
      return;
    }
    if ((playing === 'hit' || playing === 'attack') && !creature.finished && (drone.stagger > 0 || drone.meleeStage > 0)) return;
    if (drone.moving) {
      if (drone.kind === 'swarmer' || drone.moveSpeed > 2.4) creature.play('run', Math.min(1.7, Math.max(0.8, drone.moveSpeed / 2.6)));
      else creature.play('walk', Math.min(1.8, Math.max(0.7, drone.moveSpeed / 1.0)));
    } else creature.play('idle', 1);
  }

  /** A creature dies: the death clip plays, ichor sprays, then it lies and sinks (flyers tumble first). */
  private killCreature(drone: Drone, big: boolean): void {
    const creature = drone.creature!;
    const object = drone.object;
    const def = ENEMIES[drone.kind];
    drone.state = 'off';
    drone.dying = 0;
    drone.snare = 0;
    drone.cocoon.visible = false;
    drone.lifted = false;
    drone.stagger = 0;
    drone.stun = 0;
    drone.landed = false;
    drone.eye.scale.setScalar(1);
    drone.portal.visible = false;
    drone.feet.set(object.position.x, 0, object.position.z);
    drone.knock.copy(this.hitDir).setY(0);
    if (drone.knock.lengthSq() < 1e-4) drone.knock.set(object.position.x - this.head.x, 0, object.position.z - this.head.z);
    drone.knock.normalize().multiplyScalar(this.hitStyle === 'slice' ? 0.4 : big ? 1.6 : 1);
    creature.play('death', 1, true, 0.08);
    if (def.ground == null) drone.fly.copy(drone.knock).multiplyScalar(2).setY(1.5);
    const tint = this.bloodOf(drone);
    const slice = this.hitStyle === 'slice';
    this.bleed(slice ? this.hitPoint : object.position, this.hitDir, slice ? 44 : big ? 36 : 24, tint);
    this.flashes.spawn(object.position, tint ?? ENEMY_COLOR[drone.kind], 0.1, big ? 1.4 : 0.8, 0.3);
    this.particles.burst(object.position, tint ?? ENEMY_COLOR[drone.kind], big ? 90 : 36, 3, 0.6, this.v2);
    if (def.ground) this.pools.spill(drone.feet.x + drone.knock.x * 0.5, drone.feet.z + drone.knock.z * 0.5, big ? 1.5 : 0.9);
    if (slice) {
      this.sfx.splat();
      this.sfx.slash();
    } else this.sfxAt(drone.object.position, () => this.sfx.explode(big));
  }

  private updateCreatureDeath(drone: Drone, dt: number): void {
    const creature = drone.creature!;
    const object = drone.object;
    drone.dying += dt;
    creature.update(dt);
    if (ENEMIES[drone.kind].ground) {
      // Knocked back, down on the clip, then still, then sinking away.
      const slide = Math.max(0, 1 - drone.dying / 0.7);
      drone.feet.addScaledVector(drone.knock, dt * 2 * slide);
      object.position.x = drone.feet.x;
      object.position.z = drone.feet.z;
      const lie = creature.duration('death') + 1.4;
      if (drone.dying > lie) object.position.y -= dt * 0.4;
      if (drone.dying > lie + 1) this.endDeath(drone);
      return;
    }
    // Flyer: tumbles out of the sky, thuds, lies, sinks.
    if (!drone.landed) {
      drone.fly.y -= 9.8 * this.gravityScale * dt;
      object.position.addScaledVector(drone.fly, dt);
      object.rotation.x += dt * 6;
      object.rotation.z += dt * 3;
      if (this.room.collide(object.position, 0.2) || object.position.y < 0.25) {
        drone.landed = true;
        drone.t = 0;
        object.position.y = Math.max(0.25, object.position.y);
        this.particles.burst(object.position, DUST, 18, 1.2, 0.4, this.v2);
        this.sfx.catchHammer();
      }
      return;
    }
    drone.t += dt;
    if (drone.t > 1.3) object.position.y -= dt * 0.4;
    if (drone.t > 2.3) this.endDeath(drone);
  }

  /**
   * Flyers circle the player, spit plasma now and then, and dive-bomb: they
   * hover and shake through a wind-up, then streak at the head. Step aside,
   * block with a shield, or shoot them down mid-dive.
   */
  private updateFlyer(drone: Drone, dt: number, time: number): void {
    const def = ENEMIES.flyer;
    const object = drone.object;
    const creature = drone.creature;
    this.v1.subVectors(this.head, object.position);
    const distance = this.v1.length();
    if (drone.voice > 0) this.chirpFlyer(drone, dt, distance);
    if (drone.snare > 0) {
      drone.snare = Math.max(0, drone.snare - dt);
      drone.cocoon.visible = drone.snare > 0;
      drone.cocoon.position.copy(object.position);
      drone.cocoon.scale.setScalar(def.radius * 1.5 * (1 + Math.sin(time * 6) * 0.04));
      drone.cocoon.rotation.y += dt * 0.8;
      object.position.y -= dt * 0.15;
      object.position.x += (Math.random() - 0.5) * 0.004;
      creature?.play('idle', 0.3);
      return;
    }
    if (drone.stagger > 0) {
      drone.stagger -= dt;
      object.position.addScaledVector(drone.knock, dt * 2);
      this.room.collide(object.position, def.radius);
      return;
    }
    drone.attackTimer -= dt;
    const stage = drone.meleeStage;
    if (stage === 0) {
      // Circle at a distance: each flyer has its own radius, height and direction.
      const angle = drone.phase + time * (0.3 + (drone.phase % 0.3)) * (drone.phase > Math.PI ? -1 : 1);
      const radius = 3.2 + (drone.phase % 1) * 1.3;
      this.v2.set(this.head.x + Math.cos(angle) * radius, this.head.y + 0.15 + Math.sin(time * 1.3 + drone.phase) * 0.35 + drone.offset.y, this.head.z + Math.sin(angle) * radius);
      this.v3.subVectors(this.v2, object.position);
      const gap = this.v3.length();
      const step = Math.min(gap, (1.6 + drone.speed) * dt);
      if (gap > 1e-3) object.position.addScaledVector(this.v3, step / gap);
      object.position.y = Math.max(0.9, object.position.y);
      object.lookAt(this.head);
      drone.moveSpeed = dt > 0 ? step / dt : 0;
      creature?.play(gap > 1.2 ? 'run' : 'walk', 1);
      if (drone.attackTimer <= 0) {
        if (Math.random() < 0.5 && distance > 2) {
          this.enemyFire(drone, 1, 2.8);
          drone.attackTimer = 2 + Math.random() * 1.5;
        } else {
          drone.meleeStage = 1;
          drone.melee = 0;
          this.sfxAt(object.position, () => this.sfx.creak());
          this.spiderSense(object.position);
          creature?.play('attack', 0.8, true, 0.1);
        }
      }
    } else if (stage === 1) {
      // Wind-up: hang in the air, shaking, eyes on the target.
      drone.melee += dt;
      object.position.x += (Math.random() - 0.5) * 0.02;
      object.position.y += (Math.random() - 0.5) * 0.02;
      object.lookAt(this.head);
      drone.eye.scale.setScalar(1 + drone.melee);
      if (drone.melee >= 0.8) {
        drone.meleeStage = 2;
        drone.melee = 0;
        this.v2.copy(this.head);
        this.v2.y -= 0.1;
        drone.fly.subVectors(this.v2, object.position).normalize().multiplyScalar(7.5);
        this.sfx.crescent();
        creature?.play('run', 1.6);
      }
    } else if (stage === 2) {
      // The dive.
      drone.melee += dt;
      object.position.addScaledVector(drone.fly, dt);
      this.v2.copy(object.position).add(drone.fly);
      object.lookAt(this.v2);
      this.v3.subVectors(this.head, object.position);
      if (this.v3.length() < 0.5) {
        if (this.shieldBlocks(object.position)) {
          this.sfx.clang();
          this.shieldRipple(this.blockPoint(this.v2));
          this.particles.burst(object.position, GOLD, 24, 2.5, 0.3, this.v2);
          this.comic.pop('BLOCKED!', this.v4.copy(object.position).setY(object.position.y + 0.3), this.weaponColor, 0.4);
          drone.stun = 0.8;
        } else {
          this.hurtPlayer(def.damage, false, object.position);
          this.sfx.slash();
        }
        drone.meleeStage = 3;
        drone.melee = 0;
        drone.fly.multiplyScalar(-0.3).setY(2.5);
      } else if (drone.melee > 1 || this.room.collide(object.position, 0.25)) {
        drone.meleeStage = 3;
        drone.melee = 0;
        drone.fly.setY(2.5);
      }
    } else {
      // Pull up and away, then back to circling.
      drone.melee += dt;
      object.position.addScaledVector(drone.fly, dt);
      drone.fly.multiplyScalar(Math.max(0, 1 - dt * 2));
      drone.fly.y += dt * 3;
      object.lookAt(this.head);
      creature?.play('walk', 1.2);
      if (drone.melee >= 1) {
        drone.meleeStage = 0;
        drone.attackTimer = 2.2 + Math.random() * 2;
      }
    }
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
      head: get('Head') ?? null,
      bones: [legL, legR, kneeL, kneeR, armL, armR, elbowL, elbowR, upper],
      rest: [legL, legR, kneeL, kneeR, armL, armR, elbowL, elbowR, upper].map((b) => b.quaternion.clone()),
      headRest: get('Head')?.quaternion.clone() ?? null,
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
      room: [this.roomShown, this.backdrop?.ready ?? false, this.backdrop?.group.visible ?? false],
      live: this.powersLive,
      enemies: this.drones.filter((d) => d.state !== 'off').map((d) => `${d.kind}${d.species ? `/${d.species}` : ''}:${d.state}`),
      enemyHp: this.drones.filter((d) => d.state !== 'off').map((d) => Math.round(d.hp * 10) / 10),
      menuAt: { origin: this.menuOrigin.toArray().map((v) => Math.round(v * 1000) / 1000), panel: this.panel.group.position.toArray().map((v) => Math.round(v * 1000) / 1000) },
      kills: this.run.kills,
      hands: this.hands.map((h) => h.tracked),
      debug: {
        bow: [this.bowHolder, this.drawing],
        held: this.hands.map((h) => (h.held ? (h.held.drone ? 'alien' : h.held.kind) : h.aimDrone ? 'aim-alien' : h.aimObject ? 'aim-prop' : '')),
        bolts: this.bolts.filter((b) => b.active).map((b) => b.kind),
        hammer: this.hammerState,
        shield: this.shieldState,
        claws: this.hands.map((h) => [Math.round(h.claws.extension * 10) / 10, Math.round(h.tipVel.length() * 10) / 10, isFist(h.joints)]),
        moves: [this.pilot.busy(0), this.pilot.busy(1)],
      },
    });
    // Test hook: spawns n enemies of a kind (not counted toward the wave).
    (window as unknown as { __surgeSpawn: (kind: string, n?: number) => void }).__surgeSpawn = (kind: string, n = 1) => {
      for (let k = 0; k < n; k += 1) this.spawnDrone(kind as EnemyKind, 0.8, false);
    };
    // Test hook: takes a power-up ('rapid' or 'power') as if it were collected.
    (window as unknown as { __surgeBuff: (kind: string) => void }).__surgeBuff = (kind: string) => {
      const pickup = this.pickups.find((p) => p.kind === kind);
      if (pickup) this.collect(pickup);
    };
    // Test hook: calls down n lightning strikes from the sky.
    (window as unknown as { __surgeStrike: (n: number) => void }).__surgeStrike = (n: number) => {
      for (let k = 0; k < n; k += 1) this.stormStrike();
    };
    // Test hook: where a panel button is on screen (NDC), to tap it like a player.
    (window as unknown as { __surgeWidget: (id: string) => number[] | null }).__surgeWidget = (id: string) => {
      const point = this.panel.visible ? this.panel.widgetPoint(id, new Vector3()) : null;
      return point ? point.project(this.world.camera).toArray().slice(0, 2) : null;
    };
    // Test hook: drags the menu by (dx, dy, dz) metres as a pinch on its handle would; no arguments stands it in front of the head again.
    (window as unknown as { __surgeRig: (dx?: number, dy?: number, dz?: number) => object }).__surgeRig = (dx?: number, dy?: number, dz?: number) => {
      if (dx == null) this.freshAnchor();
      else {
        copyRig(this.rigStart, this.rig);
        dragRig(this.rigStart, { x: 0, y: 0, z: 0 }, { x: dx, y: dy ?? 0, z: dz ?? 0 }, this.head, this.rigNext);
        copyRig(this.rig, this.rigNext);
        this.useRig();
      }
      this.reanchorMenu();
      return { origin: this.menuOrigin.toArray(), dir: this.menuDir.toArray(), panel: this.panel.group.position.toArray() };
    };
    // Test hook: shows the menu handle on a flat screen (see rigDebug); 0 turns it off.
    (window as unknown as { __surgeHandle: (mode: number) => void }).__surgeHandle = (mode: number) => {
      this.rigDebug = mode;
    };
    // Test hook: live projectiles (kind, position, velocity, target position).
    (window as unknown as { __surgeBolts: () => object[] }).__surgeBolts = () =>
      this.bolts
        .filter((b) => b.active)
        .map((b) => ({
          kind: b.kind,
          at: b.position.toArray().map((v) => Math.round(v * 100) / 100),
          vel: b.velocity.toArray().map((v) => Math.round(v * 10) / 10),
          target: b.target ? b.target.object.position.toArray().map((v) => Math.round(v * 100) / 100) : null,
          head: this.head.toArray().map((v) => Math.round(v * 100) / 100),
        }));
    // Test hook: enemies on screen (NDC x, y, depth), for driving taps and swipes.
    (window as unknown as { __surgeTargets: () => number[][] }).__surgeTargets = () =>
      this.drones
        .filter((d) => d.state !== 'off' && d.state !== 'emerging' && d.state !== 'shot' && d.kind !== 'pod')
        .map((d) => d.object.position.clone().project(this.world.camera).toArray());
    // Test hook: set the boss to a health fraction (e.g. to reach CONVERGENCE).
    (window as unknown as { __surgeBoss: (f: number) => void }).__surgeBoss = (f: number) => {
      const boss = this.findBoss();
      if (boss) boss.hp = boss.maxHp * f;
    };
    (window as unknown as { __surgeSkip: () => void }).__surgeSkip = () => this.endTransmission();
    (window as unknown as { __surgeBlast: (f: number) => void }).__surgeBlast = (f: number) => {
      for (const drone of this.drones) {
        if (drone.state === 'off' || !ENEMIES[drone.kind].ground) continue;
        this.v1.subVectors(drone.object.position, this.head).setY(0.3);
        this.markHit('blast', drone.object.position, this.v1, undefined, f);
        this.damageDrone(drone, 999, true);
      }
    };
    (window as unknown as { __surgeProp: (kind: string) => void }).__surgeProp = (kind: string) => {
      const item = this.debris.find((d) => d.placed && d.kind === kind && d.state !== 'off');
      if (item) this.hitProp(item, 99, this.v1.set(0, 0, -1), 3);
    };
    (window as unknown as { __surgeChampion: () => void }).__surgeChampion = () => this.queueSpawn({ kind: 'titan', speed: 0.8, champion: true });
    (window as unknown as { __surgeClear: () => void }).__surgeClear = () => {
      let k = 0;
      for (const drone of this.drones) {
        if (drone.state === 'off' || drone.kind === 'boss' || drone.kind === 'pod') continue;
        k += 1;
        if (k % 2 === 1) this.markHit('slice', drone.object.position, this.v1.set(1, 0.2, 0), this.v2.set(0, 1, 0));
        this.damageDrone(drone, 999, true);
      }
    };
    (window as unknown as { __surgeHurt: (n: number) => void }).__surgeHurt = (n: number) => this.run.damage(n);
    // Leaderboard test hook: __surgeScore(hero, name, score) files a score on this device.
    (window as unknown as { __surgeScore: (hero: HeroId, name: string, score: number) => number }).__surgeScore = (hero, name, score) =>
      recordScore(this.profile.board, hero, { name, score, mode: 'endless', label: 'ENDLESS WAVE 7', at: Date.now() });
    // ?seen=1 marks the opening movie and the prologue as seen (to test the flow after them).
    if (new URLSearchParams(window.location.search).has('seen')) {
      for (const id of [MOVIE_SEEN, PROLOGUE_DONE]) if (!hasUnlock(this.profile, id)) this.profile.unlocks.push(id);
      this.menus.setProfile(this.profile);
      if (this.panel.visible) this.panel.setContent(this.menus.content());
    }
    // Opening movie: ?movie=1 plays it at once; __surgeMovie(t) jumps the clock (for screenshots).
    (window as unknown as { __surgeMovie: (t?: number) => number }).__surgeMovie = (t) => {
      if (!this.movieActive) this.playMovie(() => this.showMenu('main'));
      const movie = this.chapterCinema.active ? this.chapterCinema : this.cinema;
      if (t != null) movie.seek(t);
      return movie.t;
    };
    if (new URLSearchParams(window.location.search).has('movie')) this.playMovie(() => this.showMenu('main'));
    // ?chapter=<hero> plays that hero's story movie at once.
    const chapterHero = HEROES.find((h) => h.id === new URLSearchParams(window.location.search).get('chapter'))?.id;
    if (chapterHero) this.playChapterMovie(chapterHero, () => this.showMenu('map'), Math.min(3, Math.max(1, Number(new URLSearchParams(window.location.search).get('level')) || 1)));
    // Sound audition page (?sounds=1): plays one part of one weapon's sound design.
    (window as unknown as { __surgeSfx: (id: string, part: WeaponPart, power: number) => void }).__surgeSfx = (id, part, power) => {
      this.sfx.unlock();
      this.sfx.weapon(id, part, power);
    };
    const params = new URLSearchParams(window.location.search);
    const screen = params.get('menu');
    if (screen === 'main' || screen === 'garage' || screen === 'heroes' || screen === 'map' || screen === 'settings' || screen === 'galaxy' || screen === 'board' || screen === 'name') {
      const hero = HEROES.find((h) => h.id === params.get('hero'))?.id;
      if (hero) this.menus.hero = hero;
      if (screen === 'garage') this.menus.handle({ id: 'garage', point: this.v1.set(0, 0, 0) });
      if (screen === 'board') {
        this.menus.boardHero = this.menus.hero;
        this.loadNetBoard(this.menus.hero);
      }
      if (screen === 'name') this.menus.beginName(() => this.showMenu('board'));
      this.showMenu(screen);
      return;
    }
    const start = params.get('autostart');
    const day = params.get('day') ?? dayKey(new Date());
    const heroId = (HEROES.find((h) => h.id === params.get('hero'))?.id ?? 'arc') as HeroId;
    const stage = start === 'daily' ? dailyStage(day) : start === 'endless' ? endlessStage(endlessWorldOf(heroId), day) : [...STAGES, PROLOGUE, FINALE].find((s) => s.id === start);
    if (stage == null) return;
    const hero = (HEROES.find((h) => h.id === params.get('hero'))?.id ?? 'arc') as HeroId;
    if (params.has('skipstory') && !isSagaStage(stage)) {
      this.story = stage.endless ? null : (levelStory(stage.world.id, stage.number) ?? null);
      void this.prepareCreatures(stage.world.id).then(() => this.launchStage(hero, stage));
    } else this.startStage(hero, stage);
  }

  update(delta: number, time: number): void {
    // One bad frame must never freeze the game: log (throttled) and carry on.
    if (this.idle) {
      this.updatePerf(delta, Math.min(delta, 0.05));
      return;
    }
    const started = performance.now();
    try {
      this.frame(delta, time);
    } catch (error) {
      if (time - this.lastErrorAt > 2) {
        this.lastErrorAt = time;
        this.lastNote = `error: ${(error instanceof Error ? error.message : String(error)).slice(0, 60)}`;
        console.error('[Combat] frame error', error);
      }
    }
    this.cpuStats.push(performance.now() - started);
  }

  /** Milliseconds the game's own frame code takes (the rest of a frame is the engine, the GPU and waiting). */
  private readonly cpuStats = new FrameStats();

  private lastErrorAt = -10;
  /** The last movie skip or frame error, shown on the PERF HUD. */
  private lastNote = '';
  /** ?idle=1: none of the game runs (frame-rate experiment). */
  private idle = false;
  /** ?off=...: parts turned off by hand (ground, particles, ink, auras) to find what costs frame time. */
  private readonly off = new Set<string>();

  /** Asks the headset for a steady 72 Hz: cheaper than 90 and above the 60 fps bar. */
  private requestFrameRate(session: XRSession | null | undefined): void {
    const s = session as (XRSession & { supportedFrameRates?: Float32Array; updateTargetFrameRate?: (rate: number) => Promise<void> }) | null | undefined;
    if (!s?.supportedFrameRates || !s.updateTargetFrameRate) return;
    const rates = Array.from(s.supportedFrameRates);
    const want = rates.includes(72) ? 72 : rates.filter((r) => r >= 60).sort((a, b) => a - b)[0];
    if (want) void s.updateTargetFrameRate(want).catch(() => undefined);
  }

  /** Feeds frame times to the stats and the governor, and refreshes the HUD. */
  private updatePerf(delta: number, realDt: number): void {
    const ms = delta * 1000;
    if (ms > 0 && ms < 250) this.frameStats.push(ms);
    if (!this.paused && this.run.phase === 'fighting') {
      const moved = this.governor.push(ms);
      if (moved >= 0) this.applyQuality(moved);
    }
    const on = this.perfParam === true || this.profile.settings.perfHud;
    if (on !== this.perfOn) {
      this.perfOn = on;
      this.perfHud.setEnabled(on);
    }
    this.perfHud.update(realDt, () => this.perfReadout(), this.world.renderer.xr.isPresenting);
  }

  private applyQuality(tier: number): void {
    const plan = { ...planFor(tier) };
    if (this.off.has('ground')) plan.ground = false;
    if (this.off.has('auras')) plan.auras = false;
    if (this.off.has('ink')) plan.ink = false;
    if (this.off.has('particles')) plan.particles = 0;
    this.quality = plan;
    CreatureModel.ink = plan.ink;
    this.particles.density = plan.particles;
    this.run.crowdScale = plan.crowd;
    console.info('[Quality] tier', tier, plan);
  }

  private perfReadout(): PerfReadout {
    let enemies = 0;
    for (const drone of this.drones) if (drone.state !== 'off' && drone.kind !== 'orb' && drone.kind !== 'pod') enemies += 1;
    const info = this.world.renderer.info;
    const stats = this.frameStats;
    return {
      fps: stats.fps(),
      avgMs: stats.avgMs(),
      p95Ms: stats.p95Ms(),
      cpuMs: this.cpuStats.avgMs(),
      cpuP95Ms: this.cpuStats.p95Ms(),
      note: this.lastNote,
      slowPct: stats.slowShare() * 100,
      tier: this.governor.tier,
      locked: this.governor.locked,
      calls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      enemies,
      mode: `${this.world.renderer.xr.isPresenting ? (this.isPassthrough() ? 'MR' : 'VR') : 'FLAT'}  ${this.run.phase}`,
    };
  }
  /** Longest frame step; headless tests raise it (?dtmax=) to run at real time on a slow renderer. */
  private readonly maxDt = Math.min(0.25, Number(new URLSearchParams(window.location.search).get('dtmax')) || 0.05);

  private frame(delta: number, time: number): void {
    if (!this.ready) return;
    if (this.arena) {
      this.arena.visible = !this.isPassthrough();
      // The arena travels with the player, so walking never leaves it behind.
      if (this.arena.visible) this.arena.position.set(this.world.camera.getWorldPosition(this.v1).x, 0, this.v1.z);
      this.syncBackdrop();
      this.ground.syncDisc(this.arena.position.x, this.arena.position.z, this.arena.visible && this.quality.ground && !this.roomShown);
    }
    // The Meta system menu (a pinch with the palm facing you opens it) blurs the app: freeze sound with the frame.
    const blurred = this.world.visibilityState.peek() === VisibilityState.VisibleBlurred;
    if (blurred !== this.wasBlurred) {
      this.wasBlurred = blurred;
      this.sfx.hold(blurred);
    }
    if (blurred) return;
    const realDt = Math.min(delta, this.maxDt);
    this.elapsed = time;
    this.frameDt = realDt;
    this.updatePerf(delta, realDt);
    this.sfx.setListener(this.head.x, this.head.y, this.head.z, this.forward.x, this.forward.y, this.forward.z);
    if (this.profile.settings.calm) {
      this.slowmo = 0;
      this.hitStop = 0;
    } else if (this.slowmo > 0) this.slowmo -= realDt;
    this.sampleSeat(realDt);
    let dt = this.slowmo > 0 ? realDt * SLOWMO_SCALE : realDt;
    // Hit-stop: the world nearly freezes for a blink when a heavy blow lands.
    if (this.hitStop > 0) {
      this.hitStop -= realDt;
      dt *= 0.08;
    }

    this.updateScreen(realDt);
    this.world.camera.getWorldPosition(this.head);
    this.lightningFx.eye.copy(this.head);
    this.headTriple[0] = this.head.x;
    this.headTriple[1] = this.head.y;
    this.headTriple[2] = this.head.z;
    this.world.camera.getWorldDirection(this.forward);

    this.roomTimer -= realDt;
    if (this.roomTimer <= 0) {
      this.roomTimer = 0.5;
      this.syncRoom();
    }
    this.readHands();
    for (const hand of this.hands) hand.gauntlet.update(hand.pose, Math.min(1, hand.armTime / ARM_TIME), time);
    this.updateHandMotion(realDt);
    this.updateHandDebug(realDt);
    this.updatePad();
    // On a flat screen the pause button replaces the wrist button.
    if (this.flat || this.pad) this.wrist.group.visible = false;
    else if (this.wrist.update(this.hands[0].pose, this.hands[1].pose, realDt)) this.wristPressed();

    this.tips.length = 0;
    for (const hand of this.hands) {
      if (!hand.pose.tracked) continue;
      hand.indexTip ??= new Vector3();
      const tip = hand.indexTip;
      this.tips.push(hand.pose.position(9, tip));
    }
    if (this.replaceMenuAt > 0 && time > this.replaceMenuAt) {
      this.replaceMenuAt = -1;
      if (this.panel.visible) {
        this.freshAnchor();
        this.reanchorMenu();
      }
    }
    this.updateMenuRig(realDt);
    this.updateGaze(realDt);
    const event = this.panel.update(realDt, this.tips);
    if (event) this.onPanelEvent(event.point, () => this.menus.handle(event));

    // Powers work during a stage (including intros, for warm-up) but not in
    // menus or while paused.
    const live = !this.paused && !this.panel.visible && this.run.phase !== 'title';
    this.powersLive = live;
    this.updateHands(realDt);
    for (let i = 0; i < 2; i += 1) if (!this.laserUsed[i]) this.handBeams[i].hide();
    this.updateUniBeam(realDt, time);
    this.updateClaws(realDt);
    this.updateSwords(realDt, time);
    this.updateShield(realDt);
    this.updatePsion(realDt, dt, time);
    this.updateGrabs(realDt, time);
    this.updateSwap(realDt);
    this.updateBossDeath(realDt);
    if (this.powersLive) this.updateShoves();
    this.updateScript(realDt, time);
    if (!this.paused) this.updateTwist(dt, time);
    this.coach.update(realDt, this.head, this.forward);
    this.erasure.update(realDt, time, this.head, this.eraseTarget, this.veilTarget);
    this.updateMovie(realDt);
    this.updateVeil(realDt);
    if (this.quality.auras) this.updateAuras(realDt, time);
    // The suit: forearm sleeves and the chest emblem, while a stage runs.
    if (this.powersLive) {
      for (let i = 0; i < 2; i += 1) {
        const hand = this.hands[i];
        if (hand.tracked) hand.pose.position(J.wrist, (this.suitWrists[i] ??= new Vector3()));
        else this.suitWrists[i] = null;
      }
      this.suit.update(this.suitWrists, this.head, this.forward, time);
    } else this.suit.hide();
    {
      const stage = this.run.stage;
      if (this.groundFor !== stage.id) {
        this.groundFor = stage.id;
        const look = stage.world.id === 'oblivion' ? WORLD_LOOKS.oblivion : lookFor(stage.id, stage.world.id);
        this.ground.setStyle(groundStyleFor(stage.world.id), look.ground, look.accent);
      }
      this.ground.update(realDt, this.isPassthrough() && this.run.phase !== 'title' && this.quality.ground, 0.92);
    }
    this.roomBorder.update(this.isPassthrough() && !this.seatedNow() ? this.wallSegs : [], this.wallVersion, this.head.x, this.head.z, time, this.accent);
    this.updateHammer(realDt, time);
    this.updateBow(realDt);
    this.updateGun(realDt);
    this.updateWebs(realDt, time);
    this.updatePowerups(realDt, dt, time);

    if (!this.paused) {
      const order = this.run.update(dt);
      if (order && !(this.attract && this.reelCrowd() >= REEL_CROWD)) this.queueSpawn(order);
      this.updatePending(dt);
      this.updateDrones(dt, time);
      this.separateWalkers(dt);
      this.updateBlobs();
      this.updateShadows();
      this.updateDecals(dt);
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
    this.updateVitals(realDt);
    this.transit.update(realDt, this.head);
    // The score follows the action: calm in menus, full in combat, huge at bosses.
    const run = this.run;
    let bossFight = this.pending != null;
    for (const d of this.drones) if ((d.kind === 'boss' || d.champion !== '') && d.state !== 'off') bossFight = true;
    this.music.setIntensity(run.phase === 'title' || this.panel.visible ? 0 : bossFight ? 2 : 1);
    this.updateHud(realDt);
  }

  /**
   * The shield as the player feels it: the gauge at the bottom of the view; a
   * crack, a swell and a glass-break sound on every loss; a rising run of bells
   * on a restore; an alarm and a pop-up when it first runs low and on the last
   * cell; then a heartbeat, red pulsing screen edges and muffled music until it
   * recovers.
   */
  private updateVitals(dt: number): void {
    const run = this.run;
    const live = run.phase !== 'title' && !(run.phase === 'intro' && run.wave === 0);
    const armed = run.phase === 'fighting' && !this.paused && !this.attract;
    const v = this.vitals.update(dt, run.health, run.maxHealth, live, armed);
    if (v.lost > 0) this.sfx.shieldBreak(run.health);
    if (v.gained > 0) this.sfx.shieldUp();
    if (v.enteredLow || v.enteredCritical) {
      const critical = v.enteredCritical;
      this.sfx.shieldAlarm(critical);
      this.v1.copy(this.head).addScaledVector(this.forward, 1.3);
      this.v1.y -= 0.15;
      this.comic.pop(critical ? 'LAST SHIELD!' : 'SHIELD LOW!', this.v1, new Color(critical ? '#FF3B5C' : '#FFB020'), critical ? 0.95 : 0.8);
    }
    if (v.beat) this.sfx.heartbeat(this.vitals.level === 'critical' ? 1 : 0.65);
    const muffle = armed ? (this.vitals.level === 'critical' ? 0.8 : this.vitals.level === 'low' ? 0.4 : 0) : 0;
    if (muffle !== this.muffled) {
      this.muffled = muffle;
      this.sfx.muffle(muffle);
    }
    this.blood.update(dt, armed ? this.vitals.danger : 0);
    const show = !this.attract && run.phase !== 'title' && !this.panel.visible && !this.movieActive;
    this.shieldGauge.update(this.vitals, show, dt, this.profile.settings.calm, !this.flat && !this.pad);
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
    if (!xr.isPresenting) {
      this.readPuppets();
      return;
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
    // No hands for a moment but a controller in use: play with the controller.
    const anyHand = this.hands[0].tracked || this.hands[1].tracked;
    this.noHandTime = anyHand ? 0 : this.noHandTime + this.frameDt;
    const usePad = !anyHand && this.noHandTime > 0.7 && this.padInput.read(frame, space, origin, this.playerQuat, session);
    if (usePad !== this.pad) this.setPad(usePad);
    // Headsets with eye tracking (and Meta's glasses) report a gaze ray as an input source.
    this.eyeValid = false;
    for (const source of session.inputSources) {
      if (source.targetRayMode !== 'gaze') continue;
      const gaze = frame.getPose(source.targetRaySpace, space);
      if (gaze == null) continue;
      const p = gaze.transform.position;
      const o = gaze.transform.orientation;
      this.eyeOrigin.set(p.x, p.y, p.z).applyMatrix4(origin);
      this.eyeDir.set(0, 0, -1).applyQuaternion(this.jointQuat.set(o.x, o.y, o.z, o.w)).applyQuaternion(this.playerQuat).normalize();
      this.eyeValid = true;
      break;
    }
    if (usePad) {
      this.padInput.apply(this.elapsed, this.screen.intent, this.screen.ndc, this.world.camera);
      this.aimNdc = this.screen.ndc;
      this.readPuppets();
    }
  }

  /** Switches the controller fallback on or off, with a one-time card saying how to play. */
  private setPad(on: boolean): void {
    this.pad = on;
    this.padRay.visible = on;
    // The how-to-play card goes first in whatever the coach is teaching.
    if (on) this.teach([PAD_TIP, ...this.tipQueue.filter((tip) => tip !== PAD_TIP)]);
  }

  /**
   * Gaze and pinch for the menus: a reticle where you look (eye gaze if the
   * headset reports it, else where the head points), and a pinch of either
   * hand presses the button under it. Poking with a fingertip still works.
   */
  private updateGaze(dt: number): void {
    const handA = this.hands[0].tracked;
    const handB = this.hands[1].tracked;
    // Pinches are tracked all the time so one already held when a menu opens is not a click.
    let pinched = false;
    let firm = false;
    for (let i = 0; i < 2; i += 1) {
      // A closed fist also brings the thumb and index tips together: it must not count as a pinch.
      const distance = this.hands[i].tracked && isPinchPose(this.hands[i].joints) ? this.pinchPoint(i, this.gazePoint) : null;
      // A click has to be meant: not a hand swinging through (the speed is smoothed, because tracking jitters from frame to frame).
      let meant = true;
      if (distance != null) {
        const instant = this.gazeSeen[i] ? this.gazePoint.distanceTo(this.gazePrev[i]) / Math.max(dt, 1e-3) : 0;
        this.gazeSpeed[i] += (instant - this.gazeSpeed[i]) * 0.3;
        this.gazePrev[i].copy(this.gazePoint);
        this.gazeSeen[i] = true;
        meant = this.gazeSpeed[i] < CLICK_STILL;
      } else {
        this.gazeSeen[i] = false;
        this.gazeSpeed[i] = 0;
      }
      if (this.pinchEdges[i].update(distance, this.elapsed) && !this.rigNear[i] && meant) pinched = true;
      if (distance != null && distance < SKIP_PINCH) firm = true;
    }
    // A movie is skipped by a firm pinch held for most of a second that begins during it, never by a passing hand shape.
    if (this.skipPinch.update(this.movieActive, firm, dt)) this.skipMovie(1.5, 'pinch');
    const menu = this.panel.visible || this.galaxy.visible;
    const active = menu && (handA || handB) && !this.flat && !this.pad && this.tx == null;
    this.gazeArm = active ? this.gazeArm + dt : 0;
    if (!active) {
      this.gazeReticle.visible = false;
      this.gazeDwell.update('', dt);
      return;
    }
    const origin = this.eyeValid ? this.eyeOrigin : this.head;
    const direction = this.eyeValid ? this.eyeDir : this.forward;
    // The reticle sits on the panel where the ray meets it, or floats along the ray over the galaxy.
    const onPanel = this.panel.visible && this.panel.aim(origin, direction, this.gazePoint);
    if (onPanel) {
      this.gazeReticle.position.copy(this.gazePoint);
      this.gazeReticle.quaternion.copy(this.panel.group.quaternion);
      this.v1.set(0, 0, 1).applyQuaternion(this.panel.group.quaternion);
      this.gazeReticle.position.addScaledVector(this.v1, 0.006);
    } else {
      this.gazeReticle.position.copy(origin).addScaledVector(direction, 0.8);
      this.gazeReticle.quaternion.copy(this.world.camera.quaternion);
    }
    // What the gaze rests on (a button, or a planet on the galaxy): a pinch only presses it after a short dwell,
    // so a pinch while the reticle sweeps across buttons, or just after a new screen opens under it, presses none.
    let resting = '';
    if (onPanel) resting = this.panel.aimedId;
    else if (this.galaxy.visible) {
      const index = this.galaxy.pick(origin, direction);
      resting = index === -1 ? 'core' : index >= 0 ? (GALAXY_REST[index] ?? 'planet') : '';
    }
    const dwelt = this.gazeDwell.update(resting, dt) >= GAZE_DWELL;
    this.gazePulse = Math.max(0, this.gazePulse - dt * 5);
    this.gazeReticle.scale.setScalar(1 + this.gazePulse * 1.2);
    this.gazeReticle.visible = this.gazeArm > 0.25;
    if (!pinched || this.gazeArm < 0.4 || !dwelt) return;
    this.sfx.unlock();
    this.gazePulse = 1;
    const event = this.panel.visible ? this.panel.click(origin, direction) : null;
    if (event) this.onPanelEvent(event.point, () => this.menus.handle(event));
    else if (this.galaxy.visible) {
      const index = this.galaxy.pick(origin, direction);
      if (index !== -2) this.galaxyChoose(index, this.head);
    }
  }

  /** Controller extras each frame: pause, menu clicks along the ray, and the ray itself. */
  private updatePad(): void {
    if (!this.pad) return;
    const pad = this.padInput;
    if (pad.pressed || pad.pausePressed) this.skipMovie(1.2, 'controller');
    if (pad.pausePressed) this.wristPressed();
    // In menus (and while paused) a trigger press clicks what the ray points at.
    if (pad.pressed && !this.pilot.active) {
      this.sfx.unlock();
      this.world.camera.getWorldPosition(this.head);
      const event = this.panel.visible ? this.panel.click(pad.origin, pad.direction) : null;
      if (event) this.onPanelEvent(event.point, () => this.menus.handle(event));
      else if (this.galaxy.visible) {
        const index = this.galaxy.pick(pad.origin, pad.direction);
        if (index !== -2) this.galaxyChoose(index, this.head);
      }
    }
    // The ray: a thin line from the controller, longer in menus.
    const reach = this.panel.visible || this.galaxy.visible ? 2.4 : 1.2;
    this.padRay.position.copy(pad.origin);
    this.padRay.quaternion.setFromUnitVectors(this.padForward, pad.direction);
    this.padRay.scale.set(1, 1, reach);
    (this.padRay.material as MeshBasicMaterial).opacity = this.pilot.active ? 0.22 : 0.6;
  }

  private updateHands(dt: number): void {
    this.laserUsed[0] = false;
    this.laserUsed[1] = false;
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

  /**
   * Screen play (no headset): the view follows the look controls, the
   * on-screen buttons follow the game, and taps in menus press buttons.
   */
  private updateScreen(dt: number): void {
    this.flat = !this.world.renderer.xr.isPresenting;
    const intent = this.screen.frame(dt);
    if (!this.flat) {
      this.screen.show(false, false);
      this.pilot.active = this.pad && this.ready && !this.paused && !this.panel.visible && this.run.phase !== 'title';
      this.menus.flat = false;
      return;
    }
    const camera = this.world.camera;
    this.menus.flat = true;
    // Portrait screens see more with a taller field of view.
    if (camera.aspect !== this.screenAspect) {
      this.screenAspect = camera.aspect;
      camera.fov = camera.aspect < 1 ? 70 + (1 - camera.aspect) * 45 : 70;
      camera.updateProjectionMatrix();
    }
    const reel = shell.landing && this.ready && !this.noReel;
    if (reel !== this.attract) {
      if (reel) this.startAttract();
      else this.stopAttract();
    }
    if (this.attract) {
      this.director.update(dt, this.reelYaw);
      this.screenEuler.set(this.director.pitch, this.director.yaw, this.director.roll, 'YXZ');
    } else this.screenEuler.set(this.screen.pitch, this.screen.yaw, 0, 'YXZ');
    camera.quaternion.setFromEuler(this.screenEuler);
    camera.updateMatrixWorld();
    if (this.attract) this.updateReel(dt);
    shell.playing = !shell.landing && this.run.phase !== 'title';
    const page = !shell.landing;
    const playing = page && this.ready && !this.paused && !this.panel.visible && this.run.phase !== 'title';
    this.pilot.active = playing || this.attract;
    this.aimNdc = this.attract ? this.bot.ndc : this.screen.ndc;
    this.screen.show(page, playing);
    if (playing) {
      const clap = hasUnlock(this.profile, `overdrive-${this.hero}`) && this.overdrive >= 1;
      const storm = this.hero === 'tempest' && this.stormCooldown <= 0 && this.hammerState === 'gripped';
      const uni = this.hero === 'arc' && this.uniCooldown <= 0 && this.uniState === 'idle';
      this.screen.setSpecial(clap ? 'CLAP!' : this.hero === 'ronin' && this.xCooldown <= 0 ? 'X-STRIKE' : storm ? 'STORM' : uni ? 'UNI-BEAM' : '');
      this.screen.setSwap(this.squad.length > 1 && this.run.phase === 'fighting' && this.script == null);
    } else {
      intent.special = false;
      this.screen.setSwap(false);
    }
    if (page && this.ready && !this.movieOffered && !this.attract && !this.deepLinked && this.run.phase === 'title' && this.tx == null && !hasUnlock(this.profile, MOVIE_SEEN) && !hasUnlock(this.profile, PROLOGUE_DONE)) {
      // A first visit on a screen: the opening movie before the menus.
      this.movieOffered = true;
      this.playMovie(() => this.showMenu('main'));
    }
    if (page && this.screen.clicked && !playing) this.screenClick();
  }

  /** A tap in the menus: a panel button, or a planet on the galaxy map. */
  private screenClick(): void {
    this.sfx.unlock();
    // A tap during a movie does nothing (a stray touch must not cut it short): use SKIP, Esc, Space or Enter.
    if (this.movieActive) return;
    if (!this.ready) return;
    this.world.camera.getWorldPosition(this.head);
    this.screenAim(this.v3);
    const panelEvent = this.panel.visible ? this.panel.click(this.head, this.v3) : null;
    if (panelEvent) {
      this.onPanelEvent(panelEvent.point, () => this.menus.handle(panelEvent));
      return;
    }
    if (this.galaxy.visible) {
      const index = this.galaxy.pick(this.head, this.v3);
      if (index !== -2) this.galaxyChoose(index, this.head);
    }
  }

  /** World direction from the camera through the pointer (the reel bot's while it plays). */
  private screenAim(out: Vector3): Vector3 {
    const camera = this.world.camera;
    camera.getWorldPosition(this.v4);
    return out.set(this.aimNdc.x, this.aimNdc.y, 0.5).unproject(camera).sub(this.v4).normalize();
  }

  /** Starts the attract reel behind the landing page. */
  private startAttract(): void {
    this.attract = true;
    this.endScript();
    this.tx = null;
    this.paused = false;
    this.resultTimer = -1;
    this.panel.hide();
    this.syncCarousel();
    this.syncMap();
    this.syncArmory();
    this.syncGalaxy();
    this.shotIndex = -1;
    this.reelSound = false;
    this.sfx.setVolumes(0, 0);
    this.music.play('oblivion');
    this.nextShot();
  }

  /** Cuts to the next hero of the reel, in that hero's world. */
  private nextShot(): void {
    this.shotIndex = (this.shotIndex + 1) % SHOWCASE.length;
    this.shotTime = 0;
    const shot = SHOWCASE[this.shotIndex];
    const chapter = chapterFor(shot.hero);
    const base = STAGES.find((st) => st.world.id === chapter.worldId) ?? STAGES[0];
    const stage: Stage = { ...base, id: `reel-${shot.hero}`, waves: [{ count: 9999, interval: 1.1, speed: 1, kinds: REEL_KINDS, burst: 2 }] };
    this.story = null;
    this.setTwist('none');
    this.equipHero(shot.hero);
    const weapon = ARSENAL.find((w) => w.id === shot.weapon);
    if (weapon) {
      this.weaponDef = weapon;
      this.applySkin();
      this.applyArsenal();
    }
    this.tipQueue = [];
    this.coach.hide();
    this.setTheme(chapter.worldId);
    void this.prepareCreatures(chapter.worldId);
    this.erasure.setLook(lookFor(base.id, base.world.id));
    this.run.start(stage, { maxHealth: 99, speedScale: 0.9, spawnScale: 1 });
    // Straight into the fight: no countdown in a trailer.
    this.run.update(FIRST_INTRO_SECONDS);
    this.lastPhase = 'fighting';
    this.bot.reset(shot.hero);
    this.director.reset();
    shell.showcase = shot.hero;
    shell.cut += 1;
  }

  /** Leaves the reel: clears the field and opens the main menu. */
  private stopAttract(): void {
    this.attract = false;
    shell.showcase = '';
    if (this.looming) this.looming.visible = false;
    for (const drone of this.drones) {
      if (drone.state !== 'off') this.retireDrone(drone);
      // Bodies still falling or lying from the reel go too.
      if (drone.dying >= 0) this.endDeath(drone);
    }
    this.shards.clear();
    for (const bolt of this.bolts) if (bolt.active) this.retireBolt(bolt);
    for (const pickup of this.pickups) this.retirePickup(pickup);
    for (const hand of this.hands) {
      hand.web.hide();
      hand.webState = 'idle';
      hand.webTarget = null;
      if (hand.held) this.releaseHeld(this.hands.indexOf(hand), false);
    }
    this.hideDebris();
    this.pools.clear();
    this.run.toTitle();
    this.lastPhase = 'title';
    this.pilot.active = false;
    // Back to the player's own hero and gear.
    this.hero = this.menus.hero;
    this.weaponDef = equippedWeapon(this.profile, this.hero);
    this.applySkin();
    this.applyArsenal();
    this.sfx.setVolumes(this.profile.settings.sfx, this.profile.settings.music);
    this.screen.lookAt(0, -0.2);
    this.world.camera.getWorldPosition(this.head);
    this.world.camera.getWorldDirection(this.forward);
    this.showMenu('main');
    if (!this.flat) this.replaceMenuAt = this.elapsed + 0.6;
  }

  /** One frame of the reel: what the bot aims at, its input, the cuts and the sound switch. */
  private updateReel(dt: number): void {
    const camera = this.world.camera;
    camera.getWorldPosition(this.v3);
    // Enemies on screen, nearest first (insertion into a small fixed list).
    const targets = this.reelTargets;
    let count = 0;
    const depths = this.reelDepths;
    this.reelYaw = Number.NaN;
    for (const drone of this.drones) {
      if (drone.state === 'off' || drone.state === 'emerging' || drone.state === 'shot' || drone.kind === 'pod' || drone.kind === 'orb') continue;
      this.v1.copy(drone.object.position).project(camera);
      if (this.v1.z > 1 || Math.abs(this.v1.x) > 0.92 || Math.abs(this.v1.y) > 0.92) continue;
      const depth = drone.object.position.distanceTo(this.v3);
      let k = Math.min(count, 7);
      while (k > 0 && depths[k - 1] > depth) {
        if (k < 8) {
          depths[k] = depths[k - 1];
          targets[k * 2] = targets[(k - 1) * 2];
          targets[k * 2 + 1] = targets[(k - 1) * 2 + 1];
        }
        k -= 1;
      }
      if (k < 8) {
        depths[k] = depth;
        targets[k * 2] = this.v1.x;
        targets[k * 2 + 1] = this.v1.y;
        if (k === 0) this.reelYaw = Math.atan2(-(drone.object.position.x - this.v3.x), -(drone.object.position.z - this.v3.z));
      }
      count = Math.min(8, count + 1);
    }
    const tethered = this.hands[0].webState === 'tethered' || this.hands[1].webState === 'tethered';
    const special = (hasUnlock(this.profile, `overdrive-${this.hero}`) && this.overdrive >= 1) || (this.hero === 'ronin' && this.xCooldown <= 0);
    this.bot.update(dt, targets, count, tethered, special);
    const titan = this.looming;
    if (titan) {
      // Far off and huge, drifting and breathing, always watching the hero.
      const t = this.elapsed;
      titan.visible = true;
      titan.scale.setScalar(9);
      titan.position.set(this.v3.x + Math.sin(t * 0.05) * 4, 3 + Math.sin(t * 0.37) * 0.4, this.v3.z - 50);
      titan.lookAt(this.v3);
    }
    this.shotTime += dt;
    if (this.shotTime > SHOT_SECONDS) this.nextShot();
    if (shell.sound !== this.reelSound) {
      this.reelSound = shell.sound;
      this.sfx.setVolumes(shell.sound ? this.profile.settings.sfx : 0, shell.sound ? this.profile.settings.music : 0);
    }
  }

  /** Walkers on the field during the reel. */
  private reelCrowd(): number {
    let n = 0;
    for (const drone of this.drones) if (drone.state !== 'off' && drone.kind !== 'orb' && drone.kind !== 'pod') n += 1;
    return n;
  }

  /** Screen play: the pilot poses both hands from taps, holds and swipes. */
  private readPuppets(): void {
    if (!this.pilot.active) {
      this.pilot.update(this.frameDt, this.screen.intent, this.pilotView, this.head, this.camQuat, (this.puppetPoses ??= [this.hands[0].pose, this.hands[1].pose]));
      return;
    }
    this.fillPilotView();
    this.world.camera.getWorldQuaternion(this.camQuat);
    const intent = this.attract ? this.bot.intent : this.screen.intent;
    this.pilot.update(this.frameDt, intent, this.pilotView, this.head, this.camQuat, (this.puppetPoses ??= [this.hands[0].pose, this.hands[1].pose]));
    for (let index = 0; index < 2; index += 1) {
      const hand = this.hands[index];
      const pose = hand.pose;
      if (!pose.tracked) continue;
      for (const [slot, joint] of this.handSlots[index]) {
        slot[0] = pose.positions[joint * 3];
        slot[1] = pose.positions[joint * 3 + 1];
        slot[2] = pose.positions[joint * 3 + 2];
      }
      hand.tracked = true;
    }
  }

  /** What the pilot needs: the aim point (snapped to the enemy under the pointer) and each weapon's state. */
  private fillPilotView(): void {
    const view = this.pilotView;
    view.hero = this.hero;
    this.screenAim(this.screenRay);
    const camera = this.world.camera;
    const canvas = this.world.renderer.domElement;
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    const ndc = this.screen.ndc;
    let best: Object3D | null = null;
    let closest = 0.17;
    for (const drone of this.drones) {
      if (drone.state === 'off' || drone.state === 'emerging' || drone.state === 'shot') continue;
      this.v1.copy(drone.object.position).project(camera);
      if (this.v1.z > 1) continue;
      const d = Math.hypot((this.v1.x - ndc.x) * aspect, this.v1.y - ndc.y);
      if (d < closest) {
        closest = d;
        best = drone.object;
      }
    }
    if (this.hero === 'psion') {
      for (const item of this.debris) {
        if (item.state !== 'rest') continue;
        this.v1.copy(item.object.position).project(camera);
        if (this.v1.z > 1) continue;
        const d = Math.hypot((this.v1.x - ndc.x) * aspect, this.v1.y - ndc.y);
        if (d < closest) {
          closest = d;
          best = item.object;
        }
      }
    }
    if (best) {
      view.target.copy(best.position);
      view.range = view.target.distanceTo(this.head);
    } else {
      view.target.copy(this.head).addScaledVector(this.screenRay, 7);
      view.range = 7;
    }
    view.hammerState = this.hammerState;
    view.hammerHand = this.hammerHand;
    view.hammerTime = this.hammerTime;
    if (this.hammer) view.hammerAt.copy(this.hammer.position);
    view.bowHolder = this.bowHolder;
    view.bowAt.copy(this.bowLoose.position);
    view.nock.copy(this.bow.restNock);
    view.drawing = this.drawing;
    view.gunHolder = this.gunHolder;
    view.gunAt.copy(this.gunLoose.position);
    view.shieldHand = this.profile.settings.leftHanded ? 1 : 0;
    view.shieldWorn = this.shieldState === 'worn';
    for (let i = 0; i < 2; i += 1) {
      view.held[i] = this.hands[i].held != null;
      view.tethered[i] = this.hands[i].webState === 'tethered';
    }
    view.overdrive = hasUnlock(this.profile, `overdrive-${this.hero}`) && this.overdrive >= 1;
    view.unibeam = this.uniCooldown <= 0 && this.uniState === 'idle';
  }

  /** Screen play: turns the view to the menu that just opened. */
  private frameMenu(): void {
    if (!this.flat) return;
    this.v1.subVectors(this.panel.group.position, this.head);
    const screen = this.menus.screen;
    // Pitch that frames the panel with the 3D content above it (heroes,
    // weapon) or below it (galaxy); otherwise straight at the panel.
    const pitch =
      screen === 'heroes' ? -0.42 : screen === 'garage' ? -0.38 : screen === 'galaxy' ? -0.3 : Math.atan2(this.v1.y, Math.hypot(this.v1.x, this.v1.z));
    this.screen.lookAt(Math.atan2(-this.v1.x, -this.v1.z), pitch);
  }


  // ---------------------------------------------------------------- heroes

  /** Upgrade level for `id` from the saved profile. */
  private level(id: string): number {
    return upgradeLevel(this.profile, id);
  }

  private readonly cinemaHooks: CinemaHooks = {
    erase: (level) => {
      this.cinemaErase = level;
    },
    rumble: (strength) => this.haptics.pulse(this.world.renderer.xr.getSession(), strength, 220),
    intensity: (level) => this.music.setIntensity(level),
  };

  private get movieActive(): boolean {
    return this.cinema.active || this.chapterCinema.active;
  }

  /**
   * True while a movie plays; once it has run `after` seconds a skip input ends it.
   * `why` names the input, shown on the PERF HUD so a movie that ends early can be explained from a recording.
   */
  private skipMovie(after: number, why: string): boolean {
    const movie = this.cinema.active ? this.cinema : this.chapterCinema.active ? this.chapterCinema : null;
    if (movie == null) return false;
    if (movie.t > after) {
      this.lastNote = `skip: ${why} at ${movie.t.toFixed(1)}s`;
      movie.skip();
    }
    return true;
  }

  /** Plays `hero`'s story movie (level 1: the whole story; level 2 or 3: the short road scene), then runs `done`. */
  private playChapterMovie(hero: HeroId, done: () => void, level = 1): void {
    if (this.movieActive) return;
    this.sfx.unlock();
    this.autoPrologueAt = -1;
    const seen = storySeen(hero, level);
    if (!hasUnlock(this.profile, seen)) {
      this.profile.unlocks.push(seen);
      saveProfile(this.profile);
    }
    this.panel.hide();
    this.syncCarousel();
    this.syncMap();
    this.syncArmory();
    this.syncGalaxy();
    this.world.camera.getWorldPosition(this.head);
    this.world.camera.getWorldDirection(this.forward);
    this.music.play(chapterFor(hero).worldId);
    this.chapterCinema.start(this.sfx, this.cinemaHooks, this.head, this.forward, this.flat, hero, level, done);
  }

  /** Plays the opening movie around the player, then runs `done` (also when it is skipped). */
  private playMovie(done: () => void): void {
    if (this.movieActive) return;
    this.sfx.unlock();
    this.autoPrologueAt = -1;
    if (!hasUnlock(this.profile, MOVIE_SEEN)) {
      this.profile.unlocks.push(MOVIE_SEEN);
      saveProfile(this.profile);
    }
    this.panel.hide();
    this.syncCarousel();
    this.syncMap();
    this.syncArmory();
    this.syncGalaxy();
    this.erasure.setLook(WORLD_LOOKS.oblivion);
    this.world.camera.getWorldPosition(this.head);
    this.world.camera.getWorldDirection(this.forward);
    this.music.play('oblivion');
    this.cinema.start(this.sfx, this.cinemaHooks, this.head, this.forward, this.flat, () => {
      this.cinemaErase = 0;
      done();
    });
  }

  /** The session-start fade: black for a moment, then clear. */
  private updateVeil(dt: number): void {
    if (!this.veil.visible) return;
    this.veilT += dt;
    this.veil.position.copy(this.head);
    this.veil.material.opacity = Math.min(1, Math.max(0, 1 - (this.veilT - 0.35) / 0.8));
    if (this.veilT > 1.3) this.veil.visible = false;
  }

  private updateMovie(dt: number): void {
    if (this.chapterCinema.active) this.chapterCinema.update(dt, this.head, Math.atan2(-this.forward.x, -this.forward.z));
    if (!this.cinema.active) return;
    for (let i = 0; i < 2; i += 1) {
      this.movieTracked[i] = this.hands[i].tracked;
      if (this.movieTracked[i]) this.moviePalms[i].copy(this.hands[i].gauntlet.palmPoint);
    }
    this.cinema.update(dt, this.head, this.moviePalms, this.movieTracked, Math.atan2(-this.forward.x, -this.forward.z));
  }

  /** Starts an endless run in the hero's home world, or today's daily challenge. */
  private startEndless(hero: HeroId, daily: boolean): void {
    const day = dayKey(new Date());
    this.startStage(hero, daily ? dailyStage(day) : endlessStage(endlessWorldOf(hero), day));
  }

  /** The twist a stage plays with: a daily rolls its own, the campaign has one per level. */
  private twistOf(stage: Stage): TwistId {
    if (isSagaStage(stage)) return 'none';
    return stage.endless ? stage.endless.twist : twistFor(stage.id);
  }

  /** Plays the level's intro transmission (if any), then the level. */
  private startStage(hero: HeroId, stage: Stage): void {
    this.autoPrologueAt = -1;
    const saga = isSagaStage(stage);
    if (!saga && !stage.endless && !this.deepLinked && stage.number >= 1 && stage.number <= 3 && !hasUnlock(this.profile, storySeen(hero, stage.number))) {
      // The first time a level is started, its part of the hero's story plays first.
      this.playChapterMovie(hero, () => this.startStage(hero, stage), stage.number);
      return;
    }
    if (saga) {
      this.script = stage.id === FINALE.id ? 'finale' : 'prologue';
      hero = this.script === 'finale' ? FINALE_PHASES[0].hero : PROLOGUE_HEROES[0];
      this.story = SAGA_STORY[this.script];
    } else {
      this.endScript();
      this.menus.hero = hero;
      this.story = stage.endless ? null : (levelStory(stage.world.id, stage.number) ?? null);
    }
    this.hero = hero;
    this.setTheme(stage.world.id);
    this.music.play(stage.world.id);
    let intro = this.story?.intro ?? [];
    if (!saga && stage.number === 1 && hasUnlock(this.profile, PROLOGUE_DONE)) {
      const chapter = chapterForWorld(stage.world.id);
      if (chapter) intro = [chapterCall(chapter.region, HEROES.find((h) => h.id === hero)!.name), ...intro];
    }
    // The world's creatures download while the jump tunnel plays.
    const go = () => {
      const ready = this.prepareCreatures(stage.world.id).then(() => this.warmShaders());
      this.travel(stage, () => void ready.then(() => this.launchStage(hero, stage)));
    };
    const ids: (string | null)[] = [];
    if (saga) intro.forEach((_, i) => ids.push(sagaIntroId(this.script === 'finale' ? 'finale' : 'prologue', i)));
    else if (!stage.endless) {
      // ECHO's call for a chapter's first level comes before the level's own lines.
      const extra = intro.length - (this.story?.intro.length ?? 0);
      intro.forEach((_, i) => ids.push(i < extra ? callId(hero) : introId(stage.world.id, stage.number, i - extra)));
    }
    if (intro.length > 0) this.beginTransmission(intro, go, ids);
    else go();
  }

  /** The jump to `stage`'s world: a few seconds in the travel tunnel. */
  private travel(stage: Stage, done: () => void): void {
    const saga = isSagaStage(stage);
    const look = saga ? WORLD_LOOKS.oblivion : lookFor(stage.id, stage.world.id);
    const style = saga ? 'blackhole' : transitFor(stage.world.id, stage.number);
    this.panel.hide();
    this.syncCarousel();
    this.syncMap();
    this.syncArmory();
    this.syncGalaxy();
    this.world.camera.getWorldDirection(this.forward);
    this.transit.start(style, style === 'sky' ? look.horizon : look.accent, style === 'sky' ? look.top : look.horizon, this.forward, done);
    this.sfx.warp();
  }

  /** Starts `stage` with `hero`, applying difficulty, upgrades and skin. */
  private launchStage(hero: HeroId, stage: Stage): void {
    // Normally ready already (see startStage); a no-op if so.
    void this.prepareCreatures(stage.world.id);
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
    this.webShots.clear();
    this.stormActive = 0;
    this.stormCharge = 0;
    this.syncMap();
    this.syncArmory();
    this.setTheme(stage.world.id);
    this.music.play(stage.world.id);
    const frenzy = this.twistOf(stage) === 'frenzy';
    this.run.start(stage, {
      maxHealth: maxHealth(this.profile),
      speedScale: DIFFICULTY[this.profile.settings.difficulty].speed * (frenzy ? 1.3 : 1),
      spawnScale: frenzy ? 0.55 : 1,
    });
    this.lastPhase = 'intro';
    this.sfx.wave();
    if (this.story && !stage.endless && !isSagaStage(stage)) for (let i = 0; i < this.story.taunts.length; i += 1) void this.sfx.loadVoice(tauntId(stage.world.id, stage.number, i));
    this.buffRapid = 0;
    this.buffPower = 0;
    this.overdrive = 0;
    for (const pickup of this.pickups) this.retirePickup(pickup);
    this.xCooldown = 0;
    this.resetScript();
    this.pending = null;
    this.equipHero(hero);
    this.buildSquadFor(hero, stage);
    if (!this.attract) this.heroSurge();
    // Each level is its own world, tearing through the room in MR.
    const look = isSagaStage(stage) ? WORLD_LOOKS.oblivion : lookFor(stage.id, stage.world.id);
    this.erasure.setLook(look);
    this.riftLevel = look.rift;
    this.pools.clear();
    this.setTwist(this.twistOf(stage));
    this.spawnPods(this.story?.hostages ?? 0);
  }

  /** The hero powers up as the level starts: a ring of energy, flashes either side and the name in comic type. */
  private heroSurge(): void {
    const def = HEROES.find((h) => h.id === this.hero);
    if (def == null) return;
    this.v1.copy(this.head).addScaledVector(this.forward, 1.1);
    this.v1.y -= 0.1;
    this.comic.pop(`${def.name} ONLINE!`, this.v1, this.accent, 0.7);
    this.v3.set(-this.forward.z, 0, this.forward.x).normalize();
    for (const side of [-1, 1]) {
      this.v2.copy(this.head).addScaledVector(this.forward, 0.55).addScaledVector(this.v3, side * 0.3);
      this.v2.y -= 0.35;
      this.flashes.spawn(this.v2, this.accent, 0.1, 0.8, 0.5);
      this.particles.burst(this.v2, this.accent, 40, 1.6, 0.6, this.v4);
    }
    if (this.shockwave) {
      this.shockwave.position.copy(this.head).setY(this.head.y - 0.5);
      this.shockwave.rotation.set(Math.PI / 2, 0, 0);
      (this.shockwave.material as MeshBasicMaterial).color.copy(this.accent);
      this.shockwave.visible = true;
      this.shockwaveTime = 0;
    }
    this.sfx.swap();
  }

  /** WEAVER's spider-sense: a ping, a tingle and a flicker of slow motion as a strike winds up. */
  private spiderSense(from: Vector3): void {
    if (this.hero !== 'weaver' || !this.powersLive || this.elapsed - this.senseAt < 0.8) return;
    if (from.distanceTo(this.head) > 4.5) return;
    this.senseAt = this.elapsed;
    this.sfx.ping();
    this.v1.copy(this.head).addScaledVector(this.forward, 0.7);
    this.v1.y += 0.25;
    this.comic.pop('TINGLE!', this.v1, WHITE, 0.35);
    this.flashes.spawn(from, WHITE, 0.1, 0.6, 0.25);
    this.slowmo = Math.max(this.slowmo, 0.3);
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
    this.placeDebris();
    this.applyWeaponTier();
    this.teach(HERO_TIPS[hero]);
  }

  /** Queues coach tips; they cycle while the stage runs. */
  private teach(tips: readonly Tip[]): void {
    this.tipQueue = tips;
    this.tipIndex = 0;
    this.tipTimer = 0;
    this.screenTipIndex = -1;
  }

  private applySkin(): void {
    this.accent.set(equippedColor(this.profile, this.hero));
    this.accentHex = `#${this.accent.getHexString()}`;
    // Energy colour: the finish wins, then the weapon's own, then the suit.
    const finishEnergy = finishFor(this.profile, this.hero).energy;
    this.weaponColor.set(finishEnergy ?? (this.weaponDef.hero === this.hero && this.weaponDef.color ? this.weaponDef.color : this.accent));
    // A power-up recolours the whole kit while it lasts.
    if (this.buffTint) this.weaponColor.copy(this.buffTint);
    this.bow.setColor(this.weaponColor);
    this.suit?.setStyle(this.hero, this.buffTint ?? this.accent);
    for (const hand of this.hands) {
      hand.gauntlet.setAccent(this.buffTint ?? this.accent);
      hand.gauntlet.setStyle(this.hero);
      hand.claws.setColor(this.weaponColor);
      hand.web.setColor(this.weaponColor);
      this.webShots?.setColor(this.weaponColor);
      for (const beam of this.handBeams) beam.setColor(this.weaponColor);
      this.chestBeam?.setColor(this.accent);
      hand.sword.setColor(this.weaponColor);
      hand.psi.setColor(this.buffTint ?? this.accent);
      hand.beamMaterial.color.copy(this.accent);
      hand.glow.material.color.copy(this.accent);
    }
  }

  /** Left wrist: pause during a stage, resume when paused, else go back. */
  private wristPressed(): void {
    this.flashes.spawn(this.wrist.center, WHITE, 0.05, 0.3, 0.25);
    // The wrist button always skips a transmission. A finished one leaves the menu's screen name behind with the
    // panel hidden, so the name alone must not count (it made the button do nothing for the rest of the mission).
    if (this.tx != null || (this.panel.visible && this.menus.screen === 'transmission')) {
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

  /** Pause > SKIP TRAINING: the prologue counts as done (and pays its coins) and the main menu opens. */
  private skipTraining(): void {
    this.paused = false;
    this.resultTimer = -1;
    this.tx = null;
    this.hideDebris();
    this.finishPrologue(true);
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
    this.anchorMenu();
    this.menus.training = this.script === 'prologue';
    this.menus.open(screen);
    this.panel.setContent(this.menus.content());
    this.placePanel();
    this.panel.show();
    this.frameMenu();
    this.syncCarousel();
    this.syncMap();
    this.syncArmory();
    this.syncGalaxy();
    if (screen !== 'pause' && screen !== 'transmission') this.music.play('menu');
  }

  /** The hero screen sits low and close so the 3D heroes stay in view. */
  private placePanel(): void {
    if (this.flat) {
      // Flat screen: the panel and any 3D content fit one view (see frameMenu).
      const screen = this.menus.screen;
      if (screen === 'heroes' || screen === 'garage') this.panel.place(this.menuOrigin, this.menuDir, 0.62, 0.42);
      else if (screen === 'galaxy') this.panel.place(this.menuOrigin, this.menuDir, 1.0, -0.1);
      else this.panel.place(this.menuOrigin, this.menuDir, 0.62, 0.02);
      return;
    }
    if (this.menus.screen === 'heroes') this.panel.place(this.menuOrigin, this.menuDir, 0.42, 0.58);
    else if (this.menus.screen === 'map') this.panel.place(this.menuOrigin, this.menuDir, 0.55, 0.02);
    else if (this.menus.screen === 'garage') this.panel.place(this.menuOrigin, this.menuDir, 0.42, 0.58);
    else if (this.menus.screen === 'galaxy') this.panel.place(this.menuOrigin, this.menuDir, 0.8, -0.06);
    else this.panel.place(this.menuOrigin, this.menuDir);
  }

  /**
   * Sets what the menu is measured from. A menu that opens fresh (none was up) stands
   * where the player likes it, in front of them; after that it stays put through every
   * selection and change of screen (before, each screen was placed again from wherever
   * the head was, so the menu crept about), until the player drags it by the handle or
   * brings it back with the RECENTER chip. Screens (flat) re-frame the view themselves,
   * so their menu is always at the head.
   */
  private anchorMenu(): void {
    if (this.flat || !this.panel.visible) this.freshAnchor();
  }

  /** Stands the menu in front of the player, at the spot they last chose. */
  private freshAnchor(): void {
    this.rigGliding = false;
    // A flat screen has no handle and always puts the menu at the head; a headset uses the spot the player chose.
    freshRig(this.head, this.forward, this.flat ? DEFAULT_PREFS : this.rigPrefs, this.rig);
    this.useRig();
  }

  /** Copies the rig into the origin and heading the panel and props are placed from. */
  private useRig(): void {
    this.menuOrigin.set(this.rig.x, this.rig.y, this.rig.z);
    this.menuDir.set(this.rig.dx, 0, this.rig.dz);
  }

  /** Moves the panel and every visible 3D prop to the rig's place (after a fresh anchor, a drag or a recenter). */
  private reanchorMenu(): void {
    this.placePanel();
    if (this.holomap.visible) this.holomap.show(this.menuOrigin, this.menuDir);
    if (this.armory.visible) this.armory.show(this.menuOrigin, this.menuDir);
    if (this.carousel.visible) this.carousel.reanchor(this.menuOrigin, this.menuDir);
    if (this.galaxy.visible) this.placeGalaxy();
  }

  private placeGalaxy(): void {
    this.galaxy.show(this.menuOrigin, this.menuDir, this.flat ? 0.55 : 0.35, this.flat ? 0.62 : 0.62, this.flat ? 1.05 : 1.0, this.flat ? -0.75 : 0);
  }

  /** The RECENTER chip (or a menu left behind): the menu glides back in front of the player. */
  private recenterMenu(reset: boolean): void {
    if (reset) {
      // The chip also forgets the remembered spot, so "centred" means centred from now on.
      this.rigPrefs = { ...DEFAULT_PREFS, hinted: true };
      saveRigPrefs(this.rigPrefs);
    }
    freshRig(this.head, this.forward, this.rigPrefs, this.rigGoal);
    this.rigGliding = true;
    this.menuHandle.bump();
    this.sfx.unlock();
    this.sfx.swap();
  }

  private endRigGrab(): void {
    this.rigHand = -1;
    // Remember where the menu was left, relative to the head and gaze, for next time.
    this.rigPrefs = prefsFrom(this.rig, this.head, this.forward, true);
    saveRigPrefs(this.rigPrefs);
    this.menuHandle.bump();
    this.sfx.click();
  }

  /**
   * The menu handle, each frame. Pinch the bar (a pinch that closes with the hand over it) and
   * the whole menu, panel and 3D props, follows that hand, kept in reach and facing you; poke the
   * chip and it glides back in front of you; walk too far away and it comes to you on its own.
   * Not used on flat screens or with controllers, which have their own pointers.
   */
  private updateMenuRig(dt: number): void {
    const handle = this.menuHandle;
    const on = (this.rigDebug > 0 && this.panel.visible) || (!this.flat && !this.pad && this.panel.visible && this.tx == null && !this.movieActive && this.menus.screen !== 'transmission');
    if (handle.visible !== on) {
      handle.setVisible(on);
      this.rigShownFor = 0;
    }
    if (!on) {
      this.rigHand = -1;
      this.rigGliding = false;
      this.rigLostFor = 0;
      this.rigNear[0] = false;
      this.rigNear[1] = false;
      return;
    }
    this.rigShownFor += dt;

    // Drifting back to a chosen spot, or finding a menu that was left behind.
    if (this.rigGliding) {
      glideRig(this.rig, this.rigGoal, 1 - Math.exp(-dt * 7), this.head, this.rigNext);
      if (rigGap(this.rigNext, this.rigGoal) < 0.01) {
        copyRig(this.rig, this.rigGoal);
        this.rigGliding = false;
      } else copyRig(this.rig, this.rigNext);
      this.useRig();
      this.reanchorMenu();
    } else if (this.rigHand < 0 && isLost(this.rig, this.head)) {
      this.rigLostFor += dt;
      if (this.rigLostFor > 1.5) {
        this.rigLostFor = 0;
        this.recenterMenu(false);
      }
    } else this.rigLostFor = 0;

    // The handle moves with the panel; its hit tests need this frame's matrices.
    this.panel.group.updateMatrixWorld(true);
    for (let i = 0; i < 2; i += 1) {
      const distance = this.hands[i].tracked && isPinchPose(this.hands[i].joints) ? this.pinchPoint(i, this.rigPoint) : null;
      const over = distance != null && handle.overBar(this.rigPoint);
      if (this.rigHand === i) {
        if (distance == null || distance > RIG_LET_GO) this.endRigGrab();
        else {
          dragRig(this.rigStart, this.rigHandStart, this.rigPoint, this.head, this.rigNext);
          copyRig(this.rig, this.rigNext);
          this.useRig();
          this.reanchorMenu();
        }
      } else if (distance != null && distance < PINCH_ON && !this.rigPinched[i] && over && this.rigHand < 0 && this.rigShownFor > 0.5) {
        // A pinch that closed with the hand on the bar: pick the menu up.
        this.rigHand = i;
        this.rigHandStart.copy(this.rigPoint);
        copyRig(this.rigStart, this.rig);
        this.rigGliding = false;
        handle.bump();
        this.sfx.unlock();
        this.sfx.click();
      }
      if (distance == null || distance > RIG_LET_GO) this.rigPinched[i] = false;
      else if (distance < PINCH_ON) this.rigPinched[i] = true;
      this.rigNear[i] = over || this.rigHand === i;
    }

    // The chip: a fingertip through it.
    let chip = false;
    for (const tip of this.tips) if (handle.overChip(tip)) chip = true;
    if (chip && this.rigChipArmed && this.rigHand < 0) {
      this.rigChipArmed = false;
      this.recenterMenu(true);
    }
    if (!chip) this.rigChipArmed = true;

    // The first-time hint stays up until the handle has been used (or a while has passed).
    if (!this.rigPrefs.hinted && this.rigShownFor > 20) {
      this.rigPrefs.hinted = true;
      saveRigPrefs(this.rigPrefs);
    }
    if (this.rigHand >= 0 && !this.rigPrefs.hinted) this.rigPrefs.hinted = true;
    const d = this.rigDebug;
    handle.setState(d > 0 ? d === 2 : this.rigNear[0] || this.rigNear[1], d > 0 ? d === 3 : this.rigHand >= 0, d > 0 ? d === 5 : !this.rigPrefs.hinted && this.rigShownFor > 0.6, d > 0 ? d === 4 : chip);
    handle.update(dt);
  }

  /** Shows the war map only on the map screen, reflecting progress. */
  private syncMap(): void {
    const on = this.panel.visible && this.menus.screen === 'map';
    if (!on) {
      if (this.holomap.visible) this.holomap.hide();
      return;
    }
    const chapter = chapterFor(this.hero);
    // Fetch this world's creatures while the player reads the briefing.
    void this.prepareCreatures(chapter.worldId);
    this.holomap.build(chapter, equippedColor(this.profile, this.hero), this.markers.get(this.hero) ?? null);
    this.menus.chapterStages().forEach((stage, i) => {
      const unlocked = isStageUnlocked(this.profile, stage);
      const stars = this.profile.stars[stage.id] ?? 0;
      this.holomap.setNode(i, !unlocked ? 'locked' : stars > 0 ? 'cleared' : 'open', stars, `${i + 1}. ${chapter.levels[i].location}`);
    });
    this.holomap.selected = this.menus.mapLevel;
    if (!this.holomap.visible) this.holomap.show(this.menuOrigin, this.menuDir);
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
    if (!this.galaxy.visible) this.placeGalaxy();
  }

  /** Poking a planet picks that hero's front; the core starts the finale. */
  private updateGalaxyPoke(dt: number): void {
    this.galaxyPokeCooldown -= dt;
    if (!this.galaxy.visible || this.galaxyPokeCooldown > 0) return;
    const index = this.galaxy.poked(this.tips);
    if (index === -2 || index === this.menus.galaxyIndex) return;
    this.galaxyPokeCooldown = 0.4;
    this.galaxyChoose(index, this.tips[0] ?? this.head);
  }

  /** A planet (or the core, -1) picked on the galaxy map. */
  private galaxyChoose(index: number, at: Vector3): void {
    if (index === -1) {
      if (finaleUnlocked(this.profile)) this.startStage('arc', FINALE);
      else this.sfx.denied();
      return;
    }
    if (index === this.menus.galaxyIndex) return;
    this.menus.galaxyIndex = index;
    this.galaxy.selected = index;
    this.v1.copy(at);
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
  private beginTransmission(lines: readonly Line[], done: () => void, voice: readonly (string | null)[] = []): void {
    if (lines.length === 0) {
      done();
      return;
    }
    this.tx = { lines, index: -1, timer: 0, done, full: '', typed: 0, shown: -1, glitch: 0, blink: 0, voice, pending: null, wait: 0, speed: 32 };
    for (const id of voice) if (id) void this.sfx.loadVoice(id);
    this.panel.hide();
    this.advanceTransmission();
  }

  private advanceTransmission(): void {
    const tx = this.tx;
    if (tx == null) return;
    this.sfx.stopVoice();
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
    tx.pending = tx.voice[tx.index] ?? null;
    tx.wait = 0;
    tx.speed = 32;
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
    this.sfx.stopVoice();
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
    // The voice starts as soon as its file is decoded (a second at most); the text then keeps pace with it.
    if (tx.pending != null) {
      tx.wait += dt;
      const length = this.sfx.speak(tx.pending);
      if (length > 0) {
        tx.pending = null;
        tx.speed = Math.min(40, Math.max(12, tx.full.length / Math.max(1.5, length * 0.8)));
        tx.timer = Math.max(tx.timer, length - tx.full.length / tx.speed - 0.15);
      } else if (tx.wait > 1.2) tx.pending = null;
    }
    if (tx.typed < tx.full.length) {
      // Typewriter: about 32 characters a second, with soft key clicks.
      const before = Math.floor(tx.typed);
      tx.typed = Math.min(tx.full.length, tx.typed + dt * tx.speed);
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
    this.speakTaunt((run.wave - 1) % taunts.length);
  }

  /** The villain's shout `index` of this level, spoken (campaign levels only). */
  private speakTaunt(index: number): void {
    const stage = this.run.stage;
    if (this.story == null || stage.endless || isSagaStage(stage)) return;
    this.sfx.speak(tauntId(stage.world.id, stage.number, index));
  }

  /** Shows the hero carousel only on the hero screen, in sync with its focus. */
  /**
   * Room-scan sweep on entering MR: every detected wall and surface lights
   * up as a pulsing hologram grid for a few seconds, then fades away.
   */
  /**
   * Asks the headset to run Space Setup from inside the session (Quest
   * browser's initiateRoomCapture): it gives the game the real walls, and
   * with a mapped room Quest no longer shows the small stationary circle.
   * The browser allows it once per session.
   */
  private requestRoomCapture(manual: boolean): void {
    const session = this.world.renderer.xr.getSession() as (XRSession & { initiateRoomCapture?: () => Promise<void> }) | null;
    if (session?.initiateRoomCapture == null || (this.roomAsked && !manual)) {
      if (manual) this.comic.pop(session ? 'ROOM SCAN NOT AVAILABLE' : 'ENTER MR FIRST', this.v1.copy(this.head).addScaledVector(this.forward, 0.9), CYAN, 0.45);
      return;
    }
    this.roomAsked = true;
    this.comic.pop('SCAN YOUR ROOM', this.v1.copy(this.head).addScaledVector(this.forward, 0.9), CYAN, 0.6);
    session.initiateRoomCapture().catch(() => undefined);
  }

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
    if (done) {
      this.scanTime = -1;
      // No walls came through: offer the headset's room scan once.
      if (walls + surfaces === 0) this.requestRoomCapture(false);
    }
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
    const finish = finishFor(this.profile, hero);
    if (model) applyFinish(model, finish, '');
    if (model) this.armory.setWeapon(`${id}:${finish.id}`, model, finish.energy ?? def?.color ?? equippedColor(this.profile, hero), weaponTier(this.profile, hero));
    if (!this.armory.visible) this.armory.show(this.menuOrigin, this.menuDir);
  }

  /** Weapon tier visuals in a mission: auras on held weapons, sparks on hands. */
  private applyWeaponTier(): void {
    // A power-up adds two tiers of rings, sparks and flames on top of the weapon's own.
    this.weaponTierNow = Math.min(5, weaponTier(this.profile, this.hero) + (this.buffKey ? 2 : 0));
    for (const aura of [this.hammerAura, this.gunAura, this.bowAura]) aura?.set(this.weaponTierNow, this.buffTint ?? this.accent);
  }

  private syncCarousel(): void {
    const on = this.panel.visible && this.menus.screen === 'heroes';
    if (on && !this.carousel.visible) {
      this.carousel.setFocus(this.menus.heroFocus);
      this.carousel.show(this.menuOrigin, this.menuDir);
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
    if (this.menus.screen !== before) {
      this.anchorMenu();
      this.placePanel();
    }
    this.panel.setContent(this.menus.content());
    this.syncCarousel();
    this.syncMap();
    this.syncArmory();
    this.syncGalaxy();
  }

  /** REAL ROOM: swaps the neon dome, floor, towers and skyline for the photographed room (loaded the first time it is wanted). */
  private syncBackdrop(): void {
    const arena = this.arena;
    const backdrop = this.backdrop;
    if (arena == null || backdrop == null) return;
    const want = this.roomParam != null ? this.roomParam !== '0' : this.profile.settings.room;
    if (want === this.roomShown) return;
    this.roomShown = want;
    const id = this.roomParam != null && this.roomParam !== '0' && this.roomParam !== '1' ? this.roomParam : DEFAULT_ROOM;
    // The neon sky stays until the room has loaded, so a missing file never leaves a black void.
    const apply = (on: boolean): void => {
      backdrop.setVisible(on);
      for (const child of arena.children) if (child !== backdrop.group) child.visible = !on;
    };
    if (want) void backdrop.load(id).then((ok) => { if (ok && this.roomShown) apply(true); });
    else apply(false);
  }

  private profileChanged(): void {
    saveProfile(this.profile);
    this.sfx.setVolumes(this.profile.settings.sfx, this.profile.settings.music);
    setSensitivity(this.profile.settings.gestures);
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
    if (run.stage.endless) {
      this.finishEndless(won);
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
      this.beginTransmission(outro, () => this.presentResults(info), outro.map((_, i) => (i < this.story!.outro.length ? outroId(run.stage.world.id, run.stage.number, i) : null)));
      return;
    }
    this.presentResults(info);
  }

  /** Records an endless or daily run and shows its results. */
  private finishEndless(won: boolean): void {
    const run = this.run;
    const info = run.stage.endless!;
    const waves = won ? run.totalWaves : run.wave;
    const reward = recordEndless(this.profile, { info, waves, score: run.score, killCoins: run.coins });
    saveProfile(this.profile);
    this.presentResults({
      won,
      stage: run.stage,
      reward: { stars: 0, coins: reward.coins, newBest: reward.newBest },
      score: run.score,
      kills: run.kills,
      bestCombo: run.bestCombo,
      saved: 0,
      hostages: 0,
      endless: { mode: info.mode, waves, best: reward.best, streak: reward.streak, bestStreak: reward.bestStreak },
    });
  }

  private nameAsked = false;

  /** Asks the online board for `hero`'s top scores and shows them when they arrive. */
  private loadNetBoard(hero: HeroId): void {
    this.menus.boardNet = { hero, state: 'loading', entries: [] };
    void fetchBoard(hero).then((value) => {
      this.menus.setNetBoard(hero, value);
      if (this.menus.screen === 'board' && this.panel.visible) this.panel.setContent(this.menus.content());
    });
  }

  /** Files a finished run on its hero's board; returns the place it earned (0: missed the top ten). */
  private recordBoard(info: Parameters<GameMenus['showResults']>[0]): number {
    const hero = this.menus.hero;
    const mode: BoardMode = info.endless ? info.endless.mode : 'campaign';
    const entry: BoardEntry = { name: this.profile.name || 'PLAYER', score: Math.floor(info.score), mode, label: scoreLabel(mode, info.endless?.waves ?? 0, info.stage.number), at: Date.now() };
    const rank = recordScore(this.profile.board, hero, entry);
    saveProfile(this.profile);
    // The world board keeps one score per name, so only a new personal best is sent.
    if (rank === 1) void postScore(hero, entry);
    return rank;
  }

  private presentResults(info: Parameters<GameMenus['showResults']>[0]): void {
    if (info.score > 0 && !isSagaStage(info.stage)) {
      // A first score needs a name: type it on the keyboard, then see the results.
      if (this.profile.name === '' && !this.nameAsked) {
        this.nameAsked = true;
        this.menus.beginName(() => this.presentResults(info));
        this.showMenu('name');
        return;
      }
      info.rank = this.recordBoard(info);
    }
    if (info.reward.coins > 0) this.sfx.coin();
    if (info.reward.unlocked) this.sfx.victory();
    this.menus.showResults(info);
    this.panel.setContent(this.menus.content());
    this.world.camera.getWorldPosition(this.head);
    this.world.camera.getWorldDirection(this.forward);
    this.anchorMenu();
    this.panel.place(this.menuOrigin, this.menuDir);
    this.panel.show();
    this.music.play('menu');
  }

  /** The world id of the stage in play (the hub's neon grid before any). */
  private stageWorld(): string {
    return this.run.stage.world.id in THEMES ? this.run.stage.world.id : 'neon-grid';
  }

  /** Dresses the arena for world `id`: sky and grid colours, painted ground, and the skyline. */
  private styleWorld(id: string): void {
    if (!this.arena) return;
    const style = groundStyleFor(id);
    const look = id === 'oblivion' ? WORLD_LOOKS.oblivion : lookFor(`${id}-1`, id);
    this.ground.setStyle(style, look.ground, look.accent);
    applyTheme(this.arena, this.theme, this.ground.painted);
    this.scenery?.build(style, this.theme.mid, this.theme.accent, this.theme.horizon);
  }

  private setTheme(id: string): void {
    this.theme = THEMES[id] ?? THEMES['neon-grid'];
    CreatureModel.setPalette(this.theme.accent, this.theme.horizon);
    this.styleWorld(id);
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
      setFlash(this.arena, flicker * (this.profile.settings.calm ? 0.2 : 1));
    }
  }

  /** Where a block lands: the worn shield, else the head; `out` receives it. */
  private blockPoint(out: Vector3): Vector3 {
    if (this.shield) return this.shield.getWorldPosition(out);
    return out.copy(this.head);
  }

  // ---------------------------------------------------------------- ARC chest beam

  /**
   * ARC's UNI-BEAM: press an open palm to the chest to charge the reactor,
   * then push the hand out. The reactor fires a huge beam for a few seconds
   * that follows where the hand points (on a screen: the pointer). Everything
   * along it burns. Cooldown follows each firing.
   */
  private updateUniBeam(dt: number, time: number): void {
    const live = this.powersLive && this.hero === 'arc';
    this.uniCooldown -= dt;
    if (!live) {
      this.uniState = 'idle';
      this.uniCharge = 0;
      this.chestBeam.hide();
      this.reactor.visible = false;
      return;
    }
    // The chest: below the chin and a little forward.
    this.chest.copy(this.head);
    this.chest.y -= 0.3;
    this.v1.set(this.forward.x, 0, this.forward.z);
    if (this.v1.lengthSq() > 1e-4) this.chest.addScaledVector(this.v1.normalize(), 0.1);
    let atChest = false;
    let reach: HandState | null = null;
    let far = 0.28;
    for (const hand of this.hands) {
      if (!hand.tracked) continue;
      const d = hand.gauntlet.palmPoint.distanceTo(this.chest);
      if (d < 0.22) atChest = true;
      else if (d > far && d < 1.1) {
        far = d;
        reach = hand;
      }
    }
    switch (this.uniState) {
      case 'idle':
        if (atChest && this.uniCooldown <= 0) {
          this.uniCharge += dt;
          if (this.uniCharge >= 0.5) {
            this.uniState = 'ready';
            this.uniReady = 0;
            this.sfx.swap();
            this.comic.pop('UNI-BEAM!', this.v2.copy(this.chest).addScaledVector(this.forward, 0.5), this.accent, 0.5);
          }
        } else this.uniCharge = Math.max(0, this.uniCharge - dt * 2);
        break;
      case 'ready':
        this.uniReady += dt;
        // Push the hand away from the chest (or tap the screen) to fire.
        if ((!atChest && (reach != null || this.flat)) || this.uniReady > 5) {
          if (this.uniReady > 5 && atChest) {
            this.uniState = 'idle';
            this.uniCharge = 0;
          } else {
            this.uniState = 'firing';
            this.uniTime = 0;
            this.uniCooldown = 10;
            this.uniAim.copy(this.forward);
            this.sfx.explode(true);
            this.slowmo = Math.max(this.slowmo, 0.25);
          }
        }
        break;
      case 'firing':
        this.uniTime += dt;
        if (this.uniTime > 3.5) {
          this.uniState = 'idle';
          this.uniCharge = 0;
          this.chestBeam.hide();
        }
        break;
    }
    // The reactor glows with the charge.
    const glow = this.uniState === 'firing' ? 1 : this.uniState === 'ready' ? 0.75 + Math.sin(time * 18) * 0.15 : Math.min(1, this.uniCharge / 0.5) * 0.6;
    this.reactor.visible = glow > 0.02;
    if (this.reactor.visible) {
      this.reactor.position.copy(this.chest).addScaledVector(this.forward, 0.04);
      this.reactor.scale.setScalar(0.06 + glow * 0.16);
      this.reactor.material.opacity = Math.min(1, glow);
      this.reactor.material.color.copy(this.accent);
    }
    if (this.uniState !== 'firing') return;
    // Aim: the hand's direction from the chest (the pointer on a screen), smoothed.
    if (this.flat) this.screenAim(this.v3);
    else if (reach) this.v3.subVectors(reach.gauntlet.palmPoint, this.chest).normalize();
    else this.v3.copy(this.forward);
    this.uniAim.lerp(this.v3, Math.min(1, dt * 9)).normalize();
    const fade = Math.min(1, this.uniTime / 0.15, (3.5 - this.uniTime) / 0.3);
    this.chestBeam.show(this.chest, this.uniAim, 16, 0.16, time, Math.max(0, fade));
    this.uniTick -= dt;
    if (this.uniTick > 0) return;
    this.uniTick = 0.1;
    this.sfx.laser();
    const power = 0.7 * (1 + 0.2 * this.level('arc-power'));
    for (const drone of this.drones) {
      if (drone.state === 'off' || drone.state === 'emerging' || drone.kind === 'pod') continue;
      this.v4.subVectors(drone.object.position, this.chest);
      const along = this.v4.dot(this.uniAim);
      if (along < 0.2 || along > 16) continue;
      this.v4.addScaledVector(this.uniAim, -along);
      if (this.v4.length() > ENEMIES[drone.kind].radius + 0.28) continue;
      this.markHit('blast', drone.object.position, this.uniAim, undefined, 1.2);
      this.damageDrone(drone, power);
      this.flashes.spawn(drone.object.position, WHITE, 0.08, 0.7, 0.15);
    }
    for (const item of this.debris) {
      if (item.state !== 'rest' && item.state !== 'flying') continue;
      this.v4.subVectors(item.object.position, this.chest);
      const along = this.v4.dot(this.uniAim);
      if (along < 0.2 || along > 16) continue;
      this.v4.addScaledVector(this.uniAim, -along);
      if (this.v4.length() < item.radius + 0.25) this.hitProp(item, 1, this.uniAim, 1.5);
    }
    // Sparks along the beam.
    this.v3.copy(this.chest).addScaledVector(this.uniAim, 2 + Math.random() * 10);
    this.v2.set((Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2);
    this.particles.emit(this.v3, this.v2, Math.random() < 0.5 ? WHITE : this.accent, 0.4, 0.5, 0);
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
    const base = type === 'havoc-smg' ? 0.085 : type === 'havoc-shotgun' ? 0.8 : type === 'havoc-minigun' ? 0.05 : type === 'havoc-launcher' ? 1.1 : 0.34;
    const auto = base * (1 - 0.1 * this.level('havoc-rate')) * (this.buffRapid > 0 ? 0.5 : 1);
    const ready = type !== 'havoc-minigun' || this.gunSpin > 0.6;
    if (curled && ready && this.gunCooldown <= 0) {
      this.triggerArmed = false;
      this.gunCooldown = auto;
      this.shootGun();
    }
  }

  /** HELLFIRE: a homing missile out of the tube with a back-blast, a lock-on within a wide cone, and a big blast. */
  private fireMissile(): void {
    const bolt = this.fire(this.v3, this.v4, true);
    if (bolt == null) return;
    bolt.target = null;
    let best = 0.9;
    for (const drone of this.drones) {
      if (drone.state === 'off' || drone.state === 'emerging' || drone.kind === 'pod' || drone.kind === 'orb') continue;
      const cos = this.v2.subVectors(drone.object.position, this.v3).normalize().dot(this.v4);
      if (cos > best) {
        best = cos;
        bolt.target = drone;
      }
    }
    bolt.bolt.visible = false;
    bolt.missile.visible = true;
    bolt.speed = 9;
    bolt.velocity.copy(this.v4).setLength(9);
    bolt.homing = 2.5;
    bolt.blast = 1.8;
    bolt.damage = 4 * (1 + 0.15 * this.level('havoc-damage'));
    bolt.force = 3;
    bolt.radius = 0.1;
    bolt.life = BOLT_LIFE * 1.6;
    this.gunKick = 3;
    this.flashes.spawn(this.v3, ORANGE, 0.12, 0.9, 0.2);
    this.particles.burst(this.v3, EMBER, 30, 2, 0.3, this.v2);
    // Back-blast out of the rear of the tube.
    this.v2.copy(this.v3).addScaledVector(this.v4, -0.55);
    this.particles.burst(this.v2, DUST, 36, 2.5, 0.6, this.v1);
    this.sfx.weapon('havoc-launcher');
    this.hitStop = Math.max(this.hitStop, 0.02);
  }

  private shootGun(): void {
    const gun = this.blaster!;
    gun.updateMatrixWorld();
    this.blasterMuzzle!.getWorldPosition(this.v3);
    this.v4.set(0, 0, 1).transformDirection(gun.matrixWorld);
    const type = this.weaponDef.id;
    if (type === 'havoc-launcher') {
      this.fireMissile();
      return;
    }
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
        bolt.force = type === 'havoc-shotgun' ? 2.2 : type === 'havoc-pistol' ? 1.5 : 0.8;
        bolt.pierceLeft = this.level('havoc-pierce') > 0 ? Math.ceil(this.level('havoc-pierce') / 2) : 0;
        if (spread > 0) bolt.target = null;
      }
    }
    this.gunKick = type === 'havoc-shotgun' ? 2.2 : type === 'havoc-pistol' ? 1 : 0.35;
    this.flashes.spawn(this.v3, this.weaponColor, 0.05, type === 'havoc-shotgun' ? 0.6 : 0.3, 0.12);
    this.particles.burst(this.v3, this.weaponColor, type === 'havoc-shotgun' ? 20 : 6, 1.2, 0.15, this.v2);
    // The minigun and SMG are sounded every other shot: the ear hears a stream, the mixer stays light.
    if (type === 'havoc-shotgun' || type === 'havoc-pistol' || (this.gunShots += 1) % 2 === 0) this.sfx.weapon(type);
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
      bolt.object.scale.setScalar(this.buffPower > 0 ? 1.4 : 1);
      bolt.missile.visible = false;
      bolt.blast = this.weaponDef.id === 'orion-blast' ? 1.2 : 0;
      bolt.zap = this.weaponDef.id === 'orion-storm';
      bolt.burn = 0;
      bolt.homing = 1;
      bolt.force = 1.6;
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
    this.sfx.weapon(this.weaponDef.id, 'fire', power);
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

  /**
   * WEAVER: webs are bullets. A web pose (or a thrust of the open palm) fires
   * a spinning web net that splats on whatever it meets: an alien, a wall, the
   * floor. Nothing is tied to the hand. A webbed alien is held in place; whip
   * the hand to throw it, or make a fist and pull to rip it apart.
   */
  private updateWebs(dt: number, time: number): void {
    const active = this.powersLive && this.hero === 'weaver';
    for (let index = 0; index < this.hands.length; index += 1) {
      const hand = this.hands[index];
      hand.webCooldown -= dt;
      hand.web.hide();
      if (!active || !hand.tracked) {
        hand.webState = 'idle';
        hand.webTarget = null;
        continue;
      }
      // Wrist velocity: thrusts fire, whips throw.
      hand.pose.position(J.wrist, this.v1);
      if (dt > 0) this.wristVel.subVectors(this.v1, hand.wristPrev).divideScalar(dt);
      else this.wristVel.set(0, 0, 0);
      hand.wristPrev.copy(this.v1);
      hand.webTime += dt;
      const webPose = isWebPose(hand.joints);
      if (hand.webCooldown <= 0) {
        if (webPose) this.shootWeb(index, false);
        else if (isOpenPalm(hand.joints) && this.wristVel.dot(hand.gauntlet.palmNormal) > 1.3) this.shootWeb(index, true);
      }
      const target = hand.webTarget;
      if (target == null || target.state === 'off' || target.snare <= 0) {
        hand.webTarget = null;
        hand.webState = 'idle';
        continue;
      }
      hand.webState = 'tethered';
      // Yank: fist and pull back toward the body rips them apart.
      this.v1.subVectors(this.head, target.object.position).normalize();
      if (isFist(hand.joints) && this.wristVel.dot(this.v1) > YANK_SPEED) {
        this.yank(hand, target);
        continue;
      }
      // Fling: whip the hand and the webbed enemy it points at goes flying.
      const whip = this.wristVel.length();
      if (!webPose && !isFist(hand.joints) && whip > 1.8 * tuning.swing && hand.webTime > 0.15) {
        this.sa.copy(this.wristVel).divideScalar(whip);
        let victim: Drone | null = ENEMIES[target.kind].ground ? target : null;
        let best = 0.3;
        for (const drone of this.drones) {
          if (drone.state === 'off' || drone.snare <= 0 || !ENEMIES[drone.kind].ground) continue;
          const cos = this.sb.subVectors(drone.object.position, hand.gauntlet.palmPoint).normalize().dot(this.sa);
          if (cos > best) {
            best = cos;
            victim = drone;
          }
        }
        if (victim) {
          this.v1.copy(this.wristVel).normalize().multiplyScalar(Math.min(15, Math.max(7, whip * 5)));
          this.v1.y += 2.5;
          if (this.flingDrone(victim, this.v1)) {
            this.sfx.yank();
            this.comic.pop('YOINK!', this.v4.copy(victim.object.position).setY(victim.object.position.y + 0.4), this.accent, 0.4);
            hand.webTarget = null;
            hand.webState = 'idle';
          }
        }
      }
    }
    this.updateWebShots(dt);
  }

  /** Flies every web in the air: hits aliens and shots, splats on walls and floor. */
  private updateWebShots(dt: number): void {
    const shots = this.webShots;
    for (const shot of shots.shots) {
      if (!shot.active) continue;
      if (!shots.step(shot, dt)) {
        this.v2.set(0, 0, 0);
        this.particles.burst(shot.position, WHITE, 6, 0.8, 0.2, this.v2);
        continue;
      }
      // A thin stream of sparkle behind the glob.
      this.v2.set(0, 0, 0);
      this.particles.emit(shot.position, this.v2, WHITE, 0.3, 0, 0);
      let hit: Drone | null = null;
      for (const drone of this.drones) {
        if (drone.state === 'off' || drone.state === 'emerging') continue;
        if (this.segmentHits(shot.previous, shot.position, drone.object.position, ENEMIES[drone.kind].radius + 0.08)) {
          hit = drone;
          break;
        }
      }
      if (hit) {
        this.webHit(shot.hand, hit, shot.velocity);
        shots.retire(shot);
        continue;
      }
      for (const item of this.debris) {
        if (item.state !== 'rest' && item.state !== 'flying') continue;
        if (item.object.position.distanceTo(shot.position) > item.radius + 0.08) continue;
        this.hitProp(item, 1, shot.velocity, 1);
        this.particles.burst(shot.position, WHITE, 14, 1.5, 0.25, this.v2);
        shots.retire(shot);
        break;
      }
      if (!shot.active) continue;
      if (this.room.collide(shot.position, 0.04)) {
        const n = this.room.normal;
        this.v3.set(n[0], n[1], n[2]);
        shots.splat(shot.position, this.v3);
        this.particles.burst(shot.position, WHITE, 18, 1.6, 0.3, this.v2);
        this.flashes.spawn(shot.position, WHITE, 0.05, 0.3, 0.15);
        this.sfx.splat();
        shots.retire(shot);
      }
    }
    shots.update(dt);
  }

  /** A web lands on an alien: it splats like a bullet and wraps them up. */
  private webHit(handIndex: number, hit: Drone, velocity: Vector3): void {
    const hand = this.hands[handIndex];
    this.flashes.spawn(hit.object.position, WHITE, 0.1, 0.7, 0.2);
    this.particles.burst(hit.object.position, WHITE, 36, 2.4, 0.35, this.v1);
    this.markHit('blast', hit.object.position, velocity);
    const solid = hit.kind !== 'orb' && hit.kind !== 'pod';
    if (solid) {
      hit.snare = 4 + 0.8 * this.level('weaver-snare');
      hand.webTarget = hit;
      hand.webState = 'tethered';
      hand.webTime = 0;
    }
    this.sfx.splat();
    if (this.weaponDef.id === 'weaver-electro') hit.shock = 5;
    if (this.weaponDef.id === 'weaver-burst') this.webNet(hit);
    this.damageDrone(hit, 1.4);
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
    this.v4.multiplyScalar(WEB_SPEED * (1 + 0.15 * this.level('weaver-range')));
    if (this.webShots.fire(this.v3, this.v4, index, WEB_FLIGHT) == null) return;
    hand.webTime = 0;
    hand.webCooldown = WEB_COOLDOWN * (this.buffRapid > 0 ? 0.5 : 1);
    this.flashes.spawn(this.v3, WHITE, 0.04, 0.25, 0.1);
    this.sfx.weapon(this.weaponDef.id);
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
          if (speed > HAMMER_THROW_MIN * tuning.swing) this.throwHammer(speed);
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
        this.hammerVelocity.y -= 2.5 * this.gravityScale * dt;
        hammer.position.addScaledVector(this.hammerVelocity, dt);
        hammer.rotateX(-dt * 18);
        if (this.room.collide(hammer.position, HAMMER_HEAD_RADIUS * 0.8)) {
          if (this.room.normal[1] > 0.7) {
            this.dropHammer(this.hammerVelocity, 0.2);
            break;
          }
          // A real wall: a thunderous ricochet.
          this.room.bounce(this.hammerVelocity, 0.5, 0.2);
          this.sfx.thunderHit();
          this.particles.burst(hammer.position, this.weaponColor, 30, 3, 0.4, this.v2);
          if (this.weaponDef.id === 'tempest-godbreaker') this.quake(hammer.position);
        }
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
    this.updateStorm(dt);
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
        this.sfx.weapon(this.weaponDef.id, 'hit');
        this.flashes.spawn(this.v1, WHITE, 0.1, 0.7, 0.2);
        const hammerType = this.weaponDef.id;
        if (hammerType === 'tempest-inferno') drone.burn = Math.max(drone.burn, 4);
        // Weight: a thrown hammer hits harder than a swing; the Godbreaker sends them flying.
        this.markHit('blast', drone.object.position, this.hammerVelocity, undefined, (this.hammerState === 'flying' ? 5 : 3) * (hammerType === 'tempest-godbreaker' ? 1.6 : 1));
        this.hitStop = Math.max(this.hitStop, 0.06);
        this.damageDrone(drone, (this.hammerState === 'flying' ? 3 : 2) + Math.floor(this.level('tempest-impact') / 2) + (hammerType === 'tempest-godbreaker' ? 1 : 0));
        if (hammerType === 'tempest-thunder') {
          this.chainLightning(this.v1, drone);
          this.skyStrike(this.v1, null, 0);
        }
        else if (hammerType === 'tempest-inferno') this.explodeAt(this.v1, 1.1, 1);
        else this.quake(this.v1);
        if (this.hammerState === 'flying') this.hammerVelocity.multiplyScalar(0.8);
      }
      for (const item of this.debris) {
        if ((item.state !== 'rest' && item.state !== 'flying') || this.elapsed - item.bashAt < 0.35) continue;
        if (!this.segmentHits(this.hammerHeadPrev, this.hammerHeadPos, item.object.position, item.radius + HAMMER_HEAD_RADIUS)) continue;
        item.bashAt = this.elapsed;
        this.hitProp(item, 3, this.hammerVelocity, 3);
        this.sfx.thunderHit();
      }
    }
  }

  /**
   * TEMPEST: the hammer is a storm. While it is in hand or in flight, arcs
   * leap from its head to nearby aliens; held overhead it calls STORM CALL:
   * the sky answers with a barrage on everything in sight. The thunder
   * hammer arcs more often; the inferno hammer sets its targets alight and
   * the godbreaker splits the ground.
   */
  private updateStorm(dt: number): void {
    const state = this.hammerState;
    const type = this.weaponDef.id;
    const power = type === 'tempest-thunder' ? 1.5 : 1;
    this.stormCooldown -= dt;
    this.zapTimer -= dt;
    this.crackleTimer -= dt;
    const live = state === 'gripped' || state === 'flying' || state === 'returning';
    const head = this.hammerHeadPos;
    if (live && this.zapTimer <= 0) {
      const flying = state !== 'gripped';
      this.zapTimer = (flying ? 0.1 : 0.2) / power;
      const target = this.nearestEnemy(head, null, flying ? 5.5 : 3.2);
      if (target) {
        this.v1.copy(target.object.position);
        this.lightningFx.strike(head, this.v1, VIOLET, 0.24, 0.02, 1);
        this.particles.burst(this.v1, VIOLET, 10, 1.5, 0.25, this.v2);
        this.flashes.spawn(this.v1, WHITE, 0.05, 0.4, 0.12);
        this.markHit('blast', this.v1, this.v2.subVectors(this.v1, head), undefined, 1.5);
        this.damageDrone(target, flying ? 0.8 : 0.5);
        if (this.elapsed - this.zapSound > 0.25) {
          this.zapSound = this.elapsed;
          this.sfx.thunderHit();
        }
      }
    }
    // Static crackles over the hammer and the fist around it.
    if (live && this.crackleTimer <= 0) {
      this.crackleTimer = 0.09;
      this.v1.set(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize().multiplyScalar(0.2 + Math.random() * 0.15).add(head);
      this.lightningFx.strike(head, this.v1, VIOLET, 0.1, 0.007);
    }
    // STORM CALL: hold the hammer above your head.
    if (this.stormActive > 0) {
      this.stormActive -= dt;
      this.stormGap -= dt;
      if (this.stormGap <= 0) {
        this.stormGap = 0.1;
        this.stormStrike();
      }
    } else if (state === 'gripped' && this.hammer!.position.y > this.head.y + 0.05 && this.stormCooldown <= 0) {
      this.stormCharge += dt;
      if (this.crackleTimer <= 0.05) {
        // The charge climbs the sky.
        this.v1.set((Math.random() - 0.5) * 0.5, 1.5 + Math.random() * 1.5, (Math.random() - 0.5) * 0.5).add(head);
        this.lightningFx.strike(head, this.v1, VIOLET, 0.14, 0.012 + this.stormCharge * 0.02);
      }
      if (this.stormCharge >= 0.6) {
        this.stormCharge = 0;
        this.stormActive = 2.4 + 0.3 * this.level('tempest-impact');
        this.stormCooldown = 8;
        this.lightning = 1;
        this.slowmo = 0.4;
        this.sfx.thunder();
        this.sfx.explode(true);
        this.comic.pop('STORM CALL!', this.v1.copy(head).setY(head.y + 0.5), VIOLET, 0.9);
        this.flashes.spawn(head, WHITE, 0.3, 2.5, 0.5);
      }
    } else this.stormCharge = Math.max(0, this.stormCharge - dt * 2);
  }

  /** One bolt of the barrage, on a random alien within sight (or the ground ahead). */
  private stormStrike(): void {
    let target: Drone | null = null;
    let seen = 0;
    for (const drone of this.drones) {
      if (drone.state === 'off' || drone.state === 'emerging' || drone.kind === 'pod' || drone.kind === 'orb') continue;
      if (drone.object.position.distanceTo(this.head) > 16) continue;
      seen += 1;
      if (Math.random() < 1 / seen) target = drone;
    }
    if (target) {
      this.skyStrike(target.object.position, target, 3 + Math.floor(this.level('tempest-impact') / 2));
      return;
    }
    this.v3.copy(this.head).addScaledVector(this.forward, 4 + Math.random() * 6);
    this.v3.x += (Math.random() - 0.5) * 6;
    this.v3.z += (Math.random() - 0.5) * 6;
    this.v3.y = 0;
    this.skyStrike(this.v3, null, 0);
  }

  /** A bolt from the sky onto `at`; with a target it also hurts and chains. */
  private skyStrike(at: Vector3, target: Drone | null, damage: number): void {
    const type = this.weaponDef.id;
    this.sb.set(at.x + (Math.random() - 0.5) * 1.5, at.y + 6, at.z + (Math.random() - 0.5) * 1.5);
    this.lightningFx.strike(this.sb, at, VIOLET, 0.4, 0.045, 3);
    this.flashes.spawn(at, WHITE, 0.15, 1.4, 0.3);
    this.particles.burst(at, VIOLET, 32, 3.5, 0.5, this.v2);
    this.particles.burst(at, WHITE, 14, 5, 0.4, this.v2);
    this.lightning = Math.max(this.lightning, 0.5);
    if (this.elapsed - this.zapSound > 0.12) {
      this.zapSound = this.elapsed;
      this.sfx.thunderHit();
    }
    for (const item of this.debris) {
      if ((item.state !== 'rest' && item.state !== 'flying') || item.object.position.distanceTo(at) > 1.4) continue;
      this.hitProp(item, 3, this.v2.set(0, 0.5, 0), 3);
    }
    if (type === 'tempest-godbreaker' && Math.random() < 0.3) this.quake(at);
    if (target == null || damage <= 0) return;
    this.markHit('blast', at, this.v2.subVectors(at, this.head).setY(0.3), undefined, 4);
    if (type === 'tempest-inferno') target.burn = Math.max(target.burn, 4);
    this.damageDrone(target, damage);
    this.chainLightning(at, target);
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
    this.sfx.weapon(this.weaponDef.id);
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

  /**
   * Each hero's hands carry their power: motes, sparks and arcs in the
   * hero's colours, plus streaks behind a fast hand. Particle-only, so it
   * costs almost nothing.
   */
  private updateAuras(dt: number, time: number): void {
    if (!this.powersLive || dt <= 0) return;
    const rate = Math.min(2, dt * 60);
    for (let i = 0; i < this.hands.length; i += 1) {
      const hand = this.hands[i];
      if (!hand.tracked) continue;
      const palm = hand.gauntlet.palmPoint;
      const speed = hand.palmVel.length();
      // A power-up: a steady spray of its colour off every hand.
      if (this.buffTint && Math.random() < 0.7 * rate) this.mote(palm, 0.09, 0.5, this.buffTint, 0.6);
      // Streaks behind a fast hand.
      if (speed > 2.5 && Math.random() < 0.8 * rate) {
        this.v2.copy(hand.palmVel).multiplyScalar(-0.08);
        this.particles.emit(palm, this.v2, this.accent, 0.3, 0.8, 0);
      }
      switch (this.hero) {
        case 'arc':
          if (Math.random() < 0.3 * rate) this.mote(palm, 0.07, 0.35, this.accent, 0.5);
          break;
        case 'talon':
          if (hand.claws.extension > 0.8 && Math.random() < 0.35 * rate) this.mote(hand.claws.tip, 0.03, 0.25, Math.random() < 0.4 ? WHITE : this.weaponColor, 0.35);
          break;
        case 'tempest':
          // Arcs crawl over both hands, always.
          if (this.crackleHand[i] <= time) {
            this.crackleHand[i] = time + 0.14 + Math.random() * 0.12;
            this.v1.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(0.13).add(palm);
            this.lightningFx.strike(palm, this.v1, VIOLET, 0.09, 0.006);
          }
          break;
        case 'orion':
          if (Math.random() < 0.25 * rate) this.mote(palm, 0.1, 0.25, this.weaponColor, 0.7);
          break;
        case 'weaver':
          if (Math.random() < 0.3 * rate) {
            hand.pose.position(J.tips[Math.random() < 0.5 ? 0 : 3], this.v3);
            this.mote(this.v3, 0.02, 0.2, WHITE, 0.5);
          }
          break;
        case 'havoc':
          if (this.gunHolder === i && this.gunCooldown > 0 && Math.random() < 0.4 * rate) this.mote(this.blasterMuzzle!.getWorldPosition(this.v3), 0.03, 0.5, EMBER, 0.5);
          break;
        case 'ronin': {
          const sword = hand.sword;
          if (sword.extension > 0.9 && Math.random() < 0.5 * rate) {
            this.v3.lerpVectors(sword.base, sword.tip, Math.random());
            this.mote(this.v3, 0.01, 0.3, Math.random() < 0.3 ? WHITE : this.weaponColor, 0.4);
          }
          break;
        }
        case 'psion':
          if (Math.random() < 0.4 * rate) {
            const a = time * 5 + i * 3.1;
            this.v3.set(palm.x + Math.cos(a) * 0.08, palm.y + Math.sin(time * 3) * 0.03, palm.z + Math.sin(a) * 0.08);
            this.mote(this.v3, 0.005, 0.4, this.accent, 0.7);
          }
          break;
        case 'vanguard':
          if (this.shield && this.shield.visible && i === (this.profile.settings.leftHanded ? 1 : 0) && Math.random() < 0.35 * rate) {
            this.mote(this.shield.position, 0.2, 0.2, this.shieldState === 'worn' ? GOLD : WHITE, 0.5);
          }
          break;
      }
    }
  }

  /** A mote drifting up from near `at`. */
  private mote(at: Vector3, spread: number, rise: number, color: Color, life: number): void {
    this.v1.set(at.x + (Math.random() - 0.5) * spread * 2, at.y + (Math.random() - 0.5) * spread * 2, at.z + (Math.random() - 0.5) * spread * 2);
    this.v2.set((Math.random() - 0.5) * 0.2, rise * (0.5 + Math.random()), (Math.random() - 0.5) * 0.2);
    this.particles.emit(this.v1, this.v2, color, life, 0.5, -0.1);
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
      if (out && !wasOut && claws.extension > 0.5) this.sfx.weapon(this.weaponDef.id, 'draw');
      if (claws.extension < 0.8 || dt <= 0) {
        hand.hasClawPrev = false;
        continue;
      }
      if (!hand.hasClawPrev) {
        hand.clawPrev.copy(claws.tip);
        hand.hasClawPrev = true;
        continue;
      }
      const speed = this.v3.subVectors(claws.tip, hand.clawPrev).length() / dt;
      hand.tipVel.copy(this.v3).divideScalar(dt);
      const index = this.hands.indexOf(hand);
      if (hand.skewer == null) this.tryImpale(index, claws.base, claws.tip, claws.direction);
      // SHOCK EDGE cuts deeper; FURY lets the claws strike again sooner and, at its upper levels, harder.
      const clawDamage = 2 + Math.floor(this.level('talon-wave') / 2) + Math.floor(this.level('talon-tempo') / 3);
      const clawGap = 0.25 * (1 - 0.12 * this.level('talon-tempo'));
      for (const drone of this.drones) {
        if (drone.state === 'off' || drone.state === 'emerging' || this.elapsed - drone.bladeHitAt < clawGap) continue;
        if (!this.bladeHits(drone, claws.base, claws.tip, hand.clawPrev)) continue;
        drone.bladeHitAt = this.elapsed;
        this.sfx.weapon(this.weaponDef.id, 'hit');
        this.v4.subVectors(claws.tip, hand.clawPrev);
        this.v2.crossVectors(this.v4, claws.direction);
        this.markHit('slice', this.hitPoint, this.v4, this.v2);
        if (this.weaponDef.id === 'talon-molten') drone.burn = Math.max(drone.burn, 3);
        this.damageDrone(drone, clawDamage);
        this.hitStop = Math.max(this.hitStop, 0.045);
      }

      this.bladeProps(claws.base, claws.tip, hand.clawPrev);
      this.checkParry(claws.base, claws.tip);
      hand.clawPrev.copy(claws.tip);
    }
  }

  /**
   * Slash waves follow the swing but fly out ahead: a chop or a sweep across
   * the body still sends the wave at the enemies in front instead of into
   * the floor or off to the side. Bends `swing` in place; returns the enemy
   * nearest that line for aim assist.
   */
  private aimWave(swing: Vector3): Drone | null {
    this.v1.set(this.forward.x, 0, this.forward.z).normalize();
    swing.addScaledVector(this.v1, 1.2).normalize();
    if (swing.y < -0.25) swing.setY(-0.25).normalize();
    if (!this.profile.settings.aimAssist) return null;
    let best = 0.8;
    let target: Drone | null = null;
    for (const drone of this.drones) {
      if (drone.state === 'off' || drone.state === 'emerging' || drone.state === 'shot' || drone.kind === 'pod') continue;
      const cos = this.v1.subVectors(drone.object.position, this.head).normalize().dot(swing);
      if (cos > best) {
        best = cos;
        target = drone;
      }
    }
    return target;
  }

  /** Slash wave; radius/damage/scale default to TALON's (with upgrades). */
  private fireCrescent(origin: Vector3, direction: Vector3, bladeDirection: Vector3, radius?: number, damage?: number, scale = 1, quiet = false): Bolt | null {
    const bolt = this.bolts.find((b) => !b.active);
    if (bolt == null) return null;
    bolt.kind = 'crescent';
    bolt.object.scale.setScalar(this.buffPower > 0 ? 1.3 : 1);
    bolt.missile.visible = false;
    bolt.blast = 0;
    bolt.zap = false;
    bolt.burn = this.weaponDef.id === 'ronin-flame' || this.weaponDef.id === 'talon-molten' ? 3 : 0;
    bolt.homing = 1;
    bolt.force = 1;
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
    // Start a little way out along the swing so the wave never swallows the view.
    bolt.position.copy(origin).addScaledVector(direction, 0.3 + 0.2 * scale);
    bolt.previous.copy(bolt.position);
    bolt.velocity.copy(direction).multiplyScalar(CRESCENT_SPEED);
    // Lay the arc along the blade: local up is perpendicular to swing and blade.
    bolt.object.up.crossVectors(direction, bladeDirection);
    if (bolt.object.up.lengthSq() < 1e-6) bolt.object.up.set(0, 1, 0);
    bolt.object.up.normalize();
    bolt.object.position.copy(bolt.position);
    this.v1.copy(origin).add(direction);
    bolt.object.lookAt(this.v1);
    bolt.object.visible = true;
    if (quiet) return bolt;
    this.flashes.spawn(origin, this.accent, 0.05, 0.35, 0.18);
    this.sfx.crescent();
    return bolt;
  }

  // ---------------------------------------------------------------- hands

  private makeDebugLabel(): { debug: Sprite; debugCanvas: HTMLCanvasElement; debugTexture: CanvasTexture } {
    const debugCanvas = document.createElement('canvas');
    debugCanvas.width = 256;
    debugCanvas.height = 128;
    const debugTexture = new CanvasTexture(debugCanvas);
    const debug = new ThreeSprite(new SpriteMaterial({ map: debugTexture, depthTest: false, transparent: true }));
    debug.scale.set(0.16, 0.08, 1);
    debug.renderOrder = 40;
    debug.visible = false;
    this.root.add(debug);
    return { debug, debugCanvas, debugTexture };
  }

  /** Palm velocity per hand, smoothed, for slaps and shoves. */
  private updateHandMotion(dt: number): void {
    for (const hand of this.hands) {
      const palm = hand.gauntlet.palmPoint;
      if (!hand.tracked || dt <= 0) {
        hand.palmValid = false;
        hand.palmVel.set(0, 0, 0);
        continue;
      }
      if (hand.palmValid) {
        this.rv.subVectors(palm, hand.palmPrev).divideScalar(dt);
        hand.palmVel.lerp(this.rv, 0.5);
      }
      hand.palmPrev.copy(palm);
      hand.palmValid = true;
    }
  }

  /**
   * HAND DEBUG: finger extension ratios, the gesture each hand reads as, and
   * palm speed, floating over the wrist, so thresholds can be tuned on the
   * headset (Settings > GESTURES).
   */
  private updateHandDebug(dt: number): void {
    const on = this.profile.settings.handDebug;
    this.debugTimer -= dt;
    const redraw = this.debugTimer <= 0;
    if (redraw) this.debugTimer = 0.12;
    this.hands.forEach((hand, i) => {
      hand.debug.visible = on && hand.tracked;
      if (!hand.debug.visible) return;
      hand.pose.position(J.wrist, this.rv);
      hand.debug.position.copy(this.rv).setY(this.rv.y + 0.13);
      if (!redraw) return;
      const e = fingerExtension(hand.joints);
      const pinch = this.pinchPoint(i, this.rd);
      const gesture = isFist(hand.joints)
        ? 'FIST'
        : isWebPose(hand.joints)
          ? 'WEB'
          : isOpenPalm(hand.joints)
              ? 'OPEN'
              : pinch < PINCH_ON
                ? 'PINCH'
                : '-';
      const c = hand.debugCanvas.getContext('2d')!;
      c.clearRect(0, 0, 256, 128);
      c.fillStyle = 'rgba(8, 8, 20, 0.85)';
      c.fillRect(0, 0, 256, 128);
      c.fillStyle = gesture === '-' ? '#9AA0B4' : '#3DF5FF';
      c.font = 'bold 34px monospace';
      c.fillText(`${hand.handedness === 'left' ? 'L' : 'R'} ${gesture}`, 10, 38);
      c.fillStyle = '#FFFFFF';
      c.font = '22px monospace';
      c.fillText(`I${e[0].toFixed(2)} M${e[1].toFixed(2)}`, 10, 70);
      c.fillText(`R${e[2].toFixed(2)} P${e[3].toFixed(2)}`, 10, 96);
      c.fillText(`${hand.palmVel.length().toFixed(1)} m/s  pinch ${(pinch * 100).toFixed(0)}cm`, 10, 121);
      hand.debugTexture.needsUpdate = true;
    });
  }

  /** A hand that is holding or wielding something does not shove. */
  private handBusy(i: number): boolean {
    const hand = this.hands[i];
    switch (this.hero) {
      case 'talon':
        return hand.claws.extension > 0.3;
      case 'ronin':
        return hand.sword.extension > 0.3;
      case 'havoc':
        return this.gunHolder === i;
      case 'orion':
        return this.bowHolder === i;
      case 'tempest':
        return this.hammerState === 'gripped' && this.hammerHand === i;
      case 'vanguard':
        return true;
      case 'psion':
        return hand.held != null;
      default:
        return false;
    }
  }

  /** A fast hand into an alien or a prop shoves it away. */
  private updateShoves(): void {
    for (let i = 0; i < this.hands.length; i += 1) {
      const hand = this.hands[i];
      if (!hand.tracked || this.handBusy(i)) continue;
      const speed = hand.palmVel.length();
      if (speed < 1.6 * tuning.swing) continue;
      const palm = hand.gauntlet.palmPoint;
      for (const drone of this.drones) {
        const def = ENEMIES[drone.kind];
        if (def.ground == null || drone.state === 'off' || drone.state === 'emerging' || drone.lifted) continue;
        if (this.elapsed - drone.bladeHitAt < 0.4) continue;
        const scale = (this.chestOf(drone) * drone.size) / 1.15;
        const at = drone.object.position;
        this.sa.set(at.x, at.y - 0.6 * scale, at.z);
        this.sb.set(at.x, at.y + 0.45 * scale, at.z);
        if (this.segmentHits(this.sa, this.sb, palm, def.radius * 0.8 + 0.1) === false) continue;
        drone.bladeHitAt = this.elapsed;
        this.markHit('blast', at, hand.palmVel, undefined, 2.5);
        this.damageDrone(drone, 0.5, true);
        this.flashes.spawn(palm, WHITE, 0.05, 0.5, 0.15);
        this.sfx.catchHammer();
        this.hitStop = Math.max(this.hitStop, 0.03);
        if (this.elapsed - this.shoveAt > 1.5) {
          this.shoveAt = this.elapsed;
          this.comic.pop('SHOVE!', this.v1.copy(at).setY(at.y + 0.5), this.accent, 0.35);
        }
        break;
      }
      for (const item of this.debris) {
        if ((item.state !== 'rest' && item.state !== 'flying') || this.elapsed - item.bashAt < 0.3) continue;
        if (item.object.position.distanceTo(palm) > item.radius + 0.08) continue;
        item.bashAt = this.elapsed;
        this.hitProp(item, 0, hand.palmVel, 2);
      }
    }
  }

  /** A fast hand that meets an enemy shot slaps it back at the aliens. */
  private slapped(shot: Drone): boolean {
    if (!this.powersLive) return false;
    for (const hand of this.hands) {
      if (!hand.tracked || hand.palmVel.lengthSq() < 1.0) continue;
      if (hand.gauntlet.palmPoint.distanceTo(shot.object.position) > 0.17) continue;
      this.ra.copy(shot.object.position);
      this.retireDrone(shot);
      this.sfx.clang();
      this.flashes.spawn(this.ra, WHITE, 0.05, 0.5, 0.15);
      this.particles.burst(this.ra, GOLD, 16, 2, 0.25, this.v2);
      if (this.comicCooldown <= 0) {
        this.comicCooldown = 0.4;
        this.comic.pop('SLAP!', this.v1.copy(this.ra).setY(this.ra.y + 0.2), GOLD, 0.35);
      }
      const target = this.nearestEnemy(this.ra, null, 25);
      if (target) {
        this.rv.subVectors(target.object.position, this.ra).normalize();
        const bolt = this.fire(this.rb.copy(this.ra).addScaledVector(this.rv, 0.2), this.rv, true);
        if (bolt) {
          bolt.damage = 1.5;
          bolt.force = 1.5;
          bolt.target = target;
        }
      }
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- props

  /**
   * A hit on a prop: explosives light a short fuse; others lose hit points
   * and shatter at zero, or get shoved across the room (girders never break).
   */
  private hitProp(item: Throwable, damage: number, direction: Vector3, force: number): void {
    if (item.state === 'off' || item.state === 'spawn' || item.fuse > 0) return;
    const at = item.object.position;
    if (item.kind === 'explosive' && damage > 0) {
      item.fuse = 0.12 + Math.random() * 0.12;
      this.flashes.spawn(at, ORANGE, 0.1, 0.8, 0.2);
      this.sfx.sizzle();
      return;
    }
    item.hp -= damage;
    if (item.hp <= 0) {
      this.shatterProp(item, direction);
      return;
    }
    if (item.state === 'rest' || item.state === 'flying') {
      // Still in one piece: the blow shoves it.
      item.state = 'flying';
      item.thrown = false;
      item.t = 0;
      this.rv.copy(direction);
      if (this.rv.lengthSq() < 1e-6) this.rv.set(0, 0, -1);
      this.rv.normalize();
      item.velocity.addScaledVector(this.rv, Math.min(6, force * 1.2));
      item.velocity.y += 1 + force * 0.3;
      item.spin.set((Math.random() - 0.5) * 6 * force, (Math.random() - 0.5) * 6 * force, (Math.random() - 0.5) * 6 * force);
    }
    this.particles.burst(at, WHITE, 10, 1.5, 0.25, this.v2);
    this.sfx.ping();
  }

  /** A prop breaks apart; an explosive barrel blows up, setting off its neighbours. */
  private shatterProp(item: Throwable, direction: Vector3 | null): void {
    const at = this.re.copy(item.object.position);
    item.state = 'off';
    item.object.visible = false;
    item.object.scale.setScalar(1);
    item.fuse = -1;
    item.respawn = item.placed ? (this.hero === 'psion' ? 6 : 10) : -1;
    for (const hand of this.hands) {
      if (hand.held === item) {
        hand.held = null;
        hand.psi.hide();
      }
    }
    this.rv.set(0, 0, 0);
    if (direction) this.rv.copy(direction).normalize().multiplyScalar(2);
    this.shards.burst(at, item.kind as ShardStuff, item.kind === 'boulder' ? 8 : 10, item.kind === 'explosive' ? 5 : 2.5, this.rv);
    this.particles.burst(at, DUST, 18, 1.4, 0.6, this.v2);
    this.sfx.shatter();
    if (item.kind !== 'explosive') return;
    // The blast: fire, shock, burning aliens, the next barrels lit.
    this.flashes.spawn(at, WHITE, 0.2, 1.4, 0.2);
    this.flashes.spawn(at, ORANGE, 0.3, 3.2, 0.6);
    this.particles.burst(at, ORANGE, 70, 4.5, 0.7, this.v2);
    this.particles.burst(at, EMBER, 40, 3, 1, this.v2);
    this.sfx.explode(true);
    for (const drone of this.drones) {
      if (drone.state !== 'off' && ENEMIES[drone.kind].ground && drone.object.position.distanceTo(at) < 2.2) drone.burn = Math.max(drone.burn, 3);
    }
    this.v4.set(this.head.x - at.x, 0, this.head.z - at.z);
    if (this.v4.length() < 1.6) this.hurtPlayer(1, false, at);
    if (this.comicCooldown <= 0) {
      this.comicCooldown = 0.4;
      this.comic.pop('KA-BOOM!', this.v1.copy(at).setY(at.y + 0.6), ORANGE, 0.8);
    }
    this.explodeAt(at, 1.9, 4);
  }

  /** Props within `radius` of `at` take `damage` (explosions, quakes, meteors, impacts). */
  private propsNear(at: Vector3, radius: number, damage: number, force: number): void {
    for (const item of this.debris) {
      if (item.state === 'off' || item.state === 'spawn') continue;
      if (item.object.position.distanceTo(at) > radius + item.radius) continue;
      this.rd.subVectors(item.object.position, at).setY(0.5);
      this.hitProp(item, damage, this.rd, force);
    }
  }

  /** A bolt reaching a prop. */
  private boltProps(bolt: Bolt): void {
    for (const item of this.debris) {
      if (item.state !== 'rest' && item.state !== 'flying' && item.state !== 'held') continue;
      if (!this.segmentHits(bolt.previous, bolt.position, item.object.position, item.radius + bolt.radius)) continue;
      this.hitProp(item, bolt.damage, bolt.velocity, bolt.force);
      if (bolt.blast > 0) this.explodeAt(bolt.position, bolt.blast, 2);
      if (bolt.kind === 'crescent' && bolt.blast === 0) continue;
      this.retireBolt(bolt);
      return;
    }
  }

  /** A blade (base..tip, previous tip) cutting into a prop. */
  private bladeProps(base: Vector3, tip: Vector3, prevTip: Vector3): void {
    for (const item of this.debris) {
      if ((item.state !== 'rest' && item.state !== 'flying') || this.elapsed - item.bashAt < 0.3) continue;
      const r = item.radius * 0.9;
      const at = item.object.position;
      if (!this.segmentHits(base, tip, at, r) && !this.segmentHits(prevTip, tip, at, r)) continue;
      item.bashAt = this.elapsed;
      this.rd.subVectors(tip, prevTip);
      this.hitProp(item, 2, this.rd, 1.5);
      this.sfx.slash();
      this.hitStop = Math.max(this.hitStop, 0.04);
    }
  }

  // ---------------------------------------------------------------- physics

  /** Rebuilds the room's collision surfaces from MR plane detection. */
  private syncRoom(): void {
    const room = this.room;
    room.clear();
    room.floor = 0;
    const walls: Segment[] = [];
    const floors: number[][] = [];
    for (const entity of this.queries.planes.entities) {
      const plane = entity.getValue(XRPlane, '_plane') as XRPlane | undefined;
      const object = entity.object3D;
      if (plane == null || object == null) continue;
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
      if (!Number.isFinite(minX)) continue;
      object.updateMatrixWorld();
      this.ra.set((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
      object.localToWorld(this.ra);
      this.rb.set(0, 1, 0).transformDirection(object.matrixWorld);
      // The floor is the infinite floor already (and gets the world's ground painted on).
      if (plane.orientation === 'horizontal' && this.ra.y < 0.2 && this.rb.y > 0.5) {
        const poly: number[] = [];
        for (const corner of plane.polygon) {
          this.rc.set(corner.x, 0, corner.z).applyMatrix4(object.matrixWorld);
          poly.push(this.rc.x, this.rc.y, this.rc.z);
        }
        floors.push(poly);
        continue;
      }
      this.rc.subVectors(this.head, this.ra);
      if (this.rb.dot(this.rc) < 0) this.rb.negate();
      this.rd.set(1, 0, 0).transformDirection(object.matrixWorld);
      this.re.set(0, 0, 1).transformDirection(object.matrixWorld);
      room.add(this.rb, this.ra, this.rd, this.re, (maxX - minX) / 2, (maxZ - minZ) / 2);
      if (plane.orientation === 'vertical' && Math.abs(this.rb.y) < 0.35) {
        const seg = wallSegment([this.ra.x, this.ra.y, this.ra.z], [this.rb.x, this.rb.y, this.rb.z], [this.rd.x, this.rd.y, this.rd.z], [this.re.x, this.re.y, this.re.z], (maxX - minX) / 2, (maxZ - minZ) / 2);
        if (seg) walls.push(seg);
      }
    }
    this.ground.setFloor(floors);
    // Remember the walls (and tell the border when they changed).
    let changed = walls.length !== this.wallSegs.length;
    for (let i = 0; !changed && i < walls.length; i += 1) {
      const a = walls[i];
      const b = this.wallSegs[i];
      changed = Math.abs(a.a[0] - b.a[0]) + Math.abs(a.a[2] - b.a[2]) + Math.abs(a.b[0] - b.b[0]) + Math.abs(a.b[2] - b.b[2]) > 0.05;
    }
    if (changed) {
      this.wallSegs = walls.slice(0, 24);
      this.wallVersion += 1;
    }
  }

  /**
   * Turns a dying walker into a ragdoll: points taken from its current pose,
   * pushed by the blow that killed it (or thrown with `velocity`). Returns
   * false when all ragdoll slots are busy (it then falls the scripted way).
   */
  private startRagdoll(drone: Drone, velocity: Vector3 | null): boolean {
    const rig = drone.rig;
    if (rig == null) return false;
    let slot = -1;
    for (let i = 0; i < this.ragdolls.length; i += 1) {
      if (this.ragdolls[i].drone == null) {
        slot = i;
        break;
      }
    }
    if (slot < 0) return false;
    const rag = this.ragdolls[slot];
    const body = rag.body;
    rag.drone = drone;
    drone.ragdoll = slot;
    drone.posed = true;
    drone.landed = false;
    drone.flying = false;
    drone.dying = 0;
    const object = drone.object;
    object.updateMatrixWorld(true);
    const put = (i: number, source: Object3D, x = 0, y = 0, z = 0) => {
      this.ra.set(x, y, z);
      source.localToWorld(this.ra);
      body.setPoint(i, this.ra.x, this.ra.y, this.ra.z);
    };
    put(RAG.chest, object);
    put(RAG.hipL, rig.legL);
    put(RAG.hipR, rig.legR);
    this.ra.fromArray(body.pos, RAG.hipL * 3).add(this.rb.fromArray(body.pos, RAG.hipR * 3)).multiplyScalar(0.5);
    body.setPoint(RAG.pelvis, this.ra.x, this.ra.y + 0.03, this.ra.z);
    if (rig.head) put(RAG.head, rig.head, 0, 0.05, 0);
    else put(RAG.head, object, 0, 0.45, 0);
    put(RAG.shoulderL, rig.armL);
    put(RAG.elbowL, rig.elbowL);
    put(RAG.handL, rig.elbowL, 0, -0.27, 0);
    put(RAG.shoulderR, rig.armR);
    put(RAG.elbowR, rig.elbowR);
    put(RAG.handR, rig.elbowR, 0, -0.27, 0);
    put(RAG.kneeL, rig.kneeL);
    put(RAG.footL, rig.kneeL, 0, -0.43, 0);
    put(RAG.kneeR, rig.kneeR);
    put(RAG.footR, rig.kneeR, 0, -0.43, 0);
    body.relink();
    const s = drone.size * (this.chestOf(drone) / 1.15);
    body.radius.fill(0.06 * s);
    body.radius[RAG.head] = 0.09 * s;
    body.radius[RAG.chest] = 0.12 * s;
    body.radius[RAG.pelvis] = 0.1 * s;
    if (velocity) {
      for (let i = 0; i < body.count; i += 1) body.setVelocity(i, velocity.x, velocity.y, velocity.z);
      return true;
    }
    // The blow: strongest at the point it landed, so the body twists as it goes.
    const force = this.hitStyle === 'slice' ? 0.5 : Math.min(8, this.hitForce);
    this.rc.copy(this.hitDir);
    for (let i = 0; i < body.count; i += 1) {
      this.ra.fromArray(body.pos, i * 3);
      const near = Math.max(0, 1 - this.ra.distanceTo(this.hitPoint) / 0.7);
      const k = force * 1.6 * (0.5 + 0.5 * near);
      body.setVelocity(
        i,
        this.rc.x * k + (Math.random() - 0.5) * 0.3,
        this.rc.y * k + force * 0.35 + 0.2,
        this.rc.z * k + (Math.random() - 0.5) * 0.3,
      );
    }
    return true;
  }

  /** Steps a ragdoll, poses the body from it, and freezes it once it settles. */
  private updateRagdoll(drone: Drone, dt: number): void {
    const rag = this.ragdolls[drone.ragdoll];
    const body = rag.body;
    drone.dying += dt;
    body.step(dt, 9.8 * this.gravityScale, this.room, 4, 0.6, 0.12);
    this.poseRagdoll(drone, body);
    if (!drone.landed && body.contacts > 2) {
      // First touchdown: a thud, dust and a spreading pool.
      drone.landed = true;
      this.ra.fromArray(body.pos, RAG.pelvis * 3);
      this.pools.spill(this.ra.x, this.ra.z, drone.kind === 'titan' || drone.size > 1 ? 1.5 : 1);
      this.ra.y = 0.03;
      this.particles.burst(this.ra, DUST, 16, 1.1, 0.5, this.v2);
      this.sfx.catchHammer();
    }
    const speed = body.maxSpeed();
    if (speed > 3 && this.elapsed - drone.bowlAt > 0.3) {
      // A body flying through the crowd knocks the living over.
      this.ra.fromArray(body.pos, RAG.chest * 3);
      for (const other of this.drones) {
        if (other === drone || other.state === 'off' || other.state === 'emerging' || !ENEMIES[other.kind].ground) continue;
        if (other.object.position.distanceTo(this.ra) > ENEMIES[other.kind].radius + 0.35) continue;
        drone.bowlAt = this.elapsed;
        this.rb.subVectors(other.object.position, this.ra);
        this.markHit('blast', other.object.position, this.rb, undefined, 2);
        this.damageDrone(other, 2);
        this.sfx.catchHammer();
        break;
      }
    }
    if ((drone.dying > 0.8 && speed < 0.25) || drone.dying > 3.2) {
      // Settled: free the slot, keep the pose; lie, then sink.
      rag.drone = null;
      drone.ragdoll = -1;
      drone.dying = 0;
      if (!drone.landed) {
        this.ra.fromArray(body.pos, RAG.pelvis * 3);
        this.pools.spill(this.ra.x, this.ra.z, 1);
      }
    }
  }

  /** Poses the alien's bones from its ragdoll points. */
  private poseRagdoll(drone: Drone, body: Verlet): void {
    const rig = drone.rig!;
    const object = drone.object;
    const p = body.pos;
    // Torso frame: up along the spine, right across the shoulders.
    const chest = this.ra.fromArray(p, RAG.chest * 3);
    const up = this.rb.subVectors(chest, this.rc.fromArray(p, RAG.pelvis * 3)).normalize();
    const right = this.rc.subVectors(this.rd.fromArray(p, RAG.shoulderR * 3), this.re.fromArray(p, RAG.shoulderL * 3));
    right.addScaledVector(up, -right.dot(up));
    if (right.lengthSq() < 1e-6) return;
    right.normalize();
    const forward = this.rd.crossVectors(right, up);
    this.rm.makeBasis(right, up, forward);
    object.quaternion.setFromRotationMatrix(this.rm);
    object.position.copy(chest);
    // Legs hang from the figure (no rotation of its own).
    this.aimBone(rig.legL, object.quaternion, RAG.hipL, RAG.kneeL, body, -1);
    this.rq.copy(object.quaternion).multiply(rig.legL.quaternion);
    this.aimBone(rig.kneeL, this.rq, RAG.kneeL, RAG.footL, body, -1);
    this.aimBone(rig.legR, object.quaternion, RAG.hipR, RAG.kneeR, body, -1);
    this.rq.copy(object.quaternion).multiply(rig.legR.quaternion);
    this.aimBone(rig.kneeR, this.rq, RAG.kneeR, RAG.footR, body, -1);
    // Arms and head hang from the upper body, unless it was cut away.
    const upper = drone.parts.Upper;
    if (upper && upper.object.parent !== upper.parent) return;
    this.rq.copy(object.quaternion).multiply(rig.upper.quaternion);
    const armL = drone.parts.ArmL;
    if (!armL || armL.object.parent === armL.parent) {
      this.aimBone(rig.armL, this.rq, RAG.shoulderL, RAG.elbowL, body, -1);
      this.rq2.copy(this.rq).multiply(rig.armL.quaternion);
      this.aimBone(rig.elbowL, this.rq2, RAG.elbowL, RAG.handL, body, -1);
    }
    const armR = drone.parts.ArmR;
    if (!armR || armR.object.parent === armR.parent) {
      this.aimBone(rig.armR, this.rq, RAG.shoulderR, RAG.elbowR, body, -1);
      this.rq2.copy(this.rq).multiply(rig.armR.quaternion);
      this.aimBone(rig.elbowR, this.rq2, RAG.elbowR, RAG.handR, body, -1);
    }
    const head = drone.parts.Head;
    if (rig.head && (!head || head.object.parent === head.parent)) this.aimBone(rig.head, this.rq, RAG.chest, RAG.head, body, 1);
  }

  /** Rotates `bone` so its local -Y (`sign` -1) or +Y (`sign` 1) points from point `a` to point `b`. */
  private aimBone(bone: Object3D, parentQ: Quaternion, a: number, b: number, body: Verlet, sign: number): void {
    const p = body.pos;
    this.rv.set(p[b * 3] - p[a * 3], p[b * 3 + 1] - p[a * 3 + 1], p[b * 3 + 2] - p[a * 3 + 2]);
    if (this.rv.lengthSq() < 1e-8) return;
    this.rv.normalize().applyQuaternion(this.rqi.copy(parentQ).invert());
    this.rv.multiplyScalar(sign);
    bone.quaternion.setFromUnitVectors(this.yAxis, this.rv);
  }

  // ---------------------------------------------------------------- arrivals

  /** Bosses and champions are announced: siren, warning, then the arrival. */
  private queueSpawn(order: SpawnOrder): void {
    if (order.kind !== 'boss' && !order.champion) {
      const drone = this.spawnDrone(order.kind, order.speed);
      if (drone && order.elite) this.makeElite(drone);
      return;
    }
    this.pending = { ...order, t: 0 };
    this.sfx.klaxon();
    this.riftLevel = Math.min(0.6, this.riftLevel + 0.1);
    this.v1.copy(this.head).addScaledVector(this.forward, 1.6);
    this.comic.pop('WARNING!', this.v1, MAGENTA, 1.0);
  }

  /**
   * How many times the health ordinary enemies have right now: 1 in the scripted
   * prologue and finale, otherwise it follows the missions the player has cleared
   * (or the wave, in endless and daily runs), and the difficulty setting.
   */
  private toughness(): number {
    if (this.script != null) return 1;
    const stage = this.run.stage;
    const progress = stage.endless ? 4 + this.run.wave * 0.5 : missionsCleared(this.profile);
    return enemyToughness(progress, this.profile.settings.difficulty);
  }

  /** The wave's last enemy: a size bigger, twice as tough, and it brings a power-up. */
  private makeElite(drone: Drone): void {
    const def = ENEMIES[drone.kind];
    drone.elite = true;
    drone.size = 1.25;
    drone.hp = def.hp * 2.2 * this.toughness();
    drone.maxHp = drone.hp;
    if (def.ground) drone.spawn.y = this.chestOf(drone) * drone.size;
    this.flashes.spawn(drone.spawn, GOLD, 0.3, 2, 0.6);
    this.particles.burst(drone.spawn, GOLD, 50, 2.5, 0.6, this.v2);
    this.comic.pop('ELITE!', this.v1.copy(drone.spawn).setY(drone.spawn.y + 1), GOLD, 0.6);
  }

  private updatePending(dt: number): void {
    const pending = this.pending;
    if (pending == null) return;
    pending.t += dt;
    // Red alarm pulses at the edge of the view.
    if (Math.floor(pending.t / 0.6) !== Math.floor((pending.t - dt) / 0.6)) {
      this.damageMaterial.opacity = 0.22;
      this.damage.visible = true;
    }
    if (pending.t < 2.6) return;
    this.pending = null;
    if (pending.kind === 'boss') {
      this.spawnBoss();
      this.slowmo = Math.max(this.slowmo, 0.6);
      return;
    }
    const drone = this.spawnDrone(pending.kind, pending.speed);
    if (drone == null) return;
    // A champion: bigger, much tougher, named, with a burning portal.
    const def = ENEMIES[drone.kind];
    drone.size = drone.kind === 'titan' ? 1.25 : 1.5;
    drone.champion = this.run.stage.endless ? championName(this.run.stage.world.id, this.run.wave) : (CHAMPIONS[this.run.stage.id] ?? 'CHAMPION');
    drone.maxHp = (def.hp * 6 + 8) * Math.sqrt(this.toughness());
    drone.hp = drone.maxHp;
    drone.spawn.y = this.chestOf(drone) * drone.size;
    drone.portal.scale.setScalar(0.01);
    this.flashes.spawn(drone.spawn, ENEMY_COLOR.boss, 0.4, 3, 0.8);
    this.particles.burst(drone.spawn, ENEMY_COLOR.boss, 120, 3, 0.8, this.v2);
    this.sfx.thunder();
    this.comic.pop(drone.champion, this.v1.copy(drone.spawn).setY(drone.spawn.y + 1.2), ENEMY_COLOR.boss, 0.8);
    this.taunt = `${drone.champion} has arrived!`;
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
      mesh.userData.variantGlow = copy.color.getHex();
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
      if (!glowing) return;
      m.color.setHex(base.color);
      if (m.emissive) m.emissive.setHex(base.emissive);
      if (id === 'tempest-inferno') {
        if (glowing) {
          m.color.set('#FF5A1F');
          m.emissive!.set('#FF5A1F');
        }
      } else if (id === 'tempest-godbreaker') {
        if (glowing) {
          m.color.set('#FFD23F');
          m.emissive!.set('#FFD23F');
        }
      }
      mesh.userData.variantGlow = m.color.getHex();
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
    // The finish restyles the real weapon in hand.
    const finish = finishFor(this.profile, this.hero);
    const energy = this.weaponColor.getHexString();
    if (this.hero === 'havoc' && this.blaster) applyFinish(this.blaster, finish, energy);
    if (this.hero === 'tempest' && this.hammer) applyFinish(this.hammer, finish, energy);
    if (this.hero === 'vanguard' && this.shield) applyFinish(this.shield, finish, energy);
    if (this.hero === 'orion') applyFinish(this.bow.group, finish, energy);
    if (this.hero === 'ronin') for (const hand of this.hands) applyFinish(hand.sword.group, finish, energy);
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
    // The proton beam: a layered, flowing beam instead of a line.
    const index = this.hands.indexOf(hand);
    this.laserUsed[index] = true;
    hand.beam.visible = false;
    this.handBeams[index].show(palm, dir, distance, 0.035, this.elapsed, Math.min(1, hand.armTime * 5));
    this.v3.copy(palm).addScaledVector(dir, distance);
    hand.glow.visible = true;
    hand.glow.position.copy(palm);
    hand.glow.scale.setScalar(0.12 + Math.random() * 0.03);
    this.v2.set((Math.random() - 0.5) * 1.5, Math.random() * 1.5, (Math.random() - 0.5) * 1.5);
    this.particles.emit(this.v3, this.v2, Math.random() < 0.5 ? WHITE : ORANGE, 0.3, 1, 2);
    hand.cooldown -= dt;
    if (best && hand.cooldown <= 0) {
      hand.cooldown = 0.1;
      this.markHit('blast', best.object.position, dir, undefined, 0.3);
      this.damageDrone(best, 0.4 * (1 + 0.2 * this.level('arc-power')));
      this.flashes.spawn(this.v3, this.weaponColor, 0.05, 0.25, 0.1);
      this.sfx.weapon('arc-beam');
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
    this.sfx.weapon('arc-rockets');
  }

  /** An explosion: flash, fire and smoke, damage in `radius`. */
  private explodeAt(at: Vector3, radius: number, damage: number): void {
    this.impactPoint.copy(at);
    const p = this.impactPoint;
    this.flashes.spawn(p, ORANGE, 0.2, radius * 1.6, 0.4);
    this.flashes.spawn(p, WHITE, 0.1, radius * 0.6, 0.15);
    this.particles.burst(p, ORANGE, 40, 3, 0.5, this.v2);
    this.particles.burst(p, DUST, 20, 1.5, 0.8, this.v2);
    this.sfxAt(p, () => this.sfx.explode(false));
    this.scorchAt(p, Math.max(0.5, radius * 0.7));
    for (const drone of this.drones) {
      if (drone.state === 'off' || drone.kind === 'pod' || drone.kind === 'orb') continue;
      if (drone.object.position.distanceTo(p) > radius + ENEMIES[drone.kind].radius) continue;
      this.v1.subVectors(drone.object.position, p);
      this.markHit('blast', drone.object.position, this.v1.setY(Math.max(this.v1.y, 0.4)), undefined, 5);
      this.damageDrone(drone, damage);
    }
    this.propsNear(p, radius, damage + 2, 5);
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
      this.markHit('blast', drone.object.position, this.v1.setY(0.6), undefined, 4.5);
      this.damageDrone(drone, 2);
    }
    this.propsNear(at, 2.2, 2, 4);
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
      this.handLight.intensity = 2.2;
      this.handLight.position.copy(this.armory.group.position).add(this.v1.set(0.5, 0.6, 0)).addScaledVector(this.forward, -0.6);
    } else if (this.twist !== 'blackout') this.handLight.intensity = 0;
    if (this.twist === 'blackout') {
      this.applyDarkness(this.run.phase !== 'title');
      // The only light is the player's hands.
      const hand = this.hands[1].tracked ? this.hands[1] : this.hands[0];
      const on = this.run.phase !== 'title' && hand.tracked;
      this.handLight.intensity = on ? 3.2 : 0;
      this.handLight.color.copy(this.accent).lerp(WHITE, 0.5);
      if (on) this.handLight.position.copy(hand.gauntlet.palmPoint).addScaledVector(hand.gauntlet.palmNormal, 0.1);
      this.veilTarget = this.run.phase === 'title' ? 0 : this.isPassthrough() ? 0.12 : 0;
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

  /** A warned strike on the floor at (x, z): used by boss attacks. */
  private strikeAt(x: number, z: number): void {
    const m = this.meteors.find((k) => k.state === 'off');
    if (m == null) return;
    m.target.set(x, 0, z);
    m.state = 'warn';
    m.t = 0;
    m.marker.position.set(x, 0.01, z);
    m.marker.visible = true;
    m.markerMaterial.color.set('#FF2A2A');
    (m.rock.material as MeshBasicMaterial).color.set('#FF7A1A');
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
      if (this.twist !== 'lightning' && m.t > WARN - FALL) {
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
    } else this.sfxAt(at, () => this.sfx.explode(true));
    const color = lightning ? VIOLET : ORANGE;
    this.flashes.spawn(at, color, 0.3, 2.2, 0.5);
    this.flashes.spawn(at, WHITE, 0.1, 0.9, 0.2);
    this.particles.burst(at, color, 60, 4, 0.6, this.v2);
    this.particles.burst(at, DUST, 30, 2, 0.8, this.v2);
    this.scorchAt(at, 0.9);
    // Crushes aliens in the circle...
    for (const drone of this.drones) {
      if (drone.state === 'off' || drone.kind === 'pod' || drone.kind === 'boss') continue;
      this.v4.set(drone.object.position.x - at.x, 0, drone.object.position.z - at.z);
      if (this.v4.length() > 0.9 + ENEMIES[drone.kind].radius) continue;
      this.markHit('blast', drone.object.position, this.v4.setY(0.5), undefined, 5);
      this.damageDrone(drone, 3);
    }
    // ...smashes props...
    this.propsNear(at, 1.1, 5, 5);
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
      if (this.run.phase === 'title' && this.tx == null && !hasUnlock(this.profile, PROLOGUE_DONE)) {
        // First time in: the opening movie, then the guided prologue.
        const prologue = () => this.startStage('arc', PROLOGUE);
        if (hasUnlock(this.profile, MOVIE_SEEN)) prologue();
        else this.playMovie(prologue);
      }
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
      if (this.tipQueue.length > 0 && this.flat) {
        // Flat screen: the same lessons as taps and swipes, at the bottom of the screen.
        this.coach.hide();
        const tips = SCREEN_TIPS[this.hero];
        if (this.tipIndex < tips.length && (this.screenTipHero !== this.hero || this.screenTipIndex !== this.tipIndex)) {
          this.screenTipHero = this.hero;
          this.screenTipIndex = this.tipIndex;
          this.screen.showTip(tips[this.tipIndex].title, this.script === 'prologue' ? `${tips[this.tipIndex].sub} (Pause > SKIP TRAINING to jump in.)` : tips[this.tipIndex].sub, TIP_SECONDS);
        }
      } else if (this.tipQueue.length > 0) {
        const n = this.tipQueue.length;
        const count = n > 1 ? `${this.tipIndex + 1} / ${n}` : '';
        this.coach.show(this.tipQueue[this.tipIndex], this.accentHex, this.script === 'prologue' ? `${count}${count ? '   ' : ''}PAUSE: SKIP TRAINING` : count);
      } else this.coach.hide();
    }
    if (this.script === 'prologue') this.updatePrologue(dt);
    else if (this.script === 'finale') this.updateFinale(dt, time);
    else if (this.movieActive) this.eraseTarget = this.cinemaErase;
    else if (this.run.phase === 'title') this.eraseTarget = 0;
    else this.eraseTarget = this.isPassthrough() || this.roomShown ? this.riftLevel * 0.3 : 1;
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
        this.beginTransmission(PROLOGUE_ERASURE, () => this.finishPrologue(), PROLOGUE_ERASURE.map((_, i) => erasureId(i)));
      }
    }
  }

  private finishPrologue(skipped = false): void {
    if (!hasUnlock(this.profile, PROLOGUE_DONE)) {
      this.profile.unlocks.push(PROLOGUE_DONE);
      this.profile.coins += 300;
    }
    saveProfile(this.profile);
    for (const drone of this.drones) if (drone.state !== 'off') this.retireDrone(drone);
    this.run.toTitle();
    this.endScript();
    if (skipped) this.sfx.click();
    else this.sfx.victory();
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
    if (won && this.story) this.beginTransmission(this.story.outro, done, this.story.outro.map((_, i) => sagaOutroId('finale', i)));
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
      shield.position.copy(this.v1).addScaledVector(this.sz, 0.13).addScaledVector(this.sy, -0.03);
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
          this.markHit('blast', drone.object.position, this.shieldVel, undefined, 3);
          this.damageDrone(drone, 2 + Math.floor(force / 2));
          this.sfx.clang();
        }
      }
      // Throw: swing and open the hand.
      const e = fingerExtension(hand.joints);
      const open = (e[0] + e[1] + e[2] + e[3]) / 4 > 1.6;
      if (open && speed > 2.2 * tuning.swing && this.shieldTime > 0.4) this.throwShield(speed);
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
      if (this.room.collide(shield.position, 0.2)) {
        // Off a real wall (or the floor): it keeps its speed and finds the next target.
        const wall = this.room.normal[1] < 0.7;
        this.room.bounce(this.shieldVel, wall ? 0.95 : 0.6, 0.05);
        if (wall) {
          this.sfx.clang();
          this.particles.burst(shield.position, GOLD, 24, 2.5, 0.3, this.v2);
          this.hitStop = Math.max(this.hitStop, 0.03);
          this.shieldTarget = this.nearestEnemy(shield.position, this.shieldLast, 7);
        }
      }
      this.v2.set(0, 0, 0);
      this.particles.emit(this.shieldPrev, this.v2, this.weaponColor, 0.3, 0);
      // A bright streak behind the spinning disc.
      this.shieldTrail -= dt;
      if (this.shieldTrail <= 0) {
        this.shieldTrail = 0.03;
        this.lightningFx.streak(this.shieldPrev, shield.position, this.weaponColor, 0.22, 0.05);
      }
      for (const drone of this.drones) {
        if (drone.state === 'off' || drone.state === 'emerging' || drone === this.shieldLast || drone.kind === 'orb') continue;
        if (!this.segmentHits(this.shieldPrev, shield.position, drone.object.position, ENEMIES[drone.kind].radius + 0.22)) continue;
        this.shieldLast = drone;
        this.v4.copy(drone.object.position);
        this.markHit('blast', drone.object.position, this.shieldVel, undefined, 3.5);
        this.hitStop = Math.max(this.hitStop, 0.04);
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
      for (const item of this.debris) {
        if ((item.state !== 'rest' && item.state !== 'flying') || this.elapsed - item.bashAt < 0.35) continue;
        if (!this.segmentHits(this.shieldPrev, shield.position, item.object.position, item.radius + 0.22)) continue;
        item.bashAt = this.elapsed;
        this.hitProp(item, 3, this.shieldVel, 3);
        this.sfx.clang();
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
      this.shieldRipple(this.v1);
      this.comic.pop('CATCH!', this.v2.copy(this.v1).setY(this.v1.y + 0.2), this.weaponColor, 0.35);
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
    this.sfx.weapon(this.weaponDef.id);
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

  /** A blow lands on the shield: an energy flash, a hex-shard spray, a rumble. */
  private shieldRipple(at: Vector3): void {
    this.flashes.spawn(at, this.weaponColor, 0.14, 1.0, 0.25);
    this.flashes.spawn(at, WHITE, 0.06, 0.5, 0.12);
    this.particles.burst(at, this.weaponColor, 24, 2.2, 0.3, this.v2);
    this.haptics.pulse(this.world.renderer.xr.getSession(), 0.7, 120);
  }

  /** A shot hits the shield and flies back at the nearest enemy. */
  private deflect(at: Vector3): void {
    this.shieldRipple(at);
    this.sfx.clang();
    this.particles.burst(at, GOLD, 20, 2, 0.25, this.v2);
    const target = this.nearestEnemy(at, null, 20);
    if (target == null) return;
    this.v1.subVectors(target.object.position, at).normalize();
    const bolt = this.fire(this.v2.copy(at).addScaledVector(this.v1, 0.3), this.v1, true);
    if (bolt) {
      bolt.damage = 2 + Math.floor(this.level('vanguard-guard') / 2);
      bolt.force = 1.5;
      bolt.target = target;
    }
  }

  /** A fast fist that lands on a body hits hard. */
  private updatePunch(hand: HandState, dt: number, force: number): void {
    if (!hand.tracked || dt <= 0) return;
    hand.pose.position(J.middleProx, this.v1);
    const speed = this.v2.subVectors(this.v1, hand.punchPrev).length() / dt;
    hand.punchPrev.copy(this.v1);
    if (speed < 1.6 * tuning.swing || !isFist(hand.joints)) return;
    for (const item of this.debris) {
      if ((item.state !== 'rest' && item.state !== 'flying') || this.elapsed - item.bashAt < 0.3) continue;
      if (item.object.position.distanceTo(this.v1) > item.radius + 0.1) continue;
      item.bashAt = this.elapsed;
      this.hitProp(item, 1, this.v2, 2.5);
    }
    for (const drone of this.drones) {
      if (drone.state === 'off' || drone.state === 'emerging' || drone.kind === 'orb' || this.elapsed - drone.bladeHitAt < 0.3) continue;
      if (drone.object.position.distanceTo(this.v1) > ENEMIES[drone.kind].radius + 0.12) continue;
      drone.bladeHitAt = this.elapsed;
      this.markHit('blast', drone.object.position, this.v2, undefined, 2.5);
      this.damageDrone(drone, 1 + Math.floor(force / 2));
      this.hitStop = Math.max(this.hitStop, 0.04);
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
        this.sfx.weapon(this.weaponDef.id, 'draw');
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
      // KEEN EDGE and WIND CUTTER each add a point of damage every two levels.
      const damage = 2 + Math.floor(this.level('ronin-edge') / 2) + Math.floor(this.level('ronin-wave') / 2);
      for (const drone of this.drones) {
        if (drone.state === 'off' || drone.state === 'emerging' || this.elapsed - drone.bladeHitAt < 0.3) continue;
        if (!this.bladeHits(drone, sword.base, sword.tip, hand.prevTip)) continue;
        drone.bladeHitAt = this.elapsed;
        // Duellists (REAVER-class) sometimes get their own blade up: the cut rings off it.
        if (drone.kind === 'blade' && drone.stun <= 0 && this.elapsed - drone.guardAt > 0.9 && Math.random() < 0.3) {
          drone.guardAt = this.elapsed;
          this.sfx.clang();
          this.clash(this.hitPoint, sword.base, sword.tip, this.sa.copy(this.hitPoint).addScaledVector(sword.direction, -0.3), this.sb.copy(this.hitPoint).addScaledVector(this.v3.set(0, 1, 0), 0.3));
          this.comic.pop('BLOCKED!', this.v1.copy(this.hitPoint).setY(this.hitPoint.y + 0.25), WHITE, 0.4);
          drone.knock.copy(this.v4.subVectors(sword.tip, hand.prevTip)).setY(0).normalize().multiplyScalar(0.8);
          drone.stagger = 0.25;
          drone.staggerMax = 0.25;
          this.hitStop = Math.max(this.hitStop, 0.05);
          continue;
        }
        this.sfx.weapon(this.weaponDef.id, 'hit');
        this.particles.burst(this.hitPoint, WHITE, 18, 2.5, 0.25, this.v2);
        this.v4.subVectors(sword.tip, hand.prevTip);
        // The cut: a bright straight streak through the wound.
        this.v3.copy(this.v4).normalize();
        this.lightningFx.streak(this.sa.copy(this.hitPoint).addScaledVector(this.v3, -0.55), this.sb.copy(this.hitPoint).addScaledVector(this.v3, 0.55), this.weaponColor, 0.18, 0.035);
        this.v2.crossVectors(this.v4, sword.direction);
        this.markHit('slice', this.hitPoint, this.v4, this.v2);
        if (this.weaponDef.id === 'ronin-flame') drone.burn = Math.max(drone.burn, 3);
        this.damageDrone(drone, damage);
        this.hitStop = Math.max(this.hitStop, 0.045);
      }
      this.bladeProps(sword.base, sword.tip, hand.prevTip);
      this.deflectShots(sword.base, sword.tip);
      // A whoosh as the blade picks up speed.
      if (sword.speed > 3 && this.swishArmed[i]) {
        this.swishArmed[i] = false;
        this.sfx.weapon(this.weaponDef.id, 'swing');
      } else if (sword.speed < 1.8) this.swishArmed[i] = true;
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
    // The crossed blades cut everything within reach of them (no flying waves).
    const damage = 5 + this.level('ronin-cross');
    for (const drone of this.drones) {
      if (drone.state === 'off' || drone.state === 'emerging' || drone.state === 'shot' || drone.kind === 'pod' || drone.kind === 'orb') continue;
      if (drone.object.position.distanceTo(at) > 1.3 + ENEMIES[drone.kind].radius) continue;
      this.markHit('slice', drone.object.position, this.xDir, undefined, 3);
      this.damageDrone(drone, damage);
    }
    this.hitStop = Math.max(this.hitStop, 0.08);
    this.flashes.spawn(at, this.accent, 0.2, 1.6, 0.45);
    this.particles.burst(at, this.accent, 70, 4, 0.5, this.v2);
    this.v1.copy(at).addScaledVector(this.xDir, 0.6);
    this.comic.pop('X-STRIKE!', this.v1, this.accent, 0.8);
    this.sfx.thunderHit();
    this.sfx.crescent();
  }

  // ---------------------------------------------------------------- PSION

  private makeThrowable(object: Object3D, radius: number, kind = 'slot'): Throwable {
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
      kind,
      hp: PROP_HP[kind] ?? Infinity,
      fuse: -1,
      respawn: -1,
      placed: false,
    };
  }

  /**
   * The level's props in a front arc: PSION gets every prop close by to
   * throw; everyone else gets two explosive barrels, a crate and a barrel
   * out between them and the aliens, to shoot, cut or smash.
   */
  private placeDebris(): void {
    this.v3.set(this.forward.x, 0, this.forward.z);
    if (this.v3.lengthSq() < 1e-4) this.v3.set(0, 0, -1);
    this.v3.normalize();
    const psion = this.hero === 'psion';
    const total = psion ? this.debris.length : 4;
    let crate = false;
    let barrel = false;
    let n = 0;
    const spots = this.isPassthrough() && !this.seatedNow() ? roomSpots(this.wallSegs, total, 0.7, this.head.x, this.head.z, 1.2) : [];
    for (const item of this.debris) {
      item.placed = false;
      let use = psion || item.kind === 'explosive';
      if (!psion && item.kind === 'crate' && !crate) use = crate = true;
      if (!psion && item.kind === 'barrel' && !barrel) use = barrel = true;
      if (!use) continue;
      const angle = (n / Math.max(1, total - 1) - 0.5) * (psion ? 2.4 : 2.0);
      const distance = psion ? 1.4 + (n % 2) * 0.9 : 2.6 + (n % 2) * 1.0;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      item.home.set(this.v3.x * c - this.v3.z * s, 0, this.v3.x * s + this.v3.z * c);
      item.home.multiplyScalar(distance).add(this.head);
      const spot = spots[n];
      if (spot) item.home.set(spot[0], 0, spot[2]);
      item.home.y = item.radius * 0.8;
      item.placed = true;
      this.spawnDebris(item);
      n += 1;
    }
  }

  private spawnDebris(item: Throwable): void {
    item.hp = PROP_HP[item.kind] ?? Infinity;
    item.fuse = -1;
    item.respawn = -1;
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
      item.placed = false;
      item.fuse = -1;
      item.respawn = -1;
    }
    for (const slot of this.liftSlots) this.freeSlot(slot);
    this.shards?.clear();
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
      if (item.fuse > 0) {
        // A lit explosive: the lamp strobes, then it goes up.
        item.fuse -= dt;
        item.object.scale.setScalar(1 + Math.sin(this.elapsed * 60) * 0.03);
        if (item.fuse <= 0) this.shatterProp(item, null);
        continue;
      }
      if (item.state === 'off' && item.respawn > 0 && this.run.phase !== 'title') {
        item.respawn -= realDt;
        if (item.respawn <= 0) this.spawnDebris(item);
        continue;
      }
      if (item.state !== 'spawn') continue;
      item.t += realDt;
      item.object.scale.setScalar(Math.min(1, item.t / 0.5));
      if (item.t >= 0.5) item.state = 'rest';
    }
    for (let i = 0; i < this.hands.length; i += 1) {
      const hand = this.hands[i];
      const psi = hand.psi;
      if (!active || !hand.tracked) {
        if (hand.held && hand.grabZone == null) this.releaseHeld(i, false);
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
    this.shards.update(dt, 9.8 * this.gravityScale, this.gibCollide);
    for (const slot of this.liftSlots) if (slot.state === 'flying') this.updateThrowable(slot, dt);
  }

  /**
   * Every hero: a closed free hand takes hold of a creature by the bone it
   * touches. Head: lift, squeeze, slam or throw. Arm: yank to disarm and
   * stagger. Leg: trip. Opening the hand flings it.
   */
  private updateGrabs(realDt: number, time: number): void {
    const palmReach = 0.16;
    for (let i = 0; i < this.hands.length; i += 1) {
      const hand = this.hands[i];
      const free = this.powersLive && hand.tracked && this.hero !== 'psion' && !this.handBusy(i);
      const fist = free && isFist(hand.joints);
      const item = hand.grabZone != null ? hand.held : null;
      if (item) {
        const drone = item.drone;
        if (!free || drone == null || drone.state === 'off' || !drone.lifted) {
          if (drone == null || drone.state === 'off' || !drone.lifted) this.freeSlot(item);
          else this.releaseHeld(i, false);
          hand.held = null;
          hand.grabZone = null;
          continue;
        }
        hand.grabLoose = fist ? 0 : hand.grabLoose + realDt;
        if (hand.grabLoose > 0.08) {
          this.releaseHeld(i, true);
          hand.grabZone = null;
          continue;
        }
        this.holdGrabbed(i, item, drone, realDt, time);
        continue;
      }
      if (!free || hand.held) continue;
      const palm = hand.gauntlet.palmPoint;
      let best: Drone | null = null;
      let bestZone: GrabZone = 'head';
      let bestDistance = palmReach * 2.2;
      for (const drone of this.drones) {
        const creature = drone.creature;
        if (creature == null || !this.liftable(drone)) continue;
        if (palm.distanceTo(drone.object.position) > 1.6) continue;
        for (const zone of creature.zones) {
          zone.bone.getWorldPosition(this.v1);
          const d = this.v1.distanceTo(palm);
          if (d < bestDistance) {
            bestDistance = d;
            best = drone;
            bestZone = zone.name;
            this.v4.copy(this.v1);
          }
        }
      }
      if (best == null) continue;
      if (this.elapsed - hand.grabRingAt > 0.09) {
        hand.grabRingAt = this.elapsed;
        this.flashes.spawn(this.v4, bestDistance < palmReach ? WHITE : this.accent, 0.06, 0.8, 0.12);
      }
      if (!fist || bestDistance > palmReach) continue;
      const slot = this.liftSlots.find((s) => s.state === 'off');
      if (slot == null) continue;
      slot.object = best.object;
      slot.drone = best;
      slot.radius = ENEMIES[best.kind].radius;
      slot.state = 'held';
      slot.thrown = false;
      slot.previous.copy(best.object.position);
      slot.velocity.set(0, 0, 0);
      best.lifted = true;
      hand.held = slot;
      hand.grabZone = bestZone;
      hand.grabLoose = 0;
      hand.grabOffset.subVectors(this.v4, best.object.position);
      this.sfx.lift();
      this.flashes.spawn(this.v4, WHITE, 0.12, 0.9, 0.2);
      this.particles.burst(this.v4, this.accent, 14, 1.2, 0.3, this.v2);
      this.comic.pop(bestZone === 'head' ? 'GOT HIM!' : bestZone === 'arm' ? 'DISARM!' : 'TRIP!', this.v1.copy(this.v4).setY(this.v4.y + 0.3), this.accent, 0.4);
      if (bestZone === 'arm') {
        best.stun = 2.2;
        best.creature!.play('hit', 1, true, 0.05);
      } else best.creature!.play('run', 2.2);
    }
  }

  /** Carries a grabbed creature by its bone: it follows the hand and thrashes. */
  private holdGrabbed(i: number, item: Throwable, drone: Drone, dt: number, time: number): void {
    const hand = this.hands[i];
    const position = item.object.position;
    item.previous.copy(position);
    this.v3.subVectors(hand.gauntlet.palmPoint, hand.grabOffset);
    this.v3.y = Math.max(this.v3.y, this.chestOf(drone) * (hand.grabZone === 'leg' ? 1.1 : 0.55));
    position.lerp(this.v3, Math.min(1, dt * 16));
    if (dt > 0) {
      this.v4.subVectors(position, item.previous).divideScalar(dt);
      item.velocity.lerp(this.v4, 0.45);
    }
    drone.object.rotation.x = Math.sin(time * 11 + i) * 0.18;
    drone.object.rotation.z = hand.grabZone === 'leg' ? Math.PI * 0.9 : Math.sin(time * 8) * 0.12;
    // Squeezing the head hurts.
    if (hand.grabZone === 'head' && this.elapsed - hand.grabRingAt > 0.35) {
      hand.grabRingAt = this.elapsed;
      this.damageDrone(drone, 0.6);
      this.particles.burst(this.v3.copy(position).setY(position.y + this.chestOf(drone)), BLOOD_RED, 6, 1, 0.25, this.v2);
    }
    // A hard downward pull slams it into the floor.
    if (hand.palmVel.y < -2.6 * tuning.swing && this.elapsed - item.bashAt > 0.5) {
      item.bashAt = this.elapsed;
      const damage = hand.grabZone === 'head' ? 4 : hand.grabZone === 'leg' ? 3 : 2;
      this.v3.copy(position);
      this.markHit('blast', this.v3, hand.palmVel, undefined, 2.5);
      this.sfx.catchHammer();
      this.hitStop = Math.max(this.hitStop, 0.05);
      this.flashes.spawn(this.v3.setY(0.05), WHITE, 0.4, 0.9, 0.2);
      this.particles.burst(this.v3, GOLD, 22, 2.2, 0.3, this.v2);
      this.comic.pop('SLAM!', this.v1.copy(this.v3).setY(this.v3.y + 0.6), GOLD, 0.45);
      this.damageDrone(drone, damage, true);
      this.haptics.pulse(this.world.renderer.xr.getSession(), 0.8, 100);
      if (drone.state !== 'off') {
        this.releaseHeld(i, false);
        hand.grabZone = null;
      }
    }
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
    if (!flung || speed < PSI_THROW_MIN * tuning.swing) return;
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
    if (drone) {
      // A thrown alien crashes into whatever it reaches: another alien, a wall, the floor.
      const floor = this.chestOf(drone);
      const wall = this.room.collide(position, item.radius) && this.room.normal[1] < 0.7;
      if (hit == null && !wall && position.y > floor && item.t < 4) return;
      if (item.thrown) this.psiImpact(position, hit, drone);
      position.y = floor;
      this.freeSlot(item);
      drone.object.rotation.set(0, drone.object.rotation.y, 0);
      if (item.thrown) {
        this.v1.copy(item.velocity);
        this.markHit('blast', position, this.v1, undefined, 3);
        this.damageDrone(drone, 3 + this.level('psion-mass'));
      }
      return;
    }
    if (hit) {
      // Bounce off whatever it hit, then fall.
      if (item.thrown) this.psiImpact(position, hit, null);
      if (item.state === 'off') return;
      item.velocity.multiplyScalar(-0.25);
      item.velocity.y = 2;
      item.thrown = false;
      return;
    }
    // The real room: bounce off walls and tables, settle on anything flat.
    if (this.room.collide(position, item.radius * 0.8)) {
      if (item.thrown) {
        this.psiImpact(position, null, null);
        item.thrown = false;
        if (item.state === 'off') return;
      }
      this.room.bounce(item.velocity, 0.35, 0.35);
      item.spin.multiplyScalar(0.5);
      if (this.room.normal[1] > 0.7 && item.velocity.lengthSq() < 0.6) {
        item.object.rotation.set(0, item.object.rotation.y, 0);
        item.velocity.set(0, 0, 0);
        item.state = 'rest';
        this.particles.burst(position, WHITE, 12, 0.8, 0.3, this.v2);
        this.sfx.catchHammer();
      }
      return;
    }
    if (position.distanceTo(this.head) > 12 || item.t >= 6 || position.y < -1) this.spawnDebris(item);
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
      this.v1.subVectors(drone.object.position, this.impactPoint).setY(0.4);
      this.markHit('blast', drone.object.position, this.v1, undefined, 4);
      this.damageDrone(drone, drone === hit ? damage + 2 : damage);
    }
    this.propsNear(this.impactPoint, radius, 3, 4);
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
    // Aim assist narrows with difficulty: easy 0.985, normal 0.993, hard none.
    const hardness = this.profile.settings.difficulty;
    let best = this.profile.settings.aimAssist && hardness !== 'hard' ? (hardness === 'easy' ? AIM_ASSIST_COS : 0.993) : 2;
    for (const drone of this.drones) {
      if (drone.state === 'off') continue;
      const cos = this.v2.subVectors(drone.object.position, origin).normalize().dot(direction);
      if (cos > best) {
        best = cos;
        bolt.target = drone;
      }
    }
    bolt.kind = 'bolt';
    bolt.object.scale.setScalar(this.buffPower > 0 ? 1.6 : 1);
    bolt.missile.visible = false;
    bolt.blast = 0;
    bolt.zap = false;
    bolt.burn = 0;
    bolt.homing = 1;
    bolt.force = 1.2;
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
    this.sfx.weapon(this.weaponDef.id);
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
      // Plain bolts home less on harder settings; missiles, rockets and astral darts keep their guidance.
      const guide = bolt.homing >= 2.4 ? 1 : this.profile.settings.difficulty === 'easy' ? 1 : this.profile.settings.difficulty === 'normal' ? 0.5 : 0.15;
      this.steer(bolt, Math.min(1, dt * HOMING_RATE * bolt.homing * guide));
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
      if (crescent) bolt.crescent.scale.setScalar(bolt.scale * (1 + (BOLT_LIFE - bolt.life) * 0.7));


      for (const drone of this.drones) {
        if (drone.state === 'off') continue;
        // Hit areas hug the body (creatures are big but not that wide); crescent waves keep the full width.
        const radius = ENEMIES[drone.kind].radius * (crescent ? 1 : drone.creature ? 0.62 : 0.85) * (drone.size > 1 ? 1.1 : 1) + bolt.radius;
        if (this.segmentHits(bolt.previous, bolt.position, drone.object.position, radius)) {
          if (crescent) this.markHit('slice', drone.object.position, bolt.velocity, bolt.object.up, bolt.force);
          else this.markHit('blast', drone.object.position, bolt.velocity, undefined, bolt.force);
          if (bolt.burn > 0) drone.burn = Math.max(drone.burn, bolt.burn);
          this.v4.copy(drone.object.position);
          // A shot through the head does nearly double.
          const ground = ENEMIES[drone.kind].ground;
          const head = !crescent && ground != null && bolt.position.y > drone.object.position.y + 0.3 * this.chestOf(drone) * drone.size;
          if (head) {
            this.flashes.spawn(bolt.position, GOLD, 0.06, 0.6, 0.15);
            if (this.comicCooldown <= 0) {
              this.comicCooldown = 0.4;
              this.comic.pop('HEADSHOT!', this.v1.copy(bolt.position).setY(bolt.position.y + 0.25), GOLD, 0.4);
            }
          }
          this.damageDrone(drone, bolt.damage * (head ? 1.8 : 1));
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
      if (bolt.active) this.boltProps(bolt);
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
    const species = speciesFor(this.run.stage.world.id, kind);
    const free = (d: Drone) => d.state === 'off' && d.dying < 0 && d.kind === kind;
    // The world's creature if its pool is ready (and has a free body), else the humanoid.
    const drone = this.drones.find((d) => free(d) && d.species === species) ?? this.drones.find((d) => free(d) && d.species === '');
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
      drone.spawn.y = this.chestOf(drone);
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
    if (kind === 'flyer') {
      drone.spawn.y = Math.min(2.4, Math.max(1.3, drone.spawn.y));
      drone.attackTimer = 2 + Math.random() * 2;
      drone.meleeStage = 0;
      drone.fly.set(0, 0, 0);
      drone.stagger = 0;
    }
    drone.creature?.reset();
    drone.elite = false;
    // Tougher as the campaign goes on (see enemyToughness), so the upgrades are needed. Bosses and pods keep their own numbers.
    drone.hp = ENEMIES[kind].hp * (ENEMIES[kind].ground != null || kind === 'flyer' ? this.toughness() : 1);
    drone.maxHp = drone.hp;
    drone.state = 'emerging';
    drone.chirp = Math.random() * 0.5;
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
    if (this.isPassthrough() && this.wallSegs.length > 0) this.cracks.add(drone.spawn, drone.normal, ENEMY_COLOR[kind], kind === 'titan' ? 2.2 : 1.3);
    this.sfxAt(drone.spawn, () => this.sfx.portal());
    return drone;
  }

  // ---------------------------------------------------------------- bosses

  /** The region's lieutenant tears through a giant portal ahead. */
  private spawnBoss(): Drone | null {
    const region = this.run.stage.world.id;
    const boss = this.drones.find((d) => d.kind === 'boss' && d.world === region && d.creature) ?? this.drones.find((d) => d.kind === 'boss' && d.world === region);
    if (boss == null) {
      this.run.kill('boss');
      return null;
    }
    boss.creature?.reset();
    const oblivax = region === 'oblivion';
    // Endless bosses return tougher each time, every fifth wave.
    const round = this.run.stage.endless ? 1 + (bossRound(this.run.wave) - 1) * 0.4 : 1;
    const scale = (oblivax ? (this.script === 'finale' ? 6 : 1.5) : 1 + Math.min(5, REGIONS.indexOf(region)) * 0.2) * (this.script === 'finale' ? 1 : 1.3) * round;
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
    if (this.isPassthrough() && this.wallSegs.length > 0) this.cracks.add(boss.spawn, boss.normal, ENEMY_COLOR.boss, 3.4);
    this.flashes.spawn(boss.spawn, ENEMY_COLOR.boss, 0.5, 3, 0.8);
    this.sfx.thunder();
    this.riftLevel = Math.min(0.6, this.riftLevel + 0.15);
    if (oblivax) this.music.play('oblivion');
    const villain = oblivax ? OBLIVAX.name : chapterForWorld(region)?.villain.name ?? 'BOSS';
    this.comic.pop('BOSS!', this.v2.copy(boss.spawn).setY(boss.spawn.y + 0.9), ENEMY_COLOR.boss, 0.9);
    this.taunt = `${villain} has arrived!`;
    // The entrance: the room shudders, lightning cracks, and he cannot be hurt for a beat.
    this.bossIntro = oblivax ? 3.2 : 2.2;
    this.bossShield = 0;
    this.bossCycle = 0;
    this.lightning = 1;
    this.slowmo = Math.max(this.slowmo, 0.8);
    this.sfx.klaxon();
    this.v1.copy(this.head).addScaledVector(this.forward, 1.6);
    this.comic.pop(villain, this.v1, ENEMY_COLOR.boss, 1.1);
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
    const roar = boss.creature;
    if (roar && !(roar.playing === 'attack' && !roar.finished)) roar.play('walk', 1);
    this.syncBossShield(boss, dt, time);
    if (this.bossIntro > 0) {
      this.bossIntro -= dt;
      if (Math.random() < dt * 10) this.flashes.spawn(this.v2.copy(object.position).add(this.v1.set((Math.random() - 0.5) * 2, Math.random(), (Math.random() - 0.5) * 2)), ENEMY_COLOR.boss, 0.15, 1.4, 0.3);
      return;
    }
    if (this.bossLocked) return;
    const fraction = boss.hp / boss.maxHp;
    const phase = fraction > 0.66 ? 1 : fraction > 0.33 ? 2 : 3;
    if (phase !== boss.bossPhase) {
      boss.bossPhase = phase;
      const taunts = this.story?.taunts ?? [];
      const taunt = taunts[(phase - 1) % Math.max(1, taunts.length)] ?? 'ENOUGH!';
      this.taunt = taunt;
      if (taunts.length > 0) this.speakTaunt((phase - 1) % taunts.length);
      this.comic.pop('RAAAGH!', this.v2.copy(object.position).setY(object.position.y + 0.9), ENEMY_COLOR.boss, 0.8);
      boss.creature?.play('attack', 0.7, true, 0.1);
      this.flashes.spawn(object.position, ENEMY_COLOR.boss, 0.5, 2.5, 0.6);
      const minion = REGIONS.indexOf(boss.world) === 1 ? 'swarmer' : 'drone';
      const adds = phase + 1 + (this.script === 'finale' ? 2 : 0);
      for (let i = 0; i < adds; i += 1) this.spawnDrone(i === 0 && phase === 3 ? 'armored' : minion, 0.9 + phase * 0.2, false);
      // He shields himself until the adds fall.
      this.bossShield = 18;
      this.v1.copy(object.position).setY(object.position.y + 1.2);
      this.comic.pop('SHIELD UP!', this.v1, OBLIVAX_COLOR, 0.7);
      this.sfx.thunder();
    }
    boss.attackTimer -= dt;
    if (boss.attackTimer <= 0) {
      boss.attackTimer = (this.script === 'finale' ? 3.0 : 3.4) - phase * 0.6;
      boss.creature?.play('attack', 1.2, true, 0.1);
      const cycle = this.bossCycle;
      this.bossCycle += 1;
      if (phase >= 2 && cycle % 3 === 1) {
        // Barrage: red circles on the floor around you, then rocks. Step out of them.
        this.comic.pop('BARRAGE!', this.v1.copy(this.head).addScaledVector(this.forward, 1.3), ORANGE, 0.6);
        for (let k = 0; k < phase + 2; k += 1) {
          const a = Math.random() * Math.PI * 2;
          const r = k === 0 ? 0.25 : 0.9 + Math.random() * 1.8;
          this.strikeAt(this.head.x + Math.cos(a) * r, this.head.z + Math.sin(a) * r);
        }
        this.sfx.klaxon();
        return;
      }
      if (phase >= 2 && cycle % 3 === 2 && this.bossShield <= 0) {
        // A fan of orbs that sweeps across the room.
        for (let k = 0; k < 5 + phase; k += 1) {
          this.v1.copy(object.position);
          this.v1.x += (k - 3) * 0.28;
          this.v1.y += Math.sin(k * 1.7) * 0.4;
          this.spawnOrb(this.v1, 1.6 + phase * 0.35);
        }
        this.sfx.blast();
        return;
      }
      for (let i = 0; i < phase + 1; i += 1) {
        this.v1.copy(object.position);
        this.v1.x += (Math.random() - 0.5) * 0.9;
        this.v1.y += (Math.random() - 0.5) * 0.5;
        this.spawnOrb(this.v1, 1.8 + phase * 0.45);
      }
      this.sfx.blast();
    }
  }

  /** Keeps the boss's shield bubble in step: it drops once the adds are gone (or after a while). */
  private syncBossShield(boss: Drone, dt: number, time: number): void {
    let mesh = this.bossShieldMesh;
    if (mesh == null) {
      mesh = new Mesh(
        new IcosahedronGeometry(1, 1),
        new MeshBasicMaterial({ color: '#FFFFFF', wireframe: true, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
      );
      mesh.frustumCulled = false;
      mesh.visible = false;
      this.root.add(mesh);
      this.bossShieldMesh = mesh;
    }
    if (this.bossShield > 0) {
      this.bossShield -= dt;
      let adds = 0;
      for (const d of this.drones) {
        if (d !== boss && d.state !== 'off' && d.state !== 'emerging' && d.kind !== 'pod' && d.kind !== 'orb' && d.kind !== 'boss') adds += 1;
      }
      if (adds === 0 && this.bossShield > 0.5) this.bossShield = 0.5;
      if (this.bossShield <= 0) {
        this.flashes.spawn(boss.object.position, WHITE, 0.6, 2.5, 0.5);
        this.particles.burst(boss.object.position, OBLIVAX_COLOR, 60, 3, 0.6, this.v2);
        this.comic.pop('SHIELD DOWN!', this.v1.copy(boss.object.position).setY(boss.object.position.y + 1.2), GOLD, 0.7);
        this.sfx.explode(true);
      }
    }
    const on = this.bossShield > 0 && boss.state !== 'off';
    mesh.visible = on;
    if (!on) return;
    const radius = (boss.creature?.height ?? 1.6) * 0.75;
    mesh.position.copy(boss.object.position);
    mesh.scale.setScalar(radius * (1 + Math.sin(time * 9) * 0.03));
    mesh.rotation.y += dt * 0.8;
    mesh.rotation.x += dt * 0.5;
    (mesh.material as MeshBasicMaterial).color.copy(ENEMY_COLOR.boss);
    (mesh.material as MeshBasicMaterial).opacity = this.bossShield < 1 ? this.bossShield * 0.5 : 0.5;
  }

  /** The boss's death throes: a string of blasts over the spot, then the finishing flash. */
  private updateBossDeath(dt: number): void {
    if (this.bossDeath <= 0) return;
    this.bossDeath -= dt;
    this.bossDeathTick -= dt;
    if (this.bossDeathTick <= 0) {
      this.bossDeathTick = 0.14;
      this.v1.set((Math.random() - 0.5) * 2.2, Math.random() * 1.8, (Math.random() - 0.5) * 2.2).add(this.bossDeathAt);
      this.flashes.spawn(this.v1, Math.random() < 0.5 ? GOLD : ENEMY_COLOR.boss, 0.3, 2.4, 0.5);
      this.particles.burst(this.v1, Math.random() < 0.5 ? WHITE : ORANGE, 30, 3.5, 0.6, this.v2);
      this.sfx.explode(Math.random() < 0.4);
    }
    if (this.bossDeath <= 0) {
      this.flashes.spawn(this.bossDeathAt, WHITE, 1.2, 4, 1.1);
      this.particles.burst(this.bossDeathAt, GOLD, 200, 9, 1.4, this.v2);
      this.lightning = 1;
      this.sfx.thunder();
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
    // With a scanned room the cages are spread around its walls: walk over to free them.
    const spots = this.isPassthrough() && !this.seatedNow() ? roomSpots(this.wallSegs, count, 0.8, this.head.x, this.head.z, 1.8) : [];
    for (const pod of this.drones) {
      if (placed >= count) break;
      if (pod.kind !== 'pod' || pod.state !== 'off') continue;
      const spot = spots[placed];
      if (spot) {
        pod.counted = false;
        pod.hp = ENEMIES.pod.hp;
        pod.state = 'hold';
        pod.t = Math.random() * 6;
        pod.spawn.set(spot[0], 1.0 + (placed % 2) * 0.25, spot[2]);
        pod.object.position.copy(pod.spawn);
        pod.object.scale.setScalar(1);
        pod.object.visible = true;
        pod.object.lookAt(this.head.x, pod.spawn.y, this.head.z);
        pod.portal.visible = false;
        placed += 1;
        continue;
      }
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
    return (hasUnlock(this.profile, `core-${this.hero}`) ? 1.25 : 1) * (this.buffPower > 0 ? 2 : 1) * (this.tagBuff > 0 ? TAG_DAMAGE : 1);
  }

  private dropPickup(at: Vector3, always = false): void {
    if (!always && Math.random() > 0.22) return;
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
    this.syncBuffLook();
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
      // Flat screen: it is yours once it reaches you.
      if (this.flat && object.position.distanceTo(this.head) < 0.75) {
        this.collect(pickup);
        continue;
      }
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
      this.syncBuffLook();
      this.upgradeBurst('OVERCLOCK!', GOLD);
    } else {
      this.buffPower = BUFF_SECONDS;
      this.syncBuffLook();
      this.upgradeBurst('POWER UP!', MAGENTA);
    }
    this.retirePickup(pickup);
  }

  /** Recolours the weapon and its rings when a power-up starts or ends. */
  private syncBuffLook(): void {
    const key = this.buffRapid > 0 && this.buffPower > 0 ? 'both' : this.buffRapid > 0 ? 'rapid' : this.buffPower > 0 ? 'power' : '';
    if (key === this.buffKey) return;
    this.buffKey = key;
    this.buffTint = key === 'both' ? WHITE : key === 'rapid' ? GOLD : key === 'power' ? MAGENTA : null;
    this.applySkin();
    this.applyWeaponTier();
  }

  /** The weapon upgrades: a ring of energy off the hands, flashes at each palm, the name in comic type. */
  private upgradeBurst(text: string, color: Color): void {
    this.v1.copy(this.head).addScaledVector(this.forward, 0.9);
    this.v1.y -= 0.05;
    this.comic.pop(text, this.v1, color, 0.6);
    for (const hand of this.hands) {
      const at = hand.tracked ? hand.gauntlet.palmPoint : this.v2.copy(this.head).addScaledVector(this.forward, 0.5).setY(this.head.y - 0.4);
      this.flashes.spawn(at, color, 0.1, 0.9, 0.5);
      this.particles.burst(at, color, 50, 2, 0.6, this.v3);
      this.particles.burst(at, WHITE, 16, 3, 0.4, this.v3);
    }
    if (this.shockwave) {
      this.shockwave.position.copy(this.head).setY(this.head.y - 0.5);
      this.shockwave.rotation.set(Math.PI / 2, 0, 0);
      (this.shockwave.material as MeshBasicMaterial).color.copy(color);
      this.shockwave.visible = true;
      this.shockwaveTime = 0;
    }
    this.sfx.swap();
    this.sfx.coin();
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
      const seated = this.seatedNow();
      if (d <= (seated ? 2 : 2.6) || d >= (seated ? 6 : 8)) continue;
      if (seated || !this.profile.settings.allAround) {
        // Front arc only (about +/-100 degrees from where the player faces; +/-70 seated).
        this.v2.subVectors(this.v1, this.head).setY(0).normalize();
        this.v3.set(this.forward.x, 0, this.forward.z).normalize();
        if (this.v2.dot(this.v3) < (seated ? 0.34 : -0.17)) continue;
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
    const seated = this.seatedNow();
    const angle = (Math.random() - 0.5) * (seated ? Math.PI * 0.62 : this.profile.settings.allAround ? Math.PI * 2 : Math.PI * 0.8);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = this.v1.x * cos - this.v1.z * sin;
    const z = this.v1.x * sin + this.v1.z * cos;
    const ringRadius = seated ? 3.2 + Math.random() * 1.2 : 4.5 + Math.random() * 2;
    position.set(this.head.x + x * ringRadius, this.head.y + (Math.random() - 0.35) * 1.0, this.head.z + z * ringRadius);
    normal.set(-x, 0, -z);
  }

  private updateDrones(dtAll: number, time: number): void {
    this.gibs.update(dtAll, (at, velocity, heavy) => this.gore.emit(at, velocity, heavy ? ICHOR_DARK : ICHOR, 0.7, 0.5, 6), this.gibCollide);
    this.gore.update(dtAll);
    this.pools.update(dtAll);
    for (const drone of this.drones) {
      const dt = dtAll;
      if (drone.state === 'off') {
        if (drone.dying >= 0) this.updateDeath(drone, dt);
        continue;
      }
      drone.t += dt;
      drone.creature?.update(dt);
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
      if ((drone.state === 'shot' || drone.state === 'fly') && this.slapped(drone)) continue;
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
        if (drone.creature) this.animateCreature(drone);
        continue;
      }
      if (drone.kind === 'flyer' && drone.state === 'approach') {
        this.updateFlyer(drone, dt, time);
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
        object.scale.setScalar(p * drone.size);
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
    // The attract reel's hero is untouchable.
    if (this.attract) return;
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
    // Something hit us: rumble anything that can (controllers, a phone).
    if (damage > 0) this.haptics.pulse(this.world.renderer.xr.getSession(), Math.min(1, 0.6 + damage * 0.2), 200);
    if (counted) this.run.hit(damage);
    else this.run.damage(damage);
    this.damageMaterial.opacity = this.profile.settings.calm ? 0.07 : 0.3;
    this.damage.visible = true;
    this.sfx.hurt();
    // Low and to one side, so it never hides what hit you.
    this.v1.copy(this.head).addScaledVector(this.forward, 0.9);
    this.v1.y -= 0.28;
    const side = Math.random() < 0.5 ? -1 : 1;
    this.v1.x += side * 0.32 * this.forward.z;
    this.v1.z -= side * 0.32 * this.forward.x;
    this.comic.random('hurt', this.v1, MAGENTA, 0.24);
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

  /**
   * Walkers push each other apart so a crowd spreads into an arc around the
   * player instead of stacking into one blob in the middle of the view.
   */
  private separateWalkers(dt: number): void {
    const drones = this.drones;
    for (let i = 0; i < drones.length; i += 1) {
      const a = drones[i];
      if (a.state === 'off' || a.state === 'emerging' || a.lifted || a.dropY > 0 || ENEMIES[a.kind].ground == null) continue;
      for (let j = i + 1; j < drones.length; j += 1) {
        const b = drones[j];
        if (b.state === 'off' || b.state === 'emerging' || b.lifted || b.dropY > 0 || ENEMIES[b.kind].ground == null) continue;
        const dx = b.object.position.x - a.object.position.x;
        const dz = b.object.position.z - a.object.position.z;
        const reach = (ENEMIES[a.kind].radius * Math.max(0.5, a.size) + ENEMIES[b.kind].radius * Math.max(0.5, b.size)) * 1.25 * ((a.pack + b.pack) / 2);
        const d2 = dx * dx + dz * dz;
        if (d2 >= reach * reach) continue;
        const d = Math.sqrt(d2);
        // Exactly on top of each other: push along an arbitrary axis.
        const nx = d > 1e-3 ? dx / d : 1;
        const nz = d > 1e-3 ? dz / d : 0;
        const push = Math.min((reach - d) * 0.5, 2.2 * dt);
        // Heavier things (giants, bosses' minions) shove lighter ones more than they move.
        const heavy = a.kind === 'titan' ? 0.25 : 0.5;
        const light = 1 - heavy;
        a.object.position.x -= nx * push * heavy * 2 * (b.kind === 'titan' ? 1 : light);
        a.object.position.z -= nz * push * heavy * 2 * (b.kind === 'titan' ? 1 : light);
        b.object.position.x += nx * push * light * 2 * (a.kind === 'titan' ? 0.5 : 1);
        b.object.position.z += nz * push * light * 2 * (a.kind === 'titan' ? 0.5 : 1);
      }
    }
  }

  /** Plays a sound so that it comes from `at` in the room. */
  private sfxAt(at: Vector3, play: () => void): void {
    this.sfx.spatial(at.x, at.y, at.z, play);
  }

  /** The patter of a small creature running at the player, every half metre or so (and capped overall, so a crowd is a patter, not a roar). */
  private critterStep(drone: Drone, step: number, distance: number): void {
    drone.chirp -= step;
    if (drone.chirp > 0 || distance > CRITTER_RANGE) return;
    drone.chirp = 0.45 + Math.random() * 0.45;
    if (this.elapsed - this.critterAt < CRITTER_GAP) return;
    this.critterAt = this.elapsed;
    const near = Math.max(0, 1 - distance / CRITTER_RANGE);
    this.sfxAt(drone.object.position, () => this.sfx.critter(drone.voice, false, near));
  }

  /** The twitter of a small flyer circling in, now and then. */
  private chirpFlyer(drone: Drone, dt: number, distance: number): void {
    drone.chirp -= dt;
    if (drone.chirp > 0 || distance > CRITTER_RANGE + 2) return;
    drone.chirp = 1.1 + Math.random() * 1.4;
    if (this.elapsed - this.critterAt < CRITTER_GAP) return;
    this.critterAt = this.elapsed;
    const near = Math.max(0, 1 - distance / (CRITTER_RANGE + 2));
    this.sfxAt(drone.object.position, () => this.sfx.critter(drone.voice, true, near));
  }

  // ---------------------------------------------------------------- tag team

  /** A squad of three for the mission: the lead, owned heroes, and lent ones for a new player. */
  private buildSquadFor(hero: HeroId, stage: Stage): void {
    this.squad = isSagaStage(stage) || this.attract ? [] : buildSquad(hero, this.profile.heroes);
    this.swapCooldown = 0;
    this.tagBuff = 0;
    this.squadHintUntil = this.elapsed + 16;
    // Hands only: nothing swaps heroes mid-mission by a gesture, so there is nothing to teach.
    if (this.squad.length > 1 && (this.flat || this.pad)) this.teach([...this.tipQueue, this.pad ? SWAP_TIP_PAD : SWAP_TIP_FLAT]);
    this.syncSquadBar();
  }

  private swapHint(): string {
    return this.pad ? 'THUMBSTICK = TAG IN' : 'Q = TAG IN';
  }

  private syncSquadBar(): void {
    if (this.squad.length < 2) {
      this.squadBar.hide();
      return;
    }
    const chips = this.squad.map((id) => ({ id, color: HEROES.find((h) => h.id === id)?.color ?? '#FFFFFF', lent: !this.profile.heroes.includes(id) }));
    this.squadBar.set(chips, this.hero, this.elapsed < this.squadHintUntil ? this.swapHint() : '');
  }

  /** Reads the swap input each frame and runs the cooldown, the damage boost and the strip. */
  private updateSwap(dt: number): void {
    this.swapCooldown = Math.max(0, this.swapCooldown - dt);
    this.tagBuff = Math.max(0, this.tagBuff - dt);
    this.squadBar.update(dt);
    if (this.squad.length < 2) return;
    // Heroes are swapped with a button or the thumbstick, never a gesture, so the strip is for screens and controllers only.
    this.squadBar.mesh.visible = (this.flat || !!this.pad) && this.run.phase !== 'title' && !this.paused && !this.panel.visible && this.script == null;
    if (this.squadHintUntil > 0 && this.elapsed > this.squadHintUntil) {
      this.squadHintUntil = 0;
      this.syncSquadBar();
    }
    const live = this.powersLive && this.run.phase === 'fighting' && this.script == null && !this.attract;
    let target: HeroId | null = null;
    if (this.flat) {
      if (this.screen.takeSwap()) target = nextInSquad(this.squad, this.hero);
    } else if (this.pad) {
      if (this.padInput.swapPressed) target = nextInSquad(this.squad, this.hero);
    }
    if (target != null && live && this.swapCooldown <= 0) this.tagIn(target);
  }

  /** Swaps to the next hero in the squad with a shock ring and a few seconds of extra damage. */
  private tagIn(target?: HeroId): void {
    const next = target ?? nextInSquad(this.squad, this.hero);
    if (next === this.hero) return;
    for (let i = 0; i < 2; i += 1) if (this.hands[i].held) this.releaseHeld(i, false);
    this.swapFx(next);
    this.equipHero(next);
    this.teach(HERO_TIPS[next].slice(0, 1));
    this.swapCooldown = SWAP_COOLDOWN;
    this.tagBuff = TAG_BUFF_SECONDS;
    this.squadHintUntil = 0;
    // The TAG-IN strike: a ring that hits everything around the player.
    this.quake(this.v1.set(this.head.x, 0, this.head.z));
    this.v1.copy(this.head).addScaledVector(this.forward, 1.3);
    this.comic.pop('TAG IN!', this.v1, this.accent, 0.6);
    this.squadBar.pulse();
    this.syncSquadBar();
  }

  /** Seated play: by setting, or (AUTO) when the head sat below 1.3 m at the start of the session. */
  private seatedNow(): boolean {
    if (!this.world.renderer.xr.isPresenting) return false;
    const mode = this.profile.settings.seated;
    return mode === 'on' || (mode === 'auto' && this.autoSeated);
  }

  /** Averages head height for the first moments of a session to guess seated or standing. */
  private sampleSeat(dt: number): void {
    if (this.seatUntil <= 0 || !this.world.renderer.xr.isPresenting || dt <= 0) return;
    this.world.camera.getWorldPosition(this.v4);
    if (this.elapsed < this.seatUntil) {
      if (this.v4.y > 0.4) {
        this.seatSum += this.v4.y;
        this.seatCount += 1;
      }
      return;
    }
    this.seatUntil = 0;
    this.autoSeated = this.seatCount > 10 && this.seatSum / this.seatCount < 1.3;
    if (this.autoSeated && this.profile.settings.seated === 'auto') {
      this.v1.copy(this.v4).addScaledVector(this.forward, 1.2);
      this.comic.pop('SEATED MODE', this.v1, this.accent, 0.5);
    }
  }

  /** Where the player's head was when this enemy began its wind-up. */
  private rememberHead(drone: Drone): void {
    let at = this.windHead.get(drone);
    if (at == null) {
      at = new Float32Array(2);
      this.windHead.set(drone, at);
    }
    at[0] = this.head.x;
    at[1] = this.head.z;
  }

  /** Seated dodge: the head moved 15 cm or more since the wind-up began. */
  private leaned(drone: Drone): boolean {
    const at = this.windHead.get(drone);
    return at != null && Math.hypot(this.head.x - at[0], this.head.z - at[1]) >= 0.15;
  }

  /** Advances the floor light, scorch marks and wall cracks. */
  private updateDecals(dt: number): void {
    this.comic.head.copy(this.head);
    this.floorGlow.update(dt);
    this.scorch.update(dt);
    this.cracks.update(dt);
  }

  /** A burn mark under a blast, if it happened near the floor. */
  private scorchAt(at: Vector3, radius: number): void {
    if (at.y > 2.2) return;
    this.scorch.add(at.x, at.z, 0, radius);
  }

  /**
   * Contact shadows for what the walkers' own blobs do not cover: flyers, the
   * boss, cages and every prop, fading and widening with height.
   */
  private updateShadows(): void {
    const shadows = this.shadows;
    shadows.begin();
    const rings = this.telegraphs;
    rings.begin();
    for (const drone of this.drones) {
      if (drone.blob != null || drone.kind === 'orb') continue;
      if (drone.state === 'off' || drone.state === 'emerging' || drone.state === 'shot') continue;
      const p = drone.object.position;
      const height = Math.max(0, p.y);
      const radius = ENEMIES[drone.kind].radius * (drone.kind === 'boss' ? 1.7 : 1.5) * Math.max(0.5, drone.size) * (1 + height * 0.18);
      shadows.add(p.x, 0, p.z, radius, 0.55 * Math.max(0, 1 - height / 4.5));
    }
    for (const item of this.debris) {
      if (item.state === 'off' || item.state === 'spawn') continue;
      const p = item.object.position;
      const height = Math.max(0, p.y - item.radius);
      shadows.add(p.x, 0, p.z, item.radius * 1.5 * (1 + height * 0.25), 0.5 * Math.max(0, 1 - height / 3.5));
    }
    shadows.end();
    // Red rings under enemies winding up a strike, brightening as the blow nears.
    for (const drone of this.drones) {
      if (drone.state !== 'melee' || drone.meleeStage !== 1) continue;
      const windup = drone.kind === 'blade' ? 0.75 : drone.kind === 'swarmer' ? 0.45 : drone.kind === 'titan' ? 0.9 : 0.65;
      const k = Math.min(1, drone.melee / windup);
      const p = drone.object.position;
      rings.add(p.x, p.z, 0, ENEMIES[drone.kind].radius * Math.max(0.5, drone.size) * (1.5 + 0.9 * k), 0.35 + 0.65 * k);
    }
    rings.end();
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
    const chest = this.chestOf(drone) * drone.size;
    const object = drone.object;
    const rig = drone.rig;
    this.v1.set(this.head.x - object.position.x, 0, this.head.z - object.position.z);
    const distance = this.v1.length();
    this.v1.normalize();
    this.v3.set(-this.v1.z, 0, this.v1.x);
    this.faceHead(object);
    object.rotation.x = 0;
    drone.moving = false;
    if (drone.snare > 0) {
      drone.snare = Math.max(0, drone.snare - dt);
      drone.cocoon.visible = drone.snare > 0;
      drone.cocoon.position.copy(object.position);
      drone.cocoon.scale.setScalar(def.radius * 1.35 * (1 + Math.sin(time * 6) * 0.04));
      drone.cocoon.rotation.y += dt * 0.8;
      object.position.y = chest;
      return;
    }
    if (drone.dropY > 0) {
      // Falling from the ceiling; a heavy landing.
      drone.dropV += 9.8 * this.gravityScale * dt;
      drone.dropY -= drone.dropV * dt;
      object.position.y = Math.max(chest, drone.dropY);
      if (rig) {
        rig.legL.rotation.x = -0.4;
        rig.legR.rotation.x = 0.3;
        rig.armL.rotation.x = rig.armLRest - 1.2;
        rig.armR.rotation.x = rig.armRRest - 1.2;
      }
      if (drone.dropY <= chest) {
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
      const k = drone.stagger / drone.staggerMax;
      drone.stagger -= dt;
      object.position.addScaledVector(drone.knock, dt * 2 * k);
      // Real walls stop them.
      this.room.collide(object.position, def.radius);
      object.position.y = chest;
      if (rig) rig.upper.rotation.x = rig.upperRest - 0.45 * Math.min(1, k * 1.2);
      return;
    }
    if (drone.stun > 0) {
      // Parried: reeling, wide open.
      drone.stun -= dt;
      object.position.y = chest - 0.04;
      object.rotation.z = Math.sin(time * 9) * 0.06;
      if (rig) {
        rig.upper.rotation.x = rig.upperRest - 0.35;
        rig.armR.rotation.x = rig.armRRest + 0.6;
      }
      if (drone.stun <= 0) object.rotation.z = 0;
      return;
    }
    const meleeHero = this.hero === 'ronin' || this.hero === 'talon' || this.hero === 'tempest';
    // Sidestep out of the way of a shot that is about to land (never the giants).
    drone.dodgeCool -= dt;
    if (drone.dodge > 0) {
      drone.dodge -= dt;
      object.position.addScaledVector(drone.dodgeDir, 3.2 * dt);
      this.room.collide(object.position, def.radius);
      object.position.y = chest;
    } else if (drone.dodgeCool <= 0 && drone.kind !== 'titan' && drone.snare <= 0) this.tryDodge(drone, def.radius);
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
        if (drone.voice > 0) this.critterStep(drone, step, distance);
        moving = true;
        drone.moving = true;
        drone.moveSpeed = dt > 0 ? step / dt : 0;
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
    object.position.y = chest;
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
    object.position.y = chest + Math.abs(Math.cos(p)) * (moving ? (this.gravityScale < 1 ? 0.12 : 0.03) : 0.004) - (moving ? 0.015 : 0);
  }

  /**
   * A walker that sees a player bolt closing on it may sidestep: harder
   * settings dodge more, elites most. Not while webbed, and not the giants.
   */
  private tryDodge(drone: Drone, radius: number): void {
    const chance = this.profile.settings.difficulty === 'easy' ? 0 : this.profile.settings.difficulty === 'normal' ? 0.3 : 0.55;
    if (chance === 0) return;
    for (const bolt of this.bolts) {
      if (!bolt.active || bolt.kind === 'crescent') continue;
      this.sa.subVectors(drone.object.position, bolt.position);
      const distance = this.sa.length();
      if (distance > 3.2 || distance < 0.6) continue;
      this.sb.copy(bolt.velocity).normalize();
      if (this.sa.normalize().dot(this.sb) < 0.97) continue;
      drone.dodgeCool = 1.6 + Math.random() * 1.2;
      if (Math.random() > chance * (drone.elite ? 1.5 : 1)) return;
      // Step across the shot's line, whichever way is nearer the open side.
      this.sc.set(-this.sb.z, 0, this.sb.x);
      drone.dodgeDir.copy(this.sc).multiplyScalar(Math.random() < 0.5 ? 1 : -1);
      drone.dodge = 0.28 + radius * 0.2;
      return;
    }
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
        this.rememberHead(drone);
        this.sfxAt(drone.object.position, () => this.sfx.creak());
        this.spiderSense(drone.object.position);
        if (drone.creature) drone.creature.play('attack', drone.creature.duration('attack') / (windup + 0.35), true, 0.1);
      }
    } else if (drone.meleeStage === 1 && drone.melee >= windup) {
      drone.meleeStage = 2;
      drone.melee = 0;
      // The swing lands unless the player stepped out of reach.
      this.sa.set(this.head.x - drone.object.position.x, 0, this.head.z - drone.object.position.z);
      if (this.seatedNow() && this.leaned(drone)) {
        // Seated: leaning out of the way counts as stepping back.
        this.sfx.crescent();
        this.v4.copy(this.head).addScaledVector(this.forward, 0.9);
        this.v4.y -= 0.12;
        this.comic.pop('DODGED!', this.v4, GOLD, 0.34);
      } else if (this.sa.length() <= MELEE_RANGE + 0.45) {
        if (this.shieldBlocks(drone.object.position)) {
          // Blocked: the attacker reels.
          drone.meleeStage = 3;
          drone.stun = 1;
          this.sfx.clang();
          this.blockPoint(this.sc);
          this.shieldRipple(this.sc);
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

  /**
   * The weapon an enemy swings, as a segment (A hand end, B tip). Humanoids
   * with a blade use it; everyone else swings a virtual arm: raised through
   * the wind-up, then cutting toward the player. False when it is not swinging.
   */
  private enemyWeapon(drone: Drone, a: Vector3, b: Vector3): boolean {
    if (drone.state !== 'melee') return false;
    const rig = drone.rig;
    if (rig?.bladeBase && rig.bladeTip) {
      rig.bladeBase.getWorldPosition(a);
      rig.bladeTip.getWorldPosition(b);
      return true;
    }
    const windup = drone.kind === 'blade' ? 0.75 : drone.kind === 'swarmer' ? 0.45 : drone.kind === 'titan' ? 0.9 : 0.65;
    const raise = drone.meleeStage === 1 ? Math.min(1, drone.melee / windup) : drone.meleeStage === 2 ? 1 - Math.min(1, drone.melee / 0.16) : 0;
    const strike = drone.meleeStage === 2 ? Math.min(1, drone.melee / 0.16) : 0;
    if (raise <= 0 && strike <= 0) return false;
    const at = drone.object.position;
    const size = drone.size;
    this.sa.set(this.head.x - at.x, 0, this.head.z - at.z).normalize();
    // Right-hand side of the enemy, as the player sees it.
    this.sb.set(this.sa.z, 0, -this.sa.x);
    a.copy(at).addScaledVector(this.sb, 0.3 * size).addScaledVector(this.sa, 0.2 * size);
    a.y += 0.15 * size;
    b.copy(a).addScaledVector(this.sa, (0.2 + 0.9 * strike) * size);
    b.y += 0.9 * raise * size;
    return true;
  }

  /** A player blade (base..tip) meeting an enemy weapon mid-swing parries it. */
  private checkParry(base: Vector3, tip: Vector3): void {
    for (const drone of this.drones) {
      if (drone.state !== 'melee') continue;
      const windup = drone.kind === 'blade' ? 0.75 : drone.kind === 'swarmer' ? 0.45 : drone.kind === 'titan' ? 0.9 : 0.65;
      const open = (drone.meleeStage === 1 && drone.melee > windup * 0.4) || drone.meleeStage === 2;
      if (!open || !this.enemyWeapon(drone, this.bladeA, this.bladeB)) continue;
      if (segmentDistance(base, tip, this.bladeA, this.bladeB, this.sc, this.sa, this.sb, this.v4) > (drone.rig?.bladeBase ? 0.12 : 0.18)) continue;
      drone.meleeStage = 3;
      drone.melee = 0;
      drone.stun = drone.kind === 'titan' ? 0.8 : 1.3;
      this.sfx.clang();
      this.clash(this.sc, base, tip, this.bladeA, this.bladeB);
      this.v1.copy(this.sc).setY(this.sc.y + 0.25);
      this.comic.pop('PARRY!', this.v1, GOLD, 0.45);
      this.slowmo = Math.max(this.slowmo, 0.25);
      this.hitStop = Math.max(this.hitStop, 0.06);
      this.haptics.pulse(this.world.renderer.xr.getSession(), 0.5, 80);
    }
  }

  /** Two blades meeting: a flash, crossed streaks along both edges and a spray of sparks. */
  private clash(at: Vector3, baseA: Vector3, tipA: Vector3, baseB: Vector3, tipB: Vector3): void {
    this.flashes.spawn(at, WHITE, 0.1, 0.9, 0.2);
    this.particles.burst(at, GOLD, 50, 3.5, 0.35, this.v2);
    this.particles.burst(at, WHITE, 20, 5, 0.25, this.v2);
    this.lightningFx.streak(this.v3.copy(at).addScaledVector(this.v2.subVectors(tipA, baseA).normalize(), -0.4), this.v4.copy(at).addScaledVector(this.v2, 0.4), WHITE, 0.16, 0.025);
    this.lightningFx.streak(this.v3.copy(at).addScaledVector(this.v2.subVectors(tipB, baseB).normalize(), -0.4), this.v4.copy(at).addScaledVector(this.v2, 0.4), GOLD, 0.16, 0.025);
  }

  /** A blade that crosses an enemy plasma shot sends it back at the aliens. */
  private deflectShots(base: Vector3, tip: Vector3): void {
    for (const shot of this.drones) {
      if (shot.state !== 'shot' && shot.state !== 'fly') continue;
      this.ra.copy(shot.object.position);
      if (!this.segmentHits(base, tip, this.ra, 0.2)) continue;
      this.retireDrone(shot);
      this.deflect(this.ra);
      this.flashes.spawn(this.ra, WHITE, 0.06, 0.6, 0.15);
      this.hitStop = Math.max(this.hitStop, 0.03);
      if (this.comicCooldown <= 0) {
        this.comicCooldown = 0.4;
        this.comic.pop('DEFLECT!', this.v1.copy(this.ra).setY(this.ra.y + 0.2), GOLD, 0.35);
      }
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
    const scale = this.chestOf(drone) / 1.15;
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
  private bleed(at: Vector3, direction: Vector3, count: number, tint?: Color): void {
    for (let i = 0; i < count; i += 1) {
      this.v2.set(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).multiplyScalar(1.6).addScaledVector(direction, 1.8 + Math.random() * 1.5);
      this.gore.emit(at, this.v2, tint ?? (Math.random() < 0.35 ? ICHOR_DARK : ICHOR), 0.6 + Math.random() * 0.5, 0.6, 8);
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
    const chest = this.chestOf(drone);
    const scale = chest / 1.15;
    // A ragdoll (before any part is cut away); skewered bodies start one when flung off.
    const ragdoll = this.hitStyle !== 'impale' && this.startRagdoll(drone, null);
    if (!ragdoll) this.pools.spill(drone.feet.x + drone.knock.x * 0.6, drone.feet.z + drone.knock.z * 0.6, big ? 1.5 : 0.9 * scale);
    // The weapon clatters to the floor.
    const weapon = drone.parts.Weapon;
    if (weapon && weapon.object.parent === weapon.parent) {
      this.sc.copy(this.hitDir).multiplyScalar(1.2);
      this.sc.x += (Math.random() - 0.5) * 1.2;
      this.sc.y += 1.6;
      this.sc.z += (Math.random() - 0.5) * 1.2;
      this.gibs.throw(weapon, this.sc, 9);
    }
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
      this.sfxAt(object.position, () => this.sfx.explode(big));
    }
  }

  /**
   * A thrust that drives the blade tip into a walker's body impales it: a
   * killing blow leaves the body skewered on the blade (bleeding) until the
   * hand flings it off, opens, or it slides off.
   */
  private tryImpale(index: number, base: Vector3, tip: Vector3, direction: Vector3): void {
    const hand = this.hands[index];
    if (hand.tipVel.dot(direction) < 0.9 * tuning.swing) return;
    for (const drone of this.drones) {
      const def = ENEMIES[drone.kind];
      if (def.ground == null || drone.state === 'off' || drone.state === 'emerging' || drone.lifted || drone.creature) continue;
      if (this.elapsed - drone.bladeHitAt < 0.3) continue;
      const scale = this.chestOf(drone) / 1.15;
      const at = drone.object.position;
      this.sa.set(at.x, at.y - 0.6 * scale, at.z);
      this.sb.set(at.x, at.y + 0.45 * scale, at.z);
      if (segmentDistance(tip, tip, this.sa, this.sb, this.sc, this.bladeA, this.bladeB, this.v4) > def.radius * 0.8) continue;
      drone.bladeHitAt = this.elapsed;
      this.markHit('impale', tip, direction);
      this.damageDrone(drone, 4);
      this.hitStop = Math.max(this.hitStop, 0.08);
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
    if (this.startRagdoll(drone, velocity)) return;
    drone.flying = true;
    drone.fly.copy(velocity);
  }

  /** A thrown body tumbles, knocks over the living, and lands lying down. */
  private updateAirborne(drone: Drone, dt: number): void {
    const object = drone.object;
    const chest = this.chestOf(drone);
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
        this.markHit('blast', other.object.position, drone.fly, undefined, 2);
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
    if (drone.creature) {
      this.updateCreatureDeath(drone, dt);
      return;
    }
    if (drone.heldBy >= 0) {
      this.updateSkewered(drone, dt);
      return;
    }
    if (drone.ragdoll >= 0) {
      this.updateRagdoll(drone, dt);
      return;
    }
    if (drone.posed) {
      // A ragdoll at rest: lie still, then sink away.
      drone.dying += dt;
      if (drone.dying > DEATH_LIE) {
        drone.object.position.y -= dt * 0.35;
        this.gibs.sink(drone.parts, dt * 0.35);
      }
      if (drone.dying > DEATH_LIE + DEATH_SINK) this.endDeath(drone);
      return;
    }
    if (drone.flying) {
      this.updateAirborne(drone, dt);
      return;
    }
    const def = ENEMIES[drone.kind];
    const object = drone.object;
    const rig = drone.rig;
    const chest = this.chestOf(drone) * drone.size;
    const fall = drone.kind === 'titan' || drone.size > 1 ? DEATH_FALL * 1.5 : DEATH_FALL;
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
    if (drone.ragdoll >= 0) this.ragdolls[drone.ragdoll].drone = null;
    drone.ragdoll = -1;
    drone.posed = false;
    drone.landed = false;
    drone.object.quaternion.identity();
    drone.size = 1;
    drone.champion = '';
    drone.object.scale.setScalar(1);
    drone.heldBy = -1;
    drone.flying = false;
    drone.dying = -1;
    drone.object.visible = false;
    drone.object.rotation.x = 0;
    drone.object.rotation.z = 0;
    drone.creature?.reset();
    this.gibs.recall(drone.parts);
    for (const part of Object.values(drone.parts)) if (part) restorePart(part);
    const rig = drone.rig;
    if (rig) {
      // Back to the rest pose (ragdolls twist bones in every axis).
      rig.bones.forEach((bone, i) => bone.quaternion.copy(rig.rest[i]));
      if (rig.head && rig.headRest) rig.head.quaternion.copy(rig.headRest);
    }
  }

  /** Fires `shots` plasma bolts from a walker's muzzle at the player's head. */
  private enemyFire(drone: Drone, shots: number, speed: number): void {
    if (drone.rig?.muzzle) drone.rig.muzzle.getWorldPosition(this.v4);
    else {
      // Creatures spit from the mouth: a little above the centre, toward the target.
      this.v4.copy(drone.object.position);
      if (drone.creature) {
        this.v4.y += 0.2 * drone.size;
        this.v3.subVectors(this.head, this.v4).setY(0).normalize();
        this.v4.addScaledVector(this.v3, 0.3 * drone.size);
      }
    }
    this.flashes.spawn(this.v4, ENEMY_COLOR[drone.kind], 0.05, 0.3, 0.15);
    this.sfxAt(this.v4, () => this.sfx.enemyShot());
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
  private markHit(style: 'blast' | 'slice' | 'impale' | 'dot', point: Vector3, direction: Vector3, cutNormal?: Vector3, force = 1): void {
    this.hitStyle = style;
    this.hitForce = force;
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
      this.hitForce = 1;
    }
    this.hitSet = false;
    if (drone.stun > 0) amount *= 2;
    if (drone.kind === 'boss' && (this.bossLocked || this.bossShield > 0 || this.bossIntro > 0)) {
      this.flashes.spawn(drone.object.position, OBLIVAX_COLOR, 0.2, 0.9, 0.2);
      if (this.bossShield > 0 && this.comicCooldown <= 0) {
        this.comicCooldown = 0.6;
        this.comic.pop('SHIELDED!', this.v1.copy(this.hitPoint).setY(this.hitPoint.y + 0.3), OBLIVAX_COLOR, 0.4);
      }
      return;
    }
    drone.hp -= raw ? amount : amount * this.damageScale();
    if (drone.kind === 'boss') this.chargeOverdrive(0.02);
    if (drone.hp > 0) {
      this.flashes.spawn(drone.object.position, WHITE, 0.1, drone.kind === 'boss' ? 0.8 : 0.4, 0.12);
      if ((ENEMIES[drone.kind].ground || drone.kind === 'flyer') && this.hitStyle !== 'dot') {
        this.bleed(this.hitPoint, this.hitDir, 14, this.bloodOf(drone));
        // Flinch: knocked back (heavy blows send them metres), a hit interrupts a wind-up.
        const force = this.hitForce * (drone.kind === 'titan' || drone.champion !== '' ? 0.4 : 1);
        drone.staggerMax = force > 2.5 ? 0.55 : drone.kind === 'titan' ? 0.15 : 0.35;
        drone.stagger = drone.staggerMax;
        drone.knock.copy(this.hitDir).setY(0).normalize().multiplyScalar(0.7 * Math.max(1, force));
        if (drone.meleeStage === 1) drone.meleeStage = 3;
        drone.melee = 0;
        drone.creature?.play('hit', 1.3, true, 0.05);
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
    this.chargeOverdrive(drone.champion ? 0.5 : 0.1);
    this.dropPickup(drone.object.position, drone.elite);
    const last = this.run.kill(drone.kind);
    const big = last || drone.kind === 'titan' || drone.champion !== '';
    if (drone.champion) {
      this.comic.pop('CHAMPION DOWN!', this.v1.copy(drone.object.position).setY(drone.object.position.y + 1), GOLD, 0.9);
      this.flashes.spawn(drone.object.position, GOLD, 0.3, 3, 0.8);
      this.run.coins += 60;
      this.slowmo = 1.2;
    }
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
    this.slowmo = 2.4;
    this.bossDeath = 1.9;
    this.bossDeathTick = 0;
    this.bossDeathAt.copy(at);
    this.bossShield = 0;
    this.sfx.explode(true);
    this.sfx.thunder();
    this.explodeDrone(boss, true);
    this.run.kill('boss');
  }

  private explodeDrone(drone: Drone, big: boolean): void {
    if (big) this.scorchAt(drone.object.position, ENEMIES[drone.kind].radius * 2.4);
    if (drone.creature && drone.object.visible) {
      this.killCreature(drone, big);
      return;
    }
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
    drone.creature?.reset();
    drone.size = 1;
    drone.champion = '';
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
    if (phase === 'cleared' && this.run.stage.endless) {
      // Endless has no checkpoints: a cleared wave patches you up, a boss wave more so.
      const gain = this.run.waveDef.boss ? 2 : 1;
      if (this.run.health < this.run.maxHealth) {
        this.run.heal(gain);
        this.v1.copy(this.head).addScaledVector(this.forward, 1.3);
        this.v1.y -= 0.15;
        this.comic.pop('PATCHED UP!', this.v1, new Color('#39FF88'), 0.45);
      }
    }
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
          message = this.story ? this.story.location : run.stage.endless ? run.stage.world.name : `${run.stage.world.name} ${run.stage.number}`;
          hint = TWIST_INFO[this.twist].name ? `TWIST: ${TWIST_INFO[this.twist].name}  |  ${TWIST_INFO[this.twist].hint}` : `${run.stage.name}  |  ${run.stage.objective}`;
        } else if (run.wave === 0) {
          message = String(Math.max(1, 3 - Math.floor(run.elapsedInPhase - 1)));
          hint = this.flat ? 'Get ready' : 'Get ready  |  left wrist = pause';
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
    if (this.pending) {
      message = '!! WARNING !!';
      hint = this.pending.champion ? `CHAMPION INCOMING: ${run.stage.endless ? championName(run.stage.world.id, run.wave) : (CHAMPIONS[run.stage.id] ?? 'ELITE')}` : 'BOSS INCOMING';
    }
    if (this.paused) message = 'PAUSED';
    this.hud.mesh.visible = !this.attract && run.phase !== 'title' && !(this.panel.visible && !this.paused);
    const boss = this.drones.find((d) => (d.kind === 'boss' || d.champion !== '') && d.state !== 'off' && d.state !== 'hold');
    this.hud.extras.boss = boss
      ? { name: boss.champion || (boss.world === 'oblivion' ? OBLIVAX.name : chapterForWorld(boss.world)?.villain.name ?? 'BOSS'), fraction: Math.max(0, boss.hp / boss.maxHp) }
      : null;
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
    // Lower on a flat screen, so the whole board stays in view.
    this.v2.y = this.head.y + (this.flat ? 0.3 : 0.42);
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
