/**
 * The furniture of a monastery in pixel art, seen in the 3/4 view: writing desks with a
 * book open on the slope, stools, the lectern that holds the Book of Names, cupboards of
 * chained books, iron candle stands, benches and coffers. Light from the upper left.
 */

import { hash2 } from '../engine/noise';
import { type Art, newArt } from './buildings';
import { bayer, hex, type PixelImage, type RGBA, ramp } from './pixel';
import type { Prop } from './props';

function tone(r: readonly RGBA[], t: number, x: number, y: number): RGBA {
  const f = Math.min(r.length - 1, Math.max(0, t));
  const i = Math.floor(f);
  return f - i > bayer(x, y) && i + 1 < r.length ? r[i + 1]! : r[i]!;
}

const OAK = '#7A5232';
const PAPER = ramp('#EADCB8', 4);
const INKC = hex('#2A2024');
const RUBRIC = hex('#B8322A');
const GOLD = ramp('#D9A52E', 4);
const IRON = ramp('#3A3A44', 4);

/** A board seen from above and in front, lit from the upper left. */
function board(img: PixelImage, pts: [number, number][], wood: readonly RGBA[], base: number, seed: number): void {
  img.poly(pts, (x, y) => tone(wood, base + (hash2(x >> 2, y, seed) - 0.5) * 0.5 - (x % 7 === 0 ? 0.4 : 0), x, y));
}

/** An open book: two pages with lines of script, a red initial; `glow` for the Book of Names. */
function openBook(art: Art, x0: number, y0: number, w: number, h: number, seed: number, glow = false): void {
  const img = art.a;
  const half = Math.floor(w / 2);
  img.poly(
    [
      [x0 + 1, y0],
      [x0 + half, y0 + 1],
      [x0 + half, y0 + h],
      [x0, y0 + h],
    ],
    (x, y) => tone(PAPER, 2.6 - (y - y0) / h, x, y),
  );
  img.poly(
    [
      [x0 + half, y0 + 1],
      [x0 + w - 1, y0],
      [x0 + w, y0 + h],
      [x0 + half, y0 + h],
    ],
    (x, y) => tone(PAPER, 2.2 - (y - y0) / h - (x - x0 - half) / w, x, y),
  );
  img.vline(x0 + half, y0 + 1, y0 + h - 1, PAPER[0]!);
  // Lines of script, dotted, a little irregular.
  for (let ly = y0 + 2; ly < y0 + h - 1; ly += 2) {
    for (let x = x0 + 2; x < x0 + w - 2; x++) {
      if (Math.abs(x - (x0 + half)) < 2) continue;
      if (hash2(x, ly, seed) > 0.42) img.set(x, ly, INKC);
    }
  }
  img.rect(x0 + 2, y0 + 2, 2, 3, glow ? GOLD[3]! : RUBRIC);
  if (glow) {
    art.e.rect(x0 + 2, y0 + 2, 2, 3, GOLD[2]!);
    for (let ly = y0 + 2; ly < y0 + h - 1; ly += 4) art.e.set(x0 + half + 3, ly, GOLD[0]!);
  }
}

