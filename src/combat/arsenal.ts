import type { HeroId } from './heroes.js';
import { levelsCleared, type Profile } from './progression.js';

/**
 * The arsenal: several weapons per hero, each with its own look and way of
 * fighting. The first of each hero's list is free; the rest unlock as that
 * hero's story levels are cleared and are bought with coins in the armory.
 */

export interface WeaponDef {
  readonly id: string;
  readonly hero: HeroId;
  readonly name: string;
  readonly tagline: string;
  readonly price: number;
  /** Story levels of the hero's region that must be cleared first. */
  readonly requires: number;
  /** Signature colour (null: follow the hero's skin). */
  readonly color: string | null;
}

const W = (id: string, hero: HeroId, name: string, tagline: string, price: number, requires: number, color: string | null = null): WeaponDef => ({
  id,
  hero,
  name,
  tagline,
  price,
  requires,
  color,
});

export const ARSENAL: readonly WeaponDef[] = [
  W('arc-repulsor', 'arc', 'REPULSOR', 'Rapid palm bolts', 0, 0),
  W('arc-beam', 'arc', 'PROTON BEAM', 'Hold your palm out: a laser that cuts through', 600, 1, '#FFFFFF'),
  W('arc-rockets', 'arc', 'SWARM ROCKETS', 'Homing rockets burst from the wrist', 1200, 2, '#FF8A1F'),
  W('talon-steel', 'talon', 'TITAN STEEL', 'Unbreakable claws', 0, 0),
  W('talon-molten', 'talon', 'MOLTEN CLAWS', 'Every cut sets them on fire', 600, 1, '#FF6A1A'),
  W('talon-phase', 'talon', 'PHASE CLAWS', 'Longer blades that cut through crowds', 1200, 2, '#3DFFE0'),
  W('tempest-thunder', 'tempest', 'THUNDERCLAP', 'Chain lightning on every hit', 0, 0),
  W('tempest-inferno', 'tempest', 'INFERNO', 'A hammer of living fire', 700, 1, '#FF5A1F'),
  W('tempest-godbreaker', 'tempest', 'GODBREAKER', 'Huge; every impact quakes the ground', 1400, 2, '#FFD23F'),
  W('orion-longbow', 'orion', 'LONGBOW', 'Precise piercing arrows', 0, 0),
  W('orion-volley', 'orion', 'TRIDENT VOLLEY', 'Three arrows every shot', 500, 1, '#5DFFB0'),
  W('orion-blast', 'orion', 'BLAST ARROWS', 'Arrows explode on impact', 900, 1, '#FF8A1F'),
  W('orion-storm', 'orion', 'STORM ARROWS', 'Lightning arrows pierce everything', 1300, 2, '#B6A6FF'),
  W('weaver-silk', 'weaver', 'SILK', 'Strong webs, yank or throw', 0, 0),
  W('weaver-electro', 'weaver', 'ELECTRO WEB', 'Webbed enemies are electrocuted', 600, 1, '#3DC8FF'),
  W('weaver-burst', 'weaver', 'BURST WEB', 'Each shot nets a whole group', 1100, 2, '#FFFFFF'),
  W('havoc-pistol', 'havoc', 'PLASMA PISTOL', 'Hard-hitting sidearm', 0, 0),
  W('havoc-smg', 'havoc', 'VIPER SMG', 'Bullet hose, hold the trigger', 500, 1, '#3DFF8A'),
  W('havoc-shotgun', 'havoc', 'BREACHER', 'Pump shotgun, six-pellet blast', 800, 1, '#FF3B5C'),
  W('havoc-minigun', 'havoc', 'HAILSTORM', 'Spin-up minigun', 1400, 2, '#FFD23F'),
  W('havoc-launcher', 'havoc', 'HELLFIRE LAUNCHER', 'Homing missiles that level a crowd', 1000, 2, '#FF5A1F'),
  W('ronin-katana', 'ronin', 'KATANA', 'Twin energy katanas', 0, 0),
  W('ronin-flame', 'ronin', 'FLAME FANGS', 'Burning blades, burning wounds', 700, 1, '#FF6A1A'),
  W('ronin-void', 'ronin', 'VOID EDGE', 'Longer blades that tear space', 1300, 2, '#B04DFF'),
  W('vanguard-aegis', 'vanguard', 'AEGIS', 'Blocks, deflects, ricochets', 0, 0),
  W('vanguard-solar', 'vanguard', 'SOLAR AEGIS', 'A burning shield that sets them alight', 700, 1, '#FFB01F'),
  W('vanguard-storm', 'vanguard', 'STORM AEGIS', 'More bounces, each hit arcs lightning', 1300, 2, '#3DC8FF'),
  W('psion-mind', 'psion', 'MIND', 'Lift and throw anything', 0, 0),
  W('psion-inferno', 'psion', 'INFERNO MIND', 'Thrown things explode in fire', 900, 1, '#FF6A1A'),
];

