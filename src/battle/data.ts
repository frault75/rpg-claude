/** Abilities, enemies and encounters (DESIGN.md §4.6, §4.10, §4.11). */

import type { LocalText } from '../i18n/i18n';
import type { CharId } from '../story/state';
import type { AbilityDef, AbilityId, IntentEffect, Target } from './types';

export const ABILITIES: Record<AbilityId, AbilityDef> = {
  penknife: { id: 'penknife', name: { en: 'Penknife', fr: 'Canif' }, owner: 'isot', target: 'enemy', text: { en: '2 damage to any enemy.', fr: '2 dégâts à n’importe quel ennemi.' } },
  gloss: { id: 'gloss', name: { en: 'Gloss', fr: 'Glose' }, owner: 'isot', target: 'enemy', text: { en: 'Reveal its intent; the next damage it takes is +3.', fr: 'Révèle son intention ; les prochains dégâts qu’il subit sont +3.' } },
  strike: { id: 'strike', name: { en: 'Strike Through', fr: 'Biffure' }, owner: 'isot', ink: 2, target: 'intent', text: { en: 'Cancel one enemy intent this round.', fr: 'Annule une intention ennemie ce tour-ci.' } },
  emend: { id: 'emend', name: { en: 'Emend', fr: 'Amender' }, owner: 'isot', ink: 1, target: 'intent', text: { en: 'Turn a single blow onto another ally.', fr: 'Détourne un coup unique sur un autre allié.' } },
  rubric: { id: 'rubric', name: { en: 'Rubric', fr: 'Rubrique' }, owner: 'isot', ink: 1, target: 'ally', text: { en: 'An ally’s next ability this round is doubled.', fr: 'La prochaine capacité d’un allié ce tour-ci est doublée.' } },
  shove: { id: 'shove', name: { en: 'Shove', fr: 'Bousculer' }, owner: 'hild', target: 'none', fromFront: true, text: { en: '2 damage to the 1st enemy, then push it to the back.', fr: '2 dégâts au 1er ennemi, puis le repousse au fond.' } },
  shrive: { id: 'shrive', name: { en: 'Shrive', fr: 'Absoudre' }, owner: 'hild', hp: 3, target: 'fallenOrAlly', text: { en: 'An ally regains 6 HP, or a fallen ally rises with 6.', fr: 'Un allié regagne 6 PV, ou un allié tombé se relève avec 6.' } },
  immure: { id: 'immure', name: { en: 'Immure', fr: 'Emmurer' }, owner: 'hild', hp: 2, target: 'anyUnit', text: { en: 'Wall in any unit until the round ends.', fr: 'Emmure n’importe qui jusqu’à la fin du tour.' } },
  squint: { id: 'squint', name: { en: 'Squint', fr: 'Hagioscope' }, owner: 'hild', target: 'none', text: { en: 'Reveal hidden intents, and next round’s.', fr: 'Révèle les intentions cachées, et celles du tour suivant.' } },
  benison: { id: 'benison', name: { en: 'Benison', fr: 'Bénédiction' }, owner: 'hild', target: 'none', oncePerBattle: true, text: { en: 'All allies regain 5 HP and gain Ward 3.', fr: 'Tous les alliés regagnent 5 PV et gagnent Garde 3.' } },
  lance: { id: 'lance', name: { en: 'Lance', fr: 'Lance' }, owner: 'whit', target: 'enemy', fromFront: true, reachEnemy: 2, text: { en: '4 damage to the 1st or 2nd enemy.', fr: '4 dégâts au 1er ou au 2e ennemi.' } },
  tally: { id: 'tally', name: { en: 'Tally', fr: 'Décompte' }, owner: 'whit', target: 'enemy', text: { en: 'Set Tally 3: at 0, a Reckoning of 7.', fr: 'Pose un Décompte de 3 : à 0, le Règlement inflige 7.' } },
  vigil: { id: 'vigil', name: { en: 'Vigil', fr: 'Veille' }, owner: 'whit', target: 'none', fromFront: true, text: { en: 'The first enemy to strike an ally is struck first, for 4.', fr: 'Le premier ennemi qui frappe un allié est frappé avant, pour 4.' } },
  read: { id: 'read', name: { en: 'Read Aloud', fr: 'Lire à voix haute' }, owner: 'whit', target: 'enemy', text: { en: 'End an enemy with 6 HP or fewer.', fr: 'Achève un ennemi à 6 PV ou moins.' } },
};

