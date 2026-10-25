import { BackSide, Color, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from '@iwsdk/core';

/**
 * The jump between worlds: for a few seconds the player is wrapped in a
 * travel tunnel that streams past toward a bright destination ahead, then
 * a flash drops them into the level. Styles: hyperspace warp streaks, a
 * swirling wormhole, a black hole's accretion spiral, a jet flight through
 * rushing clouds, and a tunnel of fire. One opaque sphere, one shader; in
 * MR it fully covers the room for the jump.
 */

export type TransitStyle = 'warp' | 'wormhole' | 'blackhole' | 'sky' | 'fire';

const STYLE_INDEX: Record<TransitStyle, number> = { warp: 0, wormhole: 1, blackhole: 2, sky: 3, fire: 4 };

/** Seconds: fade in, travel, flash out. */
export const TRANSIT_SECONDS = 4.2;

export class Transit {
  readonly mesh: Mesh;
  active = false;
  private t = 0;
  private done: (() => void) | null = null;
  private readonly material: ShaderMaterial;

  constructor() {
    this.material = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uStyle: { value: 0 },
        uSpeed: { value: 1 },
        uFade: { value: 0 },
        uFlash: { value: 0 },
        uForward: { value: new Vector3(0, 0, -1) },
        uA: { value: new Color('#3DF5FF') },
        uB: { value: new Color('#FF2D9A') },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uStyle;
        uniform float uSpeed;
        uniform float uFade;
        uniform float uFlash;
        uniform vec3 uForward;
        uniform vec3 uA;
        uniform vec3 uB;
        varying vec3 vDir;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
        }
        void main() {
          vec3 d = normalize(vDir);
          vec3 f = normalize(uForward);
          float z = dot(d, f);
          vec3 side = normalize(cross(f, vec3(0.0, 1.0, 0.0)));
          vec3 up = cross(side, f);
          float a = atan(dot(d, up), dot(d, side));
          // Tunnel depth: things far ahead converge on the centre.
          float depth = 1.0 / max(0.04, 1.0 - z);
          float s = uTime * uSpeed;
          vec3 col = vec3(0.0);
          float core = pow(max(z, 0.0), 40.0);
          if (uStyle < 0.5) {
            // Hyperspace: star streaks racing past.
            float lane = floor(a * 40.0);
            float h = hash(vec2(lane, 3.0));
            float streak = smoothstep(0.92, 1.0, fract(depth * 0.35 - s * (0.6 + h) + h * 9.0));
            streak *= step(0.55, hash(vec2(lane, 7.0)));
            col = mix(uA, vec3(1.0), 0.6) * streak * 1.6 + uB * 0.06 * (1.0 - z);
          } else if (uStyle < 1.5) {
            // Wormhole: a swirling striped tube.
            float swirl = sin(a * 6.0 + depth * 1.6 - s * 6.0) * 0.5 + 0.5;
            float rings = sin(depth * 3.0 - s * 9.0) * 0.5 + 0.5;
            col = mix(uA, uB, swirl) * (0.35 + 0.65 * rings) * (0.4 + 0.6 * smoothstep(-1.0, 1.0, z));
          } else if (uStyle < 2.5) {
            // Black hole: a dark throat lined by a burning accretion spiral.
            float spiral = sin(a * 3.0 + log(depth) * 6.0 - s * 4.0) * 0.5 + 0.5;
            float disc = smoothstep(0.55, 0.95, spiral) * smoothstep(0.98, 0.3, z);
            col = mix(uB, uA, spiral) * disc * 1.4;
            col *= 1.0 - smoothstep(0.85, 0.995, z);
            col += uA * smoothstep(0.93, 0.97, z) * smoothstep(0.995, 0.97, z) * 2.0;
          } else if (uStyle < 3.5) {
            // Jet flight: sky above, cloud sea rushing below and past.
            float h = dot(d, vec3(0.0, 1.0, 0.0));
            col = mix(uB, uA, smoothstep(-0.2, 0.6, h));
            vec2 uv = vec2(a * 2.0, depth * 0.5 - s * 1.5);
            float cloud = noise(uv * 3.0) * 0.6 + noise(uv * 7.0) * 0.4;
            col = mix(col, vec3(1.0), smoothstep(0.5, 0.8, cloud) * (1.0 - smoothstep(0.1, 0.5, h)) * 0.9);
          } else {
            // Fire tunnel.
            vec2 uv = vec2(a * 3.0, depth * 0.6 - s * 2.0);
            float n = noise(uv * 2.5) * 0.6 + noise(uv * 6.0) * 0.4;
            col = mix(uB, uA, n) * (0.4 + n);
          }
          col += mix(uA, vec3(1.0), 0.5) * core * 3.0;
          col = mix(col, vec3(1.0), uFlash);
          gl_FragColor = vec4(col, uFade);
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: BackSide,
      toneMapped: false,
    });
    this.mesh = new Mesh(new SphereGeometry(5, 48, 32), this.material);
    this.mesh.name = 'Transit';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 50;
    this.mesh.visible = false;
  }

  /** Starts a jump toward `forward`; `done` runs at the flash. */
  start(style: TransitStyle, a: string, b: string, forward: Vector3, done: () => void): void {
    const u = this.material.uniforms;
    u.uStyle.value = STYLE_INDEX[style];
    (u.uA.value as Color).set(a);
    (u.uB.value as Color).set(b);
    (u.uForward.value as Vector3).set(forward.x, 0, forward.z).normalize();
    this.t = 0;
    this.done = done;
    this.active = true;
    this.mesh.visible = true;
  }

  /** Returns the travel progress 0..1 (for sound); calls `done` once at the flash. */
  update(dt: number, head: Vector3): number {
    if (!this.active) return 0;
    this.t += dt;
    const t = this.t;
    const u = this.material.uniforms;
    u.uTime.value = t;
    // Accelerate through the jump.
    u.uSpeed.value = 0.6 + Math.min(1, t / (TRANSIT_SECONDS - 0.8)) * 2.4;
    u.uFade.value = Math.min(1, t / 0.4) * (t > TRANSIT_SECONDS ? Math.max(0, 1 - (t - TRANSIT_SECONDS) / 0.6) : 1);
    u.uFlash.value = t > TRANSIT_SECONDS - 0.35 ? Math.min(1, (t - (TRANSIT_SECONDS - 0.35)) / 0.35) * (t > TRANSIT_SECONDS ? Math.max(0, 1 - (t - TRANSIT_SECONDS) / 0.6) : 1) : 0;
    this.mesh.position.copy(head);
    if (t >= TRANSIT_SECONDS && this.done) {
      const done = this.done;
      this.done = null;
      done();
    }
    if (t > TRANSIT_SECONDS + 0.6) {
      this.active = false;
      this.mesh.visible = false;
    }
    return Math.min(1, t / TRANSIT_SECONDS);
  }
}
