/**
 * Screen geometry. The game is drawn in a 16:9 area of 1280 x 720 logical units,
 * letterboxed inside the window. Logical coordinates have y pointing down.
 */

export const VIEW_W = 1280;
export const VIEW_H = 720;

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The letterboxed game area inside a window, in window pixels. */
export function fitView(winW: number, winH: number): Box {
  const s = Math.min(winW / VIEW_W, winH / VIEW_H);
  const w = Math.round(VIEW_W * s);
  const h = Math.round(VIEW_H * s);
  return { x: Math.floor((winW - w) / 2), y: Math.floor((winH - h) / 2), w, h };
}

/** Convert a window pixel to logical units, or null outside the game area. */
export function windowToView(px: number, py: number, box: Box): { x: number; y: number } | null {
  const x = ((px - box.x) / box.w) * VIEW_W;
  const y = ((py - box.y) / box.h) * VIEW_H;
  if (x < 0 || y < 0 || x > VIEW_W || y > VIEW_H) return null;
  return { x, y };
}
