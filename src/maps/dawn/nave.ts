/**
 * Chapter V, scenes 4 to 6, the ending and the epilogue (DESIGN.md §3.8–§3.10; C13, B5, C14).
 *
 * The nave of the Abbey church: Ermeline opens the doors and Hild walls them behind the party.
 * MERCY tolls on, and each toll blanks a band of the floor, from the doors towards the high
 * altar, so the crossing is a run. At the altar, Aumery stands at the Book with Ebba's
 * Pumice in his hand and MERCY above him: brother and sister. Then the Writing of FINIS.
 * Then colour comes back, Hild is read first and turns to gold, Wystan is written back, the
 * knight takes off his helm, and walks out along the causeway at low tide.
 */

import { bell, midiToHz } from '../../audio/instruments';
import { psaltery } from '../../audio/blanchwood';
import { EbbNightAmbience } from '../../audio/ambient';
import { fizzleSound } from '../../audio/battleSfx';
import { session } from '../../engine/session';
import { tr } from '../../i18n/i18n';
import { ashlar, newArt } from '../../pixel/buildings';
import { CHARACTERS } from '../../pixel/characters';
import { candleStand, coffer, lectern } from '../../pixel/furniture';
import { hex, PixelImage, ramp } from '../../pixel/pixel';
import { GROUND_DEFAULT } from '../../pixel/terrain';
import { LOST_NAMES } from '../../story/lostNames';
import type { Billboard } from '../../world3d/billboard';
import { tiles } from '../../world3d/stage';
import { backWall, dawnInterior, FLOOR, sideWall } from '../interior';
import type { MapContext, MapDef, Rect } from '../types';

const W = 36;
const GROUND = ['                                    ', '                                    ', ...Array.from({ length: 8 }, () => ' ffffffffffffffffffffffffffffffffff '), '                                    '];
const ALTAR: [number, number] = [tiles(32.4), tiles(4.4)];
const DOORS: [number, number] = [tiles(2.2), tiles(6.4)];
/** The bands of floor that MERCY blanks, one each toll, from the doors to the altar steps. */
const BANDS = Array.from({ length: 9 }, (_, k) => [tiles(1 + k * 3), tiles(3)] as const);
const TOLL_EVERY = 2.6;

/** MERCY: thirty-nine bells melted into one, hung over the altar. */
function bigBell(): PixelImage {
  const img = new PixelImage(64, 60);
  const bronze = ramp('#8A6A3A', 6);
  for (let y = 4; y < 58; y++) {
    const t = (y - 4) / 54;
    const half = 10 + t * t * 20 + (y > 52 ? 3 : 0);
    for (let x = Math.round(32 - half); x < 32 + half; x++) {
      const u = (x - (32 - half)) / (half * 2);
      img.set(x, y, bronze[Math.max(0, Math.min(5, Math.round(4.6 - u * 3.6 + (y % 9 === 0 ? -1 : 0))))]!);
    }
  }
  img.rect(28, 0, 8, 5, bronze[2]!);
  // Its name, cast round the waist.
  for (let x = 18; x < 46; x += 2) img.set(x, 30, hex('#E8C870'));
  img.outline(null);
  return img;
}

function pillar(): PixelImage {
  const art = newArt(14, 84);
  ashlar(art, 2, 6, 10, 74, { stone: '#B8A898', seed: 3 });
  art.a.rect(0, 0, 14, 6, ramp('#B8A898', 5)[3]!);
  art.a.rect(0, 78, 14, 6, ramp('#B8A898', 5)[1]!);
  art.a.outline(null);
  return art.a;
}

function blankBand(): PixelImage {
  const [w, d] = [tiles(3), tiles(8)];
  const img = new PixelImage(w, d);
  for (let y = 0; y < d; y++) for (let x = 0; x < w; x++) img.set(x, y, [244, 238, 226, x < 2 || x >= w - 2 ? 160 : 245]);
  return img;
}

let bands: Billboard[] = [];
let warn: Billboard | null = null;
let tollT = 0;
let blanked = 0;

