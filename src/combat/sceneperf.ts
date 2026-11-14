import type { Object3D } from '@iwsdk/core';

/**
 * Three.js walks the whole scene graph every frame to update each object's world
 * matrix, hidden or not. The game keeps hundreds of pooled objects hidden (enemy
 * models, hero models, the hero carousel, the galaxy, effects): about 8,700
 * objects on the menu, nearly all invisible, which a CPU profile showed as over a
 * third of the game's frame time, even with no enemy on screen.
 *
 * This makes `root` skip its hidden direct children (and so everything under
 * them). A child that is shown again is brought up to date by the next update,
 * because every object recomputes its own matrix each time it is visited.
 */
export function skipHiddenBranches(root: Object3D): void {
  root.updateMatrixWorld = function updateMatrixWorld(this: Object3D, force?: boolean): void {
    // The same steps Object3D.updateMatrixWorld takes for the object itself.
    if (this.matrixAutoUpdate) this.updateMatrix();
    if (this.matrixWorldNeedsUpdate || force) {
      if (this.matrixWorldAutoUpdate === true) {
        if (this.parent === null) this.matrixWorld.copy(this.matrix);
        else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);
      }
      this.matrixWorldNeedsUpdate = false;
      force = true;
    }
    const children = this.children;
    for (let i = 0, n = children.length; i < n; i += 1) {
      const child = children[i];
      if (child.visible) child.updateMatrixWorld(force);
    }
  };
}
