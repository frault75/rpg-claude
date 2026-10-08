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

// ---------------------------------------------------------------------------------------
// The marginal hare: up on its hind legs with a longbow, as in the margins where the
// hares hunt the hunters.

function hareFrame(draw: number, crouch: number, seed: number): { a: PixelImage; e: PixelImage } {
  const W = 34;
  const H = 40;
  const img = new PixelImage(W, H);
  const glow = new PixelImage(W, H);
  const fur = ramp('#B08A62', 6);
  const belly = ramp('#E8D8B8', 4);
  const wood = ramp('#7A4E2E', 4);
  const noise = new Noise2D(seed);
  const cy = 24 + crouch;
  // Hind legs and big feet.
  img.ellipse(13, H - 6, 6, 5, (x, y, nx, ny) => tone(fur, 1.4 + sphere(nx, ny) * 3.4, x, y));
  img.ellipse(15, H - 2, 6, 1.6, fur[1]!);
  // Body, upright, the pale belly to the front.
  img.ellipse(14, cy, 7, 9, (x, y, nx, ny) => tone(fur, 1.2 + sphere(nx, ny) * 4.2 + (noise.value(x / 2, y / 2) - 0.5) * 0.6, x, y));
  img.ellipse(17, cy + 1, 3.6, 7, (x, y, nx, ny) => tone(belly, 1 + sphere(nx, ny) * 2.6, x, y));
  // Head, ears laid back a little, a bright eye.
  const hy = cy - 11;
  img.ellipse(17, hy, 5.4, 4.6, (x, y, nx, ny) => tone(fur, 1.4 + sphere(nx, ny) * 4, x, y));
  for (const [x0, lean] of [
    [13, -3],
    [16, -1],
  ] as const) {
    for (let k = 0; k < 11; k++) {
      const x = Math.round(x0 + (lean * k) / 10);
      const y = hy - 3 - k;
      img.set(x, y, fur[3]!);
      img.set(x + 1, y, k > 2 && k < 9 ? hex('#D89A8A') : fur[2]!);
      img.set(x + 2, y, fur[1]!);
    }
  }
  img.set(20, hy - 1, hex('#1A1210'));
  img.set(20, hy - 2, hex('#F4E2A8'));
  glow.set(20, hy - 2, hex('#6A5A30'));
  img.set(22, hy + 1, hex('#5A3A30'));
  // The longbow, drawn back by `draw`.
  const bx = 24;
  for (let y = cy - 12; y <= cy + 8; y++) {
    const k = (y - (cy - 2)) / 10;
    img.set(Math.round(bx + (1 - k * k) * 3), y, wood[2]!);
  }
  const pull = Math.round(draw * 5);
  img.line(bx, cy - 12, bx - pull, cy - 2, hex('#E8E0D0'));
  img.line(bx - pull, cy - 2, bx, cy + 8, hex('#E8E0D0'));
  if (draw > 0) img.line(bx - pull, cy - 2, bx + 6, cy - 2, wood[3]!);
  // Paws on the bow and the string.
  img.ellipse(bx + 1, cy - 2, 1.6, 1.4, fur[4]!);
  img.ellipse(bx - pull, cy - 2, 1.6, 1.4, fur[3]!);
  img.outline(null);
  return { a: img, e: glow };
}

export function hareArt(seed = 7): EnemyArt {
  const frames = [
    hareFrame(0, 0, seed),
    hareFrame(0, 1, seed),
    hareFrame(0, 1, seed),
    hareFrame(0, 0, seed),
    hareFrame(1, 0, seed),
  ];
  return sheetOf(frames, { idle: [0, 1, 2, 3], lunge: [4] }, [14, 39]);
}

// ---------------------------------------------------------------------------------------
// The babewyn: a grotesque of the margins with a face at each end, both of them hungry.

