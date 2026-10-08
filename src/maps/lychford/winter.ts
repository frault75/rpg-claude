/**
 * The light and air of Lychford at Midwinter (DESIGN.md §7.2): a low warm sun with long
 * blue shadows over the snow by day; lanterns round the green by night.
 */

import type { WorldRenderer } from '../../engine/diorama/renderer';
import { GROUND_DEFAULT, type GroundPalette } from '../../pixel/terrain';
import type { SkyDef } from '../../world3d/sky';

export const SNOW_GROUND: GroundPalette = { ...GROUND_DEFAULT, snow: '#DCE2EC', dirt: '#B0A494', grass: '#6A7A5A', stone: '#9A948A', sand: '#C8BCA0', rock: '#8C8A90', cliffTop: '#E4EAF2', cliffCover: 1 };

export const WINTER_SKY: SkyDef = { top: '#7A9AC8', horizon: '#F0D8C0', moon: null, stars: 0, clouds: 0.9, cloudColor: '#E8E4EC' };
export const WINTER_NIGHT_SKY: SkyDef = { top: '#050818', horizon: '#26345E', moon: [120, 120], moonR: 9, moonColor: '#FFF4D6', stars: 1, clouds: 0.5, cloudColor: '#3A4A78' };

export function winterDay(r: WorldRenderer): void {
  r.atmosphere = {
    sky: [0.62, 0.72, 0.95],
    ground: [0.55, 0.52, 0.5],
    ambient: 0.62,
    key: [1, 0.84, 0.64],
    keyLevel: 1.05,
    keyDir: [0.72, -0.5, -0.36],
    fogColor: [0.86, 0.88, 0.94],
    fogDist: [180, 720],
    fogMax: 0.45,
    mist: [10, 0.35, 0.007],
    mistDrift: [0.03, 0.01],
    background: [0.82, 0.86, 0.94],
  };
  r.grade = {
    exposure: 0.9,
    contrast: 1.1,
    saturation: 1.1,
    lift: [0.02, 0.025, 0.05],
    gain: [1.03, 1, 0.97],
    vignette: 0.8,
    grain: 0.018,
    bloom: 0.7,
    bloomThreshold: 0.86,
    dof: 0.9,
    focusBand: 110,
    focusRange: 320,
  };
}

export function winterNight(r: WorldRenderer): void {
  r.atmosphere = {
    sky: [0.3, 0.36, 0.62],
    ground: [0.14, 0.14, 0.2],
    ambient: 0.52,
    key: [0.62, 0.72, 1],
    keyLevel: 0.55,
    keyDir: [0.4, -0.84, -0.3],
    fogColor: [0.12, 0.15, 0.26],
    fogDist: [150, 640],
    fogMax: 0.45,
    mist: [8, 0.4, 0.008],
    mistDrift: [0.03, 0.01],
    background: [0.03, 0.04, 0.09],
  };
  r.grade = {
    exposure: 0.98,
    contrast: 1.08,
    saturation: 1.05,
    lift: [0.01, 0.015, 0.045],
    gain: [0.98, 1, 1.04],
    vignette: 1,
    grain: 0.02,
    bloom: 0.95,
    bloomThreshold: 0.72,
    dof: 0.9,
    focusBand: 100,
    focusRange: 300,
  };
}

/** Snow falling, lightly. */
export function snowfall(st: import('../../world3d/stage').Stage, w: number, h: number, count = 70): void {
  st.addEmitter({ kind: 'snow', area: [0, 0, w, h], heights: [0, 120], count, color: '#F4F8FF', size: 1.6, intensity: 0.65 }, 17);
}
