import { describe, expect, it } from 'vitest';
import { indexLabels, runScript, type Script, ScriptError, type ScriptHost } from '../src/story/script';
import { check, type Flags } from '../src/story/state';

describe('conditions', () => {
  const flags: Flags = { met: true, count: 3, name: 'whit', off: false };

  it('reads flags, negation, all and any', () => {
    expect(check(undefined, flags)).toBe(true);
    expect(check('met', flags)).toBe(true);
    expect(check('off', flags)).toBe(false);
    expect(check('missing', flags)).toBe(false);
    expect(check({ not: 'off' }, flags)).toBe(true);
    expect(check({ all: ['met', { not: 'off' }] }, flags)).toBe(true);
    expect(check({ all: ['met', 'off'] }, flags)).toBe(false);
    expect(check({ any: ['off', 'met'] }, flags)).toBe(true);
  });

  it('compares values', () => {
    expect(check({ flag: 'name', eq: 'whit' }, flags)).toBe(true);
    expect(check({ flag: 'count', gte: 3 }, flags)).toBe(true);
    expect(check({ flag: 'count', gte: 4 }, flags)).toBe(false);
    expect(check({ flag: 'name', gte: 1 }, flags)).toBe(false);
  });
});

/** A host that records what happened and answers choices from a queue. */
function fakeHost(choices: number[] = [], battles: boolean[] = []) {
  const log: string[] = [];
  const host: ScriptHost = {
    flags: {},
    say: async (who, text) => void log.push(`${who}: ${text}`),
    narrate: async (text) => void log.push(`~ ${text}`),
    choose: async (opts) => {
      log.push(`? ${opts.join(' | ')}`);
      return choices.shift() ?? 0;
    },
    join: (w) => void log.push(`join ${w}`),
    leave: (w) => void log.push(`leave ${w}`),
    unlock: (w, a) => void log.push(`unlock ${w} ${a}`),
    battle: async (id) => {
      log.push(`battle ${id}`);
      return battles.shift() ?? true;
    },
    goToMap: async (m, s) => void log.push(`map ${m}@${s}`),
    wait: async () => undefined,
    sfx: (id) => void log.push(`sfx ${id}`),
    emit: async (e) => void log.push(`emit ${e}`),
    move: async (a, to) => void log.push(`move ${a} ${to.join(',')}`),
    face: () => undefined,
    show: (a) => void log.push(`show ${a}`),
    hide: (a) => void log.push(`hide ${a}`),
    card: (t) => void log.push(`card ${t}`),
    autosave: () => void log.push('autosave'),
    lostName: async (id) => void log.push(`lost ${id}`),
    chapter: (n) => void log.push(`chapter ${n}`),
  };
  return { host, log };
}

describe('script runner', () => {
  const script: Script = [
    { say: 'aumery', text: 'Someone has put a knife to the Book.' },
    {
      choice: [
        { text: "I didn't do it.", set: { denied: true }, goto: 'deny' },
        { text: '(Say nothing.)', goto: 'silent' },
      ],
    },
    { label: 'deny' },
    { say: 'aumery', text: 'Of course not.' },
    { goto: 'sentence' },
    { label: 'silent' },
    { say: 'aumery', text: 'Silence. Hm.' },
    { label: 'sentence' },
    { say: 'aumery', text: 'At the dawn bell.' },
    { if: 'denied', then: 'liar' },
    { set: { quiet: true } },
    { goto: 'end' },
    { label: 'liar' },
    { set: { liar: true } },
  ];

  it('follows the chosen branch and sets flags', async () => {
    const { host, log } = fakeHost([0]);
    await runScript(script, host);
    expect(log).toContain('aumery: Of course not.');
    expect(log).not.toContain('aumery: Silence. Hm.');
    expect(host.flags).toEqual({ denied: true, liar: true });
  });

  it('takes the other branch and stops at "end"', async () => {
    const { host, log } = fakeHost([1]);
    await runScript(script, host);
    expect(log).toContain('aumery: Silence. Hm.');
    expect(host.flags).toEqual({ quiet: true });
  });

  it('offers only the choices whose conditions hold', async () => {
    const { host, log } = fakeHost([0]);
    host.flags.knows = true;
    await runScript(
      [
        {
          choice: [
            { text: 'A', if: { not: 'knows' } },
            { text: 'B', if: 'knows', set: { b: true } },
          ],
        },
      ],
      host,
    );
    expect(log[0]).toBe('? B');
    expect(host.flags.b).toBe(true);
  });

  it('stops when a battle is lost', async () => {
    const { host, log } = fakeHost([], [false]);
    await runScript([{ battle: 'f1' }, { say: 'isot', text: 'We won.' }], host);
    expect(log).toEqual(['battle f1']);
  });

  it('passes every kind of step to the host', async () => {
    const { host, log } = fakeHost();
    await runScript(
      [
        { join: 'hild' },
        { unlock: 'hild', ability: 'shove' },
        { emit: 'break-wall' },
        { move: 'hild', to: [10, 20] },
        { map: 'cloister', spawn: 'west' },
        { card: ['The Cloister', 'quiet'] },
        { lostName: 'osric' },
        { autosave: true },
        { chapter: 2 },
        { end: true },
        { say: 'never', text: 'reached' },
      ],
      host,
    );
    expect(log).toEqual([
      'join hild',
      'unlock hild shove',
      'emit break-wall',
      'move hild 10,20',
      'map cloister@west',
      'card The Cloister',
      'lost osric',
      'autosave',
      'chapter 2',
    ]);
  });

  it('rejects unknown and duplicate labels', () => {
    expect(() => indexLabels([{ goto: 'nowhere' }])).toThrow(ScriptError);
    expect(() => indexLabels([{ label: 'a' }, { label: 'a' }])).toThrow(ScriptError);
  });

  it('detects runaway loops', async () => {
    const { host } = fakeHost();
    await expect(runScript([{ label: 'a' }, { goto: 'a' }], host)).rejects.toThrow(ScriptError);
  });
});