function babewynFrame(bob: number, bite: boolean, seed: number): { a: PixelImage; e: PixelImage } {
  const W = 46;
  const H = 40;
  const img = new PixelImage(W, H);
  const glow = new PixelImage(W, H);
  const hide = ramp('#7A8A4A', 6);
  const scale = ramp('#C9A84A', 4);
  const skin = ramp('#D89A84', 5);
  const noise = new Noise2D(seed);
  const by = 24 + bob;
  // Four clawed bird legs.
  for (const lx of [12, 17, 27, 32]) {
    img.line(lx, by + 6, lx - 1, H - 2, scale[1]!);
    img.line(lx - 1, H - 2, lx - 3, H - 1, scale[2]!);
    img.line(lx - 1, H - 2, lx + 1, H - 1, scale[2]!);
  }
  // The body, round, scaled along the back.
  img.ellipse(22, by, 14, 8, (x, y, nx, ny) => {
    let t = 1 + sphere(nx, ny) * 4.4 + (noise.value(x / 3, y / 3) - 0.5) * 0.8;
    if (ny < -0.3 && (x + y) % 4 === 0) t += 0.8;
    return tone(hide, t, x, y);
  });
  // The front head: a man's face, bearded, with a bishop's ears.
  const fx = 36 + (bite ? 3 : 0);
  const fy = by - 8;
  img.ellipse(fx, fy, 6, 6.4, (x, y, nx, ny) => tone(skin, 1 + sphere(nx, ny) * 3.6, x, y));
  img.set(fx + 2, fy - 1, hex('#1A1210'));
  img.set(fx + 2, fy - 2, hex('#F4E2A8'));
  glow.set(fx + 2, fy - 2, hex('#6A5A30'));
  img.ellipse(fx + 1, fy + 4, 4, 2.2, (x, y) => tone(ramp('#6A4630', 3), 1.4, x, y));
  if (bite) {
    img.hline(fx + 1, fx + 5, fy + 2, hex('#3A1014'));
    img.hline(fx + 1, fx + 5, fy + 3, hex('#F4EEE0'));
  } else img.hline(fx + 1, fx + 5, fy + 2, hex('#3A1014'));
  img.set(fx - 4, fy - 6, skin[3]!);
  img.set(fx - 5, fy - 7, skin[2]!);
  // The tail curls up into a second, smaller face that spits.
  for (let k = 0; k < 10; k++) {
    const x = Math.round(9 - k * 0.6);
    const y = Math.round(by - 2 - k * 1.3);
    img.set(x, y, hide[2]!);
    img.set(x + 1, y, hide[3]!);
  }
  const tx = 4;
  const ty = by - 16;
  img.ellipse(tx, ty, 3.6, 3.8, (x, y, nx, ny) => tone(skin, 1 + sphere(nx, ny) * 3, x, y));
  img.set(tx - 1, ty - 1, hex('#1A1210'));
  img.hline(tx - 2, tx + 1, ty + 1, hex('#3A1014'));
  img.outline(null);
  return { a: img, e: glow };
}

export function babewynArt(seed = 9): EnemyArt {
  return sheetOf(
    [babewynFrame(0, false, seed), babewynFrame(1, false, seed), babewynFrame(1, false, seed), babewynFrame(0, false, seed), babewynFrame(0, true, seed)],
    { idle: [0, 1, 2, 3], lunge: [4] },
    [22, 39],
  );
}

// ---------------------------------------------------------------------------------------
// The Blot: every scraped name drained down to the Ink-Well, woken up. A hundred eyes made of
// letters open and close in it. Its Blotlets are drops of the same ink.

const LETTER_EYES = ['A', 'E', 'O', 'R', 'S', 'M', 'N', 'I'];

function blotFrame(bob: number, rise: number, seed: number): { a: PixelImage; e: PixelImage } {
  const W = 64;
  const H = 52;
  const img = new PixelImage(W, H);
  const glow = new PixelImage(W, H);
  const ink = ramp('#1C1A2E', 5);
  const noise = new Noise2D(seed);
  const cy = 30 - rise + bob;
  // The mass: a heap of ink, wider at the foot, with drips and a glossy crown.
  for (let y = 4; y < H; y++)
    for (let x = 0; x < W; x++) {
      const nx = (x + 0.5 - W / 2) / (24 + (y - cy) * 0.35);
      const ny = (y + 0.5 - cy) / 22;
      const wob = (noise.value(x / 6, y / 6 + bob) - 0.5) * 0.35;
      if (nx * nx + ny * ny > 1 + wob && y < H - 3) continue;
      if (y >= H - 3 && Math.abs(x + 0.5 - W / 2) > 29 - (H - y) * 2) continue;
      let t = 0.6 + sphere(Math.max(-1, Math.min(1, nx)), Math.max(-1, Math.min(1, ny))) * 3.4;
      if (hash2(x, y >> 1, seed) > 0.96) t += 1.2;
      img.set(x, y, tone(ink, t, x, y));
    }
  // Drips running down.
  for (const dx of [-14, -3, 9, 18]) {
    const x = W / 2 + dx;
    for (let y = cy + 6; y < H - 1; y++) if (img.alpha(x, y) > 0) img.set(x, y, ink[0]!);
  }
  // Eyes made of letters, pale and glowing, scattered over it.
  const letter = (ch: string, x: number, y: number) => {
    const shapes: Record<string, string[]> = {
      A: ['.#.', '#.#', '###'],
      E: ['##', '#.', '##'],
      O: ['.#.', '#.#', '.#.'],
      R: ['##', '##', '#.'],
      S: ['.#', '#.', '#.'],
      M: ['#.#', '###', '#.#'],
      N: ['#.#', '##.', '#.#'],
      I: ['#', '#', '#'],
    };
    (shapes[ch] ?? shapes.O!).forEach((row, j) =>
      [...row].forEach((c, i) => {
        if (c !== '#') return;
        img.set(x + i, y + j, hex('#EDE3CC'));
        glow.set(x + i, y + j, hex('#C8B890'));
      }),
    );
  };
  for (let i = 0; i < 9; i++) {
    const x = Math.round(W / 2 - 18 + hash2(i, 1, seed) * 34);
    const y = Math.round(cy - 14 + hash2(i, 2, seed) * 24);
    if (img.alpha(x, y) > 0 && img.alpha(x + 2, y + 2) > 0 && (bob + i) % 4 !== 0) letter(LETTER_EYES[i % LETTER_EYES.length]!, x, y);
  }
  img.outline(null);
  return { a: img, e: glow };
}

