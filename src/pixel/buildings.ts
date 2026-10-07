/**
 * Buildings in pixel art, seen in the 3/4 view of the 16-bit RPGs: a front wall of
 * coursed stone, roofs of slate seen from above, buttresses that step back as they rise,
 * lancet windows with stained glass that glows at night (drawn into an emissive image),
 * doors, a bell tower with a spire. Moonlight comes from the upper left.
 */

import { hash2, Noise2D } from '../engine/noise';
import { bayer, hex, PixelImage, type RGBA, ramp } from './pixel';

export interface Art {
  /** Albedo. */
  a: PixelImage;
  /** Emissive (black where nothing glows). */
  e: PixelImage;
  /** Lights cast by the art, in its pixels: (x, y) on the ground, radius, colour. */
  lights: { x: number; y: number; r: number; color: string; intensity: number }[];
}

export function newArt(w: number, h: number): Art {
  return { a: new PixelImage(w, h), e: new PixelImage(w, h), lights: [] };
}

function pickTone(r: readonly RGBA[], t: number, x: number, y: number): RGBA {
  const f = Math.min(r.length - 1, Math.max(0, t));
  const i = Math.floor(f);
  return f - i > bayer(x, y) && i + 1 < r.length ? r[i + 1]! : r[i]!;
}

function scale(c: RGBA, k: number): RGBA {
  return [Math.min(255, c[0] * k), Math.min(255, c[1] * k), Math.min(255, c[2] * k), c[3]];
}

export interface StoneOpts {
  stone?: string;
  course?: number;
  seed?: number;
  /** Rows of grime and moss at the foot. */
  foot?: number;
}

/** Coursed ashlar over a rectangle. */
export function ashlar(art: Art, x0: number, y0: number, w: number, h: number, o: StoneOpts = {}): void {
  const st = ramp(o.stone ?? '#9A948A', 6);
  const moss = ramp('#5A7240', 4);
  const course = o.course ?? 5;
  const seed = o.seed ?? 1;
  const n = new Noise2D(seed);
  const foot = o.foot ?? 6;
  for (let y = y0; y < y0 + h; y++) {
    const c = Math.floor((y - y0) / course);
    const ry = (y - y0) % course;
    let bx = x0 - Math.floor(hash2(c, 7, seed) * 9);
    let bi = 0;
    let bw = 0;
    for (let x = x0; x < x0 + w; x++) {
      while (x >= bx + bw) {
        bx += bw;
        bw = 7 + Math.floor(hash2(c, bi, seed) * 7);
        bi++;
      }
      const rx = x - bx;
      const id = hash2(c, bi, seed + 3);
      let t = 2.9 + (id - 0.5) * 1.1;
      let mortar = ry === course - 1 || rx === 0;
      if (mortar) t = 1.1;
      else {
        if (ry === 0) t += 0.8;
        if (rx === 1) t += 0.4;
        if (ry === course - 2) t -= 0.5;
      }
      // Rain streaks and weathering.
      const streak = n.value(x * 0.7, y * 0.05);
      if (streak > 0.72) t -= 0.9;
      const fy = y0 + h - y;
      if (fy <= foot) t -= (foot - fy) * 0.18;
      let col = pickTone(st, t, x, y);
      if (fy <= foot && !mortar && hash2(x, y, seed + 9) < 0.18 * (1 - fy / foot) + 0.04) col = moss[1 + (hash2(x, y, 4) > 0.6 ? 1 : 0)]!;
      if (mortar && fy > foot && hash2(x, y, seed + 2) < 0.05) col = moss[0]!;
      art.a.set(x, y, col);
    }
  }
}

/** Darken pixels already drawn (cast shadows). */
export function shadowRect(art: Art, x0: number, y0: number, w: number, h: number, k = 0.62, dither = false): void {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (dither && bayer(x, y) > 0.5) continue;
      const c = art.a.get(x, y);
      if (c[3] === 0) continue;
      art.a.set(x, y, [c[0] * k, c[1] * k, c[2] * k * 1.06 + 6, 255]);
    }
  }
}

