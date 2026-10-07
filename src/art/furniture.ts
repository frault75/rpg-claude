/**
 * Furniture and fittings, drawn in elevation and anchored where they touch the floor.
 * Each prop kind declares its ground blocker and any candle glow.
 */

import { Illuminator, type IlluminatedImage } from './illuminator';
import { type LocationPalette, PIGMENTS, shade } from './palettes';
import { circle, ellipse, pointedArch, poly, type Pt, rect, Shape, smooth } from './path';

type Draw = (palette: LocationPalette, seed: string) => IlluminatedImage;

export interface PropKindDef {
  draw: Draw;
  /** Ground blocker (ellipse radii, offset up from the anchor). */
  blocker?: { rx: number; ry: number; dy?: number };
  /** Candle glows relative to the anchor: [dx, dy, radius]. */
  glows?: [number, number, number][];
  /** Props mounted on a wall face are drawn behind everyone. */
  onWall?: boolean;
}

const OUT = { width: 1.2, nibRatio: 0.55 };
const FINE = { width: 0.6, nibRatio: 0.7, bleed: false };
const WOOD = '#7A5236';
const WOOD_DARK = '#563822';

function grain(il: Illuminator, shape: Shape, x: number, y: number, w: number, h: number, vertical = false): void {
  il.clip(shape, () => {
    const rng = il.rng.fork(`grain:${x}:${y}`);
    for (let i = 0; i < (vertical ? w : h) / 3; i++) {
      const o = rng.range(0, vertical ? w : h);
      const pts: Pt[] = [];
      for (let t = 0; t <= 1; t += 0.1) pts.push(vertical ? [x + o + Math.sin(t * 6 + o) * 0.6, y + t * h] : [x + t * w, y + o + Math.sin(t * 6 + o) * 0.6]);
      il.ink(pts, { width: 0.3, nibRatio: 1, bleed: false, alpha: 0.3 });
    }
  });
}

/** A gold candle flame. */
function flame(il: Illuminator, x: number, y: number, s = 1): void {
  const f = smooth(
    [
      [x, y - 7 * s],
      [x + 2.2 * s, y - 2 * s],
      [x, y + 0.5 * s],
      [x - 2.2 * s, y - 2 * s],
    ],
    true,
    0.9,
  );
  il.gild(f);
  il.outline(f, { width: 0.5, nibRatio: 0.9, bleed: false });
  il.dot(x, y - 1.6 * s, 0.9 * s, PIGMENTS.vermilion, 0.7);
}

function openBook(il: Illuminator, x: number, y: number, w: number, h: number, tilt: number): void {
  // Two pages meeting at a spine, on a sloping board.
  const left = poly([
    [x, y + tilt],
    [x + w / 2, y],
    [x + w / 2, y + h],
    [x + 1, y + h + tilt],
  ]);
  const right = poly([
    [x + w / 2, y],
    [x + w, y + tilt],
    [x + w - 1, y + h + tilt],
    [x + w / 2, y + h],
  ]);
  il.fill(left, PIGMENTS.vellum);
  il.fill(right, shade(PIGMENTS.vellum, -0.04));
  for (const [x0, flip] of [
    [x + 3, 0],
    [x + w / 2 + 3, 1],
  ] as const) {
    for (let ly = y + 3; ly < y + h - 2; ly += 2.6) {
      const dy = flip ? ((ly - y) / h) * 0 : 0;
      il.ink(
        [
          [x0, ly + dy + tilt * (flip ? 0.2 : 0.8) * (1 - (ly - y) / h)],
          [x0 + w / 2 - 6, ly + dy + tilt * (flip ? 0.6 : 0.2) * (1 - (ly - y) / h)],
        ],
        { width: 0.32, nibRatio: 1, bleed: false, alpha: 0.6 },
      );
    }
  }
  il.dot(x + 4.5, y + 4.5, 1.6, PIGMENTS.vermilion);
  il.gildDot(x + w / 2 + 4.5, y + 4.6, 1.4);
  il.outline(left, { width: 0.6, nibRatio: 0.8 });
  il.outline(right, { width: 0.6, nibRatio: 0.8 });
}

