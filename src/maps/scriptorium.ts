/**
 * Chapter I, scene 1: the scriptorium of Saint Ebb's, the night before (DESIGN.md §3.4).
 * Isot copies by candlelight; the desk opposite hers is empty. The Book of Names lies on
 * its lectern with a line freshly scraped; tilting the candle reads it. The margins stir
 * (F1), and then the Abbot comes (C2).
 */

import { EbbNightAmbience } from '../audio/ambient';
import { CHARACTERS } from '../pixel/characters';
import { gryllusArt } from '../pixel/enemies';
import { armarium, bench, candle, candleStand, coffer, lectern, psalter, stool, writingDesk } from '../pixel/furniture';
import { GROUND_DEFAULT } from '../pixel/terrain';
import { Billboard, pixelTexture } from '../world3d/billboard';
import { tiles } from '../world3d/stage';
import { backWall, dawnInterior, FLOOR, moonThrough, nightInterior, sideWall } from './interior';
import type { MapContext, MapDef, Rect } from './types';

const GROUND = [
  '                          ',
  '                          ',
  ' ffffffffffffffffffffffff ',
  ' ffffffffffffffffffffffff ',
  ' ffffffffffffffffffffffff ',
  ' ffffffffffffffffffffffff ',
  ' ffffffffffffffffffffffff ',
  ' ffffffffffffffffffffffff ',
  ' ffffffffffffffffffffffff ',
  ' ffffffffffffffffffffffff ',
  ' ffffffffffffffffffffffff ',
  ' ffffffffffffffffffffffff ',
  '                          ',
];

export const WALL_Y = tiles(2);
const ISOT_DESK: [number, number] = [tiles(6.5), tiles(6)];
export const WYSTAN_DESK: [number, number] = [tiles(6.5), tiles(9.4)];
const CUTHWIN_DESK: [number, number] = [tiles(14.5), tiles(6)];
export const LECTERN: [number, number] = [tiles(19.5), tiles(6.6)];
export const DOOR_X = tiles(22.5);

/** The two grylli that climb off the page, shown before the fight. */
let grylli: Billboard[] = [];

/** Build the room as it is at dawn on Ebba's feast (chapter V): rose light, the lectern bare. */
let dawn = false;
export function scriptoriumAtDawn(on: boolean): void {
  dawn = on;
}

