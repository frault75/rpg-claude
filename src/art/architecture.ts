/**
 * Architecture, drawn in elevation as manuscript painters did: stacked, front-on,
 * no vanishing point. Light comes from the left, so right-hand faces carry a shade band.
 */

import { Illuminator, type IlluminatedImage } from './illuminator';
import { type LocationPalette, PIGMENTS, shade } from './palettes';
import { circle, pointedArch, poly, type Pt, rect, Shape, smooth } from './path';

type Roles = LocationPalette['roles'];

const OUTLINE = { width: 1.5, nibRatio: 0.5 };
const DETAIL = { width: 0.85, nibRatio: 0.7, bleed: false };

/** A stone surface: fill, hand-tinted blocks, a shade band on the right, joints, outline. */
function stone(il: Illuminator, shape: Shape, box: { x: number; y: number; w: number; h: number }, roles: Roles, courses = true): void {
  il.fill(shape, roles.stone);
  il.clip(shape, () => {
    const rng = il.rng.fork(`courses:${box.x}:${box.y}`);
    for (let y = box.y, row = 0; y < box.y + box.h; y += 6.5, row++) {
      // Each ashlar block a touch lighter or darker, as a painter's wash dries unevenly.
      let x = box.x - 6 + (row % 2) * 5 + rng.range(-2, 2);
      while (x < box.x + box.w) {
        const len = rng.range(7, 14);
        const t = rng.range(-0.09, 0.07);
        if (Math.abs(t) > 0.03) il.fill(rect(x, y, len, 6.5), shade(roles.stone, t), 0.55);
        if (courses) {
          if (rng.chance(0.6)) il.ink([[x, y], [x + len, y + rng.range(-0.3, 0.3)]], { width: 0.45, nibRatio: 1, bleed: false, alpha: 0.42 });
          if (rng.chance(0.35)) il.ink([[x + len, y], [x + len, y + 6.5]], { width: 0.4, nibRatio: 1, bleed: false, alpha: 0.32 });
        }
        x += len + rng.range(0.5, 2);
      }
    }
    const band = Math.min(box.w * 0.26, 11);
    il.fill(rect(box.x + box.w - band, box.y - 2, band + 2, box.h + 4), roles.stoneShade, 0.6);
  });
  il.outline(shape, OUTLINE);
}

/** A lancet window: dark glass, a white mullion, a pointed head. */
function lancet(il: Illuminator, x: number, y: number, w: number, h: number, roles: Roles, double = false): void {
  const s = pointedArch(x, y + w * 0.9, w, w * 0.9, y + h);
  il.fill(s, roles.window);
  if (double) {
    il.ink([[x + w / 2, y + w * 0.5], [x + w / 2, y + h]], { width: 0.7, nibRatio: 1, bleed: false });
    il.highlight([[x + w / 2 + 0.8, y + w * 0.6], [x + w / 2 + 0.8, y + h - 1]], 0.5, 0.7);
  }
  il.dot(x + w * 0.3, y + w * 0.9, 0.7, PIGMENTS.goldLight, 0.8);
  il.outline(s, { width: 0.8, nibRatio: 0.7 });
}

/** A tiled roof band: fill, rows of scale tiles, a darker eave, ridge cresting. */
function roof(il: Illuminator, pts: Pt[], color: string, ridge: [Pt, Pt] | null, cresting = false): void {
  const s = poly(pts);
  il.fill(s, color);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  il.clip(s, () => {
    // Scale tiles: rows of small arcs, offset every other row.
    for (let y = y0 + 4, row = 0; y < y1 + 4; y += 4.6, row++) {
      for (let x = x0 - 6 + (row % 2) * 3.2; x < x1 + 6; x += 6.4) {
        const arc = new Shape().moveTo(x, y).cubicTo(x + 0.4, y + 3.2, x + 5.6, y + 3.2, x + 6.4, y);
        il.hairline(arc, 0.42, 0.42);
      }
    }
    il.fill(rect(x0, y1 - 4, x1 - x0, 6), shade(color, -0.25), 0.6);
  });
  il.outline(s, OUTLINE);
  if (ridge && cresting) {
    const [a, b] = ridge;
    const n = Math.floor(Math.hypot(b[0] - a[0], b[1] - a[1]) / 9);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const x = a[0] + (b[0] - a[0]) * t;
      const y = a[1] + (b[1] - a[1]) * t;
      const fl = smooth(
        [
          [x - 1.8, y],
          [x - 1.2, y - 2.5],
          [x, y - 4.2],
          [x + 1.2, y - 2.5],
          [x + 1.8, y],
        ],
        true,
      );
      il.gild(fl);
      il.outline(fl, { width: 0.45, nibRatio: 0.9, bleed: false });
    }
  }
}

