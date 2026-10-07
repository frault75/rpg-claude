/**
 * Diorama ground: the map's tiles as real 3D, each at its own height. Tops are textured
 * with the painted ground; where a tile stands above its neighbour a face drops to it
 * (rock for natural ground, masonry for paved platforms); stairs are built step by step.
 * Heights are given per tile as digits, in steps of 8 art pixels.
 */

import * as THREE from 'three';
import { SY, SZ } from '../engine/diorama/space';
import { ashlar, newArt } from '../pixel/buildings';
import { PixelImage, ramp } from '../pixel/pixel';
import { type Ground, type GroundPalette, GROUND_DEFAULT, KINDS, paintCliff, paintGround, parseLayout, type Terrain, TILE } from '../pixel/terrain';
import { pixelTexture } from './billboard';

export const HEIGHT_STEP = 8;
/** The water surface, in art pixels above the zero ground. */
export const WATER_LEVEL = -3;

export interface TerrainDef {
  ground: readonly string[];
  /** Height digits per tile ('0'–'9', × 8 art pixels); missing means 0. */
  heights: readonly string[];
  seed: number;
  palette?: GroundPalette;
}

const PAVED = new Set<Terrain>(['cobble', 'flag', 'wood']);

export class TerrainModel {
  readonly cols: number;
  readonly rows: number;
  readonly kinds: Terrain[][];
  /** Height of each tile in art pixels (stairs: at the tile's centre). */
  private readonly h: number[][];
  /** Stairs: height at the north and south edge of the tile. */
  private readonly stairs = new Map<string, [number, number]>();

  constructor(def: TerrainDef) {
    this.kinds = parseLayout(def.ground);
    this.rows = this.kinds.length;
    this.cols = this.kinds[0]?.length ?? 0;
    this.h = this.kinds.map((row, y) => row.map((_, x) => Number(def.heights[y]?.[x] ?? '0') * HEIGHT_STEP || 0));
    // Stairs run north-south between the ground above and below them.
    for (let x = 0; x < this.cols; x++) {
      let y = 0;
      while (y < this.rows) {
        if (this.kinds[y]![x] !== 'stairs') {
          y++;
          continue;
        }
        const y0 = y;
        while (y < this.rows && this.kinds[y]![x] === 'stairs') y++;
        const top = y0 > 0 ? this.h[y0 - 1]![x]! : 0;
        const bottom = y < this.rows ? this.h[y]![x]! : 0;
        const n = y - y0;
        for (let k = 0; k < n; k++) {
          const hn = top + ((bottom - top) * k) / n;
          const hs = top + ((bottom - top) * (k + 1)) / n;
          this.stairs.set(`${x},${y0 + k}`, [hn, hs]);
          this.h[y0 + k]![x] = (hn + hs) / 2;
        }
      }
    }
  }

  kind(tx: number, ty: number): Terrain {
    return this.kinds[ty]?.[tx] ?? 'void';
  }

  tileHeight(tx: number, ty: number): number {
    const k = this.kind(tx, ty);
    if (k === 'water' || k === 'void') return WATER_LEVEL - 6;
    return this.h[ty]?.[tx] ?? 0;
  }

  /** Ground height under a map point (art pixels); stairs slope smoothly. */
  heightAt(px: number, py: number): number {
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    const s = this.stairs.get(`${tx},${ty}`);
    if (s) {
      const f = py / TILE - ty;
      return s[0] + (s[1] - s[0]) * f;
    }
    return this.tileHeight(tx, ty);
  }

  isStairs(tx: number, ty: number): boolean {
    return this.stairs.has(`${tx},${ty}`);
  }

  stairEdges(tx: number, ty: number): [number, number] | undefined {
    return this.stairs.get(`${tx},${ty}`);
  }
}

interface Quads {
  pos: number[];
  uv: number[];
  nor: number[];
  idx: number[];
}

function quads(): Quads {
  return { pos: [], uv: [], nor: [], idx: [] };
}

