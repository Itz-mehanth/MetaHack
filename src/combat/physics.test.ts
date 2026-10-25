import { describe, expect, it } from 'vitest';
import { createRagdoll, createRope, layRope, RAG, RAG_POINTS, Room, Verlet } from './physics.js';

const settle = (body: Verlet, room: Room, seconds: number, gravity = 9.8) => {
  for (let t = 0; t < seconds; t += 1 / 72) body.step(1 / 72, gravity, room);
};

describe('room collisions', () => {
  it('lands a falling point on the floor and stops it', () => {
    const room = new Room();
    const body = new Verlet(1, 0);
    body.radius[0] = 0.05;
    body.setPoint(0, 0, 2, 0);
    settle(body, room, 3);
    expect(body.pos[1]).toBeCloseTo(0.05, 2);
    expect(body.maxSpeed()).toBeLessThan(0.05);
  });

  it('rests on a table and slides off a wall it is thrown into', () => {
    const room = new Room();
    // A table top 0.75 m high, 1 x 1 m, centred at (0, 0.75, -1).
    room.add({ x: 0, y: 1, z: 0 }, { x: 0, y: 0.75, z: -1 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, 0.5, 0.5);
    // A wall at z = -3 facing the player (+Z), 4 m wide and 3 m tall.
    room.add({ x: 0, y: 0, z: 1 }, { x: 0, y: 1.5, z: -3 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, 2, 1.5);
    const cup = new Verlet(1, 0);
    cup.setPoint(0, 0.1, 1.5, -1);
    settle(cup, room, 2);
    expect(cup.pos[1]).toBeCloseTo(0.8, 2);
    const ball = new Verlet(1, 0);
    ball.setPoint(0, 0, 1.6, -2.4);
    ball.setVelocity(0, 0, 0, -10);
    settle(ball, room, 3);
    expect(ball.pos[2]).toBeGreaterThan(-3);
    expect(ball.pos[1]).toBeCloseTo(0.05, 2);
  });

  it('bounces a velocity off the last contact', () => {
    const room = new Room();
    const p = { x: 0, y: -0.1, z: 0 };
    expect(room.collide(p, 0.05)).toBe(true);
    expect(p.y).toBeCloseTo(0.05);
    const v = { x: 2, y: -4, z: 0 };
    room.bounce(v, 0.5, 0.5);
    expect(v.y).toBeCloseTo(2);
    expect(v.x).toBeCloseTo(1);
  });
});

describe('ragdoll', () => {
  it('collapses onto the floor keeping its bone lengths', () => {
    const room = new Room();
    const body = createRagdoll();
    // A standing figure 1.8 m tall.
    const pose: Record<number, [number, number, number]> = {
      [RAG.pelvis]: [0, 0.95, 0],
      [RAG.chest]: [0, 1.35, 0],
      [RAG.head]: [0, 1.7, 0],
      [RAG.shoulderL]: [-0.22, 1.5, 0],
      [RAG.elbowL]: [-0.25, 1.2, 0],
      [RAG.handL]: [-0.27, 0.95, 0],
      [RAG.shoulderR]: [0.22, 1.5, 0],
      [RAG.elbowR]: [0.25, 1.2, 0],
      [RAG.handR]: [0.27, 0.95, 0],
      [RAG.hipL]: [-0.1, 0.92, 0],
      [RAG.kneeL]: [-0.1, 0.5, 0.02],
      [RAG.footL]: [-0.1, 0.06, 0],
      [RAG.hipR]: [0.1, 0.92, 0],
      [RAG.kneeR]: [0.1, 0.5, 0.02],
      [RAG.footR]: [0.1, 0.06, 0],
    };
    for (let i = 0; i < RAG_POINTS; i += 1) body.setPoint(i, ...pose[i]);
    body.relink();
    const thigh = body.distance(RAG.hipL, RAG.kneeL);
    // Shoved backwards at the chest.
    body.push(RAG.chest, 0, 0, -3);
    body.push(RAG.head, 0, 0, -3);
    settle(body, room, 4);
    for (let i = 0; i < RAG_POINTS; i += 1) expect(body.pos[i * 3 + 1]).toBeGreaterThan(0.03);
    expect(body.pos[RAG.chest * 3 + 1]).toBeLessThan(0.4);
    expect(body.distance(RAG.hipL, RAG.kneeL)).toBeCloseTo(thigh, 1);
    expect(body.maxSpeed()).toBeLessThan(0.2);
  });
});

describe('rope', () => {
  it('sags between pinned ends', () => {
    const room = new Room();
    room.floor = -10;
    const rope = createRope(10);
    const a = { x: 0, y: 1.5, z: 0 };
    const b = { x: 0, y: 1.5, z: -3 };
    layRope(rope, a, b, 1.15);
    for (let t = 0; t < 2; t += 1 / 72) {
      rope.step(1 / 72, 9.8, room, 6);
      rope.setPoint(0, a.x, a.y, a.z);
      rope.setPoint(10, b.x, b.y, b.z);
    }
    expect(rope.pos[5 * 3 + 1]).toBeLessThan(1.3);
  });
});
