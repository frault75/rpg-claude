/**
 * Where battles are fought: small dioramas framed like the battle screens of the old
 * console RPGs, enemies on the left, the party on the right, and the world going on
 * around them. Each set returns where every place stands.
 */

import type { WorldRenderer } from '../engine/diorama/renderer';
import { hash2 } from '../engine/noise';
import { rock, reeds } from '../pixel/nature';
import { hex, PixelImage, ramp } from '../pixel/pixel';
import { armarium, candleStand, coffer, lectern, writingDesk } from '../pixel/furniture';
import { gravestone, lanternPost, mooringPost, stoneCross } from '../pixel/props';
import { GROUND_DEFAULT } from '../pixel/terrain';
import { NIGHT_SKY } from '../world3d/sky';
import { relief } from '../world3d/relief';
import { type Stage, tiles } from '../world3d/stage';
import { arcade } from './cloister';
import { SNOW_GROUND, WINTER_NIGHT_SKY, WINTER_SKY, winterDay, winterNight } from './lychford/winter';
import { bareTree, cottage3D, lychGate, snowHedge } from '../world3d/lychford';
import { CHARACTERS, drawCharacter, FRAMES } from '../pixel/characters';
import { backWall, dawnInterior, FLOOR, moonThrough, nightInterior, sideWall } from './interior';
import { bush, yewTree } from '../pixel/nature';
import { wellHead } from '../pixel/furniture';
import { blanch, ninefoldGate, outlineBird } from '../world3d/blanchwood';
import { blanchedTree, setDepth, WOOD_GROUND, WOOD_SKY, woodLight } from './blanchwood/common';
import { paintBones } from './blanchwood/ossuary';
import { acanthusRow, MARGIN_GROUND, MARGIN_SKY, marginLight, pageAbove } from './margin/common';
import { goldBar, goose, ivy as ivyRun } from '../world3d/margin';

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

const ROOM = [
  '                                  ',
  '                                  ',
  ' ffffffffffffffffffffffffffffffff ',
  ' ffffffffffffffffffffffffffffffff ',
  ' ffffffffffffffffffffffffffffffff ',
  ' ffffffffffffffffffffffffffffffff ',
  ' ffffffffffffffffffffffffffffffff ',
  ' ffffffffffffffffffffffffffffffff ',
  ' ffffffffffffffffffffffffffffffff ',
  ' ffffffffffffffffffffffffffffffff ',
  ' ffffffffffffffffffffffffffffffff ',
];

/** The scriptorium by night: the fight among the desks, the Book's lectern behind. */
function scriptorium(r: WorldRenderer, st: Stage): BattleSet {
  nightInterior(r, { ambient: 0.5 });
  r.grade = { ...r.grade, focusBand: 60, focusRange: 200 };
  // Candlelight falling on the fighters from in front, as from desks out of frame.
  st.addLight(tiles(17), tiles(9.5), 36, 150, '#FFD2A0', 0.55);
  st.ground({ ground: ROOM, heights: ROOM.map((row) => '0'.repeat(row.length)), seed: 14, palette: { ...GROUND_DEFAULT, stone: FLOOR.stone } });
  const windows = [tiles(5), tiles(13), tiles(21), tiles(29)].map((x) => ({ x: x - tiles(1), w: 16, h: 36, top: 10 }));
  backWall(st, tiles(1), tiles(1), tiles(32), tiles(1), 80, { windows, frieze: 54, seed: 33 });
  for (const w of windows) moonThrough(st, tiles(1) + w.x + w.w / 2, tiles(2), 64, 40, 40);
  for (const x of [tiles(9), tiles(17), tiles(25)]) st.addArt(armarium(Math.floor(x)), x, tiles(2) + 4);
  st.addArt(lectern(), tiles(16.4), tiles(3.6));
  for (const dx of [-22, 22]) {
    st.addArt(candleStand(), tiles(16.4) + dx, tiles(3.8));
    st.addCandle(tiles(16.4) + dx, tiles(3.8), 29, 0.6, 64);
  }
  for (const [x, y, s] of [
    [tiles(5), tiles(3.8), 1],
    [tiles(27.5), tiles(3.8), 2],
  ] as const)
    st.addArt(writingDesk(s), x, y);
  // Desks close to the camera, soft with depth of field.
  st.addArt(writingDesk(5), tiles(4), tiles(10.6));
  st.addArt(writingDesk(6), tiles(29), tiles(10.4));
  st.addCandle(tiles(10.5), tiles(9.6), 4, 0.45, 70);
  st.addCandle(tiles(23.5), tiles(9.6), 4, 0.45, 70);
  return {
    camera: { x: tiles(17), y: tiles(5.8), h: 36 },
    enemies: [
      [tiles(14.4), tiles(7.0)],
      [tiles(12.3), tiles(6.3)],
      [tiles(10.3), tiles(7.3)],
      [tiles(8.3), tiles(6.6)],
    ],
    party: [
      [tiles(19.4), tiles(6.5)],
      [tiles(21.2), tiles(7.2)],
      [tiles(23), tiles(7.9)],
    ],
    seaward: [tiles(17), tiles(9)],
  };
}

