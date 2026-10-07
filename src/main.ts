/**
 * Palimpsest: boot. Creates the renderer, input, audio and debug overlay, then runs the
 * current scene.
 */

import { AudioEngine } from './audio/engine';
import { DebugOverlay } from './debug/overlay';
import { WorldRenderer } from './engine/hd2d/renderer';
import { Input } from './engine/input';
import type { Scene } from './engine/scene';
import { SeaGateScene } from './scenes/seaGate';

function boot(): void {
  const canvas = document.getElementById('page') as HTMLCanvasElement;
  const loading = document.getElementById('loading');
  const renderer = new WorldRenderer(canvas);
  const input = new Input();
  input.attach(window);
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
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    input.pollGamepads();
    scene.update(dt);
    scene.sync();
    renderer.render(dt);
    debug.frame(dt, () => scene.debugInfo());
    requestAnimationFrame(frame);
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
    get scene(): Scene {
      return scene;
    },
    set scene(s: Scene) {
      scene = s;
    },
  };
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
