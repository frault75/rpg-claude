/**
 * Ground clutter: grass tufts, flowers and pebbles standing in their hundreds, drawn as
 * one instanced mesh per kind so they cost a single draw call each.
 */

import * as THREE from 'three';
import { SY, world } from '../engine/diorama/space';
import { hash2 } from '../engine/noise';
import { hex, PixelImage, type RGBA, ramp } from '../pixel/pixel';
import { pixelTexture } from './billboard';

export type ScatterKind = 'tuft' | 'flowers' | 'reedlet';

/** Draw one small clump, w x h pixels. */
export function clump(kind: ScatterKind, seed: number, grass = '#4E7E48'): PixelImage {
  const img = new PixelImage(10, 9);
  const g = ramp(grass, 6);
  const blade = (x0: number, len: number, lean: number, tone: number) => {
    for (let k = 0; k < len; k++) {
      const x = Math.round(x0 + (lean * k) / len);
      img.set(x, 8 - k, g[Math.min(5, tone + (k > len * 0.6 ? 1 : 0))]!);
    }
  };
  const n = kind === 'reedlet' ? 4 : 6;
  for (let i = 0; i < n; i++) {
    const x0 = 2 + hash2(i, 1, seed) * 6;
    const len = (kind === 'reedlet' ? 6 : 3) + Math.floor(hash2(i, 2, seed) * 4);
    blade(x0, len, (hash2(i, 3, seed) - 0.5) * 4, 1 + Math.floor(hash2(i, 4, seed) * 3));
  }
  if (kind === 'flowers') {
    const cols = ['#F4F0E8', '#F2D24A', '#E58AA8', '#9AB4F0'];
    for (let i = 0; i < 2; i++) {
      const c = hex(cols[Math.floor(hash2(i, 9, seed) * cols.length)]!);
      const x = 2 + Math.floor(hash2(i, 7, seed) * 6);
      const y = 2 + Math.floor(hash2(i, 8, seed) * 3);
      img.set(x, y, c);
      img.set(x + 1, y, [c[0] * 0.7, c[1] * 0.65, c[2] * 0.75, 255] as RGBA);
    }
  }
  return img;
}

export class Scatter {
  readonly mesh: THREE.InstancedMesh;

  /** Plant `points` (x, y, h in art pixels) with copies of `img`, bottom centre down. */
  constructor(img: PixelImage, points: readonly (readonly [number, number, number])[]) {
    const geo = new THREE.PlaneGeometry(img.w, img.h * SY);
    geo.translate(0, (img.h * SY) / 2, 0);
    const n = geo.getAttribute('normal') as THREE.BufferAttribute;
    for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 0.8, 0.6);
    const mat = new THREE.MeshLambertMaterial({ map: pixelTexture(img), alphaTest: 0.5 });
    this.mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, points.length));
    this.mesh.count = points.length;
    const m = new THREE.Matrix4();
    points.forEach((p, i) => {
      const [x, y, z] = world(Math.round(p[0]), Math.round(p[1]), p[2]);
      m.makeTranslation(x, y, z);
      this.mesh.setMatrixAt(i, m);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.MeshLambertMaterial).map?.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