export const NAVE: MapDef = {
  id: 'nave',
  card: { title: { en: 'Saint Ebb’s', fr: 'Saint-Ebb' }, line: { en: 'The Abbey Church', fr: 'L’église abbatiale' } },
  walkable: 'f',
  ground: GROUND,
  bounds: { minX: tiles(13.4), maxX: tiles(W - 13.4), minY: tiles(5.4), maxY: tiles(5.4) },
  camera: { h: 6 },
  ambience: () => new EbbNightAmbience(),
  checkpoint: true,
  candle: false,
  spawns: { doors: { x: DOORS[0], y: DOORS[1], dir: 'right' } },
  build(r, st) {
    dawnInterior(r);
    st.ground({ ground: GROUND, heights: GROUND.map((row) => '0'.repeat(row.length)), seed: 91, palette: { ...GROUND_DEFAULT, stone: FLOOR.stone } });
    const windows = Array.from({ length: 6 }, (_, i) => ({ x: tiles(3 + i * 5.2), w: 16, h: 44, top: 8 }));
    backWall(st, tiles(1), tiles(1), tiles(W - 2), tiles(1), 100, { stone: '#A89C8C', seed: 93, windows, frieze: 64 });
    sideWall(st, tiles(0.5), tiles(1), tiles(10), 100);
    sideWall(st, tiles(W - 1), tiles(1), tiles(10), 100);
    // The arcade of the nave: pillars along both sides.
    const blocked: Rect[] = [];
    for (let i = 0; i < 6; i++) {
      for (const y of [tiles(2.6), tiles(9.8)]) {
        st.addImage(pillar(), tiles(4.2 + i * 5.2), y);
        blocked.push([tiles(4.2 + i * 5.2) - 7, y - 4, 14, 5]);
      }
    }
    // The high altar, the Book on it, its candles, and MERCY over all.
    st.addArt(coffer(12), ...ALTAR);
    st.addArt(lectern(5), ALTAR[0] - 8, ALTAR[1] + 4);
    for (const dx of [-30, 26]) {
      st.addArt(candleStand(), ALTAR[0] + dx, ALTAR[1] + 2);
      st.addCandle(ALTAR[0] + dx, ALTAR[1] + 2, 29, 0.6, 70);
    }
    st.addImage(bigBell(), ALTAR[0], ALTAR[1] - 4, { h: 64 });
    st.addLight(ALTAR[0], ALTAR[1] + 10, 60, 160, '#FFD8C0', 0.5);
    blocked.push([ALTAR[0] - 16, ALTAR[1] - 6, 32, 8]);
    // The bands MERCY will blank, hidden till it does; and a warning on the next.
    bands = BANDS.map(([x]) => {
      const b = st.addImage(blankBand(), x + tiles(1.5), tiles(6), { h: 0.3, shadow: false, anchor: [tiles(1.5), tiles(4)] });
      b.mesh.rotation.x = -Math.PI / 2;
      b.visible = false;
      return b;
    });
    const w = new PixelImage(tiles(3), tiles(8));
    for (let y = 0; y < w.h; y++) for (let x = 0; x < w.w; x++) if (x < 2 || x >= w.w - 2) w.set(x, y, [232, 168, 96, 200]);
    warn = st.addImage(w, 0, tiles(6), { h: 0.4, shadow: false, anchor: [tiles(1.5), tiles(4)], glow: w });
    warn.mesh.rotation.x = -Math.PI / 2;
    warn.visible = false;
    return { blocked };
  },
  npcs: [
    { id: 'aumery', speaker: 'aumery', spec: CHARACTERS.aumery!, x: ALTAR[0] - 2, y: ALTAR[1] + 14, dir: 'left', when: (c) => !c.flag('ended') },
    { id: 'ermeline', speaker: 'ermeline', spec: CHARACTERS.ermeline!, x: tiles(5), y: tiles(5.2), dir: 'right', when: (c) => !c.flag('altarReached') },
  ],
  zones: [
    {
      id: 'altar',
      rect: [tiles(29.6), 0, tiles(1), tiles(11)],
      when: (c) => !c.flag('altarReached'),
      run: (c) => brotherAndSister(c),
    },
  ],
  watch: (c, dt) => {
    if (!c.flag('naveRun') || c.flag('altarReached')) return null;
    tollT += dt;
    if (warn && blanked < BANDS.length) {
      warn.visible = true;
      warn.x = BANDS[blanked]![0] + tiles(1.5);
      warn.sync();
    }
    if (tollT < TOLL_EVERY || blanked >= BANDS.length) return null;
    tollT = 0;
    const k = blanked++;
    bands[k]!.visible = true;
    const ctx = c.audio.ctx;
    if (ctx) {
      bell(ctx, c.audio.bus('sfx'), midiToHz(29), ctx.currentTime, 0.5, 9);
      bell(ctx, c.audio.reverbIn, midiToHz(29), ctx.currentTime, 0.4, 9);
    }
    c.shake(3, 0.8);
    const [x0, w] = BANDS[k]!;
    return c.player.x >= x0 && c.player.x < x0 + w ? fallsAway : null;
  },
  async enter(c, from) {
    resetBands();
    if (from === 'doors' && !c.flag('naveRun')) await theDoors(c);
    else if (from === 'doors') c.set('naveRun');
    if (from === 'battle:b5' && !c.flag('ended')) await goldLineByLine(c);
  },
};

