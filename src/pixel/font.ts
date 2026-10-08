/**
 * A tiny pixel font (3 x 5, capitals) for inscriptions in the world: names cut on a
 * headstone, the names of bells on their plaques. Pure, so it draws without a canvas.
 */

import { lang, type LocalText } from '../i18n/i18n';
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
  // M and W are five wide and N four: at three they read as H and Π.
  M: '1000111011101011000110001',
  N: '10011101101110011001',
  O: '010101101101010',
  P: '110101110100100',
  Q: '010101101101011',
  R: '110101110101101',
  S: '011100010001110',
  T: '111010010010010',
  U: '101101101101111',
  V: '101101101101010',
  W: '1000110001101011010101010',
  X: '101101010101101',
  Y: '101101010010010',
  Z: '111001010100111',
  "'": '010010000000000',
  ',': '000000000010100',
  '-': '000000111000000',
  '.': '000000000000010',
  ' ': '000000000000000',
  '·': '000000010000000',
};

const glyph = (ch: string): string => GLYPHS[ch] ?? GLYPHS[' ']!;
/** Glyphs are five rows tall and three wide, or wider for the broad letters. */
const glyphW = (g: string): number => g.length / 5;

/** Width in pixels of a line of text. */
export function textWidth(text: string): number {
  let w = 0;
  for (const ch of text.toUpperCase()) w += glyphW(glyph(ch)) + 1;
  return Math.max(0, w - 1);
}

/** Draw `text` (capitals) at (x, y) in one colour. */
export function drawText(img: PixelImage, text: string, x: number, y: number, color: RGBA): void {
  let cx = x;
  for (const ch of text.toUpperCase()) {
    const g = glyph(ch);
    const gw = glyphW(g);
    for (let i = 0; i < g.length; i++) if (g[i] === '1') img.set(cx + (i % gw), y + Math.floor(i / gw), color);
    cx += gw + 1;
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

/** Words cut or painted in the world, in the player's language, drawn when they are first seen. */
export function localTextImage(lines: LocalText[], color: RGBA, pad = 1): () => PixelImage {
  return () => textImage(lines.map((l) => l[lang()]), color, pad);
}
