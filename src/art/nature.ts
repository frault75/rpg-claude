/**
 * Landscape in the manner of the great calendar pages (the Très Riches Heures): a sky
 * deepening to lapis at the zenith, distant hills going blue in the haze, the sea in rows
 * of waves that widen as they come nearer, and a meadow of millefleurs in the foreground.
 */

import { tuft } from './architecture';
import { Illuminator, type IlluminatedImage, rgba, toneRamp } from './illuminator';
import { type LocationPalette, mix, PIGMENTS, shade } from './palettes';
import { circle, ellipse, poly, type Pt, rect, Shape, smooth } from './path';

/**
 * A tiny five-petal rosette on a stem. In batched drawing, call it once with 'petals' and
 * once with 'hearts' so the hearts land on top.
 */
export function flower(il: Illuminator, x: number, y: number, color: string, size = 1, part: 'all' | 'petals' | 'hearts' = 'all'): void {
  if (part !== 'hearts') {
    il.ink([[x, y], [x + 0.6 * size, y - 5 * size]], { width: 0.4, nibRatio: 1, bleed: false, alpha: 0.8 });
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      il.dot(x + 0.6 * size + Math.cos(a) * 1.5 * size, y - 6 * size + Math.sin(a) * 1.5 * size, 1.05 * size, color);
    }
  }
  if (part !== 'petals') il.dot(x + 0.6 * size, y - 6 * size, 0.7 * size, PIGMENTS.orpiment);
}

/** Three heart-shaped leaflets, for clover and wood-sorrel among the grass. */
function clover(il: Illuminator, x: number, y: number, size: number, r: LocationPalette['roles']): void {
  for (let k = 0; k < 3; k++) {
    const a = -Math.PI / 2 + (k - 1) * 1.1;
    const lx = x + Math.cos(a) * 1.8 * size;
    const ly = y - 3 * size + Math.sin(a) * 1.8 * size;
    il.fill(ellipse(lx, ly, 1.6 * size, 1.2 * size, a), k === 1 ? r.foliage : shade(r.foliage, -0.15), 0.95);
  }
  il.ink([[x, y], [x, y - 2.5 * size]], { width: 0.35, nibRatio: 1, bleed: false, alpha: 0.7 });
}

/** A fern frond arching up from the foot of the picture. */
function fern(il: Illuminator, x: number, y: number, len: number, r: LocationPalette['roles'], dir: 1 | -1): void {
  const pts: Pt[] = [];
  for (let t = 0; t <= 1; t += 0.05) pts.push([x + dir * Math.sin(t * 1.4) * len * 0.5, y - t * len]);
  il.ink(pts, { width: 0.7, nibRatio: 0.7, bleed: false, taperOut: 4 });
  for (let i = 2; i < pts.length - 1; i++) {
    const p = pts[i]!;
    const s = (1 - i / pts.length) * 4 + 1;
    for (const side of [-1, 1]) {
      const leaf = ellipse(p[0] + side * s * 0.9, p[1] - s * 0.3, s, s * 0.42, side * 0.5);
      il.fill(leaf, side * dir > 0 ? shade(r.meadow, 0.12) : shade(r.meadowDark, -0.2), 0.95);
    }
  }
}

/** A star of the night sky: eight gilded points and a punched centre. */
function star(il: Illuminator, x: number, y: number, r: number): void {
  const pts: Pt[] = [];
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2 - Math.PI / 2;
    const rr = k % 2 === 0 ? r : r * 0.38;
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  const s = poly(pts);
  il.gild(s);
  il.outline(s, { width: 0.45, nibRatio: 0.9, bleed: false, alpha: 0.8 });
  il.punch(x, y, r * 0.18);
}

export interface LandscapeLayout {
  width: number;
  height: number;
  /** Where sea meets sky. */
  horizon: number;
  /** Shore height (y) at x. Above it is sea. */
  shore: (x: number) => number;
  /** Causeway from the island down to the shore. */
  causeway: { x: number; top: number; width: number };
  /** Path across the meadow, as a list of centre points. */
  path: Pt[];
  /** Areas (circles) where flowers should not be scattered. */
  keepClear: { x: number; y: number; r: number }[];
}

