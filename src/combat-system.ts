import {
  AdditiveBlending,
  Color,
  createSystem,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  PlaneGeometry,
  Quaternion,
  RingGeometry,
  type Sprite,
  Vector3,
  VisibilityState,
  XRPlane,
} from '@iwsdk/core';
import { Gauntlet, HAND_JOINTS, HandPose, J } from './combat/gauntlet.js';
import { type HandJoints, isBlastPose } from './combat/gestures.js';
import { Hud } from './combat/hud.js';
import { type Phase, Run } from './combat/run.js';
import { Sfx } from './combat/sfx.js';
import { createGlowSprite, Flashes, Particles } from './combat/vfx.js';
import { DRONE_RADIUS } from './scene-assets/combat.scene-asset.js';

type Handedness = 'left' | 'right';
type Triple = [number, number, number];

const FIRE_COOLDOWN = 0.26;
const ARM_TIME = 0.08;
const BOLT_SPEED = 14;
const BOLT_LIFE = 1.6;
const AIM_ASSIST_COS = 0.985;
const HOMING_RATE = 3;
const AIM_SMOOTHING = 0.45;
const CHARGE_DISTANCE = 0.75;
const CHARGE_TIME = 0.9;
const EMERGE_TIME = 0.9;
const SLOWMO_SECONDS = 0.8;
const SLOWMO_SCALE = 0.25;

const CYAN = new Color('#3DF5FF');
const WHITE = new Color('#FFFFFF');
const ORANGE = new Color('#FF8A1F');
const MAGENTA = new Color('#FF2D6F');
const GOLD = new Color('#FFD23F');

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
}

type DroneState = 'off' | 'emerging' | 'approach' | 'charge';

interface Drone {
  object: Object3D;
  ring: Object3D;
  eye: Object3D;
  armored: boolean;
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
}

