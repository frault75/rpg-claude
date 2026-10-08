/**
 * The light and air of the Blanchwood (DESIGN.md §7.3): a pale overcast that drains to
 * grisaille the deeper you go. `depth` runs from 0 at the wood's edge to 1 at Knell Chapel;
 * the maps set it as the party walks, and the music reads it to know how much to forget.
 */

import type { WorldRenderer } from '../../engine/diorama/renderer';
import { hash2 } from '../../engine/noise';
import type { PixelImage } from '../../pixel/pixel';
import { GROUND_DEFAULT, type GroundPalette } from '../../pixel/terrain';
import { blanch, woodTree } from '../../world3d/blanchwood';
import type { SkyDef } from '../../world3d/sky';

export const WOOD_GROUND: GroundPalette = { ...GROUND_DEFAULT, grass: '#7E9466', dirt: '#8A7860', stone: '#B8B0A0', vellum: '#DCD3BE' };
export const WOOD_SKY: SkyDef = { top: '#A8B0AC', horizon: '#ECE6D8', moon: null, stars: 0, clouds: 0.7, cloudColor: '#F4F0E8' };

let depthNow = 0;
/** How far into the forgetting the party is now (for the music). */
export const woodDepth = (): number => depthNow;

export function woodLight(r: WorldRenderer, depth: number): void {
  r.atmosphere = {
    sky: [0.72, 0.74, 0.76],
    ground: [0.5, 0.48, 0.44],
    ambient: 0.7,
    key: [1, 0.96, 0.88],
    keyLevel: 0.8,
    keyDir: [0.6, -0.62, -0.42],
    fogColor: [0.9, 0.88, 0.84],
    fogDist: [140, 620],
    fogMax: 0.5,
    mist: [12, 0.42, 0.008],
    mistDrift: [0.02, 0.008],
    background: [0.9, 0.88, 0.84],
  };
  r.grade = {
    exposure: 0.95,
    contrast: 1.06,
    saturation: 1,
    lift: [0.03, 0.03, 0.03],
    gain: [1.02, 1, 0.96],
    vignette: 0.9,
    grain: 0.024,
    bloom: 0.6,
    bloomThreshold: 0.88,
    dof: 0.9,
    focusBand: 110,
    focusRange: 320,
  };
  setDepth(r, depth);
}

/** The deeper, the greyer: saturation falls towards grisaille. */
export function setDepth(r: WorldRenderer, depth: number): void {
  depthNow = Math.max(0, Math.min(1, depth));
  r.grade.saturation = 1 - depthNow * 0.78;
  r.grade.contrast = 1.06 - depthNow * 0.1;
}

const trees = new Map<string, PixelImage>();
/** A tree of the wood, blanched to k (cached in steps of 0.05). */
export function blanchedTree(seed: number, k: number): PixelImage {
  const q = Math.round(Math.max(0, Math.min(1, k)) * 20) / 20;
  const key = `${seed}:${q}`;
  let img = trees.get(key);
  if (!img) {
    img = blanch(woodTree(seed), q, seed + 3);
    trees.set(key, img);
  }
  return img;
}

/** Ground rows where grass gives way to blank vellum as `k(x)` rises; a path where `path(y)` holds. */
export function blanchingGround(w: number, h: number, k: (x: number) => number, path: (x: number, y: number) => boolean, seed = 5): string[] {
  return Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => {
      if (hash2(x, y, seed) < k(x) * 0.95) return 'v';
      return path(x, y) ? 'd' : '.';
    }).join(''),
  );
}
