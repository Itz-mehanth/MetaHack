import {
  BackSide,
  BoxGeometry,
  CapsuleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  OctahedronGeometry,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from '@iwsdk/core';
import { Bow } from '../combat/bow.js';
import { band, forge, piece, ringOf, tube } from './lib/forge.js';
import { bevelBox } from './lib/hardsurface.js';

/**
 * Weapon models: armory displays for worn powers, plus HAVOC's guns, the
 * katana and VANGUARD's shield (also used in combat). Every part uses the
 * role-named forge materials (metal, trim, dark, energy, core) so finishes
 * can restyle them. All designs are original.
 */

/** ARC: armoured gauntlet with layered plates, a repulsor lens and power coils. */
export function createGauntletDisplay(): Group {
  const root = new Group();
  root.name = 'Weapon-arc';
  const f = forge('#3DF5FF');
  tube(root, 0.058, 0.05, 0.17, f.metal, 0, 0, -0.1, 20);
  for (const z of [-0.17, -0.1, -0.03]) band(root, 0.059, 0.004, z, f.trim);
  for (let i = 0; i < 3; i += 1) band(root, 0.045, 0.004, -0.15 + i * 0.05, f.energy, 0.04);
  piece(root, bevelBox(0.1, 0.045, 0.11, 0.008), f.metal, 0, 0, 0.03);
  piece(root, bevelBox(0.07, 0.012, 0.07, 0.003), f.trim, 0, 0.026, 0.03);
  piece(root, new CylinderGeometry(0.014, 0.014, 0.004, 6), f.energy, 0, 0.034, 0.03);
  // Repulsor lens in the palm.
  piece(root, new TorusGeometry(0.028, 0.006, 8, 28), f.trim, 0, -0.024, 0.03, Math.PI / 2);
  piece(root, new CylinderGeometry(0.022, 0.022, 0.006, 24), f.energy, 0, -0.025, 0.03);
  piece(root, new SphereGeometry(0.012, 12, 8), f.core, 0, -0.027, 0.03);
  for (let finger = 0; finger < 4; finger += 1) {
    const x = -0.033 + finger * 0.022;
    for (let k = 0; k < 3; k += 1) piece(root, bevelBox(0.017, 0.016, 0.026, 0.003), k === 0 ? f.trim : f.metal, x, 0.002 - k * 0.003, 0.1 + k * 0.026, 0.12 * k);
  }
  piece(root, new CapsuleGeometry(0.01, 0.04, 2, 8), f.metal, -0.06, 0, 0.06, 0, 0.6, Math.PI / 2);
  return root;
}

/** TALON: armoured knuckle plate with three serrated energy blades. */
export function createClawDisplay(): Group {
  const root = new Group();
  root.name = 'Weapon-talon';
  const f = forge('#FF2D9A');
  piece(root, bevelBox(0.11, 0.032, 0.085, 0.006), f.metal, 0, 0, 0);
  piece(root, bevelBox(0.09, 0.01, 0.06, 0.003), f.trim, 0, 0.02, -0.005);
  tube(root, 0.048, 0.048, 0.05, f.dark, 0, -0.01, -0.07, 16);
  band(root, 0.049, 0.004, -0.06, f.trim, -0.01);
  for (let i = -1; i <= 1; i += 1) {
    const x = i * 0.032;
    // Housing, then a long blade with a white core and saw teeth.
    piece(root, bevelBox(0.016, 0.022, 0.04, 0.004), f.trim, x, 0.008, 0.055);
    const blade = piece(root, new ConeGeometry(0.01, 0.34, 4), f.energy, x, 0.01, 0.24, Math.PI / 2);
    blade.scale.x = 0.35;
    piece(root, new BoxGeometry(0.002, 0.004, 0.28), f.core, x, 0.012, 0.22);
    for (let k = 0; k < 5; k += 1) piece(root, new ConeGeometry(0.004, 0.012, 3), f.energy, x, -0.003, 0.12 + k * 0.045, Math.PI);
  }
  return root;
}

/** ORION: recurve light bow with layered limbs, a carved riser and glowing nodes. */
export function createBowDisplay(): Group {
  const root = new Group();
  root.name = 'Weapon-orion';
  // The very bow the archer holds: recurve limbs, armoured riser, energy string.
  const bow = new Bow(new Color('#5DFFB0'));
  bow.showFree(new Vector3(), new Quaternion());
  root.add(bow.group);
  root.rotation.y = Math.PI / 2;
  return root;
}

/** WEAVER: wrist web-shooter with a cartridge drum and a glowing web. */
export function createWebShooterDisplay(): Group {
  const root = new Group();
  root.name = 'Weapon-weaver';
  const f = forge('#FF3D5A');
  tube(root, 0.052, 0.05, 0.09, f.metal, 0, 0, 0, 24);
  for (const z of [-0.035, 0.035]) band(root, 0.053, 0.004, z, f.trim);
  piece(root, bevelBox(0.05, 0.03, 0.08, 0.006), f.metal, 0, -0.058, 0.01);
  tube(root, 0.012, 0.016, 0.05, f.trim, 0, -0.058, 0.07, 10);
  for (let i = 0; i < 3; i += 1) piece(root, new CylinderGeometry(0.009, 0.009, 0.05, 10), f.energy, -0.018 + i * 0.018, -0.075, -0.005, 0, 0, Math.PI / 2);
  const web = forge('#F4FAFF').energy;
  for (const r of [0.07, 0.045, 0.022]) band(root, r, 0.0018, 0.17, web, -0.058);
  for (let i = 0; i < 8; i += 1) piece(root, new BoxGeometry(0.0018, 0.15, 0.0018), web, 0, -0.058, 0.17, 0, 0, (i / 8) * Math.PI);
  return root;
}

/**
 * One katana along +Y, guard at the origin: a wrapped hilt, a cast pommel,
 * a flower guard, a gold collar, and a steel spine carrying a glowing
 * energy edge with a white-hot hamon line.
 */
export function createKatana(color: string, blade = 0.62): Group {
  const root = new Group();
  root.name = 'Katana';
  const f = forge(color);
  piece(root, new CylinderGeometry(0.014, 0.016, 0.22, 10), f.dark, 0, -0.11);
  for (let k = 0; k < 6; k += 1) piece(root, new TorusGeometry(0.0155, 0.0028, 4, 12), f.trim, 0, -0.2 + k * 0.035, 0, Math.PI / 2);
  piece(root, new CylinderGeometry(0.018, 0.016, 0.025, 10), f.trim, 0, -0.232);
  // Flower guard: a disc with four petals and a glowing ring.
  piece(root, new CylinderGeometry(0.04, 0.04, 0.008, 24), f.metal, 0, 0);
  for (let k = 0; k < 4; k += 1) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    piece(root, new SphereGeometry(0.014, 10, 6), f.trim, Math.cos(a) * 0.034, 0, Math.sin(a) * 0.034).scale.y = 0.4;
  }
  piece(root, new TorusGeometry(0.03, 0.003, 6, 24), f.energy, 0, 0.005, 0, Math.PI / 2);
  piece(root, new BoxGeometry(0.012, 0.03, 0.03), f.trim, 0, 0.018, 0);
  // Spine, energy edge and hamon.
  piece(root, new BoxGeometry(0.009, blade, 0.012), f.metal, 0, blade / 2 + 0.03, -0.014, -0.035);
  piece(root, new BoxGeometry(0.013, blade, 0.034), f.energy, 0, blade / 2 + 0.03, 0.008, -0.035);
  // The white-hot hamon peeks out along the cutting edge.
  piece(root, new BoxGeometry(0.005, blade * 0.95, 0.006), f.core, 0, blade / 2 + 0.03, 0.025, -0.035);
  piece(root, new ConeGeometry(0.021, 0.07, 4), f.energy, 0, blade + 0.065, -0.008).scale.x = 0.25;
  return root;
}

