import { describe, expect, it } from 'vitest';
import type { EncounterDef } from '../src/battle/data';
import { Battle, type BattleSetup } from '../src/battle/engine';
import type { AbilityId } from '../src/battle/types';
import { buyItem, buySatchel, priceFor, stock } from '../src/data/stalls';
import { parseSave } from '../src/engine/save';
import { session } from '../src/engine/session';
import { type Cache, withCaches } from '../src/maps/caches';
import type { MapContext, MapDef } from '../src/maps/types';
import { type CharId, newGame } from '../src/story/state';

const ALL: Record<CharId, AbilityId[]> = {
  isot: ['penknife', 'gloss', 'strike', 'emend', 'rubric'],
  hild: ['shove', 'shrive', 'immure', 'squint', 'benison'],
  whit: ['lance', 'tally', 'vigil', 'read'],
};
const custom = (enemies: string[]): EncounterDef => ({ id: 'test', name: { en: 'Test', fr: 'Test' }, party: [], enemies, stage: 'test' });
const fight = (extra: Partial<BattleSetup> = {}, enemies = ['gryllus', 'gryllus', 'hare']) => {
  const b = new Battle({ encounter: custom(enemies), party: ['whit', 'hild', 'isot'], abilities: ALL, ...extra });
  b.start();
  return b;
};
const wearing = (c: CharId, item: string, slot: 'relic' | 'charm' = 'charm') => ({ [c]: { relic: slot === 'relic' ? item : null, charm: slot === 'charm' ? item : null } });

describe('the satchel in battle', () => {
  it('a poultice heals 8 and spends the ally’s action; what is used is counted', () => {
    const b = fight({ satchel: { poultice: 2 } });
    b.unit('whit')!.hp = 5;
    expect(b.useItem('isot', 'poultice', { unit: 'whit' })).toBe(true);
    expect(b.unit('whit')!.hp).toBe(13);
    expect(b.check('isot', 'penknife', { unit: 'e0' })).toBe('acted');
    expect(b.satchel.poultice).toBe(1);
    expect(b.spent()).toEqual({ poultice: 1 });
    b.undo();
    expect(b.satchel.poultice).toBe(2);
    expect(b.spent()).toEqual({});
  });

  it('oak-gall ink gives Isot 2 Ink, and is refused when her Ink is full', () => {
    const b = fight({ satchel: { gallInk: 1 } });
    b.ink = 0;
    b.useItem('whit', 'gallInk');
    expect(b.ink).toBe(2);
    const c = fight({ satchel: { gallInk: 1 } });
    c.ink = c.maxInk;
    expect(c.checkItem('whit', 'gallInk')).toBe('full');
  });

  it('a wax seal gives Ward 4; holy water strips Ward and Shell; sal volatile raises the fallen with 6', () => {
    const b = fight({ satchel: { waxSeal: 1, holyWater: 1, salVolatile: 1 } }, ['snail', 'gryllus']);
    b.useItem('isot', 'waxSeal', { unit: 'whit' });
    expect(b.unit('whit')!.status.ward).toBe(4);
    const e = b.unit('e0')!;
    e.status.shelled = true;
    e.status.ward = 3;
    b.useItem('hild', 'holyWater', { unit: 'e0' });
    expect([e.status.shelled, e.status.ward]).toEqual([false, 0]);
    const isot = b.unit('isot')!;
    isot.hp = 0;
    isot.fallen = true;
    expect(b.checkItem('whit', 'salVolatile', { unit: 'hild' })).toBe('target');
    b.useItem('whit', 'salVolatile', { unit: 'isot' });
    expect([isot.fallen, isot.hp]).toEqual([false, 6]);
  });

  it('nothing left means nothing to use', () => {
    const b = fight({ satchel: { poultice: 0 } });
    expect(b.checkItem('isot', 'poultice', { unit: 'whit' })).toBe('empty');
    expect(fight().checkItem('isot', 'waxSeal', { unit: 'whit' })).toBe('empty');
  });
});

