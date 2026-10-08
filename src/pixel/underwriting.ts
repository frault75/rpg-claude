/**
 * The underwriting: what lies under the surface of the world and shows only in the
 * raking light (DESIGN.md §10.3): the outline of a bricked-up doorway, a door painted
 * over in whitewash, scraped lines. Drawn as pale ink in the grain, so they read as
 * ghosts; the emissive copy is what the light picks out. Also the breach a wall leaves
 * when it comes down, and its rubble.
 */

import { hash2 } from '../engine/noise';
import { bayer, hex, PixelImage, type RGBA, ramp } from './pixel';

const GHOST = hex('#E8C88A', 220);
const GHOST_DIM = hex('#B8925A', 160);
const CHALK = hex('#E0503A', 230);

function inArch(x: number, y: number, w: number, top: number, h: number): boolean {
  const r = w / 2;
  const cx = r;
  if (y >= top + r) return x >= 0 && x < w && y < top + h;
  return (x + 0.5 - cx) ** 2 + (y + 0.5 - (top + r)) ** 2 <= r * r && y >= top;
}

/** A doorway that was bricked up: its arch, the jambs, the courses of the infill. */
export function ghostDoorway(w = 26, h = 44, seed = 2): PixelImage {
  const img = new PixelImage(w + 6, h + 4);
  const ox = 3;
  for (let y = 0; y < h + 2; y++) {
    for (let x = -3; x < w + 3; x++) {
      const inside = inArch(x, y, w, 1, h);
      const ring = !inside && (inArch(x + 2, y, w, 1, h) || inArch(x - 2, y, w, 1, h) || inArch(x, y + 2, w, 1, h));
      if (ring) img.set(x + ox, y, (x + y) % 3 === 0 ? GHOST_DIM : GHOST);
      else if (inside) {
        // The infill's brick courses, faint, broken by the grain.
        const course = Math.floor(y / 4);
        const joint = y % 4 === 0 || (x + course * 5 + Math.floor(hash2(course, 0, seed) * 6)) % 9 === 0;
        if (joint && hash2(x, y, seed) > 0.25) img.set(x + ox, y, GHOST_DIM);
      }
    }
  }
  // A Glossator's chalk mark on the keystone: a little pointing hand.
  for (const [x, y] of [
    [0, 0],
    [1, 0],
    [2, 0],
    [1, 1],
    [1, 2],
  ] as const)
    img.set(ox + Math.floor(w / 2) - 1 + x, 3 + y, CHALK);
  return img;
}

/** A door painted over in whitewash: its planks and hinges ghost through. */
export function ghostDoor(w = 22, h = 38, seed = 5): PixelImage {
  const img = new PixelImage(w + 4, h + 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inArch(x, y, w, 0, h)) continue;
      const edge = !inArch(x - 1, y, w, 0, h) || !inArch(x + 1, y, w, 0, h) || !inArch(x, y - 1, w, 0, h) || y === h - 1;
      if (edge) img.set(x + 2, y + 2, GHOST);
      else if (x % 5 === 0 && hash2(x, y >> 1, seed) > 0.3) img.set(x + 2, y + 2, GHOST_DIM);
      else if ((y === Math.floor(h * 0.35) || y === Math.floor(h * 0.75)) && x < w * 0.6) img.set(x + 2, y + 2, GHOST);
    }
  }
  img.set(2 + Math.floor(w * 0.72), 2 + Math.floor(h * 0.55), GHOST);
  for (const [x, y] of [
    [0, 0],
    [1, 0],
    [2, 0],
    [1, 1],
    [1, 2],
  ] as const)
    img.set(2 + Math.floor(w / 2) - 1 + x, 4 + y, CHALK);
  return img;
}

function tone(r: readonly RGBA[], t: number, x: number, y: number): RGBA {
  const f = Math.min(r.length - 1, Math.max(0, t));
  const i = Math.floor(f);
  return f - i > bayer(x, y) && i + 1 < r.length ? r[i + 1]! : r[i]!;
}

/** The hole a wall leaves when it comes down: jagged stones, the lit room beyond. */
export function breach(w = 30, h = 46, seed = 9): { a: PixelImage; e: PixelImage } {
  const W = w + 8;
  const H = h + 4;
  const a = new PixelImage(W, H);
  const e = new PixelImage(W, H);
  const st = ramp('#8E877C', 6);
  const warm = hex('#FFB866');
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const nx = (x + 0.5 - W / 2) / (w / 2);
      const ny = (y + 0.5 - (H - 2)) / h;
      const jag = 0.12 * Math.sin(x * 1.7 + seed) + 0.1 * Math.sin(y * 2.3 + seed * 2) + (hash2(x >> 1, y >> 1, seed) - 0.5) * 0.25;
      const r = Math.hypot(nx, Math.min(0, ny + 0.45) * 2.2);
      if (r < 0.92 + jag && y < H - 2) {
        // Beyond: the anchorhold by candlelight, warmer towards the floor.
        const k = 0.25 + 0.5 * (y / H);
        const c: RGBA = [warm[0] * k * 0.6, warm[1] * k * 0.5, warm[2] * k * 0.4, 255];
        a.set(x, y, c);
        e.set(x, y, [c[0] * 0.8, c[1] * 0.8, c[2] * 0.8, 255]);
      } else if (r < 1.12 + jag && y < H - 1) a.set(x, y, tone(st, 2 + (hash2(x, y, seed) - 0.3) * 2.5 - (x > W / 2 ? 0.8 : 0), x, y));
    }
  }
  a.outline(null);
  return { a, e };
}

/** Rubble: broken stone and plaster heaped on the floor. */
export function rubble(seed = 3): PixelImage {
  const img = new PixelImage(40, 12);
  const st = ramp('#8E877C', 6);
  for (let i = 0; i < 26; i++) {
    const x = 3 + hash2(i, 1, seed) * 34;
    const y = 4 + hash2(i, 2, seed) * 7;
    const r = 1.4 + hash2(i, 3, seed) * 2.6;
    img.ellipse(x, y, r, r * 0.7, (px, py, nx, ny) => tone(st, 3 - nx * 1.4 - ny * 1.6 + (i % 3) * 0.3, px, py));
  }
  img.outline(null);
  return img;
}
