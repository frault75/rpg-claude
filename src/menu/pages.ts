/**
 * The menu's pages: the party and its formation, equipment, and every setting
 * (language, sound, graphics, controls, game, accessibility).
 */

import { ABILITIES, PARTY_STATS } from '../battle/data';
import { abilityText, DIFFICULTIES, hpAt, progress } from '../battle/growth';
import { SATCHEL, SATCHEL_IDS } from '../battle/satchel';
import { buyItem, buySatchel, priceFor, type Sale, stock } from '../data/stalls';
import { canWear, ITEMS, type Slot } from '../data/equipment';
import { BINDABLE, type Bindable, DEFAULT_KEYS, type Input, keyLabel, padLabel } from '../engine/input';
import type { SettingsStore } from '../engine/settings';
import { detectLanguage, LANGUAGE_NAMES, LANGUAGES, t, tr } from '../i18n/i18n';
import { CHARACTERS } from '../pixel/characters';
import { drawPortrait } from '../pixel/portraits';
import { chapterTitle, objective } from '../story/journal';
import { LOST_NAMES, lostNameText } from '../story/lostNames';
import { isReturned, RETURNS } from '../story/returns';
import type { CharId, GameState } from '../story/state';
import { buttonRow, el, infoRow, type Menu, type Page, type Row, selectRow, sepRow, sliderRow, toggleRow } from './menu';

export interface MenuDeps {
  menu: Menu;
  settings: SettingsStore;
  game: () => GameState;
  input: Input;
  /** The tier the automatic quality picked, for the label. */
  autoTier: () => string;
}

const PLACE_KEYS = ['party.front', 'party.middle', 'party.rear'];

function portrait(id: CharId): HTMLCanvasElement {
  const c = drawPortrait(CHARACTERS[id]!, 'neutral').toCanvas();
  return c;
}

export function partyPage(d: MenuDeps): Page {
  let picked: number | null = null;
  return {
    title: () => t('menu.party'),
    help: () => t('party.formationHelp'),
    rows: () => {
      const g = d.game();
      const rows: Row[] = [];
      // Formation: three places; choose two to swap them.
      const formation = g.formation.filter((c) => g.party.includes(c));
      for (let i = 0; i < 3; i++) {
        const who = formation[i];
        const r = buttonRow(
          `${t(PLACE_KEYS[i]!)}`,
          () => {
            if (!who) return;
            if (picked === null) picked = i;
            else {
              if (picked !== i) {
                const a = formation[picked]!;
                const b = formation[i]!;
                const ia = g.formation.indexOf(a);
                const ib = g.formation.indexOf(b);
                g.formation[ia] = b;
                g.formation[ib] = a;
              }
              picked = null;
            }
            d.menu.refresh();
          },
          who ? `${tr(PARTY_STATS[who].name)}${picked === i ? ' ✦' : ''}` : '—',
        );
        if (!who) r.focus = false;
        rows.push(r);
      }
      rows.push(sepRow());
      // The party's shared level, and the purse.
      const lv = progress(g.xp);
      const next = lv.need ? t('party.next', { n: lv.need - lv.into }) : t('party.top');
      const fill = lv.need ? Math.round((lv.into / lv.need) * 100) : 100;
      rows.push(infoRow(`<span class="label">${t('party.level', { n: lv.level })}</span><span class="value">${next}<span class="hpbar xpbar"><i style="width:${fill}%"></i></span></span>`, 'static'));
      rows.push(infoRow(`<span class="label">${t('party.purse')}</span><span class="value">${t('party.pennies', { n: g.pennies })}</span>`, 'static'));
      rows.push(sepRow());
      const story = d.settings.value.gameplay.difficulty === 'story' ? 1.5 : 1;
      for (const id of g.party) {
        const box = el('div', 'member');
        box.append(portrait(id));
        const info = el('div');
        const st = PARTY_STATS[id];
        info.append(el('div', 'name', tr(st.name)));
        info.append(el('div', 'meta', `${t('role.' + id)} · ${t('party.hp')} ${Math.round(hpAt(id, lv.level) * story)}<span class="hpbar"><i style="width:100%"></i></span>`));
        const ab = el('div', 'abil');
        for (const a of g.abilities[id] ?? []) {
          const def = ABILITIES[a as keyof typeof ABILITIES];
          if (!def) continue;
          const cost = def.ink ? ` · ${def.ink} ${tr({ en: 'Ink', fr: 'Encre' })}` : def.hp ? ` · ${def.hp} ${t('party.hp')}` : '';
          ab.append(el('div', '', `<b>${tr(def.name)}</b>${cost} — <span>${tr(abilityText(def.id, lv.level))}</span>`));
        }
        info.append(ab);
        box.append(info);
        rows.push({ el: box, focus: false });
      }
      return rows;
    },
  };
}

