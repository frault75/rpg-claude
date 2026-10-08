/**
 * Relics and charms. Each character wears one of each. They are found in the story and its
 * caches, or bought from Gervase the pedlar, never ground for; and none is simply better
 * than another: each bends one rule a different way, so equipping is choosing how to play.
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
  /** In silver pennies, if Gervase sells it (DESIGN.md §6.3). */
  price?: number;
}

export const ITEMS: Record<string, ItemDef> = {
  wystansPumice: {
    id: 'wystansPumice',
    slot: 'charm',
    name: { en: 'Wystan’s Pumice', fr: 'La ponce de Wystan' },
    text: { en: 'Penknife deals 1 more to a Glossed enemy.', fr: 'Le Canif inflige 1 de plus à un ennemi glosé.' },
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
    lore: { en: 'For ten years it held her psalter to the wall. Now she swings it.', fr: 'Dix ans, elle a tenu son psautier attaché au mur. Aujourd’hui, Hild la fait tournoyer.' },
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
    lore: { en: 'It bears no device. He has never asked why.', fr: 'Il ne porte aucune armoirie. Il n’a jamais demandé pourquoi.' },
    color: '#F2EEE4',
  },
  bellClapper: {
    id: 'bellClapper',
    slot: 'relic',
    owner: 'whit',
    name: { en: 'Clapper of the Passing Bell', fr: 'Battant de la cloche des trépassés' },
    text: { en: 'A Reckoning deals 9 instead of 7, but Lance deals 3.', fr: 'Le Règlement inflige 9 au lieu de 7, mais la Lance inflige 3.' },
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

  // Given by Gervase once his name is read back to him.
  gervasesRibbon: {
    id: 'gervasesRibbon',
    slot: 'charm',
    name: { en: 'Gervase’s Ribbon', fr: 'Le ruban de Gervais' },
    text: { en: 'The first time the wearer would fall in a battle, they stay at 1 HP.', fr: 'La première fois que le porteur devrait tomber dans un combat, il reste à 1 PV.' },
    lore: { en: 'Faded to the colour of the road. He kept the last one for whoever said his name.', fr: 'Passé à la couleur de la route. Il gardait le dernier pour qui dirait son nom.' },
    color: '#C89AB0',
  },
  // Left when the Heap in the Undercroft has said its word.
  adsumSlip: {
    id: 'adsumSlip',
    slot: 'charm',
    name: { en: 'Slip of the roll-call', fr: 'Billet de l’appel' },
    text: { en: 'The wearer can’t be Forgotten: they answer to their name.', fr: 'Le porteur ne peut être Oublié : il répond à son nom.' },
    lore: { en: 'A scrap from the bottom of the Heap, with one word on it in every hand at once: ADSUM.', fr: 'Un bout du fond du Tas, avec un seul mot dessus, de toutes les mains à la fois : ADSUM.' },
    color: '#E4DCC4',
  },
  // Found in a cache in the Blanchwood.
  mourningBrooch: {
    id: 'mourningBrooch',
    slot: 'charm',
    name: { en: 'Mourning brooch', fr: 'Broche de deuil' },
    text: { en: 'When another ally falls, the wearer gains Ward 3.', fr: 'Quand un autre allié tombe, le porteur gagne Garde 3.' },
    lore: { en: 'From before the dying stopped. No one remembers whose hair is behind the glass.', fr: 'D’avant que la mort ne cesse. Nul ne se souvient de qui sont les cheveux sous le verre.' },
    color: '#2A2228',
  },

  // Sold by Gervase: on Lychford Lane first, then at every stall after.
  haresFoot: {
    id: 'haresFoot',
    slot: 'charm',
    name: { en: 'Hare’s-foot brush', fr: 'Patte de lièvre' },
    text: { en: 'The free Step can be taken twice each round.', fr: 'On peut changer de place deux fois par tour, toujours gratuitement.' },
    lore: { en: 'Gilders sweep the loose gold away with one. This one still wants to run.', fr: 'Les doreurs s’en servent pour chasser l’or en trop. Celle-ci veut encore courir.' },
    color: '#B89A70',
    price: 30,
  },
  gallRosary: {
    id: 'gallRosary',
    slot: 'charm',
    name: { en: 'Rosary of oak-galls', fr: 'Chapelet de galles' },
    text: { en: 'Every heal on the wearer mends 2 more.', fr: 'Les soins que reçoit le porteur sont augmentés de 2.' },
    lore: { en: 'Strung by a nun who made ink, and prayed while it steeped.', fr: 'Enfilé par une nonne qui faisait l’encre, et priait pendant qu’elle infusait.' },
    color: '#6A5038',
    price: 26,
  },
  coronel: {
    id: 'coronel',
    slot: 'relic',
    owner: 'whit',
    name: { en: 'Coronel', fr: 'Couronnel' },
    text: { en: 'Lance reaches the 3rd enemy too, but deals 1 less.', fr: 'La Lance atteint aussi le 3e ennemi, mais inflige 1 de moins.' },
    lore: { en: 'The crowned tip of a jousting lance, made to unhorse and not to kill.', fr: 'La pointe couronnée d’une lance de joute, faite pour désarçonner et non pour tuer.' },
    color: '#C8C0A8',
    price: 32,
  },
  // From the Wood’s Edge.
  silverpoint: {
    id: 'silverpoint',
    slot: 'relic',
    owner: 'isot',
    name: { en: 'Silverpoint', fr: 'Pointe d’argent' },
    text: { en: 'A Gloss adds 4 to the next blow instead of 3, but Penknife deals 1 less.', fr: 'Une Glose ajoute 4 au prochain coup au lieu de 3, mais le Canif inflige 1 de moins.' },
    lore: { en: 'It leaves a grey line that cannot be scraped, only written over.', fr: 'Elle laisse un trait gris qu’on ne peut gratter, seulement recouvrir.' },
    color: '#D8DCE4',
    price: 38,
  },
  lepersClapper: {
    id: 'lepersClapper',
    slot: 'relic',
    owner: 'hild',
    name: { en: 'Leper’s clapper', fr: 'Cliquette de lépreux' },
    text: { en: 'Immure costs no HP, but walls in only enemies.', fr: 'Emmurer ne coûte pas de PV, mais n’emmure que les ennemis.' },
    lore: { en: 'Three boards on a cord, to warn the road that someone was coming. People still step aside at the sound.', fr: 'Trois planchettes sur une cordelette, pour prévenir la route que quelqu’un venait. On s’écarte encore à ce bruit.' },
    color: '#9A8058',
    price: 34,
  },
  ebbGirdle: {
    id: 'ebbGirdle',
    slot: 'charm',
    name: { en: 'Saint Ebb’s girdle', fr: 'Ceinture de sainte Ebba' },
    text: { en: 'In the Rear, the wearer takes 1 less from every blow.', fr: 'À l’Arrière, le porteur subit 1 de moins de chaque coup.' },
    lore: { en: 'A knotted cord: one knot for every tide she counted from her rock.', fr: 'Une cordelette nouée : un nœud par marée qu’elle compta depuis son rocher.' },
    color: '#A8B8C0',
    price: 36,
  },
  // From the Drollery Fair.
  hornInkwell: {
    id: 'hornInkwell',
    slot: 'relic',
    owner: 'isot',
    name: { en: 'Horn inkwell', fr: 'Cornet à encre' },
    text: { en: 'Ink holds only 2, but refills by 2 each round.', fr: 'L’encre ne monte qu’à 2, mais se remplit de 2 à chaque tour.' },
    lore: { en: 'A cow’s horn cut short and hung from a belt. A scribe on the road writes small, and often.', fr: 'Une corne de vache coupée court, pendue à la ceinture. Un scribe en route écrit petit, et souvent.' },
    color: '#8A6A40',
    price: 44,
  },
  plumbLine: {
    id: 'plumbLine',
    slot: 'relic',
    owner: 'hild',
    name: { en: 'Mason’s plumb-line', fr: 'Fil à plomb' },
    text: { en: 'Shove deals 2 more, but pushes the enemy back only one place.', fr: 'Bousculer inflige 2 de plus, mais ne repousse l’ennemi que d’une place.' },
    lore: { en: 'The mason’s, from the day he walled her in. It hangs true. She has made her peace with that.', fr: 'Celui du maçon, le jour où il l’a emmurée. Il pend droit. Elle s’y est faite.' },
    color: '#7A7A80',
    price: 40,
  },
  scallop: {
    id: 'scallop',
    slot: 'relic',
    owner: 'whit',
    name: { en: 'Pilgrim’s scallop', fr: 'Coquille de pèlerin' },
    text: { en: 'Vigil strikes for 6 instead of 4, but only from the Front.', fr: 'La Veille frappe pour 6 au lieu de 4, mais seulement depuis l’Avant.' },
    lore: { en: 'Every pilgrim to the sea carries one home. He has never been home.', fr: 'Chaque pèlerin de la mer en rapporte une chez lui. Il n’est jamais rentré chez lui.' },
    color: '#E8D0B0',
    price: 42,
  },
};

/** Can this character wear this item? */
export function canWear(who: CharId, item: ItemDef): boolean {
  return !item.owner || item.owner === who;
}
