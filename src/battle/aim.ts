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

/**
 * The second line of a banderole, in plain words: "→ Isot (Rear)", "→ Whit", "→ the whole
 * party". A blow aimed at a place names whoever stands there now, so a Step shows at once
 * who will take it instead (even from an enemy still too far back to strike: the note says so).
 */
export function aimLine(b: Battle, it: Intent): LocalText | null {
  const t = it.target;
  if ('self' in t) return null;
  if ('all' in t) return { en: '→ the whole party', fr: '→ tout le groupe' };
  if ('unit' in t) {
    const u = b.unit(t.unit);
    return u ? { en: `→ ${u.name.en}`, fr: `→ ${u.name.fr}` } : null;
  }
  const hit = b.aimedAt(it);
  if (hit.length === 1) {
    const u = hit[0]!;
    const at = PLACE_NAMES[u.place]!;
    return { en: `→ ${u.name.en} (${at.en})`, fr: `→ ${u.name.fr} (${at.fr})` };
  }
  if (hit.length > 1) return { en: `→ ${hit.map((u) => u.name.en).join(', ')}`, fr: `→ ${hit.map((u) => u.name.fr).join(', ')}` };
  // Nobody it can reach: name the place, as the rule does.
  const at = aimOf(b, it);
  return at ? { en: `→ ${at.en}`, fr: `→ ${at.fr}` } : null;
}
