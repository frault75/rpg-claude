/**
 * The marginalia the party fights, drawn like the characters: lit from the upper left,
 * shaded in hue-shifted ramps with ordered dithering, a selective outline. Each is a
 * sheet of frames in one row, facing right (towards the party), feet on the bottom row,
 * with an emissive sheet for what glows (eyes, slime) and named runs of frames.
 */

import { hash2, Noise2D } from '../engine/noise';
import { bayer, hex, PixelImage, type RGBA, ramp } from './pixel';

export interface EnemyArt {
  /** The sheet, frames side by side. */
  a: PixelImage;
  /** What glows, the same layout. */
  e: PixelImage;
  w: number;
  h: number;
  /** Named runs of frame indices: idle, lunge, and boss states. */
  runs: Record<string, number[]>;
  /** Feet, in frame pixels. */
  anchor: [number, number];
}

function tone(r: readonly RGBA[], t: number, x: number, y: number): RGBA {
  const f = Math.min(r.length - 1, Math.max(0, t));
  const i = Math.floor(f);
  return f - i > bayer(x, y) && i + 1 < r.length ? r[i + 1]! : r[i]!;
}

/** Light on a sphere's normal (nx, ny in -1..1), from the upper left: 0..1. */
function sphere(nx: number, ny: number): number {
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
  return Math.max(0, -0.5 * nx - 0.58 * ny + 0.64 * nz);
}

function sheetOf(frames: { a: PixelImage; e: PixelImage }[], runs: Record<string, number[]>, anchor: [number, number]): EnemyArt {
  const w = frames[0]!.a.w;
  const h = frames[0]!.a.h;
  const a = new PixelImage(w * frames.length, h);
  const e = new PixelImage(w * frames.length, h);
  frames.forEach((f, i) => {
    a.blit(f.a, i * w, 0);
    e.blit(f.e, i * w, 0);
  });
  return { a, e, w, h, runs, anchor };
}

// ---------------------------------------------------------------------------------------
// The Gryllus: a head on legs, the oldest joke in the margin.

interface GryllusPose {
  /** Head offset: x forward, y down. */
  dx: number;
  dy: number;
  /** Knees bent (shorter legs). */
  crouch: number;
  /** Mouth open. */
  shout: boolean;
}

