import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
} from '@iwsdk/core';

/**
 * Armory display models for heroes whose power is worn rather than held:
 * centred on their own middle and about 0.3-0.5 m across, for the garage
 * hologram. (The hammer and pistol reuse their combat models.)
 */

const metal = () => new MeshStandardMaterial({ color: '#3A3F52', roughness: 0.3, metalness: 0.9 });
const glow = (color: string) => new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.5 });

/** ARC: armoured gauntlet with a palm emitter. */
export function createGauntletDisplay(): Group {
  const root = new Group();
  root.name = 'Weapon-arc';
  const m = metal();
  const cuff = new Mesh(new CylinderGeometry(0.055, 0.05, 0.16, 16), m);
  cuff.rotation.x = Math.PI / 2;
  cuff.position.z = -0.1;
  const hand = new Mesh(new BoxGeometry(0.09, 0.04, 0.1), m);
  hand.position.z = 0.03;
  const emitter = new Mesh(new TorusGeometry(0.025, 0.006, 8, 24), glow('#3DF5FF'));
  emitter.position.set(0, -0.022, 0.03);
  emitter.rotation.x = Math.PI / 2;
  const core = new Mesh(new SphereGeometry(0.014, 12, 8), glow('#FFFFFF'));
  core.position.set(0, -0.022, 0.03);
  root.add(cuff, hand, emitter, core);
  for (let f = 0; f < 4; f += 1) {
    const finger = new Mesh(new BoxGeometry(0.017, 0.022, 0.07), m);
    finger.position.set(-0.033 + f * 0.022, 0, 0.11);
    root.add(finger);
  }
  for (const z of [-0.16, -0.04]) {
    const ring = new Mesh(new TorusGeometry(0.057, 0.004, 6, 32), glow('#3DF5FF'));
    ring.position.z = z;
    root.add(ring);
  }
  return root;
}

/** TALON: knuckle plate with three energy blades. */
export function createClawDisplay(): Group {
  const root = new Group();
  root.name = 'Weapon-talon';
  const m = metal();
  const plate = new Mesh(new BoxGeometry(0.1, 0.03, 0.08), m);
  const strap = new Mesh(new TorusGeometry(0.045, 0.008, 6, 24), m);
  strap.position.z = -0.06;
  root.add(plate, strap);
  for (let i = -1; i <= 1; i += 1) {
    const blade = new Mesh(new ConeGeometry(0.008, 0.32, 4), glow('#FF2D9A'));
    blade.rotation.x = Math.PI / 2;
    blade.scale.x = 0.4;
    blade.position.set(i * 0.03, 0.01, 0.2);
    root.add(blade);
  }
  return root;
}

/** ORION: recurve light bow, riser at the centre. */
export function createBowDisplay(): Group {
  const root = new Group();
  root.name = 'Weapon-orion';
  const half = 0.75;
  const radius = 0.38 / Math.sin(half);
  const limb = new Mesh(new TorusGeometry(radius, 0.009, 6, 40, half * 2), metal());
  limb.geometry.rotateZ(-half);
  limb.geometry.translate(-radius, 0, 0);
  const edge = new Mesh(new TorusGeometry(radius + 0.008, 0.004, 4, 40, half * 2), glow('#5DFFB0'));
  edge.geometry.rotateZ(-half);
  edge.geometry.translate(-radius - 0.008, 0, 0);
  const grip = new Mesh(new CylinderGeometry(0.018, 0.018, 0.12, 10), metal());
  const tipX = -radius * (1 - Math.cos(half));
  const string = new Mesh(new CylinderGeometry(0.002, 0.002, 0.76, 4), glow('#5DFFB0'));
  string.position.x = tipX;
  root.add(limb, edge, grip, string);
  root.rotation.y = Math.PI / 2;
  return root;
}

/** WEAVER: wrist web-shooter with a coiled cartridge. */
export function createWebShooterDisplay(): Group {
  const root = new Group();
  root.name = 'Weapon-weaver';
  const m = metal();
  const band = new Mesh(new CylinderGeometry(0.05, 0.05, 0.08, 20, 1, true), m);
  band.rotation.x = Math.PI / 2;
  const nozzle = new Mesh(new CylinderGeometry(0.01, 0.014, 0.05, 10), m);
  nozzle.rotation.x = Math.PI / 2;
  nozzle.position.set(0, -0.045, 0.06);
  const cartridge = new Mesh(new CylinderGeometry(0.018, 0.018, 0.05, 12), glow('#FF3D5A'));
  cartridge.rotation.z = Math.PI / 2;
  cartridge.position.set(0, -0.05, 0);
  const web = new Mesh(new TorusGeometry(0.06, 0.002, 4, 40), glow('#F4FAFF'));
  web.position.set(0, -0.045, 0.16);
  const web2 = new Mesh(new TorusGeometry(0.035, 0.002, 4, 32), glow('#F4FAFF'));
  web2.position.set(0, -0.045, 0.16);
  root.add(band, nozzle, cartridge, web, web2);
  for (let i = 0; i < 6; i += 1) {
    const strand = new Mesh(new BoxGeometry(0.002, 0.12, 0.002), glow('#F4FAFF'));
    strand.position.set(0, -0.045, 0.16);
    strand.rotation.z = (i / 6) * Math.PI;
    root.add(strand);
  }
  return root;
}
