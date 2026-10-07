/**
 * Nature by manuscript convention: water as rows of blue waves with white crests,
 * lollipop trees of clustered leaves, grass in tufts, flowers as tiny rosettes.
 */

import { Rng } from '../engine/rng';
import { tuft } from './architecture';
import { Illuminator, type IlluminatedImage } from './illuminator';
import { type LocationPalette, PIGMENTS, shade } from './palettes';
import { circle, ellipse, poly, type Pt, rect, Shape, smooth } from './path';


/** A tiny five-petal rosette on a stem. */
export function flower(il: Illuminator, x: number, y: number, color: string): void {
  il.ink([[x, y], [x + 0.6, y - 5]], { width: 0.4, nibRatio: 1, bleed: false });
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    il.dot(x + 0.6 + Math.cos(a) * 1.5, y - 6 + Math.sin(a) * 1.5, 1.05, color);
  }
  il.dot(x + 0.6, y - 6, 0.7, PIGMENTS.orpiment);
}

/** A fish, the kind that swims in every manuscript sea. */
function fish(il: Illuminator, x: number, y: number, dir: 1 | -1, color: string): void {
  const p = (u: number, v: number): Pt => [x + u * dir, y + v];
  const body = smooth([p(-9, 0), p(-3, -3.4), p(5, -2.6), p(9, 0), p(5, 2.6), p(-3, 3.2)], true, 0.85);
  const tailS = poly([p(-8, 0), p(-13, -3.6), p(-12, 0), p(-13, 3.6)]);
  il.fill(tailS, color);
  il.outline(tailS, { width: 0.55, nibRatio: 0.7, bleed: false });
  il.fill(body, color);
  il.clip(body, () => il.fill(ellipse(x, y + 2.4, 10, 1.6), shade(color, 0.4), 0.8));
  il.outline(body, { width: 0.65, nibRatio: 0.6 });
  il.dot(x + 5.4 * dir, y - 0.6, 0.55, PIGMENTS.ironGall);
  il.ink([p(2.5, -2), p(2.2, 2)], { width: 0.4, nibRatio: 1, bleed: false });
}

export interface GroundLayout {
  width: number;
  height: number;
  /** Shore height (y) at x. Above it is sea. */
  shore: (x: number) => number;
  /** Causeway from the island down to the shore. */
  causeway: { x: number; top: number; width: number };
  /** Path across the meadow, as a list of centre points. */
  path: Pt[];
  /** Areas (circles) where grass should not be scattered. */
  keepClear: { x: number; y: number; r: number }[];
}

/**
 * The painted ground of a map: sea above the shore with a causeway, a meadow below with
 * a winding path, tufts and flowers. Most of the meadow is bare vellum, as in the maps.
 */
