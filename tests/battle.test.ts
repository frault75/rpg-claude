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

function fight(encounter: BattleSetup['encounter'], party: CharId[], extra: Partial<BattleSetup> = {}): Battle {
  const b = new Battle({ encounter, party, abilities: ALL, ...extra });
  b.start();
  return b;
}

const custom = (enemies: string[]): EncounterDef => ({ id: 'test', name: { en: 'Test', fr: 'Test' }, party: [], enemies, stage: 'test' });

describe('the Omen', () => {
  it('shows every enemy intent, numbered in order', () => {
    const b = fight('f1', ['isot']);
    expect(b.round).toBe(1);
    expect(b.intents.map((i) => [i.actor, i.order, i.damage])).toEqual([
      ['e0', 1, 2],
      ['e1', 2, 2],
    ]);
    expect(b.intents[0]!.label.fr).toContain('Avant');
  });

  it('is the same puzzle every time', () => {
    const run = () => {
      const b = fight('f2', ['hild', 'isot'], { abilities: CHAPTER_ONE_ABILITIES });
      for (let r = 0; r < 4; r++) {
        b.act('hild', 'shove');
        b.act('isot', 'penknife', { unit: b.standingEnemies()[0]!.id });
        b.endTurn();
      }
      return JSON.stringify(b.events);
    };
    expect(run()).toBe(run());
  });
});

describe('the party phase', () => {
  it('resolves an action at once and lets it be undone', () => {
    const b = fight('f1', ['isot']);
    expect(b.act('isot', 'penknife', { unit: 'e0' })).toBe(true);
    expect(b.unit('e0')!.hp).toBe(2);
    expect(b.unit('isot')!.acted).toBe(true);
    expect(b.act('isot', 'penknife', { unit: 'e0' })).toBe(false);
    expect(b.check('isot', 'penknife', { unit: 'e0' })).toBe('acted');
    expect(b.undo()).toBe(true);
    expect(b.unit('e0')!.hp).toBe(4);
    expect(b.unit('isot')!.acted).toBe(false);
  });

  it('allows one free Step a round, and a place-aimed blow hits whoever stands there', () => {
    const b = fight('f1', ['hild', 'isot']);
    expect(b.step(0, 1)).toBe(true);
    expect(b.step(0, 1)).toBe(false);
    expect(b.allyAt(0)!.id).toBe('isot');
    b.endTurn();
    expect(b.unit('isot')!.hp).toBe(12 - 4);
    expect(b.unit('hild')!.hp).toBe(22);
  });

  it('Gloss adds 3 to the next damage, then wears off', () => {
    const b = fight(custom(['brother']), ['isot', 'whit']);
    b.act('isot', 'gloss', { unit: 'e0' });
    b.act('whit', 'lance', { unit: 'e0' });
    expect(b.unit('e0')!.hp).toBe(9 - 7);
    expect(b.unit('e0')!.status.glossed).toBe(false);
  });

  it('Strike Through cancels an intent; it costs 2 Ink', () => {
    const b = fight('f1', ['isot']);
    expect(b.act('isot', 'strike', { intent: b.intents[0]!.id })).toBe(true);
    expect(b.ink).toBe(0);
    b.endTurn();
    expect(b.unit('isot')!.hp).toBe(10);
    expect(b.ink).toBe(1);
    expect(b.check('isot', 'strike', { intent: b.intents[0]!.id })).toBe('ink');
  });

  it('Emend turns a blow onto another ally', () => {
    const b = fight(custom(['gryllus']), ['isot', 'hild']);
    b.act('isot', 'emend', { intent: b.intents[0]!.id, to: 'hild' });
    b.endTurn();
    expect(b.unit('isot')!.hp).toBe(12);
    expect(b.unit('hild')!.hp).toBe(20);
  });

  it('Penance cannot be paid with the last point', () => {
    const b = fight('f1', ['hild', 'isot']);
    b.unit('hild')!.hp = 3;
    expect(b.check('hild', 'shrive', { unit: 'isot' })).toBe('hp');
    b.unit('hild')!.hp = 4;
    expect(b.act('hild', 'shrive', { unit: 'hild' })).toBe(true);
    expect(b.unit('hild')!.hp).toBe(7);
  });

  it('Shrive raises a fallen ally, who cannot act that round', () => {
    const b = fight('f1', ['hild', 'isot']);
    const isot = b.unit('isot')!;
    isot.hp = 0;
    isot.fallen = true;
    expect(b.act('hild', 'shrive', { unit: 'isot' })).toBe(true);
    expect(isot.fallen).toBe(false);
    expect(isot.hp).toBe(6);
    expect(b.check('isot', 'penknife', { unit: 'e0' })).toBe('acted');
  });

  it('Lance and Shove need the Front or Middle; Lance reaches the 1st or 2nd enemy', () => {
    const b = fight(custom(['gryllus', 'gryllus', 'gryllus']), ['hild', 'isot', 'whit']);
    expect(b.check('whit', 'lance', { unit: 'e0' })).toBe('from-front');
    b.step(1, 2);
    expect(b.check('whit', 'lance', { unit: 'e2' })).toBe('reach');
    expect(b.check('whit', 'lance', { unit: 'e1' })).toBeNull();
  });

  it('Rubric doubles an ally’s next ability', () => {
    const b = fight(custom(['wodewose']), ['whit', 'isot']);
    b.act('isot', 'rubric', { unit: 'whit' });
    b.act('whit', 'lance', { unit: 'e0' });
    expect(b.unit('e0')!.hp).toBe(16 - 8);
  });
});

