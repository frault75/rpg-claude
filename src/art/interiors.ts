/**
 * Interiors in three-quarter view, drawn the manuscript way: flat-coloured floors (red and
 * yellow encaustic tiles, flagstones, grass), wall tops seen from above, and the inner face
 * of every north wall stood up in elevation with lancets, string courses and doorways.
 *
 * Layout characters:
 *   #  wall          h  wall that can be broken through later (drawn as wall)
 *   .  tiled floor   ,  flagstones   g  grass   d  doorway (walkable gap in a wall)
 *   (space) nothing: bare vellum, not walkable
 */

import { tuft } from './architecture';
import { Illuminator, type IlluminatedImage } from './illuminator';
import { type LocationPalette, PIGMENTS, shade } from './palettes';
import { circle, pointedArch, rect, Shape } from './path';

export const WALL_CHARS = '#h';
export const WALKABLE_CHARS = '.,gd';

type Roles = LocationPalette['roles'];

const isWall = (c: string | undefined) => c !== undefined && WALL_CHARS.includes(c);
const isFloor = (c: string | undefined) => c !== undefined && WALKABLE_CHARS.includes(c);

/** How many wall rows above a floor cell are stood up as the wall's face. */
export const MAX_FACE_ROWS = 3;

export function drawInterior(rows: readonly string[], tile: number, palette: LocationPalette, seed: string): IlluminatedImage {
  const cols = Math.max(...rows.map((r) => r.length));
  const W = cols * tile;
  const H = rows.length * tile;
  const il = new Illuminator(W, H, `${seed}:${palette.id}`);
  const r = palette.roles;
  const rng = il.rng.fork('interior');
  const at = (x: number, y: number) => rows[y]?.[x];

  // ---- floors ----
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < cols; x++) {
      const c = at(x, y);
      const px = x * tile;
      const py = y * tile;
      if (c === '.' || c === 'd') tiledCell(il, px, py, tile, r, x, y);
      else if (c === ',') flagCell(il, px, py, tile, r, rng.float());
      else if (c === 'g') grassCell(il, px, py, tile, r);
    }
  }
  // Grass gets its tufts after all cells are down, so they can overhang neighbours.
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < cols; x++) {
      if (at(x, y) !== 'g') continue;
      for (let i = 0; i < 2; i++) if (rng.chance(0.7)) tuft(il, x * tile + rng.range(4, tile - 4), y * tile + rng.range(6, tile - 2), rng.range(2.6, 3.6), r);
    }
  }

  // ---- wall faces (north walls in elevation) ----
  const faceCells = new Set<string>();
  type Run = { x0: number; x1: number; top: number; bottom: number; door: boolean };
  const runs: Run[] = [];
  for (let y = 1; y < rows.length; y++) {
    let cur: Run | null = null;
    for (let x = 0; x <= cols; x++) {
      const below = at(x, y);
      const above = at(x, y - 1);
      let n = 0;
      let door = false;
      if (isFloor(below) && below !== 'd') {
        if (isWall(above)) {
          while (n < MAX_FACE_ROWS && isWall(at(x, y - 1 - n))) n++;
        } else if (above === 'd' && isWall(at(x, y - 2))) {
          // A doorway through a thick wall: the gap continues up through the face.
          let k = 1;
          while (k <= MAX_FACE_ROWS && (at(x, y - k) === 'd' || isWall(at(x, y - k)))) k++;
          n = k - 1;
          door = true;
        }
      }
      const same = cur && n > 0 && cur.top === y - n && cur.door === door && x === cur.x1;
      if (same) cur!.x1 = x + 1;
      else {
        if (cur) runs.push(cur);
        cur = n > 0 ? { x0: x, x1: x + 1, top: y - n, bottom: y, door } : null;
      }
      for (let k = 1; k <= n; k++) faceCells.add(`${x},${y - k}`);
    }
    if (cur) runs.push(cur);
  }

  // ---- wall tops (seen from above) ----
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < cols; x++) {
      if (!isWall(at(x, y)) || faceCells.has(`${x},${y}`)) continue;
      const px = x * tile;
      const py = y * tile;
      il.fill(rect(px - 0.5, py - 0.5, tile + 1, tile + 1), r.wallTop);
      // Big blocks laid in courses on the top of the wall.
      il.clip(rect(px, py, tile, tile), () => {
        for (let by = 0; by < tile; by += tile / 2) {
          const off = ((y * 2 + by / (tile / 2)) % 2) * (tile / 3);
          for (let bx = -off; bx < tile; bx += (tile * 2) / 3) {
            il.fill(rect(px + bx, py + by, (tile * 2) / 3, tile / 2), shade(r.wallTop, rng.range(-0.06, 0.06)), 0.7);
            il.ink(
              [
                [px + bx, py + by],
                [px + bx, py + by + tile / 2],
              ],
              { width: 0.4, nibRatio: 1, bleed: false, alpha: 0.3 },
            );
          }
          il.ink(
            [
              [px, py + by],
              [px + tile, py + by],
            ],
            { width: 0.4, nibRatio: 1, bleed: false, alpha: 0.3 },
          );
        }
      });
    }
  }

  for (const run of runs) (run.door ? doorway : wallFace)(il, run.x0 * tile, run.top * tile, (run.x1 - run.x0) * tile, (run.bottom - run.top) * tile, r, rng.float());

  // ---- edges: ink where floor meets wall or void, and a shadow at the foot of faces ----
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < cols; x++) {
      const c = at(x, y);
      const px = x * tile;
      const py = y * tile;
      if (isFloor(c)) {
        const north = at(x, y - 1);
        if (isWall(north) || (north === 'd' && c !== 'd')) {
          il.fill(rect(px, py, tile, 5), shade(r.floor, -0.35), 0.35);
        }
        continue;
      }
      const edges: [number, number, number, number, string | undefined][] = [
        [px, py, px + tile, py, at(x, y - 1)],
        [px, py + tile, px + tile, py + tile, at(x, y + 1)],
        [px, py, px, py + tile, at(x - 1, y)],
        [px + tile, py, px + tile, py + tile, at(x + 1, y)],
      ];
      for (const [x0, y0, x1, y1, n] of edges) {
        const meets = isWall(c) ? n === undefined || n === ' ' || isFloor(n) : false;
        if (!meets) continue;
        // The foot of a face is inked by the face itself.
        if (faceCells.has(`${x},${y}`) && y1 === py + tile && y0 === py + tile) continue;
        il.ink(
          [
            [x0, y0],
            [x1, y1],
          ],
          { width: 1.2, nibRatio: 0.55, taperIn: 0, taperOut: 0, wobble: 0.2 },
        );
      }
    }
  }
  il.anchor = [0, 0];
  return il.finish();
}