/** Gervase's stall (DESIGN.md §6.3): things for the satchel, and the relics and charms he carries. */
export function stallPage(d: MenuDeps, stall: string): Page {
  return {
    title: () => t(d.game().flags.gervaseNamed ? 'shop.titleNamed' : 'shop.title'),
    help: () => t('shop.help', { n: d.game().pennies }),
    rows: () => {
      const g = d.game();
      const { satchel, items } = stock(stall, g);
      const rows: Row[] = [];
      const sold = (sale: Sale, name: string) => {
        d.menu.toast(t(`shop.${sale}`, { name }));
        d.menu.refresh();
      };
      const ware = (r: Row, color: string, html: string) => {
        r.el.querySelector('.label')!.innerHTML = html;
        r.el.insertBefore(el('span', 'gem', ''), r.el.querySelector('.label'));
        (r.el.querySelector('.gem') as HTMLElement).style.background = color;
        rows.push(r);
      };
      rows.push(infoRow(`<span class="section">${t('equip.satchel')}</span>`));
      for (const id of satchel) {
        const sd = SATCHEL[id];
        const r = buttonRow('', () => sold(buySatchel(g, id), tr(sd.name)), `${priceFor(sd.price, g)} ${t('shop.d')}`);
        ware(r, sd.color, `${tr(sd.name)} <span class="have">×${g.satchel[id] ?? 0}</span><span class="item-text">${tr(sd.text)}</span><span class="item-lore">${tr(sd.lore)}</span>`);
      }
      rows.push(sepRow());
      rows.push(infoRow(`<span class="section">${t('shop.gear')}</span>`));
      if (!items.length) rows.push(infoRow(t('shop.soldOut'), 'dim'));
      for (const id of items) {
        const it = ITEMS[id]!;
        const fits = it.owner ? t('shop.for', { name: tr(PARTY_STATS[it.owner].name) }) : t('equip.charm');
        const r = buttonRow('', () => sold(buyItem(g, id), tr(it.name)), `${priceFor(it.price ?? 0, g)} ${t('shop.d')}`);
        ware(r, it.color, `${tr(it.name)} <span class="have">${fits}</span><span class="item-text">${tr(it.text)}</span><span class="item-lore">${tr(it.lore)}</span>`);
      }
      return rows;
    },
  };
}

/** New Game: how hard the Book fights back (DESIGN.md §5.17). The cursor starts on the mode last chosen. */
export function newGamePage(d: MenuDeps, start: () => void): Page {
  return {
    title: () => t('newgame.title'),
    help: () => t('newgame.help'),
    focus: DIFFICULTIES.indexOf(d.settings.value.gameplay.difficulty),
    rows: () =>
      DIFFICULTIES.map((v) => {
        const r = buttonRow(t(`difficulty.${v}`), () => {
          d.settings.update((x) => (x.gameplay.difficulty = v));
          start();
        });
        r.el.querySelector('.label')!.insertAdjacentHTML('beforeend', `<span class="item-text">${t(`difficulty.${v}.text`)}</span>`);
        return r;
      }),
  };
}

