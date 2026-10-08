/**
 * The battle engine (DESIGN.md §4): pure and deterministic, so it is tested without a
 * screen and a retried fight is the same puzzle. A round is: the Omen (every enemy shows
 * its intent), the party phase (each ally acts once, results at once, one free Step,
 * unlimited Undo), the enemy phase (intents resolve in their numbered order against
 * whoever stands where they point), and the round's end (countdowns, Ink).
 */

import { Rng } from '../engine/rng';
import type { CharId } from '../story/state';
import { ABILITIES, ENCOUNTERS, ENEMIES, type EncounterDef, type IntentSpec, PARTY_STATS } from './data';
import { type Difficulty, enemyDamage, enemyHp, hasRank, hpAt, relabel, TUNED_LEVEL } from './growth';
import { SATCHEL, type Satchel, SATCHEL_IDS, type SatchelId } from './satchel';
import { type AbilityId, type BattleEvent, freshStatuses, type Intent, type Place, type Unit } from './types';

export interface BattleSetup {
  encounter: EncounterDef | string;
  /** Who fights, front to back (the formation). */
  party: CharId[];
  abilities: Record<CharId, AbilityId[]>;
  equipment?: Partial<Record<CharId, { relic: string | null; charm: string | null }>>;
  seed?: number;
  /** The party's level (DESIGN.md §5.16); the first fights were tuned at level 3. */
  level?: number;
  /** DESIGN.md §5.17. Story: +50% HP, Ink refills by 2, softer blows. Normal by default. */
  difficulty?: Difficulty;
  /** What the party carries into the fight (DESIGN.md §6.2). */
  satchel?: Satchel;
  /** Emend upgraded at Knell Chapel: a blow can be turned onto another enemy (2 Ink). */
  emendAnywhere?: boolean;
}

export interface ActTarget {
  unit?: string;
  intent?: string;
  /** For Emend: the ally the blow is turned onto. */
  to?: string;
}

/** Why an action is refused (the battle screen explains it). */
export type Refusal =
  | 'over'
  | 'no-unit'
  | 'fallen'
  | 'acted'
  | 'immured'
  | 'unknown'
  | 'used'
  | 'from-front'
  | 'ink'
  | 'hp'
  | 'target'
  | 'immured-target'
  | 'reach'
  | 'too-strong'
  | 'not-single'
  | 'guarded'
  | 'lectern'
  | 'empty'
  | 'full'
  | 'front-only'
  | 'enemies-only';

/** Abilities a Rubric (or Vermilion) can double. */
const DOUBLES: ReadonlySet<AbilityId> = new Set(['penknife', 'shove', 'shrive', 'immure', 'squint', 'benison', 'lance', 'tally', 'vigil', 'read']);

/** Whit's memories, one for each letter of FINIS as it is written (DESIGN.md §3.8). */
export const FINIS_MEMORIES: { letter: string; en: string; fr: string }[] = [
  { letter: 'F', en: 'A man under an apple tree. He asked me to wait until the apples fell. I waited.', fr: 'Un homme sous un pommier. Il m’a demandé d’attendre que les pommes tombent. J’ai attendu.' },
  { letter: 'I', en: 'A queen, frightened of the dark. I held the candle.', fr: 'Une reine, qui avait peur du noir. J’ai tenu la chandelle.' },
  { letter: 'N', en: 'A child who wanted to know if I was cold. I said yes. I was.', fr: 'Un enfant qui voulait savoir si j’avais froid. J’ai dit oui. J’avais froid.' },
  { letter: 'I', en: 'Ten thousand beds. Ten thousand hands. None of them were heavy.', fr: 'Dix mille lits. Dix mille mains. Aucune n’était lourde.' },
  { letter: 'S', en: 'A woman with grey on her face. Hild. She was not afraid. Then he scraped my name, and I forgot it.', fr: 'Une femme au visage gris. Hild. Elle n’avait pas peur. Puis il a gratté mon nom, et je l’ai oublié.' },
];

interface Snapshot {
  units: Unit[];
  intents: Intent[];
  ink: number;
  steps: number;
  spared: string[];
  vigil: Battle['vigil'];
  usedOnce: string[];
  firstBlow: string[];
  firstAbility: string[];
  squinted: number;
  preview: Intent[] | null;
  revivals: number;
  phases: string[];
  nextUnit: number;
  letters: number;
  inscribedRound: number;
  dealt: [string, number][];
  falterNext: string[];
  satchel: Satchel;
  copied: [string, { ability: AbilityId; by: string; amount: number }][];
  eventsLen: number;
}

export class Battle {
  readonly def: EncounterDef;
  units: Unit[] = [];
  intents: Intent[] = [];
  round = 0;
  ink = 2;
  maxInk = 3;
  /** Free Steps taken this round, and how many a round allows (two with the Hare's-foot brush). */
  steps = 0;
  stepsAllowed = 1;
  vigil: { by: string; power: number } | null = null;
  result: 'ongoing' | 'victory' | 'defeat' = 'ongoing';
  /** Next round's intents, after a Squint. */
  preview: Intent[] | null = null;
  readonly events: BattleEvent[] = [];
  private readonly rng: Rng;
  private readonly history: Snapshot[] = [];
  private usedOnce = new Set<string>();
  /** Allies whose first blow taken this battle is softened (Ebb Shell). */
  private firstBlow = new Set<string>();
  /** Allies whose first doubled ability this battle is free (Vermilion). */
  private firstAbility = new Set<string>();
  /** Allies whose first fall this battle is turned aside (Gervase's Ribbon). */
  private spared = new Set<string>();
  /** Rounds of foresight left from a Squint. */
  private squinted = 0;
  /** Allies kneeling this round (an Edict served). */
  private knelt = new Set<string>();
  private readonly abilities: Record<CharId, AbilityId[]>;
  private readonly equipment: BattleSetup['equipment'] & object;
  readonly level: number;
  readonly difficulty: Difficulty;
  readonly emendAnywhere: boolean;
  private readonly fighting: ReadonlySet<CharId>;
  /** A tune was called: every dancer plans twice next round. */
  private tuned = false;
  /** Phase changes so far (the Rasure, Ermeline freed). */
  phases = new Set<string>();
  /** For naming units that rise mid-battle (Blotlets). */
  private nextUnit = 0;
  /** Letters of FINIS written (the final battle), and the round the last one was written in. */
  letters = 0;
  private inscribedRound = -1;
  /** Damage dealt to each enemy that falters, and who falters at the next Omen. */
  private dealt = new Map<string, number>();
  private falterNext = new Set<string>();
  /** Intents that have resolved this enemy phase. */
  private resolved = new Set<string>();
  /** Enemies that took warmth this round (a corpse-candle that fed does not burn down). */
  private fed = new Set<string>();
  /** The last thing done to each enemy this party phase, for the ape-scribes to copy. */
  private copied = new Map<string, { ability: AbilityId; by: string; amount: number }>();
  /** The ability being carried out, while it is. */
  private acting: { ability: AbilityId; by: string } | null = null;
  private nextIntentId = 1;
  /** What is left in the satchel, and what it held when the fight began. */
  satchel: Satchel = {};
  private readonly packed: Satchel;