function tiledCell(il: Illuminator, px: number, py: number, tile: number, r: Roles, x: number, y: number): void {
  const half = tile / 2;
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < 2; i++) {
      const alt = (x * 2 + i + y * 2 + j) % 2 === 0;
      const tx = px + i * half;
      const ty = py + j * half;
      il.fill(rect(tx - 0.3, ty - 0.3, half + 0.6, half + 0.6), alt ? r.floor : shade(r.floor, -0.12));
      if (alt && (x + y) % 2 === 0) {
        // An inlaid yellow quatrefoil, as on encaustic tiles.
        const cx = tx + half / 2;
        const cy = ty + half / 2;
        const q = new Shape();
        for (let k = 0; k < 4; k++) {
          const a = (k * Math.PI) / 2;
          q.add(circle(cx + Math.cos(a) * half * 0.17, cy + Math.sin(a) * half * 0.17, half * 0.17));
        }
        il.fill(q, r.floorAlt, 0.95);
      } else if (alt) {
        il.dot(tx + half / 2, ty + half / 2, half * 0.12, r.floorAlt, 0.9);
      }
      il.ink(
        [
          [tx, ty],
          [tx + half, ty],
        ],
        { width: 0.35, nibRatio: 1, bleed: false, alpha: 0.3 },
      );
      il.ink(
        [
          [tx, ty],
          [tx, ty + half],
        ],
        { width: 0.35, nibRatio: 1, bleed: false, alpha: 0.3 },
      );
    }
  }
}