/** A buttress standing out of a wall, with set-offs and a shadow to its right. */
export function buttress(art: Art, x: number, yTop: number, yBot: number, w: number, o: StoneOpts = {}): void {
  const h = yBot - yTop;
  const steps = [0, Math.round(h * 0.38), Math.round(h * 0.7)];
  shadowRect(art, x + w, yTop + 4, 3, h - 4, 0.6);
  // Draw from the bottom stage up: each stage narrower by a pixel per side.
  const stages = [
    [yTop + steps[2]!, yBot, 0],
    [yTop + steps[1]!, yTop + steps[2]!, 1],
    [yTop + 3, yTop + steps[1]!, 2],
  ] as const;
  const st = ramp(o.stone ?? '#9A948A', 6);
  for (const [a, b, inset] of stages) {
    ashlar(art, x + inset, a, w - inset * 2, b - a, { ...o, seed: (o.seed ?? 1) + a, foot: b === yBot ? o.foot ?? 6 : 0 });
    // Lit left face.
    for (let y = a; y < b; y++) art.a.set(x + inset, y, st[5]!);
    for (let y = a; y < b; y++) art.a.set(x + inset + 1, y, pickTone(st, 4.3, x + inset + 1, y));
    // Sloped weathering cap with its shadow below.
    for (let i = x + inset; i < x + w - inset; i++) {
      art.a.set(i, a, st[4]!);
      art.a.set(i, a + 1, st[5]!);
    }
    for (let i = x + inset; i < x + w - inset; i++) art.a.set(i, a + 2, st[1]!);
  }
  // Cap.
  for (let i = x + 2; i < x + w - 2; i++) {
    art.a.set(i, yTop, st[3]!);
    art.a.set(i, yTop + 1, st[5]!);
    art.a.set(i, yTop + 2, st[4]!);
  }
}

export interface GlassOpts {
  /** null: dark, unlit glass that catches the moon. */
  lit: 'warm' | 'cool' | null;
  seed?: number;
  /** Diamond quarries (plain glazing) instead of coloured panes. */
  plain?: boolean;
}

const WARM_GLASS = ['#FFC85A', '#FFB040', '#FFD98A', '#E8743A', '#FFE7A8', '#C83A3A', '#4A78D8'];
const COOL_GLASS = ['#8AB8FF', '#6A9AF0', '#B8D4FF', '#E8E0FF'];

/** Inside test for a pointed (equilateral) arch opening. */
function inLancet(x: number, y: number, x0: number, top: number, w: number, h: number): boolean {
  const px = x + 0.5;
  const py = y + 0.5;
  if (px < x0 || px > x0 + w || py > top + h) return false;
  const archH = w * 0.87;
  const spring = top + archH;
  if (py >= spring) return true;
  const r = w;
  const dl = (px - x0) ** 2 + (py - spring) ** 2;
  const dr = (px - (x0 + w)) ** 2 + (py - spring) ** 2;
  return dl <= r * r && dr <= r * r && py >= top;
}

/** Inside test for a round arch. */
function inRound(x: number, y: number, x0: number, top: number, w: number, h: number): boolean {
  const px = x + 0.5;
  const py = y + 0.5;
  if (px < x0 || px > x0 + w || py > top + h || py < top) return false;
  const r = w / 2;
  const spring = top + r;
  if (py >= spring) return true;
  return (px - (x0 + r)) ** 2 + (py - spring) ** 2 <= r * r;
}

export type ArchKind = 'pointed' | 'round';

function inArch(kind: ArchKind, x: number, y: number, x0: number, top: number, w: number, h: number): boolean {
  return kind === 'pointed' ? inLancet(x, y, x0, top, w, h) : inRound(x, y, x0, top, w, h);
}

