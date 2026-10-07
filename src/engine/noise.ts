/** CPU-side value noise for the canvas generators (the GPU has its own copy in GLSL). */

import { hashString } from './rng';

function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ seed;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const smooth = (t: number): number => t * t * (3 - 2 * t);

export class Noise2D {
  private readonly seed: number;

  constructor(seed: number | string = 0) {
    this.seed = typeof seed === 'string' ? hashString(seed) : seed | 0;
  }

  /** Smooth value noise in [0, 1). */
  value(x: number, y: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const u = smooth(x - xi);
    const v = smooth(y - yi);
    const a = hash2(xi, yi, this.seed);
    const b = hash2(xi + 1, yi, this.seed);
    const c = hash2(xi, yi + 1, this.seed);
    const d = hash2(xi + 1, yi + 1, this.seed);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  /** Fractal sum of octaves, normalised to [0, 1). */
  fbm(x: number, y: number, octaves = 4): number {
    let sum = 0;
    let amp = 0.5;
    let norm = 0;
    let fx = x;
    let fy = y;
    for (let i = 0; i < octaves; i++) {
      sum += amp * this.value(fx, fy);
      norm += amp;
      fx = fx * 2.03 + 17.1;
      fy = fy * 2.03 + 9.7;
      amp *= 0.5;
    }
    return sum / norm;
  }
}