/** A scribe's desk: a sloped board with a book open on it, inkhorn and quill, a shelf. */
export function writingDesk(seed = 1, o: { book?: boolean; empty?: boolean } = {}): Prop {
  const W = 30;
  const H = 30;
  const art = newArt(W, H);
  const img = art.a;
  const wood = ramp(OAK, 6);
  // Legs and stretcher.
  for (const lx of [3, 25]) {
    img.rect(lx, 14, 2, 15, wood[1]!);
    img.vline(lx, 14, 28, wood[2]!);
  }
  img.rect(4, 23, 22, 2, wood[1]!);
  // The shelf under the slope, with a book on it.
  img.rect(4, 17, 22, 2, wood[2]!);
  if (!o.empty) img.rect(7, 15, 7, 2, hex('#5A2A24'));
  // The front apron, then the sloping top.
  img.rect(2, 12, 26, 3, wood[2]!);
  img.hline(2, 27, 12, wood[3]!);
  board(img, [
    [1, 12],
    [29, 12],
    [27, 3],
    [3, 3],
  ], wood, 3.8, seed);
  img.hline(3, 26, 3, wood[5]!);
  if (o.book !== false && !o.empty) openBook(art, 7, 4, 15, 7, seed);
  // Inkhorn set into the board, a quill standing in it.
  img.rect(24, 5, 2, 2, hex('#1A1414'));
  img.set(24, 4, hex('#3A2E2A'));
  img.line(25, 4, 28, 0, hex('#F4EEE0'));
  img.set(27, 1, hex('#D8D0C0'));
  img.outline(null);
  return { ...art, anchor: [15, 29] };
}

/** A three-legged stool. */
export function stool(seed = 1): Prop {
  const art = newArt(12, 12);
  const wood = ramp(OAK, 5);
  for (const [x0, x1] of [
    [2, 1],
    [9, 10],
    [6, 6],
  ] as const)
    art.a.line(x0, 4, x1, 11, wood[1]!);
  art.a.ellipse(6, 3.5, 5.5, 2.6, (x, y, nx, ny) => tone(wood, 3.4 - nx * 0.8 - ny * 0.8 + (hash2(x, y, seed) - 0.5) * 0.4, x, y));
  art.a.hline(1, 10, 5, wood[1]!);
  art.a.outline(null);
  return { ...art, anchor: [6, 11] };
}

/** The lectern that holds the Book of Names: a tall post, a slope, the Book, its chain. */
export function lectern(seed = 3): Prop {
  const W = 30;
  const H = 46;
  const art = newArt(W, H);
  const img = art.a;
  const wood = ramp('#6A4428', 6);
  // Three feet and the post.
  img.line(15, 36, 6, 45, wood[1]!);
  img.line(15, 36, 24, 45, wood[1]!);
  img.line(15, 36, 15, 45, wood[2]!);
  img.rect(13, 16, 4, 22, wood[2]!);
  img.vline(13, 16, 37, wood[4]!);
  for (const y of [22, 30]) img.hline(12, 17, y, wood[3]!);
  // The slope.
  board(img, [
    [1, 17],
    [29, 17],
    [27, 6],
    [3, 6],
  ], wood, 3.6, seed);
  img.rect(1, 17, 28, 2, wood[1]!);
  // The Book: thick, open, its gold catching the candles.
  img.rect(4, 15, 22, 2, hex('#4A1E1A'));
  openBook(art, 4, 5, 22, 10, seed + 4, true);
  // The chain from the binding down to the post.
  for (let i = 0; i < 9; i++) {
    const x = 26 - Math.round(i * 1.1);
    const y = 16 + i * 2 + Math.round(Math.sin(i * 0.7) * 1);
    img.set(x, y, IRON[i % 2 ? 3 : 1]!);
    img.set(x - 1, y + 1, IRON[2]!);
  }
  img.outline(null);
  return { ...art, anchor: [15, 45] };
}

