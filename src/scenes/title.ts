/**
 * The title screen: the abbey of Saint Ebb's at night, seen by a camera that drifts
 * slowly along the island with the lamps lit and the sea moving below. The logo inks
 * itself in, then "Press any key" (or "Touch to begin") opens the menu.
 */

import type { AudioEngine } from '../audio/engine';
import { EbbNightAmbience } from '../audio/ambient';
import type { DebugInfo } from '../debug/overlay';
import type { WorldRenderer } from '../engine/diorama/renderer';
import type { Input } from '../engine/input';
import type { Scene } from '../engine/scene';
import { VIEW_W } from '../engine/view';
import { onLangChange, t } from '../i18n/i18n';
import { dressSeaGate } from '../maps/seaGateSet';
import { type TitleChoice, TitleMenu } from '../menu/titleMenu';
import { drawLogo, paintLogo } from '../ui/logo';
import { INK, SERIF, UiLayer, type UiPanel } from '../ui/ui';
import { Stage } from '../world3d/stage';

const LOGO_W = 900;
const LOGO_H = 260;

export interface TitleHooks {
  choices: () => TitleChoice[];
}

export class TitleScene implements Scene {
  readonly name = 'title';
  readonly pausable = false;
  private readonly stage: Stage;
  private readonly ui: UiLayer;
  private readonly logoPanel: UiPanel;
  private readonly prompt: UiPanel;
  private readonly menu: TitleMenu;
  private readonly ambience = new EbbNightAmbience();
  private logo: HTMLCanvasElement | null = null;
  private logoScale = 0;
  private time = 0;
  private started = false;
  private readonly unsubs: (() => void)[] = [];
  /** Set by the scene that follows, to fade out. */
  leaving = false;

  constructor(
    private readonly r: WorldRenderer,
    input: Input,
    private readonly audio: AudioEngine,
    private readonly hooks: TitleHooks,
  ) {
    this.stage = new Stage(r);
    dressSeaGate(r, this.stage);
    r.grade.dof = 1.2;
    r.grade.focusBand = 80;
    this.ui = new UiLayer(r);
    this.logoPanel = this.ui.panel(LOGO_W, LOGO_H, 10);
    this.logoPanel.x = (VIEW_W - LOGO_W) / 2;
    this.logoPanel.y = 40;
    this.prompt = this.ui.panel(560, 70, 10);
    this.prompt.x = (VIEW_W - 560) / 2;
    this.prompt.y = 560;
    this.drawPrompt();
    this.menu = new TitleMenu(audio);
    this.unsubs.push(
      onLangChange(() => {
        this.logo = null;
        this.drawPrompt();
        if (this.menu.open) this.menu.render();
      }),
    );
    // Any key or touch starts; afterwards the menu takes the actions.
    this.unsubs.push(
      input.onAction((a) => {
        if (this.menu.open) {
          this.menu.handle(a);
          return;
        }
        if (this.time > 1.2 && !this.started && a !== 'debug' && a !== 'debugMenu') this.start();
      }),
      input.onPointer(() => {
        if (this.time > 1.2 && !this.started) this.start();
      }),
    );
    input.onGesture(() => this.ambience.start(this.audio));
  }

  private drawPrompt(): void {
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    const text = t(coarse ? 'title.tap' : 'title.press');
    this.prompt.draw((c, w, h) => {
      const bg = c.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
      bg.addColorStop(0, 'rgba(4, 8, 24, 0.6)');
      bg.addColorStop(1, 'rgba(4, 8, 24, 0)');
      c.fillStyle = bg;
      c.fillRect(0, 0, w, h);
      c.font = `italic 26px ${SERIF}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = 'rgba(0,0,0,0.75)';
      c.fillText(text, w / 2 + 2, h / 2 + 2);
      c.fillStyle = INK.text;
      c.fillText(text, w / 2, h / 2);
    });
  }

  private start(): void {
    this.started = true;
    this.menu.layout(this.r.viewport);
    this.menu.show(this.hooks.choices());
  }

  /** Hide the menu (when leaving, or opening settings over it). */
  hideMenu(): void {
    this.menu.hide();
  }

  showMenu(): void {
    this.menu.layout(this.r.viewport);
    this.menu.show(this.hooks.choices());
  }

  update(dt: number): void {
    this.time += dt;
    const tt = this.time;
    // The camera drifts along the abbey and back, turning a little as it goes.
    const k = 0.5 - 0.5 * Math.cos(tt * 0.035);
    const v = this.r.view;
    v.x = 150 + k * 190;
    v.y = 168 - k * 20;
    v.h = 150 - k * 40;
    v.yaw = Math.sin(tt * 0.05) * 0.07;
    v.pitch = -0.05 + Math.sin(tt * 0.031) * 0.02;
    this.r.screen.fade = Math.max(this.leaving ? this.r.screen.fade : 0, 1 - tt / 2.5);
    // The logo inks itself in, then glints now and then.
    const s = this.r.uiScale;
    if (!this.logo || Math.abs(s - this.logoScale) > 0.01) {
      this.logo = paintLogo(LOGO_W, LOGO_H, t('title.subtitle'), s);
      this.logoScale = s;
    }
    const reveal = Math.min(1, Math.max(0, (tt - 1.4) / 2.6));
    const cycle = (tt - 4) % 7;
    const glint = tt > 4 && cycle < 1.4 ? cycle / 1.4 : -1;
    const logo = this.logo;
    this.logoPanel.draw((c) => drawLogo(c, logo, LOGO_W, LOGO_H, reveal, glint));
    this.logoPanel.opacity = 1;
    this.prompt.visible = !this.started && tt > 4.2;
    this.prompt.opacity = 0.55 + 0.45 * Math.sin(tt * 2.4);
    this.menu.layout(this.r.viewport);
    this.stage.update(dt, tt);
  }

  sync(): void {
    this.ui.sync();
  }

  debugInfo(): DebugInfo {
    return { scene: this.name, location: 'Title', lines: [['time', this.time.toFixed(1)]] };
  }

  debugButtons(): { label: string; run: () => void }[] {
    return [{ label: 'start', run: () => this.start() }];
  }

  dispose(): void {
    for (const u of this.unsubs) u();
    this.menu.dispose();
    this.ui.dispose();
    this.ambience.stop();
    this.stage.dispose();
    const v = this.r.view;
    v.yaw = 0;
    v.pitch = 0;
  }
}
