/**
 * The game fills the screen on phones and tablets, and the page never zooms.
 *
 * - Full screen: where the browser allows it (Android, iPad, desktops), the first touch
 *   puts the game in full screen and locks it sideways, and a later touch puts it back if
 *   the player left it. The setting turns this off, and on a desk enters or leaves it.
 * - iPhone Safari has no full screen for a page; there the game, added to the home screen,
 *   opens full screen by itself (the manifest and the apple-mobile-web-app tags).
 * - No zoom: the viewport tag asks for none, but iOS ignores it, so pinches and double
 *   taps are refused here as well.
 */

type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void };
type FsEl = HTMLElement & { webkitRequestFullscreen?: (opts?: unknown) => Promise<void> | void };

const doc = document as FsDoc;

/** Can this browser put a page in full screen at all? */
export function canFullscreen(): boolean {
  const el = document.documentElement as FsEl;
  return !!(el.requestFullscreen || el.webkitRequestFullscreen);
}

export function isFullscreen(): boolean {
  return !!(doc.fullscreenElement ?? doc.webkitFullscreenElement);
}

/** Opened from the home screen (an installed web app): already full screen. */
export function isStandalone(): boolean {
  return matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** An iPhone or iPod in Safari: the one place full screen means "add to the home screen". */
export function needsHomeScreen(): boolean {
  return /iPhone|iPod/.test(navigator.userAgent) && !isStandalone() && !canFullscreen();
}

export async function enterFullscreen(): Promise<void> {
  if (isFullscreen() || !canFullscreen()) return;
  const el = document.documentElement as FsEl;
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    else await el.webkitRequestFullscreen?.();
    // Sideways, as the game is laid out; only some browsers allow it, and only in full screen.
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await o?.lock?.('landscape').catch(() => {});
  } catch {
    // Refused (no gesture, or the browser said no): the game still plays in the page.
  }
}

export async function exitFullscreen(): Promise<void> {
  if (!isFullscreen()) return;
  try {
    if (document.exitFullscreen) await document.exitFullscreen();
    else await doc.webkitExitFullscreen?.();
  } catch {
    // Nothing to do.
  }
}

/**
 * Keep the page from zooming, and on a touch screen go full screen on a touch while
 * `wanted()` says so. Returns a function that undoes it (for tests).
 */
export function installScreenGuards(wanted: () => boolean): () => void {
  const off: (() => void)[] = [];
  const on = <K extends keyof DocumentEventMap>(type: K, fn: (e: DocumentEventMap[K]) => void, opts: AddEventListenerOptions = { passive: false }) => {
    document.addEventListener(type, fn, opts);
    off.push(() => document.removeEventListener(type, fn, opts));
  };
  // iOS pinch-zoom (Safari's own gesture events).
  for (const g of ['gesturestart', 'gesturechange', 'gestureend'])
    on(g as keyof DocumentEventMap, (e) => e.preventDefault());
  // Two fingers moving: a pinch, never a scroll the game wants.
  on('touchmove', (e) => {
    if ((e as TouchEvent).touches.length > 1) e.preventDefault();
  });
  // A double tap zooms on iOS whatever the viewport says. On the game itself (the canvas and
  // the touch buttons, which listen for pointer events) a second quick tap is refused; the
  // menus, which listen for clicks, are left alone and do not zoom (touch-action).
  let lastTap = 0;
  on('touchend', (e) => {
    const now = e.timeStamp;
    const target = e.target as Element | null;
    const inMenu = !!target?.closest?.('#menu, #title-menu, #debug');
    if (!inMenu && now - lastTap < 350) e.preventDefault();
    lastTap = now;
  });
  on('dblclick', (e) => e.preventDefault());
  // Full screen on a touch, where it is wanted and allowed. Browsers count a touch as a
  // user's gesture when the finger lifts, not when it lands.
  on(
    'pointerup',
    (e) => {
      if (e.pointerType === 'touch' && wanted() && !isFullscreen()) void enterFullscreen();
    },
    { capture: true, passive: true },
  );
  return () => off.forEach((f) => f());
}
