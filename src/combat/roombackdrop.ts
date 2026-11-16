import { ClampToEdgeWrapping, DataTexture, Group, LinearFilter, LinearMipmapLinearFilter, Mesh, MeshBasicMaterial, RepeatWrapping, RGBAFormat, SphereGeometry, SRGBColorSpace, UnsignedByteType } from '@iwsdk/core';
import type { Object3D } from '@iwsdk/core';
import { decodeRgbe, toRgba8 } from './rgbe.js';

/**
 * REAL ROOM backdrop: a photographed room (an equirectangular HDR from Poly Haven, CC0) shown as the
 * sky of a VR session or a flat screen in place of the neon dome, floor and skyline. It makes the game
 * read like mixed reality for anyone without passthrough, and gives a believable room to record in.
 * The picture is fetched and decoded only when the backdrop is first shown.
 */

export interface RoomDef {
  readonly file: string;
  /** Exposure before the filmic curve. */
  readonly exposure: number;
  /** Turns the room (radians) so its best view faces where a player starts looking. */
  readonly yaw: number;
  /** Camera height the photo was taken from (metres), the sphere sits there above the floor. */
  readonly eye: number;
}

export const ROOMS: Readonly<Record<string, RoomDef>> = {
  small_empty_room_4: { file: 'env/rooms/small_empty_room_4_2k.hdr', exposure: 1, yaw: 0, eye: 1.5 },
};

export const DEFAULT_ROOM = 'small_empty_room_4';

export class RoomBackdrop {
  readonly group = new Group();
  private mesh: Mesh | null = null;
  private loadedId = '';
  private loading = false;

  constructor(parent: Object3D) {
    this.group.name = 'Backdrop';
    this.group.visible = false;
    parent.add(this.group);
  }

  get ready(): boolean {
    return this.mesh != null;
  }

  setVisible(on: boolean): void {
    this.group.visible = on && this.mesh != null;
  }

  /** Fetches, decodes and applies room `id`. Resolves true when it is on the sphere. */
  async load(id: string): Promise<boolean> {
    const def = ROOMS[id];
    if (def == null) return false;
    if (this.loadedId === id) return true;
    if (this.loading) return false;
    this.loading = true;
    try {
      const response = await fetch(`./${def.file}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const image = decodeRgbe(new Uint8Array(await response.arrayBuffer()));
      const texture = new DataTexture(toRgba8(image, def.exposure), image.width, image.height, RGBAFormat, UnsignedByteType);
      texture.colorSpace = SRGBColorSpace;
      texture.wrapS = RepeatWrapping;
      texture.wrapT = ClampToEdgeWrapping;
      texture.magFilter = LinearFilter;
      texture.minFilter = LinearMipmapLinearFilter;
      texture.generateMipmaps = true;
      texture.needsUpdate = true;
      if (this.mesh == null) {
        // Scaled by -1 on x so the inside of the sphere shows the picture the right way round.
        const geometry = new SphereGeometry(55, 64, 32);
        geometry.scale(-1, 1, 1);
        const material = new MeshBasicMaterial({ map: texture, depthWrite: false, fog: false, toneMapped: false });
        this.mesh = new Mesh(geometry, material);
        this.mesh.name = 'RoomSphere';
        this.mesh.renderOrder = -10;
        this.mesh.frustumCulled = false;
        this.group.add(this.mesh);
      } else {
        const material = this.mesh.material as MeshBasicMaterial;
        material.map?.dispose();
        material.map = texture;
        material.needsUpdate = true;
      }
      this.mesh.position.y = def.eye;
      this.mesh.rotation.y = def.yaw;
      this.loadedId = id;
      return true;
    } catch (error) {
      console.error('[RoomBackdrop] could not load the room', error);
      return false;
    } finally {
      this.loading = false;
    }
  }
}
