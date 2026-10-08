/**
 * Chapter IV, scenes 5 and 6: Wystan's Vine and the Fall of Names (DESIGN.md §3.7; C10, C11).
 * On a vine sits an ape in a monk's habit at a tiny desk, copying nonsense: Wystan, whom
 * Isot scraped out of the Book the night before the story began, at his own request. She
 * confesses, or lets him say it. He teaches her Rubric, and tells them where the scraped
 * names go. Then a test toll of the Abbot's great bell pours a hamlet into the Margin as
 * a waterfall of letters, the Fair stampedes, and the Abbot of Unreason shoves the party
 * onto a bar of the border as it buckles: down they slide, towards the Ink-Well.
 */

import { bell, midiToHz } from '../../audio/instruments';
import { MarginAmbience } from '../../audio/margin';
import { session } from '../../engine/session';
import { CHARACTERS } from '../../pixel/characters';
import { writingDesk } from '../../pixel/furniture';
import { fallingLetter, goldBar, ivy } from '../../world3d/margin';
import { tiles } from '../../world3d/stage';
import type { MapContext, MapDef } from '../types';
import { acanthusRow, MARGIN_GROUND, MARGIN_SKY, marginLight, pageAbove } from './common';

const W = 26;
const H = 13;
const GROUND = Array.from({ length: H }, () => 'o'.repeat(W));
const DESK: [number, number] = [tiles(16), tiles(5.4)];

export const VINE: MapDef = {
  id: 'vine',
  card: { title: { en: 'The Margin', fr: 'La Marge' }, line: { en: 'Wystan’s Vine', fr: 'La vigne de Wystan' } },
  walkable: 'o',
  ground: GROUND,
  bounds: { minX: tiles(13.4), maxX: tiles(W - 13.4), minY: tiles(6.4), maxY: tiles(6.4) },
  camera: { h: 4 },
  ambience: () => new MarginAmbience({ vine: true }),
  checkpoint: true,
  candle: true,
  spawns: { west: { x: tiles(1.6), y: tiles(7.4), dir: 'right' } },
  build(r, st) {
    marginLight(r, 0.35);
    st.ground({ ground: GROUND, heights: GROUND.map((row) => '0'.repeat(row.length)), seed: 79, palette: MARGIN_GROUND });
    st.addSky({ ...MARGIN_SKY }, 220);
    pageAbove(st, tiles(W));
    // The vine: a great acanthus stem rising behind the desk, ivy hung from it.
    acanthusRow(st, tiles(12), tiles(22), tiles(3.6), 41, 60, 1.3);
    acanthusRow(st, 0, tiles(W), tiles(13.6), 47, 110, 0.9);
    for (let x = 0; x < tiles(W); x += 90) st.addImage(goldBar(86, 14, x), x + 43, tiles(1.4));
    st.addImage(ivy(70, 9), DESK[0] - 30, tiles(4.6), { h: 40 });
    st.addArt(writingDesk(7, { book: true }), DESK[0] + 8, DESK[1]);
    st.addCandle(DESK[0] + 16, DESK[1] - 2, 24, 0.6, 70);
    return { blocked: [[DESK[0] - 6, DESK[1] - 5, 28, 6]] };
  },
  npcs: [
    { id: 'wystan', speaker: 'wystan', spec: CHARACTERS.wystan!, x: DESK[0] - 6, y: DESK[1] + 2, dir: 'right' },
    { id: 'abbot', speaker: 'abbotUnreason', spec: CHARACTERS.abbotUnreason!, x: tiles(-2), y: tiles(8), dir: 'right', when: (c) => !c.flag('fallOfNames') },
  ],
  things: [
    {
      id: 'wystan',
      x: DESK[0] - 6,
      y: DESK[1] + 6,
      h: 34,
      reach: 26,
      when: (c) => !c.flag('wystanMet'),
      run: (c) => wystansVine(c),
    },
  ],
  async enter(c, from) {
    if (from === 'west' && !c.flag('vineSeen')) {
      c.set('vineSeen');
      c.letterbox(true);
      await c.wait(1);
      await c.narrate({ en: 'The noise of the Fair falls away. On a vine sits a small ape in a monk’s habit, at a tiny desk, copying.', fr: 'Le bruit de la foire s’éteint. Sur une vigne est assis un petit singe en habit de moine, à un pupitre minuscule, qui copie.' });
      await c.say('isot', { en: '…No.', fr: '…Non.' }, 'alarmed');
      c.letterbox(false);
    }
  },
};

