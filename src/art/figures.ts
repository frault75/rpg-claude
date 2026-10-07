/**
 * Figures in the Gothic manner: slender, small-headed, with the S-shaped sway, long
 * drapery folds, almond eyes and rosy cheek spots. Drawn facing right; mirror to face left.
 * One drawer covers every robed figure; the head is shared with the portraits so a face
 * on the map and in the dialogue box is the same face. DESIGN.md §6.4–6.5.
 */

import { ART_SCALE, Illuminator, type IlluminatedImage } from './illuminator';
import { PIGMENTS, shade } from './palettes';
import { circle, ellipse, poly, type Pt, rect, Shape, smooth } from './path';
import type { Mood } from '../story/script';

export type Pose = 'stand' | 'stepA' | 'stepB';
export type Headwear = 'coif' | 'wimple' | 'hood' | 'mitre' | 'none';
export type Held = 'quill' | 'psalter' | 'crozier' | 'pumice' | 'none';
export type Hanging = 'inkhorn' | 'penknife' | 'keys';

/** Colours, garments and face of a robed figure. */
export interface RobedSpec {
  id: string;
  robe: string;
  robeShade: string;
  belt: string;
  skin: string;
  cheek: string;
  hair: string;
  headwear: Headwear;
  headwearColor: string;
  /** A veil over the wimple, or the shade of a hood's inside. */
  veil?: string;
  feet: 'shoes' | 'bare';
  shoes: string;
  held: Held;
  hanging: Hanging[];
  /** A cope (semicircular cape) over the robe, with a gold band on its edge. */
  cope?: string;
  /** 1 = about 100 units tall. */
  height: number;
  /** Width multiplier. */
  build: number;
  face: { age: number; plague?: boolean; nose?: number };
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
  feet: 'shoes',
  shoes: PIGMENTS.lampBlack,
  held: 'quill',
  hanging: ['inkhorn', 'penknife'],
  height: 1,
  build: 1,
  face: { age: 0 },
};

export const HILD: RobedSpec = {
  id: 'hild',
  robe: '#9A948A',
  robeShade: '#6E6860',
  belt: '#5A4E42',
  skin: '#E9D6C6',
  cheek: '#C9A0A0',
  hair: '#8A8178',
  headwear: 'wimple',
  headwearColor: PIGMENTS.leadWhite,
  veil: '#3E3A38',
  feet: 'bare',
  shoes: PIGMENTS.lampBlack,
  held: 'psalter',
  hanging: [],
  height: 1.07,
  build: 0.98,
  face: { age: 0.8, plague: true, nose: 1.1 },
};

export const AUMERY: RobedSpec = {
  id: 'aumery',
  robe: PIGMENTS.leadWhite,
  robeShade: '#CFC6B6',
  belt: PIGMENTS.gold,
  skin: '#EFD8C3',
  cheek: PIGMENTS.brazilRose,
  hair: '#9C8D7C',
  headwear: 'mitre',
  headwearColor: PIGMENTS.leadWhite,
  feet: 'shoes',
  shoes: PIGMENTS.vermilion,
  held: 'crozier',
  hanging: [],
  cope: PIGMENTS.vermilion,
  height: 1.03,
  build: 1.08,
  face: { age: 0.55, nose: 1.05 },
};

export const BROTHER: RobedSpec = {
  id: 'brother',
  robe: '#6E6F73',
  robeShade: '#4C4D52',
  belt: '#2E2A26',
  skin: '#E2C9B3',
  cheek: '#C99A8E',
  hair: '#4A3B2E',
  headwear: 'hood',
  headwearColor: '#6E6F73',
  veil: '#3A3B3F',
  feet: 'shoes',
  shoes: '#2E2A26',
  held: 'pumice',
  hanging: ['keys'],
  height: 1.02,
  build: 1.06,
  face: { age: 0.35, nose: 1.15 },
};

export const SCRIBE: RobedSpec = {
  ...BROTHER,
  id: 'scribe',
  robe: '#4E3B2E',
  robeShade: '#36281F',
  headwearColor: '#4E3B2E',
  veil: '#2A1F18',
  held: 'none',
  hanging: ['inkhorn'],
  face: { age: 0.3, nose: 1 },
};

export const FIGURES: Record<string, RobedSpec> = { isot: ISOT, hild: HILD, aumery: AUMERY, brother: BROTHER, scribe: SCRIBE };

