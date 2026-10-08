/**
 * Characters in the proportions of the HD-2D games: about four heads tall in 32 x 48
 * frames, small faces, cloth that falls in folds, light from the upper left. Four facing
 * directions, a four-frame breathing idle and a six-frame walk. The right-facing frames
 * mirror the left. The feet stand on the bottom row.
 */

import { hex, PixelImage, type RGBA, ramp } from './pixel';

export const FRAME_W = 32;
export const FRAME_H = 48;

export type Dir = 'down' | 'up' | 'left' | 'right';
export type Headwear = 'kerchief' | 'wimple' | 'helm' | 'mitre' | 'hood' | 'cap' | 'tallhat' | 'none';
export type Held = 'quill' | 'book' | 'lance' | 'crozier' | 'stone' | 'sword' | 'bottle' | 'spade' | 'broom' | 'bow' | 'none';

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
  /** Mail and a surcoat to the knee instead of a long robe. */
  armour?: boolean;
  held: Held;
  shield?: string;
  /** Grey marks of the plague on the cheek. */
  marks?: boolean;
  /** A mummer's paper mask over the face (its colour). */
  mask?: string;
  /** A cross on the chest (Saint George's red cross). */
  cross?: string;
  /** Drawn smaller (children). */
  scale?: number;
}

export const CHARACTERS: Record<string, CharSpec> = {
  isot: { id: 'isot', skin: '#F2C9A8', hair: '#3E2620', eyes: '#2B3A6B', headwear: 'kerchief', headwearColor: '#F4EEE0', robe: '#3F6FC4', belt: '#7A4A2A', held: 'quill' },
  hild: { id: 'hild', skin: '#E8C6B0', hair: '#8A8178', eyes: '#3C4A3A', headwear: 'wimple', headwearColor: '#F2EDE2', veil: '#3B3540', robe: '#8C8577', belt: '#4E443A', held: 'book', marks: true },
  whit: { id: 'whit', skin: '#E9CFB8', hair: '#C9CED6', eyes: '#1A1C22', headwear: 'helm', headwearColor: '#B9C2CE', robe: '#E6DFD0', belt: '#9C8A5A', armour: true, held: 'lance', shield: '#DCE3EC' },
  aumery: { id: 'aumery', skin: '#EFCDB2', hair: '#A89A8A', eyes: '#3A2A22', headwear: 'mitre', headwearColor: '#F6F1E6', robe: '#F2EDE2', cape: '#B8322A', held: 'crozier' },
  brother: { id: 'brother', skin: '#D9B497', hair: '#4A3B2E', eyes: '#1A1410', headwear: 'hood', headwearColor: '#6C6E78', veil: '#33343C', robe: '#6C6E78', belt: '#2E2A26', held: 'stone' },
  scribe: { id: 'scribe', skin: '#E2BFA2', hair: '#5A4030', eyes: '#2A1E16', headwear: 'hood', headwearColor: '#6A4A36', veil: '#2E2018', robe: '#6A4A36', belt: '#3A2A20', held: 'none' },
  // Lychford.
  george: { id: 'george', skin: '#E8C2A0', hair: '#6A4A2A', eyes: '#2A1E16', headwear: 'helm', headwearColor: '#C8CCD4', robe: '#F2EDE2', belt: '#7A4A2A', armour: true, held: 'sword', cross: '#C83A2E', mask: '#F4ECD8' },
  slasher: { id: 'slasher', skin: '#E2BC98', hair: '#3A2A1E', eyes: '#2A1E16', headwear: 'cap', headwearColor: '#5A3A6A', robe: '#7A3A2E', belt: '#3A2A20', held: 'sword', mask: '#E8D8B8' },
  doctor: { id: 'doctor', skin: '#E8C8AA', hair: '#8A8A8A', eyes: '#2A1E16', headwear: 'tallhat', headwearColor: '#2A2A34', robe: '#3A3A4A', cape: '#2A2A34', belt: '#6A4A2A', held: 'bottle', mask: '#F4ECD8' },
  dunstan: { id: 'dunstan', skin: '#D8B090', hair: '#BCB4A8', eyes: '#2A2018', headwear: 'cap', headwearColor: '#5A4A3A', robe: '#6A5A42', belt: '#3A2A20', held: 'spade' },
  amabel: { id: 'amabel', skin: '#E4CDBE', hair: '#D8D0C8', eyes: '#4A4A50', headwear: 'kerchief', headwearColor: '#C8B8A8', robe: '#8A6A6A', belt: '#4A3A30', held: 'none', marks: true },
  villager: { id: 'villager', skin: '#E0BA96', hair: '#5A3A22', eyes: '#2A1E16', headwear: 'cap', headwearColor: '#6A4A2A', robe: '#7A6A3A', belt: '#4A3A20', held: 'none' },
  goodwife: { id: 'goodwife', skin: '#EAC8AA', hair: '#7A4A2A', eyes: '#2A3A4A', headwear: 'kerchief', headwearColor: '#E8DCC8', robe: '#A63A4C', belt: '#5A3A2A', held: 'none' },
  child: { id: 'child', skin: '#F0CCAC', hair: '#B87A3A', eyes: '#2A3A5A', headwear: 'none', headwearColor: '#000000', robe: '#DA6A32', belt: '#6C4B2D', held: 'none', scale: 0.78 },
  child2: { id: 'child2', skin: '#E8C0A0', hair: '#3A2A1E', eyes: '#2A1E16', headwear: 'cap', headwearColor: '#2E8B74', robe: '#BC8D42', belt: '#6C4B2D', held: 'broom', scale: 0.78 },
  eadgyth: { id: 'eadgyth', skin: '#E8C6A8', hair: '#A8462A', eyes: '#2A4A3A', headwear: 'none', headwearColor: '#000000', robe: '#2E5A3A', cape: '#4A3A2A', belt: '#6A4A2A', held: 'bow' },
};

