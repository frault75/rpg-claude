/**
 * The Lost Names (DESIGN.md §3.13): ten names the Glossators hid in underwriting before
 * they could be scraped, two in each location. Each is a single line. In the ending Whit
 * reads the ones that were found, and the margin of the last page lists them in red.
 */

import type { LocalText } from '../i18n/i18n';
import type { GameState } from './state';

export const LOST_NAMES: Record<string, LocalText> = {
  osric: { en: 'Brother Osric, who sang a quarter-tone flat for forty years and was loved anyway.', fr: 'Frère Osric, qui chanta un quart de ton trop bas pendant quarante ans, et fut aimé quand même.' },
  joan: { en: 'Little Joan, who gave a name to every hen in Hollin.', fr: 'La petite Jeanne, qui donna un nom à chaque poule de Hollin.' },
  edda: { en: 'Edda Thatcher, who mended every roof in Lychford and was afraid of ladders.', fr: 'Edda Couvreuse, qui répara tous les toits de Lychford et avait peur des échelles.' },
  hamo: { en: 'Hamo the bellringer, who rang the passing bell for the last time on the night of the Mercy.', fr: 'Hamo le sonneur, qui sonna le glas pour la dernière fois la nuit de la Miséricorde.' },
  maud: { en: 'Maud of the mill, whose laugh sounded like a door that wants oil.', fr: 'Maud du moulin, dont le rire sonnait comme une porte qui réclame de l’huile.' },
  gervase: { en: 'Gervase, a pedlar of ribbons, who walked every road twice.', fr: 'Gervais, colporteur de rubans, qui parcourut chaque route deux fois.' },
  cutha: { en: 'Old Cutha, who kept bees and told them everything.', fr: 'Le vieux Cutha, qui gardait des abeilles et leur racontait tout.' },
  fishers: { en: 'Nell and Tom Fisher, married sixty years, who argued about the same boat for all of them.', fr: 'Nell et Tom Pêcheur, mariés soixante ans, qui se disputèrent la même barque tout ce temps.' },
  wat: { en: 'Wat the ferryman, who never once charged a widow.', fr: 'Wat le passeur, qui ne fit jamais payer une veuve.' },
  girl: { en: 'A girl of Lychford, born in the Grey Year, who was never written in time.', fr: 'Une fille de Lychford, née l’Année grise, qu’on n’écrivit jamais à temps.' },
};

/** A Lost Name as it reads now: the girl of the Grey Year, once Isot has named her, is Ebba. */
export function lostNameText(id: string, g: GameState): LocalText {
  if (id === 'girl' && g.flags.girlNamed) return { en: 'Ebba of Lychford, born in the Grey Year, written at last in a margin.', fr: 'Ebba de Lychford, née l’Année grise, écrite enfin dans une marge.' };
  return LOST_NAMES[id] ?? { en: id, fr: id };
}
