/**
 * Ground for HD-2D maps. A map's layout is a grid of characters in screen space (a cliff
 * face is a row of cliff tiles below the ground it holds up), and the ground is painted
 * pixel by pixel from it: soft terrains meet along noisy edges, raised terrains cast a
 * lip of shadow, cliffs get strata and grass overhang, and water is left transparent for
 * the animated water underneath, with a distance-to-shore map for its foam.
 */

import { hash2, Noise2D } from '../engine/noise';
import { bayer, hex, PixelImage, type RGBA, ramp } from './pixel';

export const TILE = 16;

export type Terrain =
  | 'grass'
  | 'meadow'
  | 'dirt'
  | 'sand'
  | 'cobble'
  | 'flag'
  | 'wood'
  | 'snow'
  | 'rock'
  | 'cliff'
  | 'stairs'
  | 'water'
  | 'ice'
  | 'vellum'
  | 'gold'
  | 'void';

export const TERRAIN_CHARS: Readonly<Record<string, Terrain>> = {
  '.': 'grass',
  ',': 'meadow',
  d: 'dirt',
  s: 'sand',
  c: 'cobble',
  f: 'flag',
  w: 'wood',
  n: 'snow',
  r: 'rock',
  '|': 'cliff',
  '=': 'stairs',
  '~': 'water',
  i: 'ice',
  v: 'vellum',
  o: 'gold',
  ' ': 'void',
};

export const KINDS: readonly Terrain[] = ['void', 'grass', 'meadow', 'dirt', 'sand', 'cobble', 'flag', 'wood', 'snow', 'rock', 'cliff', 'stairs', 'water', 'ice', 'vellum', 'gold'];
const KIND_ID = new Map(KINDS.map((k, i) => [k, i]));

/** How far an edge wanders, in pixels (0 = crisp, for masonry and cliffs). */
const SOFT: Record<Terrain, number> = {
  void: 0,
  grass: 5,
  meadow: 5,
  dirt: 4,
  sand: 4,
  cobble: 1.5,
  flag: 0,
  wood: 0,
  snow: 5,
  rock: 3,
  cliff: 0,
  stairs: 0,
  water: 3.5,
  ice: 4,
  vellum: 6,
  gold: 1,
};

/** Which terrain sits on top where two meet (higher casts a lip onto lower). */
const RANK: Record<Terrain, number> = {
  void: 0,
  water: 0,
  ice: 1,
  vellum: 1,
  gold: 2,
  sand: 1,
  dirt: 1,
  cobble: 2,
  flag: 2,
  wood: 2,
  stairs: 2,
  rock: 2,
  cliff: 2,
  grass: 3,
  meadow: 3,
  snow: 3,
};

export interface GroundPalette {
  grass: string;
  dirt: string;
  sand: string;
  stone: string;
  wood: string;
  snow: string;
  rock: string;
  /** Black ice, as on a frozen mere. */
  ice: string;
  /** Blank vellum, where the world has been scraped (Ninefold Blank). */
  vellum: string;
  /** Burnished gold leaf, tooled with punchwork (the Margin). */
  gold: string;
  flowers: readonly string[];
}

export const GROUND_DEFAULT: GroundPalette = {
  grass: '#5C9A3C',
  dirt: '#8C6A44',
  sand: '#D6BE8A',
  stone: '#8E8A84',
  wood: '#8A5E38',
  snow: '#E6ECF4',
  rock: '#77726C',
  ice: '#62788E',
  vellum: '#EDE3CC',
  gold: '#C9A23C',
  flowers: ['#F4F0E8', '#F2D24A', '#E58AA8', '#8AA8E8', '#C79AE0'],
};

export interface Ground {
  image: PixelImage;
  /** Width and height in pixels. */
  w: number;
  h: number;
  /** Per pixel: distance from water to the nearest land pixel (0 on land), capped at 255. */
  shore: Uint8Array;
  /** Per pixel terrain id (index into KINDS). */
  kinds: Uint8Array;
  kindAt(px: number, py: number): Terrain;
}