/** C10: Wystan's Vine. */
async function wystansVine(c: MapContext): Promise<void> {
  c.set('wystanMet');
  c.letterbox(true);
  const w = c.npc('wystan');
  c.face(w, 'down');
  await c.say('wystan', { en: 'Isot. Little Isot. Have you brought the knife?', fr: 'Isot. Petite Isot. As-tu apporté le canif ?' });
  const pick = await c.choose([
    { en: 'Tell them yourself.', fr: 'Le leur dire toi-même.' },
    { en: '(Say nothing. Let him say it.)', fr: '(Ne rien dire. Le laisser le dire.)' },
  ]);
  if (pick === 0) {
    c.set('confessed');
    await c.say('isot', { en: 'It was me. The line in the Book, the night before the bell. I scraped Brother Wystan. He asked me to, and I did it.', fr: 'C’était moi. La ligne dans le Livre, la veille de la cloche. J’ai gratté frère Wystan. Il me l’a demandé, et je l’ai fait.' }, 'sad');
    await c.say('hild', session.game.flags.denied ? { en: 'You lied to an abbot with a straight face. I was impressed.', fr: 'Tu as menti à un abbé sans ciller. J’étais impressionnée.' } : { en: 'You didn’t even lie. That’s how I knew.', fr: 'Tu n’as même pas menti. C’est comme ça que j’ai su.' }, 'wry');
  } else {
    c.set('wystanTold');
    await c.say('wystan', { en: 'She scraped me, friends. I was ninety and fraying and I begged her. She has the best hand in the Abbey; it hardly hurt.', fr: 'Elle m’a gratté, mes amis. J’avais quatre-vingt-dix ans, je m’effilochais et je l’en ai suppliée. Elle a la meilleure main de l’Abbaye ; ça n’a presque pas fait mal.' });
    await c.say('hild', session.game.flags.denied ? { en: 'You lied to an abbot with a straight face. I was impressed.', fr: 'Tu as menti à un abbé sans ciller. J’étais impressionnée.' } : { en: 'You didn’t even lie. That’s how I knew.', fr: 'Tu n’as même pas menti. C’est comme ça que j’ai su.' }, 'wry');
  }
  await c.narrate({ en: 'Isot kneels and lays her penknife on his tiny desk. Wystan covers her hand with his paw.', fr: 'Isot s’agenouille et pose son canif sur le pupitre minuscule. Wystan couvre sa main de sa patte.' });
  await c.say('wystan', { en: 'You did a kind thing badly. That’s most kindness.', fr: 'Tu as fait une chose gentille, mal. C’est le cas de presque toutes les gentillesses.' });
  await c.say('isot', { en: 'I’ll write you back. I have ink. I’ll write you back and you’ll be—', fr: 'Je te réécrirai. J’ai de l’encre. Je te réécrirai et tu seras—' }, 'sad');
  await c.say('wystan', { en: 'Old, Isot. In pain. Frayed. No. Write him back.', fr: 'Vieux, Isot. Souffrant. Effiloché. Non. Réécris-le, lui.' });
  c.face(w, 'right');
  await c.say('wystan', { en: 'Then write me after, and let him read me. I’d like to be finished. I was a good long sentence.', fr: 'Puis écris-moi après, et laisse-le me lire. J’aimerais être fini. J’étais une bonne longue phrase.' });
  await c.say('wystan', { en: 'Red is for the words that must be read first. Remember that.', fr: 'Le rouge, c’est pour les mots qu’il faut lire en premier. Souviens-t’en.' });
  c.letterbox(false);
  await c.learn('isot', 'rubric');
  c.letterbox(true);
  await c.say('wystan', { en: 'And take my vermilion. There is nothing in the Margin worth reading first.', fr: 'Et prends mon vermillon. Rien dans la Marge ne vaut d’être lu en premier.' });
  await c.find('vermilionPot');
  await c.say('wystan', { en: 'Every name that is scraped drains down to the Ink-Well at the bottom of the Margin. The first word ever scraped still lies there, at the very bottom.', fr: 'Chaque nom gratté s’écoule jusqu’au Puits d’encre, tout au fond de la Marge. Le premier mot jamais gratté y repose encore, tout au fond.' });
  await c.say('whit', { en: 'Then I’ll go and get my name.', fr: 'Alors j’irai chercher mon nom.' });
  await c.narrate({ en: 'It is the first thing he has chosen.', fr: 'C’est la première chose qu’il ait choisie.' });
  await theFallOfNames(c);
}

