/**
 * The debug overlay (DESIGN.md §10.6), toggled with the key left of 1 (` or ²).
 * Plain DOM: it is a tool, not part of the page, so it is not drawn in the manuscript style.
 */

import { POST_STAGES, type PostPass } from '../engine/post/post';

export interface DebugInfo {
  scene: string;
  location: string;
  lines: [string, string][];
}

export interface DebugHooks {
  post: PostPass;
  setShimmer: (on: boolean) => void;
  shimmer: () => boolean;
  /** Extra buttons offered by the current scene. */
  buttons: () => { label: string; run: () => void }[];
}

export class DebugOverlay {
  private readonly root: HTMLDivElement;
  private readonly stats: HTMLPreElement;
  private readonly controls: HTMLDivElement;
  private visible = false;
  private frames = 0;
  private acc = 0;
  private fps = 0;
  private ms = 0;
  private lastRefresh = 0;

  constructor(private readonly hooks: DebugHooks) {
    this.root = document.createElement('div');
    this.root.id = 'debug-overlay';
    Object.assign(this.root.style, {
      position: 'fixed',
      top: '8px',
      left: '8px',
      maxWidth: '360px',
      padding: '8px 10px',
      background: 'rgba(20,16,12,0.86)',
      color: '#f2e6cf',
      font: '12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      borderRadius: '4px',
      zIndex: '10',
      display: 'none',
      userSelect: 'none',
    } satisfies Partial<CSSStyleDeclaration>);
    this.stats = document.createElement('pre');
    this.stats.style.margin = '0 0 6px 0';
    this.stats.style.whiteSpace = 'pre-wrap';
    this.controls = document.createElement('div');
    this.root.append(this.stats, this.controls);
    document.body.append(this.root);
    this.buildControls();
  }

  toggle(): void {
    this.visible = !this.visible;
    this.root.style.display = this.visible ? 'block' : 'none';
    if (this.visible) this.buildControls();
  }

  get isVisible(): boolean {
    return this.visible;
  }

  /** Call every frame with the frame's duration in seconds. */
  frame(dt: number, info: () => DebugInfo): void {
    this.frames++;
    this.acc += dt;
    this.ms = this.ms * 0.9 + dt * 1000 * 0.1;
    if (this.acc >= 0.5) {
      this.fps = this.frames / this.acc;
      this.frames = 0;
      this.acc = 0;
    }
    const now = performance.now();
    if (!this.visible || now - this.lastRefresh < 250) return;
    this.lastRefresh = now;
    const i = info();
    const rows: [string, string][] = [
      ['fps', `${this.fps.toFixed(0)}  (${this.ms.toFixed(1)} ms)`],
      ['scene', i.scene],
      ['location', i.location],
      ...i.lines,
    ];
    const pad = Math.max(...rows.map(([k]) => k.length));
    this.stats.textContent = rows.map(([k, v]) => `${k.padEnd(pad)}  ${v}`).join('\n');
  }

  private buildControls(): void {
    this.controls.replaceChildren();
    const heading = (t: string) => {
      const h = document.createElement('div');
      h.textContent = t;
      h.style.margin = '6px 0 2px';
      h.style.color = '#d9a441';
      this.controls.append(h);
    };
    const check = (label: string, value: boolean, set: (v: boolean) => void) => {
      const l = document.createElement('label');
      l.style.display = 'inline-block';
      l.style.marginRight = '10px';
      const c = document.createElement('input');
      c.type = 'checkbox';
      c.checked = value;
      c.addEventListener('change', () => set(c.checked));
      l.append(c, ` ${label}`);
      this.controls.append(l);
    };
    heading('post-processing');
    for (const stage of POST_STAGES) check(stage, this.hooks.post.enabled[stage], (v) => (this.hooks.post.enabled[stage] = v));
    check('gold shimmer', this.hooks.shimmer(), (v) => this.hooks.setShimmer(v));
    const buttons = this.hooks.buttons();
    if (buttons.length) {
      heading('scene');
      for (const b of buttons) {
        const el = document.createElement('button');
        el.textContent = b.label;
        Object.assign(el.style, { margin: '2px 4px 2px 0', font: 'inherit', cursor: 'pointer' });
        el.addEventListener('click', () => b.run());
        this.controls.append(el);
      }
    }
  }
}