/** A tall cupboard of books, its doors open, every book on its chain. */
export function armarium(seed = 5): Prop {
  const W = 44;
  const H = 58;
  const art = newArt(W, H);
  const img = art.a;
  const wood = ramp('#5E3E26', 6);
  const spines = ['#7A2A24', '#2A3E6A', '#3E5A34', '#6A4A2A', '#5A2A4A', '#8A6A3A'].map((c) => ramp(c, 4));
  // Carcass and cornice.
  img.rect(3, 6, 38, 50, wood[1]!);
  img.rect(1, 2, 42, 5, wood[3]!);
  img.hline(1, 42, 2, wood[5]!);
  img.hline(1, 42, 6, wood[1]!);
  // Shelves of books.
  for (let s = 0; s < 4; s++) {
    const y1 = 18 + s * 12;
    img.rect(5, y1, 34, 2, wood[3]!);
    let x = 6;
    let k = 0;
    while (x < 37) {
      const bw = 2 + Math.floor(hash2(k, s, seed) * 3);
      const bh = 7 + Math.floor(hash2(k, s + 9, seed) * 3);
      const r = spines[Math.floor(hash2(k, s + 3, seed) * spines.length)]!;
      for (let yy = y1 - bh; yy < y1; yy++) for (let xx = x; xx < Math.min(37, x + bw); xx++) img.set(xx, yy, tone(r, xx === x ? 3 : 1.6, xx, yy));
      if (hash2(k, s, seed + 1) > 0.5) img.set(x, y1 - bh + 2, GOLD[2]!);
      x += bw + (hash2(k, s, seed + 2) > 0.85 ? 2 : 0);
      k++;
    }
    // The rod and the chains hanging from it.
    img.hline(5, 38, y1 - 10, IRON[2]!);
    for (let cx = 8; cx < 37; cx += 5) for (let cy = y1 - 9; cy < y1 - 4; cy += 2) img.set(cx, cy, IRON[3]!);
  }
  // Doors swung open at the sides.
  for (const [x0, x1] of [
    [0, 4],
    [40, 44],
  ] as const) {
    for (let y = 8; y < 56; y++) for (let x = x0; x < x1; x++) img.set(x, y, tone(wood, x0 === 0 ? 3.2 : 1.4, x, y));
    img.set(x0 === 0 ? 3 : 40, 32, GOLD[1]!);
  }
  img.rect(2, 55, 40, 3, wood[0]!);
  img.outline(null);
  return { ...art, anchor: [22, 57] };
}

/** An iron pricket stand with a tall candle (its flame is added by the stage). */
export function candleStand(height = 26): Prop {
  const W = 9;
  const H = height + 4;
  const art = newArt(W, H);
  const img = art.a;
  img.line(4, H - 5, 1, H - 1, IRON[1]!);
  img.line(4, H - 5, 7, H - 1, IRON[1]!);
  img.vline(4, 8, H - 4, IRON[2]!);
  img.hline(2, 6, 8, IRON[3]!);
  // The candle.
  img.rect(3, 1, 3, 7, hex('#F2E8D0'));
  img.vline(5, 1, 7, hex('#C8BCA0'));
  img.set(4, 0, hex('#2A2020'));
  img.outline(null);
  return { ...art, anchor: [4, H - 1] };
}

/** A candle stuck on a desk or a sill: just the wax, the flame comes separately. */
export function candle(): Prop {
  const art = newArt(5, 8);
  art.a.rect(1, 1, 3, 6, hex('#F2E8D0'));
  art.a.vline(3, 1, 6, hex('#C8BCA0'));
  art.a.hline(0, 4, 7, hex('#8A7A60'));
  art.a.set(2, 0, hex('#2A2020'));
  art.a.outline(null);
  return { ...art, anchor: [2, 7] };
}

/** A long bench. */
export function bench(w = 40, seed = 7): Prop {
  const art = newArt(w, 12);
  const wood = ramp(OAK, 5);
  for (const lx of [3, w - 5]) art.a.rect(lx, 5, 2, 7, wood[1]!);
  board(art.a, [
    [0, 6],
    [w, 6],
    [w - 1, 2],
    [1, 2],
  ], wood, 3.4, seed);
  art.a.rect(0, 6, w, 2, wood[1]!);
  art.a.outline(null);
  return { ...art, anchor: [w / 2, 11] };
}

/** An iron-bound coffer. */
export function coffer(seed = 2): Prop {
  const art = newArt(22, 16);
  const wood = ramp('#6A4428', 5);
  board(art.a, [
    [1, 6],
    [21, 6],
    [20, 1],
    [2, 1],
  ], wood, 3.4, seed);
  art.a.rect(1, 6, 20, 9, wood[2]!);
  for (const x of [4, 17]) art.a.rect(x, 1, 2, 14, IRON[1]!);
  art.a.rect(10, 7, 2, 3, GOLD[1]!);
  art.a.outline(null);
  return { ...art, anchor: [11, 15] };
}