export function drawGround(palette: LocationPalette, layout: GroundLayout, seed: number | string = 'ground'): IlluminatedImage {
  const { width: W, height: H } = layout;
  const il = new Illuminator(W, H, `${String(seed)}:${palette.id}`);
  const r = palette.roles;
  const rng = il.rng.fork('ground');

  // ---- sea ----
  const shorePts: Pt[] = [];
  for (let x = -4; x <= W + 4; x += 8) shorePts.push([x, layout.shore(x)]);
  const sea = new Shape().moveTo(-4, -4).lineTo(W + 4, -4);
  for (let i = shorePts.length - 1; i >= 0; i--) sea.lineTo(shorePts[i]![0], shorePts[i]![1]);
  sea.close();
  il.fill(sea, r.waterWash);
  il.clip(sea, () => {
    for (let y = 8, row = 0; y < H; y += 10.5, row++) {
      const pts: Pt[] = [];
      const phase = rng.range(0, Math.PI * 2);
      for (let x = -6; x < W + 6; x += 2) pts.push([x, y + Math.sin(x * 0.24 + phase) * 1.8]);
      const color = row % 3 === 0 ? r.waterDeep : r.water;
      il.colorStroke(pts, color, { width: 1.25, nibRatio: 0.45, taperIn: 0, taperOut: 0, wobble: 0.2 }, 0.9);
      // White crests on some rows: little hooks on the wave tops.
      if (row % 2 === 1) {
        for (let x = rng.range(0, 40); x < W; x += rng.range(34, 70)) {
          const top = y + Math.sin(x * 0.24 + phase) * 1.8;
          il.colorStroke(
            [
              [x - 3, top - 0.6],
              [x, top - 2],
              [x + 2.4, top - 1.2],
              [x + 1.6, top],
            ],
            PIGMENTS.leadWhite,
            { width: 0.8, nibRatio: 0.7, taperIn: 1, taperOut: 1.5 },
            0.95,
          );
        }
      }
    }
    // Two fish going about their business.
    fish(il, W * 0.18, 170, 1, PIGMENTS.silver);
    fish(il, W * 0.82, 120, -1, PIGMENTS.ochre);
  });
  // Sand along the shore, then the shoreline in ink.
  const sand = new Shape().moveTo(shorePts[0]![0], shorePts[0]![1]);
  for (const p of shorePts) sand.lineTo(p[0], p[1]);
  for (let i = shorePts.length - 1; i >= 0; i--) sand.lineTo(shorePts[i]![0], shorePts[i]![1] + 7 + Math.sin(i * 1.3) * 1.5);
  sand.close();
  il.fill(sand, r.path, 0.75);
  il.ink(shorePts, { width: 1.1, nibRatio: 0.5, taperIn: 0, taperOut: 0, wobble: 0.4 });

  // ---- causeway: a raised stone road across the water ----
  const c = layout.causeway;
  const cb = layout.shore(c.x) + 4;
  const road = poly([
    [c.x - c.width / 2, c.top],
    [c.x + c.width / 2, c.top],
    [c.x + c.width / 2 + 3, cb],
    [c.x - c.width / 2 - 3, cb],
  ]);
  il.fill(road, r.path);
  il.clip(road, () => {
    for (let y = c.top + 5; y < cb; y += 6) {
      il.ink([[c.x - c.width, y], [c.x + c.width, y]], { width: 0.4, nibRatio: 1, bleed: false, alpha: 0.35 });
      for (let x = c.x - c.width / 2 + ((y / 6) % 2) * 5; x < c.x + c.width / 2; x += 10) {
        il.ink([[x, y], [x, y + 6]], { width: 0.35, nibRatio: 1, bleed: false, alpha: 0.3 });
      }
    }
    il.fill(rect(c.x + c.width * 0.25, c.top, c.width, cb - c.top), r.earthShade, 0.2);
  });
  il.outline(road, { width: 0.9, nibRatio: 0.6 });

  // ---- the meadow path ----
  const path = smooth(layout.path, false).polylines(2)[0] ?? [];
  const leftEdge: Pt[] = [];
  const rightEdge: Pt[] = [];
  path.forEach((p, i) => {
    const q = path[Math.min(path.length - 1, i + 1)]!;
    const o = path[Math.max(0, i - 1)]!;
    const dx = q[0] - o[0];
    const dy = q[1] - o[1];
    const l = Math.hypot(dx, dy) || 1;
    const w = 13 + Math.sin(i * 0.15) * 2;
    leftEdge.push([p[0] - (dy / l) * w, p[1] + (dx / l) * w]);
    rightEdge.push([p[0] + (dy / l) * w, p[1] - (dx / l) * w]);
  });
  const band = new Shape().moveTo(leftEdge[0]![0], leftEdge[0]![1]);
  for (const p of leftEdge) band.lineTo(p[0], p[1]);
  for (let i = rightEdge.length - 1; i >= 0; i--) band.lineTo(rightEdge[i]![0], rightEdge[i]![1]);
  band.close();
  il.fill(band, r.path, 0.85);
  il.clip(band, () => {
    for (let i = 0; i < path.length; i += 3) {
      const p = path[i]!;
      il.dot(p[0] + rng.range(-10, 10), p[1] + rng.range(-8, 8), rng.range(0.6, 1.4), r.earthShade, 0.5);
    }
  });
  il.ink(leftEdge, { width: 0.7, nibRatio: 0.6, taperIn: 6, taperOut: 6, alpha: 0.75 });
  il.ink(rightEdge, { width: 0.7, nibRatio: 0.6, taperIn: 6, taperOut: 6, alpha: 0.75 });

  // ---- tufts and flowers, sparser away from the shore ----
  const clear = (x: number, y: number): boolean => {
    if (layout.keepClear.some((k) => Math.hypot(k.x - x, k.y - y) < k.r)) return false;
    if (path.some((p) => Math.hypot(p[0] - x, p[1] - y) < 22)) return false;
    return y > layout.shore(x) + 14;
  };
  const tr = new Rng(rng.seed ^ 0x51ed);
  for (let i = 0; i < 260; i++) {
    const x = tr.range(10, W - 10);
    const y = tr.range(0, H - 6);
    if (!clear(x, y)) continue;
    const near = 1 - Math.min(1, (y - layout.shore(x)) / 220);
    if (!tr.chance(0.35 + near * 0.6)) continue;
    if (tr.chance(0.2)) flower(il, x, y, tr.chance(0.5) ? r.flower : r.flowerAlt);
    else tuft(il, x, y, tr.range(3, 4.6), r);
  }
  il.anchor = [0, 0];
  return il.finish();
}

