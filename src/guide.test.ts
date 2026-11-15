import { describe, expect, it } from 'vitest';
import { HERO_TIPS } from './combat/coach.js';
import { HEROES } from './combat/heroes.js';
import { guideHTML } from './guide.js';

describe('landing hero guide', () => {
  const html = guideHTML();

  it('has a tab for every hero, and every hero has steps to show', () => {
    for (const hero of HEROES) {
      expect(html).toContain(`data-h="${hero.id}"`);
      expect(HERO_TIPS[hero.id].length).toBeGreaterThan(0);
      for (const tip of HERO_TIPS[hero.id]) {
        expect(tip.title.length).toBeGreaterThan(0);
        expect(tip.sub.length).toBeGreaterThan(0);
      }
    }
  });

  it('shows the getting-around cards with a pictogram each', () => {
    const nav = html.slice(html.indexOf('id="gnav"'));
    expect(nav.match(/<canvas /g)?.length).toBe(3);
    expect(nav).toContain('PAUSE');
    expect(nav).toContain('OVERDRIVE');
  });

  it('offers the how-to video without downloading it until it is played', () => {
    expect(html).toContain('<video controls preload="none"');
    expect(html).toContain('/video/how-to-play.mp4');
    expect(html).toContain('poster="/video/how-to-play.jpg"');
  });

  it('keeps the hero list and the guide in step (no hero left out of the roster)', () => {
    expect(html.match(/role="tab"/g)?.length).toBe(HEROES.length);
  });
});
