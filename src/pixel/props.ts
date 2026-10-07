/**
 * Props: lanterns and torches (with emissive glass and animated flames), boats, posts,
 * crates, barrels, crosses and gravestones.
 */

import { hash2 } from '../engine/noise';
import { type Art, newArt } from './buildings';
import { bayer, hex, PixelImage, type RGBA, ramp } from './pixel';

function tone(r: readonly RGBA[], t: number, x: number, y: number): RGBA {
  const f = Math.min(r.length - 1, Math.max(0, t));
  const i = Math.floor(f);
  return f - i > bayer(x, y) && i + 1 < r.length ? r[i + 1]! : r[i]!;
}

export type Prop = Art & { anchor: [number, number] };

/** An iron lantern on a post. The light sits at the lantern. */
export function lanternPost(): Prop {
  const W = 12;
  const H = 34;
  const art = newArt(W, H);
  const iron = ramp('#3A3A44', 4);
  const glow = hex('#FFD27A');
  // Post.
  for (let y = 12; y < H; y++) {
    art.a.set(5, y, iron[2]!);
    art.a.set(6, y, iron[0]!);
  }
  art.a.rect(3, H - 2, 6, 2, iron[1]!);
  // Lantern: cap, glass, base.
  art.a.hline(3, 8, 3, iron[2]!);
  art.a.hline(4, 7, 2, iron[3]!);
  art.a.set(5, 1, iron[3]!);
  for (let y = 4; y < 11; y++) {
    for (let x = 3; x < 9; x++) {
      const frame = x === 3 || x === 8 || y === 4 || y === 10 || x === 5;
      if (frame) art.a.set(x, y, iron[x === 3 ? 2 : 1]!);
      else {
        const k = 0.75 + 0.25 * ((y - 4) / 6);
        const c: RGBA = [glow[0] * k, glow[1] * k, glow[2] * k, 255];
        art.a.set(x, y, c);
        art.e.set(x, y, c);
      }
    }
  }
  art.a.hline(3, 8, 11, iron[1]!);
  art.a.outline(null);
  art.lights.push({ x: 6, y: 7, r: 70, color: '#FFB866', intensity: 0.7 });
  return { ...art, anchor: [W / 2, H - 1] };
}

/** An iron wall sconce (the flame is a separate animated sprite above it). */
export function sconce(): Prop {
  const art = newArt(8, 10);
  const iron = ramp('#3A3A44', 4);
  art.a.hline(1, 6, 2, iron[2]!);
  art.a.hline(2, 5, 3, iron[1]!);
  art.a.vline(3, 4, 9, iron[1]!);
  art.a.vline(4, 4, 9, iron[0]!);
  art.a.outline(null);
  return { ...art, anchor: [4, 9] };
}

/** Flame frames for an animated torch or brazier: a sheet of `n` frames side by side. */
export function flameSheet(n = 4, w = 9, h = 14, seed = 1): { a: PixelImage; e: PixelImage; w: number; h: number } {
  const a = new PixelImage(w * n, h);
  const e = new PixelImage(w * n, h);
  const cols = [hex('#FFFBE0'), hex('#FFE08A'), hex('#FFB040'), hex('#E8642A'), hex('#A8302A')];
  for (let f = 0; f < n; f++) {
    const sway = Math.sin((f / n) * Math.PI * 2) * 1.4;
    for (let y = 0; y < h; y++) {
      const k = y / (h - 1); // 0 tip, 1 base
      const hw = (Math.sin(Math.min(1, k * 1.15) * Math.PI * 0.75) * w) / 2 - 0.3;
      const cx = w / 2 + sway * (1 - k) * (1 - k);
      for (let x = 0; x < w; x++) {
        const d = Math.abs(x + 0.5 - cx) / Math.max(0.5, hw);
        if (d > 1) continue;
        if (y < 3 && hash2(x, y + f * 31, seed) > 0.7) continue;
        let t = d * 2.2 + (1 - k) * 2.4 - 0.4;
        if (k > 0.85) t += 1;
        const c = cols[Math.min(4, Math.max(0, Math.floor(t + (bayer(x, y) - 0.5) * 0.8)))]!;
        a.set(f * w + x, y, c);
        e.set(f * w + x, y, c);
      }
    }
  }
  return { a, e, w, h };
}

/** A rowing boat drawn up on the shore. */
export function boat(seed = 1): Prop {
  const W = 44;
  const H = 18;
  const art = newArt(W, H);
  const wood = ramp('#7A5634', 5);
  const inside = ramp('#5A3E28', 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5 - W / 2) / (W / 2);
      const top = 3 + Math.abs(u) ** 2 * 4;
      const bot = H - 2 - Math.abs(u) ** 3 * 8;
      if (y < top || y > bot) continue;
      const inner = y < top + 7 - Math.abs(u) * 3 && Math.abs(u) < 0.86 && y > top + 1;
      if (inner) {
        let t = 1.6 + (x % 7 === 0 ? -0.8 : 0);
        if (Math.abs(u) < 0.08 || Math.abs(u - 0.45) < 0.04) t = 2.8; // thwarts
        art.a.set(x, y, tone(inside, t, x, y));
      } else {
        const strake = Math.floor((y - top) / 3);
        let t = 3 - strake * 0.35 + (hash2(strake, Math.floor(x / 9), seed) - 0.5) * 0.6;
        if ((y - top) % 3 === 2) t -= 1;
        if (y <= top + 1) t = 4.2;
        art.a.set(x, y, tone(wood, t, x, y));
      }
    }
  }
  // An oar laid across.
  art.a.line(6, 6, 38, 10, wood[4]!);
  art.a.line(36, 9, 42, 11, wood[3]!);
  art.a.outline(null);
  return { ...art, anchor: [W / 2, H - 2] };
}