describe('the new relics and charms', () => {
  it('Gervase’s Ribbon: the first fall of the battle is turned aside, at 1 HP', () => {
    const b = fight({ equipment: wearing('whit', 'gervasesRibbon') }, ['wodewose']);
    b.unit('whit')!.hp = 3;
    b.endTurn();
    b.endTurn();
    expect(b.unit('whit')!.hp).toBe(1);
    expect(b.events.some((e) => e.type === 'spared')).toBe(true);
  });

  it('the Hare’s-foot brush: two free Steps a round', () => {
    const b = fight({ equipment: wearing('isot', 'haresFoot') });
    expect(b.step(0, 1)).toBe(true);
    expect(b.step(1, 2)).toBe(true);
    expect(b.step(0, 1)).toBe(false);
    expect(fight().step(0, 1) && fight().stepUsed).toBe(false);
  });

  it('the rosary: healing received is +2', () => {
    const b = fight({ equipment: wearing('whit', 'gallRosary'), satchel: { poultice: 1 } });
    b.unit('whit')!.hp = 2;
    b.useItem('isot', 'poultice', { unit: 'whit' });
    expect(b.unit('whit')!.hp).toBe(12);
  });

  it('the coronel: Lance reaches the 3rd enemy, for 1 less', () => {
    const b = fight({ equipment: wearing('whit', 'coronel', 'relic') });
    expect(b.check('whit', 'lance', { unit: 'e2' })).toBeNull();
    b.act('whit', 'lance', { unit: 'e2' });
    expect(b.unit('e2')!.hp).toBe(5 - 3);
    expect(fight().check('whit', 'lance', { unit: 'e2' })).toBe('reach');
  });

  it('the silverpoint: a Gloss is worth +4, the Penknife 1 less', () => {
    const b = fight({ equipment: wearing('isot', 'silverpoint', 'relic') }, ['wodewose']);
    b.act('isot', 'gloss', { unit: 'e0' });
    b.act('whit', 'lance', { unit: 'e0' });
    expect(b.unit('e0')!.hp).toBe(16 - 8);
    const c = fight({ equipment: wearing('isot', 'silverpoint', 'relic') }, ['wodewose']);
    c.act('isot', 'penknife', { unit: 'e0' });
    expect(c.unit('e0')!.hp).toBe(15);
  });

  it('the leper’s clapper: Immure for no HP, enemies only', () => {
    const b = fight({ equipment: wearing('hild', 'lepersClapper', 'relic') });
    expect(b.check('hild', 'immure', { unit: 'isot' })).toBe('enemies-only');
    const hp = b.unit('hild')!.hp;
    b.act('hild', 'immure', { unit: 'e0' });
    expect(b.unit('hild')!.hp).toBe(hp);
  });

  it('Saint Ebb’s girdle: in the Rear, every blow is a point lighter', () => {
    const b = fight({ equipment: wearing('isot', 'ebbGirdle') }, ['hare']);
    b.endTurn();
    expect(b.unit('isot')!.hp).toBe(12 - 2);
  });

  it('the horn inkwell: Ink holds 2 and refills by 2', () => {
    const b = fight({ equipment: wearing('isot', 'hornInkwell', 'relic') });
    expect(b.maxInk).toBe(2);
    b.act('isot', 'strike', { intent: b.intents[0]!.id });
    expect(b.ink).toBe(0);
    b.endTurn();
    expect(b.ink).toBe(2);
  });

  it('the plumb-line: Shove deals 2 more, and pushes back only one place', () => {
    const b = new Battle({ encounter: custom(['wodewose', 'gryllus', 'hare']), party: ['hild', 'whit', 'isot'], abilities: ALL, equipment: wearing('hild', 'plumbLine', 'relic') });
    b.start();
    b.act('hild', 'shove');
    expect(b.unit('e0')!.hp).toBe(16 - 4);
    expect(b.standingEnemies().map((e) => e.kind)).toEqual(['gryllus', 'wodewose', 'hare']);
  });

  it('the scallop: Vigil strikes for 6, from the Front only', () => {
    const b = fight({ equipment: wearing('whit', 'scallop', 'relic') }, ['gryllus', 'wodewose']);
    b.act('whit', 'vigil');
    b.endTurn();
    expect(b.unit('e0')!.fallen).toBe(true);
    const c = new Battle({ encounter: custom(['gryllus']), party: ['hild', 'whit', 'isot'], abilities: ALL, equipment: wearing('whit', 'scallop', 'relic') });
    c.start();
    expect(c.check('whit', 'vigil')).toBe('front-only');
  });

  it('the mourning brooch: Ward 3 when another ally falls', () => {
    const b = fight({ equipment: wearing('hild', 'mourningBrooch') }, ['hare']);
    b.unit('isot')!.hp = 1;
    b.endTurn();
    expect(b.unit('isot')!.fallen).toBe(true);
    expect(b.events.some((e) => e.type === 'ward' && e.unit === 'hild' && e.amount === 3)).toBe(true);
  });
});