export function parseLayout(layout: readonly string[]): Terrain[][] {
  const cols = Math.max(...layout.map((r) => r.length));
  return layout.map((row) => {
    const out: Terrain[] = [];
    for (let i = 0; i < cols; i++) out.push(TERRAIN_CHARS[row[i] ?? ' '] ?? 'void');
    return out;
  });
}

export function paintGround(layout: readonly string[], seed = 1, pal: GroundPalette = GROUND_DEFAULT): Ground {
  const grid = parseLayout(layout);
  const th = grid.length;
  const tw = grid[0]?.length ?? 0;
  const W = tw * TILE;
  const H = th * TILE;
  const img = new PixelImage(W, H);
  const noise = new Noise2D(seed);
  const nj = new Noise2D(seed + 7);
  const at = (tx: number, ty: number): Terrain => grid[Math.min(th - 1, Math.max(0, ty))]![Math.min(tw - 1, Math.max(0, tx))]!;

  // 1. Terrain per pixel, with wandering edges between soft terrains.
  const kinds = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t0 = at(Math.floor(x / TILE), Math.floor(y / TILE));
      const jx = (nj.fbm(x * 0.09, y * 0.09, 3) - 0.5) * 2;
      const jy = (nj.fbm(x * 0.09 + 31, y * 0.09 + 17, 3) - 0.5) * 2;
      const probe = at(Math.floor((x + jx * 5) / TILE), Math.floor((y + jy * 5) / TILE));
      const a = Math.min(SOFT[t0], SOFT[probe]);
      let t = t0;
      if (a > 0) t = at(Math.floor((x + jx * a) / TILE), Math.floor((y + jy * a) / TILE));
      kinds[y * W + x] = KIND_ID.get(t)!;
    }
  }
  const kindAt = (x: number, y: number): Terrain => KINDS[kinds[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))]!]!;

  // 2. Distance from water to land (for foam) and from land to water (for wet sand).
  const WATER = KIND_ID.get('water')!;
  const VOID = KIND_ID.get('void')!;
  // The void (sky, darkness) is not a shore: water meets it without foam.
  const shore = distanceField(kinds, W, H, (k) => k !== WATER && k !== VOID);
  const inland = distanceField(kinds, W, H, (k) => k === WATER);

  // 3. Cliff runs: how far each cliff pixel is below the top of its face, and above its foot.
  const CLIFF = KIND_ID.get('cliff')!;
  const fromTop = new Uint8Array(W * H);
  const toFoot = new Uint8Array(W * H);
  for (let x = 0; x < W; x++) {
    let run = 0;
    for (let y = 0; y < H; y++) {
      run = kinds[y * W + x] === CLIFF ? run + 1 : 0;
      fromTop[y * W + x] = Math.min(255, run);
    }
    run = 0;
    for (let y = H - 1; y >= 0; y--) {
      run = kinds[y * W + x] === CLIFF ? run + 1 : 0;
      toFoot[y * W + x] = Math.min(255, run);
    }
  }

  const R = {
    grass: ramp(pal.grass, 6),
    dirt: ramp(pal.dirt, 5),
    sand: ramp(pal.sand, 5),
    stone: ramp(pal.stone, 6),
    wood: ramp(pal.wood, 5),
    snow: ramp(pal.snow, 5, 0.5),
    rock: ramp(pal.rock, 6),
    ice: ramp(pal.ice, 5, 0.7),
    vellum: ramp(pal.vellum, 5, 0.35),
    gold: ramp(pal.gold, 6, 0.8),
    moss: ramp('#5E7A3A', 4),
  };
  const pick = (r: readonly RGBA[], t: number, x: number, y: number): RGBA => {
    const f = Math.min(r.length - 1, Math.max(0, t));
    const i = Math.floor(f);
    return f - i > bayer(x, y) && i + 1 < r.length ? r[i + 1]! : r[i]!;
  };
  const h1 = (x: number, y: number, s = 0) => hash2(x, y, seed * 131 + s);

  // 4. Shade each pixel.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = kindAt(x, y);
      const i = y * W + x;
      const lo = noise.fbm(x / 26, y / 26, 3);
      const hi = h1(x, y);
      let c: RGBA | null = null;
      switch (k) {
        case 'void':
        case 'water':
          c = null;
          break;
        case 'grass':
        case 'meadow': {
          let t = 2.1 + (lo - 0.5) * 2.6;
          if (hi < 0.07) t -= 1.2;
          else if (hi > 0.95) t += 1;
          c = pick(R.grass, t, x, y);
          break;
        }
        case 'snow': {
          const t = 3 + (lo - 0.5) * 2 - (noise.value(x / 9, y / 5) > 0.7 ? 1 : 0);
          c = hi > 0.995 ? hex('#FFFFFF') : pick(R.snow, t, x, y);
          break;
        }
        case 'ice': {
          // Black ice: smooth and dark, with long wind streaks and pale hairline cracks.
          const crack = Math.abs(noise.value(x / 40 + 7, y / 40) - 0.5) < 0.011 || (lo > 0.58 && Math.abs(noise.value(x / 12 + 40, y / 12) - 0.5) < 0.012);
          const streak = Math.sin(x * 0.05 - y * 0.38 + noise.value(x / 34, y / 34) * 5) > 0.965;
          let t = 1.5 + (lo - 0.5) * 1.2 + (streak ? 0.9 : 0);
          if (crack) t = 3.4;
          c = hi > 0.998 ? hex('#F4F8FF') : pick(R.ice, t, x, y);
          break;
        }
        case 'vellum': {
          // A scraped page: fibres in the skin, the dry-point ruling still faintly there.
          let t = 2.4 + (lo - 0.5) * 0.9 + (noise.value(x / 3, y / 9) - 0.5) * 0.5;
          if (y % 12 === 0 && hash2(x >> 2, y, seed) > 0.2) t -= 1.3;
          if (x % 96 === 8 && hash2(x, y >> 2, seed) > 0.25) t -= 1.1;
          if (hash2(x >> 3, y >> 2, seed + 9) > 0.985) t -= 0.9;
          c = pick(R.vellum, t, x, y);
          break;
        }
        case 'gold': {
          // Gold leaf, burnished in long strokes, tooled with rings of punched dots.
          let t = 2.6 + Math.sin(x * 0.07 + y * 0.11 + noise.value(x / 20, y / 20) * 3) * 0.9 + (lo - 0.5) * 0.8;
          const cx = (x % 24) - 12;
          const cy = (y % 24) - 12;
          const ring = Math.abs(Math.hypot(cx, cy) - 7) < 0.6 && (x + y) % 2 === 0;
          if (ring || (x % 6 === 0 && y % 6 === 0)) t -= 1.6;
          if (hi > 0.992) t += 1.5;
          c = pick(R.gold, t, x, y);
          break;
        }
        case 'dirt': {
          let t = 2 + (lo - 0.5) * 2.2;
          if (hi < 0.05) t -= 1;
          c = pick(R.dirt, t, x, y);
          break;
        }
        case 'sand': {
          const rip = Math.sin(x * 0.35 + y * 1.1 + noise.value(x / 12, y / 12) * 6);
          let t = 2.4 + (lo - 0.5) * 1.6 - (rip > 0.88 ? 0.9 : 0);
          // Wet sand near the waterline.
          const wd = inland[i]!;
          if (wd < 6) t -= (6 - wd) * 0.3;
          c = pick(R.sand, t, x, y);
          break;
        }
        case 'rock': {
          const t = 2.2 + (lo - 0.5) * 2 + (noise.value(x / 4, y / 4) - 0.5) * 1.2;
          c = pick(R.rock, t, x, y);
          if (noise.value(x / 10 + 50, y / 10) > 0.72) c = pick(R.moss, 1.5 + hi, x, y);
          break;
        }
        case 'cobble':
          c = cobble(x, y, seed, R.stone, R.moss, lo);
          break;
        case 'flag':
          c = flagstone(x, y, seed, R.stone, lo);
          break;
        case 'wood':
          c = plank(x, y, seed, R.wood, noise);
          break;
        case 'stairs': {
          // Treads lit from above, risers in shadow, cheek walls at the sides.
          const leftCheek = kindAt(x - 3, y) !== 'stairs';
          const rightCheek = kindAt(x + 3, y) !== 'stairs';
          if (leftCheek || rightCheek) {
            const edgeCol = leftCheek ? (kindAt(x - 1, y) !== 'stairs' ? 5 : kindAt(x - 2, y) !== 'stairs' ? 4 : 3) : kindAt(x + 1, y) !== 'stairs' ? 0.6 : 1.6;
            c = pick(R.stone, edgeCol + (h1(x, y >> 2) - 0.5) * 0.6, x, y);
            break;
          }
          const ry = y % 5;
          const slab = Math.floor((x + Math.floor(y / 5) * 7) / 13);
          let t = ry === 0 ? 4.6 : ry === 1 ? 3.6 : ry === 2 ? 3 : ry === 3 ? 1.5 : 0.8;
          if ((x + Math.floor(y / 5) * 7) % 13 === 0 && ry < 3) t -= 1.2;
          t += (hash2(slab, Math.floor(y / 5), seed) - 0.5) * 0.6 + (lo - 0.5) * 0.4;
          c = pick(R.stone, t, x, y);
          break;
        }
        case 'cliff':
          c = cliffPixel(x, y, fromTop[i]!, toFoot[i]!, noise, R.rock, R.grass, seed);
          break;
      }
      if (c) img.set(x, y, c);
    }
  }

  // 5. Flowers and tufts.
  const ph = (x: number, y: number) => h1(x, y, 9);
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const k = kindAt(x, y);
      if (k === 'meadow' && ph(x, y) < 0.012) {
        const col = hex(pal.flowers[Math.floor(h1(x, y, 3) * pal.flowers.length)]!);
        const dark: RGBA = [col[0] * 0.6, col[1] * 0.55, col[2] * 0.7, 255];
        img.set(x, y - 1, col);
        img.set(x - 1, y, col);
        img.set(x + 1, y, dark);
        img.set(x, y + 1, dark);
        img.set(x, y, hex('#FFF6C8'));
      } else if ((k === 'grass' || k === 'meadow') && ph(x, y) > 0.985) {
        // A tuft: a dark root and light tips.
        img.set(x, y, R.grass[0]!);
        img.set(x - 1, y - 1, R.grass[4]!);
        img.set(x + 1, y - 1, R.grass[4]!);
        img.set(x, y - 2, R.grass[5]!);
      } else if ((k === 'dirt' || k === 'sand') && ph(x, y) > 0.993) {
        const r = k === 'dirt' ? R.dirt : R.sand;
        img.set(x, y, r[4]!);
        img.set(x + 1, y, r[3]!);
        img.set(x, y + 1, r[0]!);
        img.set(x + 1, y + 1, r[1]!);
      }
    }
  }

  // 6. Lips where a higher terrain meets a lower one, and shadow at the foot of cliffs.
  const out = new PixelImage(W, H);
  out.data.set(img.data);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = kindAt(x, y);
      if (k === 'void' || k === 'water') continue;
      const above = kindAt(x, y - 1);
      const above2 = kindAt(x, y - 2);
      const below = kindAt(x, y + 1);
      const c = img.get(x, y);
      if (c[3] === 0) continue;
      if (k !== 'cliff' && (above === 'cliff' || above2 === 'cliff')) {
        // Ambient occlusion at the foot of a cliff.
        out.set(x, y, darken(c, above === 'cliff' ? 0.55 : 0.75));
      } else if (RANK[above] > RANK[k] && above !== 'cliff') {
        out.set(x, y, darken(c, 0.68));
      } else if (RANK[below] < RANK[k] && below !== 'cliff' && below !== 'water' && below !== 'void') {
        out.set(x, y, darken(c, 0.8));
      }
    }
  }
  return { image: out, w: W, h: H, shore, kinds, kindAt };
}

