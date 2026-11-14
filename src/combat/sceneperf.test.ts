import { Group, Mesh, Object3D } from '@iwsdk/core';
import { describe, expect, it } from 'vitest';
import { skipHiddenBranches } from './sceneperf.js';

/** root > [pool (hidden or shown) > thing > bit, shown > leaf], all placed away from the origin. */
function tree() {
  const root = new Group();
  const pool = new Group();
  const thing = new Group();
  const bit = new Mesh();
  const shown = new Group();
  const leaf = new Mesh();
  root.position.set(1, 0, 0);
  pool.position.set(0, 2, 0);
  thing.position.set(0, 0, 3);
  bit.position.set(0.5, 0, 0);
  shown.position.set(0, 0, 7);
  leaf.position.set(0, 1, 0);
  root.add(pool, shown);
  pool.add(thing);
  thing.add(bit);
  shown.add(leaf);
  return { root, pool, thing, bit, shown, leaf };
}

const worldOf = (o: Object3D) => [o.matrixWorld.elements[12], o.matrixWorld.elements[13], o.matrixWorld.elements[14]];

describe('skipping hidden branches of the scene graph', () => {
  it('gives exactly the usual matrices when everything is visible', () => {
    const a = tree();
    const b = tree();
    skipHiddenBranches(b.root);
    a.root.updateMatrixWorld();
    b.root.updateMatrixWorld();
    for (const key of ['root', 'pool', 'thing', 'bit', 'shown', 'leaf'] as const) {
      expect(worldOf(b[key])).toEqual(worldOf(a[key]));
    }
    expect(worldOf(b.bit)).toEqual([1.5, 2, 3]);
  });

  it('does not update anything under a hidden child, but still updates the rest', () => {
    const t = tree();
    skipHiddenBranches(t.root);
    t.pool.visible = false;
    t.root.updateMatrixWorld();
    expect(worldOf(t.shown)).toEqual([1, 0, 7]);
    expect(worldOf(t.leaf)).toEqual([1, 1, 7]);
    expect(worldOf(t.thing)).toEqual([0, 0, 0]); // never visited
    expect(worldOf(t.bit)).toEqual([0, 0, 0]);
  });

  it('brings a branch up to date the first time it is shown again, even after its parent moved', () => {
    const t = tree();
    skipHiddenBranches(t.root);
    t.pool.visible = false;
    t.root.updateMatrixWorld();
    t.root.position.set(10, 0, 0); // the parent moves while the branch is hidden
    t.root.updateMatrixWorld();
    t.pool.visible = true;
    t.root.updateMatrixWorld();
    expect(worldOf(t.pool)).toEqual([10, 2, 0]);
    expect(worldOf(t.bit)).toEqual([10.5, 2, 3]);
  });

  it('follows a hidden child that is moved and then shown in the same frame', () => {
    const t = tree();
    skipHiddenBranches(t.root);
    t.pool.visible = false;
    t.root.updateMatrixWorld();
    t.pool.position.set(0, 5, 0);
    t.pool.visible = true;
    t.root.updateMatrixWorld();
    expect(worldOf(t.thing)).toEqual([1, 5, 3]);
  });

  it('updates the root itself even when it has no children shown', () => {
    const t = tree();
    skipHiddenBranches(t.root);
    t.pool.visible = false;
    t.shown.visible = false;
    t.root.updateMatrixWorld();
    expect(worldOf(t.root)).toEqual([1, 0, 0]);
  });
});
