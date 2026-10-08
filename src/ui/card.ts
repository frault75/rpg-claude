/**
 * Location cards (the place's name fading in over the scene, between two gold rules)
 * and the letterbox bars of cinematics.
 */

import { VIEW_H, VIEW_W } from '../engine/view';
import { INK, SERIF, type UiLayer, type UiPanel } from './ui';

export class LocationCard {
  private readonly panel: UiPanel;
  private t = -1;
  private readonly hold = 3.2;

  constructor(private readonly ui: UiLayer) {
    this.panel = ui.panel(760, 150, 10);
    this.panel.x = (VIEW_W - 760) / 2;
    this.panel.y = 58;
    this.panel.visible = false;
  }

  show(title: string, line: string): void {
    this.t = 0;
    this.panel.visible = true;
    this.panel.draw((c, w, h) => {
      // A dark band behind the name, soft at every edge, so it holds over bright snow too.
      const across = c.createLinearGradient(0, 0, w, 0);
      across.addColorStop(0, 'rgba(4, 8, 24, 0)');
      across.addColorStop(0.22, 'rgba(4, 8, 24, 0.62)');
      across.addColorStop(0.78, 'rgba(4, 8, 24, 0.62)');
      across.addColorStop(1, 'rgba(4, 8, 24, 0)');
      c.fillStyle = across;
      c.fillRect(0, 0, w, h);
      const down = c.createLinearGradient(0, 0, 0, h);
      down.addColorStop(0, 'rgba(0, 0, 0, 0)');
      down.addColorStop(0.2, 'rgba(0, 0, 0, 1)');
      down.addColorStop(0.85, 'rgba(0, 0, 0, 1)');
      down.addColorStop(1, 'rgba(0, 0, 0, 0)');
      c.globalCompositeOperation = 'destination-in';
      c.fillStyle = down;
      c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = 'source-over';
      // And a dark halo behind the letters themselves.
      const halo = (draw: () => void) => {
        c.save();
        c.shadowColor = 'rgba(0, 0, 0, 0.9)';
        c.shadowBlur = 10;
        draw();
        c.restore();
      };
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      // Long names (an item's, a chapter's) set smaller rather than spill off the card.
      const caps = title.toUpperCase().split('').join(' ');
      let size = 44;
      c.font = `500 ${size}px ${SERIF}`;
      while (size > 22 && c.measureText(caps).width > w - 60) c.font = `500 ${--size}px ${SERIF}`;
      c.fillStyle = 'rgba(0,0,0,0.7)';
      c.fillText(caps, w / 2 + 2, 62 + 2);
      const tg = c.createLinearGradient(0, 40, 0, 84);
      tg.addColorStop(0, '#FFF1C4');
      tg.addColorStop(1, '#D9A848');
      c.fillStyle = tg;
      halo(() => c.fillText(caps, w / 2, 62));
      // Rules with a lozenge in the middle.
      const tw = Math.min(w - 80, c.measureText(caps).width + 60);
      for (const y of [28, 98]) {
        const rg = c.createLinearGradient(w / 2 - tw / 2, 0, w / 2 + tw / 2, 0);
        rg.addColorStop(0, 'rgba(232,199,106,0)');
        rg.addColorStop(0.5, 'rgba(232,199,106,0.95)');
        rg.addColorStop(1, 'rgba(232,199,106,0)');
        c.fillStyle = rg;
        c.fillRect(w / 2 - tw / 2, y, tw, 1.5);
        c.save();
        c.translate(w / 2, y + 0.75);
        c.rotate(Math.PI / 4);
        c.fillStyle = INK.gold;
        c.fillRect(-4, -4, 8, 8);
        c.restore();
      }
      let lineSize = 24;
      c.font = `italic ${lineSize}px ${SERIF}`;
      while (lineSize > 15 && c.measureText(line).width > w - 30) c.font = `italic ${--lineSize}px ${SERIF}`;
      c.fillStyle = 'rgba(0,0,0,0.7)';
      c.fillText(line, w / 2 + 1.5, 124 + 1.5);
      c.fillStyle = '#E6DCC4';
      halo(() => c.fillText(line, w / 2, 124));
    });
  }

  get showing(): boolean {
    return this.t >= 0;
  }

  update(dt: number): void {
    if (this.t < 0) return;
    this.t += dt;
    const fadeIn = Math.min(1, this.t / 1.2);
    const fadeOut = Math.min(1, Math.max(0, (this.hold + 2.4 - this.t) / 1.2));
    this.panel.opacity = Math.min(fadeIn, fadeOut);
    this.panel.y = 58 + (1 - fadeIn) * 8;
    if (this.t > this.hold + 2.4) {
      this.t = -1;
      this.panel.visible = false;
    }
  }

