/**
 * Chapter II, scenes 2, 5 and 6: Lychford by day and by night (DESIGN.md §3.5). By day
 * the story is told by the place: children playing "Mercy", the mummers rehearsing a
 * play that can't end, the sexton's mirror-bright spade, Goodwife Amabel fraying at her
 * door. By night, after the passing bell, the village rings the green with lanterns, the
 * Mummers' Play (B2), and then the torches of the raid.
 */

import { session } from '../../engine/session';
import { CHARACTERS } from '../../pixel/characters';
import { wellHead } from '../../pixel/furniture';
import { pineTree } from '../../pixel/nature';
import { barrel, crate, lanternPost } from '../../pixel/props';
import { relief } from '../../world3d/relief';
import { tiles } from '../../world3d/stage';
import { bareTree, cottage3D, snowHedge } from '../../world3d/lychford';
import { WinterAmbience } from '../../audio/winter';
import { ghostWords } from '../../pixel/underwriting';
import type { MapContext, MapDef, NpcDef, Rect } from '../types';
import { SNOW_GROUND, snowfall, WINTER_NIGHT_SKY, WINTER_SKY, winterDay, winterNight } from './winter';

const W = 36;
const H = 18;
const GREEN: [number, number] = [tiles(18), tiles(10.4)];

/** Snow everywhere, trodden paths round the green and out to the lane and the church. */
function layout(): string[] {
  const rows: string[] = [];
  for (let y = 0; y < H; y++) {
    let row = '';
    for (let x = 0; x < W; x++) {
      const d = Math.hypot((x + 0.5 - 18) / 1.3, y + 0.5 - 10.4);
      const ring = d > 3.6 && d < 4.8;
      const lane = y >= 9 && y <= 10 && x < 10;
      const east = y >= 6 && y <= 7 && x > 24;
      const ch = ring || lane || east ? 'd' : 'n';
      row += ch;
    }
    rows.push(row);
  }
  return rows;
}

const GROUND = layout();

export const night = (): boolean => !!session.game.flags.bellRung && !session.game.flags.raidDone;

const dayOnly = (c: MapContext) => !c.flag('bellRung');
/** The night of the play, and of the raid that ends it. */
const playNight = (c: MapContext) => c.flag('bellRung') && !c.flag('raidDone');

const VILLAGERS: NpcDef[] = [
  { id: 'v1', speaker: 'villager', spec: CHARACTERS.goodwife!, x: GREEN[0] - 70, y: GREEN[1] - 10, dir: 'right', when: playNight },
  { id: 'v2', speaker: 'villager', spec: CHARACTERS.villager!, x: GREEN[0] - 62, y: GREEN[1] + 18, dir: 'right', when: playNight, fray: 0.25 },
  { id: 'v3', speaker: 'villager', spec: CHARACTERS.goodwife!, x: GREEN[0] + 66, y: GREEN[1] + 14, dir: 'left', when: playNight, fray: 0.4 },
  { id: 'v4', speaker: 'villager', spec: CHARACTERS.villager!, x: GREEN[0] + 58, y: GREEN[1] - 16, dir: 'left', when: playNight },
  { id: 'v5', speaker: 'villager', spec: CHARACTERS.dunstan!, x: GREEN[0] - 20, y: GREEN[1] - 40, dir: 'down', when: playNight },
];

/** Prior Gaudry's Brothers, come for the bell: hidden until the raid brings them in. */
const BROTHERS: NpcDef[] = Array.from({ length: 6 }, (_, k) => ({
  id: `brother${k}`,
  speaker: 'brother',
  spec: { ...CHARACTERS.brother!, held: 'none' },
  x: tiles(0.8 + k * 1.5),
  y: tiles(8.9 + ((k * 2) % 3) * 0.55),
  dir: 'right' as const,
  when: (c: MapContext) => c.cleared('b2') && !c.flag('raidDone'),
}));

