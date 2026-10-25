import { SessionMode, type World } from '@iwsdk/core';

const CSS = `
#landing{position:fixed;inset:0;z-index:10;display:flex;align-items:center;justify-content:center;
  padding:24px;box-sizing:border-box;font-family:'Rajdhani',system-ui,sans-serif;color:#E9FCFF;
  background:radial-gradient(ellipse at 50% 110%,rgba(255,45,154,.35),transparent 60%),
  linear-gradient(180deg,rgba(6,2,18,.55),rgba(6,2,18,.88));transition:opacity .4s}
#landing.hidden{opacity:0;pointer-events:none}
#landing .card{max-width:560px;width:100%;text-align:center}
#landing .kicker{letter-spacing:.5em;font-size:13px;color:#3DF5FF;text-transform:uppercase;opacity:.9}
#landing h1{font-family:'Orbitron',sans-serif;font-weight:900;font-size:clamp(44px,11vw,88px);margin:8px 0 4px;
  letter-spacing:.06em;background:linear-gradient(180deg,#fff 20%,#7FF6FF 60%,#FF2D9A);
  -webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 0 18px rgba(61,245,255,.55))}
#landing .tag{font-size:20px;margin:0 0 28px;color:#CDEFFF}
#landing .buttons{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
#landing button{font-family:'Orbitron',sans-serif;font-weight:700;font-size:18px;letter-spacing:.12em;
  min-width:200px;padding:18px 26px;border-radius:14px;cursor:pointer;color:#06020F;border:0;
  transition:transform .15s,box-shadow .15s}
#landing button:hover{transform:translateY(-2px)}
#landing button:disabled{opacity:.35;cursor:not-allowed;transform:none}
#landing .vr{background:linear-gradient(135deg,#3DF5FF,#1A8FFF);box-shadow:0 0 28px rgba(61,245,255,.55)}
#landing .mr{background:linear-gradient(135deg,#FF7AC6,#FF2D9A);box-shadow:0 0 28px rgba(255,45,154,.5)}
#landing .ghost{background:transparent;color:#CDEFFF;border:1px solid rgba(205,239,255,.35);
  font-size:13px;min-width:0;padding:10px 18px;margin-top:18px;box-shadow:none}
#landing .how{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:30px 0 0;text-align:left}
#landing .how div{background:rgba(20,10,40,.55);border:1px solid rgba(61,245,255,.25);border-radius:12px;padding:12px;font-size:15px;line-height:1.3}
#landing .how b{display:block;font-family:'Orbitron',sans-serif;font-size:12px;letter-spacing:.15em;color:#3DF5FF;margin-bottom:4px}
#landing .note{margin-top:14px;font-size:13px;opacity:.6;min-height:1em}
#menu-btn{position:fixed;top:14px;left:14px;z-index:9;font-family:'Orbitron',sans-serif;font-size:12px;
  letter-spacing:.15em;padding:10px 16px;border-radius:10px;border:1px solid rgba(61,245,255,.5);
  background:rgba(6,2,18,.6);color:#E9FCFF;cursor:pointer;display:none}
@media (max-width:520px){#landing .how{grid-template-columns:1fr}}
`;

const HTML = `
<div class="card">
  <div class="kicker">Hands-only mixed reality</div>
  <h1>HANDFORGE</h1>
  <p class="tag">Your hands are the weapon. Hold the line.</p>
  <div class="buttons">
    <button class="vr" id="enter-vr">ENTER VR</button>
    <button class="mr" id="enter-mr">ENTER MR</button>
  </div>
  <button class="ghost" id="play-2d">Preview in browser (click to fire)</button>
  <div class="how">
    <div><b>CHOOSE</b>Poke a hero card: ARC, TALON or TEMPEST.</div>
    <div><b>FIGHT</b>Each hero has their own power, world and enemies.</div>
    <div><b>MENU</b>Tap the button on your left wrist to switch hero.</div>
  </div>
  <div class="note" id="xr-note"></div>
</div>`;

/**
 * Full-screen title page with Enter VR / Enter MR buttons. Hidden during an
 * XR session and restored when it ends; "preview" hides it for 2D play.
 */
export function setupLanding(world: World): void {
  const fonts = document.createElement('link');
  fonts.rel = 'stylesheet';
  fonts.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Rajdhani:wght@500;600&display=swap';
  document.head.appendChild(fonts);
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const landing = document.createElement('div');
  landing.id = 'landing';
  landing.innerHTML = HTML;
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

  const nav = navigator.xr;
  if (nav == null) {
    vr.disabled = true;
    mr.disabled = true;
    note.textContent = 'Open this page in the Meta Quest browser to play in VR or MR.';
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
