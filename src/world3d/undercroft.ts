/**
 * The Undercroft (DESIGN.md §3.14): the Rasure Vault under the scriptorium, where ten years
 * of scrapings have been swept down a chute. Drifts of vellum shavings, skins laced into
 * frames to be scraped again, tubs of pumice, and the round bays of a vault older than the
 * scriptorium above it.
 */

import { hash2 } from '../engine/noise';
import { type Art, door, newArt } from '../pixel/buildings';
import { hex, PixelImage, ramp } from '../pixel/pixel';

/** A drift of shavings swept against something: curls of vellum and grit, broken strokes of ink. */
export function scrapings(w = 40, seed = 1): PixelImage {
  const h = Math.round(w * 0.32);
  const img = new PixelImage(w, h);
  const vellum = ramp('#D8CCAE', 5, 0.6);
  const grit = ramp('#8A8478', 3);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const nx = (x + 0.5 - w / 2) / (w / 2);
      const top = h * (1 - (1 - nx * nx) * (0.8 + hash2(x >> 2, 0, seed) * 0.2));
      if (y < top) continue;
      const k = (y - top) / Math.max(1, h - top);
      const light = 3.4 - nx * 1.2 - k * 1.6 + (hash2(x >> 1, y, seed) > 0.8 ? 0.8 : 0);
      const c = hash2(x, y, seed + 3) > 0.92 ? grit[Math.min(2, Math.max(0, Math.round(light * 0.5)))]! : vellum[Math.min(4, Math.max(0, Math.round(light)))]!;
      img.set(x, y, c);
    }
  for (let i = 0; i < w / 3; i++) {
    const x = Math.floor(hash2(i, 1, seed) * w);
    const y = Math.floor(h * 0.4 + hash2(i, 2, seed) * h * 0.55);
    if (img.alpha(x, y)) img.set(x, y, i % 4 === 0 ? hex('#A83A28') : hex('#5A3A26'));
  }
  img.outline(hex('#2A241E'));
  return img;
}

/** A herse: a wooden frame with a skin laced into it, scraped pale, the old lines still faint on it. */
export function herse(seed = 2): PixelImage {
  const W = 26;
  const H = 36;
  const img = new PixelImage(W, H);
  const wood = ramp('#6A4A30', 4);
  const skin = ramp('#E2D6BA', 4, 0.5);
  // Legs and frame.
  img.rect(1, 2, 2, H - 2, wood[1]!);
  img.rect(W - 3, 2, 2, H - 2, wood[2]!);
  img.rect(1, 2, W - 2, 2, wood[2]!);
  img.rect(1, 25, W - 2, 2, wood[1]!);
  // The skin, laced to the frame by cords, a little uneven at the edges.
  for (let y = 6; y < 23; y++)
    for (let x = 5; x < W - 5; x++) {
      const edge = (x === 5 || x === W - 6 || y === 6 || y === 22) && hash2(x, y, seed) < 0.4;
      if (edge) continue;
      img.set(x, y, skin[(x + y) % 7 === 0 ? 1 : x < W / 2 ? 3 : 2]!);
    }
  for (let y = 7; y < 22; y += 3) {
    img.set(4, y, hex('#8A7A5A'));
    img.set(W - 5, y, hex('#8A7A5A'));
  }
  // The ghost of the old writing, scraped nearly away.
  for (let y = 9; y < 21; y += 2)
    for (let x = 7; x < W - 7; x++) if (hash2(x >> 1, y, seed + 5) > 0.45) img.set(x, y, hex('#C4B494'));
  img.outline(hex('#1E1A14'));
  return img;
}

