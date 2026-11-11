import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LINES } from '../../scripts/vo/lines.js';
import { MOVIE_LINES } from './cinema-script.js';
import { introId, outroId, tauntId } from './voice.js';
import { CHAPTERS } from './story.js';

const VO = resolve(__dirname, '../../public/vo');

describe('voice-over', () => {
  it('every spoken line has a unique id', () => {
    const ids = LINES.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every spoken line has its rendered audio file', () => {
    const missing = LINES.filter((l) => !existsSync(resolve(VO, `${l.id}.mp3`))).map((l) => l.id);
    expect(missing).toEqual([]);
  });

  it('covers the opening movie, every level intro and every villain taunt', () => {
    const ids = new Set(LINES.map((l) => l.id));
    for (const line of MOVIE_LINES) expect(ids.has(line.id)).toBe(true);
    for (const chapter of CHAPTERS) {
      chapter.levels.forEach((level, n) => {
        level.intro.forEach((_, i) => expect(ids.has(introId(chapter.worldId, n + 1, i))).toBe(true));
        level.outro.forEach((_, i) => expect(ids.has(outroId(chapter.worldId, n + 1, i))).toBe(true));
        level.taunts.forEach((_, i) => expect(ids.has(tauntId(chapter.worldId, n + 1, i))).toBe(true));
      });
    }
  });

  it('gives every speaker a voice', () => {
    const who = new Set(LINES.map((l) => l.who));
    expect([...who].every((w) => typeof w === 'string' && w.length > 0)).toBe(true);
    expect(who.has('undefined')).toBe(false);
  });
});
