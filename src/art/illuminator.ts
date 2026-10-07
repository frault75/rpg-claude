/**
 * The Illuminator is the one drawing surface every generator uses, so the style stays
 * consistent by construction. It keeps the materials of a manuscript apart:
 *
 *   paint: gouache, modelled the way illuminators modelled it: a base colour, a darker
 *          tone worked into the shadow side, pigment pooling at the edges of each area,
 *          the texture of the brush, and lead-white hatching on the lights;
 *   ink:   iron-gall outlines, stored as coverage only (the shader colours them);
 *   gold:  leaf over raised gesso, stored as coverage plus a height map (so the shader
 *          can light it in relief), with punched decoration pressed into it.
 *
 * Keeping them apart lets the sprite shader fray and paint-in each one separately,
 * the way an illuminator would: underdrawing, gold, paint, then ink.
 */

import { Rng } from '../engine/rng';
import { type Pt, type Shape } from './path';
import { addStroke, drawStroke, type PenOptions } from './pen';
import { hexToRgb, PIGMENTS, shade } from './palettes';

/** Logical-to-pixel scale for generated art. 2 keeps it crisp on high-DPI screens. */
export const ART_SCALE = 2;

/** Light comes from the upper left: the direction towards the light, in canvas space (y down). */
export const LIGHT = -2.25;

export interface IlluminatedImage {
  /** Logical size. */
  width: number;
  height: number;
  /** Pixels per logical unit. */
  scale: number;
  paint: HTMLCanvasElement;
  /** R = ink coverage, G = gold coverage, B = gold height (raised gesso minus punches). */
  mask: HTMLCanvasElement;
  /** Logical point (from the top-left) that sits on the ground; defaults to bottom centre. */
  anchor: Pt;
}

export interface InkOptions extends Partial<PenOptions> {
  /** Draw a faint wider halo first, the way iron-gall feathers into vellum. */
  bleed?: boolean;
  alpha?: number;
}

export interface PaintOptions {
  /** Direction towards the light (radians, canvas space). */
  light?: number;
  /** How dark the shadow side gets (0–1). */
  shadow?: number;
  /** How bright the lit side gets (0–1). */
  lit?: number;
  /** Strength of pigment pooling at the edges (0–1). */
  pool?: number;
  /** Strength of brush texture (0–1). */
  texture?: number;
  /** Direction of brush strokes (radians); defaults to across the light. */
  stroke?: number;
  /** Model as a rounded form (radial) rather than a flat plane (linear). */
  round?: boolean;
  alpha?: number;
}

/** How long each generated image took, for the debug overlay. */
/** Debug switches: set `profile` to log rasterising time at each `checkpoint`. */
export const ART_FLAGS = { profile: false, log: [] as string[] };
export const ART_TIMINGS: { seed: string; ms: number; px: number }[] = [];

const rgbaCache = new Map<string, string>();

/** '#rrggbb' to an rgba() string (memoised). */
export function rgba(hex: string, a: number): string {
  const key = `${hex}${a}`;
  const hit = rgbaCache.get(key);
  if (hit) return hit;
  const [r, g, b] = hexToRgb(hex);
  const out = `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`;
  if (rgbaCache.size > 20000) rgbaCache.clear();
  rgbaCache.set(key, out);
  return out;
}

/** A ramp of slightly darker and lighter tones of a colour, as rgba strings. */
export function toneRamp(color: string, lo: number, hi: number, alpha: number, steps = 9): string[] {
  const out: string[] = [];
  for (let i = 0; i < steps; i++) out.push(rgba(shade(color, lo + ((hi - lo) * i) / (steps - 1)), alpha));
  return out;
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function context(c: HTMLCanvasElement, scale: number): CanvasRenderingContext2D {
  // CPU-backed: we draw tens of thousands of small marks and read every canvas back once,
  // which is many times faster than a GPU-accelerated canvas for this kind of work.
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D canvas unavailable');
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  return ctx;
}

/** Separable box blur of a single channel, in place. */
function boxBlur(src: Float32Array, w: number, h: number, r: number): void {
  if (r < 1) return;
  const tmp = new Float32Array(src.length);
  const norm = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    let acc = 0;
    const row = y * w;
    for (let x = -r; x <= r; x++) acc += src[row + Math.min(w - 1, Math.max(0, x))]!;
    for (let x = 0; x < w; x++) {
      tmp[row + x] = acc * norm;
      acc += src[row + Math.min(w - 1, x + r + 1)]! - src[row + Math.max(0, x - r)]!;
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]!;
    for (let y = 0; y < h; y++) {
      src[y * w + x] = acc * norm;
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x]! - tmp[Math.max(0, y - r) * w + x]!;
    }
  }
}

