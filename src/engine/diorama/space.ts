/**
 * Diorama space. Maps are authored in art pixels as seen on screen (x right, y down
 * the screen, h up from the ground), the way pixel artists draw them. The world is
 * real 3D, stretched so that an orthographic camera at the base pitch shows every
 * texel square: depth is scaled by 1 / sin(pitch) and height by 1 / cos(pitch).
 * Three's axes: x east, y up, z south (towards the viewer).
 */

/** Camera pitch below the horizon, in radians. */
export const PITCH = (40 * Math.PI) / 180;
/** World units per art pixel of depth (screen y on the ground). */
export const SZ = 1 / Math.sin(PITCH);
/** World units per art pixel of height. */
export const SY = 1 / Math.cos(PITCH);

/** Logical screen units per art pixel (the view shows 1280 / 3 art pixels across). */
export const PX = 3;

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

/** World position of a map point: (x, y) in art pixels on the ground, h pixels up. */
export function world(x: number, y: number, h = 0): [number, number, number] {
  return [x, h * SY, y * SZ];
}

/** Map position (art pixels) of a world point on the ground. */
export function mapOf(wx: number, wz: number): [number, number] {
  return [wx, wz / SZ];
}