// The north side of the village stands on a snowy terrace above the street and the green,
// each cottage on its own footing; the bank between them bays in and out.
const HEIGHTS = relief(W, H, [
  { at: [0, 0, W, 4], h: 2, ragged: 's' },
  { at: [2, 0, 5, 5], h: 2 },
  { at: [9, 0, 5, 4], h: 2 },
  { at: [20, 0, 5, 5], h: 2 },
  { at: [28, 0, 5, 4], h: 2 },
  { at: [0, 0, W, 2], h: 3, ragged: 's' },
], 81);

export const VILLAGE: MapDef = {
  id: 'village',
  card: { title: { en: 'Lychford', fr: 'Lychford' }, line: { en: 'The Village Without Graves', fr: 'Le village sans tombes' } },
  walkable: 'dn',
  ground: GROUND,
  heights: HEIGHTS,
  bounds: { minX: tiles(13.4), maxX: tiles(W - 13.4), minY: tiles(8.6), maxY: tiles(10.2) },
  camera: { h: 4 },
  ambience: () => new WinterAmbience(),
  checkpoint: true,
  candle: false,
  spawns: {
    lane: { x: tiles(1.5), y: tiles(9.6), dir: 'right' },
    church: { x: tiles(W - 2), y: tiles(6.6), dir: 'left' },
  },
  build(r, st) {
    const dark = night();
    if (dark) winterNight(r);
    else winterDay(r);
    st.ground({ ground: GROUND, heights: HEIGHTS, seed: 81, palette: SNOW_GROUND });
    st.addSky(dark ? { ...WINTER_NIGHT_SKY } : { ...WINTER_SKY }, 220);
    const blocked: Rect[] = [];
    const house = (x: number, y: number, w: number, seed: number, plaster: string) => {
      const b = st.addBuilding(cottage3D(x, y, w, 34, { seed, plaster, lit: true }), st.heightAt(x + w / 2, y + 17));
      blocked.push(...b.footprints);
    };
    house(tiles(2.5), tiles(2.4), 60, 1, '#E8DCC0');
    house(tiles(9.6), tiles(1.8), 56, 2, '#E4D0B0');
    house(tiles(20.6), tiles(2.2), 64, 3, '#ECE0C8');
    house(tiles(28.4), tiles(1.6), 56, 4, '#E0CCA8');
    house(tiles(4.4), tiles(13.8), 60, 5, '#E8D8BC');
    house(tiles(25.2), tiles(14), 58, 6, '#E4D4B8');
    st.addArt(wellHead(8), GREEN[0], GREEN[1] - 6);
    blocked.push([GREEN[0] - 15, GREEN[1] - 12, 30, 7]);
    // Lanterns ring the green; by night they are lit.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const x = GREEN[0] + Math.cos(a) * 88;
      const y = GREEN[1] + Math.sin(a) * 54;
      const art = lanternPost();
      if (!dark) art.lights.length = 0;
      st.addArt(art, x, y);
      blocked.push([x - 3, y - 2, 6, 3]);
    }
    for (const [x, y, s] of [
      [tiles(1), tiles(5), 1],
      [tiles(34.5), tiles(11), 2],
      [tiles(15), tiles(16.4), 3],
    ] as const)
      st.addImage(bareTree(s + 10, 1), x, y);
    st.addImage(pineTree(31, true), tiles(33.6), tiles(3.6));
    st.addImage(pineTree(32, true), tiles(17), tiles(2.6));
    st.addArt(barrel(7), tiles(13.6), tiles(4.4));
    st.addArt(crate(8), tiles(14.6), tiles(4.6));
    st.addImage(snowHedge(60, 4), tiles(12), tiles(16.8), { solid: 58 });
    if (dark) {
      // The burning tower, beyond the roofs to the north-east, once the raid begins.
      if (session.game.cleared.includes('b2')) {
        st.addLight(tiles(32), tiles(1), 60, 260, '#FF7A30', 1.2, 'flame');
        st.addEmitter({ kind: 'ember', area: [tiles(29), tiles(0.5), tiles(6), 6], heights: [40, 90], count: 30, color: '#FFA040', size: 1.6, intensity: 1.6 }, 4);
      }
    } else snowfall(st, tiles(W), tiles(H), 90);
    return { blocked };
  },
  npcs: [
    { id: 'child', speaker: 'child', spec: CHARACTERS.child!, x: GREEN[0] - 38, y: GREEN[1] + 12, dir: 'right', when: dayOnly },
    { id: 'child2', speaker: 'child2', spec: CHARACTERS.child2!, x: GREEN[0] - 18, y: GREEN[1] + 20, dir: 'left', when: dayOnly },
    { id: 'george', speaker: 'george', spec: CHARACTERS.george!, x: GREEN[0] + 34, y: GREEN[1] - 2, dir: 'left', when: (c) => !c.flag('raidDone') },
    { id: 'slasher', speaker: 'slasher', spec: CHARACTERS.slasher!, x: GREEN[0] + 52, y: GREEN[1] + 8, dir: 'left', when: (c) => !c.flag('raidDone') },
    { id: 'doctor', speaker: 'doctor', spec: CHARACTERS.doctor!, x: GREEN[0] + 22, y: GREEN[1] + 16, dir: 'left', when: (c) => !c.flag('raidDone') },
    { id: 'dunstan', speaker: 'dunstan', spec: CHARACTERS.dunstan!, x: tiles(30.5), y: tiles(8.4), dir: 'left', when: dayOnly },
    { id: 'amabel', speaker: 'amabel', spec: CHARACTERS.amabel!, x: tiles(22.6), y: tiles(5.2), dir: 'down', fray: 0.35, when: (c) => !c.flag('amabelScraped') },
    { id: 'hob', speaker: 'hob', spec: CHARACTERS.villager!, x: tiles(24.4), y: tiles(5.4), dir: 'down' },
    { id: 'presenter', speaker: 'presenter', spec: CHARACTERS.child2!, x: GREEN[0] - 4, y: GREEN[1] + 30, dir: 'up', when: playNight },
    ...VILLAGERS,
    ...BROTHERS,
  ],
  things: [
    {
      id: 'children',
      x: GREEN[0] - 28,
      y: GREEN[1] + 16,
      h: 40,
      when: dayOnly,
      run: async (c) => {
        await c.say('child', { en: 'We’re playing Mercy. You run, and I catch you, and you’re not out. Nobody’s ever out!', fr: 'On joue à Miséricorde. Tu cours, je t’attrape, et t’es pas éliminée. Personne n’est jamais éliminé !' });
        await c.say('child2', { en: 'You have to say the rhyme when you’re caught. Listen:', fr: 'Il faut dire la comptine quand on est attrapé. Écoute :' });
        await c.say('child2', { en: '“Weeper weeps and Morning calls, Singer sings in empty halls; wake the Tenor last of all, and someone’s name will heed the call.”', fr: '« Pleureuse pleure et Matin appelle, Chanteuse chante en la nef vide ; réveille le Ténor en dernier, et un nom répondra à l’appel. »' });
        c.set('rhyme');
        await c.say('isot', { en: 'That’s not a skipping rhyme. That’s a ringing order.', fr: 'Ce n’est pas une comptine pour sauter. C’est un ordre de sonnerie.' }, 'wry');
      },
    },
    {
      id: 'mummers',
      x: GREEN[0] + 34,
      y: GREEN[1] - 2,
      h: 50,
      when: dayOnly,
      run: async (c) => {
        await c.say('george', { en: '“Here comes I, Saint George, the valiant man—” No, no, from the top. Again.', fr: '« Me voici, saint Georges, le vaillant homme— » Non, non, on reprend. Encore.' });
        await c.say('isot', { en: 'You perform it every Midwinter?', fr: 'Vous la jouez à chaque mi-hiver ?' });
        await c.say('slasher', { en: 'Every night. Ten years of nights.', fr: 'Chaque nuit. Dix ans de nuits.' });
        await c.say('isot', { en: 'Every night?', fr: 'Chaque nuit ?' }, 'alarmed');
        await c.say('doctor', { en: 'The Doctor won’t let it end. That’s me. I don’t know how to stop.', fr: 'Le Docteur ne la laisse pas finir. C’est moi. Je ne sais pas comment m’arrêter.' });
      },
    },
    {
      id: 'dunstan',
      x: tiles(30.5),
      y: tiles(8.4),
      h: 46,
      when: dayOnly,
      run: async (c) => {
        if (c.flag('underbook')) {
          await c.say('dunstan', { en: 'Keep that leaf dry. Some of the names on it have nowhere else to be.', fr: 'Garde cette feuille au sec. Certains noms dessus n’ont nulle part ailleurs où être.' });
          return;
        }
        await c.say('dunstan', { en: 'Dunstan, sexton. Ten years and not a grave to dig. A sexton with no graves is a man with no sentences.', fr: 'Dunstan, fossoyeur. Dix ans sans une tombe à creuser. Un fossoyeur sans tombes est un homme sans phrases.' });
        await c.say('dunstan', { en: 'I’ve started polishing the verbs.', fr: 'Je me suis mis à polir les verbes.' });
        await c.say('isot', { en: 'Your spade shines like a mirror.', fr: 'Votre bêche brille comme un miroir.' }, 'wry');
        await c.say('dunstan', { en: 'You carry a penknife on a cord. Only one kind of scribe does that.', fr: 'Tu portes un canif au bout d’un cordon. Il n’y a qu’une sorte de scribe qui fait ça.' });
        await c.narrate({ en: 'He presses a leaf of vellum into her hand: a page of a Glossator Underbook, names copied small and close, before anyone could scrape them.', fr: 'Il lui glisse une feuille de vélin dans la main : une page d’Underbook de Glossateur, des noms copiés serrés, avant qu’on ne puisse les gratter.' });
        await c.say('dunstan', { en: 'The bell in our tower hasn’t rung for ten years. The passing bell. Go and look at it, if you’ve a mind to.', fr: 'La cloche de notre tour n’a pas sonné depuis dix ans. Le glas. Va la voir, si le cœur t’en dit.' });
        c.set('underbook');
      },
    },
    {
      id: 'amabel',
      x: tiles(22.6),
      y: tiles(5.2),
      h: 46,
      when: (c) => !c.flag('amabelScraped') && !c.flag('amabelAnswered') && dayOnly(c),
      run: (c) => amabel(c),
    },
    {
      id: 'well',
      x: GREEN[0],
      y: GREEN[1] - 6,
      h: 30,
      when: dayOnly,
      run: async (c) => {
        await c.say('isot', { en: 'Frozen over. Someone has drawn a little face in the frost on the lid, smiling.', fr: 'Gelé. Quelqu’un a dessiné un petit visage dans le givre du couvercle, qui sourit.' });
      },
    },
  ],
  // A Glossator's cache on the thatcher's own house.
  underwriting: [{ id: 'name-edda', x: tiles(9.6) + 28, y: tiles(1.8) + 35, h: 30, art: ghostWords(['EDDA THATCHER', 'AFRAID OF LADDERS'], true), lostName: 'edda' }],
  exits: [
    { rect: [0, tiles(8.5), tiles(0.6), tiles(3)], to: 'lane', spawn: 'village', when: (c) => !c.flag('bellRung') },
    { rect: [tiles(W - 0.6), tiles(5.5), tiles(0.6), tiles(3)], to: 'churchyard', spawn: 'village', when: (c) => !c.flag('bellRung') },
  ],
  async enter(c, from) {
    for (const b of BROTHERS) if (b.when!(c)) c.npc(b.id).visible = false;
    if (from === 'church' && playNight(c) && !c.flag('nightBegun')) await theVillageListens(c);
    else if (from === 'battle:b2' && !c.flag('raidDone')) await theRaid(c);
  },
};