function gryllusFrame(p: GryllusPose, seed: number): { a: PixelImage; e: PixelImage } {
  const W = 34;
  const H = 40;
  const img = new PixelImage(W, H);
  const glow = new PixelImage(W, H);
  const skin = ramp('#D99A74', 6);
  const cap = ramp('#B8322A', 5);
  const beard = ramp('#6A4630', 4);
  const leg = ramp('#9A6A4A', 4);
  const claw = ramp('#C9B48A', 3);
  const ink = hex('#1E1418');
  const white = hex('#F6EEDC');
  const cx = 16 + p.dx;
  const cy = 15 + p.dy + p.crouch;
  // Legs: thighs from under the head, knees bending forward, clawed feet.
  const hip = cy + 10;
  for (const [lx, phase] of [
    [cx - 4, 0],
    [cx + 3, 1],
  ] as const) {
    const knee: [number, number] = [lx + 3 - p.crouch, hip + (H - 2 - hip) * 0.5];
    const foot: [number, number] = [lx + (phase ? 1 : -1), H - 2];
    for (const [a, b, wd] of [
      [[lx, hip] as [number, number], knee, 2.2],
      [knee, foot, 1.6],
    ] as const) {
      const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const x = a[0] + (b[0] - a[0]) * t;
        const y = a[1] + (b[1] - a[1]) * t;
        for (let k = -wd; k <= wd; k += 1) img.set(Math.round(x + k * 0.5), Math.round(y), tone(leg, k < 0 ? 3 : k < 1 ? 2 : 0.6, Math.round(x), Math.round(y)));
      }
    }
    // Three toes forward, one back.
    for (const [tx, ty] of [
      [3, 0],
      [2, -1],
      [1, 1],
      [-2, 0],
    ] as const) {
      img.line(foot[0], foot[1], foot[0] + tx, foot[1] + ty, claw[1]!);
      img.set(foot[0] + tx, foot[1] + ty, claw[2]!);
    }
    img.set(foot[0], H - 1, claw[0]!);
  }
  // The head: a big, lumpy, lit sphere.
  const noise = new Noise2D(seed);
  img.ellipse(cx, cy, 12, 11.5, (x, y, nx, ny) => {
    const t = sphere(nx, ny) * 5.2 + (noise.value(x / 3, y / 3) - 0.5) * 0.8;
    return tone(skin, t, x, y);
  });
  // An ear on the far side.
  img.ellipse(cx - 9, cy + 1, 2.4, 3.2, (x, y, nx, ny) => tone(skin, 1.4 + sphere(nx, ny) * 2, x, y));
  img.set(cx - 9, cy + 1, skin[0]!);
  // The beard, curling under the chin.
  img.ellipse(cx + 3, cy + 8, 9, 4.6, (x, y, nx, ny) => {
    if (ny < -0.2) return null;
    const curl = hash2(x, y, seed + 5) > 0.7 ? -0.8 : 0;
    return tone(beard, 1.2 + sphere(nx, ny) * 2.4 + curl, x, y);
  });
  // A floppy Phrygian cap, its tip falling forward.
  img.poly(
    [
      [cx - 12, cy - 3],
      [cx - 10, cy - 9],
      [cx - 4, cy - 13],
      [cx + 4, cy - 14],
      [cx + 10, cy - 12],
      [cx + 14, cy - 8],
      [cx + 15, cy - 4],
      [cx + 11, cy - 6],
      [cx + 6, cy - 8],
      [cx - 2, cy - 7],
      [cx - 8, cy - 4],
    ],
    (x, y) => tone(cap, 3.4 - (x - (cx - 12)) / 9 - (y - (cy - 14)) / 9 + (hash2(x, y, seed) > 0.85 ? -0.6 : 0), x, y),
  );
  // The cap's rolled brim.
  for (let x = cx - 12; x <= cx + 9; x++) {
    const y = Math.round(cy - 4 - (x - (cx - 12)) * 0.16);
    img.set(x, y, tone(cap, x < cx ? 2.6 : 1.4, x, y));
    img.set(x, y + 1, cap[0]!);
  }
  // A bell on the tip.
  img.ellipse(cx + 15, cy - 3, 1.6, 1.6, hex('#E8C76A'));
  img.set(cx + 14, cy - 4, hex('#FFF2C0'));
  // The face, turned to the right: brow, a glaring eye, a great nose, a shout.
  const ex = cx + 5;
  const ey = cy - 1;
  img.ellipse(ex, ey, 2.6, 2.2, white);
  img.rect(ex + 1, ey - 1, 2, 2, ink);
  img.set(ex + 1, ey - 1, hex('#F4E2A8'));
  glow.set(ex + 1, ey - 1, hex('#F4E2A8'));
  img.hline(ex - 3, ex + 3, ey - 3, beard[0]!);
  img.hline(ex - 1, ex + 4, ey - 4, beard[1]!);
  img.ellipse(cx + 11, cy + 2, 3.2, 3.4, (x, y, nx, ny) => tone(skin, 1.6 + sphere(nx, ny) * 4, x, y));
  img.set(cx + 13, cy + 4, skin[0]!);
  img.set(cx + 12, cy, skin[5]!);
  // Cheek flush.
  img.set(cx + 6, cy + 3, hex('#E07A6A'));
  img.set(cx + 7, cy + 3, hex('#D86A5A'));
  if (p.shout) {
    img.ellipse(cx + 7, cy + 7, 4, 2.6, hex('#3A1014'));
    img.hline(cx + 4, cx + 10, cy + 5, white);
    img.set(cx + 7, cy + 8, hex('#C8505A'));
  } else {
    img.hline(cx + 3, cx + 10, cy + 6, ink);
    img.set(cx + 10, cy + 5, ink);
    img.hline(cx + 4, cx + 9, cy + 7, white);
  }
  img.outline(null);
  return { a: img, e: glow };
}

export function gryllusArt(seed = 3): EnemyArt {
  const poses: GryllusPose[] = [
    { dx: 0, dy: 0, crouch: 0, shout: false },
    { dx: 0, dy: 1, crouch: 1, shout: false },
    { dx: 0, dy: 1, crouch: 1, shout: false },
    { dx: 0, dy: 0, crouch: 0, shout: false },
    { dx: 3, dy: 2, crouch: 2, shout: true },
  ];
  return sheetOf(
    poses.map((p) => gryllusFrame(p, seed)),
    { idle: [0, 1, 2, 3], lunge: [4] },
    [17, 39],
  );
}