export function darken(c: RGBA, k: number): RGBA {
  return [c[0] * k, c[1] * k * 0.97, c[2] * k * 1.02 + (1 - k) * 18, c[3]];
}

/** Breadth-first distance (in pixels, 4-connected) from every pixel to the nearest seed. */
function distanceField(kinds: Uint8Array, W: number, H: number, isSeed: (k: number) => boolean): Uint8Array {
  const d = new Uint8Array(W * H).fill(255);
  const q = new Int32Array(W * H);
  let head = 0;
  let tail = 0;
  for (let i = 0; i < W * H; i++) {
    if (isSeed(kinds[i]!)) {
      d[i] = 0;
      q[tail++] = i;
    }
  }
  while (head < tail) {
    const i = q[head++]!;
    const nd = d[i]! + 1;
    if (nd >= 255) continue;
    const x = i % W;
    const y = (i / W) | 0;
    if (x > 0 && d[i - 1]! > nd) ((d[i - 1] = nd), (q[tail++] = i - 1));
    if (x < W - 1 && d[i + 1]! > nd) ((d[i + 1] = nd), (q[tail++] = i + 1));
    if (y > 0 && d[i - W]! > nd) ((d[i - W] = nd), (q[tail++] = i - W));
    if (y < H - 1 && d[i + W]! > nd) ((d[i + W] = nd), (q[tail++] = i + W));
  }
  return d;
}

