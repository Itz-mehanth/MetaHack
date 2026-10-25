import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  type Material,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  SphereGeometry,
  TorusGeometry,
} from '@iwsdk/core';

/**
 * Original humanoid alien enemies of the Hollow Legion, with believable
 * anatomy: pelvis, tapered abdomen and ribcage, pectoral and deltoid mass,
 * neck, elongated skull with almond eyes, four-fingered hands, digitigrade
 * toes, plus armour plates. The origin is the chest centre (hit tests aim
 * at the torso); feet are at y = -CHEST * scale.
 *
 * Rig (all pivots are Groups): `Upper` (everything above the waist; the
 * waist-cut piece), `Head`, `ArmL/R` (shoulders) with `ElbowL/R`, `LegL/R`
 * (hips) with `KneeL/R`. `BladeBase`/`BladeTip` mark the right-hand strike
 * edge (sword, claws or rifle butt) for parries; `Muzzle` is the gun tip.
 * Each rigid part's meshes are merged per material to keep draw calls low.
 */

export type AlienVariant = 'grunt' | 'brute' | 'stalker' | 'colossus' | 'reaver';

/** Chest height above the feet before scaling. */
export const CHEST = 1.15;

const STYLE: Record<AlienVariant, { skin: string; armor: string; glow: string; scale: number; bulk: number }> = {
  grunt: { skin: '#5F7A6E', armor: '#2C2140', glow: '#B6FF3D', scale: 1, bulk: 1 },
  brute: { skin: '#6E5A52', armor: '#3A2A1E', glow: '#FF8A1F', scale: 1.15, bulk: 1.35 },
  stalker: { skin: '#4A4A5E', armor: '#1A1424', glow: '#FF2D4D', scale: 0.92, bulk: 0.8 },
  colossus: { skin: '#57506E', armor: '#241C38', glow: '#B47CFF', scale: 1.5, bulk: 1.35 },
  reaver: { skin: '#353A48', armor: '#2A1420', glow: '#FF3355', scale: 1.02, bulk: 1.05 },
};

function mesh(geometry: BufferGeometry, material: Material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1): Mesh {
  const m = new Mesh(geometry, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.scale.set(sx, sy, sz);
  return m;
}

/** Merges a group's direct mesh children into one mesh per material. */
function bake(group: Group, name?: string): void {
  const buckets = new Map<Material, Mesh[]>();
  for (const child of [...group.children]) {
    const m = child as Mesh;
    if (!m.isMesh) continue;
    const material = m.material as Material;
    if (!buckets.has(material)) buckets.set(material, []);
    buckets.get(material)!.push(m);
    group.remove(m);
  }
  for (const [material, meshes] of buckets) {
    const parts: BufferGeometry[] = [];
    let count = 0;
    for (const m of meshes) {
      m.updateMatrix();
      const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrix);
      parts.push(g);
      count += g.attributes.position.count;
    }
    const position = new Float32Array(count * 3);
    const normal = new Float32Array(count * 3);
    const uv = new Float32Array(count * 2);
    let offset = 0;
    for (const g of parts) {
      const n = g.attributes.position.count;
      position.set(g.attributes.position.array as Float32Array, offset * 3);
      normal.set(g.attributes.normal.array as Float32Array, offset * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array as Float32Array, offset * 2);
      offset += n;
    }
    const merged = new BufferGeometry();
    merged.setAttribute('position', new BufferAttribute(position, 3));
    merged.setAttribute('normal', new BufferAttribute(normal, 3));
    merged.setAttribute('uv', new BufferAttribute(uv, 2));
    merged.computeBoundingSphere();
    const out = new Mesh(merged, material);
    if (name && (material as MeshStandardMaterial).name === 'skin') out.name = name;
    group.add(out);
  }
}

interface Mats {
  skin: MeshStandardMaterial;
  armor: MeshStandardMaterial;
  glow: MeshStandardMaterial;
  dark: MeshStandardMaterial;
}