describe('the enemy phase', () => {
  it('a Close intent fizzles once its enemy is shoved out of reach', () => {
    const b = fight(custom(['gryllus', 'gryllus', 'gryllus']), ['hild', 'isot']);
    b.act('hild', 'shove');
    expect(b.unit('e0')!.place).toBe(2);
    b.endTurn();
    // e1 and e2 now stand 1st and 2nd: two blows of 2 on the Front.
    expect(b.unit('hild')!.hp).toBe(22 - 4);
    expect(b.events.some((e) => e.type === 'fizzle' && e.reason === 'reach')).toBe(true);
  });

  it('a blow at a fallen place carries back to the next ally', () => {
    const b = fight(custom(['gryllus']), ['isot', 'hild']);
    const isot = b.unit('isot')!;
    isot.hp = 0;
    isot.fallen = true;
    b.endTurn();
    expect(b.unit('hild')!.hp).toBe(20);
  });

  it('Ward absorbs damage, and a Brother’s scouring strips it', () => {
    const b = fight(custom(['gryllus']), ['hild'], { equipment: { hild: { relic: null, charm: 'anchorStone' } } });
    expect(b.unit('hild')!.status.ward).toBe(2);
    b.endTurn();
    expect(b.unit('hild')!.hp).toBe(22);
    expect(b.unit('hild')!.status.ward).toBe(0);
  });

  it('Immure makes an enemy’s intent wait a round', () => {
    const b = fight(custom(['gryllus']), ['hild', 'isot']);
    b.act('hild', 'immure', { unit: 'e0' });
    expect(b.check('isot', 'penknife', { unit: 'e0' })).toBe('immured-target');
    b.endTurn();
    expect(b.unit('hild')!.hp).toBe(22 - 2);
    expect(b.intents).toHaveLength(1);
    expect(b.intents[0]!.label.en).toContain('Butts');
    b.endTurn();
    expect(b.unit('hild')!.hp).toBe(22 - 2 - 2);
  });

  it('Immure on an ally who has acted keeps them safe', () => {
    const b = fight(custom(['gryllus']), ['isot', 'hild']);
    b.act('isot', 'penknife', { unit: 'e0' });
    b.act('hild', 'immure', { unit: 'isot' });
    b.endTurn();
    // The Front is walled in: the blow fizzles.
    expect(b.unit('isot')!.hp).toBe(12);
    expect(b.unit('hild')!.hp).toBe(22 - 2);
  });

  it('a wind-up strikes next round unless struck through', () => {
    const b = fight(custom(['wodewose']), ['hild', 'isot']);
    expect(b.intents[0]!.countdown).toBe(1);
    b.endTurn();
    expect(b.unit('hild')!.hp).toBe(22);
    expect(b.intents[0]!.countdown).toBe(0);
    b.endTurn();
    expect(b.unit('hild')!.hp).toBe(22 - 9);

    const c = fight(custom(['wodewose']), ['hild', 'isot']);
    c.endTurn();
    c.act('isot', 'strike', { intent: c.intents[0]!.id });
    c.endTurn();
    expect(c.unit('hild')!.hp).toBe(22);
    expect(c.intents[0]!.label.en).toContain('Roars');
  });

  it('Vigil strikes the first attacker first; if it falls, its blow is lost', () => {
    const b = fight(custom(['gryllus', 'gryllus']), ['whit', 'isot']);
    b.act('whit', 'vigil');
    b.endTurn();
    expect(b.unit('e0')!.fallen).toBe(true);
    expect(b.unit('whit')!.hp).toBe(18 - 2);
  });

  it('Squint shows next round’s intents', () => {
    const b = fight('f2', ['hild', 'isot']);
    b.act('hild', 'squint');
    expect(b.preview!.map((i) => i.label.en)).toEqual(['Rasps at the Rear: Smudge', 'Rasps at the Rear: Smudge']);
    b.endTurn();
    expect(b.intents.map((i) => i.label.en)).toEqual(['Rasps at the Rear: Smudge', 'Rasps at the Rear: Smudge']);
  });

  it('Smudge makes Isot’s next Ink ability cost 1 more', () => {
    const b = fight('f2', ['hild', 'isot', 'whit']);
    b.endTurn();
    b.step(1, 2);
    b.endTurn();
    expect(b.unit('isot')!.status.smudged).toBe(true);
    expect(b.inkCost(b.unit('isot')!, 'strike')).toBe(3);
  });

  it('the party falls: defeat', () => {
    const b = fight(custom(['wodewose']), ['isot']);
    b.unit('isot')!.hp = 5;
    b.endTurn();
    b.endTurn();
    expect(b.result).toBe('defeat');
  });
});

