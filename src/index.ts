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
  setupLanding(world);
});
