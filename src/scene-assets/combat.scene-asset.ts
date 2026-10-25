import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
} from '@iwsdk/core';

/**
 * Original "Breacher" drone enemies and the start core. Each drone is centred
 * on its eye; children are named `Body`, `Eye`, `Ring` and `Fin-*` so the
 * combat system can spin the ring and pulse the eye.
 */

export const DRONE_RADIUS = 0.16;

const hullMaterial = new MeshStandardMaterial({
  color: '#1B1D24',
  roughness: 0.35,
  metalness: 0.85,
});
const armorMaterial = new MeshStandardMaterial({
  color: '#4A3A2A',
  roughness: 0.4,
  metalness: 0.9,
});

function glow(color: string, intensity: number): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.3,
  });
}

export function createDrone(armored: boolean): Group {
  const scale = armored ? 1.3 : 1;
  const eyeColor = armored ? '#FF8A1F' : '#FF2D6F';
  const root = new Group();
  root.name = armored ? 'DroneArmored' : 'Drone';

  const body = new Mesh(new IcosahedronGeometry(0.1 * scale, 1), armored ? armorMaterial : hullMaterial);
  body.name = 'Body';
  body.scale.set(1, 0.7, 1);

  const eye = new Mesh(new SphereGeometry(0.045 * scale, 20, 12), glow(eyeColor, 3));
  eye.name = 'Eye';
  eye.position.z = 0.075 * scale;

  const ring = new Mesh(new TorusGeometry(0.15 * scale, 0.008 * scale, 8, 48), glow('#3DF5FF', 2.5));
  ring.name = 'Ring';
  ring.rotation.x = Math.PI / 2;

  root.add(body, eye, ring);
  for (let i = 0; i < 3; i += 1) {
    const fin = new Mesh(new ConeGeometry(0.025 * scale, 0.12 * scale, 4), hullMaterial);
    fin.name = `Fin-${i}`;
    const angle = (i / 3) * Math.PI * 2 + Math.PI / 2;
    fin.position.set(Math.cos(angle) * 0.1 * scale, Math.sin(angle) * 0.07 * scale, -0.02);
    fin.rotation.z = angle - Math.PI / 2;
    root.add(fin);
  }
  return root;
}

/** Small, fast, spiky swarm bug for the Ember Foundry. Radius ~0.12 m. */
export function createSwarmer(): Group {
  const root = new Group();
  root.name = 'Swarmer';
  const shell = new MeshStandardMaterial({ color: '#2A0E08', roughness: 0.5, metalness: 0.6 });
  const body = new Mesh(new IcosahedronGeometry(0.06, 0), shell);
  body.name = 'Body';
  body.scale.set(1, 0.8, 1.3);
  const eye = new Mesh(new SphereGeometry(0.028, 14, 10), glow('#FFC02E', 3.5));
  eye.name = 'Eye';
  eye.position.z = 0.06;
  const ring = new Mesh(new TorusGeometry(0.085, 0.005, 6, 32), glow('#FF4D1A', 3));
  ring.name = 'Ring';
  ring.rotation.x = Math.PI / 2;
  root.add(body, eye, ring);
  const spike = new ConeGeometry(0.012, 0.07, 4);
  for (let i = 0; i < 6; i += 1) {
    const s = new Mesh(spike, glow('#FF4D1A', 1.5));
    s.name = `Spike-${i}`;
    const a = (i / 6) * Math.PI * 2;
    s.position.set(Math.cos(a) * 0.06, Math.sin(a) * 0.05, -0.02);
    s.rotation.z = a - Math.PI / 2;
    root.add(s);
  }
  return root;
}

/** Big armored storm titan for Storm Peak. Radius ~0.38 m. */
export function createTitan(): Group {
  const root = new Group();
  root.name = 'Titan';
  const plate = new MeshStandardMaterial({ color: '#23263A', roughness: 0.35, metalness: 0.9 });
  const body = new Mesh(new IcosahedronGeometry(0.24, 1), plate);
  body.name = 'Body';
  body.scale.set(1.1, 0.85, 1);
  const eye = new Mesh(new SphereGeometry(0.08, 24, 16), glow('#B6A6FF', 3.5));
  eye.name = 'Eye';
  eye.position.z = 0.2;
  const ring = new Group();
  ring.name = 'Ring';
  const ringGeometry = new TorusGeometry(0.36, 0.014, 8, 64);
  const outer = new Mesh(ringGeometry, glow('#7FD4FF', 2.5));
  outer.rotation.x = Math.PI / 2;
  const inner = new Mesh(ringGeometry, glow('#9D8CFF', 2.5));
  inner.scale.setScalar(0.8);
  inner.rotation.y = Math.PI / 2;
  ring.add(outer, inner);
  root.add(body, eye, ring);
  const shield = new IcosahedronGeometry(0.11, 0);
  for (let i = 0; i < 4; i += 1) {
    const s = new Mesh(shield, plate);
    s.name = `Shield-${i}`;
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    s.position.set(Math.cos(a) * 0.22, Math.sin(a) * 0.18, 0.08);
    s.scale.set(1, 1, 0.45);
    root.add(s);
  }
  return root;
}

