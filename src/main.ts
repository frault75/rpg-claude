/**
 * Palimpsest: boot. Creates the renderer, input, audio, menus and debug overlay,
 * applies the player's settings, then runs the current scene.
 */

import './i18n/strings';
import { AudioEngine } from './audio/engine';
import { CHAPTER_ONE_ABILITIES, REWARDS } from './battle/data';
import { spoilsOf } from './battle/growth';
import type { CharId } from './story/state';
import { DebugOverlay } from './debug/overlay';
import { detectQuality, quality } from './engine/diorama/quality';
import { WorldRenderer } from './engine/diorama/renderer';
import { Input } from './engine/input';
import { prefs } from './engine/prefs';
import type { Scene } from './engine/scene';
import { session } from './engine/session';
import { type Settings, TEXT_SPEEDS } from './engine/settings';
import { TouchControls } from './engine/touch';
import { detectLanguage, setLang, t, tr } from './i18n/i18n';
import { Menu } from './menu/menu';
import { equipmentPage, journalPage, type MenuDeps, newGamePage, partyPage, settingsPage, stallPage } from './menu/pages';
import { MAPS } from './maps/index';
import { BattleScene } from './scenes/battle';
import { type Arrival, MapScene } from './scenes/map';
import { InterludeScene } from './scenes/interlude';
import { PrologueScene } from './scenes/prologue';
import { SeaGateScene } from './scenes/seaGate';
import { TitleScene } from './scenes/title';
import { INTERLUDES } from './story/interludes';
import { lostNameText } from './story/lostNames';
import { newGame } from './story/state';

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
      difficulty: s.gameplay.difficulty,
    });
  };
  apply(settings.value);
  settings.onChange(apply);

  /** A new game: chapter I, in the scriptorium. */
  const startGame = () => {
    const game = newGame();
    game.map = 'scriptorium';
    game.party = ['isot'];
    // A deep copy: abilities learned later must never touch the starting lists.
    game.abilities = Object.fromEntries(Object.entries(CHAPTER_ONE_ABILITIES).map(([k, v]) => [k, [...v]])) as typeof game.abilities;
    // Wystan's pumice is Isot's already; Hild brings her chain. The rest are found (DESIGN.md §6).
    game.inventory = ['wystansPumice', 'psalterChain'];
    game.equipment.isot.charm = 'wystansPumice';
    game.equipment.hild.relic = 'psalterChain';
    session.game = game;
  };

  const menu = new Menu(input, audio);
  let scene: Scene;
  /** Fade to black, then swap scenes; the new scene fades itself in. */
  let fadeOut: { t: number; dur: number; next: () => Scene } | null = null;
  const transition = (next: () => Scene, dur = 1.1) => {
    if (!fadeOut) fadeOut = { t: 0, dur, next };
  };
  /** A fight, then back to wherever `after` leads. */
  const battle = (id: string, after: (won: boolean) => Scene): Scene => new BattleScene(renderer, input, audio, id, (end) => transition(() => after(end === 'victory'), 1.2));
  /** The Sea Gate, with its fight on the causeway. */
  const seaGate = (): Scene => {
    // A checkpoint: arriving at the Sea Gate saves the game.
    session.game.map = 'seaGate';
    session.saves.save('auto', session.game);
    return new SeaGateScene(renderer, input, audio, {
      end: () => transition(() => interlude(1), 2.4),
      battle: (id) =>
        transition(
          () =>
            battle(id, (won) => {
              if (won && !session.game.cleared.includes(id)) session.game.cleared.push(id);
              return seaGate();
            }),
          0.9,
        ),
    });
  };
  /** Any map by id; the Sea Gate keeps its own scene for now. */
  const mapScene = (id: string, arrival: Arrival): Scene => {
    if (id === 'seaGate') return seaGate();
    if (id === 'title') return toTitle();
    const def = MAPS[id];
    if (!def) throw new Error(`unknown map ${id}`);
    return new MapScene(renderer, input, audio, def, arrival, {
      goto: (map, spawn) => transition(() => mapScene(map, { spawn }), 0.8),
      interlude: (n) => transition(() => interlude(n), 1.8),
      shop: (stall) =>
        new Promise<void>((resolve) => {
          input.frozen = true;
          menu.onClose = () => {
            input.frozen = false;
            resolve();
          };
          menu.layout(renderer.viewport);
          menu.show([{ label: () => t('shop.title'), page: () => stallPage(deps, stall) }], 0);
        }),
      battle: (fight, back) =>
        transition(
          () =>
            battle(fight, (won) => {
              if (won && !session.game.cleared.includes(fight)) session.game.cleared.push(fight);
              return mapScene(back.map, { x: back.x, y: back.y, dir: back.dir, from: `${won ? 'battle' : 'retreat'}:${fight}` });
            }),
          0.9,
        ),
    });
  };
  /** A page of Isot's chronicle between chapters, then the next chapter's first map. */
  const interlude = (n: number): Scene =>
    new InterludeScene(
      renderer,
      input,
      audio,
      n,
      () => {
        const next = INTERLUDES[n]!.next;
        transition(() => mapScene(next.map, { spawn: next.spawn }), 1.2);
      },
      // The last page lists every Lost Name found, in red.
      INTERLUDES[n]?.finale ? session.game.lostNames.map((id) => tr(lostNameText(id, session.game))) : [],
    );
  const prologue = (): Scene => new PrologueScene(renderer, input, audio, () => transition(() => mapScene('scriptorium', { spawn: 'start' }), 0.6));
  const toTitle = (): Scene => {
    const title: TitleScene = new TitleScene(renderer, input, audio, {
      choices: () => [
        {
          label: () => t('title.new'),
          run: () => {
            title.hideMenu();
            // First, how hard the Book fights back; backing out returns to the title.
            let chosen = false;
            menu.layout(renderer.viewport);
            menu.show([{ label: () => t('newgame.title'), page: () => newGamePage(deps, () => ((chosen = true), menu.close())) }], 0);
            menu.onClose = () => {
              if (!chosen) return title.showMenu();
              transition(() => {
                startGame();
                return prologue();
              }, 1.6);
            };
          },
        },
        {
          // Once the story is finished, its save opens on the last page instead.
          label: () => t(session.saves.latest()?.state.flags.finished ? 'title.lastPage' : 'title.continue'),
          enabled: () => !!session.saves.latest(),
          run: () => {
            const save = session.saves.latest();
            if (!save) return;
            title.hideMenu();
            transition(() => {
              session.game = save.state;
              if (save.state.flags.finished) return interlude(5);
              return mapScene(save.state.map, { spawn: save.state.spawn || 'start' });
            });
          },
        },
        {
          label: () => t('title.settings'),
          run: () => {
            title.hideMenu();
            menu.layout(renderer.viewport);
            menu.show([{ label: () => t('menu.settings'), page: () => settingsPage(deps) }], 0);
            menu.onClose = () => title.showMenu();
          },
        },
        {
          label: () => t('title.credits'),
          run: () => {
            title.hideMenu();
            menu.layout(renderer.viewport);
            menu.show([{ label: () => t('title.credits'), page: () => ({ title: () => t('title.credits'), rows: () => [infoRowHtml(t('credits.body'))] }) }], 0);
            menu.onClose = () => title.showMenu();
          },
        },
      ],
    });
    return title;
  };
  const deps: MenuDeps = { menu, settings, game: () => session.game, input, autoTier: () => detected.tier };
  /** The experience and pennies of the fights already marked won (the debug jumps skip them). */
  const settle = () => Object.assign(session.game, spoilsOf(session.game.cleared));
  /** The state at the start of chapter II: the whole party, chapter I behind them. */
  const chapterTwo = (): void => {
    startGame();
    session.game.party = ['isot', 'hild', 'whit'];
    session.game.cleared.push('f1', 'f2', 'b1');
    settle();
    session.game.chapter = 2;
    session.game.inventory.push('lampBlack', 'anchorStone', 'blankPennon', 'ebbShell');
    session.game.equipment.whit.relic = 'blankPennon';
  };
  /** The state at the start of chapter III: Lychford behind them, its abilities learned. */
  const chapterThree = (): void => {
    chapterTwo();
    const g = session.game;
    g.cleared.push('f3', 'f4', 'b2');
    settle();
    g.chapter = 3;
    g.inventory.push('bellClapper');
    g.abilities.isot.push('emend');
    g.abilities.hild.push('immure');
    g.abilities.whit.push('vigil');
    Object.assign(g.flags, { learnedEmend: true, learnedImmure: true, bellRung: true, raidDone: true, crossed: true });
  };
  /** Ready to fight an encounter directly (debug menu, ?scene=battle): its chapter's party and abilities. */
  const fightState = (id: string): void => {
    const ch5 = ['f9', 'b5'].includes(id);
    const ch4 = ['f7', 'f8', 'b4'].includes(id) || ch5;
    const ch3 = ['f5', 'f6', 'b3'].includes(id) || ch4;
    const ch2 = ['f3', 'f4', 'b2'].includes(id);
    if (ch5) chapterFive();
    else if (ch4) chapterFour();
    else if (ch3) chapterThree();
    else if (ch2) chapterTwo();
    else startGame();
    const g = session.game;
    g.party = ['isot', 'hild', 'whit'];
    const learn = (c: CharId, a: string) => {
      if (!g.abilities[c].includes(a)) g.abilities[c].push(a);
    };
    if (ch2 || ch3) {
      learn('isot', 'emend');
      learn('hild', 'immure');
      learn('whit', 'vigil');
    }
    if (id === 'f6' || id === 'b3' || ch4) learn('hild', 'squint');
    if (id === 'b3' || ch4) g.flags.emendUpgraded = true;
    if (ch4) learn('whit', 'read');
    if (id === 'b4' || ch5) learn('isot', 'rubric');
    if (id === 'b5') {
      learn('hild', 'benison');
      learn('isot', 'inscribe');
    }
    // As strong as the story makes them by this fight.
    const order = Object.keys(REWARDS);
    Object.assign(g, spoilsOf(order.slice(0, Math.max(0, order.indexOf(id)))));
  };
  /** The state at the start of chapter IV: the Blanchwood behind them, Whit able to read. */
  const chapterFour = (): void => {
    chapterThree();
    const g = session.game;
    g.cleared.push('f5', 'f6', 'b3');
    settle();
    g.chapter = 4;
    g.abilities.hild.push('squint');
    g.abilities.whit.push('read');
    Object.assign(g.flags, { emendUpgraded: true, finisRead: true, muralRestored: true, escaped: true, blanchingBegun: true });
    g.lostNames.push('maud', 'gervase');
  };
  /** The state at the start of chapter V: out of the Margin, Rubric learned, Ermeline named. */
  const chapterFive = (): void => {
    chapterFour();
    const g = session.game;
    g.cleared.push('f7', 'b4');
    settle();
    g.chapter = 5;
    g.inventory.push('vermilionPot');
    g.abilities.isot.push('rubric');
    Object.assign(g.flags, { steppedOff: true, cw4: true, f7Done: true, wystanMet: true, confessed: true, fallOfNames: true, ermelineOut: true, inkhornFilled: true });
    g.lostNames.push('fishers');
  };
  const params = new URLSearchParams(location.search);
  const mapParam = params.get('map');
  if (mapParam && MAPS[mapParam]) {
    // ?chapter=2 or 3 starts with the whole party and what it knows by then.
    const chapter = Number(params.get('chapter') ?? 1);
    if (chapter >= 5) chapterFive();
    else if (chapter >= 4) chapterFour();
    else if (chapter >= 3) chapterThree();
    else if (chapter >= 2) chapterTwo();
    else startGame();
    scene = mapScene(mapParam, { spawn: params.get('spawn') ?? 'start' });
  } else if (params.get('scene') === 'battle') {
    const id = params.get('fight') ?? 'b1';
    fightState(id);
    const again = (): Scene => battle(id, again);
    scene = again();
  } else if (params.get('scene') === 'seagate') {
    startGame();
    session.game.party = ['isot', 'hild'];
    scene = seaGate();
  } else if (params.get('scene') === 'interlude') {
    const n = Number(params.get('n') ?? 1);
    if (n >= 4) chapterFour();
    else if (n >= 3) chapterThree();
    else if (n >= 2) chapterTwo();
    else startGame();
    session.game.chapter = n + 1;
    scene = interlude(n);
  } else if (params.get('scene') === 'prologue') {
    startGame();
    scene = prologue();
  } else scene = toTitle();
  /** The pause menu; `start` opens straight onto one of its pages (the Journal, from J). */
  const openPause = (start?: number) => {
    input.frozen = true;
    menu.onClose = pauseClosed;
    menu.layout(renderer.viewport);
    menu.show([
      { label: () => t('menu.resume'), run: () => menu.close() },
      { label: () => t('menu.party'), page: () => partyPage(deps) },
      { label: () => t('menu.equipment'), page: () => equipmentPage(deps) },
      { label: () => t('menu.journal'), page: () => journalPage(deps) },
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
            {
              el: rowEl(t('menu.yes')),
              focus: true,
              activate: () => {
                menu.close();
                transition(toTitle);
              },
            },
          ],
        }),
      },
    ], start);
  };
  const JOURNAL = 3;
  const pauseClosed = () => {
    input.frozen = false;
  };
  input.router = (a) => {
    if (menu.open) return menu.handle(a);
    if (a === 'menu' && scene.pausable !== false) {
      openPause();
      return true;
    }
    if (a === 'journal' && scene.pausable !== false) {
      openPause(JOURNAL);
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
    buttons: () => [
      ...scene.debugButtons(),
      // Jump anywhere the story reaches.
      { label: '→ title', run: () => transition(toTitle, 0.3) },
      { label: '→ prologue', run: () => transition(() => (startGame(), prologue()), 0.3) },
      ...[1, 2, 3, 4, 5].map((n) => ({ label: `→ interlude ${['I', 'II', 'III', 'IV', 'V (the last page)'][n - 1]}`, run: () => transition(() => interlude(n), 0.3) })),
      { label: '→ scriptorium', run: () => transition(() => (startGame(), mapScene('scriptorium', { spawn: 'start' })), 0.3) },
      { label: '→ sea gate', run: () => transition(() => (startGame(), (session.game.party = ['isot', 'hild']), seaGate()), 0.3) },
      { label: '→ lychford', run: () => transition(() => (chapterTwo(), mapScene('lane', { spawn: 'start' })), 0.3) },
      {
        label: '→ bell tower',
        run: () =>
          transition(() => {
            chapterTwo();
            session.game.cleared.push('f3', 'f4');
            settle();
            Object.assign(session.game.flags, { learnedEmend: true, pilgrimsPassed: true, rhyme: true, learnedImmure: true });
            session.game.abilities.isot.push('emend');
            session.game.abilities.hild.push('immure');
            return mapScene('belltower', { spawn: 'door' });
          }, 0.3),
      },
      { label: '→ blanchwood', run: () => transition(() => (chapterThree(), mapScene('wood', { spawn: 'start' })), 0.3) },
      {
        label: '→ knell chapel',
        run: () =>
          transition(() => {
            chapterThree();
            session.game.cleared.push('f5', 'f6');
            settle();
            session.game.abilities.hild.push('squint');
            Object.assign(session.game.flags, { blanchingBegun: true, escaped: true });
            return mapScene('chapel', { spawn: 'door' });
          }, 0.3),
      },
      { label: '→ the margin', run: () => transition(() => (chapterFour(), mapScene('edge', { spawn: 'start' })), 0.3) },
      { label: '→ saint ebb’s at dawn', run: () => transition(() => (chapterFive(), mapScene('dawnScriptorium', { spawn: 'psalter' })), 0.3) },
      {
        label: '→ the nave',
        run: () =>
          transition(() => {
            chapterFive();
            session.game.cleared.push('f9');
            settle();
            Object.assign(session.game.flags, { mercyTolled: true, hammerDown: true });
            return mapScene('nave', { spawn: 'doors' });
          }, 0.3),
      },
      ...['f1', 'f2', 'b1', 'f3', 'f4', 'b2', 'f5', 'f6', 'b3', 'f7', 'f8', 'b4', 'f9', 'b5'].map((id) => ({
        label: `→ fight ${id}`,
        run: () =>
          transition(() => {
            fightState(id);
            const again = (): Scene => battle(id, again);
            return again();
          }, 0.3),
      })),
    ],
  });
  input.onAction((a) => {
    if (a === 'debug' || a === 'debugMenu') debug.toggle();
    if (a === 'mute') audio.toggleMute();
  });
  if (params.has('debug')) debug.toggle();

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
    if (fadeOut) {
      fadeOut.t += dt;
      const k = Math.min(1, fadeOut.t / fadeOut.dur);
      renderer.screen.fade = Math.max(renderer.screen.fade, k * k * (3 - 2 * k));
      if (k >= 1) {
        const next = fadeOut.next;
        fadeOut = null;
        scene.dispose();
        renderer.lights.clear();
        scene = next();
        renderer.screen.fade = 1;
      }
    }
    scene.sync();
    touch.setCandle(!!scene.rakes && !menu.open);
    renderer.render(menu.open ? 0 : dt);
    renderer.frameTime(ms);
    debug.frame(dt, () => scene.debugInfo());
    requestAnimationFrame(frame);
  };
  /**
   * Run the game forward by `seconds` without waiting for frames (tests and
   * screenshots). Cinematics are async, so each step lets pending promises settle.
   */
  const advance = async (seconds: number) => {
    const steps = Math.round(seconds * 30);
    for (let i = 0; i < steps; i++) {
      scene.update(1 / 30);
      renderer.time += 1 / 30;
      await Promise.resolve();
      await Promise.resolve();
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

function infoRowHtml(text: string): { el: HTMLElement; focus: false } {
  const r = document.createElement('div');
  r.className = 'row static';
  r.style.whiteSpace = 'pre-line';
  r.style.lineHeight = '1.5';
  r.textContent = text;
  return { el: r, focus: false };
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
    // The renderer fails before the settings are applied: pick the language here.
    const l = session.settings.value.language;
    setLang(l === 'auto' ? detectLanguage(navigator.languages ?? [navigator.language]) : l);
    loading.className = 'error';
    loading.textContent = t('boot.error', { why: (err instanceof Error ? err.message : String(err)).replace(/\.$/, '') });
  }
  throw err;
}
