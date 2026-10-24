import {
  BufferGeometry,
  CylinderGeometry,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  TorusGeometry,
} from '@iwsdk/core';
import { bevelBox } from './lib/hardsurface.js';

/**
 * Placeholder "Forge Gate" art for Level 1: the seated work table, the
 * hovering forge plate, the puzzle pieces and their translucent ghost slots.
 * Gameplay never depends on these visuals; it only knows piece shapes by id
 * (see src/puzzles), so the theme can be swapped by replacing this module.
 *
 * Piece and ghost prototypes are centred on their geometric centre, so a
 * slot's authored pose is the exact pose a snapped piece takes.
 */

export const TABLE_TOP_HEIGHT = 0.74;

/** Piece dimensions in metres, shared by pieces and their ghosts. */
export const PIECE_SIZE = {
  pillar: [0.05, 0.18, 0.05],
  lintel: [0.24, 0.05, 0.06],
  capstone: [0.07, 0.07, 0.07],
} as const;

const woodMaterial = new MeshStandardMaterial({
  color: '#6B4A33',
  roughness: 0.75,
});
const ironMaterial = new MeshStandardMaterial({
  color: '#2E3036',
  roughness: 0.45,
  metalness: 0.6,
});
const emberMaterial = new MeshStandardMaterial({
  color: '#FF7A2A',
  emissive: '#FF6A1A',
  emissiveIntensity: 1.6,
  roughness: 0.4,
});

const pieceMaterials = {
  pillar: new MeshStandardMaterial({
    color: '#C8743A',
    roughness: 0.4,
    metalness: 0.35,
  }),
  lintel: new MeshStandardMaterial({
    color: '#3E7CB1',
    roughness: 0.4,
    metalness: 0.35,
  }),
  capstone: new MeshStandardMaterial({
    color: '#F2B630',
    emissive: '#7A4A00',
    emissiveIntensity: 0.4,
    roughness: 0.25,
    metalness: 0.2,
  }),
};

type PieceShape = keyof typeof PIECE_SIZE;

function pieceGeometry(shape: PieceShape): BufferGeometry {
  const [w, h, d] = PIECE_SIZE[shape];
  if (shape === 'capstone') {
    return new OctahedronGeometry(w / 2, 0);
  }
  return bevelBox(w, h, d, 0.006, 0.006, 3);
}

const geometries: Record<PieceShape, BufferGeometry> = {
  pillar: pieceGeometry('pillar'),
  lintel: pieceGeometry('lintel'),
  capstone: pieceGeometry('capstone'),
};

/** A grabbable puzzle piece; its single mesh is named `Body`. */
export function createPiece(shape: PieceShape): Group {
  const body = new Mesh(geometries[shape], pieceMaterials[shape]);
  body.name = 'Body';
  body.castShadow = true;
  const root = new Group();
  root.name = `Piece-${shape}`;
  root.add(body);
  return root;
}

/**
 * Translucent slot outline for a piece: a faint fill named `Fill` plus crisp
 * edges named `Edges`. Neither writes depth, so pieces read through them.
 */
export function createGhost(shape: PieceShape): Group {
  const color = pieceMaterials[shape].color;
  const fill = new Mesh(
    geometries[shape],
    new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
  );
  fill.name = 'Fill';
  const edges = new LineSegments(
    new EdgesGeometry(geometries[shape], 20),
    new LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
  );
  edges.name = 'Edges';
  const root = new Group();
  root.name = `Ghost-${shape}`;
  root.add(fill, edges);
  return root;
}

/** Work table, origin at floor contact, top surface at TABLE_TOP_HEIGHT. */
export function createWorkTable(width = 1.0, depth = 0.6): Group {
  const topThickness = 0.04;
  const top = new Mesh(
    bevelBox(width, topThickness, depth, 0.008, 0.02, 3),
    woodMaterial,
  );
  top.name = 'Top';
  top.position.y = TABLE_TOP_HEIGHT - topThickness / 2;
  top.castShadow = true;
  top.receiveShadow = true;

  const legHeight = TABLE_TOP_HEIGHT - topThickness;
  const legGeometry = new CylinderGeometry(0.022, 0.018, legHeight, 16);
  const legs = new Group();
  legs.name = 'Legs';
  const insetX = width / 2 - 0.07;
  const insetZ = depth / 2 - 0.07;
  for (const [x, z] of [
    [-insetX, -insetZ],
    [insetX, -insetZ],
    [-insetX, insetZ],
    [insetX, insetZ],
  ]) {
    const leg = new Mesh(legGeometry, woodMaterial);
    leg.position.set(x, legHeight / 2, z);
    leg.castShadow = true;
    legs.add(leg);
  }

  const apronGeometry = bevelBox(width - 0.1, 0.06, depth - 0.1, 0.004, 0.01, 2);
  const apron = new Mesh(apronGeometry, woodMaterial);
  apron.name = 'Apron';
  apron.position.y = legHeight - 0.03;

  const root = new Group();
  root.name = 'WorkTable';
  root.add(top, legs, apron);
  return root;
}

/** Hovering forge plate, origin at its top surface centre. */
export function createForgePlate(radius = 0.18): Group {
  const thickness = 0.02;
  const disc = new Mesh(
    new CylinderGeometry(radius, radius * 0.92, thickness, 48),
    ironMaterial,
  );
  disc.name = 'Disc';
  disc.position.y = -thickness / 2;
  disc.receiveShadow = true;
  const ring = new Mesh(
    new TorusGeometry(radius - 0.02, 0.005, 8, 64),
    emberMaterial,
  );
  ring.name = 'EmberRing';
  ring.rotation.x = -Math.PI / 2;
  const root = new Group();
  root.name = 'ForgePlate';
  root.add(disc, ring);
  return root;
}
