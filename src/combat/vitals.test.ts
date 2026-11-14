import { describe, expect, it } from 'vitest';
import { BEAT_CRITICAL, BEAT_LOW, Vitals, vitalLevel } from './vitals.js';

const DT = 1 / 72;

/** Steps `seconds` with the given shield; returns how many heartbeats fell. */
function run(v: Vitals, seconds: number, health: number, armed = true): number {
  let beats = 0;
  for (let t = 0; t < seconds; t += DT) if (v.update(DT, health, 5, true, armed).beat) beats += 1;
  return beats;
}

describe('vitalLevel', () => {
  it('is fine above 40%, low at 40% or less, critical on the last pip', () => {
    expect(vitalLevel(5, 5)).toBe('ok');
    expect(vitalLevel(3, 5)).toBe('ok');
    expect(vitalLevel(2, 5)).toBe('low');
    expect(vitalLevel(1, 5)).toBe('critical');
    expect(vitalLevel(0, 5)).toBe('ok');
  });
});

describe('Vitals', () => {
  it('copies a new run silently: a full shield is not a restore', () => {
    const v = new Vitals();
    v.update(DT, 0, 5, false, false);
    const e = v.update(DT, 5, 5, false, false);
    expect(e.gained).toBe(0);
    const next = v.update(DT, 5, 5, true, true);
    expect(next.gained).toBe(0);
    expect(next.lost).toBe(0);
    expect(v.health).toBe(5);
  });

  it('reports a loss once, flashes, and holds then drains the ghost', () => {
    const v = new Vitals();
    v.update(DT, 5, 5, true, true);
    const e = v.update(DT, 4, 5, true, true);
    expect(e.lost).toBe(1);
    expect(v.hurt).toBeGreaterThan(0.9);
    expect(v.ghost).toBe(5);
    expect(v.update(DT, 4, 5, true, true).lost).toBe(0);
    // Holds first...
    run(v, 0.3, 4);
    expect(v.ghost).toBe(5);
    // ...then drains to the real value and the flash is gone.
    run(v, 1.5, 4);
    expect(v.ghost).toBe(4);
    expect(v.hurt).toBe(0);
  });

  it('reports a restore and sets the ghost to the new shield', () => {
    const v = new Vitals();
    v.update(DT, 3, 5, true, true);
    const e = v.update(DT, 4, 5, true, true);
    expect(e.gained).toBe(1);
    expect(v.heal).toBeGreaterThan(0.9);
    expect(v.ghost).toBe(4);
  });

  it('warns once on falling to low, and again on the last pip', () => {
    const v = new Vitals();
    v.update(DT, 5, 5, true, true);
    expect(v.update(DT, 3, 5, true, true).enteredLow).toBe(false);
    const low = v.update(DT, 2, 5, true, true);
    expect(low.enteredLow).toBe(true);
    expect(low.enteredCritical).toBe(false);
    expect(v.update(DT, 2, 5, true, true).enteredLow).toBe(false);
    expect(v.update(DT, 1, 5, true, true).enteredCritical).toBe(true);
    expect(v.danger).toBe(1);
  });

  it('goes straight to critical from a heavy hit without a low warning', () => {
    const v = new Vitals();
    v.update(DT, 5, 5, true, true);
    const e = v.update(DT, 1, 5, true, true);
    expect(e.enteredCritical).toBe(true);
    expect(e.enteredLow).toBe(false);
  });

  it('warns again after recovering and falling again', () => {
    const v = new Vitals();
    v.update(DT, 2, 5, true, true);
    v.update(DT, 4, 5, true, true);
    expect(v.level).toBe('ok');
    expect(v.update(DT, 2, 5, true, true).enteredLow).toBe(true);
  });

  it('beats about once a second when low, faster on the last pip, never when fine or off', () => {
    const low = new Vitals();
    low.update(DT, 2, 5, true, true);
    const lowBeats = run(low, 10, 2);
    expect(lowBeats).toBeGreaterThanOrEqual(Math.floor(10 / (BEAT_LOW + 0.05)));
    expect(lowBeats).toBeLessThanOrEqual(Math.ceil(10 / BEAT_LOW));

    const critical = new Vitals();
    critical.update(DT, 1, 5, true, true);
    const criticalBeats = run(critical, 10, 1);
    expect(criticalBeats).toBeGreaterThanOrEqual(Math.floor(10 / (BEAT_CRITICAL + 0.05)));
    expect(criticalBeats).toBeGreaterThan(lowBeats);

    const fine = new Vitals();
    fine.update(DT, 5, 5, true, true);
    expect(run(fine, 10, 5)).toBe(0);

    const paused = new Vitals();
    paused.update(DT, 1, 5, true, false);
    expect(run(paused, 10, 1, false)).toBe(0);
  });

  it('pulses on a beat and the pulse dies away', () => {
    const v = new Vitals();
    v.update(DT, 1, 5, true, true);
    let pulsed = false;
    for (let t = 0; t < 2; t += DT) {
      v.update(DT, 1, 5, true, true);
      if (v.pulse > 0.99) pulsed = true;
    }
    expect(pulsed).toBe(true);
    run(v, 0.5, 5);
    expect(v.pulse).toBe(0);
  });

  it('reports the last pip going as a loss and has nothing to warn about at zero', () => {
    const v = new Vitals();
    v.update(DT, 1, 5, true, true);
    const e = v.update(DT, 0, 5, true, true);
    expect(e.lost).toBe(1);
    expect(v.level).toBe('ok');
    expect(v.danger).toBe(0);
  });

  it('copies silently when the maximum changes (an upgrade)', () => {
    const v = new Vitals();
    v.update(DT, 5, 5, true, true);
    const e = v.update(DT, 6, 6, true, true);
    expect(e.gained).toBe(0);
    expect(v.max).toBe(6);
  });
});