/** A tub of pumice: grey lumps of the stone that does the scraping. */
export function pumiceTub(seed = 3): PixelImage {
  const img = new PixelImage(20, 16);
  const wood = ramp('#6A4A30', 4);
  const stone = ramp('#A8A498', 4);
  for (let y = 5; y < 16; y++) for (let x = 2; x < 18; x++) img.set(x, y, wood[x < 6 ? 3 : x > 14 ? 0 : (x >> 2) % 2 ? 1 : 2]!);
  img.hline(2, 17, 8, hex('#3A3A42'));
  img.hline(2, 17, 13, hex('#3A3A42'));
  for (let i = 0; i < 9; i++) {
    const x = 4 + Math.floor(hash2(i, 0, seed) * 12);
    const y = 2 + Math.floor(hash2(i, 1, seed) * 4);
    img.ellipse(x, y, 2, 1.5, (_px, _py, nx, ny) => stone[Math.max(0, Math.min(3, Math.round(2.4 - nx - ny)))]!);
  }
  img.outline(hex('#1E1A14'));
  return img;
}

/**
 * The chute: a wooden trough out of the vault's ceiling, down which the scriptorium has swept
 * its scrapings for ten years, a trickle still running off its lip.
 */
export function chute(seed = 4): Art & { anchor: [number, number] } {
  const W = 30;
  const H = 54;
  const a = new PixelImage(W, H);
  const e = new PixelImage(W, H);
  const wood = ramp('#6A4A30', 5);
  for (let i = 0; i < 34; i++) {
    const x = 2 + Math.round(i * 0.5);
    const y = i;
    for (let k = 0; k < 12; k++) a.set(x + k, y, wood[k < 2 ? 4 : k > 9 ? 0 : 2 + ((y >> 2) % 2)]!);
  }
  // The trickle: shavings falling off the lip into the drift below.
  for (let y = 34; y < H; y++)
    if (hash2(0, y, seed) > 0.35) {
      const x = 14 + Math.round(Math.sin(y * 0.7) * 1.5);
      a.set(x, y, hex('#E2D6BA'));
    }
  a.outline(hex('#1E1A14'));
  return { a, e, lights: [], anchor: [W / 2, H - 1] };
}

/** The low door under the scriptorium's third window, open on the stair down. */
export function lowDoor(stone = '#9A948A'): Art & { anchor: [number, number] } {
  const art = newArt(30, 34);
  door(art, 4, 6, 22, 26, { kind: 'round', open: true, stone });
  // It opens on the dark, not on a lit room: darker the deeper it goes.
  const dark = ramp('#2A2832', 4);
  for (let y = 0; y < 34; y++)
    for (let x = 0; x < 30; x++) {
      const e = art.e.get(x, y);
      if (!e[3] || e[0] + e[1] + e[2] === 0) continue;
      art.a.set(x, y, dark[Math.max(0, 3 - Math.floor((y - 6) / 7))]!);
      art.e.set(x, y, [0, 0, 0, 255]);
    }
  art.lights.length = 0;
  // The first steps going down, lit a little from the room.
  const st = ramp('#6A6670', 3);
  for (let k = 0; k < 3; k++) art.a.hline(8 + k * 2, 21 - k * 2, 30 - k * 3, st[2 - k]!);
  return { ...art, anchor: [15, 33] };
}

/** The round bays of the old vault, dark, painted on the back wall's face. */
export function paintBays(art: Art, xs: readonly number[], w: number, top: number, bottom: number): void {
  const dark = ramp('#2A2630', 4);
  for (const x0 of xs)
    for (let y = top; y < bottom; y++)
      for (let x = x0; x < x0 + w; x++) {
        const r = w / 2;
        const cy = top + r;
        const dx = x + 0.5 - (x0 + r);
        if (y < cy && dx * dx + (y + 0.5 - cy) * (y + 0.5 - cy) > r * r) continue;
        // Deeper towards the back of the bay; a lip of light on its left edge.
        const depth = Math.min(3, Math.floor(1 + (1 - Math.abs(dx) / r) * 2.4));
        art.a.set(x, y, dark[3 - depth]!);
        if (dx < -r + 1.5) art.a.set(x, y, hex('#5A5462'));
      }
}
