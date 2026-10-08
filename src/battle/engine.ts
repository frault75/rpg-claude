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
import { type AbilityId, type BattleEvent, freshStatuses, type Intent, type Place, type Unit } from './types';

export interface BattleSetup {
  encounter: EncounterDef | string;
  /** Who fights, front to back (the formation). */
  party: CharId[];
  abilities: Record<CharId, AbilityId[]>;
  equipment?: Partial<Record<CharId, { relic: string | null; charm: string | null }>>;
  seed?: number;
  /** Gentle Hand: +50% HP, Ink refills by 2. */
  gentle?: boolean;
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
  | 'guarded';

/** Abilities a Rubric (or Vermilion) can double. */
const DOUBLES: ReadonlySet<AbilityId> = new Set(['penknife', 'shove', 'shrive', 'immure', 'squint', 'benison', 'lance', 'tally', 'vigil', 'read']);

interface Snapshot {
  units: Unit[];
  intents: Intent[];
  ink: number;
  stepUsed: boolean;
  vigil: Battle['vigil'];
  usedOnce: string[];
  firstBlow: string[];
  firstAbility: string[];
  squinted: number;
  preview: Intent[] | null;
  revivals: number;
  emptyPlace: boolean;
  eventsLen: number;
}

export class Battle {
  readonly def: EncounterDef;
  units: Unit[] = [];
  intents: Intent[] = [];
  round = 0;
  ink = 2;
  maxInk = 3;
  stepUsed = false;
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
  /** Rounds of foresight left from a Squint. */
  private squinted = 0;
  /** Allies kneeling this round (an Edict served). */
  private knelt = new Set<string>();
  private readonly abilities: Record<CharId, AbilityId[]>;
  private readonly equipment: BattleSetup['equipment'] & object;
  private readonly gentle: boolean;
  readonly emendAnywhere: boolean;
  private readonly fighting: ReadonlySet<CharId>;
  /** A tune was called: every dancer plans twice next round. */
  private tuned = false;
  /** The Danse Macabre's Leader is at half: the followers' blows pass through Whit. */
  private emptyPlace = false;
  private nextIntentId = 1;