/** RONIN: twin energy katanas crossed in an X. */
export function createKatanaDisplay(): Group {
  const root = new Group();
  root.name = 'Weapon-ronin';
  for (const side of [-1, 1]) {
    // Flat of the blade toward the viewer, then crossed.
    const katana = createKatana('#4DA6FF');
    katana.rotation.y = Math.PI / 2;
    const tilt = new Group();
    tilt.rotation.z = side * 0.7;
    tilt.position.set(side * 0.16, -0.2, side * 0.02);
    tilt.add(katana);
    root.add(tilt);
  }
  return root;
}

/** PSION: a psychic core inside counter-rotating rings, rock shards in orbit. */
export function createPsiDisplay(): Group {
  const root = new Group();
  root.name = 'Weapon-psion';
  const f = forge('#E05CFF');
  piece(root, new SphereGeometry(0.05, 20, 14), f.core);
  piece(root, new TorusGeometry(0.1, 0.006, 6, 48), f.trim, 0, 0, 0, 1.1);
  piece(root, new TorusGeometry(0.13, 0.004, 6, 48), f.energy, 0, 0, 0, 0.4, 0.9);
  piece(root, new TorusGeometry(0.16, 0.003, 6, 48), f.trim, 0, 0, 0, -0.5, 0.3);
  const stone = new MeshStandardMaterial({ color: '#5B5248', roughness: 0.95, flatShading: true });
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const shard = piece(root, new OctahedronGeometry(0.028, 0), stone, Math.cos(a) * 0.22, Math.sin(a * 2) * 0.05, Math.sin(a) * 0.22, a, a * 0.5, 0.6);
    shard.scale.y = 1.6;
    piece(root, new SphereGeometry(0.006, 8, 6), f.energy, Math.cos(a) * 0.19, Math.sin(a * 2) * 0.05, Math.sin(a) * 0.19);
  }
  return root;
}