  constructor(setup: BattleSetup) {
    const def = typeof setup.encounter === 'string' ? ENCOUNTERS[setup.encounter] : setup.encounter;
    if (!def) throw new Error(`unknown encounter ${String(setup.encounter)}`);
    this.def = def;
    this.rng = new Rng(setup.seed ?? 7);
    this.abilities = setup.abilities;
    this.level = setup.level ?? TUNED_LEVEL;
    this.difficulty = setup.difficulty ?? 'normal';
    this.packed = { ...(setup.satchel ?? {}) };
    this.satchel = { ...this.packed };
    this.emendAnywhere = !!setup.emendAnywhere;
    this.equipment = setup.equipment ?? {};
    this.fighting = new Set(setup.party.slice(0, 3));
    setup.party.slice(0, 3).forEach((c, i) => {
      const st = PARTY_STATS[c];
      const hp = Math.round(hpAt(c, this.level) * (this.difficulty === 'story' ? 1.5 : 1));
      const u: Unit = { id: c, side: 'party', kind: c, name: st.name, hp, maxHp: hp, place: i, size: 1, status: freshStatuses(), fallen: false, acted: false, phase: 0, hiddenIntents: false };
      if (this.wears(c, 'anchorStone')) u.status.ward = 2;
      if (this.wears(c, 'ebbShell')) this.firstBlow.add(c);
      if (this.wears(c, 'vermilionPot')) this.firstAbility.add(c);
      if (this.wears(c, 'gervasesRibbon')) this.spared.add(c);
      if (this.wears(c, 'haresFoot')) this.stepsAllowed = 2;
      this.units.push(u);
    });
    if (this.wears('isot', 'lampBlack')) {
      this.maxInk = 4;
      this.ink = 1;
    }
    if (this.wears('isot', 'hornInkwell')) this.maxInk = 2;
    if (hasRank(this.level, 'inkwell')) this.maxInk++;
    let place = 0;
    this.def.enemies.forEach((kind, i) => {
      const e = ENEMIES[kind];
      if (!e) throw new Error(`unknown enemy ${kind}`);
      const size = e.size ?? 1;
      const st = freshStatuses();
      st.readOnly = !!e.readOnly;
      st.hollow = !!e.hollow;
      const hp = enemyHp(e.hp, this.difficulty);
      this.units.push({ id: `e${i}`, side: 'enemy', kind, name: e.name, hp, maxHp: hp, place, size, status: st, fallen: false, acted: false, phase: 0, hiddenIntents: !!e.hidden });
      place += size;
    });
    this.nextUnit = this.def.enemies.length;
  }

  /** Is this ally fighting, and wearing this item? */
  wears(c: CharId, item: string): boolean {
    const e = this.equipment[c];
    return !!e && (e.relic === item || e.charm === item) && this.fighting.has(c);
  }

  // ---- queries ----

  unit(id: string): Unit | undefined {
    return this.units.find((u) => u.id === id);
  }

  get party(): Unit[] {
    return this.units.filter((u) => u.side === 'party');
  }

  get enemies(): Unit[] {
    return this.units.filter((u) => u.side === 'enemy');
  }

  /** Standing enemies, front to back. */
  standingEnemies(): Unit[] {
    return this.enemies.filter((u) => !u.fallen).sort((a, b) => a.place - b.place);
  }

  /** An enemy's rank among the standing (0 = the 1st); large ones take two ranks. */
  rank(u: Unit): number {
    let r = 0;
    for (const e of this.standingEnemies()) {
      if (e === u) return r;
      r += e.size;
    }
    return 99;
  }

  allyAt(place: Place): Unit | undefined {
    return this.party.find((u) => u.place === place);
  }

  /** Can the banderole be read, or does it show "?"? */
  shows(intent: Intent): boolean {
    const a = this.unit(intent.actor);
    return !a || !a.hiddenIntents || a.status.revealed;
  }

  /** The allies an intent would strike if it resolved now (for the target pips and lines). */
  aims(it: Intent): Unit[] {
    if (it.cancelled || 'self' in it.target) return [];
    if ('unit' in it.target && this.unit(it.target.unit)?.side === 'enemy') return [];
    const actor = this.unit(it.actor);
    if (actor && it.reach === 'close' && this.rank(actor) > 1) return [];
    const ts = this.targetsOf(it);
    return it.reach === 'close' ? ts.filter((t) => t.place <= 1) : ts;
  }

  /** The abilities an ally knows in this battle. */
  abilitiesOf(id: string): AbilityId[] {
    return this.abilities[id as CharId] ?? [];
  }

  /** Allies who can still act this phase. */
  ready(): Unit[] {
    return this.party.filter((u) => !u.fallen && !u.acted && !u.status.immured);
  }

  // ---- the round ----

  /** Begin the battle (round 1's Omen). */
  start(): void {
    if (this.round === 0) this.beginRound();
  }

  private emit(e: BattleEvent): void {
    this.events.push(e);
  }

  private beginRound(): void {
    this.round++;
    this.emit({ type: 'round', round: this.round });
    this.steps = 0;
    this.vigil = null;
    const carried = this.intents.filter((i) => i.waiting && !i.cancelled && i.actor !== 'env' && !this.unit(i.actor)?.fallen);
    this.intents = [];
    for (const e of this.standingEnemies()) {
      const mine = carried.filter((i) => i.actor === e.id);
      if (mine.length) {
        // A waiting or winding-up intent holds the banderole; the pattern does not advance.
        for (const w of mine) this.intents.push({ ...w, waiting: false });
        continue;
      }
      // A called tune: the dancers plan twice.
      for (let k = 0; k < (this.tuned ? 2 : 1); k++) {
        for (const spec of this.plan(e, this.round, () => this.rng.float())) {
          const it = this.makeIntent(e.id, spec);
          this.intents.push(it);
          this.declare(it, e);
        }
        e.phase++;
      }
    }
    this.tuned = false;
    const env = this.def.env?.(this.round, this.phases);
    if (env) this.intents.push(this.makeIntent('env', env));
    this.intents.forEach((it, i) => (it.order = i + 1));
    // The copyists have planned their copies; this round starts a new page.
    this.copied.clear();
    this.emit({ type: 'omen', intents: this.intents.map((i) => i.id) });
    // Whoever faltered last round loses their first intent now.
    for (const id of this.falterNext) {
      const it = this.intents.find((i) => i.actor === id && !i.cancelled);
      if (it) this.loseIntent(it);
    }
    this.falterNext.clear();
    this.resolved.clear();
    this.fed.clear();
    // The party's Ward fades as its phase begins (a charm's Ward lasts the first round).
    this.knelt.clear();
    for (const u of this.party) {
      if (this.round > 1) u.status.ward = 0;
      if (u.status.kneeling && !u.fallen) {
        this.knelt.add(u.id);
        u.status.kneeling = false;
      }
      u.acted = u.fallen || this.knelt.has(u.id);
      // Scraped from the page: can't act while it lasts.
      if (u.status.forgotten > 0 && !u.fallen) {
        u.acted = true;
        u.status.forgotten--;
      }
    }
    if (this.squinted > 0) {
      this.squinted--;
      this.preview = this.predict();
    } else this.preview = null;
    this.history.length = 0;
  }

