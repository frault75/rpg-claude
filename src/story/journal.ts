/**
 * The Journal (DESIGN.md §10.7): what to do next, in Isot's words, worked out from where
 * the party is and what has happened there; and the chapter it belongs to.
 */

import type { LocalText } from '../i18n/i18n';
import { INTERLUDES } from './interludes';
import type { GameState } from './state';

export function chapterTitle(n: number): { title: LocalText; name: LocalText } {
  if (n <= 1) return { title: { en: 'Chapter I', fr: 'Chapitre I' }, name: { en: 'The Scraping', fr: 'Le Grattage' } };
  const it = n <= 5 ? Object.values(INTERLUDES).find((i) => i.chapter.n === n) : undefined;
  if (it) return { title: it.chapter.title, name: it.chapter.name };
  return { title: { en: 'Explicit', fr: 'Explicit' }, name: { en: 'Here ends the Book of the Mercy', fr: 'Ici finit le Livre de la Miséricorde' } };
}

type Rule = [when: (g: GameState) => boolean, say: LocalText];

const flag = (g: GameState, f: string) => !!g.flags[f];
const won = (g: GameState, id: string) => g.cleared.includes(id);

/** For each map, the first rule that holds says what to do; the last has no condition. */
const BY_MAP: Record<string, Rule[]> = {
  scriptorium: [
    [(g) => !won(g, 'f1'), { en: 'A line has been scraped from the Book tonight. If I tilt my candle over the page, the vellum may remember what was there.', fr: 'Une ligne a été grattée du Livre cette nuit. Si j’incline ma bougie sur la page, le vélin se souviendra peut-être de ce qui y était écrit.' }],
    [() => true, { en: 'The Abbot has found the scraped line, and my penknife. At the dawn bell I am to be scraped.', fr: 'L’abbé a trouvé la ligne grattée, et mon canif. À la cloche de l’aube, je dois être grattée.' }],
  ],
  cell: [
    [(g) => !flag(g, 'hildAsked'), { en: 'Locked in the penitent’s cell until dawn. Someone is breathing on the other side of the squint.', fr: 'Enfermée dans la cellule du pénitent jusqu’à l’aube. Quelqu’un respire de l’autre côté de l’hagioscope.' }],
    [(g) => !flag(g, 'hildJoined'), { en: 'This wall was a doorway once; the candle shows the arch. The anchoress says she can open it.', fr: 'Ce mur était une porte autrefois ; la bougie en montre l’arche. La recluse dit qu’elle peut l’ouvrir.' }],
    [() => true, { en: 'Out, before the Brothers come back with the key.', fr: 'Dehors, avant que les Frères ne reviennent avec la clé.' }],
  ],
  cloister: [
    [(g) => !won(g, 'f2'), { en: 'Pumice Brothers in the cloister. We have to get past them.', fr: 'Des Frères de la Ponce dans le cloître. Il faut passer.' }],
    [() => true, { en: 'There used to be a stair down to the Sea Gate. Someone painted over the door; the candle will find it on the wall.', fr: 'Il y avait un escalier vers la Porte de la Mer. Quelqu’un a peint par-dessus la porte ; la bougie la retrouvera sur le mur.' }],
  ],
  seaGate: [[() => true, { en: 'Down the causeway, before the tide closes it.', fr: 'Descendre la chaussée, avant que la marée ne la ferme.' }]],
  lane: [
    [(g) => !won(g, 'f3'), { en: 'Lychford Lane. At the end of it is the village where no one has died in ten years.', fr: 'Le chemin de Lychford. Au bout, le village où personne n’est mort depuis dix ans.' }],
    [() => true, { en: 'On into Lychford. A field track climbs north through the gap in the hedge, towards a mill on the fen.', fr: 'Continuer jusqu’à Lychford. Un chemin de champ monte vers le nord par la trouée de la haie, vers un moulin sur le marais.' }],
  ],
  mill: [
    [(g) => !won(g, 's1'), { en: 'The Fen Mill. Lights move over the frozen pond, and someone is working on the roof in the dark.', fr: 'Le moulin du marais. Des lumières bougent sur la mare gelée, et quelqu’un travaille sur le toit dans le noir.' }],
    [(g) => !flag(g, 'returned.edda') && !g.lostNames.includes('edda'), { en: 'Ralf’s hands know thatching, and he doesn’t know who taught them. Somebody in Lychford must remember.', fr: 'Les mains de Ralf savent couvrir un toit, et il ne sait pas qui le leur a appris. Quelqu’un à Lychford doit s’en souvenir.' }],
    [(g) => !flag(g, 'returned.edda'), { en: 'Edda’s name was on the thatcher’s house. Ralf should hear it.', fr: 'Le nom d’Edda était sur la maison du couvreur. Ralf devrait l’entendre.' }],
    [() => true, { en: 'Ralf is down from the roof. Back to the lane, and on to Lychford.', fr: 'Ralf est descendu du toit. Retour au chemin, et en route pour Lychford.' }],
  ],
  village: [
    [(g) => flag(g, 'raidDone'), { en: 'Gaudry’s torches are coming across the snow for the bell. Make for the mere.', fr: 'Les torches de Gaudry traversent la neige pour la cloche. Gagner la mare gelée.' }],
    [(g) => won(g, 'b2'), { en: 'The play has ended. Something is wrong on the road from the Abbey.', fr: 'La pièce est finie. Quelque chose ne va pas sur la route de l’Abbaye.' }],
    [(g) => flag(g, 'bellRung'), { en: 'The mummers are on the green, and the play still has no ending.', fr: 'Les mimes sont sur la place, et la pièce n’a toujours pas de fin.' }],
    [() => true, { en: 'The passing bell in the tower has not rung in ten years, and Whit keeps looking up at it. The way is through the churchyard.', fr: 'Le glas de la tour n’a pas sonné depuis dix ans, et Whit ne cesse de lever les yeux vers lui. On y passe par le cimetière.' }],
  ],
  churchyard: [
    [(g) => flag(g, 'bellRung'), { en: 'Back to the village green.', fr: 'Retourner sur la place du village.' }],
    [(g) => !won(g, 'f4'), { en: 'No grave here is newer than ten years. The tower is beyond the lych-gate.', fr: 'Aucune tombe ici n’a moins de dix ans. La tour est derrière le porche.' }],
    [() => true, { en: 'Up into the bell tower.', fr: 'Monter dans le clocher.' }],
  ],
  belltower: [
    [(g) => !flag(g, 'bellRung'), { en: 'Ring the passing bell. The children’s skipping rhyme gives the order of the ropes.', fr: 'Sonner le glas. La comptine des enfants donne l’ordre des cordes.' }],
    [() => true, { en: 'The bell has spoken. Down to the village.', fr: 'La cloche a parlé. Redescendre au village.' }],
  ],
  mere: [[() => true, { en: 'Across the frozen mere. The old ford is still under the ice; the candle shows where it holds.', fr: 'Traverser la mare gelée. Le vieux gué est encore sous la glace ; la bougie montre où elle tient.' }]],
  wood: [
    [(g) => won(g, 'f5') && !flag(g, 'hollowSeen'), { en: 'The wood loses its colour as we go, but a thread of smoke rises south of the path, where nobody should be. The chapel is past Ninefold.', fr: 'Le bois perd ses couleurs à mesure qu’on avance, mais un fil de fumée monte au sud du chemin, là où il ne devrait y avoir personne. La chapelle est au-delà de Ninefold.' }],
    [() => true, { en: 'The Blanchwood loses its colour as we go. The chapel where they prayed to the Reader is past Ninefold.', fr: 'La Blanchewood perd ses couleurs à mesure qu’on avance. La chapelle où l’on priait le Lecteur est au-delà de Ninefold.' }],
  ],
  hollow: [
    [(g) => !won(g, 's2'), { en: 'The Charcoal Hollow. The kilns are still burning, and near them the wood keeps its colour.', fr: 'La combe aux charbonniers. Les meules brûlent encore, et près d’elles le bois garde ses couleurs.' }],
    [(g) => !flag(g, 'returned.maud') && !g.lostNames.includes('maud'), { en: 'The hermit keeps the kilns lit for someone who will want to find her way back. His old hearth was in Ninefold.', fr: 'L’ermite garde les meules allumées pour quelqu’un qui voudra retrouver son chemin. Son ancien foyer était à Ninefold.' }],
    [(g) => !flag(g, 'returned.maud'), { en: 'Maud’s name was at the hermit’s hearth. He should hear it.', fr: 'Le nom de Maud était au foyer de l’ermite. Il devrait l’entendre.' }],
    [() => true, { en: 'The hermit has sat down at last. Back to the path, and on to Ninefold.', fr: 'L’ermite s’est enfin assis. Retour au chemin, et en route pour Ninefold.' }],
  ],
  ninefold: [
    [(g) => g.lostNames.includes('maud') && flag(g, 'hermitMet') && !flag(g, 'returned.maud'), { en: 'Maud of the mill. The hermit at the kilns kept a fire for someone; back through the wood, he should hear this name.', fr: 'Maud du moulin. L’ermite des meules gardait un feu pour quelqu’un ; en retournant par le bois, il devrait entendre ce nom.' }],
    [() => true, { en: 'The road has faded to bare vellum. The candle shows where it used to run.', fr: 'La route s’est effacée jusqu’au vélin nu. La bougie montre où elle passait.' }],
  ],
  gate: [
    [(g) => !won(g, 'f6'), { en: 'Gaudry and Ermeline are waiting at Ninefold Gate.', fr: 'Gaudry et Ermeline attendent à la porte de Ninefold.' }],
    [() => true, { en: 'Ermeline is scraping the wood behind us. Run for the chapel.', fr: 'Ermeline gratte la forêt derrière nous. Courir jusqu’à la chapelle.' }],
  ],
  flight: [[() => true, { en: 'Run. The blank is coming through the trees.', fr: 'Courir. Le blanc arrive à travers les arbres.' }]],
  chapel: [
    [(g) => !flag(g, 'muralRestored'), { en: 'On the chapel wall every living figure is led by a Death, and the order is wrong. Put the dance right.', fr: 'Sur le mur de la chapelle, chaque vivant est mené par une Mort, et l’ordre est faux. Remettre la danse en ordre.' }],
    [() => true, { en: 'The ossuary stair is open. Down.', fr: 'L’escalier de l’ossuaire est ouvert. Descendre.' }],
  ],
  ossuary: [[() => true, { en: 'The dancers are waiting for the one who should lead them.', fr: 'Les danseurs attendent celui qui devrait les mener.' }]],
  edge: [[() => true, { en: 'The world runs out at the edge of the page. Below it is the Margin.', fr: 'Le monde s’arrête au bord de la page. En dessous, il y a la Marge.' }]],
  ivy: [
    [(g) => !won(g, 'f7'), { en: 'Something white is sitting on the Ivy Gate, watching us.', fr: 'Quelque chose de blanc est perché sur la porte du Lierre, et nous regarde.' }],
    [() => true, { en: 'The arches are labelled with catchwords. Read in the right order, they make a sentence.', fr: 'Les arches portent des réclames. Lues dans le bon ordre, elles font une phrase.' }],
  ],
  fair: [
    [(g) => flag(g, 'amabelScraped') && !flag(g, 'amabelFound'), { en: 'The Drollery Fair. There is a little brown hen here who keeps looking at me.', fr: 'La foire aux drôleries. Il y a ici une petite poule brune qui ne cesse de me regarder.' }],
    [(g) => g.lostNames.includes('cutha') && !flag(g, 'returned.cutha'), { en: 'Old Cutha told his bees everything. There is a skep in the lanes behind the Fair; somebody should tell them.', fr: 'Le vieux Cutha racontait tout à ses abeilles. Il y a une ruche dans les ruelles derrière la foire ; il faudrait le leur dire.' }],
    [() => true, { en: 'The Abbot of Unreason says the old ape on the vine knows the way down. Between two stalls at the bottom of the Fair, a way leads round the back.', fr: 'L’Abbé de Déraison dit que le vieux singe de la vigne connaît le chemin du fond. Entre deux étals, au bas de la foire, un passage mène derrière.' }],
  ],
  lanes: [
    [(g) => !won(g, 's3'), { en: 'Behind the Fair: a copying stall, and copyists who copy whatever is done to them.', fr: 'Derrière la foire : un étal de copistes, qui recopient tout ce qu’on leur fait.' }],
    [(g) => !flag(g, 'returned.cutha') && !g.lostNames.includes('cutha'), { en: 'The bees in the skep have had nobody to tell them anything. The Court of Unreason keeps a name in its alcove.', fr: 'Les abeilles de la ruche n’ont eu personne pour leur dire quoi que ce soit. La Cour de Déraison garde un nom dans son alcôve.' }],
    [(g) => !flag(g, 'returned.cutha'), { en: 'Tell the bees about Old Cutha.', fr: 'Annoncer le vieux Cutha aux abeilles.' }],
    [() => true, { en: 'The bees are busy again. Back to the Fair, and on to the vine.', fr: 'Les abeilles se sont remises au travail. Retour à la foire, et en route pour la vigne.' }],
  ],
  vine: [[() => true, { en: 'Wystan is on the vine.', fr: 'Wystan est sur la vigne.' }]],
  inkwell: [[() => true, { en: 'The Ink-Well, at the bottom of the Margin, where every scraped name drains.', fr: 'Le Puits d’encre, au fond de la Marge, où s’écoule chaque nom gratté.' }]],
  dawnScriptorium: [
    [(g) => g.lostNames.includes('osric') && !flag(g, 'returned.osric'), { en: 'Cuthwin is humming the Amen, flat. Brother Osric’s name was on the cloister wall.', fr: 'Cuthwin fredonne l’Amen, trop bas. Le nom de frère Osric était sur le mur du cloître.' }],
    [() => true, { en: 'MERCY has tolled once. The lectern is bare: he has taken the Book into the church. His lodging is off the cloister.', fr: 'MERCY a sonné une fois. Le lutrin est vide : il a porté le Livre dans l’église. Son logis donne sur le cloître.' }],
  ],
  undercroft: [
    [(g) => !won(g, 's4'), { en: 'A Brother sweeps the vault with three hounds at his feet. He is scraped clean: write him back, a letter at a time.', fr: 'Un Frère balaie la crypte, trois chiens à ses pieds. Il est gratté net : le réécrire, une lettre à la fois.' }],
    [(g) => !won(g, 's5'), { en: 'Two knights written over something older keep the inner bays.', fr: 'Deux chevaliers écrits par-dessus quelque chose de plus ancien gardent les baies du fond.' }],
    [(g) => !won(g, 'b6'), { en: 'At the far end, the Heap is trying to say a word. Let it finish, and read it.', fr: 'Au fond, le Tas essaie de dire un mot. Le laisser finir, et le lire.' }],
    [() => true, { en: 'They have all answered. Back up to the scriptorium, and on to the church.', fr: 'Ils ont tous répondu. Remonter au scriptorium, et en route pour l’église.' }],
  ],
  lodging: [
    [(g) => !flag(g, 'hoursSeen'), { en: 'The Abbot’s lodging. His Book of Hours is open on the desk.', fr: 'Le logis de l’abbé. Son livre d’heures est ouvert sur le pupitre.' }],
    [() => true, { en: 'To the church, through the cloister.', fr: 'À l’église, par le cloître.' }],
  ],
  dawnCloister: [
    [(g) => !won(g, 'f9'), { en: 'Gaudry holds the garth between us and the church.', fr: 'Gaudry tient le préau entre nous et l’église.' }],
    [() => true, { en: 'The church door is open.', fr: 'La porte de l’église est ouverte.' }],
  ],
  nave: [
    [(g) => flag(g, 'ended'), { en: 'Finis.', fr: 'Finis.' }],
    [(g) => !won(g, 'b5'), { en: 'Up the nave to the high altar, ahead of the tolls.', fr: 'Remonter la nef jusqu’au maître-autel, avant les glas.' }],
    [() => true, { en: 'Read them. All of them.', fr: 'Les lire. Tous.' }],
  ],
};

/** The current objective, in Isot's words. */
export function objective(g: GameState): LocalText {
  if (g.flags.finished) return { en: 'I keep the Book of Names now, and I leave room at the end of each line.', fr: 'Je tiens le Livre des Noms, à présent, et je laisse de la place au bout de chaque ligne.' };
  const rules = BY_MAP[g.map];
  const hit = rules?.find(([when]) => when(g));
  return hit ? hit[1] : { en: 'Onward.', fr: 'En avant.' };
}

/** Every map the Journal knows, for the tests. */
export const JOURNAL_MAPS = Object.keys(BY_MAP);
