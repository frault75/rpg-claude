/**
 * Input. Keyboard, mouse, touch and gamepad all become the same actions. Keys are read
 * by physical position (KeyboardEvent.code), so the default WASD is ZQSD on an AZERTY
 * keyboard; every gameplay action can be rebound, on the keyboard and on the gamepad.
 */

export type Action =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'confirm'
  | 'cancel'
  | 'menu'
  | 'rake'
  | 'journal'
  | 'debug'
  | 'debugMenu'
  | 'fray'
  | 'mute'
  | 'n1'
  | 'n2'
  | 'n3'
  | 'n4'
  | 'n5';

/** Actions the player can rebind. */
export const BINDABLE = ['up', 'down', 'left', 'right', 'confirm', 'cancel', 'menu', 'rake', 'journal'] as const;
export type Bindable = (typeof BINDABLE)[number];
export type KeyBindings = Record<Bindable, string[]>;
export type PadBindings = Record<Bindable, number[]>;

export const DEFAULT_KEYS: KeyBindings = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  confirm: ['Enter', 'Space', 'KeyE', 'NumpadEnter'],
  cancel: ['Backspace', 'KeyX'],
  menu: ['Escape', 'Tab'],
  rake: ['KeyR'],
  journal: ['KeyJ'],
};

/** Standard gamepad mapping: 0 A, 1 B, 3 Y, 8 Select, 9 Start, 12–15 the d-pad. */
export const DEFAULT_PAD: PadBindings = {
  up: [12],
  down: [13],
  left: [14],
  right: [15],
  confirm: [0],
  cancel: [1],
  menu: [9],
  rake: [3],
  journal: [8],
};

const FIXED_CODES: Record<string, Action> = {
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

/** Map a key event to an action. Pure, so it can be tested without a browser. */
export function actionFor(code: string, key: string, shift: boolean, keys: KeyBindings = DEFAULT_KEYS): Action | null {
  if (code === 'Backquote' || code === 'IntlBackslash') return shift ? 'debugMenu' : 'debug';
  for (const a of BINDABLE) if (keys[a].includes(code)) return a;
  const fixed = FIXED_CODES[code];
  if (fixed) return fixed;
  const k = key.toLowerCase();
  if (k === 'm') return 'mute';
  if (k === 'f') return 'fray';
  return null;
}

/** A readable name for a key code ("KeyW" → "W", "ArrowUp" → "↑"). */
export function keyLabel(code: string): string {
  const special: Record<string, string> = {
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    Space: 'Space',
    Enter: 'Enter',
    NumpadEnter: 'Enter',
    Escape: 'Esc',
    Backspace: '⌫',
    Tab: 'Tab',
    ShiftLeft: 'Shift',
    ShiftRight: 'Shift',
    ControlLeft: 'Ctrl',
    ControlRight: 'Ctrl',
  };
  if (special[code]) return special[code]!;
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}

/** A readable name for a standard-mapping gamepad button. */
export function padLabel(button: number): string {
  return ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Select', 'Start', 'L3', 'R3', 'D↑', 'D↓', 'D←', 'D→', 'Home'][button] ?? `#${button}`;
}

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
  keys: KeyBindings = structuredClone(DEFAULT_KEYS);
  pad: PadBindings = structuredClone(DEFAULT_PAD);
  /** While set, the next key press goes here instead of becoming an action (rebinding). */
  private keyCapture: ((code: string) => void) | null = null;
  private padCapture: ((button: number) => void) | null = null;
  private padPrev = new Set<number>();
  /** Pause gameplay input (a menu is open): actions still fire, movement reads zero. */
  frozen = false;
  /** Sees every action first (the menus); returning true keeps it from the scene. */
  router: ((a: Action) => boolean) | null = null;
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
      if ((e.target as HTMLElement | null)?.closest?.('#debug-overlay, #debug-menu, #menu, #touch-controls')) return;
      if (e.button === 2) this.held.add('rake');
      for (const l of this.pointerListeners) l(e.clientX, e.clientY, e.button);
    });
    target.addEventListener('pointerup', (e) => {
      if (e.button === 2) this.held.delete('rake');
    });
    target.addEventListener('contextmenu', (e) => e.preventDefault());
    target.addEventListener('keydown', (e) => {
      this.gesture();
      if (this.keyCapture) {
        e.preventDefault();
        const c = this.keyCapture;
        this.keyCapture = null;
        c(e.code);
        return;
      }
      const a = actionFor(e.code, e.key, e.shiftKey, this.keys);
      if (!a) return;
      if (a === 'debug' || a === 'debugMenu' || a === 'menu' || e.code.startsWith('Arrow') || e.code === 'Space' || e.code === 'Backspace') e.preventDefault();
      if (!e.repeat) this.press(a);
      this.held.add(a);
    });
    target.addEventListener('keyup', (e) => {
      const a = actionFor(e.code, e.key, e.shiftKey, this.keys);
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

  /** Wait for the next key (for rebinding). */
  captureKey(fn: (code: string) => void): void {
    this.keyCapture = fn;
  }

  /** Wait for the next gamepad button (for rebinding). */
  capturePad(fn: (button: number) => void): void {
    this.padCapture = fn;
  }

  cancelCapture(): void {
    this.keyCapture = null;
    this.padCapture = null;
  }

  /** The direction to walk this frame: keys, then gamepad stick, then touch stick. */
  move(): Axis {
    if (this.frozen) return { x: 0, y: 0 };
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
    const buttons = new Set<number>();
    this.padAxis = { x: 0, y: 0 };
    for (const pad of pads) {
      if (!pad) continue;
      const [ax = 0, ay = 0] = pad.axes;
      if (Math.hypot(ax, ay) > 0.22) this.padAxis = { x: ax, y: ay };
      pad.buttons.forEach((b, i) => {
        if (b.pressed) buttons.add(i);
      });
      // The stick also drives menus, as presses.
      if (ax < -0.6) now.add('left');
      if (ax > 0.6) now.add('right');
      if (ay < -0.6) now.add('up');
      if (ay > 0.6) now.add('down');
    }
    if (this.padCapture) {
      for (const b of buttons) {
        if (!this.padPrev.has(b)) {
          const c = this.padCapture;
          this.padCapture = null;
          this.padPrev = buttons;
          c(b);
          return;
        }
      }
      this.padPrev = buttons;
      return;
    }
    this.padPrev = buttons;
    for (const a of BINDABLE) if (this.pad[a].some((b) => buttons.has(b))) now.add(a);
    const d = (a: Bindable) => (this.pad[a].some((b) => buttons.has(b)) ? 1 : 0);
    const dx = d('right') - d('left');
    const dy = d('down') - d('up');
    if (dx || dy) this.padAxis = { x: dx, y: dy };
    for (const a of now) if (!this.padHeld.has(a)) this.press(a);
    this.padHeld.clear();
    for (const a of now) this.padHeld.add(a);
  }

  private press(a: Action): void {
    if (this.router?.(a)) return;
    this.pressedQueue.push(a);
    for (const l of this.listeners) l(a);
  }

  private gesture(): void {
    if (this.gestured) return;
    this.gestured = true;
    for (const fn of this.gestureListeners.splice(0)) fn();
  }
}
