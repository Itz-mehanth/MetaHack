import { SessionMode, type World } from '@iwsdk/core';
import { HEROES } from './combat/heroes.js';
import { requestMotion } from './combat/screen-input.js';
import { chapterFor } from './combat/story.js';
import { GUIDE_CSS, guideHTML, setupGuide } from './guide.js';
import { shell } from './shell.js';

const ICONS = `${import.meta.env.BASE_URL}icons/`;

const CSS = `
:root{--ink:#06020F;--paper:#FFF6D6;--cyan:#3DF5FF;--pink:#FF2D9A;--gold:#FFD23F;--hero:#4DA6FF;--bar:min(7vh,58px)}
#landing{position:fixed;inset:0;z-index:10;overflow-y:auto;overflow-x:hidden;color:#E9FCFF;font-family:'Rajdhani',system-ui,sans-serif;
  transition:opacity .5s;scrollbar-width:none;-webkit-overflow-scrolling:touch}
#landing::-webkit-scrollbar{display:none}
#landing.hidden{opacity:0;pointer-events:none}
/* Film look over the live reel: vignette, scanlines, letterbox. */
#landing .fx{position:fixed;inset:0;pointer-events:none;z-index:0;
  background:radial-gradient(ellipse at 50% 45%,transparent 45%,rgba(6,2,15,.55) 80%,rgba(6,2,15,.9) 100%),
  repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 1px,transparent 1px 3px)}
#landing .shade{position:fixed;left:0;top:0;bottom:0;width:min(62vw,760px);pointer-events:none;z-index:0;
  background:linear-gradient(90deg,rgba(6,2,15,.82),rgba(6,2,15,.45) 60%,transparent)}
#landing .bar{position:fixed;left:0;right:0;height:var(--bar);background:#000;z-index:3;display:flex;align-items:center;justify-content:space-between;
  padding:0 max(18px,env(safe-area-inset-left));box-sizing:border-box;font-family:'Orbitron',sans-serif;font-size:11px;letter-spacing:.22em;color:rgba(233,252,255,.7);
  pointer-events:none;animation:lb-in 1.2s cubic-bezier(.2,.8,.2,1) both}
#landing .bar.top{top:0}#landing .bar.bottom{bottom:0}
@keyframes lb-in{from{height:50vh}to{height:var(--bar)}}
#landing .rec{display:inline-flex;align-items:center;gap:8px}
#landing .rec i{width:9px;height:9px;border-radius:50%;background:#FF2A2A;box-shadow:0 0 10px #FF2A2A;animation:blink 1.1s steps(1) infinite}
@keyframes blink{50%{opacity:.15}}
#landing .cue{animation:cue 1.6s ease-in-out infinite}
@keyframes cue{50%{transform:translateY(4px);opacity:.5}}
#landing .flash{position:fixed;inset:0;z-index:4;pointer-events:none;opacity:0;mix-blend-mode:screen;
  background:repeating-linear-gradient(0deg,rgba(61,245,255,.55) 0 3px,transparent 3px 9px,rgba(255,45,154,.5) 9px 11px,transparent 11px 17px)}
#landing .flash.go{animation:cut .45s steps(5) both}
@keyframes cut{0%{opacity:1;transform:translateX(-14px)}40%{opacity:.8;transform:translateX(10px)}70%{opacity:.4;transform:translateX(-4px)}100%{opacity:0;transform:none}}
/* First screen: title, call to action, the hero now on screen. */
#landing .stage{position:relative;z-index:2;min-height:100vh;min-height:100svh;box-sizing:border-box;
  padding:calc(var(--bar) + 18px) max(22px,env(safe-area-inset-right)) calc(var(--bar) + 22px) max(22px,env(safe-area-inset-left));
  display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);align-items:end;gap:24px}
#landing .left{max-width:640px}
#landing .kicker{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;animation:rise .8s .5s both}
#landing .badge{font-family:'Bangers',sans-serif;letter-spacing:.08em;font-size:14px;color:var(--ink);background:var(--gold);padding:4px 11px;
  border:3px solid var(--ink);border-radius:999px;box-shadow:3px 3px 0 var(--ink)}
#landing .badge.alt{background:var(--cyan)}#landing .badge.alt2{background:var(--pink);color:#fff}
#landing h1{margin:0;font-family:'Bangers',sans-serif;font-weight:400;font-size:clamp(84px,14vw,188px);letter-spacing:.03em;line-height:.82;color:#fff;
  -webkit-text-stroke:5px var(--ink);paint-order:stroke fill;text-shadow:6px 6px 0 var(--pink),12px 12px 0 var(--ink);
  transform:rotate(-3deg);transform-origin:left bottom;animation:slam .7s .25s cubic-bezier(.2,1.6,.4,1) both,jolt 4.5s 2s steps(1) infinite}
@keyframes slam{from{transform:rotate(-3deg) scale(2.4);opacity:0}to{transform:rotate(-3deg) scale(1);opacity:1}}
@keyframes jolt{0%,92%,100%{text-shadow:6px 6px 0 var(--pink),12px 12px 0 var(--ink)}93%{text-shadow:-7px 2px 0 var(--cyan),9px -3px 0 var(--pink),12px 12px 0 var(--ink);transform:rotate(-3deg) translateX(4px)}
  95%{text-shadow:8px 4px 0 var(--cyan),-6px 2px 0 var(--pink),12px 12px 0 var(--ink);transform:rotate(-3deg) translateX(-3px)}97%{transform:rotate(-3deg)}}
#landing .sub{font-family:'Bangers',sans-serif;font-size:clamp(24px,3.6vw,40px);letter-spacing:.1em;color:var(--cyan);-webkit-text-stroke:1.5px var(--ink);
  paint-order:stroke fill;text-shadow:3px 3px 0 var(--ink);margin:10px 0 6px 6px;animation:rise .8s .6s both}
#landing .tag{font-size:clamp(17px,1.6vw,21px);line-height:1.35;margin:0 0 20px 6px;color:#E9FCFF;min-height:3.9em;max-width:560px;text-shadow:0 2px 8px #000}
#landing .tag b{color:var(--gold);font-weight:600}
#landing .caret{display:inline-block;width:.5em;height:1em;vertical-align:-.12em;background:var(--cyan);animation:blink .8s steps(1) infinite}
@keyframes rise{from{transform:translateY(16px);opacity:0}}
#landing .buttons{display:flex;gap:14px;flex-wrap:wrap;align-items:center;animation:rise .8s .9s both}
#landing button{font-family:'Bangers',sans-serif;font-size:26px;letter-spacing:.08em;padding:14px 24px;border-radius:14px;cursor:pointer;color:var(--ink);
  border:4px solid var(--ink);box-shadow:6px 6px 0 var(--ink);transition:transform .12s,box-shadow .12s,filter .2s}
#landing button:hover{transform:translate(-2px,-2px);box-shadow:8px 8px 0 var(--ink)}
#landing button:active{transform:translate(3px,3px);box-shadow:2px 2px 0 var(--ink)}
#landing button:disabled{opacity:.35;cursor:not-allowed;transform:none;box-shadow:3px 3px 0 var(--ink);filter:grayscale(.6)}
#landing .mr{background:linear-gradient(135deg,#FF7AC6,var(--pink))}
#landing .vr{background:linear-gradient(135deg,var(--cyan),#1A8FFF)}
#landing .play{background:linear-gradient(135deg,#FFE58A,var(--gold))}
#landing button.primary{font-size:32px;padding:18px 34px;animation:throb 2.2s ease-in-out infinite}
@keyframes throb{50%{box-shadow:6px 6px 0 var(--ink),0 0 34px rgba(255,210,63,.55)}}
#landing button small{display:block;font-family:'Rajdhani',sans-serif;font-weight:600;font-size:13px;letter-spacing:.04em;margin-top:2px}
#landing .row2{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:14px;animation:rise .8s 1.1s both}
#landing .ghost{background:rgba(6,2,15,.55);color:#E9FCFF;border:2px solid rgba(233,252,255,.45);box-shadow:none;font-family:'Orbitron',sans-serif;
  font-size:12px;letter-spacing:.14em;padding:10px 14px;border-radius:999px}
#landing .ghost:hover{box-shadow:none;border-color:var(--cyan)}
#landing .ghost.on{border-color:var(--cyan);color:var(--cyan)}
#landing .note{font-size:15px;opacity:.85;text-shadow:0 2px 6px #000}
/* The hero on screen right now. */
#landing .card{justify-self:end;align-self:start;margin-top:4vh;width:min(330px,100%);position:relative;padding:16px 18px 18px;border:3px solid var(--hero);
  border-radius:16px;background:linear-gradient(160deg,rgba(13,8,32,.86),rgba(6,2,15,.6));box-shadow:0 0 28px color-mix(in srgb,var(--hero) 45%,transparent),6px 6px 0 var(--ink);
  backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);animation:rise .8s 1.2s both}
#landing .card.swap{animation:swap .5s cubic-bezier(.2,1.4,.4,1) both}
@keyframes swap{from{transform:translateX(40px) skewX(-8deg);opacity:0}}
#landing .card .now{font-family:'Orbitron',sans-serif;font-size:11px;letter-spacing:.24em;color:rgba(233,252,255,.7);display:flex;justify-content:space-between}
#landing .card .now i{color:var(--hero);font-style:normal}
#landing .card .who{display:flex;align-items:center;gap:12px;margin:8px 0 6px}
#landing .card .ico{width:58px;height:58px;flex:none;background:var(--hero);filter:drop-shadow(0 0 10px var(--hero));
  -webkit-mask:var(--i) center/contain no-repeat;mask:var(--i) center/contain no-repeat}
#landing .card b{display:block;font-family:'Bangers',sans-serif;font-weight:400;font-size:46px;line-height:.9;letter-spacing:.05em;color:var(--hero);
  -webkit-text-stroke:1.5px var(--ink);paint-order:stroke fill;text-shadow:3px 3px 0 var(--ink)}
#landing .card span{display:block;font-family:'Bangers',sans-serif;letter-spacing:.08em;font-size:19px;color:#fff}
#landing .card p{margin:6px 0 0;font-size:16px;line-height:1.3;color:#E9FCFF}
#landing .card p em{font-style:normal;font-family:'Orbitron',sans-serif;font-size:10px;letter-spacing:.2em;color:var(--hero);display:block;margin-bottom:2px}
#landing .dots{display:flex;gap:6px;margin-top:12px}
#landing .dots i{flex:1;height:4px;border-radius:2px;background:rgba(233,252,255,.18)}
#landing .dots i.on{background:var(--hero);box-shadow:0 0 8px var(--hero)}
/* Below the fold: roster and how to play, on solid ground. */
#landing .more{position:relative;z-index:2;background:linear-gradient(180deg,rgba(6,2,15,0),#06020F 120px);padding:110px 18px 40px}
#landing .wrap{max-width:1080px;margin:0 auto;text-align:center}
#landing h2{font-family:'Bangers',sans-serif;font-weight:400;letter-spacing:.08em;font-size:34px;margin:30px 0 14px;color:#fff;
  -webkit-text-stroke:1.5px var(--ink);paint-order:stroke fill;text-shadow:3px 3px 0 var(--pink)}
#landing .roster{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
#landing .hero{position:relative;background:#0D0820;border:4px solid var(--ink);border-radius:14px;padding:16px 10px 14px;
  box-shadow:5px 5px 0 var(--ink),0 0 0 2px var(--c) inset;transform:rotate(var(--r));transition:transform .15s}
#landing .hero:hover{transform:rotate(0) scale(1.04)}
#landing .hero::after{content:'';position:absolute;inset:0;border-radius:10px;pointer-events:none;opacity:.12;
  background-image:radial-gradient(var(--c) 1px,transparent 1.5px);background-size:7px 7px}
#landing .hero .icon{width:70px;height:70px;margin:0 auto 6px;background:var(--c);filter:drop-shadow(0 0 10px var(--c));
  -webkit-mask:var(--i) center/contain no-repeat;mask:var(--i) center/contain no-repeat;animation:float 3s ease-in-out infinite}
@keyframes float{50%{transform:translateY(-6px)}}
#landing .hero b{display:block;font-family:'Bangers',sans-serif;font-weight:400;font-size:30px;letter-spacing:.06em;color:var(--c);
  -webkit-text-stroke:1px var(--ink);paint-order:stroke fill;text-shadow:2px 2px 0 var(--ink)}
#landing .hero span{display:block;font-size:15px;line-height:1.25}
#landing .hero i{display:block;font-style:normal;font-size:13px;opacity:.7;margin-top:4px}
#landing .how{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;text-align:left}
#landing .how div{background:rgba(13,8,32,.9);border:3px solid var(--ink);border-radius:14px;padding:14px 14px 14px 72px;position:relative;font-size:16px;
  line-height:1.3;box-shadow:4px 4px 0 var(--ink)}
#landing .how div::before{content:'';position:absolute;left:14px;top:16px;width:44px;height:44px;background:var(--c);
  -webkit-mask:var(--i) center/contain no-repeat;mask:var(--i) center/contain no-repeat;filter:drop-shadow(0 0 6px var(--c))}
#landing .how b{display:block;font-family:'Bangers',sans-serif;font-weight:400;font-size:22px;letter-spacing:.06em;color:var(--c)}
#landing footer{margin-top:34px;font-size:12px;opacity:.55;line-height:1.5}
#landing footer a{color:inherit}
#home-btn{position:fixed;top:max(12px,env(safe-area-inset-top));left:max(12px,env(safe-area-inset-left));z-index:9;font-family:'Bangers',sans-serif;font-size:19px;
  letter-spacing:.08em;padding:8px 15px;border-radius:10px;border:3px solid #06020F;background:#FFD23F;color:#06020F;cursor:pointer;box-shadow:4px 4px 0 #06020F;display:none}
@media (max-width:900px){#landing .stage{grid-template-columns:1fr;align-items:end;align-content:end}
  #landing .card{justify-self:start;order:-1;margin:0;width:min(300px,100%);padding:10px 14px 12px}#landing .card b{font-size:34px}#landing .card .ico{width:42px;height:42px}
  #landing .card p{display:none}#landing .roster{grid-template-columns:repeat(2,1fr)}#landing .how{grid-template-columns:1fr}
  #landing .shade{width:100vw;background:linear-gradient(0deg,rgba(6,2,15,.88),rgba(6,2,15,.35) 55%,transparent)}}
@media (max-width:520px){#landing button{width:100%}#landing button.primary{font-size:28px}#landing .buttons{gap:10px}
  #landing .bar .cam,#landing .bar.bottom span:first-child{display:none}#landing .tag{min-height:5.2em}}
/* No headset in this browser: on small screens only PLAY NOW stays. */
@media (max-width:900px){#landing.no-xr .mr,#landing.no-xr .vr{display:none}}
@media (max-height:520px) and (orientation:landscape){#landing .card,#landing .kicker,#landing .note{display:none}
  #landing h1{font-size:clamp(54px,10vw,104px);-webkit-text-stroke:4px var(--ink)}#landing .sub{font-size:22px;margin:6px 0 2px 4px}
  #landing .tag{font-size:15px;margin-bottom:10px;min-height:0;max-width:520px}#landing .stage{grid-template-columns:1fr;padding-top:calc(var(--bar) + 8px);padding-bottom:calc(var(--bar) + 8px)}
  #landing button.primary{font-size:24px;padding:10px 22px}#landing button{font-size:20px;padding:8px 16px;width:auto}#landing .row2{margin-top:8px}}
@media (prefers-reduced-motion:reduce){#landing *,#landing *::before{animation:none!important}}
${GUIDE_CSS}`;