describe('Boss I: the Great Snail', () => {
  const party: CharId[] = ['whit', 'hild', 'isot'];

  it('withdraws into its shell when it says so, and blows then deal 1', () => {
    const b = fight('b1', party, { abilities: CHAPTER_ONE_ABILITIES });
    b.endTurn();
    expect(b.unit('e0')!.status.shelled).toBe(true);
    b.act('whit', 'lance', { unit: 'e0' });
    expect(b.unit('e0')!.hp).toBe(23);
  });

  it('striking through the withdrawal keeps it out of its shell', () => {
    const b = fight('b1', party, { abilities: CHAPTER_ONE_ABILITIES });
    b.endTurn();
    const shell = b.intents.find((i) => i.label.en.startsWith('Withdraws'))!;
    b.act('isot', 'strike', { intent: shell.id });
    expect(b.unit('e0')!.status.shelled).toBe(false);
  });

  it('a Tally that runs out in its shell is wasted', () => {
    const b = fight('b1', party, { abilities: CHAPTER_ONE_ABILITIES });
    b.endTurn();
    b.act('whit', 'tally', { unit: 'e0' });
    b.endTurn();
    b.act('whit', 'lance', { unit: 'e0' });
    b.act('isot', 'penknife', { unit: 'e0' });
    const reck = b.events.findIndex((e) => e.type === 'reckoning');
    expect(reck).toBeGreaterThan(-1);
    expect(b.events[reck + 1]).toMatchObject({ type: 'damage', unit: 'e0', amount: 1 });
  });

  it('falls to a Tally timed for its horns, though it licks its wounds in its shell', () => {
    const b = fight('b1', party, { abilities: CHAPTER_ONE_ABILITIES });
    const snail = b.unit('e0')!;
    // Round 1: horns out. Gloss, then Lance for 7, Shove for 2.
    b.act('isot', 'gloss', { unit: 'e0' });
    b.act('whit', 'lance', { unit: 'e0' });
    b.act('hild', 'shove');
    expect(snail.hp).toBe(15);
    b.endTurn();
    expect(b.unit('whit')!.hp).toBe(13);
    // Round 2: shelled. Heal, chip.
    b.act('hild', 'shrive', { unit: 'whit' });
    b.act('whit', 'lance', { unit: 'e0' });
    b.act('isot', 'penknife', { unit: 'e0' });
    expect(snail.hp).toBe(13);
    b.endTurn();
    // In its shell it licked its wounds.
    expect(snail.hp).toBe(17);
    // Round 3: the slime tide and the sea; strike through the slime, set the Tally.
    expect(b.intents.map((i) => i.actor)).toEqual(['e0', 'env']);
    b.act('isot', 'strike', { intent: b.intents[0]!.id });
    b.act('whit', 'tally', { unit: 'e0' });
    b.endTurn();
    expect(snail.status.tally).toBe(2);
    expect(snail.status.shelled).toBe(false);
    // Round 4: horns out again. Two hits bring the Reckoning.
    b.act('isot', 'gloss', { unit: 'e0' });
    b.act('whit', 'lance', { unit: 'e0' });
    b.act('hild', 'shove');
    expect(b.events.some((e) => e.type === 'reckoning' && e.amount === 7)).toBe(true);
    expect(snail.hp).toBe(1);
    b.endTurn();
    // Round 5: one more blow, even through the shell.
    b.act('whit', 'lance', { unit: 'e0' });
    expect(b.result).toBe('victory');
  });

  it('Striking Through the withdrawal keeps it out of its shell and from licking its wounds', () => {
    const b = fight('b1', party, { abilities: CHAPTER_ONE_ABILITIES });
    const snail = b.unit('e0')!;
    b.endTurn();
    const hp = snail.hp;
    const withdraw = b.intents.find((i) => i.effects.some((e) => e.kind === 'shell'))!;
    expect(snail.status.shelled).toBe(true);
    b.act('isot', 'strike', { intent: withdraw.id });
    expect(snail.status.shelled).toBe(false);
    b.endTurn();
    expect(snail.hp).toBe(hp);
  });
});

describe('equipment', () => {
  it('Lamp-black: Ink holds 4 but starts at 1', () => {
    const b = fight('f1', ['isot'], { equipment: { isot: { relic: 'lampBlack', charm: null } } });
    expect([b.ink, b.maxInk]).toEqual([1, 4]);
  });

  it('Ebb Shell softens only the first blow', () => {
    const b = fight('f1', ['isot'], { equipment: { isot: { relic: null, charm: 'ebbShell' } } });
    b.endTurn();
    expect(b.unit('isot')!.hp).toBe(12 - 1 - 2);
  });

  it('Gentle Hand: more HP, Ink refills by 2', () => {
    const b = fight('f1', ['isot'], { gentle: true });
    expect(b.unit('isot')!.maxHp).toBe(18);
    b.act('isot', 'strike', { intent: b.intents[0]!.id });
    b.endTurn();
    expect(b.ink).toBe(2);
  });
});

