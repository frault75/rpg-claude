/**
 * Chibi characters in the tradition of the 16-bit RPGs: a big head, expressive eyes, a
 * short body, four facing directions, a breathing idle and a four-step walk. Each part is
 * drawn from a hue-shifted ramp with light from the upper left, then the whole figure gets
 * a selective outline. Frames are 24 x 32 pixels with the feet on the bottom row.
 */

import { hex, PixelImage, ramp } from './pixel';

export const FRAME_W = 24;
export const FRAME_H = 32;

export type Dir = 'down' | 'up' | 'left' | 'right';
export type Headwear = 'kerchief' | 'wimple' | 'helm' | 'mitre' | 'hood' | 'none';
export type Held = 'quill' | 'book' | 'lance' | 'crozier' | 'stone' | 'none';

export interface CharSpec {
  id: string;
  skin: string;
  hair: string;
  eyes: string;
  headwear: Headwear;
  headwearColor: string;
  /** Veil over a wimple, or the dark inside of a hood. */
  veil?: string;
  robe: string;
  belt?: string;
  /** A cope or cloak behind the body, with a gold edge. */
  cape?: string;
  /** Mail sleeves and a surcoat instead of a robe's sleeves. */
  armour?: boolean;
  held: Held;
  shield?: string;
  /** Grey marks of the plague on the cheek. */
  marks?: boolean;
}

export const CHARACTERS: Record<string, CharSpec> = {
  isot: { id: 'isot', skin: '#F2C9A8', hair: '#3E2620', eyes: '#2B3A6B', headwear: 'kerchief', headwearColor: '#F4EEE0', robe: '#3F6FC4', belt: '#7A4A2A', held: 'quill' },
  hild: { id: 'hild', skin: '#E8C6B0', hair: '#8A8178', eyes: '#3C4A3A', headwear: 'wimple', headwearColor: '#F2EDE2', veil: '#3B3540', robe: '#8C8577', belt: '#4E443A', held: 'book', marks: true },
  whit: { id: 'whit', skin: '#E9CFB8', hair: '#C9CED6', eyes: '#1A1C22', headwear: 'helm', headwearColor: '#B9C2CE', robe: '#E6DFD0', belt: '#9C8A5A', armour: true, held: 'lance', shield: '#DCE3EC' },
  aumery: { id: 'aumery', skin: '#EFCDB2', hair: '#A89A8A', eyes: '#3A2A22', headwear: 'mitre', headwearColor: '#F6F1E6', robe: '#F2EDE2', cape: '#B8322A', held: 'crozier' },
  brother: { id: 'brother', skin: '#D9B497', hair: '#4A3B2E', eyes: '#1A1410', headwear: 'hood', headwearColor: '#6C6E78', veil: '#33343C', robe: '#6C6E78', belt: '#2E2A26', held: 'stone' },
  scribe: { id: 'scribe', skin: '#E2BFA2', hair: '#5A4030', eyes: '#2A1E16', headwear: 'hood', headwearColor: '#6A4A36', veil: '#2E2018', robe: '#6A4A36', belt: '#3A2A20', held: 'none' },
};

export interface Pose {
  /** Whole-figure vertical offset: -1 lifts it (mid-step), +1 sinks it (breath out). */
  bob: number;
  /** Which foot leads: -1 left, 0 together, 1 right. */
  step: number;
}

const GOLD = ramp('#D9A52E', 4);
const SILVER = ramp('#AEB6C2', 5);
const MAIL = ramp('#7E8794', 4);
const WOOD = ramp('#7A4E2E', 4);

/** Shade across a shape: light on the left of the figure, dark on the right. */
function sideLight(x: number, x0: number, x1: number): number {
  const t = (x - x0) / Math.max(1, x1 - x0);
  return t < 0.18 ? 3 : t < 0.62 ? 2 : t < 0.85 ? 1 : 0;
}

