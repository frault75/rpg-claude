/**
 * Lychford in Midwinter (DESIGN.md §7.2): timber-framed cottages under snow, the parish
 * church with its bell tower, the lych-gate where roses still bloom after ten winters,
 * and the bare trees of the fen. Built like the abbey: boxes with painted fronts, roofs
 * that carry the snow.
 */

import { type Art, belfry, door, newArt, windowArch } from '../pixel/buildings';
import { hash2 } from '../engine/noise';
import { bayer, hex, PixelImage, type RGBA, ramp } from '../pixel/pixel';
import { Builder, elevation } from './building';

const SNOW_ROOF = '#DCE4F0';

function tone(r: readonly RGBA[], t: number, x: number, y: number): RGBA {
  const f = Math.min(r.length - 1, Math.max(0, t));
  const i = Math.floor(f);
  return f - i > bayer(x, y) && i + 1 < r.length ? r[i + 1]! : r[i]!;
}

/** A timber-framed front: limewashed panels between dark oak posts and braces. */
function timberFront(w: number, h: number, plaster: string, seed: number, features: (a: Art) => void): Art {
  const a = newArt(w, h);
  const pl = ramp(plaster, 5);
  const oak = ramp('#4A3424', 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let t = 2.6 + (hash2(x >> 2, y >> 2, seed) - 0.5) * 0.6 - (y > h - 6 ? 0.8 : 0);
      if (hash2(x, y, seed + 3) > 0.96) t -= 0.7;
      a.a.set(x, y, tone(pl, t, x, y));
    }
  }
  // Sill beam, wall plate, posts every so often, a brace in each bay.
  const beam = (x0: number, y0: number, x1: number, y1: number) => {
    a.a.line(x0, y0, x1, y1, oak[1]!);
    a.a.line(x0 + 1, y0, x1 + 1, y1, oak[2]!);
  };
  for (const y of [0, 1, h - 5, h - 4]) a.a.hline(0, w - 1, y, oak[y < 2 ? 2 : 1]!);
  a.a.hline(0, w - 1, Math.floor(h * 0.45), oak[1]!);
  const bays = Math.max(2, Math.round(w / 14));
  for (let i = 0; i <= bays; i++) {
    const x = Math.round((i * (w - 2)) / bays);
    a.a.rect(x, 0, 2, h - 3, oak[i % 2 ? 1 : 2]!);
    if (i < bays) {
      const x1 = Math.round(((i + 1) * (w - 2)) / bays);
      if (i % 2) beam(x + 2, Math.floor(h * 0.45), x1 - 1, 2);
      else beam(x + 2, h - 5, x1 - 1, Math.floor(h * 0.45) + 1);
    }
  }
  features(a);
  return a;
}

/** A cottage of Lychford: timber and limewash, a snowy roof, a lit window, a chimney. */
export function cottage3D(x: number, y: number, w = 56, d = 34, o: { plaster?: string; lit?: boolean; seed?: number; chimney?: boolean } = {}): Builder {
  const seed = o.seed ?? 1;
  const b = new Builder('#8E8478');
  const wallH = 24;
  const front = timberFront(w, wallH, o.plaster ?? '#E8DCC0', seed, (a) => {
    const dx = Math.round(w * 0.25);
    door(a, dx, wallH - 18, 9, 14, { kind: 'round', stone: '#6A5A48' });
    const wx = Math.round(w * 0.62);
    windowArch(a, wx, 7, 7, 7, { lit: o.lit === false ? null : 'warm', plain: true, seed }, 'round', '#6A5A48');
    if (o.lit !== false) b.lights.push({ x: x + wx + 3, y: y + d + 9, h: 9, r: 50, color: '#FFB060', intensity: 0.55 });
  });
  b.box(x, y, w, d, 0, wallH, front, '#8E8478');
  b.gable(x, y, w, d, wallH, 20, SNOW_ROOF, 4);
  if (o.chimney !== false) b.box(x + w - 14, y + 6, 7, 7, wallH + 4, 22, undefined, '#7E7468');
  b.finish();
  return b;
}

/** The parish church of Saint Hilda: a nave of three bays, a west tower with its belfry. */
export function parishChurch3D(x: number, y: number, seed = 61): Builder {
  const stone = '#A49A88';
  const b = new Builder(stone);
  const towerW = 30;
  const naveW = 96;
  const d = 40;
  // Tower: tall, with the belfry openings near the top, a squat spire.
  const towerH = 96;
  b.box(
    x,
    y - 4,
    towerW,
    d + 4,
    0,
    towerH,
    elevation(towerW, towerH, stone, seed, (a) => {
      belfry(a, 7, 14, 16, 18, stone);
      windowArch(a, 11, 46, 8, 16, { lit: 'warm', seed, plain: true }, 'pointed', stone);
      door(a, 8, towerH - 30, 14, 24, { kind: 'pointed', stone });
    }),
  );
  b.spire(x, y - 4, towerW, d + 4, towerH, 34, SNOW_ROOF);
  // Nave.
  const naveH = 46;
  b.box(
    x + towerW,
    y + 2,
    naveW,
    d - 2,
    0,
    naveH,
    elevation(naveW, naveH, stone, seed + 1, (a) => {
      for (let i = 0; i < 3; i++) windowArch(a, 14 + i * 30, 12, 10, 22, { lit: 'warm', seed: seed + i }, 'pointed', stone);
    }),
  );
  b.gable(x + towerW, y + 2, naveW, d - 2, naveH, 22, SNOW_ROOF, 3);
  for (let i = 0; i < 4; i++) b.buttress(x + towerW + 4 + i * 30, y + d, 5, 6, 0, naveH - 6);
  for (let i = 0; i < 3; i++) b.lights.push({ x: x + towerW + 19 + i * 30, y: y + d + 12, h: 18, r: 56, color: '#FFB866', intensity: 0.5 });
  b.finish();
  return b;
}

