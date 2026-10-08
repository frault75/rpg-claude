/**
 * Chapter V, scene 2: the Abbot's Lodging (DESIGN.md §3.8). A narrow room off the cloister:
 * a bed never slept in, a prie-dieu, and Aumery's own Book of Hours lying open. Its margins
 * are filled with one name, written hundreds of times; one leaf sketches the Clean Page,
 * the whole Book scraped clean but for a single name. Under the raking light, the last
 * entry he scraped: "Forgive me. I could not be the one left."
 */

import { EbbNightAmbience } from '../../audio/ambient';
import { tr } from '../../i18n/i18n';
import { bench, candle, coffer, pallet, writingDesk } from '../../pixel/furniture';
import { GROUND_DEFAULT } from '../../pixel/terrain';
import { ghostWords } from '../../pixel/underwriting';
import { tiles } from '../../world3d/stage';
import { backWall, dawnInterior, FLOOR, sideWall } from '../interior';
import type { MapDef } from '../types';

const GROUND = ['              ', '              ', ...Array.from({ length: 5 }, () => ' ffffffffffff '), '              '];
const DESK: [number, number] = [tiles(4.5), tiles(4.4)];

export const LODGING: MapDef = {
  id: 'lodging',
  card: { title: { en: 'Saint Ebb’s', fr: 'Saint-Ebb' }, line: { en: 'The Abbot’s Lodging', fr: 'Le logis de l’abbé' } },
  walkable: 'f',
  ground: GROUND,
  bounds: { minX: tiles(7), maxX: tiles(7), minY: tiles(3.9), maxY: tiles(3.9) },
  camera: { h: 4, zoom: 4 / 3 },
  ambience: () => new EbbNightAmbience(),
  checkpoint: true,
  candle: true,
  spawns: { door: { x: tiles(10.5), y: tiles(6.4), dir: 'up' } },
  build(r, st) {
    dawnInterior(r);
    st.ground({ ground: GROUND, heights: GROUND.map((row) => '0'.repeat(row.length)), seed: 87, palette: { ...GROUND_DEFAULT, stone: FLOOR.stone } });
    backWall(st, tiles(1), tiles(1), tiles(12), tiles(1), 70, { seed: 89, windows: [{ x: tiles(7.4), w: 12, h: 26, top: 8 }] });
    sideWall(st, tiles(0.5), tiles(1), tiles(6), 70);
    sideWall(st, tiles(13), tiles(1), tiles(6), 70);
    st.addArt(writingDesk(9, { book: true }), ...DESK);
    st.addArt(candle(), DESK[0] + 10, DESK[1] - 9, { h: 9 });
    st.addCandle(DESK[0] + 10, DESK[1] - 9, 16, 0.4, 50);
    st.addArt(pallet(5), tiles(10.6), tiles(3.6));
    st.addArt(bench(26, 3), tiles(7.4), tiles(3.4));
    st.addArt(coffer(4), tiles(2.4), tiles(6.2));
    return {
      blocked: [
        [DESK[0] - 15, DESK[1] - 9, 30, 10],
        [tiles(10.6) - 16, tiles(3.6) - 8, 32, 9],
        [tiles(7.4) - 13, tiles(3.4) - 4, 26, 5],
        [tiles(2.4) - 11, tiles(6.2) - 5, 22, 6],
      ],
    };
  },
  things: [
    {
      id: 'hours',
      x: DESK[0],
      y: DESK[1],
      h: 16,
      run: async (c) => {
        await c.page({
          title: { en: 'The Abbot’s Book of Hours', fr: 'Le livre d’heures de l’abbé' },
          lines: [
            { text: 'Hild. Hild. Hild. Hild. Hild. Hild. Hild.', red: true },
            { text: 'Hild. Hild. Hild. Hild. Hild. Hild. Hild. Hild.' },
            { text: tr({ en: '(a leaf sketched: the Book, every page scraped clean, one name left)', fr: '(une feuille esquissée : le Livre, chaque page grattée, un seul nom restant)' }) },
            { text: 'Hild.', red: true },
            { text: tr({ en: 'Forgive me. I could not be the one left.', fr: 'Pardonne-moi. Je ne pouvais pas être celui qui reste.' }), scraped: true },
          ],
          read: async (cc) => {
            cc.set('aumeryForgive');
            await cc.say('hild', { en: '“I could not be the one left.” He wrote it, and then he scraped it, so not even the page would know.', fr: '« Je ne pouvais pas être celui qui reste. » Il l’a écrit, puis il l’a gratté, pour que même la page ne le sache pas.' }, 'sad');
          },
        });
        if (!c.flag('hoursSeen')) {
          c.set('hoursSeen');
          await c.say('isot', { en: 'Your name, Hild. In every margin. Hundreds of times.', fr: 'Ton nom, Hild. Dans chaque marge. Des centaines de fois.' }, 'sad');
          await c.say('hild', { en: 'He used to write it on his slate when he was six, so he’d know I was coming back from the infirmary.', fr: 'Il l’écrivait sur son ardoise à six ans, pour savoir que je revenais de l’infirmerie.' }, 'grave');
          await c.say('isot', { en: 'And this: the whole Book scraped clean, but for one name. That’s what MERCY is for.', fr: 'Et ceci : tout le Livre gratté, sauf un nom. C’est à ça que sert MERCY.' }, 'alarmed');
        }
      },
    },
  ],
  // On the coffer, under the varnish: the infirmary roll of the Grey Year, a line never filled in.
  underwriting: [
    {
      id: 'name-girl',
      x: tiles(2.4),
      y: tiles(6.2) - 2,
      h: 22,
      art: ghostWords(['A GIRL OF LYCHFORD', 'BORN IN THE GREY YEAR', '…………'], true),
      lostName: 'girl',
      revealed: async (c) => {
        await c.say('isot', { en: 'Born the year Hild nursed Lychford, and nobody wrote her in time. Not even a name. There’s room in the margin.', fr: 'Née l’année où Hild soignait Lychford, et personne ne l’a écrite à temps. Pas même un nom. Il reste de la place dans la marge.' }, 'sad');
        await c.narrate({ en: 'Isot writes, small and plain, in the margin of the roll: EBBA, for the feast.', fr: 'Isot écrit, petit et simple, dans la marge du registre : EBBA, pour la fête.' });
        c.set('girlNamed');
      },
    },
  ],
  exits: [{ rect: [tiles(9.5), tiles(6.8), tiles(2.4), tiles(0.4)], to: 'dawnCloister', spawn: 'lodging' }],
  async enter(c, from) {
    if (from === 'door' && !c.flag('lodgingSeen')) {
      c.set('lodgingSeen');
      await c.say('whit', { en: 'The bed hasn’t been slept in. Not for a long time.', fr: 'Le lit n’a pas servi. Pas depuis longtemps.' });
    }
  },
};