/** A window: stone surround, deep reveal, glass (lit glass glows in the emissive image). */
export function windowArch(art: Art, x0: number, top: number, w: number, h: number, glass: GlassOpts, kind: ArchKind = 'pointed', stone = '#9A948A'): void {
  const st = ramp(stone, 6);
  const lead = hex('#1A1620');
  const seed = glass.seed ?? 3;
  const palette = (glass.lit === 'cool' ? COOL_GLASS : WARM_GLASS).map((c) => hex(c));
  // Surround: a ring of lighter voussoirs.
  for (let y = top - 2; y <= top + h + 1; y++) {
    for (let x = x0 - 2; x <= x0 + w + 1; x++) {
      if (inArch(kind, x, y, x0, top, w, h)) continue;
      const near = inArch(kind, x + 2, y, x0, top, w, h) || inArch(kind, x - 2, y, x0, top, w, h) || inArch(kind, x, y + 2, x0, top, w, h) || inArch(kind, x + 1, y + 1, x0, top, w, h) || inArch(kind, x - 1, y + 1, x0, top, w, h);
      if (!near) continue;
      const lit = x < x0 + w / 2;
      art.a.set(x, y, lit ? st[5]! : st[3]!);
    }
  }
  // Sill.
  for (let x = x0 - 2; x <= x0 + w + 1; x++) {
    art.a.set(x, top + h, st[5]!);
    art.a.set(x, top + h + 1, st[1]!);
  }
  for (let y = top; y < top + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (!inArch(kind, x, y, x0, top, w, h)) continue;
      const rx = x - x0;
      // Reveal: the left jamb is in shadow, one pixel deep.
      if (rx === 0 || !inArch(kind, x, y - 1, x0, top, w, h)) {
        art.a.set(x, y, st[0]!);
        art.e.set(x, y, [0, 0, 0, 255]);
        continue;
      }
      const isLead = glass.plain ? (x + y) % 4 === 0 || (x - y + 400) % 4 === 0 : rx === Math.floor(w / 2) || (y - top) % 6 === 5 || (x + y) % 7 === 0;
      if (glass.lit) {
        const cell = glass.plain ? 0 : Math.floor(hash2(Math.floor((x + y) / 7), Math.floor((y - top) / 6) + Math.floor(rx / (w / 2)) * 17, seed) * palette.length);
        let c = glass.plain ? palette[2]! : palette[cell]!;
        // Brighter low down, where the candles are.
        const k = 0.55 + 0.45 * ((y - top) / h) + (hash2(x, y, seed) - 0.5) * 0.15;
        if (isLead) {
          art.a.set(x, y, lead);
          art.e.set(x, y, scale(c, 0.12));
        } else {
          c = scale(c, k);
          art.a.set(x, y, scale(c, 0.5));
          art.e.set(x, y, c);
        }
      } else {
        const base = hex('#1E2A44');
        const hi = rx === 1 && y < top + h * 0.5 ? hex('#5A6E96') : null;
        art.a.set(x, y, isLead ? lead : hi ?? (hash2(x, y, seed) > 0.8 ? hex('#26365A') : base));
        art.e.set(x, y, [0, 0, 0, 255]);
      }
    }
  }
}

/** A round rose window with radial tracery. */
export function roseWindow(art: Art, cx: number, cy: number, r: number, lit: boolean, stone = '#9A948A'): void {
  const st = ramp(stone, 6);
  const glass = WARM_GLASS.map((c) => hex(c));
  for (let y = Math.floor(cy - r - 2); y <= cy + r + 2; y++) {
    for (let x = Math.floor(cx - r - 2); x <= cx + r + 2; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = Math.hypot(dx, dy);
      if (d > r + 2) continue;
      if (d > r) {
        art.a.set(x, y, dx + dy < 0 ? st[5]! : st[2]!);
        continue;
      }
      const ang = Math.atan2(dy, dx);
      const spoke = Math.abs(Math.sin(ang * 4)) < 0.22 && d > r * 0.3;
      const ring = Math.abs(d - r * 0.35) < 0.7 || d > r - 1;
      if (spoke || ring) {
        art.a.set(x, y, st[1]!);
        art.e.set(x, y, [0, 0, 0, 255]);
      } else if (lit) {
        const c = glass[Math.floor(((ang + Math.PI) / (Math.PI * 2)) * 8 + (d < r * 0.35 ? 3 : 0)) % glass.length]!;
        const k = 0.75 + (1 - d / r) * 0.35;
        art.a.set(x, y, scale(c, 0.45));
        art.e.set(x, y, scale(c, k));
      } else art.a.set(x, y, hex('#1E2A44'));
    }
  }
}