export function blotArt(seed = 13): EnemyArt {
  return sheetOf([blotFrame(0, 0, seed), blotFrame(1, 0, seed), blotFrame(2, 0, seed), blotFrame(1, 0, seed), blotFrame(0, 6, seed)], { idle: [0, 1, 2, 3], lunge: [4] }, [32, 51]);
}

function blotletFrame(bob: number, seed: number): { a: PixelImage; e: PixelImage } {
  const img = new PixelImage(20, 18);
  const glow = new PixelImage(20, 18);
  const ink = ramp('#22203A', 5);
  img.ellipse(10, 12 - bob * 0.5, 7, 5.4 + bob * 0.4, (x, y, nx, ny) => tone(ink, 0.6 + sphere(nx, ny) * 3.6, x, y));
  img.set(10, 5 - bob, ink[2]!);
  img.set(10, 6 - bob, ink[1]!);
  for (const ex of [7, 12]) {
    img.set(ex, 11, hex('#EDE3CC'));
    glow.set(ex, 11, hex('#B8A880'));
  }
  img.outline(null);
  void seed;
  return { a: img, e: glow };
}

export function blotletArt(seed = 14): EnemyArt {
  return sheetOf([blotletFrame(0, seed), blotletFrame(1, seed), blotletFrame(2, seed), blotletFrame(1, seed), blotletFrame(3, seed)], { idle: [0, 1, 2, 3], lunge: [4] }, [10, 17]);
}

// ---------------------------------------------------------------------------------------
// The caladrius: the white bird of the bestiaries, which looks away from the dying.

function caladriusFrame(wing: number, look: boolean): { a: PixelImage; e: PixelImage } {
  const img = new PixelImage(30, 32);
  const glow = new PixelImage(30, 32);
  const white = ramp('#F2EEE6', 5, 0.6);
  const gold = ramp('#D8A838', 4);
  // Legs.
  img.vline(13, 24, 31, gold[1]!);
  img.vline(17, 24, 31, gold[1]!);
  img.hline(11, 14, 31, gold[2]!);
  img.hline(16, 19, 31, gold[2]!);
  // Body, neck and head; it looks away (left) when it means to.
  img.ellipse(15, 20, 8, 5.6, (x, y, nx, ny) => tone(white, 1 + sphere(nx, ny) * 3.6, x, y));
  const hx = look ? 9 : 21;
  img.line(look ? 12 : 18, 16, hx, 9, white[3]!);
  img.line(look ? 13 : 17, 16, hx + (look ? 1 : -1), 9, white[2]!);
  img.ellipse(hx, 8, 3, 2.6, (x, y, nx, ny) => tone(white, 1.4 + sphere(nx, ny) * 3, x, y));
  img.hline(look ? hx - 6 : hx + 2, look ? hx - 2 : hx + 6, 8, gold[3]!);
  const eye = look ? hx - 1 : hx + 1;
  img.set(eye, 7, hex('#2A2030'));
  glow.set(eye, 7, hex('#6A5AA0'));
  // The wing, raised or folded.
  img.poly(
    [
      [9, 18],
      [22, 17 - wing * 5],
      [24, 21 - wing * 3],
      [12, 23],
    ],
    (x) => tone(white, 2.6 - (x - 9) * 0.08, x, 20),
  );
  // Tail.
  img.poly(
    [
      [7, 20],
      [2, 24],
      [8, 23],
    ],
    white[1]!,
  );
  img.outline(null);
  return { a: img, e: glow };
}

