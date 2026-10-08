/**
 * What a map is made of (DESIGN.md §13.3): ground and heights, the set dressing, where
 * people stand, the things that can be looked at, the zones that start a scene when
 * walked into, the ways out, and the underwriting the raking light reveals. Scripts are
 * plain async functions over a small context, so a cutscene reads as a list of awaits.
 */

import type { WorldRenderer } from '../engine/diorama/renderer';
import type { LocalText } from '../i18n/i18n';
import type { CharSpec, Dir } from '../pixel/characters';
import type { Mood } from '../pixel/portraits';
import type { CharId } from '../story/state';
import type { Bounds, Director } from '../world/director';
import type { Actor, Emote } from '../world3d/actor';
import type { Stage } from '../world3d/stage';

/** A rectangle on the ground: x, y (north-west corner), w, d in art pixels. */
export type Rect = [number, number, number, number];

export interface MapSet {
  /** Ground nobody can walk through. */
  blocked: Rect[];
  /** Round blockers (props): x, y and radius. */
  posts?: [number, number, number][];
}

export interface Spawn {
  x: number;
  y: number;
  dir: Dir;
}

export interface NpcDef {
  id: string;
  /** Speaker id for dialogue (defaults to `id`). */
  speaker?: string;
  spec: CharSpec;
  x: number;
  y: number;
  dir: Dir;
  /** Present only while this holds. */
  when?: (c: MapContext) => boolean;
  /** Fraying: the forgotten pale and lose their outline (0..1). */
  fray?: number;
}

export interface Thing {
  id: string;
  x: number;
  y: number;
  /** Height of the marker above the ground. */
  h?: number;
  /** How close the player must stand. */
  reach?: number;
  when?: (c: MapContext) => boolean;
  run: (c: MapContext) => Promise<void>;
}

export interface Zone {
  id: string;
  rect: Rect;
  /** Fires once per visit unless it sets a flag that its `when` then excludes. */
  when?: (c: MapContext) => boolean;
  run: (c: MapContext) => Promise<void>;
}

export interface Exit {
  rect: Rect;
  to: string;
  spawn: string;
  when?: (c: MapContext) => boolean;
  /** Said instead of leaving when `when` fails. */
  blocked?: (c: MapContext) => Promise<void>;
}

/** Scraped writing in the world, shown only by the raking light. */
export interface Underwriting {
  id: string;
  x: number;
  y: number;
  h: number;
  /** The ghost, drawn in pixels (lines of old ink, a doorway's outline). */
  art: import('../pixel/pixel').PixelImage;
  /** Stand it on the floor instead of upright. */
  flat?: boolean;
  /** When it has been fully revealed: a flag is set and this runs. */
  revealed?: (c: MapContext) => Promise<void>;
  /** A Glossator's cache: reading it finds this Lost Name (an id of LOST_NAMES). */
  lostName?: string;
  when?: (c: MapContext) => boolean;
}

export interface MapDef {
  id: string;
  /** For the location card when entering, if any. */
  card?: { title: LocalText; line: LocalText };
  /** The ground characters that can be walked on. */
  walkable: string;
  ground: readonly string[];
  heights?: readonly string[];
  /** Build the set on the stage; light and grade it. */
  build(r: WorldRenderer, st: Stage): MapSet;
  spawns: Record<string, Spawn>;
  bounds: Bounds;
  /** Camera height while walking, and zoom. */
  camera?: { h?: number; zoom?: number; lookAhead?: number };
  /** Ambience to play on this map. */
  ambience?: () => { start(engine: import('../audio/engine').AudioEngine): void; stop(): void };
  /** The candle Isot carries: on by default indoors and at night. */
  candle?: boolean;
  npcs?: NpcDef[];
  things?: Thing[];
  zones?: Zone[];
  exits?: Exit[];
  underwriting?: Underwriting[];
  /** Runs when the map is entered: `from` is the spawn name, or `battle:<id>` after a fight. */
  enter?: (c: MapContext, from: string) => Promise<void>;
  /** Save the game whenever the map is entered. */
  checkpoint?: boolean;
  /** Looked at every frame while the player is free: return a scene to play, or null. */
  watch?: (c: MapContext, dt: number) => ((c: MapContext) => Promise<void>) | null;
}

export interface MapContext {
  readonly r: WorldRenderer;
  readonly audio: import('../audio/engine').AudioEngine;
  readonly stage: Stage;
  readonly director: Director;
  readonly player: Actor;
  /** The followers, in line behind the player. */
  readonly party: Actor[];
  npc(id: string): Actor;
  say(speaker: string, text: LocalText, mood?: Mood): Promise<void>;
  narrate(text: LocalText): Promise<void>;
  choose(options: LocalText[]): Promise<number>;
  /** Close the dialogue window. */
  close(): void;
  wait(seconds: number): Promise<void>;
  /** Move the camera (map x, y, height) over some seconds. */
  pan(x: number, y: number, seconds: number, h?: number): Promise<void>;
  /** Give the camera back to the player. */
  release(): void;
  shake(amplitude: number, seconds: number): void;
  flash(v?: number): void;
  letterbox(on: boolean): void;
  card(title: LocalText, line: LocalText): void;
  emote(who: Actor, e: Emote, seconds?: number): void;
  /** Walk an actor along a path and wait until it arrives. */
  walk(who: Actor, path: [number, number][]): Promise<void>;
  face(who: Actor, dir: Dir): void;
  flag(name: string): boolean;
  set(name: string, value?: boolean): void;
  cleared(encounter: string): boolean;
  /** Someone joins the party and follows. */
  join(id: CharId, actor?: Actor): void;
  /** Leave for a fight; the map is entered again with `battle:<id>` afterwards. */
  battle(id: string): void;
  goto(map: string, spawn: string): void;
  /** End the chapter with interlude `n` (a page of Isot's chronicle), then its next map. */
  interlude(n: number): void;
  save(): void;
  /** A character learns an ability at a story beat (DESIGN.md §5.6). */
  learn(who: CharId, ability: import('../battle/types').AbilityId): Promise<void>;
  /** Show a close-up page that the raking light can read (resolves when closed). */
  page(def: PageDef): Promise<void>;
}

/** A page seen close up: lines of writing, some scraped, read by tilting the candle. */
export interface PageDef {
  title: LocalText;
  lines: { text: string; scraped?: boolean; red?: boolean }[];
  /** Said once the scraped writing has been read. */
  read?: (c: MapContext) => Promise<void>;
}