  /** Is this ally kneeling this round (made to by an Edict)? */
  kneeling(id: string): boolean {
    return this.knelt.has(id);
  }

  /** Some intents change the field the moment they are declared: a shell, a doom. */
  private declare(it: Intent, actor: Unit): void {
    for (const e of it.effects) {
      if (e.kind === 'shell') {
        actor.status.shelled = true;
        this.emit({ type: 'status', unit: actor.id, status: 'shelled', on: true });
      } else if (e.kind === 'unshell' && actor.status.shelled) {
        actor.status.shelled = false;
        this.emit({ type: 'status', unit: actor.id, status: 'shelled', on: false });
      } else if (e.kind === 'doom' && 'unit' in it.target) {
        const t = this.unit(it.target.unit);
        if (t) t.status.doomed = true;
      } else if (e.kind === 'scrapeLetters') {
        this.phases.add('gathering');
      } else if (e.kind === 'guard' && 'unit' in it.target) {
        const t = this.unit(it.target.unit);
        if (t && !t.fallen) {
          t.status.guarded = true;
          this.emit({ type: 'status', unit: t.id, status: 'guarded', on: true });
        }
      }
    }
  }

  private plan(e: Unit, round: number, rng: () => number): IntentSpec[] {
    const def = ENEMIES[e.kind]!;
    const allies = this.standingEnemies()
      .filter((o) => o !== e)
      .map((o) => ({ id: o.id, kind: o.kind, name: o.name, hp: o.hp, maxHp: o.maxHp, place: o.place }));
    const fallen = this.enemies.filter((o) => o !== e && o.fallen).map((o) => ({ id: o.id, kind: o.kind, name: o.name }));
    const party = this.party.filter((u) => !u.fallen).map((u) => ({ id: u.id, name: u.name, hp: u.hp, maxHp: u.maxHp, place: u.place }));
    const k = this.copied.get(e.id);
    const by = k ? this.unit(k.by) : undefined;
    const copied = k && by && !by.fallen ? { ...k, byName: by.name } : undefined;
    return def.behave({ round, phase: e.phase, hp: e.hp, maxHp: e.maxHp, place: e.place, allies, party, fallen, letters: this.letters, phases: this.phases, copied, rng });
  }

  private makeIntent(actor: string, s: IntentSpec): Intent {
    // The difficulty bends the blow, and the banderole says what it will really deal.
    const base = s.damage ?? 0;
    const damage = enemyDamage(base, this.difficulty);
    const foretold = s.foretells ? enemyDamage(s.foretells, this.difficulty) : 0;
    let label = relabel(s.label, base, damage);
    if (s.foretells) label = relabel(label, s.foretells, foretold);
    return {
      id: `i${this.nextIntentId++}`,
      actor,
      order: 0,
      label,
      rule: s.rule && relabel(s.rule, base, damage),
      target: s.target,
      damage,
      reach: s.reach ?? 'any',
      effects: s.effects ?? [],
      countdown: s.countdown ?? 0,
      cancelled: false,
      waiting: false,
    };
  }

  /** What every enemy means to do next round as things stand (for Squint). Changes nothing. */
  private predict(): Intent[] {
    const out: Intent[] = [];
    const id = this.nextIntentId;
    const tune = this.intents.some((i) => !i.cancelled && i.effects.some((e) => e.kind === 'tune') && !this.unit(i.actor)?.status.immured);
    for (const e of this.standingEnemies()) {
      const holding = this.intents.filter((i) => i.actor === e.id && i.countdown > 0 && !i.cancelled);
      if (holding.length) {
        for (const h of holding) out.push({ ...h, countdown: h.countdown - 1, id: `p${h.id}` });
        continue;
      }
      for (let k = 0; k < (tune ? 2 : 1); k++) {
        const saved = e.phase;
        e.phase += k;
        for (const s of this.plan(e, this.round + 1, () => 0.5)) out.push({ ...this.makeIntent(e.id, s), id: `p${out.length}` });
        e.phase = saved;
      }
    }
    this.nextIntentId = id;
    return out;
  }

  // ---- party phase ----

  private snapshot(): void {
    this.history.push({
      units: structuredClone(this.units),
      intents: structuredClone(this.intents),
      ink: this.ink,
      steps: this.steps,
      spared: [...this.spared],
      vigil: this.vigil ? { ...this.vigil } : null,
      usedOnce: [...this.usedOnce],
      firstBlow: [...this.firstBlow],
      firstAbility: [...this.firstAbility],
      squinted: this.squinted,
      preview: this.preview,
      revivals: this.revivals,
      phases: [...this.phases],
      nextUnit: this.nextUnit,
      letters: this.letters,
      inscribedRound: this.inscribedRound,
      dealt: [...this.dealt],
      falterNext: [...this.falterNext],
      satchel: { ...this.satchel },
      copied: [...this.copied].map(([k, v]) => [k, { ...v }]),
      eventsLen: this.events.length,
    });
  }

  get canUndo(): boolean {
    return this.history.length > 0;
  }

  /** Take back the last action or Step of this phase. */
  undo(): boolean {
    const s = this.history.pop();
    if (!s) return false;
    this.units = s.units;
    this.intents = s.intents;
    this.ink = s.ink;
    this.steps = s.steps;
    this.spared = new Set(s.spared);
    this.vigil = s.vigil;
    this.usedOnce = new Set(s.usedOnce);
    this.firstBlow = new Set(s.firstBlow);
    this.firstAbility = new Set(s.firstAbility);
    this.squinted = s.squinted;
    this.preview = s.preview;
    this.revivals = s.revivals;
    this.phases = new Set(s.phases);
    this.nextUnit = s.nextUnit;
    this.letters = s.letters;
    this.inscribedRound = s.inscribedRound;
    this.dealt = new Map(s.dealt);
    this.falterNext = new Set(s.falterNext);
    this.satchel = s.satchel;
    this.copied = new Map(s.copied);
    this.events.length = s.eventsLen;
    this.result = 'ongoing';
    return true;
  }

  /** The free Step: swap two neighbouring allies, once per round. */
  canStep(a: Place, b: Place): boolean {
    const ua = this.allyAt(a);
    const ub = this.allyAt(b);
    return this.result === 'ongoing' && !this.stepUsed && Math.abs(a - b) === 1 && !!ua && !!ub && !ua.status.immured && !ub.status.immured;
  }