describe('the battle music', () => {
  it('fills every bar of the estampie exactly', async () => {
    const { barLengths, OSTINATO } = await import('../src/audio/battleMusic');
    expect(barLengths().every((n) => n === 6)).toBe(true);
    expect(OSTINATO).toHaveLength(12);
  });
});

describe('Boss II: the Mummers’ Play', () => {
  const party: CharId[] = ['whit', 'hild', 'isot'];
  const kill = (b: Battle, id: string) => {
    b.unit(id)!.hp = 1;
    b.act('isot', 'penknife', { unit: id });
  };

  it('speaks in couplets with the rule underneath', () => {
    const b = fight('b2', party);
    expect(b.intents.map((i) => i.rule?.en)).toEqual(['Front · 4', 'Slashes the Middle · 3', 'Doses Saint George: heals 4']);
  });

  it('Saint George guards the Doctor every other round', () => {
    const b = fight('b2', party);
    b.endTurn();
    const doctor = b.enemies.find((e) => e.kind === 'doctor')!;
    expect(doctor.status.guarded).toBe(true);
    expect(b.check('whit', 'lance', { unit: doctor.id })).toBe('guarded');
    expect(b.check('isot', 'penknife', { unit: doctor.id })).toBe('guarded');
    // Struck through, the guard drops at once.
    const guard = b.intents.find((i) => i.effects.some((e) => e.kind === 'guard'))!;
    b.act('isot', 'strike', { intent: guard.id });
    expect(doctor.status.guarded).toBe(false);
  });

  it('the Doctor raises the fallen at full HP, at the back of the line', () => {
    const b = fight('b2', party);
    const slasher = b.enemies.find((e) => e.kind === 'slasher')!;
    kill(b, slasher.id);
    expect(slasher.fallen).toBe(true);
    b.endTurn();
    expect(b.intents.some((i) => i.rule?.en.startsWith('Raises Bold Slasher'))).toBe(true);
    b.endTurn();
    expect(slasher.fallen).toBe(false);
    expect(slasher.hp).toBe(10);
    expect(b.rank(slasher)).toBe(2);
  });

  it('after two revivals the masks crack, and every revival costs the Doctor 3 HP', () => {
    const b = fight('b2', party);
    const slasher = b.enemies.find((e) => e.kind === 'slasher')!;
    const doctor = b.enemies.find((e) => e.kind === 'doctor')!;
    for (let k = 0; k < 3; k++) {
      kill(b, slasher.id);
      b.endTurn();
      b.endTurn();
    }
    expect(b.events.filter((e) => e.type === 'phase')).toHaveLength(1);
    expect(doctor.hp).toBe(8 - 3);
  });

  it('only one of two fallen comes back: fell George and the Slasher in the same round', () => {
    const b = fight('b2', party);
    const george = b.enemies.find((e) => e.kind === 'george')!;
    const slasher = b.enemies.find((e) => e.kind === 'slasher')!;
    george.hp = 1;
    slasher.hp = 1;
    b.act('isot', 'penknife', { unit: george.id });
    b.act('whit', 'lance', { unit: slasher.id });
    b.endTurn();
    b.endTurn();
    expect([george, slasher].filter((u) => u.fallen)).toHaveLength(1);
  });

  it('a Tally on the Doctor counts down through the guard', () => {
    const b = fight('b2', party);
    const doctor = b.enemies.find((e) => e.kind === 'doctor')!;
    b.act('whit', 'tally', { unit: doctor.id });
    b.endTurn();
    expect(doctor.status.guarded).toBe(true);
    b.endTurn();
    b.endTurn();
    expect(b.events.some((e) => e.type === 'reckoning' && e.unit === doctor.id)).toBe(true);
    expect(doctor.hp).toBe(8 - 7);
  });
});

describe('Prior Gaudry at Ninefold Gate', () => {
  const party: CharId[] = ['whit', 'hild', 'isot'];

  it('his edicts are sealed until Hild squints at them', () => {
    const b = fight('f6', party);
    const gaudry = b.enemies.find((e) => e.kind === 'gaudry')!;
    const edict = b.intents.find((i) => i.actor === gaudry.id)!;
    expect(b.shows(edict)).toBe(false);
    b.act('hild', 'squint');
    expect(b.shows(edict)).toBe(true);
    expect(edict.label.en).toContain('EDICT');
  });

  it('whoever stands at the Front when the Edict lands kneels next round', () => {
    const b = fight('f6', party);
    b.endTurn();
    expect(b.kneeling('whit')).toBe(true);
    expect(b.check('whit', 'lance', { unit: b.standingEnemies()[0]!.id })).toBe('acted');
    expect(b.check('hild', 'shove')).toBeNull();
  });

  it('stepping someone who has already acted to the Front takes the Edict for them', () => {
    const b = fight('f6', party);
    b.act('hild', 'shrive', { unit: 'isot' });
    b.step(0, 1);
    b.endTurn();
    expect(b.kneeling('hild')).toBe(true);
    expect(b.kneeling('whit')).toBe(false);
  });
});

