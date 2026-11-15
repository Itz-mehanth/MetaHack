/**
 * Every level plays differently: a twist on top of its world and enemies.
 * Pure data keyed by stage id; the combat system implements each twist.
 */

export type TwistId = 'none' | 'meteors' | 'lightning' | 'lowgrav' | 'blackout' | 'ceiling' | 'frenzy';

export const TWIST_INFO: Readonly<Record<TwistId, { name: string; hint: string }>> = {
  none: { name: '', hint: '' },
  meteors: { name: 'METEOR RAIN', hint: 'Step out of the red circles. Meteors crush aliens too.' },
  lightning: { name: 'LIGHTNING STORM', hint: 'Bolts strike the glowing circles. Lure aliens under them.' },
  lowgrav: { name: 'LOW GRAVITY', hint: 'Everything floats. Thrown bodies fly forever.' },
  blackout: { name: 'BLACKOUT', hint: 'The lights are out. Your hands are the only light.' },
  ceiling: { name: 'FROM ABOVE', hint: 'Aliens drop through the ceiling. Look up!' },
  frenzy: { name: 'FRENZY', hint: 'They come twice as fast. Keep moving.' },
};

export const TWISTS: Readonly<Record<string, TwistId>> = {
  'neon-grid-1': 'none',
  'neon-grid-2': 'blackout',
  'neon-grid-3': 'frenzy',
  'ember-foundry-1': 'meteors',
  'ember-foundry-2': 'frenzy',
  'ember-foundry-3': 'meteors',
  'storm-peak-1': 'none',
  'storm-peak-2': 'lightning',
  'storm-peak-3': 'lightning',
  'frost-spire-1': 'none',
  'frost-spire-2': 'blackout',
  'frost-spire-3': 'lowgrav',
  'void-rift-1': 'lowgrav',
  'void-rift-2': 'ceiling',
  'void-rift-3': 'blackout',
  'scrap-wastes-1': 'none',
  'scrap-wastes-2': 'meteors',
  'scrap-wastes-3': 'frenzy',
  'moon-temple-1': 'none',
  'moon-temple-2': 'ceiling',
  'moon-temple-3': 'blackout',
  'sky-ruins-1': 'lowgrav',
  'sky-ruins-2': 'meteors',
  'sky-ruins-3': 'lowgrav',
  'iron-bastion-1': 'none',
  'iron-bastion-2': 'meteors',
  'iron-bastion-3': 'ceiling',
};

export function twistFor(stageId: string): TwistId {
  return TWISTS[stageId] ?? 'none';
}

/**
 * Every non-boss level ends with a champion: a giant elite who arrives
 * after a warning, with a health bar and a name.
 */
export const CHAMPIONS: Readonly<Record<string, string>> = {
  'neon-grid-1': 'CIRCUIT BRUTE',
  'neon-grid-2': 'NULL WARDEN',
  'ember-foundry-1': 'SLAG HOUND',
  'ember-foundry-2': 'FURNACE KING',
  'storm-peak-1': 'THUNDERHIDE',
  'storm-peak-2': 'GALE REAPER',
  'frost-spire-1': 'RIME STALKER',
  'frost-spire-2': 'GLACIER LORD',
  'void-rift-1': 'HOLLOW SPAWN',
  'void-rift-2': 'RIFT TYRANT',
  'scrap-wastes-1': 'RUST GOLIATH',
  'scrap-wastes-2': 'JUNK TITAN',
  'moon-temple-1': 'SHADOW BLADE',
  'moon-temple-2': 'MOON DUELIST',
  'sky-ruins-1': 'DRIFT GIANT',
  'sky-ruins-2': 'GRAVITON',
  'iron-bastion-1': 'WALL BREAKER',
  'iron-bastion-2': 'SHELL SHOCK',
};
