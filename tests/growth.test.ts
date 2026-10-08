import { describe, expect, it } from 'vitest';
import { ENCOUNTERS, ENEMIES, REWARDS } from '../src/battle/data';
import { Battle } from '../src/battle/engine';
import { abilityText, claim, enemyDamage, LEVEL_XP, levelFor, MAX_LEVEL, progress, relabel, spoilsOf, storyLevel } from '../src/battle/growth';
import { parseSave } from '../src/engine/save';
import { parseSettings } from '../src/engine/settings';
import { newGame } from '../src/story/state';

const ALL = {
  isot: ['penknife', 'gloss', 'strike', 'emend', 'rubric'],
  hild: ['shove', 'shrive', 'immure', 'squint', 'benison'],
  whit: ['lance', 'tally', 'vigil', 'read'],
} as const;
const party = ['whit', 'hild', 'isot'] as const;
const fight = (encounter: string, extra: Partial<ConstructorParameters<typeof Battle>[0]> = {}) => {
  const b = new Battle({ encounter, party: [...party], abilities: { isot: [...ALL.isot], hild: [...ALL.hild], whit: [...ALL.whit] }, ...extra });
  b.start();
  return b;
};

describe('levels', () => {
  it('rise with experience, from 1 to 12, and stop there', () => {
    expect(levelFor(0)).toBe(1);
    expect(levelFor(9)).toBe(1);
    expect(levelFor(10)).toBe(2);
    expect(levelFor(LEVEL_XP[MAX_LEVEL]!)).toBe(MAX_LEVEL);
    expect(levelFor(1e6)).toBe(MAX_LEVEL);
    expect(progress(30)).toEqual({ level: 3, into: 5, need: 20 });
    expect(progress(1e6).need).toBe(0);
  });

  it('are what the story gives at each fight, and the main path ends at 9', () => {
    expect(['f1', 'f2', 'b1', 'f3', 'b2', 'f6', 'f7', 'b4', 'f9', 'b5'].map(storyLevel)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 8, 9]);
    // The optional fight counts for nothing in what the story is sure to give.
    expect(storyLevel('f8')).toBe(8);
    expect(levelFor(spoilsOf(Object.keys(REWARDS).filter((id) => !REWARDS[id]!.optional)).xp)).toBe(9);
    // Every fight gives something, except the last, which is the end of the Book.
    for (const id of Object.keys(ENCOUNTERS)) expect(REWARDS[id], id).toBeDefined();
  });

  it('raise HP: at level 3 the party has the HP the first fights were tuned for', () => {
    const at = (level: number) => fight('f3', { level }).party.map((u) => u.maxHp);
    expect(at(3)).toEqual([18, 22, 12]);
    expect(at(1)).toEqual([15, 19, 12]);
    expect(at(9)).toEqual([24, 28, 15]);
  });

  it('bring ranks: Shove 3 at 4, Lance 5 at 6, Penknife 3 at 8, Shrive 8 at 10, Ink 4 at 12', () => {
    const dealt = (level: number, who: 'whit' | 'hild' | 'isot', ability: 'lance' | 'shove' | 'penknife') => {
      const b = fight('f3', { level });
      const e = b.standingEnemies()[0]!;
      const hp = e.hp;
      b.act(who, ability, ability === 'shove' ? {} : { unit: e.id });
      return hp - b.unit(e.id)!.hp;
    };
    // Shove is from the Front: put Hild there.
    const shove = (level: number) => {
      const b = new Battle({ encounter: 'f3', party: ['hild', 'whit', 'isot'], abilities: { isot: [...ALL.isot], hild: [...ALL.hild], whit: [...ALL.whit] }, level });
      b.start();
      const e = b.standingEnemies()[0]!;
      const hp = e.hp;
      b.act('hild', 'shove');
      return hp - b.unit(e.id)!.hp;
    };
    expect([shove(3), shove(4)]).toEqual([2, 3]);
    expect([dealt(5, 'whit', 'lance'), dealt(6, 'whit', 'lance')]).toEqual([4, 5]);
    expect([dealt(7, 'isot', 'penknife'), dealt(8, 'isot', 'penknife')]).toEqual([2, 3]);
    expect([fight('f3', { level: 11 }).maxInk, fight('f3', { level: 12 }).maxInk]).toEqual([3, 4]);
    expect(abilityText('shrive', 10).en).toContain('8');
    expect(abilityText('shrive', 9).en).toContain('6');
  });
});

