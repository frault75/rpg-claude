/**
 * The Margin (DESIGN.md §7.4): the ornamental border of the world. Giant acanthus scrolls in
 * malachite, lapis and vermilion with gold edges; bars of burnished gold; ivy; drolleries.
 * The written page of Hollin hangs over it like a sky. Also the catchword arches, the geese
 * of the Abbot of Unreason's congregation, Amabel as a little hen, and falling letters.
 */

import { hash2 } from '../engine/noise';
import { textImage } from '../pixel/font';
import { bayer, hex, PixelImage, type RGBA, ramp } from '../pixel/pixel';

export const GOLD = ramp('#C9A23C', 6);
const GOLD_EDGE = hex('#F4DE8E');
const PIGMENTS = { malachite: '#4CAA6C', lapis: '#24418F', vermilion: '#C63D2A', rose: '#D58193', orpiment: '#E2B73F' } as const;

function tone(r: readonly RGBA[], t: number, x: number, y: number): RGBA {
  const f = Math.min(r.length - 1, Math.max(0, t));
  const i = Math.floor(f);
  return f - i > bayer(x, y) && i + 1 < r.length ? r[i + 1]! : r[i]!;
}

/**
 * An acanthus scroll: a stem curling into a spiral, its leaves lobed and turned over at the
 * tip to show their other colour, edged in gold. About 90 x 110.
 */
export function acanthus(seed = 1, pigment: keyof typeof PIGMENTS = 'malachite', size = 1): PixelImage {
  const W = Math.round(96 * size);
  const H = Math.round(116 * size);
  const img = new PixelImage(W, H);
  const leaf = ramp(PIGMENTS[pigment], 6);
  const back = ramp(PIGMENTS[seed % 2 ? 'lapis' : 'vermilion'], 5);
  /** A disc lit from the upper left. */
  const disc = (cx: number, cy: number, r: number, ramp6: readonly RGBA[], bias = 0) => {
    for (let y = Math.floor(cy - r); y <= cy + r; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        const nx = (x + 0.5 - cx) / r;
        const ny = (y + 0.5 - cy) / r;
        if (nx * nx + ny * ny > 1) continue;
        img.set(x, y, tone(ramp6, 1.2 + bias + (1 - nx * 0.6 - ny * 0.8) * 1.6, x, y));
      }
  };
  // The stem: up from the foot, then a spiral.
  const stem: [number, number, number][] = [];
  for (let i = 0; i <= 140; i++) {
    const t = i / 140;
    if (t < 0.42) stem.push([W * 0.5 + Math.sin(t * 7 + seed) * 5 * size, H - 4 - (t / 0.42) * H * 0.5, 4.2 * size]);
    else {
      const k = (t - 0.42) / 0.58;
      const a = Math.PI * 0.5 + k * Math.PI * 2.6 * (seed % 2 ? 1 : -1);
      const r = (1 - k * 0.85) * 24 * size;
      const [sx, sy] = [W * 0.5 + Math.sin(0.42 * 7 + seed) * 5 * size, H - 4 - H * 0.5];
      stem.push([sx + Math.cos(a) * r - Math.cos(Math.PI * 0.5) * 24 * size, sy - 24 * size + Math.sin(a) * r * 0.95 + 24 * size * 0.0, (1 - k * 0.7) * 4 * size]);
    }
  }
  // Leaves from the stem, alternately left and right, each a curling lobed blade.
  let n = 0;
  for (let i = 10; i < 70; i += 12) {
    const [x0, y0] = stem[i]!;
    const side = n++ % 2 ? 1 : -1;
    const len = (22 + hash2(i, 1, seed) * 10) * size;
    for (let k = 0; k <= len; k += 0.7) {
      const t = k / len;
      const x = x0 + side * k * 0.95;
      const y = y0 - Math.sin(t * Math.PI * 0.9) * 14 * size + t * t * 10 * size;
      const r = (Math.sin(t * Math.PI) * 5.5 + 1.2) * size * (1 + 0.28 * Math.sin(t * 16 + seed));
      disc(x, y, r, t > 0.72 ? back : leaf, t > 0.72 ? -0.2 : 0.4);
    }
  }
  for (const [x, y, r] of stem) disc(x, y, r, leaf, 0.8);
  // A last leaf unfurling from the heart of the spiral.
  const [hx, hy] = stem[stem.length - 1]!;
  for (let k = 0; k < 10 * size; k += 0.6) disc(hx + k * 0.6, hy - k * 0.4, (3 - k / (5 * size)) * size + 0.8, back, 0.2);
  img.outline(hex('#5A3E10'));
  // Gold along the upper edges, as if burnished.
  for (let y = 1; y < H; y++)
    for (let x = 0; x < W; x++) if (img.alpha(x, y) > 0 && img.alpha(x, y - 1) === 0 && hash2(x, y, seed + 2) > 0.25) img.set(x, y, GOLD_EDGE);
  return img;
}

