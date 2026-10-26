import { AssetType, defineAssets } from '@iwsdk/core';
import { createAlien } from './scene-assets/aliens.scene-asset.js';
import { createArena } from './scene-assets/arena.scene-asset.js';
import {
  createBlaster,
  createBoss,
  createCore,
  createDrone,
  createHammer,
  createOrb,
  createPickup,
  createPod,
  createSwarmer,
  createTitan,
} from './scene-assets/combat.scene-asset.js';
import { SPECIES } from './combat/creatures.js';
import { createDebris } from './scene-assets/props.scene-asset.js';
import { createOblivax } from './scene-assets/oblivax.scene-asset.js';
import { createHeroFigure, createPedestal } from './scene-assets/heroes.scene-asset.js';
import {
  createBowDisplay,
  createClawDisplay,
  createGauntletDisplay,
  createGun,
  createKatanaDisplay,
  createShield,
  createPsiDisplay,
  createWebShooterDisplay,
} from './scene-assets/weapons.scene-asset.js';
import {
  createForgePlate,
  createGhost,
  createPiece,
  createWorkTable,
} from './scene-assets/forge.scene-asset.js';

const publicAssetUrl = (filePath: string): string =>
  `${import.meta.env.BASE_URL}${filePath.replace(/^\/+/u, '')}`;

const uikitml = (fileName: string, name: string) => ({
  url: publicAssetUrl(`ui/${fileName}`),
  type: AssetType.UIKitML,
  name,
});

/**
 * Combat assets drive the game. The forge/puzzle assets belong to the parked
 * puzzle prototype and are kept registered so its code still resolves.
 */
export default defineAssets({
  arena: createArena(),
  drone: createDrone(false),
  'drone-armored': createDrone(true),
  swarmer: createSwarmer(),
  titan: createTitan(),
  hammer: createHammer(),
  blaster: createBlaster(),
  'weapon-arc': createGauntletDisplay(),
  'weapon-talon': createClawDisplay(),
  'weapon-orion': createBowDisplay(),
  'weapon-weaver': createWebShooterDisplay(),
  'weapon-ronin': createKatanaDisplay(),
  'gun-smg': createGun('smg'),
  'gun-shotgun': createGun('shotgun'),
  'gun-minigun': createGun('minigun'),
  'weapon-psion': createPsiDisplay(),
  'debris-crate': createDebris('crate'),
  'debris-barrel': createDebris('barrel'),
  'debris-boulder': createDebris('boulder'),
  'debris-girder': createDebris('girder'),
  'debris-explosive': createDebris('explosive'),
  'alien-grunt': createAlien('grunt'),
  'alien-brute': createAlien('brute'),
  'alien-stalker': createAlien('stalker'),
  'alien-colossus': createAlien('colossus'),
  'alien-reaver': createAlien('reaver'),
  'boss-neon-grid': createBoss('#FF2E8C'),
  'boss-ember-foundry': createBoss('#FF6A00'),
  'boss-storm-peak': createBoss('#B6A6FF'),
  'boss-frost-spire': createBoss('#9FE8FF'),
  'boss-void-rift': createBoss('#C04DFF'),
  'boss-scrap-wastes': createBoss('#FF5A1F'),
  'boss-moon-temple': createBoss('#FF3355'),
  'boss-sky-ruins': createBoss('#E05CFF'),
  'boss-iron-bastion': createBoss('#FF8A1F'),
  'boss-oblivion': createOblivax(),
  orb: createOrb(),
  pod: createPod(),
  'pickup-heal': createPickup('heal'),
  'pickup-rapid': createPickup('rapid'),
  'pickup-power': createPickup('power'),
  'hero-arc': createHeroFigure('arc'),
  'hero-talon': createHeroFigure('talon'),
  'hero-tempest': createHeroFigure('tempest'),
  'hero-orion': createHeroFigure('orion'),
  'hero-weaver': createHeroFigure('weaver'),
  'hero-havoc': createHeroFigure('havoc'),
  'hero-ronin': createHeroFigure('ronin'),
  'hero-psion': createHeroFigure('psion'),
  'hero-vanguard': createHeroFigure('vanguard'),
  'weapon-vanguard': createShield('#3D6BFF'),
  shield: createShield('#3D6BFF'),
  pedestal: createPedestal(),
  core: createCore(),
  'work-table': createWorkTable(),
  'forge-plate': createForgePlate(),
  'piece-pillar': createPiece('pillar'),
  'piece-lintel': createPiece('lintel'),
  'piece-capstone': createPiece('capstone'),
  'ghost-pillar': createGhost('pillar'),
  'ghost-lintel': createGhost('lintel'),
  'ghost-capstone': createGhost('capstone'),
  'welcome-panel': uikitml('welcome.uikitml', 'Welcome Panel'),
  // Rigged, animated creatures (CC0, Quaternius), loaded per world as it is entered.
  ...Object.fromEntries(
    SPECIES.map((species) => [
      `creature-${species.id}`,
      { url: publicAssetUrl(`creatures/${species.id}.glb`), type: AssetType.GLTF, priority: 'lazy' as const, name: species.name },
    ]),
  ),
  // CC0 Poly Haven surface maps (applied at runtime by combat/materials.ts).
  'tex-metal-color': { url: publicAssetUrl('textures/metal_plate_diffuse_1k.jpg'), type: AssetType.Texture },
  'tex-metal-normal': { url: publicAssetUrl('textures/metal_plate_nor_gl_1k.jpg'), type: AssetType.Texture },
  'tex-metal-arm': { url: publicAssetUrl('textures/metal_plate_arm_1k.jpg'), type: AssetType.Texture },
  'tex-skin-normal': { url: publicAssetUrl('textures/brown_leather_nor_gl_1k.jpg'), type: AssetType.Texture },
  'tex-fabric-normal': { url: publicAssetUrl('textures/fabric_leather_02_nor_gl_1k.jpg'), type: AssetType.Texture },
});