  step(a: Place, b: Place): boolean {
    if (!this.canStep(a, b)) return false;
    this.snapshot();
    const ua = this.allyAt(a)!;
    const ub = this.allyAt(b)!;
    ua.place = b;
    ub.place = a;
    this.steps++;
    this.emit({ type: 'move', unit: ua.id, from: a, to: b });
    this.emit({ type: 'move', unit: ub.id, from: b, to: a });
    return true;
  }

  /** Are this round's free Steps all taken? */
  get stepUsed(): boolean {
    return this.steps >= this.stepsAllowed;
  }

  /** Ink cost of an ability for its user right now (Emend costs 2 to name an enemy). */
  inkCost(user: Unit, ability: AbilityId, target: ActTarget = {}): number {
    const def = ABILITIES[ability];
    if (!def.ink) return 0;
    const naming = ability === 'emend' && !!target.to && this.unit(target.to)?.side === 'enemy' ? 1 : 0;
    return def.ink + naming + (user.status.smudged ? 1 : 0);
  }

  hpCost(ability: AbilityId, user: Unit): number {
    const def = ABILITIES[ability];
    if (!def.hp) return 0;
    if (ability === 'shrive' && this.wears(user.kind as CharId, 'psalterChain')) return 2;
    if (ability === 'immure' && this.wears(user.kind as CharId, 'lepersClapper')) return 0;
    return def.hp;
  }

  /** Can this ally use this ability (on this target)? Returns the reason when not. */
  check(userId: string, ability: AbilityId, target: ActTarget = {}): Refusal | null {
    const u = this.unit(userId);
    if (this.result !== 'ongoing') return 'over';
    if (!u || u.side !== 'party') return 'no-unit';
    if (u.fallen) return 'fallen';
    if (u.acted) return 'acted';
    if (u.status.immured) return 'immured';
    if (!this.abilities[u.kind as CharId]?.includes(ability)) return 'unknown';
    const def = ABILITIES[ability];
    if (def.oncePerBattle && this.usedOnce.has(ability)) return 'used';
    if (def.fromFront && u.place > 1) return 'from-front';
    if (ability === 'vigil' && u.place > 0 && this.wears(u.kind as CharId, 'scallop')) return 'front-only';
    if (this.inkCost(u, ability, target) > this.ink) return 'ink';
    const hp = this.hpCost(ability, u);
    if (hp && u.hp <= hp) return 'hp';
    const t = target.unit ? this.unit(target.unit) : undefined;
    switch (def.target) {
      case 'enemy':
        if (!t || t.side !== 'enemy' || t.fallen) return 'target';
        if (t.status.immured) return 'immured-target';
        if (t.status.guarded) return 'guarded';
        if (def.reachEnemy && this.rank(t) >= def.reachEnemy + (ability === 'lance' && this.wears('whit', 'coronel') ? 1 : 0)) return 'reach';
        if (ability === 'read' && ENEMIES[t.kind]?.undying) return 'too-strong';
        if (ability === 'read' && t.hp > this.readThreshold(u)) return 'too-strong';
        break;
      case 'ally':
        if (!t || t.side !== 'party' || t.fallen) return 'target';
        break;
      case 'fallenOrAlly':
        if (!t || t.side !== 'party') return 'target';
        if (t.status.immured) return 'immured-target';
        break;
      case 'anyUnit':
        if (!t || t.fallen) return 'target';
        if (ability === 'immure' && t.side !== 'enemy' && this.wears(u.kind as CharId, 'lepersClapper')) return 'enemies-only';
        if (t.status.immured) return 'immured-target';
        if (t.status.guarded) return 'guarded';
        break;
      case 'intent': {
        const it = this.intents.find((i) => i.id === target.intent);
        if (!it || it.cancelled) return 'target';
        if (ability === 'emend') {
          // Ermeline's stroke at the inkhorn can be turned too: onto an enemy, to free her.
          if (it.effects.some((e) => e.kind === 'drain')) {
            const to = target.to ? this.unit(target.to) : undefined;
            if (!this.emendAnywhere || !to || to.side !== 'enemy' || to.fallen || to.status.immured) return 'target';
            break;
          }
          if (!('place' in it.target || 'unit' in it.target) || it.damage <= 0) return 'not-single';
          const to = target.to ? this.unit(target.to) : undefined;
          if (!to || to.fallen) return 'target';
          if (to.side === 'enemy' && (!this.emendAnywhere || to.id === it.actor || to.status.immured)) return 'target';
        }
        break;
      }
      case 'none':
        if (ability === 'inscribe' && (this.def.objective !== 'finis' || u.place !== 2 || this.letters >= 5)) return 'lectern';
        if (ability === 'shove') {
          const first = this.standingEnemies()[0];
          if (!first) return 'target';
          if (first.status.immured) return 'immured-target';
          if (first.status.guarded) return 'guarded';
        }
        break;
    }
    return null;
  }

  /** Read Aloud's threshold for this reader right now. */
  readThreshold(u: Unit): number {
    return this.isDoubled(u) ? 12 : 6;
  }

  private isDoubled(u: Unit): boolean {
    return u.status.rubricated || this.firstAbility.has(u.id);
  }

