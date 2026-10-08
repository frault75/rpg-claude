/**
 * The Charcoal Hollow (DESIGN.md §3.14): a clearing in the Blanchwood where the burners'
 * kilns still smoulder, a hundred and fifty years after the burners were scraped. Near the
 * fires the wood keeps its colour.
 */

import { hash2 } from '../engine/noise';
import { hex, PixelImage, ramp } from '../pixel/pixel';

/** A charcoal kiln: a dome of turf over stacked wood, its vents breathing smoke and glow. */
export function kiln(seed = 1, w = 44): { a: PixelImage; e: PixelImage } {
  const h = Math.round(w * 0.5);
  const a = new PixelImage(w, h);
  const e = new PixelImage(w, h);
  const turf = ramp('#4A4A30', 5);
  const earth = ramp('#5A4232', 4);
  const cx = w / 2;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const nx = (x + 0.5 - cx) / (w / 2);
      const ny = (h - y - 0.5) / h;
      if (nx * nx + ny * ny > 1) continue;
      const light = 2.6 - nx * 1.4 + ny * 0.8 + (hash2(x, y, seed) - 0.5) * 0.8;
      const r = ny < 0.25 ? earth : turf;
      a.set(x, y, r[Math.max(0, Math.min(r.length - 1, Math.round(light)))]!);
    }
  // Vents round the dome, glowing.
  for (let k = 0; k < 5; k++) {
    const t = 0.2 + k * 0.15;
    const vx = Math.round(cx + Math.cos(Math.PI * t) * (w / 2 - 6));
    const vy = Math.round(h - Math.sin(Math.PI * t) * (h - 6)) - 1;
    for (const [dx, dy, c] of [
      [0, 0, '#FFC060'],
      [1, 0, '#F07A2A'],
      [0, 1, '#C83A1A'],
    ] as const) {
      a.set(vx + dx, vy + dy, hex(c));
      e.set(vx + dx, vy + dy, hex(c));
    }
  }
  a.outline(hex('#1E1A14'));
  return { a, e };
}

/** The hermit's lean-to: poles and sacking against an oak, a pallet of bracken. */
export function leanTo(seed = 2): PixelImage {
  const img = new PixelImage(40, 30);
  const wood = ramp('#6A4A30', 4);
  const sack = ramp('#9A8A6A', 4);
  for (let x = 2; x < 38; x++) {
    const top = Math.round(4 + (x / 38) * 18);
    for (let y = top; y < 29; y++) img.set(x, y, sack[(x + y + Math.floor(hash2(x, y, seed) * 2)) % 2 ? 1 : 2]!);
    if (x % 7 === 3) img.line(x, top - 2, x - 1, 29, wood[1]!);
  }
  img.line(1, 3, 39, 23, wood[2]!);
  img.rect(10, 22, 12, 7, hex('#1A140E'));
  img.outline(hex('#1E1A14'));
  return img;
}