export const SCRIPTORIUM: MapDef = {
  id: 'scriptorium',
  card: { title: { en: 'Saint Ebb’s', fr: 'Saint-Ebb' }, line: { en: 'The Scriptorium, the night before', fr: 'Le scriptorium, la nuit d’avant' } },
  walkable: 'f',
  ground: GROUND,
  // The whole room in one frame, like a stage.
  bounds: { minX: tiles(13), maxX: tiles(13), minY: tiles(5.1), maxY: tiles(5.1) },
  camera: { h: 6, lookAhead: 14 },
  ambience: () => new EbbNightAmbience(),
  checkpoint: true,
  spawns: {
    start: { x: ISOT_DESK[0], y: ISOT_DESK[1] - 9, dir: 'down' },
    door: { x: DOOR_X, y: WALL_Y + 14, dir: 'down' },
  },
  build(r, st) {
    if (dawn) dawnInterior(r);
    else nightInterior(r);
    st.ground({ ground: GROUND, heights: GROUND.map((row) => '0'.repeat(row.length)), seed: 12, palette: { ...GROUND_DEFAULT, stone: FLOOR.stone } });
    // The north wall: three lancets of plain glass, a red frieze, the door to the cloister walk.
    const windows = [tiles(4.9), tiles(10.3), tiles(16.0)].map((x) => ({ x: x - tiles(1), w: 16, h: 36, top: 10 }));
    backWall(st, tiles(1), tiles(1), tiles(24), tiles(1), 80, { windows, door: { x: DOOR_X - tiles(1) - 11, w: 22, h: 38 }, frieze: 54, seed: 31 });
    for (const w of windows) moonThrough(st, tiles(1) + w.x + w.w / 2, WALL_Y, 80 - w.top - 6, 40, 44);
    sideWall(st, tiles(0.5), tiles(1), tiles(11), 80);
    sideWall(st, tiles(25) - 0, tiles(1), tiles(11), 80);
    const blocked: Rect[] = [];
    const posts: [number, number, number][] = [];
    // Cupboards of chained books between the windows.
    for (const x of [tiles(2.4), tiles(7.6), tiles(13.15), tiles(18.6)]) {
      st.addArt(armarium(Math.floor(x)), x, WALL_Y + 4);
      blocked.push([x - 22, WALL_Y, 44, 8]);
    }
    // Desks in two rows facing each other across the aisle.
    const desk = (x: number, y: number, seed: number, o: { empty?: boolean } = {}) => {
      st.addArt(writingDesk(seed, o), x, y);
      blocked.push([x - 15, y - 9, 30, 10]);
    };
    desk(...ISOT_DESK, 1);
    desk(...WYSTAN_DESK, 2, { empty: true });
    desk(tiles(10.5), tiles(6), 3);
    desk(tiles(10.5), tiles(9.4), 4);
    desk(...CUTHWIN_DESK, 5);
    desk(tiles(14.5), tiles(9.4), 6);
    // Wystan's stool, pushed in under his desk; his psalter on the slope.
    st.addArt(stool(2), WYSTAN_DESK[0] + 2, WYSTAN_DESK[1] - 2);
    st.addArt(psalter(), WYSTAN_DESK[0] - 4, WYSTAN_DESK[1] - 8, { h: 8 });
    for (const [x, y] of [
      [tiles(10.5), tiles(10.2)],
      [tiles(14.5), tiles(10.2)],
    ] as const)
      st.addArt(stool(Math.floor(x)), x, y);
    // Candles: Isot's is lit; Cuthwin's guttering.
    st.addArt(candle(), ISOT_DESK[0] + 11, ISOT_DESK[1] - 9, { h: 9 });
    st.addCandle(ISOT_DESK[0] + 11, ISOT_DESK[1] - 9, 16, 0.55, 56);
    st.addArt(candle(), CUTHWIN_DESK[0] - 11, CUTHWIN_DESK[1] - 9, { h: 9 });
    st.addCandle(CUTHWIN_DESK[0] - 11, CUTHWIN_DESK[1] - 9, 16, 0.32, 40);
    // The lectern and the Book of Names, between two tall candles.
    st.addArt(lectern(3, dawn), ...LECTERN);
    blocked.push([LECTERN[0] - 12, LECTERN[1] - 6, 24, 7]);
    for (const dx of [-22, 22]) {
      st.addArt(candleStand(), LECTERN[0] + dx, LECTERN[1] + 2);
      st.addCandle(LECTERN[0] + dx, LECTERN[1] + 2, 29, 0.6, 60);
      posts.push([LECTERN[0] + dx, LECTERN[1] + 2, 5]);
    }
    st.addArt(bench(44), tiles(4), tiles(11.4));
    blocked.push([tiles(4) - 22, tiles(11.4) - 4, 44, 5]);
    st.addArt(coffer(), tiles(22.6), tiles(10.6));
    blocked.push([tiles(22.6) - 11, tiles(10.6) - 5, 22, 6]);
    return { blocked, posts };
  },
  npcs: [
    {
      id: 'cuthwin',
      speaker: 'cuthwin',
      spec: CHARACTERS.scribe!,
      x: CUTHWIN_DESK[0],
      y: CUTHWIN_DESK[1] - 9,
      dir: 'down',
      when: (c) => !c.flag('sentenced'),
    },
  ],
  things: [
    {
      id: 'isotDesk',
      x: ISOT_DESK[0],
      y: ISOT_DESK[1],
      h: 14,
      run: async (c) => {
        await c.say('isot', { en: 'Psalm ninety, half copied. “We bring our years to an end, as it were a tale that is told.”', fr: 'Psaume quatre-vingt-dix, à moitié copié. « Nos années s’achèvent comme un conte qu’on raconte. »' }, 'tired');
        await c.say('isot', { en: 'Nobody’s years have ended in ten winters. The psalm doesn’t know that.', fr: 'Les années de personne ne se sont achevées depuis dix hivers. Le psaume ne le sait pas.' }, 'wry');
        await c.find('lampBlack', { en: 'She scrapes the soot from her lamp into a little pot and grinds it with gum, the way Wystan showed her.', fr: 'Elle gratte la suie de sa lampe dans un petit pot et la broie à la gomme, comme Wystan le lui a montré.' });
      },
    },
    {
      id: 'wystanDesk',
      x: WYSTAN_DESK[0] + 8,
      y: WYSTAN_DESK[1],
      h: 14,
      run: async (c) => {
        await c.say('isot', { en: 'The desk opposite mine. The stool is pushed in. Nobody has sat here for… I can’t remember.', fr: 'Le pupitre en face du mien. Le tabouret est rentré. Personne ne s’y est assis depuis… je ne sais plus.' }, 'sad');
        await c.say('isot', { en: 'You’d say my descenders are lazy. They are. I’m tired.', fr: 'Vous diriez que mes hampes sont paresseuses. Elles le sont. Je suis fatiguée.' }, 'tired');
        if (!c.flag('talkedToDesk')) {
          c.set('talkedToDesk');
          c.emote(c.npc('cuthwin'), 'question');
          await c.say('cuthwin', { en: 'Who are you talking to?', fr: 'À qui tu parles ?' });
          await c.say('isot', { en: 'No one.', fr: 'À personne.' });
        }
      },
    },
    {
      id: 'psalter',
      x: WYSTAN_DESK[0] - 4,
      y: WYSTAN_DESK[1] - 6,
      h: 16,
      reach: 22,
      run: async (c) => {
        await c.say('isot', { en: 'A psalter chained to the empty desk. Someone’s thumb wore the corner soft.', fr: 'Un psautier enchaîné au pupitre vide. Un pouce en a usé le coin.' }, 'neutral');
        await c.page({
          title: { en: 'Psalter, flyleaf', fr: 'Psautier, page de garde' },
          lines: [
            { text: 'Liber psalmorum.', red: true },
            { text: 'Isot. Thank you for the knife. Don’t keep my name; keep your hand steady. W.', scraped: true },
            { text: 'Domine, refugium factus es nobis.' },
          ],
          read: async (cc) => {
            cc.set('readNote');
            await cc.say('isot', { en: '“Thank you for the knife.” …I don’t understand.', fr: '« Merci pour le canif. » …Je ne comprends pas.' }, 'alarmed');
          },
        });
      },
    },
    {
      id: 'cuthwin',
      x: CUTHWIN_DESK[0],
      y: CUTHWIN_DESK[1] - 9,
      h: 44,
      when: (c) => !c.flag('sentenced'),
      run: async (c) => {
        const cu = c.npc('cuthwin');
        if (!c.flag('readWystan')) {
          await c.say('cuthwin', { en: 'Mm? Copying in my sleep. It’s a skill. The ink knows the way.', fr: 'Mm ? Je copie en dormant. C’est un talent. L’encre connaît le chemin.' });
          await c.say('isot', { en: 'Brother Cuthwin, the desk opposite mine. Whose was it?', fr: 'Frère Cuthwin, le pupitre en face du mien. À qui était-il ?' });
          await c.say('cuthwin', { en: 'That desk? That desk has always been empty.', fr: 'Ce pupitre ? Ce pupitre a toujours été vide.' });
          c.emote(cu, 'question', 1.6);
          await c.say('cuthwin', { en: 'Hasn’t it?', fr: 'Non ?' });
        } else {
          await c.say('isot', { en: 'Brother Cuthwin. Do you remember a Brother Wystan? The librarian?', fr: 'Frère Cuthwin. Vous souvenez-vous d’un frère Wystan ? Le bibliothécaire ?' }, 'grave');
          await c.say('cuthwin', { en: 'We’ve never had a librarian. The books look after themselves. They’re chained.', fr: 'On n’a jamais eu de bibliothécaire. Les livres se gardent tout seuls. Ils sont enchaînés.' });
        }
      },
    },
    {
      id: 'book',
      x: LECTERN[0],
      y: LECTERN[1],
      h: 40,
      reach: 30,
      when: (c) => !c.cleared('f1'),
      run: async (c) => {
        if (!c.flag('readWystan')) await c.say('isot', { en: 'The Book of Names. Tonight’s page, still damp at the foot.', fr: 'Le Livre des Noms. La page de ce soir, encore humide en bas.' });
        await c.page({
          title: { en: 'The Book of Names · Saint Ebb’s', fr: 'Le Livre des Noms · Saint-Ebb' },
          lines: [
            { text: 'Aumery, abbot of this house.', red: true },
            { text: 'Gaudry, prior.' },
            { text: 'Cuthwin, brother, of the scriptorium.' },
            { text: 'Wystan, brother, librarian.', scraped: true },
            { text: 'Ermeline, sister, of the infirmary.' },
            { text: 'Isot, scribe, a foundling of Lychford.' },
          ],
          read: async (cc) => {
            cc.set('readWystan');
            await cc.say('isot', { en: 'Brother Wystan, librarian. Scraped tonight; the vellum is still warm.', fr: 'Frère Wystan, bibliothécaire. Gratté ce soir ; le vélin est encore tiède.' }, 'alarmed');
            await cc.say('isot', { en: 'Wystan. I know that name. I know it the way you know a step in the dark.', fr: 'Wystan. Je connais ce nom. Comme on connaît une marche dans le noir.' }, 'sad');
          },
        });
        if (c.flag('readWystan')) await marginsStir(c);
      },
    },
    {
      id: 'window',
      x: tiles(10.7),
      y: WALL_Y + 4,
      h: 40,
      run: async (c) => {
        await c.say('isot', { en: 'The tide is in. The causeway lies under the sea until dawn, and the bell-carts came over it before dark.', fr: 'La marée est haute. La chaussée est sous la mer jusqu’à l’aube, et les charrettes de cloches l’ont passée avant la nuit.' });
      },
    },
    {
      id: 'armarium',
      x: tiles(7.4),
      y: WALL_Y + 6,
      h: 50,
      run: async (c) => {
        await c.say('isot', { en: 'Every book on a chain. The Abbot says words wander if you let them.', fr: 'Chaque livre a sa chaîne. L’abbé dit que les mots s’égarent si on les laisse faire.' }, 'wry');
      },
    },
  ],
  exits: [
    {
      rect: [DOOR_X - 12, WALL_Y, 24, 6],
      to: 'cloister',
      spawn: 'church',
      when: () => false,
      blocked: async (c) => {
        await c.say('isot', { en: 'Locked from the cloister side, as every night. The scriptorium is a book with its clasps shut.', fr: 'Fermée côté cloître, comme chaque nuit. Le scriptorium est un livre aux fermoirs clos.' }, 'tired');
      },
    },
  ],
  async enter(c, from) {
    if (from === 'start') {
      c.letterbox(true);
      await c.wait(2.2);
      await c.say('isot', { en: 'You’d say my descenders are lazy.', fr: 'Vous diriez que mes hampes sont paresseuses.' }, 'tired');
      await c.say('isot', { en: 'They are. I’m tired.', fr: 'Elles le sont. Je suis fatiguée.' }, 'wry');
      c.emote(c.npc('cuthwin'), 'question');
      await c.say('cuthwin', { en: 'Who are you talking to?', fr: 'À qui tu parles ?' });
      await c.say('isot', { en: 'No one.', fr: 'À personne.' });
      await c.say('cuthwin', { en: 'Then talk to no one more quietly. Some of us are copying in our sleep.', fr: 'Alors parle à personne plus doucement. Certains copient en dormant.' });
      c.set('talkedToDesk');
      c.letterbox(false);
      c.close();
      await c.narrate({ en: 'Something is wrong with tonight’s page. The Book lies open on the lectern, to the east.', fr: 'Quelque chose cloche avec la page de ce soir. Le Livre est ouvert sur le lutrin, à l’est.' });
    } else if (from === 'battle:f1' && !c.flag('sentenced')) {
      await theSentence(c);
    }
  },
};

