import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ROOMS } from './roombackdrop.js';
import { decodeRgbe, toRgba8 } from './rgbe.js';

const header = (w: number, h: number): number[] => [...Buffer.from(`#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${h} +X ${w}\n`, 'ascii')];

describe('Radiance HDR decoding', () => {
  it('reads flat (uncompressed) scanlines and applies the exponent', () => {
    // 2x1: (128,64,0) at exponent 129 = x2^(129-136)... = 1/128 per step, and a black pixel (exponent 0)
    const bytes = new Uint8Array([...header(2, 1), 128, 64, 0, 136, 0, 0, 0, 0]);
    const img = decodeRgbe(bytes);
    expect([img.width, img.height]).toEqual([2, 1]);
    expect(img.data[0]).toBeCloseTo(128, 3);
    expect(img.data[1]).toBeCloseTo(64, 3);
    expect(img.data[2]).toBeCloseTo(0, 3);
    expect([img.data[3], img.data[4], img.data[5]]).toEqual([0, 0, 0]);
  });

  it('reads run-length coded scanlines (runs and literals)', () => {
    const w = 10;
    // channel planes: R is a run of 10 x 100; G is 4 literal values then a run of 6; B all zero (run); E a run of 136 (scale 1)
    const planeR = [128 + 10, 100];
    const planeG = [4, 1, 2, 3, 4, 128 + 6, 9];
    const planeB = [128 + 10, 0];
    const planeE = [128 + 10, 136];
    const bytes = new Uint8Array([...header(w, 1), 2, 2, 0, w, ...planeR, ...planeG, ...planeB, ...planeE]);
    const img = decodeRgbe(bytes);
    expect(img.width).toBe(10);
    for (let x = 0; x < w; x += 1) expect(img.data[x * 3]).toBeCloseTo(100, 3);
    expect([0, 1, 2, 3].map((x) => img.data[x * 3 + 1])).toEqual([1, 2, 3, 4]);
    expect([4, 9].map((x) => img.data[x * 3 + 1])).toEqual([9, 9]);
    expect(img.data[2]).toBe(0);
  });

  it('rejects files that are not Radiance HDR, or are cut short', () => {
    expect(() => decodeRgbe(new Uint8Array([1, 2, 3]))).toThrow();
    expect(() => decodeRgbe(new Uint8Array([...header(2, 2), 1, 2, 3, 136]))).toThrow();
  });
});

describe('tone mapping', () => {
  it('flips rows so the picture is upright in a texture, and exposes', () => {
    // 1x2: top pixel bright, bottom pixel black
    const img = { width: 1, height: 2, data: new Float32Array([4, 4, 4, 0, 0, 0]) };
    const rgba = toRgba8(img, 1);
    expect(rgba.length).toBe(8);
    // row 0 of the upload is the bottom of the picture: black, then the bright top
    expect(rgba[0]).toBe(0);
    expect(rgba[4]).toBeGreaterThan(240);
    expect(rgba[7]).toBe(255);
    // a dim pixel is brighter with more exposure
    const dim = { width: 1, height: 1, data: new Float32Array([0.05, 0.05, 0.05]) };
    expect(toRgba8(dim, 4)[0]).toBeGreaterThan(toRgba8(dim, 1)[0]);
  });
});

describe('the shipped room', () => {
  it('decodes to a plausible 2:1 picture with bright windows and dim corners', () => {
    for (const room of Object.values(ROOMS)) {
      const img = decodeRgbe(new Uint8Array(readFileSync(`public/${room.file}`)));
      expect(img.width).toBe(img.height * 2);
      let min = Infinity;
      let max = 0;
      for (let i = 0; i < img.data.length; i += 997) {
        min = Math.min(min, img.data[i]);
        max = Math.max(max, img.data[i]);
        expect(Number.isFinite(img.data[i])).toBe(true);
      }
      expect(max).toBeGreaterThan(1);
      expect(min).toBeLessThan(0.5);
    }
  });
});
