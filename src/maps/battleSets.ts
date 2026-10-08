/**
 * Where battles are fought: small dioramas framed like the battle screens of the old
 * console RPGs, enemies on the left, the party on the right, and the world going on
 * around them. Each set returns where every place stands.
 */

import type { WorldRenderer } from '../engine/diorama/renderer';
import { hash2 } from '../engine/noise';
import { rock, reeds } from '../pixel/nature';
import { hex, PixelImage, ramp } from '../pixel/pixel';
import { lanternPost, mooringPost } from '../pixel/props';
import { GROUND_DEFAULT } from '../pixel/terrain';
import { NIGHT_SKY } from '../world3d/sky';
import type { Stage } from '../world3d/stage';

export interface BattleSet {
  /** Camera: where it looks and from what height. */
  camera: { x: number; y: number; h: number };
  /** Party places Front, Middle, Rear (map art pixels). */
  party: [number, number][];
  /** Enemy places 1st..4th. */
  enemies: [number, number][];
  /** Where the sea comes in from (for the tide). */
  seaward: [number, number];
}

const CAUSEWAY_GROUND = [
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~ss~~~~~~~~~~~~~~~~~~~~sss~~~~',
  'sssccccccccccccccccccccccccccccsss',
  'ssccccccccccccccccccccccccccccccss',
  'sccccccccccccccccccccccccccccccccs',
  'sscccccccccccccccccccccccccccccccs',
  '~ssss~~~~~~sss~~~~~~~~~~~ssss~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
];

/** Saint Ebb's on its island, far off across the water: a dark shape with lit windows. */
function distantAbbey(): { a: PixelImage; e: PixelImage } {
  const W = 84;
  const H = 54;
  const a = new PixelImage(W, H);
  const e = new PixelImage(W, H);
  const rockR = ramp('#20283E', 4);
  const wall = ramp('#2A3452', 4);
  const lit = hex('#FFC872');
  // The rock of the island.
  for (let x = 0; x < W; x++) {
    const top = H - 14 + Math.round(5 * Math.sin(x * 0.07) + 3 * Math.sin(x * 0.23 + 1) - (x > 30 && x < 96 ? 6 : 0));
    for (let y = top; y < H; y++) a.set(x, y, rockR[(x + y) % 7 === 0 ? 0 : y - top < 2 ? 2 : 1]!);
  }
  const base = H - 14;
  // Nave and aisle, then the tower with its spire.
  a.rect(24, base - 15, 38, 15, wall[1]!);
  a.poly(
    [
      [22, base - 15],
      [43, base - 25],
      [64, base - 15],
    ],
    wall[2]!,
  );
  a.rect(62, base - 10, 12, 10, wall[1]!);
  a.rect(12, base - 32, 11, 32, wall[2]!);
  a.poly(
    [
      [11, base - 32],
      [17.5, base - 50],
      [24, base - 32],
    ],
    wall[3]!,
  );
  a.rect(11, base - 34, 14, 2, wall[3]!);
  // Lit windows: the nave's lancets, the tower's belfry, one in the house.
  for (let i = 0; i < 5; i++) {
    const x = 28 + i * 7;
    a.rect(x, base - 11, 1, 4, lit);
    e.rect(x, base - 11, 1, 4, lit);
  }
  for (const [x, y, w, h] of [
    [16, base - 28, 3, 4],
    [17, base - 15, 1, 3],
    [66, base - 7, 2, 2],
  ] as const) {
    a.rect(x, y, w, h, lit);
    e.rect(x, y, w, h, lit);
  }
  // A few trees on the rock.
  for (const tx of [5, 9, 76, 80]) {
    for (let k = 0; k < 9; k++) {
      const y = base + 6 - k;
      const hw = Math.max(1, 4 - Math.abs(k - 3) * 0.8);
      for (let x = Math.round(tx - hw); x <= tx + hw; x++) if (hash2(x, y, 3) > 0.15) a.set(x, y, rockR[2]!);
    }
  }
  return { a, e };
}

/** The causeway to Saint Ebb's, by night, the tide coming in. */
function causeway(r: WorldRenderer, st: Stage): BattleSet {
  r.atmosphere = {
    sky: [0.34, 0.4, 0.66],
    ground: [0.1, 0.1, 0.16],
    ambient: 0.62,
    key: [0.66, 0.74, 1],
    keyLevel: 0.6,
    keyDir: [-0.35, -0.85, -0.3],
    fogColor: [0.14, 0.19, 0.33],
    fogDist: [120, 520],
    fogMax: 0.6,
    mist: [10, 0.55, 0.008],
    mistDrift: [0.05, 0.015],
    background: [0.02, 0.03, 0.08],
  };
  r.grade = {
    exposure: 1.16,
    contrast: 1.07,
    saturation: 1.06,
    lift: [0.01, 0.016, 0.05],
    gain: [0.98, 1, 1.05],
    vignette: 1,
    grain: 0.02,
    bloom: 1,
    bloomThreshold: 0.72,
    dof: 1,
    focusBand: 70,
    focusRange: 220,
  };
  st.ground({ ground: CAUSEWAY_GROUND, heights: CAUSEWAY_GROUND.map((row) => '0'.repeat(row.length)), seed: 21, palette: { ...GROUND_DEFAULT, stone: '#8A8884', sand: '#A89878' } });
  st.addSky({ ...NIGHT_SKY, moon: [128, 44], moonR: 10 });
  st.water!.moon(128, 7, 1);
  const isle = distantAbbey();
  st.addImage(isle.a, 430, 4, { h: -4, glow: isle.e, shadow: false });
  // Posts along both edges of the causeway, a lantern at its middle.
  for (let x = 24; x < 540; x += 46) {
    st.addArt(mooringPost(x), x, 46);
    st.addArt(mooringPost(x + 3), x + 23, 113);
  }
  st.addArt(lanternPost(), 236, 46);
  st.addShaft([236, 46.5, 26], [236, 50, 0], 5, 30, '#FFC27A', 0.22);
  st.addImage(reeds(2), 92, 40);
  st.addImage(reeds(5), 470, 38);
  st.addImage(reeds(7), 200, 118);
  // Rocks near the camera, soft with depth of field, and far ones in the water.
  for (const [x, y, s, k] of [
    [60, 168, 31, 2.6],
    [300, 176, 32, 2.2],
    [470, 164, 33, 3],
    [30, 22, 34, 1.2],
    [330, 18, 35, 0.9],
  ] as const)
    st.addImage(rock(s, k, true), x, y, { h: -8 });
  st.addEmitter({ kind: 'glint', area: [80, 4, 160, 36], heights: [-3, -3], count: 5, color: '#FFF0C8', size: 1.6, intensity: 1.2 }, 5);
  st.addEmitter({ kind: 'glint', area: [0, 120, 540, 60], heights: [-3, -3], count: 4, color: '#FFF0C8', size: 1.4, intensity: 0.9 }, 6);
  st.addEmitter({ kind: 'mote', area: [0, 30, 540, 100], heights: [2, 50], count: 34, color: '#B8C8F0', size: 1.6, intensity: 0.3 }, 7);
  return {
    camera: { x: 262, y: 94, h: 44 },
    enemies: [
      [206, 84],
      [172, 74],
      [140, 90],
      [108, 78],
    ],
    party: [
      [306, 72],
      [334, 82],
      [362, 92],
    ],
    seaward: [262, 140],
  };
}

/** Build the set for a battle's stage. (Interiors come with Chapter I's maps.) */
export function dressBattle(stage: string, r: WorldRenderer, st: Stage): BattleSet {
  switch (stage) {
    default:
      return causeway(r, st);
  }
}
