/**
 * Interface pieces in the manuscript style (DESIGN.md §6.6): the dialogue slip, choices
 * marked with pilcrows, the manicule (the pointing hand of the margins), underwriting
 * (scraped text, shown only by raking light), note slips and the title page.
 */

import { Illuminator, type IlluminatedImage } from './illuminator';
import { type LocationPalette, PIGMENTS, shade } from './palettes';
import { pointedArch, type Pt, rect, Shape, smooth } from './path';
import { font, measure, SERIF, wrap } from './text';

export const DIALOGUE = {
  width: 1100,
  height: 152,
  portrait: 132,
  textX: 172,
  nameY: 36,
  firstLineY: 68,
  lineHeight: 27,
  size: 19,
};

export interface TextLine {
  text: string;
  /** Logical x where each character ends, from the line's start. */
  ends: number[];
  x: number;
  /** Baseline. */
  y: number;
}

export interface PanelLayout {
  image: IlluminatedImage;
  lines: TextLine[];
  /** For the shader's wipe: top of the first line and the line height, in logical units. */
  textTop: number;
  lineHeight: number;
}

function slip(il: Illuminator, W: number, H: number): void {
  const s = new Shape()
    .moveTo(3, 5)
    .cubicTo(W * 0.3, 2, W * 0.7, 7, W - 3, 3)
    .lineTo(W - 4, H - 5)
    .cubicTo(W * 0.7, H - 2, W * 0.3, H - 7, 4, H - 3)
    .close();
  il.fill(s, PIGMENTS.leadWhite, 0.97);
  il.clip(s, () => {
    // The scribe's ruling, faint.
    for (let y = 22; y < H - 10; y += DIALOGUE.lineHeight) il.ink([[10, y + 6], [W - 10, y + 6]], { width: 0.35, nibRatio: 1, bleed: false, alpha: 0.12 });
  });
  il.outline(s, { width: 0.9, nibRatio: 0.6 });
  for (const y of [12, H - 12]) {
    il.colorStroke([[12, y], [W - 12, y]], PIGMENTS.vermilion, { width: 0.6, nibRatio: 1, taperIn: 3, taperOut: 3 }, 0.8);
    il.colorStroke([[12, y + (y < H / 2 ? 3 : -3)], [W - 12, y + (y < H / 2 ? 3 : -3)]], PIGMENTS.vermilion, { width: 0.4, nibRatio: 1, taperIn: 3, taperOut: 3 }, 0.6);
  }
}

function layoutLines(text: string, f: string, x: number, firstY: number, lineH: number, maxW: number): TextLine[] {
  return wrap(text, f, maxW).map((t, i) => {
    const ends: number[] = [];
    for (let k = 1; k <= t.length; k++) ends.push(measure(t.slice(0, k), f));
    return { text: t, ends, x, y: firstY + i * lineH };
  });
}

/**
 * The dialogue slip: the speaker's name rubricated, the words in ink. With a portrait,
 * text starts to the right of where the portrait sits (it is a separate sprite).
 */
export function drawDialoguePanel(name: string | null, text: string, opts: { portrait: boolean; italic?: boolean }): PanelLayout {
  const D = DIALOGUE;
  const W = D.width;
  const H = D.height;
  const il = new Illuminator(W, H, `panel:${name}:${text.length}`);
  slip(il, W, H);
  const x = opts.portrait ? D.textX : 34;
  if (name) il.paintText(name, x, D.nameY, font(19, { smallCaps: true, bold: true }), PIGMENTS.vermilion);
  const f = font(D.size, { italic: opts.italic });
  const firstY = name ? D.firstLineY : D.firstLineY - 18;
  const lines = layoutLines(text, f, x, firstY, D.lineHeight, W - x - 40).slice(0, 3);
  for (const l of lines) il.inkText(l.text, l.x, l.y, f);
  il.anchor = [0, 0];
  return { image: il.finish(), lines, textTop: firstY - D.size, lineHeight: D.lineHeight };
}

export interface ChoiceLayout {
  image: IlluminatedImage;
  /** Baselines of each option, and where its text starts. */
  rows: { y: number; x: number; w: number }[];
}

/** Choices, one per line, each opened by a red pilcrow. */
export function drawChoicePanel(options: string[], opts: { portrait: boolean }): ChoiceLayout {
  const D = DIALOGUE;
  const lineH = 30;
  const W = D.width;
  const H = Math.max(D.height, 40 + options.length * lineH + 20);
  const il = new Illuminator(W, H, `choices:${options.join('|')}`);
  slip(il, W, H);
  const x = (opts.portrait ? D.textX : 34) + 34;
  const f = font(D.size);
  const rows = options.map((o, i) => {
    const y = 48 + i * lineH;
    il.paintText('¶', x - 20, y, font(D.size, { bold: true }), PIGMENTS.vermilion);
    il.inkText(`${i + 1}. ${o}`, x, y, f);
    return { y, x, w: measure(`${i + 1}. ${o}`, f) };
  });
  il.anchor = [0, 0];
  return { image: il.finish(), rows };
}

/**
 * The manicule: a pointing hand with a frilled cuff, pointing right.
 * Anchored at the fingertip.
 */
