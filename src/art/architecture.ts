/**
 * Architecture in the oblique view of the great calendar pages: every building a solid,
 * its front lit from the upper left, its side turned into shadow, its roofs in two tones.
 * Still no vanishing point; depth runs up and to the right at a fixed slant.
 */

import { Illuminator, type IlluminatedImage } from './illuminator';
import { type LocationPalette, mix, PIGMENTS, shade } from './palettes';
import { circle, ellipse, pointedArch, poly, type Pt, rect, Shape, smooth } from './path';

type Roles = LocationPalette['roles'];

const OUTLINE = { width: 0.95, nibRatio: 0.5 };
const DETAIL = { width: 0.6, nibRatio: 0.7, bleed: false };

/** One unit of depth in the drawing: up and to the right. */
const DX = 0.62;
const DY = -0.42;

interface Tones {
  front: string;
  side: string;
  top: string;
}

function stoneTones(r: Roles): Tones {
  return {
    front: r.stone,
    side: shade(mix(r.stone, r.stoneShade, 0.7), -0.2),
    top: shade(r.stone, 0.15),
  };
}

/** Courses of ashlar on a face, in the face's own direction. */
function courses(il: Illuminator, face: Shape, x0: number, y0: number, w: number, h: number, slant: number, alpha = 0.32): void {
  const rng = il.rng.fork(`c:${x0 | 0}:${y0 | 0}`);
  il.clip(face, () => {
    for (let y = y0 + 6, row = 0; y < y0 + h + Math.abs(slant) * w; y += 7, row++) {
      il.ink(
        [
          [x0 - 2, y],
          [x0 + w + 2, y + slant * (w + 4)],
        ],
        { width: 0.4, nibRatio: 1, bleed: false, alpha },
      );
      for (let x = x0 + ((row * 5 + 3) % 12); x < x0 + w; x += rng.range(10, 15)) {
        const yy = y + slant * (x - x0);
        il.ink(
          [
            [x, yy],
            [x, yy + 7],
          ],
          { width: 0.35, nibRatio: 1, bleed: false, alpha: alpha * 0.8 },
        );
      }
    }
  });
}

interface Prism {
  front: Shape;
  side: Shape;
  /** Top front-left, top front-right, top back-right, top back-left. */
  top: [Pt, Pt, Pt, Pt];
}

/** A stone block: front face, side face in shadow, optional flat top. */
function prism(il: Illuminator, x: number, base: number, w: number, h: number, d: number, t: Tones, opts: { flatTop?: boolean; masonry?: boolean } = {}): Prism {
  const dx = d * DX;
  const dy = d * DY;
  const top = base - h;
  const front = rect(x, top, w, h);
  const side = poly([
    [x + w, top],
    [x + w + dx, top + dy],
    [x + w + dx, base + dy],
    [x + w, base],
  ]);
  il.paint(side, t.side, { shadow: 0.4, lit: 0.08, pool: 0.45, texture: 1, stroke: Math.atan2(DY, DX) });
  if (opts.masonry !== false) courses(il, side, x + w, top, dx, h, dy / dx, 0.28);
  il.outline(side, OUTLINE);
  il.paint(front, t.front, { shadow: 0.36, lit: 0.3, pool: 0.5, texture: 1, stroke: 0 });
  // Shadow gathering at the foot of the wall.
  il.clip(front, () => il.softFill(rect(x - 4, base - 10, w + 8, 16), shade(t.side, -0.3), 0.35, 6));
  if (opts.masonry !== false) courses(il, front, x, top, w, h, 0, 0.3);
  il.outline(front, OUTLINE);
  const tp: [Pt, Pt, Pt, Pt] = [
    [x, top],
    [x + w, top],
    [x + w + dx, top + dy],
    [x + dx, top + dy],
  ];
  if (opts.flatTop) {
    const s = poly(tp);
    il.paint(s, t.top, { shadow: 0.1, lit: 0.2, texture: 0.3 });
    il.outline(s, OUTLINE);
  }
  return { front, side, top: tp };
}