const GARTH = [
  '                                  ',
  '                                  ',
  ' ffffffffffffffffffffffffffffffff ',
  ' ................................ ',
  ' ................................ ',
  ' ffffffffffffffffffffffffffffffff ',
  ' ffffffffffffffffffffffffffffffff ',
  ' ................................ ',
  ' ................................ ',
  ' ................................ ',
  ' ................................ ',
];

/** The cloister garth under the moon, the arcade behind. */
function cloisterGarth(r: WorldRenderer, st: Stage): BattleSet {
  r.atmosphere = {
    sky: [0.34, 0.4, 0.66],
    ground: [0.1, 0.1, 0.16],
    ambient: 0.56,
    key: [0.62, 0.72, 1],
    keyLevel: 0.66,
    keyDir: [0.4, -0.84, -0.3],
    fogColor: [0.12, 0.16, 0.28],
    fogDist: [140, 560],
    fogMax: 0.45,
    mist: [8, 0.5, 0.008],
    mistDrift: [0.03, 0.01],
    background: [0.02, 0.03, 0.08],
  };
  r.grade = { exposure: 1.16, contrast: 1.06, saturation: 1.06, lift: [0.01, 0.015, 0.045], gain: [0.97, 1, 1.05], vignette: 1, grain: 0.02, bloom: 0.9, bloomThreshold: 0.74, dof: 1, focusBand: 60, focusRange: 200 };
  st.ground({ ground: GARTH, heights: GARTH.map((row) => '0'.repeat(row.length)), seed: 35, palette: { ...GROUND_DEFAULT, grass: '#4E7E48', stone: '#8A8680' } });
  st.addSky({ ...NIGHT_SKY, moon: [180, 150] });
  const w = tiles(32);
  backWall(st, tiles(1), tiles(1), w, tiles(1), 72, { seed: 53, paint: (a) => arcade(a, w, 72) });
  sideWall(st, tiles(0.5), tiles(1), tiles(10), 72);
  st.addArt(wellHead(), tiles(17), tiles(3.4));
  st.addImage(yewTree(5), tiles(6), tiles(4));
  st.addImage(yewTree(9), tiles(28), tiles(4.2));
  st.addImage(bush(3, 'holly'), tiles(3), tiles(10.6));
  st.addImage(bush(8, 'green'), tiles(31), tiles(10.4));
  st.scatter('tuft', '.', 3, 6, []);
  st.scatter('flowers', '.', 0.5, 11, []);
  st.addEmitter({ kind: 'mote', area: [tiles(1), tiles(3), tiles(32), tiles(7)], heights: [2, 40], count: 30, color: '#B8C8F0', size: 1.6, intensity: 0.3 }, 9);
  return {
    camera: { x: tiles(17), y: tiles(5.8), h: 36 },
    enemies: [
      [tiles(14.4), tiles(7.0)],
      [tiles(12.3), tiles(6.3)],
      [tiles(10.3), tiles(7.3)],
      [tiles(8.3), tiles(6.6)],
    ],
    party: [
      [tiles(19.4), tiles(6.5)],
      [tiles(21.2), tiles(7.2)],
      [tiles(23), tiles(7.9)],
    ],
    seaward: [tiles(17), tiles(9)],
  };
}

const SNOWFIELD = Array.from({ length: 11 }, (_, y) => ' '.repeat(0) + (y >= 5 && y <= 7 ? 'd' : 'n').repeat(34));

/** Behind an outdoor battle the ground banks up in two steps, so the fight has a backdrop. */
function backdrop(seed: number): string[] {
  return relief(34, 11, [
    { at: [0, 0, 34, 4], h: 2, ragged: 's' },
    { at: [0, 0, 34, 2], h: 3, ragged: 's' },
  ], seed);
}

