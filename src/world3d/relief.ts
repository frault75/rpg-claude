/**
 * Relief (DESIGN.md §8.2): the land rises around the paths, so a map reads as ground
 * with banks, knolls and terraces rather than a flat board. Each rise lifts a rectangle
 * of tiles by whole steps (8 art pixels each); the edge that faces the path is ragged,
 * pulling back a tile now and then so a bank never runs ruler-straight. A rise only
 * ever pulls back from its rectangle, never past it, so the path it borders stays clear.
 */

export interface Rise {
  /** In tiles: x, y, width, depth. */
  at: readonly [number, number, number, number];
  /** Steps of 8 art pixels (1–9). */
  h: number;
  /** The edges that face the path, which wander back by up to a tile. */
  ragged?: string;
}

/** A small stable hash for the ragged edges. */
function wander(a: number, b: number, seed: number): boolean {
  let n = (a * 374761393 + b * 668265263 + seed * 2147483647) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) % 4 === 0;
}

/** Height digits for a map `cols` × `rows` tiles: zero ground, lifted where the rises say. */
export function relief(cols: number, rows: number, rises: readonly Rise[], seed = 1): string[] {
  const h = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  rises.forEach((r, i) => {
    const [x0, y0, w, d] = r.at;
    const rag = r.ragged ?? '';
    for (let y = y0; y < y0 + d; y++)
      for (let x = x0; x < x0 + w; x++) {
        if (y < 0 || x < 0 || y >= rows || x >= cols) continue;
        // Pulled back four tiles at a time, now and then, so the edge bays rather than crenellates.
        if (rag.includes('s') && y === y0 + d - 1 && wander(x >> 2, i, seed)) continue;
        if (rag.includes('n') && y === y0 && wander(x >> 2, i + 50, seed)) continue;
        if (rag.includes('e') && x === x0 + w - 1 && wander(y >> 2, i + 100, seed)) continue;
        if (rag.includes('w') && x === x0 && wander(y >> 2, i + 150, seed)) continue;
        h[y]![x] = Math.max(h[y]![x]!, r.h);
      }
  });
  return h.map((row) => row.map((v) => String(Math.min(9, v))).join(''));
}
