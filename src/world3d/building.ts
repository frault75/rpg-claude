/**
 * Buildings in the diorama, built as real volumes: walls are boxes whose south face
 * carries a painted elevation (coursed stone, windows whose stained glass glows, doors),
 * buttresses stand out and cast shadows, roofs are sloped planes of slate, towers end in
 * spires. Map coordinates are art pixels: x east, y south (on the ground), h up.
 */

import * as THREE from 'three';
import { SY, SZ } from '../engine/diorama/space';
import { type Art, ashlar, belfry, door, newArt, roseWindow, slateRoof, windowArch } from '../pixel/buildings';
import { PixelImage, ramp } from '../pixel/pixel';
import { pixelTexture } from './billboard';

const W = (x: number, y: number, h: number): [number, number, number] => [x, h * SY, y * SZ];

export interface LightSpot {
  x: number;
  y: number;
  h: number;
  r: number;
  color: string;
  intensity: number;
}

interface FaceSet {
  pos: number[];
  uv: number[];
  nor: number[];
  idx: number[];
}

const stoneCache = new Map<string, THREE.Texture>();
const slateCache = new Map<string, THREE.Texture>();

/** A repeating ashlar texture for the faces nobody paints specially. */
function stoneTexture(stone: string): THREE.Texture {
  let t = stoneCache.get(stone);
  if (!t) {
    const art = newArt(64, 40);
    ashlar(art, 0, 0, 64, 40, { stone, seed: 9, foot: 0 });
    t = pixelTexture(art.a);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    stoneCache.set(stone, t);
  }
  return t;
}

function slateTexture(slate: string): THREE.Texture {
  let t = slateCache.get(slate);
  if (!t) {
    const art = newArt(64, 48);
    slateRoof(art, 0, 0, 64, 48, { slate, seed: 4, ridge: false });
    // Repeatable: drop the coped edges and the eave line the 2D roof draws.
    const img = new PixelImage(64, 42);
    for (let y = 0; y < 42; y++) for (let x = 0; x < 64; x++) img.set(x, y, art.a.get(((x + 2) % 60) + 2, y + 3));
    t = pixelTexture(img);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    slateCache.set(slate, t);
  }
  return t;
}

export class Builder {
  readonly group = new THREE.Group();
  readonly lights: LightSpot[] = [];
  /** Ground rectangles the building occupies (x, y, w, d in art pixels), for collision. */
  readonly footprints: [number, number, number, number][] = [];
  private readonly sets = new Map<string, { faces: FaceSet; map: THREE.Texture; emissive?: THREE.Texture; repeat: boolean }>();

  constructor(readonly stone = '#A49C8E') {}

  private set(key: string, map: THREE.Texture, emissive?: THREE.Texture, repeat = false): FaceSet {
    let s = this.sets.get(key);
    if (!s) {
      s = { faces: { pos: [], uv: [], nor: [], idx: [] }, map, emissive, repeat };
      this.sets.set(key, s);
    }
    return s.faces;
  }