const TILTS = ['-2deg', '1.5deg', '-1deg', '2deg', '-1.5deg'];

function heroCards(): string {
  return HEROES.map(
    (h, i) => `<div class="hero" data-h="${h.id}" role="button" tabindex="0" aria-label="How ${h.name} plays" style="--c:${h.color};--r:${TILTS[i % TILTS.length]}">
      <div class="icon" style="--i:url('${ICONS}${h.id}.svg')"></div>
      <b>${h.name}</b><span>${h.power}</span><i>${h.how}</i></div>`,
  ).join('');
}

const how = (icon: string, color: string, title: string, text: string) =>
  `<div style="--c:${color};--i:url('${ICONS}${icon}.svg')"><b>${title}</b>${text}</div>`;

const TAGLINE = 'OBLIVAX, the Unmaker, is erasing reality, starting with the room you stand in. Ten heroes. <b>No controllers.</b> Your bare hands are the last line.';

const HTML = () => `
<div class="fx"></div><div class="shade"></div>
<div class="bar top"><span class="rec"><i></i>LIVE &middot; REAL-TIME GAMEPLAY</span><span class="cam" id="cam">HERO CAM</span></div>
<div class="bar bottom"><span>SURGE: HANDS OF HEROES</span><span class="cue">SCROLL &darr; HEROES</span></div>
<div class="flash" id="cut"></div>
<section class="stage">
  <div class="left">
    <div class="kicker">
      <span class="badge">HAND TRACKING ONLY</span>
      <span class="badge alt">MIXED REALITY</span>
      <span class="badge alt2">10 HEROES &middot; 30 MISSIONS</span>
    </div>
    <h1>SURGE</h1>
    <div class="sub">HANDS OF HEROES</div>
    <p class="tag" id="tag"><span class="caret"></span></p>
    <div class="buttons">
      <button class="mr" id="enter-mr">ENTER MR<small>Meta Quest 3 &middot; your room</small></button>
      <button class="vr" id="enter-vr">ENTER VR<small>Full sky, no passthrough</small></button>
      <button class="play" id="play-2d">PLAY NOW<small id="play-sub">Touch, mouse or keys</small></button>
    </div>
    <div class="row2">
      <button class="ghost" id="sound">&#x1F507; SOUND OFF</button>
      <span class="note" id="xr-note"></span>
    </div>
  </div>
  <aside class="card" id="card">
    <div class="now"><span>NOW PLAYING</span><i id="card-n">1 / 9</i></div>
    <div class="who"><div class="ico" id="card-i"></div><div><b id="card-name">RONIN</b><span id="card-power">Twin katanas</span></div></div>
    <p><em>IN YOUR HEADSET</em><span id="card-how"></span></p>
    <div class="dots" id="dots">${HEROES.map(() => '<i></i>').join('')}</div>
  </aside>
</section>
<section class="more"><div class="wrap">
  <h2>TEN HEROES, ONE PAIR OF HANDS</h2>
  <div class="roster">${heroCards()}</div>
  <h2>HOW TO PLAY</h2>
  <div class="how">
    ${how('play', '#3DF5FF', 'JUST PLAY', 'Put the controllers down. A 4-minute prologue teaches three heroes, one gesture at a time.')}
    ${how('hostage', '#FFD23F', 'WIN BACK THE ANCHORS', 'Aliens breach your real walls. Free the caged, beat each region boss, recover its Anchor.')}
    ${how('overdrive', '#FF2D9A', 'CONVERGENCE', 'With three Anchors, face OBLIVAX in your own room. Every hero joins in. Clap to end it.')}
  </div>
  ${guideHTML()}
  <h2>FROM MENU TO MISSION</h2>
  <div class="how">
    ${how('arc', '#3DF5FF', 'PICK A HERO', 'Ten heroes stand as holograms. Poke one, or look at it and pinch, to see their power and deploy.')}
    ${how('map', '#FFD23F', 'THE WAR MAP', 'A spiral galaxy. Each hero has a region of three levels; poke a planet to deploy.')}
    ${how('radar', '#FF2D9A', 'THE MISSION', 'Aliens breach your real walls in waves. Each level ends on a champion or the region boss, and adds a twist like meteor rain or blackout.')}
    ${how('garage', '#9D8CFF', 'RESULTS AND ARMORY', 'Earn stars and coins, then spend them on weapons, upgrades and skins for each hero.')}
    ${how('timer', '#5DFFB0', 'ENDLESS AND DAILY', '40 waves with a boss every fifth. DAILY rolls the same world and twist for everyone.')}
    ${how('trophy', '#FF9A3D', 'LEADERBOARDS', 'Every finished run lands on its hero\'s board. Beat the best score.')}
  </div>
  <footer>
    Original heroes, story, weapons, music and sound, made for the Meta VR Start Developer Competition 2026. Creature models: Quaternius (CC0).<br>
    No headset? PLAY NOW works on phones, tablets and computers: tap, hold and swipe.<br>
    Icons by Lorc and Delapouite from <a href="https://game-icons.net" target="_blank" rel="noopener">game-icons.net</a>
    (<a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a>), recoloured.
    Fonts: Bangers, Orbitron, Rajdhani (SIL OFL). <a href="${import.meta.env.BASE_URL}CREDITS.txt" target="_blank">Full credits</a>
  </footer>
</div></section>`;

