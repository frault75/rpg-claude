/**
 * Gervase's stall (DESIGN.md §6.3). He walks every road twice and sets his pack down in
 * four places; each stall carries what the ones before it did, and something new. What
 * the party already owns is not offered again. Once his name has been read back to him he
 * asks a quarter less.
 */

import { pack, SATCHEL, SATCHEL_MAX, type SatchelId } from '../battle/satchel';
import type { GameState } from '../story/state';
import { ITEMS } from './equipment';

export interface StallDef {
  id: string;
  /** What is new on the stall here. */
  satchel: SatchelId[];
  items: string[];
}

export const STALLS: readonly StallDef[] = [
  { id: 'lane', satchel: ['poultice', 'waxSeal', 'gallInk'], items: ['haresFoot', 'gallRosary', 'coronel'] },
  { id: 'woodsEdge', satchel: ['holyWater'], items: ['silverpoint', 'lepersClapper', 'ebbGirdle'] },
  { id: 'fair', satchel: ['salVolatile'], items: ['hornInkwell', 'plumbLine', 'scallop'] },
  // The last stall, at the mouth of the Undercroft: nothing new, everything still unsold.
  { id: 'undercroft', satchel: [], items: [] },
];

/** What he offers at this stall: everything from the stalls so far that the party lacks. */
export function stock(stall: string, g: GameState): { satchel: SatchelId[]; items: string[] } {
  const i = STALLS.findIndex((s) => s.id === stall);
  const upto = STALLS.slice(0, i < 0 ? STALLS.length : i + 1);
  return {
    satchel: upto.flatMap((s) => s.satchel),
    items: upto.flatMap((s) => s.items).filter((id) => !g.inventory.includes(id)),
  };
}

export function priceFor(base: number, g: GameState): number {
  return g.flags.gervaseNamed ? Math.ceil(base * 0.75) : base;
}

export type Sale = 'sold' | 'poor' | 'full' | 'owned';

export function buySatchel(g: GameState, id: SatchelId): Sale {
  const price = priceFor(SATCHEL[id].price, g);
  if ((g.satchel[id] ?? 0) >= SATCHEL_MAX) return 'full';
  if (g.pennies < price) return 'poor';
  pack(g.satchel as Partial<Record<SatchelId, number>>, id);
  g.pennies -= price;
  return 'sold';
}

export function buyItem(g: GameState, id: string): Sale {
  const it = ITEMS[id];
  if (!it?.price) return 'owned';
  if (g.inventory.includes(id)) return 'owned';
  const price = priceFor(it.price, g);
  if (g.pennies < price) return 'poor';
  g.inventory.push(id);
  g.pennies -= price;
  return 'sold';
}