/** Rounded cobbles: a jittered cell grid, each stone lit from the upper left. */
function cobble(x: number, y: number, seed: number, stone: readonly RGBA[], moss: readonly RGBA[], lo: number): RGBA {
  const S = 6;
  const cx = Math.floor(x / S);
  const cy = Math.floor(y / S);
  let d1 = 1e9;
  let d2 = 1e9;
  let bx = 0;
  let by = 0;
  let bid = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const gx = cx + i;
      const gy = cy + j;
      const off = (gy & 1) * 0.5;
      const px = (gx + off + 0.2 + hash2(gx, gy, seed) * 0.6) * S;
      const py = (gy + 0.2 + hash2(gx, gy, seed + 5) * 0.6) * S;
      const d = (x + 0.5 - px) ** 2 + (y + 0.5 - py) ** 2 * 1.3;
      if (d < d1) {
        d2 = d1;
        d1 = d;
        bx = px;
        by = py;
        bid = hash2(gx, gy, seed + 11);
      } else if (d < d2) d2 = d;
    }
  }
  const edge = Math.sqrt(d2) - Math.sqrt(d1);
  if (edge < 1.1) return hash2(x, y, seed + 3) < 0.25 + (lo - 0.5) ? moss[1]! : stone[0]!;
  const lx = (x + 0.5 - bx) / S;
  const ly = (y + 0.5 - by) / S;
  let t = 2.6 + (bid - 0.5) * 1.4 - (lx + ly) * 2.2;
  if (edge < 2) t -= 0.6;
  const f = Math.min(stone.length - 1, Math.max(1, t));
  const k = Math.floor(f);
  return f - k > bayer(x, y) && k + 1 < stone.length ? stone[k + 1]! : stone[k]!;
}