function drawFrontBack(img: PixelImage, s: CharSpec, dir: 'down' | 'up', p: Pose): void {
  const front = dir === 'down';
  const by = p.bob;
  const skin = ramp(s.skin, 5);
  const robe = ramp(s.robe, 5);
  const hw = ramp(s.headwearColor, 5);
  const hair = ramp(s.hair, 4);

  // ---- behind the body ----
  if (s.cape) {
    const cape = ramp(s.cape, 5);
    img.poly(
      [
        [6, 16 + by],
        [18, 16 + by],
        [19.5, 29],
        [4.5, 29],
      ],
      (x, y) => cape[Math.min(4, sideLight(x, 5, 19) + (y > 26 ? -1 : 0) + 1)] ?? cape[1]!,
    );
  }
  if (s.headwear === 'wimple' && s.veil) {
    const veil = ramp(s.veil, 4);
    img.poly(
      [
        [5, 7 + by],
        [19, 7 + by],
        [19.5, 21 + by],
        [4.5, 21 + by],
      ],
      (x) => veil[Math.min(3, sideLight(x, 5, 19))]!,
    );
  }
  if (!front && s.shield) {
    // Carried on the back when seen from behind.
    const sh = ramp(s.shield, 5);
    img.poly(
      [
        [7, 15 + by],
        [17, 15 + by],
        [17, 22 + by],
        [12, 27 + by],
        [7, 22 + by],
      ],
      (x) => sh[sideLight(x, 7, 17) + 1]!,
    );
  }
  if (s.held === 'lance' && !front) img.vline(5, 1 + by, 30, WOOD[1]!);
  if (s.held === 'crozier' && !front) img.vline(4, 8 + by, 30, GOLD[1]!);

  // ---- feet ----
  const shoe = s.armour ? SILVER : ramp('#3A2E2A', 3);
  const lf = p.step < 0 ? 0 : p.step > 0 ? -1 : 0;
  const rf = p.step > 0 ? 0 : p.step < 0 ? -1 : 0;
  img.rect(8, 29 + lf, 3, 2 - lf, shoe[1]!);
  img.rect(13, 29 + rf, 3, 2 - rf, shoe[0]!);

  // ---- body ----
  const hem = 29;
  const top = 16 + by;
  img.poly(
    [
      [7.5, top],
      [16.5, top],
      [18, hem],
      [6, hem],
    ],
    (x, y) => {
      let t = sideLight(x, 6, 18);
      if (y >= hem - 1) t = Math.max(0, t - 1);
      return robe[t + (t > 1 ? 1 : 0)] ?? robe[2]!;
    },
  );
  // Folds of the robe.
  for (const [fx, f0] of [
    [12, 21],
    [9, 24],
    [15, 23],
  ] as const)
    for (let y = f0 + by; y < hem; y++) img.tint(fx, y, robe[1]!);
  if (s.armour) {
    // A white surcoat over mail: mail shows at the shoulders.
    img.rect(7, top, 10, 2, MAIL[2]!);
    img.rect(7, top + 2, 1, 1, MAIL[1]!);
    img.rect(16, top + 2, 1, 1, MAIL[1]!);
  }
  if (s.cape && front) {
    // The cope's gold orphreys running down the front.
    for (let y = top; y < hem; y++) {
      img.set(8, y, GOLD[2]!);
      img.set(15, y, GOLD[1]!);
    }
    img.rect(10, top + 1, 4, 2, GOLD[2]!);
    img.set(11, top + 1, hex('#3A5BB5'));
  }
  if (s.belt) {
    const belt = ramp(s.belt, 3);
    img.hline(7, 16, 22 + by, belt[1]!);
    img.set(7, 22 + by, belt[2]!);
    if (front && s.id === 'isot') {
      // Inkhorn and penknife at the belt.
      img.rect(15, 23 + by, 2, 3, hex('#C99A4A'));
      img.set(15, 23 + by, hex('#2A1C14'));
      img.vline(9, 23 + by, 25 + by, hex('#B9BDC2'));
    }
  }

  // ---- arms ----
  const sleeve = s.armour ? MAIL : robe;
  const swing = p.step;
  const armL = 23 + by - (front ? swing : -swing);
  const armR = 23 + by + (front ? swing : -swing);
  img.rect(5, 17 + by, 2, armL - 17 - by, sleeve[s.armour ? 2 : 3]!);
  img.rect(17, 17 + by, 2, armR - 17 - by, sleeve[1]!);
  img.rect(5, armL, 2, 2, skin[3]!);
  img.rect(17, armR, 2, 2, skin[2]!);

  // ---- held things in front ----
  if (front) {
    if (s.held === 'book') {
      const b = ramp('#6E3E24', 4);
      img.rect(8, 18 + by, 8, 6, b[1]!);
      img.rect(8, 18 + by, 8, 1, b[2]!);
      img.rect(14, 18 + by, 2, 6, b[0]!);
      for (const [x, y] of [
        [8, 18],
        [15, 18],
        [8, 23],
        [15, 23],
      ] as const)
        img.set(x, y + by, GOLD[2]!);
      // The chain looping down to the belt.
      for (const [x, y] of [
        [9, 24],
        [10, 25],
        [11, 26],
        [12, 26],
        [13, 25],
      ] as const)
        img.set(x, y + by, MAIL[2]!);
      img.rect(5, 20 + by, 3, 2, skin[3]!);
      img.rect(16, 20 + by, 3, 2, skin[2]!);
    } else if (s.held === 'quill') {
      img.line(19, armR, 21, armR - 6, hex('#F6F1E6'));
      img.set(22, armR - 7, hex('#E9E2D2'));
      img.set(20, armR - 3, hex('#C9C2B4'));
    } else if (s.held === 'lance') {
      img.vline(19, 1 + by, 30, WOOD[2]!);
      img.vline(20, 1 + by, 30, WOOD[0]!);
      img.poly(
        [
          [19, 0 + by],
          [20.5, -2 + by],
          [21, 0 + by],
        ],
        SILVER[3]!,
      );
      // A blank pennon.
      img.poly(
        [
          [21, 2 + by],
          [24, 3.5 + by],
          [21, 5 + by],
        ],
        hex('#F6F3EC'),
      );
    } else if (s.held === 'crozier') {
      img.vline(20, 6 + by, 30, GOLD[2]!);
      img.vline(21, 6 + by, 30, GOLD[0]!);
      for (const [x, y] of [
        [20, 5],
        [20, 4],
        [21, 3],
        [22, 3],
        [23, 4],
        [23, 5],
        [22, 6],
      ] as const)
        img.set(x, y + by, GOLD[3]!);
    } else if (s.held === 'stone') {
      img.rect(17, armR + 1, 3, 2, hex('#BDB8AE'));
      img.set(18, armR + 1, hex('#8C877E'));
    }
    if (s.shield) {
      const sh = ramp(s.shield, 5);
      img.poly(
        [
          [1, 18 + by],
          [7, 18 + by],
          [7, 23 + by],
          [4, 27 + by],
          [1, 23 + by],
        ],
        (x) => sh[sideLight(x, 1, 7) + 1]!,
      );
      img.hline(1, 6, 18 + by, SILVER[4]!);
      img.vline(1, 18 + by, 23 + by, SILVER[3]!);
      img.vline(6, 19 + by, 23 + by, SILVER[1]!);
    }
  }

  // ---- head ----
  const hx = 12;
  const hy = 10 + by;
  img.ellipse(hx, hy, 5.9, 5.8, (x) => skin[Math.min(4, sideLight(x, 6, 18) + 1)]!);
  if (front) {
    // Eyes: two dark drops with a catch-light, the blush below, a small mouth.
    const eye = hex(s.eyes);
    const deep = hex('#14100E');
    const ey = hy;
    for (const ex of [8, 14]) {
      img.set(ex, ey, hex('#FFFFFF'));
      img.set(ex + 1, ey, eye);
      img.set(ex, ey + 1, deep);
      img.set(ex + 1, ey + 1, deep);
    }
    img.set(7, ey + 2, hex('#E9898A', 210));
    img.set(16, ey + 2, hex('#E9898A', 210));
    img.set(11, ey + 3, hex('#B0605A'));
    img.set(12, ey + 3, hex('#B0605A'));
    if (s.marks) {
      img.set(16, ey + 1, hex('#8C8A8A'));
      img.set(15, ey + 3, hex('#8C8A8A'));
    }
  }

  // ---- hair and headwear ----
  const hwT = (x: number) => hw[Math.min(4, sideLight(x, 6, 18) + 1)]!;
  switch (s.headwear) {
    case 'kerchief': {
      // Dark bobbed hair under a linen kerchief knotted at the back.
      const hairT = (x: number) => hair[Math.min(3, sideLight(x, 6, 18) + 1)]!;
      if (front) {
        img.ellipse(hx, hy - 1.5, 6.5, 5.4, (x, y) => (y < hy - 2 ? hairT(x) : null));
        img.rect(5, hy - 3, 2, 7, hair[2]!);
        img.rect(17, hy - 3, 2, 7, hair[0]!);
        for (const x of [8, 10, 13, 15]) img.set(x, hy - 2, hair[1]!);
        img.hline(7, 16, hy - 5, hw[3]!);
        img.hline(6, 17, hy - 4, hw[2]!);
        img.set(18, hy - 4, hw[1]!);
        img.set(18, hy - 3, hw[1]!);
      } else {
        img.ellipse(hx, hy, 6.5, 6.2, (x) => hairT(x));
        img.hline(6, 17, hy - 4, hw[2]!);
        img.rect(11, hy - 4, 3, 2, hw[3]!);
        img.set(11, hy - 2, hw[1]!);
        img.set(13, hy - 1, hw[1]!);
      }
      break;
    }
    case 'wimple':
      if (front) {
        img.ellipse(hx, hy, 6.4, 6.6, (x, y, nx, ny) => (nx * nx * 1.9 + ny * ny * 1.5 > 1 || y < hy - 3 ? hwT(x) : null));
        img.hline(6, 17, hy - 5, ramp(s.veil ?? '#333333', 3)[1]!);
        img.hline(7, 16, hy - 6, ramp(s.veil ?? '#333333', 3)[1]!);
      } else {
        img.ellipse(hx, hy, 6.4, 6.4, (x) => ramp(s.veil ?? '#333333', 4)[Math.min(3, sideLight(x, 6, 18))]!);
      }
      break;
    case 'helm': {
      const helm = SILVER;
      img.poly(
        [
          [6, hy - 6],
          [18, hy - 6],
          [18.5, hy + 6],
          [5.5, hy + 6],
        ],
        (x) => helm[Math.min(4, sideLight(x, 6, 18) + 1)]!,
      );
      img.hline(7, 17, hy - 6, helm[4]!);
      if (front) {
        // The eye slit and breathing holes; no face to be seen.
        img.hline(7, 16, hy - 1, hex('#14161C'));
        img.hline(8, 15, hy, hex('#2A2E36'));
        for (const x of [13, 15]) for (const y of [hy + 2, hy + 4]) img.set(x, y, hex('#3A3E48'));
        img.vline(12, hy - 6, hy - 2, helm[1]!);
      } else img.vline(12, hy - 6, hy + 5, helm[1]!);
      break;
    }
    case 'mitre': {
      if (!front) img.ellipse(hx, hy, 6.1, 6, (x) => hair[Math.min(3, sideLight(x, 6, 18))]!);
      img.rect(6, hy - 3, 2, 4, hair[2]!);
      img.rect(16, hy - 3, 2, 4, hair[1]!);
      const m = hw;
      img.poly(
        [
          [6.5, hy - 3],
          [17.5, hy - 3],
          [17, hy - 8],
          [12, hy - 13],
          [7, hy - 8],
        ],
        (x) => m[Math.min(4, sideLight(x, 6, 18) + 1)]!,
      );
      img.hline(7, 17, hy - 4, GOLD[2]!);
      img.vline(12, hy - 12, hy - 4, GOLD[1]!);
      img.set(12, hy - 14, GOLD[3]!);
      break;
    }
    case 'hood':
      if (front) {
        img.ellipse(hx, hy - 0.5, 6.6, 6.6, (x, y, nx, ny) => (nx * nx * 2.2 + ny * ny * 1.3 > 1 || y < hy - 3 ? hwT(x) : null));
        // The face sits in shadow under the hood.
        for (let y = hy - 3; y <= hy + 1; y++) for (let x = 8; x <= 15; x++) img.tint(x, y, [40, 30, 36, 90]);
      } else img.ellipse(hx, hy, 6.6, 6.6, (x) => hwT(x));
      img.poly(
        [
          [10, hy - 6],
          [14, hy - 6],
          [12, hy - 8],
        ],
        hw[2]!,
      );
      break;
    case 'none':
      img.ellipse(hx, hy - 2, 6.2, 4.4, (x, y) => (y < hy - 1 ? hair[Math.min(3, sideLight(x, 6, 18))]! : null));
      break;
  }
}

