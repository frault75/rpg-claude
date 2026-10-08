import { describe, expect, it } from 'vitest';
import type { Battle } from '../src/battle/engine';
import { begin, ORDINARY, play, strikeShell } from './fightkit';

describe('the fights, played at the level the story brings', () => {
  it('the party is level 1 at the first fight and 9 at the last', () => {
    expect(begin('f1').level).toBe(1);
    expect(begin('b5').level).toBe(9);
  });

  for (const difficulty of ['story', 'normal'] as const)
    for (const id of ORDINARY)
      it(`${difficulty}, ${id}: an ordinary fight can be won by plain fighting`, () => {
        expect(play(id, difficulty).result).toBe('victory');
      });

  it('story: the first two bosses yield to plain fighting too', () => {
    expect(play('b1', 'story').result).toBe('victory');
    expect(play('b2', 'story').result).toBe('victory');
  });

  it('the Great Snail: plain fighting is a long, hurtful slog; Striking Through its withdrawal is quick', () => {
    const slog = play('b1');
    expect(slog.result).toBe('victory');
    expect(slog.round).toBeGreaterThanOrEqual(7);
    const quick = play('b1', 'normal', strikeShell);
    expect(quick.result).toBe('victory');
    expect(quick.round).toBeLessThanOrEqual(4);
    const hp = (b: Battle) => b.party.reduce((s, u) => s + u.hp, 0);
    expect(hp(quick)).toBeGreaterThan(hp(slog) + 10);
  });

  it('the Danse Macabre and the Blot cannot be won without reading them', () => {
    expect(play('b3').result).not.toBe('victory');
    expect(play('b4').result).not.toBe('victory');
    expect(play('b4', 'story').result).not.toBe('victory');
  });

  it('illuminated: the first fight and the Snail punish plain fighting', () => {
    expect(play('f1', 'illuminated').result).toBe('defeat');
    expect(play('b1', 'illuminated').result).toBe('defeat');
  });
});