  private quad(f: FaceSet, p: [number, number, number][], uv: [number, number][], n: [number, number, number]): void {
    const base = f.pos.length / 3;
    for (let i = 0; i < 4; i++) {
      f.pos.push(...p[i]!);
      f.uv.push(...uv[i]!);
      f.nor.push(...n);
    }
    f.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  private tri(f: FaceSet, p: [number, number, number][], uv: [number, number][], n: [number, number, number]): void {
    const base = f.pos.length / 3;
    for (let i = 0; i < 3; i++) {
      f.pos.push(...p[i]!);
      f.uv.push(...uv[i]!);
      f.nor.push(...n);
    }
    f.idx.push(base, base + 1, base + 2);
  }

  /**
   * A box of stone: (x, y) its north-west corner, w wide, d deep, from height h0 up h.
   * `front` paints its south face (w x h pixels; its emissive image glows).
   */
  box(x: number, y: number, w: number, d: number, h0: number, h: number, front?: Art, stone = this.stone): void {
    const x1 = x + w;
    const y1 = y + d;
    const h1 = h0 + h;
    const st = this.set(`stone:${stone}`, stoneTexture(stone), undefined, true);
    const sx = 1 / 64;
    const sv = 1 / 40;
    if (front) {
      const key = `front:${this.sets.size}`;
      const f = this.set(key, pixelTexture(front.a), hasGlow(front.e) ? pixelTexture(front.e) : undefined);
      this.quad(
        f,
        [W(x, y1, h0), W(x1, y1, h0), W(x1, y1, h1), W(x, y1, h1)],
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ],
        [0, 0, 1],
      );
    } else {
      this.quad(
        st,
        [W(x, y1, h0), W(x1, y1, h0), W(x1, y1, h1), W(x, y1, h1)],
        [
          [x * sx, h0 * sv],
          [x1 * sx, h0 * sv],
          [x1 * sx, h1 * sv],
          [x * sx, h1 * sv],
        ],
        [0, 0, 1],
      );
    }
    // East, west, north and top.
    this.quad(
      st,
      [W(x1, y1, h0), W(x1, y, h0), W(x1, y, h1), W(x1, y1, h1)],
      [
        [y1 * sx, h0 * sv],
        [y * sx, h0 * sv],
        [y * sx, h1 * sv],
        [y1 * sx, h1 * sv],
      ],
      [1, 0, 0],
    );
    this.quad(
      st,
      [W(x, y, h0), W(x, y1, h0), W(x, y1, h1), W(x, y, h1)],
      [
        [y * sx, h0 * sv],
        [y1 * sx, h0 * sv],
        [y1 * sx, h1 * sv],
        [y * sx, h1 * sv],
      ],
      [-1, 0, 0],
    );
    this.quad(
      st,
      [W(x1, y, h0), W(x, y, h0), W(x, y, h1), W(x1, y, h1)],
      [
        [x1 * sx, h0 * sv],
        [x * sx, h0 * sv],
        [x * sx, h1 * sv],
        [x1 * sx, h1 * sv],
      ],
      [0, 0, -1],
    );
    this.quad(
      st,
      [W(x, y1, h1), W(x1, y1, h1), W(x1, y, h1), W(x, y, h1)],
      [
        [x * sx, y1 * sv],
        [x1 * sx, y1 * sv],
        [x1 * sx, y * sv],
        [x * sx, y * sv],
      ],
      [0, 1, 0],
    );
    if (h0 <= 1) this.footprints.push([x, y, w, d]);
  }

  /** A gable roof, ridge running east-west, over (x, y, w, d) from eave height h0. */
  gable(x: number, y: number, w: number, d: number, h0: number, rise: number, slate = '#4E5A72', overhang = 3): void {
    const sl = this.set(`slate:${slate}`, slateTexture(slate), undefined, true);
    const st = this.set(`stone:${this.stone}`, stoneTexture(this.stone), undefined, true);
    const x0 = x - overhang;
    const x1 = x + w + overhang;
    const yf = y + d + overhang;
    const yb = y - overhang;
    const ym = y + d / 2;
    const hr = h0 + rise;
    const he = h0 - overhang * (rise / (d / 2));
    const slopeLen = d / 2 + overhang + rise;
    const su = 1 / 64;
    const sv = 1 / 42;
    // Front slope (faces south and up).
    const ny = d / 2;
    const nz = rise;
    const nl = Math.hypot(ny * SZ, nz * SY);
    this.quad(
      sl,
      [W(x0, yf, he), W(x1, yf, he), W(x1, ym, hr), W(x0, ym, hr)],
      [
        [x0 * su, 0],
        [x1 * su, 0],
        [x1 * su, slopeLen * sv],
        [x0 * su, slopeLen * sv],
      ],
      [0, (ny * SZ) / nl, (nz * SY) / nl],
    );
    this.quad(
      sl,
      [W(x1, yb, he), W(x0, yb, he), W(x0, ym, hr), W(x1, ym, hr)],
      [
        [x1 * su, 0],
        [x0 * su, 0],
        [x0 * su, slopeLen * sv],
        [x1 * su, slopeLen * sv],
      ],
      [0, (ny * SZ) / nl, (-nz * SY) / nl],
    );
    // Gable ends.
    for (const [gx, n] of [
      [x, -1],
      [x + w, 1],
    ] as const) {
      const pts: [number, number, number][] = [W(gx, y + d, h0), W(gx, y, h0), W(gx, ym, hr)];
      if (n < 0) pts.reverse();
      this.tri(
        st,
        pts,
        pts.map((p) => [(p[2] / SZ) / 64, p[1] / SY / 40] as [number, number]),
        [n, 0, 0],
      );
    }
    // A ridge of lighter tiles.
    this.box(x0, ym - 1.5, x1 - x0, 3, hr - 1, 2.5, undefined, '#7C8494');
  }

