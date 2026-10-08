/**
 * Chapter V, scene 3: the cloister at dawn (DESIGN.md §3.8). Prior Gaudry holds the garth with
 * two Pumice Brothers while the Fyrd's arrows arc over the walls (F9). One of the Brothers
 * hesitates. Afterwards Gaudry asks Whit whether his son is waiting, and lowers his hammer.
 */

import { EbbNightAmbience } from '../../audio/ambient';
import { CHARACTERS } from '../../pixel/characters';
import { ghostWords } from '../../pixel/underwriting';
import { tiles } from '../../world3d/stage';
import { CHURCH_X, CLOISTER, cloisterAtDawn, WALL_Y, WELL } from '../cloister';
import type { MapContext, MapDef } from '../types';

const holding = (c: MapContext) => !c.cleared('f9');

export const DAWN_CLOISTER: MapDef = {
  ...CLOISTER,
  id: 'dawnCloister',
  card: { title: { en: 'Saint Ebb’s', fr: 'Saint-Ebb' }, line: { en: 'The Cloister at Dawn', fr: 'Le cloître à l’aube' } },
  ambience: () => new EbbNightAmbience(),
  checkpoint: true,
  candle: false,
  spawns: { lodging: { x: tiles(3), y: tiles(9.6), dir: 'right' } },
  build(r, st) {
    cloisterAtDawn(true);
    const set = CLOISTER.build(r, st);
    cloisterAtDawn(false);
    return set;
  },
  npcs: [
    { id: 'gaudry', speaker: 'gaudry', spec: CHARACTERS.gaudry!, x: tiles(16), y: tiles(8.4), dir: 'left', when: (c) => !c.flag('hammerDown') },
    { id: 'brotherA', speaker: 'brother', spec: CHARACTERS.brother!, x: tiles(17.4), y: tiles(7.2), dir: 'left', when: holding },
    { id: 'brotherB', speaker: 'brother', spec: CHARACTERS.brother!, x: tiles(17.6), y: tiles(9.8), dir: 'left', when: holding },
  ],
  zones: [
    {
      id: 'garth',
      rect: [tiles(10), 0, tiles(1.5), tiles(13)],
      when: holding,
      run: async (c) => {
        c.letterbox(true);
        c.shake(2, 0.6);
        await c.narrate({ en: 'Arrows arc over the cloister wall from the causeway: the Fyrd is at the gate. In the garth Prior Gaudry waits with two Brothers, his bell-hammer on his shoulder.', fr: 'Des flèches passent en arc au-dessus du mur du cloître depuis la chaussée : la milice est à la porte. Dans le préau, le prieur Gaudry attend avec deux Frères, son marteau de cloche sur l’épaule.' });
        await c.say('gaudry', { en: 'Nothing is lost that is properly scraped, children. Put down the inkhorn.', fr: 'Rien n’est perdu de ce qui est bien gratté, mes enfants. Posez la corne d’encre.' });
        await c.say('brother', { en: 'Prior… is it true? Did he scrape the Reader?', fr: 'Prieur… est-ce vrai ? A-t-il gratté le Lecteur ?' });
        await c.say('gaudry', { en: 'Hold the line, brother.', fr: 'Tiens la ligne, frère.' });
        c.battle('f9');
      },
    },
  ],
  things: [],
  // A Glossator's cache on the well-head, where the sea gets in at the spring tides; the Brothers stood guard by it.
  underwriting: [{ id: 'name-wat', x: WELL[0], y: WELL[1] + 2, h: 12, art: ghostWords(['WAT THE FERRYMAN', 'NEVER CHARGED A WIDOW']), lostName: 'wat', when: (c) => c.cleared('f9') }],
  exits: [{ rect: [CHURCH_X - 12, WALL_Y, 24, 6], to: 'nave', spawn: 'doors', when: (c) => c.cleared('f9') }],
  async enter(c, from) {
    if (from === 'battle:f9' && !c.flag('hammerDown')) {
      c.letterbox(true);
      const g = c.npc('gaudry');
      await c.wait(0.6);
      await c.say('gaudry', { en: 'Knight. I brought my son’s name to my vows. I don’t remember him. I’m told he was very loved.', fr: 'Chevalier. J’ai apporté le nom de mon fils à mes vœux. Je ne me souviens pas de lui. On me dit qu’il était très aimé.' });
      await c.say('gaudry', { en: 'Is he waiting? Wherever they wait?', fr: 'Est-ce qu’il attend ? Là où ils attendent ?' });
      await c.say('whit', { en: 'They’re all waiting. I’ll read him. I promise.', fr: 'Ils attendent tous. Je le lirai. Je le promets.' });
      await c.narrate({ en: 'Gaudry lowers his hammer. The Brothers step aside from the church door.', fr: 'Gaudry abaisse son marteau. Les Frères s’écartent de la porte de l’église.' });
      c.set('hammerDown');
      void c.walk(g, [[g.x + 40, g.y + 10]]);
      c.letterbox(false);
    }
  },
};