export function mooringPost(seed = 1): Prop {
  const art = newArt(8, 18);
  const wood = ramp('#6A4E34', 5);
  for (let y = 2; y < 18; y++) {
    for (let x = 2; x < 6; x++) art.a.set(x, y, tone(wood, x === 2 ? 3.8 : x === 5 ? 0.8 : 2 + (hash2(x, y, seed) - 0.5), x, y));
  }
  art.a.hline(2, 5, 2, wood[4]!);
  // Rope.
  const rope = ramp('#B8A070', 3);
  art.a.hline(1, 6, 8, rope[2]!);
  art.a.hline(1, 6, 9, rope[1]!);
  for (let y = 14; y < 18; y++) art.a.hline(2, 5, y, tone(wood, 0.6, 3, y));
  art.a.outline(null);
  return { ...art, anchor: [4, 17] };
}

export function crate(seed = 1): Prop {
  const art = newArt(16, 16);
  const wood = ramp('#9A7448', 5);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const top = y < 5;
      let t = top ? 3.4 : 2.2;
      if (!top && (y - 5) % 4 === 3) t = 1;
      if (top && x % 4 === 3) t = 2.4;
      if (x === 0 || x === 15 || y === 4) t = 1.2;
      if (!top && (x === 1 || x === 14)) t = top ? t : 3;
      t += (hash2(x >> 2, y >> 2, seed) - 0.5) * 0.4;
      art.a.set(x, y, tone(wood, t, x, y));
    }
  }
  art.a.outline(null);
  return { ...art, anchor: [8, 15] };
}

export function barrel(seed = 1): Prop {
  const art = newArt(14, 18);
  const wood = ramp('#8A5E36', 5);
  const iron = ramp('#4A4A52', 3);
  for (let y = 0; y < 18; y++) {
    const bulge = Math.sin((y / 17) * Math.PI) * 1.5;
    for (let x = 0; x < 14; x++) {
      const dx = Math.abs(x + 0.5 - 7);
      if (dx > 5.5 + bulge) continue;
      if (y < 4) {
        // Lid seen from above.
        art.a.set(x, y, tone(wood, y === 0 || dx > 4.5 + bulge ? 1.2 : 3.4 - (x % 3 === 0 ? 0.6 : 0), x, y));
        continue;
      }
      let t = 2.6 - ((x + 0.5 - 7) / 7) * 1.6 + (hash2(x >> 1, 0, seed) - 0.5) * 0.4;
      if (x % 3 === 0) t -= 0.5;
      let c = tone(wood, t, x, y);
      if (y === 6 || y === 14) c = iron[x < 7 ? 2 : 1]!;
      art.a.set(x, y, c);
    }
  }
  art.a.outline(null);
  return { ...art, anchor: [7, 17] };
}

/** A wayside cross of weathered stone with a ring. */
export function stoneCross(seed = 1): Prop {
  const art = newArt(20, 34);
  const st = ramp('#9C968A', 6);
  const moss = ramp('#6A8044', 3);
  const put = (x: number, y: number, t: number) => {
    let c = tone(st, t + (hash2(x, y, seed) - 0.5) * 0.6, x, y);
    if (hash2(x, y, seed + 1) > 0.9) c = moss[1]!;
    art.a.set(x, y, c);
  };
  for (let y = 4; y < 31; y++) for (let x = 8; x < 12; x++) put(x, y, x === 8 ? 4.4 : x === 11 ? 1.4 : 2.8);
  for (let y = 9; y < 13; y++) for (let x = 2; x < 18; x++) put(x, y, y === 9 ? 4.4 : y === 12 ? 1.4 : 2.8);
  // Ring.
  for (let a = 0; a < 64; a++) {
    const ang = (a / 64) * Math.PI * 2;
    const x = Math.round(10 + Math.cos(ang) * 6);
    const y = Math.round(11 + Math.sin(ang) * 6);
    if (art.a.alpha(x, y) === 0) put(x, y, Math.cos(ang) < 0 ? 3.6 : 1.8);
  }
  // Base.
  for (let y = 30; y < 34; y++) for (let x = 5; x < 15; x++) put(x, y, y === 30 ? 4 : x === 5 ? 3.4 : 2);
  art.a.outline(null);
  return { ...art, anchor: [10, 33] };
}

export function gravestone(seed = 1): Prop {
  const art = newArt(14, 18);
  const st = ramp('#8E8A82', 6);
  const lean = Math.round((hash2(1, 1, seed) - 0.5) * 2);
  for (let y = 0; y < 18; y++) {
    for (let x = 0; x < 14; x++) {
      const sx = x - Math.round(lean * (1 - y / 18));
      if (sx < 2 || sx > 11) continue;
      if (y < 5 && (sx - 6.5) ** 2 + (y - 5) ** 2 > 22) continue;
      let t = sx === 2 ? 4.2 : sx === 11 ? 1.2 : 2.7 + (hash2(x, y, seed) - 0.5) * 0.7;
      if (y > 6 && y < 12 && sx > 4 && sx < 9 && (y % 2 === 0) && hash2(sx, y, seed) > 0.3) t = 1.4;
      art.a.set(x, y, tone(st, t, x, y));
    }
  }
  art.a.outline(null);
  return { ...art, anchor: [7, 17] };
}
