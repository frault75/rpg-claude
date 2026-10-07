/**
 * Dialogue in the classic RPG manner: a lapis window along the bottom of the screen with
 * the speaker's pixel portrait, a name plate, text that types itself out with the
 * speaker's voice, and a blinking manicule when the line is done. Choices open a small
 * window above it.
 */

import type { AudioEngine } from '../audio/engine';
import { uiTick, voiceBlip } from '../audio/sfx';
import { SPEAKERS } from '../data/speakers';
import { prefs } from '../engine/prefs';
import { type LocalText, tr } from '../i18n/i18n';
import type { Action } from '../engine/input';
import { CHARACTERS } from '../pixel/characters';
import { drawPortrait, type Mood, PORTRAIT } from '../pixel/portraits';
import { drawManicule, drawWindow, INK, SERIF, shadowText, type UiLayer, type UiPanel, wrap } from './ui';

const BOX = { x: 110, y: 516, w: 1060, h: 182 };
const PORTRAIT_SCALE = 3;
const font = () => `${prefs.largeText ? 30 : 26}px ${SERIF}`;
const leading = () => (prefs.largeText ? 41 : 37);

const portraitCache = new Map<string, HTMLCanvasElement>();

function portraitCanvas(key: string, mood: Mood): HTMLCanvasElement | null {
  const spec = CHARACTERS[key];
  if (!spec) return null;
  const id = `${key}:${mood}`;
  let c = portraitCache.get(id);
  if (!c) {
    c = drawPortrait(spec, mood).toCanvas();
    portraitCache.set(id, c);
  }
  return c;
}

interface Line {
  speaker: string | null;
  name: string;
  text: string;
  mood: Mood;
}

export class Dialogue {
  private readonly box: UiPanel;
  private readonly plate: UiPanel;
  private readonly cursor: UiPanel;
  private readonly choiceBox: UiPanel;
  private line: Line | null = null;
  private lines: string[] = [];
  private shown = 0;
  private clock = 0;
  private blinkClock = 0;
  private done: (() => void) | null = null;
  private options: string[] = [];
  private selected = 0;
  private chosen: ((i: number) => void) | null = null;
  private fade = 0;
  private lastBlip = 0;

  constructor(
    private readonly ui: UiLayer,
    private readonly audio: AudioEngine,
  ) {
    this.box = ui.panel(BOX.w + 20, BOX.h + 20, 20);
    this.box.x = BOX.x - 10;
    this.box.y = BOX.y - 10;
    this.plate = ui.panel(260, 52, 21);
    this.plate.x = BOX.x + 168;
    this.plate.y = BOX.y - 34;
    this.cursor = ui.panel(40, 30, 22);
    this.cursor.x = BOX.x + BOX.w - 52;
    this.cursor.y = BOX.y + BOX.h - 40;
    this.cursor.draw((ctx) => drawManicule(ctx, 24, 15, 1.1));
    this.choiceBox = ui.panel(420, 220, 23);
    for (const p of [this.box, this.plate, this.cursor, this.choiceBox]) p.visible = false;
  }

  get open(): boolean {
    return this.line !== null || this.chosen !== null;
  }

  /** Show a line from a speaker; resolves when the player moves on. */
  say(speaker: string, text: LocalText | string, mood: Mood = 'neutral', name?: LocalText | string): Promise<void> {
    const sp = SPEAKERS[speaker];
    return this.show({ speaker, name: tr(name ?? sp?.name ?? speaker), text: tr(text), mood });
  }

  /** Narration: no portrait, in italics. */
  narrate(text: LocalText | string): Promise<void> {
    return this.show({ speaker: null, name: '', text: tr(text), mood: 'neutral' });
  }

  private show(line: Line): Promise<void> {
    this.done?.();
    this.line = line;
    this.shown = 0;
    this.clock = 0;
    const ctx = this.box.ctx;
    ctx.save();
    ctx.font = line.speaker ? font() : `italic ${font()}`;
    this.lines = wrap(ctx, line.text, this.textWidth());
    ctx.restore();
    this.box.visible = true;
    this.plate.visible = !!line.speaker;
    if (line.speaker) {
      const name = line.name;
      this.plate.draw((c) => {
        c.font = `600 22px ${SERIF}`;
        const w = Math.min(250, c.measureText(name).width + 44);
        drawWindow(c, 4, 4, w, 42, 0.97);
        c.textBaseline = 'middle';
        shadowText(c, name, 26, 26, INK.gold);
      });
    }
    this.redraw();
    return new Promise((resolve) => (this.done = resolve));
  }

  /** Offer choices; resolves with the index picked. */
  choose(options: (LocalText | string)[]): Promise<number> {
    this.options = options.map((o) => tr(o));
    this.selected = 0;
    this.drawChoices();
    this.choiceBox.visible = true;
    uiTick(this.audio);
    return new Promise((resolve) => (this.chosen = resolve));
  }

  close(): void {
    this.line = null;
    this.box.visible = false;
    this.plate.visible = false;
    this.cursor.visible = false;
  }

  private textWidth(): number {
    return this.line?.speaker ? BOX.w - 230 : BOX.w - 120;
  }

  private get complete(): boolean {
    return this.line !== null && this.shown >= this.line.text.length;
  }