export interface Pose {
  /** Whole-body vertical offset: -1 lifts (mid-stride), +1 sinks. */
  bob: number;
  /** -1..1: which foot is forward and how far. */
  step: number;
  /** Shoulders rise with the breath: 0 or 1. */
  breath: number;
}

export const IDLE_FRAMES = 4;
export const WALK_FRAMES = 6;

/** Frame order in a sheet row: the idle frames, then the walk. */
export const FRAMES: readonly Pose[] = [
  { bob: 0, step: 0, breath: 0 },
  { bob: 0, step: 0, breath: 1 },
  { bob: 0, step: 0, breath: 1 },
  { bob: 0, step: 0, breath: 0 },
  ...Array.from({ length: WALK_FRAMES }, (_, k) => {
    const a = (k / WALK_FRAMES) * Math.PI * 2;
    const s = Math.sin(a);
    return { bob: Math.abs(s) < 0.5 ? -1 : 0, step: Math.round(s * 2) / 2, breath: 0 };
  }),
];

export const DIRS: readonly Dir[] = ['down', 'up', 'left', 'right'];

const GOLD = ramp('#D9A52E', 5);
const SILVER = ramp('#AEB6C2', 6);
const MAIL = ramp('#7E8794', 5);
const WOOD = ramp('#7A4E2E', 4);

/** Tone index across a body from x0 to x1: lit on the left, shaded on the right. */
function lit(x: number, x0: number, x1: number, n = 5): number {
  const t = (x + 0.5 - x0) / Math.max(1, x1 - x0);
  const k = t < 0.16 ? 4 : t < 0.42 ? 3 : t < 0.7 ? 2 : t < 0.88 ? 1 : 0;
  return Math.min(n - 1, k);
}

/** A tapering body shape: half-widths at its top and bottom, centred on cx. */
function trapezoid(img: PixelImage, cx: number, y0: number, y1: number, w0: number, w1: number, color: (x: number, y: number, x0: number, x1: number) => RGBA | null, shift = 0): void {
  for (let y = Math.floor(y0); y < y1; y++) {
    const t = (y - y0) / Math.max(1, y1 - y0);
    const hw = w0 + (w1 - w0) * t;
    const c = cx + shift * t;
    const x0 = Math.round(c - hw);
    const x1 = Math.round(c + hw);
    for (let x = x0; x < x1; x++) {
      const col = color(x, y, x0, x1);
      if (col) img.set(x, y, col);
    }
  }
}