/** C11: a test toll of MERCY, a waterfall of letters, the stampede, the slide. */
async function theFallOfNames(c: MapContext): Promise<void> {
  c.set('fallOfNames');
  const ctx = c.audio.ctx;
  if (ctx) {
    bell(ctx, c.audio.bus('sfx'), midiToHz(31), ctx.currentTime, 0.8, 12);
    bell(ctx, c.audio.reverbIn, midiToHz(31), ctx.currentTime, 0.7, 12);
  }
  c.shake(6, 2.4);
  c.flash(0.5);
  await c.narrate({ en: 'A toll from above, out of tune with everything: the Abbot’s great bell, being tried. Over the edge of the page of Hollin pours a waterfall of letters.', fr: 'Un glas venu d’en haut, faux avec tout le reste : la grande cloche de l’abbé, qu’on essaie. Par-dessus le bord de la page de Hollin se déverse une cascade de lettres.' });
  // The letters fall.
  const letters = 'HAMLETOFWYEMARSHANDALLWHOLIVEDTHERE';
  const fallen = [...letters].map((ch, i) => {
    const b = c.stage.addImage(fallingLetter(ch), tiles(5 + (i * 7) % 18) + ((i * 13) % 9), tiles(2 + (i % 5) * 2), { h: 120 + (i % 7) * 12, shadow: false });
    return { b, v: 40 + (i % 5) * 12 };
  });
  for (let k = 0; k < 40; k++) {
    for (const f of fallen) {
      f.b.h = Math.max(0, f.b.h - f.v * 0.06);
      f.b.sync();
    }
    await c.wait(0.06);
  }
  await c.say('abbotUnreason', { en: 'That was a hamlet. He’s tuning his bell. Up, up, onto the bar, all of you!', fr: 'C’était un hameau. Il accorde sa cloche. Debout, debout, sur la barre, tous !' });
  const abbot = c.npc('abbot');
  abbot.x = c.player.x - 30;
  abbot.y = c.player.y;
  await c.walk(abbot, [[c.player.x - 12, c.player.y]]);
  c.shake(3, 0.6);
  await c.narrate({ en: 'The Fair stampedes. The Abbot of Unreason shoves the party onto a bar of the gold border, and it buckles under them, and they slide.', fr: 'La foire s’emballe. L’Abbé de Déraison pousse le groupe sur une barre de la bordure d’or, qui ploie sous eux, et ils glissent.' });
  await c.say('abbotUnreason', { en: 'Read us after, knight. All of us.', fr: 'Lisez-nous après, chevalier. Tous.' });
  await c.say('whit', { en: '…I promise.', fr: '…Je le promets.' });
  c.set('whitPromised');
  await c.narrate({ en: 'His first promise. Down they go, towards the bottom of the Margin, where the ink is.', fr: 'Sa première promesse. Ils descendent, vers le fond de la Marge, là où est l’encre.' });
  c.goto('inkwell', 'top');
}
