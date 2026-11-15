import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BOSSES, CUTE_PACK, ROLE_FAMILY, ROLE_HEIGHT, ROLE_POOL, ROSTER, SPECIES, speciesById, speciesFor, speciesIn, voicePitch } from './creatures.js';
import { STAGES, WORLDS } from './progression.js';

describe('creature roster', () => {
  it('has a model file for every species', () => {
    for (const s of SPECIES) expect(existsSync(`public/creatures/${s.id}.glb`), s.id).toBe(true);
  });

  it('only casts species of the right family in each role', () => {
    for (const [world, roles] of Object.entries(ROSTER)) {
      for (const [kind, id] of Object.entries(roles)) {
        const species = speciesById(id!);
        expect(species, `${world}/${kind}/${id}`).toBeDefined();
        expect(species!.family, `${world}/${kind}`).toBe(ROLE_FAMILY[kind as keyof typeof ROLE_FAMILY]);
        expect(ROLE_HEIGHT[kind as keyof typeof ROLE_HEIGHT]).toBeGreaterThan(0);
        expect(ROLE_POOL[kind as keyof typeof ROLE_POOL]).toBeGreaterThan(0);
      }
    }
  });

  it('gives every world at least two creature species', () => {
    for (const world of WORLDS) expect(speciesIn(world.id).length, world.id).toBeGreaterThanOrEqual(2);
  });

  it('casts creatures for roles a world actually fields', () => {
    for (const world of WORLDS) {
      for (const kind of Object.keys(ROSTER[world.id] ?? {})) {
        // Titans close out every world's last level, whether listed or not.
        if (kind !== 'titan') expect(world.enemies as readonly string[], `${world.id} fields ${kind}`).toContain(kind);
      }
    }
  });

  it('puts flyers in every world and keeps species ids unique', () => {
    for (const world of WORLDS) expect(speciesFor(world.id, 'flyer'), world.id).not.toBe('');
    expect(new Set(SPECIES.map((s) => s.id)).size).toBe(SPECIES.length);
  });

  it('gives every region a flying creature boss', () => {
    for (const world of WORLDS) {
      const boss = BOSSES[world.id];
      expect(boss, world.id).toBeDefined();
      expect(speciesById(boss.species)?.family, world.id).toBe('flying');
      expect(boss.height).toBeGreaterThan(2);
    }
  });

  it('keeps flyers out of the first stage of the first world', () => {
    const first = STAGES[0];
    for (const wave of first.waves) expect(wave.kinds).not.toContain('flyer');
  });
});

describe('small cute creatures', () => {
  it('are much smaller than a humanoid, and pack in close', () => {
    expect(ROLE_HEIGHT.swarmer!).toBeLessThan(0.6);
    expect(ROLE_HEIGHT.flyer!).toBeLessThan(0.7);
    expect(ROLE_HEIGHT.drone!).toBeGreaterThan(1);
    expect(CUTE_PACK).toBeLessThan(0.8);
  });

  it('come in crowds the pools can hold', () => {
    const swarmStages = STAGES.filter((s) => s.world.enemies[0] === 'swarmer');
    expect(swarmStages.length).toBeGreaterThan(0);
    for (const stage of swarmStages) for (const wave of stage.waves) expect(wave.alive!).toBeLessThanOrEqual(ROLE_POOL.swarmer!);
    // A real crowd: well over what the first levels used to field (6 to 9).
    const biggest = Math.max(...swarmStages.flatMap((s) => s.waves.map((w) => w.alive!)));
    expect(biggest).toBeGreaterThanOrEqual(12);
  });

  it('each species has its own steady voice', () => {
    for (const species of SPECIES) {
      const pitch = voicePitch(species.id);
      expect(pitch).toBeGreaterThanOrEqual(0.8);
      expect(pitch).toBeLessThanOrEqual(1.45);
      expect(voicePitch(species.id)).toBe(pitch);
    }
    const voices = new Set(SPECIES.filter((s) => s.family !== 'big').map((s) => voicePitch(s.id)));
    expect(voices.size).toBeGreaterThan(3);
  });
});
