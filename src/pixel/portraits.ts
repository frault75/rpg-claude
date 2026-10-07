/**
 * Dialogue portraits: 48 x 48 pixel-art busts in the manner of the 16-bit RPGs, drawn
 * from the same character specs as the sprites. Faces are lit from the upper left, eyes
 * carry a catch-light, and brows, lids and mouth change with the speaker's mood.
 */

import type { CharSpec } from './characters';
import { hex, PixelImage, type RGBA, ramp, shadeAt } from './pixel';

export const PORTRAIT = 48;

import type { Mood } from '../story/script';

export type { Mood };

const GOLD = ramp('#D9A52E', 5);
const STEEL = ramp('#A8B2C0', 6);
const MAIL = ramp('#7E8794', 4);

interface Look {
  /** 0 young, 1 middle-aged, 2 old. */
  age: number;
  blush: boolean;
}

const LOOKS: Record<string, Look> = {
  isot: { age: 0, blush: true },
  hild: { age: 2, blush: false },
  aumery: { age: 2, blush: false },
};

/** Pick a tone without dithering: faces and hair read better as clean clusters. */
function flat(r: readonly RGBA[], t: number, _x: number, _y: number): RGBA {
  const f = Math.min(r.length - 1, Math.max(0, t * (r.length - 1)));
  return r[Math.round(f)]!;
}

/** Light across a round form: 0 (dark) .. ~4.5 (lit), from the upper left. */
function sphere(nx: number, ny: number, base = 2.8): number {
  return base - nx * 1.5 - ny * 0.7;
}

