/**
 * Chapter IV, scenes 7 to 9: the Ink-Well (DESIGN.md §3.7; B4). At the bottom of the Margin
 * lies a pool of every name ever scraped. Ermeline, who followed them off the page, is
 * scraping at the bright word at its bottom; the ink rises, swallows her, and opens a
 * hundred eyes made of letters (B4). Afterwards one bright word lies in the drained well,
 * Isot fills her inkhorn with it, pulls Ermeline out and writes her name on her wrist.
 * The hook: nine tolls at dawn, then nothing. Out through the margin of Wystan's psalter,
 * and Interlude IV.
 */

import { bell, midiToHz } from '../../audio/instruments';
import { MarginAmbience } from '../../audio/margin';
import { session } from '../../engine/session';
import { CHARACTERS } from '../../pixel/characters';
import { textImage } from '../../pixel/font';
import { hex } from '../../pixel/pixel';
import type { Billboard } from '../../world3d/billboard';
import { goldBar } from '../../world3d/margin';
import { relief } from '../../world3d/relief';
import { tiles } from '../../world3d/stage';
import type { MapContext, MapDef } from '../types';
import { acanthusRow, MARGIN_GROUND, MARGIN_SKY, marginLight, pageAbove } from './common';

const W = 24;
const H = 14;
const WELL: [number, number] = [tiles(12), tiles(7)];
/** A round pool of ink with a rim of gold. */
const GROUND = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (Math.hypot((x + 0.5 - 12) / 1.4, y + 0.5 - 7.2) < 3.6 ? '~' : 'o')).join(''));
const INK = { deep: '#08060E', mid: '#120E1E', shallow: '#221C34', ripple: '#3A3050', foam: '#5A4E70', glint: '#E8D8A8' };

let word: Billboard | null = null;

// The gold banks up behind the Ink-Well, so the well lies in a hollow at its foot.
const HEIGHTS = relief(W, H, [
  { at: [0, 0, W, 3], h: 2, ragged: 's' },
  { at: [0, 0, W, 1], h: 3 },
], 83);

export const INKWELL: MapDef = {
  id: 'inkwell',
  card: { title: { en: 'The Margin', fr: 'La Marge' }, line: { en: 'The Ink-Well', fr: 'Le Puits d’encre' } },
  walkable: 'o',
  ground: GROUND,
  heights: HEIGHTS,
  bounds: { minX: tiles(W / 2), maxX: tiles(W / 2), minY: tiles(6.6), maxY: tiles(7.4) },
  camera: { h: 4 },
  ambience: () => new MarginAmbience({ until: () => !!session.game.cleared.includes('b4') }),
  checkpoint: true,
  candle: true,
  spawns: { top: { x: tiles(3), y: tiles(10.6), dir: 'right' } },
  build(r, st) {
    marginLight(r, 0.6);
    st.ground({ ground: GROUND, heights: HEIGHTS, seed: 83, palette: MARGIN_GROUND }, INK);
    st.addSky({ ...MARGIN_SKY, top: '#8A7A58', horizon: '#C8B890' }, 220);
    pageAbove(st, tiles(W));
    acanthusRow(st, 0, tiles(W), tiles(2.4), 51, 76, 1.1);
    for (let x = 0; x < tiles(W); x += 90) st.addImage(goldBar(86, 14, x), x + 43, tiles(1.2));
    // The bright word at the bottom of the well: too bright to read.
    const img = textImage(['~~~~'], hex('#FFF4C8'), 1);
    word = st.addImage(img, WELL[0], WELL[1], { h: 1, shadow: false, glow: img });
    st.addLight(WELL[0], WELL[1], 6, 90, '#FFE8A0', 0.7);
    return { blocked: [] };
  },
  npcs: [{ id: 'ermeline', speaker: 'ermeline', spec: CHARACTERS.ermeline!, x: WELL[0] + 40, y: WELL[1] - 20, dir: 'left', when: (c) => !c.cleared('b4') || c.flag('ermelineOut') }],
  zones: [
    {
      id: 'well',
      rect: [tiles(5), 0, tiles(1.5), tiles(H)],
      when: (c) => !c.cleared('b4'),
      run: async (c) => {
        c.letterbox(true);
        await c.say('ermeline', { en: '…Agnes, Cole, Wenna, Osgar, Tib… the first one. If I scrape the first one, all of them go quiet. All of them.', fr: '…Agnès, Cole, Wenna, Osgar, Tib… le premier. Si je gratte le premier, tous se taisent. Tous.' });
        await c.say('isot', { en: 'Ermeline, stop! That’s every name the Abbey ever took!', fr: 'Ermeline, arrête ! Ce sont tous les noms que l’Abbaye a jamais pris !' }, 'alarmed');
        c.shake(5, 1.4);
        await c.narrate({ en: 'Her blade bites the bright word. The ink rises in a column, swallows her, and opens a hundred eyes made of letters.', fr: 'Sa lame mord le mot brillant. L’encre se dresse en colonne, l’engloutit, et ouvre cent yeux faits de lettres.' });
        c.npc('ermeline').visible = false;
        c.battle('b4');
      },
    },
  ],
  async enter(c, from) {
    if (from === 'top' && !c.flag('inkwellSeen')) {
      c.set('inkwellSeen');
      c.letterbox(true);
      await c.narrate({ en: 'The bar buckles and drops them, gently, on the gold rim of a well. The well is full of ink, and the ink is full of names.', fr: 'La barre ploie et les dépose, doucement, sur le rebord d’or d’un puits. Le puits est plein d’encre, et l’encre pleine de noms.' });
      c.letterbox(false);
    }
    if (from === 'battle:b4' && !c.flag('ermelineOut')) await afterTheBlot(c);
  },
};