/** The whole painted ground of an exterior: sky, hills, sea, shore and meadow. */
export function drawLandscape(palette: LocationPalette, layout: LandscapeLayout, seed: number | string = 'land', scale = 1.6): IlluminatedImage {
  const { width: W, height: H, horizon: HZ } = layout;
  const il = new Illuminator(W, H, `${String(seed)}:${palette.id}`, scale);
  const r = palette.roles;
  const rng = il.rng.fork('land');
  const ctx = il.paintCtx;

  // ---- sky ----
  const sky = rect(0, 0, W, HZ + 4);
  il.fill(sky, r.skyTop);
  il.clip(sky, () => {
    const g = ctx.createLinearGradient(0, 0, 0, HZ);
    g.addColorStop(0, rgba(shade(r.skyTop, -0.15), 1));
    g.addColorStop(0.55, rgba(mix(r.skyTop, r.skyLow, 0.45), 1));
    g.addColorStop(1, rgba(r.skyLow, 1));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, HZ + 4);
    // Long horizontal strokes of the brush laying the blue.
    const skyTones = [0, 0.25, 0.5, 0.75, 1].map((t) => toneRamp(mix(r.skyTop, r.skyLow, t), -0.12, 0.1, 0.18, 6));
    const skyPaths = skyTones.map((ramp) => ramp.map(() => new Path2D()));
    for (let i = 0; i < 900; i++) {
      const x = rng.range(-20, W);
      const y = rng.range(0, HZ);
      const band = Math.round((y / HZ) * 4);
      const path = skyPaths[band]![(rng.float() * 6) | 0]!;
      path.moveTo(x, y);
      path.lineTo(x + rng.range(14, 50), y + rng.jitter(1));
    }
    ctx.lineWidth = 2;
    skyPaths.forEach((paths, b) =>
      paths.forEach((path, i) => {
        ctx.strokeStyle = skyTones[b]![i]!;
        ctx.stroke(path);
      }),
    );
    // Stylised clouds: soft bands of lead white low in the sky.
    for (let i = 0; i < 4; i++) {
      const cy = HZ * rng.range(0.45, 0.85);
      const cx = rng.range(0, W);
      const cw = rng.range(90, 200);
      const cloud = smooth(
        [
          [cx - cw / 2, cy + 4],
          [cx - cw * 0.3, cy - 5],
          [cx, cy - 7],
          [cx + cw * 0.3, cy - 4],
          [cx + cw / 2, cy + 3],
          [cx, cy + 6],
        ],
        true,
        0.9,
      );
      il.softFill(cloud, PIGMENTS.leadWhite, palette.roles.sky.stars ? 0.12 : 0.4, 6);
    }
    if (r.sky.sun !== 'none') {
      // A low sun: a gilded disc with rays, half sunk at the horizon when rising.
      const sx = W * 0.82;
      const sy = r.sky.sun === 'rising' ? HZ - 4 : HZ * 0.62;
      const glow = circle(sx, sy, 90);
      il.softFill(glow, PIGMENTS.goldLight, 0.35, 40);
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        const ray = poly([
          [sx + Math.cos(a - 0.04) * 24, sy + Math.sin(a - 0.04) * 24],
          [sx + Math.cos(a) * (k % 2 ? 40 : 52), sy + Math.sin(a) * (k % 2 ? 40 : 52)],
          [sx + Math.cos(a + 0.04) * 24, sy + Math.sin(a + 0.04) * 24],
        ]);
        il.gild(ray);
      }
      il.gild(circle(sx, sy, 22));
      il.outline(circle(sx, sy, 22), { width: 0.8, nibRatio: 0.8, bleed: false });
      for (let k = 0; k < 18; k++) {
        const a = (k / 18) * Math.PI * 2;
        il.punch(sx + Math.cos(a) * 17, sy + Math.sin(a) * 17, 0.8);
      }
    }
    if (r.sky.stars) {
      for (let i = 0; i < 42; i++) {
        const x = rng.range(8, W - 8);
        const y = rng.range(6, HZ * 0.82);
        star(il, x, y, rng.range(2.2, 4.4) * (1 - (y / HZ) * 0.4));
      }
    }
    if (r.sky.moon) {
      // A crescent moon in silver-gilt.
      const mx = W * 0.79;
      const my = HZ * 0.3;
      il.softFill(circle(mx, my, 40), PIGMENTS.goldLight, 0.22, 26);
      const moon = new Shape().add(circle(mx, my, 17));
      il.gild(moon);
      il.fill(circle(mx + 8, my - 4, 15), shade(r.skyTop, -0.12));
      il.outline(new Shape().moveTo(mx, my - 17).cubicTo(mx - 23, my - 17, mx - 23, my + 17, mx, my + 17), { width: 0.8, nibRatio: 0.8 });
    }
  });

  // ---- distant land: hills and a far town, going blue in the haze ----
  const farL = smooth(
    [
      [-10, HZ + 3],
      [-10, HZ - 22],
      [60, HZ - 36],
      [150, HZ - 28],
      [230, HZ - 44],
      [330, HZ - 18],
      [380, HZ + 3],
    ],
    true,
    0.8,
  );
  const farR = smooth(
    [
      [W - 420, HZ + 3],
      [W - 360, HZ - 20],
      [W - 280, HZ - 38],
      [W - 170, HZ - 30],
      [W - 60, HZ - 50],
      [W + 10, HZ - 40],
      [W + 10, HZ + 3],
    ],
    true,
    0.8,
  );
  for (const hill of [farL, farR]) {
    il.paint(hill, mix(r.farLand, r.skyLow, 0.35), { shadow: 0.2, lit: 0.18, pool: 0.25, texture: 0.4 });
    il.outline(hill, { width: 0.7, nibRatio: 0.6, alpha: 0.55 });
  }
  // A far castle on the right-hand hills: walls and towers going blue in the haze.
  const haze = (c: string) => mix(c, r.skyLow, 0.45);
  const castle = (bx: number, by: number, k: number) => {
    const walls = rect(bx, by - 10 * k, 64 * k, 10 * k);
    il.figure(walls, haze(r.stone), { width: 0.5, nibRatio: 1, bleed: false, alpha: 0.6 }, { texture: 0, pool: 0.2 });
    for (const [tx, th, tw] of [
      [-4, 26, 10],
      [24, 34, 12],
      [58, 22, 9],
    ] as const) {
      const body = rect(bx + tx * k, by - th * k, tw * k, th * k);
      il.figure(body, haze(r.stone), { width: 0.5, nibRatio: 1, bleed: false, alpha: 0.6 }, { texture: 0, pool: 0.25, shadow: 0.35 });
      const cap = poly([
        [bx + (tx - 1.5) * k, by - th * k],
        [bx + (tx + tw / 2) * k, by - (th + 12) * k],
        [bx + (tx + tw + 1.5) * k, by - th * k],
      ]);
      il.figure(cap, haze(r.roof), { width: 0.5, nibRatio: 1, bleed: false, alpha: 0.6 }, { texture: 0, pool: 0.2 });
    }
  };
  castle(W - 250, HZ - 30, 1.1);
  castle(80, HZ - 26, 0.75);
  // Little trees dotted on the hills.
  for (let i = 0; i < 22; i++) {
    const x = rng.chance(0.5) ? rng.range(10, 360) : rng.range(W - 420, W - 10);
    const y = HZ - 6 - rng.range(0, 20);
    const rr = rng.range(3, 4.6);
    il.ink([[x, y + rr], [x, y + rr + 4]], { width: 0.6, nibRatio: 1, bleed: false, alpha: 0.5 });
    const crown = circle(x, y, rr);
    il.figure(crown, haze(r.foliageShade), { width: 0.45, nibRatio: 1, bleed: false, alpha: 0.5 }, { round: true, texture: 0, pool: 0.3 });
  }

  // ---- sea ----
  const shorePts: Pt[] = [];
  for (let x = -4; x <= W + 4; x += 8) shorePts.push([x, layout.shore(x)]);
  const sea = new Shape().moveTo(-4, HZ).lineTo(W + 4, HZ);
  for (let i = shorePts.length - 1; i >= 0; i--) sea.lineTo(shorePts[i]![0], shorePts[i]![1]);
  sea.close();
  il.fill(sea, r.water);
  il.clip(sea, () => {
    const near = Math.max(...shorePts.map((p) => p[1]));
    const g = ctx.createLinearGradient(0, HZ, 0, near);
    g.addColorStop(0, rgba(mix(r.waterWash, r.skyLow, 0.3), 1));
    g.addColorStop(0.35, rgba(r.water, 1));
    g.addColorStop(1, rgba(shade(r.waterDeep, -0.1), 1));
    ctx.fillStyle = g;
    ctx.fillRect(0, HZ, W, near - HZ + 4);
    // Rows of waves: tight and pale near the horizon, wide and deep near the shore.
    let y = HZ + 3;
    let row = 0;
    while (y < near + 6) {
      const t = (y - HZ) / (near - HZ);
      const amp = 0.8 + t * 3.2;
      const len = 0.5 - t * 0.32;
      const phase = rng.range(0, Math.PI * 2);
      const pts: Pt[] = [];
      for (let x = -6; x < W + 6; x += 2) pts.push([x, y + Math.sin(x * len * 0.5 + phase) * amp]);
      const dark = mix(shade(r.waterDeep, -0.25), r.water, 0.3 - t * 0.2);
      il.colorStroke(pts, dark, { width: 0.7 + t * 1.6, nibRatio: 0.4, taperIn: 0, taperOut: 0, wobble: 0.2 }, 0.55 + t * 0.35);
      // Lit crests above each trough, and white foam curls on the nearer rows.
      il.colorStroke(
        pts.map((p) => [p[0], p[1] - amp * 0.9] as Pt),
        mix(r.waterWash, PIGMENTS.leadWhite, 0.4),
        { width: 0.4 + t * 0.8, nibRatio: 0.5, taperIn: 0, taperOut: 0 },
        0.3 + t * 0.25,
      );
      if (t > 0.25 && row % 2 === 0) {
        for (let x = rng.range(0, 60); x < W; x += rng.range(40, 110) * (1.4 - t)) {
          const top = y + Math.sin(x * len * 0.5 + phase) * amp - amp;
          il.colorStroke(
            [
              [x - 3 * (0.5 + t), top + 0.5],
              [x, top - 1.6 * (0.5 + t)],
              [x + 2.6 * (0.5 + t), top - 0.8],
              [x + 1.8 * (0.5 + t), top + 0.6],
            ],
            PIGMENTS.leadWhite,
            { width: 0.6 + t * 0.6, nibRatio: 0.7, taperIn: 1, taperOut: 1.5 },
            0.9,
          );
        }
      }
      y += 3 + t * 11;
      row++;
    }
    // Moonlight (or sunlight) on the water: a broken path of light.
    const lx = r.sky.moon ? W * 0.79 : W * 0.82;
    for (let i = 0; i < 60; i++) {
      const yy = rng.range(HZ + 4, near - 10);
      const t = (yy - HZ) / (near - HZ);
      const xx = lx + rng.jitter(30 + t * 60);
      il.colorStroke(
        [
          [xx - 4 - t * 8, yy],
          [xx + 4 + t * 8, yy],
        ],
        PIGMENTS.goldLight,
        { width: 0.6 + t, nibRatio: 0.6 },
        0.35 * (1 - t * 0.5),
      );
    }
    // A boat with a red sail, small on the far water.
    const bx = W * 0.3;
    const by = HZ + 26;
    const hull = new Shape().moveTo(bx - 14, by).lineTo(bx + 14, by).cubicTo(bx + 11, by + 6, bx - 11, by + 6, bx - 14, by).close();
    il.figure(hull, PIGMENTS.umber, { width: 0.6, nibRatio: 0.7 });
    il.ink([[bx, by], [bx, by - 22]], { width: 0.7, nibRatio: 1, bleed: false });
    const sail = poly([
      [bx + 1, by - 21],
      [bx + 12, by - 6],
      [bx + 1, by - 4],
    ]);
    il.figure(sail, PIGMENTS.vermilion, { width: 0.6, nibRatio: 0.7 });
  });
  il.ink(
    [
      [0, HZ],
      [W, HZ],
    ],
    { width: 0.6, nibRatio: 1, bleed: false, alpha: 0.4, taperIn: 0, taperOut: 0 },
  );

  // ---- meadow ----
  const meadow = new Shape().moveTo(shorePts[0]![0], shorePts[0]![1]);
  for (const p of shorePts) meadow.lineTo(p[0], p[1]);
  meadow.lineTo(W + 4, H + 4).lineTo(-4, H + 4).close();
  il.fill(meadow, r.meadow);
  il.clip(meadow, () => {
    const top = Math.min(...shorePts.map((p) => p[1]));
    const g = ctx.createLinearGradient(0, top, 0, H);
    g.addColorStop(0, rgba(shade(r.meadow, 0.12), 1));
    g.addColorStop(1, rgba(r.meadowDark, 1));
    ctx.fillStyle = g;
    ctx.fillRect(0, top, W, H - top + 4);
    // Patches of light and shadow across the field.
    for (let i = 0; i < 26; i++) {
      const x = rng.range(0, W);
      const y = rng.range(top, H);
      const lit = rng.chance(0.5);
      il.softFill(ellipse(x, y, rng.range(40, 120), rng.range(10, 26)), lit ? shade(r.meadow, 0.3) : r.meadowDark, lit ? 0.3 : 0.35, 14);
    }
    // Grass laid in with short upward strokes, denser and bolder in front.
    const grassTones = [0, 0.25, 0.5, 0.75, 1].map((t) => toneRamp(mix(r.meadow, r.meadowDark, t), -0.35, 0.3, 0.4, 8));
    const grassPaths = grassTones.map((ramp) => ramp.map(() => new Path2D()));
    for (let i = 0; i < 14000; i++) {
      const x = rng.range(-4, W + 4);
      const y = rng.range(top, H + 4);
      const t = (y - top) / (H - top);
      const len = 2 + t * 6;
      const band = Math.round(t * 4);
      const path = grassPaths[band]![(rng.float() * 8) | 0]!;
      path.moveTo(x, y);
      path.quadraticCurveTo(x + rng.jitter(1.5), y - len * 0.6, x + rng.jitter(2.5), y - len);
    }
    grassPaths.forEach((paths, b) =>
      paths.forEach((path, i) => {
        ctx.strokeStyle = grassTones[b]![i]!;
        ctx.lineWidth = 0.6 + b * 0.22;
        ctx.stroke(path);
      }),
    );
  });

  // Sand along the shore, wet at the waterline, with a line of foam.
  const sand = new Shape().moveTo(shorePts[0]![0], shorePts[0]![1]);
  for (const p of shorePts) sand.lineTo(p[0], p[1]);
  for (let i = shorePts.length - 1; i >= 0; i--) sand.lineTo(shorePts[i]![0], shorePts[i]![1] + 9 + Math.sin(i * 1.3) * 2);
  sand.close();
  il.paint(sand, r.path, { shadow: 0.15, lit: 0.2, pool: 0.15, texture: 0.5, stroke: 0 });
  il.colorStroke(shorePts, shade(r.path, -0.3), { width: 2.4, nibRatio: 0.5, taperIn: 0, taperOut: 0, wobble: 0.6 }, 0.5);
  il.colorStroke(
    shorePts.map((p) => [p[0], p[1] - 1.5] as Pt),
    PIGMENTS.leadWhite,
    { width: 1.2, nibRatio: 0.6, taperIn: 0, taperOut: 0, wobble: 0.8 },
    0.85,
  );
  il.ink(shorePts, { width: 0.9, nibRatio: 0.5, taperIn: 0, taperOut: 0, wobble: 0.4, alpha: 0.7 });

  // ---- causeway: a raised stone road across the water ----
  const c = layout.causeway;
  const cb = layout.shore(c.x) + 6;
  const road = poly([
    [c.x - c.width / 2, c.top],
    [c.x + c.width / 2, c.top],
    [c.x + c.width / 2 + 5, cb],
    [c.x - c.width / 2 - 5, cb],
  ]);
  il.paint(road, r.stone, { shadow: 0.35, lit: 0.2, texture: 0.3 });
  il.clip(road, () => {
    for (let y = c.top + 5; y < cb; y += 6) {
      il.ink([[c.x - c.width, y], [c.x + c.width, y]], { width: 0.4, nibRatio: 1, bleed: false, alpha: 0.35 });
      for (let x = c.x - c.width / 2 + ((y / 6) % 2) * 5; x < c.x + c.width / 2; x += 10) {
        il.ink([[x, y], [x, y + 6]], { width: 0.35, nibRatio: 1, bleed: false, alpha: 0.3 });
      }
    }
  });
  il.outline(road, { width: 1, nibRatio: 0.6 });
  // Water lapping at the causeway's sides.
  for (const side of [-1, 1]) {
    for (let y = c.top + 6; y < cb - 4; y += 9) {
      const x = c.x + side * (c.width / 2 + 2 + ((y - c.top) / (cb - c.top)) * 5);
      il.colorStroke([[x, y], [x + side * 5, y - 1.5], [x + side * 8, y]], PIGMENTS.leadWhite, { width: 0.8, nibRatio: 0.7, taperIn: 1, taperOut: 2 }, 0.8);
    }
  }

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
    const w = 15 + Math.sin(i * 0.15) * 2 + (p[1] / H) * 6;
    leftEdge.push([p[0] - (dy / l) * w, p[1] + (dx / l) * w]);
    rightEdge.push([p[0] + (dy / l) * w, p[1] - (dx / l) * w]);
  });
  const band = new Shape().moveTo(leftEdge[0]![0], leftEdge[0]![1]);
  for (const p of leftEdge) band.lineTo(p[0], p[1]);
  for (let i = rightEdge.length - 1; i >= 0; i--) band.lineTo(rightEdge[i]![0], rightEdge[i]![1]);
  band.close();
  il.paint(band, r.path, { shadow: 0.25, lit: 0.25, pool: 0.45, texture: 0.7 });
  il.clip(band, () => {
    for (let i = 0; i < path.length; i += 2) {
      const p = path[i]!;
      const x = p[0] + rng.range(-12, 12);
      const y = p[1] + rng.range(-9, 9);
      const rr = rng.range(0.8, 2.2);
      il.paint(ellipse(x, y, rr * 1.3, rr), shade(r.path, rng.range(-0.25, 0.05)), { round: true, texture: 0, pool: 0.4 });
    }
  });
  il.ink(leftEdge, { width: 0.7, nibRatio: 0.6, taperIn: 6, taperOut: 6, alpha: 0.6 });
  il.ink(rightEdge, { width: 0.7, nibRatio: 0.6, taperIn: 6, taperOut: 6, alpha: 0.6 });

  // ---- millefleurs: flowers and tufts scattered thick in the foreground ----
  const clear = (x: number, y: number): boolean => {
    if (layout.keepClear.some((k) => Math.hypot(k.x - x, k.y - y) < k.r)) return false;
    if (path.some((p) => Math.hypot(p[0] - x, p[1] - y) < 24)) return false;
    return y > layout.shore(x) + 16;
  };
  const flowers = [r.flower, r.flowerAlt, PIGMENTS.leadWhite, PIGMENTS.vermilion, PIGMENTS.azurite];
  const blooms: { x: number; y: number; c: string; s: number }[] = [];
  il.batch(() => {
    for (let i = 0; i < 2600; i++) {
      const x = rng.range(6, W - 6);
      const y = rng.range(0, H - 2);
      if (!clear(x, y)) continue;
      const t = (y - layout.shore(x)) / (H - layout.shore(x));
      if (!rng.chance(0.25 + t * 0.6)) continue;
      const size = 0.7 + t * 0.7;
      if (rng.chance(0.38)) blooms.push({ x, y, c: rng.pick(flowers), s: size });
      else if (rng.chance(0.2)) clover(il, x, y, size, r);
      else tuft(il, x, y, (2.6 + t * 2.4) * rng.range(0.85, 1.15), r);
    }
  });
  il.batch(() => {
    for (const b of blooms) flower(il, b.x, b.y, b.c, b.s, 'petals');
  });
  il.batch(() => {
    for (const b of blooms) flower(il, b.x, b.y, b.c, b.s, 'hearts');
  });
  // Foreground plants along the foot of the picture, larger, framing it.
  for (let x = 4; x < W; x += rng.range(26, 60)) {
    if (path.some((p) => Math.abs(p[0] - x) < 30 && p[1] > H - 30)) continue;
    fern(il, x, H + 2, rng.range(14, 24), r, rng.chance(0.5) ? 1 : -1);
    if (rng.chance(0.5)) flower(il, x + rng.range(6, 16), H - rng.range(2, 8), rng.pick(flowers), 1.5);
  }
  // The painted picture darkens a little towards its frame.
  const edge = shade(r.meadowDark, -0.45);
  il.softFill(rect(-60, -60, W + 120, 60), shade(r.skyTop, -0.4), 0.5, 40);
  il.softFill(rect(-60, H, W + 120, 60), edge, 0.55, 40);
  il.softFill(rect(-60, -60, 60, H + 120), edge, 0.35, 50);
  il.softFill(rect(W, -60, 60, H + 120), edge, 0.35, 50);
  il.anchor = [0, 0];
  return il.finish();
}