export function drawPortrait(s: CharSpec, mood: Mood = 'neutral'): PixelImage {
  const img = new PixelImage(PORTRAIT, PORTRAIT);
  const look = LOOKS[s.id] ?? { age: 1, blush: false };
  const skin = ramp(s.skin, 6);
  const hair = ramp(s.hair, 5);
  const robe = ramp(s.robe, 6);
  const hw = ramp(s.headwearColor, 6);
  const cx = 24;
  const cy = 21;

  // ---- behind the head: long hair, veils, the back of hoods ----
  if (s.headwear === 'kerchief') {
    img.ellipse(cx, cy - 2, 12.5, 12, (x, y, nx, ny) => flat(hair, (sphere(nx, ny, 2.2) - 0.4) / 4, x, y));
    // The bob falls to the jaw, in strands.
    for (let x = 12; x <= 36; x++) {
      if (x > 15 && x < 33) continue;
      const len = 30 + ((x * 7) % 3);
      for (let y = 18; y < len; y++) img.set(x, y, hair[x < 24 ? 2 : 1]!);
    }
  }
  if (s.headwear === 'wimple' && s.veil) {
    const veil = ramp(s.veil, 5);
    img.poly(
      [
        [11, 10],
        [37, 10],
        [42, 47],
        [6, 47],
      ],
      (x, y) => shadeAt(veil, (x < 24 ? 2.6 : 1.6) / 4 - (y > 40 ? 0.1 : 0), x, y),
    );
    img.ellipse(cx, 11, 13, 9, (x, y, nx) => shadeAt(veil, (2.6 - nx * 1.4) / 4, x, y));
  }
  if (s.headwear === 'hood') img.ellipse(cx, cy, 14, 15, (x, y, nx, ny) => shadeAt(hw, sphere(nx, ny, 2.4) / 5, x, y));
  if (s.cape) {
    const cape = ramp(s.cape, 6);
    img.poly(
      [
        [4, 47],
        [10, 34],
        [38, 34],
        [44, 47],
      ],
      (x, y) => shadeAt(cape, (3 - ((x - 24) / 20) * 1.4) / 5, x, y),
    );
  }

  // ---- shoulders and neck ----
  img.rect(20, 28, 9, 9, skin[2]!);
  img.rect(26, 28, 3, 9, skin[1]!);
  const shoulders: [number, number][] = [
    [6, 47],
    [10, 38],
    [17, 35],
    [31, 35],
    [38, 38],
    [42, 47],
  ];
  if (s.armour) {
    // Mail aventail at the throat, white surcoat below.
    img.poly(shoulders, (x, y) => shadeAt(ramp(s.robe, 6), (3.2 - ((x - 24) / 18) * 1.6) / 5, x, y));
    img.poly(
      [
        [14, 34],
        [34, 34],
        [32, 40],
        [16, 40],
      ],
      (x, y) => ((x + y) % 2 === 0 ? MAIL[2]! : MAIL[x < 24 ? 3 : 1]!),
    );
  } else if (!s.cape) {
    img.poly(shoulders, (x, y) => shadeAt(robe, (3 - ((x - 24) / 18) * 1.8) / 5, x, y));
  } else {
    // A white alb at the throat, the cope over it with a gold band and a jewelled morse.
    img.poly(
      [
        [17, 35],
        [31, 35],
        [29, 47],
        [19, 47],
      ],
      (x, y) => shadeAt(robe, (3.4 - ((x - 24) / 8) * 1.2) / 5, x, y),
    );
    for (const [x0, x1] of [
      [14, 18],
      [30, 34],
    ] as const)
      for (let y = 35; y < 48; y++) for (let x = x0; x <= x1; x++) img.set(x + Math.round((y - 35) * (x0 < 24 ? -0.4 : 0.4)), y, GOLD[x === x0 ? 3 : 2]!);
    img.ellipse(cx, 40, 3, 2.5, GOLD[3]!);
    img.set(cx, 40, hex('#C8303A'));
  }
  if (s.id === 'isot') {
    // A linen undershirt showing at the neckline.
    img.poly(
      [
        [19, 35],
        [29, 35],
        [24, 40],
      ],
      ramp('#F2EBDD', 4)[2]!,
    );
  }
  if (s.headwear === 'wimple') {
    // The wimple wraps the throat and chin.
    img.poly(
      [
        [15, 26],
        [33, 26],
        [35, 37],
        [13, 37],
      ],
      (x, y) => flat(hw, (3.6 - ((x - 24) / 14) * 1.4) / 5, x, y),
    );
  }

  // ---- the face ----
  const faceRy = s.headwear === 'helm' ? 0 : 11.5;
  if (faceRy) {
    img.ellipse(cx, cy, 9.6, faceRy, (x, y, nx, ny) => {
      let t = sphere(nx, ny, 3.3);
      if (nx > 0.72) t -= 0.7;
      if (ny > 0.8) t -= 0.6;
      return flat(skin, t / 5, x, y);
    });
    // Chin: narrower at the bottom.
    for (let y = cy + 8; y <= cy + 12; y++) {
      const cut = Math.round((y - (cy + 8)) * 1.1);
      for (let k = 0; k < cut; k++) {
        img.set(cx - 10 + k, y, [0, 0, 0, 0]);
        img.set(cx + 9 - k, y, [0, 0, 0, 0]);
      }
    }
    drawFace(img, s, mood, look, skin);
  }

  // ---- hair and headwear in front ----
  switch (s.headwear) {
    case 'kerchief': {
      // Bangs, cut a little unevenly.
      for (let x = 15; x <= 33; x++) {
        const len = 13 + ((x * 5) % 3) + (x > 29 ? 2 : 0);
        for (let y = 8; y < len; y++) img.set(x, y, flat(hair, (2.6 - ((x - 24) / 10) * 1.2 - (y > len - 2 ? 0.8 : 0)) / 5, x, y));
      }
      // The kerchief over the crown, knotted at the side.
      img.ellipse(cx, 9, 12.5, 6.5, (x, y, nx, ny) => (y < 11 ? flat(hw, (sphere(nx, ny, 3.2) + (Math.sin(x * 0.9) > 0.6 ? -0.8 : 0)) / 5, x, y) : null));
      img.hline(12, 36, 10, hw[2]!);
      img.hline(13, 35, 11, hw[1]!);
      img.poly(
        [
          [34, 8],
          [40, 6],
          [39, 11],
        ],
        hw[3]!,
      );
      img.poly(
        [
          [35, 10],
          [41, 14],
          [37, 15],
        ],
        hw[2]!,
      );
      break;
    }
    case 'wimple': {
      const veil = ramp(s.veil ?? '#333', 5);
      // The white band across the brow and down the cheeks, framing the face.
      for (let y = 6; y < 38; y++) {
        for (let x = 9; x < 40; x++) {
          const dx = (x + 0.5 - cx) / 8.4;
          const dy = (y + 0.5 - (cy + 1.5)) / 10.4;
          if (dx * dx + dy * dy <= 1) continue;
          const ox = (x + 0.5 - cx) / 12.6;
          const oy = (y + 0.5 - (cy + 2)) / 15;
          if (ox * ox + oy * oy > 1 && y < 30) continue;
          if (y >= 30 && Math.abs(x + 0.5 - cx) > 11 - (y - 30) * 0.3) continue;
          img.set(x, y, flat(hw, (3.8 - ((x - 24) / 12) * 1.4 - (dx * dx + dy * dy < 1.25 ? 0.7 : 0)) / 5, x, y));
        }
      }
      img.hline(15, 33, 5, veil[3]!);
      img.hline(13, 35, 6, veil[2]!);
      break;
    }
    case 'helm': {
      // A great helm with a cross of reinforcement, the eye slit dark: no face to be seen.
      img.poly(
        [
          [13, 8],
          [16, 4],
          [32, 4],
          [35, 8],
          [36, 35],
          [12, 35],
        ],
        (x, y) => {
          const nx = (x + 0.5 - 24) / 12;
          let t = 3.4 - nx * 2.2;
          if (y < 7) t += 0.8;
          return shadeAt(STEEL, t / 6, x, y);
        },
      );
      for (let y = 4; y < 35; y++) {
        img.set(24, y, STEEL[5]!);
        img.set(25, y, STEEL[2]!);
      }
      for (let x = 14; x <= 34; x++) {
        img.set(x, 18, hex('#0C0E14'));
        img.set(x, 19, hex('#141820'));
        img.set(x, 17, STEEL[4]!);
        img.set(x, 20, STEEL[1]!);
      }
      img.hline(14, 34, 18, hex('#0C0E14'));
      for (const [x, y] of [
        [29, 25],
        [31, 25],
        [29, 28],
        [31, 28],
        [30, 31],
      ] as const)
        img.set(x, y, hex('#22262E'));
      for (const x of [15, 33]) for (const y of [10, 30]) img.set(x, y, STEEL[5]!);
      break;
    }
    case 'mitre': {
      // Grey hair at the temples, the mitre above.
      for (const [x0, x1] of [
        [13, 16],
        [32, 35],
      ] as const)
        for (let y = 13; y < 24; y++) for (let x = x0; x <= x1; x++) img.set(x, y, hair[x < 24 ? 3 : 2]!);
      img.poly(
        [
          [13, 12],
          [35, 12],
          [33.5, 5],
          [29, 0],
          [24, 3],
          [19, 0],
          [14.5, 5],
        ],
        (x, y) => flat(hw, (3.6 - ((x - 24) / 11) * 1.4) / 5, x, y),
      );
      for (let x = 13; x <= 35; x++) {
        img.set(x, 11, GOLD[3]!);
        img.set(x, 12, GOLD[1]!);
      }
      for (let y = 4; y < 11; y++) {
        img.set(23, y, GOLD[3]!);
        img.set(24, y, GOLD[2]!);
      }
      img.set(19, 11, hex('#C8303A'));
      img.set(29, 11, hex('#3A5BB5'));
      break;
    }
    case 'hood': {
      // The hood's rim and the face in its shadow.
      for (let y = 6; y < 36; y++) {
        for (let x = 9; x < 40; x++) {
          const dx = (x + 0.5 - cx) / 9.8;
          const dy = (y + 0.5 - (cy + 2)) / 12;
          const d = dx * dx + dy * dy;
          if (d <= 1) {
            if (y < cy - 1) img.tint(x, y, [30, 22, 28, 110]);
            continue;
          }
          if (d < 1.9) img.set(x, y, shadeAt(hw, (3 - ((x - 24) / 14) * 1.6 - (d < 1.2 ? 0.8 : 0)) / 5, x, y));
        }
      }
      break;
    }
    case 'none':
      img.ellipse(cx, 12, 10.5, 6, (x, y, nx, ny) => (y < 15 ? shadeAt(hair, sphere(nx, ny, 2.6) / 5, x, y) : null));
      break;
  }
  img.outline(null);
  return img;
}

