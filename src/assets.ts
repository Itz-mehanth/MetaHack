import { AssetType, defineAssets } from '@iwsdk/core';
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
 * Pieces and ghosts follow the `piece-<shape>` / `ghost-<shape>` naming that
 * the puzzle systems use to spawn a level's shapes from its data.
 */
export default defineAssets({
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
