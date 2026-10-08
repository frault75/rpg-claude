/** Who can speak in dialogue: display name, portrait spec and voice pitch (Hz). */

import type { LocalText } from '../i18n/i18n';

export interface Speaker {
  name: LocalText;
  /** Key of CHARACTERS used for the portrait; none for narration-like voices. */
  portrait?: string;
  voice: number;
}

export const SPEAKERS: Readonly<Record<string, Speaker>> = {
  isot: { name: { en: 'Isot', fr: 'Isot' }, portrait: 'isot', voice: 560 },
  hild: { name: { en: 'Hild', fr: 'Hild' }, portrait: 'hild', voice: 360 },
  whit: { name: { en: 'Whit', fr: 'Whit' }, portrait: 'whit', voice: 190 },
  knight: { name: { en: 'The knight', fr: 'Le chevalier' }, portrait: 'whit', voice: 190 },
  aumery: { name: { en: 'Abbot Aumery', fr: 'L’abbé Aumery' }, portrait: 'aumery', voice: 230 },
  brother: { name: { en: 'Pumice Brother', fr: 'Frère de la Ponce' }, portrait: 'brother', voice: 260 },
  cuthwin: { name: { en: 'Brother Cuthwin', fr: 'Frère Cuthwin' }, portrait: 'scribe', voice: 300 },
  pilgrim: { name: { en: 'A pilgrim', fr: 'Un pèlerin' }, portrait: 'villager', voice: 280 },
  dunstan: { name: { en: 'Dunstan the sexton', fr: 'Dunstan le fossoyeur' }, portrait: 'dunstan', voice: 240 },
  amabel: { name: { en: 'Goodwife Amabel', fr: 'Dame Amabel' }, portrait: 'amabel', voice: 420 },
  hob: { name: { en: 'Hob', fr: 'Hob' }, portrait: 'villager', voice: 250 },
  child: { name: { en: 'A child', fr: 'Une enfant' }, portrait: 'child', voice: 640 },
  child2: { name: { en: 'A boy', fr: 'Un garçon' }, portrait: 'child2', voice: 600 },
  villager: { name: { en: 'A villager', fr: 'Une villageoise' }, portrait: 'goodwife', voice: 440 },
  george: { name: { en: 'Saint George', fr: 'Saint Georges' }, portrait: 'george', voice: 220 },
  slasher: { name: { en: 'Bold Slasher', fr: 'Le Hardi Tranchant' }, portrait: 'slasher', voice: 270 },
  doctor: { name: { en: 'Doctor Ball', fr: 'Docteur Ball' }, portrait: 'doctor', voice: 300 },
  presenter: { name: { en: 'The presenter', fr: 'Le présentateur' }, portrait: 'child2', voice: 620 },
  gaudry: { name: { en: 'Prior Gaudry', fr: 'Le prieur Gaudry' }, portrait: 'gaudry', voice: 210 },
  ermeline: { name: { en: 'Sister Ermeline', fr: 'Sœur Ermeline' }, portrait: 'ermeline', voice: 420 },
  dancer: { name: { en: 'The Child', fr: 'L’Enfant' }, portrait: 'childDancer', voice: 640 },
  wystan: { name: { en: 'Brother Wystan', fr: 'Frère Wystan' }, portrait: 'wystan', voice: 240 },
  abbotUnreason: { name: { en: 'The Abbot of Unreason', fr: 'L’Abbé de Déraison' }, portrait: 'abbotUnreason', voice: 330 },
  bishop: { name: { en: 'The Bishop-fish', fr: 'Le Poisson-évêque' }, voice: 280 },
  eadgyth: { name: { en: 'Eadgyth the Uncrowned', fr: 'Eadgyth la Sans-Couronne' }, portrait: 'eadgyth', voice: 380 },
};