  /** Use an ability. Its effects happen at once; returns false (and changes nothing) if not allowed. */
  act(userId: string, ability: AbilityId, target: ActTarget = {}): boolean {
    if (this.check(userId, ability, target)) return false;
    this.snapshot();
    const u = this.unit(userId)!;
    const t = target.unit ? this.unit(target.unit) : undefined;
    const ink = this.inkCost(u, ability, target);
    if (ink > 0) {
      this.ink -= ink;
      this.emit({ type: 'ink', amount: -ink });
      u.status.smudged = false;
    }
    const hp = this.hpCost(ability, u);
    if (hp) {
      u.hp -= hp;
      this.emit({ type: 'damage', unit: u.id, amount: hp, absorbed: 0, source: 'penance' });
    }
    if (ABILITIES[ability].oncePerBattle) this.usedOnce.add(ability);
    u.acted = true;
    this.emit({ type: 'act', unit: u.id, ability, target: target.unit ?? target.intent });
    let dbl = false;
    if (DOUBLES.has(ability) && this.isDoubled(u)) {
      dbl = true;
      if (u.status.rubricated) u.status.rubricated = false;
      else this.firstAbility.delete(u.id);
    }
    const x = dbl ? 2 : 1;
    this.acting = { ability, by: u.id };
    switch (ability) {
      case 'penknife': {
        const bonus = this.wears('isot', 'wystansPumice') && t!.status.glossed ? 1 : 0;
        // A Blotlet is ink: the penknife fills her pen.
        if (ENEMIES[t!.kind]?.inkwell && this.ink < this.maxInk) {
          this.ink++;
          this.emit({ type: 'ink', amount: 1 });
        }
        const knife = (hasRank(this.level, 'penknife2') ? 3 : 2) - (this.wears('isot', 'silverpoint') ? 1 : 0);
        this.hurt(t!, knife * x + bonus, u.id);
        break;
      }
      case 'gloss':
        this.copied.set(t!.id, { ability, by: u.id, amount: 0 });
        t!.status.glossed = true;
        t!.status.revealed = true;
        this.emit({ type: 'status', unit: t!.id, status: 'glossed', on: true });
        break;
      case 'strike': {
        const it = this.intents.find((i) => i.id === target.intent)!;
        it.cancelled = true;
        it.countdown = 0;
        this.undeclare(it);
        this.emit({ type: 'cancel', intent: it.id });
        break;
      }
      case 'emend': {
        const it = this.intents.find((i) => i.id === target.intent)!;
        it.target = { unit: target.to! };
        it.turned = this.unit(target.to!)!.side === 'enemy';
        this.emit({ type: 'retarget', intent: it.id });
        break;
      }
      case 'rubric':
        t!.status.rubricated = true;
        this.emit({ type: 'status', unit: t!.id, status: 'rubricated', on: true });
        break;
      case 'shove': {
        const first = this.standingEnemies()[0]!;
        const plumb = this.wears('hild', 'plumbLine');
        this.hurt(first, ((hasRank(this.level, 'shove2') ? 3 : 2) + (plumb ? 2 : 0)) * x, u.id);
        if (!first.fallen) {
          if (plumb) this.backOne(first);
          else this.toBack(first);
        }
        break;
      }
      case 'shrive': {
        const amount = ((hasRank(this.level, 'shrive2') ? 8 : 6) - (this.wears('hild', 'psalterChain') ? 1 : 0)) * x;
        if (t!.fallen) {
          t!.fallen = false;
          t!.hp = Math.min(t!.maxHp, amount);
          t!.acted = true;
          this.emit({ type: 'rise', unit: t!.id });
          this.emit({ type: 'heal', unit: t!.id, amount: t!.hp });
        } else this.heal(t!, amount);
        break;
      }
      case 'immure':
        t!.status.immured = true;
        t!.status.immuredLong = dbl;
        if (t!.side === 'enemy') for (const it of this.intents) if (it.actor === t!.id && !it.cancelled) it.waiting = true;
        this.emit({ type: 'status', unit: t!.id, status: 'immured', on: true });
        break;
      case 'squint':
        for (const e of this.enemies) e.status.revealed = true;
        this.squinted = dbl ? 2 : 1;
        this.preview = this.predict();
        this.emit({ type: 'status', unit: u.id, status: 'revealed', on: true });
        break;
      case 'benison':
        for (const a of this.party) {
          if (a.fallen) continue;
          this.heal(a, 5 * x);
          a.status.ward += 3 * x;
          this.emit({ type: 'ward', unit: a.id, amount: 3 * x });
        }
        break;
      case 'lance':
        this.hurt(t!, ((hasRank(this.level, 'lance2') ? 5 : 4) - (this.wears('whit', 'bellClapper') ? 1 : 0) - (this.wears('whit', 'coronel') ? 1 : 0)) * x, u.id);
        break;
      case 'tally':
        t!.status.tally = this.wears('whit', 'blankPennon') ? 2 : 3;
        t!.status.tallyDoubled = dbl;
        this.emit({ type: 'status', unit: t!.id, status: 'tally', on: true });
        break;
      case 'vigil':
        this.vigil = { by: u.id, power: (this.wears('whit', 'scallop') ? 6 : 4) * x };
        this.emit({ type: 'status', unit: u.id, status: 'ward', on: true });
        break;
      case 'read':
        this.fell(t!, true);
        break;
      case 'inscribe': {
        this.letters++;
        this.inscribedRound = this.round;
        const m = FINIS_MEMORIES[this.letters - 1]!;
        this.emit({ type: 'letter', count: this.letters, lost: false });
        this.emit({ type: 'phase', title: { en: m.letter, fr: m.letter }, line: { en: m.en, fr: m.fr } });
        if (this.letters === 3 && !this.phases.has('cleanPage')) {
          this.phases.add('cleanPage');
          this.emit({ type: 'phase', id: 'cleanPage', title: { en: 'The Clean Page', fr: 'La Page propre' }, line: { en: 'Aumery steps into the Book. Now MERCY tolls on the page itself.', fr: 'Aumery entre dans le Livre. À présent MERCY sonne sur la page même.' } });
        }
        if (this.letters === 5) {
          this.result = 'victory';
          this.emit({ type: 'victory' });
        }
        break;
      }
    }
    this.acting = null;
    this.checkEnd();
    return true;
  }

  /** What has been used from the satchel so far this fight. */
  spent(): Satchel {
    const out: Satchel = {};
    for (const id of SATCHEL_IDS) {
      const n = (this.packed[id] ?? 0) - (this.satchel[id] ?? 0);
      if (n > 0) out[id] = n;
    }
    return out;
  }

  /** Why an ally can't use this from the satchel on this target, or null if they can. */
  checkItem(userId: string, item: SatchelId, target: ActTarget = {}): Refusal | null {
    const u = this.unit(userId);
    if (this.result !== 'ongoing') return 'over';
    if (!u || u.side !== 'party') return 'no-unit';
    if (u.fallen) return 'fallen';
    if (u.acted) return 'acted';
    if (u.status.immured) return 'immured';
    if (!(this.satchel[item] ?? 0)) return 'empty';
    const t = target.unit ? this.unit(target.unit) : undefined;
    switch (SATCHEL[item].target) {
      case 'ally':
        if (!t || t.side !== 'party' || t.fallen) return 'target';
        break;
      case 'fallen':
        if (!t || t.side !== 'party' || !t.fallen) return 'target';
        break;
      case 'enemy':
        if (!t || t.side !== 'enemy' || t.fallen) return 'target';
        if (t.status.immured) return 'immured-target';
        if (t.status.guarded) return 'guarded';
        break;
      case 'none':
        if (item === 'gallInk' && this.ink >= this.maxInk) return 'full';
        break;
    }
    return null;
  }

  /** Use something from the satchel instead of an ability: it spends the ally's action. */
  useItem(userId: string, item: SatchelId, target: ActTarget = {}): boolean {
    if (this.checkItem(userId, item, target)) return false;
    this.snapshot();
    const u = this.unit(userId)!;
    const t = target.unit ? this.unit(target.unit) : undefined;
    this.satchel = { ...this.satchel, [item]: (this.satchel[item] ?? 0) - 1 };
    u.acted = true;
    this.emit({ type: 'item', unit: u.id, item, target: target.unit });
    switch (item) {
      case 'poultice':
        this.heal(t!, 8);
        break;
      case 'gallInk': {
        const gain = Math.min(this.maxInk - this.ink, 2);
        this.ink += gain;
        this.emit({ type: 'ink', amount: gain });
        break;
      }
      case 'waxSeal':
        t!.status.ward += 4;
        this.emit({ type: 'ward', unit: t!.id, amount: 4 });
        break;
      case 'holyWater':
        if (t!.status.ward) {
          t!.status.ward = 0;
          this.emit({ type: 'status', unit: t!.id, status: 'ward', on: false });
        }
        if (t!.status.shelled) {
          t!.status.shelled = false;
          this.emit({ type: 'status', unit: t!.id, status: 'shelled', on: false });
        }
        break;
      case 'salVolatile':
        t!.fallen = false;
        t!.hp = Math.min(t!.maxHp, 6);
        t!.acted = true;
        this.emit({ type: 'rise', unit: t!.id });
        this.emit({ type: 'heal', unit: t!.id, amount: t!.hp });
        break;
    }
    this.checkEnd();
    return true;
  }

