/**
 * Input. Keyboard, mouse and gamepad are all turned into the same actions.
 * Movement and debug keys are read by physical position (KeyboardEvent.code), so WASD
 * is ZQSD on an AZERTY keyboard; letter shortcuts are read by the printed letter.
 */

export type Action =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'confirm'
  | 'cancel'
  | 'rake'
  | 'debug'
  | 'debugMenu'
  | 'fray'
  | 'mute'
  | 'n1'
  | 'n2'
  | 'n3'
  | 'n4'
  | 'n5'
  | 'journal';

const BY_CODE: Record<string, Action> = {
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Enter: 'confirm',
  NumpadEnter: 'confirm',
  Space: 'confirm',
  Escape: 'cancel',
  Digit1: 'n1',
  Digit2: 'n2',
  Digit3: 'n3',
  Digit4: 'n4',
  Digit5: 'n5',
  Numpad1: 'n1',
  Numpad2: 'n2',
  Numpad3: 'n3',
  Numpad4: 'n4',
  Numpad5: 'n5',
};

const BY_LETTER: Record<string, Action> = {
  e: 'confirm',
  r: 'rake',
  f: 'fray',
  m: 'mute',
  j: 'journal',
};

/** Map a key event to an action. Pure, so it can be tested without a browser. */
export function actionFor(code: string, key: string, shift: boolean): Action | null {
  if (code === 'Backquote' || code === 'IntlBackslash') return shift ? 'debugMenu' : 'debug';
  const byCode = BY_CODE[code];
  if (byCode) return byCode;
  return BY_LETTER[key.toLowerCase()] ?? null;
}

/** Gamepad buttons (standard mapping) to actions. */
const PAD_BUTTONS: Partial<Record<number, Action>> = {
  0: 'confirm',
  1: 'cancel',
  3: 'rake',
  9: 'cancel',
  12: 'up',
  13: 'down',
  14: 'left',
  15: 'right',
};

export interface Axis {
  x: number;
  y: number;
}

/** Combine digital keys, an analog stick and a touch stick into one movement, length <= 1. */
export function combineMove(keys: Axis, pad: Axis, touch: Axis): Axis {
  for (const a of [keys, pad, touch]) {
    const len = Math.hypot(a.x, a.y);
    if (len > 0.001) return len > 1 ? { x: a.x / len, y: a.y / len } : { x: a.x, y: a.y };
  }
  return { x: 0, y: 0 };
}

export class Input {
  private readonly held = new Set<Action>();
  /** Set by the touch controls: the virtual stick, -1..1 on each axis. */
  touchAxis: Axis = { x: 0, y: 0 };
  private padAxis: Axis = { x: 0, y: 0 };
  private readonly padHeld = new Set<Action>();
  private readonly pressedQueue: Action[] = [];
  private readonly listeners: ((a: Action) => void)[] = [];
  /** True once the player has pressed anything (browsers need a gesture before audio). */
  gestured = false;
  private readonly gestureListeners: (() => void)[] = [];

  private readonly pointerListeners: ((x: number, y: number, button: number) => void)[] = [];
  /** Last pointer position in window pixels. */
  pointer = { x: -1, y: -1 };

  /** Listen for clicks (window pixel coordinates); returns a function that stops listening. */
  onPointer(fn: (x: number, y: number, button: number) => void): () => void {
    this.pointerListeners.push(fn);
    return () => {
      const i = this.pointerListeners.indexOf(fn);
      if (i >= 0) this.pointerListeners.splice(i, 1);
    };
  }