  /** A lean-to roof sloping down to the south, from (y, hHigh) to (y + d, hLow). */
  lean(x: number, y: number, w: number, d: number, hLow: number, hHigh: number, slate = '#4E5A72', overhang = 3): void {
    const sl = this.set(`slate:${slate}`, slateTexture(slate), undefined, true);
    const yf = y + d + overhang;
    const he = hLow - overhang * ((hHigh - hLow) / d);
    const len = d + overhang + (hHigh - hLow);
    const nl = Math.hypot(d * SZ, (hHigh - hLow) * SY);
    this.quad(
      sl,
      [W(x - overhang, yf, he), W(x + w + overhang, yf, he), W(x + w + overhang, y, hHigh), W(x - overhang, y, hHigh)],
      [
        [(x - overhang) / 64, 0],
        [(x + w + overhang) / 64, 0],
        [(x + w + overhang) / 64, len / 42],
        [(x - overhang) / 64, len / 42],
      ],
      [0, (d * SZ) / nl, ((hHigh - hLow) * SY) / nl],
    );
  }

  /** A four-sided spire over a square (x, y, w, d) from height h0, `rise` pixels high. */
  spire(x: number, y: number, w: number, d: number, h0: number, rise: number, slate = '#4E5A72'): void {
    const sl = this.set(`slate:${slate}`, slateTexture(slate), undefined, true);
    const apex = W(x + w / 2, y + d / 2, h0 + rise);
    const c = [W(x, y + d, h0), W(x + w, y + d, h0), W(x + w, y, h0), W(x, y, h0)];
    const normals: [number, number, number][] = [
      [0, 0.45, 0.89],
      [0.89, 0.45, 0],
      [0, 0.45, -0.89],
      [-0.89, 0.45, 0],
    ];
    for (let i = 0; i < 4; i++) {
      const a = c[i]!;
      const b = c[(i + 1) % 4]!;
      this.tri(
        sl,
        [a, b, apex],
        [
          [0, 0],
          [w / 64, 0],
          [w / 128, (rise + d / 2) / 42],
        ],
        normals[i]!,
      );
    }
  }

  /** Merlons along the south, east and west edges of a box top at height h. */
  merlons(x: number, y: number, w: number, d: number, h: number, stone = this.stone): void {
    for (let i = x; i + 4 <= x + w; i += 7) this.box(i, y + d - 4, 4, 4, h, 6, undefined, stone);
    for (let j = y; j + 4 <= y + d - 6; j += 7) {
      this.box(x, j, 4, 4, h, 6, undefined, stone);
      this.box(x + w - 4, j, 4, 4, h, 6, undefined, stone);
    }
  }

  /** A buttress standing out of a south wall at (x, y), with two set-offs. */
  buttress(x: number, y: number, w: number, depth: number, h0: number, h: number): void {
    const s1 = Math.round(h * 0.45);
    const s2 = Math.round(h * 0.78);
    this.box(x, y, w, depth, h0, s1);
    this.box(x + 0.5, y, w - 1, depth - 1.5, h0 + s1, s2 - s1);
    this.box(x + 1, y, w - 2, depth - 3, h0 + s2, h - s2);
  }

  /** Build the meshes. */
  finish(): THREE.Group {
    for (const s of this.sets.values()) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(s.faces.pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(s.faces.uv, 2));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(s.faces.nor, 3));
      g.setIndex(s.faces.idx);
      const m = new THREE.Mesh(
        g,
        new THREE.MeshLambertMaterial({
          map: s.map,
          alphaTest: 0.5,
          emissiveMap: s.emissive ?? null,
          emissive: s.emissive ? new THREE.Color(1, 1, 1) : new THREE.Color(0, 0, 0),
          side: THREE.FrontSide,
          shadowSide: THREE.DoubleSide,
        }),
      );
      m.castShadow = true;
      m.receiveShadow = true;
      this.group.add(m);
    }
    return this.group;
  }
}