/** Four-fingered hand at the end of a forearm, fingers curled to grip (+Z forward). */
function hand(target: Group, m: Mats, y: number, bulk: number, claws: boolean): void {
  const s = bulk;
  target.add(mesh(new BoxGeometry(0.075 * s, 0.085, 0.032 * s), m.skin, 0, y - 0.04, 0.005));
  for (let f = 0; f < 4; f += 1) {
    const x = (-0.027 + f * 0.018) * s;
    if (claws) {
      target.add(mesh(new ConeGeometry(0.009, 0.2, 4), m.glow, x, y - 0.17, 0.03, Math.PI - 0.15));
    } else {
      // Proximal and distal segments curled around a grip.
      target.add(mesh(new CapsuleGeometry(0.0095 * s, 0.03, 2, 6), m.skin, x, y - 0.095, 0.018, 0.9));
      target.add(mesh(new CapsuleGeometry(0.0085 * s, 0.022, 2, 6), m.skin, x, y - 0.1, 0.05, 2.4));
    }
  }
  target.add(mesh(new CapsuleGeometry(0.011 * s, 0.035, 2, 6), m.skin, -0.045 * s, y - 0.06, 0.03, 0.6, 0, 0.7));
}

/** Shoulder pivot with upper arm, elbow joint, forearm and hand. */
function arm(m: Mats, side: number, bulk: number, claws: boolean): Group {
  const pivot = new Group();
  pivot.name = side < 0 ? 'ArmL' : 'ArmR';
  const upper = 0.3;
  const fore = 0.27;
  pivot.add(mesh(new SphereGeometry(0.06 * bulk, 10, 8), m.skin, 0, -0.01, 0, 0, 0, 0, 1.15, 1, 1));
  pivot.add(mesh(new CylinderGeometry(0.05 * bulk, 0.04 * bulk, upper - 0.04, 10), m.skin, 0, -upper / 2));
  // Biceps / triceps mass.
  pivot.add(mesh(new SphereGeometry(0.045 * bulk, 10, 8), m.skin, 0, -upper * 0.45, 0.018, 0, 0, 0, 1, 1.9, 1));
  pivot.add(mesh(new BoxGeometry(0.1 * bulk, 0.12, 0.1 * bulk), m.armor, side * 0.008, -0.05, 0, 0, 0, side * -0.25));
  bake(pivot);
  const elbow = new Group();
  elbow.name = side < 0 ? 'ElbowL' : 'ElbowR';
  elbow.position.y = -upper;
  elbow.add(mesh(new SphereGeometry(0.042 * bulk, 8, 6), m.skin));
  elbow.add(mesh(new CylinderGeometry(0.042 * bulk, 0.032 * bulk, fore, 10), m.skin, 0, -fore / 2));
  elbow.add(mesh(new SphereGeometry(0.04 * bulk, 8, 6), m.skin, 0, -fore * 0.3, 0.012, 0, 0, 0, 1, 2.2, 1));
  // Bracer.
  elbow.add(mesh(new CylinderGeometry(0.05 * bulk, 0.045 * bulk, fore * 0.55, 10), m.armor, 0, -fore * 0.6));
  elbow.add(mesh(new TorusGeometry(0.05 * bulk, 0.006, 4, 16), m.glow, 0, -fore * 0.35, 0, Math.PI / 2));
  hand(elbow, m, -fore, bulk, claws);
  bake(elbow);
  pivot.add(elbow);
  return pivot;
}

