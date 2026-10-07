/**
 * Figures in the Gothic manner: slender, small-headed, with the S-shaped sway, long
 * drapery folds, almond eyes and rosy cheek spots. Drawn facing right; mirror to face left.
 * DESIGN.md §6.4–6.5.
 */

import { Illuminator, type IlluminatedImage } from './illuminator';
import { PIGMENTS, shade } from './palettes';
import { ellipse, poly, type Pt, rect, Shape, smooth } from './path';

export type Pose = 'stand' | 'stepA' | 'stepB';

/** Colours and garments of a robed figure. */
export interface RobedSpec {
  id: string;
  robe: string;
  robeShade: string;
  belt: string;
  skin: string;
  cheek: string;
  hair: string;
  headwear: 'coif' | 'wimple' | 'none';
  headwearColor: string;
  shoes: string;
  /** Things carried: drawn in front of the body. */
  props: ('quill' | 'inkhorn' | 'penknife')[];
}

export const ISOT: RobedSpec = {
  id: 'isot',
  robe: PIGMENTS.azurite,
  robeShade: shade(PIGMENTS.lapis, -0.05),
  belt: PIGMENTS.umber,
  skin: '#F1DCC8',
  cheek: PIGMENTS.brazilRose,
  hair: '#3B2A20',
  headwear: 'coif',
  headwearColor: PIGMENTS.leadWhite,
  shoes: PIGMENTS.lampBlack,
  props: ['quill', 'inkhorn', 'penknife'],
};

const OUT = { width: 1.3, nibRatio: 0.5 };
const FINE = { width: 0.6, nibRatio: 0.7, bleed: false };

/**
 * Draw a robed figure about 100 units tall. The anchor is between the feet.
 */