export class Illuminator {
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly rng: Rng;
  readonly paintCtx: CanvasRenderingContext2D;
  readonly inkCtx: CanvasRenderingContext2D;
  readonly goldCtx: CanvasRenderingContext2D;
  readonly punchCtx: CanvasRenderingContext2D;
  private readonly paintCanvas: HTMLCanvasElement;
  private readonly inkCanvas: HTMLCanvasElement;
  private readonly goldCanvas: HTMLCanvasElement;
  private readonly punchCanvas: HTMLCanvasElement;
  private strokeSeed = 1;
  private hasGold = false;
  private hasPunch = false;
  private readonly started = performance.now();
  /** While batching, paint and ink go into one path per colour and alpha. */
  private batchPaint: Map<string, Path2D> | null = null;
  private batchInk: Map<number, Path2D> | null = null;
  private readonly seedLabel: string;
  anchor: Pt;

  constructor(width: number, height: number, seed: number | string, scale = ART_SCALE) {
    this.width = width;
    this.height = height;
    this.scale = scale;
    this.rng = new Rng(seed);
    this.seedLabel = String(seed);
    const pw = Math.ceil(width * scale);
    const ph = Math.ceil(height * scale);
    this.paintCanvas = makeCanvas(pw, ph);
    this.inkCanvas = makeCanvas(pw, ph);
    this.goldCanvas = makeCanvas(pw, ph);
    this.punchCanvas = makeCanvas(pw, ph);
    this.paintCtx = context(this.paintCanvas, scale);
    this.inkCtx = context(this.inkCanvas, scale);
    this.goldCtx = context(this.goldCanvas, scale);
    this.punchCtx = context(this.punchCanvas, scale);
    this.anchor = [width / 2, height];
  }

  private get layers(): CanvasRenderingContext2D[] {
    return [this.paintCtx, this.inkCtx, this.goldCtx, this.punchCtx];
  }

  /** Debug: force the canvases to rasterise everything queued, and log how long it took. */
  checkpoint(label: string): void {
    if (!ART_FLAGS.profile) return;
    const t0 = performance.now();
    for (const ctx of this.layers) ctx.getImageData(0, 0, 1, 1);
    ART_FLAGS.log.push(`${this.seedLabel} ${label}: ${(performance.now() - t0).toFixed(0)}ms (since start ${(performance.now() - this.started).toFixed(0)}ms)`);
  }

  /** Shift the origin of all layers (logical units). */
  translate(dx: number, dy: number): void {
    for (const ctx of this.layers) ctx.translate(dx, dy);
  }

  /**
   * Draw many small marks cheaply: inside `fn`, fills, dots, coloured strokes and ink are
   * gathered into one path per colour and alpha and drawn together at the end. Use it for
   * scattered decoration (flowers, tufts, leaves); marks lose their order between colours,
   * and batched fills do not cover earlier ink.
   */
  batch(fn: () => void): void {
    if (this.batchPaint) {
      fn();
      return;
    }
    this.batchPaint = new Map();
    this.batchInk = new Map();
    try {
      fn();
    } finally {
      const paint = this.batchPaint;
      const ink = this.batchInk;
      this.batchPaint = null;
      this.batchInk = null;
      const ctx = this.paintCtx;
      for (const [key, path] of paint) {
        const i = key.indexOf('|');
        ctx.globalAlpha = Number(key.slice(i + 1));
        ctx.fillStyle = key.slice(0, i);
        ctx.fill(path);
      }
      ctx.globalAlpha = 1;
      this.inkCtx.fillStyle = '#000';
      for (const [alpha, path] of ink) {
        this.inkCtx.globalAlpha = alpha;
        this.inkCtx.fill(path);
      }
      this.inkCtx.globalAlpha = 1;
    }
  }