/** Add a quad from four corners (counter-clockwise seen from the front) with UVs. */
function addQuad(q: Quads, p: [number, number, number][], uv: [number, number][], n: [number, number, number]): void {
  const base = q.pos.length / 3;
  for (let i = 0; i < 4; i++) {
    q.pos.push(...p[i]!);
    q.uv.push(...uv[i]!);
    q.nor.push(...n);
  }
  q.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

function toGeometry(q: Quads): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(q.pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(q.uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(q.nor, 3));
  g.setIndex(q.idx);
  return g;
}

const W = (x: number, y: number, h: number): [number, number, number] => [x, h * SY, y * SZ];

export interface TerrainBuild {
  def: TerrainDef;
  model: TerrainModel;
  ground: Ground;
  group: THREE.Group;
}

export function buildTerrain(def: TerrainDef): TerrainBuild {
  const model = new TerrainModel(def);
  const pal = def.palette ?? GROUND_DEFAULT;
  const ground = paintGround(def.ground, def.seed, pal);
  const img = ground.image;
  const T = TILE;

  // Shade the ground at the foot of anything higher to the north (ambient occlusion).
  for (let ty = 0; ty < model.rows; ty++) {
    for (let tx = 0; tx < model.cols; tx++) {
      const here = model.tileHeight(tx, ty);
      const north = model.tileHeight(tx, ty - 1);
      if (north - here < 4 || model.isStairs(tx, ty) || model.isStairs(tx, ty - 1)) continue;
      for (let j = 0; j < 7; j++) {
        const k = 0.5 + j * 0.07;
        for (let i = 0; i < T; i++) {
          const x = tx * T + i;
          const y = ty * T + j;
          const c = img.get(x, y);
          if (c[3] === 0) continue;
          img.set(x, y, [c[0] * k, c[1] * k, c[2] * k * 1.05 + 4, 255]);
        }
      }
    }
  }

  const tops = quads();
  const rock = quads();
  const wall = quads();
  const steps = quads();
  const Wpx = model.cols * T;
  const Hpx = model.rows * T;
  for (let ty = 0; ty < model.rows; ty++) {
    for (let tx = 0; tx < model.cols; tx++) {
      const k = model.kind(tx, ty);
      if (k === 'water' || k === 'void') continue;
      const x0 = tx * T;
      const x1 = x0 + T;
      const y0 = ty * T;
      const y1 = y0 + T;
      const se = model.stairEdges(tx, ty);
      if (se) {
        // Four steps per tile: a tread and a riser each.
        const n = 4;
        for (let s = 0; s < n; s++) {
          const sy0 = y0 + (s * T) / n;
          const sy1 = y0 + ((s + 1) * T) / n;
          const h = se[0] + ((se[1] - se[0]) * (s + 1)) / n;
          const hPrev = se[0] + ((se[1] - se[0]) * s) / n;
          const tread = Math.max(h, hPrev);
          addQuad(
            steps,
            [W(x0, sy1, tread), W(x1, sy1, tread), W(x1, sy0, tread), W(x0, sy0, tread)],
            [
              [0, 0.5],
              [1, 0.5],
              [1, 1],
              [0, 1],
            ],
            [0, 1, 0],
          );
          const next = se[0] + ((se[1] - se[0]) * (s + 2)) / n;
          const low = s === n - 1 ? model.tileHeight(tx, ty + 1) : Math.min(next, tread);
          if (tread - low > 0.1) {
            addQuad(
              steps,
              [W(x0, sy1, low), W(x1, sy1, low), W(x1, sy1, tread), W(x0, sy1, tread)],
              [
                [0, 0],
                [1, 0],
                [1, 0.5],
                [0, 0.5],
              ],
              [0, 0, 1],
            );
          }
        }
        continue;
      }
      const h = model.tileHeight(tx, ty);
      addQuad(
        tops,
        [W(x0, y1, h), W(x1, y1, h), W(x1, y0, h), W(x0, y0, h)],
        [
          [x0 / Wpx, 1 - y1 / Hpx],
          [x1 / Wpx, 1 - y1 / Hpx],
          [x1 / Wpx, 1 - y0 / Hpx],
          [x0 / Wpx, 1 - y0 / Hpx],
        ],
        [0, 1, 0],
      );
      // Faces down to lower neighbours: south (seen), east and west (seen when the camera turns).
      const faces = PAVED.has(k) ? wall : rock;
      const south = model.isStairs(tx, ty + 1) ? h : model.tileHeight(tx, ty + 1);
      if (h - south > 0.5 && h - Math.max(south, WATER_LEVEL) > 6) {
        const lo = Math.max(south, WATER_LEVEL - 1);
        const u0 = (x0 + ty * 37) / 128;
        addQuad(
          faces,
          [W(x0, y1, lo), W(x1, y1, lo), W(x1, y1, h), W(x0, y1, h)],
          [
            [u0, 1 - (h - lo) / 64],
            [u0 + T / 128, 1 - (h - lo) / 64],
            [u0 + T / 128, 1],
            [u0, 1],
          ],
          [0, 0, 1],
        );
      }
      for (const [dx, nx] of [
        [1, 1],
        [-1, -1],
      ] as const) {
        const nh = model.isStairs(tx + dx, ty) ? h : model.tileHeight(tx + dx, ty);
        if (h - nh <= 0.5 || h - Math.max(nh, WATER_LEVEL) <= 6) continue;
        const xe = dx > 0 ? x1 : x0;
        const lo = Math.max(nh, WATER_LEVEL - 1);
        const v0 = (y0 * SZ + tx * 29) / 128;
        const corners: [number, number, number][] = dx > 0 ? [W(xe, y1, lo), W(xe, y0, lo), W(xe, y0, h), W(xe, y1, h)] : [W(xe, y0, lo), W(xe, y1, lo), W(xe, y1, h), W(xe, y0, h)];
        addQuad(
          faces,
          corners,
          [
            [v0, 1 - (h - lo) / 64],
            [v0 + (T * SZ) / 128, 1 - (h - lo) / 64],
            [v0 + (T * SZ) / 128, 1],
            [v0, 1],
          ],
          [nx, 0, 0],
        );
      }
    }
  }

  const group = new THREE.Group();
  const groundTex = pixelTexture(img);
  const mk = (q: Quads, map: THREE.Texture) => {
    const m = new THREE.Mesh(toGeometry(q), new THREE.MeshLambertMaterial({ map, alphaTest: 0.5 }));
    m.receiveShadow = true;
    m.castShadow = true;
    group.add(m);
    return m;
  };
  mk(tops, groundTex);
  const cliffTex = pixelTexture(paintCliff(128, 64, def.seed + 3, pal));
  cliffTex.wrapS = cliffTex.wrapT = THREE.RepeatWrapping;
  mk(rock, cliffTex);
  const masonry = newArt(128, 64);
  ashlar(masonry, 0, 0, 128, 64, { stone: pal.stone, seed: def.seed + 5, course: 5, foot: 10 });
  // Coping along the top edge.
  const st = ramp(pal.stone, 6);
  for (let x = 0; x < 128; x++) {
    masonry.a.set(x, 0, st[5]!);
    masonry.a.set(x, 1, st[4]!);
    masonry.a.set(x, 2, st[1]!);
  }
  const wallTex = pixelTexture(masonry.a);
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
  mk(wall, wallTex);
  mk(steps, pixelTexture(stepTexture(pal.stone, def.seed)));
  return { def, model, ground, group };
}

/** One tile-wide step: the tread in the top half (lit), the riser below (in shadow). */
function stepTexture(stone: string, seed: number): PixelImage {
  const img = new PixelImage(TILE, 8);
  const st = ramp(stone, 6);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < TILE; x++) {
      const joint = (x + seed) % 9 === 0;
      let c = y < 4 ? st[y === 0 ? 2 : y === 3 ? 4 : 3]! : st[y === 4 ? 0 : 1]!;
      if (joint && y > 0 && y < 7) c = st[1]!;
      img.set(x, y, c);
    }
  }
  return img;
}

export { KINDS };
