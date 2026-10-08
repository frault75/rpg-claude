/**
 * Battle types (DESIGN.md §4). Battles are deterministic puzzles: no rolls, no misses.
 * The party stands in three places (Front, Middle, Rear); enemies in up to four,
 * numbered from the front. Every enemy shows its intent before the party acts.
 */

import type { LocalText } from '../i18n/i18n';
import type { CharId } from '../story/state';

export type Side = 'party' | 'enemy';

/** Party places: 0 Front, 1 Middle, 2 Rear. Enemy places: 0..3 (1st..4th). */
export type Place = number;
export const PLACE_NAMES: LocalText[] = [
  { en: 'Front', fr: 'Avant' },
  { en: 'Middle', fr: 'Milieu' },
  { en: 'Rear', fr: 'Arrière' },
];

export interface Statuses {
  /** Absorbs this much damage; fades when the owner's side next begins to act. */
  ward: number;
  /** Intent shown for the rest of the battle (hidden intents only). */
  revealed: boolean;
  /** The next damage taken is +3. */
  glossed: boolean;
  /** Counts down on damage and at round's end; at 0, a Reckoning. */
  tally: number | null;
  /** The Reckoning is doubled (Tally set while Rubricated). */
  tallyDoubled: boolean;
  /** Can't act or be targeted until round's end. */
  immured: boolean;
  /** Stays immured through the next round as well. */
  immuredLong: boolean;
  /** Isot's next Ink ability costs +1. */
  smudged: boolean;
  /** Every hit deals at most 1. */
  shelled: boolean;
  /** The next ability this round is doubled. */
  rubricated: boolean;
  /** Blows from the party pass through (Danse Macabre followers). */
  hollow: boolean;
  /** Can't be brought below 1 HP by damage; must be Read. */
  readOnly: boolean;
  /** Can't act next round (an Edict). */
  kneeling: boolean;
  /** Takes double damage this round (the Caladrius looks away). */
  doomed: boolean;
  /** Can't be targeted by the party this round (Saint George stands guard). */
  guarded: boolean;
  /** Rounds left scraped from the page: can't act (Aumery's "Scrapes WHIT"). */
  forgotten: number;
  /** Letters of its own name given back in the margin (a scraped Brother leaves when it is whole). */
  named: number;
}

export function freshStatuses(): Statuses {
  return {
    ward: 0,
    revealed: false,
    glossed: false,
    tally: null,
    tallyDoubled: false,
    immured: false,
    immuredLong: false,
    smudged: false,
    shelled: false,
    rubricated: false,
    hollow: false,
    readOnly: false,
    kneeling: false,
    doomed: false,
    guarded: false,
    forgotten: 0,
    named: 0,
  };
}

export interface Unit {
  id: string;
  side: Side;
  /** Character id for allies; enemy kind for enemies. */
  kind: string;
  name: LocalText;
  hp: number;
  maxHp: number;
  place: Place;
  /** Places taken (bosses drawn large take two). */
  size: number;
  status: Statuses;
  fallen: boolean;
  /** Has acted this party phase. */
  acted: boolean;
  /** Counter for enemy behaviour patterns. */
  phase: number;
  /** Intents shown with "?" until revealed. */
  hiddenIntents: boolean;
  /** Gone from the fight by remembering its name, not fallen to a blow. */
  left?: boolean;
}

export type Target =
  | { place: Place }
  | { unit: string }
  | { all: true }
  | { places: Place[] }
  | { self: true };

export interface Intent {
  id: string;
  /** Unit id, or 'env' for the field itself (the tide). */
  actor: string;
  /** Order of action in the enemy phase (1-based, shown on the banderole). */
  order: number;
  /** Banderole text, written in red. */
  label: LocalText;
  /** The rule under a couplet (the Mummers speak in verse). */
  rule?: LocalText;
  target: Target;
  damage: number;
  reach: 'close' | 'far' | 'any';
  /** Extra effects when it lands. */
  effects: IntentEffect[];
  /** Wind-up: resolves when this reaches 0 (shown as "in n"). */
  countdown: number;
  cancelled: boolean;
  /** Held over into next round: postponed by Immure, or a wind-up still counting. */
  waiting: boolean;
  /** Emended onto another enemy: the blow lands on them instead. */
  turned?: boolean;
}

