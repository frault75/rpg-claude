/** Who can speak in dialogue: display name, portrait spec and voice pitch (Hz). */

export interface Speaker {
  name: string;
  /** Key of CHARACTERS used for the portrait; none for narration-like voices. */
  portrait?: string;
  voice: number;
}

export const SPEAKERS: Readonly<Record<string, Speaker>> = {
  isot: { name: 'Isot', portrait: 'isot', voice: 560 },
  hild: { name: 'Hild', portrait: 'hild', voice: 360 },
  whit: { name: 'Whit', portrait: 'whit', voice: 190 },
  knight: { name: 'The knight', portrait: 'whit', voice: 190 },
  aumery: { name: 'Abbot Aumery', portrait: 'aumery', voice: 230 },
  brother: { name: 'Pumice Brother', portrait: 'brother', voice: 260 },
  cuthwin: { name: 'Brother Cuthwin', portrait: 'scribe', voice: 300 },
};