describe('the spoils', () => {
  it('are given once, the first time a fight is won', () => {
    const g = newGame();
    const first = claim(g, 'f1');
    expect(first).toMatchObject({ xp: 10, pennies: 4, from: 1, to: 2 });
    expect(g).toMatchObject({ xp: 10, pennies: 4, cleared: ['f1'] });
    expect(claim(g, 'f1')).toBeNull();
    expect(g.xp).toBe(10);
  });

  it('announce the ranks a level brings', () => {
    const g = newGame();
    for (const id of ['f1', 'f2']) claim(g, id);
    const sp = claim(g, 'b1')!;
    expect([sp.from, sp.to]).toEqual([3, 4]);
    expect(sp.ranks.map((r) => r.id)).toEqual(['shove2']);
  });

  it('come back to an old save from the fights it has won', () => {
    const st = { ...newGame(), cleared: ['f1', 'f2', 'b1'] } as Record<string, unknown>;
    delete st.xp;
    delete st.pennies;
    const back = parseSave(JSON.stringify({ version: 2, slot: 'auto', savedAt: 1, state: st }));
    expect(back?.state.xp).toBe(45);
    expect(back?.state.pennies).toBe(25);
    expect(parseSave(JSON.stringify({ version: 3, slot: 'auto', savedAt: 1, state: { ...newGame(), xp: -4, pennies: 'lots' } }))?.state).toMatchObject({ xp: 0, pennies: 0 });
  });
});

describe('difficulty', () => {
  it('Illuminated: a quarter more enemy HP, and blows of 3 or more a point harder', () => {
    const b = fight('b1', { difficulty: 'illuminated' });
    expect(b.enemies[0]!.maxHp).toBe(30);
    expect(enemyDamage(2, 'illuminated')).toBe(2);
    expect(enemyDamage(3, 'illuminated')).toBe(4);
    expect(enemyDamage(5, 'story')).toBe(4);
    expect(enemyDamage(1, 'story')).toBe(1);
  });

  it('every banderole names the blow it will really deal', () => {
    for (const difficulty of ['story', 'normal', 'illuminated'] as const)
      for (const id of Object.keys(ENCOUNTERS)) {
        const b = fight(id, { difficulty });
        for (const it of b.intents) {
          if (it.damage <= 0) continue;
          const text = `${it.label.en} ${it.rule?.en ?? ''}`;
          const shown = [...text.matchAll(/· (\d+)/g)].map((m) => Number(m[1]));
          if (shown.length) expect(shown, `${id} ${difficulty}: ${text}`).toContain(it.damage);
        }
      }
  });

  it('a warning of a blow to come is kept true too', () => {
    expect(relabel({ en: 'next: everyone · 3', fr: 'ensuite : tous · 3' }, 3, 4)).toEqual({ en: 'next: everyone · 4', fr: 'ensuite : tous · 4' });
    const snail = ENEMIES.greatSnail!;
    const spec = snail.behave({ round: 2, phase: 1, hp: 24, maxHp: 24, place: 0, allies: [], party: [], fallen: [], letters: 0, phases: new Set(), rng: () => 0.5 });
    expect(spec.some((s) => s.foretells === 3)).toBe(true);
  });

  it('the old Gentle Hand setting becomes Story', () => {
    expect(parseSettings(JSON.stringify({ gameplay: { gentle: true } })).gameplay.difficulty).toBe('story');
    expect(parseSettings(JSON.stringify({ gameplay: { gentle: false } })).gameplay.difficulty).toBe('normal');
    expect(parseSettings(JSON.stringify({ gameplay: { difficulty: 'illuminated', gentle: true } })).gameplay.difficulty).toBe('illuminated');
  });
});
