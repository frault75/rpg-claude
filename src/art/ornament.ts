/**
 * Ornament: the bar-and-spray border of an English Decorated manuscript (c. 1320–40),
 * running titles, catchwords, banderoles (speech scrolls) and decorated initials.
 */

import { PAGE_H, PAGE_W, type Rect, TEXT_BLOCK } from '../engine/page';
import { Rng } from '../engine/rng';
import { Illuminator, type IlluminatedImage } from './illuminator';
import { type LocationPalette, PIGMENTS, shade } from './palettes';
import { circle, poly, type Pt, rect, Shape, smooth } from './path';
import { font, measure, SERIF } from './text';

const BAR_GAP = 8;
const BAR_W = 9;

/** A three-lobed ivy leaf with its base at `b`, pointing along angle `a`. */
export function ivyLeaf(b: Pt, a: number, len: number, wid: number): Shape {
  const ax = Math.cos(a);
  const ay = Math.sin(a);
  const nx = -ay;
  const ny = ax;
  const at = (u: number, v: number): Pt => [b[0] + ax * len * u + nx * wid * v, b[1] + ay * len * u + ny * wid * v];
  // A spade-shaped ivy leaf: broad lobes near the stalk, a long point.
  return smooth([at(0, 0), at(0.18, 0.62), at(0.48, 0.52), at(1, 0), at(0.48, -0.52), at(0.18, -0.62)], true, 0.7);
}

interface TendrilFrame {
  origin: Pt;
  /** Unit vector along the bar. */
  along: Pt;
  /** Unit vector away from the text block. */
  out: Pt;
}

/**
 * A spray tendril in bar-local coordinates: it leaves the bar, arches through the margin
 * and ends in a small spiral with a gold bezant. Bounded by `height` so it never leaves
 * the margin.
 */
