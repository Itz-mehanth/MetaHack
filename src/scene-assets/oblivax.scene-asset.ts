import {
  BoxGeometry,
  CapsuleGeometry,
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
 * OBLIVAX, the Unmaker: a floating cosmic titan seen from the waist up,
 * about 3 m tall. Origin at the chest core; faces +Z. Obsidian armour with
 * glowing fissures, a crown of shards, a halo ring (`Ring`), a void core in
 * the chest (`Eye`) and two huge open hands. Original design.
 */
export function createOblivax(): Group {
  const root = new Group();
  root.name = 'Oblivax';
  const armor = new MeshStandardMaterial({ color: '#16121F', roughness: 0.3, metalness: 0.85 });
  const plate = new MeshStandardMaterial({ color: '#2A2238', roughness: 0.35, metalness: 0.9 });
  const gold = new MeshStandardMaterial({ color: '#C9A24A', roughness: 0.3, metalness: 1 });
  const glow = new MeshStandardMaterial({ color: '#FF4FD8', emissive: '#FF4FD8', emissiveIntensity: 3 });
  const white = new MeshStandardMaterial({ color: '#FFFFFF', emissive: '#FFE8FF', emissiveIntensity: 3 });

  const body = new Group();
  body.name = 'Body';
  // Torso: broad chest tapering into a smoky waist.
  const chest = new Mesh(new CylinderGeometry(0.62, 0.38, 1.1, 10), armor);
  chest.scale.z = 0.62;
  chest.position.y = 0.05;
  chest.name = 'Body';
  const waist = new Mesh(new ConeGeometry(0.4, 0.9, 10), armor);
  waist.rotation.x = Math.PI;
  waist.scale.z = 0.6;
  waist.position.y = -0.9;
  body.add(chest, waist);
  // Layered chest plates and glowing fissures.
  for (const side of [-1, 1]) {
    const pec = new Mesh(new BoxGeometry(0.46, 0.34, 0.08), plate);
    pec.position.set(side * 0.26, 0.28, 0.33);
    pec.rotation.set(-0.15, side * 0.25, side * 0.12);
    body.add(pec);
    const crack = new Mesh(new BoxGeometry(0.02, 0.5, 0.02), glow);
    crack.position.set(side * 0.18, -0.15, 0.34);
    crack.rotation.z = side * 0.35;
    body.add(crack);
    // Massive pauldrons with spikes.
    const shoulder = new Mesh(new SphereGeometry(0.3, 16, 12), plate);
    shoulder.position.set(side * 0.78, 0.48, 0);
    shoulder.scale.set(1.2, 0.85, 1);
    body.add(shoulder);
    for (let k = 0; k < 3; k += 1) {
      const spike = new Mesh(new ConeGeometry(0.06, 0.38 - k * 0.07, 6), gold);
      spike.position.set(side * (0.7 + k * 0.13), 0.75 - k * 0.04, -0.05);
      spike.rotation.z = side * -(0.3 + k * 0.3);
      body.add(spike);
    }
    // Arms reaching forward, ending in open hands.
    const upper = new Mesh(new CapsuleGeometry(0.15, 0.55, 6, 12), armor);
    upper.position.set(side * 0.95, 0.05, 0.15);
    upper.rotation.set(0.6, 0, side * 0.35);
    const fore = new Mesh(new CapsuleGeometry(0.13, 0.5, 6, 12), plate);
    fore.position.set(side * 1.05, -0.3, 0.6);
    fore.rotation.set(1.3, 0, side * 0.1);
    const palm = new Mesh(new BoxGeometry(0.3, 0.08, 0.32), armor);
    palm.position.set(side * 1.08, -0.38, 1.0);
    palm.rotation.x = 0.3;
    const palmGlow = new Mesh(new SphereGeometry(0.07, 12, 8), glow);
    palmGlow.position.set(side * 1.08, -0.33, 1.0);
    body.add(upper, fore, palm, palmGlow);
    for (let f = 0; f < 4; f += 1) {
      const finger = new Mesh(new CapsuleGeometry(0.032, 0.2, 4, 8), plate);
      finger.position.set(side * (0.97 + f * 0.07), -0.36, 1.25);
      finger.rotation.x = 1.5;
      body.add(finger);
    }
  }
  root.add(body);

  // Void core in the chest: pulses as the boss "eye".
  const eye = new Group();
  eye.name = 'Eye';
  eye.position.set(0, 0.12, 0.38);
  const core = new Mesh(new IcosahedronGeometry(0.16, 1), white);
  const coreRing = new Mesh(new TorusGeometry(0.22, 0.025, 8, 32), glow);
  eye.add(core, coreRing);
  root.add(eye);

  // Head: long faceless mask with a vertical eye slit and a shard crown.
  const head = new Mesh(new CapsuleGeometry(0.2, 0.22, 8, 16), armor);
  head.name = 'Head';
  head.position.y = 0.92;
  head.scale.set(1, 1, 0.85);
  root.add(head);
  const mask = new Mesh(new BoxGeometry(0.3, 0.38, 0.06), plate);
  mask.position.set(0, 0.9, 0.17);
  root.add(mask);
  const slit = new Mesh(new BoxGeometry(0.035, 0.22, 0.02), white);
  slit.position.set(0, 0.93, 0.205);
  root.add(slit);
  for (let k = -3; k <= 3; k += 1) {
    const shard = new Mesh(new ConeGeometry(0.035, 0.32 - Math.abs(k) * 0.035, 5), gold);
    const a = k * 0.32;
    shard.position.set(Math.sin(a) * 0.2, 1.22 - Math.abs(k) * 0.03, Math.cos(a) * 0.05 - 0.02);
    shard.rotation.z = -a * 0.6;
    root.add(shard);
  }

  // Halo ring behind the head, spun by the boss AI.
  const ring = new Group();
  ring.name = 'Ring';
  ring.position.set(0, 0.95, -0.35);
  const halo = new Mesh(new TorusGeometry(0.62, 0.03, 8, 64), glow);
  const inner = new Mesh(new TorusGeometry(0.5, 0.012, 6, 64), gold);
  ring.add(halo, inner);
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const tooth = new Mesh(new ConeGeometry(0.035, 0.16, 4), gold);
    tooth.position.set(Math.cos(a) * 0.7, Math.sin(a) * 0.7, 0);
    tooth.rotation.z = a - Math.PI / 2;
    ring.add(tooth);
  }
  root.add(ring);
  return root;
}
