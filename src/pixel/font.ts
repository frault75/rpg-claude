/**
 * A tiny pixel font (3 x 5, capitals) for inscriptions in the world: names cut on a
 * headstone, the names of bells on their plaques. Pure, so it draws without a canvas.
 */

import { PixelImage, type RGBA } from './pixel';

const GLYPHS: Record<string, string> = {
  A: '010101111101101',
  B: '110101110101110',
  C: '011100100100011',
  D: '110101101101110',
  E: '111100110100111',
  F: '111100110100100',
  G: '011100101101011',
  H: '101101111101101',
  I: '111010010010111',
  J: '001001001101010',
  K: '101101110101101',
  L: '100100100100111',
  M: '101111111101101',
  N: '110101101101101',
  O: '010101101101010',
  P: '110101110100100',
  Q: '010101101110011',
  R: '110101110101101',
  S: '011100010001110',
  T: '111010010010010',
  U: '101101101101111',
  V: '101101101101010',
  W: '101101111111101',
  X: '101101010101101',
  Y: '101101010010010',
  Z: '111001010100111',
  "'": '010010000000000',
  ',': '000000000010100',
  '.': '000000000000010',
  ' ': '000000000000000',
  '·': '000000010000000',
};

/** Width in pixels of a line of text. */
export function textWidth(text: string): number {
  return Math.max(0, text.length * 4 - 1);
}

/** Draw `text` (capitals) at (x, y) in one colour. */
export function drawText(img: PixelImage, text: string, x: number, y: number, color: RGBA): void {
  let cx = x;
  for (const ch of text.toUpperCase()) {
    const g = GLYPHS[ch] ?? GLYPHS[' ']!;
    for (let i = 0; i < 15; i++) if (g[i] === '1') img.set(cx + (i % 3), y + Math.floor(i / 3), color);
    cx += 4;
  }
}

/** Lines of text centred in an image of their own. */
export function textImage(lines: string[], color: RGBA, pad = 1): PixelImage {
  const w = Math.max(...lines.map(textWidth)) + pad * 2;
  const h = lines.length * 7 - 2 + pad * 2;
  const img = new PixelImage(w, h);
  lines.forEach((l, i) => drawText(img, l, pad + Math.floor((w - pad * 2 - textWidth(l)) / 2), pad + i * 7, color));
  return img;
}