function drawTendril(il: Illuminator, f: TendrilFrame, length: number, height: number, rng: Rng, leaves: string[], leafIdx: { i: number }): void {
  const toPage = (u: number, v: number): Pt => [
    f.origin[0] + f.along[0] * u + f.out[0] * v,
    f.origin[1] + f.along[1] * u + f.out[1] * v,
  ];
  const pts: Pt[] = [];
  const n = Math.ceil(length / 1.5);
  const wave = rng.range(0.08, 0.16);
  const rise = rng.range(0.55, 0.8);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const v = height * (Math.pow(Math.sin(Math.PI * Math.min(1, t * rise * 1.4)), 0.7) * 0.75 + Math.sin(t * Math.PI * 3) * wave);
    pts.push(toPage(length * t, Math.max(1, v)));
  }
  // Spiral end.
  const end = pts[pts.length - 1]!;
  const prev = pts[pts.length - 4] ?? pts[0]!;
  let heading = Math.atan2(end[1] - prev[1], end[0] - prev[0]);
  const spin = rng.chance(0.5) ? 1 : -1;
  let [x, y] = end;
  const spiral: Pt[] = [end];
  for (let i = 0; i < 26; i++) {
    const step = 1.6 * (1 - i / 34);
    heading += spin * (0.22 + i * 0.012);
    x += Math.cos(heading) * step;
    y += Math.sin(heading) * step;
    spiral.push([x, y]);
  }
  const stem = pts.concat(spiral.slice(1));
  il.ink(stem, { width: 1.3, nibRatio: 0.6, taperIn: 2, taperOut: 10, taperFloor: 0.3, wobble: 0.15, bleed: true });

  // Leaves alternate sides along the stem.
  const leafTs = [0.18, 0.34, 0.5, 0.64, 0.78].filter(() => rng.chance(0.9));
  leafTs.forEach((t, k) => {
    const i = Math.floor(t * (pts.length - 2));
    const p = pts[i]!;
    const q = pts[i + 1]!;
    const dir = Math.atan2(q[1] - p[1], q[0] - p[0]);
    const side = k % 2 === 0 ? 1 : -1;
    const a = dir + side * rng.range(0.55, 0.9);
    const color = leaves[leafIdx.i++ % leaves.length]!;
    const stalk: Pt = [p[0] + Math.cos(a) * 2.5, p[1] + Math.sin(a) * 2.5];
    const leaf = ivyLeaf(stalk, a, rng.range(9, 11), rng.range(6.5, 7.5));
    if (color === PIGMENTS.gold) {
      il.gild(leaf);
      il.punch(stalk[0] + Math.cos(a) * 5, stalk[1] + Math.sin(a) * 5, 0.6);
    } else {
      il.paint(leaf, color, { round: true, shadow: 0.5, lit: 0.45, pool: 0.5, texture: 0.3 });
      il.colorStroke([stalk, [stalk[0] + Math.cos(a) * 8, stalk[1] + Math.sin(a) * 8]], PIGMENTS.leadWhite, { width: 0.45, nibRatio: 1, taperIn: 1, taperOut: 3 }, 0.8);
    }
    il.outline(leaf, { width: 0.6, nibRatio: 0.65, wobble: 0.1 });
    il.ink([p, stalk], { width: 0.55, bleed: false });
  });

  // Gold bezants with hair-tendrils sprinkled along the outside.
  const bt = rng.range(0.38, 0.62);
  const bi = Math.floor(bt * (pts.length - 1));
  const bp = pts[bi]!;
  const bpos = toPage(length * bt, Math.min(height + 2.5, height * 0.92 + 5));
  il.ink([bp, bpos], { width: 0.45, bleed: false, taperOut: 1 });
  il.gildDot(bpos[0], bpos[1], 3.2);
  il.outline(circle(bpos[0], bpos[1], 3.2), { width: 0.55, nibRatio: 0.9, bleed: false });
  il.punch(bpos[0] - 0.8, bpos[1] - 0.8, 0.6);
  for (let k = -1; k <= 1; k++) {
    const h0 = Math.atan2(f.out[1], f.out[0]) + k * 0.7;
    const hair: Pt[] = [];
    let hx = bpos[0] + Math.cos(h0) * 2;
    let hy = bpos[1] + Math.sin(h0) * 2;
    let hh = h0;
    for (let i = 0; i < 6; i++) {
      hair.push([hx, hy]);
      hh += 0.35 * (k === 0 ? 1 : k);
      hx += Math.cos(hh) * 1.1;
      hy += Math.sin(hh) * 1.1;
    }
    il.ink(hair, { width: 0.32, bleed: false, taperOut: 3 });
  }
}

/** A gilded quatrefoil boss at a corner of the bar frame. */
function cornerBoss(il: Illuminator, c: Pt, palette: LocationPalette): void {
  const r = 11;
  const lobes: Shape = new Shape();
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4;
    lobes.add(circle(c[0] + Math.cos(a) * r * 0.55, c[1] + Math.sin(a) * r * 0.55, r * 0.6));
  }
  const square = rect(c[0] - r * 0.75, c[1] - r * 0.75, r * 1.5, r * 1.5);
  il.gild(lobes);
  il.gild(square);
  il.outline(lobes, { width: 0.7, nibRatio: 0.8 });
  il.punchLine(circle(c[0], c[1], r * 0.72).polylines(0.5)[0] ?? [], 2.2, 0.55);
  il.paint(circle(c[0], c[1], r * 0.45), palette.roles.barA, { round: true, shadow: 0.5, lit: 0.5, texture: 0 });
  il.outline(circle(c[0], c[1], r * 0.45), { width: 0.6, nibRatio: 0.9 });
  il.dot(c[0] - 1, c[1] - 1, r * 0.13, PIGMENTS.leadWhite);
}