  private paintPath(color: string, alpha: number): Path2D {
    const key = `${color}|${alpha}`;
    let p = this.batchPaint!.get(key);
    if (!p) {
      p = new Path2D();
      this.batchPaint!.set(key, p);
    }
    return p;
  }

  private inkPath(alpha: number): Path2D {
    let p = this.batchInk!.get(alpha);
    if (!p) {
      p = new Path2D();
      this.batchInk!.set(alpha, p);
    }
    return p;
  }

  // ---- paint ---------------------------------------------------------------------------

  /**
   * Flat gouache fill. An opaque fill covers whatever was drawn before it, so it also
   * removes earlier ink and gold underneath (the layers are separate canvases, and
   * without this, older outlines would show through newer paint).
   */
  fill(shape: Shape, color: string, alpha = 1): void {
    if (this.batchPaint) {
      this.paintPath(color, alpha).addPath(shape.toPath2D());
      return;
    }
    const ctx = this.paintCtx;
    const path = shape.toPath2D();
    if (alpha >= 0.99) this.cover(path, this.coverable());
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fill(path);
    ctx.globalAlpha = 1;
  }

  /**
   * Painted, modelled fill: base colour, a tone worked across from the lit side to the
   * shadow side, brush texture, and darker pigment pooled along the edges.
   */
  paint(shape: Shape, color: string, o: PaintOptions = {}): void {
    const alpha = o.alpha ?? 1;
    this.fill(shape, color, alpha);
    const b = shape.bounds();
    const w = b.x1 - b.x0;
    const h = b.y1 - b.y0;
    if (w < 1.5 || h < 1.5) return;
    const ctx = this.paintCtx;
    const path = shape.toPath2D();
    const light = o.light ?? LIGHT;
    const lx = Math.cos(light);
    const ly = Math.sin(light);
    const cx = (b.x0 + b.x1) / 2;
    const cy = (b.y0 + b.y1) / 2;
    const R = Math.max(w, h) / 2;
    const shadowK = (o.shadow ?? 0.32) * alpha;
    const litK = (o.lit ?? 0.22) * alpha;
    ctx.save();
    ctx.clip(path);
    // Modelling.
    const dark = rgba(shade(color, -0.55), shadowK);
    const bright = rgba(shade(color, 0.5), litK);
    let grad: CanvasGradient;
    if (o.round) {
      grad = ctx.createRadialGradient(cx + lx * R * 0.4, cy + ly * R * 0.4, 0, cx + lx * R * 0.2, cy + ly * R * 0.2, R * 1.35);
      grad.addColorStop(0, bright);
      grad.addColorStop(0.42, rgba(color, 0));
      grad.addColorStop(1, dark);
    } else {
      grad = ctx.createLinearGradient(cx + lx * R, cy + ly * R, cx - lx * R, cy - ly * R);
      grad.addColorStop(0, bright);
      grad.addColorStop(0.42, rgba(color, 0));
      grad.addColorStop(1, dark);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(b.x0 - 2, b.y0 - 2, w + 4, h + 4);
    // Brush texture: short strokes of slightly lighter and darker paint.
    const texture = (o.texture ?? 0.7) * alpha;
    if (texture > 0) {
      const rng = this.rng;
      const dir = o.stroke ?? light + Math.PI / 2;
      const n = Math.min(1400, Math.floor(((w * h) / 26) * texture));
      const tones = toneRamp(color, -0.24, 0.18, 0.3 * Math.min(1, texture));
      // One path per tone and width, so thousands of strokes are a handful of draws.
      const paths = tones.map(() => [new Path2D(), new Path2D()]);
      for (let i = 0; i < n; i++) {
        const x = b.x0 + rng.float() * w;
        const y = b.y0 + rng.float() * h;
        const len = rng.range(2.5, 8);
        const a = dir + rng.jitter(0.35);
        const path = paths[(rng.float() * tones.length) | 0]![rng.chance(0.5) ? 0 : 1]!;
        path.moveTo(x, y);
        path.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + rng.jitter(1), y + Math.sin(a) * len * 0.5 + rng.jitter(1), x + Math.cos(a) * len, y + Math.sin(a) * len);
      }
      paths.forEach(([thin, thick], i) => {
        ctx.strokeStyle = tones[i]!;
        ctx.lineWidth = 0.8;
        ctx.stroke(thin!);
        ctx.lineWidth = 1.6;
        ctx.stroke(thick!);
      });
    }
    // Pigment pooling: the wash dries darker where it meets the edge.
    const pool = (o.pool ?? 0.4) * alpha;
    if (pool > 0) {
      ctx.strokeStyle = rgba(shade(color, -0.4), pool);
      ctx.lineWidth = Math.min(3.2, Math.max(1, Math.min(w, h) * 0.12));
      ctx.shadowColor = rgba(shade(color, -0.4), pool);
      ctx.shadowBlur = 2.6 * this.scale;
      ctx.stroke(path);
    }
    ctx.restore();
  }