function resetBands(): void {
  for (const b of bands) b.visible = false;
  blanked = 0;
  tollT = 0;
}

/** Caught on a band as MERCY blanks it: the floor goes, and they are back at the doors. */
async function fallsAway(c: MapContext): Promise<void> {
  c.flash(1);
  fizzleSound(c.audio);
  resetBands();
  c.player.x = DOORS[0];
  c.player.y = DOORS[1];
  for (const a of c.party) {
    a.x = DOORS[0] - 8;
    a.y = DOORS[1];
  }
  await c.narrate({ en: 'The floor goes white under her feet, and the church folds back to its doors. Again, and faster.', fr: 'Le sol blanchit sous ses pieds, et l’église se replie jusqu’à ses portes. Encore, et plus vite.' });
}

async function theDoors(c: MapContext): Promise<void> {
  c.letterbox(true);
  await c.wait(0.8);
  await c.narrate({ en: 'Ermeline opens the church doors for them from the inside, and Hild walls them shut again behind, against the Order.', fr: 'Ermeline leur ouvre de l’intérieur les portes de l’église, et Hild les mure derrière eux, contre l’Ordre.' });
  await c.say('ermeline', { en: 'Each toll takes a band of the floor. I’ll go ahead and light where it takes next. Don’t stand there.', fr: 'Chaque glas emporte une bande du sol. Je passe devant et j’éclaire celle qu’il prendra ensuite. Ne restez pas dessus.' });
  await c.say('isot', { en: 'To the altar, then. Before the ninth.', fr: 'À l’autel, alors. Avant le neuvième.' }, 'stern');
  const e = c.npc('ermeline');
  void c.walk(e, [[tiles(27), tiles(5.2)]]);
  c.letterbox(false);
  c.set('naveRun');
}

/** C13: brother and sister. */
async function brotherAndSister(c: MapContext): Promise<void> {
  c.set('altarReached');
  if (warn) warn.visible = false;
  c.letterbox(true);
  const a = c.npc('aumery');
  const hild = c.party.find((x) => x.id === 'hild');
  await c.pan(tiles(26), tiles(5.6), 1.2);
  await c.narrate({ en: 'Aumery stands at the Book on the high altar, Ebba’s Pumice in his hand, MERCY above him. The dawn comes red through the rose window.', fr: 'Aumery se tient devant le Livre sur le maître-autel, la Ponce d’Ebba à la main, MERCY au-dessus de lui. L’aube entre rouge par la rosace.' });
  await c.say('aumery', { en: 'Ten years and no mother has buried a child. Not one. You want to give them back their graves.', fr: 'Dix ans, et pas une mère n’a enterré un enfant. Pas une. Vous voulez leur rendre leurs tombes.' });
  await c.say('isot', { en: 'You didn’t stop death. You turned it into forgetting. I’ve seen where they go.', fr: 'Vous n’avez pas arrêté la mort. Vous en avez fait de l’oubli. J’ai vu où ils vont.' }, 'stern');
  await c.say('aumery', { en: 'You know that weight, child. You’ve carried it. Help me carry it.', fr: 'Tu connais ce poids, mon enfant. Tu l’as porté. Aide-moi à le porter.' });
  if (hild) await c.walk(hild, [[a.x - 22, a.y + 2]]);
  await c.say('hild', { en: 'You didn’t save me, Aumery. You kept me. Like a flower pressed in a book.', fr: 'Tu ne m’as pas sauvée, Aumery. Tu m’as gardée. Comme une fleur pressée dans un livre.' }, 'sad');
  await c.say('aumery', { en: 'I couldn’t be the one left.', fr: 'Je ne pouvais pas être celui qui reste.' });
  await c.say('hild', { en: 'So you arranged to be the only one.', fr: 'Alors tu t’es arrangé pour être le seul.' }, 'grave');
  await c.narrate({ en: 'She stops punishing herself, there in front of him, and gives freely.', fr: 'Elle cesse de se punir, là, devant lui, et donne sans compter.' });
  c.letterbox(false);
  await c.learn('hild', 'benison');
  c.letterbox(true);
  await c.say('aumery', { en: 'Then I’ll scrape it all. Every name. No one will remember enough to grieve.', fr: 'Alors je gratterai tout. Chaque nom. Personne ne se souviendra assez pour pleurer.' });
  await c.narrate({ en: 'Two Brothers rise from the choir stalls. A lectern slides behind the party, and on it lies a fresh leaf of the Book.', fr: 'Deux Frères se lèvent des stalles du chœur. Un lutrin glisse derrière le groupe, et sur lui repose une feuille neuve du Livre.' });
  await c.say('whit', { en: 'Write it, Isot. Plainly. I’ll keep them off you.', fr: 'Écris-le, Isot. Simplement. Je les tiendrai loin de toi.' });
  c.letterbox(false);
  await c.learn('isot', 'inscribe');
  c.battle('b5');
}