export type GunType = 'smg' | 'shotgun' | 'minigun' | 'launcher';

/**
 * HAVOC's guns, held like the pistol: origin at the grip, barrel along +Z,
 * top along +Y, a `Muzzle` at the barrel tip. The minigun's spinning
 * barrel cluster is `Barrels`; the shotgun's pump is `Pump`.
 */
export function createGun(type: GunType): Group {
  const root = new Group();
  root.name = `Gun-${type}`;
  const accent = type === 'smg' ? '#3DFF8A' : type === 'shotgun' ? '#FF3B5C' : type === 'launcher' ? '#FF5A1F' : '#FFD23F';
  const f = forge(accent);
  // Pistol grip with grooves and a trigger guard.
  piece(root, bevelBox(0.03, 0.1, 0.045, 0.006), f.dark, 0, 0, 0, 0.25);
  for (let i = 0; i < 3; i += 1) piece(root, new CapsuleGeometry(0.006, 0.024, 2, 8), f.dark, 0, -0.025 + i * 0.025, 0.025 - i * 0.006, 0, 0, Math.PI / 2);
  piece(root, new TorusGeometry(0.02, 0.004, 6, 14, Math.PI), f.trim, 0, 0.022, 0.03, 0, Math.PI / 2);
  const muzzle = new Group();
  muzzle.name = 'Muzzle';
  if (type === 'smg') {
    // Compact receiver, glowing magazine, suppressor and a holo sight.
    piece(root, bevelBox(0.042, 0.062, 0.22, 0.007), f.metal, 0, 0.065, 0.06).name = 'Body';
    piece(root, bevelBox(0.044, 0.014, 0.18, 0.003), f.trim, 0, 0.1, 0.06);
    for (let i = 0; i < 7; i += 1) piece(root, new BoxGeometry(0.03, 0.004, 0.006), f.dark, 0, 0.108, -0.01 + i * 0.022);
    piece(root, bevelBox(0.026, 0.13, 0.035, 0.004), f.dark, 0, -0.025, 0.1, 0.12);
    piece(root, new BoxGeometry(0.028, 0.08, 0.006), f.energy, 0, -0.02, 0.118, 0.12);
    piece(root, bevelBox(0.022, 0.06, 0.026, 0.004), f.dark, 0, 0.01, 0.175, -0.1);
    tube(root, 0.022, 0.022, 0.14, f.metal, 0, 0.068, 0.24, 18);
    for (let i = 0; i < 5; i += 1) band(root, 0.0225, 0.003, 0.185 + i * 0.026, i % 2 ? f.trim : f.energy, 0.068);
    piece(root, bevelBox(0.026, 0.032, 0.05, 0.004), f.metal, 0, 0.125, 0.05);
    piece(root, new TorusGeometry(0.012, 0.0025, 6, 18), f.trim, 0, 0.13, 0.075);
    piece(root, new SphereGeometry(0.003, 6, 4), f.core, 0, 0.13, 0.076);
    piece(root, bevelBox(0.02, 0.026, 0.13, 0.004), f.dark, 0, 0.06, -0.1);
    piece(root, new BoxGeometry(0.044, 0.01, 0.12), f.energy, 0, 0.04, 0.06);
    muzzle.position.set(0, 0.068, 0.32);
  } else if (type === 'shotgun') {
    // Long receiver, twin tubes, a pump, a shell rack and a heavy stock.
    piece(root, bevelBox(0.046, 0.07, 0.22, 0.008), f.metal, 0, 0.065, 0.05).name = 'Body';
    piece(root, new BoxGeometry(0.047, 0.016, 0.07), f.core, 0, 0.065, 0.02);
    tube(root, 0.018, 0.018, 0.44, f.metal, 0, 0.08, 0.35, 16);
    tube(root, 0.0145, 0.0145, 0.36, f.dark, 0, 0.049, 0.31, 14);
    for (let i = 0; i < 3; i += 1) band(root, 0.0185, 0.003, 0.26 + i * 0.1, f.trim, 0.08);
    for (let i = 0; i < 6; i += 1) piece(root, new BoxGeometry(0.004, 0.008, 0.02), f.dark, 0, 0.098, 0.18 + i * 0.05);
    const pump = new Group();
    pump.name = 'Pump';
    tube(pump, 0.024, 0.024, 0.11, f.dark, 0, 0, 0, 14);
    for (let i = 0; i < 5; i += 1) band(pump, 0.0245, 0.003, -0.04 + i * 0.02, f.trim);
    pump.position.set(0, 0.049, 0.24);
    root.add(pump);
    piece(root, bevelBox(0.036, 0.065, 0.22, 0.008), f.dark, 0, 0.05, -0.15, 0.12);
    piece(root, new BoxGeometry(0.038, 0.06, 0.012), f.trim, 0, 0.04, -0.26, 0.12);
    for (let i = 0; i < 5; i += 1) piece(root, new CylinderGeometry(0.008, 0.008, 0.032, 10), f.energy, 0.027, 0.07, -0.03 + i * 0.02);
    piece(root, new BoxGeometry(0.008, 0.01, 0.01), f.energy, 0, 0.1, 0.56);
    muzzle.position.set(0, 0.08, 0.57);
  } else if (type === 'launcher') {
    // Shoulder-style missile launcher: a fat launch tube with a flared muzzle (the warhead peeking out),
    // a vented rear cone, energy bands, an optic on a rail and a side ammo cell.
    tube(root, 0.052, 0.056, 0.52, f.metal, 0, 0.09, 0.18, 22).name = 'Body';
    tube(root, 0.066, 0.056, 0.06, f.trim, 0, 0.09, 0.47, 22);
    tube(root, 0.06, 0.07, 0.1, f.dark, 0, 0.09, -0.12, 22);
    for (const z of [0.0, 0.14, 0.28, 0.4]) band(root, 0.057, 0.004, z, z === 0.14 ? f.energy : f.trim, 0.09);
    piece(root, new ConeGeometry(0.03, 0.09, 14), f.core, 0, 0.09, 0.45, Math.PI / 2);
    for (let i = 0; i < 4; i += 1) piece(root, new BoxGeometry(0.004, 0.03, 0.04), f.energy, Math.cos((i / 4) * Math.PI * 2) * 0.034, 0.09 + Math.sin((i / 4) * Math.PI * 2) * 0.034, 0.41, 0, 0, (i / 4) * Math.PI * 2);
    for (let i = 0; i < 6; i += 1) piece(root, new BoxGeometry(0.02, 0.006, 0.012), f.dark, 0, 0.15, -0.12 + i * 0.03);
    piece(root, bevelBox(0.03, 0.02, 0.28, 0.004), f.trim, 0, 0.155, 0.18);
    piece(root, bevelBox(0.034, 0.045, 0.08, 0.005), f.dark, 0, 0.19, 0.12);
    piece(root, new TorusGeometry(0.016, 0.003, 6, 18), f.trim, 0, 0.195, 0.165);
    piece(root, new SphereGeometry(0.006, 8, 6), f.core, 0, 0.195, 0.166);
    piece(root, bevelBox(0.04, 0.07, 0.12, 0.006), f.metal, 0.06, 0.07, 0.14);
    for (let i = 0; i < 3; i += 1) piece(root, new BoxGeometry(0.006, 0.012, 0.09), f.energy, 0.083, 0.045 + i * 0.022, 0.14);
    piece(root, bevelBox(0.03, 0.055, 0.05, 0.005), f.dark, 0, 0.0, 0.2);
    muzzle.position.set(0, 0.09, 0.52);
  } else {

    // Minigun: motor housing, six barrels on a spinning axis, ammo drum, carry handle.
    tube(root, 0.06, 0.066, 0.2, f.metal, 0, 0.07, 0.07, 18).name = 'Body';
    for (const z of [0.0, 0.14]) band(root, 0.066, 0.005, z, f.trim, 0.07);
    for (let i = 0; i < 6; i += 1) piece(root, new BoxGeometry(0.004, 0.02, 0.1), f.dark, Math.cos((i / 6) * Math.PI * 2) * 0.064, 0.07 + Math.sin((i / 6) * Math.PI * 2) * 0.064, 0.07);
    const barrels = new Group();
    barrels.name = 'Barrels';
    barrels.position.set(0, 0.07, 0.17);
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      tube(barrels, 0.009, 0.009, 0.38, f.metal, Math.cos(a) * 0.027, Math.sin(a) * 0.027, 0.19, 10);
      piece(barrels, new CylinderGeometry(0.0045, 0.0045, 0.3, 6), f.energy, Math.cos(a) * 0.027, Math.sin(a) * 0.027, 0.2, Math.PI / 2);
    }
    for (const z of [0.06, 0.2, 0.34]) piece(barrels, new CylinderGeometry(0.042, 0.042, 0.016, 18), f.trim, 0, 0, z, Math.PI / 2);
    piece(barrels, new TorusGeometry(0.046, 0.006, 6, 28), f.energy, 0, 0, 0.02);
    piece(barrels, new SphereGeometry(0.012, 10, 8), f.core, 0, 0, 0.0);
    root.add(barrels);
    piece(root, new CylinderGeometry(0.066, 0.066, 0.065, 22), f.dark, -0.085, 0.05, 0.04, 0, 0, Math.PI / 2);
    piece(root, new TorusGeometry(0.066, 0.006, 6, 28), f.energy, -0.118, 0.05, 0.04, 0, Math.PI / 2);
    ringOf(root, 8, 0.05, 0, [0.004, 0.012, 0.004], f.trim);
    piece(root, bevelBox(0.022, 0.05, 0.13, 0.005), f.dark, 0, 0.15, 0.06);
    piece(root, new BoxGeometry(0.024, 0.008, 0.1), f.energy, 0, 0.176, 0.06);
    muzzle.position.set(0, 0.07, 0.56);
  }
  root.add(muzzle);
  return root;
}