  constructor(setup: BattleSetup) {
    const def = typeof setup.encounter === 'string' ? ENCOUNTERS[setup.encounter] : setup.encounter;
    if (!def) throw new Error(`unknown encounter ${String(setup.encounter)}`);
    this.def = def;
    this.rng = new Rng(setup.seed ?? 7);
    this.abilities = setup.abilities;
    this.gentle = !!setup.gentle;
    this.emendAnywhere = !!setup.emendAnywhere;
    this.equipment = setup.equipment ?? {};
    this.fighting = new Set(setup.party.slice(0, 3));
    setup.party.slice(0, 3).forEach((c, i) => {
      const st = PARTY_STATS[c];
      const hp = Math.round(st.hp * (this.gentle ? 1.5 : 1));
      const u: Unit = { id: c, side: 'party', kind: c, name: st.name, hp, maxHp: hp, place: i, size: 1, status: freshStatuses(), fallen: false, acted: false, phase: 0, hiddenIntents: false };
      if (this.wears(c, 'anchorStone')) u.status.ward = 2;
      if (this.wears(c, 'ebbShell')) this.firstBlow.add(c);
      if (this.wears(c, 'vermilionPot')) this.firstAbility.add(c);
      this.units.push(u);
    });
    if (this.wears('isot', 'lampBlack')) {
      this.maxInk = 4;
      this.ink = 1;
    }
    let place = 0;
    this.def.enemies.forEach((kind, i) => {
      const e = ENEMIES[kind];
      if (!e) throw new Error(`unknown enemy ${kind}`);
      const size = e.size ?? 1;
      const st = freshStatuses();
      st.readOnly = !!e.readOnly;
      st.hollow = !!e.hollow;
      this.units.push({ id: `e${i}`, side: 'enemy', kind, name: e.name, hp: e.hp, maxHp: e.hp, place, size, status: st, fallen: false, acted: false, phase: 0, hiddenIntents: !!e.hidden });
      place += size;
    });
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
    this.stepUsed = false;
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
    const env = this.def.env?.(this.round);
    if (env) this.intents.push(this.makeIntent('env', env));
    this.intents.forEach((it, i) => (it.order = i + 1));
    this.emit({ type: 'omen', intents: this.intents.map((i) => i.id) });
    // The party's Ward fades as its phase begins (a charm's Ward lasts the first round).
    this.knelt.clear();
    for (const u of this.party) {
      if (this.round > 1) u.status.ward = 0;
      if (u.status.kneeling && !u.fallen) {
        this.knelt.add(u.id);
        u.status.kneeling = false;
      }
      u.acted = u.fallen || this.knelt.has(u.id);
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
      .map((o) => ({ id: o.id, kind: o.kind, name: o.name, hp: o.hp, maxHp: o.maxHp }));
    const fallen = this.enemies.filter((o) => o !== e && o.fallen).map((o) => ({ id: o.id, kind: o.kind, name: o.name }));
    return def.behave({ round, phase: e.phase, hp: e.hp, maxHp: e.maxHp, allies, fallen, rng });
  }

  private makeIntent(actor: string, s: IntentSpec): Intent {
    return {
      id: `i${this.nextIntentId++}`,
      actor,
      order: 0,
      label: s.label,
      rule: s.rule,
      target: s.target,
      damage: s.damage ?? 0,
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
      stepUsed: this.stepUsed,
      vigil: this.vigil ? { ...this.vigil } : null,
      usedOnce: [...this.usedOnce],
      firstBlow: [...this.firstBlow],
      firstAbility: [...this.firstAbility],
      squinted: this.squinted,
      preview: this.preview,
      revivals: this.revivals,
      emptyPlace: this.emptyPlace,
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
    this.stepUsed = s.stepUsed;
    this.vigil = s.vigil;
    this.usedOnce = new Set(s.usedOnce);
    this.firstBlow = new Set(s.firstBlow);
    this.firstAbility = new Set(s.firstAbility);
    this.squinted = s.squinted;
    this.preview = s.preview;
    this.revivals = s.revivals;
    this.emptyPlace = s.emptyPlace;
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
    this.stepUsed = true;
    this.emit({ type: 'move', unit: ua.id, from: a, to: b });
    this.emit({ type: 'move', unit: ub.id, from: b, to: a });
    return true;
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
    if (this.inkCost(u, ability, target) > this.ink) return 'ink';
    const hp = this.hpCost(ability, u);
    if (hp && u.hp <= hp) return 'hp';
    const t = target.unit ? this.unit(target.unit) : undefined;
    switch (def.target) {
      case 'enemy':
        if (!t || t.side !== 'enemy' || t.fallen) return 'target';
        if (t.status.immured) return 'immured-target';
        if (t.status.guarded) return 'guarded';
        if (def.reachEnemy && this.rank(t) >= def.reachEnemy) return 'reach';
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
        if (t.status.immured) return 'immured-target';
        if (t.status.guarded) return 'guarded';
        break;
      case 'intent': {
        const it = this.intents.find((i) => i.id === target.intent);
        if (!it || it.cancelled) return 'target';
        if (ability === 'emend') {
          if (!('place' in it.target || 'unit' in it.target) || it.damage <= 0) return 'not-single';
          const to = target.to ? this.unit(target.to) : undefined;
          if (!to || to.fallen) return 'target';
          if (to.side === 'enemy' && (!this.emendAnywhere || to.id === it.actor || to.status.immured)) return 'target';
        }
        break;
      }
      case 'none':
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
    switch (ability) {
      case 'penknife': {
        const bonus = this.wears('isot', 'wystansPumice') && t!.status.glossed ? 1 : 0;
        this.hurt(t!, 2 * x + bonus, u.id);
        break;
      }
      case 'gloss':
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
        this.hurt(first, 2 * x, u.id);
        if (!first.fallen) this.toBack(first);
        break;
      }
      case 'shrive': {
        const amount = (this.wears('hild', 'psalterChain') ? 5 : 6) * x;
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
        this.hurt(t!, (this.wears('whit', 'bellClapper') ? 3 : 4) * x, u.id);
        break;
      case 'tally':
        t!.status.tally = this.wears('whit', 'blankPennon') ? 2 : 3;
        t!.status.tallyDoubled = dbl;
        this.emit({ type: 'status', unit: t!.id, status: 'tally', on: true });
        break;
      case 'vigil':
        this.vigil = { by: u.id, power: 4 * x };
        this.emit({ type: 'status', unit: u.id, status: 'ward', on: true });
        break;
      case 'read':
        this.fell(t!, true);
        break;
    }
    this.checkEnd();
    return true;
  }

  /** A cancelled intent takes back what it declared. */
  private undeclare(it: Intent): void {
    const actor = this.unit(it.actor);
    for (const e of it.effects) {
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
    if (it.effects.some((e) => e.kind === 'turn')) this.turnDance();
    if (it.effects.some((e) => e.kind === 'tune')) this.tuned = true;
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
      if (it.damage > 0) this.hurt(t, it.damage, it.actor);
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
        case 'kneel':
          if (!t.fallen) t.status.kneeling = true;
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
    if ((u.status.hollow && byParty) || (this.emptyPlace && u.id === 'whit' && from?.status.hollow)) {
      this.emit({ type: 'pass', unit: u.id });
      return;
    }
    let a = amount;
    if (u.status.glossed) {
      a += 3;
      u.status.glossed = false;
    }
    if (u.status.doomed) a *= 2;
    if (u.status.shelled) a = Math.min(a, 1);
    if (u.side === 'party' && this.firstBlow.has(u.id)) {
      a = Math.max(0, a - 1);
      this.firstBlow.delete(u.id);
    }
    const absorbed = Math.min(u.status.ward, a);
    u.status.ward -= absorbed;
    a -= absorbed;
    if (u.status.readOnly) a = Math.min(a, u.hp - 1);
    u.hp -= a;
    this.emit({ type: 'damage', unit: u.id, amount: a, absorbed, source });
    if (u.hp <= 0) {
      this.fell(u, false);
      return;
    }
    if (!this.emptyPlace && ENEMIES[u.kind]?.leads && u.side === 'enemy' && u.hp * 2 <= u.maxHp) {
      this.emptyPlace = true;
      this.emit({
        type: 'phase',
        title: { en: 'The Empty Place', fr: 'La place vide' },
        line: { en: 'The ring turns toward Whit: the followers’ blows pass through him.', fr: 'La ronde se tourne vers Whit : les coups des suivants le traversent.' },
      });
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
    u.hp = Math.min(u.maxHp, u.hp + amount);
    this.emit({ type: 'heal', unit: u.id, amount: u.hp - before });
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
    // The one who leads falls, and the dance ends.
    if (u.side === 'enemy' && ENEMIES[u.kind]?.leads)
      for (const o of this.enemies)
        if (!o.fallen && o.status.hollow) {
          o.hp = 0;
          o.fallen = true;
          this.emit({ type: 'fall', unit: o.id });
        }
    this.checkEnd();
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
    }
    const gain = Math.min(this.maxInk - this.ink, this.gentle ? 2 : 1);
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
