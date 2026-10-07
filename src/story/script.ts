/**
 * Story scripts: dialogue, choices and cutscene steps as plain typed data
 * (DESIGN.md §10.3). The runner walks a script and asks a host to do each thing;
 * the host is the map scene in the game and a fake in tests.
 */

import { type CharId, check, type Condition, type Flags } from './state';

export type Mood = 'neutral' | 'wry' | 'grave' | 'alarmed' | 'warm';

export interface ChoiceOption {
  text: string;
  /** Flags set when chosen. */
  set?: Flags;
  /** Label to jump to when chosen. */
  goto?: string;
  /** Only offered when this holds. */
  if?: Condition;
}

export type Step =
  | { say: string; text: string; mood?: Mood }
  | { narrate: string }
  | { choice: ChoiceOption[] }
  | { label: string }
  | { goto: string }
  | { if: Condition; then: string; else?: string }
  | { set: Flags }
  | { join: CharId }
  | { leave: CharId }
  | { unlock: CharId; ability: string }
  | { battle: string }
  | { map: string; spawn: string }
  | { wait: number }
  | { sfx: string }
  | { emit: string }
  | { move: string; to: readonly [number, number] }
  | { face: string; dir: 1 | -1 }
  | { show: string }
  | { hide: string }
  | { card: readonly [string, string] }
  | { autosave: true }
  | { lostName: string }
  | { chapter: number }
  | { end: true };

export type Script = readonly Step[];

/** Everything a script can ask of the game. */
export interface ScriptHost {
  flags: Flags;
  say(speaker: string, text: string, mood: Mood): Promise<void>;
  narrate(text: string): Promise<void>;
  choose(options: string[]): Promise<number>;
  join(who: CharId): void;
  leave(who: CharId): void;
  unlock(who: CharId, ability: string): void;
  battle(id: string): Promise<boolean>;
  goToMap(map: string, spawn: string): Promise<void>;
  wait(seconds: number): Promise<void>;
  sfx(id: string): void;
  emit(event: string): Promise<void>;
  move(actor: string, to: readonly [number, number]): Promise<void>;
  face(actor: string, dir: 1 | -1): void;
  show(actor: string): void;
  hide(actor: string): void;
  card(title: string, line: string): void;
  autosave(): void;
  lostName(id: string): Promise<void>;
  chapter(n: number): void;
}

/** Steps executed per run before we assume a goto loop. */
const MAX_STEPS = 5000;

export class ScriptError extends Error {}

/** Resolve label positions once, and check every goto points somewhere. */
export function indexLabels(script: Script): Map<string, number> {
  const labels = new Map<string, number>();
  script.forEach((s, i) => {
    if ('label' in s) {
      if (labels.has(s.label)) throw new ScriptError(`Duplicate label "${s.label}"`);
      labels.set(s.label, i);
    }
  });
  const targets: string[] = [];
  for (const s of script) {
    if ('goto' in s) targets.push(s.goto);
    if ('if' in s && 'then' in s) {
      targets.push(s.then);
      if (s.else) targets.push(s.else);
    }
    if ('choice' in s) for (const o of s.choice) if (o.goto) targets.push(o.goto);
  }
  for (const t of targets) if (t !== 'end' && !labels.has(t)) throw new ScriptError(`Unknown label "${t}"`);
  return labels;
}

/**
 * Run a script to its end. A jump to the label "end" stops it. Battles that are lost
 * stop the script too (the battle screen handles retries).
 */
export async function runScript(script: Script, host: ScriptHost): Promise<void> {
  const labels = indexLabels(script);
  let pc = 0;
  let steps = 0;
  const jump = (label: string): boolean => {
    if (label === 'end') return false;
    pc = labels.get(label)!;
    return true;
  };
  while (pc < script.length) {
    if (++steps > MAX_STEPS) throw new ScriptError('Script ran too long (a goto loop?)');
    const s = script[pc++]!;
    if ('say' in s) await host.say(s.say, s.text, s.mood ?? 'neutral');
    else if ('narrate' in s) await host.narrate(s.narrate);
    else if ('choice' in s) {
      const offered = s.choice.filter((o) => check(o.if, host.flags));
      if (offered.length === 0) continue;
      const i = await host.choose(offered.map((o) => o.text));
      const picked = offered[Math.max(0, Math.min(offered.length - 1, i))]!;
      if (picked.set) Object.assign(host.flags, picked.set);
      if (picked.goto && !jump(picked.goto)) return;
    } else if ('label' in s) continue;
    else if ('goto' in s) {
      if (!jump(s.goto)) return;
    } else if ('if' in s) {
      const target = check(s.if, host.flags) ? s.then : s.else;
      if (target && !jump(target)) return;
    } else if ('set' in s) Object.assign(host.flags, s.set);
    else if ('join' in s) host.join(s.join);
    else if ('leave' in s) host.leave(s.leave);
    else if ('unlock' in s) host.unlock(s.unlock, s.ability);
    else if ('battle' in s) {
      if (!(await host.battle(s.battle))) return;
    } else if ('map' in s) {
      await host.goToMap(s.map, s.spawn);
    } else if ('wait' in s) await host.wait(s.wait);
    else if ('sfx' in s) host.sfx(s.sfx);
    else if ('emit' in s) await host.emit(s.emit);
    else if ('move' in s) await host.move(s.move, s.to);
    else if ('face' in s) host.face(s.face, s.dir);
    else if ('show' in s) host.show(s.show);
    else if ('hide' in s) host.hide(s.hide);
    else if ('card' in s) host.card(s.card[0], s.card[1]);
    else if ('autosave' in s) host.autosave();
    else if ('lostName' in s) await host.lostName(s.lostName);
    else if ('chapter' in s) host.chapter(s.chapter);
    else if ('end' in s) return;
  }
}
