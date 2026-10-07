/**
 * Procedural pixel art. A PixelImage is a small RGBA buffer drawn with crisp primitives
 * (no anti-aliasing), coloured from hue-shifted ramps, dithered with a Bayer matrix,
 * and finished with outlines. Everything the world shows is drawn through it.
 */

/** A colour as [r, g, b, a], each 0–255. */
export type RGBA = readonly [number, number, number, number];

export const CLEAR: RGBA = [0, 0, 0, 0];

export function hex(h: string, a = 255): RGBA {
  const m = /^#?([0-9a-f]{6})$/i.exec(h);
  if (!m) throw new Error(`Bad colour: ${h}`);
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/**
 * A shading ramp from dark to light around a base colour, the way pixel artists build
 * them: shadows shift towards blue-violet and gain saturation, lights shift towards warm
 * yellow and lose a little. The base colour sits in the middle.
 */
export function ramp(base: string, steps = 5, spread = 1): RGBA[] {
  const [r, g, b] = hex(base);
  const [h, s, l] = rgbToHsl(r, g, b);
  const out: RGBA[] = [];
  const mid = (steps - 1) / 2;
  for (let i = 0; i < steps; i++) {
    const t = (i - mid) / Math.max(1, mid); // -1 (dark) .. 1 (light)
    // Hue shifts towards 240 (blue) in shadow and 60 (yellow) in light.
    const target = t < 0 ? 240 : 60;
    let dh = ((target - h + 540) % 360) - 180;
    dh = Math.sign(dh) * Math.min(Math.abs(dh), 22) * Math.abs(t) * spread;
    const nl = Math.min(0.95, Math.max(0.04, l + t * 0.22 * spread));
    const ns = Math.min(1, Math.max(0, s * (t < 0 ? 1 + 0.15 * -t : 1 - 0.18 * t)));
    const [rr, gg, bb] = hslToRgb(h + dh, ns, nl);
    out.push([rr, gg, bb, 255]);
  }
  return out;
}

/** 4x4 Bayer matrix, values 0–15. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Ordered-dither threshold at a pixel, in [0, 1). */
export function bayer(x: number, y: number): number {
  return (BAYER[(y & 3) * 4 + (x & 3)]! + 0.5) / 16;
}

export class PixelImage {
  readonly w: number;
  readonly h: number;
  readonly data: Uint8ClampedArray;

  constructor(w: number, h: number) {
    this.w = Math.max(1, Math.round(w));
    this.h = Math.max(1, Math.round(h));
    this.data = new Uint8ClampedArray(this.w * this.h * 4);
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get(x: number, y: number): RGBA {
    if (!this.inside(x, y)) return CLEAR;
    const i = (y * this.w + x) * 4;
    const d = this.data;
    return [d[i]!, d[i + 1]!, d[i + 2]!, d[i + 3]!];
  }

  alpha(x: number, y: number): number {
    if (!this.inside(x, y)) return 0;
    return this.data[(y * this.w + x) * 4 + 3]!;
  }

  set(x: number, y: number, c: RGBA): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (!this.inside(x, y)) return;
    const i = (y * this.w + x) * 4;
    const d = this.data;
    if (c[3] === 255 || c[3] === 0) {
      d[i] = c[0];
      d[i + 1] = c[1];
      d[i + 2] = c[2];
      d[i + 3] = c[3];
      return;
    }
    // Simple "over" for translucent pixels (shadows, glazes).
    const a = c[3] / 255;
    const da = d[i + 3]! / 255;
    const oa = a + da * (1 - a);
    d[i] = (c[0] * a + d[i]! * da * (1 - a)) / Math.max(oa, 1e-3);
    d[i + 1] = (c[1] * a + d[i + 1]! * da * (1 - a)) / Math.max(oa, 1e-3);
    d[i + 2] = (c[2] * a + d[i + 2]! * da * (1 - a)) / Math.max(oa, 1e-3);
    d[i + 3] = oa * 255;
  }

  /** Set only where something is already drawn (shading on top of a shape). */
  tint(x: number, y: number, c: RGBA): void {
    if (this.alpha(Math.floor(x), Math.floor(y)) > 0) this.set(x, y, c);
  }

  rect(x: number, y: number, w: number, h: number, c: RGBA): void {
    for (let j = Math.floor(y); j < Math.floor(y + h); j++) for (let i = Math.floor(x); i < Math.floor(x + w); i++) this.set(i, j, c);
  }

  hline(x0: number, x1: number, y: number, c: RGBA): void {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, c);
  }

  vline(x: number, y0: number, y1: number, c: RGBA): void {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, c);
  }

  /** Bresenham line. */
  line(x0: number, y0: number, x1: number, y1: number, c: RGBA): void {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  /** Filled ellipse centred on (cx, cy) with pixel-centre sampling. */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGBA | ((x: number, y: number, nx: number, ny: number) => RGBA | null)): void {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny <= 1) {
          const col = typeof c === 'function' ? c(x, y, nx, ny) : c;
          if (col) this.set(x, y, col);
        }
      }
    }
  }

  /** Filled polygon (even-odd), sampled at pixel centres. */
  poly(pts: readonly (readonly [number, number])[], c: RGBA | ((x: number, y: number) => RGBA | null)): void {
    if (pts.length < 3) return;
    const ys = pts.map((p) => p[1]);
    const y0 = Math.floor(Math.min(...ys));
    const y1 = Math.ceil(Math.max(...ys));
    for (let y = y0; y <= y1; y++) {
      const py = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i]!;
        const b = pts[(i + 1) % pts.length]!;
        if ((a[1] <= py && b[1] > py) || (b[1] <= py && a[1] > py)) xs.push(a[0] + ((py - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.ceil(xs[k]! - 0.5); x <= Math.floor(xs[k + 1]! - 0.5); x++) {
          const col = typeof c === 'function' ? c(x, y) : c;
          if (col) this.set(x, y, col);
        }
      }
    }
  }

  /** Copy another image in (transparent pixels skipped), optionally mirrored. */
  blit(src: PixelImage, x: number, y: number, flip = false): void {
    for (let j = 0; j < src.h; j++) {
      for (let i = 0; i < src.w; i++) {
        const c = src.get(flip ? src.w - 1 - i : i, j);
        if (c[3] > 0) this.set(x + i, y + j, c);
      }
    }
  }

  /**
   * Outline the silhouette. With `color` null, each outline pixel takes a darkened
   * version of the neighbour it borders (a "selective" outline, softer than black).
   */
  outline(color: RGBA | null, diagonals = false): void {
    const add: [number, number, RGBA][] = [];
    const dirs = diagonals
      ? [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
          [1, 1],
          [-1, 1],
          [1, -1],
          [-1, -1],
        ]
      : [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.alpha(x, y) > 0) continue;
        for (const [dx, dy] of dirs) {
          if (this.alpha(x + dx!, y + dy!) > 200) {
            if (color) add.push([x, y, color]);
            else {
              const n = this.get(x + dx!, y + dy!);
              add.push([x, y, [n[0] * 0.28, n[1] * 0.24, n[2] * 0.32 + 12, 255]]);
            }
            break;
          }
        }
      }
    }
    for (const [x, y, c] of add) this.set(x, y, c);
  }

  /** A new image twice the size, nearest-neighbour (for portraits drawn at half size). */
  scaled(k: number): PixelImage {
    const out = new PixelImage(this.w * k, this.h * k);
    for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) out.set(x, y, this.get(Math.floor(x / k), Math.floor(y / k)));
    return out;
  }

  toCanvas(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.w;
    c.height = this.h;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(this.w, this.h);
    img.data.set(this.data);
    ctx.putImageData(img, 0, 0);
    return c;
  }
}

/** Mix two colours. */
export function lerpColor(a: RGBA, b: RGBA, t: number): RGBA {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
}

/** Pick from a ramp by a 0–1 light value, dithering between neighbouring tones. */
export function shadeAt(r: readonly RGBA[], t: number, x: number, y: number): RGBA {
  const f = Math.min(r.length - 1, Math.max(0, t * (r.length - 1)));
  const i = Math.floor(f);
  const frac = f - i;
  return frac > bayer(x, y) && i + 1 < r.length ? r[i + 1]! : r[i]!;
}