describe('Boss III: the Danse Macabre', () => {
  const party: CharId[] = ['whit', 'hild', 'isot'];
  const who = (b: Battle, kind: string) => b.enemies.find((e) => e.kind === kind)!;

  it('every banderole is a “?” until it is Glossed, but the dance’s turn is always plain', () => {
    const b = fight('b3', party);
    const turn = b.intents.find((i) => i.actor === 'env')!;
    expect(b.shows(turn)).toBe(true);
    expect(b.intents.filter((i) => i.actor !== 'env').every((i) => !b.shows(i))).toBe(true);
    b.act('isot', 'gloss', { unit: who(b, 'childDancer').id });
    expect(b.intents.filter((i) => b.shows(i) && i.actor !== 'env').map((i) => i.actor)).toEqual([who(b, 'childDancer').id]);
  });

  it('the party’s blows pass through the followers; only the Child can be harmed', () => {
    const b = fight('b3', party);
    const pope = who(b, 'pope');
    b.act('isot', 'penknife', { unit: pope.id });
    expect(pope.hp).toBe(8);
    expect(b.events.some((e) => e.type === 'pass' && e.unit === pope.id)).toBe(true);
    b.act('whit', 'tally', { unit: who(b, 'childDancer').id });
    b.act('hild', 'shove');
    expect(pope.hp).toBe(8);
    b.undo();
    b.undo();
    b.undo();
    b.act('isot', 'penknife', { unit: who(b, 'childDancer').id });
    expect(who(b, 'childDancer').hp).toBe(22);
  });

  it('the dance turns at every round’s end: each dancer one place back, the last to the front', () => {
    const b = fight('b3', party);
    const before = ['pope', 'king', 'childDancer', 'ploughman'].map((k) => who(b, k).place);
    expect(before).toEqual([0, 1, 2, 3]);
    b.endTurn();
    expect(['pope', 'king', 'childDancer', 'ploughman'].map((k) => who(b, k).place)).toEqual([1, 2, 3, 0]);
  });

  it('striking through the turn holds the ring still', () => {
    const b = fight('b3', party);
    const turn = b.intents.find((i) => i.actor === 'env')!;
    b.act('isot', 'strike', { intent: turn.id });
    b.endTurn();
    expect(['pope', 'king', 'childDancer', 'ploughman'].map((k) => who(b, k).place)).toEqual([0, 1, 2, 3]);
  });

  it('the Child calls the tune in round 2: every dancer acts twice in round 3, unless it is struck through', () => {
    const b = fight('b3', party);
    b.endTurn();
    const tune = b.intents.find((i) => i.effects.some((e) => e.kind === 'tune'))!;
    expect(tune.actor).toBe(who(b, 'childDancer').id);
    b.endTurn();
    const dancers = (x: Battle) => x.intents.filter((i) => i.actor !== 'env').length;
    expect(dancers(b)).toBe(8);

    const c = fight('b3', party);
    c.endTurn();
    c.act('isot', 'strike', { intent: c.intents.find((i) => i.effects.some((e) => e.kind === 'tune'))!.id });
    c.endTurn();
    expect(dancers(c)).toBe(4);
  });

  it('upgraded, Emend turns a follower’s blow onto the Child, for 2 Ink', () => {
    const b = fight('b3', party);
    const hand = b.intents.find((i) => i.actor === who(b, 'pope').id)!;
    const child = who(b, 'childDancer');
    expect(b.check('isot', 'emend', { intent: hand.id, to: child.id })).toBe('target');
    const c = fight('b3', party, { emendAnywhere: true });
    const hand2 = c.intents.find((i) => i.actor === who(c, 'pope').id)!;
    expect(c.check('isot', 'emend', { intent: hand2.id, to: who(c, 'pope').id })).toBe('target');
    expect(c.act('isot', 'emend', { intent: hand2.id, to: who(c, 'childDancer').id })).toBe(true);
    expect(c.ink).toBe(0);
    c.endTurn();
    expect(who(c, 'childDancer').hp).toBe(21);
    // The hand was taken by another dancer: the Front and Middle did not swap.
    expect(c.allyAt(0)!.id).toBe('whit');
  });

  it('at half its HP the ring turns to Whit, and the followers’ blows pass through him', () => {
    const b = fight('b3', party);
    const child = who(b, 'childDancer');
    child.hp = 13;
    b.act('isot', 'penknife', { unit: child.id });
    expect(b.events.some((e) => e.type === 'phase' && e.title.en === 'The Empty Place')).toBe(true);
    const whitHp = b.unit('whit')!.hp;
    b.endTurn();
    // The Pope's hand at the Front (Whit) passes through him.
    expect(b.unit('whit')!.hp).toBe(whitHp);
    expect(b.events.some((e) => e.type === 'pass' && e.unit === 'whit')).toBe(true);
  });

  it('falls in a few rounds to a Squint, a Tally, a struck tune and tracking the Child', () => {
    const b = fight('b3', party);
    const child = () => who(b, 'childDancer');
    // Round 1: find the Leader, set the Tally.
    b.act('hild', 'squint');
    b.act('whit', 'tally', { unit: child().id });
    b.act('isot', 'penknife', { unit: child().id });
    b.endTurn();
    // Round 2: the tune is called; strike it through.
    const tune = b.intents.find((i) => i.effects.some((e) => e.kind === 'tune'))!;
    expect(b.act('isot', 'strike', { intent: tune.id })).toBe(true);
    const hurt = [...b.party].sort((x, y) => x.hp - y.hp)[0]!;
    b.act('hild', 'shrive', { unit: hurt.id });
    b.endTurn();
    // Then follow the Child round the ring.
    for (let r = 0; r < 4 && b.result === 'ongoing'; r++) {
      const c = child();
      if (!b.check('whit', 'lance', { unit: c.id })) b.act('whit', 'lance', { unit: c.id });
      if (!b.check('isot', 'penknife', { unit: c.id })) b.act('isot', 'penknife', { unit: c.id });
      if (b.result === 'ongoing') {
        if (b.standingEnemies()[0] === child() && !b.check('hild', 'shove')) b.act('hild', 'shove');
        else {
          const low = [...b.party].filter((x) => !x.fallen).sort((x, y) => x.hp - y.hp)[0]!;
          if (!b.check('hild', 'shrive', { unit: low.id })) b.act('hild', 'shrive', { unit: low.id });
        }
      }
      if (b.result === 'ongoing') b.endTurn();
    }
    expect(b.result).toBe('victory');
    expect(b.round).toBeLessThanOrEqual(5);
    expect(b.party.every((u) => !u.fallen)).toBe(true);
  });

  it('when the Child falls, the whole dance ends', () => {
    const b = fight('b3', party);
    const child = who(b, 'childDancer');
    child.hp = 2;
    b.act('isot', 'penknife', { unit: child.id });
    expect(b.enemies.every((e) => e.fallen)).toBe(true);
    expect(b.result).toBe('victory');
  });
});

