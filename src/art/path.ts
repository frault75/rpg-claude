/**
 * Shapes are described once and used twice: filled as paint (Path2D) and traced as ink
 * (sampled polylines fed to the pen). Coordinates are canvas-style, y pointing down.
 */

export type Pt = readonly [number, number];

type Cmd =
  | { t: 'M'; p: Pt }
  | { t: 'L'; p: Pt }
  | { t: 'C'; c1: Pt; c2: Pt; p: Pt }
  | { t: 'Z' };

export class Shape {
  readonly cmds: Cmd[] = [];

  moveTo(x: number, y: number): this {
    this.cmds.push({ t: 'M', p: [x, y] });
    return this;
  }

  lineTo(x: number, y: number): this {
    this.cmds.push({ t: 'L', p: [x, y] });
    return this;
  }

  cubicTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): this {
    this.cmds.push({ t: 'C', c1: [c1x, c1y], c2: [c2x, c2y], p: [x, y] });
    return this;
  }

  quadTo(cx: number, cy: number, x: number, y: number): this {
    const p0 = this.lastPoint();
    // Elevate the quadratic to a cubic so everything downstream deals with one curve type.
    return this.cubicTo(
      p0[0] + (2 / 3) * (cx - p0[0]),
      p0[1] + (2 / 3) * (cy - p0[1]),
      x + (2 / 3) * (cx - x),
      y + (2 / 3) * (cy - y),
      x,
      y,
    );
  }

  close(): this {
    this.cmds.push({ t: 'Z' });
    return this;
  }

  /** Append another shape's commands (as separate subpaths). */
  add(other: Shape): this {
    this.cmds.push(...other.cmds);
    return this;
  }

  /** Conservative bounds (control points included). */
  bounds(): { x0: number; y0: number; x1: number; y1: number } {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    const take = (p: Pt) => {
      if (p[0] < x0) x0 = p[0];
      if (p[1] < y0) y0 = p[1];
      if (p[0] > x1) x1 = p[0];
      if (p[1] > y1) y1 = p[1];
    };
    for (const c of this.cmds) {
      if (c.t === 'Z') continue;
      take(c.p);
      if (c.t === 'C') {
        take(c.c1);
        take(c.c2);
      }
    }
    if (x0 === Infinity) return { x0: 0, y0: 0, x1: 0, y1: 0 };
    return { x0, y0, x1, y1 };
  }

  lastPoint(): Pt {
    for (let i = this.cmds.length - 1; i >= 0; i--) {
      const c = this.cmds[i]!;
      if (c.t !== 'Z') return c.p;
    }
    return [0, 0];
  }

  toPath2D(): Path2D {
    const p = new Path2D();
    for (const c of this.cmds) {
      if (c.t === 'M') p.moveTo(c.p[0], c.p[1]);
      else if (c.t === 'L') p.lineTo(c.p[0], c.p[1]);
      else if (c.t === 'C') p.bezierCurveTo(c.c1[0], c.c1[1], c.c2[0], c.c2[1], c.p[0], c.p[1]);
      else p.closePath();
    }
    return p;
  }

  /**
   * Sample every subpath into a polyline with points roughly `step` apart.
   * Closed subpaths repeat their first point at the end.
   */
  polylines(step = 1.5): Pt[][] {
    const out: Pt[][] = [];
    let cur: Pt[] = [];
    let start: Pt = [0, 0];
    let last: Pt = [0, 0];
    const flush = () => {
      if (cur.length > 1) out.push(cur);
      cur = [];
    };
    for (const c of this.cmds) {
      if (c.t === 'M') {
        flush();
        start = c.p;
        last = c.p;
        cur.push(c.p);
      } else if (c.t === 'L') {
        const n = Math.max(1, Math.ceil(dist(last, c.p) / step));
        for (let i = 1; i <= n; i++) cur.push(lerpPt(last, c.p, i / n));
        last = c.p;
      } else if (c.t === 'C') {
        const approx = dist(last, c.c1) + dist(c.c1, c.c2) + dist(c.c2, c.p);
        const n = Math.max(2, Math.ceil(approx / step));
        for (let i = 1; i <= n; i++) cur.push(cubicAt(last, c.c1, c.c2, c.p, i / n));
        last = c.p;
      } else {
        if (dist(last, start) > 1e-6) {
          const n = Math.max(1, Math.ceil(dist(last, start) / step));
          for (let i = 1; i <= n; i++) cur.push(lerpPt(last, start, i / n));
        }
        last = start;
        flush();
        cur.push(start);
      }
    }
    flush();
    return out;
  }
}

