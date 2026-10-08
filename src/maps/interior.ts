/**
 * Shared pieces for rooms at night: the grade and air of an interior lit by candles and
 * the moon through the windows, a back wall with lancets and a door painted on its
 * face, the moonlight falling through each window as a shaft and a cool pool on the
 * floor, and side walls that frame the room like a stage.
 */

import type { WorldRenderer } from '../engine/diorama/renderer';
import { type Art, door, windowArch } from '../pixel/buildings';
import { hex, ramp } from '../pixel/pixel';
import { Builder, elevation } from '../world3d/building';
import type { Stage } from '../world3d/stage';

export function nightInterior(r: WorldRenderer, o: { ambient?: number; moon?: number } = {}): void {
  r.atmosphere = {
    sky: [0.3, 0.36, 0.6],
    ground: [0.12, 0.1, 0.12],
    ambient: o.ambient ?? 0.32,
    key: [0.6, 0.7, 1],
    keyLevel: o.moon ?? 0.22,
    keyDir: [0.35, -0.86, -0.22],
    fogColor: [0.05, 0.06, 0.1],
    fogDist: [160, 600],
    fogMax: 0.35,
    mist: [6, 0.18, 0.01],
    mistDrift: [0.02, 0.01],
    background: [0.012, 0.012, 0.025],
  };
  r.grade = {
    exposure: 1.2,
    contrast: 1.08,
    saturation: 1.04,
    lift: [0.012, 0.012, 0.03],
    gain: [1.02, 0.99, 0.97],
    vignette: 1.2,
    grain: 0.022,
    bloom: 1,
    bloomThreshold: 0.7,
    dof: 0.8,
    focusBand: 90,
    focusRange: 260,
  };
}

export interface WallOpts {
  stone?: string;
  seed?: number;
  /** Lancets: x (from the wall's left), width, height, top. */
  windows?: { x: number; w: number; h: number; top: number }[];
  door?: { x: number; w: number; h: number; open?: boolean };
  /** A band of red ochre painted along the wall, as in the old refectories. */
  frieze?: number;
  /** Extra paint on the elevation. */
  paint?: (a: Art) => void;
}

/**
 * A back wall: its south face is at y + d, painted with stone, lancets of plain glass
 * lit by the moon, a door. Returns the builder (already added to the stage).
 */
export function backWall(st: Stage, x: number, y: number, w: number, d: number, h: number, o: WallOpts = {}): Builder {
  const stone = o.stone ?? '#8E877C';
  const front = elevation(w, h, stone, o.seed ?? 31, (a) => {
    if (o.frieze !== undefined) {
      const ochre = ramp('#A8452E', 4);
      for (let px = 0; px < w; px++) {
        a.a.set(px, o.frieze, ochre[2]!);
        a.a.set(px, o.frieze + 1, ochre[1]!);
        if (px % 12 < 6) a.a.set(px, o.frieze + 3, ochre[2]!);
        a.a.set(px, o.frieze + 4, ochre[1]!);
      }
    }
    for (const win of o.windows ?? []) windowArch(a, win.x, win.top, win.w, win.h, { lit: 'cool', plain: true, seed: win.x }, 'pointed', stone);
    if (o.door) door(a, o.door.x, h - 6 - o.door.h, o.door.w, o.door.h, { kind: 'pointed', open: o.door.open, stone });
    o.paint?.(a);
  });
  const b = new Builder(stone);
  b.box(x, y, w, d, 0, h, front);
  b.finish();
  st.addBuilding(b);
  return b;
}

/** Moonlight through a lancet: a pale shaft to the floor and a cool pool where it lands. */
export function moonThrough(st: Stage, wx: number, wallY: number, top: number, bottom: number, reach = 40): void {
  st.addShaft([wx, wallY + 0.5, top], [wx + 6, wallY + reach, 0], 8, 22, '#9AB8FF', 0.2);
  st.addLight(wx + 5, wallY + reach - 6, 6, 44, '#8AA8FF', 0.45);
  st.addEmitter({ kind: 'mote', area: [wx - 6, wallY + 4, 16, reach - 6], heights: [2, bottom], count: 8, color: '#C8D8FF', size: 1.4, intensity: 0.35 }, Math.floor(wx));
}

/** A side wall running north-south, framing the room: only its top and end show. */
export function sideWall(st: Stage, x: number, y: number, d: number, h: number, stone = '#7A746A'): void {
  const b = new Builder(stone);
  b.box(x, y, 8, d, 0, h);
  b.finish();
  st.addBuilding(b);
}

export const FLOOR = { stone: '#6E6862', wood: '#6A4A30' };
export const WAX = hex('#F2E8D0');

/**
 * Saint Ebb's at dawn on the Feast of Saint Ebba (DESIGN.md §7.5): brazil-rose and pale gold
 * through the same windows, azurite paling, the candles burnt low.
 */
export function dawnInterior(r: WorldRenderer, o: { outdoor?: boolean } = {}): void {
  r.atmosphere = {
    sky: [0.9, 0.7, 0.72],
    ground: [0.32, 0.24, 0.26],
    ambient: o.outdoor ? 0.62 : 0.5,
    key: [1, 0.78, 0.66],
    keyLevel: o.outdoor ? 0.85 : 0.5,
    keyDir: [0.7, -0.55, -0.36],
    fogColor: [0.62, 0.5, 0.56],
    fogDist: [160, 640],
    fogMax: 0.36,
    mist: [8, 0.4, 0.008],
    mistDrift: [0.03, 0.01],
    // Outside a room is dark, as at night; only the open sky takes the dawn's colour.
    background: o.outdoor ? [0.5, 0.36, 0.42] : [0.075, 0.05, 0.06],
  };
  r.grade = {
    exposure: o.outdoor ? 0.95 : 1.12,
    contrast: 1.06,
    saturation: 0.95,
    lift: [0.03, 0.015, 0.025],
    gain: [1.05, 0.98, 0.96],
    vignette: 1,
    grain: 0.02,
    bloom: 0.85,
    bloomThreshold: 0.8,
    dof: 0.8,
    focusBand: 100,
    focusRange: 300,
  };
}