describe('Gervase’s stall', () => {
  it('each stall carries the ones before it, and never what the party owns', () => {
    const g = newGame();
    expect(stock('lane', g).items).toEqual(['haresFoot', 'gallRosary', 'coronel']);
    g.inventory.push('coronel');
    expect(stock('fair', g).items).not.toContain('coronel');
    expect(stock('fair', g).items).toContain('scallop');
    expect(stock('woodsEdge', g).satchel).toEqual(['poultice', 'waxSeal', 'gallInk', 'holyWater']);
  });

  it('sells for pennies, three of a kind at most, and a quarter less once he is named', () => {
    const g = newGame();
    g.pennies = 20;
    expect(buySatchel(g, 'poultice')).toBe('sold');
    expect(g.pennies).toBe(12);
    expect(buyItem(g, 'haresFoot')).toBe('poor');
    g.satchel.poultice = 3;
    expect(buySatchel(g, 'poultice')).toBe('full');
    g.flags.gervaseNamed = true;
    expect(priceFor(30, g)).toBe(23);
    g.pennies = 23;
    expect(buyItem(g, 'haresFoot')).toBe('sold');
    expect(g.inventory).toContain('haresFoot');
    expect(buyItem(g, 'haresFoot')).toBe('owned');
  });

  it('a save keeps the satchel: known things only, three at most', () => {
    const back = parseSave(JSON.stringify({ version: 3, slot: 'auto', savedAt: 1, state: { ...newGame(), satchel: { poultice: 7, waxSeal: 2, gold: 9 } } }));
    expect(back?.state.satchel).toEqual({ poultice: 3, waxSeal: 2 });
  });
});

describe('Glossator caches', () => {
  const box: Cache = { id: 'test', x: 40, y: 40, pennies: 5, satchel: { poultice: 2 }, note: { en: 'note', fr: 'note' } };
  const hidden: Cache = { ...box, id: 'hid', hidden: true };
  const map = { id: 'm', walkable: '.', ground: ['....'], build: () => ({ blocked: [] }), spawns: {}, bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 }, caches: [box, hidden] } as unknown as MapDef;
  const ctx = () => {
    const said: string[] = [];
    const c = {
      flag: (n: string) => !!session.game.flags[n],
      set: (n: string) => (session.game.flags[n] = true),
      narrate: async () => void said.push('narrate'),
      say: async () => void said.push('say'),
      card: () => void said.push('card'),
      find: async (item: string) => void said.push(`find ${item}`),
    };
    return { c: c as unknown as MapContext, said };
  };

  it('a box to open and, for a hidden one, a chalk mark to find first', () => {
    session.game = newGame();
    const m = withCaches(map);
    const things = m.things!.filter((t) => t.id.startsWith('cache-'));
    expect(things.map((t) => t.id)).toEqual(['cache-test', 'cache-hid']);
    expect(m.underwriting!.map((u) => u.id)).toEqual(['cache-mark-hid']);
    const { c } = ctx();
    expect(things.map((t) => t.when!(c))).toEqual([true, false]);
    session.game.flags['seen.cache-mark-hid'] = true;
    expect(things[1]!.when!(c)).toBe(true);
  });

  it('opens once: pennies to the purse and things to the satchel, three of a kind at most', async () => {
    session.game = newGame();
    session.game.satchel.poultice = 2;
    const m = withCaches(map);
    const t = m.things!.find((x) => x.id === 'cache-test')!;
    const { c, said } = ctx();
    await t.run(c);
    expect(session.game.pennies).toBe(5);
    expect(session.game.satchel.poultice).toBe(3);
    expect(said).toEqual(['narrate', 'card', 'say']);
    expect(t.when!(c)).toBe(false);
  });
});
