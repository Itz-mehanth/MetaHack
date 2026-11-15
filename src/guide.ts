import { drawGesture, HERO_TIPS, type Gesture } from './combat/coach.js';
import { HEROES, type Hero } from './combat/heroes.js';

/**
 * The landing page's "how each hero plays" guide: a tab per hero, and under it the
 * same animated hand pictograms the in-game coach shows (coach.ts HERO_TIPS), plus
 * a row on getting around the game (poke, pinch, tag in, pause, clap). The
 * pictograms animate at about 12 fps and only while they are on screen, so the live
 * game reel behind the page keeps its frames.
 */

const ICONS = `${import.meta.env.BASE_URL}icons/`;

/** A frame where every pictogram shows its "done" burst; used when motion is reduced. */
const STILL_T = 1.2;
const FRAME_MS = 80;

export const GUIDE_CSS = `
#landing .roster .hero{cursor:pointer}
#landing .hero.on{transform:rotate(0) scale(1.04);box-shadow:5px 5px 0 var(--ink),0 0 0 3px var(--c) inset,0 0 22px var(--c)}
#landing .gsub{margin:-6px auto 14px;max-width:640px;font-size:17px;opacity:.85}
#landing .gtabs{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:0 0 14px}
#landing .gtabs button{display:inline-flex;align-items:center;gap:6px;width:auto;font-size:17px;padding:5px 13px 5px 8px;border-width:3px;border-radius:999px;
  box-shadow:3px 3px 0 var(--ink);background:#0D0820;color:var(--c)}
#landing .gtabs button i{width:22px;height:22px;flex:none;background:var(--c);-webkit-mask:var(--i) center/contain no-repeat;mask:var(--i) center/contain no-repeat}
#landing .gtabs button[aria-selected=true]{background:var(--c);color:var(--ink)}
#landing .gtabs button[aria-selected=true] i{background:var(--ink)}
#landing .gpanel{text-align:left;background:#0D0820;border:4px solid var(--ink);border-radius:16px;padding:16px;
  box-shadow:6px 6px 0 var(--ink),0 0 0 2px var(--c) inset,0 0 30px color-mix(in srgb,var(--c) 25%,transparent)}
#landing .ghead{display:flex;align-items:center;gap:14px;margin-bottom:12px}
#landing .ghead i{width:60px;height:60px;flex:none;background:var(--c);filter:drop-shadow(0 0 10px var(--c));-webkit-mask:var(--i) center/contain no-repeat;mask:var(--i) center/contain no-repeat}
#landing .ghead b{display:block;font-family:'Bangers',sans-serif;font-weight:400;font-size:44px;line-height:.9;letter-spacing:.05em;color:var(--c);
  -webkit-text-stroke:1.5px var(--ink);paint-order:stroke fill;text-shadow:3px 3px 0 var(--ink)}
#landing .ghead span{display:block;font-family:'Bangers',sans-serif;letter-spacing:.08em;font-size:20px;color:#fff}
#landing .gnav{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}
#landing .gsteps{display:flex;flex-wrap:wrap;justify-content:center;gap:12px}
#landing .gsteps .gstep{flex:0 1 330px;min-width:0;box-sizing:border-box}
#landing .gstep{position:relative;background:rgba(6,2,15,.7);border:3px solid var(--ink);border-radius:14px;padding:10px 12px 14px;text-align:center;box-shadow:3px 3px 0 var(--ink)}
#landing .gstep canvas{display:block;margin:0 auto 4px;width:min(100%,170px);height:auto;aspect-ratio:1}
#landing .gstep b{display:block;font-family:'Bangers',sans-serif;font-weight:400;font-size:24px;letter-spacing:.05em;line-height:1.05;color:var(--c)}
#landing .gstep p{margin:5px 0 0;font-size:16px;line-height:1.25}
#landing .gstep em{position:absolute;top:8px;left:11px;font-style:normal;font-family:'Orbitron',sans-serif;font-size:11px;letter-spacing:.12em;color:var(--c)}
#landing .gscreen{margin:14px 0 0;font-size:16px;line-height:1.3}
#landing .gscreen em{display:block;font-style:normal;font-family:'Orbitron',sans-serif;font-size:10px;letter-spacing:.2em;color:var(--c);margin-bottom:2px}
#landing .gnav .gstep{border-color:var(--ink);background:rgba(13,8,32,.9)}
#landing .gnote{margin:14px auto 0;max-width:720px;font-size:15px;line-height:1.3;opacity:.8}
#landing .gvideo{margin:0 auto 34px;max-width:880px}
#landing .gvideo video{display:block;width:100%;height:auto;aspect-ratio:16/9;background:#06020F;border:4px solid var(--ink);border-radius:14px;box-shadow:6px 6px 0 var(--ink),0 0 0 2px #3DF5FF inset,0 0 30px rgba(61,245,255,.25)}
#landing .gvideo figcaption{margin:10px auto 0;max-width:640px;font-size:15px;line-height:1.3;opacity:.8}
`;

