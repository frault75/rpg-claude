/**
 * Shared by the fight tests: each fight as the story brings the party to it, a player who
 * reads nothing, and the answers some fights are known to have.
 */

import { CHAPTER_ONE_ABILITIES, ENCOUNTERS, REWARDS } from '../src/battle/data';
import { Battle, type ActTarget } from '../src/battle/engine';
import { type Difficulty, storyLevel } from '../src/battle/growth';
import type { AbilityId } from '../src/battle/types';
import type { CharId } from '../src/story/state';
import { solve } from './solver';

/** Every fight, in the order the story meets them. */
export const ORDER = Object.keys(REWARDS);
/** The ordinary fights, and the side fights off the path. */
export const ORDINARY = ORDER.filter((id) => id.startsWith('f') || id.startsWith('s'));

/** The abilities known at each fight, as the story teaches them (DESIGN.md §5.6). */
export function known(id: string): Record<CharId, AbilityId[]> {
  const ch5 = ['s4', 's5', 'b6', 'f9', 'b5'].includes(id);
  const ch4 = ['f7', 'f8', 's3', 'b4'].includes(id) || ch5;
  const ch3 = ['f5', 's2', 'f6', 'b3'].includes(id) || ch4;
  const ch2 = ['f3', 's1', 'f4', 'b2'].includes(id) || ch3;
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
  if (id === 'b5') {
    learn('hild', 'benison');
    learn('isot', 'inscribe');
  }
  return ab;
}

/** A fight as the story brings the party to it: at its level, with what they carry from the start. */
export function begin(id: string, difficulty: Difficulty = 'normal'): Battle {
  const b = new Battle({
    encounter: id,
    party: ENCOUNTERS[id]!.party,
    abilities: known(id),
    equipment: { isot: { relic: null, charm: 'wystansPumice' }, hild: { relic: 'psalterChain', charm: null } },
    emendAnywhere: id === 'b3' || ['f7', 'f8', 's3', 'b4', 's4', 's5', 'b6', 'f9', 'b5'].includes(id),
    level: storyLevel(id),
    difficulty,
  });
  b.start();
  return b;
}

export type Plan = { ability: AbilityId; target: ActTarget }[];

/**
 * A player who reads nothing: everyone hits the front enemy with what they have, and Hild
 * shrives whoever is below half. `idea` adds one thing to try first each turn.
 */
export function play(id: string, difficulty: Difficulty = 'normal', idea?: (b: Battle) => Plan): Battle {
  const b = begin(id, difficulty);
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

/** The Great Snail's answer: Strike Through its withdrawal. */
export const strikeShell = (b: Battle): Plan => {
  const w = b.intents.find((i) => !i.cancelled && i.effects.some((e) => e.kind === 'shell'));
  return w ? [{ ability: 'strike', target: { intent: w.id } }] : [];
};

/** The last fight's answer: write, wall Isot in, and keep the others standing. */
export function writeFinis(difficulty: Difficulty): Battle {
  const b = begin('b5', difficulty);
  for (let r = 0; r < 14 && b.result === 'ongoing'; r++) {
    if (!b.check('isot', 'inscribe')) b.act('isot', 'inscribe');
    if (b.result !== 'ongoing') break;
    if (!b.check('hild', 'immure', { unit: 'isot' })) b.act('hild', 'immure', { unit: 'isot' });
    else {
      const low = [...b.party].filter((x) => !x.fallen).sort((x, y) => x.hp - y.hp)[0]!;
      if (!b.check('hild', 'shrive', { unit: low.id })) b.act('hild', 'shrive', { unit: low.id });
    }
    const first = b.standingEnemies()[0]!;
    if (!b.check('whit', 'lance', { unit: first.id })) b.act('whit', 'lance', { unit: first.id });
    b.endTurn();
  }
  return b;
}

/**
 * The Heap's answer: let it finish its word. Never strike the Heap itself; cut the stray
 * letters down so they fall back into it, strike out the word it learned upstairs, keep
 * everyone standing, and read it once it is whole.
 */
export function readTheHeap(difficulty: Difficulty): Battle {
  const b = begin('b6', difficulty);
  const heap = b.enemies.find((e) => e.kind === 'heap')!;
  for (let r = 0; r < 20 && b.result === 'ongoing'; r++) {
    if (!b.check('whit', 'read', { unit: heap.id })) {
      b.act('whit', 'read', { unit: heap.id });
      break;
    }
    const stray = () => b.standingEnemies().find((e) => e.kind === 'strayLetter');
    const finis = b.intents.find((i) => !i.cancelled && i.countdown > 0);
    if (finis && !b.check('isot', 'strike', { intent: finis.id })) b.act('isot', 'strike', { intent: finis.id });
    const s1 = stray();
    if (s1 && !b.check('whit', 'lance', { unit: s1.id })) b.act('whit', 'lance', { unit: s1.id });
    const s2 = stray();
    if (s2 && !b.check('isot', 'penknife', { unit: s2.id })) b.act('isot', 'penknife', { unit: s2.id });
    const low = [...b.party].filter((x) => !x.fallen).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0]!;
    const down = b.party.find((x) => x.fallen);
    if (down && !b.check('hild', 'shrive', { unit: down.id })) b.act('hild', 'shrive', { unit: down.id });
    else if (finis && finis.countdown === 0 && !finis.cancelled && !b.check('hild', 'immure', { unit: heap.id })) b.act('hild', 'immure', { unit: heap.id });
    else if (low.hp < low.maxHp * 0.6 && !b.check('hild', 'shrive', { unit: low.id })) b.act('hild', 'shrive', { unit: low.id });
    b.endTurn();
  }
  return b;
}

/** Can the fight be won by its answer? The beam search finds it; two fights have theirs written out. */
export function answered(id: string, difficulty: Difficulty): Battle['result'] {
  if (id === 'b5') return writeFinis(difficulty).result;
  if (id === 'b6') return readTheHeap(difficulty).result;
  if (id === 'b1') return play(id, difficulty, strikeShell).result;
  return solve(begin(id, difficulty), known(id), Number(process.env.BEAM ?? 4));
}