export type IntentEffect =
  | { kind: 'stripWard' }
  | { kind: 'smudge' }
  | { kind: 'wardAlly'; amount: number }
  | { kind: 'shell' }
  | { kind: 'unshell' }
  | { kind: 'heal'; amount: number }
  | { kind: 'kneel' }
  | { kind: 'swapFrontMiddle' }
  | { kind: 'toBack' }
  | { kind: 'doom' }
  | { kind: 'raise' }
  | { kind: 'guard' }
  | { kind: 'spawn'; enemy: string }
  /** Every dancer acts twice next round (the Danse Macabre's Leader). */
  | { kind: 'tune' }
  /** The dance turns: every enemy moves one place back, the last to the front. */
  | { kind: 'turn' }
  /** Ermeline scrapes Isot's inkhorn: −1 Ink (the Blot's Rasure). */
  | { kind: 'drain' }
  /** Scraped from the page: can't act for this many rounds. */
  | { kind: 'forget'; rounds: number }
  /** Every letter of FINIS written so far is scraped away. */
  | { kind: 'scrapeLetters' }
  /** The blow's damage, as dealt, heals the one who struck (the corpse-candles take warmth). */
  | { kind: 'leech' }
  /** The target is Glossed: their next wound is +3 (an ape-scribe copying Isot's Gloss). */
  | { kind: 'gloss' }
  /** The margin swept clean: the letters of its name given back so far are lost (a scraped Brother). */
  | { kind: 'unname' }
  /** Written over: back to the HP it had when the round began (a palimpsest knight). */
  | { kind: 'rewrite' }
  /** A letter of the word it is trying to become (the Heap). */
  | { kind: 'letter' };

export type AbilityId =
  | 'penknife'
  | 'gloss'
  | 'strike'
  | 'emend'
  | 'rubric'
  | 'shove'
  | 'shrive'
  | 'immure'
  | 'squint'
  | 'benison'
  | 'lance'
  | 'tally'
  | 'vigil'
  | 'read'
  | 'inscribe';

export type AbilityTarget = 'enemy' | 'ally' | 'anyUnit' | 'intent' | 'none' | 'fallenOrAlly';

export interface AbilityDef {
  id: AbilityId;
  name: LocalText;
  owner: CharId;
  /** Ink (Isot) or HP (Hild's Penance). */
  ink?: number;
  hp?: number;
  target: AbilityTarget;
  /** Must stand in the Front or Middle. */
  fromFront?: boolean;
  /** Can only hit the 1st (or 1st and 2nd) enemy. */
  reachEnemy?: number;
  oncePerBattle?: boolean;
  text: LocalText;
}

/** What happened, in order, for the battle screen to animate. */
export type BattleEvent =
  | { type: 'omen'; intents: string[] }
  | { type: 'act'; unit: string; ability: AbilityId; target?: string }
  /** Something used from the satchel (an id of SATCHEL). */
  | { type: 'item'; unit: string; item: string; target?: string }
  | { type: 'intent'; intent: string; actor: string }
  | { type: 'windup'; intent: string; actor: string; countdown: number }
  | { type: 'damage'; unit: string; amount: number; absorbed: number; source: string }
  | { type: 'heal'; unit: string; amount: number }
  | { type: 'ward'; unit: string; amount: number }
  | { type: 'status'; unit: string; status: keyof Statuses | 'tally'; on: boolean }
  | { type: 'fizzle'; intent: string; reason: string }
  | { type: 'cancel'; intent: string }
  | { type: 'retarget'; intent: string }
  | { type: 'move'; unit: string; from: Place; to: Place }
  | { type: 'reckoning'; unit: string; amount: number }
  /** A blow passes through a hollow dancer (or, after the Empty Place, through Whit). */
  | { type: 'pass'; unit: string }
  /** A letter of FINIS written, or lost (smudged, scraped); or of the Heap's word. `count` is how many stand now. */
  | { type: 'letter'; count: number; lost: boolean }
  /** Damage enough to make a boss falter: its next intent is lost. */
  | { type: 'falter'; unit: string }
  | { type: 'vigil'; unit: string; by: string }
  | { type: 'fall'; unit: string }
  /** It remembers its name and leaves the fight (a scraped Brother, and his hounds). */
  | { type: 'leave'; unit: string }
  /** A fall turned aside (Gervase's Ribbon): the ally stays at 1 HP. */
  | { type: 'spared'; unit: string }
  | { type: 'rise'; unit: string }
  | { type: 'spawn'; unit: string }
  | { type: 'ink'; amount: number }
  | { type: 'round'; round: number }
  | { type: 'phase'; title: LocalText; line: LocalText; id?: string }
  | { type: 'victory' }
  | { type: 'defeat' };
