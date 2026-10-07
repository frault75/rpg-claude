/**
 * Touch controls for phones and tablets: a virtual stick that appears wherever the left
 * thumb lands, A and B buttons on the right, and taps anywhere else (to advance dialogue
 * or walk to a spot). They appear on the first touch and stay out of the way of mice.
 */

import type { Input } from './input';

const STICK_RADIUS = 56;

export class TouchControls {
  private readonly root: HTMLDivElement;
  private readonly base: HTMLDivElement;
  private readonly knob: HTMLDivElement;
  private stickId: number | null = null;
  private stickOrigin = { x: 0, y: 0 };
  private readonly taps = new Map<number, { x: number; y: number; t: number }>();
  private shown = false;

  constructor(private readonly input: Input) {
    this.root = document.createElement('div');
    this.root.id = 'touch-controls';
    Object.assign(this.root.style, { position: 'fixed', inset: '0', touchAction: 'none', zIndex: '5', display: 'none', userSelect: 'none', webkitUserSelect: 'none' } satisfies Partial<CSSStyleDeclaration>);
    this.base = this.disc(STICK_RADIUS * 2, 'rgba(20, 34, 80, 0.35)', 'rgba(232, 199, 106, 0.55)');
    this.knob = this.disc(48, 'rgba(232, 199, 106, 0.55)', 'rgba(255, 240, 192, 0.9)');
    this.base.style.display = this.knob.style.display = 'none';
    this.root.append(this.base, this.knob);
    this.button('A', 'confirm', 86, 120, 74);
    this.button('B', 'cancel', 24, 70, 56);
    document.body.append(this.root);

    // The first touch anywhere reveals the controls (and still counts as a tap).
    window.addEventListener(
      'pointerdown',
      (e) => {
        if (e.pointerType === 'touch') this.show();
      },
      { capture: true },
    );
    this.root.addEventListener('pointerdown', (e) => this.down(e));
    this.root.addEventListener('pointermove', (e) => this.move(e));
    this.root.addEventListener('pointerup', (e) => this.up(e));
    this.root.addEventListener('pointercancel', (e) => this.up(e));
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private disc(size: number, fill: string, ring: string): HTMLDivElement {
    const d = document.createElement('div');
    Object.assign(d.style, {
      position: 'absolute',
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      background: fill,
      border: `2px solid ${ring}`,
      boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
    } satisfies Partial<CSSStyleDeclaration>);
    return d;
  }

  private button(label: string, action: 'confirm' | 'cancel', right: number, bottom: number, size: number): void {
    const b = document.createElement('div');
    b.textContent = label;
    Object.assign(b.style, {
      position: 'absolute',
      right: `${right}px`,
      bottom: `${bottom}px`,
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      background: 'radial-gradient(circle at 35% 30%, rgba(60, 96, 190, 0.75), rgba(14, 26, 68, 0.75))',
      border: '2px solid rgba(232, 199, 106, 0.85)',
      color: '#F4E2A8',
      font: `600 ${Math.round(size * 0.42)}px 'Palatino Linotype', 'Book Antiqua', Palatino, serif`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 3px 12px rgba(0,0,0,0.45)',
      touchAction: 'none',
    } satisfies Partial<CSSStyleDeclaration>);
    const press = (e: PointerEvent, down: boolean) => {
      e.preventDefault();
      e.stopPropagation();
      b.style.filter = down ? 'brightness(1.4)' : '';
      this.input.hold(action, down);
    };
    b.addEventListener('pointerdown', (e) => press(e, true));
    b.addEventListener('pointerup', (e) => press(e, false));
    b.addEventListener('pointercancel', (e) => press(e, false));
    b.addEventListener('pointerleave', (e) => press(e, false));
    this.root.append(b);
  }

  show(): void {
    if (this.shown) return;
    this.shown = true;
    this.root.style.display = 'block';
  }

  private down(e: PointerEvent): void {
    e.preventDefault();
    e.stopPropagation();
    if (this.stickId === null && e.clientX < window.innerWidth * 0.45) {
      this.stickId = e.pointerId;
      this.stickOrigin = { x: e.clientX, y: e.clientY };
      this.place(this.base, e.clientX, e.clientY);
      this.place(this.knob, e.clientX, e.clientY);
      this.base.style.display = this.knob.style.display = 'block';
    }
    this.taps.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() });
    this.root.setPointerCapture?.(e.pointerId);
  }

  private move(e: PointerEvent): void {
    if (e.pointerId !== this.stickId) return;
    e.preventDefault();
    let dx = e.clientX - this.stickOrigin.x;
    let dy = e.clientY - this.stickOrigin.y;
    const d = Math.hypot(dx, dy);
    if (d > STICK_RADIUS) {
      dx = (dx / d) * STICK_RADIUS;
      dy = (dy / d) * STICK_RADIUS;
    }
    this.place(this.knob, this.stickOrigin.x + dx, this.stickOrigin.y + dy);
    // A small dead zone, then full speed quickly.
    const k = d < 8 ? 0 : Math.min(1, (d - 8) / (STICK_RADIUS * 0.6));
    this.input.touchAxis = d > 0 ? { x: (dx / Math.max(d, 1)) * k, y: (dy / Math.max(d, 1)) * k } : { x: 0, y: 0 };
  }

  private up(e: PointerEvent): void {
    e.stopPropagation();
    const tap = this.taps.get(e.pointerId);
    this.taps.delete(e.pointerId);
    if (e.pointerId === this.stickId) {
      this.stickId = null;
      this.input.touchAxis = { x: 0, y: 0 };
      this.base.style.display = this.knob.style.display = 'none';
    }
    // A short touch that hardly moved is a tap.
    if (tap && performance.now() - tap.t < 280 && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 14) this.input.tap(e.clientX, e.clientY);
  }

  private place(el: HTMLDivElement, x: number, y: number): void {
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }
}
