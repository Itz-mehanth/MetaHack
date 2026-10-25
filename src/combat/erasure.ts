import { BackSide, Color, Mesh, ShaderMaterial, SphereGeometry, type Vector3 } from '@iwsdk/core';

/**
 * OBLIVAX unmaking reality: a sphere around the player that eats the world
 * in noisy patches. Where a patch is "erased" the sphere is opaque deep
 * space with stars; at the edges it burns in the Unmaker's colour. In MR
 * this dissolves your real room; `veil` dims everything else toward grey.
 * One draw call; the shader is cheap 3D value noise.
 */
export class Erasure {
  readonly mesh: Mesh;
  /** 0 = intact, ~0.6 = most of the world gone. */
  progress = 0;
  /** 0..0.6 darkening over what remains. */
  veil = 0;
  private readonly material: ShaderMaterial;

  constructor(color: string) {
    this.material = new ShaderMaterial({
      uniforms: {
        uProgress: { value: 0 },
        uVeil: { value: 0 },
        uTime: { value: 0 },
        uColor: { value: new Color(color) },
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
        uniform float uTime;
        uniform vec3 uColor;
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
          float n = noise(d * 3.0 + vec3(0.0, uTime * 0.06, 0.0)) * 0.65 + noise(d * 9.0 - vec3(uTime * 0.1)) * 0.35;
          float erased = 1.0 - smoothstep(uProgress - 0.015, uProgress + 0.015, n);
          float edge = 1.0 - smoothstep(0.0, 0.06, abs(n - uProgress));
          edge *= step(0.001, uProgress);
          // Deep space with a sprinkle of stars.
          vec3 cell = floor(d * 220.0);
          float star = step(0.992, hash(cell)) * (0.6 + 0.4 * sin(uTime * 3.0 + hash(cell + 7.0) * 30.0));
          vec3 space = vec3(0.02, 0.0, 0.05) + vec3(star) + uColor * 0.08 * noise(d * 2.0);
          vec3 color = mix(vec3(0.05), space, erased) + uColor * edge * 1.8;
          float alpha = max(max(erased, edge * 0.9), uVeil);
          gl_FragColor = vec4(color, alpha);
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

  /** Eases toward the requested progress and veil, centred on the player. */
  update(dt: number, time: number, head: Vector3, progress: number, veil: number): void {
    this.progress += (progress - this.progress) * Math.min(1, dt * 1.2);
    this.veil += (veil - this.veil) * Math.min(1, dt * 1.5);
    const on = this.progress > 0.002 || this.veil > 0.002;
    this.mesh.visible = on;
    if (!on) return;
    this.mesh.position.copy(head);
    const u = this.material.uniforms;
    u.uProgress.value = this.progress;
    u.uVeil.value = this.veil;
    u.uTime.value = time;
  }
}