const OUT = { width: 0.85, nibRatio: 0.5 };
const FINE = { width: 0.6, nibRatio: 0.7, bleed: false };

// ---- the head ------------------------------------------------------------------------------

/**
 * A head in near-profile, looking right, centred at (hx, hy). `s` scales it (1 on the
 * map, about 5 in portraits); line widths grow more slowly than the head.
 */
export function drawHead(il: Illuminator, spec: RobedSpec, hx: number, hy: number, s: number, mood: Mood | 'asleep' = 'neutral'): void {
  const lw = 0.55 + 0.45 * s;
  const P = (dx: number, dy: number): Pt => [hx + dx * s, hy + dy * s];
  const nose = spec.face.nose ?? 1;
  const hooded = spec.headwear === 'hood';
  const skin = hooded ? shade(spec.skin, -0.12) : spec.skin;

  // Neck first; the face and headwear cover its top.
  il.figure(poly([P(-2, 4), P(2.4, 4), P(2.6, 9), P(-2.2, 9)]), skin, { width: 0.6 * lw, nibRatio: 0.7, bleed: false });

  const face = smooth(
    [
      P(-4, -6.5),
      P(3.4, -6.6),
      P(5.3, -3),
      P(5.3 + 1.6 * nose, 0.4),
      P(5.6, 1.6),
      P(5.9, 2.7),
      P(5, 4.6),
      P(1.5, 6.4),
      P(-4.2, 4),
    ],
    true,
    0.75,
  );
  il.fill(face, skin);
  if (s > 2) {
    // Portrait modelling: a soft shade band along the jaw and under the brow.
    il.clip(face, () => {
      il.fill(ellipse(hx - 2.4 * s, hy + 1.5 * s, 3.4 * s, 5 * s), shade(skin, -0.08), 0.6);
    });
  }
  const cheekA = mood === 'warm' ? 0.85 : 0.65;
  il.dot(hx + 2.6 * s, hy + 2.4 * s, 1.15 * s, spec.cheek, cheekA);
  if (spec.face.plague) {
    for (const [dx, dy, r] of [
      [1.2, 1.6, 0.42],
      [2.2, 3.4, 0.32],
      [0.4, 3.1, 0.28],
    ] as const)
      il.dot(hx + dx * s, hy + dy * s, r * s, '#8C8A8A', 0.85);
  }

  // Eye.
  const eyeY = -1.2;
  if (mood === 'asleep' || mood === 'grave') {
    il.ink([P(2.1, eyeY - 0.2), P(3.4, eyeY + 0.35), P(4.4, eyeY - 0.1)], { width: 0.55 * lw, nibRatio: 0.6, bleed: false });
  } else {
    const open = mood === 'alarmed' ? 1.2 : mood === 'wry' ? 0.65 : 0.85;
    if (s > 2) {
      const white = smooth([P(2.1, eyeY), P(3.3, eyeY - 0.75 * open), P(4.4, eyeY - 0.1), P(3.3, eyeY + 0.55 * open)], true, 0.8);
      il.fill(white, PIGMENTS.leadWhite);
    }
    il.ink([P(2.1, eyeY), P(3.3, eyeY - 0.7 * open), P(4.4, eyeY - 0.1)], { width: 0.55 * lw, nibRatio: 0.6, bleed: false });
    il.dot(hx + 3.45 * s, hy + (eyeY + 0.05) * s, 0.5 * s * (mood === 'alarmed' ? 0.8 : 1), PIGMENTS.ironGall);
  }
  // Brow: its tilt carries most of the mood.
  const brow: Record<string, [number, number, number]> = {
    neutral: [-3.3, -3.9, -3.4],
    wry: [-3.1, -4.4, -3.2],
    grave: [-3.6, -3.7, -3.0],
    alarmed: [-3.9, -4.6, -4.1],
    warm: [-3.4, -4.0, -3.6],
    asleep: [-3.1, -3.4, -3.2],
  };
  const [b0, b1, b2] = brow[mood] ?? brow.neutral!;
  il.ink([P(2.2, b0), P(3.6, b1), P(4.9, b2)], { width: 0.45 * lw, nibRatio: 0.6, bleed: false });
  // Mouth.
  const mouth: Record<string, Pt[]> = {
    neutral: [P(4.4, 2.6), P(5.4, 2.5)],
    wry: [P(4.3, 2.75), P(5.0, 2.55), P(5.5, 2.3)],
    grave: [P(4.3, 2.45), P(4.9, 2.6), P(5.4, 2.75)],
    alarmed: [P(4.7, 2.3), P(5.3, 2.5), P(4.9, 2.9), P(4.6, 2.6)],
    warm: [P(4.3, 2.4), P(4.9, 2.75), P(5.5, 2.45)],
    asleep: [P(4.5, 2.6), P(5.3, 2.6)],
  };
  il.ink(mouth[mood] ?? mouth.neutral!, { width: 0.45 * lw, nibRatio: 1, bleed: false });
  if (spec.face.age > 0.4) {
    // Lines of age: beside the nose and at the eye's corner.
    il.ink([P(3.6, 0.6), P(3.3, 2.0), P(3.8, 3.2)], { width: 0.35 * lw, nibRatio: 1, bleed: false, alpha: 0.55 });
    il.ink([P(1.4, -1.6), P(0.6, -1.2)], { width: 0.3 * lw, nibRatio: 1, bleed: false, alpha: 0.5 });
  }
  il.outline(face, { width: 0.75 * lw, nibRatio: 0.6 });

  const hw = spec.headwear;
  if (hw === 'coif') {
    il.figure(
      smooth([P(-3.8, -6.8), P(3.6, -7), P(4.3, -4.6), P(1.5, -5.2), P(-1, -4.2)], true, 0.8),
      spec.hair,
      { width: 0.6 * lw, nibRatio: 0.7, bleed: false },
    );
    const coif = smooth(
      [P(3.9, -6.4), P(1.5, -9.6), P(-5.5, -9.4), P(-9.4, -3.5), P(-8.6, 3.8), P(-4.5, 7.4), P(1.5, 7.2), P(4.4, 5.6), P(1.2, 5.2), P(-2.4, 3), P(-2.4, -4.6), P(0.8, -6.2)],
      true,
      0.8,
    );
    il.fill(coif, spec.headwearColor);
    il.clip(coif, () => il.fill(rect(hx - 10 * s, hy - 1 * s, 6 * s, 10 * s), PIGMENTS.vellumShade, 0.7));
    il.ink(smooth([P(-6, -6), P(-6.6, -1), P(-5, 4)], false).polylines(1)[0] ?? [], { width: 0.5 * lw, nibRatio: 0.7, bleed: false });
    il.outline(coif, { width: 0.85 * lw, nibRatio: 0.55 });
  } else if (hw === 'wimple') {
    // The wimple wraps the neck and chin; only the face shows.
    const wimple = smooth(
      [P(3.6, -6.6), P(0, -9.8), P(-6, -9), P(-9.5, -2.5), P(-9, 6), P(-5, 10.5), P(3, 10.5), P(5.6, 7.5), P(5.2, 4.8), P(2.2, 6.1), P(-1.5, 4.5), P(-2.6, -1), P(-1.2, -5.2)],
      true,
      0.8,
    );
    il.fill(wimple, spec.headwearColor);
    il.clip(wimple, () => il.fill(rect(hx - 10 * s, hy + 1 * s, 7 * s, 11 * s), PIGMENTS.vellumShade, 0.7));
    il.outline(wimple, { width: 0.85 * lw, nibRatio: 0.55 });
    // The veil over the crown, falling behind.
    const veil = smooth([P(4.2, -6.4), P(1, -10.6), P(-6.5, -10.2), P(-11, -4), P(-11.5, 6), P(-8.5, 12), P(-7, 4), P(-6.5, -3), P(-2, -7.4)], true, 0.85);
    il.fill(veil, spec.veil ?? PIGMENTS.lampBlack);
    il.outline(veil, { width: 0.85 * lw, nibRatio: 0.55 });
  } else if (hw === 'hood') {
    const hood = smooth(
      [P(4.6, -5.2), P(2.5, -9.8), P(-4, -11.2), P(-9.5, -6.5), P(-11, 1), P(-8.5, 8.5), P(-2, 10.5), P(4.5, 8.8), P(5.2, 6), P(2, 6.6), P(-1.6, 4.8), P(-2.8, -1.2), P(0.5, -6.4)],
      true,
      0.82,
    );
    il.fill(hood, spec.headwearColor);
    il.clip(hood, () => {
      il.fill(ellipse(hx - 0.8 * s, hy - 0.5 * s, 3.2 * s, 7 * s), spec.veil ?? shade(spec.headwearColor, -0.3), 0.85);
      il.fill(rect(hx - 12 * s, hy - 2 * s, 5 * s, 12 * s), shade(spec.headwearColor, -0.2), 0.6);
    });
    il.ink(smooth([P(-5, -8), P(-7, 0), P(-5, 7)], false).polylines(1)[0] ?? [], { width: 0.5 * lw, nibRatio: 0.7, bleed: false });
    il.outline(hood, { width: 0.9 * lw, nibRatio: 0.55 });
  } else if (hw === 'mitre') {
    il.figure(smooth([P(-4.5, -6.4), P(3.6, -6.8), P(4.3, -4.2), P(-1, -4.6)], true, 0.8), spec.hair, { width: 0.6 * lw, nibRatio: 0.7, bleed: false });
    // Lappets falling behind the head.
    const lappet = poly([P(-5.5, -4), P(-3.8, -4), P(-4.8, 8.5), P(-6.8, 8)]);
    il.fill(lappet, spec.headwearColor);
    il.clip(lappet, () => il.gild(rect(hx - 7 * s, hy + 5.8 * s, 4 * s, 1.1 * s)));
    il.outline(lappet, { width: 0.6 * lw, nibRatio: 0.7 });
    // The mitre itself, seen from the side: one tall peak.
    const mitre = smooth([P(4.6, -5.4), P(3.8, -11), P(0.6, -17.5), P(-3.5, -12), P(-5.8, -5.2), P(-1, -6)], true, 0.5);
    il.fill(mitre, spec.headwearColor);
    il.clip(mitre, () => {
      il.gild(poly([P(-6, -6.8), P(5, -6.8), P(5, -5), P(-6, -5)]));
      il.gild(poly([P(-1.3, -6.5), P(0.1, -6.5), P(1.2, -16.5), P(0, -16.5)]));
    });
    il.outline(mitre, { width: 0.85 * lw, nibRatio: 0.55 });
    il.gildDot(hx + 0.6 * s, hy - 17.8 * s, 0.7 * s);
  }
}