export const PARTY_STATS: Record<CharId, { name: LocalText; hp: number }> = {
  isot: { name: { en: 'Isot', fr: 'Isot' }, hp: 12 },
  hild: { name: { en: 'Hild', fr: 'Hild' }, hp: 22 },
  whit: { name: { en: 'Whit', fr: 'Whit' }, hp: 18 },
};

/** What an enemy means to do; the engine adds ids and order. */
export interface IntentSpec {
  label: LocalText;
  target: Target;
  damage?: number;
  reach?: 'close' | 'far' | 'any';
  effects?: IntentEffect[];
  /** A wind-up: it strikes after this many more rounds (shown "in n"). */
  countdown?: number;
}

export interface BehaviourCtx {
  round: number;
  /** The enemy's own pattern counter (advances each round it plans). */
  phase: number;
  hp: number;
  maxHp: number;
  /** Standing allies of the enemy (other than itself), with their HP. */
  allies: { id: string; name: LocalText; hp: number; maxHp: number }[];
  rng: () => number;
}

export interface EnemyDef {
  name: LocalText;
  hp: number;
  size?: number;
  hidden?: boolean;
  readOnly?: boolean;
  behave(ctx: BehaviourCtx): IntentSpec[];
}

export const ENEMIES: Record<string, EnemyDef> = {
  gryllus: {
    name: { en: 'Gryllus', fr: 'Grylle' },
    hp: 4,
    behave: () => [{ label: { en: 'Butts the Front · 2', fr: 'Cogne l’Avant · 2' }, target: { place: 0 }, damage: 2, reach: 'close' }],
  },
  brother: {
    name: { en: 'Pumice Brother', fr: 'Frère de la Ponce' },
    hp: 9,
    behave: (c) => {
      const hurt = c.allies.filter((a) => a.hp < a.maxHp).sort((a, b) => a.hp - b.hp)[0];
      if (c.phase % 3 === 2 && hurt)
        return [
          {
            label: { en: `Holds the line: ${hurt.name.en} gains Ward 3`, fr: `Tient la ligne : ${hurt.name.fr} gagne Garde 3` },
            target: { unit: hurt.id },
            effects: [{ kind: 'wardAlly', amount: 3 }],
            reach: 'any',
          },
        ];
      if (c.phase % 2 === 0)
        return [{ label: { en: 'Scours the Front · 3, strips Ward', fr: 'Récure l’Avant · 3, ôte la Garde' }, target: { place: 0 }, damage: 3, reach: 'close', effects: [{ kind: 'stripWard' }] }];
      return [{ label: { en: 'Rasps at the Rear: Smudge', fr: 'Râpe l’Arrière : Bavure' }, target: { place: 2 }, damage: 0, reach: 'far', effects: [{ kind: 'smudge' }] }];
    },
  },
  hare: {
    name: { en: 'Marginal Hare', fr: 'Lièvre des marges' },
    hp: 5,
    behave: (c) =>
      c.phase % 3 === 2
        ? [{ label: { en: 'Bounds to the back', fr: 'Bondit au fond' }, target: { self: true }, effects: [{ kind: 'toBack' }], reach: 'any' }]
        : [{ label: { en: 'Looses an arrow at the Rear · 3', fr: 'Décoche une flèche sur l’Arrière · 3' }, target: { place: 2 }, damage: 3, reach: 'far' }],
  },
  babewyn: {
    name: { en: 'Babewyn', fr: 'Babouin' },
    hp: 10,
    behave: () => [
      { label: { en: 'Bites the Front · 3', fr: 'Mord l’Avant · 3' }, target: { place: 0 }, damage: 3, reach: 'close' },
      { label: { en: 'Spits at the Middle · 2', fr: 'Crache sur le Milieu · 2' }, target: { place: 1 }, damage: 2, reach: 'far' },
    ],
  },
  snail: {
    name: { en: 'Snail', fr: 'Escargot' },
    hp: 6,
    behave: (c) =>
      c.phase % 2 === 0
        ? [{ label: { en: 'Creeps: Front · 2', fr: 'Rampe : Avant · 2' }, target: { place: 0 }, damage: 2, reach: 'close', effects: [{ kind: 'unshell' }] }]
        : [{ label: { en: 'Withdraws into its shell', fr: 'Rentre dans sa coquille' }, target: { self: true }, effects: [{ kind: 'shell' }], reach: 'any' }],
  },
  wodewose: {
    name: { en: 'Wodewose', fr: 'Homme sauvage' },
    hp: 16,
    behave: (c) =>
      c.phase % 2 === 0
        ? [{ label: { en: 'Gathers itself to club the Front · 9', fr: 'Se ramasse pour assommer l’Avant · 9' }, target: { place: 0 }, damage: 9, reach: 'close', countdown: 1 }]
        : [{ label: { en: 'Roars: the party’s Ward is stripped', fr: 'Rugit : la Garde du groupe tombe' }, target: { all: true }, effects: [{ kind: 'stripWard' }], reach: 'any' }],
  },
  greatSnail: {
    name: { en: 'The Great Snail', fr: 'Le Grand Escargot' },
    hp: 24,
    size: 2,
    behave: (c) => {
      const k = c.phase % 3;
      if (k === 0)
        return [{ label: { en: 'Horns out: lashes the Front · 5', fr: 'Cornes dehors : fouette l’Avant · 5' }, target: { place: 0 }, damage: 5, reach: 'close', effects: [{ kind: 'unshell' }] }];
      if (k === 1)
        return [
          { label: { en: 'Withdraws into its shell', fr: 'Rentre dans sa coquille' }, target: { self: true }, effects: [{ kind: 'shell' }], reach: 'any' },
          { label: { en: 'Gathers the tide… (next: everyone · 3)', fr: 'Appelle la marée… (ensuite : tous · 3)' }, target: { self: true }, reach: 'any' },
        ];
      return [{ label: { en: 'Slime tide: drenches everyone · 3', fr: 'Marée de bave : trempe tout le monde · 3' }, target: { all: true }, damage: 3, reach: 'any' }];
    },
  },
};