function desk(variant: 'plain' | 'sleeper' | 'wystan' | 'isot'): Draw {
  return (_palette, seed) => {
    const W = 84;
    const H = 96;
    const il = new Illuminator(W, H, `${seed}:desk:${variant}`);
    const legL = rect(14, 44, 5, 50);
    const legR = rect(64, 44, 5, 50);
    for (const l of [legL, legR]) il.figure(l, WOOD_DARK, FINE);
    const shelf = rect(14, 74, 55, 4);
    il.figure(shelf, WOOD, FINE);
    if (variant !== 'sleeper') {
      const book = rect(24, 67, 18, 7);
      il.figure(book, PIGMENTS.lapis, FINE);
      il.gild(rect(30, 67, 2, 7));
    }
    // The sloping writing board.
    const board = poly([
      [8, 50],
      [76, 50],
      [70, 28],
      [14, 28],
    ]);
    il.fill(board, WOOD);
    grain(il, board, 8, 28, 68, 22);
    il.clip(board, () => il.fill(rect(8, 46, 70, 6), WOOD_DARK, 0.6));
    il.outline(board, OUT);
    il.fill(rect(6, 50, 72, 3.2), WOOD_DARK);
    il.outline(rect(6, 50, 72, 3.2), FINE);
    if (variant === 'wystan') {
      // A closed psalter left on the board, and nothing else.
      const ps = poly([
        [30, 44],
        [52, 44],
        [50, 32],
        [32, 32],
      ]);
      il.figure(ps, PIGMENTS.umber, FINE);
      for (const [x, y] of [
        [33, 42],
        [49, 42],
        [34, 34],
        [48, 34],
      ] as const)
        il.gildDot(x, y, 1);
    } else {
      openBook(il, 24, 31, 36, 14, 1.2);
    }
    // Inkhorn and quill in their holes on the right.
    if (variant !== 'wystan') {
      il.figure(ellipse(66, 36, 3, 1.6), PIGMENTS.ochre, FINE);
      il.ink([[66, 35], [74, 18]], { width: 0.6, nibRatio: 1, bleed: false });
      const vane = smooth(
        [
          [68.5, 30],
          [73, 21],
          [75, 16],
          [71.5, 21],
        ],
        true,
      );
      il.figure(vane, PIGMENTS.leadWhite, FINE);
    }
    // A candle on the left corner (except Wystan's: his is cold).
    il.figure(rect(13, 22, 4.5, 9), PIGMENTS.leadWhite, FINE);
    if (variant !== 'wystan') flame(il, 15.2, 22);
    else il.ink([[15.2, 22], [15.6, 18]], { width: 0.5, bleed: false, alpha: 0.6 });

    if (variant === 'sleeper') {
      // A brother asleep over his work: a hooded back, an arm across the board.
      const back = smooth(
        [
          [20, 52],
          [16, 30],
          [22, 12],
          [34, 6],
          [48, 9],
          [58, 22],
          [62, 40],
          [58, 52],
        ],
        true,
        0.85,
      );
      il.fill(back, '#4E3B2E');
      il.clip(back, () => il.fill(rect(44, 0, 30, 60), '#36281F', 0.7));
      il.ink(smooth([[28, 14], [30, 34], [27, 50]], false).polylines(1)[0] ?? [], { width: 0.6, nibRatio: 0.6, bleed: false });
      il.outline(back, OUT);
      const arm = smooth(
        [
          [22, 40],
          [40, 36],
          [60, 38],
          [62, 44],
          [40, 45],
          [22, 47],
        ],
        true,
        0.8,
      );
      il.figure(arm, '#4E3B2E', { width: 0.9, nibRatio: 0.6 });
      il.figure(ellipse(62.5, 41.5, 3.2, 2.4), '#E2C9B3', FINE);
      // The point of the hood.
      il.figure(
        poly([
          [33, 7],
          [38, 1],
          [43, 7.5],
        ]),
        '#4E3B2E',
        FINE,
      );
    }
    il.anchor = [W / 2, 94];
    return il.finish();
  };
}

