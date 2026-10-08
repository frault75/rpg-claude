/**
 * The pause menu: opened with Escape, Start or the touch menu button. A column of
 * entries on the left (Resume, Party, Equipment, Settings, Save, Title) and the chosen
 * page on the right. Everything can be driven by keyboard, gamepad, mouse or touch:
 * up and down move the gold manicule, left and right change a value, confirm chooses,
 * cancel goes back.
 */

import type { AudioEngine } from '../audio/engine';
import { uiTick } from '../audio/sfx';
import type { Action, Input } from '../engine/input';
import { onLangChange, t } from '../i18n/i18n';
import { MANICULE_SVG, MENU_CSS } from './style';

export interface Row {
  el: HTMLElement;
  /** Can the cursor rest here? */
  focus: boolean;
  activate?: () => void;
  adjust?: (dir: -1 | 1) => void;
}

export interface Page {
  title: () => string;
  help?: () => string;
  rows: () => Row[];
  /** The row the cursor starts on. */
  focus?: number;
}

export interface Entry {
  label: () => string;
  /** Opens a page, or does something at once (resume, save). */
  page?: () => Page;
  run?: () => void;
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

function windowEl(cls: string): HTMLDivElement {
  const w = el('div', `win ${cls}`);
  for (const c of ['tl', 'tr', 'bl', 'br']) w.append(el('span', `fl ${c}`));
  return w;
}

export class Menu {
  readonly root = el('div');
  private readonly frame = el('div', 'frame');
  private readonly side = windowEl('side');
  private readonly content = windowEl('content');
  private entries: Entry[] = [];
  private sideIndex = 0;
  private stack: { page: Page; focus: number }[] = [];
  private rows: Row[] = [];
  private level: 'side' | 'content' = 'side';
  private isOpen = false;
  /** Called when the menu closes. */
  onClose: (() => void) | null = null;
  private toastEl: HTMLDivElement | null = null;
  /** A row is waiting for a key or button (rebinding): actions are not navigation. */
  capturing = false;

