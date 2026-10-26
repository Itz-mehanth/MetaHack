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
});