const lectern: Draw = (_p, seed) => {
  const W = 74;
  const H = 120;
  const il = new Illuminator(W, H, `${seed}:lectern`);
  // Tripod feet and post.
  for (const [x0, x1] of [
    [37, 20],
    [37, 54],
    [37, 37],
  ] as const)
    il.ink([[x0, 100], [x1, 117]], { width: 2.4, nibRatio: 0.8, bleed: false });
  const post = rect(34, 52, 6, 52);
  il.figure(post, WOOD_DARK, FINE);
  il.figure(rect(30, 98, 14, 5), WOOD, FINE);
  // The sloping top and the Book of Names, open.
  const top = poly([
    [8, 58],
    [66, 58],
    [61, 36],
    [13, 36],
  ]);
  il.figure(top, WOOD, OUT);
  il.fill(rect(6, 58, 62, 3.4), WOOD_DARK);
  openBook(il, 12, 30, 50, 26, 2);
  // Gold bosses on the binding showing at the edges.
  il.gildDot(13, 57, 1.5);
  il.gildDot(61, 57, 1.5);
  // The chain from the binding down to the post.
  for (let t = 0; t <= 1; t += 0.08) {
    const x = 54 - t * 14 + Math.sin(t * Math.PI) * 6;
    const y = 58 + t * 30 + Math.sin(t * Math.PI) * 4;
    il.outline(ellipse(x, y, 1.4, 0.9, t * 9), { width: 0.6, nibRatio: 1, bleed: false });
  }
  il.anchor = [37, 116];
  return il.finish();
};

const shelf: Draw = (palette, seed) => {
  const W = 92;
  const H = 112;
  const il = new Illuminator(W, H, `${seed}:shelf`);
  const body = rect(12, 8, 68, 100);
  il.fill(body, WOOD_DARK);
  il.outline(body, OUT);
  const colors = [PIGMENTS.lapis, PIGMENTS.vermilion, PIGMENTS.umber, PIGMENTS.verdigris, PIGMENTS.ochre, palette.roles.roof];
  const rng = il.rng;
  for (let s = 0; s < 3; s++) {
    const y = 14 + s * 31;
    il.fill(rect(16, y, 60, 27), shade(WOOD_DARK, -0.35));
    let x = 17;
    while (x < 72) {
      const w = rng.range(5, 9);
      const h = rng.range(17, 25);
      if (rng.chance(0.12)) {
        x += w;
        continue;
      }
      const spine = rect(x, y + 27 - h, w, h);
      il.fill(spine, rng.pick(colors));
      il.gild(rect(x, y + 27 - h + 3, w, 1.4));
      il.gild(rect(x, y + 27 - 5, w, 1.4));
      il.outline(spine, { width: 0.5, nibRatio: 1, bleed: false });
      x += w + 0.4;
    }
    il.fill(rect(14, y + 27, 64, 4), WOOD);
    il.outline(rect(14, y + 27, 64, 4), FINE);
  }
  // Open doors on either side.
  for (const [x0, x1] of [
    [12, 2],
    [80, 90],
  ] as const) {
    const door = poly([
      [x0, 8],
      [x1, 14],
      [x1, 102],
      [x0, 108],
    ]);
    il.fill(door, WOOD);
    grain(il, door, Math.min(x0, x1), 8, 10, 100, true);
    il.outline(door, OUT);
  }
  il.anchor = [W / 2, 108];
  return il.finish();
};

const candle: Draw = (_p, seed) => {
  const il = new Illuminator(30, 86, `${seed}:candle`);
  for (const x1 of [6, 24, 15]) il.ink([[15, 72], [x1, 84]], { width: 1.4, nibRatio: 0.8, bleed: false });
  il.ink([[15, 24], [15, 74]], { width: 1.6, nibRatio: 0.8, bleed: false });
  il.figure(ellipse(15, 24, 8, 2), '#3A3633', FINE);
  il.figure(rect(12.5, 12, 5, 12), PIGMENTS.leadWhite, FINE);
  flame(il, 15, 12, 1.1);
  il.anchor = [15, 83];
  return il.finish();
};

