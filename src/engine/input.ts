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

export class Input {
  private readonly held = new Set<Action>();
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
    return this.held.has(a) || this.padHeld.has(a);
  }

  /** Actions pressed since the last call. */
  drain(): Action[] {
    return this.pressedQueue.splice(0, this.pressedQueue.length);
  }

  /** Poll gamepads once per frame. */
  pollGamepads(): void {
    const pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
    const now = new Set<Action>();
    for (const pad of pads) {
      if (!pad) continue;
      const [ax = 0, ay = 0] = pad.axes;
      if (ax < -0.4) now.add('left');
      if (ax > 0.4) now.add('right');
      if (ay < -0.4) now.add('up');
      if (ay > 0.4) now.add('down');
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