  /** A soft-edged wash (shadows, blushes, glows on the paint layer). */
  softFill(shape: Shape, color: string, alpha: number, blur: number): void {
    const ctx = this.paintCtx;
    const off = 20000;
    ctx.save();
    ctx.shadowColor = rgba(color, alpha);
    ctx.shadowBlur = blur * this.scale;
    ctx.shadowOffsetX = off * this.scale;
    ctx.translate(-off, 0);
    ctx.fillStyle = '#000';
    ctx.fill(shape.toPath2D());
    ctx.restore();
  }

  /** A soft dark stroke for a fold or crease, with an optional lit edge beside it. */
  fold(pts: readonly Pt[], color: string, width = 3, alpha = 0.45, litEdge = 0.35): void {
    const ctx = this.paintCtx;
    if (pts.length < 2) return;
    const draw = () => {
      ctx.beginPath();
      ctx.moveTo(pts[0]![0], pts[0]![1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
      ctx.stroke();
    };
    ctx.save();
    ctx.lineWidth = width;
    ctx.strokeStyle = rgba(color, alpha);
    ctx.shadowColor = rgba(color, alpha);
    ctx.shadowBlur = width * 1.4 * this.scale;
    draw();
    ctx.restore();
    if (litEdge > 0) {
      const lx = Math.cos(LIGHT) * width * 0.9;
      const ly = Math.sin(LIGHT) * width * 0.9;
      this.colorStroke(
        pts.map((p) => [p[0] + lx, p[1] + ly] as Pt),
        PIGMENTS.leadWhite,
        { width: width * 0.35, nibRatio: 0.7, taperIn: 5, taperOut: 7, taperFloor: 0.05 },
        litEdge,
      );
    }
  }

  /** Parallel strokes inside a shape: lead-white hatching on the lights, or dark hatching. */
  hatch(shape: Shape, color: string, angle: number, spacing: number, width: number, alpha: number): void {
    const b = shape.bounds();
    const cx = (b.x0 + b.x1) / 2;
    const cy = (b.y0 + b.y1) / 2;
    const R = Math.hypot(b.x1 - b.x0, b.y1 - b.y0) / 2 + 2;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    this.clip(shape, () => {
      for (let o = -R; o <= R; o += spacing) {
        const px = cx - dy * o;
        const py = cy + dx * o;
        this.colorStroke(
          [
            [px - dx * R, py - dy * R],
            [px + dx * R, py + dy * R],
          ],
          color,
          { width, nibRatio: 0.8, taperIn: R * 0.6, taperOut: R * 0.6, taperFloor: 0, wobble: 0.15 },
          alpha,
        );
      }
    });
  }

  /** Only layers that hold something need covering. */
  private coverable(): CanvasRenderingContext2D[] {
    const out = [this.inkCtx];
    if (this.hasGold) out.push(this.goldCtx);
    if (this.hasPunch) out.push(this.punchCtx);
    return out;
  }

  private cover(path: Path2D, layers: CanvasRenderingContext2D[]): void {
    for (const ctx of layers) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = '#000';
      ctx.fill(path);
      ctx.restore();
    }
  }

  /** Run `fn` with every layer clipped to `shape` (for patterns, shading bands, folds). */
  clip(shape: Shape, fn: () => void): void {
    const p = shape.toPath2D();
    for (const ctx of this.layers) {
      ctx.save();
      ctx.clip(p);
    }
    fn();
    for (const ctx of this.layers) ctx.restore();
  }

  /** A coloured pen stroke on the paint layer (pen-flourishing, highlights, red rules). */
  colorStroke(pts: readonly Pt[], color: string, opts: Partial<PenOptions> = {}, alpha = 1): void {
    if (this.batchPaint) {
      addStroke(this.paintPath(color, alpha), pts, { width: 1, seed: this.strokeSeed++, ...opts });
      return;
    }
    const ctx = this.paintCtx;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    drawStroke(ctx, pts, { width: 1, seed: this.strokeSeed++, ...opts });
    ctx.globalAlpha = 1;
  }

  /** Lead-white highlight strokes along folds. */
  highlight(pts: readonly Pt[], width = 0.9, alpha = 0.9): void {
    this.colorStroke(pts, PIGMENTS.leadWhite, { width, nibRatio: 0.6, taperIn: 4, taperOut: 6, taperFloor: 0.1 }, alpha);
  }

  /** Small filled dots (bezants, pebbles, flowers, white-work). */
  dot(x: number, y: number, r: number, color: string, alpha = 1): void {
    if (this.batchPaint) {
      const p = this.paintPath(color, alpha);
      p.moveTo(x + r, y);
      p.arc(x, y, r, 0, Math.PI * 2);
      return;
    }
    const ctx = this.paintCtx;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /** Text on the paint layer (coloured: rubrics, white-work). */
  paintText(text: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'left'): void {
    const ctx = this.paintCtx;
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, x, y);
  }

  // ---- ink -----------------------------------------------------------------------------

  /** Trace every subpath of a shape with the pen. */
  outline(shape: Shape, opts: InkOptions = {}): void {
    for (const pts of shape.polylines(1.2)) this.ink(pts, opts);
  }

  /** One iron-gall pen stroke along a polyline. */
  ink(pts: readonly Pt[], opts: InkOptions = {}): void {
    const ctx = this.inkCtx;
    const seed = this.strokeSeed++;
    const width = opts.width ?? 1.1;
    if (this.batchInk) {
      const a = opts.alpha ?? 1;
      if (opts.bleed !== false) addStroke(this.inkPath(Math.round(16 * a) / 100), pts, { ...opts, width: width * 2.1 + 0.6, seed, wobble: (opts.wobble ?? 0.25) * 1.5 });
      addStroke(this.inkPath(Math.round(a * 100) / 100), pts, { ...opts, width, seed });
      return;
    }
    ctx.fillStyle = '#000';
    if (opts.bleed !== false) {
      ctx.globalAlpha = 0.16 * (opts.alpha ?? 1);
      drawStroke(ctx, pts, { ...opts, width: width * 2.1 + 0.6, seed, wobble: (opts.wobble ?? 0.25) * 1.5 });
    }
    ctx.globalAlpha = opts.alpha ?? 1;
    drawStroke(ctx, pts, { ...opts, width, seed });
    ctx.globalAlpha = 1;
  }

  /** A uniform hairline (pen-flourish stems, ruling, masonry joints). */
  hairline(shape: Shape, width = 0.6, alpha = 1): void {
    const ctx = this.inkCtx;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = width;
    ctx.stroke(shape.toPath2D());
    ctx.globalAlpha = 1;
  }

  /** Text written in ink (shaded by the shader like any outline). */
  inkText(text: string, x: number, y: number, font: string, align: CanvasTextAlign = 'left', alpha = 1): void {
    const ctx = this.inkCtx;
    ctx.globalAlpha = alpha;
    ctx.font = font;
    ctx.fillStyle = '#000';
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, x, y);
    ctx.globalAlpha = 1;
  }

