import { AssetType, defineAssets } from '@iwsdk/core';
import { createArena } from './scene-assets/arena.scene-asset.js';
import { createCore, createDrone, createSwarmer, createTitan } from './scene-assets/combat.scene-asset.js';
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