/** One side of the bar: alternating colour segments joined by gold knots, with white-work. */
function barSide(il: Illuminator, a: Pt, b: Pt, palette: LocationPalette, rng: Rng): void {
  const horiz = Math.abs(b[1] - a[1]) < 1e-6;
  const len = horiz ? b[0] - a[0] : b[1] - a[1];
  const seg = (s0: number, s1: number): Shape =>
    horiz ? rect(a[0] + s0, a[1] - BAR_W / 2, s1 - s0, BAR_W) : rect(a[0] - BAR_W / 2, a[1] + s0, BAR_W, s1 - s0);
  let s = 12;
  let colorFlip = rng.chance(0.5);
  while (s < len - 12) {
    const segLen = Math.min(rng.range(70, 140), len - 12 - s);
    if (segLen < 20) break;
    const color = colorFlip ? palette.roles.barA : palette.roles.barB;
    colorFlip = !colorFlip;
    const body = seg(s, s + segLen);
    if (color === PIGMENTS.gold) il.gild(body);
    else il.paint(body, color, { shadow: 0.45, lit: 0.4, pool: 0.5, texture: 0.4, stroke: horiz ? 0 : Math.PI / 2, light: horiz ? -Math.PI / 2 : Math.PI });
    // White-work: a fine wavy line with dots, the painter's flourish on the bar.
    if (color !== PIGMENTS.gold) {
      const wavePts: Pt[] = [];
      for (let u = s + 3; u < s + segLen - 3; u += 1.2) {
        const w = Math.sin(u * 0.55) * 1.3;
        wavePts.push(horiz ? [a[0] + u, a[1] + w] : [a[0] + w, a[1] + u]);
      }
      il.colorStroke(wavePts, shade(PIGMENTS.leadWhite, 0), { width: 0.6, nibRatio: 1, taperIn: 1, taperOut: 1, wobble: 0.05 }, 0.9);
      for (let u = s + 6; u < s + segLen - 4; u += 11.4) {
        const p: Pt = horiz ? [a[0] + u, a[1] + Math.sin(u * 0.55) * 1.3] : [a[0] + Math.sin(u * 0.55) * 1.3, a[1] + u];
        il.dot(p[0] + (horiz ? 2.8 : 0), p[1] + (horiz ? 0 : 2.8), 0.7, PIGMENTS.leadWhite, 0.95);
      }
    }
    // A gold knot (lozenge) closing the segment.
    const kc = s + segLen + 4;
    if (kc < len - 8) {
      const c: Pt = horiz ? [a[0] + kc, a[1]] : [a[0], a[1] + kc];
      const k = 6.8;
      const knot = poly([
        [c[0], c[1] - k],
        [c[0] + k, c[1]],
        [c[0], c[1] + k],
        [c[0] - k, c[1]],
      ]);
      il.gild(knot);
      il.outline(knot, { width: 0.6, nibRatio: 0.8 });
      il.punch(c[0], c[1], 0.9);
      for (const [dx, dy] of [
        [0, -3.4],
        [3.4, 0],
        [0, 3.4],
        [-3.4, 0],
      ] as const)
        il.punch(c[0] + dx, c[1] + dy, 0.5);
    }
    s += segLen + 8;
  }
  // The bar's two ruled edges.
  const off = BAR_W / 2;
  const e1: Pt[] = horiz ? [[a[0], a[1] - off], [b[0], b[1] - off]] : [[a[0] - off, a[1]], [b[0] - off, b[1]]];
  const e2: Pt[] = horiz ? [[a[0], a[1] + off], [b[0], b[1] + off]] : [[a[0] + off, a[1]], [b[0] + off, b[1]]];
  il.ink(e1, { width: 0.7, nibRatio: 0.85, taperIn: 0, taperOut: 0, wobble: 0.12 });
  il.ink(e2, { width: 0.7, nibRatio: 0.85, taperIn: 0, taperOut: 0, wobble: 0.12 });
}