/** Lychford by day or night: the lane, the lych-gate, or the green ringed with lanterns. */
function lychford(kind: 'lane' | 'lychgate' | 'green', r: WorldRenderer, st: Stage): BattleSet {
  const night = kind === 'green';
  if (night) winterNight(r);
  else winterDay(r);
  r.grade = { ...r.grade, focusBand: 60, focusRange: 220 };
  st.ground({ ground: SNOWFIELD, heights: backdrop(41), seed: 41, palette: SNOW_GROUND });
  st.addSky(night ? { ...WINTER_NIGHT_SKY, moon: [180, 130] } : { ...WINTER_SKY }, 220);
  if (kind === 'lane') {
    for (let x = 0; x < tiles(34); x += 44) st.addImage(snowHedge(44, x), x + 22, tiles(3.4));
    for (let i = 0; i < 9; i++) st.addImage(bareTree(i + 30, 0.9), tiles(2 + i * 3.8), tiles(1.8) + (i % 2) * 8);
    st.addArt(stoneCross(5), tiles(25), tiles(3.6));
  } else if (kind === 'lychgate') {
    st.addArt(lychGate(), tiles(17), tiles(3.6));
    for (let i = 0; i < 6; i++) st.addArt(gravestone(i + 2), tiles(3 + i * 5.4), tiles(2.8) + (i % 2) * 10);
    st.addImage(yewTree(6), tiles(4), tiles(3));
    st.addImage(yewTree(8), tiles(30), tiles(3.2));
  } else {
    for (const x of [tiles(4), tiles(13), tiles(22), tiles(30)]) st.addBuilding(cottage3D(x - 28, tiles(0.6), 56, 30, { seed: Math.floor(x), lit: true }), st.heightAt(x, tiles(1.5)));
    // Lanterns ring the green, kept low so the snow does not burn white under them.
    const lit = st.lights.length;
    for (let i = 0; i < 4; i++) {
      st.addArt(lanternPost(), tiles(4 + i * 8.6), tiles(3.2));
      if (i % 3 === 0) st.addArt(lanternPost(), tiles(6 + i * 7.4), tiles(10.4));
    }
    for (const l of st.lights.slice(lit)) l.intensity *= 0.5;
    // The audience of the play, frayed villagers in the snow, at the edges of the ring.
    for (const [i, x] of [tiles(3), tiles(6.4), tiles(9.6), tiles(25.2), tiles(28.4), tiles(31.6)].entries()) {
      const b = st.addImage(drawCharacter(CHARACTERS[i % 2 ? 'goodwife' : 'villager']!, i < 3 ? 'right' : 'left', FRAMES[0]!), x, tiles(3.8) + (i % 2) * 5);
      b.fray = 0.2 + (i % 3) * 0.15;
    }
  }
  if (!night) st.addEmitter({ kind: 'snow', area: [0, 0, tiles(34), tiles(11)], heights: [0, 120], count: 60, color: '#F4F8FF', size: 1.6, intensity: 0.6 }, 13);
  st.addLight(tiles(17), tiles(9.5), 40, 160, night ? '#FFD2A0' : '#FFF4E0', night ? 0.6 : 0.25);
  return {
    camera: { x: tiles(17), y: tiles(5.8), h: 36 },
    // Three abreast here, so the line is drawn tighter and clear of the command window.
    enemies: [
      [tiles(15.6), tiles(7.0)],
      [tiles(14.0), tiles(6.1)],
      [tiles(12.5), tiles(7.3)],
      [tiles(11.1), tiles(6.2)],
    ],
    party: [
      [tiles(19.4), tiles(6.5)],
      [tiles(21.2), tiles(7.2)],
      [tiles(23), tiles(7.9)],
    ],
    seaward: [tiles(17), tiles(9)],
  };
}

const TIGHT: [number, number][] = [
  [tiles(15.6), tiles(7.0)],
  [tiles(14.1), tiles(6.0)],
  [tiles(12.7), tiles(7.2)],
  [tiles(11.3), tiles(5.7)],
];
const PARTY_PLACES: [number, number][] = [
  [tiles(19.4), tiles(6.5)],
  [tiles(21.2), tiles(7.2)],
  [tiles(23), tiles(7.9)],
];

