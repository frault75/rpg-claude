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
  rule?: LocalText;
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
  /** Its own place in the enemy line. */
  place: number;
  /** Standing allies of the enemy (other than itself), with their HP and places. */
  allies: { id: string; kind: string; name: LocalText; hp: number; maxHp: number; place: number }[];
  /** The party as it stands. */
  party: { id: string; name: LocalText; hp: number; maxHp: number; place: number }[];
  /** Fallen allies, nearest first. */
  fallen: { id: string; kind: string; name: LocalText }[];
  rng: () => number;
}

export interface EnemyDef {
  name: LocalText;
  hp: number;
  size?: number;
  hidden?: boolean;
  readOnly?: boolean;
  /** Blows from the party pass through it (the Danse Macabre's followers). */
  hollow?: boolean;
  /** When it falls, every enemy bound to it falls too (the dance ends; the ink drains). */
  leads?: boolean;
  /** Falls with whoever leads. */
  bound?: boolean;
  /** A single hit of this much or more splits off one of these into an empty place (the Blot). */
  splits?: { at: number; into: string };
  /** Isot's Penknife fills her pen when it hits one: +1 Ink (Blotlets). */
  inkwell?: boolean;
  /** At this HP or below, a phase change (announced once). */
  phaseAt?: { hp: number; id: string; title: LocalText; line: LocalText };
  behave(ctx: BehaviourCtx): IntentSpec[];
}