export function caladriusArt(): EnemyArt {
  return sheetOf([caladriusFrame(0, false), caladriusFrame(1, false), caladriusFrame(1, false), caladriusFrame(0, false), caladriusFrame(2, true)], { idle: [0, 1, 2, 3], lunge: [4] }, [15, 31]);
}

// ---------------------------------------------------------------------------------------
// The bishop-fish: a fish stood up on its tail in a mitre and a cope, blessing.

function bishopFishFrame(bob: number, bless: boolean): { a: PixelImage; e: PixelImage } {
  const W = 28;
  const H = 46;
  const img = new PixelImage(W, H);
  const glow = new PixelImage(W, H);
  const scale = ramp('#4A8A84', 5);
  const cope = ramp('#B8322A', 5);
  const gold = ramp('#D8A838', 4);
  // Tail fins at the foot.
  img.poly(
    [
      [8, 45],
      [14, 38],
      [20, 45],
    ],
    scale[1]!,
  );
  // The body, upright, scaled; a cope over the shoulders.
  img.ellipse(14, 26 + bob, 8, 13, (x, y, nx, ny) => tone(scale, 1 + sphere(nx, ny) * 3.4 + ((x + y * 2) % 5 === 0 ? -0.6 : 0), x, y));
  img.poly(
    [
      [5, 20 + bob],
      [23, 20 + bob],
      [25, 36 + bob],
      [3, 36 + bob],
    ],
    (x) => tone(cope, 2.8 - (x - 3) * 0.1, x, 28),
  );
  img.vline(14, 20 + bob, 36 + bob, gold[3]!);
  // A round fish face, a gaping mouth, a goggle eye.
  img.ellipse(17, 14 + bob, 3, 3, hex('#F2EEE6'));
  img.set(18, 14 + bob, hex('#1A1410'));
  glow.set(18, 14 + bob, hex('#5A6A8A'));
  img.ellipse(21, 18 + bob, 1.6, 2.2, hex('#5A1A20'));
  // The mitre.
  img.poly(
    [
      [8, 10 + bob],
      [20, 10 + bob],
      [18, 2 + bob],
      [14, -1 + bob],
      [10, 2 + bob],
    ],
    (x) => tone(ramp('#F2EDE2', 5), 3.4 - (x - 8) * 0.12, x, 4),
  );
  img.hline(8, 19, 9 + bob, gold[2]!);
  img.vline(14, 0 + bob, 9 + bob, gold[3]!);
  // A fin raised in blessing.
  if (bless) {
    img.poly(
      [
        [22, 24 + bob],
        [27, 15 + bob],
        [25, 25 + bob],
      ],
      scale[3]!,
    );
    glow.ellipse(26, 15 + bob, 2, 2, hex('#C8B060'));
  }
  img.outline(null);
  return { a: img, e: glow };
}

export function bishopFishArt(): EnemyArt {
  return sheetOf([bishopFishFrame(0, false), bishopFishFrame(1, false), bishopFishFrame(1, false), bishopFishFrame(0, false), bishopFishFrame(0, true)], { idle: [0, 1, 2, 3], lunge: [4] }, [14, 45]);
}

/** The art for an enemy kind, or null for those drawn as people (the Brothers). */
// ---------------------------------------------------------------------------------------
// The corpse-candle: someone who should have died, burning blue on the fen. A shroud of
// tallow running with drips, a face half sunk in the wax, and a cold flame for a head.