/** The Journal: the chapter, what to do next in Isot's words, and the Lost Names found. */
export function journalPage(d: MenuDeps): Page {
  return {
    title: () => t('menu.journal'),
    help: () => {
      const ch = chapterTitle(d.game().chapter);
      return `${tr(ch.title)} · ${tr(ch.name)}`;
    },
    rows: () => {
      const g = d.game();
      const rows: Row[] = [];
      rows.push(infoRow(`<span class="quest-k">${t('journal.now')}</span>`, 'static'));
      rows.push(infoRow(`<span class="quest">${tr(objective(g))}</span>`, 'static'));
      rows.push(sepRow());
      const ids = Object.keys(LOST_NAMES);
      const found = ids.filter((id) => g.lostNames.includes(id));
      rows.push(infoRow(`<span class="label">${t('journal.names')}</span><span class="value">${found.length} / ${ids.length}</span>`, 'static'));
      for (const id of ids) {
        const has = g.lostNames.includes(id);
        const back = has && RETURNS[id] && isReturned(g, id) ? `<span class="item-text">${t('journal.returned', { to: tr(RETURNS[id]!.to) })} · ${tr(RETURNS[id]!.keepsake)}</span>` : '';
        const text = has ? tr(lostNameText(id, g)) + back : t('journal.unfound');
        rows.push(infoRow(`<i class="gem" style="background:${has ? '#B0302A' : 'transparent'}"></i><span class="lost${has ? '' : ' none'}">${text}</span>`, `static${has ? '' : ' dim'}`));
      }
      rows.push(sepRow());
      const m = Math.floor(g.playTime / 60);
      rows.push(infoRow(`<span class="label">${t('journal.played')}</span><span class="value">${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}</span>`, 'static'));
      return rows;
    },
  };
}

function itemLine(id: string | null): string {
  if (!id) return t('equip.none');
  const it = ITEMS[id];
  return it ? tr(it.name) : id;
}

export function equipmentPage(d: MenuDeps): Page {
  return {
    title: () => t('menu.equipment'),
    help: () => t('equip.help'),
    rows: () => {
      const g = d.game();
      const rows: Row[] = [];
      for (const id of g.party) {
        rows.push(infoRow(`<span class="name" style="color:#F6DC8A;font-variant:small-caps;font-size:1.1em">${tr(PARTY_STATS[id].name)}</span>`));
        for (const slot of ['relic', 'charm'] as Slot[]) {
          const cur = g.equipment[id][slot];
          const r = buttonRow('', () => d.menu.push(pickerPage(d, id, slot)));
          r.el.querySelector('.label')!.innerHTML = `<span class="slot">${t('equip.' + slot)}</span> ${itemLine(cur)}`;
          if (cur && ITEMS[cur]) r.el.querySelector('.label')!.insertAdjacentHTML('beforeend', `<span class="item-text">${tr(ITEMS[cur]!.text)}</span>`);
          rows.push(r);
        }
        rows.push(sepRow());
      }
      const loose = g.inventory.filter((i) => !Object.values(g.equipment).some((e) => e.relic === i || e.charm === i));
      rows.push(infoRow(`<span class="slot">${t('equip.bag')}</span>`));
      if (!g.inventory.length) rows.push(infoRow(t('equip.empty'), 'dim'));
      for (const i of loose) {
        const it = ITEMS[i];
        if (!it) continue;
        rows.push(infoRow(`<span class="gem" style="background:${it.color}"></span><span class="label">${tr(it.name)}<span class="item-text">${tr(it.text)}</span><span class="item-lore">${tr(it.lore)}</span></span>`));
      }
      // The satchel: used in battle, from any ally's list.
      rows.push(sepRow());
      rows.push(infoRow(`<span class="section">${t('equip.satchel')}</span><span class="value">${t('party.pennies', { n: g.pennies })}</span>`));
      const packed = SATCHEL_IDS.filter((id) => (g.satchel[id] ?? 0) > 0);
      if (!packed.length) rows.push(infoRow(t('equip.satchelEmpty'), 'dim'));
      for (const id of packed) {
        const sd = SATCHEL[id];
        rows.push(infoRow(`<span class="gem" style="background:${sd.color}"></span><span class="label">${tr(sd.name)} ×${g.satchel[id]}<span class="item-text">${tr(sd.text)}</span><span class="item-lore">${tr(sd.lore)}</span></span>`));
      }
      return rows;
    },
  };
}