/** An arched wooden door with iron straps; open doors spill warm light. */
export function door(art: Art, x0: number, top: number, w: number, h: number, o: { kind?: ArchKind; open?: boolean; stone?: string } = {}): void {
  const kind = o.kind ?? 'pointed';
  const st = ramp(o.stone ?? '#9A948A', 6);
  const wood = ramp('#6A4428', 5);
  const iron = ramp('#3A3A42', 3);
  // Voussoirs, two rings.
  for (let y = top - 3; y <= top + h; y++) {
    for (let x = x0 - 3; x <= x0 + w + 2; x++) {
      if (inArch(kind, x, y, x0, top, w, h)) continue;
      let ring = 0;
      if (inArch(kind, x + 1, y + 1, x0 - 1, top - 1, w + 2, h + 1) || inArch(kind, x, y, x0 - 2, top - 2, w + 4, h + 2)) ring = 1;
      if (!ring && inArch(kind, x, y, x0 - 3, top - 3, w + 6, h + 3)) ring = 2;
      if (!ring) continue;
      art.a.set(x, y, ring === 1 ? (x < x0 + w / 2 ? st[5]! : st[3]!) : st[2]!);
    }
  }
  for (let y = top; y < top + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (!inArch(kind, x, y, x0, top, w, h)) continue;
      const rx = x - x0;
      const ry = y - top;
      if (o.open) {
        const glow = hex('#FFB65A');
        const k = 0.6 + 0.4 * (ry / h);
        art.a.set(x, y, scale(glow, 0.5));
        art.e.set(x, y, scale(glow, k));
        continue;
      }
      let t = 2 + (hash2(Math.floor(rx / 3), 0, 5) - 0.5) * 1;
      if (rx % 3 === 0) t = 0.6;
      if (rx === 1) t += 0.8;
      let c = pickTone(wood, t, x, y);
      if (ry === Math.floor(h * 0.35) || ry === Math.floor(h * 0.75)) c = iron[1]!;
      if (ry === Math.floor(h * 0.35) - 1 || ry === Math.floor(h * 0.75) - 1) c = iron[2]!;
      if (rx === Math.floor(w * 0.72) && ry === Math.floor(h * 0.55)) c = hex('#C9A23C');
      art.a.set(x, y, c);
      art.e.set(x, y, [0, 0, 0, 255]);
    }
  }
  // Step.
  for (let x = x0 - 3; x < x0 + w + 3; x++) {
    art.a.set(x, top + h, st[5]!);
    art.a.set(x, top + h + 1, st[2]!);
  }
  if (o.open) art.lights.push({ x: x0 + w / 2, y: top + h + 4, r: 46, color: '#FFB060', intensity: 0.9 });
}

export interface RoofOpts {
  slate?: string;
  seed?: number;
  /** Lean-to roofs have no ridge cresting. */
  ridge?: boolean;
  /** Slate courses in pixels. */
  course?: number;
}

/** A slate roof seen from above: courses of staggered slates, lighter towards the ridge. */
export function slateRoof(art: Art, x0: number, y0: number, w: number, h: number, o: RoofOpts = {}): void {
  const sl = ramp(o.slate ?? '#4E5A72', 6);
  const lichen = ramp('#8A9A6A', 3);
  const seed = o.seed ?? 2;
  const course = o.course ?? 3;
  const n = new Noise2D(seed + 1);
  for (let y = y0; y < y0 + h; y++) {
    const c = Math.floor((y - y0) / course);
    const ry = (y - y0) % course;
    for (let x = x0; x < x0 + w; x++) {
      const tw = 4;
      const off = (c & 1) * 2;
      const tx = Math.floor((x - x0 + off) / tw);
      const rx = (x - x0 + off) % tw;
      const id = hash2(tx, c, seed);
      let t = 3.2 - ((y - y0) / h) * 1.6 + (id - 0.5) * 1.1 + (n.value(x / 14, y / 8) - 0.5) * 0.8;
      if (ry === course - 1) t -= 1.3;
      else if (ry === 0) t += 0.6;
      if (rx === 0) t -= 0.6;
      let col = pickTone(sl, t, x, y);
      if (n.value(x / 6 + 40, y / 4) > 0.8 && hash2(x, y, seed) > 0.4) col = lichen[hash2(x, y, 2) > 0.5 ? 1 : 0]!;
      art.a.set(x, y, col);
    }
  }
  // Eave: a dark line and a shadow on the wall below.
  for (let x = x0; x < x0 + w; x++) {
    art.a.set(x, y0 + h - 1, sl[0]!);
  }
  shadowRect(art, x0, y0 + h, w, 3, 0.55);
  shadowRect(art, x0, y0 + h + 3, w, 2, 0.75, true);
  if (o.ridge !== false) {
    for (let x = x0; x < x0 + w; x++) {
      art.a.set(x, y0, sl[5]!);
      art.a.set(x, y0 + 1, sl[4]!);
      art.a.set(x, y0 + 2, sl[2]!);
      // Cresting: little crosses of lead along the ridge.
      if ((x - x0) % 8 === 4) {
        art.a.set(x, y0 - 1, sl[4]!);
        art.a.set(x, y0 - 2, sl[5]!);
        art.a.set(x - 1, y0 - 2, sl[3]!);
        art.a.set(x + 1, y0 - 2, sl[3]!);
        art.a.set(x, y0 - 3, sl[4]!);
      }
    }
  }
  // Coped ends.
  const st = ramp('#9A948A', 6);
  for (let y = y0; y < y0 + h; y++) {
    art.a.set(x0, y, st[5]!);
    art.a.set(x0 + 1, y, st[3]!);
    art.a.set(x0 + w - 1, y, st[1]!);
    art.a.set(x0 + w - 2, y, st[3]!);
  }
}