/** Goodwife Amabel asks to be scraped (DESIGN.md §3.11). */
async function amabel(c: MapContext): Promise<void> {
  await c.say('amabel', { en: 'You’re the scribe from Saint Ebb’s. I can tell by your fingers.', fr: 'Tu es la scribe de Saint-Ebb. Ça se voit à tes doigts.' });
  await c.say('amabel', { en: 'I should have gone in the Grey Sweat, love. I’ve been fading since. Look: you can see the door through my hand.', fr: 'J’aurais dû partir avec la Suée grise, ma belle. Je pâlis depuis. Regarde : on voit la porte à travers ma main.' });
  await c.say('amabel', { en: 'I’d like to be finished. I’m not asking to be forgotten. Just finished. Would you scrape me?', fr: 'J’aimerais être finie. Je ne demande pas à être oubliée. Juste finie. Tu voudrais bien me gratter ?' });
  await c.say('hob', { en: 'Amabel. Don’t.', fr: 'Amabel. Ne fais pas ça.' });
  const pick = await c.choose([
    { en: 'Scrape her name.', fr: 'Gratter son nom.' },
    { en: '“I can’t. I won’t.”', fr: '« Je ne peux pas. Je ne veux pas. »' },
    { en: '“Not yet. I’ll come back. I promise.”', fr: '« Pas encore. Je reviendrai. Promis. »' },
  ]);
  c.set('amabelAnswered');
  if (pick === 0) {
    await c.narrate({ en: 'Isot takes out the penknife on its cord. The hand that scrapes remembers.', fr: 'Isot sort le canif au bout de son cordon. La main qui gratte se souvient.' });
    c.flash(0.5);
    c.set('amabelScraped');
    c.npc('amabel').visible = false;
    await c.wait(1.2);
    await c.say('hob', { en: '…I was laying the table. For one. I don’t know why I said that.', fr: '…Je mettais la table. Pour un. Je ne sais pas pourquoi j’ai dit ça.' });
    await c.say('hild', { en: 'You’ve done that before.', fr: 'Tu as déjà fait ça.' }, 'grave');
    await c.say('isot', { en: '…', fr: '…' }, 'sad');
  } else if (pick === 1) {
    c.set('amabelRefused');
    await c.say('isot', { en: 'I can’t. I won’t. I’m sorry.', fr: 'Je ne peux pas. Je ne veux pas. Pardon.' }, 'sad');
    await c.say('amabel', { en: 'Then I’ll keep. Like the roses.', fr: 'Alors je tiendrai. Comme les roses.' });
  } else {
    c.set('amabelPromised');
    await c.say('isot', { en: 'Not yet. I’ll come back for you. I promise.', fr: 'Pas encore. Je reviendrai pour toi. Promis.' }, 'warm');
    await c.say('amabel', { en: 'A promise. Nobody’s made me one in ten years.', fr: 'Une promesse. Personne ne m’en a fait depuis dix ans.' });
  }
}