/** Finishes: a full restyle of a weapon's metals plus its energy colour. */
export interface FinishDef {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  /** [colour, metalness, roughness, emissive glow] per role. */
  readonly metal: readonly [string, number, number, number];
  readonly trim: readonly [string, number, number, number];
  readonly dark: readonly [string, number, number, number];
  /** Energy colour (null keeps the weapon's own). */
  readonly energy: string | null;
}

export const FINISHES: readonly FinishDef[] = [
  { id: 'standard', name: 'STANDARD', price: 0, metal: ['#3A3F4C', 1, 0.22, 0], trim: ['#C9CED8', 1, 0.14, 0], dark: ['#15171D', 0.4, 0.6, 0], energy: null },
  { id: 'gilded', name: 'GILDED', price: 600, metal: ['#B8862A', 1, 0.18, 0], trim: ['#FFE6A0', 1, 0.1, 0], dark: ['#2A1C0A', 0.6, 0.45, 0], energy: '#FFE9B0' },
  { id: 'crystal', name: 'CRYSTAL', price: 800, metal: ['#9FE8FF', 0.3, 0.05, 0.25], trim: ['#FFFFFF', 1, 0.05, 0.1], dark: ['#1A3550', 0.5, 0.2, 0], energy: '#7FF6FF' },
  { id: 'infernal', name: 'INFERNAL', price: 1000, metal: ['#1A1210', 0.8, 0.55, 0.12], trim: ['#7A2A10', 1, 0.3, 0.2], dark: ['#0A0606', 0.3, 0.8, 0], energy: '#FF4A00' },
  { id: 'void', name: 'VOID', price: 1200, metal: ['#160E24', 1, 0.2, 0], trim: ['#7A4DFF', 1, 0.3, 0.12], dark: ['#06040A', 0.5, 0.4, 0], energy: '#C04DFF' },
];

/** Owned finish ids are stored as `hero:finish`. */
export function ownsFinish(profile: Profile, hero: HeroId, id: string): boolean {
  return id === 'standard' || profile.finishes.includes(`${hero}:${id}`);
}

export function finishFor(profile: Profile, hero: HeroId): FinishDef {
  const id = profile.finish[hero];
  return FINISHES.find((f) => f.id === id && ownsFinish(profile, hero, f.id)) ?? FINISHES[0];
}

/** Buys (if needed) and equips finish `id` for `hero`. */
export function buyFinish(profile: Profile, hero: HeroId, id: string): boolean {
  const finish = FINISHES.find((f) => f.id === id);
  if (finish == null) return false;
  if (!ownsFinish(profile, hero, id)) {
    if (profile.coins < finish.price) return false;
    profile.coins -= finish.price;
    profile.finishes.push(`${hero}:${id}`);
  }
  profile.finish[hero] = id;
  return true;
}

export function weaponsFor(hero: HeroId): WeaponDef[] {
  return ARSENAL.filter((w) => w.hero === hero);
}

export function weaponById(id: string): WeaponDef | undefined {
  return ARSENAL.find((w) => w.id === id);
}

export function ownsWeapon(profile: Profile, id: string): boolean {
  const w = weaponById(id);
  return w != null && (w.price === 0 || profile.weapons.includes(id));
}

/** The hero's equipped weapon (their default if none or not owned). */
export function equippedWeapon(profile: Profile, hero: HeroId): WeaponDef {
  const list = weaponsFor(hero);
  const id = profile.loadout[hero];
  return list.find((w) => w.id === id && ownsWeapon(profile, w.id)) ?? list[0];
}

export function weaponUnlocked(profile: Profile, w: WeaponDef): boolean {
  return levelsCleared(profile, w.hero) >= w.requires;
}

/** Buys (if needed) and equips `id`. Returns false if locked or unaffordable. */
export function buyWeapon(profile: Profile, id: string): boolean {
  const w = weaponById(id);
  if (w == null) return false;
  if (!ownsWeapon(profile, id)) {
    if (!weaponUnlocked(profile, w) || profile.coins < w.price) return false;
    profile.coins -= w.price;
    profile.weapons.push(id);
  }
  profile.loadout[w.hero] = id;
  return true;
}
