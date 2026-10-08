/**
 * Settings: language, sound, graphics, controls, game and accessibility options, kept
 * in localStorage apart from saves. Unknown or damaged data falls back to the defaults
 * field by field, so an old or broken file never stops the game.
 */

import { type Difficulty, DIFFICULTIES } from '../battle/growth';
import type { Lang } from '../i18n/i18n';
import type { Tier } from './diorama/quality';
import { BINDABLE, DEFAULT_KEYS, DEFAULT_PAD, type KeyBindings, type PadBindings } from './input';
import type { KeyValueStore } from './save';

export const SETTINGS_KEY = 'palimpsest:settings:v1';

export type TextSpeed = 'slow' | 'normal' | 'fast' | 'instant';

export interface Settings {
  language: 'auto' | Lang;
  audio: { master: number; music: number; ambience: number; sfx: number; voices: number };
  graphics: {
    quality: 'auto' | Tier;
    shadows: boolean;
    reflections: boolean;
    bloom: boolean;
    dof: boolean;
    fog: boolean;
    grain: boolean;
    /** 0.7 .. 1.3 */
    brightness: number;
    /** 'auto' adapts to the frame time; a number fixes the render scale. */
    resolution: 'auto' | number;
  };
  controls: { keys: KeyBindings; pad: PadBindings; touchSize: number; touchOpacity: number; leftHanded: boolean; vibration: boolean };
  gameplay: { textSpeed: TextSpeed; battleSpeed: 'normal' | 'fast'; difficulty: Difficulty };
  access: { shake: boolean; flashes: boolean; textSize: 'normal' | 'large' };
}

export function defaultSettings(): Settings {
  return {
    language: 'auto',
    audio: { master: 0.8, music: 0.7, ambience: 0.7, sfx: 0.8, voices: 0.6 },
    graphics: { quality: 'auto', shadows: true, reflections: true, bloom: true, dof: true, fog: true, grain: true, brightness: 1, resolution: 'auto' },
    controls: { keys: structuredClone(DEFAULT_KEYS), pad: structuredClone(DEFAULT_PAD), touchSize: 1, touchOpacity: 0.85, leftHanded: false, vibration: true },
    gameplay: { textSpeed: 'normal', battleSpeed: 'normal', difficulty: 'normal' },
    access: { shake: true, flashes: true, textSize: 'normal' },
  };
}

export const TEXT_SPEEDS: Record<TextSpeed, number> = { slow: 28, normal: 48, fast: 90, instant: 1e6 };

const num = (v: unknown, d: number, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const pick = <T extends string>(v: unknown, d: T, allowed: readonly T[]) => (allowed.includes(v as T) ? (v as T) : d);
const obj = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/** Validate settings read from storage, filling anything missing or wrong with defaults. */
export function parseSettings(raw: string | null): Settings {
  const d = defaultSettings();
  let data: Record<string, unknown> = {};
  try {
    data = obj(raw ? JSON.parse(raw) : {});
  } catch {
    return d;
  }
  const a = obj(data.audio);
  const g = obj(data.graphics);
  const c = obj(data.controls);
  const p = obj(data.gameplay);
  const x = obj(data.access);
  const keys = obj(c.keys);
  const pad = obj(c.pad);
  const res = g.resolution;
  return {
    language: pick(data.language, d.language, ['auto', 'en', 'fr'] as const),
    audio: {
      master: num(a.master, d.audio.master, 0, 1),
      music: num(a.music, d.audio.music, 0, 1),
      ambience: num(a.ambience, d.audio.ambience, 0, 1),
      sfx: num(a.sfx, d.audio.sfx, 0, 1),
      voices: num(a.voices, d.audio.voices, 0, 1),
    },
    graphics: {
      quality: pick(g.quality, d.graphics.quality, ['auto', 'low', 'medium', 'high'] as const),
      shadows: bool(g.shadows, true),
      reflections: bool(g.reflections, true),
      bloom: bool(g.bloom, true),
      dof: bool(g.dof, true),
      fog: bool(g.fog, true),
      grain: bool(g.grain, true),
      brightness: num(g.brightness, 1, 0.7, 1.3),
      resolution: res === 'auto' ? 'auto' : typeof res === 'number' ? num(res, 1, 0.5, 1) : 'auto',
    },
    controls: {
      keys: Object.fromEntries(BINDABLE.map((k) => [k, Array.isArray(keys[k]) && (keys[k] as unknown[]).every((v) => typeof v === 'string') ? (keys[k] as string[]) : d.controls.keys[k]])) as KeyBindings,
      pad: Object.fromEntries(BINDABLE.map((k) => [k, Array.isArray(pad[k]) && (pad[k] as unknown[]).every((v) => typeof v === 'number') ? (pad[k] as number[]) : d.controls.pad[k]])) as PadBindings,
      touchSize: num(c.touchSize, 1, 0.7, 1.5),
      touchOpacity: num(c.touchOpacity, 0.85, 0.2, 1),
      leftHanded: bool(c.leftHanded, false),
      vibration: bool(c.vibration, true),
    },
    gameplay: {
      textSpeed: pick(p.textSpeed, d.gameplay.textSpeed, ['slow', 'normal', 'fast', 'instant'] as const),
      battleSpeed: pick(p.battleSpeed, d.gameplay.battleSpeed, ['normal', 'fast'] as const),
      // The old Gentle Hand became the Story difficulty.
      difficulty: pick(p.difficulty, p.gentle === true ? 'story' : d.gameplay.difficulty, DIFFICULTIES),
    },
    access: {
      shake: bool(x.shake, true),
      flashes: bool(x.flashes, true),
      textSize: pick(x.textSize, d.access.textSize, ['normal', 'large'] as const),
    },
  };
}

/** Holds the settings, saves every change, and tells listeners. */
export class SettingsStore {
  value: Settings;
  private readonly listeners = new Set<(s: Settings) => void>();

  constructor(private readonly store: KeyValueStore | null) {
    let raw: string | null = null;
    try {
      raw = store?.getItem(SETTINGS_KEY) ?? null;
    } catch {
      raw = null;
    }
    this.value = parseSettings(raw);
  }

  /** Change settings with a function that edits a copy, then save and notify. */
  update(fn: (s: Settings) => void): void {
    const next = structuredClone(this.value);
    fn(next);
    this.value = parseSettings(JSON.stringify(next));
    try {
      this.store?.setItem(SETTINGS_KEY, JSON.stringify(this.value));
    } catch {
      // Private browsing or a full disk: settings still apply for this session.
    }
    for (const l of this.listeners) l(this.value);
  }

  reset(part: 'controls' | 'all'): void {
    this.update((s) => {
      const d = defaultSettings();
      if (part === 'controls') s.controls = d.controls;
      else Object.assign(s, d);
    });
  }

  onChange(fn: (s: Settings) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}
