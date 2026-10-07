/**
 * The Sea Gate of Saint Ebb's by night: the island, the abbey church, the cliff and
 * its stairs, the shore and the gate, the causeway into the mist. Shared by the map
 * and the title screen.
 */

import type { WorldRenderer } from '../engine/diorama/renderer';
import { bush, oakTree, pineTree, reeds, rock, yewTree } from '../pixel/nature';
import { barrel, boat, crate, gravestone, lanternPost, mooringPost, sconce, stoneCross } from '../pixel/props';
import { GROUND_DEFAULT } from '../pixel/terrain';
import { abbeyChurch3D, Builder, seaGate3D, stoneHouse3D } from '../world3d/building';
import { NIGHT_SKY } from '../world3d/sky';
import { type Stage, tiles } from '../world3d/stage';

export const GROUND = [
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~rr...................rrr~~~~',
  '~~~~r.......................,..r~~',
  '~~~r.........................,,r~~',
  '~~~r,..........................r~~',
  '~~r,,...........................r~',
  '~~r,..cccccccccccccccc..........r~',
  '~~r..cccccccccccccccccccccccc,,.r~',
  '~~r.ccccccccccccccccccccccccccc.r~',
  '~~rr,..........................r~',
  '~~~ssssssssssssssssss===sssssss~~~',
  '~~~ssssssssssssssssss===sssssss~~~',
  '~~~~sssssssssssssssss===sssss~~~~~',
  '~~~~~ssssssssssssssssssssssss~~~~~',
  '~~~~~~~~sss~~ccc~~sss~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~ccc~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~ccc~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~ccc~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~ccc~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~ccc~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~ccc~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~ccc~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~ccc~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~ccc~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~ccc~~~~~~~~~~~~~~~~~~',
];
export const HEIGHTS = [
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000006666666666666666666666660000',
  '0000666666666666666666666666666600',
  '0006666666666666666666666666666600',
  '0006666666666666666666666666666600',
  '0066666666666666666666666666666660',
  '0066666666666666666666666666666660',
  '0066666666666666666666666666666660',
  '0066666666666666666666666666666660',
  '0066666666666666666666666666666660',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
];

export const WALKABLE = new Set(['.', ',', 'c', 's', '=', 'd', 'f']);
export const MAP_W = tiles(GROUND[0]!.length);
export const MAP_H = tiles(GROUND.length);
export const PLATEAU = 48;


export interface SeaGateSet {
  /** Ground rectangles nobody can walk through (x, y, w, d in art pixels). */
  blocked: [number, number, number, number][];
  /** The gate's position (its north-west corner). */
  gx: number;
  gy: number;
}