// The Danse Macabre's figures (DESIGN.md §5.14).
const HAND: IntentSpec = {
  label: { en: 'Takes the hand of the Front · 3, and leads them back', fr: 'Prend la main de l’Avant · 3, et l’entraîne en arrière' },
  rule: { en: 'Then the Front and the Middle swap', fr: 'Puis l’Avant et le Milieu échangent' },
  target: { place: 0 },
  damage: 3,
  reach: 'any',
  effects: [{ kind: 'swapFrontMiddle' }],
};
const WHIRL: IntentSpec = { label: { en: 'Whirls: the Middle and the Rear · 2', fr: 'Tournoie : le Milieu et l’Arrière · 2' }, target: { places: [1, 2] }, damage: 2, reach: 'any' };
const BOW: IntentSpec = { label: { en: 'Bows to the empty place', fr: 'S’incline devant la place vide' }, target: { self: true }, reach: 'any' };
const TUNE: IntentSpec = {
  label: { en: 'Calls the tune', fr: 'Donne le ton' },
  rule: { en: 'Every dancer acts twice next round', fr: 'Chaque danseur agit deux fois au prochain tour' },
  target: { self: true },
  reach: 'any',
  effects: [{ kind: 'tune' }],
};
const dancer = (name: LocalText, offset: number): EnemyDef => ({ name, hp: 8, hidden: true, hollow: true, bound: true, behave: (c) => [[HAND], [WHIRL], [BOW]][(c.phase + offset) % 3]! });

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
  george: {
    name: { en: 'Saint George', fr: 'Saint Georges' },
    hp: 12,
    behave: (c) => {
      const doctor = c.allies.find((a) => a.kind === 'doctor');
      if (c.phase % 2 === 1 && doctor)
        return [
          {
            label: { en: '“Stand back! The Doctor’s under my care.”', fr: '« Arrière ! Le Docteur est sous ma garde. »' },
            rule: { en: 'Guards the Doctor: he can’t be targeted', fr: 'Garde le Docteur : impossible à cibler' },
            target: { unit: doctor.id },
            effects: [{ kind: 'guard' }],
            reach: 'any',
          },
        ];
      return [
        {
          label: { en: '“Here comes I, Saint George; I’ll smite the foremost if I can!”', fr: '« Me voici, saint Georges ; je frappe le premier qui vient ! »' },
          rule: { en: 'Front · 4', fr: 'Avant · 4' },
          target: { place: 0 },
          damage: 4,
          reach: 'close',
        },
      ];
    },
  },
  slasher: {
    name: { en: 'Bold Slasher', fr: 'Le Hardi Tranchant' },
    hp: 10,
    behave: (c) =>
      c.phase % 2 === 0
        ? [{ label: { en: '“I’m Bold Slasher, sharp of blade!”', fr: '« Je suis le Hardi Tranchant, lame affûtée ! »' }, rule: { en: 'Slashes the Middle · 3', fr: 'Taille le Milieu · 3' }, target: { place: 1 }, damage: 3, reach: 'close' }]
        : [{ label: { en: '“Then catch my sword, and catch it well!”', fr: '« Alors attrape mon épée, et attrape-la bien ! »' }, rule: { en: 'Hurls his blade at the Rear · 3', fr: 'Lance sa lame sur l’Arrière · 3' }, target: { place: 2 }, damage: 3, reach: 'far' }],
  },
  doctor: {
    name: { en: 'Doctor Ball', fr: 'Docteur Ball' },
    hp: 8,
    behave: (c) => {
      const down = c.fallen[0];
      if (down)
        return [
          {
            label: { en: '“A little bottle by my side: the fellow’s up who should have died!”', fr: '« Une fiole à mon côté : debout, celui qui devait trépasser ! »' },
            rule: { en: `Raises ${down.name.en} at full HP`, fr: `Relève ${down.name.fr}, tous PV` },
            target: { unit: down.id },
            effects: [{ kind: 'raise' }],
            reach: 'any',
          },
        ];
      const patient = c.allies.find((a) => a.kind === 'george') ?? c.allies[0];
      if (!patient) return [{ label: { en: '“Physician, heal thyself!”', fr: '« Médecin, guéris-toi toi-même ! »' }, rule: { en: 'Heals himself · 4', fr: 'Se soigne · 4' }, target: { self: true }, effects: [{ kind: 'heal', amount: 4 }], reach: 'any' }];
      return [
        {
          label: { en: '“A dose of this, and up you get!”', fr: '« Une goutte de ceci, et te voilà debout ! »' },
          rule: { en: `Doses ${patient.name.en}: heals 4`, fr: `Soigne ${patient.name.fr} : 4` },
          target: { unit: patient.id },
          effects: [{ kind: 'heal', amount: 4 }],
          reach: 'any',
        },
      ];
    },
  },
  gaudry: {
    name: { en: 'Prior Gaudry', fr: 'Prieur Gaudry' },
    hp: 18,
    // His edicts come sealed: Squint reads them.
    hidden: true,
    behave: (c) =>
      c.phase % 2 === 0
        ? [
            {
              label: { en: 'EDICT: the Front shall kneel', fr: 'ÉDIT : que l’Avant s’agenouille' },
              rule: { en: 'Whoever stands at the Front can’t act next round', fr: 'Qui se tient à l’Avant ne peut agir au prochain tour' },
              target: { place: 0 },
              reach: 'any',
              effects: [{ kind: 'kneel' }],
            },
          ]
        : [{ label: { en: 'Brings the hammer down on the Front · 4, strips Ward', fr: 'Abat le marteau sur l’Avant · 4, ôte la Garde' }, target: { place: 0 }, damage: 4, reach: 'close', effects: [{ kind: 'stripWard' }] }],
  },
  pope: dancer({ en: 'The Pope', fr: 'Le Pape' }, 0),
  king: dancer({ en: 'The King', fr: 'Le Roi' }, 1),
  ploughman: dancer({ en: 'The Ploughman', fr: 'Le Laboureur' }, 2),
  childDancer: {
    name: { en: 'The Child', fr: 'L’Enfant' },
    hp: 24,
    hidden: true,
    leads: true,
    phaseAt: {
      hp: 12,
      id: 'emptyPlace',
      title: { en: 'The Empty Place', fr: 'La place vide' },
      line: { en: 'The ring turns toward Whit: the followers’ blows pass through him.', fr: 'La ronde se tourne vers Whit : les coups des suivants le traversent.' },
    },
    behave: (c) => [[BOW], [TUNE], [HAND]][c.phase % 3]! },
  caladrius: {
    name: { en: 'Caladrius', fr: 'Caladrius' },
    hp: 6,
    // The bird of the bestiary looks away from those about to die.
    behave: (c) => {
      const weakest = [...c.party].sort((a, b) => a.hp - b.hp || a.place - b.place)[0];
      if (c.phase % 2 === 0 && weakest)
        return [
          {
            label: { en: `Looks away from ${weakest.name.en}`, fr: `Détourne les yeux de ${weakest.name.fr}` },
            rule: { en: 'That ally takes double damage this round', fr: 'Cet allié subit le double ce tour-ci' },
            target: { unit: weakest.id },
            reach: 'any',
            effects: [{ kind: 'doom' }],
          },
        ];
      return [{ label: { en: 'Flutters: Ward 2', fr: 'Voltige : Garde 2' }, target: { self: true }, reach: 'any', effects: [{ kind: 'wardAlly', amount: 2 }] }];
    },
  },
  bishopFish: {
    name: { en: 'Bishop-fish', fr: 'Poisson-évêque' },
    hp: 8,
    behave: (c) => {
      const hurt = c.allies.filter((a) => a.hp < a.maxHp).sort((a, b) => a.hp - b.hp)[0];
      if (hurt)
        return [{ label: { en: `Blesses ${hurt.name.en}: heals 4, Ward 2`, fr: `Bénit ${hurt.name.fr} : soigne 4, Garde 2` }, target: { unit: hurt.id }, reach: 'any', effects: [{ kind: 'heal', amount: 4 }, { kind: 'wardAlly', amount: 2 }] }];
      return [{ label: { en: 'Sprinkles the Front with brine · 2', fr: 'Asperge l’Avant de saumure · 2' }, target: { place: 0 }, damage: 2, reach: 'far' }];
    },
  },
  blot: {
    name: { en: 'The Blot', fr: 'La Tache' },
    hp: 30,
    readOnly: true,
    leads: true,
    splits: { at: 4, into: 'blotlet' },
    phaseAt: {
      hp: 15,
      id: 'rasure',
      title: { en: 'The Rasure', fr: 'La Rature' },
      line: { en: 'Ermeline’s outline surfaces in the ink and scrapes at Isot’s inkhorn every round. Emend her stroke to free her.', fr: 'Le contour d’Ermeline remonte dans l’encre et gratte la corne d’Isot à chaque tour. Amendez son geste pour la libérer.' },
    },
    behave: (c) => {
      const k = c.phase % 3;
      if (k === 0) return [{ label: { en: 'Engulfs the Front · 5, and Smudges', fr: 'Engloutit l’Avant · 5, et Bave' }, rule: { en: 'Only Isot can be Smudged', fr: 'Seule Isot peut être Bavée' }, target: { place: 0 }, damage: 5, reach: 'any', effects: [{ kind: 'smudge' }] }];
      if (k === 1) return [{ label: { en: 'Wells up: a Blotlet rises', fr: 'Déborde : une Tachelette surgit' }, target: { self: true }, reach: 'any', effects: [{ kind: 'spawn', enemy: 'blotlet' }] }];
      return [{ label: { en: 'Swallows a name: heals 6', fr: 'Avale un nom : soigne 6' }, target: { self: true }, reach: 'any', effects: [{ kind: 'heal', amount: 6 }] }];
    },
  },
  blotlet: {
    name: { en: 'Blotlet', fr: 'Tachelette' },
    hp: 4,
    bound: true,
    inkwell: true,
    behave: (c) => {
      const blot = c.allies.find((a) => a.kind === 'blot');
      if (blot && Math.abs(blot.place - c.place) === 1)
        return [{ label: { en: 'Seeps back into the Blot: heals it 5', fr: 'Retourne dans la Tache : la soigne de 5' }, target: { unit: blot.id }, reach: 'any', effects: [{ kind: 'heal', amount: 5 }] }];
      return [{ label: { en: 'Spatters the Rear · 2', fr: 'Éclabousse l’Arrière · 2' }, target: { place: 2 }, damage: 2, reach: 'far' }];
    },
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
  /** An environment intent for a round, if any (the tide); `phases` holds the phase changes so far. */
  env?: (round: number, phases: ReadonlySet<string>) => IntentSpec | null;
  /** Where the fight is drawn. */
  stage: string;
}

