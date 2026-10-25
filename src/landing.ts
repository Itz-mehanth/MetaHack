import { SessionMode, type World } from '@iwsdk/core';
import { HEROES } from './combat/heroes.js';

const ICONS = `${import.meta.env.BASE_URL}icons/`;

const CSS = `
:root{--ink:#06020F;--paper:#FFF6D6;--cyan:#3DF5FF;--pink:#FF2D9A;--gold:#FFD23F}
#landing{position:fixed;inset:0;z-index:10;overflow-y:auto;overflow-x:hidden;color:#E9FCFF;
  font-family:'Rajdhani',system-ui,sans-serif;transition:opacity .45s;
  background:
    radial-gradient(circle at 50% 38%,rgba(255,45,154,.28),transparent 42%),
    radial-gradient(circle at 50% 120%,rgba(61,245,255,.35),transparent 55%),
    repeating-conic-gradient(from 0deg at 50% 38%,rgba(255,255,255,.045) 0 4deg,transparent 4deg 12deg),
    linear-gradient(180deg,rgba(6,2,15,.72),rgba(6,2,15,.95))}
#landing::before{content:'';position:fixed;inset:0;pointer-events:none;opacity:.22;
  background-image:radial-gradient(rgba(255,255,255,.55) 1.2px,transparent 1.6px);background-size:9px 9px;
  mask-image:radial-gradient(circle at 50% 30%,#000 10%,transparent 70%);animation:drift 18s linear infinite}
@keyframes drift{to{background-position:90px 90px}}
@keyframes pop{0%{transform:scale(.6) rotate(-6deg);opacity:0}70%{transform:scale(1.08) rotate(-2deg);opacity:1}100%{transform:scale(1) rotate(-2deg)}}
@keyframes float{50%{transform:translateY(-6px)}}
#landing.hidden{opacity:0;pointer-events:none}
#landing .wrap{max-width:1080px;margin:0 auto;padding:28px 18px 40px;box-sizing:border-box;text-align:center;position:relative}
#landing .kicker{display:inline-flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:6px}
#landing .badge{font-family:'Bangers',sans-serif;letter-spacing:.08em;font-size:15px;color:var(--ink);
  background:var(--gold);padding:5px 12px;border:3px solid var(--ink);border-radius:999px;box-shadow:3px 3px 0 var(--ink)}
#landing .badge.alt{background:var(--cyan)}#landing .badge.alt2{background:var(--pink);color:#fff}
#landing .burst{position:relative;margin:18px auto 6px;width:min(560px,92vw);aspect-ratio:2.2;display:grid;place-items:center}
#landing .burst::before{content:'';position:absolute;inset:0;background:var(--gold);border:5px solid var(--ink);
  clip-path:polygon(50% 0,58% 18%,75% 4%,72% 26%,96% 18%,82% 40%,100% 52%,80% 60%,94% 82%,70% 74%,66% 98%,52% 80%,36% 100%,32% 76%,8% 86%,20% 62%,0 50%,20% 40%,6% 16%,30% 24%,30% 2%,44% 18%);
  filter:drop-shadow(6px 6px 0 var(--ink));animation:pop .7s ease-out both}
#landing h1{position:relative;margin:0;font-family:'Bangers',sans-serif;font-weight:400;font-size:clamp(70px,16vw,150px);
  letter-spacing:.04em;line-height:.9;color:#fff;-webkit-text-stroke:5px var(--ink);paint-order:stroke fill;
  text-shadow:6px 6px 0 var(--pink),11px 11px 0 var(--ink);transform:rotate(-2deg);animation:pop .7s .1s ease-out both}
#landing .sub{font-family:'Bangers',sans-serif;font-size:clamp(24px,4.5vw,38px);letter-spacing:.06em;color:var(--cyan);
  -webkit-text-stroke:1.5px var(--ink);paint-order:stroke fill;text-shadow:3px 3px 0 var(--ink);margin:6px 0 4px}
#landing .tag{font-size:20px;margin:0 0 22px;color:#CDEFFF}
#landing .buttons{display:flex;gap:16px;justify-content:center;flex-wrap:wrap}
#landing button{font-family:'Bangers',sans-serif;font-size:28px;letter-spacing:.08em;min-width:230px;padding:16px 26px;
  border-radius:16px;cursor:pointer;color:var(--ink);border:4px solid var(--ink);box-shadow:6px 6px 0 var(--ink);
  transition:transform .12s,box-shadow .12s}
#landing button:hover{transform:translate(-2px,-2px);box-shadow:8px 8px 0 var(--ink)}
#landing button:active{transform:translate(3px,3px);box-shadow:2px 2px 0 var(--ink)}
#landing button:disabled{opacity:.4;cursor:not-allowed;transform:none;box-shadow:3px 3px 0 var(--ink)}
#landing .mr{background:linear-gradient(135deg,#FF7AC6,var(--pink))}
#landing .vr{background:linear-gradient(135deg,var(--cyan),#1A8FFF)}
#landing .ghost{background:transparent;color:#CDEFFF;border:2px dashed rgba(205,239,255,.5);box-shadow:none;
  font-family:'Rajdhani',sans-serif;font-size:15px;letter-spacing:.04em;min-width:0;padding:9px 16px;margin-top:16px}
#landing .ghost:hover{box-shadow:none}
#landing .note{margin-top:10px;font-size:14px;opacity:.7;min-height:1em}
#landing h2{font-family:'Bangers',sans-serif;font-weight:400;letter-spacing:.08em;font-size:32px;margin:38px 0 14px;
  color:#fff;-webkit-text-stroke:1.5px var(--ink);paint-order:stroke fill;text-shadow:3px 3px 0 var(--pink)}
#landing .roster{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
#landing .hero{position:relative;background:#0D0820;border:4px solid var(--ink);border-radius:14px;padding:16px 10px 14px;
  box-shadow:5px 5px 0 var(--ink),0 0 0 2px var(--c) inset;transform:rotate(var(--r));transition:transform .15s}
#landing .hero:hover{transform:rotate(0) scale(1.05)}
#landing .hero::after{content:'';position:absolute;inset:0;border-radius:10px;pointer-events:none;opacity:.12;
  background-image:radial-gradient(var(--c) 1px,transparent 1.5px);background-size:7px 7px}
#landing .icon{width:74px;height:74px;margin:0 auto 6px;background:var(--c);filter:drop-shadow(0 0 10px var(--c));
  -webkit-mask:var(--i) center/contain no-repeat;mask:var(--i) center/contain no-repeat;animation:float 3s ease-in-out infinite}
#landing .hero b{display:block;font-family:'Bangers',sans-serif;font-weight:400;font-size:30px;letter-spacing:.06em;color:var(--c);
  -webkit-text-stroke:1px var(--ink);paint-order:stroke fill;text-shadow:2px 2px 0 var(--ink)}
#landing .hero span{display:block;font-size:15px;line-height:1.25;color:#E9FCFF}
#landing .hero i{display:block;font-style:normal;font-size:13px;opacity:.7;margin-top:4px}
#landing .how{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;text-align:left}
#landing .how div{background:rgba(13,8,32,.9);border:3px solid var(--ink);border-radius:14px;padding:14px 14px 14px 72px;
  position:relative;font-size:16px;line-height:1.3;box-shadow:4px 4px 0 var(--ink)}
#landing .how div::before{content:'';position:absolute;left:14px;top:16px;width:44px;height:44px;background:var(--c);
  -webkit-mask:var(--i) center/contain no-repeat;mask:var(--i) center/contain no-repeat;filter:drop-shadow(0 0 6px var(--c))}
#landing .how b{display:block;font-family:'Bangers',sans-serif;font-weight:400;font-size:22px;letter-spacing:.06em;color:var(--c)}
#landing footer{margin-top:34px;font-size:12px;opacity:.55;line-height:1.5}
#landing footer a{color:inherit}
#menu-btn{position:fixed;top:14px;left:14px;z-index:9;font-family:'Bangers',sans-serif;font-size:20px;letter-spacing:.08em;
  padding:8px 16px;border-radius:10px;border:3px solid #06020F;background:#FFD23F;color:#06020F;cursor:pointer;
  box-shadow:4px 4px 0 #06020F;display:none}
@media (max-width:820px){#landing .roster{grid-template-columns:repeat(3,1fr)}#landing .how{grid-template-columns:1fr}}
@media (max-width:520px){#landing .roster{grid-template-columns:repeat(2,1fr)}#landing button{min-width:0;width:100%}}
`;

