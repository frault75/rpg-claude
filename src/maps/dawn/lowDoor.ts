/**
 * The low door under the scriptorium's third window, which Isot always took for a cupboard:
 * the way down to the Undercroft (DESIGN.md §3.14). Gervase knows it; he has walked it.
 */

import { lowDoor } from '../../world3d/undercroft';
import { tiles } from '../../world3d/stage';
import type { MapContext } from '../types';
import type { Stage } from '../../world3d/stage';

export const LOW_DOOR_X = tiles(15.9);

/** Draw the door, open, on the scriptorium's back wall. */
export function drawLowDoor(st: Stage, wallY: number): void {
  st.addArt(lowDoor(), LOW_DOOR_X, wallY + 1, { h: 0, solid: false });
  st.addLight(LOW_DOOR_X, wallY + 4, 6, 26, '#8A9AC8', 0.25);
}

/** It opens while the party watches. */
export function openLowDoor(c: MapContext, wallY: number): void {
  drawLowDoor(c.stage, wallY);
  c.shake(2, 0.3);
}
