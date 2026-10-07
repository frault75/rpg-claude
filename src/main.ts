/**
 * Palimpsest: boot. Creates the page renderer, input, audio and debug overlay, then runs
 * the current scene. Milestone (a) has a single scene: the test leaf.
 */

import { ART_FLAGS, ART_TIMINGS } from './art/illuminator';
import { spriteGlobals } from './art/sprite';
import { AudioEngine } from './audio/engine';
import { DebugOverlay } from './debug/overlay';
import { Input } from './engine/input';
import { PageRenderer } from './engine/renderer';
import type { Scene } from './engine/scene';
import { TestLeaf } from './scenes/testLeaf';

function boot(): void {
  const canvas = document.getElementById('page') as HTMLCanvasElement;
  const loading = document.getElementById('loading');
  const renderer = new PageRenderer(canvas);
  const input = new Input();
  input.attach(window);
  const audio = new AudioEngine();
  input.onGesture(() => audio.start());

  let scene: Scene = new TestLeaf(renderer, input, audio);
  const debug = new DebugOverlay({
    post: renderer.post,
    shimmer: () => spriteGlobals.uShimmer.value > 0,
    setShimmer: (on) => (spriteGlobals.uShimmer.value = on ? 1 : 0),
    buttons: () => scene.debugButtons(),
  });
  input.onAction((a) => {
    if (a === 'debug' || a === 'debugMenu') debug.toggle();
  });
  if (new URLSearchParams(location.search).has('debug')) debug.toggle();

  window.addEventListener('resize', () => renderer.resize());

  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    input.pollGamepads();
    // The gold catches a light that drifts slowly, as if the book were turned in the hands.
    const t = now / 1000;
    const a = 2.3 + 0.32 * Math.sin(t * 0.13) + 0.12 * Math.sin(t * 0.37);
    spriteGlobals.uLight.value.set(Math.cos(a) * 0.85, Math.sin(a) * 0.85);
    scene.update(dt);
    scene.sync();
    renderer.render();
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
    artTimings: ART_TIMINGS,
    artFlags: ART_FLAGS,
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
    loading.textContent = `The page could not be prepared: ${err instanceof Error ? err.message : String(err)}. This game needs WebGL.`;
  }
  throw err;
}