const TILTS = ['-2deg', '1.5deg', '-1deg', '2deg', '-1.5deg'];

function heroCards(): string {
  return HEROES.map(
    (h, i) => `<div class="hero" style="--c:${h.color};--r:${TILTS[i % TILTS.length]}">
      <div class="icon" style="--i:url('${ICONS}${h.id}.svg')"></div>
      <b>${h.name}</b><span>${h.power}</span><i>${h.how}</i></div>`,
  ).join('');
}

const how = (icon: string, color: string, title: string, text: string) =>
  `<div style="--c:${color};--i:url('${ICONS}${icon}.svg')"><b>${title}</b>${text}</div>`;

const HTML = () => `
<div class="wrap">
  <div class="kicker">
    <span class="badge">HAND TRACKING ONLY</span>
    <span class="badge alt">MIXED REALITY</span>
    <span class="badge alt2">6 HEROES &middot; 18 MISSIONS &middot; 6 BOSSES</span>
  </div>
  <div class="burst"><h1>SURGE</h1></div>
  <div class="sub">HANDS OF HEROES</div>
  <p class="tag">The Hollow Legion is caging your city. Your bare hands are the only superpower left.</p>
  <div class="buttons">
    <button class="mr" id="enter-mr">ENTER MR</button>
    <button class="vr" id="enter-vr">ENTER VR</button>
  </div>
  <button class="ghost" id="play-2d">Preview in browser (click to fire)</button>
  <div class="note" id="xr-note"></div>

  <h2>CHOOSE YOUR HERO</h2>
  <div class="roster">${heroCards()}</div>

  <h2>HOW TO PLAY</h2>
  <div class="how">
    ${how('play', '#3DF5FF', 'SUIT UP', 'Put the controllers down. Pick a hero from the 3D lineup with a sideways swipe and a poke.')}
    ${how('hostage', '#FFD23F', 'SAVE THEM', 'Enemies breach your real walls. Smash cages to free civilians, beat the boss.')}
    ${how('overdrive', '#FF2D9A', 'SURGE', 'Grab power-ups, chain combos, then clap your palms to unleash OVERDRIVE.')}
  </div>

  <footer>
    Original characters, story, models, music and sound, made for the Meta VR Start Developer Competition 2026.<br>
    Icons by Lorc and Delapouite from <a href="https://game-icons.net" target="_blank" rel="noopener">game-icons.net</a>
    (<a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a>), recoloured.
    Fonts: Bangers, Orbitron, Rajdhani (SIL OFL). <a href="${import.meta.env.BASE_URL}CREDITS.txt" target="_blank">Full credits</a>
  </footer>
</div>`;

