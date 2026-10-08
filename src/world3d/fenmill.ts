/**
 * The Fen Mill (DESIGN.md §3.14): Lychford's watermill out on the frozen fen. Its wheel has
 * gone on turning under the ice for ten years, grinding nothing; the corpse-candles light
 * the pond around it.
 */

import { hex, PixelImage, ramp } from '../pixel/pixel';

/** The mill wheel, its lower third locked in the ice of the race. */
export function millWheel(seed = 3): PixelImage {
  const R = 22;
  const W = R * 2 + 6;
  const img = new PixelImage(W, R * 2 + 4);
  const cx = W / 2;
  const cy = R + 1;
  const wood = ramp('#6A4A2E', 5);
  // Rim and paddles.
  for (let a = 0; a < 360; a += 2) {
    const t = (a * Math.PI) / 180;
    for (const r of [R, R - 1]) img.set(Math.round(cx + Math.cos(t) * r), Math.round(cy + Math.sin(t) * r), wood[r === R ? 1 : 3]!);
    img.set(Math.round(cx + Math.cos(t) * (R - 7)), Math.round(cy + Math.sin(t) * (R - 7)), wood[2]!);
  }
  for (let k = 0; k < 16; k++) {
    const t = (k / 16) * Math.PI * 2 + seed * 0.1;
    for (let r = R - 1; r <= R + 2; r++) img.set(Math.round(cx + Math.cos(t) * r), Math.round(cy + Math.sin(t) * r), wood[0]!);
  }
  // Spokes and the hub.
  for (let k = 0; k < 8; k++) {
    const t = (k / 8) * Math.PI * 2 + seed * 0.1;
    for (let r = 3; r < R - 1; r++) img.set(Math.round(cx + Math.cos(t) * r), Math.round(cy + Math.sin(t) * r), wood[k % 2 ? 2 : 3]!);
  }
  img.ellipse(cx, cy, 3.4, 3.4, wood[4]!);
  img.set(Math.round(cx) - 1, Math.round(cy) - 1, hex('#B8A890'));
  // Snow along the top of the rim.
  for (let x = Math.round(cx - R + 4); x <= Math.round(cx + R - 4); x++) {
    const y = Math.round(cy - Math.sqrt(Math.max(0, R * R - (x - cx) * (x - cx)))) - 1;
    img.set(x, y, hex('#EEF2F8'));
  }
  // The ice of the race, pale and clouded over the lower third.
  const ice = cy + R * 0.38;
  for (let y = Math.round(ice); y < img.h; y++)
    for (let x = 0; x < W; x++) {
      const under = img.get(x, y);
      const k = Math.min(1, (y - ice) / 8);
      img.set(x, y, under[3] ? [Math.round(under[0] * 0.5 + 200 * 0.5), Math.round(under[1] * 0.5 + 216 * 0.5), Math.round(under[2] * 0.5 + 232 * 0.5), 255] : [208, 222, 236, Math.round(120 + k * 100)]);
    }
  for (let x = 0; x < W; x++) img.set(x, Math.round(ice), hex('#F4F8FF'));
  img.outline(hex('#2A2018'));
  return img;
}

/** A thatcher's ladder, leant against the wall, snow on its rungs. */
export function ladder(h = 34): PixelImage {
  const img = new PixelImage(12, h);
  const wood = ramp('#7A5A38', 4);
  for (let y = 0; y < h; y++) {
    const lean = Math.round((1 - y / h) * 3);
    img.set(2 + lean, y, wood[1]!);
    img.set(8 + lean, y, wood[2]!);
    if (y % 6 === 3) {
      img.hline(3 + lean, 7 + lean, y, wood[3]!);
      img.hline(3 + lean, 7 + lean, y - 1, hex('#EEF2F8'));
    }
  }
  img.outline(hex('#2A2018'));
  return img;
}
