/**
 * The pen. Ink lines are not canvas strokes: each one is a filled outline whose width
 * follows a broad nib held at a fixed angle, with pressure tapering at the ends and a
 * faint tremor of the hand. Thick-and-thin comes from the nib, not from a filter.
 */

import { Noise2D } from '../engine/noise';
import { dist, type Pt } from './path';

export interface PenOptions {
  /** Width of the stroke at full pressure, in logical units. */
  width: number;
  /** Angle of the nib edge in radians (scribes hold it at about 30–40 degrees). */
  nibAngle?: number;
  /** Thinnest stroke as a fraction of the widest. 1 = round pen, 0.2 = very calligraphic. */
  nibRatio?: number;
  /** Length (in units) over which the stroke swells in at the start and tapers out at the end. */
  taperIn?: number;
  taperOut?: number;
  /** Lowest pressure at a tapered end, as a fraction of full width. */
  taperFloor?: number;
  /** Amplitude of the hand's tremor along the normal, in units. */
  wobble?: number;
  /** Seed for the tremor. */
  seed?: number;
}

const DEFAULTS = {
  nibAngle: -0.6,
  nibRatio: 0.55,
  taperIn: 3,
  taperOut: 4,
  taperFloor: 0.35,
  wobble: 0.25,
  seed: 1,
};

/** Width multiplier from the nib for a stroke travelling in direction `theta`. */
export function nibFactor(theta: number, nibAngle: number, nibRatio: number): number {
  return nibRatio + (1 - nibRatio) * Math.abs(Math.sin(theta - nibAngle));
}

/** Pressure multiplier at distance `s` along a stroke of total length `len`. */
export function pressureAt(s: number, len: number, taperIn: number, taperOut: number, floor: number): number {
  const sm = (t: number) => {
    const c = Math.min(1, Math.max(0, t));
    return c * c * (3 - 2 * c);
  };
  const inT = taperIn > 0 ? sm(s / taperIn) : 1;
  const outT = taperOut > 0 ? sm((len - s) / taperOut) : 1;
  return floor + (1 - floor) * Math.min(inT, outT);
}

/**
 * The filled outline of a pen stroke along `pts`: the left edge forward, then the right
 * edge back. Returns an empty list for degenerate input.
 */
export function strokeOutline(pts: readonly Pt[], opts: PenOptions): Pt[] {
  const o = { ...DEFAULTS, ...opts };
  // Drop points that sit on top of each other: they have no direction.
  const p: Pt[] = [];
  for (const q of pts) if (p.length === 0 || dist(p[p.length - 1]!, q) > 1e-4) p.push(q);
  if (p.length < 2) return [];

  const closed = dist(p[0]!, p[p.length - 1]!) < 1e-3;
  const cum: number[] = [0];
  for (let i = 1; i < p.length; i++) cum.push(cum[i - 1]! + dist(p[i - 1]!, p[i]!));
  const len = cum[cum.length - 1]!;
  const noise = new Noise2D(o.seed);

  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < p.length; i++) {
    const prev = p[closed && i === 0 ? p.length - 2 : Math.max(0, i - 1)]!;
    const next = p[closed && i === p.length - 1 ? 1 : Math.min(p.length - 1, i + 1)]!;
    let tx = next[0] - prev[0];
    let ty = next[1] - prev[1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    const nx = -ty;
    const ny = tx;
    const theta = Math.atan2(ty, tx);
    const pressure = closed ? 1 : pressureAt(cum[i]!, len, o.taperIn, o.taperOut, o.taperFloor);
    const tremor = (noise.value(cum[i]! * 0.09, 3.7) - 0.5) * 0.35 + 1;
    const half = (o.width * pressure * nibFactor(theta, o.nibAngle, o.nibRatio) * tremor) / 2;
    const shift = (noise.value(cum[i]! * 0.05, 11.3) - 0.5) * 2 * o.wobble;
    const cx = p[i]![0] + nx * shift;
    const cy = p[i]![1] + ny * shift;
    left.push([cx + nx * half, cy + ny * half]);
    right.push([cx - nx * half, cy - ny * half]);
  }
  return left.concat(right.reverse());
}

/** Append a pen stroke's outline to a path, for batched drawing. */
export function addStroke(path: Path2D, pts: readonly Pt[], opts: PenOptions): void {
  const outline = strokeOutline(pts, opts);
  if (outline.length < 3) return;
  path.moveTo(outline[0]![0], outline[0]![1]);
  for (let i = 1; i < outline.length; i++) path.lineTo(outline[i]![0], outline[i]![1]);
  path.closePath();
}

/** Fill a pen stroke onto a 2D context (in the context's current transform). */
export function drawStroke(ctx: CanvasRenderingContext2D, pts: readonly Pt[], opts: PenOptions): void {
  const outline = strokeOutline(pts, opts);
  if (outline.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(outline[0]![0], outline[0]![1]);
  for (let i = 1; i < outline.length; i++) ctx.lineTo(outline[i]![0], outline[i]![1]);
  ctx.closePath();
  ctx.fill('nonzero');
}
