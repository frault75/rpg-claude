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
};