/** A running title: capitals alternating red and blue, centred in the top margin. */
function runningTitle(il: Illuminator, text: string, palette: LocationPalette): void {
  const f = font(12, { bold: true });
  const spacing = 2.2;
  const chars = [...text];
  const widths = chars.map((c) => measure(c, f) + spacing);
  const total = widths.reduce((a, b) => a + b, 0);
  let x = PAGE_W / 2 - total / 2;
  let colored = 0;
  chars.forEach((c, i) => {
    if (c.trim() && c !== '·') {
      const color = colored++ % 2 === 0 ? PIGMENTS.vermilion : palette.roles.barA === PIGMENTS.vermilion ? PIGMENTS.lapis : palette.roles.barA;
      il.paintText(c, x, 21, f, color);
    } else if (c === '·') {
      il.paintText('·', x, 21, f, PIGMENTS.ironGall);
    }
    x += widths[i]!;
  });
}

/** A catchword at the foot of the page, boxed in red pen-work, as a scribe would leave it. */
function catchword(il: Illuminator, text: string): void {
  const f = font(11, { italic: true });
  const w = measure(text, f);
  const x = TEXT_BLOCK.x + TEXT_BLOCK.w - w - 4;
  const y = TEXT_BLOCK.y + TEXT_BLOCK.h + BAR_GAP + BAR_W + 26;
  il.inkText(text, x, y, f, 'left', 0.9);
  const box: Pt[] = [
    [x - 5, y - 11],
    [x + w + 5, y - 11],
    [x + w + 5, y + 4],
    [x - 5, y + 4],
    [x - 5, y - 11],
  ];
  il.colorStroke(box, PIGMENTS.vermilion, { width: 0.6, nibRatio: 0.8, taperIn: 1, taperOut: 1 }, 0.9);
  il.colorStroke(
    [
      [x + w + 5, y + 4],
      [x + w + 11, y + 8],
      [x + w + 9, y + 12],
      [x + w + 6, y + 10],
    ],
    PIGMENTS.vermilion,
    { width: 0.5, taperOut: 3 },
    0.9,
  );
}

/** The whole page border for a location. Drawn once per palette; the centre is empty. */
export function drawBorder(palette: LocationPalette, seed: number | string = 'border'): IlluminatedImage {
  const il = new Illuminator(PAGE_W, PAGE_H, `${String(seed)}:${palette.id}`);
  il.anchor = [0, 0];
  const rng = il.rng.fork('border');
  const tb: Rect = TEXT_BLOCK;
  const o = BAR_GAP + BAR_W / 2;
  const L = tb.x - o;
  const R = tb.x + tb.w + o;
  const T = tb.y - o;
  const B = tb.y + tb.h + o;

  // Sprays first, so the bar sits over the roots of the stems.
  const leafIdx = { i: rng.int(0, 3) };
  const outer = BAR_W / 2 + 0.5;
  const spray = (origin: Pt, along: Pt, out: Pt, length: number, height: number) =>
    drawTendril(il, { origin: [origin[0] + out[0] * outer, origin[1] + out[1] * outer], along, out }, length, height, rng, palette.roles.leaves, leafIdx);
  const hTop = 13;
  const hSide = 22;
  const hBottom = 24;
  // Corner sprays, two per corner, running along each side.
  spray([L + 10, T], [1, 0], [0, -1], rng.range(110, 160), hTop);
  spray([L, T + 10], [0, 1], [-1, 0], rng.range(110, 150), hSide);
  spray([R - 10, T], [-1, 0], [0, -1], rng.range(110, 160), hTop);
  spray([R, T + 10], [0, 1], [1, 0], rng.range(110, 150), hSide);
  spray([L + 10, B], [1, 0], [0, 1], rng.range(120, 170), hBottom);
  spray([L, B - 10], [0, -1], [-1, 0], rng.range(110, 150), hSide);
  spray([R - 10, B], [-1, 0], [0, 1], rng.range(120, 170), hBottom);
  spray([R, B - 10], [0, -1], [1, 0], rng.range(110, 150), hSide);
  // Mid-side sprays on the long sides and top.
  const midY = (T + B) / 2;
  spray([L, midY + 4], [0, 1], [-1, 0], rng.range(90, 120), hSide);
  spray([L, midY - 4], [0, -1], [-1, 0], rng.range(90, 120), hSide);
  spray([R, midY + 4], [0, 1], [1, 0], rng.range(90, 120), hSide);
  spray([R, midY - 4], [0, -1], [1, 0], rng.range(90, 120), hSide);
  spray([PAGE_W * 0.3, T], [-1, 0], [0, -1], rng.range(70, 100), hTop);
  spray([PAGE_W * 0.7, T], [1, 0], [0, -1], rng.range(70, 100), hTop);

  barSide(il, [L, T], [R, T], palette, rng);
  barSide(il, [L, B], [R, B], palette, rng);
  barSide(il, [L, T], [L, B], palette, rng);
  barSide(il, [R, T], [R, B], palette, rng);
  for (const c of [
    [L, T],
    [R, T],
    [L, B],
    [R, B],
  ] as Pt[])
    cornerBoss(il, c, palette);

  runningTitle(il, palette.heading, palette);
  catchword(il, 'what is written');
  return il.finish();
}

