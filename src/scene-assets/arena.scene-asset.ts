import {
  BackSide,
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
} from '@iwsdk/core';

/**
 * Neon VR arena shown when there is no passthrough (VR sessions and the 2D
 * browser preview). Cheap by design: one shader dome, one shader floor,
 * a ring of unlit monoliths and halo rings. Origin at floor centre.
 */

const domeMaterial = new ShaderMaterial({
  side: BackSide,
  depthWrite: false,
  uniforms: {},
  vertexShader: /* glsl */ `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    varying vec3 vDir;
    float hash(vec3 p) {
      p = fract(p * 0.3183099 + 0.1);
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }
    void main() {
      float h = vDir.y;
      vec3 top = vec3(0.01, 0.0, 0.05);
      vec3 mid = vec3(0.10, 0.02, 0.22);
      vec3 horizon = vec3(1.0, 0.18, 0.55);
      vec3 col = mix(mid, top, smoothstep(0.05, 0.7, h));
      col += horizon * pow(max(0.0, 1.0 - abs(h - 0.02) * 6.0), 3.0) * 0.9;
      col += vec3(0.1, 0.9, 1.0) * pow(max(0.0, 1.0 - abs(h - 0.12) * 18.0), 6.0) * 0.25;
      vec3 cell = floor(vDir * 180.0);
      float star = step(0.9975, hash(cell)) * smoothstep(0.1, 0.4, h);
      col += vec3(star);
      if (h < 0.0) col = mix(horizon * 0.25, vec3(0.0), smoothstep(0.0, -0.3, h));
      gl_FragColor = vec4(col, 1.0);
    }
  `,
});

const floorMaterial = new ShaderMaterial({
  transparent: true,
  depthWrite: false,
  uniforms: {},
  vertexShader: /* glsl */ `
    varying vec3 vPos;
    void main() {
      vPos = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * viewMatrix * vec4(vPos, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    varying vec3 vPos;
    float grid(vec2 p, float size) {
      vec2 g = abs(fract(p / size - 0.5) - 0.5) / fwidth(p / size);
      return 1.0 - min(min(g.x, g.y), 1.0);
    }
    void main() {
      float d = length(vPos.xz);
      float fade = 1.0 - smoothstep(4.0, 26.0, d);
      float minor = grid(vPos.xz, 1.0) * 0.35;
      float major = grid(vPos.xz, 5.0);
      vec3 col = vec3(0.1, 0.85, 1.0) * minor + vec3(1.0, 0.2, 0.6) * major;
      float ring = smoothstep(0.04, 0.0, abs(d - 1.2)) * 0.8;
      col += vec3(0.2, 1.0, 1.0) * ring;
      float a = max(max(minor, major), ring) * fade;
      gl_FragColor = vec4(col + vec3(0.02, 0.0, 0.05), max(a, 0.85 * fade));
    }
  `,
});

const monolithMaterial = new MeshBasicMaterial({ color: '#07050E' });
const stripCyan = new MeshBasicMaterial({ color: '#3DF5FF' });
const stripPink = new MeshBasicMaterial({ color: '#FF2D9A' });

export function createArena(): Group {
  const root = new Group();
  root.name = 'Arena';

  const dome = new Mesh(new SphereGeometry(60, 48, 24), domeMaterial);
  dome.name = 'Dome';
  dome.renderOrder = -10;

  const floor = new Mesh(new PlaneGeometry(60, 60), floorMaterial);
  floor.name = 'Floor';
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.001;

  const monoliths = new Group();
  monoliths.name = 'Monoliths';
  const slab = new BoxGeometry(1.4, 1, 1.4);
  const strip = new BoxGeometry(1.45, 0.06, 1.45);
  for (let i = 0; i < 14; i += 1) {
    const angle = (i / 14) * Math.PI * 2;
    const radius = 18 + (i % 3) * 4;
    const height = 6 + ((i * 7) % 5) * 3;
    const tower = new Group();
    tower.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    const body = new Mesh(slab, monolithMaterial);
    body.scale.y = height;
    body.position.y = height / 2;
    const band = new Mesh(strip, i % 2 ? stripCyan : stripPink);
    band.position.y = height * 0.92;
    const band2 = new Mesh(strip, i % 2 ? stripPink : stripCyan);
    band2.position.y = height * 0.35;
    tower.add(body, band, band2);
    monoliths.add(tower);
  }

  const halos = new Group();
  halos.name = 'Halos';
  const haloGeometry = new TorusGeometry(9, 0.05, 6, 120);
  for (let i = 0; i < 3; i += 1) {
    const halo = new Mesh(haloGeometry, i === 1 ? stripPink : stripCyan);
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 9 + i * 2.5;
    halo.scale.setScalar(1 + i * 0.35);
    halos.add(halo);
  }

  root.add(dome, floor, monoliths, halos);
  return root;
}