/** Build the whole set on a stage, and light and grade it for night. */
export function dressSeaGate(r: WorldRenderer, st: Stage): SeaGateSet {
  const blocked: [number, number, number, number][] = [];
    r.atmosphere = {
      sky: [0.34, 0.4, 0.66],
      ground: [0.1, 0.1, 0.16],
      ambient: 0.5,
      key: [0.62, 0.72, 1],
      keyLevel: 0.55,
      keyDir: [0.45, -0.85, -0.28],
      fogColor: [0.13, 0.17, 0.3],
      fogDist: [140, 700],
      fogMax: 0.55,
      mist: [12, 0.6, 0.007],
      mistDrift: [0.04, 0.012],
      background: [0.02, 0.03, 0.08],
    };
    r.grade = {
      exposure: 1.12,
      contrast: 1.06,
      saturation: 1.05,
      lift: [0.01, 0.015, 0.045],
      gain: [0.97, 1, 1.05],
      vignette: 1,
      grain: 0.02,
      bloom: 0.9,
      bloomThreshold: 0.74,
      dof: 1,
      focusBand: 110,
      focusRange: 320,
    };

    // ---- ground, water, sky ----
    st.ground({ ground: GROUND, heights: HEIGHTS, seed: 7, palette: { ...GROUND_DEFAULT, grass: '#4E7E48', rock: '#6E6A70', stone: '#8E8C8A' } });
    st.addSky({ ...NIGHT_SKY, moon: [70, 128] });
    st.water!.moon(70, 7, 1);

    // ---- the island ----
    const church = st.addBuilding(abbeyChurch3D(tiles(4), tiles(6.6), PLATEAU, true));
    const house = st.addBuilding(stoneHouse3D(tiles(21), tiles(8), PLATEAU, 72, 40, true));
    st.addEmitter({ kind: 'mote', area: [tiles(21) + 56, tiles(8) + 10, 8, 4], heights: [PLATEAU + 56, PLATEAU + 80], count: 10, color: '#9AA6C8', size: 3, intensity: 0.35 }, 3);
    for (const b of [church, house]) blocked.push(...b.footprints);
    // A low parapet along the cliff edge, open where the stairs come up.
    const wall = new Builder('#9A948A');
    wall.box(tiles(3), tiles(15) - 5, tiles(18), 5, PLATEAU, 7);
    wall.box(tiles(24), tiles(15) - 5, tiles(7), 5, PLATEAU, 7);
    // Cheek walls either side of the stairs down the cliff.
    for (let k = 0; k < 12; k++) {
      const y0 = tiles(15) + k * 4;
      const h = PLATEAU - (PLATEAU * (k + 1)) / 12 + 6;
      for (const x of [tiles(21) - 4, tiles(24)]) wall.box(x, y0, 4, 4, 0, h);
    }
    wall.finish();
    st.addBuilding(wall);
    blocked.push([tiles(3), tiles(15) - 5, tiles(18), 5], [tiles(24), tiles(15) - 5, tiles(7), 5]);

    st.addImage(yewTree(3), tiles(29.5), tiles(9.6));
    for (const [x, y, s] of [
      [28.2, 10.6, 1],
      [29.6, 11.2, 2],
      [30.8, 10.4, 3],
    ] as const)
      st.addArt(gravestone(s), tiles(x), tiles(y));
    st.addImage(pineTree(2), tiles(3.6), tiles(9.8));
    st.addImage(pineTree(5), tiles(31.2), tiles(8.6));
    st.addImage(pineTree(8), tiles(5.4), tiles(6.8));
    st.addImage(oakTree(14, '#3E6E44'), tiles(27.4), tiles(7.4));
    st.addImage(bush(4, 'holly'), tiles(4.2), tiles(12.6));
    st.addImage(bush(9, 'holly'), tiles(20), tiles(11.6));
    st.addImage(bush(11, 'green'), tiles(25.4), tiles(7.2));
    st.addImage(rock(15, 0.8), tiles(22.2), tiles(6.6));
    for (const x of [7.5, 17.5, 27.5]) {
      st.addArt(lanternPost(), tiles(x), tiles(14.4));
      st.addShaft([tiles(x), tiles(14.4) + 0.5, 26], [tiles(x), tiles(14.4) + 3, 0], 5, 30, '#FFC27A', 0.22);
    }
    // Light falling from the aisle windows and the tower's rose.
    const front = tiles(6.6) + 40;
    for (let i = 1; i < 4; i++) {
      const wx = tiles(4) + 48 + 24 + i * 48;
      st.addShaft([wx, front + 0.5, PLATEAU + 22], [wx + 6, front + 26, PLATEAU], 9, 24, '#FFB860', 0.3);
    }
    st.addShaft([tiles(4) + 24, front + 0.5, PLATEAU + 38], [tiles(4) + 30, front + 34, PLATEAU], 12, 26, '#FFC880', 0.18);
    // Grass and flowers underfoot.
    st.scatter('tuft', '.,', 3, 2, blocked);
    st.scatter('flowers', ',', 2, 5, blocked);
    st.scatter('reedlet', 's', 0.12, 8, blocked);

    // ---- the shore and the gate ----
    const gx = tiles(12);
    const gy = tiles(17);
    const gate = st.addBuilding(seaGate3D(gx, gy, 0));
    blocked.push(...gate.footprints);
    const sc = sconce();
    for (const px of [gx + 26, gx + 54]) {
      st.addArt(sc, px, gy + 23, { h: 34 });
      st.addFlame(px, gy + 23.5, 42, { light: 70 });
    }
    st.addArt(boat(1), tiles(7), tiles(18.4));
    st.addArt(crate(2), tiles(18.8), tiles(17.4));
    st.addArt(barrel(3), tiles(19.6), tiles(17.8));
    st.addArt(stoneCross(4), tiles(10), tiles(16.4));
    for (const [x, y, s] of [
      [3.6, 15.9, 1],
      [29.4, 16.2, 2],
      [26.4, 18.6, 3],
    ] as const)
      st.addImage(reeds(s), tiles(x), tiles(y));
    for (const [x, y, s, k] of [
      [4.2, 21.2, 1, 1.2],
      [25.5, 20.6, 2, 1],
      [29, 24.4, 3, 1.4],
      [8.2, 25.4, 4, 0.9],
      [21.5, 27.2, 5, 1.1],
    ] as const)
      st.addImage(rock(s, k, true), tiles(x), tiles(y), { h: -8 });
    // Big rocks close to the camera, soft with depth of field.
    for (const [x, y, s, k] of [
      [9.6, 26.5, 21, 2.6],
      [21, 25.2, 22, 2.2],
      [26.5, 28.5, 23, 3],
    ] as const)
      st.addImage(rock(s, k, true), tiles(x), tiles(y), { h: -10 });
    for (let y = 20.5; y < 30; y += 2.5) {
      st.addArt(mooringPost(Math.floor(y)), tiles(12.85), tiles(y));
      st.addArt(mooringPost(Math.floor(y) + 9), tiles(16.15), tiles(y + 1.2));
    }

    // ---- particles ----
    st.addEmitter({ kind: 'glint', area: [40, tiles(1), 60, tiles(5)], heights: [-3, -3], count: 3, color: '#FFF0C8', size: 1.6, intensity: 1.2 }, 5);
    st.addEmitter({ kind: 'glint', area: [40, tiles(19), 80, tiles(10)], heights: [-3, -3], count: 4, color: '#FFF0C8', size: 1.6, intensity: 1 }, 6);
    st.addEmitter({ kind: 'mote', area: [0, tiles(15), MAP_W, tiles(15)], heights: [2, 40], count: 40, color: '#B8C8F0', size: 1.6, intensity: 0.3 }, 7);

  return { blocked, gx, gy };
}