// ---------------------------------------------------------------------------------------
// The Great Snail of the Causeway: a shell like a millstone, horns like lances.

interface SnailPose {
  /** Head and horns out of the shell. */
  out: boolean;
  /** Horn sway, -1..1. */
  sway: number;
  /** Lunging forward. */
  lunge: number;
  /** Breathing. */
  swell: number;
}

function snailFrame(p: SnailPose, seed: number): { a: PixelImage; e: PixelImage } {
  const W = 136;
  const H = 84;
  const img = new PixelImage(W, H);
  const glow = new PixelImage(W, H);
  const body = ramp('#8E9A74', 7);
  const shell = ramp('#94602E', 7);
  const cream = ramp('#C9A872', 6);
  const gold = ramp('#D9A52E', 4);
  const slime = hex('#E8F2D8');
  const noise = new Noise2D(seed);
  const scx = 48;
  const scy = 40 - p.swell;
  const sr = 31 + p.swell * 0.5;
  // ---- the foot ----
  const footEnd = p.out ? 104 + p.lunge : 82;
  for (let x = 6; x < footEnd; x++) {
    const u = (x - 6) / (footEnd - 6);
    const top = H - 3 - 10 * Math.sin(Math.min(1, u * 1.15) * Math.PI) * (p.out ? 1 : 0.8) - 2;
    for (let y = Math.floor(top); y < H - 1; y++) {
      const v = (y - top) / Math.max(1, H - 1 - top);
      let t = 4.6 - v * 3.6 + (noise.value(x / 4, y / 2) - 0.5) * 0.9;
      if (y === H - 2) t = 0.4;
      img.set(x, y, tone(body, t, x, y));
    }
    // Wet speculars along the top of the foot.
    if (hash2(x, 1, seed) > 0.82) {
      const y = Math.ceil(top) + 1;
      img.set(x, y, slime);
      glow.set(x, y, hex('#5A6A50'));
    }
  }
  // A slime trail behind.
  for (let x = 0; x < 14; x++) if (hash2(x, 2, seed) > 0.4) img.set(x, H - 1, hex('#B8C8A8', 200));
  // ---- the shell: a lit spiral of whorls, a monk's gold line along the groove ----
  const turns = 3.1;
  img.ellipse(scx, scy, sr, sr * 0.96, (x, y, nx, ny) => {
    const r = Math.hypot(nx, ny);
    let th = Math.atan2(ny, nx) / (Math.PI * 2);
    if (th < 0) th += 1;
    // Archimedean spiral: whorl index and position across it.
    const s = r * turns - th;
    const f = s - Math.floor(s);
    const whorl = Math.floor(s);
    const light = sphere(nx * 0.9, ny * 0.9);
    // Each whorl is a rounded band: lit on its outer edge, shaded into the groove.
    const band = Math.sin(f * Math.PI);
    let t = 0.8 + light * 4.2 + band * 1.4 - 0.7;
    const ramp_ = whorl % 2 === 0 ? shell : cream;
    if (f < 0.07 || f > 0.95) return tone(shell, 0.3 + light * 1.2, x, y);
    if (f > 0.1 && f < 0.14 && r > 0.18) return light > 0.35 ? gold[3]! : gold[1]!;
    // Growth lines across the whorls.
    if (Math.floor(th * 46 + whorl * 3) % 5 === 0 && band > 0.3) t -= 0.7;
    t += (noise.value(x / 3, y / 3) - 0.5) * 0.6;
    return tone(ramp_, ramp_ === cream ? t * 0.8 : t, x, y);
  });
  // The aperture where the body leaves the shell.
  const apx = scx + sr * 0.68;
  const apy = scy + sr * 0.56;
  if (!p.out) {
    img.ellipse(apx, apy, 7, 8, (_x, _y, nx) => (nx < 0.5 ? hex('#20160E') : null));
    // Two lights in the dark of the shell: it is watching.
    for (const [ex, ey] of [
      [apx - 1, apy - 2],
      [apx + 3, apy - 1],
    ] as const) {
      img.set(Math.round(ex), Math.round(ey), hex('#F6F0B0'));
      glow.set(Math.round(ex), Math.round(ey), hex('#FFF6C8'));
    }
  }
  // ---- the head and horns ----
  if (p.out) {
    const hx = 98 + p.lunge;
    const hy = 46 - p.lunge * 0.3;
    // The neck rises from the foot.
    for (let y = Math.floor(hy); y < H - 6; y++) {
      const v = (y - hy) / (H - 6 - hy);
      const c = hx - 4 - v * 10;
      const hw = 7 + v * 5;
      for (let x = Math.floor(c - hw); x < c + hw; x++) {
        const u = (x - (c - hw)) / (hw * 2);
        img.set(x, y, tone(body, 1.2 + (1 - Math.abs(u - 0.35) * 2) * 4.2 + (noise.value(x / 3, y / 3) - 0.5), x, y));
      }
    }
    img.ellipse(hx, hy, 10, 8, (x, y, nx, ny) => tone(body, 1 + sphere(nx, ny) * 5.6 + (noise.value(x / 3, y / 3) - 0.5) * 0.6, x, y));
    // Mouth.
    img.hline(hx + 2, hx + 9, hy + 4, body[0]!);
    img.set(hx + 9, hy + 3, body[0]!);
    // Lower feelers.
    img.line(hx + 7, hy + 1, hx + 13, hy + 4 + p.sway, body[2]!);
    img.set(hx + 13, hy + 4 + p.sway, body[4]!);
    // The great horns, with eyes at their tips.
    for (const [ox, len, ang] of [
      [-3, 26, -1.95],
      [3, 30, -1.32],
    ] as const) {
      const a = ang + p.sway * 0.08 + p.lunge * 0.04;
      const bx = hx + ox;
      const by = hy - 6;
      const tx = bx + Math.cos(a) * len;
      const ty = by + Math.sin(a) * len;
      const n = Math.ceil(len * 2);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const bend = Math.sin(t * Math.PI) * 2 * (ox < 0 ? -1 : 1);
        const x = bx + (tx - bx) * t + bend;
        const y = by + (ty - by) * t;
        const wd = 2.2 - t * 1.1;
        for (let k = -wd; k <= wd; k += 0.5) {
          const px = Math.round(x + k);
          const py = Math.round(y);
          img.set(px, py, tone(body, k < -0.5 ? 5 : k < 0.6 ? 3.6 : 1.6, px, py));
        }
      }
      const exx = Math.round(tx + Math.sin(Math.PI) * 2);
      const eyy = Math.round(ty);
      img.ellipse(exx, eyy, 3.4, 3.4, (x, y, nx, ny) => tone(cream, 0.8 + sphere(nx, ny) * 4, x, y));
      img.rect(exx, eyy - 1, 2, 2, hex('#14100C'));
      img.set(exx, eyy - 1, hex('#FFF6C8'));
      glow.ellipse(exx, eyy, 3.4, 3.4, hex('#4A4628'));
      glow.set(exx, eyy - 1, hex('#FFF6C8'));
    }
  }
  img.outline(null);
  return { a: img, e: glow };
}

export function greatSnailArt(seed = 11): EnemyArt {
  const poses: SnailPose[] = [
    { out: true, sway: 0, lunge: 0, swell: 0 },
    { out: true, sway: 1, lunge: 0, swell: 1 },
    { out: true, sway: 0, lunge: 0, swell: 1 },
    { out: true, sway: -1, lunge: 0, swell: 0 },
    { out: true, sway: 1, lunge: 8, swell: 0 },
    { out: false, sway: 0, lunge: 0, swell: 0 },
    { out: false, sway: 0, lunge: 0, swell: 1 },
  ];
  return sheetOf(
    poses.map((p) => snailFrame(p, seed)),
    { idle: [0, 1, 2, 3], lunge: [4], shell: [5, 5, 6, 6] },
    [56, 83],
  );
}

/** The art for an enemy kind, or null for those drawn as people (the Brothers). */
export function enemyArt(kind: string): EnemyArt | null {
  switch (kind) {
    case 'gryllus':
      return gryllusArt();
    case 'greatSnail':
      return greatSnailArt();
    default:
      return null;
  }
}