/** The fresh wound in the vellum draws the marginalia off the page (F1). */
async function marginsStir(c: MapContext): Promise<void> {
  c.letterbox(true);
  c.shake(3, 1.2);
  await c.pan(LECTERN[0] - 30, LECTERN[1] - 4, 1.2);
  await c.narrate({ en: 'The margins of the Book stir. Two little drawings climb off the page, heads on legs, drawn by the fresh wound in the vellum.', fr: 'Les marges du Livre frémissent. Deux petits dessins descendent de la page, des têtes sur pattes, attirés par la blessure fraîche du vélin.' });
  const art = gryllusArt();
  grylli = [0, 1].map((i) => {
    const b = new Billboard(pixelTexture(art.a), art.w, art.h, { cols: art.a.w / art.w, rows: 1, anchor: art.anchor, emissive: pixelTexture(art.e) });
    b.x = LECTERN[0] - 24 - i * 18;
    b.y = LECTERN[1] + 8 + i * 6;
    b.h = 0;
    b.setFrame(0, 0);
    b.sync();
    c.r.scene.add(b.mesh);
    return b;
  });
  c.emote(c.player, 'alarm');
  await c.wait(0.8);
  await c.say('isot', { en: 'Grylli. Out of the margin. That’s not… they don’t do that.', fr: 'Des grylles. Sortis de la marge. Ce n’est pas… ils ne font pas ça.' }, 'alarmed');
  await c.say('isot', { en: 'Penknife, then. Gloss what they mean to do, and strike it through if I have the ink.', fr: 'Le canif, alors. Gloser ce qu’ils comptent faire, et le biffer si j’ai l’encre.' }, 'stern');
  for (const b of grylli) b.dispose();
  grylli = [];
  c.battle('f1');
}

