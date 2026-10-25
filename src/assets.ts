import { AssetType, defineAssets } from '@iwsdk/core';
import { createAlien } from './scene-assets/aliens.scene-asset.js';
import { createArena } from './scene-assets/arena.scene-asset.js';
import {
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
import { createHeroFigure, createPedestal } from './scene-assets/heroes.scene-asset.js';
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
  'alien-grunt': createAlien('grunt'),
  'alien-brute': createAlien('brute'),
  'alien-stalker': createAlien('stalker'),
  'alien-colossus': createAlien('colossus'),
  'boss-neon-grid': createBoss('#FF2E8C'),
  'boss-ember-foundry': createBoss('#FF6A00'),
  'boss-storm-peak': createBoss('#B6A6FF'),
  'boss-frost-spire': createBoss('#9FE8FF'),
  'boss-void-rift': createBoss('#C04DFF'),
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
});