/** After the passing bell (C5): the village in the snow, Whit's memory, the Mummers' Play. */
async function theVillageListens(c: MapContext): Promise<void> {
  c.set('nightBegun');
  c.letterbox(true);
  await c.wait(1.2);
  await c.narrate({ en: 'Every door in Lychford is open. The whole village has come out into the snow to listen, the way you listen for a name on the tip of your tongue.', fr: 'Toutes les portes de Lychford sont ouvertes. Le village entier est sorti dans la neige pour écouter, comme on écoute un nom sur le bout de la langue.' });
  const w = c.party.find((a) => a.id === 'whit') ?? c.player;
  c.shake(2, 0.6);
  w.emote('silence', 2.4);
  await c.say('whit', { en: 'A bed. A woman with grey on her face. She was afraid. Then she wasn’t.', fr: 'Un lit. Une femme au visage gris. Elle avait peur. Et puis non.' });
  await c.say('whit', { en: 'I reached for… and then nothing.', fr: 'J’ai tendu la main vers… et puis plus rien.' });
  const hild = c.party.find((a) => a.id === 'hild');
  if (hild) {
    c.face(hild, 'up');
    hild.emote('silence', 2);
  }
  await c.say('whit', { en: 'I kept watch. I remember keeping watch.', fr: 'Je veillais. Je me souviens d’avoir veillé.' });
  await c.learn('whit', 'vigil');
  await c.pan(GREEN[0], GREEN[1], 1.4);
  await c.say('presenter', { en: 'Room, room, brave gallants all! Pray give us room to rhyme!', fr: 'Place, place, braves galants ! Donnez-nous place pour rimer !' });
  await c.say('george', { en: 'Here comes I, Saint George, the valiant man! A champion! Step into the ring!', fr: 'Me voici, saint Georges, le vaillant homme ! Un champion ! Entrez dans le cercle !' });
  await c.say('doctor', { en: 'And if any fall, I’ve a little bottle by my side…', fr: 'Et si quelqu’un tombe, j’ai une petite fiole à mon côté…' });
  await c.say('isot', { en: 'If the play needs an ending, we’ll give it one.', fr: 'Si la pièce a besoin d’une fin, on va la lui donner.' }, 'stern');
  c.battle('b2');
}

