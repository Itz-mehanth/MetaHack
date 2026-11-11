import type { HeroId } from './heroes.js';

/**
 * Per-hero leaderboards. Every finished run posts its score under the
 * player's name; this device keeps each hero's best ten, and the best score per
 * name is also sent to the shared board when the game is hosted with one
 * (netboard.ts). Pure data and rules, so it is easy to test.
 */

export const NAME_MAX = 10;
export const BOARD_SIZE = 10;

export type BoardMode = 'campaign' | 'endless' | 'daily';

export interface BoardEntry {
  readonly name: string;
  readonly score: number;
  readonly mode: BoardMode;
  /** Short note shown beside the score, e.g. WAVE 12 or LEVEL 3. */
  readonly label: string;
  /** Epoch milliseconds. */
  readonly at: number;
}

export type Board = Partial<Record<HeroId, BoardEntry[]>>;

/** The keys of the on-screen keyboard, in rows of ten. */
export const KEY_ROWS: readonly (readonly string[])[] = [
  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
  ['K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'],
  ['U', 'V', 'W', 'X', 'Y', 'Z', '0', '1', '2', '3'],
  ['4', '5', '6', '7', '8', '9'],
];

/** Upper case letters, digits and single spaces only; at most NAME_MAX characters. */
export function cleanName(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trimStart()
    .slice(0, NAME_MAX)
    .trimEnd();
}

/** Same rules as a name but longer, for the score's note. */
export function cleanLabel(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24);
}

/** Applies one key press (a letter, digit, SPACE or DEL) to a name being typed. */
export function typeKey(draft: string, key: string): string {
  if (key === 'DEL') return draft.slice(0, -1);
  if (key === 'SPACE') return draft.length > 0 && !draft.endsWith(' ') && draft.length < NAME_MAX ? `${draft} ` : draft;
  if (/^[A-Z0-9]$/.test(key) && draft.length < NAME_MAX) return `${draft}${key}`;
  return draft;
}

export function entriesFor(board: Board, hero: HeroId): readonly BoardEntry[] {
  return board[hero] ?? [];
}

export function bestScore(board: Board, hero: HeroId): number {
  return entriesFor(board, hero)[0]?.score ?? 0;
}

/**
 * Files `entry` on `hero`'s board (best first, ties keep the older score above).
 * Returns the 1-based rank it earned, or 0 if it missed the top BOARD_SIZE.
 */
export function recordScore(board: Board, hero: HeroId, entry: BoardEntry): number {
  const list = [...(board[hero] ?? [])];
  let at = list.findIndex((e) => e.score < entry.score);
  if (at < 0) at = list.length;
  list.splice(at, 0, entry);
  board[hero] = list.slice(0, BOARD_SIZE);
  return at < BOARD_SIZE ? at + 1 : 0;
}

/** Reads a stored board, dropping anything malformed. */
export function normalizeBoard(raw: unknown): Board {
  const out: Board = {};
  if (raw == null || typeof raw !== 'object') return out;
  for (const [hero, list] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(list)) continue;
    const entries: BoardEntry[] = [];
    for (const item of list) {
      if (item == null || typeof item !== 'object') continue;
      const e = item as Partial<BoardEntry>;
      if (typeof e.score !== 'number' || !Number.isFinite(e.score) || e.score <= 0) continue;
      const mode: BoardMode = e.mode === 'endless' || e.mode === 'daily' ? e.mode : 'campaign';
      entries.push({ name: cleanName(typeof e.name === 'string' ? e.name : '') || 'PLAYER', score: Math.floor(e.score), mode, label: cleanLabel(typeof e.label === 'string' ? e.label : ''), at: typeof e.at === 'number' ? e.at : 0 });
    }
    entries.sort((a, b) => b.score - a.score);
    if (entries.length > 0) out[hero as HeroId] = entries.slice(0, BOARD_SIZE);
  }
  return out;
}

/** The note shown beside a score. */
export function scoreLabel(mode: BoardMode, waves: number, level: number): string {
  if (mode === 'endless') return `ENDLESS WAVE ${waves}`;
  if (mode === 'daily') return `DAILY WAVE ${waves}`;
  return `LEVEL ${level}`;
}
