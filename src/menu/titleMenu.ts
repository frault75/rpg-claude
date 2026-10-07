/**
 * The title screen's menu: a short column of choices under the logo, without a
 * window, each lit by the gold manicule when chosen. Keyboard, gamepad, mouse, touch.
 */

import type { AudioEngine } from '../audio/engine';
import { uiTick } from '../audio/sfx';
import type { Action } from '../engine/input';
import { el } from './menu';
import { MANICULE_SVG, MENU_CSS } from './style';

export interface TitleChoice {
  label: () => string;
  run: () => void;
  enabled?: () => boolean;
}

const CSS = /* css */ `
#title-menu { position: fixed; z-index: 25; display: none; flex-direction: column; align-items: center; gap: 0.15em;
  font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, 'Iowan Old Style', serif; user-select: none; -webkit-user-select: none; }
#title-menu.open { display: flex; animation: menu-in 0.6s ease-out; }
#title-menu::before { content: ''; position: absolute; left: 50%; top: 50%; width: 26em; height: 13em; transform: translate(-50%, -50%); z-index: -1;
  background: radial-gradient(ellipse at center, rgba(4, 8, 24, 0.62), rgba(4, 8, 24, 0) 70%); pointer-events: none; }
#title-menu .row { position: relative; padding: 0.22em 1.4em 0.22em 2.4em; color: #E6DCC4; font-size: 1.25em; letter-spacing: 0.04em; cursor: pointer;
  text-shadow: 0 2px 0 rgba(0,0,0,0.85), 0 0 12px rgba(0,0,0,0.6); transition: color 0.15s; }
#title-menu .row.focus { color: #FFF1C4; text-shadow: 0 2px 0 rgba(0,0,0,0.85), 0 0 14px rgba(255, 200, 110, 0.55); }
#title-menu .row.off { color: #7E7A72; }
#title-menu .row .cursor { position: absolute; left: 0.2em; top: 50%; width: 1.8em; height: 1.15em; margin-top: -0.58em; visibility: hidden; }
#title-menu .row.focus .cursor { visibility: visible; animation: point 0.8s ease-in-out infinite alternate; }
`;

export class TitleMenu {
  readonly root = el('div');
  private index = 0;
  private choices: TitleChoice[] = [];
  private rows: HTMLElement[] = [];
  private isOpen = false;

  constructor(private readonly audio: AudioEngine) {
    if (!document.getElementById('title-menu-style')) {
      const st = el('style');
      st.id = 'title-menu-style';
      // The keyframes are shared with the pause menu's sheet.
      st.textContent = CSS + (document.getElementById('menu-style') ? '' : MENU_CSS);
      document.head.append(st);
    }
    this.root.id = 'title-menu';
    this.root.addEventListener('pointerdown', (e) => e.stopPropagation());
    document.body.append(this.root);
  }

  get open(): boolean {
    return this.isOpen;
  }

  show(choices: TitleChoice[]): void {
    this.choices = choices;
    this.index = choices.findIndex((c) => c.enabled?.() !== false);
    this.isOpen = true;
    this.root.classList.add('open');
    this.render();
  }

  hide(): void {
    this.isOpen = false;
    this.root.classList.remove('open');
  }

  /** Place under the logo, inside the game area. */
  layout(box: { x: number; y: number; w: number; h: number }): void {
    Object.assign(this.root.style, { left: `${box.x}px`, width: `${box.w}px`, top: `${box.y + box.h * 0.56}px`, fontSize: `${Math.max(12, (box.h / 720) * 20)}px` });
  }

  render(): void {
    this.root.replaceChildren();
    this.rows = this.choices.map((c, i) => {
      const r = el('div', 'row', MANICULE_SVG);
      r.append(el('span', '', c.label()));
      const on = c.enabled?.() !== false;
      if (!on) r.classList.add('off');
      if (i === this.index) r.classList.add('focus');
      r.addEventListener('pointerenter', () => on && this.focus(i));
      r.addEventListener('click', () => on && this.choose(i));
      this.root.append(r);
      return r;
    });
  }

  private focus(i: number): void {
    if (i === this.index) return;
    this.index = i;
    this.rows.forEach((r, k) => r.classList.toggle('focus', k === i));
    uiTick(this.audio);
  }

  private choose(i: number): void {
    uiTick(this.audio, true);
    this.choices[i]?.run();
  }

  handle(a: Action): boolean {
    if (!this.isOpen) return false;
    const n = this.choices.length;
    if (a === 'up' || a === 'down') {
      let i = this.index;
      for (let k = 0; k < n; k++) {
        i = (i + (a === 'up' ? n - 1 : 1)) % n;
        if (this.choices[i]?.enabled?.() !== false) break;
      }
      this.focus(i);
    } else if (a === 'confirm') this.choose(this.index);
    return true;
  }

  dispose(): void {
    this.root.remove();
  }
}