/** A spire with crockets up its edges and a gold cross on top. */
function spire(il: Illuminator, cx: number, baseY: number, w: number, h: number, color: string): void {
  const apex: Pt = [cx, baseY - h];
  const s = poly([
    [cx - w / 2, baseY],
    apex,
    [cx + w / 2, baseY],
  ]);
  il.fill(s, color);
  il.clip(s, () => {
    il.fill(poly([apex, [cx + w / 2, baseY], [cx + w * 0.08, baseY]]), shade(color, -0.22), 0.7);
    for (let y = baseY - 6; y > baseY - h + 6; y -= 7) {
      const t = (baseY - y) / h;
      const half = (w / 2) * (1 - t);
      il.ink([[cx - half, y], [cx + half, y]], { width: 0.4, nibRatio: 1, bleed: false, alpha: 0.35 });
    }
  });
  il.outline(s, OUTLINE);
  // Crockets: little curled leaves climbing both edges.
  for (let t = 0.12; t < 0.9; t += 0.13) {
    for (const side of [-1, 1]) {
      const x = cx + side * (w / 2) * (1 - t);
      const y = baseY - h * t;
      const c = smooth(
        [
          [x, y],
          [x + side * 2.6, y - 0.6],
          [x + side * 2.8, y - 2.6],
          [x + side * 1, y - 2.2],
        ],
        false,
      );
      il.ink(c.polylines(0.8)[0] ?? [], { width: 0.7, nibRatio: 0.8, bleed: false, taperOut: 2 });
    }
  }
  goldCross(il, apex[0], apex[1]);
}

function goldCross(il: Illuminator, x: number, y: number): void {
  const stem = rect(x - 0.9, y - 11, 1.8, 11);
  const bar = rect(x - 3.4, y - 8.6, 6.8, 1.8);
  il.gild(stem);
  il.gild(bar);
  il.outline(stem, { width: 0.45, nibRatio: 1, bleed: false });
  il.outline(bar, { width: 0.45, nibRatio: 1, bleed: false });
  il.gildDot(x, y - 11.6, 1.2);
}

/** A wall top with merlons. Returns the outline of the wall including battlements. */
function battlemented(x0: number, x1: number, top: number, bottom: number, mw: number, mh: number, gap: number): Shape {
  const pts: Pt[] = [[x0, bottom], [x0, top - mh]];
  let x = x0;
  let up = true;
  while (x < x1) {
    const step = up ? mw : gap;
    const nx = Math.min(x1, x + step);
    const y = up ? top - mh : top;
    pts.push([x, y], [nx, y]);
    x = nx;
    up = !up;
  }
  pts.push([x1, top - mh], [x1, bottom]);
  // Remove consecutive duplicates.
  return poly(pts.filter((p, i) => i === 0 || p[0] !== pts[i - 1]![0] || p[1] !== pts[i - 1]![1]));
}

/** A round turret: a body with a conical cap. */
function turret(il: Illuminator, x: number, w: number, top: number, bottom: number, capH: number, roles: Roles): void {
  const body = rect(x, top, w, bottom - top);
  stone(il, body, { x, y: top, w, h: bottom - top }, roles);
  lancet(il, x + w / 2 - 2.5, top + 16, 5, 14, roles);
  const cap = poly([
    [x - 3, top + 1],
    [x + w / 2, top - capH],
    [x + w + 3, top + 1],
  ]);
  il.fill(cap, roles.roof);
  il.clip(cap, () => il.fill(poly([[x + w / 2, top - capH], [x + w + 3, top + 1], [x + w / 2 + 1, top + 1]]), shade(roles.roof, -0.25), 0.7));
  il.outline(cap, OUTLINE);
  il.gildDot(x + w / 2, top - capH - 1.8, 1.6);
  il.outline(circle(x + w / 2, top - capH - 1.8, 1.6), { width: 0.45, nibRatio: 1, bleed: false });
}

