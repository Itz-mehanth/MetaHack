import { ARSENAL } from './combat/arsenal.js';
import { weaponParts, type WeaponPart } from './combat/weaponsfx.js';

/**
 * Sound audition page (open the game with ?sounds=1): one button per weapon
 * sound so the designs can be judged by ear on any device, no mission needed.
 * Part of the build, never shown unless asked for.
 */
export function mountSoundTest(): void {
  // Looked up at click time: the combat system installs the hook after the page loads.
  const play = (id: string, part: WeaponPart, power: number): void =>
    (window as unknown as { __surgeSfx?: (id: string, part: WeaponPart, power: number) => void }).__surgeSfx?.(id, part, power);
  const root = document.createElement('div');
  root.id = 'soundtest';
  root.style.cssText = 'position:fixed;inset:0;z-index:99998;overflow:auto;background:rgba(6,2,15,.96);color:#E9FCFF;font:600 15px system-ui,sans-serif;padding:16px 16px 60px';
  const title = document.createElement('h2');
  title.textContent = 'SURGE weapon sounds';
  title.style.cssText = 'margin:0 0 4px;font-size:22px;color:#FFD23F';
  const hint = document.createElement('p');
  hint.textContent = 'Tap a button to hear it. Power slider changes bow draw strength. Close with the X.';
  hint.style.cssText = 'margin:0 0 12px;opacity:.75';
  const power = document.createElement('input');
  power.type = 'range';
  power.min = '0';
  power.max = '1';
  power.step = '0.05';
  power.value = '1';
  power.style.cssText = 'width:min(320px,100%);margin-bottom:12px';
  const close = document.createElement('button');
  close.textContent = '✕';
  close.style.cssText = 'position:fixed;top:10px;right:12px;font-size:22px;background:#FF2D9A;color:#fff;border:0;border-radius:8px;padding:4px 12px;cursor:pointer';
  close.addEventListener('click', () => root.remove());
  root.append(title, hint, power, close);

  const heroes = [...new Set(ARSENAL.map((w) => w.hero))];
  for (const hero of heroes) {
    const row = document.createElement('div');
    row.style.cssText = 'margin:10px 0 2px;font-size:12px;letter-spacing:.2em;color:#3DF5FF;text-transform:uppercase';
    row.textContent = hero;
    root.appendChild(row);
    for (const weapon of ARSENAL.filter((w) => w.hero === hero)) {
      const parts: WeaponPart[] = weaponParts(weapon.id);
      const line = document.createElement('div');
      line.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:4px 0';
      const name = document.createElement('span');
      name.textContent = weapon.name;
      name.style.cssText = 'min-width:150px;color:' + (weapon.color ?? '#fff');
      line.appendChild(name);
      for (const part of parts.length > 0 ? parts : (['fire'] as WeaponPart[])) {
        const button = document.createElement('button');
        button.textContent = part;
        button.style.cssText = 'background:#1A1238;color:#E9FCFF;border:2px solid #3DF5FF;border-radius:8px;padding:6px 12px;font:inherit;cursor:pointer';
        button.addEventListener('click', () => play(weapon.id, part, Number(power.value)));
        line.appendChild(button);
      }
      root.appendChild(line);
    }
  }
  document.body.appendChild(root);
}