/** Hip pivot with thigh, knee joint, shin and a three-toed foot. */
function leg(m: Mats, side: number, bulk: number): Group {
  const pivot = new Group();
  pivot.name = side < 0 ? 'LegL' : 'LegR';
  const thigh = 0.44;
  const shin = 0.42;
  pivot.add(mesh(new SphereGeometry(0.075 * bulk, 10, 8), m.skin));
  pivot.add(mesh(new CylinderGeometry(0.075 * bulk, 0.055 * bulk, thigh, 10), m.skin, 0, -thigh / 2));
  // Quadriceps and a thigh plate.
  pivot.add(mesh(new SphereGeometry(0.06 * bulk, 10, 8), m.skin, 0, -thigh * 0.4, 0.03, 0, 0, 0, 1, 2.6, 1));
  pivot.add(mesh(new BoxGeometry(0.12 * bulk, thigh * 0.5, 0.06), m.armor, side * 0.01, -thigh * 0.35, 0.05 * bulk));
  bake(pivot);
  const knee = new Group();
  knee.name = side < 0 ? 'KneeL' : 'KneeR';
  knee.position.y = -thigh;
  knee.add(mesh(new SphereGeometry(0.055 * bulk, 8, 6), m.armor, 0, 0, 0.03));
  knee.add(mesh(new CylinderGeometry(0.052 * bulk, 0.036 * bulk, shin, 10), m.skin, 0, -shin / 2));
  // Calf muscle behind, greave in front.
  knee.add(mesh(new SphereGeometry(0.048 * bulk, 10, 8), m.skin, 0, -shin * 0.3, -0.025, 0, 0, 0, 1, 2.4, 1));
  knee.add(mesh(new BoxGeometry(0.08 * bulk, shin * 0.6, 0.04), m.armor, 0, -shin * 0.42, 0.045 * bulk));
  // Foot: heel pad and three clawed toes.
  knee.add(mesh(new BoxGeometry(0.09 * bulk, 0.05, 0.1 * bulk), m.dark, 0, -shin - 0.01, 0.02));
  for (let t = -1; t <= 1; t += 1) {
    knee.add(mesh(new CapsuleGeometry(0.018 * bulk, 0.07 * bulk, 2, 6), m.dark, t * 0.03 * bulk, -shin - 0.02, 0.1 * bulk, Math.PI / 2, t * 0.2));
  }
  bake(knee);
  pivot.add(knee);
  return pivot;
}

