/**
 * Trees, bushes, rocks and reeds in pixel art. Canopies are built from clusters of leafy
 * blobs, each shaded as a little sphere lit from the upper left, broken into leaf clumps
 * by noise, so they read as foliage rather than balls. Everything gets a selective outline.
 */

import { hash2, Noise2D } from '../engine/noise';
import { bayer, hex, PixelImage, type RGBA, ramp } from './pixel';

function tone(r: readonly RGBA[], t: number, x: number, y: number): RGBA {
  const f = Math.min(r.length - 1, Math.max(0, t));
  const i = Math.floor(f);
  return f - i > bayer(x, y) && i + 1 < r.length ? r[i + 1]! : r[i]!;
}

const LX = -0.62;
const LY = -0.78;

interface Blob {
  x: number;
  y: number;
  r: number;
}

/** Paint a cluster of leafy blobs; later blobs sit in front of earlier ones. */
function foliage(img: PixelImage, blobs: Blob[], leaf: readonly RGBA[], seed: number, opts: { clump?: number; berries?: RGBA | null } = {}): void {
  const n = new Noise2D(seed);
  const clump = opts.clump ?? 3.2;
  for (let bi = 0; bi < blobs.length; bi++) {
    const b = blobs[bi]!;
    for (let y = Math.floor(b.y - b.r - 2); y <= b.y + b.r + 2; y++) {
      for (let x = Math.floor(b.x - b.r - 2); x <= b.x + b.r + 2; x++) {
        const dx = x + 0.5 - b.x;
        const dy = y + 0.5 - b.y;
        // Ragged edge: the radius wobbles with noise.
        const rr = b.r * (0.86 + 0.28 * n.value(x / clump, y / clump));
        const d = Math.hypot(dx, dy);
        if (d > rr) continue;
        const nx = dx / rr;
        const ny = dy / rr;
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        let l = -(nx * LX + ny * LY) * 0.7 + nz * 0.45;
        // Leaf clumps: cells that catch light on their upper-left.
        const cx = Math.floor((x + n.value(x / 5, y / 5) * 3) / clump);
        const cy = Math.floor((y + n.value(x / 5 + 9, y / 5) * 3) / clump);
        const local = hash2(cx, cy, seed);
        l += (local - 0.5) * 0.5;
        const fx = (x / clump) % 1;
        const fy = (y / clump) % 1;
        if (fx < 0.34 && fy < 0.34) l += 0.25;
        if (fx > 0.66 && fy > 0.66) l -= 0.3;
        // Deeper at the bottom of each blob, where the next one overlaps.
        if (ny > 0.6) l -= 0.35;
        const t = 1.6 + l * 2.6;
        img.set(x, y, tone(leaf, t, x, y));
        if (opts.berries && hash2(x, y, seed + 5) > 0.975 && l > -0.2) {
          img.set(x, y, opts.berries);
          img.set(x + 1, y + 1, [opts.berries[0] * 0.55, opts.berries[1] * 0.4, opts.berries[2] * 0.5, 255]);
        }
      }
    }
  }
}

function trunk(img: PixelImage, cx: number, top: number, base: number, w: number, bark: readonly RGBA[], seed: number): void {
  for (let y = top; y <= base; y++) {
    const flare = y > base - 4 ? (y - (base - 4)) * 0.8 : 0;
    const hw = w / 2 + flare;
    for (let x = Math.floor(cx - hw); x < cx + hw; x++) {
      const u = (x + 0.5 - (cx - hw)) / (hw * 2);
      let t = u < 0.25 ? 3.2 : u < 0.6 ? 2 : 0.9;
      if (hash2(x, Math.floor(y / 3), seed) > 0.8) t -= 0.8;
      if ((x + Math.floor(y / 5)) % 3 === 0 && u > 0.3) t -= 0.5;
      img.set(x, y, tone(bark, t, x, y));
    }
  }
}

/** A broad deciduous tree (oak, ash). About 52 x 64 pixels. */
export function oakTree(seed = 1, leafColor = '#4C8A38'): PixelImage {
  const W = 56;
  const H = 66;
  const img = new PixelImage(W, H);
  const leaf = ramp(leafColor, 6);
  const bark = ramp('#6A4A32', 5);
  trunk(img, W / 2, 34, H - 2, 7, bark, seed);
  // Roots.
  for (const dx of [-6, -3, 4, 7]) img.set(W / 2 + dx, H - 2, bark[1]!);
  // A branch fork visible under the canopy.
  img.line(W / 2 - 1, 40, W / 2 - 8, 33, bark[2]!);
  img.line(W / 2 + 2, 40, W / 2 + 9, 34, bark[1]!);
  const rng = (i: number) => hash2(i, 3, seed);
  const blobs: Blob[] = [];
  // Back row, then middle, then front-bottom.
  for (let i = 0; i < 4; i++) blobs.push({ x: 13 + i * 10 + (rng(i) - 0.5) * 4, y: 15 + (rng(i + 9) - 0.5) * 5, r: 10 + rng(i + 4) * 3 });
  for (let i = 0; i < 3; i++) blobs.push({ x: 16 + i * 12 + (rng(i + 20) - 0.5) * 4, y: 25 + rng(i + 30) * 3, r: 11 + rng(i + 40) * 2 });
  blobs.push({ x: W / 2 + (rng(50) - 0.5) * 6, y: 8 + rng(51) * 2, r: 9 });
  foliage(img, blobs, leaf, seed);
  img.outline(null);
  return img;
}

