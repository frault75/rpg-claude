/**
 * The satchel (DESIGN.md §6.2): small things carried for a bad moment, up to three of each.
 * Any ally can use one in battle instead of an ability, and it spends their action. A fight
 * lost or left gives back what was used in it, so a retried fight is the same puzzle.
 */

import type { LocalText } from '../i18n/i18n';

export type SatchelId = 'poultice' | 'gallInk' | 'waxSeal' | 'holyWater' | 'salVolatile';

export interface SatchelDef {
  id: SatchelId;
  name: LocalText;
  text: LocalText;
  /** A line of lore, for the pedlar's stall. */
  lore: LocalText;
  /** Who it is used on: a standing ally, a fallen one, an enemy, or nobody in particular. */
  target: 'ally' | 'fallen' | 'enemy' | 'none';
  /** In silver pennies, at the pedlar's stall. */
  price: number;
  /** Glyph colour in the menus. */
  color: string;
}

export const SATCHEL_MAX = 3;

export const SATCHEL: Record<SatchelId, SatchelDef> = {
  poultice: {
    id: 'poultice',
    name: { en: 'Poultice', fr: 'Cataplasme' },
    text: { en: 'An ally regains 8 HP.', fr: 'Un allié regagne 8 PV.' },
    lore: { en: 'Comfrey and honey in a linen square. It smells of somebody’s kitchen.', fr: 'Consoude et miel dans un carré de lin. Ça sent la cuisine de quelqu’un.' },
    target: 'ally',
    price: 8,
    color: '#B8C890',
  },
  gallInk: {
    id: 'gallInk',
    name: { en: 'Oak-gall ink', fr: 'Encre de galle' },
    text: { en: 'Isot regains 2 Ink.', fr: 'Isot regagne 2 Encre.' },
    lore: { en: 'Galls, vitriol and rainwater, stoppered in a horn. It goes on brown and dries black.', fr: 'Galles, vitriol et eau de pluie, bouchés dans une corne. Posée brune, elle sèche noire.' },
    target: 'none',
    price: 12,
    color: '#3A3040',
  },
  waxSeal: {
    id: 'waxSeal',
    name: { en: 'Wax seal', fr: 'Sceau de cire' },
    text: { en: 'An ally gains Ward 4.', fr: 'Un allié gagne Garde 4.' },
    lore: { en: 'Pressed with a bishop’s ring nobody remembers. What is sealed is kept.', fr: 'Pressé d’un anneau d’évêque dont nul ne se souvient. Ce qui est scellé est gardé.' },
    target: 'ally',
    price: 10,
    color: '#B83A2A',
  },
  holyWater: {
    id: 'holyWater',
    name: { en: 'Holy water', fr: 'Eau bénite' },
    text: { en: 'An enemy loses its Ward and its Shell.', fr: 'Un ennemi perd sa Garde et sa Coquille.' },
    lore: { en: 'From Saint Ebb’s font, before the font went dry.', fr: 'Des fonts de Saint-Ebb, avant qu’ils ne tarissent.' },
    target: 'enemy',
    price: 14,
    color: '#9CC8E8',
  },
  salVolatile: {
    id: 'salVolatile',
    name: { en: 'Sal volatile', fr: 'Sels' },
    text: { en: 'A fallen ally rises with 6 HP.', fr: 'Un allié tombé se relève avec 6 PV.' },
    lore: { en: 'Hartshorn in a twist of paper. One breath and the dead sit up and complain.', fr: 'Corne de cerf dans un cornet de papier. Une bouffée, et les morts se redressent pour se plaindre.' },
    target: 'fallen',
    price: 18,
    color: '#E8E0C8',
  },
};

export const SATCHEL_IDS = Object.keys(SATCHEL) as SatchelId[];

export type Satchel = Partial<Record<SatchelId, number>>;

/** Add to the satchel, three of a kind at most; returns how many were actually taken. */
export function pack(s: Satchel, id: SatchelId, n = 1): number {
  const have = s[id] ?? 0;
  const take = Math.max(0, Math.min(n, SATCHEL_MAX - have));
  if (take) s[id] = have + take;
  return take;
}