  dispose(): void {
    this.ui.remove(this.panel);
  }
}

/** Black bars that slide in at the top and bottom during cinematics. */
export class Letterbox {
  private readonly top: UiPanel;
  private readonly bottom: UiPanel;
  private amount = 0;
  target = 0;
  static readonly SIZE = 74;

  constructor(private readonly ui: UiLayer) {
    this.top = ui.panel(VIEW_W, Letterbox.SIZE, 5);
    this.bottom = ui.panel(VIEW_W, Letterbox.SIZE, 5);
    for (const p of [this.top, this.bottom]) p.draw((c, w, h) => ((c.fillStyle = '#000'), c.fillRect(0, 0, w, h)));
  }

  update(dt: number): void {
    this.amount += (this.target - this.amount) * Math.min(1, dt * 4);
    const s = Letterbox.SIZE;
    this.top.y = -s + this.amount * s;
    this.bottom.y = VIEW_H - this.amount * s;
    this.top.visible = this.bottom.visible = this.amount > 0.002;
  }

  dispose(): void {
    this.ui.remove(this.top);
    this.ui.remove(this.bottom);
  }
}

/** Subtitles for cinematics: a line of narration over the lower letterbox bar. */
export class Subtitles {
  private readonly panel: UiPanel;
  private t = 0;
  private dur = 0;
  private text = '';
  private done: (() => void) | null = null;

  constructor(private readonly ui: UiLayer) {
    this.panel = ui.panel(1100, 90, 12);
    this.panel.x = (VIEW_W - 1100) / 2;
    this.panel.y = VIEW_H - 96;
    this.panel.visible = false;
  }

  /** Show a line for `seconds`; resolves when it has faded. */
  show(text: string, seconds: number): Promise<void> {
    this.text = text;
    this.t = 0;
    this.dur = seconds;
    this.panel.visible = true;
    this.panel.draw((c, w, h) => {
      c.font = `italic 27px ${SERIF}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const lines = balanced(c, this.text, w - 60);
      lines.forEach((l, i) => {
        const y = h / 2 + (i - (lines.length - 1) / 2) * 34;
        c.fillStyle = 'rgba(0,0,0,0.85)';
        c.fillText(l, w / 2 + 2, y + 2);
        c.fillStyle = '#EDE3CC';
        c.fillText(l, w / 2, y);
      });
    });
    this.done?.();
    return new Promise((resolve) => (this.done = resolve));
  }

  update(dt: number): void {
    if (!this.panel.visible) return;
    this.t += dt;
    this.panel.opacity = Math.min(1, this.t / 0.6, Math.max(0, (this.dur - this.t) / 0.6));
    if (this.t > this.dur) {
      this.panel.visible = false;
      const d = this.done;
      this.done = null;
      d?.();
    }
  }

  dispose(): void {
    this.ui.remove(this.panel);
  }
}

/**
 * Two lines of near-even length rather than a full line and a stray word under it: the
 * split that makes the longer line shortest, as a typesetter would break a subtitle.
 */
function balanced(c: CanvasRenderingContext2D, text: string, max: number): string[] {
  const lines = wrapText(c, text, max);
  if (lines.length !== 2) return lines;
  const words = lines.join(' ').split(' ');
  let best = lines;
  let bestW = Math.max(...lines.map((l) => c.measureText(l).width));
  // A break after a comma or a full stop reads better than an even one mid-phrase.
  for (let k = 1; k < words.length; k++) {
    const a = words.slice(0, k).join(' ');
    const b = words.slice(k).join(' ');
    const wMax = Math.max(c.measureText(a).width, c.measureText(b).width);
    const cost = wMax - (/[,;:.!?»]$/.test(words[k - 1]!) ? max * 0.14 : 0);
    if (wMax <= max && cost < bestW) {
      best = [a, b];
      bestW = cost;
    }
  }
  return best;
}

function wrapText(c: CanvasRenderingContext2D, text: string, max: number): string[] {
  // A French space before : ; ! ? » or after « never breaks the line.
  text = text.replace(/ ([:;!?»])/g, '\u00A0$1').replace(/« /g, '«\u00A0');
  const out: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (c.measureText(test).width > max && line) {
      out.push(line);
      line = word;
    } else line = test;
  }
  out.push(line);
  return out;
}
