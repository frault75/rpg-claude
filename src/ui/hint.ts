/**
 * A control hint: a small window low on the screen, apart from the story's own words, that
 * names the key or button for what the player has just been told to do. It follows the
 * device being used, and goes as soon as the control is used or after a while.
 */

import type { Action } from '../engine/input';
import { VIEW_H, VIEW_W } from '../engine/view';
import { drawManicule, drawWindow, INK, SERIF, shadowText, type UiLayer, type UiPanel } from './ui';

const W = 720;
const H = 54;

export class Hint {
  private readonly panel: UiPanel;
  private t = -1;
  private life = 0;
  private text: (() => string) | null = null;
  /** The action that dismisses the hint once it is used. */
  until: Action | null = null;

  constructor(ui: UiLayer) {
    this.panel = ui.panel(W, H, 10);
    this.panel.x = (VIEW_W - W) / 2;
    this.panel.y = VIEW_H - H - 34;
    this.panel.visible = false;
  }

  get showing(): boolean {
    return this.t >= 0;
  }

  show(text: () => string, seconds = 9, until: Action | null = null): void {
    this.text = text;
    this.until = until;
    this.t = 0;
    this.life = seconds;
    this.redraw();
  }

  /** Draw again, as the device or the language has changed. */
  redraw(): void {
    if (!this.text || this.t < 0) return;
    const s = this.text();
    this.panel.visible = true;
    this.panel.draw((c, w, h) => {
      drawWindow(c, 0, 0, w, h, 0.84);
      drawManicule(c, 40, h / 2, 0.9);
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      c.font = `italic 20px ${SERIF}`;
      shadowText(c, s, 64, h / 2 + 1, INK.text);
    });
  }

  /** Fade out now (the control was used). */
  done(): void {
    if (this.t >= 0) this.t = Math.max(this.t, this.life - 0.5);
  }

  update(dt: number): void {
    if (this.t < 0) return;
    this.t += dt;
    this.panel.opacity = Math.min(1, this.t * 3, Math.max(0, (this.life - this.t) * 2));
    if (this.t >= this.life) {
      this.t = -1;
      this.text = null;
      this.until = null;
      this.panel.visible = false;
    }
  }
}
