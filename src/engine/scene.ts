import type { DebugInfo } from '../debug/overlay';

/** A screen of the game (title, map, battle, interlude). */
export interface Scene {
  readonly name: string;
  update(dt: number): void;
  /** Push sprite transforms into their meshes just before rendering. */
  sync(): void;
  debugInfo(): DebugInfo;
  debugButtons(): { label: string; run: () => void }[];
  dispose(): void;
}

/** Hermite smoothstep, handy for fades. */
export function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
