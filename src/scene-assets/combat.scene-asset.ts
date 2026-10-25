import {
  ConeGeometry,
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