describe('the Blanchwood music', () => {
  it('fills every bar of its tune exactly, four beats', async () => {
    const { BLANCH_TUNE } = await import('../src/audio/blanchwood');
    for (const bar of BLANCH_TUNE) expect(bar.reduce((s, [, n]) => s + n, 0)).toBe(4);
  });

  it('forgets more notes the deeper the wood', async () => {
    const { forgotten } = await import('../src/audio/blanchwood');
    const count = (d: number) => Array.from({ length: 400 }, (_, n) => forgotten(n, d)).filter(Boolean).length;
    expect(count(0)).toBe(0);
    expect(count(0.3)).toBeLessThan(count(0.7));
    expect(count(1)).toBeGreaterThan(300);
  });
});

describe('the Ivy Gate: the caladrius', () => {
  const party: CharId[] = ['whit', 'hild', 'isot'];

  it('looks away from the weakest ally, who takes double damage this round', () => {
    const b = fight('f7', party);
    const look = b.intents.find((i) => i.effects.some((e) => e.kind === 'doom'))!;
    expect(look.target).toEqual({ unit: 'isot' });
    expect(b.unit('isot')!.status.doomed).toBe(true);
    b.endTurn();
    // Two arrows at the Rear, each doubled: 12 − 6 − 6.
    expect(b.unit('isot')!.fallen).toBe(true);
  });

  it('stepping the marked ally out of the Rear dodges the arrows aimed there', () => {
    const b = fight('f7', party);
    b.step(1, 2);
    b.endTurn();
    expect(b.unit('isot')!.hp).toBe(12);
    expect(b.unit('hild')!.hp).toBe(22 - 6);
  });

  it('Read Aloud ends it outright: 6 HP is within reach', () => {
    const b = fight('f7', party);
    const bird = b.enemies.find((e) => e.kind === 'caladrius')!;
    expect(b.act('whit', 'read', { unit: bird.id })).toBe(true);
    expect(bird.fallen).toBe(true);
    expect(bird.status.doomed).toBe(false);
  });
});

