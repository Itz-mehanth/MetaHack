import { World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { CombatSystem } from './combat-system.js';
import { setupLanding } from './landing.js';
import { PanelSystem } from './panel.js';

World.create(
  document.getElementById('scene-container') as HTMLDivElement,
  projectOptions,
).then((world) => {
  world.registerSystem(CombatSystem);
  world.registerSystem(PanelSystem);
  // Phones report 3x pixel density; cap it so the page stays smooth (XR sets its own resolution).
  const touch = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  world.renderer.setPixelRatio(Math.min(window.devicePixelRatio, touch ? 1.5 : 2));
  setupLanding(world);
  // If the browser drops the graphics context (rare, but it happens on headsets), say so instead of showing a frozen page.
  world.renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    const note = document.createElement('div');
    note.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:#06020F;color:#E9FCFF;font:700 26px system-ui,sans-serif;text-align:center;padding:24px';
    note.innerHTML = '<div>The graphics were reset by the browser.</div><button style="font:inherit;padding:14px 34px;border:0;border-radius:12px;background:#3DF5FF;color:#06020F">RELOAD SURGE</button>';
    note.querySelector('button')!.addEventListener('click', () => window.location.reload());
    document.body.appendChild(note);
  });
});