export function createAlien(variant: AlienVariant): Group {
  const style = STYLE[variant];
  const skin = new MeshStandardMaterial({ color: style.skin, roughness: 0.7, metalness: 0.1 });
  skin.name = 'skin';
  const armor = new MeshStandardMaterial({ color: style.armor, roughness: 0.35, metalness: 0.85 });
  const glow = new MeshStandardMaterial({ color: style.glow, emissive: style.glow, emissiveIntensity: 3, roughness: 0.3 });
  const dark = new MeshStandardMaterial({ color: '#1A1A20', roughness: 0.6, metalness: 0.4 });
  const m: Mats = { skin, armor, glow, dark };
  const bulk = style.bulk;
  const stalker = variant === 'stalker';
  const reaver = variant === 'reaver';

  const root = new Group();
  root.name = `Alien-${variant}`;
  const figure = new Group();
  figure.scale.setScalar(style.scale);
  root.add(figure);

  // ---- lower body: pelvis, belt and legs (stay behind on a waist cut).
  const pelvis = new Group();
  pelvis.add(mesh(new SphereGeometry(0.13 * bulk, 12, 10), skin, 0, -0.2, 0, 0, 0, 0, 1.1, 0.75, 0.8));
  pelvis.add(mesh(new CylinderGeometry(0.14 * bulk, 0.15 * bulk, 0.07, 14), armor, 0, -0.16));
  pelvis.add(mesh(new BoxGeometry(0.12 * bulk, 0.14, 0.03), armor, 0, -0.26, 0.11 * bulk));
  pelvis.add(mesh(new SphereGeometry(0.022, 8, 6), glow, 0, -0.16, 0.15 * bulk));
  bake(pelvis);
  figure.add(pelvis);
  for (const side of [-1, 1]) {
    const l = leg(m, side, bulk);
    l.position.set(side * 0.1 * bulk, -0.24, 0);
    figure.add(l);
  }

  // ---- upper body: abdomen, ribcage, pecs, shoulders, neck, head, arms.
  const upper = new Group();
  upper.name = 'Upper';
  figure.add(upper);
  const torso = new Group();
  torso.add(mesh(new CylinderGeometry(0.13 * bulk, 0.115 * bulk, 0.2, 14), skin, 0, -0.07, 0, 0, 0, 0, 1, 1, 0.75));
  torso.add(mesh(new SphereGeometry(0.17 * bulk, 16, 12), skin, 0, 0.1, 0, 0, 0, 0, 1.15, 1, 0.78));
  for (const side of [-1, 1]) {
    torso.add(mesh(new SphereGeometry(0.075 * bulk, 10, 8), skin, side * 0.075 * bulk, 0.13, 0.08 * bulk, 0, 0, 0, 1.2, 0.8, 0.6));
    // Deltoid and pauldron.
    torso.add(mesh(new SphereGeometry(0.07 * bulk, 10, 8), skin, side * 0.21 * bulk, 0.22, 0));
    torso.add(mesh(new SphereGeometry(0.085 * bulk, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), armor, side * 0.22 * bulk, 0.235, 0, 0, 0, side * -0.4, 1.1, 0.8, 1.1));
  }
  // Abdominal segments and chest armour.
  for (let k = 0; k < 3; k += 1) torso.add(mesh(new BoxGeometry(0.11 * bulk, 0.045, 0.02), armor, 0, -0.03 - k * 0.055, 0.1 * bulk));
  torso.add(mesh(new BoxGeometry(0.3 * bulk, 0.16, 0.05), armor, 0, 0.13, 0.11 * bulk, -0.15));
  torso.add(mesh(new BoxGeometry(0.28 * bulk, 0.28, 0.05), armor, 0, 0.06, -0.11 * bulk));
  torso.add(mesh(new SphereGeometry(0.03, 10, 8), glow, 0, 0.13, 0.145 * bulk));
  torso.add(mesh(new CylinderGeometry(0.045 * bulk, 0.06 * bulk, 0.12, 10), skin, 0, 0.3, 0.005));
  if (variant === 'brute' || variant === 'colossus') {
    for (const side of [-1, 1]) torso.add(mesh(new ConeGeometry(0.035, 0.16, 5), armor, side * 0.28 * bulk, 0.34, 0, 0, 0, side * -0.6));
  }
  bake(torso, 'Body');
  upper.add(torso);

  const head = new Group();
  head.name = 'Head';
  head.position.y = 0.42;
  head.add(mesh(new SphereGeometry(0.1, 16, 12), skin, 0, 0.02, -0.03, -0.45, 0, 0, 0.88, 1.15, 1.35));
  head.add(mesh(new SphereGeometry(0.07, 12, 8), skin, 0, -0.04, 0.05, 0, 0, 0, 0.9, 1, 0.9));
  head.add(mesh(new BoxGeometry(0.09, 0.05, 0.07), armor, 0, -0.08, 0.06));
  for (const side of [-1, 1]) {
    // Cheekbone ridges.
    head.add(mesh(new CapsuleGeometry(0.012, 0.05, 2, 6), skin, side * 0.055, -0.02, 0.07, 0, side * 0.5, Math.PI / 2));
  }
  if (reaver) {
    head.add(mesh(new BoxGeometry(0.2, 0.06, 0.16), armor, 0, 0.09, -0.02));
    head.add(mesh(new ConeGeometry(0.02, 0.24, 4), glow, 0, 0.2, 0.02, -0.3, 0, 0, 3, 1, 1));
  } else {
    head.add(mesh(new ConeGeometry(0.045, 0.2, 6), armor, 0, 0.12, -0.12, -1.15));
  }
  bake(head);
  const eyes = new Group();
  eyes.name = 'Eye';
  for (const side of [-1, 1]) eyes.add(mesh(new SphereGeometry(0.018, 10, 8), glow, side * 0.035, 0.0, 0.088, 0, 0, side * 0.35, 1.6, 0.7, 0.6));
  head.add(eyes);
  upper.add(head);

  for (const side of [-1, 1]) {
    const a = arm(m, side, bulk, stalker);
    a.position.set(side * 0.24 * bulk, 0.22, 0);
    upper.add(a);
  }
  const armL = upper.getObjectByName('ArmL')!;
  const armR = upper.getObjectByName('ArmR')!;
  const elbowL = upper.getObjectByName('ElbowL')!;
  const elbowR = upper.getObjectByName('ElbowR')!;
  const strike = (target: Object3D, y: number, length: number) => {
    const base = new Group();
    base.name = 'BladeBase';
    base.position.set(0, y, 0.04);
    const tip = new Group();
    tip.name = 'BladeTip';
    tip.position.set(0, y - 0.04, 0.04 + length);
    target.add(base, tip);
  };

  if (stalker) {
    // Hunched sprinter, claws forward.
    upper.rotation.x = 0.35;
    armL.rotation.x = -0.7;
    armR.rotation.x = -0.7;
    elbowL.rotation.x = -0.5;
    elbowR.rotation.x = -0.5;
    strike(elbowR, -0.3, 0.2);
  } else if (reaver) {
    // Energy sword in the right hand, small buckler on the left forearm.
    armR.rotation.x = -0.4;
    elbowR.rotation.x = -0.9;
    armL.rotation.x = -0.3;
    elbowL.rotation.x = -1.2;
    const sword = new Group();
    sword.name = 'Sword';
    sword.position.set(0, -0.36, 0.03);
    sword.add(mesh(new CylinderGeometry(0.013, 0.015, 0.16, 8), dark, 0, 0, 0, Math.PI / 2));
    sword.add(mesh(new BoxGeometry(0.09, 0.016, 0.02), armor, 0, 0, 0.09));
    sword.add(mesh(new BoxGeometry(0.008, 0.03, 0.72), glow, 0, 0, 0.47));
    sword.add(mesh(new ConeGeometry(0.016, 0.07, 4), glow, 0, 0, 0.86, Math.PI / 2, 0, 0, 1, 1, 0.5));
    bake(sword);
    elbowR.add(sword);
    strike(sword, 0, 0.82);
    sword.getObjectByName('BladeBase')!.position.set(0, 0, 0.1);
    sword.getObjectByName('BladeTip')!.position.set(0, 0, 0.88);
    const buckler = new Group();
    buckler.position.set(0, -0.17, 0.05);
    buckler.add(mesh(new CylinderGeometry(0.11, 0.11, 0.02, 16), armor, 0, 0, 0, Math.PI / 2));
    buckler.add(mesh(new TorusGeometry(0.11, 0.008, 4, 20), glow));
    bake(buckler);
    elbowL.add(buckler);
  } else {
    // Rifle held across the body, aimed forward (+Z).
    armR.rotation.x = -1.2;
    armL.rotation.x = -1.05;
    armL.rotation.z = 0.5;
    elbowL.rotation.x = -0.3;
    const big = variant === 'colossus' ? 1.6 : variant === 'brute' ? 1.25 : 1;
    const gun = new Group();
    gun.name = 'Gun';
    gun.position.set(0.12 * bulk, 0.0, 0.3);
    gun.add(mesh(new BoxGeometry(0.06 * big, 0.08 * big, 0.42 * big), armor));
    gun.add(mesh(new CylinderGeometry(0.018 * big, 0.022 * big, 0.2, 8), armor, 0, 0.01, 0.28 * big, Math.PI / 2));
    gun.add(mesh(new BoxGeometry(0.04 * big, 0.1 * big, 0.06), dark, 0, -0.07 * big, -0.06));
    gun.add(mesh(new BoxGeometry(0.065 * big, 0.02, 0.3 * big), glow, 0, 0.045 * big, 0));
    bake(gun);
    const muzzle = new Group();
    muzzle.name = 'Muzzle';
    muzzle.position.z = 0.4 * big;
    gun.add(muzzle);
    upper.add(gun);
    // Rifle butt strike edge, on the right forearm.
    strike(elbowR, -0.27, 0.3);
  }
  return root;
}