  attach(target: Window): void {
    target.addEventListener('pointermove', (e) => {
      this.pointer = { x: e.clientX, y: e.clientY };
    });
    target.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement | null)?.closest?.('#debug-overlay, #debug-menu')) return;
      if (e.button === 2) this.held.add('rake');
      for (const l of this.pointerListeners) l(e.clientX, e.clientY, e.button);
    });
    target.addEventListener('pointerup', (e) => {
      if (e.button === 2) this.held.delete('rake');
    });
    target.addEventListener('contextmenu', (e) => e.preventDefault());
    target.addEventListener('keydown', (e) => {
      this.gesture();
      const a = actionFor(e.code, e.key, e.shiftKey);
      if (!a) return;
      if (a === 'debug' || a === 'debugMenu' || e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      if (!e.repeat) this.press(a);
      this.held.add(a);
    });
    target.addEventListener('keyup', (e) => {
      const a = actionFor(e.code, e.key, e.shiftKey);
      if (a) this.held.delete(a);
      // Releasing shift must also release the unshifted twin.
      if (e.code === 'Backquote') {
        this.held.delete('debug');
        this.held.delete('debugMenu');
      }
    });
    target.addEventListener('blur', () => this.held.clear());
    target.addEventListener('pointerdown', () => this.gesture());
  }

  onGesture(fn: () => void): void {
    if (this.gestured) fn();
    else this.gestureListeners.push(fn);
  }

  /** Listen for presses; returns a function that stops listening. */
  onAction(fn: (a: Action) => void): () => void {
    this.listeners.push(fn);
    return () => {
      const i = this.listeners.indexOf(fn);
      if (i >= 0) this.listeners.splice(i, 1);
    };
  }

  isHeld(a: Action): boolean {
    return this.held.has(a) || this.padHeld.has(a) || this.touchHeld.has(a);
  }

  private readonly touchHeld = new Set<Action>();

  /** Press or release an action from an on-screen button. */
  hold(a: Action, down: boolean): void {
    if (down && !this.touchHeld.has(a)) {
      this.touchHeld.add(a);
      this.gesture();
      this.press(a);
    } else if (!down) this.touchHeld.delete(a);
  }

  /** A tap on the screen (window pixels), as if clicked. */
  tap(x: number, y: number): void {
    this.gesture();
    for (const l of this.pointerListeners) l(x, y, 0);
  }

  /** The direction to walk this frame: keys, then gamepad stick, then touch stick. */
  move(): Axis {
    // Keyboard first (the pad's d-pad and stick come through padAxis, not as keys).
    const k = (a: Action) => (this.held.has(a) || this.touchHeld.has(a) ? 1 : 0);
    const keys = { x: k('right') - k('left'), y: k('down') - k('up') };
    return combineMove(keys, this.padAxis, this.touchAxis);
  }

  /** Actions pressed since the last call. */
  drain(): Action[] {
    return this.pressedQueue.splice(0, this.pressedQueue.length);
  }

  /** Poll gamepads once per frame. */
  pollGamepads(): void {
    const pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
    const now = new Set<Action>();
    this.padAxis = { x: 0, y: 0 };
    for (const pad of pads) {
      if (!pad) continue;
      const [ax = 0, ay = 0] = pad.axes;
      if (Math.hypot(ax, ay) > 0.22) this.padAxis = { x: ax, y: ay };
      const b = (i: number) => (pad.buttons[i]?.pressed ? 1 : 0);
      const dx = b(15) - b(14);
      const dy = b(13) - b(12);
      if (dx || dy) this.padAxis = { x: dx, y: dy };
      // The stick also drives menus, as presses.
      if (ax < -0.6) now.add('left');
      if (ax > 0.6) now.add('right');
      if (ay < -0.6) now.add('up');
      if (ay > 0.6) now.add('down');
      pad.buttons.forEach((b, i) => {
        const a = PAD_BUTTONS[i];
        if (a && b.pressed) now.add(a);
      });
    }
    for (const a of now) if (!this.padHeld.has(a)) this.press(a);
    this.padHeld.clear();
    for (const a of now) this.padHeld.add(a);
  }

  private press(a: Action): void {
    this.pressedQueue.push(a);
    for (const l of this.listeners) l(a);
  }

  private gesture(): void {
    if (this.gestured) return;
    this.gestured = true;
    for (const fn of this.gestureListeners.splice(0)) fn();
  }
}