/** After the Blot: the bright word, Ermeline pulled out, her name on her wrist; the hook. */
async function afterTheBlot(c: MapContext): Promise<void> {
  c.letterbox(true);
  await c.wait(0.6);
  await c.narrate({ en: 'The ink drains away. One bright word lies in the empty well. Isot kneels and fills her inkhorn with it, and it is heavier than ink should be.', fr: 'L’encre s’écoule. Un mot brillant repose dans le puits vide. Isot s’agenouille et en remplit sa corne d’encre, et c’est plus lourd que de l’encre ne devrait l’être.' });
  if (word) word.visible = false;
  c.set('inkhornFilled');
  const e = c.npc('ermeline');
  e.visible = true;
  e.x = WELL[0] + 6;
  e.y = WELL[1] + 4;
  e.sprite.fray = 0.35;
  c.set('ermelineOut');
  await c.narrate({ en: 'Isot pulls Ermeline out of the dregs by the wrist, and writes on it, small and plain, the way she once wrote WHIT: ERMELINE.', fr: 'Isot tire Ermeline de la lie par le poignet, et écrit dessus, petit et simple, comme elle avait autrefois écrit WHIT : ERMELINE.' });
  for (let k = 10; k >= 0; k--) {
    e.sprite.fray = k * 0.035;
    await c.wait(0.08);
  }
  await c.say('ermeline', { en: 'Three hundred names, and nobody ever wrote mine down.', fr: 'Trois cents noms, et personne n’a jamais écrit le mien.' });
  await c.say('whit', { en: 'When you write it, write it plainly.', fr: 'Quand tu l’écriras, écris-le simplement.' });
  await c.narrate({ en: 'He holds out his blank shield to Isot, and she understands which name he means.', fr: 'Il tend son bouclier blanc à Isot, et elle comprend de quel nom il parle.' });
  const ctx = c.audio.ctx;
  if (ctx) bell(ctx, c.audio.reverbIn, midiToHz(31), ctx.currentTime, 0.4, 10);
  await c.say('ermeline', { en: 'Nine tolls at dawn. Then nothing. He’s hung his bell, and he means to ring the whole of Hollin clean.', fr: 'Neuf glas à l’aube. Puis plus rien. Il a pendu sa cloche, et il compte sonner tout Hollin jusqu’à ce qu’il soit propre.' });
  await c.say('hild', { en: 'Every margin borders a book. Somewhere up there is the margin of Wystan’s psalter, and Wystan’s psalter is in the scriptorium.', fr: 'Chaque marge borde un livre. Quelque part là-haut, il y a la marge du psautier de Wystan, et le psautier de Wystan est au scriptorium.' }, 'stern');
  await c.narrate({ en: 'They climb a bar of gold, up and up, and out through the margin of an old psalter, into the scriptorium of Saint Ebb’s an hour before dawn.', fr: 'Ils grimpent une barre d’or, toujours plus haut, et sortent par la marge d’un vieux psautier, dans le scriptorium de Saint-Ebb, une heure avant l’aube.' });
  c.close();
  session.game.chapter = 5;
  c.interlude(4);
}
