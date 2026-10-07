/**
 * Palimpsest: boot. Creates the renderer, input, audio, menus and debug overlay,
 * applies the player's settings, then runs the current scene.
 */

import './i18n/strings';
import { AudioEngine } from './audio/engine';
import { CHAPTER_ONE_ABILITIES } from './battle/data';
import { DebugOverlay } from './debug/overlay';
import { detectQuality, quality } from './engine/diorama/quality';
import { WorldRenderer } from './engine/diorama/renderer';
import { Input } from './engine/input';
import { prefs } from './engine/prefs';
import type { Scene } from './engine/scene';
import { session } from './engine/session';
import { type Settings, TEXT_SPEEDS } from './engine/settings';
import { TouchControls } from './engine/touch';
import { detectLanguage, setLang, t } from './i18n/i18n';
import { Menu } from './menu/menu';
import { equipmentPage, type MenuDeps, partyPage, settingsPage } from './menu/pages';
import { SeaGateScene } from './scenes/seaGate';

function boot(): void {
  const canvas = document.getElementById('page') as HTMLCanvasElement;
  const loading = document.getElementById('loading');
  const detected = detectQuality();
  const settings = session.settings;
  const first = settings.value.graphics.quality;
  const renderer = new WorldRenderer(canvas, first === 'auto' ? detected : quality(first));
  const input = new Input();
  input.attach(window);
  const touch = new TouchControls(input);
  const audio = new AudioEngine();
  input.onGesture(() => audio.start());

  // Everything a setting changes, applied now and whenever it changes.
  const apply = (s: Settings) => {
    setLang(s.language === 'auto' ? detectLanguage(navigator.languages ?? [navigator.language]) : s.language);
    document.title = 'Palimpsest';
    const rot = document.querySelector('#rotate .text');
    if (rot) rot.textContent = t('rotate');
    audio.setVolumes(s.audio);
    const tier = s.graphics.quality === 'auto' ? detected.tier : s.graphics.quality;
    if (tier !== renderer.quality.tier) renderer.setQuality(quality(tier));
    Object.assign(renderer.enabled, { shadows: s.graphics.shadows, reflections: s.graphics.reflections, bloom: s.graphics.bloom, dof: s.graphics.dof, fog: s.graphics.fog });
    renderer.brightness = s.graphics.brightness;
    renderer.grainOn = s.graphics.grain;
    renderer.flashScale = s.access.flashes ? 1 : 0.25;
    if ((s.graphics.resolution === 'auto' ? null : s.graphics.resolution) !== renderer.fixedScale) renderer.setFixedScale(s.graphics.resolution === 'auto' ? null : s.graphics.resolution);
    input.keys = structuredClone(s.controls.keys);
    input.pad = structuredClone(s.controls.pad);
    touch.configure({ size: s.controls.touchSize, opacity: s.controls.touchOpacity, leftHanded: s.controls.leftHanded });
    Object.assign(prefs, {
      textCps: TEXT_SPEEDS[s.gameplay.textSpeed],
      largeText: s.access.textSize === 'large',
      shake: s.access.shake ? 1 : 0,
      flashes: s.access.flashes ? 1 : 0.25,
      battleFast: s.gameplay.battleSpeed === 'fast',
      gentle: s.gameplay.gentle,
    });
  };
  apply(settings.value);
  settings.onChange(apply);

  // The game in progress (until the title screen and saves drive it).
  const game = session.game;
  game.party = ['isot', 'hild'];
  game.abilities = { ...CHAPTER_ONE_ABILITIES };
  game.inventory = ['wystansPumice', 'psalterChain', 'ebbShell'];
  game.equipment.isot.charm = 'wystansPumice';
  game.equipment.hild.relic = 'psalterChain';

  let scene: Scene = new SeaGateScene(renderer, input, audio);
  const menu = new Menu(input, audio);
  const deps: MenuDeps = { menu, settings, game: () => session.game, input, autoTier: () => detected.tier };
  const openPause = () => {
    input.frozen = true;
    menu.layout(renderer.viewport);
    menu.show([
      { label: () => t('menu.resume'), run: () => menu.close() },
      { label: () => t('menu.party'), page: () => partyPage(deps) },
      { label: () => t('menu.equipment'), page: () => equipmentPage(deps) },
      { label: () => t('menu.settings'), page: () => settingsPage(deps) },
      {
        label: () => t('menu.save'),
        run: () => menu.toast(session.saves.save('manual', session.game) ? t('menu.saved') : '—'),
      },
      {
        label: () => t('menu.title'),
        page: () => ({
          title: () => t('menu.title'),
          help: () => t('menu.confirmTitle'),
          rows: () => [
            { el: rowEl(t('menu.no')), focus: true, activate: () => menu.back() },
            { el: rowEl(t('menu.yes')), focus: true, activate: () => location.reload() },
          ],
        }),
      },
    ]);
  };
  menu.onClose = () => {
    input.frozen = false;
  };
  input.router = (a) => {
    if (menu.open) return menu.handle(a);
    if (a === 'menu' && scene.pausable !== false) {
      openPause();
      return true;
    }
    return false;
  };

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

  window.addEventListener('resize', () => {
    renderer.resize();
    menu.layout(renderer.viewport);
  });

  let last = performance.now();
  const frame = (now: number) => {
    const ms = now - last;
    const dt = Math.min(0.05, ms / 1000);
    last = now;
    input.pollGamepads();
    // The world holds still while the menu is open; it still draws behind the blur.
    if (!menu.open) scene.update(dt);
    scene.sync();
    renderer.render(menu.open ? 0 : dt);
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
  requestAnimationFrame((tm) => {
    last = tm;
    loading?.remove();
    frame(tm);
  });

  // Exposed for debugging from the browser console and automated screenshots.
  (window as unknown as { palimpsest: object }).palimpsest = {
    renderer,
    input,
    audio,
    advance,
    menu,
    openPause,
    session,
    get scene(): Scene {
      return scene;
    },
    set scene(s: Scene) {
      scene = s;
    },
  };
}

function rowEl(label: string): HTMLElement {
  const r = document.createElement('div');
  r.className = 'row';
  const l = document.createElement('span');
  l.className = 'label';
  l.textContent = label;
  r.append(l);
  return r;
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
