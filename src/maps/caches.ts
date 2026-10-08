/**
 * Glossator caches (DESIGN.md §6.1): small iron-bound boxes the hedge-scribes left off the
 * path, two to four in every chapter, each with a note in a careful hand. Some sit in plain
 * sight; others are known only by a chalk manicule on a wall or a stone, which the raking
 * light finds. Opened once, they stay open.
 */

import { pack, SATCHEL, type SatchelId } from '../battle/satchel';
import { ITEMS } from '../data/equipment';
import { session } from '../engine/session';
import type { LocalText } from '../i18n/i18n';
import { hex, PixelImage } from '../pixel/pixel';
import type { Billboard } from '../world3d/billboard';
import type { MapContext, MapDef, Thing, Underwriting } from './types';

export interface Cache {
  id: string;
  x: number;
  y: number;
  pennies?: number;
  satchel?: Partial<Record<SatchelId, number>>;
  /** An item of equipment (an id of ITEMS). */
  item?: string;
  /** What the Glossator left written inside the lid. */
  note: LocalText;
  /** Known only by its chalk mark, which the raking light finds; `mark` is where, from the box. */
  hidden?: boolean;
  mark?: [number, number, number];
}

const WOOD = ['#3A2414', '#5A3A20', '#7A5230', '#946840'].map((c) => hex(c));
const IRON = [hex('#2A2A30'), hex('#5A5A64'), hex('#8A8A94')];

/** The box, shut: oak boards, two iron bands, a hasp, and the red chalk hand on the lid. */
function shut(): PixelImage {
  const img = new PixelImage(16, 13);
  img.rect(1, 4, 14, 8, WOOD[1]!);
  img.rect(1, 2, 14, 3, WOOD[2]!);
  img.hline(2, 13, 2, WOOD[3]!);
  for (const x of [4, 11]) img.vline(x, 2, 11, IRON[1]!);
  img.hline(1, 14, 5, WOOD[0]!);
  img.rect(7, 5, 2, 3, IRON[2]!);
  img.set(7, 7, IRON[0]!);
  // The Glossators' mark, a manicule, small, in red chalk.
  img.hline(6, 9, 3, hex('#D8343A'));
  img.set(10, 3, hex('#F06A5A'));
  img.outline(hex('#1A100A'));
  return img;
}

/** The box, open: the lid thrown back and the inside dark. */
function open(): PixelImage {
  const img = new PixelImage(16, 15);
  img.rect(1, 0, 14, 4, WOOD[2]!);
  for (const x of [4, 11]) img.vline(x, 0, 3, IRON[1]!);
  img.rect(1, 6, 14, 8, WOOD[1]!);
  img.rect(2, 5, 12, 3, WOOD[0]!);
  for (const x of [4, 11]) img.vline(x, 8, 13, IRON[1]!);
  // The note, still pinned inside the lid.
  img.rect(6, 1, 4, 2, hex('#E8DCC0'));
  img.outline(hex('#1A100A'));
  return img;
}

/** The chalk manicule on a wall or a stone that only the raking light shows. */
function mark(): PixelImage {
  const img = new PixelImage(18, 9);
  const c = hex('#F4ECE0', 230);
  img.rect(0, 2, 3, 5, c);
  img.rect(3, 2, 6, 5, c);
  img.hline(9, 16, 3, c);
  img.hline(9, 16, 4, c);
  img.set(17, 4, c);
  img.rect(5, 7, 4, 1, c);
  return img;
}

const shown = new Map<string, { shut: Billboard; open: Billboard }>();
const opened = (id: string) => !!session.game.flags[`cache.${id}`];
const seen = (id: string) => !!session.game.flags[`seen.cache-mark-${id}`];

/** A map with its caches made real: the boxes on the stage, a thing to open each, and the marks. */
export function withCaches(def: MapDef): MapDef {
  const caches = def.caches ?? [];
  if (!caches.length) return def;
  return {
    ...def,
    build(r, st) {
      const set = def.build(r, st);
      for (const k of caches) {
        // A hidden box can't be walked into before it is found.
        const solid = k.hidden ? false : 12;
        const s = st.addImage(shut(), k.x, k.y, { solid });
        const o = st.addImage(open(), k.x, k.y, { solid: false });
        s.visible = !opened(k.id) && (!k.hidden || seen(k.id));
        o.visible = opened(k.id);
        shown.set(k.id, { shut: s, open: o });
      }
      return set;
    },
    things: [...(def.things ?? []), ...caches.map(thingOf)],
    underwriting: [...(def.underwriting ?? []), ...caches.filter((k) => k.hidden).map(markOf)],
  };
}

function thingOf(k: Cache): Thing {
  return {
    id: `cache-${k.id}`,
    x: k.x,
    y: k.y + 2,
    h: 14,
    reach: 26,
    when: () => !opened(k.id) && (!k.hidden || seen(k.id)),
    run: (c) => openCache(c, k),
  };
}

function markOf(k: Cache): Underwriting {
  const [dx, dy, h] = k.mark ?? [0, -10, 10];
  return {
    id: `cache-mark-${k.id}`,
    x: k.x + dx,
    y: k.y + dy,
    h,
    art: mark(),
    when: () => !opened(k.id),
    revealed: async (c) => {
      const b = shown.get(k.id);
      if (b) b.shut.visible = true;
      await c.say('isot', { en: 'A Glossator’s hand, in chalk. It points at… there.', fr: 'Une main de Glossateur, à la craie. Elle montre… là.' });
    },
  };
}

async function openCache(c: MapContext, k: Cache): Promise<void> {
  c.set(`cache.${k.id}`);
  const b = shown.get(k.id);
  if (b) {
    b.shut.visible = false;
    b.open.visible = true;
  }
  const g = session.game;
  const got: LocalText[] = [];
  const lost: LocalText[] = [];
  if (k.pennies) {
    g.pennies += k.pennies;
    got.push({ en: `${k.pennies} silver pennies`, fr: `${k.pennies} deniers d’argent` });
  }
  for (const [id, n] of Object.entries(k.satchel ?? {}) as [SatchelId, number][]) {
    const took = pack(g.satchel as Partial<Record<SatchelId, number>>, id, n);
    const name = SATCHEL[id].name;
    if (took) got.push({ en: `${name.en} ×${took}`, fr: `${name.fr} ×${took}` });
    if (took < n) lost.push(name);
  }
  await c.narrate(k.note);
  if (got.length) c.card({ en: 'A Glossator’s cache', fr: 'Une cache de Glossateur' }, { en: got.map((x) => x.en).join(' · '), fr: got.map((x) => x.fr).join(' · ') });
  if (lost.length) await c.say('isot', { en: 'The satchel is full of those. I’ll leave the rest for the next one.', fr: 'La besace en est pleine. Je laisse le reste au suivant.' });
  if (k.item && ITEMS[k.item]) await c.find(k.item);
}