describe('Boss IV: the Blot', () => {
  const party: CharId[] = ['whit', 'hild', 'isot'];
  const blot = (b: Battle) => b.enemies.find((e) => e.kind === 'blot')!;
  const blotlets = (b: Battle) => b.enemies.filter((e) => e.kind === 'blotlet' && !e.fallen);

  it('big hits split off Blotlets; small ones do not', () => {
    const b = fight('b4', party);
    b.act('isot', 'penknife', { unit: blot(b).id });
    expect(blotlets(b)).toHaveLength(1);
    b.act('whit', 'lance', { unit: blot(b).id });
    expect(blotlets(b)).toHaveLength(2);
    expect(b.events.some((e) => e.type === 'spawn')).toBe(true);
    expect(blot(b).hp).toBe(24);
  });

  it('ink does not die: damage leaves it at 1, and only Read Aloud ends it', () => {
    const b = fight('b4', party);
    blot(b).hp = 3;
    b.act('whit', 'lance', { unit: blot(b).id });
    expect(blot(b).hp).toBe(1);
    expect(blot(b).fallen).toBe(false);
    expect(b.act('isot', 'penknife', { unit: blotlets(b)[0]!.id })).toBe(true);
    b.endTurn();
    expect(b.act('whit', 'read', { unit: blot(b).id })).toBe(true);
    expect(b.result).toBe('victory');
    expect(b.enemies.every((e) => e.fallen)).toBe(true);
  });

  it('the Penknife on a Blotlet fills her pen', () => {
    const b = fight('b4', party);
    const ink = b.ink;
    b.act('isot', 'penknife', { unit: blotlets(b)[0]!.id });
    expect(b.ink).toBe(ink + 1);
  });

  it('a Blotlet beside the Blot seeps back into it; one further off spatters the Rear', () => {
    const b = fight('b4', party);
    const seep = b.intents.find((i) => i.actor === blotlets(b)[0]!.id)!;
    expect(seep.effects.some((e) => e.kind === 'heal')).toBe(true);
    expect(seep.target).toEqual({ unit: blot(b).id });
  });

  it('can be won by small hits, harvested Ink, then Rubric and Read Aloud', () => {
    const b = fight('b4', party, { emendAnywhere: true });
    for (let r = 0; r < 12 && b.result === 'ongoing'; r++) {
      const B = blot(b);
      // Read it as soon as it can be read, doubled by Rubric if need be.
      if (B.hp <= 12 && b.ink >= 1 && b.check('whit', 'read', { unit: B.id }) === 'too-strong') b.act('isot', 'rubric', { unit: 'whit' });
      if (!b.check('whit', 'read', { unit: B.id })) {
        b.act('whit', 'read', { unit: B.id });
        break;
      }
      // Small hits only: the Penknife on the Blot, Shove at whatever is in front.
      const lets = blotlets(b);
      if (lets.length && b.ink < 2) b.act('isot', 'penknife', { unit: lets[0]!.id });
      else if (!b.check('isot', 'penknife', { unit: B.id })) b.act('isot', 'penknife', { unit: B.id });
      if (lets.length && !b.check('whit', 'lance', { unit: lets[0]!.id })) b.act('whit', 'lance', { unit: lets[0]!.id });
      else if (!b.check('whit', 'tally', { unit: B.id }) && B.status.tally === null && B.hp > 14) b.act('whit', 'tally', { unit: B.id });
      const low = [...b.party].filter((x) => !x.fallen).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0]!;
      if (low.hp < low.maxHp * 0.6 && !b.check('hild', 'shrive', { unit: low.id })) b.act('hild', 'shrive', { unit: low.id });
      else if (!b.check('hild', 'shove')) b.act('hild', 'shove');
      if (b.result === 'ongoing') b.endTurn();
    }
    expect(b.result).toBe('victory');
    expect(b.round).toBeLessThanOrEqual(12);
  });

  it('Rubric doubles Read Aloud’s reach to 12', () => {
    const b = fight('b4', party);
    blot(b).hp = 11;
    expect(b.check('whit', 'read', { unit: blot(b).id })).toBe('too-strong');
    b.act('isot', 'rubric', { unit: 'whit' });
    expect(b.check('whit', 'read', { unit: blot(b).id })).toBeNull();
  });

  it('at 15 HP the Rasure: Ermeline drains an Ink a round until Emend turns her stroke', () => {
    const b = fight('b4', party, { emendAnywhere: true });
    blot(b).hp = 16;
    b.act('isot', 'penknife', { unit: blot(b).id });
    expect(b.phases.has('rasure')).toBe(true);
    b.endTurn();
    const drain = b.intents.find((i) => i.effects.some((e) => e.kind === 'drain'))!;
    expect(drain).toBeDefined();
    const before = b.ink;
    b.endTurn();
    // Drained one, refilled one at the round's end.
    expect(b.ink).toBe(before);
    const again = b.intents.find((i) => i.effects.some((e) => e.kind === 'drain'))!;
    expect(b.check('isot', 'emend', { intent: again.id, to: blot(b).id })).toBeNull();
    b.act('isot', 'emend', { intent: again.id, to: blot(b).id });
    b.endTurn();
    expect(b.phases.has('ermelineFree')).toBe(true);
    expect(b.intents.some((i) => i.effects.some((e) => e.kind === 'drain'))).toBe(false);
  });
});