/**
 * A medieval rock: flat-topped terraces with lit tops and cracked faces, widening row by
 * row towards the water, as painters drew crags and islands. Lower rows are nearer, so
 * they are drawn last. Waves lap at the foot.
 */
export function rockMound(il: Illuminator, cx: number, width: number, top: number, bottom: number, roles: Roles): void {
  const rng = il.rng.fork('rock');
  const rows = 4;
  const rowH = (bottom - top) / rows;
  for (let row = 0; row < rows; row++) {
    const rowW = width * (0.8 + (0.2 * row) / (rows - 1));
    const end = cx + rowW / 2;
    let x = cx - rowW / 2 + rng.range(-5, 5);
    const y = top + row * rowH;
    while (x < end - 10) {
      let w = Math.min(rng.range(30, 84), end - x);
      if (end - (x + w) < 20) w = end - x;
      const h = rowH + rng.range(5, 10);
      const yy = y + rng.range(-3, 3);
      const topH = rng.range(3.5, 6.5);
      const slant = rng.range(-2.2, 2.2);
      const slab = smooth(
        [
          [x + 0.5, yy + h],
          [x, yy + topH + 2],
          [x + 3, yy + slant * 0.5],
          [x + w * 0.5, yy + rng.range(-1, 1)],
          [x + w - 3, yy - slant * 0.5],
          [x + w, yy + topH + 1],
          [x + w - 0.5, yy + h],
        ],
        true,
        0.4,
      );
      il.fill(slab, shade(roles.rock, rng.range(-0.08, 0.06)));
      il.clip(slab, () => {
        il.fill(rect(x - 2, yy + h * 0.62, w + 4, h), shade(roles.rock, -0.18), 0.45);
        const lit = smooth(
          [
            [x + 1, yy + topH + 1.5],
            [x + 3.5, yy + slant * 0.5 + 0.8],
            [x + w - 3.5, yy - slant * 0.5 + 0.8],
            [x + w - 1, yy + topH + 0.5],
          ],
          true,
          0.3,
        );
        il.fill(lit, roles.rockLight, 0.95);
        il.ink(
          [
            [x + 1, yy + topH + 1.5],
            [x + w - 1, yy + topH + 0.5],
          ],
          { width: 0.55, nibRatio: 0.8, bleed: false, alpha: 0.6 },
        );
        for (let k = 0; k < rng.int(1, 2); k++) {
          const kx = x + w * rng.range(0.2, 0.8);
          il.ink(
            [
              [kx, yy + topH + 3],
              [kx + rng.range(-2, 2), yy + h * 0.6],
              [kx + rng.range(-3, 3), yy + h - 2],
            ],
            { width: 0.55, nibRatio: 0.7, bleed: false, alpha: 0.65 },
          );
        }
      });
      il.outline(slab, { width: 1.05, nibRatio: 0.5 });
      x += w * rng.range(0.82, 0.98);
    }
  }
  // Waves lapping at the foot of the rock.
  const half = width / 2 + 6;
  for (let k = 0; k < 2; k++) {
    const y = bottom + 10 + k * 5;
    const pts: Pt[] = [];
    for (let x = cx - half; x <= cx + half; x += 2) pts.push([x, y + Math.sin(x * 0.24 + k) * 1.6]);
    il.colorStroke(pts, k === 0 ? roles.water : roles.waterDeep, { width: 1.3, nibRatio: 0.45, taperIn: 8, taperOut: 8 }, 0.95);
  }
  for (let x = cx - half + rng.range(4, 14); x < cx + half - 6; x += rng.range(22, 40)) {
    const y = bottom + 8 + Math.sin(x * 0.24) * 1.6;
    il.colorStroke(
      [
        [x - 3, y - 0.5],
        [x, y - 2.2],
        [x + 2.6, y - 1.3],
        [x + 1.8, y],
      ],
      PIGMENTS.leadWhite,
      { width: 0.9, nibRatio: 0.7, taperIn: 1, taperOut: 1.5 },
    );
  }
}

