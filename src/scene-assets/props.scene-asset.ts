import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  TorusGeometry,
} from '@iwsdk/core';
import { bevelBox, makeRandom } from './lib/hardsurface.js';

/**
 * Heavy props PSION can lift and hurl: origin at the centre of mass, each
 * roughly 0.4-0.6 m across. `userData.radius` is the hit radius in metres.
 */

export type DebrisKind = 'crate' | 'barrel' | 'boulder' | 'girder';

const steel = new MeshStandardMaterial({ color: '#4A505E', roughness: 0.4, metalness: 0.9 });
const darkSteel = new MeshStandardMaterial({ color: '#23262E', roughness: 0.5, metalness: 0.85 });
const crateSide = new MeshStandardMaterial({ color: '#3B4A3A', roughness: 0.55, metalness: 0.7 });
const barrelPaint = new MeshStandardMaterial({ color: '#8A2A1C', roughness: 0.5, metalness: 0.7 });
const hazard = new MeshStandardMaterial({ color: '#E8B21F', roughness: 0.5, metalness: 0.6 });
const rock = new MeshStandardMaterial({ color: '#5B5248', roughness: 0.95, metalness: 0, flatShading: true });
const glowCrystal = new MeshStandardMaterial({ color: '#E05CFF', emissive: '#E05CFF', emissiveIntensity: 2.2 });

function crate(): Group {
  const g = new Group();
  const s = 0.46;
  g.add(new Mesh(bevelBox(s, s, s, 0.02), crateSide));
  // Steel edge frame and a cross brace on each side.
  for (const [x, y, z, w, h, d] of [
    [0, s / 2, s / 2, s + 0.02, 0.04, 0.04],
    [0, -s / 2, s / 2, s + 0.02, 0.04, 0.04],
    [0, s / 2, -s / 2, s + 0.02, 0.04, 0.04],
    [0, -s / 2, -s / 2, s + 0.02, 0.04, 0.04],
    [s / 2, 0, s / 2, 0.04, s, 0.04],
    [-s / 2, 0, s / 2, 0.04, s, 0.04],
    [s / 2, 0, -s / 2, 0.04, s, 0.04],
    [-s / 2, 0, -s / 2, 0.04, s, 0.04],
    [s / 2, s / 2, 0, 0.04, 0.04, s],
    [-s / 2, s / 2, 0, 0.04, 0.04, s],
    [s / 2, -s / 2, 0, 0.04, 0.04, s],
    [-s / 2, -s / 2, 0, 0.04, 0.04, s],
  ] as const) {
    const bar = new Mesh(new BoxGeometry(w, h, d), steel);
    bar.position.set(x, y, z);
    g.add(bar);
  }
  for (const side of [1, -1]) {
    const brace = new Mesh(new BoxGeometry(s * 1.25, 0.035, 0.015), darkSteel);
    brace.position.z = side * (s / 2 + 0.008);
    brace.rotation.z = side * Math.PI / 4;
    const stripe = new Mesh(new BoxGeometry(s * 0.5, 0.06, 0.01), hazard);
    stripe.position.set(0, s * 0.3, side * (s / 2 + 0.012));
    g.add(brace, stripe);
  }
  g.userData.radius = 0.3;
  return g;
}

function barrel(): Group {
  const g = new Group();
  g.add(new Mesh(new CylinderGeometry(0.2, 0.2, 0.56, 24), barrelPaint));
  for (const y of [-0.25, -0.09, 0.09, 0.25]) {
    const hoop = new Mesh(new TorusGeometry(0.202, 0.012, 6, 28), steel);
    hoop.rotation.x = Math.PI / 2;
    hoop.position.y = y;
    g.add(hoop);
  }
  const band = new Mesh(new CylinderGeometry(0.203, 0.203, 0.08, 24, 1, true), hazard);
  const lid = new Mesh(new CylinderGeometry(0.17, 0.17, 0.02, 20), darkSteel);
  lid.position.y = 0.285;
  const cap = new Mesh(new CylinderGeometry(0.03, 0.03, 0.03, 10), steel);
  cap.position.set(0.09, 0.3, 0);
  g.add(band, lid, cap);
  g.userData.radius = 0.3;
  return g;
}

function boulder(): Group {
  const g = new Group();
  const geometry = new IcosahedronGeometry(0.28, 1);
  const p = geometry.attributes.position;
  const random = makeRandom(7);
  // Deterministic lumps; shared vertices move together so faces stay closed.
  const offsets = new Map<string, number>();
  for (let i = 0; i < p.count; i += 1) {
    const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    let k = offsets.get(key);
    if (k == null) {
      k = 0.78 + random() * 0.38;
      offsets.set(key, k);
    }
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.82, p.getZ(i) * k);
  }
  geometry.computeVertexNormals();
  g.add(new Mesh(geometry, rock));
  // Psychic crystals growing out of the rock (Sky Ruins flavour).
  for (const [x, y, z, rx, rz] of [
    [0.12, 0.17, 0.05, 0.3, -0.5],
    [-0.1, 0.18, -0.06, -0.2, 0.6],
  ] as const) {
    const crystal = new Mesh(new CylinderGeometry(0, 0.035, 0.16, 5), glowCrystal);
    crystal.position.set(x, y, z);
    crystal.rotation.set(rx, 0, rz);
    g.add(crystal);
  }
  g.userData.radius = 0.32;
  return g;
}

function girder(): Group {
  const g = new Group();
  const length = 0.8;
  const flangeTop = new Mesh(new BoxGeometry(length, 0.02, 0.16), steel);
  flangeTop.position.y = 0.09;
  const flangeBottom = flangeTop.clone();
  flangeBottom.position.y = -0.09;
  const web = new Mesh(new BoxGeometry(length, 0.17, 0.025), steel);
  g.add(flangeTop, flangeBottom, web);
  for (let i = -3; i <= 3; i += 1) {
    const rivet = new Mesh(new CylinderGeometry(0.012, 0.012, 0.035, 8), darkSteel);
    rivet.rotation.x = Math.PI / 2;
    rivet.position.set(i * 0.11, 0, 0);
    g.add(rivet);
  }
  const stripe = new Mesh(new BoxGeometry(0.12, 0.172, 0.03), hazard);
  stripe.position.x = length / 2 - 0.08;
  g.add(stripe);
  g.userData.radius = 0.34;
  return g;
}

export function createDebris(kind: DebrisKind): Group {
  const root = kind === 'crate' ? crate() : kind === 'barrel' ? barrel() : kind === 'boulder' ? boulder() : girder();
  root.name = `Debris-${kind}`;
  return root;
}
