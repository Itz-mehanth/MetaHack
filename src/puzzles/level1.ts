import { boxSymmetries, fromAxisAngle, IDENTITY } from '../gameplay/math.js';
import type { PuzzleDef } from './types.js';

/**
 * Level 1, "Forge Gate": two pillars, a lintel across them and a capstone on
 * top, built bottom-up. Poses are relative to the forge plate's top centre.
 * Pieces rest on the table 8 cm below the plate, either side of it, and
 * start lying down or turned so the player has to rotate them.
 */

const TABLE_Y = -0.08;
const LYING = fromAxisAngle([0, 0, 1], 90);

export const level1: PuzzleDef = {
  id: 'level-1',
  title: 'Forge Gate',
  shapes: {
    pillar: { symmetries: boxSymmetries([0.05, 0.18, 0.05]) },
    lintel: { symmetries: boxSymmetries([0.24, 0.05, 0.06]) },
    capstone: { symmetries: boxSymmetries([1, 1, 1]), freeRotation: true },
  },
  slots: [
    { id: 'pillar-left', shape: 'pillar', pose: { position: [-0.08, 0.09, 0], rotation: IDENTITY }, requires: [] },
    { id: 'pillar-right', shape: 'pillar', pose: { position: [0.08, 0.09, 0], rotation: IDENTITY }, requires: [] },
    { id: 'lintel', shape: 'lintel', pose: { position: [0, 0.205, 0], rotation: IDENTITY }, requires: ['pillar-left', 'pillar-right'] },
    { id: 'capstone', shape: 'capstone', pose: { position: [0, 0.265, 0], rotation: IDENTITY }, requires: ['lintel'] },
  ],
  pieces: [
    { id: 'pillar-a', shape: 'pillar', spawn: { position: [-0.3, TABLE_Y + 0.025, 0.05], rotation: LYING } },
    { id: 'pillar-b', shape: 'pillar', spawn: { position: [-0.3, TABLE_Y + 0.025, 0.15], rotation: LYING } },
    { id: 'lintel', shape: 'lintel', spawn: { position: [0.32, TABLE_Y + 0.025, 0.08], rotation: fromAxisAngle([0, 1, 0], 60) } },
    { id: 'capstone', shape: 'capstone', spawn: { position: [0.22, TABLE_Y + 0.035, 0.24], rotation: fromAxisAngle([0, 1, 0], 25) } },
  ],
  tolerance: { position: 0.04, angleDeg: 30 },
};