/**
 * The Abbey of Saint Ebb's on its island: west tower and spire, nave with clerestory,
 * crossing tower, apse, the scriptorium range, curtain wall, gate and turrets.
 * About 440 x 440 units; anchored at the foot of the rock.
 */
export function drawAbbey(palette: LocationPalette, seed: number | string = 'abbey'): IlluminatedImage {
  const W = 540;
  const H = 446;
  const il = new Illuminator(W, H, `${String(seed)}:${palette.id}`);
  const r = palette.roles;
  // The building is drawn in a 440-wide frame; the rock spreads wider beneath it.
  il.translate(50, 0);

  // East apse.
  stone(il, rect(334, 196, 40, 110), { x: 334, y: 196, w: 40, h: 110 }, r);
  lancet(il, 349, 212, 9, 30, r);
  il.fill(poly([[330, 198], [354, 156], [378, 198]]), r.roofAlt);
  il.clip(poly([[330, 198], [354, 156], [378, 198]]), () => il.fill(poly([[354, 156], [378, 198], [356, 198]]), shade(r.roofAlt, -0.25), 0.7));
  il.outline(poly([[330, 198], [354, 156], [378, 198]]), OUTLINE);
  goldCross(il, 354, 156);

  // Nave: clerestory wall, buttresses, windows, tiled roof with gold cresting.
  stone(il, rect(108, 166, 230, 140), { x: 108, y: 166, w: 230, h: 140 }, r);
  for (let i = 0; i < 6; i++) {
    const x = 122 + i * 36;
    lancet(il, x, 184, 13, 46, r, true);
    if (i > 0) {
      const b = poly([[x - 10, 306], [x - 10, 236], [x - 1, 224], [x - 1, 306]]);
      stone(il, b, { x: x - 10, y: 224, w: 9, h: 82 }, r, false);
    }
  }
  roof(il, [[102, 170], [344, 170], [332, 128], [114, 128]], r.roof, [[116, 128], [330, 128]], true);

  // Crossing tower with a pyramid cap and weathercock.
  const ct = { x: 198, y: 70, w: 54, h: 82 };
  stone(il, rect(ct.x, ct.y, ct.w, ct.h), ct, r);
  lancet(il, ct.x + 9, ct.y + 14, 11, 30, r, true);
  lancet(il, ct.x + 34, ct.y + 14, 11, 30, r, true);
  il.fill(rect(ct.x - 3, ct.y - 2, ct.w + 6, 6), shade(r.stone, -0.05));
  il.outline(rect(ct.x - 3, ct.y - 2, ct.w + 6, 6), DETAIL);
  const cap = poly([[ct.x - 2, ct.y - 2], [ct.x + ct.w / 2, ct.y - 36], [ct.x + ct.w + 2, ct.y - 2]]);
  il.fill(cap, r.roofAlt);
  il.clip(cap, () => il.fill(poly([[ct.x + ct.w / 2, ct.y - 36], [ct.x + ct.w + 2, ct.y - 2], [ct.x + ct.w / 2 + 2, ct.y - 2]]), shade(r.roofAlt, -0.25), 0.7));
  il.outline(cap, OUTLINE);
  goldCross(il, ct.x + ct.w / 2, ct.y - 36);

  // West tower: three stages, belfry, corner pinnacles, tall spire.
  const wt = { x: 52, y: 92, w: 64, h: 214 };
  stone(il, rect(wt.x, wt.y, wt.w, wt.h), wt, r);
  for (const y of [160, 226]) {
    il.fill(rect(wt.x - 2, y, wt.w + 4, 4), shade(r.stone, -0.06));
    il.outline(rect(wt.x - 2, y, wt.w + 4, 4), DETAIL);
  }
  lancet(il, wt.x + 10, 104, 16, 44, r, true);
  lancet(il, wt.x + 38, 104, 16, 44, r, true);
  lancet(il, wt.x + 25, 176, 14, 38, r);
  il.fill(circle(wt.x + wt.w / 2, 252, 11), r.window);
  il.outline(circle(wt.x + wt.w / 2, 252, 11), { width: 0.8, nibRatio: 0.7 });
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    il.ink([[wt.x + wt.w / 2, 252], [wt.x + wt.w / 2 + Math.cos(a) * 10, 252 + Math.sin(a) * 10]], { width: 0.55, nibRatio: 1, bleed: false });
  }
  il.gildDot(wt.x + wt.w / 2, 252, 2.4);
  spire(il, wt.x + wt.w / 2, wt.y, wt.w - 6, 86, r.roof);
  for (const px of [wt.x - 2, wt.x + wt.w - 6]) {
    const pin = poly([[px, wt.y + 2], [px + 4, wt.y - 18], [px + 8, wt.y + 2]]);
    il.fill(pin, r.stone);
    il.outline(pin, { width: 0.8, nibRatio: 0.7 });
    il.gildDot(px + 4, wt.y - 19.5, 1.3);
  }

  // Scriptorium range, lower and in front on the right, with its chimney.
  stone(il, rect(300, 234, 118, 84), { x: 300, y: 234, w: 118, h: 84 }, r);
  for (let i = 0; i < 3; i++) {
    const x = 312 + i * 34;
    const win = new Shape().moveTo(x, 270).lineTo(x, 254).cubicTo(x, 247, x + 10, 247, x + 10, 254).lineTo(x + 10, 270).close();
    il.fill(win, r.window);
    il.outline(win, { width: 0.75, nibRatio: 0.7 });
  }
  stone(il, rect(392, 186, 12, 30), { x: 392, y: 186, w: 12, h: 30 }, r, false);
  roof(il, [[294, 236], [424, 236], [412, 206], [306, 206]], r.roofAlt, null);
  il.fill(rect(390, 182, 16, 5), shade(r.stone, -0.1));
  il.outline(rect(390, 182, 16, 5), DETAIL);

  // Curtain wall with battlements, gate and turrets.
  const wall = battlemented(30, 410, 276, 352, 9, 9, 7);
  stone(il, wall, { x: 30, y: 267, w: 380, h: 85 }, r);
  const gate = pointedArch(204, 318, 32, 26, 352);
  il.fill(gate, r.earthShade);
  il.clip(gate, () => {
    for (let x = 208; x < 236; x += 5) il.ink([[x, 296], [x, 352]], { width: 0.4, nibRatio: 1, bleed: false, alpha: 0.5 });
    for (const y of [314, 334]) {
      il.ink([[204, y], [236, y]], { width: 0.9, nibRatio: 1, bleed: false });
      il.dot(210, y, 0.9, PIGMENTS.lampBlack);
      il.dot(230, y, 0.9, PIGMENTS.lampBlack);
    }
  });
  il.outline(gate, OUTLINE);
  il.outline(pointedArch(200, 318, 40, 30, 352), { width: 0.7, nibRatio: 0.7 });
  // A tiny gilded saint in a niche above the gate: Saint Ebb.
  const niche = pointedArch(214, 290, 12, 10, 304);
  il.fill(niche, r.window);
  il.outline(niche, DETAIL);
  il.gildDot(220, 286.5, 3.2);
  il.fill(smooth([[218, 303], [218.5, 291], [221.5, 291], [222, 303]], true), PIGMENTS.leadWhite);
  il.dot(220, 288.5, 1.6, PIGMENTS.vellum);
  turret(il, 18, 28, 252, 352, 34, r);
  turret(il, 394, 28, 252, 352, 34, r);

  // The rock of the island.
  rockMound(il, 220, 500, 347, 428, r);
  // Sea-pinks and grass on the ledges.
  const rng = il.rng.fork('tufts');
  for (let i = 0; i < 16; i++) {
    const x = rng.range(20, 420);
    const y = 354 + rng.range(0, 30);
    tuft(il, x, y, rng.range(3, 5), r);
  }
  il.anchor = [W / 2, H - 6];
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
    il.fill(blade, i % 2 === 0 ? roles.foliage : roles.foliageShade);
    il.ink([[x, y], mid, tip], { width: 0.55, nibRatio: 0.7, bleed: false, taperOut: 2 });
  }
}