/** A dark conifer (pine or fir), optionally laden with snow. About 34 x 60 pixels. */
export function pineTree(seed = 2, snowy = false, leafColor = '#2E5E46'): PixelImage {
  const W = 36;
  const H = 62;
  const img = new PixelImage(W, H);
  const leaf = ramp(leafColor, 6);
  const snow = ramp('#E8EEF8', 4, 0.5);
  const bark = ramp('#5A3E2C', 4);
  trunk(img, W / 2, H - 10, H - 2, 4, bark, seed);
  const n = new Noise2D(seed);
  const tiers = 5;
  for (let t = 0; t < tiers; t++) {
    const top = 2 + t * 10;
    const bot = top + 16;
    const half = 6 + t * 3;
    for (let y = top; y < bot; y++) {
      const k = (y - top) / (bot - top);
      const hw = half * k + 1 + (k > 0.85 ? -1 : 0);
      for (let x = Math.floor(W / 2 - hw); x <= W / 2 + hw; x++) {
        const u = (x + 0.5 - W / 2) / Math.max(1, hw);
        // Drooping, ragged hem.
        if (y > bot - 3 && n.value(x / 2.2, t * 7) > 0.55 + (bot - y) * 0.12) continue;
        let l = 2.4 - u * 1.6 - k * 0.6 + (n.value(x / 3, y / 2) - 0.5) * 1.2;
        if (y > bot - 4) l -= 0.6;
        let c = tone(leaf, l, x, y);
        if (snowy && (y - top) < 3 + (1 - Math.abs(u)) * 2 && u < 0.6) c = tone(snow, 2.6 - u, x, y);
        img.set(x, y, c);
      }
    }
  }
  img.outline(null);
  return img;
}

/** A churchyard yew: dark, dense, columnar. */
export function yewTree(seed = 3): PixelImage {
  const W = 40;
  const H = 60;
  const img = new PixelImage(W, H);
  const leaf = ramp('#2C4A30', 6);
  trunk(img, W / 2, 44, H - 2, 6, ramp('#6E3E2E', 4), seed);
  const blobs: Blob[] = [];
  for (let i = 0; i < 7; i++) blobs.push({ x: W / 2 + (hash2(i, 1, seed) - 0.5) * 10, y: 10 + i * 5, r: 9 + Math.sin(i * 0.9) * 2 + 3 });
  foliage(img, blobs, leaf, seed, { clump: 2.6 });
  img.outline(null);
  return img;
}

/** A round bush; holly gets glossy dark leaves and red berries. */
export function bush(seed = 4, kind: 'green' | 'holly' = 'green'): PixelImage {
  const W = 28;
  const H = 20;
  const img = new PixelImage(W, H);
  const leaf = ramp(kind === 'holly' ? '#2E5A36' : '#4E8A3A', 6);
  const blobs: Blob[] = [
    { x: 9, y: 11, r: 7 },
    { x: 19, y: 11, r: 7 },
    { x: 14, y: 8, r: 7 },
    { x: 14, y: 13, r: 6 },
  ];
  foliage(img, blobs, leaf, seed, { clump: 2.4, berries: kind === 'holly' ? hex('#D8303A') : null });
  img.outline(null);
  return img;
}

/** A boulder with facets and moss; sea rocks are darker and wet at the foot. */
export function rock(seed = 5, size = 1, sea = false): PixelImage {
  const W = Math.round(26 * size);
  const H = Math.round(18 * size);
  const img = new PixelImage(W, H);
  const st = ramp(sea ? '#5E6068' : '#8A867E', 6);
  const moss = ramp(sea ? '#3E5A4A' : '#6A8A44', 3);
  const n = new Noise2D(seed);
  const cx = W / 2;
  const cy = H * 0.58;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x + 0.5 - cx) / (W * 0.48);
      const dy = (y + 0.5 - cy) / (H * 0.55);
      const r = 0.82 + 0.25 * n.value(Math.atan2(dy, dx) * 2 + 10, 3);
      const d = Math.hypot(dx, dy);
      if (d > r || y > H - 2) continue;
      // Facets: quantise the normal so the rock reads as chipped stone.
      const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
      const fn = -(Math.cos(ang) * LX + Math.sin(ang) * LY) * Math.min(1, d / r + 0.2);
      let t = 2.4 + fn * 2 + (1 - d) * 0.6;
      if (y > H * 0.78) t -= 0.8;
      let c = tone(st, t, x, y);
      if (dy < -0.2 && n.value(x / 4, y / 4) > 0.6) c = moss[1 + (hash2(x, y, seed) > 0.5 ? 1 : 0)]!;
      if (sea && y > H - 5) c = tone(st, 0.6 + hash2(x, y, 1), x, y);
      img.set(x, y, c);
    }
  }
  img.outline(null);
  return img;
}

/** A clump of reeds or marram grass. */
export function reeds(seed = 6, color = '#9AA05A'): PixelImage {
  const W = 18;
  const H = 22;
  const img = new PixelImage(W, H);
  const r = ramp(color, 5);
  for (let i = 0; i < 9; i++) {
    const x0 = 3 + hash2(i, 1, seed) * 12;
    const h = 10 + hash2(i, 2, seed) * 10;
    const lean = (hash2(i, 3, seed) - 0.5) * 6;
    for (let k = 0; k < h; k++) {
      const x = Math.round(x0 + (lean * k * k) / (h * h));
      const y = H - 1 - k;
      img.set(x, y, r[k > h * 0.6 ? 3 : 2 - (i % 2)]!);
    }
    if (hash2(i, 4, seed) > 0.55) {
      const x = Math.round(x0 + lean);
      const y = Math.round(H - h);
      img.set(x, y - 1, ramp('#7A5A3A', 3)[1]!);
      img.set(x, y - 2, ramp('#7A5A3A', 3)[2]!);
    }
  }
  img.outline(null);
  return img;
}