/**
 * TEMPEST's storm hammer. Origin at the grip point; handle along +Y, head
 * (named `Head`) centred at y = 0.2 with its long axis along X.
 */
export function createHammer(): Group {
  const root = new Group();
  root.name = 'Hammer';
  const steel = new MeshStandardMaterial({ color: '#3A3F55', roughness: 0.25, metalness: 0.95 });
  const grip = new MeshStandardMaterial({ color: '#1A1420', roughness: 0.8, metalness: 0.1 });
  const rune = glow('#9D8CFF', 3);
  const spark = glow('#D9F2FF', 4);

  const handle = new Mesh(new CylinderGeometry(0.016, 0.018, 0.3, 12), grip);
  handle.name = 'Handle';
  handle.position.y = 0.04;
  const pommel = new Mesh(new IcosahedronGeometry(0.024, 1), spark);
  pommel.name = 'Pommel';
  pommel.position.y = -0.115;
  root.add(handle, pommel);
  for (let i = 0; i < 3; i += 1) {
    const band = new Mesh(new TorusGeometry(0.018, 0.004, 6, 16), rune);
    band.rotation.x = Math.PI / 2;
    band.position.y = -0.06 + i * 0.07;
    root.add(band);
  }

  const head = new Group();
  head.name = 'Head';
  head.position.y = 0.2;
  const block = new Mesh(new CylinderGeometry(0.05, 0.05, 0.17, 8), steel);
  block.rotation.z = Math.PI / 2;
  const capL = new Mesh(new CylinderGeometry(0.056, 0.05, 0.02, 8), steel);
  capL.rotation.z = Math.PI / 2;
  capL.position.x = -0.095;
  const capR = capL.clone();
  capR.position.x = 0.095;
  const faceL = new Mesh(new CylinderGeometry(0.03, 0.03, 0.004, 6), spark);
  faceL.rotation.z = Math.PI / 2;
  faceL.position.x = -0.107;
  const faceR = faceL.clone();
  faceR.position.x = 0.107;
  head.add(block, capL, capR, faceL, faceR);
  for (let i = 0; i < 4; i += 1) {
    const strip = new Mesh(new BoxGeometry(0.12, 0.006, 0.006), rune);
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    strip.position.set(0, Math.cos(a) * 0.051, Math.sin(a) * 0.051);
    head.add(strip);
  }
  root.add(head);
  return root;
}

/**
 * Lieutenant boss: a floating war-mech bust about 1.4 m tall, centred on its
 * chest core (named `Eye` so the shared enemy code can pulse it) with a
 * spinning halo named `Ring`. `color` is the villain's colour.
 */
export function createBoss(color: string): Group {
  const root = new Group();
  root.name = 'Boss';
  const plate = new MeshStandardMaterial({ color: '#1A1B26', roughness: 0.3, metalness: 0.95 });
  const trim = new MeshStandardMaterial({ color: '#5A5F78', roughness: 0.25, metalness: 1 });
  const energy = glow(color, 3.5);

  const body = new Mesh(new IcosahedronGeometry(0.36, 1), plate);
  body.name = 'Body';
  body.scale.set(1.3, 1, 0.8);
  const core = new Mesh(new SphereGeometry(0.11, 20, 14), energy);
  core.name = 'Eye';
  core.position.z = 0.28;
  const head = new Mesh(new BoxGeometry(0.26, 0.24, 0.24), plate);
  head.name = 'Head';
  head.position.y = 0.5;
  const visor = new Mesh(new BoxGeometry(0.22, 0.05, 0.02), energy);
  visor.position.set(0, 0.52, 0.13);
  for (const side of [-1, 1]) {
    const horn = new Mesh(new ConeGeometry(0.04, 0.22, 5), trim);
    horn.position.set(side * 0.12, 0.7, 0);
    horn.rotation.z = side * -0.5;
    const pauldron = new Mesh(new IcosahedronGeometry(0.17, 0), trim);
    pauldron.position.set(side * 0.55, 0.22, 0);
    pauldron.scale.set(1, 0.7, 1);
    const arm = new Mesh(new CylinderGeometry(0.07, 0.09, 0.5, 8), plate);
    arm.position.set(side * 0.62, -0.15, 0.08);
    arm.rotation.x = 0.5;
    const cannon = new Mesh(new CylinderGeometry(0.05, 0.05, 0.12, 10), energy);
    cannon.position.set(side * 0.62, -0.35, 0.22);
    cannon.rotation.x = 1.3;
    root.add(horn, pauldron, arm, cannon);
  }
  const ring = new Mesh(new TorusGeometry(0.75, 0.02, 8, 80), energy);
  ring.name = 'Ring';
  ring.rotation.x = Math.PI / 2;
  root.add(body, core, head, visor, ring);
  return root;
}