function drawFace(img: PixelImage, s: CharSpec, mood: Mood, look: Look, skin: RGBA[]): void {
  const lash = hex('#2A1C18');
  const white = hex('#F4F0EA');
  const whiteShade = hex('#C9C4BC');
  const iris = ramp(s.eyes, 4);
  const pupil = hex('#0E0A0A');
  const ey = 20;
  const closedish = mood === 'tired' || mood === 'sad';
  for (const [ex, side] of [
    [19, -1],
    [29, 1],
  ] as const) {
    // Lash line, heavier at the outer corner.
    const lift = mood === 'alarmed' ? -1 : 0;
    img.hline(ex - 2, ex + 2, ey + lift, lash);
    img.set(ex + side * 3, ey + lift + 1, lash);
    if (closedish) {
      img.hline(ex - 2, ex + 2, ey + 1, skin[1]!);
      img.set(ex - 1, ey + 2, iris[1]!);
      img.set(ex, ey + 2, pupil);
      img.set(ex + 1, ey + 2, iris[2]!);
      img.set(ex - 2, ey + 2, whiteShade);
      img.set(ex + 2, ey + 2, whiteShade);
    } else {
      if (mood === 'alarmed') {
        img.hline(ex - 2, ex + 2, ey, white);
        img.set(ex, ey, iris[2]!);
      }
      img.set(ex - 2, ey + 1, white);
      img.set(ex - 1, ey + 1, iris[1]!);
      img.set(ex, ey + 1, iris[1]!);
      img.set(ex + 1, ey + 1, iris[0]!);
      img.set(ex + 2, ey + 1, whiteShade);
      img.set(ex - 2, ey + 2, whiteShade);
      img.set(ex - 1, ey + 2, iris[2]!);
      img.set(ex, ey + 2, pupil);
      img.set(ex + 1, ey + 2, iris[3]!);
      img.set(ex + 2, ey + 2, white);
      // Catch-light.
      img.set(ex - 1, ey + 1, hex('#FFFFFF'));
    }
    img.hline(ex - 1, ex + 1, ey + 3, skin[2]!);
    // Brows.
    const by = ey - 3 + (mood === 'alarmed' ? -1 : 0);
    const inner = ex - side * 2;
    const outer = ex + side * 2;
    let innerY = by;
    let outerY = by;
    if (mood === 'stern') {
      innerY = by + 1;
      outerY = by - 1;
    } else if (mood === 'grave') {
      innerY = by + 1;
    } else if (mood === 'sad' || mood === 'tired') {
      innerY = by - 1;
      outerY = by + 1;
    } else if (mood === 'wry' && side > 0) {
      innerY = by - 1;
      outerY = by - 1;
    }
    const browCol = ramp(s.headwear === 'mitre' || s.headwear === 'wimple' ? '#9A928A' : s.hair, 3)[0]!;
    img.line(inner, innerY, outer, outerY, browCol);
    img.set(outer + side, outerY + 1, browCol);
  }
  // Nose.
  img.set(25, 24, skin[2]!);
  img.set(25, 25, skin[1]!);
  img.set(24, 26, skin[2]!);
  img.set(23, 24, skin[5]!);
  // Mouth.
  const lip = hex('#9A4A44');
  const lipDark = hex('#6E2E2C');
  const my = 29;
  switch (mood) {
    case 'warm':
      img.hline(22, 26, my, lipDark);
      img.set(21, my - 1, lip);
      img.set(27, my - 1, lip);
      img.hline(23, 25, my + 1, skin[2]!);
      break;
    case 'wry':
      img.hline(22, 26, my, lip);
      img.set(27, my - 1, lip);
      img.set(26, my, lipDark);
      break;
    case 'grave':
      img.hline(22, 26, my, lipDark);
      break;
    case 'sad':
    case 'tired':
      img.hline(22, 26, my, lip);
      img.set(21, my + 1, lip);
      img.set(27, my + 1, lip);
      break;
    case 'alarmed':
      img.rect(23, my - 1, 3, 2, lipDark);
      img.hline(23, 25, my + 1, lip);
      break;
    case 'stern':
      img.hline(21, 26, my, lipDark);
      break;
    default:
      img.hline(22, 26, my, lip);
      img.set(24, my, lipDark);
  }
  if (look.blush) {
    for (const x of [17, 18, 30, 31]) img.set(x, 25, hex('#E98A8A', 150));
  }
  if (s.marks) {
    // The grey of the Sweat, still on her cheek after ten years.
    for (const [x, y] of [
      [30, 24],
      [31, 25],
      [29, 26],
      [31, 27],
    ] as const)
      img.set(x, y, hex('#8E8C90'));
  }
  if (look.age >= 2) {
    img.set(16, ey + 3, skin[1]!);
    img.set(32, ey + 3, skin[1]!);
    img.line(21, 26, 20, 28, skin[2]!);
    img.line(28, 26, 29, 28, skin[1]!);
    img.hline(21, 27, 15, skin[2]!);
  } else if (look.age === 1) {
    img.line(21, 27, 21, 28, skin[2]!);
    img.line(28, 27, 28, 28, skin[1]!);
  }
}