/** C14 and the epilogue: gold, line by line. */
async function goldLineByLine(c: MapContext): Promise<void> {
  c.set('ended');
  c.letterbox(true);
  const g = session.game;
  const a = c.npc('aumery');
  const whit = c.party.find((x) => x.id === 'whit') ?? c.player;
  const hild = c.party.find((x) => x.id === 'hild');
  const ctx = c.audio.ctx;
  await c.pan(tiles(26), tiles(5.6), 0.8);
  // Lychford's bell, rung by Dunstan, Hob and the children from the mere: one sound with the S.
  if (ctx) {
    bell(ctx, c.audio.bus('sfx'), midiToHz(43), ctx.currentTime, 0.6, 12);
    bell(ctx, c.audio.reverbIn, midiToHz(43), ctx.currentTime, 0.5, 12);
  }
  await c.narrate({ en: 'Across the water, in Lychford, Dunstan and Hob and the children ring the bell they hauled out of the mere. Its toll and the fifth letter are one sound.', fr: 'De l’autre côté de l’eau, à Lychford, Dunstan, Hob et les enfants sonnent la cloche qu’ils ont tirée de la mare. Son glas et la cinquième lettre ne font qu’un seul son.' });
  c.shake(3, 1);
  await c.narrate({ en: 'Aumery lunges to scrape the word again.', fr: 'Aumery se jette en avant pour gratter le mot de nouveau.' });
  await c.walk(whit, [[a.x - 14, a.y]]);
  await c.say('whit', { en: 'No more, Aumery.', fr: 'Assez, Aumery.' });
  c.flash(0.6);
  c.shake(6, 1.6);
  await c.narrate({ en: 'A gauntlet closes gently on his wrist. A crack runs down MERCY from crown to lip.', fr: 'Un gantelet se referme doucement sur son poignet. Une fissure parcourt MERCY du cerveau à la lèvre.' });
  // Colour returns: every pigment at once, for the first time.
  for (let k = 0; k <= 24; k++) {
    c.r.grade.saturation = 0.95 + k * 0.02;
    c.r.grade.exposure = 1.12 + k * 0.006;
    await c.wait(0.08);
  }
  await c.narrate({ en: 'The blanching lifts. Colour floods back over Hollin from the fens to Holmcaster, and out of the Margin the overflow rises as lines of gold.', fr: 'Le blanchiment se lève. La couleur revient sur tout Hollin, des marais jusqu’à Holmcaster, et de la Marge le trop-plein s’élève en lignes d’or.' });
  await c.say('whit', { en: 'Ten years of names. They’re all waiting.', fr: 'Dix ans de noms. Ils attendent tous.' });
  await c.say('hild', { en: 'Read mine first. I’ve been at the front of the line a long time.', fr: 'Lis le mien en premier. Ça fait longtemps que je suis en tête de la file.' }, 'warm');
  await c.say('hild', { en: 'Aumery. Live. Remember me. That’s your penance, and it’s a kind one.', fr: 'Aumery. Vis. Souviens-toi de moi. C’est ta pénitence, et elle est douce.' }, 'grave');
  await c.say(
    'hild',
    g.flags.hildUnforgiven
      ? { en: 'Isot. You were right not to forgive me. Write it all down anyway. The true way, over the old one.', fr: 'Isot. Tu as eu raison de ne pas me pardonner. Écris tout quand même. La vraie version, par-dessus l’ancienne.' }
      : { en: 'Isot. Write it all down. The true way. Over the old one.', fr: 'Isot. Écris tout. La vraie version. Par-dessus l’ancienne.' },
    'warm',
  );
  await c.say('hild', { en: 'Gently, now.', fr: 'Doucement, maintenant.' }, 'warm');
  await c.narrate({ en: 'She squeezes Isot’s hand, then lets go.', fr: 'Elle serre la main d’Isot, puis la lâche.' });
  await c.say('whit', { en: 'Hild of Saint Ebb’s, who nursed Lychford through the Grey Sweat.', fr: 'Hild de Saint-Ebb, qui soigna Lychford pendant la Suée grise.' });
  if (ctx) {
    bell(ctx, c.audio.reverbIn, midiToHz(43), ctx.currentTime, 0.5, 12);
    bell(ctx, c.audio.bus('sfx'), midiToHz(55), ctx.currentTime + 0.3, 0.3, 8);
  }
  if (hild) {
    c.stage.addLight(hild.x, hild.y, 30, 80, '#FFD870', 0.6);
    c.stage.addEmitter({ kind: 'glint', area: [hild.x - 10, hild.y - 4, 20, 8], heights: [4, 50], count: 16, color: '#FFE088', size: 1.8, intensity: 1.6 }, 41);
    for (let k = 1; k <= 24; k++) {
      hild.sprite.flash = Math.min(0.9, k * 0.05);
      hild.sprite.fray = k / 26;
      await c.wait(0.12);
    }
    hild.visible = false;
  }
  await c.narrate({ en: 'She does not blank out. She turns to gold, line by line, and then she is gone. Being finished looks nothing like being forgotten.', fr: 'Elle ne s’efface pas. Elle se change en or, ligne après ligne, puis elle n’est plus là. Être finie ne ressemble en rien à être oubliée.' });
  await c.narrate({ en: 'Isot writes Wystan’s name back into the Book in a plain hand. Whit reads it. Far off in the Margin, a small ape-scribe sets down his pen and becomes a line of gold.', fr: 'Isot réécrit le nom de Wystan dans le Livre, d’une main simple. Whit le lit. Loin dans la Marge, un petit singe scribe pose sa plume et devient une ligne d’or.' });
  if (g.flags.amabelScraped)
    await c.narrate({ en: 'A small brown hen in the Margin is written back as Amabel of Lychford, and read, and finished.', fr: 'Une petite poule brune de la Marge est réécrite en Amabel de Lychford, et lue, et finie.' });
  else
    await c.narrate(
      g.flags.amabelPromised
        ? { en: 'In Lychford, Amabel is read at home with Hob’s hand in hers, and Isot is there, as she promised.', fr: 'À Lychford, Amabel est lue chez elle, la main de Hob dans la sienne, et Isot est là, comme promis.' }
        : { en: 'In Lychford, Amabel is read at home with Hob’s hand in hers.', fr: 'À Lychford, Amabel est lue chez elle, la main de Hob dans la sienne.' },
    );
  await c.narrate({ en: 'Prior Gaudry hears his son’s name read, and weeps for the first time in ten years. At Holmcaster, King Cenwalh is read in his sleep.', fr: 'Le prieur Gaudry entend lire le nom de son fils, et pleure pour la première fois en dix ans. À Holmcaster, le roi Cenwalh est lu dans son sommeil.' });
  await c.narrate({ en: 'Whit takes off his helm. Isot looks at him for a long moment.', fr: 'Whit ôte son heaume. Isot le regarde un long moment.' });
  await c.say('isot', { en: 'Oh. You’re…', fr: 'Oh. Tu es…' }, 'alarmed');
  await c.say('whit', { en: 'Plain?', fr: 'Ordinaire ?' });
  await c.say('isot', { en: 'Kind.', fr: 'Doux.' }, 'warm');
  if (g.flags.confessed) await c.say('whit', { en: 'You told them yourself, on the vine. That’s the harder kind of writing.', fr: 'Tu le leur as dit toi-même, sur la vigne. C’est la sorte d’écriture la plus difficile.' });
  await c.say('whit', { en: 'Keep the Book, Isot. Write them, so I can read them.', fr: 'Garde le Livre, Isot. Écris-les, pour que je puisse les lire.' });
  await c.say('whit', { en: 'I’ll read yours too, one day. Not soon. And slowly.', fr: 'Je lirai le tien aussi, un jour. Pas bientôt. Et lentement.' });
  await c.walk(whit, [[DOORS[0] + 20, DOORS[1]]]);
  whit.visible = false;
  await c.narrate({ en: 'He walks out along the causeway at low tide, with a long road of beds before him.', fr: 'Il s’en va par la chaussée à marée basse, avec devant lui une longue route de lits.' });
  await c.narrate({ en: 'The day after the first funeral in Hollin in ten years, Eadgyth is crowned at Holmcaster.', fr: 'Le lendemain des premières funérailles en Hollin depuis dix ans, Eadgyth est couronnée à Holmcaster.' });
  c.close();
  await c.narrate({ en: 'Aumery asked to be walled into Hild’s empty anchorhold, and was. Isot, Keeper of the Book, writes Ninefold back into it a street a day, from Ermeline’s litany and the Glossators’ Underbooks.', fr: 'Aumery demanda à être muré dans la réclusoire vide de Hild, et le fut. Isot, Gardienne du Livre, y réécrit Ninefold une rue par jour, d’après la litanie d’Ermeline et les Underbooks des Glossateurs.' });
  // The last page of her chronicle, with every Lost Name found in red in its margin.
  const ebba = { en: 'Ebba of Lychford, born in the Grey Year, written at last in a margin.', fr: 'Ebba de Lychford, née l’Année grise, écrite enfin dans une marge.' };
  const names = g.lostNames.map((id) => ({ text: tr(id === 'girl' && g.flags.girlNamed ? ebba : LOST_NAMES[id]!), red: true }));
  await c.page({
    title: { en: 'Epilogue. Explicit.', fr: 'Épilogue. Explicit.' },
    lines: [
      { text: tr({ en: 'Here ends the Book of the Mercy.', fr: 'Ici finit le Livre de la Miséricorde.' }), red: true },
      { text: tr({ en: 'I keep the Book of Names now. I write every name in a plain hand, and I leave room at the end of each line.', fr: 'Je tiens le Livre des Noms, à présent. J’écris chaque nom d’une main simple, et je laisse de la place au bout de chaque ligne.' }) },
      { text: tr({ en: 'My brothers ask why I have drawn three small figures in the margin of this last page: a scribe, an anchoress, and a knight with a white shield.', fr: 'Mes frères demandent pourquoi j’ai dessiné trois petites figures dans la marge de cette dernière page : une scribe, une recluse, et un chevalier au bouclier blanc.' }) },
      { text: tr({ en: 'I tell them the margin is where we keep what matters and does not fit.', fr: 'Je leur dis que la marge est l’endroit où l’on garde ce qui compte et ne tient pas ailleurs.' }) },
      { text: tr({ en: 'Some evenings, when the tide is out, a white figure walks the causeway. He waves. I wave back. He is in no hurry for mine, and I have asked him to read it slowly.', fr: 'Certains soirs, à marée basse, une silhouette blanche marche sur la chaussée. Il fait signe. Je réponds. Il n’est pas pressé pour le mien, et je lui ai demandé de le lire lentement.' }) },
      ...names,
      { text: 'FINIS', red: true },
    ],
  });
  // The score's only major chord.
  if (ctx) for (const [i, m] of [55, 59, 62, 67, 71].entries()) psaltery(ctx, c.audio.bus('music'), m, ctx.currentTime + i * 0.12, 0.08);
  await c.narrate({ en: 'Palimpsest. Written, drawn and scored entirely in code: no image, no sound file, no font file. Thank you for reading it to the end.', fr: 'Palimpsest. Écrit, dessiné et mis en musique entièrement en code : aucune image, aucun fichier son, aucun fichier de police. Merci de l’avoir lu jusqu’au bout.' });
  g.flags.finished = true;
  g.chapter = 6;
  c.save();
  c.goto('title', 'start');
}