function drawFront(img: PixelImage, s: CharSpec, front: boolean, p: Pose): void {
  const skin = ramp(s.skin, 5);
  const robe = ramp(s.robe, 5);
  const hw = ramp(s.headwearColor, 5);
  const hair = ramp(s.hair, 5);
  const cx = 16;
  const by = p.bob;
  const sh = 17 + by - p.breath; // shoulder line
  const hem = 44;

  // ---- behind the body ----
  if (s.cape) {
    const cape = ramp(s.cape, 5);
    trapezoid(img, cx, sh - 1, 45, 6.5, 10, (x, y, x0, x1) => cape[Math.max(0, lit(x, x0, x1) - (y > 42 ? 1 : 0))]!);
  }
  if (s.headwear === 'wimple' && s.veil) {
    const veil = ramp(s.veil, 5);
    trapezoid(img, cx, 4 + by, sh + 12, 6, 8, (x, _y, x0, x1) => veil[Math.max(0, lit(x, x0, x1) - 1)]!);
  }
  if (!front && s.shield) {
    const shd = ramp(s.shield, 5);
    img.poly(
      [
        [10, sh + 2],
        [22, sh + 2],
        [22, sh + 11],
        [16, sh + 17],
        [10, sh + 11],
      ],
      (x) => shd[lit(x, 10, 22)]!,
    );
    img.hline(10, 21, sh + 2, SILVER[5]!);
  }
  if (!front && s.held === 'lance') img.vline(7, 0, 46, WOOD[1]!);
  if (!front && s.held === 'crozier') img.vline(7, 8, 46, GOLD[1]!);

  // ---- legs and feet ----
  const shoe = s.armour ? SILVER : ramp('#3A2E2A', 4);
  const lf = p.step < 0 ? 1 : p.step > 0 ? -1 : 0; // left foot: forward lowers it by a pixel
  const rf = -lf;
  if (s.armour) {
    // Greaves below the surcoat.
    for (const [x0, off] of [
      [12, lf],
      [17, rf],
    ] as const) {
      for (let y = 37 + by; y < 45 + Math.max(0, off); y++) for (let x = x0; x < x0 + 4; x++) img.set(x, y, SILVER[lit(x, x0, x0 + 4) + 1 > 5 ? 5 : lit(x, x0, x0 + 4) + 1]!);
    }
  }
  img.rect(11, 44 + Math.max(0, lf), 5, 3 - Math.max(0, -lf), shoe[2]!);
  img.rect(17, 44 + Math.max(0, rf), 5, 3 - Math.max(0, -rf), shoe[1]!);
  img.hline(11, 15, 44 + Math.max(0, lf), shoe[3]!);

  // ---- the robe or surcoat: sloping shoulders, a waist, a skirt that flares ----
  const waist = 28 + by;
  const skirtEnd = s.armour ? 38 + by : hem;
  const cloth = (x: number, y: number, x0: number, x1: number): RGBA => {
    let t = lit(x, x0, x1);
    if (y >= skirtEnd - 1) t = Math.max(0, t - 1);
    // A rim of light along the lit edge keeps the silhouette readable.
    if (x === x0 && y > sh + 1) t = Math.min(4, t + 1);
    return robe[t]!;
  };
  trapezoid(img, cx, sh, sh + 2, 3.6, 5.4, cloth);
  trapezoid(img, cx, sh + 2, waist, 5.4, 4.4, cloth);
  trapezoid(img, cx, waist, skirtEnd, 4.4, s.armour ? 6 : 7.6, cloth, p.step * 0.8);
  if (!s.armour) img.hline(Math.round(cx - 7.6 + p.step * 0.8), Math.round(cx + 7.6 + p.step * 0.8) - 1, hem - 2, robe[1]!);
  // Folds falling from the waist.
  if (!s.armour) {
    for (const [fx, f0, k] of [
      [13, 30, 1],
      [17, 29, 0],
      [20, 32, 0],
      [11, 34, 2],
    ] as const) {
      for (let y = f0 + by; y < hem; y++) img.tint(fx + Math.round(((y - f0) / 14) * p.step), y, robe[k]!);
    }
  } else {
    // Mail at the shoulders and the hem of the hauberk under the surcoat.
    img.rect(11, sh, 10, 2, MAIL[3]!);
    for (let x = 11; x < 21; x++) img.set(x, sh + 2, (x & 1) === 0 ? MAIL[2]! : MAIL[1]!);
    for (let x = 10; x < 23; x++) img.set(x, skirtEnd, (x & 1) === 0 ? MAIL[2]! : MAIL[1]!);
    // A blank surcoat: no device, only a seam.
    img.vline(16, sh + 3, skirtEnd - 1, robe[2]!);
  }
  if (s.cape && front) {
    // The cope's gold orphreys and morse.
    for (let y = sh; y < hem; y++) {
      img.set(10 + Math.round((y - sh) * 0.12), y, GOLD[3]!);
      img.set(21 - Math.round((y - sh) * 0.12), y, GOLD[1]!);
    }
    img.rect(14, sh + 1, 4, 3, GOLD[3]!);
    img.set(15, sh + 2, hex('#3A5BB5'));
    img.set(16, sh + 2, hex('#C8303A'));
  }
  if (s.belt) {
    const belt = ramp(s.belt, 4);
    const wy = 28 + by;
    img.hline(10, 21, wy, belt[1]!);
    img.hline(10, 14, wy, belt[2]!);
    if (front && s.id === 'isot') {
      // Inkhorn, penknife and a pouch at the belt.
      img.rect(19, wy + 1, 2, 4, hex('#C99A4A'));
      img.set(19, wy + 1, hex('#2A1C14'));
      img.vline(12, wy + 1, wy + 4, hex('#B9BDC2'));
      img.rect(14, wy + 1, 3, 3, ramp('#6A4428', 3)[1]!);
    }
    if (!front) img.set(16, wy, belt[3]!);
  }

  // ---- arms ----
  const sleeve = s.armour ? MAIL : robe;
  const swing = Math.round(p.step * 2);
  const armL = 30 + by - (front ? swing : -swing);
  const armR = 30 + by + (front ? swing : -swing);
  const arm = (side: -1 | 1, end: number) => {
    for (let y = sh + 1; y < end; y++) {
      const k = (y - sh) / Math.max(1, end - sh);
      const out = k > 0.55 ? 1 : 0;
      const wide = s.armour ? 0 : k > 0.7 ? 1 : 0;
      const xs = side < 0 ? [10 - out - wide, 10 - out, 11 - out] : [20 + out, 21 + out, 21 + out + wide];
      const tones = side < 0 ? [4, 3, 2] : [2, 1, 0];
      xs.forEach((x, i) => img.set(x, y, sleeve[tones[i]!]!));
    }
  };
  arm(-1, armL);
  arm(1, armR);
  // Shoulder caps.
  img.set(10, sh, sleeve[4]!);
  img.set(11, sh, sleeve[3]!);
  img.set(20, sh, sleeve[1]!);
  img.set(21, sh, sleeve[0]!);
  const glove = s.armour ? SILVER : skin;
  img.rect(9, armL, 2, 2, glove[3]!);
  img.rect(21, armR, 2, 2, glove[2]!);

  // ---- held things in front ----
  if (front) {
    if (s.held === 'book') {
      const b = ramp('#6E3E24', 4);
      img.rect(12, 24 + by, 8, 7, b[1]!);
      img.hline(12, 19, 24 + by, b[3]!);
      img.vline(19, 24 + by, 30 + by, b[0]!);
      for (const [x, y] of [
        [12, 24],
        [19, 24],
        [12, 30],
        [19, 30],
      ] as const)
        img.set(x, y + by, GOLD[3]!);
      for (const [x, y] of [
        [13, 31],
        [14, 32],
        [15, 33],
        [16, 33],
        [17, 32],
        [18, 31],
      ] as const)
        img.set(x, y + by, MAIL[3]!);
      img.rect(10, 26 + by, 3, 2, skin[3]!);
      img.rect(19, 26 + by, 3, 2, skin[2]!);
    } else if (s.held === 'quill') {
      img.line(23, armR, 26, armR - 8, hex('#F6F1E6'));
      img.set(27, armR - 9, hex('#E9E2D2'));
      img.set(25, armR - 4, hex('#C9C2B4'));
      img.set(24, armR - 2, hex('#C9C2B4'));
    } else if (s.held === 'lance') {
      img.vline(24, 0 + by, 46, WOOD[2]!);
      img.vline(25, 0 + by, 46, WOOD[0]!);
      img.poly(
        [
          [23.5, 1 + by],
          [25, -3 + by],
          [26.5, 1 + by],
        ],
        SILVER[4]!,
      );
      // A blank pennon.
      img.poly(
        [
          [26, 3 + by],
          [31, 5 + by],
          [26, 7 + by],
        ],
        hex('#F6F3EC'),
      );
    } else if (s.held === 'crozier') {
      img.vline(24, 7 + by, 46, GOLD[2]!);
      img.vline(25, 7 + by, 46, GOLD[0]!);
      for (const [x, y] of [
        [24, 6],
        [24, 5],
        [25, 4],
        [26, 3],
        [27, 3],
        [28, 4],
        [28, 5],
        [27, 6],
      ] as const)
        img.set(x, y + by, GOLD[3]!);
    } else if (s.held === 'stone') {
      // A pumice block on a haft.
      img.vline(23, armR - 6, armR + 2, WOOD[1]!);
      img.rect(21, armR - 9, 5, 4, hex('#BDB8AE'));
      img.hline(21, 25, armR - 9, hex('#DCD8D0'));
      img.set(24, armR - 7, hex('#8C877E'));
    } else if (s.held === 'sword') {
      img.vline(24, armR - 15, armR - 2, SILVER[4]!);
      img.vline(25, armR - 15, armR - 2, SILVER[1]!);
      img.set(24, armR - 16, SILVER[5]!);
      img.hline(22, 27, armR - 1, GOLD[1]!);
      img.rect(24, armR, 2, 2, WOOD[1]!);
    } else if (s.held === 'bottle') {
      const glass = ramp('#3E8A5A', 4);
      img.rect(22, armR - 5, 4, 5, glass[1]!);
      img.vline(22, armR - 5, armR - 1, glass[3]!);
      img.rect(23, armR - 7, 2, 2, glass[2]!);
      img.set(23, armR - 8, hex('#8A6A4A'));
    } else if (s.held === 'spade') {
      // The sexton's spade, polished like a mirror.
      img.vline(24, 6 + by, 40, WOOD[2]!);
      img.hline(22, 26, 6 + by, WOOD[3]!);
      img.rect(22, 40, 5, 6, SILVER[3]!);
      img.vline(22, 40, 45, SILVER[5]!);
      img.set(24, 42, hex('#FFFFFF'));
    } else if (s.held === 'broom') {
      img.vline(24, 8 + by, 40, WOOD[2]!);
      for (let x = 21; x < 28; x++) img.vline(x, 40, 46 - (x % 2), hex(x % 3 ? '#B89A5A' : '#8A7040'));
    } else if (s.held === 'bow') {
      for (let y = armR - 14; y <= armR + 8; y++) {
        const k = (y - (armR - 3)) / 11;
        img.set(Math.round(26 - (1 - k * k) * 3), y, WOOD[2]!);
      }
      img.vline(26, armR - 14, armR + 8, hex('#D8D0C0', 180));
    }
    if (s.cross) {
      const c = hex(s.cross);
      img.rect(15, sh + 3, 2, 9, c);
      img.rect(12, sh + 6, 8, 2, c);
    }
    if (s.shield) {
      const shd = ramp(s.shield, 5);
      img.poly(
        [
          [3, sh + 4],
          [11, sh + 4],
          [11, sh + 11],
          [7, sh + 16],
          [3, sh + 11],
        ],
        (x) => shd[lit(x, 3, 11)]!,
      );
      img.hline(3, 10, sh + 4, SILVER[5]!);
      img.vline(3, sh + 4, sh + 11, SILVER[4]!);
      img.vline(10, sh + 5, sh + 11, SILVER[1]!);
    }
  }

  // ---- neck and head ----
  img.rect(14, sh - 2, 4, 2, skin[1]!);
  img.rect(14, sh - 2, 2, 2, skin[2]!);
  const hx = 16;
  const hy = 10 + by - p.breath;
  img.ellipse(hx, hy, 4.7, 5.6, (x) => skin[Math.min(4, lit(x, 11, 21) + 0)]!);
  if (front && s.mask) {
    // A paper mask, its face drawn on in a few strokes: round eyes, rosy cheeks, a grin.
    const paper = ramp(s.mask, 4);
    img.ellipse(hx, hy + 0.5, 4.6, 5.4, (x) => paper[x < 14 ? 3 : x < 18 ? 2 : 1]!);
    for (const ex of [14, 18]) {
      img.set(ex, hy - 1, hex('#1A1210'));
      img.set(ex, hy, hex('#1A1210'));
    }
    img.set(13, hy + 2, hex('#E06A6A'));
    img.set(19, hy + 2, hex('#E06A6A'));
    img.hline(14, 18, hy + 3, hex('#A82A2A'));
    img.set(13, hy + 2, hex('#A82A2A'));
  } else if (front && s.headwear !== 'helm') {
    // A small face: eyes of two pixels, a hint of nose and mouth.
    const eye = hex(s.eyes);
    img.set(14, hy, eye);
    img.set(14, hy + 1, hex('#1A1210'));
    img.set(18, hy, eye);
    img.set(18, hy + 1, hex('#1A1210'));
    img.set(13, hy - 1, ramp(s.hair, 3)[0]!);
    img.set(19, hy - 1, ramp(s.hair, 3)[0]!);
    img.set(16, hy + 2, skin[1]!);
    img.hline(15, 17, hy + 4, hex('#B06A60'));
    if (s.id === 'isot') {
      img.set(13, hy + 2, hex('#E9898A', 160));
      img.set(19, hy + 2, hex('#E9898A', 160));
    }
    if (s.marks) {
      img.set(19, hy + 2, hex('#8C8A8A'));
      img.set(20, hy + 3, hex('#8C8A8A'));
    }
  }

  // ---- hair and headwear ----
  switch (s.headwear) {
    case 'kerchief': {
      const ht = (x: number) => hair[Math.min(4, lit(x, 10, 22))]!;
      if (front) {
        // A dark bob to the jaw, a fringe, the kerchief over the crown.
        for (let y = hy - 4; y < hy + 6; y++) {
          img.set(11, y, hair[3]!);
          img.set(12, y, hair[2]!);
          img.set(20, y, hair[1]!);
          img.set(21, y, hair[0]!);
        }
        img.ellipse(hx, hy - 3.5, 5.6, 3.2, (x, y) => (y < hy - 2 ? ht(x) : null));
        for (const x of [13, 15, 17, 19]) img.set(x, hy - 2, hair[2]!);
        img.ellipse(hx, hy - 5.5, 5.4, 2.6, (x, y) => (y < hy - 4 ? hw[Math.min(4, lit(x, 10, 22) + 1)] ?? hw[4]! : null));
        img.hline(11, 21, hy - 4, hw[2]!);
      } else {
        img.ellipse(hx, hy - 0.5, 5.4, 5.8, (x) => ht(x));
        for (let y = hy + 3; y < hy + 6; y++) img.hline(11, 21, y, hair[y === hy + 5 ? 0 : 1]!);
        img.ellipse(hx, hy - 4, 5.4, 3, (x, y) => (y < hy - 2 ? hw[Math.min(4, lit(x, 10, 22) + 1)] ?? hw[4]! : null));
        img.rect(15, hy - 2, 3, 2, hw[3]!);
        img.set(14, hy, hw[2]!);
        img.set(18, hy + 1, hw[1]!);
      }
      break;
    }
    case 'wimple': {
      const veil = ramp(s.veil ?? '#333', 5);
      if (front) {
        // The white wimple framing the face, the black veil over it.
        for (let y = hy - 6; y < sh; y++) {
          for (let x = 10; x < 23; x++) {
            const dx = (x + 0.5 - hx) / 3.8;
            const dy = (y + 0.5 - (hy + 0.8)) / 4.6;
            if (dx * dx + dy * dy <= 1) continue;
            const ox = (x + 0.5 - hx) / 6;
            const oy = (y + 0.5 - (hy + 1)) / 8;
            if (ox * ox + oy * oy > 1 && y < hy + 6) continue;
            if (y >= hy + 6 && Math.abs(x + 0.5 - hx) > 5) continue;
            img.set(x, y, hw[Math.min(4, lit(x, 10, 22) + 1)]!);
          }
        }
        img.ellipse(hx, hy - 4.5, 6, 3, (x, y) => (y < hy - 4 ? veil[Math.max(0, lit(x, 10, 22) - 1)]! : null));
      } else {
        img.ellipse(hx, hy, 6, 6.4, (x) => veil[Math.max(0, lit(x, 10, 22) - 1)]!);
      }
      break;
    }
    case 'helm': {
      // A great helm: flat top, the eye slit and breathing holes. No face.
      img.poly(
        [
          [10.5, hy - 5],
          [12, hy - 7],
          [20, hy - 7],
          [21.5, hy - 5],
          [21.5, hy + 6],
          [10.5, hy + 6],
        ],
        (x, y) => SILVER[Math.min(5, lit(x, 10, 22) + (y < hy - 5 ? 1 : 0))]!,
      );
      if (front) {
        img.hline(11, 21, hy - 1, hex('#0E1016'));
        img.hline(12, 20, hy, hex('#22262E'));
        img.vline(16, hy - 7, hy - 2, SILVER[5]!);
        img.vline(16, hy + 1, hy + 5, SILVER[4]!);
        for (const [x, y] of [
          [18, hy + 2],
          [19, hy + 3],
          [18, hy + 4],
        ] as const)
          img.set(x, y, hex('#3A3E48'));
      } else {
        img.vline(16, hy - 7, hy + 5, SILVER[2]!);
        img.hline(11, 21, hy + 5, SILVER[1]!);
      }
      break;
    }
    case 'mitre': {
      if (!front) img.ellipse(hx, hy, 5, 5.6, (x) => hair[Math.min(4, lit(x, 10, 22))]!);
      else {
        img.rect(11, hy - 2, 2, 5, hair[3]!);
        img.rect(20, hy - 2, 2, 5, hair[1]!);
      }
      img.poly(
        [
          [11, hy - 3],
          [21, hy - 3],
          [20.5, hy - 9],
          [16, hy - 14],
          [11.5, hy - 9],
        ],
        (x) => hw[Math.min(4, lit(x, 10, 22) + 1)]!,
      );
      img.hline(11, 20, hy - 4, GOLD[2]!);
      img.vline(16, hy - 13, hy - 4, GOLD[3]!);
      img.set(16, hy - 15, GOLD[4]!);
      break;
    }
    case 'hood':
      if (front) {
        for (let y = hy - 7; y < sh + 1; y++) {
          for (let x = 9; x < 24; x++) {
            const dx = (x + 0.5 - hx) / 4;
            const dy = (y + 0.5 - (hy + 1)) / 5.2;
            const inFace = dx * dx + dy * dy <= 1;
            const ox = (x + 0.5 - hx) / 6.4;
            const oy = (y + 0.5 - (hy + 0.5)) / 7.6;
            if (ox * ox + oy * oy > 1 && y < sh - 2) continue;
            if (y >= sh - 2 && Math.abs(x + 0.5 - hx) > 7) continue;
            if (inFace) {
              if (y < hy) img.tint(x, y, [34, 26, 32, 120]);
              continue;
            }
            img.set(x, y, hw[Math.min(4, lit(x, 9, 24))]!);
          }
        }
      } else {
        trapezoid(img, hx, hy - 7, sh + 2, 6, 7, (x, _y, x0, x1) => hw[lit(x, x0, x1)]!);
        img.poly(
          [
            [14, sh + 1],
            [18, sh + 1],
            [16, sh + 7],
          ],
          hw[1]!,
        );
      }
      break;
    case 'cap':
      img.ellipse(hx, hy - 3, 5.2, 3.6, (x, y) => (y < hy - 1 ? hair[Math.min(4, lit(x, 10, 22))]! : null));
      img.ellipse(hx, hy - 4.5, 5.8, 3, (x, y) => (y < hy - 3 ? hw[Math.min(4, lit(x, 10, 22) + 1)]! : null));
      img.hline(10, 22, hy - 3, hw[1]!);
      break;
    case 'tallhat':
      img.ellipse(hx, hy - 3, 5.2, 3.6, (x, y) => (y < hy - 1 ? hair[Math.min(4, lit(x, 10, 22))]! : null));
      img.poly(
        [
          [11, hy - 3],
          [21, hy - 3],
          [19.5, hy - 15],
          [12.5, hy - 15],
        ],
        (x) => hw[Math.min(4, lit(x, 10, 22))]!,
      );
      img.hline(9, 23, hy - 3, hw[0]!);
      img.hline(12, 20, hy - 6, GOLD[2]!);
      break;
    case 'none':
      img.ellipse(hx, hy - 3, 5.2, 3.6, (x, y) => (y < hy - 1 ? hair[Math.min(4, lit(x, 10, 22))]! : null));
      break;
  }
}

