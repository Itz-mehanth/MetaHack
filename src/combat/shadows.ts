import {
  CanvasTexture,
  Color,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  type Object3D,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from '@iwsdk/core';

const CAPACITY = 48;

/**
 * Soft contact shadows: one instanced mesh of dark radial-gradient discs laid
 * on the floor (or a real table) under enemies, props and thrown bodies. Each
 * frame the owner calls `begin()`, `add()` per caster and `end()`. In
 * passthrough the discs darken the real floor, which is what makes a virtual
 * creature look like it is standing in the room instead of floating over it.
 */
export class BlobShadows {
  readonly mesh: InstancedMesh;
  private readonly matrix = new Matrix4();
  private readonly position = new Vector3();
  private readonly scale = new Vector3();
  private readonly rotation = new Quaternion();
  private readonly strength = new Color();
  private count = 0;

  constructor(parent: Object3D) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const c = canvas.getContext('2d')!;
    const gradient = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(0,0,0,1)');
    gradient.addColorStop(0.45, 'rgba(0,0,0,0.62)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gradient;
    c.fillRect(0, 0, 64, 64);
    const geometry = new PlaneGeometry(1, 1);
    geometry.rotateX(-Math.PI / 2);
    const material = new MeshBasicMaterial({
      map: new CanvasTexture(canvas),
      color: '#000000',
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    // The per-instance colour is the shadow's strength (0..1), applied to alpha.
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        '#include <color_fragment>\n  diffuseColor.a *= vColor.r;\n  diffuseColor.rgb = vec3(0.0);',
      );
    };
    this.mesh = new InstancedMesh(geometry, material, CAPACITY);
    this.mesh.name = 'BlobShadows';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;
    this.mesh.count = 0;
    this.mesh.setColorAt(0, this.strength.setScalar(0));
    parent.add(this.mesh);
  }

  begin(): void {
    this.count = 0;
  }

  /** A shadow of `radius` metres at the floor point (x, y, z); `strength` 0..1. */
  add(x: number, y: number, z: number, radius: number, strength: number): void {
    if (this.count >= CAPACITY || strength <= 0.01 || radius <= 0) return;
    this.position.set(x, y + 0.006, z);
    this.scale.set(radius * 2, 1, radius * 2);
    this.matrix.compose(this.position, this.rotation, this.scale);
    this.mesh.setMatrixAt(this.count, this.matrix);
    this.mesh.setColorAt(this.count, this.strength.setScalar(Math.min(1, strength)));
    this.count += 1;
  }

  end(): void {
    this.mesh.count = this.count;
    this.mesh.visible = this.count > 0;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