  /** A cancelled intent takes back what it declared. */
  private undeclare(it: Intent): void {
    const actor = this.unit(it.actor);
    for (const e of it.effects) {
      // A gathering struck through or lost can be gathered again.
      if (e.kind === 'scrapeLetters') this.phases.delete('gathering');
      if (e.kind === 'shell' && actor) actor.status.shelled = false;
      if ((e.kind === 'doom' || e.kind === 'guard') && 'unit' in it.target) {
        const t = this.unit(it.target.unit);
        if (t) {
          if (e.kind === 'doom') t.status.doomed = false;
          else t.status.guarded = false;
        }
      }
    }
  }

  /** End the party phase: enemies act, the round ends, the next Omen begins. */
  endTurn(): void {
    if (this.result !== 'ongoing') return;
    this.history.length = 0;
    for (const e of this.enemies) e.status.ward = 0;
    const order = [...this.intents].sort((a, b) => a.order - b.order);
    for (const it of order) {
      if (this.result !== 'ongoing') break;
      this.resolve(it);
    }
    if (this.result === 'ongoing') this.endRound();
    if (this.result === 'ongoing') this.beginRound();
  }

  // ---- enemy phase ----

  private targetsOf(it: Intent): Unit[] {
    const open = (u: Unit | undefined): u is Unit => !!u && !u.fallen && !u.status.immured;
    const t = it.target;
    if ('all' in t) return this.party.filter(open);
    if ('places' in t) return t.places.map((p) => this.allyAt(p)).filter(open);
    if ('unit' in t) {
      const u = this.unit(t.unit);
      return open(u) ? [u] : [];
    }
    if ('place' in t) {
      const at = this.allyAt(t.place);
      if (at?.status.immured) return [];
      if (open(at)) return [at];
      // A blow at an empty or fallen place carries back, then forward.
      for (let p = t.place + 1; p < 3; p++) {
        const u = this.allyAt(p);
        if (open(u)) return [u];
      }
      for (let p = t.place - 1; p >= 0; p--) {
        const u = this.allyAt(p);
        if (open(u)) return [u];
      }
    }
    return [];
  }

  private resolve(it: Intent): void {
    this.resolved.add(it.id);
    if (it.cancelled) return;
    const actor = it.actor === 'env' ? null : this.unit(it.actor)!;
    if (actor?.fallen) return;
    if (actor?.status.immured) {
      it.waiting = true;
      this.emit({ type: 'fizzle', intent: it.id, reason: 'immured' });
      return;
    }
    if (it.countdown > 0) {
      this.emit({ type: 'windup', intent: it.id, actor: it.actor, countdown: it.countdown });
      return;
    }
    this.emit({ type: 'intent', intent: it.id, actor: it.actor });
    if (it.effects.some((e) => e.kind === 'scrapeLetters')) {
      this.phases.delete('gathering');
      if (this.letters > 0) {
        this.letters = 0;
        this.emit({ type: 'letter', count: 0, lost: true });
        this.emit({ type: 'phase', title: { en: 'Scraped Clean', fr: 'Gratté net' }, line: { en: 'The pumice takes every letter. Begin again: F.', fr: 'La ponce emporte toutes les lettres. Reprendre : F.' } });
      }
      return;
    }
    if (it.effects.some((e) => e.kind === 'turn')) this.turnDance();
    if (it.effects.some((e) => e.kind === 'tune')) this.tuned = true;
    if (it.effects.some((e) => e.kind === 'drain')) {
      if (it.turned) {
        this.phases.add('ermelineFree');
        this.emit({ type: 'phase', title: { en: 'Ermeline Is Free', fr: 'Ermeline est libre' }, line: { en: 'Her stroke turned, she lets go of the inkhorn and surfaces, gasping.', fr: 'Son geste détourné, elle lâche la corne d’encre et remonte, haletante.' } });
      } else if (this.ink > 0) {
        this.ink--;
        this.emit({ type: 'ink', amount: -1 });
      }
      return;
    }
    for (const e of it.effects) if (e.kind === 'spawn' && actor) this.spawn(e.enemy, actor);
    if ('self' in it.target) {
      if (actor) this.applyEffects(it, actor, actor);
      return;
    }
    if (it.turned && 'unit' in it.target) {
      // Emended onto another enemy: the blow lands there, and nothing else happens.
      const t = this.unit(it.target.unit)!;
      if (t.fallen || t.status.immured) this.emit({ type: 'fizzle', intent: it.id, reason: 'no-target' });
      else this.hurt(t, it.damage, it.actor);
      return;
    }
    if ('unit' in it.target && this.unit(it.target.unit)?.side === 'enemy') {
      // Helping an ally: "Holds the line", a dose, a revival.
      const ally = this.unit(it.target.unit)!;
      if (it.effects.some((e) => e.kind === 'raise')) {
        if (ally.fallen) this.raise(ally, actor);
        else this.emit({ type: 'fizzle', intent: it.id, reason: 'no-target' });
      } else if (!ally.fallen) this.applyEffects(it, actor, ally);
      return;
    }
    if (actor && it.reach === 'close' && this.rank(actor) > 1) {
      this.emit({ type: 'fizzle', intent: it.id, reason: 'reach' });
      return;
    }
    let targets = this.targetsOf(it);
    if (it.reach === 'close') targets = targets.filter((t) => t.place <= 1);
    if (!targets.length) {
      this.emit({ type: 'fizzle', intent: it.id, reason: 'no-target' });
      return;
    }
    // Vigil: the first enemy whose blow would land is struck first.
    if (actor && this.vigil && it.damage > 0) {
      const by = this.unit(this.vigil.by);
      const power = this.vigil.power;
      this.vigil = null;
      if (by && !by.fallen && !by.status.immured) {
        this.emit({ type: 'vigil', unit: actor.id, by: by.id });
        this.hurt(actor, power, by.id);
        if (actor.fallen) return;
      }
    }
    for (const t of targets) {
      const before = t.hp;
      if (it.damage > 0) this.hurt(t, it.damage, it.actor);
      // What a leeching blow takes, it keeps.
      const taken = before - Math.max(0, t.hp);
      if (actor && !actor.fallen && taken > 0 && it.effects.some((e) => e.kind === 'leech')) {
        this.heal(actor, taken);
        this.fed.add(actor.id);
      }
      this.applyEffects(it, actor, t);
      if (this.result !== 'ongoing') return;
    }
  }