/** A bar of the border in burnished gold, standing on its edge (w x h). */
export function goldBar(w: number, h = 14, seed = 1): PixelImage {
  const img = new PixelImage(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let t = 4.6 - (y / h) * 3.6 + (hash2(x >> 2, y, seed) - 0.5) * 0.5;
      if (y === 1) t = 5.6;
      if ((x + seed) % 23 === 0) t -= 1.2;
      img.set(x, y, tone(GOLD, t, x, y));
    }
  img.outline(hex('#5A3E10'));
  return img;
}

/** A run of ivy along the border: a gold stem with three-lobed leaves and gold berries. */
export function ivy(w = 80, seed = 1): PixelImage {
  const img = new PixelImage(w, 20);
  const leaf = ramp('#3E8A4A', 5);
  for (let x = 0; x < w; x++) {
    const y = Math.round(10 + Math.sin(x * 0.18 + seed) * 4);
    img.set(x, y, GOLD[3]!);
    img.set(x, y + 1, GOLD[1]!);
    if (x % 9 === 0) {
      const up = (x / 9) % 2 ? -1 : 1;
      const cx = x;
      const cy = y + up * 4;
      for (const [dx, dy] of [
        [0, 0],
        [-2, up],
        [2, up],
      ] as const)
        img.ellipse(cx + dx, cy + dy, 2.2, 2, (px, py, nx) => tone(leaf, 2.4 - nx, px, py));
    }
    if (x % 13 === 5) img.set(x, y - 3, GOLD_EDGE);
  }
  img.outline(null);
  return img;
}

/**
 * The page of Hollin, hanging over the Margin like a sky: vellum ruled and written in
 * lines of tiny script, a red initial, the edge of the text block.
 */
export function pageSky(w = 520, h = 150, seed = 3): PixelImage {
  const img = new PixelImage(w, h);
  const vellum = ramp('#EFE4CA', 5, 0.4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) img.set(x, y, tone(vellum, 2.6 + (hash2(x >> 3, y >> 3, seed) - 0.5) * 0.6 - (y > h - 6 ? 1 : 0), x, y));
  // The text block: lines of script, words of irregular length.
  for (let line = 0; line < 13; line++) {
    const y = 12 + line * 10;
    let x = 30 + (line === 0 ? 22 : 0);
    while (x < w - 30) {
      const word = 4 + Math.floor(hash2(x, line, seed) * 14);
      for (let k = 0; k < word && x + k < w - 30; k++) {
        const hgt = hash2(x + k, line, seed + 1) > 0.8 ? 4 : 2;
        for (let j = 0; j < hgt; j++) img.set(x + k, y - j, hex('#3A2A1E', 220));
      }
      x += word + 3;
    }
  }
  // A red initial at the head of the text, framed in gold.
  for (let y = 4; y < 24; y++) for (let x = 28; x < 48; x++) img.set(x, y, x < 30 || x > 45 || y < 6 || y > 21 ? GOLD[4]! : hex('#C63D2A'));
  const m = textImage(['M'], hex('#F4DE8E'), 0);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.alpha(x, y) > 0) img.rect(33 + x * 3, 7 + y * 2, 3, 2, hex('#F4DE8E'));
  return img;
}