/** The masks fall, and then the torches come (C6). */
async function theRaid(c: MapContext): Promise<void> {
  c.letterbox(true);
  await c.wait(0.8);
  await c.narrate({ en: 'The paper masks fall into the snow. Under them are three frayed men of Lychford, and they are weeping, because something, anything, has ended.', fr: 'Les masques de papier tombent dans la neige. Dessous, trois hommes de Lychford, effilochés, qui pleurent, parce que quelque chose, n’importe quoi, s’est terminé.' });
  for (const id of ['george', 'slasher', 'doctor']) c.npc(id).sprite.fray = 0.3;
  await c.say('villager', { en: 'It’s over. The play’s over. Oh, thank God.', fr: 'C’est fini. La pièce est finie. Oh, Dieu merci.' });
  c.shake(3, 1);
  // A river of torches comes in along the lane from the west, one Brother at a time.
  void (async () => {
    for (const b of BROTHERS) {
      const a = c.npc(b.id);
      a.visible = true;
      c.stage.addFlame(a.x + 7, a.y + 1, 36, { light: 60, embers: true });
      await c.wait(0.35);
    }
  })();
  await c.pan(tiles(13.4), tiles(9.6), 1.6);
  await c.narrate({ en: 'Then torches, a river of them across the snow from the causeway road. Prior Gaudry’s Brothers, come for the bell.', fr: 'Puis des torches, une rivière de torches sur la neige depuis la route de la chaussée. Les Frères du prieur Gaudry, venus pour la cloche.' });
  c.release();
  await c.say('gaudry', { en: 'The bell of Lychford, in the name of the Abbot! It is wanted at Saint Ebb’s!', fr: 'La cloche de Lychford, au nom de l’abbé ! On la réclame à Saint-Ebb !' });
  await c.say('dunstan', { en: 'Then he can fish for it. Hob, the rope! To the mere with her!', fr: 'Alors qu’il la pêche. Hob, la corde ! À la mare avec elle !' });
  await c.narrate({ en: 'Hob cuts the bell rope. Six men run the passing bell down to the frozen mere on a hurdle and send it through the ice. Behind them, the Brothers set the tower alight.', fr: 'Hob tranche la corde de la cloche. Six hommes descendent le glas jusqu’à la mare gelée sur une claie et l’envoient sous la glace. Derrière eux, les Frères mettent le feu à la tour.' });
  await c.say('hild', { en: 'Go. I’ll wall the lane behind us. Isot, the mere, now!', fr: 'Allez. Je mure le chemin derrière nous. Isot, la mare, vite !' }, 'stern');
  c.set('raidDone');
  c.goto('mere', 'shore');
}