// ---- banderoles -------------------------------------------------------------------------

export interface BanderoleOptions {
  /** Text colour: rubric red for intents, iron-gall for speech. */
  color?: string;
  size?: number;
  maxWidth?: number;
  seed?: number | string;
}

/**
 * A banderole: the unfurled speech scroll of medieval art, with curled ends.
 * Its anchor is the bottom centre of the tail, where it leaves the speaker.
 */
export function drawBanderole(text: string, opts: BanderoleOptions = {}): IlluminatedImage {
  const size = opts.size ?? 15;
  const f = font(size, { italic: true });
  const tw = Math.min(measure(text, f), opts.maxWidth ?? 520);
  const bodyW = tw + 26;
  const bodyH = size + 12;
  const curl = 11;
  const W = bodyW + curl * 2 + 8;
  const H = bodyH + 22;
  const il = new Illuminator(W, H, opts.seed ?? text);
  const x0 = curl + 4;
  const y0 = 4;
  const x1 = x0 + bodyW;
  const y1 = y0 + bodyH;
  const sag = 3;
  // The scroll body, slightly waved.
  const body = new Shape()
    .moveTo(x0, y0 + 2)
    .cubicTo(x0 + bodyW * 0.33, y0 - sag, x0 + bodyW * 0.66, y0 + sag, x1, y0 + 1)
    .lineTo(x1, y1 + 1)
    .cubicTo(x0 + bodyW * 0.66, y1 + sag, x0 + bodyW * 0.33, y1 - sag, x0, y1 + 2)
    .close();
  // Rolled ends: a curl at each side showing the scroll's underside.
  const leftCurl = smooth(
    [
      [x0, y0 + 2],
      [x0 - curl * 0.8, y0 + 3],
      [x0 - curl, y0 + bodyH * 0.55],
      [x0 - curl * 0.35, y1 + 5],
      [x0 + 2, y1 + 2],
    ],
    false,
  )
    .lineTo(x0, y0 + 2)
    .close();
  const rightCurl = smooth(
    [
      [x1, y1 + 1],
      [x1 + curl * 0.8, y1],
      [x1 + curl, y0 + bodyH * 0.45],
      [x1 + curl * 0.35, y0 - 3],
      [x1 - 2, y0 + 1],
    ],
    false,
  )
    .lineTo(x1, y1 + 1)
    .close();
  const underside = shade(PIGMENTS.vellumDeep, -0.08);
  il.fill(leftCurl, underside);
  il.fill(rightCurl, underside);
  il.fill(body, PIGMENTS.leadWhite);
  // A soft shade band along the lower edge.
  il.clip(body, () => {
    il.fill(rect(x0, y1 - 4, bodyW, 6), PIGMENTS.vellumShade, 0.7);
  });
  il.outline(body, { width: 0.8, nibRatio: 0.6 });
  il.outline(leftCurl, { width: 0.75, nibRatio: 0.6 });
  il.outline(rightCurl, { width: 0.75, nibRatio: 0.6 });
  // The tail: a little twist leading down to the speaker.
  const tx = W / 2;
  const tail = new Shape()
    .moveTo(tx - 7, y1 + 1)
    .cubicTo(tx - 5, y1 + 8, tx + 2, y1 + 10, tx - 1, H - 1)
    .cubicTo(tx + 6, y1 + 10, tx + 5, y1 + 6, tx + 7, y1 + 1)
    .close();
  il.fill(tail, PIGMENTS.leadWhite);
  il.outline(tail, { width: 0.7, nibRatio: 0.6 });
  il.fill(rect(tx - 6.5, y1 - 1.5, 13, 3), PIGMENTS.leadWhite);
  // The words.
  const color = opts.color ?? PIGMENTS.ironGall;
  if (color === PIGMENTS.ironGall) il.inkText(text, W / 2, y0 + bodyH / 2 + size * 0.36, f, 'center');
  else il.paintText(text, W / 2, y0 + bodyH / 2 + size * 0.36, f, color, 'center');
  il.anchor = [tx - 1, H - 1];
  return il.finish();
}