// ---- the whole figure --------------------------------------------------------------------

/**
 * Draw a robed figure about 100 x height units tall. The anchor is between the feet.
 */
export function drawRobedFigure(spec: RobedSpec, pose: Pose = 'stand', seed: number | string = spec.id, scale = ART_SCALE): IlluminatedImage {
  const W = 76;
  const H = 130;
  const il = new Illuminator(W, H, `${String(seed)}:${pose}`, scale);
  const cx = 34;
  const b = 124; // ground line
  const k = spec.height;
  const w = spec.build;
  const X = (u: number) => cx + u * w;
  const Y = (v: number) => b - v * k;
  const step = pose === 'stepA' ? 1 : pose === 'stepB' ? -1 : 0;

  // ---- feet (behind the hem) ----
  const foot = (x: number, y: number, len: number): Shape =>
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
  const footColor = spec.feet === 'bare' ? shade(spec.skin, -0.05) : spec.shoes;
  il.figure(foot(X(5 + step * 4), b, 10), footColor, FINE);
  if (spec.feet === 'bare') il.ink([[X(12 + step * 4), b - 1.6], [X(13.5 + step * 4), b - 0.4]], { width: 0.4, bleed: false, alpha: 0.6 });
  if (step === -1) il.figure(foot(X(-13), b - 0.6, 9), footColor, FINE);

  // ---- held items that pass behind the body ----
  if (spec.held === 'crozier') {
    const sx = X(21);
    const staff = rect(sx - 1.1, Y(104), 2.2, b - Y(104) - 1);
    il.gild(staff);
    il.outline(staff, { width: 0.6, nibRatio: 0.9, bleed: false });
    // The crook: a spiral of gold.
    const crook: Pt[] = [];
    for (let t = 0; t <= 1; t += 0.02) {
      const a = Math.PI * (0.5 + t * 1.75);
      const r = 6.2 * (1 - t * 0.55);
      crook.push([sx + 6 + Math.cos(a + Math.PI / 2) * -r, Y(104) - 6 + Math.sin(a + Math.PI / 2) * -r]);
    }
    il.ink(crook, { width: 2.6, nibRatio: 0.9, bleed: false, taperIn: 0, taperOut: 3 });
    il.ink([[sx, Y(104)], crook[0]!], { width: 2.6, nibRatio: 0.9, bleed: false, taperIn: 0, taperOut: 0 });
    il.gildDot(sx, Y(103), 1.8);
  }

  // ---- robe: the S-curve silhouette ----
  const hemFront = X(16 + step * 3);
  const hemBack = X(-19 + (step === -1 ? -2 : 0));
  const robe = smooth(
    [
      [X(-7), Y(80)],
      [X(-10.5), Y(69)],
      [X(-9), Y(55)],
      [X(-10.5), Y(41)],
      [X(-14.5), Y(18)],
      [hemBack, b - 2],
      [X(-9), b - 0.5],
      [X(-1), b - 2.2],
      [X(7), b - 0.2],
      [hemFront, b - 2.5],
      [X(13 + step * 1.5), Y(24)],
      [X(13.5), Y(45)],
      [X(9.5), Y(56)],
      [X(10.5), Y(68)],
      [X(8), Y(80)],
      [X(1), Y(82)],
    ],
    true,
    0.85,
  );
  const folds: Pt[][] = [
    [
      [X(-2), Y(54)],
      [X(-4), Y(35)],
      [X(-6.5), Y(14)],
      [X(-8), b - 2],
    ],
    [
      [X(3), Y(52)],
      [X(2.5), Y(33)],
      [X(0.5), Y(12)],
      [X(-1), b - 2.4],
    ],
  ];
  il.paint(robe, spec.robe, { shadow: 0.5, lit: 0.3, pool: 0.5, texture: 1, stroke: Math.PI / 2 });
  il.clip(robe, () => {
    // The back of the robe turns away into shadow: a soft-edged darker wash.
    il.softFill(
      smooth(
        [
          [X(-14), Y(82)],
          [X(-4), Y(70)],
          [X(-5), Y(50)],
          [X(-8), Y(20)],
          [X(-5), b + 2],
          [X(-25), b + 2],
        ],
        true,
        0.8,
      ),
      spec.robeShade,
      0.8,
      3,
    );
    // Shadow pooling in the hollow under the belly and at the hem.
    il.softFill(ellipse(X(6), Y(30), 3.5, 14, 0.12), shade(spec.robeShade, -0.3), 0.5, 2.5);
    il.softFill(rect(X(-22), b - 7, 42 * w, 9), shade(spec.robeShade, -0.35), 0.45, 3);
    // Folds: soft dark troughs, each with a lit ridge beside it.
    const troughs: Pt[][] = [
      [[X(-2), Y(54)], [X(-4), Y(35)], [X(-6.5), Y(14)], [X(-8), b - 2]],
      [[X(3), Y(52)], [X(2.5), Y(33)], [X(0.5), Y(12)], [X(-1), b - 2.4]],
      [[X(8), Y(40)], [X(7.5), Y(22)], [X(6.5), b - 2]],
      [[X(-7), Y(48)], [X(-9.5), Y(28)], [X(-13), b - 3]],
      [[X(11), Y(30)], [X(12), Y(14)], [X(12.5), b - 3]],
    ];
    for (const f of troughs) il.fold(smooth(f, false).polylines(1.2)[0] ?? [], shade(spec.robeShade, -0.4), 2.2, 0.55, 0.45);
    // Lead-white hatching on the lit front of the skirt and the chest.
    const lights = smooth(
      [
        [X(5), Y(52)],
        [X(12), Y(46)],
        [X(14), Y(22)],
        [X(15), b - 4],
        [X(8), b - 4],
        [X(7), Y(30)],
      ],
      true,
      0.8,
    );
    il.hatch(lights, PIGMENTS.leadWhite, -1.38, 1.45, 0.32, 0.32);
    il.hatch(ellipse(X(5), Y(72), 4, 6), PIGMENTS.leadWhite, -1.2, 1.3, 0.28, 0.28);
  });
  // Fine ink on two of the folds only; the paint carries the rest.
  for (const f of folds.slice(0, 2)) il.ink(smooth(f, false).polylines(1.2)[0] ?? [], { width: 0.5, nibRatio: 0.5, taperIn: 8, taperOut: 3, taperFloor: 0.1, alpha: 0.7 });
  il.highlight(smooth([[X(10.5), Y(44)], [X(10.8), Y(26)], [X(12.5), b - 6]], false).polylines(1)[0] ?? [], 0.9, 0.6);
  il.outline(robe, OUT);

  // ---- cope: a great cape open at the front, edged with a gold orphrey ----
  if (spec.cope) {
    const cope = smooth(
      [
        [X(4), Y(83)],
        [X(-8), Y(81)],
        [X(-13), Y(66)],
        [X(-15.5), Y(40)],
        [X(-18), Y(16)],
        [X(-6), Y(13)],
        [X(4), Y(15)],
        [X(7), Y(40)],
        [X(8.5), Y(62)],
        [X(8.8), Y(78)],
      ],
      true,
      0.85,
    );
    il.fill(cope, spec.cope);
    il.clip(cope, () => {
      il.fill(rect(X(-20), Y(84), 10 * w, 80 * k), shade(spec.cope!, -0.25), 0.7);
      for (let i = 0; i < 4; i++) {
        const fx = X(-10 + i * 4);
        il.ink([[fx, Y(70 - i * 2)], [fx - 2, Y(30)], [fx - 3, Y(15)]], { width: 0.7, nibRatio: 0.5, taperIn: 8, taperOut: 3, taperFloor: 0.15 });
      }
    });
    const band = smooth(
      [
        [X(4.4), Y(82)],
        [X(8.8), Y(78)],
        [X(8.5), Y(62)],
        [X(7), Y(40)],
        [X(4), Y(15)],
        [X(1.5), Y(15)],
        [X(4.5), Y(40)],
        [X(6), Y(62)],
        [X(6.2), Y(77)],
        [X(3.5), Y(80)],
      ],
      true,
      0.6,
    );
    il.gild(band);
    il.outline(band, { width: 0.6, nibRatio: 0.8 });
    il.outline(cope, OUT);
    // The morse: a gold clasp on the breast.
    const morse = poly([
      [X(6), Y(74)],
      [X(9), Y(71)],
      [X(6), Y(68)],
      [X(3), Y(71)],
    ]);
    il.gild(morse);
    il.outline(morse, { width: 0.6, nibRatio: 0.8 });
    il.dot(X(6), Y(71), 0.9, PIGMENTS.lapis);
  } else {
    const belt = new Shape()
      .moveTo(X(-9.5), Y(56.5))
      .cubicTo(X(-3), Y(54.5), X(4), Y(54), X(10), Y(56.5))
      .lineTo(X(9.8), Y(54.5))
      .cubicTo(X(4), Y(52), X(-3), Y(52.5), X(-9.2), Y(54.5))
      .close();
    if (spec.belt === PIGMENTS.gold) il.gilded(belt, FINE);
    else il.figure(belt, spec.belt, FINE);
  }

  // ---- things hanging from the belt ----
  if (spec.hanging.includes('inkhorn')) {
    il.ink([[X(8), Y(54)], [X(11), Y(49)]], { width: 0.5, bleed: false });
    const horn = smooth(
      [
        [X(9.5), Y(49.5)],
        [X(13.5), Y(50)],
        [X(14.5), Y(44)],
        [X(12.2), Y(39.5)],
        [X(11), Y(44)],
      ],
      true,
      0.8,
    );
    il.figure(horn, PIGMENTS.ochre, FINE);
    il.fill(ellipse(X(11.6), Y(49.6), 2.1, 0.9), PIGMENTS.lampBlack);
  }
  if (spec.hanging.includes('penknife')) {
    il.ink(smooth([[X(-6), Y(54)], [X(-7.5), Y(47)], [X(-6.5), Y(42)]], false).polylines(1)[0] ?? [], { width: 0.4, nibRatio: 1, bleed: false });
    const blade = poly([
      [X(-7.5), Y(42)],
      [X(-5.6), Y(42)],
      [X(-6.2), Y(35)],
    ]);
    il.fill(blade, PIGMENTS.silver);
    il.outline(blade, { width: 0.45, nibRatio: 1, bleed: false });
    il.fill(rect(X(-7.8), Y(44.8), 2.6, 3), PIGMENTS.umber);
  }
  if (spec.hanging.includes('keys')) {
    il.ink([[X(-5), Y(54)], [X(-6), Y(46)]], { width: 0.45, nibRatio: 1, bleed: false });
    for (const [dx, dy] of [
      [-6.5, 45],
      [-4.8, 44],
    ] as const) {
      il.outline(circle(X(dx), Y(dy), 1.4), { width: 0.6, nibRatio: 1, bleed: false });
      il.ink([[X(dx), Y(dy - 1.4)], [X(dx + 0.3), Y(dy - 6)]], { width: 0.6, nibRatio: 1, bleed: false });
    }
  }

  // ---- arm and hand ----
  const sleeveColor = spec.cope ?? spec.robe;
  const sleeve = smooth(
    [
      [X(3), Y(79)],
      [X(10), Y(76)],
      [X(11.5), Y(64)],
      [X(19), Y(66.5)],
      [X(21), Y(61)],
      [X(12), Y(57.5)],
      [X(5), Y(61)],
      [X(3), Y(70)],
    ],
    true,
    0.85,
  );
  const hand = smooth(
    [
      [X(18.5), Y(63.5)],
      [X(22.2), Y(64.2)],
      [X(23.4), Y(61.3)],
      [X(21), Y(58.8)],
      [X(18.2), Y(60)],
    ],
    true,
    0.8,
  );

  if (spec.held === 'psalter') {
    // A great psalter held at the breast, on an iron chain that loops to the waist.
    const chain: Pt[] = [];
    for (let t = 0; t <= 1; t += 0.06) chain.push([X(14 - t * 10), Y(56 - Math.sin(t * Math.PI) * 14 - t * 2)]);
    chain.forEach((p, i) => {
      if (i % 1 === 0) il.outline(ellipse(p[0], p[1], 1.25, 0.8, i * 0.9), { width: 0.55, nibRatio: 1, bleed: false });
    });
  }
  il.fill(sleeve, sleeveColor);
  il.clip(sleeve, () => il.fill(rect(X(3), Y(62), 20, 6), shade(sleeveColor, -0.22), 0.6));
  il.ink(smooth([[X(8), Y(70)], [X(9.5), Y(63)], [X(14), Y(61)]], false).polylines(1)[0] ?? [], { width: 0.6, nibRatio: 0.6, taperIn: 3 });
  il.outline(sleeve, { width: 0.95, nibRatio: 0.55 });

  if (spec.held === 'quill') {
    const q0: Pt = [X(20), Y(61)];
    const q1: Pt = [X(29), Y(86)];
    const vane = smooth(
      [
        [X(21.5), Y(66)],
        [X(27.5), Y(76)],
        [X(30.5), Y(87)],
        [X(26), Y(80)],
        [X(22.5), Y(70)],
      ],
      true,
      0.8,
    );
    il.fill(vane, PIGMENTS.leadWhite);
    il.outline(vane, { width: 0.55, nibRatio: 0.7, bleed: false });
    il.ink([q0, q1], { width: 0.55, nibRatio: 1, bleed: false });
    for (let t = 0.3; t < 0.95; t += 0.11) {
      const x = q0[0] + (q1[0] - q0[0]) * t;
      const y = q0[1] + (q1[1] - q0[1]) * t;
      il.ink([[x, y], [x + 2.4, y - 1.2]], { width: 0.3, nibRatio: 1, bleed: false, alpha: 0.6 });
    }
  } else if (spec.held === 'psalter') {
    const book = poly([
      [X(12), Y(73)],
      [X(25), Y(70)],
      [X(26.5), Y(52)],
      [X(13.5), Y(55)],
    ]);
    il.fill(book, PIGMENTS.umber);
    il.clip(book, () => {
      il.fill(poly([[X(23.5), Y(71)], [X(26.5), Y(70)], [X(28), Y(51)], [X(25), Y(52)]]), PIGMENTS.vellumShade);
    });
    il.outline(book, { width: 0.95, nibRatio: 0.55 });
    for (const [dx, dy] of [
      [14.5, 70],
      [23.5, 67.5],
      [15, 57],
      [24.3, 55],
      [19.3, 63],
    ] as const)
      il.gildDot(X(dx), Y(dy), 1.05);
    il.ink([[X(25.6), Y(64)], [X(28), Y(63.6)]], { width: 1, nibRatio: 0.8, bleed: false });
  } else if (spec.held === 'pumice') {
    const stone = smooth(
      [
        [X(21), Y(66)],
        [X(25.5), Y(65.5)],
        [X(26.5), Y(61)],
        [X(24), Y(58)],
        [X(20.5), Y(59.5)],
      ],
      true,
      0.7,
    );
    il.figure(stone, '#BDB8AE', { width: 0.7, nibRatio: 0.7, bleed: false });
    for (const [dx, dy] of [
      [23, 63],
      [24.8, 61],
      [22.2, 60.6],
      [25.2, 63.6],
    ] as const)
      il.dot(X(dx), Y(dy), 0.45, '#7B776F');
  }
  il.figure(hand, spec.skin, FINE);
  if (spec.id === 'isot') {
    // Ink-stained fingertips: vermilion and black.
    il.dot(X(22.6), Y(62.3), 0.7, PIGMENTS.vermilion, 0.9);
    il.dot(X(21.8), Y(60.1), 0.55, PIGMENTS.lampBlack, 0.8);
  }

  // ---- head ----
  drawHead(il, spec, X(3.5), Y(90), 1, 'neutral');
  il.anchor = [cx, b];
  return il.finish();
}