/**
 * Comic-book title page with Enter MR / Enter VR buttons, the hero roster
 * and how-to-play cards. Hidden during an XR session and restored when it
 * ends; "preview" hides it for 2D play.
 */
export function setupLanding(world: World): void {
  const fonts = document.createElement('link');
  fonts.rel = 'stylesheet';
  fonts.href = 'https://fonts.googleapis.com/css2?family=Bangers&family=Orbitron:wght@700;900&family=Rajdhani:wght@500;600&display=swap';
  document.head.appendChild(fonts);
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const landing = document.createElement('div');
  landing.id = 'landing';
  landing.innerHTML = HTML();
  document.body.appendChild(landing);
  const menu = document.createElement('button');
  menu.id = 'menu-btn';
  menu.textContent = 'MENU';
  document.body.appendChild(menu);

  const vr = landing.querySelector<HTMLButtonElement>('#enter-vr')!;
  const mr = landing.querySelector<HTMLButtonElement>('#enter-mr')!;
  const preview = landing.querySelector<HTMLButtonElement>('#play-2d')!;
  const note = landing.querySelector<HTMLDivElement>('#xr-note')!;

  const show = (visible: boolean) => {
    landing.classList.toggle('hidden', !visible);
    menu.style.display = visible ? 'none' : 'block';
  };

  vr.addEventListener('click', () => world.launchXR({ sessionMode: SessionMode.ImmersiveVR }));
  mr.addEventListener('click', () => world.launchXR({ sessionMode: SessionMode.ImmersiveAR }));
  preview.addEventListener('click', () => show(false));
  menu.addEventListener('click', () => show(true));

  const xr = world.renderer.xr;
  xr.addEventListener('sessionstart', () => {
    landing.classList.add('hidden');
    menu.style.display = 'none';
  });
  xr.addEventListener('sessionend', () => show(true));
  // Debug/recording deep links go straight into the game.
  const deep = new URLSearchParams(window.location.search);
  if (deep.has('autostart') || deep.has('menu')) show(false);

  const nav = navigator.xr;
  if (nav == null) {
    vr.disabled = true;
    mr.disabled = true;
    note.textContent = 'Open this page in the Meta Quest browser to play in MR or VR.';
    return;
  }
  void Promise.all([
    nav.isSessionSupported('immersive-vr').catch(() => false),
    nav.isSessionSupported('immersive-ar').catch(() => false),
  ]).then(([vrOk, arOk]) => {
    vr.disabled = !vrOk;
    mr.disabled = !arOk;
    if (!vrOk && !arOk) note.textContent = 'This browser has no headset. Open it on a Meta Quest to play.';
    else if (!arOk) note.textContent = 'MR needs a passthrough headset such as Quest 3.';
  });
}
