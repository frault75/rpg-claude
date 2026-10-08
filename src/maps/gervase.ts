/**
 * Gervase, the pedlar of ribbons (DESIGN.md §6.3): one of the Lost Names, a man of Ninefold
 * scraped a hundred and fifty years ago who never stopped walking. He sets his stall down
 * on Lychford Lane, at the Wood's Edge and at the Drollery Fair, a little fainter each
 * time. Once his name has been found at the hermit's hearth, Isot can read it back to him.
 */

import { session } from '../engine/session';
import { CHARACTERS, type Dir } from '../pixel/characters';
import type { MapContext, NpcDef, Thing } from './types';

type Stall = 'lane' | 'woodsEdge' | 'fair';

/** How faint he is at each stall; a name read back brings him most of the way home. */
const FRAY: Record<Stall, number> = { lane: 0.18, woodsEdge: 0.38, fair: 0.55 };

const named = () => !!session.game.flags.gervaseNamed;

/** Gervase at one of his stalls: the figure, and talking to him. */
export function pedlar(stall: Stall, x: number, y: number, dir: Dir): { npc: NpcDef; thing: Thing } {
  return {
    npc: {
      id: 'gervase',
      speaker: 'pedlar',
      spec: CHARACTERS.gervase!,
      x,
      y,
      dir,
      get fray() {
        return named() ? 0.1 : FRAY[stall];
      },
    },
    thing: { id: 'gervase', x, y, h: 30, reach: 30, run: (c) => meet(c, stall) },
  };
}

async function meet(c: MapContext, stall: Stall): Promise<void> {
  const met = `gervase.${stall}`;
  const who = named() ? 'gervase' : 'pedlar';
  if (!c.flag(met)) {
    c.set(met);
    if (stall === 'lane') await onTheLane(c);
    else if (stall === 'woodsEdge') await atTheWoodsEdge(c);
    else await atTheFair(c);
  } else if (stall === 'fair' && !named() && session.game.lostNames.includes('gervase')) await atTheFair(c);
  else
    await c.say(
      who,
      named()
        ? { en: 'Gervase, at your service. Say it again, would you? I like the sound.', fr: 'Gervais, pour vous servir. Redites-le, voulez-vous ? J’aime bien comment ça sonne.' }
        : { en: 'Back again? The road is long and the satchel is short.', fr: 'Encore vous ? La route est longue et la besace est courte.' },
    );
  c.close();
  await c.shop(stall);
}

async function onTheLane(c: MapContext): Promise<void> {
  await c.narrate({ en: 'A pedlar is knotting a ribbon to the wayside cross. His pack is all ribbons, faded the way washing fades on a line.', fr: 'Un colporteur noue un ruban à la croix du chemin. Son ballot n’est que rubans, passés comme passe le linge sur une corde.' });
  await c.say('pedlar', { en: 'Ten. One for every year. Somebody has to keep count, and the village won’t.', fr: 'Dix. Un par année. Il faut bien que quelqu’un compte, et le village ne le fait plus.' });
  await c.say('isot', { en: 'Who are you?', fr: 'Qui êtes-vous ?' });
  await c.say('pedlar', { en: 'A pedlar. Ribbons, mostly, and whatever the road gives me to carry. I’d tell you my name, but I’ve walked it clean off.', fr: 'Un colporteur. Des rubans, surtout, et ce que la route me donne à porter. Je vous dirais bien mon nom, mais je l’ai usé à force de marcher.' });
  if (c.party.length > 1) await c.say('whit', { en: 'So have I.', fr: 'Moi aussi.' });
  await c.say('pedlar', { en: 'Then we’ll be nameless together. Will you buy? Pennies are only metal until they’re spent.', fr: 'Alors soyons sans nom ensemble. Vous m’achetez quelque chose ? Les deniers ne sont que du métal tant qu’on ne les dépense pas.' });
}

