import type { Color, Mesh, MeshBasicMaterial, Object3D, ShaderMaterial } from '@iwsdk/core';

export type Ambient = 'data' | 'embers' | 'storm' | 'snow' | 'void' | 'dust' | 'petals' | 'motes';

export interface Theme {
  readonly top: string;
  readonly mid: string;
  readonly horizon: string;
  readonly accent: string;
  readonly gridMinor: string;
  readonly gridMajor: string;
  readonly ring: string;
  readonly bandA: string;
  readonly bandB: string;
  readonly ambient: Ambient;
}

/** One look per mission id; the hub uses `neon-grid`. */
export const THEMES: Readonly<Record<string, Theme>> = {
  'neon-grid': {
    top: '#030010',
    mid: '#1A0538',
    horizon: '#FF2E8C',
    accent: '#1AE6FF',
    gridMinor: '#1AD9FF',
    gridMajor: '#FF338F',
    ring: '#33FFFF',
    bandA: '#3DF5FF',
    bandB: '#FF2D9A',
    ambient: 'data',
  },
  'ember-foundry': {
    top: '#0A0200',
    mid: '#3A0A02',
    horizon: '#FF6A00',
    accent: '#FFC02E',
    gridMinor: '#FF5A1F',
    gridMajor: '#FFC02E',
    ring: '#FF8A1F',
    bandA: '#FF4D1A',
    bandB: '#FFC02E',
    ambient: 'embers',
  },
  'storm-peak': {
    top: '#02030A',
    mid: '#121A33',
    horizon: '#6F7FFF',
    accent: '#B6A6FF',
    gridMinor: '#5A6CFF',
    gridMajor: '#B6A6FF',
    ring: '#9D8CFF',
    bandA: '#7FD4FF',
    bandB: '#9D8CFF',
    ambient: 'storm',
  },
  'frost-spire': {
    top: '#01060E',
    mid: '#0B2A44',
    horizon: '#9FE8FF',
    accent: '#FFFFFF',
    gridMinor: '#6FD6FF',
    gridMajor: '#E8FBFF',
    ring: '#9FE8FF',
    bandA: '#9FE8FF',
    bandB: '#FFFFFF',
    ambient: 'snow',
  },
  'void-rift': {
    top: '#000000',
    mid: '#14001F',
    horizon: '#C04DFF',
    accent: '#39FF88',
    gridMinor: '#7A2DFF',
    gridMajor: '#39FF88',
    ring: '#C04DFF',
    bandA: '#C04DFF',
    bandB: '#39FF88',
    ambient: 'void',
  },
  'scrap-wastes': {
    top: '#0B0602',
    mid: '#3A2010',
    horizon: '#FFB01F',
    accent: '#3DE0C8',
    gridMinor: '#C46A1F',
    gridMajor: '#FFB01F',
    ring: '#FFB01F',
    bandA: '#FF5A1F',
    bandB: '#3DE0C8',
    ambient: 'dust',
  },
  'moon-temple': {
    top: '#01030C',
    mid: '#0B1838',
    horizon: '#E8EEFF',
    accent: '#FF3355',
    gridMinor: '#2E5CA8',
    gridMajor: '#4DA6FF',
    ring: '#4DA6FF',
    bandA: '#4DA6FF',
    bandB: '#FF3355',
    ambient: 'petals',
  },
  'sky-ruins': {
    top: '#0A0418',
    mid: '#2A1450',
    horizon: '#FFB0F0',
    accent: '#3DFFC8',
    gridMinor: '#8A3DC8',
    gridMajor: '#E05CFF',
    ring: '#E05CFF',
    bandA: '#E05CFF',
    bandB: '#3DFFC8',
    ambient: 'motes',
  },
};

/** Recolours the shared arena materials in place. */
export function applyTheme(arena: Object3D, theme: Theme): void {
  const dome = arena.getObjectByName('Dome') as Mesh | undefined;
  const floor = arena.getObjectByName('Floor') as Mesh | undefined;
  if (dome) {
    const u = (dome.material as ShaderMaterial).uniforms;
    (u.uTop.value as Color).set(theme.top);
    (u.uMid.value as Color).set(theme.mid);
    (u.uHorizon.value as Color).set(theme.horizon);
    (u.uAccent.value as Color).set(theme.accent);
  }
  if (floor) {
    const u = (floor.material as ShaderMaterial).uniforms;
    (u.uMinor.value as Color).set(theme.gridMinor);
    (u.uMajor.value as Color).set(theme.gridMajor);
    (u.uRing.value as Color).set(theme.ring);
  }
  for (const [name, color] of [
    ['BandA', theme.bandA],
    ['BandB', theme.bandB],
    ['HaloA', theme.bandA],
    ['HaloB', theme.bandB],
  ] as const) {
    const mesh = arena.getObjectByName(name) as Mesh | undefined;
    if (mesh) (mesh.material as MeshBasicMaterial).color.set(color);
  }
}

/** Sets the dome's lightning flash (0..1). */
export function setFlash(arena: Object3D, value: number): void {
  const dome = arena.getObjectByName('Dome') as Mesh | undefined;
  if (dome) (dome.material as ShaderMaterial).uniforms.uFlash.value = value;
}