/**
 * VANGUARD's energy shield: a round, dished war-shield about 0.5 m across,
 * facing +Z (the strap side is -Z), origin at its centre. Layered steel
 * and painted rings, a rivet ring, four energy arcs, a glowing rim and a
 * hexagonal core emblem. Original design.
 */
export function createShield(color: string): Group {
  const root = new Group();
  root.name = 'Shield';
  const f = forge(color);
  const paint = new MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.7 });
  paint.name = 'trim';
  // Layered dish segments sharing one sphere centre, each a hair proud of the last.
  const R = 0.6;
  const C = -R * Math.cos(0.42);
  const face = (r: number, depth: number, material: MeshStandardMaterial) => {
    const m = new Mesh(new SphereGeometry(r, 48, 6, 0, Math.PI * 2, 0, depth), material);
    m.rotation.x = Math.PI / 2;
    m.position.z = C;
    root.add(m);
    return m;
  };
  const surface = (rho: number) => Math.sqrt(R * R - rho * rho) + C;
  face(R, 0.42, f.metal).name = 'Body';
  // The inside of the dish: what the wearer sees, with the straps and grip in front of it.
  const lining = f.dark.clone();
  lining.side = BackSide;
  lining.name = 'dark';
  face(R - 0.004, 0.42, lining);
  face(R + 0.003, 0.3, paint);
  face(R + 0.006, 0.2, f.metal);
  face(R + 0.009, 0.11, paint);
  band(root, 0.248, 0.012, surface(0.248) + 0.004, f.energy);
  band(root, 0.236, 0.004, surface(0.236) + 0.006, f.trim);
  band(root, 0.176, 0.006, surface(0.176) + 0.004, f.trim);
  band(root, 0.118, 0.005, surface(0.118) + 0.006, f.trim);
  // Rivets around the rim and four energy arcs between the rings.
  for (let i = 0; i < 16; i += 1) {
    const a = (i / 16) * Math.PI * 2;
    piece(root, new SphereGeometry(0.007, 8, 6), f.trim, Math.cos(a) * 0.212, Math.sin(a) * 0.212, surface(0.212) + 0.004);
  }
  for (let i = 0; i < 4; i += 1) {
    piece(root, new TorusGeometry(0.147, 0.007, 6, 20, Math.PI * 0.35), f.energy, 0, 0, surface(0.147) + 0.006, 0, 0, (i / 4) * Math.PI * 2 + 0.2);
  }
  // Hexagonal core emblem.
  piece(root, new CylinderGeometry(0.06, 0.06, 0.012, 6), f.trim, 0, 0, surface(0) + 0.006, Math.PI / 2);
  piece(root, new CylinderGeometry(0.05, 0.05, 0.014, 6), f.energy, 0, 0, surface(0) + 0.009, Math.PI / 2);
  piece(root, new CylinderGeometry(0.026, 0.026, 0.018, 6), f.core, 0, 0, surface(0) + 0.012, Math.PI / 2);
  // Straps and grip on the back, with a padded rim and buckles.
  for (const y of [-0.05, 0.06]) {
    piece(root, new BoxGeometry(0.2, 0.034, 0.012), f.dark, 0, y, -0.07);
    for (const x of [-0.08, 0.08]) piece(root, new BoxGeometry(0.02, 0.04, 0.016), f.trim, x, y, -0.072);
  }
  piece(root, new CylinderGeometry(0.016, 0.016, 0.13, 10), f.dark, 0, 0, -0.088, 0, 0, Math.PI / 2);
  for (const x of [-0.07, 0.07]) piece(root, new BoxGeometry(0.012, 0.03, 0.034), f.trim, x, 0, -0.07);
  piece(root, new TorusGeometry(0.2445, 0.01, 6, 48), f.dark, 0, 0, -0.004);
  return root;
}

