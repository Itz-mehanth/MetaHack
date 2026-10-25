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
};

export function twistFor(stageId: string): TwistId {
  return TWISTS[stageId] ?? 'none';
}