/** A stone cross finial. */
export function cross(art: Art, cx: number, y: number, size = 7, color = '#C9C3B6'): void {
  const st = ramp(color, 4);
  for (let i = 0; i < size; i++) {
    art.a.set(cx, y + i, st[2]!);
    art.a.set(cx + 1, y + i, st[0]!);
  }
  for (let i = -2; i <= 3; i++) art.a.set(cx + i, y + 2, i < 1 ? st[3]! : st[1]!);
}

/** A pyramidal spire of slate: the lit face on the left, the shaded on the right. */
export function spire(art: Art, cx: number, yTop: number, yBase: number, halfW: number, o: RoofOpts = {}): void {
  const sl = ramp(o.slate ?? '#4E5A72', 6);
  const seed = o.seed ?? 5;
  const h = yBase - yTop;
  for (let y = yTop; y < yBase; y++) {
    const hw = ((y - yTop) / h) * halfW;
    for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
      const left = x < cx;
      const c = Math.floor((y - yTop) / 3);
      const ry = (y - yTop) % 3;
      const id = hash2(Math.floor((x + (c & 1) * 2) / 4), c, seed);
      let t = (left ? 3.6 : 1.4) + (id - 0.5) * 0.9;
      if (ry === 2) t -= 1;
      if (Math.abs(x - cx) < 0.6) t = left ? 4.5 : 2.4;
      const edge = Math.abs(Math.abs(x - cx) - hw) < 0.8;
      art.a.set(x, y, edge ? sl[left ? 1 : 0]! : pickTone(sl, t, x, y));
    }
  }
}

/** Louvred belfry opening (dark, slatted, a hint of bronze bell). */
export function belfry(art: Art, x0: number, top: number, w: number, h: number, stone = '#9A948A'): void {
  windowArch(art, x0, top, w, h, { lit: null }, 'pointed', stone);
  const louvre = ramp('#4A3A2E', 3);
  const bronze = ramp('#9A7A3A', 3);
  for (let y = top + Math.floor(w * 0.87) + 1; y < top + h; y++) {
    for (let x = x0 + 1; x < x0 + w; x++) {
      if ((y - top) % 3 === 0) art.a.set(x, y, louvre[2]!);
      else if ((y - top) % 3 === 1) art.a.set(x, y, louvre[0]!);
    }
  }
  // The bell's lip glinting between the slats.
  for (let x = x0 + 2; x < x0 + w - 1; x++) art.a.set(x, top + Math.floor(h * 0.62), bronze[x < x0 + w / 2 ? 2 : 1]!);
}

/** A crenellated parapet along the top of a wall. */
export function battlements(art: Art, x0: number, y0: number, w: number, o: StoneOpts = {}): void {
  const st = ramp(o.stone ?? '#9A948A', 6);
  ashlar(art, x0, y0 + 4, w, 4, { ...o, foot: 0 });
  for (let x = x0; x < x0 + w; x += 6) {
    ashlar(art, x, y0, Math.min(4, x0 + w - x), 4, { ...o, foot: 0, seed: x });
    art.a.hline(x, Math.min(x + 3, x0 + w - 1), y0, st[5]!);
  }
  for (let x = x0; x < x0 + w; x++) art.a.set(x, y0 + 4, st[5]!);
}