/** VESPER: a gold sigil gauntlet with a floating runic mandala and a spell orb. */
export function createSigilDisplay(): Group {
  const root = new Group();
  root.name = 'Weapon-vesper';
  const f = forge('#8A5CFF');
  tube(root, 0.052, 0.05, 0.13, f.metal, 0, 0, -0.08, 20);
  for (const z of [-0.14, -0.08, -0.02]) band(root, 0.053, 0.004, z, f.trim);
  piece(root, bevelBox(0.07, 0.012, 0.08, 0.004), f.dark, 0, 0.048, -0.03);
  // The mandala: nested rings with spokes and a core orb, hovering over the hand.
  for (const [r, w, c] of [[0.1, 0.004, f.trim], [0.075, 0.0035, f.energy], [0.05, 0.003, f.trim]] as const) {
    const ring = new Mesh(new TorusGeometry(r, w, 6, 56), c);
    ring.position.set(0, 0.11, -0.03);
    ring.rotation.x = Math.PI / 2;
    root.add(ring);
  }
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2;
    piece(root, new BoxGeometry(0.004, 0.004, 0.09), f.energy, Math.cos(a) * 0.04, 0.11, -0.03 + Math.sin(a) * 0.04, 0, -a, 0);
  }
  piece(root, new OctahedronGeometry(0.03, 0), f.core, 0, 0.11, -0.03);
  root.rotation.y = Math.PI / 2;
  return root;
}