// ---- initials ----------------------------------------------------------------------------

/**
 * A decorated initial: the letter in blue (or red) on a burnished gold ground, framed,
 * with red pen-flourishing trailing into the margin. (System-serif letterform; the
 * Lombardic pen alphabet arrives in a later milestone.)
 */
export function drawInitial(letter: string, size: number, palette: LocationPalette, seed: number | string = letter): IlluminatedImage {
  const pad = size * 0.55;
  const W = size + pad * 2;
  const H = size + pad * 2.4;
  const il = new Illuminator(W, H, `${String(seed)}:initial`);
  const rng = il.rng;
  const bx = pad;
  const by = pad * 0.6;
  const box = rect(bx, by, size, size);
  // Gold ground with a coloured inner panel.
  il.gild(box);
  const inset = size * 0.09;
  const panel = rect(bx + inset, by + inset, size - inset * 2, size - inset * 2);
  il.fill(panel, palette.roles.barB === PIGMENTS.gold ? PIGMENTS.vermilion : palette.roles.barB);
  // Diaper of tiny white crosses on the panel.
  il.clip(panel, () => {
    for (let y = by + inset + 4; y < by + size; y += 7) {
      for (let x = bx + inset + 4 + ((y / 7) % 2) * 3.5; x < bx + size; x += 7) il.dot(x, y, 0.7, PIGMENTS.leadWhite, 0.75);
    }
  });
  il.outline(box, { width: 1, nibRatio: 0.8 });
  il.outline(panel, { width: 0.7, nibRatio: 0.8 });
  // The letter: blue body with a white highlight edge and a fine outline.
  const f = `600 ${Math.round(size * 0.82)}px ${SERIF}`;
  const lx = bx + size / 2;
  const ly = by + size * 0.8;
  il.paintText(letter, lx + size * 0.025, ly + size * 0.02, f, PIGMENTS.leadWhite, 'center');
  il.paintText(letter, lx, ly, f, palette.roles.barA === PIGMENTS.gold ? PIGMENTS.lapis : palette.roles.barA, 'center');
  il.inkCtx.save();
  il.inkCtx.font = f;
  il.inkCtx.textAlign = 'center';
  il.inkCtx.lineWidth = 0.7;
  il.inkCtx.strokeStyle = '#000';
  il.inkCtx.strokeText(letter, lx, ly);
  il.inkCtx.restore();
  // Red pen-flourishing: hairline stems with curls running down and out.
  const flourish = (sx: number, sy: number, dir: number, len: number) => {
    const pts: Pt[] = [];
    let x = sx;
    let y = sy;
    for (let i = 0; i < len; i++) {
      pts.push([x, y]);
      y += 1.4;
      x += Math.sin(i * 0.5) * 0.9 * dir;
    }
    il.colorStroke(pts, PIGMENTS.vermilion, { width: 0.5, nibRatio: 0.9, taperOut: 6, wobble: 0.1 }, 0.95);
    for (let k = 4; k < len - 2; k += 5) {
      const p = pts[k]!;
      const curl: Pt[] = [];
      let h = dir > 0 ? 0 : Math.PI;
      let cx = p[0];
      let cy = p[1];
      for (let j = 0; j < 9; j++) {
        curl.push([cx, cy]);
        h += 0.5 * dir;
        cx += Math.cos(h) * 1.1;
        cy += Math.sin(h) * 1.1;
      }
      il.colorStroke(curl, PIGMENTS.vermilion, { width: 0.4, nibRatio: 1, taperOut: 3 }, 0.9);
    }
  };
  flourish(bx + 2, by + size + 1, -1, Math.floor(rng.range(10, 16)));
  flourish(bx + size - 2, by + size + 1, 1, Math.floor(rng.range(6, 10)));
  il.anchor = [0, 0];
  return il.finish();
}

