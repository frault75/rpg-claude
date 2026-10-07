/**
 * Drolleries: the absurd creatures of the margins. Round, hybrid, comic, never gory.
 * Each has its own generator so silhouettes stay distinct. DESIGN.md §6.4.
 */

import { Illuminator, type IlluminatedImage } from './illuminator';
import { PIGMENTS, shade } from './palettes';
import { circle, ellipse, type Pt, Shape, smooth } from './path';

const OUT = { width: 0.95, nibRatio: 0.55 };
const FINE = { width: 0.55, nibRatio: 0.75, bleed: false };

/**
 * A snail: a big spiral shell and a long pale body with eye-stalks, facing right.
 * Knights fighting snails is the oldest joke in the margins.
 */
export function drawSnail(shellColor: string, seed: number | string = 'snail', size = 1): IlluminatedImage {
  const W = 64 * size;
  const H = 44 * size;
  const il = new Illuminator(W, H, seed);
  const s = size;
  const body = smooth(
    [
      [4 * s, 40 * s],
      [8 * s, 33 * s],
      [30 * s, 31 * s],
      [46 * s, 26 * s],
      [52 * s, 18 * s],
      [57 * s, 22 * s],
      [56 * s, 32 * s],
      [50 * s, 39 * s],
      [30 * s, 41 * s],
    ],
    true,
    0.85,
  );
  il.fill(body, '#D9C9A5');
  il.clip(body, () => il.fill(ellipse(30 * s, 41 * s, 28 * s, 3.5 * s), '#B9A27A', 0.8));
  il.outline(body, OUT);
  // Eye-stalks with little ink knobs.
  for (const [dx, dy, len] of [
    [0, 0, 1],
    [-3, 1, 0.8],
  ] as const) {
    const base: Pt = [(51 + dx) * s, (20 + dy) * s];
    const tip: Pt = [(57 + dx * 0.6) * s, (6 + dy * 2) * s * len + (1 - len) * 14 * s];
    il.ink(smooth([base, [(54 + dx) * s, 13 * s], tip], false).polylines(0.8)[0] ?? [], { width: 0.8 * s, nibRatio: 0.8, bleed: false });
    il.dot(tip[0], tip[1], 1.3 * s, PIGMENTS.ironGall);
  }
  il.dot(53.2 * s, 22.5 * s, 0.6 * s, PIGMENTS.ironGall);
  // The shell: a filled disc with an ink spiral and banded colour.
  const cx = 25 * s;
  const cy = 22 * s;
  const R = 16 * s;
  const shellShape = circle(cx, cy, R);
  il.fill(shellShape, shellColor);
  il.clip(shellShape, () => {
    il.fill(ellipse(cx + R * 0.45, cy + R * 0.4, R * 0.8, R * 0.6), shade(shellColor, -0.25), 0.6);
  });
  const spiral: Pt[] = [];
  for (let t = 0; t <= 1; t += 0.01) {
    const a = t * Math.PI * 5.2;
    const r = R * (1 - t) * 0.92;
    spiral.push([cx + Math.cos(a) * r * 0.98, cy + Math.sin(a) * r]);
  }
  il.ink(spiral, { width: 0.85 * s, nibRatio: 0.5, taperOut: 8, taperFloor: 0.25 });
  il.highlight(
    [
      [cx - R * 0.6, cy - R * 0.5],
      [cx - R * 0.2, cy - R * 0.8],
      [cx + R * 0.2, cy - R * 0.82],
    ],
    0.9 * s,
    0.7,
  );
  il.outline(shellShape, OUT);
  il.anchor = [W / 2, 40 * s];
  return il.finish();
}

/**
 * A gryllus: a head on two legs. A bearded face in a hood, little bird feet.
 */
