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

/** One katana along +Y, guard at the origin: wrapped hilt, gold guard, glowing blade. */
export function createKatana(color: string, blade = 0.62): Group {
  const root = new Group();
  root.name = 'Katana';
  const wrap = new MeshStandardMaterial({ color: '#15151C', roughness: 0.85, metalness: 0.1 });
  const gold = new MeshStandardMaterial({ color: '#C9973A', roughness: 0.3, metalness: 1 });
  const hilt = new Mesh(new CylinderGeometry(0.014, 0.016, 0.22, 10), wrap);
  hilt.position.y = -0.11;
  const guard = new Mesh(new CylinderGeometry(0.04, 0.04, 0.01, 18), gold);
  guard.scale.z = 0.75;
  const edge = new Mesh(new BoxGeometry(0.006, blade, 0.03), glow(color));
  edge.position.y = blade / 2 + 0.005;
  edge.rotation.x = -0.04;
  const point = new Mesh(new ConeGeometry(0.021, 0.06, 4), glow(color));
  point.scale.x = 0.2;
  point.position.set(0, blade + 0.035, -0.012);
  root.add(hilt, guard, edge, point);
  return root;
}

/** RONIN: twin energy katanas crossed in an X. */
export function createKatanaDisplay(): Group {
  const root = new Group();
  root.name = 'Weapon-ronin';
  for (const side of [-1, 1]) {
    const katana = createKatana('#4DA6FF');
    katana.rotation.z = side * 0.7;
    katana.position.set(side * 0.16, -0.2, side * 0.02);
    root.add(katana);
  }
  return root;
}

/** PSION: a psychic core with shards of rock held in orbit around it. */
export function createPsiDisplay(): Group {
  const root = new Group();
  root.name = 'Weapon-psion';
  const core = new Mesh(new SphereGeometry(0.06, 20, 14), glow('#E05CFF'));
  const shell = new Mesh(new TorusGeometry(0.11, 0.006, 6, 40), glow('#E05CFF'));
  shell.rotation.x = 1.1;
  const shell2 = new Mesh(new TorusGeometry(0.14, 0.004, 6, 40), glow('#FFFFFF'));
  shell2.rotation.set(0.4, 0.9, 0);
  root.add(core, shell, shell2);
  const stone = new MeshStandardMaterial({ color: '#5B5248', roughness: 0.95, flatShading: true });
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2;
    const shard = new Mesh(new ConeGeometry(0.03, 0.08, 5), stone);
    shard.position.set(Math.cos(a) * 0.22, Math.sin(a * 2) * 0.05, Math.sin(a) * 0.22);
    shard.rotation.set(a, a * 0.5, 0.6);
    root.add(shard);
  }
  return root;
}

export type GunType = 'smg' | 'shotgun' | 'minigun';

/**
 * HAVOC's guns, held like the pistol: origin at the grip, barrel along +Z,
 * top along +Y, a `Muzzle` at the barrel tip. The minigun's spinning
 * barrel cluster is `Barrels`; the shotgun's pump is `Pump`.
 */
