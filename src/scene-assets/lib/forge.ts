import type { FinishDef } from '../../combat/arsenal.js';
import { BoxGeometry, type BufferGeometry, CylinderGeometry, Mesh, MeshStandardMaterial, type Object3D, TorusGeometry } from '@iwsdk/core';

/**
 * Shared weapon materials, named by role so a finish (gilded, crystal,
 * infernal, void) can restyle any weapon at runtime: `metal` (main body),
 * `trim` (bright edges and fittings), `dark` (grips, vents, polymer),
 * `energy` (glowing channels) and `core` (white-hot centres).
 */
export interface Forge {
  metal: MeshStandardMaterial;
  trim: MeshStandardMaterial;
  dark: MeshStandardMaterial;
  energy: MeshStandardMaterial;
  core: MeshStandardMaterial;
}

export function forge(energy: string): Forge {
  const named = (name: string, m: MeshStandardMaterial) => {
    m.name = name;
    return m;
  };
  return {
    metal: named('metal', new MeshStandardMaterial({ color: '#3A3F4C', roughness: 0.22, metalness: 1 })),
    trim: named('trim', new MeshStandardMaterial({ color: '#C9CED8', roughness: 0.14, metalness: 1 })),
    dark: named('dark', new MeshStandardMaterial({ color: '#15171D', roughness: 0.6, metalness: 0.4 })),
    // Strong enough to glow, low enough to keep its colour instead of blowing out to white.
    energy: named('energy', new MeshStandardMaterial({ color: energy, emissive: energy, emissiveIntensity: 1.8, roughness: 0.3 })),
    core: named('core', new MeshStandardMaterial({ color: '#FFFFFF', emissive: '#FFF6E8', emissiveIntensity: 4 })),
  };
}

/** Adds a mesh to `parent` at a position and rotation; returns it. */
export function piece(parent: Object3D, geometry: BufferGeometry, material: MeshStandardMaterial, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): Mesh {
  const m = new Mesh(geometry, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}

/** A ring of `count` small boxes around the Z axis (vents, serrations, rivets). */
export function ringOf(parent: Object3D, count: number, radius: number, z: number, size: [number, number, number], material: MeshStandardMaterial): void {
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2;
    piece(parent, new BoxGeometry(size[0], size[1], size[2]), material, Math.cos(a) * radius, Math.sin(a) * radius, z, 0, 0, a);
  }
}

/** A band around a Z-axis barrel. */
export function band(parent: Object3D, radius: number, tube: number, z: number, material: MeshStandardMaterial, y = 0): Mesh {
  return piece(parent, new TorusGeometry(radius, tube, 8, 28), material, 0, y, z);
}

/** A Z-axis cylinder (barrels, shrouds). */
export function tube(parent: Object3D, r0: number, r1: number, length: number, material: MeshStandardMaterial, x: number, y: number, z: number, sides = 16): Mesh {
  return piece(parent, new CylinderGeometry(r1, r0, length, sides), material, x, y, z, Math.PI / 2);
}

/**
 * Restyles every role-named material under `root` with `finish`. Materials
 * are cloned once per mesh (the originals stay shared and untouched), and
 * the standard look is remembered so a weapon can switch back.
 */
export function applyFinish(root: Object3D, finish: FinishDef, energyFallback: string): void {
  root.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh || mesh.name === 'Outline') return;
    const source = mesh.material as MeshStandardMaterial;
    if (!source.isMeshStandardMaterial) return;
    const role = source.name || (source.emissiveIntensity >= 1.5 ? 'energy' : source.metalness >= 0.8 ? 'metal' : 'dark');
    if (role === 'core' || role === 'accent') return;
    let m = source;
    if (!mesh.userData.finished) {
      m = source.clone();
      mesh.material = m;
      mesh.userData.finished = true;
      mesh.userData.role = role;
      mesh.userData.base = { color: source.color.getHex(), metal: source.metalness, rough: source.roughness, emissive: source.emissive.getHex(), glow: source.emissiveIntensity };
    }
    const base = mesh.userData.base as { color: number; metal: number; rough: number; emissive: number; glow: number };
    const r = mesh.userData.role as string;
    if (r === 'energy') {
      // The finish's energy colour, else the weapon variant's, else the model's own.
      const variant = mesh.userData.variantGlow as number | undefined;
      if (finish.energy) {
        m.color.set(finish.energy);
        m.emissive.set(finish.energy);
      } else {
        m.color.setHex(variant ?? base.color);
        m.emissive.setHex(variant ?? base.emissive);
      }
      void energyFallback;
      return;
    }
    const spec = r === 'metal' ? finish.metal : r === 'trim' ? finish.trim : finish.dark;
    if (finish.id === 'standard') {
      m.color.setHex(base.color);
      m.metalness = base.metal;
      m.roughness = base.rough;
      m.emissive.setHex(base.emissive);
      m.emissiveIntensity = base.glow;
      return;
    }
    m.color.set(spec[0]);
    m.metalness = spec[1];
    m.roughness = spec[2];
    m.emissive.set(spec[3] > 0 ? spec[0] : '#000000');
    m.emissiveIntensity = spec[3];
  });
}
