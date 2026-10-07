/**
 * The walkable grid of a map: solid tiles from an ASCII layout, extra round blockers
 * (props, people), a feet-sized collision test, and A* for click-to-walk.
 */

export interface Blocker {
  x: number;
  y: number;
  /** Horizontal and vertical radii of the blocked ellipse at ground level. */
  rx: number;
  ry: number;
}

/** The ground footprint of a walking figure. */
export const FEET = { rx: 11, ry: 5 };

export class Grid {
  readonly cols: number;
  readonly rows: number;
  readonly tile: number;
  private readonly solid: Uint8Array;
  blockers: Blocker[] = [];

  constructor(cols: number, rows: number, tile: number, solid?: Uint8Array) {
    this.cols = cols;
    this.rows = rows;
    this.tile = tile;
    this.solid = solid ?? new Uint8Array(cols * rows);
  }

  /** Build from rows of characters; `walkable` lists the characters that can be walked on. */
  static fromRows(rows: readonly string[], tile: number, walkable: string): Grid {
    const cols = Math.max(...rows.map((r) => r.length));
    const g = new Grid(cols, rows.length, tile);
    rows.forEach((row, y) => {
      for (let x = 0; x < cols; x++) g.solid[y * cols + x] = walkable.includes(row[x] ?? ' ') ? 0 : 1;
    });
    return g;
  }

  get width(): number {
    return this.cols * this.tile;
  }

  get height(): number {
    return this.rows * this.tile;
  }

  isSolidTile(tx: number, ty: number): boolean {
    if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return true;
    return this.solid[ty * this.cols + tx] === 1;
  }

  setSolid(tx: number, ty: number, solid: boolean): void {
    if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return;
    this.solid[ty * this.cols + tx] = solid ? 1 : 0;
  }

  isSolidAt(x: number, y: number): boolean {
    return this.isSolidTile(Math.floor(x / this.tile), Math.floor(y / this.tile));
  }

  /** Can a figure stand with its feet at (x, y)? */
  canStand(x: number, y: number, ignore?: Blocker): boolean {
    const pts: [number, number][] = [
      [x, y],
      [x - FEET.rx, y],
      [x + FEET.rx, y],
      [x, y - FEET.ry],
      [x, y + FEET.ry],
      [x - FEET.rx * 0.7, y - FEET.ry * 0.7],
      [x + FEET.rx * 0.7, y - FEET.ry * 0.7],
      [x - FEET.rx * 0.7, y + FEET.ry * 0.7],
      [x + FEET.rx * 0.7, y + FEET.ry * 0.7],
    ];
    if (pts.some(([px, py]) => this.isSolidAt(px, py))) return false;
    for (const b of this.blockers) {
      if (b === ignore) continue;
      const dx = (x - b.x) / (b.rx + FEET.rx);
      const dy = (y - b.y) / (b.ry + FEET.ry);
      if (dx * dx + dy * dy < 1) return false;
    }
    return true;
  }

  /**
   * Move from (x, y) by (dx, dy), sliding along walls. Returns the new position.
   */
  slide(x: number, y: number, dx: number, dy: number): [number, number] {
    if (this.canStand(x + dx, y + dy)) return [x + dx, y + dy];
    if (dx !== 0 && this.canStand(x + dx, y)) return [x + dx, y];
    if (dy !== 0 && this.canStand(x, y + dy)) return [x, y + dy];
    return [x, y];
  }

  /** Is the tile's centre standable (used by pathfinding)? */
  private open(tx: number, ty: number): boolean {
    if (this.isSolidTile(tx, ty)) return false;
    return this.canStand((tx + 0.5) * this.tile, (ty + 0.5) * this.tile);
  }

  /**
   * A* over tiles (8 directions, no corner cutting). Returns waypoints in world units,
   * ending exactly at the goal, or null when there is no way.
   */
  findPath(fx: number, fy: number, gx: number, gy: number, maxNodes = 6000): [number, number][] | null {
    const t = this.tile;
    const sx = Math.floor(fx / t);
    const sy = Math.floor(fy / t);
    let ex = Math.floor(gx / t);
    let ey = Math.floor(gy / t);
    if (!this.open(ex, ey)) {
      // Walk to the nearest open tile around the goal instead.
      let best: [number, number] | null = null;
      let bd = Infinity;
      for (let r = 1; r <= 3 && !best; r++) {
        for (let oy = -r; oy <= r; oy++) {
          for (let ox = -r; ox <= r; ox++) {
            if (!this.open(ex + ox, ey + oy)) continue;
            const d = ox * ox + oy * oy;
            if (d < bd) {
              bd = d;
              best = [ex + ox, ey + oy];
            }
          }
        }
      }
      if (!best) return null;
      [ex, ey] = best;
      gx = (ex + 0.5) * t;
      gy = (ey + 0.5) * t;
    }
    const idx = (x: number, y: number) => y * this.cols + x;
    const start = idx(sx, sy);
    const goal = idx(ex, ey);
    const g = new Map<number, number>([[start, 0]]);
    const came = new Map<number, number>();
    const open: { i: number; f: number }[] = [{ i: start, f: 0 }];
    const h = (i: number) => {
      const dx = Math.abs((i % this.cols) - ex);
      const dy = Math.abs(Math.floor(i / this.cols) - ey);
      return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
    };
    let visited = 0;
    while (open.length) {
      let bi = 0;
      for (let k = 1; k < open.length; k++) if (open[k]!.f < open[bi]!.f) bi = k;
      const cur = open.splice(bi, 1)[0]!.i;
      if (cur === goal) break;
      if (++visited > maxNodes) return null;
      const cx = cur % this.cols;
      const cy = Math.floor(cur / this.cols);
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (!ox && !oy) continue;
          const nx = cx + ox;
          const ny = cy + oy;
          if (!this.open(nx, ny)) continue;
          if (ox && oy && (!this.open(cx + ox, cy) || !this.open(cx, cy + oy))) continue;
          const ni = idx(nx, ny);
          const cost = g.get(cur)! + (ox && oy ? 1.414 : 1);
          if (cost < (g.get(ni) ?? Infinity)) {
            g.set(ni, cost);
            came.set(ni, cur);
            open.push({ i: ni, f: cost + h(ni) });
          }
        }
      }
    }
    if (!came.has(goal) && goal !== start) return null;
    const path: [number, number][] = [];
    let c = goal;
    while (c !== start) {
      path.push([((c % this.cols) + 0.5) * t, (Math.floor(c / this.cols) + 0.5) * t]);
      c = came.get(c)!;
    }
    path.reverse();
    if (path.length) path[path.length - 1] = [gx, gy];
    else path.push([gx, gy]);
    return path;
  }
}