  private applyEffects(it: Intent, actor: Unit | null, t: Unit): void {
    for (const e of it.effects) {
      switch (e.kind) {
        case 'stripWard':
          if (t.status.ward > 0) {
            t.status.ward = 0;
            this.emit({ type: 'status', unit: t.id, status: 'ward', on: false });
          }
          break;
        case 'smudge':
          if (!t.fallen && t.id === 'isot') {
            t.status.smudged = true;
            this.emit({ type: 'status', unit: t.id, status: 'smudged', on: true });
          }
          break;
        case 'wardAlly':
          t.status.ward += e.amount;
          this.emit({ type: 'ward', unit: t.id, amount: e.amount });
          break;
        case 'heal':
          this.heal(t, e.amount);
          break;
        case 'gloss':
          if (!t.fallen) {
            t.status.glossed = true;
            this.emit({ type: 'status', unit: t.id, status: 'glossed', on: true });
          }
          break;
        case 'kneel':
          if (!t.fallen) t.status.kneeling = true;
          break;
        case 'forget':
          if (!t.fallen) {
            t.status.forgotten = Math.max(t.status.forgotten, e.rounds);
            this.emit({ type: 'status', unit: t.id, status: 'forgotten', on: true });
          }
          break;
        case 'swapFrontMiddle': {
          const f = this.allyAt(0);
          const m = this.allyAt(1);
          if (f && m && !f.status.immured && !m.status.immured) {
            f.place = 1;
            m.place = 0;
            this.emit({ type: 'move', unit: f.id, from: 0, to: 1 });
            this.emit({ type: 'move', unit: m.id, from: 1, to: 0 });
          }
          break;
        }
        case 'toBack':
          if (actor) this.toBack(actor);
          break;
        case 'shell':
        case 'unshell':
        case 'doom':
        case 'guard':
        case 'raise':
        case 'spawn':
        case 'tune':
        case 'turn':
        case 'scrapeLetters':
          // Declared at the Omen, or handled by the boss scripts that use them.
          break;
      }
    }
  }

  // ---- damage ----

  private hurt(u: Unit, amount: number, source: string): void {
    if (u.fallen || amount <= 0) return;
    // Blows from the party pass through the hollow; after the Empty Place, the dance spares Whit.
    const from = this.unit(source);
    const byParty = from?.side === 'party' || source === 'reckoning';
    if ((u.status.hollow && byParty) || (this.phases.has('emptyPlace') && u.id === 'whit' && from?.status.hollow)) {
      this.emit({ type: 'pass', unit: u.id });
      return;
    }
    let a = amount;
    if (u.status.glossed) {
      a += this.wears('isot', 'silverpoint') ? 4 : 3;
      u.status.glossed = false;
    }
    if (u.status.doomed) a *= 2;
    if (u.status.shelled) a = Math.min(a, 1);
    if (u.side === 'party' && this.firstBlow.has(u.id)) {
      a = Math.max(0, a - 1);
      this.firstBlow.delete(u.id);
    }
    // Saint Ebb's girdle: in the Rear, every blow is a point lighter.
    if (u.side === 'party' && !byParty && u.place === 2 && this.wears(u.kind as CharId, 'ebbGirdle')) a = Math.max(0, a - 1);
    const absorbed = Math.min(u.status.ward, a);
    u.status.ward -= absorbed;
    a -= absorbed;
    // Gervase's Ribbon: the first fall of the battle is turned aside, at 1 HP.
    if (u.side === 'party' && a >= u.hp && this.spared.has(u.id)) {
      this.spared.delete(u.id);
      a = u.hp - 1;
      this.emit({ type: 'spared', unit: u.id });
    }
    // A big enough hit splits off a piece of the Blot.
    const splits = u.side === 'enemy' ? ENEMIES[u.kind]?.splits : undefined;
    if (splits && byParty && a >= splits.at) this.spawn(splits.into, u);
    const def = u.side === 'enemy' ? ENEMIES[u.kind] : undefined;
    if (u.status.readOnly || def?.undying) a = Math.min(a, u.hp - 1);
    u.hp -= a;
    // Every so much damage, a boss falters: its next intent is lost.
    if (def?.falterEvery && a > 0) {
      const before = this.dealt.get(u.id) ?? 0;
      this.dealt.set(u.id, before + a);
      for (let k = Math.floor(before / def.falterEvery); k < Math.floor((before + a) / def.falterEvery); k++) this.falter(u);
    }
    // A letter written this round smudges if the scribe is hurt before the round is out.
    if (u.id === 'isot' && a > 0 && this.def.objective === 'finis' && this.inscribedRound === this.round && this.letters > 0) {
      this.letters--;
      this.inscribedRound = -1;
      this.emit({ type: 'letter', count: this.letters, lost: true });
    }
    this.emit({ type: 'damage', unit: u.id, amount: a, absorbed, source });
    // What an ally's ability did to an enemy, for a copyist to copy (the sum, if it was hit twice).
    if (u.side === 'enemy' && this.acting && from?.side === 'party' && a > 0) {
      const was = this.copied.get(u.id);
      const same = was && was.ability === this.acting.ability && was.by === this.acting.by;
      this.copied.set(u.id, { ...this.acting, amount: (same ? was.amount : 0) + a });
    }
    if (u.hp <= 0) {
      this.fell(u, false);
      return;
    }
    const ph = u.side === 'enemy' ? ENEMIES[u.kind]?.phaseAt : undefined;
    if (ph && u.hp <= enemyHp(ph.hp, this.difficulty) && !this.phases.has(ph.id)) {
      this.phases.add(ph.id);
      this.emit({ type: 'phase', title: ph.title, line: ph.line, id: ph.id });
    }

    if (a > 0 && u.status.tally !== null && source !== 'reckoning') {
      u.status.tally--;
      if (u.status.tally <= 0) this.reckon(u);
    }
  }

  private reckon(u: Unit): void {
    const base = this.wears('whit', 'bellClapper') ? 9 : 7;
    const amount = u.status.tallyDoubled ? base * 2 : base;
    u.status.tally = null;
    u.status.tallyDoubled = false;
    this.emit({ type: 'reckoning', unit: u.id, amount });
    this.hurt(u, amount, 'reckoning');
  }

  private heal(u: Unit, amount: number): void {
    const before = u.hp;
    const more = u.side === 'party' && this.wears(u.kind as CharId, 'gallRosary') ? 2 : 0;
    u.hp = Math.min(u.maxHp, u.hp + amount + more);
    this.emit({ type: 'heal', unit: u.id, amount: u.hp - before });
  }

  /** A boss falters: its next unresolved intent this round is lost, or its first one next round. */
  private falter(u: Unit): void {
    this.emit({ type: 'falter', unit: u.id });
    const it = this.intents.find((i) => i.actor === u.id && !i.cancelled && !this.resolved.has(i.id));
    if (it) this.loseIntent(it);
    else this.falterNext.add(u.id);
  }

  private loseIntent(it: Intent): void {
    it.cancelled = true;
    it.countdown = 0;
    this.undeclare(it);
    this.emit({ type: 'cancel', intent: it.id });
  }