  constructor(
    private readonly input: Input,
    private readonly audio: AudioEngine,
  ) {
    if (!document.getElementById('menu-style')) {
      const st = el('style');
      st.id = 'menu-style';
      st.textContent = MENU_CSS;
      document.head.append(st);
    }
    this.root.id = 'menu';
    this.frame.append(this.side, this.content);
    this.root.append(this.frame);
    document.body.append(this.root);
    this.root.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (e.target === this.root || e.target === this.frame) this.back();
    });
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('resize', () => this.layout());
    onLangChange(() => this.isOpen && this.render());
  }

  get open(): boolean {
    return this.isOpen;
  }

  /**
   * Open on a list of entries (the pause menu, or the title screen's settings). `compact`
   * is for a single short page (a choice, the credits): a window as tall as its words,
   * centred, its text a little larger, instead of the full-screen frame.
   */
  show(entries: Entry[], startPage?: number, opts: { compact?: boolean } = {}): void {
    this.entries = entries;
    this.isOpen = true;
    this.compact = !!opts.compact;
    this.root.classList.toggle('compact', this.compact);
    this.root.classList.add('open');
    this.sideIndex = startPage ?? 0;
    this.stack = [];
    this.level = 'side';
    this.side.style.display = entries.length > 1 ? '' : 'none';
    if (startPage !== undefined || entries.length === 1) this.enter(this.sideIndex);
    this.layout();
    this.render();
    uiTick(this.audio, true);
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.capturing = false;
    this.input.cancelCapture();
    this.root.classList.remove('open');
    uiTick(this.audio);
    this.onClose?.();
  }

  /** Place the frame over the letterboxed game area. */
  layout(box?: { x: number; y: number; w: number; h: number }): void {
    const b = box ?? this.box ?? { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
    this.box = b;
    if (this.compact) {
      const w = Math.min(b.w * 0.86, b.h * 1.3);
      Object.assign(this.frame.style, { left: `${b.x + (b.w - w) / 2}px`, top: `${b.y + b.h / 2}px`, width: `${w}px`, height: '', maxHeight: `${b.h}px`, fontSize: `${Math.max(13, (b.h / 720) * 22)}px` });
      return;
    }
    Object.assign(this.frame.style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px`, maxHeight: '', fontSize: `${Math.max(12, (b.h / 720) * 19)}px` });
  }

  private box: { x: number; y: number; w: number; h: number } | null = null;
  private compact = false;

  private enter(i: number): void {
    const e = this.entries[i];
    if (!e) return;
    if (e.run) {
      e.run();
      return;
    }
    if (e.page) {
      const page = e.page();
      this.stack = [{ page, focus: page.focus ?? 0 }];
      this.level = 'content';
    }
  }

  /** Open a sub-page (settings categories, pickers). */
  push(page: Page): void {
    const top = this.stack[this.stack.length - 1];
    if (top) top.focus = this.focusIndex();
    this.stack.push({ page, focus: page.focus ?? 0 });
    this.level = 'content';
    this.render();
    uiTick(this.audio, true);
  }

  /** Close the current page; from the top level, close the menu. */
  back(): void {
    if (this.capturing) return;
    if (this.level === 'content') {
      this.stack.pop();
      if (this.stack.length === 0) {
        this.level = 'side';
        if (this.entries.length <= 1) {
          this.close();
          return;
        }
      }
      this.render();
      uiTick(this.audio);
      return;
    }
    this.close();
  }

  /** Re-draw the current page (after a value changed), keeping the cursor. */
  refresh(): void {
    const top = this.stack[this.stack.length - 1];
    if (top) top.focus = this.focusIndex();
    this.render();
  }

  toast(text: string): void {
    this.toastEl?.remove();
    const tw = windowEl('toast');
    tw.append(el('div', '', text));
    this.frame.append(tw);
    this.toastEl = tw;
    setTimeout(() => tw.remove(), 1600);
  }

  private focusIndex(): number {
    return this.rows.findIndex((r) => r.el.classList.contains('focus'));
  }

  private render(): void {
    // Side column.
    this.side.querySelectorAll('.row, .crest').forEach((n) => n.remove());
    this.side.append(el('div', 'crest', t('menu.paused')));
    this.entries.forEach((e, i) => {
      const r = el('div', 'row', MANICULE_SVG);
      r.append(el('span', 'label', e.label()));
      if (i === this.sideIndex) r.classList.add(this.level === 'side' ? 'focus' : 'active');
      r.addEventListener('pointerenter', () => {
        if (this.level === 'side' && this.sideIndex !== i) {
          this.sideIndex = i;
          this.render();
        }
      });
      r.addEventListener('click', () => {
        this.sideIndex = i;
        this.stack = [];
        this.level = 'side';
        this.enter(i);
        this.render();
        uiTick(this.audio, true);
      });
      this.side.append(r);
    });
    // Content.
    this.content.querySelectorAll(':scope > :not(.fl)').forEach((n) => n.remove());
    const top = this.stack[this.stack.length - 1];
    const page = top?.page ?? this.entries[this.sideIndex]?.page?.();
    this.rows = [];
    if (!page) {
      this.content.style.visibility = 'hidden';
      return;
    }
    this.content.style.visibility = '';
    this.content.append(el('h2', '', page.title()));
    const help = page.help?.();
    if (help) this.content.append(el('div', 'help', help));
    this.rows = page.rows();
    const focusAt = Math.min(top?.focus ?? 0, this.rows.length - 1);
    let first = -1;
    this.rows.forEach((row, i) => {
      if (row.focus) {
        if (!row.el.querySelector('.cursor')) row.el.insertAdjacentHTML('afterbegin', MANICULE_SVG);
        if (first < 0) first = i;
        row.el.addEventListener('pointerenter', () => this.level === 'content' && this.setFocus(i));
        row.el.addEventListener('click', (ev) => {
          if (this.level !== 'content') this.level = 'content';
          this.setFocus(i);
          if ((ev.target as HTMLElement).closest('.arrow.left')) row.adjust?.(-1);
          else if ((ev.target as HTMLElement).closest('.arrow.right')) row.adjust?.(1);
          else row.activate?.();
          uiTick(this.audio, true);
        });
      } else row.el.classList.add('static');
      this.content.append(row.el);
    });
    if (this.level === 'content') {
      const target = focusAt >= 0 && this.rows[focusAt]?.focus ? focusAt : first;
      if (target >= 0) this.setFocus(target, false);
    }
  }

  private setFocus(i: number, sound = true): void {
    const cur = this.focusIndex();
    if (cur === i) return;
    this.rows.forEach((r, k) => r.el.classList.toggle('focus', k === i));
    this.rows[i]?.el.scrollIntoView({ block: 'nearest' });
    if (sound) uiTick(this.audio);
  }

  private moveFocus(dir: -1 | 1): void {
    const n = this.rows.length;
    let i = this.focusIndex();
    for (let k = 0; k < n; k++) {
      i = (i + dir + n) % n;
      if (this.rows[i]?.focus) {
        this.setFocus(i);
        return;
      }
    }
  }

  /** Feed an action. Returns true when the menu used it. */
  handle(a: Action): boolean {
    if (!this.isOpen) return false;
    if (this.capturing) return true;
    if (this.level === 'side') {
      const n = this.entries.length;
      if (a === 'up' || a === 'down') {
        this.sideIndex = (this.sideIndex + (a === 'up' ? n - 1 : 1)) % n;
        this.render();
        uiTick(this.audio);
      } else if (a === 'confirm' || a === 'right') {
        this.enter(this.sideIndex);
        this.render();
        uiTick(this.audio, true);
      } else if (a === 'cancel' || a === 'menu') this.close();
      return true;
    }
    const row = this.rows[this.focusIndex()];
    if (a === 'up') this.moveFocus(-1);
    else if (a === 'down') this.moveFocus(1);
    else if (a === 'left' || a === 'right') {
      if (row?.adjust) {
        row.adjust(a === 'left' ? -1 : 1);
        uiTick(this.audio);
      } else if (a === 'left') this.back();
    } else if (a === 'confirm') {
      row?.activate?.();
      uiTick(this.audio, true);
    } else if (a === 'cancel' || a === 'menu') this.back();
    return true;
  }
}

// ---- row builders ----

export function buttonRow(label: string, activate: () => void, detail = ''): Row {
  const r = el('div', 'row');
  r.append(el('span', 'label', label));
  if (detail) r.append(el('span', 'value', detail));
  return { el: r, focus: true, activate };
}

export function infoRow(html: string, cls = ''): Row {
  return { el: el('div', `row ${cls}`, html), focus: false };
}

export function sepRow(): Row {
  return { el: el('div', 'sep'), focus: false };
}

export function toggleRow(label: string, get: () => boolean, set: (v: boolean) => void, refresh: () => void): Row {
  const r = el('div', 'row');
  r.append(el('span', 'label', label), el('span', 'value', `<span class="arrow left">‹</span>${get() ? t('settings.on') : t('settings.off')}<span class="arrow right">›</span>`));
  const flip = () => {
    set(!get());
    refresh();
  };
  return { el: r, focus: true, activate: flip, adjust: flip };
}

export function sliderRow(label: string, get: () => number, set: (v: number) => void, refresh: () => void, min = 0, max = 1, step = 0.1, fmt = (v: number) => `${Math.round(v * 100)}%`): Row {
  const r = el('div', 'row');
  const v = get();
  const value = el('span', 'value');
  const bar = el('span', 'bar');
  const fill = el('span', 'fill');
  fill.style.display = 'block';
  fill.style.width = `${((v - min) / (max - min)) * 100}%`;
  bar.append(fill);
  value.append(el('span', 'arrow left', '‹'), bar, el('span', 'arrow right', '›'), el('span', '', fmt(v)));
  bar.addEventListener('pointerdown', (e) => {
    const rect = bar.getBoundingClientRect();
    const k = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    set(Math.round((min + k * (max - min)) / step) * step);
    refresh();
    e.stopPropagation();
  });
  r.append(el('span', 'label', label), value);
  const adjust = (dir: -1 | 1) => {
    set(Math.min(max, Math.max(min, Math.round((get() + dir * step) / step) * step)));
    refresh();
  };
  return { el: r, focus: true, adjust, activate: () => adjust(1) };
}

export function selectRow<T>(label: string, options: { value: T; label: string }[], get: () => T, set: (v: T) => void, refresh: () => void): Row {
  const r = el('div', 'row');
  const cur = Math.max(0, options.findIndex((o) => o.value === get()));
  r.append(el('span', 'label', label), el('span', 'value', `<span class="arrow left">‹</span>${options[cur]?.label ?? ''}<span class="arrow right">›</span>`));
  const adjust = (dir: -1 | 1) => {
    const i = Math.max(0, options.findIndex((o) => o.value === get()));
    set(options[(i + dir + options.length) % options.length]!.value);
    refresh();
  };
  return { el: r, focus: true, adjust, activate: () => adjust(1) };
}
