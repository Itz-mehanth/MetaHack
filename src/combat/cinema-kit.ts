import { BackSide, CanvasTexture, Color, Mesh, ShaderMaterial, SphereGeometry, Sprite, SpriteMaterial, Vector3 } from '@iwsdk/core';

/**
 * Pieces shared by the movies (cinema.ts, chaptercinema.ts): easing helpers,
 * the sky-sphere shader (a sky, nebula, stars and a black sun with eyes that
 * can burn through it), glow and ring textures, a lit planet, title cards and
 * the subtitle strip.
 */

// -------------------------------------------------------------- helpers
export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smooth = (x: number): number => {
  const k = clamp01(x);
  return k * k * (3 - 2 * k);
};
/** 0 before `a`, 1 after `b`, smooth between. */
export const ramp = (t: number, a: number, b: number): number => smooth((t - a) / (b - a));
/** A pulse that jumps to 1 at `at` and decays at `rate` per second. */
export const hit = (t: number, at: number, rate: number): number => (t < at ? 0 : Math.exp(-(t - at) * rate));
export const outBack = (x: number): number => {
  const k = clamp01(x) - 1;
  return 1 + 2.70158 * k * k * k + 1.70158 * k * k;
};

export const VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uBlack;
  uniform float uFlash;
  uniform float uVoid;
  uniform float uEyes;
  uniform float uDread;
  uniform float uDissolve;
  uniform float uStars;
  uniform float uPulse;
  uniform float uEyeMode;
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uGround;
  uniform vec3 uCloud;
  uniform vec3 uAccent;
  uniform vec3 uVoidDir;
  varying vec3 vDir;
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 col = mix(uHorizon, uTop, smoothstep(-0.02, 0.6, h));
    col = mix(col, uGround, smoothstep(0.0, -0.25, h));
    float n = noise(d * 2.4 + vec3(uTime * 0.02, 0.0, 0.0)) * 0.6 + noise(d * 6.5 - vec3(0.0, uTime * 0.03, 0.0)) * 0.4;
    col += uCloud * smoothstep(0.4, 0.85, n) * (1.0 - abs(h) * 0.7) * 0.95;
    vec3 cell = floor(d * 260.0);
    float star = step(0.986, hash(cell)) * (0.55 + 0.45 * sin(uTime * 2.2 + hash(cell + 3.0) * 40.0));
    col += vec3(star) * uStars * smoothstep(-0.05, 0.15, h);

    // OBLIVAX: a black sun with a burning rim, tendrils and three slit eyes.
    if (uVoid > 0.001) {
      float c = dot(d, uVoidDir);
      float ang = acos(clamp(c, -1.0, 1.0));
      float inside = smoothstep(uVoid, uVoid - 0.025, ang);
      float rim = exp(-pow((ang - uVoid) * 18.0, 2.0));
      float corona = exp(-max(ang - uVoid, 0.0) * 4.5);
      vec3 right = normalize(cross(uVoidDir, vec3(0.0, 1.0, 0.0)));
      vec3 up = cross(right, uVoidDir);
      float a2 = atan(dot(d, up), dot(d, right));
      float tendril = pow(max(0.0, sin(a2 * 11.0 + uTime * 0.35 + noise(d * 5.0) * 4.0) * 0.5 + 0.5), 7.0) * exp(-max(ang - uVoid, 0.0) * 3.2) * step(uVoid, ang);
      col += uAccent * (rim * 2.4 + corona * 0.55 + tendril * 1.1) * (0.8 + 0.4 * sin(uTime * 3.0)) ;
      col = mix(col, vec3(0.0), inside);
      vec2 q = vec2(dot(d, right), dot(d, up)) / max(c, 0.05) / max(tan(uVoid), 0.05);
      float eyes = 0.0;
      vec2 e1 = vec2(-0.40, 0.08);
      vec2 e2 = vec2(0.40, 0.08);
      vec2 e3 = vec2(0.0, 0.46);
      float w = 0.05 * uEyes + 0.004;
      float eh = 0.2 * uEyes + 0.01;
      if (uEyeMode < 0.5) {
        eyes += smoothstep(1.0, 0.55, length((q - e1) / vec2(w, eh)));
        eyes += smoothstep(1.0, 0.55, length((q - e2) / vec2(w, eh)));
        eyes += smoothstep(1.0, 0.55, length((q - e3) / vec2(w * 1.3, eh * 1.25)));
      } else if (uEyeMode < 1.5) {
        // One great eye.
        eyes += smoothstep(1.0, 0.55, length((q - vec2(0.0, 0.05)) / vec2(w * 3.2, eh * 1.7)));
      } else if (uEyeMode < 2.5) {
        // Two wide eyes.
        eyes += smoothstep(1.0, 0.55, length((q - vec2(-0.3, 0.08)) / vec2(w * 1.8, eh * 1.2)));
        eyes += smoothstep(1.0, 0.55, length((q - vec2(0.3, 0.08)) / vec2(w * 1.8, eh * 1.2)));
      } else if (uEyeMode < 3.5) {
        // A row of four.
        for (int k = 0; k < 4; k++) {
          float fx = -0.57 + float(k) * 0.38;
          eyes += smoothstep(1.0, 0.55, length((q - vec2(fx, 0.1)) / vec2(w * 0.8, eh)));
        }
      } else {
        // A diamond of four.
        eyes += smoothstep(1.0, 0.55, length((q - vec2(0.0, 0.42)) / vec2(w, eh)));
        eyes += smoothstep(1.0, 0.55, length((q - vec2(0.0, -0.3)) / vec2(w, eh)));
        eyes += smoothstep(1.0, 0.55, length((q - vec2(-0.42, 0.06)) / vec2(w, eh)));
        eyes += smoothstep(1.0, 0.55, length((q - vec2(0.42, 0.06)) / vec2(w, eh)));
      }
      col += mix(uAccent, vec3(1.0), 0.8) * eyes * inside * 2.2 * step(0.05, uEyes);
      col += uAccent * uPulse * (rim + corona * 0.5);
    }

    col = mix(col, col * vec3(1.0, 0.45, 0.5) + vec3(0.1, 0.0, 0.03), uDread);
    col = mix(col, vec3(1.0), uFlash);
    col *= 1.0 - uBlack;

    // The dome dissolves in noisy patches, burning at the edges.
    float m = noise(d * 3.2 + vec3(0.0, uTime * 0.05, 0.0)) * 0.65 + noise(d * 9.0 - vec3(uTime * 0.08)) * 0.35;
    float keep = uDissolve >= 0.999 ? 0.0 : smoothstep(uDissolve - 0.02, uDissolve + 0.02, m);
    float edge = uDissolve > 0.001 && uDissolve < 0.999 ? (1.0 - smoothstep(0.0, 0.07, abs(m - uDissolve))) : 0.0;
    col += uAccent * edge * 2.0;
    gl_FragColor = vec4(col, max(keep, edge * 0.9));
  }