interface Live {
  readonly ctx: CanvasRenderingContext2D;
  readonly gesture: Gesture;
  readonly color: string;
}

interface NavCard {
  readonly gesture: Gesture;
  readonly color: string;
  readonly title: string;
  readonly text: string;
}

/** Getting around the game with bare hands. */
const NAV: readonly NavCard[] = [
  { gesture: 'poke', color: '#3DF5FF', title: 'PRESS A BUTTON', text: 'Poke it with a fingertip, or look at it and pinch.' },
  { gesture: 'poke', color: '#FF2D9A', title: 'PAUSE', text: 'Poke the button on your left wrist.' },
  { gesture: 'clap', color: '#9D8CFF', title: 'OVERDRIVE', text: 'When the meter is full, clap your hands: every hero fires at once.' },
];

const stepHTML = (tip: { gesture: Gesture; title: string; sub: string }, n: number, of: number): string =>
  `<div class="gstep">${of > 1 ? `<em>${n} / ${of}</em>` : ''}<canvas width="400" height="400" data-g="${tip.gesture}" aria-hidden="true"></canvas><b>${tip.title}</b><p>${tip.sub}</p></div>`;

function panelHTML(hero: Hero): string {
  const tips = HERO_TIPS[hero.id];
  return `<div class="ghead"><i style="--i:url('${ICONS}${hero.id}.svg')"></i><div><b>${hero.name}</b><span>${hero.power}</span></div></div>
    <div class="gsteps">${tips.map((tip, i) => stepHTML(tip, i + 1, tips.length)).join('')}</div>
    <p class="gscreen"><em>ON A PHONE OR COMPUTER</em>${hero.tap}</p>`;
}

/** The guide's markup: a tab per hero, the panel, and the getting-around row. */
export function guideHTML(): string {
  const tabs = HEROES.map(
    (h) => `<button type="button" role="tab" data-h="${h.id}" aria-selected="false" style="--c:${h.color}"><i style="--i:url('${ICONS}${h.id}.svg')"></i>${h.name}</button>`,
  ).join('');
  const nav = NAV.map(
    (n) => `<div class="gstep" style="--c:${n.color}"><canvas width="400" height="400" data-g="${n.gesture}" data-c="${n.color}" aria-hidden="true"></canvas><b>${n.title}</b><p>${n.text}</p></div>`,
  ).join('');
  return `
  <h2>HOW TO PLAY</h2>
  <p class="gsub">The short version, with a voice-over and captions: finding your way around the menus, picking a hero and fighting.</p>
  <figure class="gvideo"><video controls preload="none" playsinline poster="/video/how-to-play.jpg" aria-label="How to play SURGE: Hands of Heroes"><source src="/video/how-to-play.mp4" type="video/mp4"></video><figcaption>Recorded from the game on a flat screen. In a headset the same moves are your real hands.</figcaption></figure>
  <h2>HOW EACH HERO PLAYS</h2>
  <p class="gsub">Everything is done with your bare hands. Pick a hero to see the pose, step by step.</p>
  <div class="gtabs" id="gtabs" role="tablist">${tabs}</div>
  <div class="gpanel" id="gpanel" role="tabpanel"></div>
  <h2>GETTING AROUND</h2>
  <div class="gnav" id="gnav">${nav}</div>
  <p class="gnote">Pinching with your palm facing you opens the Meta menu, which pauses the game. Close it and play carries on.</p>`;
}

