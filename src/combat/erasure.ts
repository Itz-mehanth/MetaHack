import { BackSide, Color, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from '@iwsdk/core';
import type { WorldLook } from './worlds.js';

/**
 * A level's alien world tearing into reality: a sphere around the player
 * that opens in noisy patches onto that world's sky (gradient, nebula,
 * stars, a planet or moon, rings), with burning edges. In MR it eats
 * through the real room; at progress 1 it is the whole sky (VR). `veil`
 * dims whatever is left. One draw call; cheap 3D value noise.
 */
export class Erasure {
  readonly mesh: Mesh;
  /** 0 = intact, ~0.6 = most of the room gone, 1 = the whole sky. */
  progress = 0;
  veil = 0;
  /** 0..1 darkening of everything, sky included (blackout). */
  dim = 0;
  private readonly material: ShaderMaterial;

  constructor(color: string) {
    this.material = new ShaderMaterial({
      uniforms: {
        uProgress: { value: 0 },
        uVeil: { value: 0 },
        uDim: { value: 0 },
        uTime: { value: 0 },
        uColor: { value: new Color(color) },
        uTop: { value: new Color('#000000') },
        uHorizon: { value: new Color('#FF4FD8') },
        uGround: { value: new Color('#000000') },
        uCloud: { value: new Color('#3A0A3A') },
        uPlanet: { value: new Color('#FFFFFF') },
        uPlanetDir: { value: new Vector3(0, 0.5, -0.9).normalize() },
        uPlanetSize: { value: 0.03 },
        uRing: { value: 0 },
        uStars: { value: 1 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uProgress;
        uniform float uVeil;
        uniform float uDim;
        uniform float uTime;
        uniform vec3 uColor;
        uniform vec3 uTop;
        uniform vec3 uHorizon;
        uniform vec3 uGround;
        uniform vec3 uCloud;
        uniform vec3 uPlanet;
        uniform vec3 uPlanetDir;
        uniform float uPlanetSize;
        uniform float uRing;
        uniform float uStars;
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
        vec3 sky(vec3 d) {
          float h = d.y;
          vec3 col = mix(uHorizon, uTop, smoothstep(-0.02, 0.55, h));
          col = mix(col, uGround, smoothstep(0.0, -0.2, h));
          // Nebula / cloud banks, strongest near the horizon.
          float n = noise(d * 2.2 + vec3(uTime * 0.015, 0.0, 0.0)) * 0.6 + noise(d * 6.0 - vec3(0.0, uTime * 0.02, 0.0)) * 0.4;
          col += uCloud * smoothstep(0.42, 0.85, n) * (1.0 - abs(h) * 0.8) * 0.9;
          // Stars above the horizon.
          vec3 cell = floor(d * 240.0);
          float star = step(1.0 - 0.012 * uStars, hash(cell)) * (0.6 + 0.4 * sin(uTime * 2.0 + hash(cell + 3.0) * 40.0));
          col += vec3(star) * smoothstep(-0.02, 0.15, h);
          // Planet, moon or sun with a lit limb and a halo.
          float c = dot(d, uPlanetDir);
          float r = cos(uPlanetSize);
          float disc = smoothstep(r - 0.0015, r + 0.0015, c);
          vec3 side = normalize(d - uPlanetDir * c);
          float lit = 0.35 + 0.65 * smoothstep(-0.6, 0.8, dot(side, normalize(vec3(-0.6, 0.6, 0.2))));
          float bands = 0.85 + 0.15 * sin(dot(d, vec3(0.0, 1.0, 0.3)) * 260.0 / max(uPlanetSize, 0.02) * 0.02);
          col = mix(col, uPlanet * lit * bands, disc);
          float halo = smoothstep(r - 0.06, r, c) * (1.0 - disc);
          col += mix(uPlanet, uColor, 0.5) * halo * 0.45;
          // Ring / accretion disc: a tilted band around the planet.
          if (uRing > 0.5) {
            vec3 axis = normalize(vec3(0.25, 1.0, 0.15));
            float a = acos(clamp(c, -1.0, 1.0));
            float tilt = abs(dot(side, axis));
            float band = smoothstep(0.02, 0.0, abs(a - uPlanetSize * 1.9)) * smoothstep(0.35, 0.0, tilt);
            col += uColor * band * (1.0 - disc * 0.9) * 1.5;
          }
          return col;
        }
        void main() {
          vec3 d = normalize(vDir);
          float n = noise(d * 3.0 + vec3(0.0, uTime * 0.06, 0.0)) * 0.65 + noise(d * 9.0 - vec3(uTime * 0.1)) * 0.35;
          float erased = uProgress >= 0.999 ? 1.0 : 1.0 - smoothstep(uProgress - 0.015, uProgress + 0.015, n);
          float edge = uProgress >= 0.999 ? 0.0 : (1.0 - smoothstep(0.0, 0.06, abs(n - uProgress))) * step(0.001, uProgress);
          vec3 color = mix(vec3(0.05), sky(d), erased) + uColor * edge * 1.8;
          float alpha = max(max(erased, edge * 0.9), uVeil);
          gl_FragColor = vec4(color * (1.0 - uDim), alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: BackSide,
      toneMapped: false,
    });
    this.mesh = new Mesh(new SphereGeometry(7, 48, 32), this.material);
    this.mesh.name = 'Erasure';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -5;
    this.mesh.visible = false;
  }

  /** Shows `look`'s world through the tears. */
  setLook(look: WorldLook): void {
    const u = this.material.uniforms;
    (u.uColor.value as Color).set(look.accent);
    (u.uTop.value as Color).set(look.top);
    (u.uHorizon.value as Color).set(look.horizon);
    (u.uGround.value as Color).set(look.ground);
    (u.uCloud.value as Color).set(look.cloud);
    (u.uPlanet.value as Color).set(look.planet);
    (u.uPlanetDir.value as Vector3).set(look.planetDir[0], look.planetDir[1], look.planetDir[2]).normalize();
    u.uPlanetSize.value = look.planetSize;
    u.uRing.value = look.ring ? 1 : 0;
    u.uStars.value = look.stars;
  }

  /** Eases toward the requested progress and veil, centred on the player. */
  update(dt: number, time: number, head: Vector3, progress: number, veil: number): void {
    const rate = progress >= 0.999 ? 3 : 1.2;
    this.progress += (progress - this.progress) * Math.min(1, dt * rate);
    if (progress >= 0.999 && this.progress > 0.98) this.progress = 1;
    this.veil += (veil - this.veil) * Math.min(1, dt * 1.5);
    const on = this.progress > 0.002 || this.veil > 0.002;
    this.mesh.visible = on;
    if (!on) return;
    this.mesh.position.copy(head);
    const u = this.material.uniforms;
    u.uProgress.value = this.progress;
    u.uVeil.value = this.veil;
    u.uDim.value = this.dim;
    u.uTime.value = time;
  }
}