function flagCell(il: Illuminator, px: number, py: number, tile: number, r: Roles, k: number): void {
  il.fill(rect(px - 0.3, py - 0.3, tile + 0.6, tile + 0.6), shade(r.stone, -0.08 + k * 0.08));
  const split = k > 0.5;
  const s1 = split ? rect(px, py, tile * (0.4 + k * 0.2), tile) : rect(px, py, tile, tile * (0.35 + k * 0.3));
  il.fill(s1, shade(r.stone, -0.03 - k * 0.06), 0.8);
  il.outline(s1, { width: 0.5, nibRatio: 1, bleed: false, alpha: 0.45 });
  il.outline(rect(px, py, tile, tile), { width: 0.5, nibRatio: 1, bleed: false, alpha: 0.4 });
}

function grassCell(il: Illuminator, px: number, py: number, tile: number, r: Roles): void {
  il.fill(rect(px - 0.3, py - 0.3, tile + 0.6, tile + 0.6), shade(r.foliage, 0.62));
}

function wallFace(il: Illuminator, x: number, y: number, w: number, h: number, r: Roles, k: number): void {
  const face = rect(x, y, w, h);
  il.fill(face, r.stone);
  il.clip(face, () => {
    // Courses of ashlar.
    for (let cy = y + 5, row = 0; cy < y + h; cy += 7, row++) {
      il.ink(
        [
          [x, cy],
          [x + w, cy],
        ],
        { width: 0.4, nibRatio: 1, bleed: false, alpha: 0.3 },
      );
      for (let cx = x + ((row * 7 + k * 13) % 14); cx < x + w; cx += 14) {
        il.ink(
          [
            [cx, cy],
            [cx, cy + 7],
          ],
          { width: 0.35, nibRatio: 1, bleed: false, alpha: 0.25 },
        );
      }
    }
    // A plinth at the foot, a string course near the top.
    il.fill(rect(x, y + h - 6, w, 6), shade(r.stone, -0.18));
    il.ink(
      [
        [x, y + h - 6],
        [x + w, y + h - 6],
      ],
      { width: 0.6, nibRatio: 1, bleed: false },
    );
    il.fill(rect(x, y + 6, w, 4), shade(r.stone, -0.1));
    il.ink(
      [
        [x, y + 10],
        [x + w, y + 10],
      ],
      { width: 0.55, nibRatio: 1, bleed: false },
    );
  });
  // Lancets, evenly spread along long faces.
  if (h >= 60) {
    const n = Math.floor(w / 150);
    for (let i = 0; i < n; i++) {
      const cx = x + (w / n) * (i + 0.5);
      const ww = 16;
      const top = y + 16;
      const bottom = y + h - 16;
      const lancet = pointedArch(cx - ww / 2, top + ww, ww, ww, bottom);
      il.fill(lancet, r.window);
      il.ink(
        [
          [cx, top + ww * 0.6],
          [cx, bottom],
        ],
        { width: 0.7, nibRatio: 1, bleed: false },
      );
      il.dot(cx - 3.5, top + ww + 3, 0.9, PIGMENTS.leadWhite, 0.8);
      il.outline(lancet, { width: 0.9, nibRatio: 0.7 });
      il.outline(pointedArch(cx - ww / 2 - 3, top + ww + 1, ww + 6, ww + 3, bottom + 2), { width: 0.6, nibRatio: 0.8, bleed: false });
    }
  }
  il.outline(face, { width: 1.25, nibRatio: 0.55 });
}

function doorway(il: Illuminator, x: number, y: number, w: number, h: number, r: Roles): void {
  // Jambs and a pointed arch framing a dark passage.
  il.fill(rect(x - 6, y, w + 12, h), r.stone);
  const opening = pointedArch(x + 2, y + h * 0.42, w - 4, h * 0.34, y + h);
  il.fill(opening, shade(PIGMENTS.umber, -0.45));
  il.outline(opening, { width: 1.1, nibRatio: 0.6 });
  il.outline(pointedArch(x - 3, y + h * 0.42, w + 6, h * 0.42, y + h), { width: 0.8, nibRatio: 0.7, bleed: false });
  il.ink(
    [
      [x - 6, y],
      [x - 6, y + h],
    ],
    { width: 1.1, nibRatio: 0.6, taperIn: 0, taperOut: 0 },
  );
  il.ink(
    [
      [x + w + 6, y],
      [x + w + 6, y + h],
    ],
    { width: 1.1, nibRatio: 0.6, taperIn: 0, taperOut: 0 },
  );
}