/** Wires the guide up inside the landing page: tabs, roster clicks, and the pictogram animation. */
export function setupGuide(landing: HTMLElement): void {
  const tabs = landing.querySelector<HTMLElement>('#gtabs');
  const panel = landing.querySelector<HTMLElement>('#gpanel');
  const nav = landing.querySelector<HTMLElement>('#gnav');
  const roster = landing.querySelector<HTMLElement>('.roster');
  if (tabs == null || panel == null || nav == null) return;

  // Older browsers lack roundRect (the pictograms use it): keep the text, hide the pictures.
  const canDraw = typeof CanvasRenderingContext2D !== 'undefined' && typeof CanvasRenderingContext2D.prototype.roundRect === 'function';
  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  const collect = (root: ParentNode, fallback: string): Live[] => {
    const found: Live[] = [];
    root.querySelectorAll<HTMLCanvasElement>('canvas[data-g]').forEach((canvas) => {
      const ctx = canDraw ? canvas.getContext('2d') : null;
      if (ctx == null) {
        canvas.style.display = 'none';
        return;
      }
      found.push({ ctx, gesture: canvas.dataset.g as Gesture, color: canvas.dataset.c ?? fallback });
    });
    return found;
  };
  const paint = (list: readonly Live[], t: number): void => {
    for (const live of list) {
      const c = live.ctx;
      c.clearRect(0, 0, 400, 400);
      c.save();
      c.fillStyle = live.color;
      c.globalAlpha = 0.14;
      c.beginPath();
      c.arc(200, 200, 150, 0, Math.PI * 2);
      c.fill();
      c.restore();
      drawGesture(c, live.gesture, 200, 205, live.color, t);
    }
  };

  const navLive = collect(nav, '#3DF5FF');
  let stepLive: Live[] = [];
  let current = '';

  const select = (id: string): void => {
    const hero = HEROES.find((h) => h.id === id) ?? HEROES[0];
    if (hero.id === current) return;
    current = hero.id;
    tabs.querySelectorAll<HTMLElement>('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.h === hero.id)));
    roster?.querySelectorAll<HTMLElement>('.hero').forEach((card) => card.classList.toggle('on', card.dataset.h === hero.id));
    panel.style.setProperty('--c', hero.color);
    panel.setAttribute('aria-label', `${hero.name}: ${hero.power}`);
    panel.innerHTML = panelHTML(hero);
    stepLive = collect(panel, hero.color);
    // Pictograms without a data-c use the hero's colour.
    paint(stepLive, still ? STILL_T : performance.now() / 1000);
  };

  tabs.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>('button[data-h]');
    if (button?.dataset.h != null) select(button.dataset.h);
  });
  const fromRoster = (event: Event): void => {
    const card = (event.target as HTMLElement).closest<HTMLElement>('.hero[data-h]');
    if (card?.dataset.h == null) return;
    select(card.dataset.h);
    panel.scrollIntoView({ block: 'nearest', behavior: still ? 'auto' : 'smooth' });
  };
  roster?.addEventListener('click', fromRoster);
  roster?.addEventListener('keydown', (event) => {
    if ((event as KeyboardEvent).key === 'Enter' || (event as KeyboardEvent).key === ' ') {
      event.preventDefault();
      fromRoster(event);
    }
  });

  select(HEROES[0].id);
  paint(navLive, STILL_T);
  if (still || !canDraw) return;

  // Animate only while a pictogram is on screen, the page is showing and the landing page is up.
  const inView = new Set<Element>();
  let raf = 0;
  let timer = 0;
  let last = 0;
  const run = (): void => {
    if (raf === 0 && timer === 0 && inView.size > 0) raf = requestAnimationFrame(tick);
  };
  const tick = (now: number): void => {
    raf = 0;
    if (inView.size === 0) return;
    if (document.hidden || landing.classList.contains('hidden')) {
      timer = window.setTimeout(() => {
        timer = 0;
        run();
      }, 500);
      return;
    }
    if (now - last >= FRAME_MS) {
      last = now;
      paint(stepLive, now / 1000);
      paint(navLive, now / 1000);
    }
    raf = requestAnimationFrame(tick);
  };
  const watcher = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) inView.add(entry.target);
      else inView.delete(entry.target);
    }
    run();
  });
  watcher.observe(panel);
  watcher.observe(nav);
}
