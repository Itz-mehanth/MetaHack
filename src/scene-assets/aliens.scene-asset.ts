import {
  BoxGeometry,
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  type Material,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
} from '@iwsdk/core';

/**
 * Original humanoid alien enemies of the Hollow Legion. The origin is the
 * chest centre (so hit tests aim at the torso); the feet are at
 * y = -CHEST * scale. Named joints for the walk cycle: `LegL/R` (hip
 * pivots) with `KneeL/R`, `ArmL/R` (shoulder pivots); `Body` is the torso
 * (outlined), `Eye` the glowing visor, `Muzzle` the gun tip.
 */

export type AlienVariant = 'grunt' | 'brute' | 'stalker' | 'colossus';

/** Chest height above the feet before scaling. */
export const CHEST = 1.15;

const STYLE: Record<AlienVariant, { skin: string; armor: string; glow: string; scale: number }> = {
  grunt: { skin: '#5F7A6E', armor: '#2C2140', glow: '#B6FF3D', scale: 1 },
  brute: { skin: '#6E5A52', armor: '#3A2A1E', glow: '#FF8A1F', scale: 1.15 },
  stalker: { skin: '#4A4A5E', armor: '#1A1424', glow: '#FF2D4D', scale: 0.92 },
  colossus: { skin: '#57506E', armor: '#241C38', glow: '#B47CFF', scale: 1.5 },
};

function mesh(geometry: ConstructorParameters<typeof Mesh>[0], material: Material, x = 0, y = 0, z = 0): Mesh {
  const m = new Mesh(geometry, material);
  m.position.set(x, y, z);
  return m;
}

function limb(skin: Material, armor: Material, side: number, kind: 'leg' | 'arm', bulk: number): Group {
  const isLeg = kind === 'leg';
  const upperLength = isLeg ? 0.45 : 0.3;
  const radius = (isLeg ? 0.07 : 0.05) * bulk;
  const pivot = new Group();
  pivot.name = `${isLeg ? 'Leg' : 'Arm'}${side < 0 ? 'L' : 'R'}`;
  const upper = mesh(new CapsuleGeometry(radius, upperLength - radius * 2, 4, 8), isLeg ? armor : skin, 0, -upperLength / 2);
  const joint = new Group();
  joint.name = `${isLeg ? 'Knee' : 'Elbow'}${side < 0 ? 'L' : 'R'}`;
  joint.position.y = -upperLength;
  const lower = mesh(new CapsuleGeometry(radius * 0.85, upperLength - radius * 2, 4, 8), skin, 0, -upperLength / 2);
  const guard = mesh(new BoxGeometry(radius * 2.4, upperLength * 0.55, radius * 2.2), armor, 0, -upperLength * 0.45, radius * 0.25);
  joint.add(lower, guard);
  if (isLeg) {
    joint.add(mesh(new BoxGeometry(0.12 * bulk, 0.06, 0.24 * bulk), armor, 0, -upperLength - 0.02, 0.05));
  } else {
    joint.add(mesh(new SphereGeometry(radius * 1.2, 8, 6), skin, 0, -upperLength));
  }
  pivot.add(upper, joint);
  return pivot;
}