/** Boss energy orb projectile, radius ~0.1 m. */
export function createOrb(): Group {
  const root = new Group();
  root.name = 'Orb';
  const shell = new Mesh(new IcosahedronGeometry(0.07, 1), glow('#FF3B5C', 3));
  shell.name = 'Body';
  const eye = new Mesh(new SphereGeometry(0.04, 12, 8), glow('#FFF2C2', 4));
  eye.name = 'Eye';
  const ring = new Mesh(new TorusGeometry(0.1, 0.006, 6, 24), glow('#FF8A1F', 3));
  ring.name = 'Ring';
  root.add(shell, eye, ring);
  return root;
}

/**
 * Hostage pod: a hovering energy cage with a civilian inside. Centred on the
 * pod; `Bars` and `Civilian` are named for effects.
 */
export function createPod(): Group {
  const root = new Group();
  root.name = 'Pod';
  const frame = new MeshStandardMaterial({ color: '#2A2C38', roughness: 0.3, metalness: 0.9 });
  const bars = new Group();
  bars.name = 'Bars';
  const barMaterial = glow('#FF3B5C', 2.5);
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const bar = new Mesh(new CylinderGeometry(0.006, 0.006, 0.5, 4), barMaterial);
    bar.position.set(Math.cos(a) * 0.17, 0, Math.sin(a) * 0.17);
    bars.add(bar);
  }
  const top = new Mesh(new CylinderGeometry(0.2, 0.17, 0.05, 16), frame);
  top.position.y = 0.27;
  const bottom = top.clone();
  bottom.position.y = -0.27;
  const civilian = new Group();
  civilian.name = 'Civilian';
  const skin = new MeshStandardMaterial({ color: '#E8C9A8', roughness: 0.8 });
  const cloth = new MeshStandardMaterial({ color: '#4A78C8', roughness: 0.8 });
  const bodyMesh = new Mesh(new CylinderGeometry(0.05, 0.06, 0.2, 10), cloth);
  bodyMesh.position.y = -0.08;
  const head = new Mesh(new SphereGeometry(0.045, 12, 8), skin);
  head.position.y = 0.07;
  for (const side of [-1, 1]) {
    const arm = new Mesh(new CylinderGeometry(0.015, 0.015, 0.14, 6), cloth);
    arm.position.set(side * 0.07, 0.02, 0);
    arm.rotation.z = side * -2.4;
    civilian.add(arm);
  }
  civilian.add(bodyMesh, head);
  root.add(bars, top, bottom, civilian);
  return root;
}

/** Power-up pickup; `kind` picks the colour and icon shape. */
export function createPickup(kind: 'heal' | 'rapid' | 'power'): Group {
  const root = new Group();
  root.name = `Pickup-${kind}`;
  const color = kind === 'heal' ? '#39FF88' : kind === 'rapid' ? '#FFD23F' : '#FF3B5C';
  const shell = new Mesh(
    new IcosahedronGeometry(0.06, 1),
    new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2, transparent: true, opacity: 0.55 }),
  );
  shell.name = 'Body';
  const icon =
    kind === 'heal'
      ? new Mesh(new BoxGeometry(0.05, 0.015, 0.015), glow('#FFFFFF', 3))
      : kind === 'rapid'
        ? new Mesh(new ConeGeometry(0.02, 0.05, 3), glow('#FFFFFF', 3))
        : new Mesh(new IcosahedronGeometry(0.022, 0), glow('#FFFFFF', 3));
  icon.name = 'Icon';
  if (kind === 'heal') {
    const cross = new Mesh(new BoxGeometry(0.015, 0.05, 0.015), glow('#FFFFFF', 3));
    root.add(cross);
  }
  root.add(shell, icon);
  return root;
}

/** Floating energy core the player shoots to start or restart a run. */
export function createCore(): Group {
  const root = new Group();
  root.name = 'Core';
  const heart = new Mesh(new IcosahedronGeometry(0.11, 2), glow('#3DF5FF', 3));
  heart.name = 'Heart';
  const shell = new Mesh(
    new IcosahedronGeometry(0.17, 0),
    new MeshStandardMaterial({
      color: '#7FE9FF',
      emissive: '#1A8FFF',
      emissiveIntensity: 1.2,
      wireframe: true,
    }),
  );
  shell.name = 'Shell';
  root.add(heart, shell);
  return root;
}