/**
 * Cinematic title page laid over the attract reel (the real game, played
 * live behind it by a bot): letterbox, live hero card, typewriter tagline,
 * and the ways in: Enter MR, Enter VR, or play right here on a phone or
 * computer. Hidden during an XR session and restored when it ends.
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
  setupGuide(landing);
  const home = document.createElement('button');
  home.id = 'home-btn';
  home.textContent = 'HOME';
  document.body.appendChild(home);

  const $ = <T extends HTMLElement>(id: string) => landing.querySelector<T>(`#${id}`)!;
  const vr = $<HTMLButtonElement>('enter-vr');
  const mr = $<HTMLButtonElement>('enter-mr');
  const play = $<HTMLButtonElement>('play-2d');
  const sound = $<HTMLButtonElement>('sound');
  const note = $<HTMLSpanElement>('xr-note');
  const touch = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  if (touch) $('play-sub').textContent = 'Tap, hold and swipe';

  const show = (visible: boolean) => {
    shell.landing = visible;
    landing.classList.toggle('hidden', !visible);
    if (visible) landing.scrollTop = 0;
  };
  const xr = world.renderer.xr;

  /**
   * Starts a session. A headset shows no console, so if the browser refuses (or
   * nothing happens) the reason is written on the page.
   */
  const launch = (mode: SessionMode): void => {
    const label = mode === SessionMode.ImmersiveVR ? 'VR' : 'MR';
    note.textContent = `Starting ${label}...`;
    const system = navigator.xr as unknown as { requestSession: (mode: string, init?: unknown) => Promise<unknown> } | undefined;
    const original = system?.requestSession;
    if (system != null && original != null) {
      system.requestSession = (requested, init) =>
        original.call(system, requested, init).catch((error: { name?: string; message?: string }) => {
          note.textContent = `Could not start ${label}: ${error?.name ?? 'error'}${error?.message ? ` - ${error.message}` : ''}`;
          throw error;
        });
    }
    // Frame-rate experiments on a headset (read the PERF HUD, ?perf=1): ?scale=0.75 renders fewer pixels,
    // ?lean=1 starts MR without the room-mesh, hit-test and anchor features the game never uses.
    const params = new URLSearchParams(window.location.search);
    const scale = Number(params.get('scale'));
    if (scale >= 0.5 && scale <= 1.5) xr.setFramebufferScaleFactor(scale);
    // Full VR has no room to scan: ask for hands and nothing else.
    if (mode === SessionMode.ImmersiveVR) world.launchXR({ sessionMode: mode, features: { planeDetection: false, meshDetection: false, anchors: false, hitTest: false } });
    else if (params.has('lean')) world.launchXR({ sessionMode: mode, features: { handTracking: true, planeDetection: true, meshDetection: false, anchors: false, hitTest: false } });
    else world.launchXR({ sessionMode: mode });
    window.setTimeout(() => {
      if (system != null && original != null) system.requestSession = original;
      if (!world.session && !xr.isPresenting && note.textContent?.startsWith('Starting')) note.textContent = `${label} did not start. Try again, or reload the page.`;
    }, 6000);
  };
  vr.addEventListener('click', () => launch(SessionMode.ImmersiveVR));
  mr.addEventListener('click', () => launch(SessionMode.ImmersiveAR));
  play.addEventListener('click', () => {
    shell.unlockAudio?.();
    requestMotion();
    if (touch) {
      // Phones: full screen, held sideways.
      const lock = () => (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.('landscape').catch(() => undefined);
      document.documentElement.requestFullscreen?.().then(lock).catch(() => undefined);
    }
    show(false);
  });
  sound.addEventListener('click', () => {
    shell.sound = !shell.sound;
    if (shell.sound) shell.unlockAudio?.();
    sound.classList.toggle('on', shell.sound);
    sound.innerHTML = shell.sound ? '&#x1F50A; SOUND ON' : '&#x1F507; SOUND OFF';
  });
  home.addEventListener('click', () => show(true));
  shell.goHome = () => show(true);

  xr.addEventListener('sessionstart', () => {
    shell.landing = false;
    landing.classList.add('hidden');
    home.style.display = 'none';
  });
  xr.addEventListener('sessionend', () => show(true));
  // Debug/recording deep links go straight into the game.
  const deep = new URLSearchParams(window.location.search);
  if (deep.has('autostart') || deep.has('menu') || deep.has('movie') || deep.has('chapter')) show(false);

  // Typewriter tagline (keeps the bold run intact while typing).
  const tag = $<HTMLParagraphElement>('tag');
  const total = TAGLINE.replace(/<[^>]+>/g, '').length;
  let typed = 0;
  const typer = window.setInterval(() => {
    typed += 1;
    let visible = 0;
    let html = '';
    for (let i = 0; i < TAGLINE.length && visible < typed; i += 1) {
      if (TAGLINE[i] === '<') {
        const end = TAGLINE.indexOf('>', i);
        html += TAGLINE.slice(i, end + 1);
        i = end;
        continue;
      }
      html += TAGLINE[i];
      visible += 1;
    }
    if (html.includes('<b>') && !html.includes('</b>')) html += '</b>';
    tag.innerHTML = `${html}<span class="caret"></span>`;
    if (typed >= total) window.clearInterval(typer);
  }, 28);

  // Live hero card and glitch cut, following the reel.
  const card = $<HTMLElement>('card');
  const flash = $<HTMLDivElement>('cut');
  const dots = Array.from($<HTMLDivElement>('dots').children) as HTMLElement[];
  let cut = -1;
  let shown = 0;
  let lastHome = '';
  const restart = (el: HTMLElement, name: string) => {
    el.classList.remove(name);
    void el.offsetWidth;
    el.classList.add(name);
  };
  const tick = () => {
    if (shell.cut !== cut && shell.showcase !== '') {
      cut = shell.cut;
      shown += 1;
      const index = Math.max(0, HEROES.findIndex((h) => h.id === shell.showcase));
      const hero = HEROES[index];
      landing.style.setProperty('--hero', hero.color);
      $('card-name').textContent = hero.name;
      $('card-power').textContent = hero.power;
      $('card-how').textContent = hero.how;
      $('card-i').style.setProperty('--i', `url('${ICONS}${hero.id}.svg')`);
      $('card-n').textContent = `${((shown - 1) % HEROES.length) + 1} / ${HEROES.length}`;
      $('cam').textContent = `HERO CAM ${String(index + 1).padStart(2, '0')} · ${chapterFor(hero.id).region}`;
      dots.forEach((dot, i) => dot.classList.toggle('on', i === index));
      restart(card, 'swap');
      if (shown > 1) restart(flash, 'go');
    }
    // HOME returns to this page from the menus (not mid-fight, not in a headset).
    const wantHome = !shell.landing && !shell.playing && !xr.isPresenting ? 'block' : 'none';
    if (wantHome !== lastHome) {
      lastHome = wantHome;
      home.style.display = wantHome;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  const nav = navigator.xr;
  const preferScreen = () => {
    landing.classList.add('no-xr');
    play.classList.add('primary');
    note.textContent = 'Best in a Meta Quest 3: hand tracking + mixed reality.';
  };
  if (nav == null) {
    vr.style.display = 'none';
    mr.disabled = true;
    preferScreen();
    return;
  }
  void Promise.all([
    nav.isSessionSupported('immersive-vr').catch(() => false),
    nav.isSessionSupported('immersive-ar').catch(() => false),
  ]).then(([vrOk, arOk]) => {
    vr.disabled = !vrOk;
    mr.disabled = !arOk;
    if (arOk) {
      // Mixed reality is the game. Full VR (no passthrough) stays as a small
      // secondary choice for players who want the whole sky.
      mr.classList.add('primary');
      if (vrOk) {
        vr.className = 'ghost';
        vr.innerHTML = '&#x1F576; FULL VR &middot; NO PASSTHROUGH';
        landing.querySelector('.row2')!.prepend(vr);
      } else vr.style.display = 'none';
    } else if (vrOk) {
      // A headset without passthrough: VR is the way in.
      vr.classList.add('primary');
      vr.innerHTML = 'ENTER VR<small>The full sky, no room needed</small>';
      mr.style.display = 'none';
      note.textContent = 'MR needs a passthrough headset such as Quest 3.';
    } else {
      vr.style.display = 'none';
      preferScreen();
    }
  });
}
