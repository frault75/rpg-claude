/**
 * The Illuminator is the one drawing surface every generator uses, so the style stays
 * consistent by construction. It keeps the three materials of a manuscript apart:
 *
 *   paint: flat gouache colour, highlights and coloured pen-work;
 *   ink:   iron-gall outlines, stored as coverage only (the shader colours them);
 *   gold:  leaf, stored as coverage only (the shader burnishes it).
 *
 * Keeping them apart lets the sprite shader fray and paint-in each one separately,
 * the way an illuminator would: underdrawing, gold, paint, then ink.
 */

import { Rng } from '../engine/rng';
import { type Pt, type Shape } from './path';
import { drawStroke, type PenOptions } from './pen';
import { PIGMENTS } from './palettes';

/** Logical-to-pixel scale for generated art. 2 keeps it crisp on high-DPI screens. */
export const ART_SCALE = 2;

export interface IlluminatedImage {
  /** Logical size. */
  width: number;
  height: number;
  /** Pixels per logical unit. */
  scale: number;
  paint: HTMLCanvasElement;
  /** R = ink coverage, G = gold coverage. */
  mask: HTMLCanvasElement;
  /** Logical point (from the top-left) that sits on the ground; defaults to bottom centre. */
  anchor: Pt;
}

export interface InkOptions extends Partial<PenOptions> {
  /** Draw a faint wider halo first, the way iron-gall feathers into vellum. */
  bleed?: boolean;
  alpha?: number;
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function context(c: HTMLCanvasElement, scale: number): CanvasRenderingContext2D {
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  return ctx;
}

export class Illuminator {
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly rng: Rng;
  readonly paintCtx: CanvasRenderingContext2D;
  readonly inkCtx: CanvasRenderingContext2D;
  readonly goldCtx: CanvasRenderingContext2D;
  private readonly paintCanvas: HTMLCanvasElement;
  private readonly inkCanvas: HTMLCanvasElement;
  private readonly goldCanvas: HTMLCanvasElement;
  private strokeSeed = 1;
  anchor: Pt;

  constructor(width: number, height: number, seed: number | string, scale = ART_SCALE) {
    this.width = width;
    this.height = height;
    this.scale = scale;
    this.rng = new Rng(seed);
    const pw = Math.ceil(width * scale);
    const ph = Math.ceil(height * scale);
    this.paintCanvas = makeCanvas(pw, ph);
    this.inkCanvas = makeCanvas(pw, ph);
    this.goldCanvas = makeCanvas(pw, ph);
    this.paintCtx = context(this.paintCanvas, scale);
    this.inkCtx = context(this.inkCanvas, scale);
    this.goldCtx = context(this.goldCanvas, scale);
    this.anchor = [width / 2, height];
  }

  /** Shift the origin of all three layers (logical units). */
  translate(dx: number, dy: number): void {
    for (const ctx of [this.paintCtx, this.inkCtx, this.goldCtx]) ctx.translate(dx, dy);
  }

  // ---- paint ---------------------------------------------------------------------------

  /**
   * Flat gouache fill. An opaque fill covers whatever was drawn before it, so it also
   * removes earlier ink and gold underneath (the layers are separate canvases, and
   * without this, older outlines would show through newer paint).
   */
  fill(shape: Shape, color: string, alpha = 1): void {
    const ctx = this.paintCtx;
    const path = shape.toPath2D();
    if (alpha >= 0.99) this.cover(path, [this.inkCtx, this.goldCtx]);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fill(path);
    ctx.globalAlpha = 1;
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

  /** Run `fn` with paint and ink both clipped to `shape` (for patterns, shading bands, folds). */
  clip(shape: Shape, fn: () => void): void {
    const p = shape.toPath2D();
    for (const ctx of [this.paintCtx, this.inkCtx, this.goldCtx]) {
      ctx.save();
      ctx.clip(p);
    }
    fn();
    for (const ctx of [this.paintCtx, this.inkCtx, this.goldCtx]) ctx.restore();
  }

  /** A coloured pen stroke on the paint layer (pen-flourishing, highlights, red rules). */
  colorStroke(pts: readonly Pt[], color: string, opts: Partial<PenOptions> = {}, alpha = 1): void {
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
    this.cover(path, [this.inkCtx]);
    this.goldCtx.fillStyle = '#000';
    this.goldCtx.fill(path);
  }

  gildDot(x: number, y: number, r: number): void {
    const path = new Path2D();
    path.arc(x, y, r, 0, Math.PI * 2);
    this.cover(path, [this.inkCtx]);
    this.goldCtx.fillStyle = '#000';
    this.goldCtx.fill(path);
  }

  /** Remove gold or ink coverage inside a shape (for cut-outs and reserves). */
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

  /** Paint a shape and outline it: the basic manuscript mark. */
  figure(shape: Shape, color: string, ink: InkOptions = {}): void {
    this.fill(shape, color);
    this.outline(shape, ink);
  }

  /** Paint and gild a shape, then outline it. */
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
    const gold = this.goldCanvas.getContext('2d')!.getImageData(0, 0, w, h).data;
    const out = mctx.createImageData(w, h);
    const d = out.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = ink[i + 3]!;
      d[i + 1] = gold[i + 3]!;
      d[i + 2] = 0;
      d[i + 3] = 255;
    }
    mctx.putImageData(out, 0, 0);
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