export function createAlien(variant: AlienVariant): Group {
  const style = STYLE[variant];
  const skin = new MeshStandardMaterial({ color: style.skin, roughness: 0.75, metalness: 0.1 });
  const armor = new MeshStandardMaterial({ color: style.armor, roughness: 0.35, metalness: 0.85 });
  const glow = new MeshStandardMaterial({ color: style.glow, emissive: style.glow, emissiveIntensity: 3, roughness: 0.3 });
  const bulk = variant === 'brute' || variant === 'colossus' ? 1.35 : variant === 'stalker' ? 0.8 : 1;

  const root = new Group();
  root.name = `Alien-${variant}`;
  const figure = new Group();
  figure.scale.setScalar(style.scale);
  root.add(figure);

  // Torso and armour.
  const torso = mesh(new CapsuleGeometry(0.16 * bulk, 0.26, 4, 12), skin, 0, 0.05);
  torso.name = 'Body';
  torso.scale.z = 0.7;
  const chest = mesh(new BoxGeometry(0.34 * bulk, 0.26, 0.2 * bulk), armor, 0, 0.1, 0.04);
  const belt = mesh(new CylinderGeometry(0.15 * bulk, 0.15 * bulk, 0.06, 12), armor, 0, -0.17);
  const core = mesh(new SphereGeometry(0.035, 10, 8), glow, 0, 0.12, 0.15 * bulk);
  figure.add(torso, chest, belt, core);

  // Alien head: tall swept-back skull, glowing visor slit.
  const head = new Group();
  head.name = 'Head';
  head.position.y = 0.45;
  const skull = mesh(new SphereGeometry(0.11, 14, 10), skin, 0, 0.03, -0.02);
  skull.scale.set(0.9, 1.25, 1.2);
  skull.rotation.x = -0.35;
  const crest = mesh(new ConeGeometry(0.05, 0.22, 6), armor, 0, 0.14, -0.1);
  crest.rotation.x = -1.1;
  const visor = mesh(new BoxGeometry(0.16, 0.035, 0.05), glow, 0, 0.02, 0.09);
  visor.name = 'Eye';
  const jaw = mesh(new BoxGeometry(0.1, 0.06, 0.08), armor, 0, -0.06, 0.06);
  head.add(skull, crest, visor, jaw);
  figure.add(head);

  // Shoulders, arms and legs.
  for (const side of [-1, 1]) {
    figure.add(mesh(new SphereGeometry(0.085 * bulk, 10, 8), armor, side * 0.22 * bulk, 0.26));
    const arm = limb(skin, armor, side, 'arm', bulk);
    arm.position.set(side * 0.24 * bulk, 0.24, 0);
    const leg = limb(skin, armor, side, 'leg', bulk);
    leg.position.set(side * 0.1 * bulk, -0.22, 0);
    figure.add(arm, leg);
    if (variant === 'brute' || variant === 'colossus') {
      const spike = mesh(new ConeGeometry(0.04, 0.16, 5), armor, side * 0.3 * bulk, 0.36);
      spike.rotation.z = side * -0.6;
      figure.add(spike);
    }
  }

  const armL = figure.getObjectByName('ArmL')!;
  const armR = figure.getObjectByName('ArmR')!;
  if (variant === 'stalker') {
    // Hunched sprinter with long blade claws.
    torso.rotation.x = 0.35;
    head.position.z = 0.1;
    for (const arm of [armL, armR]) {
      arm.rotation.x = -0.6;
      const elbow = arm.getObjectByName(arm.name === 'ArmL' ? 'ElbowL' : 'ElbowR')!;
      for (let k = -1; k <= 1; k += 1) {
        const claw = mesh(new ConeGeometry(0.012, 0.22, 4), glow, k * 0.025, -0.42, 0.03);
        claw.rotation.x = Math.PI;
        elbow.add(claw);
      }
    }
  } else {
    // Rifle held at the hip, aimed forward (+Z).
    armR.rotation.x = -1.25;
    armL.rotation.x = -1.1;
    armL.rotation.z = 0.5;
    const big = variant === 'colossus' ? 1.6 : variant === 'brute' ? 1.25 : 1;
    const gun = new Group();
    gun.name = 'Gun';
    gun.position.set(0.12 * bulk, 0.02, 0.32);
    gun.add(mesh(new BoxGeometry(0.06 * big, 0.08 * big, 0.42 * big), armor));
    gun.add(mesh(new CylinderGeometry(0.018 * big, 0.022 * big, 0.2, 8), armor, 0, 0.01, 0.28 * big).rotateX(Math.PI / 2));
    gun.add(mesh(new BoxGeometry(0.065 * big, 0.02, 0.3 * big), glow, 0, 0.045 * big, 0));
    const muzzle = new Group();
    muzzle.name = 'Muzzle';
    muzzle.position.z = 0.4 * big;
    gun.add(muzzle);
    figure.add(gun);
  }
  return root;
}