function pickerPage(d: MenuDeps, who: CharId, slot: Slot): Page {
  return {
    title: () => `${tr(PARTY_STATS[who].name)} · ${t('equip.' + slot)}`,
    rows: () => {
      const g = d.game();
      const rows: Row[] = [];
      const wearing = g.equipment[who][slot];
      rows.push(
        buttonRow(t('equip.remove'), () => {
          g.equipment[who][slot] = null;
          d.menu.back();
        }),
      );
      for (const id of g.inventory) {
        const it = ITEMS[id];
        if (!it || it.slot !== slot || !canWear(who, it)) continue;
        const holder = (Object.keys(g.equipment) as CharId[]).find((c) => g.equipment[c][slot] === id);
        const r = buttonRow(
          '',
          () => {
            if (holder) g.equipment[holder][slot] = null;
            g.equipment[who][slot] = id;
            d.menu.back();
          },
          holder && holder !== who ? tr(PARTY_STATS[holder].name) : id === wearing ? '✦' : '',
        );
        r.el.querySelector('.label')!.innerHTML = `${tr(it.name)}<span class="item-text">${tr(it.text)}</span><span class="item-lore">${tr(it.lore)}</span>`;
        r.el.insertBefore(el('span', 'gem', ''), r.el.querySelector('.label'));
        (r.el.querySelector('.gem') as HTMLElement).style.background = it.color;
        rows.push(r);
      }
      return rows;
    },
  };
}

export function settingsPage(d: MenuDeps): Page {
  const s = d.settings;
  const sub = (title: () => string, rows: () => Row[]): Page => ({ title, rows });
  const refresh = () => d.menu.refresh();
  return {
    title: () => t('menu.settings'),
    rows: () => [
      buttonRow(t('settings.language'), () => d.menu.push(sub(() => t('settings.language'), () => languageRows(d))), languageLabel(d)),
      buttonRow(t('settings.audio'), () =>
        d.menu.push(
          sub(
            () => t('settings.audio'),
            () =>
              (['master', 'music', 'ambience', 'sfx', 'voices'] as const).map((k) =>
                sliderRow(
                  t(`settings.${k}`),
                  () => s.value.audio[k],
                  (v) => s.update((x) => (x.audio[k] = v)),
                  refresh,
                  0,
                  1,
                  0.05,
                ),
              ),
          ),
        ),
      ),
      buttonRow(t('settings.graphics'), () => d.menu.push(sub(() => t('settings.graphics'), () => graphicsRows(d)))),
      buttonRow(t('settings.controls'), () => d.menu.push(controlsPage(d))),
      buttonRow(t('settings.gameplay'), () =>
        d.menu.push(
          sub(
            () => t('settings.gameplay'),
            () => [
              selectRow(
                t('settings.textSpeed'),
                (['slow', 'normal', 'fast', 'instant'] as const).map((v) => ({ value: v, label: t(`settings.textSpeed.${v}`) })),
                () => s.value.gameplay.textSpeed,
                (v) => s.update((x) => (x.gameplay.textSpeed = v)),
                refresh,
              ),
              selectRow(
                t('settings.battleSpeed'),
                (['normal', 'fast'] as const).map((v) => ({ value: v, label: t(`settings.battleSpeed.${v}`) })),
                () => s.value.gameplay.battleSpeed,
                (v) => s.update((x) => (x.gameplay.battleSpeed = v)),
                refresh,
              ),
              selectRow(
                t('settings.difficulty'),
                DIFFICULTIES.map((v) => ({ value: v, label: t(`difficulty.${v}`) })),
                () => s.value.gameplay.difficulty,
                (v) => s.update((x) => (x.gameplay.difficulty = v)),
                refresh,
              ),
              infoRow(`<span class="item-text">${t(`difficulty.${s.value.gameplay.difficulty}.text`)}</span>`, 'dim'),
            ],
          ),
        ),
      ),
      buttonRow(t('settings.access'), () =>
        d.menu.push(
          sub(
            () => t('settings.access'),
            () => [
              toggleRow(t('settings.shake'), () => s.value.access.shake, (v) => s.update((x) => (x.access.shake = v)), refresh),
              toggleRow(t('settings.flashes'), () => s.value.access.flashes, (v) => s.update((x) => (x.access.flashes = v)), refresh),
              selectRow(
                t('settings.textSize'),
                (['normal', 'large'] as const).map((v) => ({ value: v, label: t(`settings.textSize.${v}`) })),
                () => s.value.access.textSize,
                (v) => s.update((x) => (x.access.textSize = v)),
                refresh,
              ),
            ],
          ),
        ),
      ),
    ],
  };
}