/** The lych-gate: a little roofed gate of oak, its posts grown over with roses in the snow. */
export function lychGate(seed = 4): Art & { anchor: [number, number] } {
  const W = 60;
  const H = 54;
  const art = newArt(W, H);
  const img = art.a;
  const oak = ramp('#5A3E28', 5);
  const snow = ramp(SNOW_ROOF, 4, 0.5);
  const leaf = ramp('#3E6A3A', 4);
  const rose = ['#D58193', '#E8A0B0', '#A63A4C'].map((c) => hex(c));
  // Posts and the crossbeam.
  for (const px of [6, 50]) {
    img.rect(px, 18, 4, H - 18, oak[2]!);
    img.vline(px, 18, H - 1, oak[4]!);
  }
  img.rect(4, 18, 52, 4, oak[1]!);
  img.hline(4, 55, 18, oak[3]!);
  // The roof: two pitches under snow.
  img.poly(
    [
      [0, 20],
      [30, 2],
      [60, 20],
      [55, 22],
      [30, 7],
      [5, 22],
    ],
    (x, y) => tone(oak, 1.6 + (x < 30 ? 1 : 0), x, y),
  );
  img.poly(
    [
      [1, 18],
      [30, 0],
      [59, 18],
      [54, 18],
      [30, 4],
      [6, 18],
    ],
    (x, y) => tone(snow, 2.8 - (x - 30) / 30 + (hash2(x, y, seed) - 0.5) * 0.6, x, y),
  );
  // Roses climbing both posts and along the beam: green with pink, untouched by winter.
  const bloom = (cx: number, cy: number, i: number) => {
    img.ellipse(cx, cy, 2.6, 2.2, (x, y, nx, ny) => tone(leaf, 1.6 + (-nx - ny) * 1.2, x, y));
    if (hash2(i, 1, seed) > 0.35) {
      const c = rose[i % rose.length]!;
      img.set(cx, cy - 1, c);
      img.set(cx + 1, cy - 1, c);
      img.set(cx, cy, rose[2]!);
      art.e.set(cx, cy - 1, [c[0] * 0.15, c[1] * 0.08, c[2] * 0.1, 255]);
    }
  };
  let k = 0;
  for (const px of [8, 52]) for (let yy = 24; yy < H - 4; yy += 4) bloom(px + ((k % 2) * 2 - 1) * 2, yy, k++);
  for (let xx = 8; xx < 54; xx += 5) bloom(xx, 22 + (k % 2), k++);
  img.outline(null);
  return { ...art, anchor: [W / 2, H - 1] };
}

/** A tree of the fen in winter: bare branches, snow along their tops. */
export function bareTree(seed = 1, size = 1): PixelImage {
  const W = Math.round(48 * size);
  const H = Math.round(60 * size);
  const img = new PixelImage(W, H);
  const bark = ramp('#5A4636', 5);
  const snow = hex('#EEF2F8');
  const branch = (x: number, y: number, ang: number, len: number, width: number, depth: number) => {
    const x1 = x + Math.cos(ang) * len;
    const y1 = y + Math.sin(ang) * len;
    const n = Math.ceil(len * 1.5);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const px = x + (x1 - x) * t;
      const py = y + (y1 - y) * t;
      const wd = Math.max(0.5, width * (1 - t * 0.5));
      for (let k = -wd; k <= wd; k += 0.5) img.set(Math.round(px + k), Math.round(py), bark[k < 0 ? 3 : 1]!);
      if (depth < 3 && hash2(Math.round(px), Math.round(py), seed) > 0.5) img.set(Math.round(px), Math.round(py - wd - 0.5), snow);
    }
    if (depth <= 0 || len < 3) return;
    const spread = 0.5 + hash2(depth, Math.round(len), seed) * 0.4;
    branch(x1, y1, ang - spread, len * 0.68, width * 0.62, depth - 1);
    branch(x1, y1, ang + spread * 0.9, len * 0.62, width * 0.58, depth - 1);
    if (hash2(depth, 7, seed) > 0.5) branch(x1, y1, ang + (hash2(depth, 9, seed) - 0.5) * 0.4, len * 0.5, width * 0.5, depth - 2);
  };
  branch(W / 2, H - 1, -Math.PI / 2, H * 0.36, 2.6 * size, 5);
  img.outline(null);
  return img;
}

/** A hedge along a lane, dark holly and snow. */
export function snowHedge(w = 40, seed = 3): PixelImage {
  const img = new PixelImage(w, 16);
  const leaf = ramp('#2E4A34', 5);
  const snow = ramp('#E8EEF8', 3);
  for (let x = 0; x < w; x++) {
    const top = 3 + Math.round(2 * Math.sin(x * 0.4 + seed) + hash2(x >> 1, 0, seed) * 2);
    for (let y = top; y < 16; y++) {
      let c = tone(leaf, 2.4 - (y - top) / 6 + (hash2(x, y, seed) - 0.5) * 1.2, x, y);
      if (y < top + 2) c = tone(snow, 2 - (x % 5) * 0.2, x, y);
      if (y > top + 2 && hash2(x, y, seed + 1) > 0.97) c = hex('#C83A3A');
      img.set(x, y, c);
    }
  }
  img.outline(null);
  return img;
}
