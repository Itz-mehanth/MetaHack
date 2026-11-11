import { describe, expect, it } from 'vitest';
import { type Board, type BoardEntry, BOARD_SIZE, bestScore, cleanName, entriesFor, NAME_MAX, normalizeBoard, recordScore, scoreLabel, typeKey } from './leaderboard.js';
import { defaultProfile, normalizeProfile } from './progression.js';

const entry = (score: number, name = 'ACE'): BoardEntry => ({ name, score, mode: 'endless', label: 'ENDLESS WAVE 3', at: 1 });

describe('names', () => {
  it('keeps upper case letters, digits and single spaces', () => {
    expect(cleanName('  mehan  the   great!! ')).toBe('MEHAN THE');
    expect(cleanName('  mehanth  the   great!! ')).toBe('MEHANTH TH');
    expect(cleanName('a-b_c')).toBe('ABC');
    expect(cleanName('')).toBe('');
    expect(cleanName('x'.repeat(40)).length).toBe(NAME_MAX);
  });

  it('types with the on-screen keys', () => {
    let draft = '';
    for (const k of ['R', 'O', 'N', 'SPACE', 'SPACE', 'X', '9']) draft = typeKey(draft, k);
    expect(draft).toBe('RON X9');
    expect(typeKey(draft, 'DEL')).toBe('RON X');
    expect(typeKey('', 'SPACE')).toBe('');
    expect(typeKey('ABCDEFGHIJ', 'K')).toBe('ABCDEFGHIJ');
    expect(typeKey('A', '?')).toBe('A');
  });
});

describe('board', () => {
  it('ranks scores best first and reports the rank', () => {
    const board: Board = {};
    expect(recordScore(board, 'arc', entry(500))).toBe(1);
    expect(recordScore(board, 'arc', entry(900, 'BEE'))).toBe(1);
    expect(recordScore(board, 'arc', entry(700, 'CAT'))).toBe(2);
    expect(entriesFor(board, 'arc').map((e) => e.name)).toEqual(['BEE', 'CAT', 'ACE']);
    expect(bestScore(board, 'arc')).toBe(900);
    expect(bestScore(board, 'ronin')).toBe(0);
  });

  it('ties keep the older score above', () => {
    const board: Board = {};
    recordScore(board, 'arc', entry(500, 'OLD'));
    expect(recordScore(board, 'arc', entry(500, 'NEW'))).toBe(2);
    expect(entriesFor(board, 'arc')[0].name).toBe('OLD');
  });

  it('keeps ten and tells a miss', () => {
    const board: Board = {};
    for (let i = 1; i <= BOARD_SIZE; i += 1) recordScore(board, 'arc', entry(i * 100));
    expect(recordScore(board, 'arc', entry(50))).toBe(0);
    expect(entriesFor(board, 'arc').length).toBe(BOARD_SIZE);
    expect(recordScore(board, 'arc', entry(10_000))).toBe(1);
    expect(entriesFor(board, 'arc').length).toBe(BOARD_SIZE);
    expect(bestScore(board, 'arc')).toBe(10_000);
  });

  it('labels the run', () => {
    expect(scoreLabel('endless', 12, 0)).toBe('ENDLESS WAVE 12');
    expect(scoreLabel('daily', 5, 0)).toBe('DAILY WAVE 5');
    expect(scoreLabel('campaign', 0, 3)).toBe('LEVEL 3');
  });
});

describe('stored boards', () => {
  it('drops malformed entries and sorts the rest', () => {
    const board = normalizeBoard({
      arc: [{ name: 'low', score: 5 }, { name: 'high!', score: 90, mode: 'daily', label: 'daily wave 2' }, { score: -4 }, null, 'x', { name: 'NaN', score: Number.NaN }],
      ronin: 'nope',
    });
    expect(entriesFor(board, 'arc').map((e) => [e.name, e.score, e.mode])).toEqual([['HIGH', 90, 'daily'], ['LOW', 5, 'campaign']]);
    expect(entriesFor(board, 'ronin')).toEqual([]);
    expect(normalizeBoard(null)).toEqual({});
  });

  it('is part of the saved profile, with a clean name, and old saves still load', () => {
    const fresh = defaultProfile();
    expect(fresh.name).toBe('');
    expect(fresh.board).toEqual({});
    const loaded = normalizeProfile({ ...fresh, name: 'ace pilot!!', board: { arc: [{ name: 'ACE', score: 321, mode: 'endless', label: 'ENDLESS WAVE 4', at: 7 }] } });
    expect(loaded.name).toBe('ACE PILOT');
    expect(bestScore(loaded.board, 'arc')).toBe(321);
    const legacy = normalizeProfile({ coins: 10 });
    expect(legacy.name).toBe('');
    expect(legacy.board).toEqual({});
  });
});