  // ---- gold ----------------------------------------------------------------------------

  /** Lay gold leaf. It sits over paint, so it only needs to cover earlier ink. */
  gild(shape: Shape): void {
    const path = shape.toPath2D();
    this.cover(path, this.hasPunch ? [this.inkCtx, this.punchCtx] : [this.inkCtx]);
    this.goldCtx.fillStyle = '#000';
    this.goldCtx.fill(path);
    this.hasGold = true;
  }

  gildDot(x: number, y: number, r: number): void {
    const path = new Path2D();
    path.arc(x, y, r, 0, Math.PI * 2);
    this.cover(path, this.hasPunch ? [this.inkCtx, this.punchCtx] : [this.inkCtx]);
    this.goldCtx.fillStyle = '#000';
    this.goldCtx.fill(path);
    this.hasGold = true;
  }

  /** Press a punch into the gold: a small round dent that catches the light. */
  punch(x: number, y: number, r = 0.9): void {
    const ctx = this.punchCtx;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    this.hasPunch = true;
  }

  /** Punch a row of dots along a polyline (borders of halos and gold grounds). */
  punchLine(pts: readonly Pt[], spacing = 2.6, r = 0.75): void {
    let carry = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]!;
      const b = pts[i]!;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      let t = carry;
      while (t < len) {
        this.punch(a[0] + ((b[0] - a[0]) * t) / len, a[1] + ((b[1] - a[1]) * t) / len, r);
        t += spacing;
      }
      carry = t - len;
    }
  }

  /** Remove coverage inside a shape (for cut-outs and reserves). */
  erase(shape: Shape, layers: ('paint' | 'ink' | 'gold')[]): void {
    const p = shape.toPath2D();
    for (const l of layers) {
      const ctx = l === 'paint' ? this.paintCtx : l === 'ink' ? this.inkCtx : this.goldCtx;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fill(p);
      ctx.restore();
    }
  }

  // ---- shortcuts -----------------------------------------------------------------------

  /** Paint a shape (modelled) and outline it: the basic manuscript mark. */
  figure(shape: Shape, color: string, ink: InkOptions = {}, paint: PaintOptions = {}): void {
    this.paint(shape, color, paint);
    this.outline(shape, ink);
  }

  /** A flat fill and outline, for small details that do not need modelling. */
  flat(shape: Shape, color: string, ink: InkOptions = {}): void {
    this.fill(shape, color);
    this.outline(shape, ink);
  }

  /** Gild a shape, then outline it. */
  gilded(shape: Shape, ink: InkOptions = {}): void {
    this.gild(shape);
    this.outline(shape, ink);
  }

  // ---- output --------------------------------------------------------------------------

  finish(): IlluminatedImage {
    const w = this.paintCanvas.width;
    const h = this.paintCanvas.height;
    const mask = makeCanvas(w, h);
    const mctx = mask.getContext('2d')!;
    const ink = this.inkCanvas.getContext('2d')!.getImageData(0, 0, w, h).data;
    const out = mctx.createImageData(w, h);
    const d = out.data;
    let gold: Uint8ClampedArray | null = null;
    let height: Float32Array | null = null;
    if (this.hasGold) {
      gold = this.goldCanvas.getContext('2d')!.getImageData(0, 0, w, h).data;
      // Raised gesso: the gold's height is its coverage, softened at the edges, minus
      // the punched dents.
      height = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) height[i] = gold[i * 4 + 3]! / 255;
      const r = Math.max(1, Math.round(this.scale * 1.6));
      boxBlur(height, w, h, r);
      boxBlur(height, w, h, r);
      if (this.hasPunch) {
        const punch = new Float32Array(w * h);
        const pd = this.punchCanvas.getContext('2d')!.getImageData(0, 0, w, h).data;
        for (let i = 0; i < w * h; i++) punch[i] = pd[i * 4 + 3]! / 255;
        boxBlur(punch, w, h, Math.max(1, Math.round(this.scale * 0.5)));
        for (let i = 0; i < w * h; i++) height[i] = Math.max(0, height[i]! - punch[i]! * 0.55);
      }
    }
    for (let i = 0, j = 0; i < d.length; i += 4, j++) {
      d[i] = ink[i + 3]!;
      d[i + 1] = gold ? gold[i + 3]! : 0;
      d[i + 2] = height ? Math.round(height[j]! * 255) : 0;
      d[i + 3] = 255;
    }
    mctx.putImageData(out, 0, 0);
    ART_TIMINGS.push({ seed: this.seedLabel, ms: performance.now() - this.started, px: w * h });
    if (ART_TIMINGS.length > 200) ART_TIMINGS.shift();
    return {
      width: this.width,
      height: this.height,
      scale: this.scale,
      paint: this.paintCanvas,
      mask,
      anchor: this.anchor,
    };
  }
}
