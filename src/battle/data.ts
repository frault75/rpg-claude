/** Abilities, enemies and encounters (DESIGN.md §4.6, §4.10, §4.11). */

import type { LocalText } from '../i18n/i18n';
import type { CharId } from '../story/state';
import type { AbilityDef, AbilityId, IntentEffect, Target } from './types';

export const ABILITIES: Record<AbilityId, AbilityDef> = {
  penknife: { id: 'penknife', name: { en: 'Penknife', fr: 'Canif' }, owner: 'isot', target: 'enemy', text: { en: '2 damage to any enemy.', fr: '2 dégâts à n’importe quel ennemi.' } },
  gloss: { id: 'gloss', name: { en: 'Gloss', fr: 'Glose' }, owner: 'isot', target: 'enemy', text: { en: 'Reveal its intent; the next blow it takes deals 3 more.', fr: 'Révèle son intention ; le prochain coup qu’il reçoit fait 3 de plus.' } },
  strike: { id: 'strike', name: { en: 'Strike Through', fr: 'Rayer' }, owner: 'isot', ink: 2, target: 'intent', text: { en: 'Cross out one enemy intent: it does not happen this round.', fr: 'Raye une intention ennemie : elle n’a pas lieu ce tour-ci.' } },
  emend: { id: 'emend', name: { en: 'Emend', fr: 'Corriger' }, owner: 'isot', ink: 1, target: 'intent', text: { en: 'Change whom a single blow strikes: another ally takes it.', fr: 'Corrige la cible d’un coup unique : il tombe sur un autre allié.' } },
  rubric: { id: 'rubric', name: { en: 'Rubric', fr: 'Rubrique' }, owner: 'isot', ink: 1, target: 'ally', text: { en: 'An ally’s next ability this round is doubled.', fr: 'La prochaine capacité d’un allié ce tour-ci est doublée.' } },
  shove: { id: 'shove', name: { en: 'Shove', fr: 'Bousculer' }, owner: 'hild', target: 'none', fromFront: true, text: { en: '2 damage to the 1st enemy, then push it to the back.', fr: '2 dégâts au 1er ennemi, puis le repousse au fond.' } },
  shrive: { id: 'shrive', name: { en: 'Shrive', fr: 'Absoudre' }, owner: 'hild', hp: 3, target: 'fallenOrAlly', text: { en: 'An ally regains 6 HP, or a fallen ally rises with 6.', fr: 'Un allié regagne 6 PV, ou un allié tombé se relève avec 6.' } },
  immure: { id: 'immure', name: { en: 'Immure', fr: 'Emmurer' }, owner: 'hild', hp: 2, target: 'anyUnit', text: { en: 'Wall in any unit until the round ends.', fr: 'Emmure n’importe qui jusqu’à la fin du tour.' } },
  squint: { id: 'squint', name: { en: 'Squint', fr: 'Hagioscope' }, owner: 'hild', target: 'none', text: { en: 'Reveal hidden intents, and next round’s.', fr: 'Révèle les intentions cachées, et celles du tour suivant.' } },
  benison: { id: 'benison', name: { en: 'Benison', fr: 'Bénédiction' }, owner: 'hild', target: 'none', oncePerBattle: true, text: { en: 'All allies regain 5 HP and gain Ward 3.', fr: 'Tous les alliés regagnent 5 PV et gagnent Garde 3.' } },
  lance: { id: 'lance', name: { en: 'Lance', fr: 'Lance' }, owner: 'whit', target: 'enemy', fromFront: true, reachEnemy: 2, text: { en: '4 damage to the 1st or 2nd enemy.', fr: '4 dégâts au 1er ou au 2e ennemi.' } },
  tally: { id: 'tally', name: { en: 'Tally', fr: 'Décompte' }, owner: 'whit', target: 'enemy', text: { en: 'Set Tally 3: at 0, a Reckoning of 7.', fr: 'Pose un Décompte de 3 : à 0, le Règlement inflige 7.' } },
  vigil: { id: 'vigil', name: { en: 'Vigil', fr: 'Veille' }, owner: 'whit', target: 'none', fromFront: true, text: { en: 'The first enemy to strike an ally is struck first, for 4.', fr: 'Le premier ennemi qui frappe un allié encaisse d’abord 4 dégâts.' } },
  read: { id: 'read', name: { en: 'Read Aloud', fr: 'Lire à voix haute' }, owner: 'whit', target: 'enemy', text: { en: 'End an enemy with 6 HP or fewer.', fr: 'Achève un ennemi à 6 PV ou moins.' } },
  inscribe: { id: 'inscribe', name: { en: 'Inscribe', fr: 'Inscrire' }, owner: 'isot', target: 'none', text: { en: 'At the lectern in the Rear: write the next letter of FINIS.', fr: 'Au lutrin, à l’Arrière : écrire la lettre suivante de FINIS.' } },
};

/** The party's names; their HP grows with the level (growth.ts). */
export const PARTY_STATS: Record<CharId, { name: LocalText }> = {
  isot: { name: { en: 'Isot', fr: 'Isot' } },
  hild: { name: { en: 'Hild', fr: 'Hild' } },
  whit: { name: { en: 'Whit', fr: 'Whit' } },
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
  /** The label warns of a blow to come next round, of this much (kept true to the difficulty). */
  foretells?: number;
}