/** C2: Who scrapes shall be scraped. */
async function theSentence(c: MapContext): Promise<void> {
  const p = c.player;
  c.letterbox(true);
  await c.wait(0.8);
  c.shake(2, 0.4);
  await c.narrate({ en: 'A key turns in the cloister door.', fr: 'Une clé tourne dans la porte du cloître.' });
  const aumery = c.npc('aumery');
  const b1 = c.npc('brotherA');
  const b2 = c.npc('brotherB');
  for (const a of [aumery, b1, b2]) {
    a.x = DOOR_X;
    a.y = WALL_Y + 4;
    a.visible = true;
  }
  await c.pan(tiles(17), tiles(7), 1.4);
  await Promise.all([
    c.walk(aumery, [
      [DOOR_X, WALL_Y + 20],
      [p.x + 22, p.y + 2],
    ]),
    c.walk(b1, [
      [DOOR_X - 8, WALL_Y + 30],
      [LECTERN[0] - 4, LECTERN[1] + 12],
    ]),
    c.walk(b2, [
      [DOOR_X + 4, WALL_Y + 26],
      [p.x + 36, p.y + 14],
    ]),
  ]);
  c.face(p, 'right');
  c.face(aumery, 'left');
  await c.say('aumery', { en: 'Ink on the floor, at this hour. Isot.', fr: 'De l’encre par terre, à cette heure. Isot.' });
  c.face(b1, 'up');
  await c.say('brother', { en: 'Father Abbot. A line scraped from the Book. Tonight.', fr: 'Père abbé. Une ligne grattée dans le Livre. Ce soir.' });
  await c.say('brother', { en: 'And her penknife, with vellum dust on the blade.', fr: 'Et son canif, avec de la poussière de vélin sur la lame.' });
  await c.say('aumery', { en: 'Who scrapes shall be scraped. At the dawn bell.', fr: 'Qui gratte sera gratté. À la cloche de l’aube.' });
  await c.walk(aumery, [[p.x + 14, p.y + 2]]);
  await c.say('aumery', { en: 'It won’t hurt, child. No one will grieve. That is the mercy of it.', fr: 'Ça ne fera pas mal, mon enfant. Personne ne te pleurera. C’est toute la miséricorde.' });
  const pick = await c.choose([
    { en: '“I didn’t do it.”', fr: '« Ce n’est pas moi. »' },
    { en: '(Say nothing.)', fr: '(Ne rien dire.)' },
  ]);
  c.set(pick === 0 ? 'denied' : 'silent');
  if (pick === 0) {
    await c.say('isot', { en: 'I didn’t do it.', fr: 'Ce n’est pas moi.' }, 'alarmed');
    await c.say('aumery', { en: 'Then the Book will forget you without a lie in your mouth. That is better.', fr: 'Alors le Livre t’oubliera sans mensonge dans la bouche. C’est mieux.' });
  } else await c.say('aumery', { en: 'Good. Silence is a kind of prayer.', fr: 'Bien. Le silence est une sorte de prière.' });
  await c.narrate({ en: 'Through the window, by torchlight, brothers are lifting bells off the carts in the yard. Big ones, from a dozen parishes.', fr: 'Par la fenêtre, à la lueur des torches, des frères descendent des cloches des charrettes dans la cour. De grosses cloches, d’une douzaine de paroisses.' });
  await c.say('aumery', { en: 'Take her to the penitent’s cell. Let her pray, if she remembers how.', fr: 'Menez-la à la cellule des pénitents. Qu’elle prie, si elle s’en souvient.' });
  c.set('sentenced');
  await c.wait(0.6);
  c.goto('cell', 'start');
}

// The Abbot and his brothers stand outside until the sentence.
SCRIPTORIUM.npcs!.push(
  { id: 'aumery', speaker: 'aumery', spec: CHARACTERS.aumery!, x: DOOR_X, y: -200, dir: 'down', when: (c) => c.cleared('f1') && !c.flag('sentenced') },
  { id: 'brotherA', speaker: 'brother', spec: CHARACTERS.brother!, x: DOOR_X, y: -200, dir: 'down', when: (c) => c.cleared('f1') && !c.flag('sentenced') },
  { id: 'brotherB', speaker: 'brother', spec: CHARACTERS.brother!, x: DOOR_X, y: -200, dir: 'down', when: (c) => c.cleared('f1') && !c.flag('sentenced') },
);
