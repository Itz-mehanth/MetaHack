/**
 * Game icons (game-icons.net, CC BY 3.0: Lorc, Delapouite; see CREDITS)
 * served from public/icons as white SVG silhouettes, tinted on demand for
 * canvas-drawn UI.
 */

export const ICON_NAMES = [
  'arc',
  'talon',
  'tempest',
  'orion',
  'weaver',
  'havoc',
  'ronin',
  'psion',
  'vanguard',
  'vesper',
  'coins',
  'shield',
  'skull',
  'crack',
  'garage',
  'settings',
  'overdrive',
  'rapid',
  'power',
  'heal',
  'hostage',
  'map',
  'star',
  'play',
  'lock',
  'trophy',
  'broken',
  'speed',
  'timer',
  'radar',
] as const;

export type IconName = (typeof ICON_NAMES)[number];

const images = new Map<string, HTMLImageElement>();
const tinted = new Map<string, HTMLCanvasElement>();

function url(name: string): string {
  return `${import.meta.env.BASE_URL}icons/${name}.svg`;
}

/** Resolves once every icon has loaded (or failed; missing icons are skipped). */
export const iconsReady: Promise<void> = Promise.all(
  ICON_NAMES.map(
    (name) =>
      new Promise<void>((resolve) => {
        const image = new Image();
        image.onload = () => {
          images.set(name, image);
          resolve();
        };
        image.onerror = () => resolve();
        image.src = url(name);
      }),
  ),
).then(() => undefined);

/** A cached, tinted copy of `name` at `size` pixels, or null if not loaded. */
function tint(name: string, color: string, size: number): HTMLCanvasElement | null {
  const image = images.get(name);
  if (image == null) return null;
  const key = `${name}|${color}|${size}`;
  let canvas = tinted.get(key);
  if (canvas) return canvas;
  canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const c = canvas.getContext('2d')!;
  c.drawImage(image, 0, 0, size, size);
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = color;
  c.fillRect(0, 0, size, size);
  tinted.set(key, canvas);
  return canvas;
}

/**
 * Draws icon `name` centred at (x, y) in `color`, with an optional glow.
 * Returns false if the icon is not loaded yet.
 */
export function drawIcon(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, size: number, color: string, glow = 0): boolean {
  const pixels = Math.min(256, Math.ceil(size / 32) * 32);
  const image = tint(name, color, pixels);
  if (image == null) return false;
  ctx.save();
  if (glow > 0) {
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
  }
  ctx.drawImage(image, x - size / 2, y - size / 2, size, size);
  ctx.restore();
  return true;
}