export function drawManicule(color: string = PIGMENTS.vermilion): IlluminatedImage {
  const il = new Illuminator(40, 22, `manicule:${color}`);
  const hand = smooth(
    [
      [9, 6],
      [20, 5],
      [36, 8.6], // fingertip
      [36.6, 10.6],
      [23, 11.5],
      [24, 14.5],
      [21, 17.5],
      [12, 17],
      [9, 15],
    ],
    true,
    0.6,
  );
  il.fill(hand, PIGMENTS.leadWhite);
  il.outline(hand, { width: 0.9, nibRatio: 0.6 });
  // Curled fingers and the cuff.
  il.ink([[20, 11.5], [23, 13.2]], { width: 0.6, bleed: false });
  il.ink([[18, 14], [21.5, 16]], { width: 0.6, bleed: false });
  const cuff = smooth(
    [
      [3, 4],
      [9, 5],
      [10, 17],
      [3, 18],
      [1, 11],
    ],
    true,
    0.7,
  );
  il.fill(cuff, color);
  il.outline(cuff, { width: 0.8, nibRatio: 0.6 });
  for (const y of [7.5, 11, 14.5]) il.ink([[2.6, y], [9.4, y + 0.4]], { width: 0.4, nibRatio: 1, bleed: false, alpha: 0.7 });
  il.anchor = [36.6, 9.6];
  return il.finish();
}

/**
 * Underwriting: scraped words that only show under raking light. Faded, slightly
 * askew, in a smaller and quicker hand than the text written over them.
 */
export function drawUnderwriting(lines: readonly string[], opts: { size?: number; door?: { w: number; h: number } } = {}): IlluminatedImage {
  const size = opts.size ?? 13;
  const f = `italic ${size}px ${SERIF}`;
  const textW = Math.max(40, ...lines.map((l) => measure(l, f)));
  const door = opts.door;
  const W = Math.max(textW + 16, door ? door.w + 16 : 0);
  const H = lines.length * (size + 4) + 12 + (door ? door.h + 8 : 0);
  const il = new Illuminator(W, H, `under:${lines.join('|')}`);
  if (door) {
    // The ghost of a doorway: its arch scored into the plaster.
    const dx = (W - door.w) / 2;
    const arch = pointedArch(dx, 6 + door.w * 0.5, door.w, door.w * 0.5, 6 + door.h);
    for (const pts of arch.polylines(1.5)) {
      for (let i = 0; i < pts.length - 4; i += 6) il.ink(pts.slice(i, i + 4) as Pt[], { width: 0.9, nibRatio: 0.8, bleed: false, alpha: 0.8 });
    }
  }
  lines.forEach((l, i) => il.inkText(l, W / 2, (door ? door.h + 14 : 0) + 6 + (i + 1) * (size + 4) - 4, f, 'center', 0.8));
  il.anchor = [W / 2, H / 2];
  return il.finish();
}

/** A small rubricated note slip (a found name, a saved game). Anchored top-left. */
export function drawNoteSlip(title: string, line: string): IlluminatedImage {
  const tf = font(15, { smallCaps: true, bold: true });
  const lf = font(15, { italic: true });
  const W = Math.max(measure(title, tf), measure(line, lf)) + 48;
  const H = 66;
  const il = new Illuminator(W, H, `note:${title}:${line}`);
  const s = new Shape()
    .moveTo(2, 4)
    .cubicTo(W * 0.4, 1, W * 0.6, 6, W - 2, 3)
    .lineTo(W - 3, H - 4)
    .cubicTo(W * 0.6, H - 1, W * 0.4, H - 6, 3, H - 2)
    .close();
  il.fill(s, PIGMENTS.leadWhite, 0.97);
  il.outline(s, { width: 0.7, nibRatio: 0.7 });
  il.paintText(title, W / 2, 27, tf, PIGMENTS.vermilion, 'center');
  il.inkText(line, W / 2, 50, lf, 'center');
  il.anchor = [0, 0];
  return il.finish();
}

/** The title page: a great gilded P and the rest of the word in red and black. */
export function drawTitlePage(palette: LocationPalette): IlluminatedImage {
  const W = 760;
  const H = 300;
  const il = new Illuminator(W, H, `title:${palette.id}`);
  const size = 190;
  const x = 40;
  const y = 40;
  // The initial: a lapis P on a gold ground framed in vermilion, with white-work.
  const box = rect(x, y, size, size);
  il.gild(box);
  const inset = 12;
  const panel = rect(x + inset, y + inset, size - inset * 2, size - inset * 2);
  il.fill(panel, PIGMENTS.vermilion);
  il.clip(panel, () => {
    for (let yy = y + inset + 6, row = 0; yy < y + size; yy += 11, row++) {
      for (let xx = x + inset + 6 + (row % 2) * 5.5; xx < x + size; xx += 11) il.dot(xx, yy, 1.2, PIGMENTS.leadWhite, 0.65);
    }
  });
  il.outline(box, { width: 1.6, nibRatio: 0.6 });
  il.outline(panel, { width: 1.1, nibRatio: 0.7 });
  const pf = `600 ${Math.round(size * 0.86)}px ${SERIF}`;
  il.paintText('P', x + size / 2 + 3, y + size * 0.8 + 3, pf, shade(PIGMENTS.lapis, -0.5), 'center');
  il.paintText('P', x + size / 2, y + size * 0.8, pf, PIGMENTS.lapis, 'center');
  il.inkCtx.save();
  il.inkCtx.font = pf;
  il.inkCtx.textAlign = 'center';
  il.inkCtx.lineWidth = 1.2;
  il.inkCtx.strokeStyle = '#000';
  il.inkCtx.strokeText('P', x + size / 2, y + size * 0.8);
  il.inkCtx.restore();
  // The rest of the title.
  const tf = `600 74px ${SERIF}`;
  il.paintText('ALIMPSEST', x + size + 18, y + 120, tf, PIGMENTS.vermilion);
  il.inkText('or, The Book of Names', x + size + 22, y + 166, font(28, { italic: true }));
  il.inkText('What is written is held.', x + size + 22, y + 204, font(18, { italic: true }), 'left', 0.75);
  il.anchor = [0, 0];
  return il.finish();
}