describe('the Margin music', () => {
  it('fills every bar of its tune exactly, and trades its notes between two instruments', async () => {
    const { MARGIN_TUNE, hocket } = await import('../src/audio/margin');
    for (const bar of MARGIN_TUNE) expect(bar.reduce((s, [, n]) => s + n, 0)).toBe(4);
    expect([0, 1, 2, 3].map(hocket)).toEqual([0, 1, 0, 1]);
  });
});

describe('Boss V: Aumery and the Writing of FINIS', () => {
  const party: CharId[] = ['whit', 'hild', 'isot'];
  const FINAL: Record<CharId, AbilityId[]> = { ...ALL, isot: [...ALL.isot, 'inscribe'] };
  const fin = (extra: Partial<BattleSetup> = {}) => fight('b5', party, { abilities: FINAL, emendAnywhere: true, ...extra });
  const aumery = (b: Battle) => b.enemies.find((e) => e.kind === 'aumery')!;

  it('Isot writes at the lectern in the Rear, and only there', () => {
    const b = fin();
    expect(b.check('isot', 'inscribe')).toBeNull();
    b.step(1, 2);
    expect(b.check('isot', 'inscribe')).toBe('lectern');
    b.undo();
    expect(b.act('isot', 'inscribe')).toBe(true);
    expect(b.letters).toBe(1);
    expect(fight('b4', party, { abilities: FINAL }).check('isot', 'inscribe')).toBe('lectern');
  });

  it('a letter smudges if she is hurt in the round she wrote it; Immure keeps it', () => {
    const b = fin();
    b.endTurn();
    b.endTurn();
    // Round 3: "Pumices the page: Isot · 4".
    expect(b.intents.some((i) => i.label.en.startsWith('Pumices'))).toBe(true);
    b.act('isot', 'inscribe');
    b.endTurn();
    expect(b.letters).toBe(0);

    const c = fin();
    c.endTurn();
    c.endTurn();
    c.act('isot', 'inscribe');
    c.act('hild', 'immure', { unit: 'isot' });
    c.endTurn();
    expect(c.letters).toBe(1);
  });

  it('he cannot be felled, and every 10 damage makes him falter and lose his next intent', () => {
    const b = fin();
    expect(b.check('whit', 'read', { unit: aumery(b).id })).toBe('too-strong');
    aumery(b).hp = 3;
    b.act('whit', 'lance', { unit: aumery(b).id });
    expect(aumery(b).hp).toBe(1);
    expect(aumery(b).fallen).toBe(false);

    const c = fin();
    const edict = c.intents.find((i) => i.actor === aumery(c).id)!;
    c.unit(aumery(c).id)!.status.glossed = true;
    c.act('isot', 'rubric', { unit: 'whit' });
    // A doubled Lance and the Gloss: 8 + 3 = 11, past 10.
    c.act('whit', 'lance', { unit: aumery(c).id });
    expect(c.events.some((e) => e.type === 'falter')).toBe(true);
    expect(c.intents.find((i) => i.id === edict.id)!.cancelled).toBe(true);
  });

  it('“Scrapes WHIT from the page”: Whit is Forgotten and cannot act for two rounds', () => {
    const b = fin();
    b.endTurn();
    expect(b.intents.some((i) => i.label.en.startsWith('Scrapes WHIT'))).toBe(true);
    b.endTurn();
    expect(b.check('whit', 'lance', { unit: aumery(b).id })).toBe('acted');
    b.endTurn();
    expect(b.check('whit', 'tally', { unit: aumery(b).id })).toBe('acted');
    b.endTurn();
    expect(b.check('whit', 'tally', { unit: aumery(b).id })).toBeNull();
  });

  it('after the N the Clean Page; after the fourth letter he gathers the pumice to scrape them all', () => {
    const b = fin();
    for (let k = 0; k < 4; k++) {
      b.act('isot', 'inscribe');
      b.act('hild', 'immure', { unit: 'isot' });
      if (k === 2) expect(b.phases.has('cleanPage')).toBe(true);
      b.endTurn();
      // Keep Hild able to wall her in again.
      b.unit('hild')!.hp = 22;
    }
    expect(b.letters).toBe(4);
    const gather = b.intents.find((i) => i.effects.some((e) => e.kind === 'scrapeLetters'))!;
    expect(gather.countdown).toBe(1);
    b.endTurn();
    b.endTurn();
    expect(b.letters).toBe(0);
  });

  it('can be won: write, wall her in, and keep the others standing', () => {
    const b = fin();
    for (let r = 0; r < 12 && b.result === 'ongoing'; r++) {
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
    expect(b.result).toBe('victory');
    expect(b.letters).toBe(5);
  });

  it('the fifth letter wins; if Isot falls, all is lost', () => {
    const b = fin();
    b.letters = 4;
    b.act('isot', 'inscribe');
    expect(b.result).toBe('victory');
    const c = fin();
    c.unit('isot')!.hp = 1;
    c.endTurn();
    c.endTurn();
    c.endTurn();
    expect(c.result).toBe('defeat');
  });
});