export function createGun(type: GunType): Group {
  const root = new Group();
  root.name = `Gun-${type}`;
  const metal = new MeshStandardMaterial({ color: '#2A2D36', roughness: 0.28, metalness: 0.92 });
  const polymer = new MeshStandardMaterial({ color: '#16171C', roughness: 0.75, metalness: 0.15 });
  const accentColor = type === 'smg' ? '#3DFF8A' : type === 'shotgun' ? '#FF3B5C' : '#FFD23F';
  const energy = glow(accentColor);
  const part = (geometry: ConstructorParameters<typeof Mesh>[0], material: MeshStandardMaterial, x: number, y: number, z: number, rx = 0) => {
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.rotation.x = rx;
    root.add(mesh);
    return mesh;
  };
  const tube = (r: number, length: number, material: MeshStandardMaterial, x: number, y: number, z: number) =>
    part(new CylinderGeometry(r, r, length, 14), material, x, y, z, Math.PI / 2);
  // Pistol grip with a trigger guard.
  part(new BoxGeometry(0.03, 0.1, 0.045), polymer, 0, 0, 0, 0.25);
  part(new TorusGeometry(0.02, 0.004, 4, 12, Math.PI), metal, 0, 0.022, 0.03).rotation.y = Math.PI / 2;
  const muzzle = new Group();
  muzzle.name = 'Muzzle';
  if (type === 'smg') {
    part(new BoxGeometry(0.04, 0.06, 0.22), metal, 0, 0.065, 0.06).name = 'Body';
    part(new BoxGeometry(0.026, 0.12, 0.035), polymer, 0, -0.02, 0.1, 0.12);
    part(new BoxGeometry(0.022, 0.06, 0.025), polymer, 0, 0.01, 0.17, -0.1);
    tube(0.02, 0.12, metal, 0, 0.068, 0.23);
    for (let i = 0; i < 4; i += 1) tube(0.0215, 0.006, polymer, 0, 0.068, 0.19 + i * 0.022);
    part(new BoxGeometry(0.03, 0.008, 0.16), metal, 0, 0.1, 0.06);
    part(new BoxGeometry(0.024, 0.03, 0.04), metal, 0, 0.12, 0.05);
    part(new BoxGeometry(0.018, 0.02, 0.004), energy, 0, 0.125, 0.07);
    part(new BoxGeometry(0.044, 0.012, 0.12), energy, 0, 0.04, 0.06);
    part(new BoxGeometry(0.02, 0.025, 0.14), polymer, 0, 0.06, -0.09);
    muzzle.position.set(0, 0.068, 0.3);
  } else if (type === 'shotgun') {
    part(new BoxGeometry(0.042, 0.065, 0.2), metal, 0, 0.065, 0.05).name = 'Body';
    tube(0.017, 0.42, metal, 0, 0.078, 0.34);
    tube(0.014, 0.34, metal, 0, 0.048, 0.3);
    const pump = new Group();
    pump.name = 'Pump';
    const grip = new Mesh(new CylinderGeometry(0.022, 0.022, 0.1, 12), polymer);
    grip.rotation.x = Math.PI / 2;
    pump.add(grip);
    for (let i = 0; i < 4; i += 1) {
      const ridge = new Mesh(new TorusGeometry(0.0225, 0.003, 4, 14), polymer);
      ridge.position.z = -0.035 + i * 0.023;
      pump.add(ridge);
    }
    pump.position.set(0, 0.048, 0.24);
    root.add(pump);
    part(new BoxGeometry(0.035, 0.06, 0.22), polymer, 0, 0.05, -0.15, 0.12);
    for (let i = 0; i < 4; i += 1) part(new CylinderGeometry(0.008, 0.008, 0.03, 8), energy, 0.024, 0.07, -0.02 + i * 0.022);
    part(new BoxGeometry(0.006, 0.008, 0.008), energy, 0, 0.099, 0.53);
    muzzle.position.set(0, 0.078, 0.56);
  } else {
    // Minigun: motor housing, six barrels around a spinning axis, ammo drum.
    part(new CylinderGeometry(0.055, 0.06, 0.18, 16), metal, 0, 0.07, 0.07, Math.PI / 2).name = 'Body';
    const barrels = new Group();
    barrels.name = 'Barrels';
    barrels.position.set(0, 0.07, 0.17);
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      const barrel = new Mesh(new CylinderGeometry(0.009, 0.009, 0.36, 8), metal);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(Math.cos(a) * 0.026, Math.sin(a) * 0.026, 0.18);
      barrels.add(barrel);
    }
    for (const z of [0.06, 0.3]) {
      const clamp = new Mesh(new CylinderGeometry(0.04, 0.04, 0.02, 16), metal);
      clamp.rotation.x = Math.PI / 2;
      clamp.position.z = z;
      barrels.add(clamp);
    }
    const coil = new Mesh(new TorusGeometry(0.045, 0.006, 6, 24), energy);
    coil.position.z = 0.02;
    barrels.add(coil);
    root.add(barrels);
    part(new CylinderGeometry(0.06, 0.06, 0.06, 18), polymer, -0.075, 0.05, 0.04).rotation.z = Math.PI / 2;
    part(new TorusGeometry(0.06, 0.005, 6, 24), energy, -0.105, 0.05, 0.04).rotation.y = Math.PI / 2;
    part(new BoxGeometry(0.02, 0.05, 0.12), polymer, 0, 0.14, 0.06);
    muzzle.position.set(0, 0.07, 0.53);
  }
  root.add(muzzle);
  return root;
}

/**
 * VANGUARD's energy shield: a round, dished war-shield about 0.5 m across,
 * facing +Z (the strap side is -Z), origin at its centre. Concentric steel
 * rings, a glowing edge and a hexagonal core emblem. Original design.
 */
export function createShield(color: string): Group {
  const root = new Group();
  root.name = 'Shield';
  const steel = new MeshStandardMaterial({ color: '#C8D0DC', roughness: 0.25, metalness: 0.95 });
  const paint = new MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.6 });
  const dark = new MeshStandardMaterial({ color: '#1A1E28', roughness: 0.5, metalness: 0.7 });
  const energy = glow(color);
  // Layered dish segments sharing one sphere centre, each a hair proud of the last.
  const R = 0.6;
  const C = -R * Math.cos(0.42);
  const face = (r: number, depth: number, material: MeshStandardMaterial) => {
    const m = new Mesh(new SphereGeometry(r, 40, 6, 0, Math.PI * 2, 0, depth), material);
    m.rotation.x = Math.PI / 2;
    m.position.z = C;
    root.add(m);
    return m;
  };
  const surface = (rho: number) => Math.sqrt(R * R - rho * rho) + C;
  face(R, 0.42, steel).name = 'Body';
  face(R + 0.003, 0.3, paint);
  face(R + 0.006, 0.2, steel);
  face(R + 0.009, 0.11, paint);
  for (const [r, w] of [[0.248, 0.012], [0.176, 0.006], [0.118, 0.005]] as const) {
    const ring = new Mesh(new TorusGeometry(r, w, 6, 64), r > 0.2 ? energy : steel);
    ring.position.z = surface(r) + 0.004;
    root.add(ring);
  }
  // Hexagonal core emblem.
  const hex = new Mesh(new CylinderGeometry(0.055, 0.055, 0.012, 6), energy);
  hex.rotation.x = Math.PI / 2;
  hex.position.z = surface(0) + 0.008;
  const inner = new Mesh(new CylinderGeometry(0.03, 0.03, 0.016, 6), steel);
  inner.rotation.x = Math.PI / 2;
  inner.position.z = surface(0) + 0.011;
  root.add(hex, inner);
  // Straps and grip on the back.
  for (const y of [-0.05, 0.06]) {
    const strap = new Mesh(new BoxGeometry(0.2, 0.03, 0.012), dark);
    strap.position.set(0, y, -0.07);
    root.add(strap);
  }
  return root;
}