/** A lollipop tree: slim trunk, a crown of clustered leaf-balls. */
export function drawTree(palette: LocationPalette, seed: number | string = 'tree'): IlluminatedImage {
  const W = 96;
  const H = 136;
  const il = new Illuminator(W, H, `${String(seed)}:${palette.id}`);
  const r = palette.roles;
  const rng = il.rng;
  const cx = W / 2;
  const base = H - 4;
  const lean = rng.range(-3, 3);
  const trunk = smooth(
    [
      [cx - 5, base],
      [cx - 3, base - 30],
      [cx - 2.5 + lean, base - 62],
      [cx + 2.5 + lean, base - 62],
      [cx + 3, base - 30],
      [cx + 5.5, base],
    ],
    true,
    0.8,
  );
  il.fill(trunk, r.earthShade === PIGMENTS.umber ? PIGMENTS.umber : shade(PIGMENTS.umber, 0.1));
  il.clip(trunk, () => il.fill(rect(cx + 1, base - 70, 8, 72), shade(PIGMENTS.umber, -0.3), 0.6));
  il.outline(trunk, { width: 0.9, nibRatio: 0.55 });
  // A couple of roots.
  for (const d of [-1, 1]) il.ink([[cx + d * 4, base - 1], [cx + d * 9, base + 1.5]], { width: 0.8, nibRatio: 0.6, bleed: false });
  // The crown: overlapping leaf-balls, back ones darker.
  const balls: { x: number; y: number; r: number }[] = [];
  const crownY = base - 86 + lean * 0.2;
  for (let i = 0; i < 9; i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = rng.range(0, 24);
    balls.push({ x: cx + lean + Math.cos(a) * d * 1.15, y: crownY + Math.sin(a) * d * 0.95, r: rng.range(13, 18) });
  }
  balls.sort((a, b) => a.y - b.y);
  balls.forEach((b, i) => {
    const s = circle(b.x, b.y, b.r);
    const col = i < 3 ? r.foliageShade : r.foliage;
    il.fill(s, col);
    il.clip(s, () => {
      il.fill(ellipse(b.x + b.r * 0.35, b.y + b.r * 0.45, b.r * 0.8, b.r * 0.55), shade(col, -0.2), 0.55);
      // Leaf marks: little curved ticks.
      for (let k = 0; k < 9; k++) {
        const a = rng.range(0, Math.PI * 2);
        const d = rng.range(0, b.r * 0.8);
        const x = b.x + Math.cos(a) * d;
        const y = b.y + Math.sin(a) * d;
        il.ink([[x - 1.6, y + 0.4], [x, y - 1], [x + 1.6, y + 0.4]], { width: 0.45, nibRatio: 0.8, bleed: false, alpha: 0.6 });
      }
    });
    il.outline(s, { width: 0.85, nibRatio: 0.55 });
    il.dot(b.x - b.r * 0.35, b.y - b.r * 0.4, 1.1, shade(col, 0.55), 0.85);
  });
  il.anchor = [cx, base];
  return il.finish();
}

/** A stone wayside cross on a stepped base, with a gilded boss. */
export function drawWaysideCross(palette: LocationPalette, seed: number | string = 'cross'): IlluminatedImage {
  const W = 50;
  const H = 96;
  const il = new Illuminator(W, H, `${String(seed)}:${palette.id}`);
  const r = palette.roles;
  const cx = W / 2;
  const base = H - 3;
  const stoneBlock = (s: Shape, x: number, y: number, w: number, h: number) => {
    il.fill(s, r.stone);
    il.clip(s, () => il.fill(rect(x + w * 0.7, y, w * 0.3 + 1, h), r.stoneShade, 0.6));
    il.outline(s, { width: 0.85, nibRatio: 0.6 });
  };
  stoneBlock(rect(cx - 20, base - 7, 40, 7), cx - 20, base - 7, 40, 7);
  stoneBlock(rect(cx - 14, base - 13, 28, 6), cx - 14, base - 13, 28, 6);
  stoneBlock(rect(cx - 3.2, base - 62, 6.4, 49), cx - 3.2, base - 62, 6.4, 49);
  stoneBlock(rect(cx - 14, base - 72, 28, 6), cx - 14, base - 72, 28, 6);
  stoneBlock(rect(cx - 3.2, base - 86, 6.4, 30), cx - 3.2, base - 86, 6.4, 30);
  il.gildDot(cx, base - 69, 3.6);
  il.outline(circle(cx, base - 69, 3.6), { width: 0.55, nibRatio: 0.9, bleed: false });
  il.dot(cx, base - 69, 1.2, palette.roles.accent);
  // Moss at the foot.
  tuft(il, cx - 16, base - 1, 3, r);
  tuft(il, cx + 15, base - 1, 2.6, r);
  il.anchor = [cx, base];
  return il.finish();
}