/** A pitched roof whose ridge runs across the front: the front slope lit, the gable end dark. */
function gableRoof(il: Illuminator, x: number, top: number, w: number, d: number, rise: number, color: string, cresting = false): Pt[] {
  const dx = d * DX;
  const dy = d * DY;
  const ridgeL: Pt = [x + dx / 2, top + dy / 2 - rise];
  const ridgeR: Pt = [x + w + dx / 2, top + dy / 2 - rise];
  const slope = poly([[x - 3, top + 2], [x + w + 3, top + 2], ridgeR, ridgeL]);
  const end = poly([[x + w + 3, top + 2], [x + w + dx + 2, top + dy + 1], ridgeR]);
  il.paint(end, shade(color, -0.38), { shadow: 0.35, lit: 0.05, texture: 0.4 });
  il.outline(end, OUTLINE);
  il.paint(slope, color, { shadow: 0.35, lit: 0.35, pool: 0.4, texture: 0.5, stroke: 0 });
  il.clip(slope, () => {
    // Tiles: rows of scales following the slope.
    const rows = Math.ceil(rise / 5) + 2;
    for (let i = 0; i < rows; i++) {
      const t = i / rows;
      const y = top + 2 + (ridgeL[1] - top) * t;
      const x0 = x - 3 + (ridgeL[0] - x) * t;
      for (let k = 0, xx = x0 - 6 + (i % 2) * 3.4; xx < x0 + w + 6; xx += 6.8, k++) {
        il.hairline(new Shape().moveTo(xx, y).cubicTo(xx + 0.4, y + 3.6, xx + 6.4, y + 3.6, xx + 6.8, y), 0.42, 0.4);
      }
    }
    il.softFill(rect(x - 6, top - 6, w + 12, 10), shade(color, -0.5), 0.5, 3);
  });
  il.outline(slope, OUTLINE);
  il.ink([ridgeL, ridgeR], { width: 1.1, nibRatio: 0.6 });
  if (cresting) {
    const n = Math.floor(w / 10);
    for (let i = 1; i < n; i++) {
      const px = ridgeL[0] + (ridgeR[0] - ridgeL[0]) * (i / n);
      const py = ridgeL[1];
      const fl = smooth([[px - 2, py], [px - 1.3, py - 2.8], [px, py - 4.8], [px + 1.3, py - 2.8], [px + 2, py]], true);
      il.gild(fl);
      il.outline(fl, { width: 0.4, nibRatio: 0.9, bleed: false });
    }
  }
  return [ridgeL, ridgeR];
}

/** A four-sided roof rising to a point; tall and narrow, it is a spire. */
function pyramidRoof(il: Illuminator, x: number, top: number, w: number, d: number, rise: number, color: string, crockets = false): Pt {
  const dx = d * DX;
  const dy = d * DY;
  const apex: Pt = [x + w / 2 + dx / 2, top + dy / 2 - rise];
  const front = poly([[x - 2, top + 1], [x + w + 2, top + 1], apex]);
  const side = poly([[x + w + 2, top + 1], [x + w + dx + 2, top + dy], apex]);
  il.paint(side, shade(color, -0.4), { shadow: 0.3, lit: 0.05, texture: 0.4, stroke: -Math.PI / 2 });
  il.outline(side, OUTLINE);
  il.paint(front, color, { shadow: 0.3, lit: 0.4, pool: 0.4, texture: 0.5, stroke: -Math.PI / 2 });
  il.clip(front, () => {
    for (let y = top - 6; y > apex[1] + 6; y -= 6) {
      const t = (top - y) / (top - apex[1]);
      const half = (w / 2 + 2) * (1 - t);
      const cx = x + w / 2 + (apex[0] - x - w / 2) * t;
      il.ink([[cx - half, y], [cx + half, y]], { width: 0.35, nibRatio: 1, bleed: false, alpha: 0.3 });
    }
  });
  il.outline(front, OUTLINE);
  if (crockets) {
    for (const edge of [
      [[x - 2, top + 1], apex],
      [[x + w + dx + 2, top + dy], apex],
    ] as [Pt, Pt][]) {
      for (let t = 0.12; t < 0.9; t += 0.11) {
        const px = edge[0][0] + (edge[1][0] - edge[0][0]) * t;
        const py = edge[0][1] + (edge[1][1] - edge[0][1]) * t;
        const side = px < apex[0] ? -1 : 1;
        il.ink(
          [
            [px, py],
            [px + side * 2.8, py - 0.8],
            [px + side * 3, py - 3],
            [px + side * 1.2, py - 2.4],
          ],
          { width: 0.75, nibRatio: 0.8, bleed: false, taperOut: 2 },
        );
      }
    }
  }
  return apex;
}

