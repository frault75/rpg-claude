/**
 * Palimpsest: boot. Creates the renderer, input, audio and debug overlay, then runs the
 * current scene.
 */

import { AudioEngine } from './audio/engine';
import { DebugOverlay } from './debug/overlay';
import { WorldRenderer } from './engine/diorama/renderer';
import { Input } from './engine/input';
import type { Scene } from './engine/scene';
import { TouchControls } from './engine/touch';
import { SeaGateScene } from './scenes/seaGate';

function boot(): void {
  const canvas = document.getElementById('page') as HTMLCanvasElement;
  const loading = document.getElementById('loading');
  const renderer = new WorldRenderer(canvas);
  const input = new Input();
  input.attach(window);
  new TouchControls(input);
  const audio = new AudioEngine();
  input.onGesture(() => audio.start());

  let scene: Scene = new SeaGateScene(renderer, input, audio);
  const debug = new DebugOverlay({
    toggles: () =>
      (Object.keys(renderer.enabled) as (keyof typeof renderer.enabled)[]).map((k) => ({
        label: k,
        get: () => renderer.enabled[k],
        set: (on: boolean) => (renderer.enabled[k] = on),
      })),
    buttons: () => scene.debugButtons(),
  });
  input.onAction((a) => {
    if (a === 'debug' || a === 'debugMenu') debug.toggle();
    if (a === 'mute') audio.toggleMute();
  });
  if (new URLSearchParams(location.search).has('debug')) debug.toggle();

  window.addEventListener('resize', () => renderer.resize());

  let last = performance.now();
  const frame = (now: number) => {
    const ms = now - last;
    const dt = Math.min(0.05, ms / 1000);
    last = now;
    input.pollGamepads();
    scene.update(dt);
    scene.sync();
    renderer.render(dt);
    renderer.frameTime(ms);
    debug.frame(dt, () => scene.debugInfo());
    requestAnimationFrame(frame);
  };
  /** Run the game forward by `seconds` without waiting for frames (tests and screenshots). */
  const advance = (seconds: number) => {
    const steps = Math.round(seconds * 30);
    for (let i = 0; i < steps; i++) {
      scene.update(1 / 30);
      renderer.time += 1 / 30;
    }
  };
  requestAnimationFrame((t) => {
    last = t;
    loading?.remove();
    frame(t);
  });

  // Exposed for debugging from the browser console and automated screenshots.
  (window as unknown as { palimpsest: object }).palimpsest = {
    renderer,
    input,
    audio,
    advance,
    get scene(): Scene {
      return scene;
    },
    set scene(s: Scene) {
      scene = s;
    },
  };
}

// Installable and playable offline (the service worker is written at build time).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined));
}

try {
  boot();
} catch (err) {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.className = 'error';
    loading.textContent = `The game could not start: ${err instanceof Error ? err.message : String(err)}. This game needs WebGL 2.`;
  }
  throw err;
}
