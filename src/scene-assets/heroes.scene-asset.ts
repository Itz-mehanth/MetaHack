import {
  BoxGeometry,
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  type Material,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
  DoubleSide,
} from '@iwsdk/core';
import { createBlaster, createHammer } from './combat.scene-asset.js';
import { createKatana } from './weapons.scene-asset.js';

/**
 * Stylized hero statues for the hero-select carousel: about 1 m tall,
 * origin at the feet, facing +Z. Every glowing part uses a material named
 * `accent` so the carousel can recolour a figure to its equipped skin.
 * All designs are original.
 */

type HeroId = 'arc' | 'talon' | 'tempest' | 'orion' | 'weaver' | 'havoc' | 'ronin' | 'psion';

const DEFAULT_ACCENT: Record<HeroId, string> = {
  arc: '#3DF5FF',
  talon: '#FF2D9A',
  tempest: '#9D8CFF',
  orion: '#5DFFB0',
  weaver: '#FF3D5A',
  havoc: '#FFB01F',
  ronin: '#4DA6FF',
  psion: '#E05CFF',
};

const SUIT: Record<HeroId, string> = {
  arc: '#2B2F3A',
  talon: '#1C1418',
  tempest: '#262B40',
  orion: '#1B2A22',
  weaver: '#14182A',
  havoc: '#2A2018',
  ronin: '#17171F',
  psion: '#1E1428',
};

function accentMaterial(color: string): MeshStandardMaterial {
  const m = new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.4, roughness: 0.3 });
  m.name = 'accent';
  return m;
}

function part(geometry: ConstructorParameters<typeof Mesh>[0], material: Material, x: number, y: number, z = 0): Mesh {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  return mesh;
}

/** Shared armored body in a confident power stance. */
function body(suit: MeshStandardMaterial, trim: MeshStandardMaterial, accent: MeshStandardMaterial): Group {
  const g = new Group();
  g.name = 'Body';
  const limb = new CapsuleGeometry(0.038, 0.17, 4, 10);
  const arm = new CapsuleGeometry(0.03, 0.13, 4, 10);

  // Legs, slightly apart.
  for (const side of [-1, 1]) {
    const thigh = part(limb, suit, side * 0.065, 0.38);
    thigh.rotation.z = side * 0.08;
    const shin = part(limb, suit, side * 0.08, 0.15);
    const knee = part(new SphereGeometry(0.035, 10, 8), trim, side * 0.072, 0.27, 0.02);
    const boot = part(new BoxGeometry(0.075, 0.05, 0.13), trim, side * 0.08, 0.025, 0.02);
    g.add(thigh, shin, knee, boot);
  }
  // Pelvis, torso, chest plate.
  g.add(part(new BoxGeometry(0.17, 0.08, 0.1), suit, 0, 0.5));
  const torso = part(new CylinderGeometry(0.13, 0.095, 0.3, 12), suit, 0, 0.68);
  torso.scale.z = 0.62;
  const chest = part(new BoxGeometry(0.2, 0.12, 0.03), trim, 0, 0.74, 0.07);
  const belt = part(new BoxGeometry(0.19, 0.025, 0.11), accent, 0, 0.545);
  g.add(torso, chest, belt);
  // Shoulders and arms on the hips: a hero pose.
  for (const side of [-1, 1]) {
    const shoulder = part(new SphereGeometry(0.05, 12, 8), trim, side * 0.15, 0.8);
    const upper = part(arm, suit, side * 0.19, 0.71);
    upper.rotation.z = side * 0.55;
    const fore = part(arm, suit, side * 0.2, 0.585);
    fore.rotation.z = side * -0.7;
    const fist = part(new SphereGeometry(0.035, 10, 8), trim, side * 0.14, 0.53, 0.02);
    fist.name = side < 0 ? 'FistLeft' : 'FistRight';
    g.add(shoulder, upper, fore, fist);
  }
  // Neck and helmet.
  g.add(part(new CylinderGeometry(0.035, 0.04, 0.05, 10), suit, 0, 0.85));
  const head = part(new SphereGeometry(0.075, 16, 12), trim, 0, 0.93);
  head.scale.set(0.95, 1.1, 1);
  head.name = 'Head';
  g.add(head);
  return g;
}