export const ENCOUNTERS: Record<string, EncounterDef> = {
  f1: { id: 'f1', name: { en: 'Grylli in the margin', fr: 'Grylles dans la marge' }, party: ['isot'], enemies: ['gryllus', 'gryllus'], stage: 'scriptorium' },
  f2: { id: 'f2', name: { en: 'The Pumice Brothers', fr: 'Les Frères de la Ponce' }, party: ['hild', 'isot'], enemies: ['brother', 'brother'], stage: 'cloister' },
  f3: { id: 'f3', name: { en: 'Hares on the lane', fr: 'Lièvres sur le chemin' }, party: ['whit', 'hild', 'isot'], enemies: ['hare', 'hare', 'hare'], stage: 'lane' },
  f4: { id: 'f4', name: { en: 'Babewyns on the lych-gate', fr: 'Babouins sur le porche' }, party: ['whit', 'hild', 'isot'], enemies: ['babewyn', 'babewyn'], stage: 'lychgate' },
  f5: { id: 'f5', name: { en: 'The wild man of the wood', fr: 'L’homme sauvage du bois' }, party: ['whit', 'hild', 'isot'], enemies: ['wodewose', 'gryllus'], stage: 'blanchwood' },
  f6: { id: 'f6', name: { en: 'Prior Gaudry at Ninefold Gate', fr: 'Le prieur Gaudry à la porte de Ninefold' }, party: ['whit', 'hild', 'isot'], enemies: ['brother', 'gaudry', 'brother'], stage: 'gate' },
  b3: {
    id: 'b3',
    name: { en: 'The Danse Macabre', fr: 'La Danse macabre' },
    party: ['whit', 'hild', 'isot'],
    enemies: ['pope', 'king', 'childDancer', 'ploughman'],
    stage: 'ossuary',
    env: () => ({ label: { en: 'The dance turns: every dancer one place back', fr: 'La danse tourne : chaque danseur recule d’une place' }, target: { self: true }, reach: 'any', effects: [{ kind: 'turn' }] }),
  },
  f7: { id: 'f7', name: { en: 'The Ivy Gate', fr: 'La porte du Lierre' }, party: ['whit', 'hild', 'isot'], enemies: ['hare', 'caladrius', 'hare'], stage: 'ivy' },
  f8: { id: 'f8', name: { en: 'The Court of Unreason', fr: 'La cour de Déraison' }, party: ['whit', 'hild', 'isot'], enemies: ['babewyn', 'bishopFish', 'snail'], stage: 'fair' },
  b4: {
    id: 'b4',
    name: { en: 'The Blot', fr: 'La Tache' },
    party: ['whit', 'hild', 'isot'],
    enemies: ['blotlet', 'blot'],
    stage: 'inkwell',
    env: (_round, phases) =>
      phases.has('rasure') && !phases.has('ermelineFree')
        ? { label: { en: 'Ermeline scrapes at Isot’s inkhorn: −1 Ink', fr: 'Ermeline gratte la corne d’Isot : −1 Encre' }, rule: { en: 'Emend her stroke onto an enemy to free her', fr: 'Amendez son geste vers un ennemi pour la libérer' }, target: { unit: 'isot' }, reach: 'any', effects: [{ kind: 'drain' }] }
        : null,
  },
  b2: { id: 'b2', name: { en: 'The Mummers’ Play', fr: 'La pièce des Mimes' }, party: ['whit', 'hild', 'isot'], enemies: ['george', 'slasher', 'doctor'], stage: 'green' },
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