export function drawGryllus(hoodColor: string, seed: number | string = 'gryllus', size = 1): IlluminatedImage {
  const W = 46 * size;
  const H = 52 * size;
  const il = new Illuminator(W, H, seed);
  const s = size;
  // Legs and feet.
  for (const [x, lean] of [
    [18, -1],
    [27, 1],
  ] as const) {
    const top: Pt = [x * s, 36 * s];
    const knee: Pt = [(x + lean * 2) * s, 42 * s];
    const foot: Pt = [(x + lean) * s, 48 * s];
    il.ink([top, knee, foot], { width: 1.1 * s, nibRatio: 0.8, bleed: false });
    for (const a of [-0.5, 0, 0.55]) {
      il.ink([foot, [foot[0] + Math.cos(a) * 4 * s, foot[1] + Math.sin(a) * 1.6 * s + 0.4 * s]], { width: 0.7 * s, nibRatio: 1, bleed: false });
    }
  }
  // The hood, framing a large face in profile.
  const hood = smooth(
    [
      [8 * s, 34 * s],
      [5 * s, 20 * s],
      [9 * s, 8 * s],
      [18 * s, 2.5 * s],
      [30 * s, 5 * s],
      [38 * s, 14 * s],
      [37 * s, 27 * s],
      [31 * s, 37 * s],
      [16 * s, 38 * s],
    ],
    true,
    0.85,
  );
  il.fill(hood, hoodColor);
  il.clip(hood, () => il.fill(ellipse(10 * s, 26 * s, 6 * s, 14 * s), shade(hoodColor, -0.25), 0.6));
  il.outline(hood, OUT);
  // The hood's liripipe (long tail) flopping behind.
  const tail = smooth(
    [
      [9 * s, 8 * s],
      [2 * s, 4 * s],
      [1 * s, 12 * s],
      [6 * s, 14 * s],
    ],
    false,
  );
  il.ink(tail.polylines(0.8)[0] ?? [], { width: 2.2 * s, nibRatio: 0.7, taperOut: 4 });
  const face = smooth(
    [
      [17 * s, 10 * s],
      [29 * s, 9 * s],
      [33 * s, 15 * s],
      [37.5 * s, 19.5 * s], // nose
      [33.5 * s, 21.5 * s],
      [34.5 * s, 25 * s], // lips
      [30 * s, 33 * s],
      [21 * s, 33 * s],
      [16 * s, 22 * s],
    ],
    true,
    0.8,
  );
  il.fill(face, '#EED6BE');
  // Beard.
  const beard = smooth(
    [
      [20 * s, 26 * s],
      [27 * s, 27 * s],
      [33 * s, 26 * s],
      [31 * s, 33.5 * s],
      [25 * s, 37 * s],
      [20 * s, 33 * s],
    ],
    true,
    0.8,
  );
  il.figure(beard, PIGMENTS.ochre, FINE);
  for (let i = 0; i < 4; i++) {
    il.ink(
      [
        [(22 + i * 2.4) * s, 29 * s],
        [(22.6 + i * 2.2) * s, 34 * s],
      ],
      { width: 0.4 * s, nibRatio: 1, bleed: false, alpha: 0.7 },
    );
  }
  il.dot(28 * s, 21.5 * s, 1.6 * s, PIGMENTS.brazilRose, 0.7);
  // A wide, surprised eye.
  il.fill(ellipse(29.5 * s, 15.5 * s, 2.2 * s, 1.6 * s), PIGMENTS.leadWhite);
  il.dot(30.4 * s, 15.6 * s, 0.9 * s, PIGMENTS.ironGall);
  il.outline(ellipse(29.5 * s, 15.5 * s, 2.2 * s, 1.6 * s), FINE);
  il.ink(
    [
      [26.5 * s, 12 * s],
      [29.5 * s, 11 * s],
      [32 * s, 12.5 * s],
    ],
    { width: 0.6 * s, nibRatio: 0.6, bleed: false },
  );
  il.outline(face, { width: 0.8, nibRatio: 0.6 });
  il.anchor = [22 * s, 48.5 * s];
  return il.finish();
}

/** A small bird perched on a spray (for the border). */
export function drawBird(color: string, seed: number | string = 'bird'): IlluminatedImage {
  const il = new Illuminator(30, 22, seed);
  const body = smooth(
    [
      [4, 14],
      [9, 8],
      [17, 7],
      [21, 4],
      [26, 6],
      [23, 9],
      [21, 14],
      [12, 17],
    ],
    true,
    0.85,
  );
  il.fill(body, color);
  il.clip(body, () => il.fill(ellipse(13, 15, 9, 3), shade(color, 0.4), 0.8));
  const wing = smooth(
    [
      [8, 11],
      [14, 9],
      [18, 12],
      [12, 14],
    ],
    true,
  );
  il.fill(wing, shade(color, -0.25));
  il.outline(wing, FINE);
  il.outline(body, { width: 0.7, nibRatio: 0.6 });
  il.dot(23.2, 6.2, 0.6, PIGMENTS.ironGall);
  const beak = new Shape().moveTo(25.8, 5.4).lineTo(29, 6.2).lineTo(25.6, 7.2).close();
  il.figure(beak, PIGMENTS.orpiment, FINE);
  for (const x of [13, 16]) il.ink([[x, 16.5], [x - 1, 20.5]], { width: 0.5, nibRatio: 1, bleed: false });
  il.anchor = [14, 20.5];
  return il.finish();
}