/**
 * A mass of foliage: a lobed silhouette painted dark, then hundreds of small leaves laid
 * over it, darkest inside and lower right, brightest towards the light, as the painters
 * of the calendar pages built up a tree.
 */
export function foliage(il: Illuminator, cx: number, cy: number, rx: number, ry: number, dark: string, light: string, lobes = 11): Shape {
  const rng = il.rng.fork(`foliage:${cx | 0}:${cy | 0}`);
  const pts: Pt[] = [];
  for (let i = 0; i < lobes * 2; i++) {
    const a = (i / (lobes * 2)) * Math.PI * 2;
    const k = i % 2 === 0 ? rng.range(0.98, 1.12) : rng.range(0.8, 0.9);
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  const crown = smooth(pts, true, 0.9);
  il.paint(crown, shade(dark, -0.15), { round: true, shadow: 0.55, lit: 0.1, pool: 0.4, texture: 0.6 });
  const lx = Math.cos(-2.25);
  const ly = Math.sin(-2.25);
  il.clip(crown, () => {
    const n = Math.floor(rx * ry * 0.42);
    const leaves: { x: number; y: number; t: number; a: number }[] = [];
    for (let i = 0; i < n; i++) {
      const a = rng.range(0, Math.PI * 2);
      const d = Math.sqrt(rng.float());
      const x = cx + Math.cos(a) * rx * d * 1.05;
      const y = cy + Math.sin(a) * ry * d * 1.05;
      // How much this leaf faces the light: towards the upper left and the outside.
      const facing = ((x - cx) / rx) * lx + ((y - cy) / ry) * ly;
      const t = Math.min(1, Math.max(0, 0.45 + facing * 0.55 + d * 0.15 + rng.jitter(0.25)));
      leaves.push({ x, y, t, a: rng.range(0, Math.PI) });
    }
    leaves.sort((p, q) => p.t - q.t);
    // Quantise the leaf tones so each tone is one batched draw, darkest first.
    const steps = 8;
    for (let k = 0; k < steps; k++) {
      const c = mix(dark, light, k / (steps - 1));
      il.batch(() => {
        for (const lf of leaves) if (Math.min(steps - 1, Math.floor(lf.t * steps)) === k) il.fill(ellipse(lf.x, lf.y, 2.1, 1.15, lf.a), c, 0.95);
      });
    }
    il.batch(() => {
      for (const lf of leaves) if (lf.t > 0.82 && rng.chance(0.35)) il.dot(lf.x - 0.5, lf.y - 0.4, 0.45, PIGMENTS.leadWhite, 0.6);
    });
  });
  // A fine, broken silhouette.
  for (const line of crown.polylines(1.5)) {
    for (let i = 0; i < line.length - 6; i += 9) il.ink(line.slice(i, i + 7), { width: 0.55, nibRatio: 0.7, bleed: false, alpha: 0.55 });
  }
  return crown;
}

/** A tree: a painted trunk with bark, and a crown of two or three foliage masses. */
export function drawTree(palette: LocationPalette, seed: number | string = 'tree'): IlluminatedImage {
  const W = 130;
  const H = 180;
  const il = new Illuminator(W, H, `${String(seed)}:${palette.id}`);
  const r = palette.roles;
  const rng = il.rng;
  const cx = W / 2;
  const base = H - 6;
  const lean = rng.range(-3, 3);
  const trunk = smooth(
    [
      [cx - 7, base],
      [cx - 4.5, base - 26],
      [cx - 4 + lean, base - 62],
      [cx + 4 + lean, base - 62],
      [cx + 4.5, base - 26],
      [cx + 8, base],
    ],
    true,
    0.8,
  );
  il.paint(trunk, PIGMENTS.umber, { shadow: 0.6, lit: 0.35, texture: 1, stroke: Math.PI / 2 });
  il.clip(trunk, () => {
    for (let k = 0; k < 14; k++) {
      const x = cx + rng.range(-5, 5);
      const y = base - rng.range(4, 60);
      il.ink([[x, y], [x + rng.jitter(1), y - rng.range(4, 9)]], { width: 0.4, nibRatio: 1, bleed: false, alpha: 0.45 });
    }
  });
  il.outline(trunk, { width: 0.7, nibRatio: 0.55 });
  for (const d of [-1, 1]) il.ink([[cx + d * 6, base - 1], [cx + d * 13, base + 2]], { width: 0.8, nibRatio: 0.6, bleed: false });
  il.ink([[cx + lean, base - 56], [cx - 20 + lean, base - 84]], { width: 2.4, nibRatio: 0.6 });
  il.ink([[cx + lean, base - 60], [cx + 20 + lean, base - 90]], { width: 2.2, nibRatio: 0.6 });
  const crownY = base - 106;
  const dark = shade(r.foliageShade, -0.25);
  const light = shade(r.foliage, 0.45);
  foliage(il, cx - 22 + lean, crownY + 14, 36, 28, dark, light, 9);
  foliage(il, cx + 24 + lean, crownY + 10, 36, 30, dark, light, 9);
  foliage(il, cx + lean, crownY - 16, 44, 34, dark, light, 12);
  // A few red fruits hanging in the light.
  for (let k = 0; k < 7; k++) {
    const x = cx + lean + rng.jitter(40);
    const y = crownY + rng.jitter(24);
    il.paint(circle(x, y, 1.9), PIGMENTS.vermilion, { round: true, texture: 0, pool: 0.3, lit: 0.5 });
    il.dot(x - 0.6, y - 0.6, 0.5, PIGMENTS.leadWhite, 0.9);
  }
  il.anchor = [cx, base];
  return il.finish();
}

/** A stone wayside cross on a stepped base, with a gilded boss. */
export function drawWaysideCross(palette: LocationPalette, seed: number | string = 'cross'): IlluminatedImage {
  const W = 64;
  const H = 128;
  const il = new Illuminator(W, H, `${String(seed)}:${palette.id}`);
  const r = palette.roles;
  const cx = W / 2;
  const base = H - 4;
  const block = (s: Shape) => il.figure(s, r.stone, { width: 0.95, nibRatio: 0.6 }, { shadow: 0.45, lit: 0.3 });
  block(rect(cx - 26, base - 9, 52, 9));
  block(rect(cx - 18, base - 17, 36, 8));
  block(rect(cx - 4, base - 84, 8, 67));
  block(rect(cx - 18, base - 96, 36, 8));
  block(rect(cx - 4, base - 116, 8, 40));
  il.gildDot(cx, base - 92, 4.6);
  il.outline(circle(cx, base - 92, 4.6), { width: 0.6, nibRatio: 0.9, bleed: false });
  il.punchLine(circle(cx, base - 92, 3.4).polylines(0.5)[0] ?? [], 1.8, 0.45);
  il.dot(cx, base - 92, 1.4, palette.roles.accent);
  tuft(il, cx - 20, base - 1, 3.4, r);
  tuft(il, cx + 19, base - 1, 3, r);
  il.anchor = [cx, base];
  return il.finish();
}
