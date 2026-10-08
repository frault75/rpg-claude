/**
 * The interludes (DESIGN.md §3.4–§3.7, §10.5): between chapters, a full illuminated page of
 * Isot's chronicle, in her voice and the past tense. Each has a red title, a historiated
 * initial with a small scene in it, a few lines of her prose and a vine border, and ends
 * with a page turn into the next chapter's card.
 */

import type { LocalText } from '../i18n/i18n';

/** What is painted inside the initial. */
export type InitialScene = 'causeway' | 'bell' | 'wood' | 'inkhorn' | 'figures';

export interface Interlude {
  title: LocalText;
  scene: InitialScene;
  /** A drollery that has wandered into the foot of the page (an enemy's art). */
  drollery?: string;
  /** Paragraphs; the first letter of the first one is the initial. Red ones are rubrics. */
  prose: (LocalText & { red?: boolean })[];
  /** The last page of all: the Lost Names follow in red, then FINIS, and a major chord. */
  finale?: boolean;
  /** The chapter that begins after the page turns, and where. */
  chapter: { n: number; title: LocalText; name: LocalText };
  next: { map: string; spawn: string };
}

export const INTERLUDES: Record<number, Interlude> = {
  1: {
    title: { en: 'Interlude I. Of the Village Without Graves.', fr: 'Interlude I. Du village sans tombes.' },
    scene: 'causeway',
    drollery: 'greatSnail',
    prose: [
      { en: 'We crossed with the tide at our heels: a scribe, an anchoress who had not walked in ten years, and a knight who did not know his name.', fr: 'Nous avons traversé la marée aux talons : une scribe, une recluse qui n’avait pas marché depuis dix ans, et un chevalier qui ne connaissait pas son nom.' },
      { en: 'I wrote WHIT on his wrist so that he would not fade, and he thanked me for it every hour until I asked him to stop, and then he thanked me for that.', fr: 'J’ai écrit WHIT sur son poignet pour qu’il ne s’efface pas, et il m’en a remerciée toutes les heures jusqu’à ce que je lui demande d’arrêter, et alors il m’a remerciée pour ça.' },
      { en: 'I did not tell them what I had done. I am telling it now.', fr: 'Je ne leur ai pas dit ce que j’avais fait. Je le dis maintenant.' },
    ],
    chapter: { n: 2, title: { en: 'Chapter II', fr: 'Chapitre II' }, name: { en: 'The Village Without Graves', fr: 'Le village sans tombes' } },
    next: { map: 'lane', spawn: 'start' },
  },
  2: {
    title: { en: 'Interlude II. Of the Blanchwood.', fr: 'Interlude II. Du Bois-Blanc.' },
    scene: 'bell',
    drollery: 'hare',
    prose: [
      { en: 'In Lychford the roses on the lych-gate had bloomed for ten winters, and the sexton had polished his spade until it shone like a mirror.', fr: 'À Lychford, les roses du porche avaient fleuri dix hivers, et le fossoyeur avait poli sa bêche jusqu’à ce qu’elle brille comme un miroir.' },
      { en: 'When the passing bell spoke, the whole village came out into the snow, and nobody said a word until it stopped.', fr: 'Quand le glas a parlé, le village entier est sorti dans la neige, et personne n’a dit un mot avant qu’il se taise.' },
    ],
    chapter: { n: 3, title: { en: 'Chapter III', fr: 'Chapitre III' }, name: { en: 'The Blanchwood', fr: 'Le Bois-Blanc' } },
    next: { map: 'wood', spawn: 'start' },
  },
  3: {
    title: { en: 'Interlude III. Of the Margin.', fr: 'Interlude III. De la Marge.' },
    scene: 'wood',
    drollery: 'gryllus',
    prose: [
      { en: 'Every book I ever copied ended with the same word. I wrote it ten thousand times and never once looked at it.', fr: 'Chaque livre que j’ai copié finissait par le même mot. Je l’ai écrit dix mille fois sans jamais le regarder.' },
      { en: 'He had been walking beside us for four days, and he had said thank you for every one of them.', fr: 'Il marchait à nos côtés depuis quatre jours, et il avait dit merci pour chacun d’eux.' },
    ],
    chapter: { n: 4, title: { en: 'Chapter IV', fr: 'Chapitre IV' }, name: { en: 'The Margin', fr: 'La Marge' } },
    next: { map: 'edge', spawn: 'start' },
  },
  4: {
    title: { en: 'Interlude IV. Of the Writing.', fr: 'Interlude IV. De l’Écriture.' },
    scene: 'inkhorn',
    drollery: 'caladrius',
    prose: [
      { en: 'In the Margin, a whole city forgotten for a hundred and fifty years asked us for one thing: an ending.', fr: 'Dans la Marge, toute une ville oubliée depuis cent cinquante ans nous a demandé une seule chose : une fin.' },
      { en: 'I had scraped a man out of the world and called it kindness; now I carried his ending in my inkhorn, and the Abbey was waking up.', fr: 'J’avais gratté un homme hors du monde en appelant cela de la bonté ; à présent je portais sa fin dans ma corne d’encre, et l’Abbaye s’éveillait.' },
    ],
    chapter: { n: 5, title: { en: 'Chapter V', fr: 'Chapitre V' }, name: { en: 'The Writing', fr: 'L’Écriture' } },
    next: { map: 'dawnScriptorium', spawn: 'psalter' },
  },
};

/** The epilogue: the last page of Isot's chronicle, read at the end and again from the title. */
INTERLUDES[5] = {
  title: { en: 'Epilogue. Explicit.', fr: 'Épilogue. Explicit.' },
  scene: 'figures',
  finale: true,
  prose: [
    { en: 'Here ends the Book of the Mercy.', fr: 'Ici finit le Livre de la Miséricorde.' },
    { en: 'I keep the Book of Names now. I write every name in a plain hand, and I leave room at the end of each line.', fr: 'Je tiens le Livre des Noms, à présent. J’écris chaque nom d’une écriture sans ornement, et je laisse de la place au bout de chaque ligne.' },
    { en: 'My brothers ask why I have drawn three small figures in the margin of this last page: a scribe, an anchoress, and a knight with a white shield. I tell them the margin is where we keep what matters and does not fit.', fr: 'Mes frères demandent pourquoi j’ai dessiné trois petites figures dans la marge de cette dernière page : une scribe, une recluse, et un chevalier au bouclier blanc. Je leur dis que la marge est l’endroit où l’on garde ce qui compte et ne tient pas ailleurs.' },
    { en: 'Some evenings, when the tide is out, a man in white walks the causeway, from bedside to bedside. He waves. I wave back. He is in no hurry for mine, and I have asked him to read it slowly.', fr: 'Certains soirs, à marée basse, un homme en blanc passe sur la chaussée, de chevet en chevet. Il me fait signe. Je lui réponds. Le mien, il ne se presse pas d’y venir, et je lui ai demandé de le lire lentement.' },
  ],
  chapter: { n: 6, title: { en: 'Palimpsest', fr: 'Palimpsest' }, name: { en: 'Thank you for reading it to the end.', fr: 'Merci de l’avoir lu jusqu’au bout.' } },
  next: { map: 'title', spawn: 'start' },
};

/** Split a paragraph's first letter off for the initial (keeping accents and the like). */
export function splitInitial(text: string): [string, string] {
  const first = [...text][0] ?? '';
  return [first, text.slice(first.length)];
}