function languageLabel(d: MenuDeps): string {
  const l = d.settings.value.language;
  return l === 'auto' ? t('settings.language.auto', { name: LANGUAGE_NAMES[detectLanguage(navigator.languages ?? [navigator.language])] }) : LANGUAGE_NAMES[l];
}

function languageRows(d: MenuDeps): Row[] {
  const s = d.settings;
  const opts: ('auto' | (typeof LANGUAGES)[number])[] = ['auto', ...LANGUAGES];
  return opts.map((l) =>
    buttonRow(
      l === 'auto' ? t('settings.language.auto', { name: LANGUAGE_NAMES[detectLanguage(navigator.languages ?? [navigator.language])] }) : LANGUAGE_NAMES[l],
      () => {
        s.update((x) => (x.language = l));
        d.menu.refresh();
      },
      s.value.language === l ? '✦' : '',
    ),
  );
}

function graphicsRows(d: MenuDeps): Row[] {
  const s = d.settings;
  const refresh = () => d.menu.refresh();
  const g = s.value.graphics;
  const toggle = (k: 'shadows' | 'reflections' | 'bloom' | 'dof' | 'fog' | 'grain') =>
    toggleRow(t(`settings.${k}`), () => s.value.graphics[k], (v) => s.update((x) => (x.graphics[k] = v)), refresh);
  return [
    selectRow(
      t('settings.quality'),
      [
        { value: 'auto' as const, label: t('settings.quality.auto', { name: t(`settings.quality.${d.autoTier()}`) }) },
        { value: 'low' as const, label: t('settings.quality.low') },
        { value: 'medium' as const, label: t('settings.quality.medium') },
        { value: 'high' as const, label: t('settings.quality.high') },
      ],
      () => g.quality,
      (v) => s.update((x) => (x.graphics.quality = v)),
      refresh,
    ),
    selectRow(
      t('settings.resolution'),
      [
        { value: 'auto' as 'auto' | number, label: t('settings.resolution.auto') },
        { value: 1, label: '100%' },
        { value: 0.85, label: '85%' },
        { value: 0.7, label: '70%' },
        { value: 0.55, label: '55%' },
      ],
      () => g.resolution,
      (v) => s.update((x) => (x.graphics.resolution = v)),
      refresh,
    ),
    sliderRow(t('settings.brightness'), () => s.value.graphics.brightness, (v) => s.update((x) => (x.graphics.brightness = v)), refresh, 0.7, 1.3, 0.05),
    toggle('shadows'),
    toggle('reflections'),
    toggle('bloom'),
    toggle('dof'),
    toggle('fog'),
    toggle('grain'),
  ];
}