export interface EncounterDef {
  id: string;
  name: LocalText;
  party: CharId[];
  enemies: string[];
  /** An environment intent for a round, if any (the tide). */
  env?: (round: number) => IntentSpec | null;
  /** Where the fight is drawn. */
  stage: string;
}

export const ENCOUNTERS: Record<string, EncounterDef> = {
  f1: { id: 'f1', name: { en: 'Grylli in the margin', fr: 'Grylles dans la marge' }, party: ['isot'], enemies: ['gryllus', 'gryllus'], stage: 'scriptorium' },
  f2: { id: 'f2', name: { en: 'The Pumice Brothers', fr: 'Les Frères de la Ponce' }, party: ['hild', 'isot'], enemies: ['brother', 'brother'], stage: 'cloister' },
  b1: {
    id: 'b1',
    name: { en: 'The Great Snail of the Causeway', fr: 'Le Grand Escargot de la chaussée' },
    party: ['whit', 'hild', 'isot'],
    enemies: ['greatSnail'],
    stage: 'causeway',
    env: (round) =>
      round % 3 === 0 ? { label: { en: 'The tide: a wave breaks over the Front · 2', fr: 'La marée : une vague brise sur l’Avant · 2' }, target: { place: 0 }, damage: 2, reach: 'any' } : null,
  },
};

/** Abilities known at the start of chapter I (more unlock with the story). */
export const CHAPTER_ONE_ABILITIES: Record<CharId, AbilityId[]> = {
  isot: ['penknife', 'gloss', 'strike'],
  hild: ['shove', 'shrive'],
  whit: ['lance', 'tally'],
};