const cot: Draw = (_p, seed) => {
  const il = new Illuminator(100, 46, `${seed}:cot`);
  const frame = rect(6, 24, 88, 14);
  il.figure(frame, WOOD, OUT);
  const straw = smooth(
    [
      [6, 26],
      [20, 17],
      [60, 16],
      [94, 20],
      [94, 27],
      [6, 28],
    ],
    true,
    0.8,
  );
  il.fill(straw, PIGMENTS.ochre);
  for (let i = 0; i < 26; i++) {
    const x = 10 + i * 3.2;
    il.ink([[x, 26], [x + 2, 18 + (i % 3)]], { width: 0.35, nibRatio: 1, bleed: false, alpha: 0.6 });
  }
  il.outline(straw, { width: 0.8, nibRatio: 0.6 });
  const blanket = smooth(
    [
      [40, 25],
      [44, 15],
      [86, 16],
      [92, 25],
    ],
    true,
    0.7,
  );
  il.figure(blanket, '#7C7A76', { width: 0.9, nibRatio: 0.6 });
  il.figure(ellipse(17, 18, 8, 4), '#9E9A92', FINE);
  for (const x of [8, 90]) il.figure(rect(x - 2, 36, 4, 8), WOOD_DARK, FINE);
  il.anchor = [50, 43];
  return il.finish();
};

const wallCross: Draw = (_p, seed) => {
  const il = new Illuminator(26, 36, `${seed}:cross`);
  il.figure(rect(11.5, 3, 3, 30), WOOD, FINE);
  il.figure(rect(5, 10, 16, 3), WOOD, FINE);
  il.gildDot(13, 11.5, 1.6);
  il.anchor = [13, 34];
  return il.finish();
};

const squint: Draw = (palette, seed) => {
  const il = new Illuminator(40, 36, `${seed}:squint`);
  const frame = rect(4, 4, 32, 28);
  il.figure(frame, shade(palette.roles.stone, -0.12), OUT);
  const hole = rect(9, 9, 22, 18);
  il.fill(hole, '#241A14');
  for (const x of [16, 23]) il.ink([[x, 9], [x, 27]], { width: 1.3, nibRatio: 0.9, bleed: false });
  il.ink([[9, 18], [31, 18]], { width: 1.3, nibRatio: 0.9, bleed: false });
  il.outline(hole, FINE);
  il.anchor = [20, 34];
  return il.finish();
};

const breach: Draw = (palette, seed) => {
  const il = new Illuminator(84, 116, `${seed}:breach`);
  const r = palette.roles;
  const hole = smooth(
    [
      [16, 104],
      [12, 70],
      [18, 40],
      [30, 22],
      [46, 18],
      [60, 28],
      [70, 50],
      [72, 80],
      [68, 104],
    ],
    true,
    0.55,
  );
  il.fill(hole, '#2B201A');
  // The anchorhold beyond: a hint of its floor and a cot's edge.
  il.clip(hole, () => {
    il.fill(rect(0, 92, 84, 20), shade(r.floor, -0.45));
    il.fill(rect(40, 82, 30, 6), shade(WOOD, -0.4));
  });
  il.outline(hole, { width: 1.4, nibRatio: 0.5 });
  // Broken stones around the rim.
  const rng = il.rng;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x = 42 + Math.cos(a) * 30 * rng.range(0.95, 1.1);
    const y = 62 + Math.sin(a) * 42 * rng.range(0.95, 1.08);
    if (y > 100) continue;
    const s = rng.range(4, 7);
    const st = poly([
      [x - s, y - s * 0.6],
      [x + s * 0.8, y - s * 0.7],
      [x + s, y + s * 0.5],
      [x - s * 0.7, y + s * 0.7],
    ]);
    il.figure(st, shade(r.stone, rng.range(-0.1, 0.05)), FINE);
  }
  // Rubble spilling onto the floor.
  for (let i = 0; i < 14; i++) {
    const x = rng.range(10, 76);
    const y = rng.range(100, 113);
    const s = rng.range(2.5, 5.5);
    il.figure(ellipse(x, y, s, s * 0.6, rng.range(0, 3)), shade(r.stone, rng.range(-0.12, 0.04)), FINE);
  }
  il.anchor = [42, 106];
  return il.finish();
};