  private fell(u: Unit, read: boolean): void {
    if (u.fallen) return;
    if (u.status.readOnly && !read) {
      u.hp = Math.max(1, u.hp);
      return;
    }
    u.hp = 0;
    u.fallen = true;
    u.status.tally = null;
    u.status.ward = 0;
    this.emit({ type: 'fall', unit: u.id });
    // An ember bursts as it goes out.
    const burst = u.side === 'enemy' && !read ? ENEMIES[u.kind]?.bursts : undefined;
    if (burst) {
      const t = this.allyAt(burst.place);
      if (t && !t.fallen) this.hurt(t, burst.damage, 'burst');
    }
    // The mourning brooch: whoever wears it steels themself when another ally falls.
    if (u.side === 'party')
      for (const o of this.party)
        if (o !== u && !o.fallen && this.wears(o.kind as CharId, 'mourningBrooch')) {
          o.status.ward += 3;
          this.emit({ type: 'ward', unit: o.id, amount: 3 });
        }
    if (this.def.mustSurvive === u.id && this.result === 'ongoing') {
      this.result = 'defeat';
      this.emit({ type: 'defeat' });
      return;
    }
    // The one who leads falls, and everything bound to it falls too.
    if (u.side === 'enemy' && ENEMIES[u.kind]?.leads)
      for (const o of this.enemies)
        if (!o.fallen && ENEMIES[o.kind]?.bound) {
          o.hp = 0;
          o.fallen = true;
          this.emit({ type: 'fall', unit: o.id });
        }
    this.checkEnd();
  }

  /** A new enemy rises into the empty place nearest `near` (there are four places). */
  private spawn(kind: string, near: Unit): void {
    const def = ENEMIES[kind];
    if (!def) return;
    const taken = new Set<number>();
    for (const o of this.standingEnemies()) for (let k = 0; k < o.size; k++) taken.add(o.place + k);
    const free = [0, 1, 2, 3].filter((p) => !taken.has(p)).sort((a, b) => Math.abs(a - near.place) - Math.abs(b - near.place) || b - a)[0];
    if (free === undefined) return;
    const st = freshStatuses();
    st.readOnly = !!def.readOnly;
    st.hollow = !!def.hollow;
    const hp = enemyHp(def.hp, this.difficulty);
    const u: Unit = { id: `e${this.nextUnit++}`, side: 'enemy', kind, name: def.name, hp, maxHp: hp, place: free, size: def.size ?? 1, status: st, fallen: false, acted: true, phase: 0, hiddenIntents: !!def.hidden };
    this.units.push(u);
    this.emit({ type: 'spawn', unit: u.id });
  }

  /** The dance turns: every standing enemy moves one place back, and the last comes to the front. */
  private turnDance(): void {
    const line = this.standingEnemies();
    if (line.length < 2) return;
    const order = [line[line.length - 1]!, ...line.slice(0, -1)];
    let place = 0;
    for (const o of order) {
      if (o.place !== place) this.emit({ type: 'move', unit: o.id, from: o.place, to: place });
      o.place = place;
      place += o.size;
    }
  }

  /** Revivals so far: after the second, the masks crack and each costs the reviver 3 HP. */
  private revivals = 0;

  private raise(u: Unit, by: Unit | null): void {
    u.fallen = false;
    u.hp = u.maxHp;
    u.status = { ...freshStatuses(), readOnly: u.status.readOnly };
    // Back into the line, at the back.
    const line = this.standingEnemies().filter((o) => o !== u);
    const back = line.reduce((p, o) => Math.max(p, o.place + o.size), 0);
    const from = u.place;
    u.place = back;
    this.emit({ type: 'rise', unit: u.id });
    this.emit({ type: 'heal', unit: u.id, amount: u.hp });
    if (from !== back) this.emit({ type: 'move', unit: u.id, from, to: back });
    this.revivals++;
    if (this.revivals === 2)
      this.emit({
        type: 'phase',
        title: { en: 'The Masks Crack', fr: 'Les masques se fendent' },
        line: { en: 'The play wants to end: each revival now costs the Doctor 3 HP.', fr: 'La pièce veut finir : chaque résurrection coûte désormais 3 PV au Docteur.' },
      });
    else if (this.revivals > 2 && by) this.hurt(by, 3, 'masks');
  }

  /** Push an enemy one place back: it trades places with the one behind it (the plumb-line). */
  private backOne(e: Unit): void {
    const line = this.standingEnemies();
    const behind = line[line.indexOf(e) + 1];
    if (!behind) return;
    const from = e.place;
    behind.place = from;
    e.place = from + behind.size;
    this.emit({ type: 'move', unit: behind.id, from: from + e.size, to: from });
    this.emit({ type: 'move', unit: e.id, from, to: e.place });
  }

  private toBack(e: Unit): void {
    const from = e.place;
    let place = 0;
    for (const o of this.standingEnemies()) {
      if (o === e) continue;
      if (o.place !== place) this.emit({ type: 'move', unit: o.id, from: o.place, to: place });
      o.place = place;
      place += o.size;
    }
    e.place = place;
    if (from !== place) this.emit({ type: 'move', unit: e.id, from, to: place });
  }

  private endRound(): void {
    // Wind-ups tick down and hold their banderole into the next round.
    for (const it of this.intents)
      if (it.countdown > 0 && !it.waiting && !it.cancelled) {
        it.countdown--;
        it.waiting = true;
      }
    for (const u of this.units) {
      if (u.fallen) continue;
      if (u.status.tally !== null) {
        u.status.tally--;
        if (u.status.tally <= 0) this.reckon(u);
        if (u.fallen) continue;
      }
      if (u.status.immured) {
        if (u.status.immuredLong) u.status.immuredLong = false;
        else {
          u.status.immured = false;
          this.emit({ type: 'status', unit: u.id, status: 'immured', on: false });
        }
      }
      u.status.rubricated = false;
      u.status.doomed = false;
      u.status.guarded = false;
      // A corpse-candle that took no warmth this round burns down.
      const wanes = u.side === 'enemy' && !this.fed.has(u.id) ? ENEMIES[u.kind]?.wanes : undefined;
      if (wanes) {
        u.hp = Math.max(0, u.hp - wanes);
        this.emit({ type: 'damage', unit: u.id, amount: wanes, absorbed: 0, source: 'wane' });
        if (u.hp <= 0) this.fell(u, false);
      }
    }
    const gain = Math.min(this.maxInk - this.ink, this.difficulty === 'story' || this.wears('isot', 'hornInkwell') ? 2 : 1);
    if (gain > 0) {
      this.ink += gain;
      this.emit({ type: 'ink', amount: gain });
    }
    this.checkEnd();
  }

  private checkEnd(): void {
    if (this.result !== 'ongoing') return;
    if (this.enemies.every((e) => e.fallen)) {
      this.result = 'victory';
      this.emit({ type: 'victory' });
    } else if (this.party.every((a) => a.fallen)) {
      this.result = 'defeat';
      this.emit({ type: 'defeat' });
    }
  }
}
