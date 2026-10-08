/**
 * The light and air of the Margin (DESIGN.md §7.4): saturated and glowing, gold underfoot,
 * and over everything, like a sky, the written page of Hollin the party stepped off.
 */

import type { WorldRenderer } from '../../engine/diorama/renderer';
import { hash2 } from '../../engine/noise';
import { GROUND_DEFAULT, type GroundPalette } from '../../pixel/terrain';
import { acanthus, pageSky } from '../../world3d/margin';
import type { SkyDef } from '../../world3d/sky';
import type { Stage } from '../../world3d/stage';

// Where the gold stands up, its edge shows the raised gesso it is laid on.
export const MARGIN_GROUND: GroundPalette = { ...GROUND_DEFAULT, gold: '#B48E30', grass: '#4CAA6C', dirt: '#85661E', vellum: '#D8CEB6', rock: '#E2D6BA', cliffTop: '#C9A23C' };
export const MARGIN_SKY: SkyDef = { top: '#E8DCC0', horizon: '#F4ECD8', moon: null, stars: 0, clouds: 0.2, cloudColor: '#FFF8E8' };

export function marginLight(r: WorldRenderer, dim = 0): void {
  r.atmosphere = {
    sky: [0.95, 0.88, 0.7],
    ground: [0.6, 0.5, 0.3],
    ambient: 0.6 - dim * 0.3,
    key: [1, 0.92, 0.76],
    keyLevel: 0.78 - dim * 0.4,
    keyDir: [0.55, -0.66, -0.5],
    fogColor: [0.96, 0.9, 0.76],
    fogDist: [200, 760],
    fogMax: 0.35,
    mist: [10, 0.3, 0.006],
    mistDrift: [0.02, 0.01],
    background: [0.94, 0.88, 0.74],
  };
  r.grade = {
    exposure: 0.8 - dim * 0.1,
    contrast: 1.1,
    saturation: 1.12,
    lift: [0.02, 0.015, 0],
    gain: [1.04, 1, 0.92],
    vignette: 0.9,
    grain: 0.02,
    bloom: 0.7,
    bloomThreshold: 0.9,
    dof: 0.9,
    focusBand: 110,
    focusRange: 320,
  };
}

/** The page of Hollin hanging over the Margin, far behind and high up. */
export function pageAbove(st: Stage, w: number): void {
  for (let x = -260; x < w + 260; x += 520) {
    const b = st.addImage(pageSky(520, 150, Math.floor(x)), x + 260, -40, { h: 70, shadow: false });
    b.glow = 0;
  }
}

/** A thicket of acanthus scrolls along a line, in mixed pigments. */
export function acanthusRow(st: Stage, x0: number, x1: number, y: number, seed: number, step = 70, size = 1): void {
  const pigments = ['malachite', 'vermilion', 'lapis'] as const;
  for (let x = x0, i = 0; x < x1; x += step, i++) st.addImage(acanthus(seed + i, pigments[(seed + i) % 3]!, size * (0.85 + hash2(i, 1, seed) * 0.3)), x + hash2(i, 2, seed) * 12, y + hash2(i, 3, seed) * 10, { flip: i % 2 === 1 });
}