function drawSide(img: PixelImage, s: CharSpec, p: Pose): void {
  // Facing left; the right-facing frame is this one mirrored.
  const by = p.bob;
  const skin = ramp(s.skin, 5);
  const robe = ramp(s.robe, 5);
  const hw = ramp(s.headwearColor, 5);
  const hair = ramp(s.hair, 4);
  const lit = (x: number) => (x < 10 ? 3 : x < 14 ? 2 : 1);

  if (s.cape) {
    const cape = ramp(s.cape, 5);
    img.poly(
      [
        [11, 16 + by],
        [17, 17 + by],
        [19, 29],
        [11, 29],
      ],
      (x) => cape[lit(x)]!,
    );
  }
  if (s.headwear === 'wimple' && s.veil) img.poly([[13, 6 + by], [18, 8 + by], [17, 21 + by], [13, 20 + by]], ramp(s.veil, 4)[1]!);
  if (s.shield) {
    const sh = ramp(s.shield, 5);
    img.poly([[13, 16 + by], [19, 16 + by], [19, 23 + by], [16, 27 + by], [13, 23 + by]], sh[1]!);
  }
  // Feet: one forward, one back.
  const shoe = s.armour ? SILVER : ramp('#3A2E2A', 3);
  const fwd = p.step !== 0 ? 2 : 0;
  img.rect(8 - fwd, 29, 4, 2, shoe[1]!);
  img.rect(12 + fwd, 29, 3, 2, shoe[0]!);
  // Body.
  img.poly(
    [
      [9, 16 + by],
      [15, 16 + by],
      [17, 29],
      [7, 29],
    ],
    (x, y) => robe[Math.max(0, lit(x) + (y >= 28 ? -1 : 0))]!,
  );
  for (let y = 21 + by; y < 29; y++) img.tint(13, y, robe[1]!);
  if (s.armour) img.rect(9, 16 + by, 6, 2, MAIL[2]!);
  if (s.belt) img.hline(8, 15, 22 + by, ramp(s.belt, 3)[1]!);
  // The near arm, swinging with the step.
  const sleeve = s.armour ? MAIL : robe;
  const swing = p.step * 2;
  img.poly(
    [
      [10, 17 + by],
      [13, 17 + by],
      [12 + swing * 0.5, 23 + by],
      [10 + swing * 0.5, 23 + by],
    ],
    sleeve[3]!,
  );
  img.rect(10 + swing * 0.5, 23 + by, 2, 2, skin[3]!);
  if (s.held === 'book') {
    const b = ramp('#6E3E24', 4);
    img.rect(6, 18 + by, 4, 6, b[1]!);
    img.vline(6, 18 + by, 23 + by, GOLD[2]!);
  } else if (s.held === 'quill') {
    img.line(9 + swing * 0.5, 23 + by, 6 + swing * 0.5, 17 + by, hex('#F6F1E6'));
  } else if (s.held === 'lance') {
    img.vline(7, 0 + by, 30, WOOD[2]!);
    img.poly([[6, 2 + by], [3, 3.5 + by], [6, 5 + by]], hex('#F6F3EC'));
  } else if (s.held === 'crozier') {
    img.vline(6, 6 + by, 30, GOLD[2]!);
    for (const [x, y] of [[6, 5], [5, 4], [4, 4], [3, 5], [3, 6]] as const) img.set(x, y + by, GOLD[3]!);
  }
  // Head, looking left.
  const hx = 11;
  const hy = 10 + by;
  img.ellipse(hx, hy, 5.6, 5.8, (x) => skin[x < 9 ? 4 : x < 13 ? 3 : 2]!);
  if (s.headwear !== 'helm') {
    img.set(5, hy + 1, skin[3]!); // nose
    img.set(8, hy, hex(s.eyes));
    img.set(8, hy + 1, hex('#14100E'));
    img.set(9, hy + 2, hex('#E9898A', 200));
    img.set(7, hy + 3, hex('#B0605A'));
    if (s.marks) img.set(10, hy + 2, hex('#8C8A8A'));
  }
  switch (s.headwear) {
    case 'kerchief':
      img.ellipse(hx + 1, hy - 1, 6, 5.6, (x, y) => (x > 10 || y < hy - 2 ? hair[x < 12 ? 2 : 1]! : null));
      img.rect(13, hy - 2, 4, 5, hair[1]!);
      img.set(7, hy - 2, hair[2]!);
      img.hline(6, 16, hy - 4, hw[2]!);
      img.rect(16, hy - 4, 2, 2, hw[3]!);
      img.set(18, hy - 3, hw[1]!);
      break;
    case 'wimple':
      img.ellipse(hx + 1, hy, 6, 6.4, (x, y) => (x > 9 || y < hy - 3 || y > hy + 3 ? hw[x < 12 ? 3 : 2]! : null));
      img.hline(7, 16, hy - 5, ramp(s.veil ?? '#333333', 3)[1]!);
      break;
    case 'helm':
      img.poly([[5, hy - 6], [17, hy - 6], [17.5, hy + 6], [5, hy + 6]], (x) => SILVER[x < 9 ? 4 : x < 13 ? 3 : 2]!);
      img.hline(5, 10, hy - 1, hex('#14161C'));
      for (const y of [hy + 2, hy + 4]) img.set(7, y, hex('#3A3E48'));
      break;
    case 'mitre':
      img.rect(12, hy - 3, 5, 5, hair[1]!);
      img.poly([[7, hy - 3], [16, hy - 3], [14, hy - 9], [11, hy - 13], [8, hy - 8]], hw[3]!);
      img.hline(7, 16, hy - 4, GOLD[2]!);
      break;
    case 'hood':
      img.ellipse(hx + 1, hy - 0.5, 6.4, 6.6, (x, y) => (x > 8 || y < hy - 3 ? hw[x < 12 ? 3 : 2]! : null));
      for (let y = hy - 2; y <= hy + 2; y++) for (let x = 6; x <= 9; x++) img.tint(x, y, [40, 30, 36, 90]);
      break;
    case 'none':
      img.ellipse(hx + 1, hy - 2, 6, 4.6, (x, y) => (y < hy - 1 || x > 13 ? hair[2]! : null));
      break;
  }
}