export function drawRobedFigure(spec: RobedSpec, pose: Pose = 'stand', seed: number | string = spec.id): IlluminatedImage {
  const W = 70;
  const H = 112;
  const il = new Illuminator(W, H, `${String(seed)}:${pose}`);
  const cx = 32;
  const b = 106; // ground line
  const step = pose === 'stepA' ? 1 : pose === 'stepB' ? -1 : 0;

  // ---- feet (behind the hem) ----
  const shoe = (x: number, y: number, len: number): Shape =>
    smooth(
      [
        [x, y - 2.6],
        [x + len * 0.55, y - 3.1],
        [x + len, y - 0.4],
        [x + len * 0.5, y + 0.4],
        [x - 0.5, y + 0.2],
      ],
      true,
      0.7,
    );
  const frontFoot = shoe(cx + 5 + step * 4, b, 10);
  il.figure(frontFoot, spec.shoes, FINE);
  if (step === -1) il.figure(shoe(cx - 13, b - 0.6, 9), spec.shoes, FINE);

  // ---- robe: the S-curve silhouette ----
  const hemFront = cx + 16 + step * 3;
  const hemBack = cx - 19 + (step === -1 ? -2 : 0);
  const robePts: Pt[] = [
    [cx - 7, b - 80], // back shoulder
    [cx - 10.5, b - 69],
    [cx - 9, b - 55],
    [cx - 10.5, b - 41],
    [cx - 14.5, b - 18],
    [hemBack, b - 2],
    [cx - 9, b - 0.5],
    [cx - 1, b - 2.2],
    [cx + 7, b - 0.2],
    [hemFront, b - 2.5],
    [cx + 13 + step * 1.5, b - 24], // shin
    [cx + 13.5, b - 45], // belly, pushed forward by the sway
    [cx + 9.5, b - 56], // waist
    [cx + 10.5, b - 68], // chest
    [cx + 8, b - 80], // front shoulder
    [cx + 1, b - 82], // neckline
  ];
  const robe = smooth(robePts, true, 0.85);
  il.fill(robe, spec.robe);
  il.clip(robe, () => {
    // Shade band down the back, as painters modelled drapery: a darker stripe, no gradient.
    const back = smooth(
      [
        [cx - 14, b - 82],
        [cx - 3, b - 70],
        [cx - 4, b - 50],
        [cx - 7, b - 20],
        [cx - 4, b + 2],
        [cx - 25, b + 2],
      ],
      true,
      0.8,
    );
    il.fill(back, spec.robeShade, 0.85);
    // A fold shadow under the belly.
    il.fill(ellipse(cx + 6, b - 30, 3.5, 14, 0.12), spec.robeShade, 0.5);
  });

  // Folds: long strokes falling from the waist, a V at the hem.
  const folds: Pt[][] = [
    [
      [cx - 2, b - 54],
      [cx - 4, b - 35],
      [cx - 6.5, b - 14],
      [cx - 8, b - 2],
    ],
    [
      [cx + 3, b - 52],
      [cx + 2.5, b - 33],
      [cx + 0.5, b - 12],
      [cx - 1, b - 2.4],
    ],
    [
      [cx + 8, b - 40],
      [cx + 7.5, b - 22],
      [cx + 6.5, b - 2],
    ],
  ];
  for (const f of folds) {
    const pts = smooth(f, false).polylines(1.2)[0] ?? [];
    il.ink(pts, { width: 0.8, nibRatio: 0.5, taperIn: 6, taperOut: 3, taperFloor: 0.15 });
  }
  // Lead-white highlights on the lit front folds.
  il.highlight(smooth([[cx + 10.5, b - 44], [cx + 10.8, b - 26], [cx + 12.5, b - 6]], false).polylines(1)[0] ?? [], 1, 0.75);
  il.highlight(smooth([[cx + 5.5, b - 50], [cx + 4.8, b - 32], [cx + 3.5, b - 10]], false).polylines(1)[0] ?? [], 0.8, 0.55);
  il.outline(robe, OUT);

  // Belt.
  const belt = new Shape()
    .moveTo(cx - 9.5, b - 56.5)
    .cubicTo(cx - 3, b - 54.5, cx + 4, b - 54, cx + 10, b - 56.5)
    .lineTo(cx + 9.8, b - 54.5)
    .cubicTo(cx + 4, b - 52, cx - 3, b - 52.5, cx - 9.2, b - 54.5)
    .close();
  il.figure(belt, spec.belt, FINE);

  // ---- props hanging from the belt ----
  if (spec.props.includes('inkhorn')) {
    il.ink([[cx + 8, b - 54], [cx + 11, b - 49]], { width: 0.5, bleed: false });
    const horn = smooth(
      [
        [cx + 9.5, b - 49.5],
        [cx + 13.5, b - 50],
        [cx + 14.5, b - 44],
        [cx + 12.2, b - 39.5],
        [cx + 11, b - 44],
      ],
      true,
      0.8,
    );
    il.figure(horn, PIGMENTS.ochre, FINE);
    il.fill(ellipse(cx + 11.6, b - 49.6, 2.1, 0.9), PIGMENTS.lampBlack);
  }
  if (spec.props.includes('penknife')) {
    // The penknife on its cord ("Wystan's idea").
    il.ink(smooth([[cx - 6, b - 54], [cx - 7.5, b - 47], [cx - 6.5, b - 42]], false).polylines(1)[0] ?? [], { width: 0.4, nibRatio: 1, bleed: false });
    const blade = poly([
      [cx - 7.5, b - 42],
      [cx - 5.6, b - 42],
      [cx - 6.2, b - 35],
    ]);
    il.fill(blade, PIGMENTS.silver);
    il.outline(blade, { width: 0.45, nibRatio: 1, bleed: false });
    il.fill(rect(cx - 7.8, b - 44.8, 2.6, 3), PIGMENTS.umber);
  }

  // ---- arm and hand holding the quill ----
  const sleeve = smooth(
    [
      [cx + 3, b - 79],
      [cx + 10, b - 76],
      [cx + 11.5, b - 64],
      [cx + 19, b - 66.5],
      [cx + 21, b - 61],
      [cx + 12, b - 57.5],
      [cx + 5, b - 61],
      [cx + 3, b - 70],
    ],
    true,
    0.85,
  );
  il.fill(sleeve, spec.robe);
  il.clip(sleeve, () => il.fill(rect(cx + 3, b - 62, 20, 6), spec.robeShade, 0.6));
  il.ink(smooth([[cx + 8, b - 70], [cx + 9.5, b - 63], [cx + 14, b - 61]], false).polylines(1)[0] ?? [], { width: 0.6, nibRatio: 0.6, taperIn: 3 });
  il.outline(sleeve, { width: 0.95, nibRatio: 0.55 });
  if (spec.props.includes('quill')) {
    const q0: Pt = [cx + 20, b - 61];
    const q1: Pt = [cx + 29, b - 86];
    const vane = smooth(
      [
        [cx + 21.5, b - 66],
        [cx + 27.5, b - 76],
        [cx + 30.5, b - 87],
        [cx + 26, b - 80],
        [cx + 22.5, b - 70],
      ],
      true,
      0.8,
    );
    il.fill(vane, PIGMENTS.leadWhite);
    il.outline(vane, { width: 0.55, nibRatio: 0.7, bleed: false });
    il.ink([q0, q1], { width: 0.55, nibRatio: 1, bleed: false });
    // Barbs.
    for (let t = 0.3; t < 0.95; t += 0.11) {
      const x = q0[0] + (q1[0] - q0[0]) * t;
      const y = q0[1] + (q1[1] - q0[1]) * t;
      il.ink([[x, y], [x + 2.4, y - 1.2]], { width: 0.3, nibRatio: 1, bleed: false, alpha: 0.6 });
    }
  }
  const hand = smooth(
    [
      [cx + 18.5, b - 63.5],
      [cx + 22.2, b - 64.2],
      [cx + 23.4, b - 61.3],
      [cx + 21, b - 58.8],
      [cx + 18.2, b - 60],
    ],
    true,
    0.8,
  );
  il.figure(hand, spec.skin, FINE);
  // Ink-stained fingertips: vermilion and black.
  il.dot(cx + 22.6, b - 62.3, 0.7, PIGMENTS.vermilion, 0.9);
  il.dot(cx + 21.8, b - 60.1, 0.55, PIGMENTS.lampBlack, 0.8);

  // ---- head ----
  const hx = cx + 3.5;
  const hy = b - 90;
  // Neck.
  il.figure(rect(hx - 2, hy + 4, 4.4, 5), spec.skin, FINE);
  // Face in near-profile, looking right.
  const face = smooth(
    [
      [hx - 4, hy - 6.5],
      [hx + 3.4, hy - 6.6],
      [hx + 5.3, hy - 3], // brow
      [hx + 6.9, hy + 0.4], // nose tip
      [hx + 5.6, hy + 1.6],
      [hx + 5.9, hy + 2.7], // lips
      [hx + 5, hy + 4.6], // chin
      [hx + 1.5, hy + 6.4],
      [hx - 4.2, hy + 4],
    ],
    true,
    0.75,
  );
  il.fill(face, spec.skin);
  il.dot(hx + 2.6, hy + 2.4, 1.15, spec.cheek, 0.75);
  // Almond eye, brow, mouth.
  il.ink(
    [
      [hx + 2.2, hy - 1.2],
      [hx + 3.4, hy - 1.8],
      [hx + 4.3, hy - 1.3],
    ],
    { width: 0.55, nibRatio: 0.6, bleed: false },
  );
  il.dot(hx + 3.5, hy - 1.2, 0.5, PIGMENTS.ironGall);
  il.ink(
    [
      [hx + 2.2, hy - 3.3],
      [hx + 3.6, hy - 3.9],
      [hx + 4.9, hy - 3.4],
    ],
    { width: 0.45, nibRatio: 0.6, bleed: false },
  );
  il.ink(
    [
      [hx + 4.4, hy + 2.6],
      [hx + 5.4, hy + 2.5],
    ],
    { width: 0.45, nibRatio: 1, bleed: false },
  );
  il.outline(face, { width: 0.75, nibRatio: 0.6 });
  // Hair showing at the brow.
  const fringe = smooth(
    [
      [hx - 3.8, hy - 6.8],
      [hx + 3.6, hy - 7],
      [hx + 4.3, hy - 4.6],
      [hx + 1.5, hy - 5.2],
      [hx - 1, hy - 4.2],
    ],
    true,
    0.8,
  );
  il.figure(fringe, spec.hair, FINE);

  if (spec.headwear === 'coif') {
    // The linen coif: covers the crown, ears and nape, ties under the chin.
    const coif = smooth(
      [
        [hx + 3.9, hy - 6.4],
        [hx + 1.5, hy - 9.6],
        [hx - 5.5, hy - 9.4],
        [hx - 9.4, hy - 3.5],
        [hx - 8.6, hy + 3.8],
        [hx - 4.5, hy + 7.4],
        [hx + 1.5, hy + 7.2],
        [hx + 4.4, hy + 5.6],
        [hx + 1.2, hy + 5.2],
        [hx - 2.4, hy + 3],
        [hx - 2.4, hy - 4.6],
        [hx + 0.8, hy - 6.2],
      ],
      true,
      0.8,
    );
    il.fill(coif, spec.headwearColor);
    il.clip(coif, () => il.fill(rect(hx - 10, hy - 1, 6, 10), PIGMENTS.vellumShade, 0.7));
    il.ink(smooth([[hx - 6, hy - 6], [hx - 6.6, hy - 1], [hx - 5, hy + 4]], false).polylines(1)[0] ?? [], { width: 0.5, nibRatio: 0.7, bleed: false });
    il.outline(coif, { width: 0.85, nibRatio: 0.55 });
  }

  il.anchor = [cx, b];
  return il.finish();
}