function hasGlow(img: PixelImage): boolean {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) if (d[i]! + d[i + 1]! + d[i + 2]! > 30) return true;
  return false;
}

/** Paint a wall elevation: coursed stone with a plinth, then whatever `features` adds. */
export function elevation(w: number, h: number, stone: string, seed: number, features: (a: Art) => void, plinth = true): Art {
  const art = newArt(w, h);
  ashlar(art, 0, 0, w, h, { stone, seed, foot: plinth ? 6 : 0 });
  if (plinth) {
    const st = ramp(stone, 6);
    for (let x = 0; x < w; x++) {
      art.a.set(x, h - 7, st[5]!);
      art.a.set(x, h - 6, st[2]!);
    }
  }
  // Cornice along the top.
  const st = ramp(stone, 6);
  for (let x = 0; x < w; x++) {
    art.a.set(x, 0, st[5]!);
    art.a.set(x, 1, st[3]!);
    art.a.set(x, 2, st[1]!);
  }
  features(art);
  return art;
}

/**
 * The abbey church of Saint Ebb's, seen from the south: a west tower with belfry and
 * spire, a nave of four bays with clerestory and aisle, buttresses, stained glass.
 * (x, y) is the north-west corner of its footprint; h0 the ground height there.
 */
export function abbeyChurch3D(x: number, y: number, h0: number, lit = true, seed = 11): Builder {
  const stone = '#A49C8E';
  const b = new Builder(stone);
  const glass = lit ? ('warm' as const) : null;
  // Nave: clerestory wall behind, aisle in front with a lean-to roof between them.
  const nx = x + 48;
  const nw = 192;
  const aisleH = 40;
  const clereH = 78;
  const naveD = 24;
  const aisleD = 16;
  b.box(
    nx,
    y,
    nw,
    naveD,
    h0,
    clereH,
    elevation(nw, clereH, stone, seed, (a) => {
      for (let i = 0; i < 4; i++) {
        const cx = 24 + i * 48;
        windowArch(a, cx - 8, 6, 6, 16, { lit: glass, seed: seed + i }, 'pointed', stone);
        windowArch(a, cx + 2, 6, 6, 16, { lit: glass, seed: seed + i + 9 }, 'pointed', stone);
      }
    }, false),
  );
  b.gable(nx, y, nw, naveD, h0 + clereH, 16);
  b.box(
    nx,
    y + naveD,
    nw,
    aisleD,
    h0,
    aisleH,
    elevation(nw, aisleH, stone, seed + 1, (a) => {
      for (let i = 0; i < 4; i++) {
        const cx = 24 + i * 48;
        if (i === 0) door(a, cx - 8, aisleH - 28, 16, 22, { stone });
        else windowArch(a, cx - 5, 6, 10, 26, { lit: glass, seed: seed + i * 7 }, 'pointed', stone);
      }
    }),
  );
  b.lean(nx, y + naveD, nw, aisleD, h0 + aisleH, h0 + aisleH + 14);
  const front = y + naveD + aisleD;
  for (let i = 1; i <= 4; i++) b.buttress(nx + i * 48 - (i === 4 ? 7 : 3.5), front, 7, 7, h0, aisleH - 2);
  // West tower.
  const tw = 48;
  const th = 132;
  b.box(
    x,
    front - 40,
    tw,
    40,
    h0,
    th,
    elevation(tw, th, stone, seed + 2, (a) => {
      for (const sy of [36, 72]) {
        const st = ramp(stone, 6);
        for (let i = 0; i < tw; i++) {
          a.a.set(i, sy, st[5]!);
          a.a.set(i, sy + 1, st[3]!);
          a.a.set(i, sy + 2, st[1]!);
        }
      }
      belfry(a, 9, 8, 10, 26, stone);
      belfry(a, tw - 19, 8, 10, 26, stone);
      windowArch(a, tw / 2 - 4, 44, 8, 22, { lit: glass, seed: seed + 60 }, 'pointed', stone);
      roseWindow(a, tw / 2, 94, 9, lit, stone);
      door(a, tw / 2 - 7, th - 26, 14, 20, { stone, kind: 'round' });
    }),
  );
  b.merlons(x, front - 40, tw, 40, h0 + th);
  b.spire(x + 6, front - 34, tw - 12, 28, h0 + th, 52);
  for (const px of [x, x + tw - 6]) b.spire(px, front - 6, 6, 6, h0 + th + 6, 14);
  // Clasping buttresses at the tower's south corners.
  b.buttress(x - 4, front - 4, 8, 8, h0, th - 10);
  b.buttress(x + tw - 4, front - 4, 8, 8, h0, th - 10);
  if (lit) {
    for (let i = 1; i < 4; i++) {
      // Light falling out of each window onto the wall and the ground in front.
      b.lights.push({ x: nx + 24 + i * 48, y: front + 6, h: 16, r: 60, color: '#FFB860', intensity: 0.8 });
    }
    b.lights.push({ x: x + tw / 2, y: front + 6, h: 30, r: 56, color: '#FFB860', intensity: 0.6 });
  }
  b.finish();
  return b;
}