// ---- captions -----------------------------------------------------------------------------

/**
 * A location card: a decorated initial, the place name rubricated, and one line in ink,
 * on a slip of lead-white ruled in red. Anchored at its top-left.
 */
export function drawLocationCard(title: string, line: string, palette: LocationPalette): IlluminatedImage {
  const titleFont = font(23, { smallCaps: true, bold: true });
  const lineFont = font(14, { italic: true });
  const initialSize = 46;
  const rest = title.slice(1);
  const textW = Math.max(measure(rest, titleFont) + 4, measure(line, lineFont));
  const W = initialSize + textW + 52;
  const H = 86;
  const il = new Illuminator(W, H, `card:${title}:${palette.id}`);
  const slip = new Shape()
    .moveTo(3, 4)
    .cubicTo(W * 0.3, 2, W * 0.7, 6, W - 3, 3)
    .lineTo(W - 4, H - 4)
    .cubicTo(W * 0.7, H - 2, W * 0.3, H - 6, 4, H - 3)
    .close();
  il.fill(slip, PIGMENTS.leadWhite, 0.96);
  il.outline(slip, { width: 0.7, nibRatio: 0.7 });
  for (const y of [11, H - 11]) il.colorStroke([[10, y], [W - 10, y]], PIGMENTS.vermilion, { width: 0.55, nibRatio: 1, taperIn: 2, taperOut: 2 }, 0.8);
  // The initial, painted in place.
  drawInitialInto(il, title[0] ?? 'A', 14, 16, initialSize, palette);
  il.paintText(rest, 14 + initialSize + 10, 42, titleFont, PIGMENTS.vermilion);
  il.inkText(line, 14 + initialSize + 10, 64, lineFont);
  il.anchor = [0, 0];
  return il.finish();
}

/** Paint a compact decorated initial directly into an existing illuminator. */
function drawInitialInto(il: Illuminator, letter: string, x: number, y: number, size: number, palette: LocationPalette): void {
  const box = rect(x, y, size, size);
  il.gild(box);
  const inset = size * 0.09;
  const panel = rect(x + inset, y + inset, size - inset * 2, size - inset * 2);
  const panelColor = palette.roles.barB === PIGMENTS.gold ? PIGMENTS.vermilion : palette.roles.barB;
  il.fill(panel, panelColor);
  il.clip(panel, () => {
    for (let yy = y + inset + 4, row = 0; yy < y + size; yy += 6, row++) {
      for (let xx = x + inset + 3 + (row % 2) * 3; xx < x + size; xx += 6) il.dot(xx, yy, 0.6, PIGMENTS.leadWhite, 0.7);
    }
  });
  il.outline(box, { width: 0.9, nibRatio: 0.8 });
  il.outline(panel, { width: 0.6, nibRatio: 0.8 });
  const f = `600 ${Math.round(size * 0.8)}px ${SERIF}`;
  const letterColor = panelColor === PIGMENTS.lapis || panelColor === PIGMENTS.azurite ? PIGMENTS.leadWhite : PIGMENTS.lapis;
  il.paintText(letter, x + size / 2 + 0.8, y + size * 0.79 + 0.8, f, shade(letterColor, -0.5), 'center');
  il.paintText(letter, x + size / 2, y + size * 0.79, f, letterColor, 'center');
}