function controlsPage(d: MenuDeps): Page {
  const s = d.settings;
  const refresh = () => d.menu.refresh();
  return {
    title: () => t('settings.controls'),
    rows: () => [
      // Which keys or buttons the hints name: the device last used, or one chosen here.
      selectRow(
        t('settings.prompts'),
        (['auto', 'keys', 'pad', 'touch'] as const).map((v) => ({ value: v, label: t(`settings.prompts.${v}`) })),
        () => s.value.controls.prompts,
        (v) => s.update((x) => (x.controls.prompts = v)),
        refresh,
      ),
      sepRow(),
      buttonRow(t('settings.keyboard'), () => d.menu.push(bindPage(d, 'keys'))),
      buttonRow(t('settings.gamepad'), () => d.menu.push(bindPage(d, 'pad'))),
      buttonRow(t('settings.touch'), () =>
        d.menu.push({
          title: () => t('settings.touch'),
          rows: () => [
            sliderRow(t('settings.touchSize'), () => s.value.controls.touchSize, (v) => s.update((x) => (x.controls.touchSize = v)), refresh, 0.7, 1.5, 0.1),
            sliderRow(t('settings.touchOpacity'), () => s.value.controls.touchOpacity, (v) => s.update((x) => (x.controls.touchOpacity = v)), refresh, 0.2, 1, 0.05),
            toggleRow(t('settings.leftHanded'), () => s.value.controls.leftHanded, (v) => s.update((x) => (x.controls.leftHanded = v)), refresh),
            toggleRow(t('settings.vibration'), () => s.value.controls.vibration, (v) => s.update((x) => (x.controls.vibration = v)), refresh),
          ],
        }),
      ),
      sepRow(),
      buttonRow(t('settings.resetControls'), () => {
        s.reset('controls');
        refresh();
      }),
    ],
  };
}

/** Rebinding: confirm on an action, then press the new key or button. */
function bindPage(d: MenuDeps, kind: 'keys' | 'pad'): Page {
  const s = d.settings;
  let waiting: Bindable | null = null;
  return {
    title: () => t(kind === 'keys' ? 'settings.keyboard' : 'settings.gamepad'),
    rows: () =>
      BINDABLE.map((a) => {
        const r = buttonRow(t(`action.${a}`), () => {
          waiting = a;
          d.menu.capturing = true;
          d.menu.refresh();
          const done = () => {
            waiting = null;
            // Let the press that rebound finish before the menu reads input again.
            setTimeout(() => (d.menu.capturing = false), 150);
            d.menu.refresh();
          };
          if (kind === 'keys') {
            d.input.captureKey((code) => {
              if (code !== 'Escape' || a === 'menu') {
                s.update((x) => {
                  for (const b of BINDABLE) x.controls.keys[b] = x.controls.keys[b].filter((c) => c !== code);
                  x.controls.keys[a] = [code, ...(x.controls.keys[a].filter((c) => DEFAULT_KEYS[a].includes(c) && c.startsWith('Arrow')))].slice(0, 2);
                });
              }
              done();
            });
          } else {
            d.input.capturePad((button) => {
              s.update((x) => {
                for (const b of BINDABLE) x.controls.pad[b] = x.controls.pad[b].filter((c) => c !== button);
                x.controls.pad[a] = [button];
              });
              done();
            });
          }
        });
        const value = r.el.querySelector('.value') ?? r.el.appendChild(el('span', 'value'));
        if (waiting === a) value.innerHTML = `<span class="chip wait">${t(kind === 'keys' ? 'settings.rebind' : 'settings.rebindPad')}</span>`;
        else {
          const list = kind === 'keys' ? s.value.controls.keys[a].map(keyLabel) : s.value.controls.pad[a].map(padLabel);
          value.innerHTML = list.map((k) => `<span class="chip">${k}</span>`).join('');
        }
        return r;
      }),
  };
}
