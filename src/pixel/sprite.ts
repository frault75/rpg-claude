/**
 * Pixel sprites for the HD-2D world: a plane showing one frame of a sprite sheet with
 * nearest-neighbour filtering, one texel per art pixel. A sprite can carry an emissive
 * image too (lit windows, flames), written to the second output of the world pass.
 */

import * as THREE from 'three';
import { SPRITE_FRAG, WORLD_VERT } from '../engine/hd2d/shaders';
import type { PixelImage } from './pixel';

/** World units per art pixel. The 1280 x 720 view shows about 427 x 240 art pixels. */
export const PX = 3;

/** Draw layers, back to front. Sprites in a layer are sorted by depth (their foot line). */
export const LAYER = { sky: 0, far: 1, water: 2, ground: 3, decal: 4, objects: 5, overhead: 6 } as const;

export function pixelTexture(img: PixelImage | HTMLCanvasElement): THREE.Texture {
  let t: THREE.Texture;
  if (img instanceof HTMLCanvasElement) t = new THREE.CanvasTexture(img);
  else {
    // Upload the buffer directly, flipped so row 0 is the top.
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

const BLACK = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
BLACK.needsUpdate = true;

export interface SheetLayout {
  cols: number;
  rows: number;
}

/** The material every pixel sprite uses. */
export function spriteMaterial(map: THREE.Texture, emissive: THREE.Texture | null): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: WORLD_VERT,
    fragmentShader: SPRITE_FRAG,
    transparent: false,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      tMap: { value: map },
      tEmissive: { value: emissive ?? BLACK },
      uHasEmissive: { value: emissive ? 1 : 0 },
      uGlow: { value: 1 },
      uFrame: { value: new THREE.Vector4(0, 0, 1, 1) },
      uOpacity: { value: 1 },
      uTint: { value: new THREE.Vector3(1, 1, 1) },
      uFlash: { value: 0 },
      uDissolve: { value: 0 },
      uClipY: { value: 1e9 },
    },
  });
}

export class PixelSprite {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  /** World position of the anchor (bottom centre by default), y pointing down. */
  x = 0;
  y = 0;
  /** Height above the ground (jumps, bobbing), world units. */
  z = 0;
  flip = false;
  /** Depth for sorting within the layer; defaults to y. */
  depth: number | null = null;
  layer: number = LAYER.objects;
  /** Snap to the art-pixel grid (on for everything but smooth camera-locked effects). */
  snap = true;
  readonly fw: number;
  readonly fh: number;
  private col = 0;
  private row = 0;

  constructor(
    texture: THREE.Texture,
    readonly frameW: number,
    readonly frameH: number,
    readonly layout: SheetLayout = { cols: 1, rows: 1 },
    /** Anchor within the frame, in art pixels from the top-left. */
    readonly anchor: readonly [number, number] = [frameW / 2, frameH],
    emissive: THREE.Texture | null = null,
  ) {
    this.fw = frameW * PX;
    this.fh = frameH * PX;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(this.fw, this.fh), spriteMaterial(texture, emissive));
    this.mesh.frustumCulled = false;
    this.setFrame(0, 0);
  }

  static fromImage(img: PixelImage, anchor?: readonly [number, number], emissive?: PixelImage | null): PixelSprite {
    return new PixelSprite(pixelTexture(img), img.w, img.h, { cols: 1, rows: 1 }, anchor ?? [img.w / 2, img.h], emissive ? pixelTexture(emissive) : null);
  }

  get uniforms(): Record<string, THREE.IUniform> {
    return this.mesh.material.uniforms;
  }

  setFrame(col: number, row: number): void {
    this.col = col;
    this.row = row;
    const { cols, rows } = this.layout;
    // Texture rows count from the bottom in UV space.
    (this.uniforms.uFrame!.value as THREE.Vector4).set(col / cols, 1 - (row + 1) / rows, 1 / cols, 1 / rows);
  }

  get frame(): [number, number] {
    return [this.col, this.row];
  }

  set opacity(v: number) {
    this.uniforms.uOpacity!.value = v;
    this.mesh.material.transparent = v < 1;
  }

  /** Flash white (hits in battle). */
  set flash(v: number) {
    this.uniforms.uFlash!.value = v;
  }

  set glow(v: number) {
    this.uniforms.uGlow!.value = v;
  }

  set dissolve(v: number) {
    this.uniforms.uDissolve!.value = v;
  }

  /** Hide everything below world y (a figure wading in water). */
  set clipY(v: number) {
    this.uniforms.uClipY!.value = v;
  }

  set visible(v: boolean) {
    this.mesh.visible = v;
  }

  get visible(): boolean {
    return this.mesh.visible;
  }

  setTint(r: number, g: number, b: number): void {
    (this.uniforms.uTint!.value as THREE.Vector3).set(r, g, b);
  }

  /** Push the transform into the mesh. */
  sync(): void {
    const ax = (this.anchor[0] - this.frameW / 2) * PX;
    const ay = (this.anchor[1] - this.frameH / 2) * PX;
    let cx = this.x - (this.flip ? -ax : ax);
    let cy = this.y - ay - this.z;
    if (this.snap) {
      // Snap the top-left corner to the art grid so texels land on pixels exactly.
      cx = Math.round((cx - this.fw / 2) / PX) * PX + this.fw / 2;
      cy = Math.round((cy - this.fh / 2) / PX) * PX + this.fh / 2;
    }
    const m = this.mesh;
    m.position.set(cx, -cy, 0);
    m.scale.x = this.flip ? -1 : 1;
    m.renderOrder = this.layer * 100000 + Math.round(this.depth ?? this.y);
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
