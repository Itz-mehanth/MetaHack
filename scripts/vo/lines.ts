import { CHAPTERS } from '../../src/combat/story.js';
import { PROLOGUE_ERASURE, SAGA_STORY } from '../../src/combat/saga.js';
import { MOVIE_LINES } from '../../src/combat/cinema-script.js';
import { HEROES } from '../../src/combat/heroes.js';
import { callId, erasureId, introId, outroId, sagaIntroId, sagaOutroId, tauntId } from '../../src/combat/voice.js';

/**
 * Every spoken line in the game, with its file id (see voice.ts) and the
 * character who says it.
 */
export interface VoLine {
  id: string;
  /** Key into the CHARACTERS table in render.mjs. */
  who: string;
  text: string;
  /** Render order: lower first (the movie and the saga, then intros, outros, taunts). */
  priority: number;
}

export const LINES: VoLine[] = [];

for (const line of MOVIE_LINES) LINES.push({ id: line.id, who: line.voice, text: line.text, priority: 0 });

const SAGA_WHO = { echo: 'echo', oblivax: 'oblivax', vex: 'vex', civilian: 'civilian' } as const;
const sagaWho = (speaker: string): string => SAGA_WHO[speaker as keyof typeof SAGA_WHO];
SAGA_STORY.prologue.intro.forEach((l, i) => LINES.push({ id: sagaIntroId('prologue', i), who: sagaWho(l.speaker), text: l.text, priority: 1 }));
PROLOGUE_ERASURE.forEach((l, i) => LINES.push({ id: erasureId(i), who: sagaWho(l.speaker), text: l.text, priority: 1 }));
SAGA_STORY.finale.intro.forEach((l, i) => LINES.push({ id: sagaIntroId('finale', i), who: sagaWho(l.speaker), text: l.text, priority: 1 }));
SAGA_STORY.finale.outro.forEach((l, i) => LINES.push({ id: sagaOutroId('finale', i), who: sagaWho(l.speaker), text: l.text, priority: 2 }));

for (const chapter of CHAPTERS) {
  const hero = HEROES.find((h) => h.id === chapter.hero)!;
  LINES.push({ id: callId(chapter.hero), who: 'echo', text: `VEX's Legion is holding the ${chapter.region} Anchor. ${hero.name}, get it back.`, priority: 1 });
  chapter.levels.forEach((level, n) => {
    const who = (speaker: string): string => (speaker === 'villain' ? chapter.villain.name : speaker === 'hero' ? `hero:${chapter.hero}` : sagaWho(speaker));
    level.intro.forEach((l, i) => LINES.push({ id: introId(chapter.worldId, n + 1, i), who: who(l.speaker), text: l.text, priority: 3 }));
    level.outro.forEach((l, i) => LINES.push({ id: outroId(chapter.worldId, n + 1, i), who: who(l.speaker), text: l.text, priority: 4 }));
    level.taunts.forEach((t, i) => LINES.push({ id: tauntId(chapter.worldId, n + 1, i), who: chapter.villain.name, text: t, priority: 5 }));
  });
}