export function createHeroFigure(hero: HeroId): Group {
  const root = new Group();
  root.name = `Hero-${hero}`;
  const suit = new MeshStandardMaterial({ color: SUIT[hero], roughness: 0.45, metalness: 0.7 });
  const trim = new MeshStandardMaterial({ color: '#8C93A8', roughness: 0.25, metalness: 0.95 });
  const accent = accentMaterial(DEFAULT_ACCENT[hero]);
  const figure = body(suit, trim, accent);
  root.add(figure);

  const visor = part(new BoxGeometry(0.11, 0.025, 0.02), accent, 0, 0.94, 0.07);
  root.add(visor);

  if (hero === 'arc') {
    // Arc-reactor style chest core and glowing palms (original design).
    root.add(part(new TorusGeometry(0.035, 0.008, 8, 24), accent, 0, 0.74, 0.09));
    root.add(part(new SphereGeometry(0.022, 12, 8), accent, 0, 0.74, 0.088));
    for (const side of [-1, 1]) {
      const gauntlet = part(new CylinderGeometry(0.036, 0.032, 0.09, 10), trim, side * 0.19, 0.58);
      gauntlet.rotation.z = side * -0.7;
      root.add(gauntlet, part(new SphereGeometry(0.02, 10, 8), accent, side * 0.14, 0.53, 0.05));
    }
  } else if (hero === 'talon') {
    // Shoulder spikes and three knuckle blades per fist.
    const spike = new ConeGeometry(0.02, 0.09, 5);
    for (const side of [-1, 1]) {
      for (let k = 0; k < 3; k += 1) {
        const s = part(spike, trim, side * (0.13 + k * 0.025), 0.86 - k * 0.012);
        s.rotation.z = side * -(0.3 + k * 0.25);
        root.add(s);
        const blade = part(new ConeGeometry(0.006, 0.2, 4), accent, side * 0.14 + (k - 1) * 0.012, 0.42, 0.05);
        blade.rotation.x = Math.PI;
        root.add(blade);
      }
    }
  } else if (hero === 'tempest') {
    // Winged helm, cape and the storm hammer held low.
    for (const side of [-1, 1]) {
      const wing = part(new ConeGeometry(0.018, 0.1, 4), trim, side * 0.08, 0.98);
      wing.rotation.z = side * -1.1;
      root.add(wing);
    }
    const cape = part(new PlaneGeometry(0.3, 0.55), new MeshStandardMaterial({ color: '#3A1F6A', side: DoubleSide, roughness: 0.8 }), 0, 0.55, -0.07);
    cape.rotation.x = 0.12;
    root.add(cape);
    const hammer = createHammer();
    hammer.scale.setScalar(0.75);
    hammer.position.set(0.15, 0.5, 0.04);
    hammer.rotation.z = Math.PI;
    hammer.traverse((o) => {
      const mesh = o as Mesh;
      if (mesh.isMesh && (mesh.material as MeshStandardMaterial).emissiveIntensity >= 3) mesh.material = accent;
    });
    root.add(hammer);
  } else if (hero === 'orion') {
    // Hood, quiver with arrows, and a bow in the left hand.
    const hood = part(new ConeGeometry(0.09, 0.12, 12), suit, 0, 1.0, -0.01);
    root.add(hood);
    const quiver = part(new CylinderGeometry(0.03, 0.025, 0.24, 10), trim, 0.06, 0.72, -0.09);
    quiver.rotation.z = -0.35;
    root.add(quiver);
    for (let k = 0; k < 3; k += 1) {
      const arrow = part(new CylinderGeometry(0.003, 0.003, 0.12, 4), accent, 0.1 + k * 0.012, 0.88, -0.09);
      arrow.rotation.z = -0.35;
      root.add(arrow);
    }
    const bow = part(new TorusGeometry(0.28, 0.008, 6, 32, 1.4), accent, -0.36, 0.55, 0.04);
    bow.rotation.z = -0.7;
    root.add(bow);
  } else if (hero === 'havoc') {
    // Gunslinger: wide-brim helmet, long coat, plasma pistol in the right hand.
    const brim = part(new CylinderGeometry(0.16, 0.16, 0.012, 20), suit, 0, 0.99);
    const crown = part(new CylinderGeometry(0.07, 0.08, 0.07, 14), suit, 0, 1.03);
    const band = part(new CylinderGeometry(0.081, 0.081, 0.015, 14), accent, 0, 1.01);
    root.add(brim, crown, band);
    const coat = part(new CylinderGeometry(0.13, 0.22, 0.5, 14, 1, true), new MeshStandardMaterial({ color: '#3A2A1C', side: DoubleSide, roughness: 0.8 }), 0, 0.48, -0.01);
    coat.scale.z = 0.7;
    root.add(coat);
    const pistol = createBlaster();
    pistol.scale.setScalar(0.85);
    pistol.position.set(0.15, 0.52, 0.08);
    pistol.rotation.x = 0.3;
    pistol.traverse((o) => {
      const mesh = o as Mesh;
      if (mesh.isMesh && (mesh.material as MeshStandardMaterial).emissiveIntensity >= 2) mesh.material = accent;
    });
    root.add(pistol);
  } else if (hero === 'ronin') {
    // Crested helm, layered shoulder plates, sash, and a katana in each hand.
    // Crescent-moon helmet crest, horns up.
    const crest = part(new TorusGeometry(0.065, 0.007, 6, 24, Math.PI), accent, 0, 0.99, 0.065);
    crest.rotation.x = -0.25;
    root.add(crest);
    for (const side of [-1, 1]) {
      for (let k = 0; k < 3; k += 1) {
        const plate = part(new BoxGeometry(0.1, 0.012, 0.11), trim, side * (0.17 + k * 0.01), 0.81 - k * 0.035);
        plate.rotation.z = side * -(0.35 + k * 0.08);
        root.add(plate);
      }
      const katana = createKatana(DEFAULT_ACCENT.ronin, 0.36);
      katana.traverse((o) => {
        const mesh = o as Mesh;
        if (mesh.isMesh && (mesh.material as MeshStandardMaterial).emissiveIntensity >= 2) mesh.material = accent;
      });
      katana.position.set(side * 0.14, 0.53, 0.03);
      katana.rotation.set(0.5, 0, side * -2.4);
      root.add(katana);
    }
    const sash = part(new BoxGeometry(0.2, 0.05, 0.115), new MeshStandardMaterial({ color: '#5A1420', roughness: 0.8 }), 0, 0.52);
    sash.rotation.z = 0.15;
    root.add(sash);
    const tail = part(new PlaneGeometry(0.06, 0.22), new MeshStandardMaterial({ color: '#5A1420', side: DoubleSide, roughness: 0.8 }), 0.07, 0.4, -0.06);
    tail.rotation.z = 0.1;
    root.add(tail);
  } else if (hero === 'psion') {
    // Hooded mystic: a halo of floating shards and a rock held aloft by the mind.
    const hood = part(new SphereGeometry(0.09, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), suit, 0, 0.95, -0.01);
    root.add(hood);
    const robe = part(new CylinderGeometry(0.12, 0.24, 0.48, 16, 1, true), new MeshStandardMaterial({ color: '#2B1A3A', side: DoubleSide, roughness: 0.85 }), 0, 0.42);
    robe.scale.z = 0.75;
    root.add(robe);
    root.add(part(new SphereGeometry(0.018, 10, 8), accent, 0, 0.98, 0.075));
    const halo = part(new TorusGeometry(0.13, 0.004, 6, 40), accent, 0, 1.08, -0.02);
    halo.rotation.x = Math.PI / 2 - 0.25;
    root.add(halo);
    const stone = new MeshStandardMaterial({ color: '#5B5248', roughness: 0.95, flatShading: true });
    for (let k = 0; k < 5; k += 1) {
      const a = (k / 5) * Math.PI * 2;
      const shard = part(new ConeGeometry(0.018, 0.05, 5), stone, Math.cos(a) * 0.13, 1.08 + Math.sin(a * 3) * 0.02, Math.sin(a) * 0.13 - 0.02);
      shard.rotation.set(a, 0, 0.5);
      root.add(shard);
    }
    const rock = part(new SphereGeometry(0.07, 7, 5), stone, 0.27, 1.12, 0.05);
    rock.scale.set(1.1, 0.8, 0.9);
    root.add(rock, part(new SphereGeometry(0.03, 10, 8), accent, 0.2, 0.9, 0.05));
    // Raised casting arm under the rock.
    const raised = part(new CapsuleGeometry(0.03, 0.15, 4, 10), suit, 0.2, 0.86, 0.02);
    raised.rotation.z = -0.5;
    root.add(raised);
  } else {
    // Big white eye lenses and web-line rings across the suit.
    for (const side of [-1, 1]) {
      const lens = part(new SphereGeometry(0.025, 12, 8), new MeshStandardMaterial({ color: '#F4FAFF', emissive: '#F4FAFF', emissiveIntensity: 1.5 }), side * 0.03, 0.945, 0.06);
      lens.scale.set(1.3, 0.8, 0.5);
      root.add(lens);
    }
    for (let k = 0; k < 4; k += 1) {
      const ring = part(new TorusGeometry(0.105 - k * 0.006, 0.003, 4, 32), accent, 0, 0.58 + k * 0.06);
      ring.rotation.x = Math.PI / 2;
      ring.scale.z = 0.62;
      root.add(ring);
    }
    root.add(part(new SphereGeometry(0.02, 8, 6), accent, 0, 0.72, 0.085));
  }
  return root;
}

/** Glowing pedestal, origin at floor centre, top at 0.5 m. */
export function createPedestal(): Group {
  const root = new Group();
  root.name = 'Pedestal';
  const stone = new MeshStandardMaterial({ color: '#15161E', roughness: 0.35, metalness: 0.8 });
  const base = part(new CylinderGeometry(0.3, 0.36, 0.46, 32), stone, 0, 0.23);
  const rim = part(new TorusGeometry(0.3, 0.012, 8, 64), accentMaterial('#3DF5FF'), 0, 0.47);
  rim.rotation.x = Math.PI / 2;
  rim.name = 'Rim';
  const top = part(new CylinderGeometry(0.29, 0.29, 0.04, 32), stone, 0, 0.48);
  root.add(base, rim, top);
  return root;
}
