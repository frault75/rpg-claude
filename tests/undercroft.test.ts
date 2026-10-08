import { describe, expect, it } from 'vitest';
import { CHAPTER_ONE_ABILITIES, type EncounterDef } from '../src/battle/data';
import { Battle, type BattleSetup } from '../src/battle/engine';
import type { AbilityId } from '../src/battle/types';
import type { CharId } from '../src/story/state';

const ALL: Record<CharId, AbilityId[]> = {
  isot: ['penknife', 'gloss', 'strike', 'emend', 'rubric'],
  hild: ['shove', 'shrive', 'immure', 'squint', 'benison'],
  whit: ['lance', 'tally', 'vigil', 'read'],
};
void CHAPTER_ONE_ABILITIES;

function fight(encounter: BattleSetup['encounter'], extra: Partial<BattleSetup> = {}): Battle {
  const b = new Battle({ encounter, party: ['whit', 'hild', 'isot'], abilities: ALL, ...extra });
  b.start();
  return b;
}

const custom = (enemies: string[]): EncounterDef => ({ id: 'test', name: { en: 'Test', fr: 'Test' }, party: [], enemies, stage: 'test' });

describe('the sweepers (S4)', () => {
  it('an inkhorn hound runs down whoever acted last, by name', () => {
    const b = fight(custom(['inkhornHound', 'inkhornHound']));
    b.act('isot', 'penknife', { unit: 'e0' });
    b.act('whit', 'vigil');
    b.endTurn();
    const hunt = b.intents.find((i) => i.label.en.startsWith('Hunts'))!;
    expect(hunt.label.en).toBe('Hunts by the scent');
    expect(hunt.damage).toBe(3);
    expect(hunt.target).toEqual({ unit: 'whit' });
  });

  it('undoing the last action takes the scent with it', () => {
    const b = fight(custom(['inkhornHound', 'inkhornHound']));
    b.act('isot', 'penknife', { unit: 'e0' });
    b.act('whit', 'vigil');
    b.undo();
    b.endTurn();
    expect(b.intents.find((i) => i.label.en.startsWith('Hunts'))!.target).toEqual({ unit: 'isot' });
  });

  it('three Glosses give the scraped Brother his name: he leaves, and his hounds with him', () => {
    const b = fight('s4');
    const brother = b.enemies.find((e) => e.kind === 'scrapedBrother')!;
    for (let r = 0; r < 3; r++) {
      expect(b.act('isot', 'gloss', { unit: brother.id })).toBe(true);
      // He sweeps the margin clean whenever he has a letter of it: wall him in.
      const sweep = b.intents.find((i) => i.effects.some((e) => e.kind === 'unname'));
      if (sweep && b.result === 'ongoing') b.act('hild', 'immure', { unit: brother.id });
      if (b.result === 'ongoing') b.endTurn();
    }
    expect(b.result).toBe('victory');
    expect(b.enemies.every((e) => e.fallen && e.left)).toBe(true);
    expect(b.events.filter((e) => e.type === 'leave')).toHaveLength(4);
  });

  it('let him sweep, and the letters of his name are lost', () => {
    const b = fight('s4');
    const brother = b.enemies.find((e) => e.kind === 'scrapedBrother')!;
    b.act('isot', 'gloss', { unit: brother.id });
    b.endTurn();
    expect(brother.status.named).toBe(1);
    const sweep = b.intents.find((i) => i.actor === brother.id)!;
    expect(sweep.effects).toEqual([{ kind: 'unname' }]);
    b.act('isot', 'gloss', { unit: brother.id });
    expect(b.unit(brother.id)!.status.named).toBe(2);
    b.endTurn();
    expect(b.unit(brother.id)!.status.named).toBe(0);
  });

  it('felled instead, he takes the hounds down with him', () => {
    const b = fight('s4');
    const brother = b.enemies.find((e) => e.kind === 'scrapedBrother')!;
    brother.hp = 2;
    b.act('isot', 'penknife', { unit: brother.id });
    expect(b.result).toBe('victory');
    expect(b.enemies.some((e) => e.left)).toBe(false);
  });
});

describe('the palimpsest knights (S5)', () => {
  it('a knight writes itself over: what it lost this round, it has back', () => {
    const b = fight('s5');
    const knight = b.enemies[0]!;
    expect(b.intents.find((i) => i.actor === knight.id)!.effects).toEqual([{ kind: 'rewrite' }]);
    b.act('whit', 'lance', { unit: knight.id });
    b.act('isot', 'penknife', { unit: knight.id });
    expect(knight.hp).toBeLessThan(knight.maxHp);
    b.endTurn();
    expect(b.unit(knight.id)!.hp).toBe(knight.maxHp);
  });

  it('struck through, the writing does not take', () => {
    const b = fight('s5');
    const knight = b.enemies[0]!;
    b.act('whit', 'lance', { unit: knight.id });
    const hp = knight.hp;
    const rewrite = b.intents.find((i) => i.actor === knight.id)!;
    b.act('isot', 'strike', { intent: rewrite.id });
    b.endTurn();
    expect(b.unit(knight.id)!.hp).toBe(hp);
  });
});

describe('the Heap (B6)', () => {
  it('reaches for its letters; a blow knocks one loose, and the first time it is said', () => {
    const b = fight('b6');
    const heap = b.enemies[0]!;
    b.endTurn();
    expect(b.letters).toBe(1);
    b.act('whit', 'lance', { unit: heap.id });
    expect(b.letters).toBe(0);
    expect(b.events.some((e) => e.type === 'phase' && e.id === 'loosened')).toBe(true);
    expect(heap.fallen).toBe(false);
  });

  it('a stray letter cut down falls back into the Heap', () => {
    const b = fight('b6');
    b.endTurn();
    b.endTurn();
    const stray = b.enemies.find((e) => e.kind === 'strayLetter' && !e.fallen)!;
    expect(stray).toBeTruthy();
    const before = b.letters;
    stray.hp = 1;
    b.act('isot', 'penknife', { unit: stray.id });
    expect(b.letters).toBe(before + 1);
  });

  it('can only be Read once the word is whole, and then at any strength', () => {
    const b = fight('b6');
    const heap = b.enemies[0]!;
    expect(b.check('whit', 'read', { unit: heap.id })).toBe('not-yet');
    b.letters = 5;
    expect(b.check('whit', 'read', { unit: heap.id })).toBeNull();
    b.act('whit', 'read', { unit: heap.id });
    expect(b.result).toBe('victory');
  });

  it('“F, I, N, I, S” is not its word: it winds up, and can be struck out', () => {
    const b = fight('b6');
    b.endTurn();
    b.endTurn();
    b.endTurn();
    const finis = b.intents.find((i) => i.label.en.startsWith('Mouths'))!;
    expect(finis.countdown).toBe(1);
    b.act('isot', 'strike', { intent: finis.id });
    const hp = b.party.map((u) => u.hp);
    b.endTurn();
    b.endTurn();
    expect(b.party.every((u, k) => u.hp >= hp[k]! - 4)).toBe(true);
  });
});

describe('the slip of the roll-call', () => {
  it('whoever wears it cannot be Forgotten', () => {
    const b = fight(custom(['aumery']), { equipment: { whit: { relic: null, charm: 'adsumSlip' } } });
    for (let r = 0; r < 3; r++) b.endTurn();
    expect(b.unit('whit')!.status.forgotten).toBe(0);
  });
});
