/**
 * Who an intent is aimed at, in a word or two, for the second line of its banderole: a
 * place, a name, or everyone. It is worked out from where the blow is really aimed, so an
 * Emended blow shows its new target.
 */

import type { LocalText } from '../i18n/i18n';
import type { Battle } from './engine';
import { type Intent, PLACE_NAMES } from './types';

const EVERYONE: LocalText = { en: 'Everyone', fr: 'Tous' };

export function aimOf(b: Battle, it: Intent): LocalText | null {
  const t = it.target;
  if ('self' in t) return null;
  if ('all' in t) return EVERYONE;
  if ('places' in t) {
    const names = t.places.map((p) => PLACE_NAMES[p]!);
    return { en: names.map((n) => n.en).join(', '), fr: names.map((n) => n.fr).join(', ') };
  }
  if ('place' in t) return PLACE_NAMES[t.place] ?? null;
  return b.unit(t.unit)?.name ?? null;
}