`;

// -------------------------------------------------------------- textures
export function glowTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

export function ringTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(128, 128, 90, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.55, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return new CanvasTexture(c);
}

/** A lit planet: a soft terminator, faint bands and a glowing limb. */
export function planetMaterial(color: string): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uColor: { value: new Color(color) } },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vP;
      void main() {
        vN = normalize(normalMatrix * normal);
        vP = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying vec3 vN;
      varying vec3 vP;
      void main() {
        float lit = clamp(dot(normalize(vN), normalize(vec3(-0.55, 0.6, 0.65))), 0.0, 1.0);
        float bands = 0.92 + 0.08 * sin(vP.y * 15.0 + sin(vP.x * 5.0) * 1.2);
        float limb = pow(1.0 - clamp(normalize(vN).z, 0.0, 1.0), 3.0);
        vec3 col = uColor * bands * (0.16 + 0.95 * lit) + uColor * limb * 0.7;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
}

export const FONT = "'Bangers', 'Impact', 'Arial Black', sans-serif";

export interface TitleCard {
  readonly sprite: Sprite;
  readonly material: SpriteMaterial;
  readonly width: number;
}

export function titleCard(text: string, sub: string, color: string, width: number): TitleCard {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 384;
  const g = c.getContext('2d')!;
  const texture = new CanvasTexture(c);
  const draw = (): void => {
    g.clearRect(0, 0, 1024, 384);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    // As big as fits the card.
    let size = 250;
    g.font = `${size}px ${FONT}`;
    const measured = g.measureText(text).width;
    if (measured > 900) {
      size = Math.floor((size * 900) / measured);
      g.font = `${size}px ${FONT}`;
    }
    g.lineJoin = 'round';
    g.shadowColor = color;
    g.shadowBlur = 48;
    g.lineWidth = 22;
    g.strokeStyle = '#06020F';
    g.strokeText(text, 512, 150);
    g.shadowBlur = 0;
    const grad = g.createLinearGradient(0, 30, 0, 270);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.55, '#FFFFFF');
    grad.addColorStop(1, color);
    g.fillStyle = grad;
    g.fillText(text, 512, 150);
    if (sub) {
      g.font = `76px ${FONT}`;
      g.lineWidth = 12;
      g.strokeStyle = '#06020F';
      g.strokeText(sub, 512, 318);
      g.fillStyle = color;
      g.fillText(sub, 512, 318);
    }
    texture.needsUpdate = true;
  };
  draw();
  // The comic font may still be downloading: draw again when it is ready.
  void document.fonts?.load('100px Bangers').then(draw);
  const material = new SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, opacity: 0 });
  const sprite = new Sprite(material);
  sprite.scale.set(width, width * 0.375, 1);
  sprite.renderOrder = 80;
  sprite.visible = false;
  return { sprite, material, width };
}

/** Subtitle strip: up to two lines of text on a dark band. */
export class Caption {
  readonly sprite: Sprite;
  private readonly canvas = document.createElement('canvas');
  private readonly texture: CanvasTexture;
  private readonly material: SpriteMaterial;
  private shown = '';

  /** `height` is the canvas height in pixels (width is 1024); `width` is the strip's width in metres. */
  constructor(height: number, width: number) {
    this.canvas.width = 1024;
    this.canvas.height = height;
    this.texture = new CanvasTexture(this.canvas);
    this.material = new SpriteMaterial({ map: this.texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, opacity: 0 });
    this.sprite = new Sprite(this.material);
    this.sprite.scale.set(width, (width * height) / 1024, 1);
    this.sprite.renderOrder = 90;
  }

  set(text: string, color: string, opacity: number, small = false): void {
    this.material.opacity = opacity;
    this.sprite.visible = opacity > 0.01 && text !== '';
    const key = `${text}|${color}|${small}`;
    if (key === this.shown) return;
    this.shown = key;
    const g = this.canvas.getContext('2d')!;
    const mid = this.canvas.height / 2;
    g.clearRect(0, 0, 1024, this.canvas.height);
    if (text === '') {
      this.texture.needsUpdate = true;
      return;
    }
    let size = small ? 40 : 54;
    let lines: string[] = [];
    for (;;) {
      g.font = `700 ${size}px Rajdhani, 'Segoe UI', system-ui, sans-serif`;
      lines = wrapText(g, text, 940);
      if (lines.length * (size + 8) + 22 <= this.canvas.height - 6 || size <= 30) break;
      size -= 4;
    }
    const height = lines.length * (size + 8) + 22;
    g.fillStyle = 'rgba(6,2,15,0.62)';
    g.beginPath();
    g.roundRect(20, mid - height / 2, 984, height, 22);
    g.fill();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    lines.forEach((line, i) => {
      const y = mid - height / 2 + 11 + (size + 8) * (i + 0.5);
      g.lineWidth = 8;
      g.strokeStyle = '#06020F';
      g.strokeText(line, 512, y);
      g.fillStyle = color;
      g.fillText(line, 512, y);
    });
    this.texture.needsUpdate = true;
  }
}

export function wrapText(g: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line === '' ? word : `${line} ${word}`;
    if (g.measureText(next).width > maxWidth && line !== '') {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line !== '') lines.push(line);
  return lines;
}

export const SPEAKER_COLOR: Record<string, string> = { narrator: '#FFFFFF', oblivax: '#FF4FD8', vex: '#C04DFF', echo: '#3DF5FF' };

/** The movie sky: a transparent sphere that always covers the room, with every uniform the shader needs. */
export function createDome(voidDir: Vector3): { mesh: Mesh; material: ShaderMaterial } {
  const material = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBlack: { value: 1 },
      uFlash: { value: 0 },
      uVoid: { value: 0 },
      uEyes: { value: 0 },
      uEyeMode: { value: 0 },
      uDread: { value: 0 },
      uDissolve: { value: 0 },
      uStars: { value: 1 },
      uPulse: { value: 0 },
      uTop: { value: new Color() },
      uHorizon: { value: new Color() },
      uGround: { value: new Color() },
      uCloud: { value: new Color() },
      uAccent: { value: new Color() },
      uVoidDir: { value: voidDir },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: BackSide,
    toneMapped: false,
  });
  const mesh = new Mesh(new SphereGeometry(6, 48, 32), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 60;
  return { mesh, material };
}