export interface BehaviourCtx {
  round: number;
  /** The enemy's own pattern counter (advances each round it plans). */
  phase: number;
  hp: number;
  maxHp: number;
  /** Its own place in the enemy line. */
  place: number;
  /** Letters of its own name given back so far (a scraped Brother). */
  named: number;
  /** Standing allies of the enemy (other than itself), with their HP and places. */
  allies: { id: string; kind: string; name: LocalText; hp: number; maxHp: number; place: number }[];
  /** The party as it stands. */
  party: { id: string; name: LocalText; hp: number; maxHp: number; place: number }[];
  /** Fallen allies, nearest first. */
  fallen: { id: string; kind: string; name: LocalText }[];
  /** Letters of FINIS written so far (the final battle), or of the word the Heap is becoming. */
  letters: number;
  /** Whoever acted last in the party's last phase, if they still stand (the inkhorn hounds hunt by it). */
  scent?: { id: string; name: LocalText };
  /** Phase changes so far. */
  phases: ReadonlySet<string>;
  /** The last thing the party did to this enemy last round: the ability, who, and the damage it dealt. */
  copied?: { ability: AbilityId; by: string; byName: LocalText; amount: number };
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
  /** Can't be brought below 1 HP, and can't be Read (Aumery). */
  undying?: boolean;
  /** Every this much damage it falters: its next intent is lost. */
  falterEvery?: number;
  /** It burns down: this much HP lost at the end of every round in which it took no warmth (the corpse-candles). */
  wanes?: number;
  /** When it falls, it bursts: this much to whoever stands in this place (the ember-grylli). */
  bursts?: { damage: number; place: number };
  /** Glossed this many times, it remembers its name and leaves the fight, with all it leads (a scraped Brother). */
  named?: number;
  /** Every blow from the party knocks a letter of its word loose; it can only be Read once the word is whole (the Heap). */
  loosens?: boolean;
  /** Cut down, it falls back into the one that loosens: a letter of the word (a stray letter). */
  returns?: boolean;
  behave(ctx: BehaviourCtx): IntentSpec[];
}

