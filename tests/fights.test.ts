import { describe, expect, it } from 'vitest';
import { CHAPTER_ONE_ABILITIES, ENCOUNTERS } from '../src/battle/data';
import { Battle, type ActTarget } from '../src/battle/engine';
import type { AbilityId } from '../src/battle/types';
import type { CharId } from '../src/story/state';

/** The abilities known at each fight, as the story teaches them (DESIGN.md §5.6). */
function setupFor(id: string) {
  const ch5 = ['f9', 'b5'].includes(id);
  const ch4 = ['f7', 'f8', 'b4'].includes(id) || ch5;
  const ch3 = ['f5', 'f6', 'b3'].includes(id) || ch4;
  const ch2 = ['f3', 'f4', 'b2'].includes(id) || ch3;
  const ab = Object.fromEntries(Object.entries(CHAPTER_ONE_ABILITIES).map(([k, v]) => [k, [...v]])) as Record<CharId, AbilityId[]>;
  const learn = (c: CharId, a: AbilityId) => ab[c].includes(a) || ab[c].push(a);
  if (ch2) {
    learn('isot', 'emend');
    learn('hild', 'immure');
    learn('whit', 'vigil');
  }
  if (id === 'f6' || id === 'b3' || ch4) learn('hild', 'squint');
  if (ch4) learn('whit', 'read');
  if (id === 'b4' || ch5) learn('isot', 'rubric');
  return {
    encounter: id,
    party: ENCOUNTERS[id]!.party,
    abilities: ab,
    equipment: { isot: { relic: null, charm: 'wystansPumice' }, hild: { relic: 'psalterChain', charm: null } },
    emendAnywhere: id === 'b3' || ch4,
  };
}

type Plan = { ability: AbilityId; target: ActTarget }[];

/**
 * A player who reads nothing: everyone hits the front enemy with what they have, and Hild
 * shrives whoever is below half. `idea` adds one thing to try first each turn.
 */
function play(id: string, idea?: (b: Battle) => Plan): Battle {
  const b = new Battle(setupFor(id));
  b.start();
  while (b.result === 'ongoing' && b.round < 30) {
    for (const p of [...b.party].filter((u) => !u.fallen).sort((x, y) => x.place - y.place)) {
      const front = b.standingEnemies()[0];
      const hurt = [...b.party].filter((u) => !u.fallen).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
      const tries: Plan = [...(idea?.(b) ?? [])];
      if (hurt && hurt.hp < hurt.maxHp / 2) tries.push({ ability: 'shrive', target: { unit: hurt.id } });
      if (front) for (const a of ['lance', 'penknife', 'shove', 'tally'] as AbilityId[]) tries.push({ ability: a, target: a === 'shove' ? {} : { unit: front.id } });
      for (const t of tries) if (b.act(p.id, t.ability, t.target)) break;
    }
    b.endTurn();
  }
  return b;
}

describe('the fights, played', () => {
  for (const id of ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9'])
    it(`${id}: an ordinary fight can be won by plain fighting`, () => {
      expect(play(id).result).toBe('victory');
    });

  it('the Great Snail: plain fighting is a long, hurtful slog; Striking Through its withdrawal is quick', () => {
    const slog = play('b1');
    expect(slog.result).toBe('victory');
    expect(slog.round).toBeGreaterThanOrEqual(7);
    const strike = (b: Battle): Plan => {
      const w = b.intents.find((i) => !i.cancelled && i.effects.some((e) => e.kind === 'shell'));
      return w ? [{ ability: 'strike', target: { intent: w.id } }] : [];
    };
    const quick = play('b1', strike);
    expect(quick.result).toBe('victory');
    expect(quick.round).toBeLessThanOrEqual(4);
    const hp = (b: Battle) => b.party.reduce((s, u) => s + u.hp, 0);
    expect(hp(quick)).toBeGreaterThan(hp(slog) + 10);
  });

  it('the Danse Macabre and the Blot cannot be won without reading them', () => {
    expect(play('b3').result).not.toBe('victory');
    expect(play('b4').result).not.toBe('victory');
  });
});