// ---- portraits ---------------------------------------------------------------------------

/** Ground colour of each speaker's portrait frame. */
const PORTRAIT_GROUND: Record<string, string> = {
  isot: PIGMENTS.lapis,
  hild: PIGMENTS.folium,
  aumery: PIGMENTS.vermilion,
  brother: PIGMENTS.slate,
  scribe: PIGMENTS.verdigris,
};

/**
 * A head-and-shoulders portrait in a gilded quatrefoil, for the dialogue box.
 * About 132 units square, anchored at its top-left.
 */
export function drawPortrait(spec: RobedSpec, mood: Mood = 'neutral'): IlluminatedImage {
  const S = 132;
  const il = new Illuminator(S, S, `portrait:${spec.id}:${mood}`);
  const c = S / 2;
  const lobes = new Shape();
  const r = S * 0.25;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    lobes.add(circle(c + Math.cos(a) * r * 0.95, c + Math.sin(a) * r * 0.95, r));
  }
  const square = rect(c - r * 1.15, c - r * 1.15, r * 2.3, r * 2.3);
  const outerLobes = new Shape();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    outerLobes.add(circle(c + Math.cos(a) * r * 0.95, c + Math.sin(a) * r * 0.95, r + 4.5));
  }
  const outerSquare = rect(c - r * 1.15 - 4.5, c - r * 1.15 - 4.5, r * 2.3 + 9, r * 2.3 + 9);
  // Outline first, then fill: the fill erases the ink inside the union, so only the
  // outer edge of each overlapping lobe stays inked.
  il.outline(outerLobes, { width: 2.2, nibRatio: 0.6 });
  il.outline(outerSquare, { width: 2.2, nibRatio: 0.6 });
  il.gild(outerLobes);
  il.gild(outerSquare);
  il.outline(lobes, { width: 1.8, nibRatio: 0.6 });
  il.outline(square, { width: 1.8, nibRatio: 0.6 });
  const ground = PORTRAIT_GROUND[spec.id] ?? PIGMENTS.lapis;
  il.fill(lobes, ground);
  il.fill(square, ground);
  // A diaper of fine gold dots on the ground.
  const inside = new Shape().add(lobes).add(square);
  il.clip(inside, () => {
    for (let y = 6, row = 0; y < S; y += 9, row++) {
      for (let x = 6 + (row % 2) * 4.5; x < S; x += 9) il.dot(x, y, 0.8, PIGMENTS.goldLight, 0.55);
    }
    // Shoulders and robe.
    const sh = smooth(
      [
        [c - 46, S + 4],
        [c - 40, c + 34],
        [c - 18, c + 22],
        [c + 12, c + 22],
        [c + 36, c + 34],
        [c + 44, S + 4],
      ],
      true,
      0.8,
    );
    il.fill(sh, spec.cope ?? spec.robe);
    il.clip(sh, () => il.fill(rect(c - 50, c + 20, 30, 60), spec.cope ? shade(spec.cope, -0.25) : spec.robeShade, 0.8));
    il.outline(sh, { width: 1.3, nibRatio: 0.5 });
    if (spec.cope) {
      il.gild(poly([[c + 2, c + 22], [c + 12, c + 22], [c + 20, S + 4], [c + 9, S + 4]]));
      il.outline(poly([[c + 2, c + 22], [c + 12, c + 22], [c + 20, S + 4], [c + 9, S + 4]]), { width: 0.8, nibRatio: 0.7 });
    }
    drawHead(il, spec, c + 2, c - 6, 4.6, mood);
  });
  il.anchor = [0, 0];
  return il.finish();
}
