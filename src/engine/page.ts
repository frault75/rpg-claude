/**
 * Page geometry. The game is a 16:9 manuscript page; the text block (inside the ruled
 * margins) holds the map or the battle, and the margin around it holds the border.
 * All page coordinates are logical units with y pointing down from the top-left.
 */

export const PAGE_W = 1280;
export const PAGE_H = 720;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The ruled text block. The bottom margin is deepest, for the bas-de-page drolleries. */
export const TEXT_BLOCK: Rect = { x: 54, y: 40, w: 1172, h: 610 };

/** Scale and offset that fit the page inside a window, letterboxed. */
export function fitPage(winW: number, winH: number): { scale: number; x: number; y: number; w: number; h: number } {
  const scale = Math.min(winW / PAGE_W, winH / PAGE_H);
  const w = Math.round(PAGE_W * scale);
  const h = Math.round(PAGE_H * scale);
  return { scale, x: Math.floor((winW - w) / 2), y: Math.floor((winH - h) / 2), w, h };
}

/** Convert a window pixel position to page coordinates, or null if outside the page. */
export function windowToPage(
  px: number,
  py: number,
  winW: number,
  winH: number,
): { x: number; y: number } | null {
  const f = fitPage(winW, winH);
  const x = (px - f.x) / f.scale;
  const y = (py - f.y) / f.scale;
  if (x < 0 || y < 0 || x > PAGE_W || y > PAGE_H) return null;
  return { x, y };
}