/** Draw one frame of a character. */
export function drawCharacter(s: CharSpec, dir: Dir, pose: Pose): PixelImage {
  const img = new PixelImage(FRAME_W, FRAME_H);
  if (dir === 'down' || dir === 'up') drawFrontBack(img, s, dir, pose);
  else drawSide(img, s, pose);
  img.outline(null);
  if (dir === 'right') {
    const m = new PixelImage(FRAME_W, FRAME_H);
    m.blit(img, 0, 0, true);
    return m;
  }
  return img;
}

/** Frame order in a sheet row: two idle frames, then the four walk frames. */
export const FRAMES: readonly Pose[] = [
  { bob: 0, step: 0 },
  { bob: 1, step: 0 },
  { bob: 0, step: 0 },
  { bob: -1, step: -1 },
  { bob: 0, step: 0 },
  { bob: -1, step: 1 },
];
export const DIRS: readonly Dir[] = ['down', 'up', 'left', 'right'];

/** A sprite sheet: one row per direction, one column per frame. */
export function characterSheet(s: CharSpec): PixelImage {
  const sheet = new PixelImage(FRAME_W * FRAMES.length, FRAME_H * DIRS.length);
  DIRS.forEach((d, row) => FRAMES.forEach((p, col) => sheet.blit(drawCharacter(s, d, p), col * FRAME_W, row * FRAME_H)));
  return sheet;
}