export function dist(a: Pt, b: Pt): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

export function lerpPt(a: Pt, b: Pt, t: number): Pt {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

export function cubicAt(p0: Pt, c1: Pt, c2: Pt, p1: Pt, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [a * p0[0] + b * c1[0] + c * c2[0] + d * p1[0], a * p0[1] + b * c1[1] + c * c2[1] + d * p1[1]];
}

/**
 * A smooth curve through the given points (Catmull-Rom converted to cubic Beziers).
 * `tension` 1 is standard Catmull-Rom; lower is tighter.
 */
export function smooth(points: readonly Pt[], closed: boolean, tension = 1): Shape {
  const s = new Shape();
  const n = points.length;
  if (n < 2) return s;
  const at = (i: number): Pt => {
    if (closed) return points[((i % n) + n) % n]!;
    return points[Math.min(n - 1, Math.max(0, i))]!;
  };
  s.moveTo(points[0]![0], points[0]![1]);
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const k = tension / 6;
    s.cubicTo(
      p1[0] + (p2[0] - p0[0]) * k,
      p1[1] + (p2[1] - p0[1]) * k,
      p2[0] - (p3[0] - p1[0]) * k,
      p2[1] - (p3[1] - p1[1]) * k,
      p2[0],
      p2[1],
    );
  }
  if (closed) s.close();
  return s;
}

/** A closed polygon of straight edges. */
export function poly(points: readonly Pt[]): Shape {
  const s = new Shape();
  points.forEach((p, i) => (i === 0 ? s.moveTo(p[0], p[1]) : s.lineTo(p[0], p[1])));
  return s.close();
}

export function rect(x: number, y: number, w: number, h: number): Shape {
  return poly([
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ]);
}

export function ellipse(cx: number, cy: number, rx: number, ry: number, rot = 0): Shape {
  // Four-arc cubic approximation of an ellipse.
  const k = 0.5522847498;
  const c = Math.cos(rot);
  const sn = Math.sin(rot);
  const tr = (x: number, y: number): Pt => [cx + x * c - y * sn, cy + x * sn + y * c];
  const s = new Shape();
  const p0 = tr(rx, 0);
  s.moveTo(p0[0], p0[1]);
  const quads: [Pt, Pt, Pt][] = [
    [tr(rx, ry * k), tr(rx * k, ry), tr(0, ry)],
    [tr(-rx * k, ry), tr(-rx, ry * k), tr(-rx, 0)],
    [tr(-rx, -ry * k), tr(-rx * k, -ry), tr(0, -ry)],
    [tr(rx * k, -ry), tr(rx, -ry * k), tr(rx, 0)],
  ];
  for (const [a, b, p] of quads) s.cubicTo(a[0], a[1], b[0], b[1], p[0], p[1]);
  return s.close();
}

export function circle(cx: number, cy: number, r: number): Shape {
  return ellipse(cx, cy, r, r);
}

/** An open line through points, straight segments. */
export function line(points: readonly Pt[]): Shape {
  const s = new Shape();
  points.forEach((p, i) => (i === 0 ? s.moveTo(p[0], p[1]) : s.lineTo(p[0], p[1])));
  return s;
}

/** Pointed (Gothic) arch window or door outline: springs at y, apex at y - h. */
export function pointedArch(x: number, y: number, w: number, h: number, bottom: number): Shape {
  const apexY = y - h;
  return new Shape()
    .moveTo(x, bottom)
    .lineTo(x, y)
    .cubicTo(x, y - h * 0.55, x + w * 0.3, apexY + h * 0.1, x + w / 2, apexY)
    .cubicTo(x + w * 0.7, apexY + h * 0.1, x + w, y - h * 0.55, x + w, y)
    .lineTo(x + w, bottom)
    .close();
}

/** Total length of a polyline. */
export function polylineLength(pts: readonly Pt[]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += dist(pts[i - 1]!, pts[i]!);
  return l;
}
