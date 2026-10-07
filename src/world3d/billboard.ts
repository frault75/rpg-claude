/**
 * Billboards: pixel sprites standing upright in the diorama (figures, trees, props).
 * They are lit by the scene's lights, cast shadows shaped like their silhouette, and
 * can show one frame of a sheet. Positions are map coordinates in art pixels.
 */

import * as THREE from 'three';
import { SY, world } from '../engine/diorama/space';
import type { PixelImage } from '../pixel/pixel';

export function pixelTexture(img: PixelImage | HTMLCanvasElement): THREE.Texture {
  let t: THREE.Texture;
  if (!('data' in img)) t = new THREE.CanvasTexture(img);
  else {
    const rows = new Uint8Array(img.w * img.h * 4);
    const stride = img.w * 4;
    for (let y = 0; y < img.h; y++) rows.set(img.data.subarray(y * stride, (y + 1) * stride), (img.h - 1 - y) * stride);
    t = new THREE.DataTexture(rows, img.w, img.h, THREE.RGBAFormat);
  }
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

/** An upright plane w x h art pixels, its bottom centre at the origin; normals lean back
 * towards the sky so figures catch light from above as well as in front. */
function uprightGeometry(w: number, h: number, ax: number): THREE.PlaneGeometry {
  const g = new THREE.PlaneGeometry(w, h * SY);
  g.translate(w / 2 - ax, (h * SY) / 2, 0);
  const n = g.getAttribute('normal') as THREE.BufferAttribute;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 0.55, 0.835);
  return g;
}

export interface BillboardOpts {
  cols?: number;
  rows?: number;
  /** Anchor in art pixels from the frame's top-left; defaults to the bottom centre. */
  anchor?: readonly [number, number];
  emissive?: THREE.Texture | null;
  castShadow?: boolean;
  /** Not lit by the scene (speech bubbles, flames). */
  unlit?: boolean;
  /** Push the plane back (art pixels of depth) so it sorts behind things at the same spot. */
  lean?: number;
}

export class Billboard {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshLambertMaterial | THREE.MeshBasicMaterial>;
  readonly map: THREE.Texture;
  readonly emissive: THREE.Texture | null;
  x = 0;
  y = 0;
  h = 0;
  flip = false;
  private readonly cols: number;
  private readonly rows: number;
  private flashV = 0;

  constructor(
    texture: THREE.Texture,
    readonly frameW: number,
    readonly frameH: number,
    opts: BillboardOpts = {},
  ) {
    this.cols = opts.cols ?? 1;
    this.rows = opts.rows ?? 1;
    const anchor = opts.anchor ?? [frameW / 2, frameH];
    // Each billboard gets its own texture object (sharing the image) for its frame offset.
    this.map = texture.clone();
    this.map.needsUpdate = true;
    this.emissive = opts.emissive ? opts.emissive.clone() : null;
    if (this.emissive) this.emissive.needsUpdate = true;
    const geo = uprightGeometry(frameW, frameH, anchor[0]);
    geo.translate(0, -(frameH - anchor[1]) * SY, 0);
    const mat = opts.unlit
      ? new THREE.MeshBasicMaterial({ map: this.map, alphaTest: 0.5 })
      : new THREE.MeshLambertMaterial({
          map: this.map,
          alphaTest: 0.5,
          emissiveMap: this.emissive,
          emissive: this.emissive ? new THREE.Color(1, 1, 1) : new THREE.Color(0, 0, 0),
        });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = opts.castShadow ?? true;
    this.mesh.receiveShadow = true;
    this.mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: this.map, alphaTest: 0.5 });
    this.setFrame(0, 0);
  }

  static fromImage(img: PixelImage, opts: BillboardOpts & { glow?: PixelImage | null } = {}): Billboard {
    return new Billboard(pixelTexture(img), img.w, img.h, { ...opts, emissive: opts.glow ? pixelTexture(opts.glow) : null });
  }

  setFrame(col: number, row: number): void {
    for (const t of [this.map, this.emissive]) {
      if (!t) continue;
      t.repeat.set(1 / this.cols, 1 / this.rows);
      t.offset.set(col / this.cols, 1 - (row + 1) / this.rows);
    }
  }

  set visible(v: boolean) {
    this.mesh.visible = v;
  }

  get visible(): boolean {
    return this.mesh.visible;
  }

  set opacity(v: number) {
    const m = this.mesh.material;
    m.opacity = v;
    m.transparent = v < 1;
    m.alphaTest = v < 1 ? 0.01 : 0.5;
    m.needsUpdate = true;
  }

  /** Flash white (hits in battle). */
  set flash(v: number) {
    if (Math.abs(v - this.flashV) < 0.01) return;
    this.flashV = v;
    const m = this.mesh.material;
    if (!(m instanceof THREE.MeshLambertMaterial)) return;
    if (!this.emissive) m.emissiveMap = v > 0 ? this.map : null;
    m.emissive.setScalar(this.emissive ? 1 + v * 2 : v);
    m.needsUpdate = true;
  }

  set glow(v: number) {
    const m = this.mesh.material;
    if (m instanceof THREE.MeshLambertMaterial) m.emissiveIntensity = v;
  }

  sync(): void {
    // Whole art pixels on screen: x, y (ground depth) and h map one to one.
    const [wx, wy, wz] = world(Math.round(this.x), Math.round(this.y), Math.round(this.h));
    this.mesh.position.set(wx, wy, wz);
    this.mesh.scale.x = this.flip ? -1 : 1;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    (this.mesh.customDepthMaterial as THREE.Material | undefined)?.dispose();
    this.map.dispose();
    this.emissive?.dispose();
  }
}