/** The Blanchwood (F5) and Ninefold Gate (F6): grey trees on blank vellum. */
function blanchwoodSet(kind: 'blanchwood' | 'gate', r: WorldRenderer, st: Stage): BattleSet {
  const depth = kind === 'gate' ? 0.62 : 0.4;
  woodLight(r, depth);
  setDepth(r, depth);
  r.grade = { ...r.grade, focusBand: 60, focusRange: 220 };
  const field = Array.from({ length: 11 }, (_, y) => Array.from({ length: 34 }, (_, x) => (hash2(x, y, 3) < (kind === 'gate' ? 0.7 : 0.3) ? 'v' : y >= 5 && y <= 7 ? 'd' : '.')).join(''));
  st.ground({ ground: field, heights: backdrop(61), seed: 61, palette: WOOD_GROUND });
  st.addSky({ ...WOOD_SKY }, 220);
  if (kind === 'gate') st.addArt(ninefoldGate(), tiles(17), tiles(3.4));
  for (let i = 0; i < 9; i++) {
    const x = tiles(1.5 + i * 3.9);
    if (kind === 'gate' && Math.abs(x - tiles(17)) < tiles(5)) continue;
    st.addImage(blanchedTree(i + 141, depth + hash2(i, 1, 5) * 0.2), x, tiles(2.4) + (i % 2) * 10);
    if (i % 3 === 1) st.addImage(blanch(outlineBird(i), depth, i), x + 9, tiles(2.4) + (i % 2) * 10 - 2, { h: st.heightAt(x, tiles(2.4) + (i % 2) * 10) + 38, shadow: false });
  }
  for (let i = 0; i < 4; i++) st.addImage(blanchedTree(i + 151, depth + 0.1), tiles(3 + i * 9), tiles(10.8));
  st.addEmitter({ kind: 'mote', area: [0, 0, tiles(34), tiles(11)], heights: [2, 60], count: 30, color: '#F4F0E6', size: 1.5, intensity: 0.35 }, 19);
  return { camera: { x: tiles(17), y: tiles(5.8), h: 36 }, enemies: TIGHT, party: PARTY_PLACES, seaward: [tiles(17), tiles(9)] };
}

/** The ossuary under Knell Chapel (B3): bones in the walls, a ring of candles. */
function ossuarySet(r: WorldRenderer, st: Stage): BattleSet {
  nightInterior(r, { ambient: 0.45, moon: 0.1 });
  r.grade = { ...r.grade, saturation: 0.6, exposure: 1.15, focusBand: 60, focusRange: 200 };
  st.ground({ ground: ROOM, heights: ROOM.map((row) => '0'.repeat(row.length)), seed: 63, palette: { ...GROUND_DEFAULT, stone: FLOOR.stone } });
  backWall(st, tiles(1), tiles(1), tiles(32), tiles(1), 80, { stone: '#7A746A', seed: 65, paint: paintBones });
  for (let i = 0; i < 7; i++) {
    const x = tiles(4 + i * 4.4);
    st.addArt(candleStand(14), x, tiles(3.4));
    st.addCandle(x, tiles(3.4), 17, 0.45, 60);
  }
  st.addLight(tiles(17), tiles(9.5), 36, 150, '#FFD2A0', 0.5);
  st.addCandle(tiles(9), tiles(9.8), 4, 0.4, 60);
  st.addCandle(tiles(26), tiles(9.6), 4, 0.4, 60);
  st.addEmitter({ kind: 'mote', area: [tiles(1), tiles(2), tiles(32), tiles(8)], heights: [2, 40], count: 24, color: '#E8DCC0', size: 1.4, intensity: 0.3 }, 27);
  return { camera: { x: tiles(17), y: tiles(5.8), h: 36 }, enemies: TIGHT, party: PARTY_PLACES, seaward: [tiles(17), tiles(9)] };
}