/** A psalter with a chain, lying shut (Wystan's, on his desk). */
export function psalter(): Prop {
  const art = newArt(10, 6);
  art.a.rect(1, 1, 8, 4, hex('#3A2A4A'));
  art.a.hline(1, 8, 1, hex('#5A4A6A'));
  art.a.set(4, 2, GOLD[2]!);
  art.a.set(9, 3, IRON[3]!);
  art.a.outline(null);
  return { ...art, anchor: [5, 5] };
}

/** A straw pallet on the floor of a cell. */
export function pallet(seed = 3): Prop {
  const art = newArt(34, 12);
  const straw = ramp('#B89A5A', 5);
  const cloth = ramp('#7A6A5A', 4);
  art.a.poly(
    [
      [1, 4],
      [33, 4],
      [31, 1],
      [3, 1],
    ],
    (x, y) => tone(straw, 3 + (hash2(x, y, seed) - 0.5) * 1.6, x, y),
  );
  art.a.rect(1, 4, 32, 6, cloth[1]!);
  for (let x = 2; x < 32; x++) if (hash2(x, 9, seed) > 0.6) art.a.set(x, 3, straw[4]!);
  // A rough blanket thrown over one end.
  art.a.poly(
    [
      [18, 1],
      [33, 2],
      [33, 10],
      [16, 10],
    ],
    (x, y) => tone(cloth, 2.4 - (x - 16) / 14 + (hash2(x >> 1, y, seed + 3) - 0.5) * 0.6, x, y),
  );
  art.a.outline(null);
  return { ...art, anchor: [17, 11] };
}

/** A wooden bucket. */
export function bucket(): Prop {
  const art = newArt(10, 11);
  const wood = ramp('#7A5A3A', 4);
  for (let y = 2; y < 11; y++) for (let x = 1 + (y < 4 ? 0 : 0); x < 9; x++) art.a.set(x, y, tone(wood, x < 4 ? 2.8 : 1.4, x, y));
  art.a.ellipse(5, 2.5, 4, 1.6, hex('#2A2A30'));
  for (const y of [5, 9]) art.a.hline(1, 8, y, IRON[1]!);
  art.a.outline(null);
  return { ...art, anchor: [5, 10] };
}

/** A well head of stone, with its windlass. */
export function wellHead(seed = 4): Prop {
  const art = newArt(30, 36);
  const st = ramp('#8E877C', 6);
  const wood = ramp(OAK, 5);
  // Posts and windlass.
  art.a.rect(3, 4, 2, 18, wood[1]!);
  art.a.rect(25, 4, 2, 18, wood[1]!);
  art.a.rect(3, 6, 24, 2, wood[3]!);
  art.a.vline(15, 8, 18, hex('#8A7A5A'));
  art.a.rect(13, 18, 4, 3, wood[2]!);
  // The round stone curb.
  art.a.ellipse(15, 24, 14, 5, (x, y, nx, ny) => tone(st, 3.2 - nx - ny, x, y));
  art.a.ellipse(15, 24, 10, 3, hex('#0E0E14'));
  for (let y = 24; y < 35; y++) {
    for (let x = 1; x < 29; x++) {
      const dx = (x + 0.5 - 15) / 14;
      if (Math.abs(dx) > 1) continue;
      const course = Math.floor((y - 24) / 4);
      let t = 2.6 - dx * 1.6 + (hash2(Math.floor((x + course * 3) / 6), course, seed) - 0.5) * 0.6;
      if ((y - 24) % 4 === 3) t -= 0.8;
      art.a.set(x, y, tone(st, t, x, y));
    }
  }
  art.a.outline(null);
  return { ...art, anchor: [15, 35] };
}
