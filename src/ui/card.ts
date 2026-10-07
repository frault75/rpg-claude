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
      // A soft dark band for legibility.
      const g = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(4, 8, 24, 0.55)');
      g.addColorStop(1, 'rgba(4, 8, 24, 0)');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `500 44px ${SERIF}`;
      const caps = title.toUpperCase().split('').join(' ');
      c.fillStyle = 'rgba(0,0,0,0.7)';
      c.fillText(caps, w / 2 + 2, 62 + 2);
      const tg = c.createLinearGradient(0, 40, 0, 84);
      tg.addColorStop(0, '#FFF1C4');
      tg.addColorStop(1, '#D9A848');
      c.fillStyle = tg;
      c.fillText(caps, w / 2, 62);
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
      c.font = `italic 24px ${SERIF}`;
      c.fillStyle = 'rgba(0,0,0,0.7)';
      c.fillText(line, w / 2 + 1.5, 124 + 1.5);
      c.fillStyle = '#E6DCC4';
      c.fillText(line, w / 2, 124);
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