  /** Feed an input action; returns true if the dialogue used it. */
  handle(a: Action): boolean {
    if (this.chosen) {
      if (a === 'up' || a === 'down') {
        const n = this.options.length;
        this.selected = (this.selected + (a === 'up' ? n - 1 : 1)) % n;
        this.drawChoices();
        uiTick(this.audio);
      } else if (a === 'confirm') this.pick(this.selected);
      return true;
    }
    if (!this.line) return false;
    if (a === 'confirm' || a === 'cancel') {
      if (!this.complete) this.shown = this.line.text.length;
      else this.advance();
      this.redraw();
      return true;
    }
    return true;
  }

  /** A click anywhere: advance, or pick the option under the pointer. */
  click(x: number, y: number): boolean {
    if (this.chosen) {
      const i = Math.floor((y - this.choiceBox.y - 22) / 44);
      if (x >= this.choiceBox.x && x <= this.choiceBox.x + this.choiceBox.w && i >= 0 && i < this.options.length) this.pick(i);
      return true;
    }
    if (this.line) return this.handle('confirm');
    return false;
  }

  private pick(i: number): void {
    const c = this.chosen;
    this.chosen = null;
    this.choiceBox.visible = false;
    uiTick(this.audio, true);
    c?.(i);
  }

  private advance(): void {
    const d = this.done;
    this.done = null;
    uiTick(this.audio);
    this.line = null;
    // Keep the window up for a moment: the next line usually follows at once.
    d?.();
  }

  update(dt: number): void {
    // Fade the window in and out.
    const want = this.line ? 1 : 0;
    this.fade += (want - this.fade) * Math.min(1, dt * 14);
    if (!this.line && this.fade < 0.02) {
      this.box.visible = false;
      this.plate.visible = false;
    }
    this.box.opacity = this.fade;
    this.plate.opacity = this.fade;
    if (!this.line) {
      this.cursor.visible = false;
      return;
    }
    if (!this.complete) {
      this.clock += dt;
      const before = this.shown;
      this.shown = Math.min(this.line.text.length, Math.floor(this.clock * prefs.textCps));
      if (this.shown !== before) {
        // A blip every couple of letters, skipping spaces and punctuation.
        const ch = this.line.text[this.shown - 1] ?? ' ';
        if (this.line.speaker && /[A-Za-z]/.test(ch) && this.clock - this.lastBlip > 0.075) {
          this.lastBlip = this.clock;
          voiceBlip(this.audio, SPEAKERS[this.line.speaker]?.voice ?? 300);
        }
        this.redraw();
      }
    }
    this.blinkClock += dt;
    this.cursor.visible = this.complete && !this.chosen;
    this.cursor.opacity = 0.55 + 0.45 * Math.abs(Math.sin(this.blinkClock * 4));
    this.cursor.x = BOX.x + BOX.w - 52 + Math.sin(this.blinkClock * 6) * 2;
  }

  private redraw(): void {
    const line = this.line;
    if (!line) return;
    const lines = this.lines;
    const shown = this.shown;
    this.box.draw((c) => {
      drawWindow(c, 10, 10, BOX.w, BOX.h);
      let tx = 10 + 60;
      if (line.speaker) {
        const key = SPEAKERS[line.speaker]?.portrait;
        const pc = key ? portraitCanvas(key, line.mood) : null;
        const size = PORTRAIT * PORTRAIT_SCALE;
        const px = 10 + 18;
        const py = 10 + (BOX.h - size) / 2;
        // A dark inset behind the portrait.
        const g = c.createLinearGradient(0, py, 0, py + size);
        g.addColorStop(0, '#0A1230');
        g.addColorStop(1, '#1A2C66');
        c.fillStyle = g;
        c.fillRect(px, py, size, size);
        if (pc) {
          c.imageSmoothingEnabled = false;
          c.drawImage(pc, px, py, size, size);
        }
        c.strokeStyle = 'rgba(232, 199, 106, 0.8)';
        c.lineWidth = 1.5;
        c.strokeRect(px - 0.75, py - 0.75, size + 1.5, size + 1.5);
        tx = px + size + 30;
      }
      c.font = line.speaker ? font() : `italic ${font()}`;
      c.textBaseline = 'alphabetic';
      let left = shown;
      const lead = leading();
      const top = 10 + (line.speaker ? 52 : BOX.h / 2 - ((lines.length - 1) * lead) / 2 + 9);
      lines.forEach((l, i) => {
        if (left <= 0) return;
        const part = l.slice(0, left);
        left -= l.length + 1;
        shadowText(c, part, tx, top + i * lead, line.speaker ? INK.text : '#E6DCC4');
      });
    });
  }

  private drawChoices(): void {
    const opts = this.options;
    const sel = this.selected;
    const h = 30 + opts.length * 44;
    this.choiceBox.y = BOX.y - h - 18;
    this.choiceBox.x = BOX.x + BOX.w - 430;
    this.choiceBox.draw((c) => {
      drawWindow(c, 6, 6, 408, h);
      c.font = `24px ${SERIF}`;
      c.textBaseline = 'middle';
      opts.forEach((o, i) => {
        const y = 6 + 22 + i * 44 + 15;
        shadowText(c, o, 70, y, i === sel ? INK.text : INK.dim);
        if (i === sel) drawManicule(c, 46, y, 1);
      });
    });
  }

  dispose(): void {
    for (const p of [this.box, this.plate, this.cursor, this.choiceBox]) this.ui.remove(p);
  }
}