async function atTheWoodsEdge(c: MapContext): Promise<void> {
  await c.narrate({ en: 'The pedlar again, at the edge of the white wood. The colour has gone out of his ribbons, and a little out of him.', fr: 'Le colporteur encore, à la lisière du bois blanc. La couleur a quitté ses rubans, et un peu lui-même.' });
  await c.say('pedlar', { en: 'I came the other way round. I always do. Every road twice: once to sell, and once to see how the ribbons were worn.', fr: 'Je suis venu par l’autre côté. Toujours. Chaque route deux fois : une pour vendre, une pour voir comment on porte les rubans.' });
  await c.say('isot', { en: 'You look… paler.', fr: 'Vous avez l’air… plus pâle.' }, 'alarmed');
  await c.say('pedlar', { en: 'The wood does that. It forgets what it’s looking at. Buy something quickly, before it forgets me.', fr: 'Le bois fait ça. Il oublie ce qu’il regarde. Achetez vite, avant qu’il m’oublie.' });
  await c.say('hild', { en: 'Nobody is forgetting you while I’m stood here.', fr: 'Personne ne vous oublie tant que je suis là.' }, 'stern');
}

async function atTheFair(c: MapContext): Promise<void> {
  if (!c.flag('gervase.fairMet')) {
    c.set('gervase.fairMet');
    await c.narrate({ en: 'Between the stalls of the Drollery Fair, a pack of ribbons. The pedlar is nearly as faint as the Court of Unreason around him.', fr: 'Entre les étals de la foire aux drôleries, un ballot de rubans. Le colporteur est presque aussi pâle que la Cour de Déraison autour de lui.' });
    await c.say('pedlar', { en: 'They let me trade here. They think I’m one of them. Perhaps I am.', fr: 'Ils me laissent vendre ici. Ils croient que je suis des leurs. Peut-être que je le suis.' });
  }
  if (!session.game.lostNames.includes('gervase')) {
    await c.say('pedlar', { en: 'There’s a name somewhere in Ninefold with my shape. If you ever find it, only tell me if it’s kind.', fr: 'Il y a quelque part à Ninefold un nom qui a ma forme. Si vous le trouvez un jour, ne me le dites que s’il est doux.' });
    return;
  }
  const pick = await c.choose([
    { en: 'Read him his name.', fr: 'Lui lire son nom.' },
    { en: 'Not yet.', fr: 'Pas encore.' },
  ]);
  if (pick !== 0) return;
  await c.say('isot', { en: 'I found you. At the hermit’s hearth in Ninefold, under the soot. “A pedlar of ribbons, who walked every road twice.”', fr: 'Je vous ai trouvé. Au foyer de l’ermite, à Ninefold, sous la suie. « Un colporteur de rubans, qui parcourut chaque route deux fois. »' }, 'sad');
  await c.say('isot', { en: 'Gervase.', fr: 'Gervais.' });
  c.set('gervaseNamed');
  c.npc('gervase').sprite.fray = 0.1;
  c.flash(0.4);
  await c.narrate({ en: 'The colour comes back into his ribbons all at once, rose and woad and weld, the way a field comes back when a cloud goes off it.', fr: 'La couleur revient d’un coup dans ses rubans, rose, guède et gaude, comme un champ revient quand un nuage s’en va.' });
  await c.say('gervase', { en: 'Gervase. My mother sold eggs beside my stall at Ninefold fair. She called me in at dusk by that name.', fr: 'Gervais. Ma mère vendait des œufs à côté de mon étal, à la foire de Ninefold. C’est ce nom-là qu’elle criait au crépuscule.' });
  await c.say('gervase', { en: 'Every road twice. Once to sell, and once to see the ribbons worn: in a girl’s hair, on a bridle, round a baby’s wrist at a christening. I’d forgotten that was why.', fr: 'Chaque route deux fois. Une pour vendre, une pour voir les rubans portés : dans les cheveux d’une fille, à une bride, au poignet d’un bébé qu’on baptise. J’avais oublié que c’était pour ça.' });
  await c.say('gervase', { en: 'Here. The last one. I was keeping it for whoever said my name. I didn’t know I was keeping it.', fr: 'Tenez. Le dernier. Je le gardais pour qui dirait mon nom. Je ne savais pas que je le gardais.' });
  await c.find('gervasesRibbon');
  if (c.party.some((a) => a.id === 'whit')) await c.say('whit', { en: 'When his time comes, I will read it to him again. He will have heard it twice.', fr: 'Quand son heure viendra, je le lui lirai encore. Il l’aura entendu deux fois.' });
  await c.say('gervase', { en: 'And a quarter off, from now on. Don’t tell the geese.', fr: 'Et un quart de moins, désormais. N’en dites rien aux oies.' });
}