/** Flagstones: courses of rectangular slabs with dark joints and a lit top edge. */
function flagstone(x: number, y: number, seed: number, stone: readonly RGBA[], lo: number): RGBA {
  const rowH = 8;
  const row = Math.floor(y / rowH);
  const ry = y % rowH;
  // Slab widths vary per row; find the slab under x.
  let sx = -Math.floor(hash2(row, 0, seed) * 12);
  let idx = 0;
  let w = 0;
  for (;;) {
    w = 10 + Math.floor(hash2(row, idx, seed + 1) * 9);
    if (x < sx + w) break;
    sx += w;
    idx++;
  }
  const rx = x - sx;
  if (ry === rowH - 1 || rx === w - 1) return stone[0]!;
  const id = hash2(row, idx, seed + 2);
  let t = 2.8 + (id - 0.5) * 1.2 + (lo - 0.5) * 0.8;
  if (ry === 0) t += 1.2;
  else if (rx === 0) t += 0.7;
  else if (ry === rowH - 2 || rx === w - 2) t -= 0.7;
  // A hairline crack in some slabs.
  if (id > 0.8 && Math.abs(rx - (ry * (id - 0.7) * 6 + w * 0.3)) < 0.6) t = 1;
  const f = Math.min(stone.length - 1, Math.max(0, t));
  const k = Math.floor(f);
  return f - k > bayer(x, y) && k + 1 < stone.length ? stone[k + 1]! : stone[k]!;
}

