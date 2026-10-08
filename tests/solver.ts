/**
 * A small beam search over the battle engine, for the tests: it tries every ally's every
 * legal action each round, keeps the most promising few positions, and reports whether a
 * fight can be won at all. It is how a fight's "intended answer" is checked to exist.
 */

import { ABILITIES } from '../src/battle/data';
import type { ActTarget, Battle } from '../src/battle/engine';
import type { AbilityId } from '../src/battle/types';
import type { CharId } from '../src/story/state';

/** A deep copy of a battle in progress (its encounter and event log are shared). */
function clone<T>(v: T, top = true): T {
  if (v === null || typeof v !== 'object') return v;
  if (v instanceof Set) return new Set([...v].map((x) => clone(x, false))) as T;
  if (v instanceof Map) return new Map([...v].map(([k, x]) => [k, clone(x, false)])) as T;
  if (Array.isArray(v)) return v.map((x) => clone(x, false)) as T;
  const o = Object.create(Object.getPrototypeOf(v)) as Record<string | symbol, unknown>;
  for (const k of Reflect.ownKeys(v as object)) {
    const x = (v as Record<string | symbol, unknown>)[k];
    o[k] = top && k === 'def' ? x : top && k === 'events' ? [...(x as unknown[])] : clone(x, false);
  }
  return o as T;
}

type Act = { ability: AbilityId; target: ActTarget };

function candidates(b: Battle, userId: string, known: Record<CharId, AbilityId[]>): Act[] {
  const u = b.unit(userId)!;
  const out: Act[] = [];
  for (const a of known[u.kind as CharId] ?? []) {
    const def = ABILITIES[a];
    const ts: ActTarget[] = [];
    if (def.target === 'enemy') for (const e of b.standingEnemies()) ts.push({ unit: e.id });
    else if (def.target === 'ally' || def.target === 'fallenOrAlly') for (const p of b.party) ts.push({ unit: p.id });
    else if (def.target === 'anyUnit') {
      for (const x of b.units) if (!x.fallen) ts.push({ unit: x.id });
    } else if (def.target === 'intent')
      for (const it of b.intents) {
        if (it.cancelled) continue;
        if (a === 'emend') for (const x of b.units) ts.push({ intent: it.id, to: x.id });
        else ts.push({ intent: it.id });
      }
    else ts.push({});
    for (const t of ts) if (!b.check(userId, a, t)) out.push({ ability: a, target: t });
  }
  return out;
}

function score(b: Battle): number {
  if (b.result === 'victory') return 1e6 - b.round * 1000 + b.party.reduce((s, p) => s + p.hp, 0);
  if (b.result === 'defeat') return -1e6 + b.round;
  const ehp = b.enemies.filter((e) => !e.fallen).reduce((s, e) => s + e.hp, 0);
  const php = b.party.reduce((s, p) => s + (p.fallen ? 0 : p.hp), 0);
  const fallen = b.party.filter((p) => p.fallen).length;
  return -3 * ehp + php - 25 * fallen + 60 * b.letters + 15 * b.phases.size + b.ink;
}

/** Search for a win from a started battle: `width` positions kept, `depth` rounds at most. */
export function solve(start: Battle, known: Record<CharId, AbilityId[]>, width = 6, depth = 14): Battle['result'] {
  let states: Battle[] = [start];
  for (let d = 0; d < depth; d++) {
    const next: { b: Battle; s: number }[] = [];
    for (const st of states) {
      const base = clone(st);
      const actors = base.party.filter((p) => !p.fallen && !p.status.immured).sort((x, y) => x.place - y.place).map((p) => p.id);
      const orders = actors.length > 1 ? [actors, [...actors].reverse()] : [actors];
      const seen = new Set<string>();
      for (const order of orders) {
        const rec = (i: number, plan: string[]) => {
          if (i === order.length) {
            const key = [...plan].sort().join('|');
            if (seen.has(key)) return;
            seen.add(key);
            const c = clone(base);
            c.endTurn();
            next.push({ b: c, s: score(c) });
            return;
          }
          const who = order[i]!;
          for (const a of candidates(base, who, known)) {
            if (!base.act(who, a.ability, a.target)) continue;
            rec(i + 1, [...plan, `${who}:${a.ability}:${a.target.unit ?? ''}:${a.target.intent ?? ''}:${a.target.to ?? ''}`]);
            base.undo();
          }
          rec(i + 1, [...plan, `${who}:-`]);
        };
        rec(0, []);
      }
    }
    next.sort((a, b) => b.s - a.s);
    if (next.some((n) => n.b.result === 'victory')) return 'victory';
    states = next.filter((n) => n.b.result === 'ongoing').slice(0, width).map((n) => n.b);
    if (!states.length) return 'defeat';
  }
  return 'ongoing';
}
