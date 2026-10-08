/**
 * Returning a name (DESIGN.md §3.14): a Lost Name, once read, can be given back to the one
 * who lost it. They remember, grieve and are glad; the party is given a keepsake, and the
 * Book remembers them all a little more clearly (experience, once).
 */

import { levelFor, ranksBetween } from '../battle/growth';
import { session } from '../engine/session';
import type { LocalText } from '../i18n/i18n';
import type { MapContext } from '../maps/types';
import type { GameState } from './state';

export const RETURNS: Record<string, { xp: number; to: LocalText; keepsake: LocalText }> = {
  edda: {
    xp: 12,
    to: { en: 'to Ralf', fr: 'à Ralf' },
    keepsake: { en: 'A twist of Edda’s thatching straw, from Ralf.', fr: 'Une torsade de la paille d’Edda, de la part de Ralf.' },
  },
  hamo: {
    xp: 12,
    to: { en: 'to Dunstan', fr: 'à Dunstan' },
    keepsake: { en: 'A knot cut from Hamo’s bell-rope, from Dunstan.', fr: 'Un nœud coupé dans la corde de Hamo, de la part de Dunstan.' },
  },
  gervase: {
    xp: 15,
    to: { en: 'to himself', fr: 'à lui-même' },
    keepsake: { en: 'His last ribbon, and a quarter off for ever.', fr: 'Son dernier ruban, et un quart de moins pour toujours.' },
  },
};

export const isReturned = (g: GameState, id: string): boolean => !!g.flags[`returned.${id}`];

/** The name has been given back: the keepsake, and the experience it is worth, once. */
export async function returnName(c: MapContext, id: string): Promise<void> {
  const r = RETURNS[id];
  const g = session.game;
  if (!r || isReturned(g, id)) return;
  g.flags[`returned.${id}`] = true;
  const from = levelFor(g.xp);
  g.xp += r.xp;
  const to = levelFor(g.xp);
  c.card({ en: 'A name returned', fr: 'Un nom rendu' }, { en: `${r.keepsake.en} · +${r.xp} experience`, fr: `${r.keepsake.fr} · +${r.xp} expérience` });
  await c.wait(2.8);
  if (to > from) {
    const ranks = ranksBetween(from, to);
    const line: LocalText = {
      en: ['The Book remembers them a little more clearly.', ...ranks.map((k) => `${k.name.en}: ${k.text.en}`)].join(' · '),
      fr: ['Le Livre se souvient d’eux un peu plus nettement.', ...ranks.map((k) => `${k.name.fr} : ${k.text.fr}`)].join(' · '),
    };
    c.card({ en: `Level ${to}`, fr: `Niveau ${to}` }, line);
    await c.wait(2.8);
  }
}