interface Bolt {
  object: Group;
  active: boolean;
  life: number;
  position: Vector3;
  previous: Vector3;
  velocity: Vector3;
  target: Drone | 'core' | null;
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
  private sfx = new Sfx();
  private hands: HandState[] = [];
  private handSlots: Array<Array<[Triple, number]>> = [];
  private playerQuat = new Quaternion();
  private jointQuat = new Quaternion();
  private drones: Drone[] = [];
  private bolts: Bolt[] = [];
  private core: Object3D | null = null;
  private arena: Object3D | null = null;
  private coreVisible = false;
  private damage!: Mesh;
  private damageMaterial!: MeshBasicMaterial;
  private lastPhase: Phase = 'title';
  private slowmo = 0;
  private hudPlaced = false;
  private ready = false;

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
      });
      this.handSlots.push(jointSlots(joints));
    }

    const boltCore = new CylinderGeometry(0.011, 0.011, 0.24, 6);
    boltCore.rotateX(Math.PI / 2);
    const boltMaterial = new MeshBasicMaterial({ color: '#E8FFFF' });
    for (let i = 0; i < 28; i += 1) {
      const object = new Group();
      object.name = `Bolt-${i}`;
      const glow = createGlowSprite(CYAN, 0.9);
      glow.scale.setScalar(0.2);
      object.add(new Mesh(boltCore, boltMaterial), glow);
      object.visible = false;
      this.root.add(object);
      this.bolts.push({
        object,
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
      this.placeCore();
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
    const portalGeometry = new RingGeometry(0.17, 0.26, 48);
    for (let i = 0; i < 22; i += 1) {
      const armored = i >= 14;
      const object = await this.world.assets.instantiate(armored ? 'drone-armored' : 'drone');
      object.name = `${armored ? 'DroneArmored' : 'Drone'}-${i}`;
      object.visible = false;
      this.root.add(object);
      const portalMaterial = new MeshBasicMaterial({
        color: armored ? ORANGE : MAGENTA,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        side: DoubleSide,
        depthWrite: false,
      });
      const portal = new Mesh(portalGeometry, portalMaterial);
      portal.name = `Portal-${i}`;
      portal.visible = false;
      this.root.add(portal);
      this.drones.push({
        object,
        ring: object.getObjectByName('Ring')!,
        eye: object.getObjectByName('Eye')!,
        armored,
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
      });
    }
    this.core = await this.world.assets.instantiate('core');
    this.core.name = 'StartCore';
    this.root.add(this.core);
    this.placeCore();
    this.ready = true;
  }

  update(delta: number, time: number): void {
    if (!this.ready) return;
    if (this.arena) this.arena.visible = !this.isPassthrough();
    if (this.world.visibilityState.peek() === VisibilityState.VisibleBlurred) return;
    const realDt = Math.min(delta, 0.05);
    if (this.slowmo > 0) this.slowmo -= realDt;
    const dt = this.slowmo > 0 ? realDt * SLOWMO_SCALE : realDt;

    this.world.camera.getWorldPosition(this.head);
    this.headTriple[0] = this.head.x;
    this.headTriple[1] = this.head.y;
    this.headTriple[2] = this.head.z;
    this.world.camera.getWorldDirection(this.forward);

    this.readHands();
    for (const hand of this.hands) hand.gauntlet.update(hand.pose, Math.min(1, hand.armTime / ARM_TIME), time);
    this.updateHands(realDt);

    const order = this.run.update(dt);
    if (order) this.spawnDrone(order.armored, order.speed);
    this.updateDrones(dt, time);
    this.updateBolts(dt);
    this.updateCore(time);
    this.onPhaseChange();

    this.particles.update(dt);
    this.flashes.update(dt);
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
      const posed = hand.tracked && isBlastPose(hand.joints, hand.handedness, this.headTriple);
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
        hand.cooldown = FIRE_COOLDOWN;
        this.fire(hand.palm, hand.normal);
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
    this.v4.addScaledVector(this.v3, 0.3);
    this.fire(this.v4, this.v3);
  }


  // ---------------------------------------------------------------- bolts

  private fire(origin: Vector3, direction: Vector3): void {
    const bolt = this.bolts.find((b) => !b.active);
    if (bolt == null) return;
    bolt.target = null;
    let best = AIM_ASSIST_COS;
    for (const drone of this.drones) {
      if (drone.state === 'off') continue;
      const cos = this.v2.subVectors(drone.object.position, origin).normalize().dot(direction);
      if (cos > best) {
        best = cos;
        bolt.target = drone;
      }
    }
    if (this.coreVisible && this.core) {
      const cos = this.v2.subVectors(this.core.position, origin).normalize().dot(direction);
      if (cos > best) bolt.target = 'core';
    }
    bolt.active = true;
    bolt.life = BOLT_LIFE;
    bolt.position.copy(origin);
    bolt.previous.copy(origin);
    bolt.velocity.copy(direction).multiplyScalar(BOLT_SPEED);
    bolt.object.visible = true;
    bolt.object.position.copy(origin);
    this.flashes.spawn(origin, CYAN, 0.05, 0.25, 0.15);
    this.sfx.blast();
  }

  /** Turns a bolt toward its target by `amount` (1 = straight at it). */
  private steer(bolt: Bolt, amount: number): void {
    const target = bolt.target;
    if (target == null) return;
    const point = target === 'core' ? this.core?.position : target.state === 'off' ? null : target.object.position;
    if (point == null) {
      bolt.target = null;
      return;
    }
    this.v2.subVectors(point, bolt.position).normalize().multiplyScalar(BOLT_SPEED);
    bolt.velocity.lerp(this.v2, amount).setLength(BOLT_SPEED);
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
      bolt.previous.copy(bolt.position);
      bolt.position.addScaledVector(bolt.velocity, dt);
      bolt.object.position.copy(bolt.position);
      this.v1.copy(bolt.position).add(bolt.velocity);
      bolt.object.lookAt(this.v1);
      this.v2.set(0, 0, 0);
      this.particles.emit(bolt.previous, this.v2, CYAN, 0.18, 0);

      if (this.coreVisible && this.core && this.segmentHits(bolt.previous, bolt.position, this.core.position, 0.22)) {
        this.retireBolt(bolt);
        this.hitCore();
        continue;
      }
      for (const drone of this.drones) {
        if (drone.state === 'off') continue;
        const radius = DRONE_RADIUS * (drone.armored ? 1.3 : 1) + 0.06;
        if (this.segmentHits(bolt.previous, bolt.position, drone.object.position, radius)) {
          this.retireBolt(bolt);
          this.damageDrone(drone);
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

  private spawnDrone(armored: boolean, speed: number): void {
    const drone = this.drones.find((d) => d.state === 'off' && d.armored === armored) ?? this.drones.find((d) => d.state === 'off');
    if (drone == null) {
      // Pool exhausted: count it as killed so the wave can still finish.
      this.run.kill();
      return;
    }
    this.pickSpawn(drone.spawn, drone.normal);
    drone.hp = drone.armored ? 2 : 1;
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
    this.particles.burst(drone.spawn, drone.armored ? ORANGE : MAGENTA, 24, 1.2, 0.5, this.v2);
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
        drone.portal.scale.setScalar(0.2 + p * (drone.armored ? 1.4 : 1.1));
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

      if (drone.state === 'approach') {
        // Hover point: in front of the face, offset so drones fan out.
        this.v1.copy(this.head).addScaledVector(this.forward, 0.3);
        this.v1.x += drone.offset.x;
        this.v1.y += drone.offset.y;
        this.v2.subVectors(this.v1, object.position);
        const step = drone.speed * dt;
        if (this.v2.length() > step) this.v2.setLength(step);
        object.position.add(this.v2);
        object.position.y += Math.sin(time * 3 + drone.phase) * 0.25 * dt;
        object.position.x += Math.cos(time * 2.2 + drone.phase) * 0.25 * dt;
        object.lookAt(this.head);
        if (object.position.distanceTo(this.head) < CHARGE_DISTANCE) {
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
      if (drone.t >= CHARGE_TIME) {
        this.explodeDrone(drone, false);
        this.run.hit();
        this.damageMaterial.opacity = 0.55;
        this.damage.visible = true;
        this.sfx.hurt();
      }
    }
  }

  private damageDrone(drone: Drone): void {
    drone.hp -= 1;
    if (drone.hp > 0) {
      this.flashes.spawn(drone.object.position, WHITE, 0.1, 0.4, 0.12);
      this.particles.burst(drone.object.position, GOLD, 14, 2, 0.3, this.v2);
      this.sfx.ping();
      return;
    }
    const last = this.run.kill();
    this.explodeDrone(drone, last);
    if (last) this.slowmo = SLOWMO_SECONDS;
  }

  private explodeDrone(drone: Drone, big: boolean): void {
    const at = drone.object.position;
    const color = drone.armored ? ORANGE : MAGENTA;
    this.flashes.spawn(at, color, 0.1, big ? 1.6 : 0.9, big ? 0.6 : 0.35);
    this.flashes.spawn(at, WHITE, 0.05, big ? 0.6 : 0.35, 0.15);
    this.particles.burst(at, color, big ? 90 : 45, big ? 3.5 : 2.5, 0.7, this.v2);
    this.particles.burst(at, GOLD, big ? 40 : 18, big ? 5 : 3.5, 0.4, this.v2);
    this.sfx.explode(big);
    drone.state = 'off';
    drone.object.visible = false;
    drone.eye.scale.setScalar(1);
  }

  // ---------------------------------------------------------------- core & phases

  private placeCore(): void {
    if (this.core == null) return;
    this.world.camera.getWorldPosition(this.head);
    this.world.camera.getWorldDirection(this.forward);
    this.v1.set(this.forward.x, 0, this.forward.z);
    if (this.v1.lengthSq() < 1e-4) this.v1.set(0, 0, -1);
    this.v1.normalize();
    this.core.position.copy(this.head).addScaledVector(this.v1, 1.3);
    this.core.position.y = this.head.y - 0.15;
    this.setCoreVisible(this.run.phase === 'title' || this.run.phase === 'victory' || this.run.phase === 'defeat');
  }

  private setCoreVisible(visible: boolean): void {
    this.coreVisible = visible;
    if (this.core) this.core.visible = visible;
  }

  private hitCore(): void {
    if (this.core == null) return;
    const at = this.core.position;
    this.particles.clear();
    this.flashes.spawn(at, CYAN, 0.2, 1.8, 0.6);
    this.particles.burst(at, CYAN, 120, 4, 0.8, this.v2);
    this.particles.burst(at, WHITE, 40, 6, 0.4, this.v2);
    this.sfx.explode(true);
    this.setCoreVisible(false);
    this.run.start();
  }

  private updateCore(time: number): void {
    if (!this.coreVisible || this.core == null) return;
    this.core.rotation.y = time * 0.8;
    this.core.rotation.x = time * 0.5;
    this.core.scale.setScalar(1 + Math.sin(time * 4) * 0.06);
  }

  private onPhaseChange(): void {
    const phase = this.run.phase;
    if (phase === this.lastPhase) return;
    this.lastPhase = phase;
    if (phase === 'intro') this.sfx.wave();
    if (phase === 'victory' || phase === 'defeat') {
      for (const drone of this.drones) {
        if (drone.state !== 'off') this.explodeDrone(drone, false);
      }
      if (phase === 'victory') {
        this.sfx.victory();
        this.slowmo = SLOWMO_SECONDS;
      } else {
        this.sfx.defeat();
      }
      this.placeCore();
    }
  }

  // ---------------------------------------------------------------- HUD

  private updateHud(dt: number): void {
    const run = this.run;
    let message = '';
    let hint = '';
    switch (run.phase) {
      case 'title':
        message = 'HANDFORGE';
        hint = 'Open your palm at the core to begin';
        break;
      case 'intro':
        message = `WAVE ${run.wave + 1}`;
        hint = run.wave === 0 ? 'Palm out to blast  -  stop the drones' : '';
        break;
      case 'cleared':
        message = 'CLEARED';
        break;
      case 'victory':
        message = 'VICTORY';
        hint = `Score ${run.score}  -  blast the core to replay`;
        break;
      case 'defeat':
        message = 'BREACHED';
        hint = `Score ${run.score}  -  blast the core to retry`;
        break;
    }
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
