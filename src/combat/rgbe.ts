/**
 * Radiance HDR (.hdr, RGBE) decoding and tone mapping, pure so it can be unit tested.
 *
 * The REAL ROOM backdrop (roombackdrop.ts) is a photographed room stored as a Poly Haven
 * equirectangular HDR. IWSDK does not expose an HDR loader to game code, so the file is read
 * here: the run-length coded scanlines become linear floats, which are exposed, run through a
 * filmic curve and encoded as sRGB bytes for an ordinary texture.
 */

export interface HdrImage {
  readonly width: number;
  readonly height: number;
  /** Linear RGB, three floats per pixel, top row first. */
  readonly data: Float32Array;
}

/** 2^(e - 136): the scale an exponent byte gives its three mantissa bytes. */
const SCALE = new Float32Array(256);
for (let e = 1; e < 256; e += 1) SCALE[e] = 2 ** (e - 136);

export function decodeRgbe(bytes: Uint8Array): HdrImage {
  let pos = 0;
  const line = (): string => {
    let s = '';
    while (pos < bytes.length && bytes[pos] !== 10) s += String.fromCharCode(bytes[pos++]);
    pos += 1;
    return s;
  };
  if (!line().startsWith('#?')) throw new Error('Not a Radiance HDR file');
  let format = '';
  for (let guard = 0; guard < 64; guard += 1) {
    const l = line().trim();
    if (l === '') break;
    if (l.startsWith('FORMAT=')) format = l.slice(7);
  }
  if (format !== '' && format !== '32-bit_rle_rgbe') throw new Error(`Unsupported HDR format ${format}`);
  const size = /^-Y (\d+) \+X (\d+)$/.exec(line().trim());
  if (size == null) throw new Error('Unsupported HDR orientation (only -Y +X)');
  const height = Number(size[1]);
  const width = Number(size[2]);
  if (width < 1 || height < 1 || width * height > 64 * 1024 * 1024) throw new Error('Unreasonable HDR size');

  const data = new Float32Array(width * height * 3);
  const scan = new Uint8Array(width * 4);
  for (let y = 0; y < height; y += 1) {
    const rle = width >= 8 && width <= 0x7fff && bytes[pos] === 2 && bytes[pos + 1] === 2 && (bytes[pos + 2] & 0x80) === 0;
    if (rle) {
      if (((bytes[pos + 2] << 8) | bytes[pos + 3]) !== width) throw new Error('HDR scanline width mismatch');
      pos += 4;
      for (let c = 0; c < 4; c += 1) {
        let x = 0;
        while (x < width) {
          if (pos >= bytes.length) throw new Error('HDR data ends early');
          let count = bytes[pos++];
          if (count > 128) {
            count -= 128;
            const v = bytes[pos++];
            if (x + count > width) throw new Error('HDR run overflows the scanline');
            for (let i = 0; i < count; i += 1) scan[(x++) * 4 + c] = v;
          } else {
            if (count === 0 || x + count > width) throw new Error('HDR literal overflows the scanline');
            for (let i = 0; i < count; i += 1) scan[(x++) * 4 + c] = bytes[pos++];
          }
        }
      }
    } else {
      if (pos + width * 4 > bytes.length) throw new Error('HDR data ends early');
      scan.set(bytes.subarray(pos, pos + width * 4));
      pos += width * 4;
    }
    let o = y * width * 3;
    for (let x = 0; x < width; x += 1) {
      const f = SCALE[scan[x * 4 + 3]];
      data[o++] = scan[x * 4] * f;
      data[o++] = scan[x * 4 + 1] * f;
      data[o++] = scan[x * 4 + 2] * f;
    }
  }
  return { width, height, data };
}

/** Linear 0..1 to sRGB byte, through a table (no pow per pixel). */
const SRGB = new Uint8Array(4097);
for (let i = 0; i <= 4096; i += 1) {
  const v = i / 4096;
  SRGB[i] = Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055));
}

/** ACES filmic fit (Narkowicz): linear in, 0..1 out. */
const aces = (x: number): number => {
  const y = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);
  return y < 0 ? 0 : y > 1 ? 1 : y;
};

/**
 * Exposes, tone maps and sRGB-encodes the image as RGBA bytes. Rows are written bottom first,
 * the order a WebGL texture upload expects, so row 0 of the result is the bottom of the picture.
 */
export function toRgba8(image: HdrImage, exposure = 1): Uint8Array {
  const { width, height, data } = image;
  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    let i = y * width * 3;
    let o = (height - 1 - y) * width * 4;
    for (let x = 0; x < width; x += 1) {
      out[o++] = SRGB[Math.round(aces(data[i++] * exposure) * 4096)];
      out[o++] = SRGB[Math.round(aces(data[i++] * exposure) * 4096)];
      out[o++] = SRGB[Math.round(aces(data[i++] * exposure) * 4096)];
      out[o++] = 255;
    }
  }
  return out;
}