function corpseCandleFrame(flick: number, flare: number, seed: number): { a: PixelImage; e: PixelImage } {
  const W = 22;
  const H = 42;
  const img = new PixelImage(W, H);
  const glow = new PixelImage(W, H);
  const wax = ramp('#E4DCC4', 6, 0.5);
  const shade = ramp('#9A9888', 4);
  const cx = 11 + flare * 0.6;
  // The puddle of wax it stands in, and the cold light on it.
  img.ellipse(11, 40, 9, 2, (x) => tone(shade, 2.2 - Math.abs(x - 11) * 0.18, x, 40));
  // The shroud: narrow at the shoulders, wider and guttered at the foot.
  for (let y = 14; y < 40; y++) {
    const k = (y - 14) / 26;
    const half = 3.4 + k * 4.2 + Math.sin(y * 0.9 + seed) * 0.4;
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      const nx = (x - cx) / half;
      if (Math.abs(nx) > 1) continue;
      img.set(x, y, tone(wax, 3.6 - nx * 1.6 - k * 0.8, x, y));
    }
  }
  // Drips, run from the shoulders.
  for (const [dx, len] of [
    [-3, 9],
    [2, 13],
    [4, 6],
    [-1, 17],
  ] as const) {
    const x = Math.round(cx + dx);
    for (let y = 15; y < 15 + len; y++) img.set(x, y, wax[5 - (y % 2)]!);
    img.set(x, 15 + len, wax[4]!);
  }
  // The face, sinking: two eyes and a mouth pressed into the wax.
  img.set(Math.round(cx) - 2, 18, shade[0]!);
  img.set(Math.round(cx) + 1, 18, shade[0]!);
  img.hline(Math.round(cx) - 1, Math.round(cx), 21, shade[1]!);
  // The wick, and the flame: blue at the root, white at the heart.
  img.vline(Math.round(cx), 12, 14, hex('#2A2420'));
  const flameH = 9 + flare * 6 + flick;
  for (let y = 0; y < flameH; y++) {
    const fy = 12 - y;
    const k = y / flameH;
    const half = Math.max(0.5, Math.sin(Math.min(1, k * 1.3) * Math.PI) * (2.6 + flare));
    const lean = Math.round(Math.sin(k * 3 + flick) * 0.8 + flare * k * 2);
    for (let x = Math.floor(cx - half) + lean; x <= Math.ceil(cx + half) + lean; x++) {
      const core = Math.abs(x - cx - lean) < half * 0.45 && k > 0.15 && k < 0.7;
      const c = core ? hex('#F4F8FF') : k < 0.35 ? hex('#5A8AE0') : hex('#A8C8FF');
      if (fy < 0) continue;
      img.set(x, fy, c);
      glow.set(x, fy, core ? hex('#FFFFFF') : hex('#6A9AF0'));
    }
  }
  img.outline(null);
  return { a: img, e: glow };
}

export function corpseCandleArt(seed = 5): EnemyArt {
  return sheetOf(
    [corpseCandleFrame(0, 0, seed), corpseCandleFrame(1, 0, seed), corpseCandleFrame(0.5, 0, seed), corpseCandleFrame(-0.5, 0, seed), corpseCandleFrame(0, 1, seed)],
    { idle: [0, 1, 2, 3], lunge: [4] },
    [11, 41],
  );
}

// ---------------------------------------------------------------------------------------
// The ember-gryllus: a gryllus of the charcoal kilns, charred black, its cracks glowing.

export function emberGryllusArt(seed = 8): EnemyArt {
  const base = gryllusArt(seed);
  const a = new PixelImage(base.a.w, base.a.h);
  const e = new PixelImage(base.a.w, base.a.h);
  const char = ramp('#2A2222', 4);
  const ember = [hex('#C83A1A'), hex('#F07A2A'), hex('#FFC060'), hex('#FFF0B0')];
  for (let y = 0; y < base.a.h; y++)
    for (let x = 0; x < base.a.w; x++) {
      const p = base.a.get(x, y);
      if (!p[3]) continue;
      const lum = (p[0] * 0.3 + p[1] * 0.55 + p[2] * 0.15) / 255;
      // Light faces glow through the char; the rest is coal.
      const n = hash2(x, y, seed);
      if (lum > 0.62 || (lum > 0.45 && n > 0.7)) {
        const k = Math.min(3, Math.floor((lum - 0.45) * 7));
        a.set(x, y, ember[k]!);
        // Only the hottest cracks glow.
        if (k >= 2) e.set(x, y, ember[k - 1]!);
      } else a.set(x, y, char[Math.min(3, Math.floor(lum * 5))]!);
    }
  return { ...base, a, e };
}

export function enemyArt(kind: string): EnemyArt | null {
  switch (kind) {
    case 'emberGryllus':
      return emberGryllusArt();
    case 'corpseCandle':
      return corpseCandleArt();
    case 'gryllus':
      return gryllusArt();
    case 'greatSnail':
      return greatSnailArt();
    case 'hare':
      return hareArt();
    case 'babewyn':
      return babewynArt();
    case 'blot':
      return blotArt();
    case 'blotlet':
      return blotletArt();
    case 'caladrius':
      return caladriusArt();
    case 'bishopFish':
      return bishopFishArt();
    default:
      return null;
  }
}

/** The first frame of an enemy's sheet, to stand it in the world before a fight. */
export function enemyStill(kind: string): PixelImage | null {
  const art = enemyArt(kind);
  if (!art) return null;
  const img = new PixelImage(art.w, art.h);
  for (let y = 0; y < art.h; y++) for (let x = 0; x < art.w; x++) img.set(x, y, art.a.get(x, y));
  return img;
}