/** The Margin (F7, F8) and the Ink-Well (B4): gold underfoot, acanthus, the page above. */
function marginSet(kind: 'ivy' | 'fair' | 'inkwell', r: WorldRenderer, st: Stage): BattleSet {
  marginLight(r, kind === 'inkwell' ? 0.55 : 0);
  r.grade = { ...r.grade, focusBand: 60, focusRange: 220 };
  const well = kind === 'inkwell';
  const field = Array.from({ length: 11 }, (_, y) => Array.from({ length: 34 }, (_, x) => (well && Math.hypot((x + 0.5 - 13.6) / 1.7, y + 0.5 - 6.4) < 2.6 ? '~' : 'o')).join(''));
  st.ground(
    { ground: field, heights: backdrop(67), seed: 67, palette: MARGIN_GROUND },
    well ? { deep: '#08060E', mid: '#120E1E', shallow: '#221C34', ripple: '#3A3050', foam: '#5A4E70', glint: '#E8D8A8' } : undefined,
  );
  st.addSky({ ...MARGIN_SKY }, 220);
  pageAbove(st, tiles(34));
  acanthusRow(st, 0, tiles(34), tiles(2.6), kind === 'fair' ? 61 : 63, 78, 1.05);
  acanthusRow(st, tiles(2), tiles(34), tiles(11.4), 69, 130, 0.85);
  for (let x = 0; x < tiles(34); x += 90) st.addImage(goldBar(86, 14, x), x + 43, tiles(1.4));
  if (kind === 'ivy') for (let x = tiles(3); x < tiles(34); x += 120) st.addImage(ivyRun(90, x), x, tiles(9.8));
  if (kind === 'fair') for (let i = 0; i < 6; i++) st.addImage(goose(i), tiles(22 + i * 1.6), tiles(3.6) + (i % 2) * 8);
  st.addEmitter({ kind: 'glint', area: [0, tiles(1), tiles(34), tiles(10)], heights: [2, 60], count: 26, color: '#FFF4C8', size: 1.6, intensity: 1.2 }, 29);
  return { camera: { x: tiles(17), y: tiles(5.8), h: 36 }, enemies: TIGHT, party: PARTY_PLACES, seaward: [tiles(17), tiles(9)] };
}

/** The Abbey church at dawn (B5): the Book on the altar, MERCY above, a lectern at the party's Rear. */
function naveSet(r: WorldRenderer, st: Stage): BattleSet {
  dawnInterior(r);
  r.grade = { ...r.grade, focusBand: 60, focusRange: 220 };
  st.ground({ ground: ROOM, heights: ROOM.map((row) => '0'.repeat(row.length)), seed: 95, palette: { ...GROUND_DEFAULT, stone: FLOOR.stone } });
  const windows = [tiles(4), tiles(11), tiles(18), tiles(25)].map((x) => ({ x: x - tiles(1), w: 18, h: 50, top: 8 }));
  backWall(st, tiles(1), tiles(1), tiles(32), tiles(1), 100, { stone: '#A89C8C', seed: 97, windows, frieze: 64 });
  st.addArt(coffer(12), tiles(12), tiles(3.4));
  st.addArt(lectern(5), tiles(12), tiles(3.8));
  for (const dx of [-30, 30]) {
    st.addArt(candleStand(), tiles(12) + dx, tiles(3.6));
    st.addCandle(tiles(12) + dx, tiles(3.6), 29, 0.6, 70);
  }
  // A lectern behind the party, where Isot writes.
  st.addArt(lectern(7, true), tiles(24.4), tiles(7.2));
  st.addLight(tiles(17), tiles(9.5), 40, 160, '#FFD8C0', 0.5);
  st.addEmitter({ kind: 'mote', area: [tiles(1), tiles(2), tiles(32), tiles(8)], heights: [2, 60], count: 30, color: '#FFE8D8', size: 1.5, intensity: 0.35 }, 31);
  return { camera: { x: tiles(17), y: tiles(5.8), h: 36 }, enemies: TIGHT, party: PARTY_PLACES, seaward: [tiles(17), tiles(9)] };
}

/** Build the set for a battle's stage. */
export function dressBattle(stage: string, r: WorldRenderer, st: Stage): BattleSet {
  switch (stage) {
    case 'scriptorium':
      return scriptorium(r, st);
    case 'cloister':
      return cloisterGarth(r, st);
    case 'cloisterDawn': {
      const set = cloisterGarth(r, st);
      dawnInterior(r, { outdoor: true });
      r.grade = { ...r.grade, focusBand: 60, focusRange: 220 };
      return set;
    }
    case 'nave':
      return naveSet(r, st);
    case 'lane':
    case 'lychgate':
    case 'green':
      return lychford(stage, r, st);
    case 'blanchwood':
    case 'gate':
      return blanchwoodSet(stage, r, st);
    case 'ossuary':
      return ossuarySet(r, st);
    case 'ivy':
    case 'fair':
    case 'inkwell':
      return marginSet(stage, r, st);
    default:
      return causeway(r, st);
  }
}