// The Danse Macabre's figures (DESIGN.md §5.14).
const HAND: IntentSpec = {
  label: { en: 'Takes a hand and leads them back', fr: 'Prend une main et l’entraîne en arrière' },
  rule: { en: 'Then the Front and the Middle swap', fr: 'Puis l’Avant et le Milieu permutent' },
  target: { place: 0 },
  damage: 3,
  reach: 'any',
  effects: [{ kind: 'swapFrontMiddle' }],
};
const WHIRL: IntentSpec = { label: { en: 'Whirls', fr: 'Tournoie' }, target: { places: [1, 2] }, damage: 2, reach: 'any' };
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
    behave: () => [{ label: { en: 'Headbutts', fr: 'Donne un coup de tête' }, target: { place: 0 }, damage: 2, reach: 'close' }],
  },
  brother: {
    name: { en: 'Pumice Brother', fr: 'Frère de la Ponce' },
    hp: 9,
    behave: (c) => {
      const hurt = c.allies.filter((a) => a.hp < a.maxHp).sort((a, b) => a.hp - b.hp)[0];
      if (c.phase % 3 === 2 && hurt)
        return [
          {
            label: { en: 'Holds the line', fr: 'Serre les rangs' },
            rule: { en: 'Ward 3', fr: 'Garde 3' },
            target: { unit: hurt.id },
            effects: [{ kind: 'wardAlly', amount: 3 }],
            reach: 'any',
          },
        ];
      if (c.phase % 2 === 0)
        return [{ label: { en: 'Scours with pumice', fr: 'Récure à la ponce' }, rule: { en: 'Strips Ward', fr: 'Ôte la Garde' }, target: { place: 0 }, damage: 3, reach: 'close', effects: [{ kind: 'stripWard' }] }];
      return [{ label: { en: 'Rasps at the page', fr: 'Râpe la page' }, rule: { en: 'Smudge', fr: 'Bavure' }, target: { place: 2 }, damage: 0, reach: 'far', effects: [{ kind: 'smudge' }] }];
    },
  },
  hare: {
    name: { en: 'Marginal Hare', fr: 'Lièvre des marges' },
    hp: 5,
    behave: (c) =>
      c.phase % 3 === 2
        ? [{ label: { en: 'Bounds to the back', fr: 'Bondit au fond' }, target: { self: true }, effects: [{ kind: 'toBack' }], reach: 'any' }]
        : [{ label: { en: 'Looses an arrow', fr: 'Décoche une flèche' }, target: { place: 2 }, damage: 3, reach: 'far' }],
  },
  babewyn: {
    name: { en: 'Babewyn', fr: 'Babouin' },
    hp: 10,
    behave: () => [
      { label: { en: 'Bites', fr: 'Mord' }, target: { place: 0 }, damage: 3, reach: 'close' },
      { label: { en: 'Spits', fr: 'Crache' }, target: { place: 1 }, damage: 2, reach: 'far' },
    ],
  },
  snail: {
    name: { en: 'Snail', fr: 'Escargot' },
    hp: 6,
    behave: (c) =>
      c.phase % 2 === 0
        ? [{ label: { en: 'Creeps out of its shell', fr: 'Sort de sa coquille' }, target: { place: 0 }, damage: 2, reach: 'close', effects: [{ kind: 'unshell' }] }]
        : [{ label: { en: 'Withdraws into its shell', fr: 'Rentre dans sa coquille' }, target: { self: true }, effects: [{ kind: 'shell' }], reach: 'any' }],
  },
  wodewose: {
    name: { en: 'Wodewose', fr: 'Homme sauvage' },
    hp: 16,
    behave: (c) =>
      c.phase % 2 === 0
        ? [{ label: { en: 'Gathers itself to club', fr: 'Se ramasse pour assommer' }, target: { place: 0 }, damage: 9, reach: 'close', countdown: 1 }]
        : [{ label: { en: 'Roars', fr: 'Rugit' }, rule: { en: 'Strips Ward', fr: 'Ôte la Garde' }, target: { all: true }, effects: [{ kind: 'stripWard' }], reach: 'any' }],
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
            rule: { en: 'Guards the Doctor: he can’t be targeted', fr: 'Protège le Docteur : impossible à cibler' },
            target: { unit: doctor.id },
            effects: [{ kind: 'guard' }],
            reach: 'any',
          },
        ];
      return [
        {
          label: { en: '“Here comes I, Saint George; I’ll smite the foremost if I can!”', fr: '« Me voici, saint Georges ; je frappe le premier qui vient ! »' },
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
        ? [{ label: { en: '“I’m Bold Slasher, sharp of blade!”', fr: '« Je suis le Hardi Tranchant, lame affûtée ! »' }, target: { place: 1 }, damage: 3, reach: 'close' }]
        : [{ label: { en: '“Then catch my sword, and catch it well!”', fr: '« Alors attrape mon épée, et attrape-la bien ! »' }, target: { place: 2 }, damage: 3, reach: 'far' }],
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
            rule: { en: 'Raises them at full HP', fr: 'Le relève avec tous ses PV' },
            target: { unit: down.id },
            effects: [{ kind: 'raise' }],
            reach: 'any',
          },
        ];
      const patient = c.allies.find((a) => a.kind === 'george') ?? c.allies[0];
      if (!patient) return [{ label: { en: '“Physician, heal thyself!”', fr: '« Médecin, guéris-toi toi-même ! »' }, rule: { en: 'Heals himself 4', fr: 'Se soigne de 4' }, target: { self: true }, effects: [{ kind: 'heal', amount: 4 }], reach: 'any' }];
      return [
        {
          label: { en: '“A dose of this, and up you get!”', fr: '« Une goutte de ceci, et te voilà debout ! »' },
          rule: { en: 'Heals 4', fr: 'Soigne 4' },
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
        : [{ label: { en: 'Brings the hammer down', fr: 'Abat le marteau' }, rule: { en: 'Strips Ward', fr: 'Ôte la Garde' }, target: { place: 0 }, damage: 4, reach: 'close', effects: [{ kind: 'stripWard' }] }],
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
            label: { en: 'Looks away', fr: 'Détourne les yeux' },
            rule: { en: 'That ally takes double damage this round', fr: 'Cet allié subit le double ce tour-ci' },
            target: { unit: weakest.id },
            reach: 'any',
            effects: [{ kind: 'doom' }],
          },
        ];
      return [{ label: { en: 'Flutters', fr: 'Voltige' }, rule: { en: 'Ward 2', fr: 'Garde 2' }, target: { self: true }, reach: 'any', effects: [{ kind: 'wardAlly', amount: 2 }] }];
    },
  },
  bishopFish: {
    name: { en: 'Bishop-fish', fr: 'Poisson-évêque' },
    hp: 8,
    behave: (c) => {
      const hurt = c.allies.filter((a) => a.hp < a.maxHp).sort((a, b) => a.hp - b.hp)[0];
      if (hurt)
        return [{ label: { en: 'Blesses', fr: 'Bénit' }, rule: { en: 'Heals 4, Ward 2', fr: 'Soigne 4, Garde 2' }, target: { unit: hurt.id }, reach: 'any', effects: [{ kind: 'heal', amount: 4 }, { kind: 'wardAlly', amount: 2 }] }];
      return [{ label: { en: 'Sprinkles brine', fr: 'Asperge de saumure' }, target: { place: 0 }, damage: 2, reach: 'far' }];
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
      line: { en: 'Ermeline’s outline surfaces in the ink and scrapes at Isot’s inkhorn every round. Emend her stroke to free her.', fr: 'Le contour d’Ermeline remonte dans l’encre et gratte l’encrier d’Isot à chaque tour. Corrigez son geste pour la libérer.' },
    },
    behave: (c) => {
      const k = c.phase % 3;
      if (k === 0) return [{ label: { en: 'Engulfs', fr: 'Engloutit' }, rule: { en: 'And Smudges (only Isot can be)', fr: 'Et inflige Bavure (à Isot seulement)' }, target: { place: 0 }, damage: 5, reach: 'any', effects: [{ kind: 'smudge' }] }];
      if (k === 1) return [{ label: { en: 'Wells up', fr: 'Déborde' }, rule: { en: 'A Blotlet rises', fr: 'Une Tachelette surgit' }, target: { self: true }, reach: 'any', effects: [{ kind: 'spawn', enemy: 'blotlet' }] }];
      return [{ label: { en: 'Swallows a name', fr: 'Avale un nom' }, rule: { en: 'Heals 6', fr: 'Soigne 6' }, target: { self: true }, reach: 'any', effects: [{ kind: 'heal', amount: 6 }] }];
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
        return [{ label: { en: 'Seeps back into the Blot', fr: 'Retourne dans la Tache' }, rule: { en: 'Heals it 5', fr: 'La soigne de 5' }, target: { unit: blot.id }, reach: 'any', effects: [{ kind: 'heal', amount: 5 }] }];
      return [{ label: { en: 'Spatters', fr: 'Éclabousse' }, target: { place: 2 }, damage: 2, reach: 'far' }];
    },
  },
  aumery: {
    name: { en: 'Abbot Aumery', fr: 'L’abbé Aumery' },
    hp: 40,
    undying: true,
    falterEvery: 10,
    behave: (c) => {
      if (c.letters >= 4 && !c.phases.has('gathering'))
        return [
          {
            label: { en: 'Gathers the pumice…', fr: 'Lève la ponce…' },
            rule: { en: 'Next round, every letter is scraped away', fr: 'Au prochain tour, toutes les lettres sont grattées' },
            target: { self: true },
            reach: 'any',
            countdown: 1,
            effects: [{ kind: 'scrapeLetters' }],
          },
        ];
      if (c.phases.has('cleanPage') && c.phase % 3 === 0)
        return [{ label: { en: 'MERCY tolls', fr: 'MISÉRICORDE sonne' }, rule: { en: 'Forgotten for a round', fr: 'Oublié pour un tour' }, target: { place: 1 }, reach: 'any', effects: [{ kind: 'forget', rounds: 1 }] }];
      switch (c.phase % 5) {
        case 0:
          return [{ label: { en: 'EDICT: let none stand before me', fr: 'ÉDIT : que nul ne se tienne devant moi' }, target: { place: 0 }, damage: 6, reach: 'any' }];
        case 1:
          return [{ label: { en: 'Scrapes WHIT from the page', fr: 'Gratte WHIT sur la page' }, rule: { en: 'Whit is Forgotten for 2 rounds', fr: 'Whit est Oublié pendant 2 tours' }, target: { unit: 'whit' }, reach: 'any', effects: [{ kind: 'forget', rounds: 2 }] }];
        case 2:
          return [{ label: { en: 'Pumices the page', fr: 'Ponce la page' }, rule: { en: 'Aimed at her by name: a Step won’t save her', fr: 'Visée par son nom : changer de place ne la sauvera pas' }, target: { unit: 'isot' }, damage: 4, reach: 'any' }];
        case 3:
          return [{ label: { en: 'Preaches', fr: 'Prêche' }, rule: { en: 'Ward 6', fr: 'Garde 6' }, target: { self: true }, reach: 'any', effects: [{ kind: 'wardAlly', amount: 6 }] }];
        default:
          return [{ label: { en: 'Calls a Brother', fr: 'Appelle un Frère' }, target: { self: true }, reach: 'any', effects: [{ kind: 'spawn', enemy: 'brother' }] }];
      }
    },
  },
  // The corpse-candles of the Fen Mill (DESIGN.md §3.14): people who should have died, burning
  // blue on the fen. They lean in for warmth, lend each other their flame, and burn down
  // whenever a round goes by without warmth taken: strike their reaching through and they starve.
  corpseCandle: {
    name: { en: 'Corpse-candle', fr: 'Chandelle des morts' },
    hp: 9,
    wanes: 1,
    behave: (c) => {
      const k = (c.phase + c.place) % 3;
      if (k === 0)
        return [{ label: { en: 'Leans in for warmth', fr: 'Se penche pour se réchauffer' }, rule: { en: 'Heals itself by what it takes', fr: 'Se soigne de ce qu’elle prend' }, target: { place: 0 }, damage: 2, reach: 'any', effects: [{ kind: 'leech' }] }];
      if (k === 1) return [{ label: { en: 'Gutters', fr: 'Crachote' }, target: { place: 1 }, damage: 3, reach: 'any' }];
      const low = c.allies.filter((a) => a.hp < a.maxHp).sort((a, b) => a.hp - b.hp)[0];
      if (low) return [{ label: { en: 'Lends its flame', fr: 'Prête sa flamme' }, rule: { en: 'Heals 3', fr: 'Soigne 3' }, target: { unit: low.id }, effects: [{ kind: 'heal', amount: 3 }], reach: 'any' }];
      return [{ label: { en: 'Leans in for warmth', fr: 'Se penche pour se réchauffer' }, rule: { en: 'Heals itself by what it takes', fr: 'Se soigne de ce qu’elle prend' }, target: { place: 2 }, damage: 2, reach: 'any', effects: [{ kind: 'leech' }] }];
    },
  },
  // The Charcoal Hollow (DESIGN.md §3.14): sparks of the burners' kilns, gone wild, and the
  // wodewose who keeps them as her young. A gryllus of embers bursts when it is put out.
  emberGryllus: {
    name: { en: 'Ember-gryllus', fr: 'Grylle de braise' },
    hp: 5,
    bursts: { damage: 2, place: 0 },
    behave: (c) =>
      (c.phase + c.place) % 2 === 0
        ? [{ label: { en: 'Spits embers', fr: 'Crache des braises' }, target: { place: 2 }, damage: 2, reach: 'far' }]
        : [{ label: { en: 'Headbutts', fr: 'Donne un coup de tête' }, rule: { en: 'When it falls it bursts on the Front for 2', fr: 'En tombant, il éclate : 2 dégâts à l’Avant' }, target: { place: 0 }, damage: 2, reach: 'close' }],
  },
  // The Fair's back lanes (DESIGN.md §3.14): the ape-scribes' copying stall. A copyist copies
  // the last thing done to it, back at whoever did it, as hard as it was done.
  apeScribe: {
    name: { en: 'Ape-scribe', fr: 'Singe copiste' },
    hp: 12,
    behave: (c) => {
      const k = c.copied;
      if (k && k.amount > 0) {
        const n = ABILITIES[k.ability].name;
        return [{ label: { en: `Copies the ${n.en} back`, fr: `Recopie « ${n.fr} »` }, rule: { en: 'As hard as it was done', fr: 'Aussi fort qu’il l’a reçu' }, target: { unit: k.by }, damage: k.amount, reach: 'any' }];
      }
      if (k && k.ability === 'gloss')
        return [{ label: { en: 'Copies the Gloss back', fr: 'Recopie la Glose en retour' }, rule: { en: 'The next blow on them deals 3 more', fr: 'Le prochain coup reçu fait 3 de plus' }, target: { unit: k.by }, effects: [{ kind: 'gloss' }], reach: 'any' }];
      return (c.phase + c.place) % 2 === 0
        ? [{ label: { en: 'Scribbles', fr: 'Griffonne' }, target: { place: 1 }, damage: 2, reach: 'any' }]
        : [{ label: { en: 'Blots the page', fr: 'Tache la page' }, rule: { en: 'Smudge', fr: 'Bavure' }, target: { place: 2 }, reach: 'far', effects: [{ kind: 'smudge' }] }];
    },
  },
  wodewoseMother: {
    name: { en: 'Wodewose mother', fr: 'Mère sauvage' },
    hp: 24,
    behave: (c) => {
      const down = c.fallen.find((f) => f.kind === 'emberGryllus');
      if (down && c.phase % 3 === 1)
        return [{ label: { en: 'Blows on the coals', fr: 'Souffle sur les braises' }, rule: { en: 'A fallen ember-gryllus rises at full HP', fr: 'Un grylle de braise tombé se relève avec tous ses PV' }, target: { unit: down.id }, effects: [{ kind: 'raise' }], reach: 'any' }];
      const young = c.allies.filter((a) => a.kind === 'emberGryllus').sort((a, b) => a.hp - b.hp)[0];
      if (c.phase % 3 === 1 && young)
        return [{ label: { en: 'Shields her young', fr: 'Protège son petit' }, rule: { en: 'Ward 3', fr: 'Garde 3' }, target: { unit: young.id }, effects: [{ kind: 'wardAlly', amount: 3 }], reach: 'any' }];
      if (c.phase % 3 === 0)
        return [{ label: { en: 'Gathers herself to club', fr: 'Se ramasse pour assommer' }, target: { place: 0 }, damage: 10, reach: 'close', countdown: 1 }];
      return [{ label: { en: 'Roars', fr: 'Rugit' }, rule: { en: 'Strips Ward', fr: 'Ôte la Garde' }, target: { all: true }, effects: [{ kind: 'stripWard' }], reach: 'any' }];
    },
  },
  // The Undercroft (DESIGN.md §3.14): the Rasure Vault under the scriptorium, where ten
  // years of scrapings have been swept. A Brother scraped of his own name sweeps it still,
  // with the hounds of the inkhorns at heel. Gloss him three times and he has his name back:
  // he puts the broom down and goes up the stair, and the hounds go with him. Let him, and
  // he sweeps the margin clean.
  scrapedBrother: {
    name: { en: 'Scraped Brother', fr: 'Frère gratté' },
    hp: 18,
    named: 3,
    leads: true,
    behave: (c) => {
      if (c.named > 0)
        return [{ label: { en: 'Sweeps the margin clean', fr: 'Balaie la marge' }, rule: { en: 'The letters of his name given back so far are lost', fr: 'Les lettres de son nom rendues jusqu’ici sont perdues' }, target: { self: true }, reach: 'any', effects: [{ kind: 'unname' }] }];
      const hound = c.allies.filter((a) => a.kind === 'inkhornHound').sort((a, b) => a.hp - b.hp)[0];
      if (c.phase % 2 === 1 && hound)
        return [{ label: { en: 'Shortens the leash', fr: 'Raccourcit la laisse' }, rule: { en: 'Ward 3', fr: 'Garde 3' }, target: { unit: hound.id }, reach: 'any', effects: [{ kind: 'wardAlly', amount: 3 }] }];
      return [{ label: { en: 'Sweeps up pumice dust', fr: 'Soulève la poussière de ponce' }, rule: { en: 'Smudge', fr: 'Bavure' }, target: { place: 2 }, damage: 2, reach: 'far', effects: [{ kind: 'smudge' }] }];
    },
  },
  // Hounds born of inkhorns, that hunt by the smell of fresh ink: whoever did something last.
  inkhornHound: {
    name: { en: 'Inkhorn hound', fr: 'Chien d’encrier' },
    hp: 8,
    bound: true,
    behave: (c) => {
      if (c.scent && (c.phase + c.place) % 2 === 1)
        return [{ label: { en: 'Hunts by the scent', fr: 'Traque à l’odeur' }, rule: { en: 'It hunts whoever acted last', fr: 'Il traque qui a agi en dernier' }, target: { unit: c.scent.id }, damage: 3, reach: 'any' }];
      return [{ label: { en: 'Snaps', fr: 'Happe' }, target: { place: 0 }, damage: 2, reach: 'close' }];
    },
  },
  // Knights written over something older: whatever is scraped off them in a round, they
  // write back. Fell one in the round it writes itself over, or strike the writing out.
  palimpsestKnight: {
    name: { en: 'Palimpsest knight', fr: 'Chevalier palimpseste' },
    hp: 18,
    behave: (c) => {
      const k = (c.phase + c.place) % 3;
      if (k === 0)
        return [{ label: { en: 'Writes itself over', fr: 'Se réécrit par-dessus' }, rule: { en: 'Whatever it loses this round, it has back', fr: 'Ce qu’il perd ce tour-ci, il le récupère' }, target: { self: true }, reach: 'any', effects: [{ kind: 'rewrite' }] }];
      if (k === 1) return [{ label: { en: 'Charges', fr: 'Charge' }, target: { place: 0 }, damage: 5, reach: 'close' }];
      return [{ label: { en: 'Couches its lance', fr: 'Met sa lance en arrêt' }, target: { place: 1 }, damage: 4, reach: 'any' }];
    },
  },
  // The Heap: every letter ever scraped in Saint Ebb's, swept together for ten years,
  // trying to become a word. It hurts whoever is near as it reaches for its letters, and
  // a blow knocks one loose. Let it finish, and read what it says.
  heap: {
    name: { en: 'The Heap', fr: 'Le Tas' },
    hp: 30,
    size: 2,
    readOnly: true,
    leads: true,
    loosens: true,
    behave: (c) => {
      switch (c.phase % 4) {
        case 0:
          return [{ label: { en: 'Thrashes for its next letter', fr: 'Se débat pour sa prochaine lettre' }, rule: { en: 'If it reaches, its word has one more letter', fr: 'S’il touche, son mot gagne une lettre' }, target: { place: 0 }, damage: 4, reach: 'any', effects: [{ kind: 'letter' }] }];
        case 1:
          return [{ label: { en: 'Sheds a stray letter', fr: 'Perd une lettre égarée' }, target: { self: true }, reach: 'any', effects: [{ kind: 'spawn', enemy: 'strayLetter' }] }];
        case 2:
          return [{ label: { en: 'Rakes for its next letter', fr: 'Racle pour sa prochaine lettre' }, rule: { en: 'If it reaches, its word has one more letter', fr: 'S’il touche, son mot gagne une lettre' }, target: { places: [1, 2] }, damage: 3, reach: 'any', effects: [{ kind: 'letter' }] }];
        default:
          return [{ label: { en: 'Mouths F, I, N, I, S…', fr: 'Articule F, I, N, I, S…' }, rule: { en: 'A word it learned upstairs, not its own', fr: 'Un mot appris là-haut, pas le sien' }, target: { all: true }, damage: 5, reach: 'any', countdown: 1 }];
      }
    },
  },
  strayLetter: {
    name: { en: 'Stray letter', fr: 'Lettre égarée' },
    hp: 4,
    bound: true,
    returns: true,
    behave: (c) =>
      (c.phase + c.place) % 2 === 0
        ? [{ label: { en: 'Flutters', fr: 'Voltige' }, rule: { en: 'Cut down, it falls back into the Heap', fr: 'Abattue, elle retombe dans le Tas' }, target: { place: 2 }, damage: 2, reach: 'any' }]
        : [{ label: { en: 'Nicks', fr: 'Entaille' }, rule: { en: 'Cut down, it falls back into the Heap', fr: 'Abattue, elle retombe dans le Tas' }, target: { place: 1 }, damage: 2, reach: 'any' }],
  },
  greatSnail: {
    name: { en: 'The Great Snail', fr: 'Le Grand Escargot' },
    hp: 24,
    size: 2,
    phaseAt: {
      hp: 12,
      id: 'highWater',
      title: { en: 'High Water', fr: 'Marée haute' },
      line: { en: 'The shell cracks on a spiral of writing. Now the tide breaks every second round, over the Front and the Middle.', fr: 'La coquille se fend sur une spirale d’écriture. Désormais la marée déferle un tour sur deux sur l’Avant et le Milieu.' },
    },
    behave: (c) => {
      const k = c.phase % 3;
      if (k === 0)
        return [{ label: { en: 'Horns out, it lashes', fr: 'Cornes dehors, il fouette' }, target: { place: 0 }, damage: 5, reach: 'close', effects: [{ kind: 'unshell' }] }];
      if (k === 1)
        return [
          // It licks its wounds in there: chipping at the shell barely keeps up; Strike Through the withdrawal instead.
          { label: { en: 'Withdraws into its shell', fr: 'Rentre dans sa coquille' }, rule: { en: 'Licks its wounds: heals 4', fr: 'Lèche ses plaies : se soigne de 4' }, target: { self: true }, effects: [{ kind: 'shell' }, { kind: 'heal', amount: 4 }], reach: 'any' },
          { label: { en: 'Gathers the tide… (next: everyone · 3)', fr: 'Appelle la marée… (ensuite : tous · 3)' }, target: { self: true }, reach: 'any', foretells: 3 },
        ];
      return [{ label: { en: 'A tide of slime', fr: 'Une marée de bave' }, target: { all: true }, damage: 3, reach: 'any' }];
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
  /** The final battle: won by writing FINIS, not by felling the enemy. A word: the Heap's, won by reading it whole. */
  objective?: 'finis' | 'word';
  /** The word, and what is said when it is whole and when a letter is first knocked loose. */
  word?: { text: string; whole: { title: LocalText; line: LocalText }; loose: { title: LocalText; line: LocalText } };
  /** The battle is lost if this ally falls. */
  mustSurvive?: CharId;
}

export const ENCOUNTERS: Record<string, EncounterDef> = {
  f1: { id: 'f1', name: { en: 'Grylli in the margin', fr: 'Grylles dans la marge' }, party: ['isot'], enemies: ['gryllus', 'gryllus'], stage: 'scriptorium' },
  f2: { id: 'f2', name: { en: 'The Pumice Brothers', fr: 'Les Frères de la Ponce' }, party: ['hild', 'isot'], enemies: ['brother', 'brother'], stage: 'cloister' },
  f3: { id: 'f3', name: { en: 'Hares on the lane', fr: 'Lièvres sur le chemin' }, party: ['whit', 'hild', 'isot'], enemies: ['hare', 'hare', 'hare'], stage: 'lane' },
  s1: { id: 's1', name: { en: 'The corpse-candles', fr: 'Les chandelles des morts' }, party: ['whit', 'hild', 'isot'], enemies: ['corpseCandle', 'corpseCandle', 'corpseCandle', 'corpseCandle'], stage: 'fen' },
  f4: { id: 'f4', name: { en: 'Babewyns on the lych-gate', fr: 'Babouins sur le porche' }, party: ['whit', 'hild', 'isot'], enemies: ['babewyn', 'babewyn'], stage: 'lychgate' },
  f5: { id: 'f5', name: { en: 'The wild man of the wood', fr: 'L’homme sauvage du bois' }, party: ['whit', 'hild', 'isot'], enemies: ['wodewose', 'gryllus'], stage: 'blanchwood' },
  s2: { id: 's2', name: { en: 'The Charcoal Hollow', fr: 'La combe aux charbonniers' }, party: ['whit', 'hild', 'isot'], enemies: ['emberGryllus', 'wodewoseMother', 'emberGryllus'], stage: 'hollow' },
  f6: { id: 'f6', name: { en: 'Prior Gaudry at Ninefold Gate', fr: 'Le prieur Gaudry à la porte de Ninefold' }, party: ['whit', 'hild', 'isot'], enemies: ['brother', 'gaudry', 'brother'], stage: 'gate' },
  b3: {
    id: 'b3',
    name: { en: 'The Danse Macabre', fr: 'La Danse macabre' },
    party: ['whit', 'hild', 'isot'],
    enemies: ['pope', 'king', 'childDancer', 'ploughman'],
    stage: 'ossuary',
    env: () => ({ label: { en: 'The dance turns', fr: 'La danse tourne' }, rule: { en: 'Every dancer one place back', fr: 'Chaque danseur recule d’une place' }, target: { self: true }, reach: 'any', effects: [{ kind: 'turn' }] }),
  },
  s3: { id: 's3', name: { en: 'The copying stall', fr: 'L’étal des copistes' }, party: ['whit', 'hild', 'isot'], enemies: ['apeScribe', 'apeScribe', 'apeScribe', 'apeScribe'], stage: 'lanes' },
  f7: { id: 'f7', name: { en: 'The Ivy Gate', fr: 'La porte du Lierre' }, party: ['whit', 'hild', 'isot'], enemies: ['hare', 'caladrius', 'hare'], stage: 'ivy' },
  f8: { id: 'f8', name: { en: 'The Court of Unreason', fr: 'La Cour de Déraison' }, party: ['whit', 'hild', 'isot'], enemies: ['babewyn', 'bishopFish', 'snail'], stage: 'fair' },
  b4: {
    id: 'b4',
    name: { en: 'The Blot', fr: 'La Tache' },
    party: ['whit', 'hild', 'isot'],
    enemies: ['blotlet', 'blot'],
    stage: 'inkwell',
    env: (_round, phases) =>
      phases.has('rasure') && !phases.has('ermelineFree')
        ? { label: { en: 'Ermeline scrapes at the inkhorn', fr: 'Ermeline gratte l’encrier' }, rule: { en: '−1 Ink. Emend her stroke onto an enemy to free her', fr: '−1 Encre. Corrigez son geste vers un ennemi pour la libérer' }, target: { unit: 'isot' }, reach: 'any', effects: [{ kind: 'drain' }] }
        : null,
  },
  s4: { id: 's4', name: { en: 'The sweepers', fr: 'Les balayeurs' }, party: ['whit', 'hild', 'isot'], enemies: ['inkhornHound', 'inkhornHound', 'inkhornHound', 'scrapedBrother'], stage: 'undercroft' },
  s5: { id: 's5', name: { en: 'The palimpsest knights', fr: 'Les chevaliers palimpsestes' }, party: ['whit', 'hild', 'isot'], enemies: ['palimpsestKnight', 'palimpsestKnight'], stage: 'undercroft' },
  b6: {
    id: 'b6',
    name: { en: 'The Heap', fr: 'Le Tas' },
    party: ['whit', 'hild', 'isot'],
    enemies: ['heap'],
    stage: 'undercroft',
    objective: 'word',
    word: {
      text: 'ADSUM',
      whole: {
        title: { en: 'ADSUM', fr: 'ADSUM' },
        line: { en: '“Here.” The answer at the roll-call: every name it was made of, answering at once. Read it.', fr: '« Présent. » La réponse à l’appel : tous les noms dont il est fait, répondant d’une seule voix. Lisez-le.' },
      },
      loose: {
        title: { en: 'Knocked Loose', fr: 'Détachée' },
        line: { en: 'A letter falls back into the scrapings. It was trying to say something.', fr: 'Une lettre retombe dans les raclures. Le Tas essayait de dire quelque chose.' },
      },
    },
  },
  f9: { id: 'f9', name: { en: 'The cloister at dawn', fr: 'Le cloître à l’aube' }, party: ['whit', 'hild', 'isot'], enemies: ['brother', 'gaudry', 'brother'], stage: 'cloisterDawn' },
  b5: { id: 'b5', name: { en: 'The Writing of FINIS', fr: 'L’Écriture de FINIS' }, party: ['whit', 'hild', 'isot'], enemies: ['brother', 'aumery', 'brother'], stage: 'nave', objective: 'finis', mustSurvive: 'isot' },
  b2: { id: 'b2', name: { en: 'The Mummers’ Play', fr: 'La pièce des comédiens' }, party: ['whit', 'hild', 'isot'], enemies: ['george', 'slasher', 'doctor'], stage: 'green' },
  b1: {
    id: 'b1',
    name: { en: 'The Great Snail of the Causeway', fr: 'Le Grand Escargot de la chaussée' },
    party: ['whit', 'hild', 'isot'],
    enemies: ['greatSnail'],
    stage: 'causeway',
    env: (round, phases) => {
      if (phases.has('highWater'))
        return round % 2 === 0 ? { label: { en: 'High water breaks', fr: 'La marée haute déferle' }, target: { places: [0, 1] }, damage: 2, reach: 'any' } : null;
      return round % 3 === 0 ? { label: { en: 'A wave breaks', fr: 'Une vague se brise' }, target: { place: 0 }, damage: 2, reach: 'any' } : null;
    },
  },
};

/**
 * What each fight gives the first time it is won, in the order the story meets them
 * (DESIGN.md §5.16, §6.1). Nothing is fought twice, so this is all the main path gives.
 */
export const REWARDS: Record<string, { xp: number; pennies: number; optional?: true }> = {
  f1: { xp: 10, pennies: 4 },
  f2: { xp: 15, pennies: 6 },
  b1: { xp: 20, pennies: 15 },
  f3: { xp: 12, pennies: 6 },
  // The Fen Mill, off the lane: optional, like everything off the path.
  s1: { xp: 14, pennies: 10, optional: true },
  f4: { xp: 13, pennies: 7 },
  b2: { xp: 25, pennies: 20 },
  f5: { xp: 15, pennies: 8 },
  // The Charcoal Hollow, off the Blanchwood.
  s2: { xp: 18, pennies: 12, optional: true },
  f6: { xp: 18, pennies: 10 },
  b3: { xp: 30, pennies: 25 },
  f7: { xp: 18, pennies: 10 },
  // The Court of Unreason can be left in peace.
  f8: { xp: 20, pennies: 12, optional: true },
  // The ape-scribes' stall in the Fair's back lanes.
  s3: { xp: 20, pennies: 14, optional: true },
  b4: { xp: 34, pennies: 30 },
  s4: { xp: 22, pennies: 14, optional: true },
  s5: { xp: 24, pennies: 16, optional: true },
  b6: { xp: 40, pennies: 0, optional: true },
  f9: { xp: 22, pennies: 12 },
  // The last fight is the end of the Book: nothing comes after it to spend on.
  b5: { xp: 0, pennies: 0 },
};

/** Abilities known at the start of chapter I (more unlock with the story). */
export const CHAPTER_ONE_ABILITIES: Record<CharId, AbilityId[]> = {
  isot: ['penknife', 'gloss', 'strike'],
  hild: ['shove', 'shrive'],
  whit: ['lance', 'tally'],
};
