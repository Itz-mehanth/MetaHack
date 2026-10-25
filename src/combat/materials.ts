import {
  AssetManager,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
  Vector2,
} from '@iwsdk/core';

/**
 * Realistic surfaces from CC0 Poly Haven texture maps (see CREDITS):
 * worn painted steel for metal parts, a pebbled leather normal for alien
 * skin, and a woven fabric normal for suits. Applied once per shared
 * material after models load; glowing (emissive) parts are left alone.
 */

export interface SurfaceMaps {
  metalColor: Texture;
  metalNormal: Texture;
  /** AO / roughness / metalness packed in R / G / B. */
  metalArm: Texture;
  skinNormal: Texture;
  fabricNormal: Texture;
}

const done = new WeakSet<Material>();

function prepare(texture: Texture, repeat: number, color = false): Texture {
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = 4;
  if (color) texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** Loads the texture set registered in the asset manifest (tex-*). */
export async function loadSurfaceMaps(): Promise<SurfaceMaps | null> {
  try {
    const [metalColor, metalNormal, metalArm, skinNormal, fabricNormal] = await Promise.all([
      AssetManager.loadTextureById('tex-metal-color'),
      AssetManager.loadTextureById('tex-metal-normal'),
      AssetManager.loadTextureById('tex-metal-arm'),
      AssetManager.loadTextureById('tex-skin-normal'),
      AssetManager.loadTextureById('tex-fabric-normal'),
    ]);
    return {
      metalColor: prepare(metalColor, 2, true),
      metalNormal: prepare(metalNormal, 2),
      metalArm: prepare(metalArm, 2),
      skinNormal: prepare(skinNormal, 3),
      fabricNormal: prepare(fabricNormal, 4),
    };
  } catch (error) {
    console.warn('[Materials] texture maps unavailable; keeping flat materials', error);
    return null;
  }
}

/**
 * Upgrades every standard material under `root`. `organic` picks the normal
 * map for non-metal surfaces ('skin' for aliens, 'fabric' otherwise).
 */
export function applyRealism(root: Object3D, maps: SurfaceMaps, organic: 'skin' | 'fabric'): void {
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const raw of materials) {
      const material = raw as MeshStandardMaterial;
      if (!material.isMeshStandardMaterial || done.has(material)) continue;
      done.add(material);
      const glowing = material.emissiveIntensity > 0.5 && material.emissive.getHex() !== 0;
      if (glowing || material.transparent) continue;
      if (material.metalness >= 0.6) {
        // Steel: dents and roughness/metal variation everywhere; the worn
        // painted albedo only on enemies, so heroes keep their own colours.
        material.normalMap = maps.metalNormal;
        material.normalScale = new Vector2(0.9, 0.9);
        material.roughnessMap = maps.metalArm;
        material.metalnessMap = maps.metalArm;
        material.roughness = 1;
        material.metalness = 1;
        if (organic === 'skin') {
          material.map = maps.metalColor;
          material.color.lerp(material.color.clone().setScalar(1), 0.35);
        }
      } else {
        material.normalMap = organic === 'skin' ? maps.skinNormal : maps.fabricNormal;
        material.normalScale = new Vector2(organic === 'skin' ? 0.8 : 0.5, organic === 'skin' ? 0.8 : 0.5);
      }
      material.needsUpdate = true;
    }
  });
}