const well: Draw = (palette, seed) => {
  const il = new Illuminator(80, 104, `${seed}:well`);
  const r = palette.roles;
  // Posts and a little roof.
  for (const x of [12, 64]) il.figure(rect(x, 22, 5, 52), WOOD_DARK, FINE);
  const roofS = poly([
    [4, 26],
    [40, 6],
    [76, 26],
    [70, 30],
    [40, 13],
    [10, 30],
  ]);
  il.figure(roofS, r.roofAlt, OUT);
  il.ink([[14, 38], [66, 38]], { width: 2, nibRatio: 0.9, bleed: false });
  il.ink([[40, 38], [40, 60]], { width: 0.5, nibRatio: 1, bleed: false });
  il.figure(rect(35, 58, 10, 9), WOOD, FINE);
  // The round curb, in elevation.
  const curb = new Shape().moveTo(8, 72).cubicTo(8, 66, 72, 66, 72, 72).lineTo(72, 96).cubicTo(72, 102, 8, 102, 8, 96).close();
  il.fill(curb, r.stone);
  il.clip(curb, () => {
    for (let y = 76; y < 100; y += 6) il.ink([[8, y + 2], [72, y + 2]], { width: 0.4, nibRatio: 1, bleed: false, alpha: 0.35 });
    il.fill(rect(56, 66, 16, 40), r.stoneShade, 0.6);
  });
  il.outline(curb, OUT);
  il.fill(ellipse(40, 71, 30, 4.5), '#1F2830');
  il.outline(ellipse(40, 71, 30, 4.5), FINE);
  il.anchor = [40, 100];
  return il.finish();
};

/** A run of cloister arcade: slender columns with foliage capitals and pointed arches. */
export function drawArcade(palette: LocationPalette, bays: number, bay: number, seed: string): IlluminatedImage {
  const W = bays * bay + 16;
  const H = 128;
  const il = new Illuminator(W, H, `${seed}:arcade:${bays}`);
  const r = palette.roles;
  const base = 122;
  const spring = 52;
  // The wall above the arches, a band of stone with a gabled coping.
  const top = rect(4, 8, W - 8, spring - 8);
  il.fill(top, r.stone);
  il.clip(top, () => {
    for (let y = 14; y < spring; y += 7) il.ink([[4, y], [W - 4, y]], { width: 0.4, nibRatio: 1, bleed: false, alpha: 0.3 });
  });
  for (let i = 0; i < bays; i++) {
    const x = 8 + i * bay;
    const open = pointedArch(x + 7, spring + 4, bay - 14, (bay - 14) * 0.62, base - 2);
    il.erase(open, ['paint', 'ink', 'gold']);
    il.outline(pointedArch(x + 7, spring + 4, bay - 14, (bay - 14) * 0.62, spring + 4), { width: 1, nibRatio: 0.6 });
    // A small trefoil pierced in the spandrel.
    il.fill(circle(x + bay, spring - 12, 3), r.window);
    il.outline(circle(x + bay, spring - 12, 3), FINE);
  }
  il.fill(rect(4, 4, W - 8, 6), shade(r.stone, -0.12));
  il.outline(rect(4, 4, W - 8, 6), FINE);
  il.outline(top, { width: 1.1, nibRatio: 0.55 });
  // Columns.
  for (let i = 0; i <= bays; i++) {
    const x = 8 + i * bay;
    const shaft = rect(x - 3, spring + 6, 6, base - spring - 12);
    il.fill(shaft, r.stone);
    il.clip(shaft, () => il.fill(rect(x + 1, spring, 3, base), r.stoneShade, 0.6));
    il.outline(shaft, { width: 0.9, nibRatio: 0.6 });
    const cap = smooth(
      [
        [x - 3, spring + 7],
        [x - 7, spring + 1],
        [x - 6, spring - 3],
        [x + 6, spring - 3],
        [x + 7, spring + 1],
        [x + 3, spring + 7],
      ],
      true,
      0.7,
    );
    il.figure(cap, shade(r.stone, -0.05), FINE);
    il.ink([[x - 5, spring], [x - 2.5, spring - 2], [x - 0.5, spring + 1]], { width: 0.5, bleed: false });
    il.ink([[x + 5, spring], [x + 2.5, spring - 2], [x + 0.5, spring + 1]], { width: 0.5, bleed: false });
    il.figure(rect(x - 5, base - 6, 10, 6), shade(r.stone, -0.1), FINE);
  }
  il.anchor = [W / 2, base];
  return il.finish();
}