/** An arch of acanthus over a way out of the Margin, its catchword written large on a scroll at the foot. */
export function catchwordArch(word: string, seed = 1): PixelImage {
  const text = textImage([word], hex('#B8302A'), 0);
  const tw = text.w * 2;
  const W = Math.max(40, tw + 10);
  const H = 54;
  const img = new PixelImage(W, H);
  const leaf = ramp(PIGMENTS[seed % 3 === 0 ? 'lapis' : seed % 3 === 1 ? 'malachite' : 'vermilion'], 5);
  const cx = W / 2;
  for (let y = 0; y < H - 14; y++)
    for (let x = 0; x < W; x++) {
      const dx = (x + 0.5 - cx) / 18;
      const dy = (y + 0.5 - 18) / 18;
      const r = Math.hypot(dx, Math.min(0, dy));
      const inPost = Math.abs(x + 0.5 - cx) > 12 && Math.abs(x + 0.5 - cx) <= 18 && y >= 18;
      const inArch = r > 0.68 && r <= 1 && y < 18;
      if (!inPost && !inArch) continue;
      img.set(x, y, tone(leaf, 2.4 + Math.sin((x + y) * 0.7) * 0.8, x, y));
      if (hash2(x, y, seed) > 0.93) img.set(x, y, GOLD_EDGE);
    }
  // The scroll with the catchword, in red, twice the size of the script.
  const sx = Math.round(W / 2 - tw / 2) - 3;
  for (let y = H - 14; y < H; y++) for (let x = sx; x < sx + tw + 6; x++) img.set(x, y, hex(y === H - 14 || y === H - 1 ? '#C8B890' : '#F2E8CC'));
  for (let y = 0; y < text.h; y++) for (let x = 0; x < text.w; x++) if (text.alpha(x, y) > 0) img.rect(sx + 3 + x * 2, H - 12 + y * 2, 2, 2, hex('#B8302A'));
  img.outline(hex('#5A3E10'));
  return img;
}

/** A goose of the Abbot's congregation, listening. */
export function goose(seed = 1): PixelImage {
  const img = new PixelImage(16, 16);
  const white = ramp('#EEEAE0', 5, 0.6);
  img.ellipse(8, 11, 5.6, 3.6, (x, y, nx, ny) => tone(white, 2.6 - nx - ny, x, y));
  img.line(11, 9, 12, 3, white[3]!);
  img.ellipse(12.5, 3, 1.6, 1.4, white[4]!);
  img.hline(14, 15, 3, hex('#E8902A'));
  img.set(12, 2, hex('#1A1210'));
  img.vline(7, 14, 15, hex('#E8902A'));
  img.vline(10, 14, 15, hex('#E8902A'));
  if (seed % 2) img.set(5, 9, white[1]!);
  img.outline(null);
  return img;
}

/** Amabel, written into the Margin as a little brown hen who remembers Isot. */
export function hen(): PixelImage {
  const img = new PixelImage(14, 14);
  const brown = ramp('#A8683A', 5);
  img.ellipse(7, 9, 5, 3.6, (x, y, nx, ny) => tone(brown, 2.6 - nx - ny, x, y));
  img.ellipse(10, 5, 2.4, 2.2, brown[3]!);
  img.set(11, 3, hex('#C83A2A'));
  img.set(12, 3, hex('#C83A2A'));
  img.set(12, 5, hex('#E8B030'));
  img.set(10, 4, hex('#1A1210'));
  img.vline(6, 12, 13, hex('#E8B030'));
  img.vline(8, 12, 13, hex('#E8B030'));
  img.outline(null);
  return img;
}

/** A letter falling from the page (for the Fall of Names). */
export function fallingLetter(ch: string): PixelImage {
  const t = textImage([ch], hex('#2A1E14', 240), 0);
  const img = new PixelImage(t.w * 2, t.h * 2);
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) img.set(x, y, t.get(x >> 1, y >> 1));
  return img;
}

/** A straw skep on a bench: the bees' house, coiled straw bound with bramble. */
export function skep(seed = 1): PixelImage {
  const img = new PixelImage(26, 30);
  const straw = ramp('#C8A858', 5);
  const wood = ramp('#6A4A30', 4);
  // The bench.
  img.rect(1, 24, 24, 3, wood[2]!);
  img.hline(1, 24, 24, wood[3]!);
  img.vline(3, 27, 29, wood[1]!);
  img.vline(22, 27, 29, wood[1]!);
  // The skep: a dome of coils, a dark door at the foot.
  for (let y = 4; y < 24; y++) {
    const k = (y - 4) / 20;
    const half = Math.sqrt(Math.max(0, 1 - (1 - k) * (1 - k))) * 10;
    for (let x = Math.round(13 - half); x <= Math.round(13 + half); x++) {
      const coil = (y + Math.floor(seed)) % 3 === 0;
      img.set(x, y, straw[coil ? 1 : x < 13 ? 4 : 3]!);
    }
  }
  img.rect(11, 20, 4, 4, hex('#2A1A10'));
  img.outline(hex('#3A2810'));
  return img;
}