/** The sea gate: two squat towers and an arch with the portcullis half raised. */
export function seaGate3D(x: number, y: number, h0: number, seed = 21): Builder {
  const stone = '#8E8A80';
  const b = new Builder(stone);
  const towerW = 22;
  const gateW = 36;
  const d = 22;
  for (const [tx, s] of [
    [x, 1],
    [x + towerW + gateW, 2],
  ] as const) {
    b.box(
      tx,
      y,
      towerW,
      d,
      h0,
      62,
      elevation(towerW, 62, stone, seed + s, (a) => {
        windowArch(a, 8, 14, 6, 12, { lit: 'warm', seed: seed + s, plain: true }, 'round', stone);
      }),
    );
    b.merlons(tx, y, towerW, d, h0 + 62);
  }
  // The arch: a wall over the passage, open below.
  const archH = 52;
  const arch = elevation(gateW, archH, stone, seed + 5, (a) => {
    door(a, 6, 14, 24, 38, { stone, kind: 'pointed' });
  });
  // Cut the passage out: transparent where the door leaves would be, bars of the
  // portcullis kept in its upper half.
  const iron = ramp('#3C3A40', 4);
  for (let py = 14; py < archH; py++) {
    for (let px = 6; px < 30; px++) {
      const c = arch.a.get(px, py);
      if (c[3] === 0) continue;
      const inArch = (px - 18) ** 2 / 144 + Math.max(0, 26 - py) ** 2 / 196 <= 1 || py > 26;
      if (!inArch || px < 7 || px > 28) continue;
      const bars = py < 30 && ((px - 6) % 4 === 1 || (py - 14) % 5 === 3);
      arch.a.set(px, py, bars ? iron[(px - 6) % 4 === 1 ? 2 : 1]! : [0, 0, 0, 0]);
      arch.e.set(px, py, [0, 0, 0, 0]);
    }
  }
  b.box(x + towerW, y + 4, gateW, d - 6, h0, archH, arch);
  b.merlons(x + towerW, y + 4, gateW, d - 6, h0 + archH);
  b.footprints.length = 0;
  b.footprints.push([x, y, towerW, d], [x + towerW + gateW, y, towerW, d]);
  b.finish();
  return b;
}

/** A small stone range with lit windows and a chimney. */
export function stoneHouse3D(x: number, y: number, h0: number, w = 72, d = 40, lit = true, seed = 41): Builder {
  const stone = '#9E9686';
  const b = new Builder(stone);
  const wallH = 30;
  b.box(
    x,
    y,
    w,
    d,
    h0,
    wallH,
    elevation(w, wallH, stone, seed, (a) => {
      const n = Math.max(1, Math.floor((w - 24) / 22));
      for (let i = 0; i < n; i++) {
        const wx = Math.round(10 + ((w - 34) / Math.max(1, n - 1)) * i);
        windowArch(a, wx, 8, 8, 12, { lit: lit ? 'warm' : null, seed: seed + i, plain: true }, 'round', stone);
        if (lit) b.lights.push({ x: x + wx + 4, y: y + d + 10, h: 10, r: 52, color: '#FFB060', intensity: 0.55 });
      }
      door(a, w - 18, wallH - 18, 11, 16, { kind: 'round', stone });
    }),
  );
  b.gable(x, y, w, d, h0 + wallH, 18, '#5A5468');
  b.box(x + w - 16, y + 8, 8, 8, h0 + wallH, 26);
  b.finish();
  return b;
}
