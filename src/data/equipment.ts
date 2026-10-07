/**
 * Relics and charms. Each character wears one of each. They are found in the story and
 * its secrets, never bought or ground for, and none is simply better than another: each
 * bends one ability a different way, so equipping is choosing how to play.
 */

import type { LocalText } from '../i18n/i18n';
import type { CharId } from '../story/state';

export type Slot = 'relic' | 'charm';

export interface ItemDef {
  id: string;
  slot: Slot;
  /** Only this character can wear it (relics are personal; charms are not). */
  owner?: CharId;
  name: LocalText;
  text: LocalText;
  /** A line of lore. */
  lore: LocalText;
  /** Glyph colour in the menus. */
  color: string;
}

export const ITEMS: Record<string, ItemDef> = {
  wystansPumice: {
    id: 'wystansPumice',
    slot: 'charm',
    name: { en: 'Wystan’s Pumice', fr: 'La ponce de Wystan' },
    text: { en: 'Penknife deals +1 to a Glossed enemy.', fr: 'Le Canif inflige +1 à un ennemi glosé.' },
    lore: { en: 'Worn smooth on one side by a librarian’s thumb.', fr: 'Polie d’un côté par le pouce d’un bibliothécaire.' },
    color: '#C9C2B4',
  },
  lampBlack: {
    id: 'lampBlack',
    slot: 'relic',
    owner: 'isot',
    name: { en: 'Pot of Lamp-black', fr: 'Pot de noir de fumée' },
    text: { en: 'Ink holds 4 instead of 3, but each battle begins with 1.', fr: 'L’encre monte à 4 au lieu de 3, mais chaque combat commence à 1.' },
    lore: { en: 'Soot from the scriptorium lamps, ground with gum.', fr: 'La suie des lampes du scriptorium, broyée à la gomme.' },
    color: '#2A2830',
  },
  psalterChain: {
    id: 'psalterChain',
    slot: 'relic',
    owner: 'hild',
    name: { en: 'The Psalter Chain', fr: 'La chaîne du psautier' },
    text: { en: 'Shrive costs 2 HP instead of 3, and heals 5 instead of 6.', fr: 'Absoudre coûte 2 PV au lieu de 3, et soigne 5 au lieu de 6.' },
    lore: { en: 'Ten years it held her book to the wall. Now it holds the book to her.', fr: 'Dix ans elle a tenu son livre au mur. Elle tient maintenant le livre contre elle.' },
    color: '#8E96A4',
  },
  anchorStone: {
    id: 'anchorStone',
    slot: 'charm',
    name: { en: 'Anchorhold Stone', fr: 'Pierre de la recluserie' },
    text: { en: 'Begin each battle with Ward 2.', fr: 'Commence chaque combat avec Garde 2.' },
    lore: { en: 'A chip of the wall she broke down.', fr: 'Un éclat du mur qu’elle a abattu.' },
    color: '#A49C8E',
  },
  blankPennon: {
    id: 'blankPennon',
    slot: 'relic',
    owner: 'whit',
    name: { en: 'The Blank Pennon', fr: 'Le fanion blanc' },
    text: { en: 'Tally counts from 2 instead of 3.', fr: 'Le Décompte part de 2 au lieu de 3.' },
    lore: { en: 'It bears no device. He has never asked why.', fr: 'Il ne porte aucune devise. Il n’a jamais demandé pourquoi.' },
    color: '#F2EEE4',
  },
  bellClapper: {
    id: 'bellClapper',
    slot: 'relic',
    owner: 'whit',
    name: { en: 'Clapper of the Passing Bell', fr: 'Battant de la cloche des trépassés' },
    text: { en: 'A Reckoning deals 9 instead of 7, but Lance deals 3.', fr: 'Un Compte rendu inflige 9 au lieu de 7, mais la Lance inflige 3.' },
    lore: { en: 'Lychford’s bell rang for no one for ten years.', fr: 'La cloche de Lychford n’a sonné pour personne pendant dix ans.' },
    color: '#B08A3A',
  },
  ebbShell: {
    id: 'ebbShell',
    slot: 'charm',
    name: { en: 'Ebb Shell', fr: 'Coquille du jusant' },
    text: { en: 'The first blow taken in each battle deals 1 less.', fr: 'Le premier coup reçu dans chaque combat inflige 1 de moins.' },
    lore: { en: 'Picked up on the causeway, still wet.', fr: 'Ramassée sur la chaussée, encore mouillée.' },
    color: '#E8D8C8',
  },
  vermilionPot: {
    id: 'vermilionPot',
    slot: 'charm',
    name: { en: 'Pot of Vermilion', fr: 'Pot de vermillon' },
    text: { en: 'Once per battle, the wearer’s first ability is doubled.', fr: 'Une fois par combat, la première capacité du porteur est doublée.' },
    lore: { en: 'Red is read first.', fr: 'Le rouge se lit en premier.' },
    color: '#C63D2A',
  },
};

/** Can this character wear this item? */
export function canWear(who: CharId, item: ItemDef): boolean {
  return !item.owner || item.owner === who;
}
