/**
 * A page seen close up, by candlelight: lines of writing in a book hand, and scraped
 * lines that are bare vellum until the candle is tilted (the raking light), when the
 * ghost of the old ink shows in the grain.
 */

import { prefs } from '../engine/prefs';
import { t } from '../i18n/i18n';
import { VIEW_H, VIEW_W } from '../engine/view';
import { INK, SERIF, shadowText, type UiLayer, type UiPanel, wrap } from './ui';

export interface PageLine {
  text: string;
  scraped?: boolean;
  red?: boolean;
}

const W = 720;
const H = 560;

export class PageView {
  private readonly panel: UiPanel;
  private rake = 0;
  private shown = -1;
  private appear = 0;
  /** Seconds the scraped writing has been fully legible. */
  read = 0;

  constructor(
    private readonly ui: UiLayer,
    private readonly title: string,
    private readonly lines: PageLine[],
  ) {
    this.panel = ui.panel(W, H, 12);
    this.panel.x = (VIEW_W - W) / 2;
    this.panel.y = (VIEW_H - H) / 2 - 10;
    this.panel.opacity = 0;
  }

  update(dt: number, raking: boolean): void {
    this.appear = Math.min(1, this.appear + dt * 3);
    this.rake += ((raking ? 1 : 0) - this.rake) * Math.min(1, dt * 4);
    if (this.rake > 0.85) this.read += dt;
    this.panel.opacity = this.appear;
    this.panel.y = (VIEW_H - H) / 2 - 10 + (1 - this.appear) * 20;
    const key = Math.round(this.rake * 24);
    if (key !== this.shown) {
      this.shown = key;
      this.draw(key / 24);
    }
  }

  private draw(rake: number): void {
    const lines = this.lines;
    const title = this.title;
    this.panel.draw((c, w, h) => {
      // Vellum, warm where the candle is, with a raking light from the left when tilted.
      const g = c.createRadialGradient(w * (0.5 - rake * 0.35), h * 0.45, 30, w * 0.5, h * 0.5, w * 0.75);
      g.addColorStop(0, '#F3E4BF');
      g.addColorStop(0.7, '#D9C08C');
      g.addColorStop(1, '#9C7E4C');
      c.fillStyle = g;
      c.beginPath();
      c.roundRect(0, 0, w, h, 6);
      c.fill();
      // The grain of the skin: raking light makes it stand out.
      for (let i = 0; i < 900; i++) {
        const x = (i * 7919) % w;
        const y = (i * 104729) % h;
        c.fillStyle = `rgba(90, 60, 30, ${0.03 + rake * 0.07})`;
        c.fillRect(x, y, 2 + (i % 3), 1);
      }
      // Ruled lines and a red rubric frame.
      c.strokeStyle = 'rgba(160, 60, 40, 0.35)';
      c.lineWidth = 1;
      c.strokeRect(46, 40, w - 92, h - 92);
      c.textBaseline = 'alphabetic';
      c.textAlign = 'left';
      c.font = `italic 600 22px ${SERIF}`;
      c.fillStyle = '#9A2A1E';
      c.fillText(title, 70, 80);
      let y = 124;
      for (const l of lines) {
        const size = prefs.largeText ? 25 : 23;
        c.font = `${size}px ${SERIF}`;
        const rows = wrap(c, l.text, w - 150);
        for (const row of rows) {
          if (l.scraped) {
            // Bare vellum, a little paler and rubbed; the ghost of the ink under it.
            c.fillStyle = `rgba(250, 240, 214, ${0.6 - rake * 0.3})`;
            c.fillRect(64, y - size + 2, w - 128, size + 8);
            c.fillStyle = `rgba(90, 52, 24, ${rake * 0.75})`;
            c.fillText(row, 74, y);
            // Pumice scratches across it.
            c.strokeStyle = `rgba(150, 120, 80, ${0.25 + rake * 0.25})`;
            for (let k = 0; k < 7; k++) {
              c.beginPath();
              c.moveTo(66 + k * 80, y - size + 4 + (k % 3) * 6);
              c.lineTo(130 + k * 80, y - 2 - (k % 2) * 8);
              c.stroke();
            }
          } else {
            c.fillStyle = l.red ? '#A82A1E' : '#2A1E18';
            c.fillText(row, 74, y);
          }
          y += size + 14;
        }
      }
      // How to read it.
      c.font = `italic 17px ${SERIF}`;
      c.textAlign = 'center';
      c.fillStyle = 'rgba(4, 8, 24, 0.55)';
      c.beginPath();
      c.roundRect(w / 2 - 250, h - 44, 500, 32, 16);
      c.fill();
      shadowText(c, t('page.help'), w / 2, h - 22, INK.text);
    });
  }

  dispose(): void {
    this.ui.remove(this.panel);
  }
}