/** A round turret: a cylinder shaded across, with a conical cap. */
function turret(il: Illuminator, cx: number, base: number, r: number, h: number, capRise: number, t: Tones, roof: string): Pt {
  const top = base - h;
  const body = new Shape()
    .moveTo(cx - r, top)
    .lineTo(cx - r, base)
    .cubicTo(cx - r, base + r * 0.5, cx + r, base + r * 0.5, cx + r, base)
    .lineTo(cx + r, top)
    .close();
  il.fill(body, t.front);
  il.clip(body, () => {
    const g = il.paintCtx.createLinearGradient(cx - r, 0, cx + r, 0);
    g.addColorStop(0, 'rgba(255,250,240,0.25)');
    g.addColorStop(0.3, 'rgba(255,250,240,0)');
    g.addColorStop(0.62, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(20,24,40,0.55)');
    il.paintCtx.fillStyle = g;
    il.paintCtx.fillRect(cx - r, top - 2, r * 2, h + r);
    for (let y = top + 6; y < base + r * 0.4; y += 7) {
      il.hairline(new Shape().moveTo(cx - r, y).cubicTo(cx - r, y + r * 0.35, cx + r, y + r * 0.35, cx + r, y), 0.4, 0.3);
    }
  });
  il.outline(body, OUTLINE);
  // Arrow slit.
  il.paint(rect(cx - r * 0.3, top + h * 0.3, 3, 12), shade(PIGMENTS.umber, -0.4), { texture: 0, pool: 0 });
  // Conical cap with an eave overhang.
  const apex: Pt = [cx, top - capRise];
  const cap = new Shape()
    .moveTo(cx - r - 4, top + 2)
    .cubicTo(cx - r - 4, top + r * 0.45, cx + r + 4, top + r * 0.45, cx + r + 4, top + 2)
    .lineTo(apex[0], apex[1])
    .close();
  il.fill(cap, roof);
  il.clip(cap, () => {
    const g = il.paintCtx.createLinearGradient(cx - r, 0, cx + r, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.28)');
    g.addColorStop(0.35, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(10,12,30,0.55)');
    il.paintCtx.fillStyle = g;
    il.paintCtx.fillRect(cx - r - 5, apex[1], r * 2 + 10, capRise + r);
    for (let k = -3; k <= 3; k++) il.ink([[cx + k * r * 0.33, top + r * 0.3], apex], { width: 0.35, nibRatio: 1, bleed: false, alpha: 0.3 });
  });
  il.outline(cap, OUTLINE);
  goldCross(il, apex[0], apex[1], 0.8);
  return apex;
}

function goldCross(il: Illuminator, x: number, y: number, s = 1): void {
  const stem = rect(x - 0.9 * s, y - 12 * s, 1.8 * s, 12 * s);
  const bar = rect(x - 3.6 * s, y - 9.2 * s, 7.2 * s, 1.8 * s);
  il.gild(stem);
  il.gild(bar);
  il.outline(stem, { width: 0.45, nibRatio: 1, bleed: false });
  il.outline(bar, { width: 0.45, nibRatio: 1, bleed: false });
  il.gildDot(x, y - 12.8 * s, 1.3 * s);
}

/** A lancet window. At night the glass is lit from within and glows. */
function lancet(il: Illuminator, x: number, y: number, w: number, h: number, r: Roles, lit: boolean, double = false): void {
  const s = pointedArch(x, y + w * 0.9, w, w * 0.9, y + h);
  if (lit) il.softFill(ellipse(x + w / 2, y + h / 2, w * 1.4, h * 0.75), PIGMENTS.orpiment, 0.32, 7);
  // A deep reveal round the glass.
  il.paint(pointedArch(x - 2, y + w * 0.9, w + 4, w + 1, y + h + 1), shade(r.stone, -0.3), { texture: 0, pool: 0.3 });
  il.paint(s, lit ? r.windowLit : r.window, { round: true, shadow: lit ? 0.25 : 0.5, lit: 0.45, pool: 0.4, texture: 0.25 });
  il.clip(s, () => {
    for (let k = -h; k < w + h; k += 4.2) {
      il.colorStroke([[x + k, y], [x + k - h, y + h]], lit ? '#8A5A1E' : PIGMENTS.goldDark, { width: 0.35, nibRatio: 1, taperIn: 0, taperOut: 0 }, 0.55);
      il.colorStroke([[x + k - h, y], [x + k, y + h]], lit ? '#8A5A1E' : PIGMENTS.goldDark, { width: 0.35, nibRatio: 1, taperIn: 0, taperOut: 0 }, 0.55);
    }
    if (!lit) il.softFill(ellipse(x + w * 0.35, y + w * 1.1, w * 0.25, w * 0.6), PIGMENTS.leadWhite, 0.4, 2);
  });
  if (double) il.ink([[x + w / 2, y + w * 0.45], [x + w / 2, y + h]], { width: 0.9, nibRatio: 1, bleed: false });
  il.outline(s, { width: 0.85, nibRatio: 0.7 });
}

/** Merlons along the top of a wall, each a small block. */
function battlements(il: Illuminator, x: number, top: number, w: number, d: number, t: Tones): void {
  const mw = 9;
  const gap = 7;
  for (let mx = x; mx < x + w - 2; mx += mw + gap) prism(il, mx, top, Math.min(mw, x + w - mx), 9, d, t, { flatTop: true, masonry: false });
}

/**
 * A rock of piled boulders, each lit on its upper left and dark on its lower right,
 * with clefts and a tuft or two in the cracks. Front boulders are drawn last.
 */
export function boulders(il: Illuminator, cx: number, width: number, top: number, bottom: number, r: Roles): void {
  const rng = il.rng.fork('boulders');
  const rows = 4;
  const rowH = (bottom - top) / rows;
  for (let row = 0; row < rows; row++) {
    const rowW = width * (0.78 + (0.22 * row) / (rows - 1));
    let x = cx - rowW / 2 + rng.range(-6, 6);
    const end = cx + rowW / 2;
    while (x < end - 10) {
      const w = Math.min(rng.range(34, 76), end - x + 6);
      const h = rowH * rng.range(1.3, 1.75);
      const y = top + row * rowH + rng.range(-4, 3);
      const pts: Pt[] = [];
      const n = rng.int(6, 8);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rng.jitter(0.2);
        const rr = 1 + rng.jitter(0.16);
        // Flatter tops and bottoms: boulders settle.
        pts.push([x + w / 2 + Math.cos(a) * (w / 2) * rr, y + h / 2 + Math.sin(a) * (h / 2) * rr * (Math.sin(a) > 0 ? 0.85 : 1)]);
      }
      const b = smooth(pts, true, 0.38);
      const base = shade(r.rock, rng.range(-0.1, 0.06));
      il.paint(b, base, { round: true, shadow: 0.65, lit: 0.4, pool: 0.6, texture: 1 });
      il.clip(b, () => {
        // A lit facet on the upper left.
        il.softFill(ellipse(x + w * 0.36, y + h * 0.3, w * 0.3, h * 0.2, -0.2), r.rockLight, 0.75, 3);
        il.softFill(ellipse(x + w * 0.75, y + h * 0.82, w * 0.45, h * 0.35), shade(r.rock, -0.6), 0.45, 5);
        // Moss and lichen on the tops.
        if (rng.chance(0.6)) il.softFill(ellipse(x + w * rng.range(0.3, 0.6), y + h * 0.12, w * 0.25, h * 0.1), r.foliage, 0.55, 2.5);
        for (let k = 0; k < 4; k++) il.dot(x + w * rng.range(0.15, 0.85), y + h * rng.range(0.15, 0.7), rng.range(0.5, 1.1), rng.chance(0.5) ? '#C9C29A' : '#9AA58A', 0.6);
        if (rng.chance(0.75)) {
          const kx = x + w * rng.range(0.35, 0.7);
          il.ink(
            [
              [kx, y + h * 0.2],
              [kx + rng.range(-4, 4), y + h * 0.55],
              [kx + rng.range(-6, 6), y + h * 0.85],
            ],
            { width: 0.6, nibRatio: 0.7, bleed: false, alpha: 0.65 },
          );
        }
      });
      il.outline(b, { width: 0.75, nibRatio: 0.5 });
      if (rng.chance(0.35)) tuft(il, x + w * rng.range(0.2, 0.8), y + rng.range(2, 6), rng.range(2.6, 3.6), r);
      x += w * rng.range(0.7, 0.88);
    }
  }
  // Foam where the sea meets the rock.
  const half = width / 2 + 10;
  for (let k = 0; k < 2; k++) {
    const y = bottom + 6 + k * 5;
    const pts: Pt[] = [];
    for (let x = cx - half; x <= cx + half; x += 2) pts.push([x, y + Math.sin(x * 0.24 + k) * 1.6]);
    il.colorStroke(pts, k === 0 ? PIGMENTS.leadWhite : r.waterDeep, { width: 1.4 - k * 0.3, nibRatio: 0.45, taperIn: 10, taperOut: 10 }, k === 0 ? 0.85 : 0.6);
  }
}

/**
 * The Abbey of Saint Ebb's on its island: west tower and spire, nave with clerestory and
 * crossing tower, the scriptorium range, curtain wall with gate and round turrets.
 * About 560 x 470 units; anchored at the foot of the rock.
 */
export function drawAbbey(palette: LocationPalette, seed: number | string = 'abbey'): IlluminatedImage {
  const W = 560;
  const H = 470;
  const il = new Illuminator(W, H, `${String(seed)}:${palette.id}`);
  const r = palette.roles;
  const t = stoneTones(r);
  const lit = r.glassLit;

  // West tower, standing at the nave's west end.
  const wt = prism(il, 96, 336, 60, 222, 46, t);
  lancet(il, 106, 128, 16, 46, r, lit, true);
  lancet(il, 132, 128, 16, 46, r, lit, true);
  lancet(il, 118, 200, 22, 52, r, lit, true);
  for (const y of [190, 262]) {
    il.paint(rect(94, y, 64, 4), shade(r.stone, -0.08), { texture: 0, pool: 0.3 });
    il.outline(rect(94, y, 64, 4), DETAIL);
  }
  const spireApex = pyramidRoof(il, 98, wt.top[0][1] - 2, 56, 44, 104, r.roof, true);
  goldCross(il, spireApex[0], spireApex[1], 1.1);
  for (const px of [92, 152]) {
    const pin = poly([[px, wt.top[0][1] + 2], [px + 4, wt.top[0][1] - 22], [px + 8, wt.top[0][1] + 2]]);
    il.figure(pin, t.front, DETAIL, { texture: 0, shadow: 0.4 });
    il.gildDot(px + 4, wt.top[0][1] - 23.5, 1.4);
  }

  // The nave, with the crossing tower rising from behind the ridge.
  const nave = prism(il, 156, 336, 214, 116, 66, t);
  for (let i = 0; i < 5; i++) {
    const x = 170 + i * 40;
    lancet(il, x, 238, 15, 54, r, lit, true);
    // Buttresses between the bays.
    if (i > 0) {
      const bx = x - 12;
      prism(il, bx, 336, 7, 90, 10, t, { masonry: false });
    }
  }
  const ct = prism(il, 240, 200, 52, 82, 40, t);
  lancet(il, 248, 132, 13, 36, r, lit, true);
  lancet(il, 271, 132, 13, 36, r, lit, true);
  const ctApex = pyramidRoof(il, 240, ct.top[0][1], 52, 40, 48, r.roofAlt);
  goldCross(il, ctApex[0], ctApex[1]);
  gableRoof(il, 156, nave.top[0][1], 214, 66, 52, r.roof, true);

  // The scriptorium range, lower, in front on the right; smoke from its chimney.
  const sr = prism(il, 352, 352, 148, 74, 50, t);
  for (let i = 0; i < 3; i++) {
    const x = 366 + i * 44;
    const win = new Shape().moveTo(x, 322).lineTo(x, 302).cubicTo(x, 294, x + 13, 294, x + 13, 302).lineTo(x + 13, 322).close();
    if (lit) il.softFill(ellipse(x + 6.5, 310, 16, 16), PIGMENTS.orpiment, 0.3, 6);
    il.paint(win, lit ? r.windowLit : r.window, { round: true, texture: 0.2, shadow: 0.3, lit: 0.4 });
    il.outline(win, { width: 0.8, nibRatio: 0.7 });
    il.ink([[x + 6.5, 296], [x + 6.5, 322]], { width: 0.6, nibRatio: 1, bleed: false });
  }
  const chim = prism(il, 470, sr.top[0][1] - 26, 12, 30, 10, t, { flatTop: true, masonry: false });
  for (let k = 0; k < 3; k++) {
    const sx = chim.top[0][0] + 6 + k * 4;
    const sy = chim.top[0][1] - 6 - k * 14;
    il.softFill(ellipse(sx, sy, 7 + k * 3, 5 + k * 2), PIGMENTS.leadWhite, 0.32 - k * 0.07, 5);
  }
  gableRoof(il, 352, sr.top[0][1], 148, 50, 34, r.roofAlt);

  // Curtain wall: a thin wall with battlements, the gate and Saint Ebb in her niche.
  const wall = prism(il, 36, 392, 452, 62, 12, t);
  battlements(il, 36, wall.top[0][1], 452, 12, t);
  const gate = pointedArch(244, 356, 40, 30, 392);
  il.paint(pointedArch(238, 356, 52, 38, 392), shade(r.stone, -0.12), { texture: 0.3 });
  il.outline(pointedArch(238, 356, 52, 38, 392), DETAIL);
  il.paint(gate, shade(PIGMENTS.umber, -0.25), { shadow: 0.5, lit: 0.15, texture: 0.6, stroke: Math.PI / 2 });
  il.clip(gate, () => {
    for (let x = 248; x < 284; x += 6) il.ink([[x, 330], [x, 392]], { width: 0.45, nibRatio: 1, bleed: false, alpha: 0.6 });
    for (const y of [352, 374]) {
      il.ink([[244, y], [284, y]], { width: 1.1, nibRatio: 1, bleed: false });
      il.dot(250, y, 1, PIGMENTS.lampBlack);
      il.dot(278, y, 1, PIGMENTS.lampBlack);
    }
  });
  il.outline(gate, OUTLINE);
  const niche = pointedArch(257, 323, 14, 12, 340);
  il.paint(niche, shade(r.window, -0.2), { texture: 0 });
  il.outline(niche, DETAIL);
  il.gildDot(264, 318.5, 3.6);
  il.punch(264, 318.5, 0.5);
  il.figure(smooth([[261.5, 339], [262, 324], [266, 324], [266.5, 339]], true), PIGMENTS.vermilion, DETAIL, { texture: 0 });
  il.fill(circle(264, 321, 1.9), '#EED6BE');

  turret(il, 40, 396, 19, 96, 46, t, r.roof);
  turret(il, 490, 398, 19, 96, 46, t, r.roof);

  boulders(il, 266, 520, 380, 458, r);
  il.anchor = [266, 462];
  return il.finish();
}

/** A small tuft of grass blades, drawn as quick paired strokes. */
export function tuft(il: Illuminator, x: number, y: number, size: number, roles: Roles): void {
  const rng = il.rng;
  const blades = rng.int(3, 5);
  for (let i = 0; i < blades; i++) {
    const a = -Math.PI / 2 + (i - (blades - 1) / 2) * 0.38 + rng.range(-0.12, 0.12);
    const len = size * rng.range(1.4, 2.2);
    const tip: Pt = [x + Math.cos(a) * len, y + Math.sin(a) * len];
    const mid: Pt = [x + Math.cos(a) * len * 0.5 + Math.cos(a + Math.PI / 2) * 0.8, y + Math.sin(a) * len * 0.5];
    const blade = smooth([[x - 0.9, y], mid, tip, [x + 0.9, y]], true, 0.8);
    il.fill(blade, i % 2 === 0 ? roles.foliage : roles.foliageShade, 0.98);
    il.ink([[x, y], mid, tip], { width: 0.55, nibRatio: 0.7, bleed: false, taperOut: 2 });
  }
}