/** Floorboards: long planks with grain, dark seams and nails at the butt joints. */
function plank(x: number, y: number, seed: number, wood: readonly RGBA[], noise: Noise2D): RGBA {
  const ph = 5;
  const row = Math.floor(y / ph);
  const ry = y % ph;
  const len = 40;
  const off = Math.floor(hash2(row, 1, seed) * len);
  const rx = (x + off) % len;
  const id = hash2(row, Math.floor((x + off) / len), seed);
  if (ry === ph - 1) return wood[0]!;
  if (rx === 0) return wood[0]!;
  if ((rx === 2 || rx === len - 2) && ry === 2) return wood[0]!;
  const grain = noise.value(x * 0.08, y * 0.9 + id * 10);
  let t = 2.2 + (id - 0.5) * 1.2 + (grain - 0.5) * 1.4;
  if (ry === 0) t += 0.8;
  const f = Math.min(wood.length - 1, Math.max(0, t));
  const k = Math.floor(f);
  return f - k > bayer(x, y) && k + 1 < wood.length ? wood[k + 1]! : wood[k]!;
}

/** Cliff faces: a jumble of boulders, each lit on its upper left, with dark crevices, moss
 * on the ledges and grass hanging over the top. */
function cliffPixel(x: number, y: number, fromTop: number, toFoot: number, noise: Noise2D, rock: readonly RGBA[], grass: readonly RGBA[], seed: number): RGBA {
  // Grass overhang: ragged drips at the top of the face.
  const drip = 1 + Math.floor(hash2(x, 0, seed + 21) * 3) + (hash2(Math.floor(x / 3), 1, seed) > 0.6 ? 2 : 0);
  if (fromTop <= drip) return fromTop === drip ? grass[0]! : grass[fromTop <= 1 ? 3 : 2]!;
  const SX = 11;
  const SY = 7;
  const cx = Math.floor(x / SX);
  const cy = Math.floor(y / SY);
  let d1 = 1e9;
  let d2 = 1e9;
  let bx = 0;
  let by = 0;
  let id = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const gx = cx + i;
      const gy = cy + j;
      const px = (gx + 0.15 + hash2(gx, gy, seed + 40) * 0.7 + (gy & 1) * 0.5) * SX;
      const py = (gy + 0.2 + hash2(gx, gy, seed + 41) * 0.6) * SY;
      const d = ((x + 0.5 - px) / SX) ** 2 + ((y + 0.5 - py) / SY) ** 2;
      if (d < d1) {
        d2 = d1;
        d1 = d;
        bx = px;
        by = py;
        id = hash2(gx, gy, seed + 42);
      } else if (d < d2) d2 = d;
    }
  }
  const edge = Math.sqrt(d2) - Math.sqrt(d1);
  const lx = (x + 0.5 - bx) / SX;
  const ly = (y + 0.5 - by) / SY;
  let t: number;
  if (edge < 0.09) t = 0.2;
  else {
    t = 2.6 + (id - 0.5) * 1.4 - lx * 1.6 - ly * 2.2;
    if (edge < 0.18) t -= ly > 0 || lx > 0 ? 1 : -0.6;
    t += (noise.value(x / 3, y / 3) - 0.5) * 0.9;
  }
  // Darker towards the foot and right under the overhang.
  if (fromTop <= drip + 2) t -= 1.3;
  if (toFoot < 8) t -= (8 - toFoot) * 0.18;
  if (edge >= 0.09 && ly < -0.35 && noise.value(x / 6 + 70, y / 6) > 0.62) return grass[hash2(x, y, seed) > 0.5 ? 2 : 1]!;
  const f = Math.min(rock.length - 1, Math.max(0, t));
  const k = Math.floor(f);
  return f - k > bayer(x, y) && k + 1 < rock.length ? rock[k + 1]! : rock[k]!;
}

/**
 * A cliff face texture, w x h pixels: boulders lit from the upper left, grass hanging
 * over the top edge, darker towards the foot. Tiles horizontally well enough to repeat.
 */
export function paintCliff(w: number, h: number, seed = 1, pal: GroundPalette = GROUND_DEFAULT): PixelImage {
  const img = new PixelImage(w, h);
  const noise = new Noise2D(seed);
  const rock = ramp(pal.rock, 6);
  const grass = ramp(pal.grass, 6);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) img.set(x, y, cliffPixel(x, y, y + 1, h - y, noise, rock, grass, seed));
  return img;
}