function drawSide(img: PixelImage, s: CharSpec, p: Pose): void {
  // Facing left; right-facing frames mirror this one.
  const skin = ramp(s.skin, 5);
  const robe = ramp(s.robe, 5);
  const hw = ramp(s.headwearColor, 5);
  const hair = ramp(s.hair, 5);
  const by = p.bob;
  const sh = 17 + by - p.breath;
  const hem = 44;
  const sideLit = (x: number, x0: number, x1: number) => lit(x, x0, x1);

  if (s.cape) {
    const cape = ramp(s.cape, 5);
    trapezoid(img, 18, sh - 1, 45, 3.5, 6, (x, _y, x0, x1) => cape[Math.max(0, sideLit(x, x0, x1) - 1)]!, 1);
  }
  if (s.headwear === 'wimple' && s.veil) {
    const veil = ramp(s.veil, 5);
    trapezoid(img, 19, 4 + by, sh + 12, 3, 4.5, (x, _y, x0, x1) => veil[Math.max(0, sideLit(x, x0, x1) - 1)]!);
  }
  if (s.shield) {
    const shd = ramp(s.shield, 5);
    img.poly(
      [
        [18, sh + 2],
        [25, sh + 2],
        [25, sh + 11],
        [21.5, sh + 16],
        [18, sh + 11],
      ],
      shd[1]!,
    );
  }
  // Legs: a stride when walking.
  const stride = Math.round(p.step * 4);
  const shoe = s.armour ? SILVER : ramp('#3A2E2A', 4);
  if (s.armour) {
    for (const [x0, k] of [
      [14 - stride, 4],
      [15 + stride, 2],
    ] as const)
      for (let y = 37 + by; y < 45; y++) img.rect(x0, y, 3, 1, SILVER[k]!);
  }
  img.rect(12 - stride, 45, 5, 2, shoe[2]!);
  img.rect(15 + stride, 45, 4, 2, shoe[1]!);
  // Body: a chest, a waist, a skirt swinging with the stride.
  const waist = 28 + by;
  const skirtEnd = s.armour ? 38 + by : hem + 1;
  const cloth = (x: number, y: number, x0: number, x1: number): RGBA => {
    let t = sideLit(x, x0, x1);
    if (y >= skirtEnd - 1) t = Math.max(0, t - 1);
    if (x === x0 && y > sh + 1) t = Math.min(4, t + 1);
    return robe[t]!;
  };
  trapezoid(img, 16, sh, sh + 2, 3, 4.4, cloth);
  trapezoid(img, 16.5, sh + 2, waist, 4.4, 3.8, cloth);
  trapezoid(img, 16.5, waist, skirtEnd, 3.8, s.armour ? 4.8 : 6 + Math.abs(p.step), cloth, -p.step * 0.6);
  for (let y = 30 + by; y < skirtEnd; y++) img.tint(18, y, robe[1]!);
  if (s.armour) {
    for (let x = 12; x < 21; x++) img.set(x, skirtEnd, (x & 1) === 0 ? MAIL[2]! : MAIL[1]!);
    img.rect(13, sh, 7, 2, MAIL[3]!);
  }
  if (s.belt) img.hline(12, 20, 28 + by, ramp(s.belt, 4)[1]!);
  // The near arm, swinging opposite the near leg.
  const sleeve = s.armour ? MAIL : robe;
  const swing = Math.round(-p.step * 3);
  for (let y = sh + 1; y < 30 + by; y++) {
    const k = (y - sh) / (30 - sh);
    const x = Math.round(15 + swing * k);
    img.set(x, y, sleeve[4]!);
    img.set(x + 1, y, sleeve[3]!);
    img.set(x + 2, y, sleeve[2]!);
  }
  const hand = Math.round(15 + swing);
  img.rect(hand, 30 + by, 3, 2, (s.armour ? SILVER : skin)[3]!);
  if (s.held === 'book') {
    const b = ramp('#6E3E24', 4);
    img.rect(9, 24 + by, 5, 7, b[1]!);
    img.vline(9, 24 + by, 30 + by, GOLD[2]!);
  } else if (s.held === 'quill') {
    img.line(hand, 30 + by, hand - 4, 22 + by, hex('#F6F1E6'));
  } else if (s.held === 'lance') {
    img.vline(10, 0 + by, 46, WOOD[2]!);
    img.poly(
      [
        [9, 3 + by],
        [4, 5 + by],
        [9, 7 + by],
      ],
      hex('#F6F3EC'),
    );
    img.poly(
      [
        [9, 1 + by],
        [10.5, -3 + by],
        [12, 1 + by],
      ],
      SILVER[4]!,
    );
  } else if (s.held === 'crozier') {
    img.vline(10, 7 + by, 46, GOLD[2]!);
    for (const [x, y] of [
      [10, 6],
      [9, 5],
      [8, 4],
      [7, 4],
      [6, 5],
      [6, 6],
    ] as const)
      img.set(x, y + by, GOLD[3]!);
  } else if (s.held === 'stone') {
    img.vline(hand + 1, 24 + by, 32 + by, WOOD[1]!);
    img.rect(hand - 1, 21 + by, 5, 4, hex('#BDB8AE'));
  } else if (s.held === 'sword') {
    img.line(hand, 30 + by, hand - 9, 17 + by, SILVER[4]!);
    img.line(hand + 1, 30 + by, hand - 8, 17 + by, SILVER[1]!);
    img.line(hand - 2, 32 + by, hand + 2, 28 + by, GOLD[1]!);
  } else if (s.held === 'bottle') {
    img.rect(hand - 1, 26 + by, 3, 4, hex('#3E8A5A'));
    img.set(hand, 25 + by, hex('#8A6A4A'));
  } else if (s.held === 'spade') {
    img.vline(hand + 1, 8 + by, 40, WOOD[2]!);
    img.rect(hand - 1, 40, 5, 6, SILVER[3]!);
    img.set(hand, 42, hex('#FFFFFF'));
  } else if (s.held === 'broom') {
    img.line(hand + 1, 10 + by, hand - 4, 40, WOOD[2]!);
    for (let x = hand - 8; x < hand; x++) img.vline(x, 40, 46 - (x % 2), hex('#B89A5A'));
  } else if (s.held === 'bow') {
    for (let y = 16 + by; y <= 38 + by; y++) {
      const k = (y - (27 + by)) / 11;
      img.set(Math.round(hand - 2 - (1 - k * k) * 3), y, WOOD[2]!);
    }
  }
  if (s.mask) {
    const paper = ramp(s.mask, 4);
    img.ellipse(13, 10 + by - p.breath + 0.5, 3.4, 5, (x) => paper[x < 12 ? 3 : 2]!);
  }

  // Neck and head, looking left.
  img.rect(15, sh - 2, 3, 2, skin[1]!);
  const hx = 15;
  const hy = 10 + by - p.breath;
  img.ellipse(hx, hy, 4.6, 5.6, (x) => skin[x < 13 ? 4 : x < 16 ? 3 : 2]!);
  if (s.headwear !== 'helm') {
    img.set(10, hy + 1, skin[3]!); // nose
    img.set(12, hy, hex(s.eyes));
    img.set(12, hy + 1, hex('#1A1210'));
    img.set(11, hy - 1, ramp(s.hair, 3)[0]!);
    img.hline(11, 12, hy + 4, hex('#B06A60'));
    if (s.marks) img.set(14, hy + 2, hex('#8C8A8A'));
  }
  switch (s.headwear) {
    case 'kerchief':
      img.ellipse(hx + 1.5, hy - 0.5, 4.8, 5.6, (x, y) => (x > 14 || y < hy - 2 ? hair[x < 16 ? 2 : 1]! : null));
      for (let y = hy + 2; y < hy + 6; y++) img.hline(15, 20, y, hair[1]!);
      img.ellipse(hx + 1, hy - 4.5, 5, 2.8, (x, y) => (y < hy - 3 ? hw[x < 15 ? 4 : 3]! : null));
      img.rect(19, hy - 3, 2, 2, hw[3]!);
      img.set(21, hy - 2, hw[2]!);
      img.set(21, hy - 1, hw[1]!);
      break;
    case 'wimple': {
      const veil = ramp(s.veil ?? '#333', 5);
      img.ellipse(hx + 1, hy + 0.5, 5.2, 6.2, (x, y) => (x > 13 || y < hy - 3 || y > hy + 4 ? hw[x < 16 ? 4 : 3]! : null));
      img.ellipse(hx + 2.5, hy - 1, 4.2, 5.4, (x, y) => (x > 15 || y < hy - 4 ? veil[1]! : null));
      break;
    }
    case 'helm':
      img.poly(
        [
          [10, hy - 5],
          [11.5, hy - 7],
          [20, hy - 7],
          [21, hy - 5],
          [21, hy + 6],
          [10, hy + 6],
        ],
        (x) => SILVER[x < 13 ? 5 : x < 17 ? 4 : 2]!,
      );
      img.hline(10, 14, hy - 1, hex('#0E1016'));
      for (const y of [hy + 2, hy + 4]) img.set(12, y, hex('#3A3E48'));
      break;
    case 'mitre':
      img.rect(16, hy - 2, 4, 6, hair[2]!);
      img.poly(
        [
          [11, hy - 3],
          [20, hy - 3],
          [18.5, hy - 10],
          [15, hy - 14],
          [12, hy - 9],
        ],
        (x) => hw[x < 15 ? 4 : 3]!,
      );
      img.hline(11, 19, hy - 4, GOLD[2]!);
      break;
    case 'hood':
      img.ellipse(hx + 1.5, hy, 5.8, 6.8, (x, y) => (x > 12 || y < hy - 3 ? hw[x < 16 ? 3 : 2]! : null));
      for (let y = hy - 2; y <= hy + 2; y++) for (let x = 10; x <= 13; x++) img.tint(x, y, [34, 26, 32, 110]);
      break;
    case 'cap':
      img.ellipse(hx + 1, hy - 3, 5, 3.6, (x, y) => (y < hy - 1 || x > 16 ? hair[2]! : null));
      img.ellipse(hx + 0.5, hy - 4.5, 5.6, 3, (x, y) => (y < hy - 3 ? hw[x < 15 ? 4 : 3]! : null));
      img.hline(8, 15, hy - 3, hw[1]!);
      break;
    case 'tallhat':
      img.ellipse(hx + 1, hy - 3, 5, 3.6, (x, y) => (y < hy - 1 || x > 16 ? hair[2]! : null));
      img.poly(
        [
          [11, hy - 3],
          [21, hy - 3],
          [19.5, hy - 15],
          [12.5, hy - 15],
        ],
        (x) => hw[x < 15 ? 4 : 3]!,
      );
      img.hline(8, 22, hy - 3, hw[0]!);
      break;
    case 'none':
      img.ellipse(hx + 1, hy - 3, 5, 3.6, (x, y) => (y < hy - 1 || x > 16 ? hair[2]! : null));
      break;
  }
}

/** Draw one frame of a character. */
export function drawCharacter(s: CharSpec, dir: Dir, pose: Pose): PixelImage {
  const img = new PixelImage(FRAME_W, FRAME_H);
  if (dir === 'down' || dir === 'up') drawFront(img, s, dir === 'down', pose);
  else drawSide(img, s, pose);
  img.outline(null);
  if (dir === 'right') {
    const m = new PixelImage(FRAME_W, FRAME_H);
    m.blit(img, 0, 0, true);
    return m;
  }
  return img;
}

/** A sheet: one row per direction (down, up, left, right), one column per frame. */
export function characterSheet(s: CharSpec): PixelImage {
  const sheet = new PixelImage(FRAME_W * FRAMES.length, FRAME_H * DIRS.length);
  DIRS.forEach((d, row) => FRAMES.forEach((p, col) => sheet.blit(drawCharacter(s, d, p), col * FRAME_W, row * FRAME_H)));
  return sheet;
}