const bench: Draw = (palette, seed) => {
  const il = new Illuminator(76, 36, `${seed}:bench`);
  il.figure(rect(4, 10, 68, 8), palette.roles.stone, OUT);
  for (const x of [10, 58]) il.figure(rect(x, 18, 8, 14), shade(palette.roles.stone, -0.1), FINE);
  il.anchor = [38, 32];
  return il.finish();
};

/**
 * A painted saint in a niche on the plaster. It hides a doorway (the raking light shows
 * the underwriting of its outline).
 */
const paintedDoor: Draw = (palette, seed) => {
  const il = new Illuminator(66, 98, `${seed}:painted`);
  const r = palette.roles;
  const panel = pointedArch(8, 34, 50, 26, 92);
  il.fill(panel, shade(r.stone, 0.15));
  il.clip(panel, () => {
    il.fill(rect(8, 0, 50, 98), PIGMENTS.lapis, 0.9);
    for (let y = 12; y < 92; y += 8) for (let x = 12 + ((y / 8) % 2) * 4; x < 58; x += 8) il.dot(x, y, 0.8, PIGMENTS.goldLight, 0.7);
    // Saint Ebb: a slim figure with a gold halo holding a book.
    il.gildDot(33, 30, 6);
    il.fill(circle(33, 31, 3.6), '#EED6BE');
    const body = smooth(
      [
        [27, 38],
        [39, 38],
        [42, 86],
        [24, 86],
      ],
      true,
      0.7,
    );
    il.figure(body, PIGMENTS.vermilion, FINE);
    il.figure(rect(29, 50, 8, 9), PIGMENTS.leadWhite, FINE);
  });
  il.outline(panel, OUT);
  il.outline(pointedArch(4, 34, 58, 30, 94), { width: 0.7, nibRatio: 0.7, bleed: false });
  il.anchor = [33, 94];
  return il.finish();
};

const stool: Draw = (_p, seed) => {
  const il = new Illuminator(34, 30, `${seed}:stool`);
  for (const [x0, x1] of [
    [10, 5],
    [24, 29],
    [17, 17],
  ] as const)
    il.ink([[x0, 12], [x1, 27]], { width: 1.6, nibRatio: 0.8, bleed: false });
  il.figure(ellipse(17, 11, 13, 3.4), WOOD, OUT);
  il.anchor = [17, 27];
  return il.finish();
};

export const PROP_KINDS: Record<string, PropKindDef> = {
  desk: { draw: desk('plain'), blocker: { rx: 34, ry: 9 }, glows: [[-27, -72, 70]] },
  deskSleeper: { draw: desk('sleeper'), blocker: { rx: 34, ry: 9 }, glows: [[-27, -72, 70]] },
  deskWystan: { draw: desk('wystan'), blocker: { rx: 34, ry: 9 } },
  deskIsot: { draw: desk('isot'), blocker: { rx: 34, ry: 9 }, glows: [[-27, -72, 80]] },
  lectern: { draw: lectern, blocker: { rx: 22, ry: 8 } },
  shelf: { draw: shelf, blocker: { rx: 40, ry: 8 } },
  candle: { draw: candle, blocker: { rx: 8, ry: 5 }, glows: [[0, -78, 90]] },
  cot: { draw: cot, blocker: { rx: 46, ry: 10, dy: 8 } },
  wallCross: { draw: wallCross, onWall: true },
  squint: { draw: squint, onWall: true },
  breach: { draw: breach, onWall: true },
  well: { draw: well, blocker: { rx: 32, ry: 12, dy: 4 } },
  bench: { draw: bench, blocker: { rx: 34, ry: 6 } },
  paintedDoor: { draw: paintedDoor, onWall: true },
  stool: { draw: stool, blocker: { rx: 10, ry: 5 } },
};
