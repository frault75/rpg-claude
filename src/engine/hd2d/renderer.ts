/**
 * The HD-2D renderer. The world is pixel art drawn at its own resolution (one texel per
 * art pixel), while light, fog, bloom and depth of field work at screen resolution:
 *
 *   world  (art res, two outputs): albedo and emissive, y-sorted sprites and tiles;
 *   lights (half res): cleared to the ambient colour, soft lights added, shade multiplied;
 *   composite (screen res): albedo x light + emissive, lit fog; then `fx` added on top
 *            (glowing particles and spell effects, smooth and high-resolution);
 *   bloom, tilt-shift blur, grade, vignette, grain, flash and fade;
 *   ui (screen res, logical 1280 x 720 units): drawn last, untouched by the post chain.
 *
 * World coordinates are in units (3 per art pixel) with y pointing down; meshes use
 * three's y-up, so a mesh at world (x, y) sits at (x, -y).
 */

import * as THREE from 'three';
import { PX } from '../../pixel/sprite';
import { type Box, fitView, VIEW_H, VIEW_W, windowToView } from '../view';
import { FX_GLOBALS } from './particles';
import {
  BLOOM_PREFILTER_FRAG,
  BLUR_FRAG,
  COMPOSITE_FRAG,
  DOWN_FRAG,
  FINAL_FRAG,
  QUAD_VERT,
  UP_FRAG,
} from './shaders';

THREE.ColorManagement.enabled = false;

export { VIEW_H, VIEW_W };
const ART_W = Math.ceil(VIEW_W / PX) + 2;
const ART_H = Math.ceil(VIEW_H / PX) + 2;
const BLOOM_LEVELS = 5;

export interface Grade {
  exposure: number;
  contrast: number;
  saturation: number;
  lift: [number, number, number];
  gain: [number, number, number];
  vignette: number;
  grain: number;
  bloom: number;
  bloomThreshold: number;
  tilt: number;
  focusY: number;
  focusBand: number;
}

export const NEUTRAL_GRADE: Grade = {
  exposure: 1,
  contrast: 1,
  saturation: 1,
  lift: [0, 0, 0],
  gain: [1, 1, 1],
  vignette: 1,
  grain: 0.025,
  bloom: 0.9,
  bloomThreshold: 0.72,
  tilt: 0.85,
  focusY: 0.5,
  focusBand: 0.2,
};

export interface Atmosphere {
  ambient: [number, number, number];
  void: [number, number, number];
  fog: number;
  fogColor: [number, number, number];
  fogScale: number;
  fogDrift: [number, number];
  /** World y where the fog starts to thicken, where it is full, and its density above. */
  fogBand: [number, number, number];
  emissiveGain: number;
}

export const NEUTRAL_ATMOSPHERE: Atmosphere = {
  ambient: [1, 1, 1],
  void: [0, 0, 0],
  fog: 0,
  fogColor: [0.6, 0.65, 0.75],
  fogScale: 0.003,
  fogDrift: [0.02, 0.005],
  fogBand: [0, 1, 1],
  emissiveGain: 1,
};

function quad(frag: string, uniforms: Record<string, THREE.IUniform>, blending: THREE.Blending = THREE.NoBlending): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, blending, transparent: blending !== THREE.NoBlending }),
  );
  m.frustumCulled = false;
  return m;
}

function target(w: number, h: number, opts: THREE.RenderTargetOptions = {}): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(w, h, {
    depthBuffer: false,
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    ...opts,
  });
}

export class WorldRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly world = new THREE.Scene();
  readonly lights = new THREE.Scene();
  readonly fx = new THREE.Scene();
  readonly ui = new THREE.Scene();
  /** The view: centre in world units, zoom (1 shows 1280 x 720 units), screen shake. */
  readonly view = { x: VIEW_W / 2, y: VIEW_H / 2, zoom: 1, shakeX: 0, shakeY: 0 };
  grade: Grade = { ...NEUTRAL_GRADE };
  atmosphere: Atmosphere = { ...NEUTRAL_ATMOSPHERE };
  /** Screen effects, 0–1. */
  readonly screen = { fade: 0, fadeColor: [0, 0, 0] as [number, number, number], flash: 0, aberration: 0, desaturate: 0 };
  /** Post stages that can be switched off from the debug overlay. */
  readonly enabled = { lights: true, bloom: true, tilt: true, fog: true, grade: true };
  time = 0;

  readonly artCamera = new THREE.OrthographicCamera(0, 1, 0, -1, -10, 10);
  readonly viewCamera = new THREE.OrthographicCamera(0, 1, 0, -1, -10, 10);
  readonly uiCamera = new THREE.OrthographicCamera(0, VIEW_W, VIEW_H, 0, -10, 10);

  private readonly art = target(ART_W, ART_H, {
    count: 2,
    type: THREE.UnsignedByteType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  });
  private lightRT = target(1, 1);
  private sceneRT = target(1, 1);
  /** Bloom mips; after the upsampling pass, level 0 holds the result. */
  private readonly bloom: THREE.WebGLRenderTarget[] = [];
  private blurA = target(1, 1);
  private blurB = target(1, 1);
  private readonly postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly composite: THREE.Mesh;
  private readonly prefilter: THREE.Mesh;
  private readonly down: THREE.Mesh;
  private readonly up: THREE.Mesh;
  private readonly blur: THREE.Mesh;
  private readonly final: THREE.Mesh;
  private readonly blackTex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  /** Letterboxed viewport in CSS pixels, and the device pixel ratio. */
  private box: Box = { x: 0, y: 0, w: 1, h: 1 };
  private dpr = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.autoClear = false;
    this.blackTex.needsUpdate = true;
    for (const t of this.art.textures) {
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
    }
    for (let i = 0; i < BLOOM_LEVELS; i++) this.bloom.push(target(1, 1));

    this.composite = quad(COMPOSITE_FRAG, {
      tAlbedo: { value: this.art.textures[0] },
      tEmissive: { value: this.art.textures[1] },
      tLight: { value: this.lightRT.texture },
      uViewOrigin: { value: new THREE.Vector2() },
      uViewSize: { value: new THREE.Vector2() },
      uArtOrigin: { value: new THREE.Vector2() },
      uArtSize: { value: new THREE.Vector2(ART_W, ART_H) },
      uPx: { value: PX },
      uScreenPerArt: { value: 3 },
      uEmissiveGain: { value: 1 },
      uVoid: { value: new THREE.Vector3() },
      uFogColor: { value: new THREE.Vector3() },
      uFog: { value: 0 },
      uFogScale: { value: 0.003 },
      uFogDrift: { value: new THREE.Vector2() },
      uFogBand: { value: new THREE.Vector3(0, 1, 1) },
      uTime: { value: 0 },
    });
    this.prefilter = quad(BLOOM_PREFILTER_FRAG, {
      tMap: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uThreshold: { value: 0.75 },
      uKnee: { value: 0.25 },
    });
    this.down = quad(DOWN_FRAG, { tMap: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.up = quad(UP_FRAG, { tMap: { value: null }, uTexel: { value: new THREE.Vector2() }, uRadius: { value: 1 } }, THREE.AdditiveBlending);
    this.blur = quad(BLUR_FRAG, { tMap: { value: null }, uDir: { value: new THREE.Vector2() } });
    this.final = quad(FINAL_FRAG, {
      tScene: { value: this.sceneRT.texture },
      tBlur: { value: this.blurB.texture },
      tBloom: { value: this.bloom[0]!.texture },
      uBloom: { value: 1 },
      uTilt: { value: 1 },
      uFocusY: { value: 0.5 },
      uFocusBand: { value: 0.2 },
      uExposure: { value: 1 },
      uContrast: { value: 1 },
      uSaturation: { value: 1 },
      uLift: { value: new THREE.Vector3() },
      uGain: { value: new THREE.Vector3(1, 1, 1) },
      uVignette: { value: 1 },
      uGrain: { value: 0.02 },
      uTime: { value: 0 },
      uFadeColor: { value: new THREE.Vector3() },
      uFade: { value: 0 },
      uFlash: { value: 0 },
      uAberration: { value: 0 },
      uDesaturate: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
    });
    this.resize();
  }

  /** Size of the letterboxed game area in CSS pixels, and its offset in the window. */
  get viewport(): Box {
    return this.box;
  }

  /** Convert a window pixel to logical screen units (0..1280, 0..720), or null outside. */
  windowToScreen(px: number, py: number): { x: number; y: number } | null {
    return windowToView(px, py, this.box);
  }

  /** Convert logical screen units to world units under the current view. */
  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const v = this.viewRect();
    return { x: v.x + (sx / VIEW_W) * v.w, y: v.y + (sy / VIEW_H) * v.h };
  }

  viewRect(): { x: number; y: number; w: number; h: number } {
    const z = Math.max(1, this.view.zoom);
    const w = VIEW_W / z;
    const h = VIEW_H / z;
    return { x: this.view.x - w / 2 + this.view.shakeX, y: this.view.y - h / 2 + this.view.shakeY, w, h };
  }

  resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ww = window.innerWidth;
    const wh = window.innerHeight;
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(ww, wh, false);
    this.box = fitView(ww, wh);
    const { w, h } = this.box;
    // Internal resolution: the device size of the game area, capped at 1440p.
    const k = Math.min(1, 1440 / (h * this.dpr));
    const iw = Math.max(2, Math.round(w * this.dpr * k));
    const ih = Math.max(2, Math.round(h * this.dpr * k));
    this.sceneRT.setSize(iw, ih);
    this.lightRT.setSize(Math.ceil(iw / 2), Math.ceil(ih / 2));
    let bw = Math.ceil(iw / 2);
    let bh = Math.ceil(ih / 2);
    for (let i = 0; i < BLOOM_LEVELS; i++) {
      this.bloom[i]!.setSize(Math.max(1, bw), Math.max(1, bh));
      bw = Math.ceil(bw / 2);
      bh = Math.ceil(bh / 2);
    }
    this.blurA.setSize(Math.ceil(iw / 4), Math.ceil(ih / 4));
    this.blurB.setSize(Math.ceil(iw / 4), Math.ceil(ih / 4));
    (this.final.material as THREE.ShaderMaterial).uniforms.uResolution!.value.set(iw, ih);
  }

  /** Internal pixels per logical unit (for the UI's text resolution). */
  get uiScale(): number {
    return this.sceneRT.height / VIEW_H;
  }

  private pass(mesh: THREE.Mesh, out: THREE.WebGLRenderTarget | null, clear = true): void {
    const r = this.renderer;
    r.setRenderTarget(out);
    if (clear) r.clear();
    r.render(mesh, this.postCamera);
  }

  render(dt: number): void {
    this.time += dt;
    FX_GLOBALS.uScale.value = (this.sceneRT.height / VIEW_H) * Math.max(1, this.view.zoom);
    const r = this.renderer;
    r.info.autoReset = false;
    r.info.reset();
    const v = this.viewRect();
    const g = this.grade;
    const a = this.atmosphere;

    // World at art resolution, aligned to the art-pixel grid with a one-pixel margin.
    const ax = Math.floor(v.x / PX) * PX - PX;
    const ay = Math.floor(v.y / PX) * PX - PX;
    const ac = this.artCamera;
    ac.left = ax;
    ac.right = ax + ART_W * PX;
    ac.top = -ay;
    ac.bottom = -(ay + ART_H * PX);
    ac.updateProjectionMatrix();
    r.setRenderTarget(this.art);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(this.world, ac);

    // Lights, on the exact (smooth) view.
    const vc = this.viewCamera;
    vc.left = v.x;
    vc.right = v.x + v.w;
    vc.top = -v.y;
    vc.bottom = -(v.y + v.h);
    vc.updateProjectionMatrix();
    r.setRenderTarget(this.lightRT);
    const amb = this.enabled.lights ? a.ambient : [1, 1, 1];
    r.setClearColor(new THREE.Color(amb[0], amb[1], amb[2]), 1);
    r.clear();
    if (this.enabled.lights) r.render(this.lights, vc);
    r.setClearColor(0x000000, 1);

    // Composite, then the high-resolution effects on top.
    const cu = (this.composite.material as THREE.ShaderMaterial).uniforms;
    cu.uViewOrigin!.value.set(v.x, v.y);
    cu.uViewSize!.value.set(v.w, v.h);
    cu.uArtOrigin!.value.set(ax, ay);
    cu.uScreenPerArt!.value = (this.sceneRT.width / v.w) * PX;
    cu.uEmissiveGain!.value = a.emissiveGain;
    cu.uVoid!.value.set(...a.void);
    cu.uFogColor!.value.set(...a.fogColor);
    cu.uFog!.value = this.enabled.fog ? a.fog : 0;
    cu.uFogScale!.value = a.fogScale;
    cu.uFogDrift!.value.set(...a.fogDrift);
    cu.uFogBand!.value.set(...a.fogBand);
    cu.uTime!.value = this.time;
    this.pass(this.composite, this.sceneRT);
    r.setRenderTarget(this.sceneRT);
    r.render(this.fx, vc);

    // Bloom: threshold at half resolution, down the mip chain, then back up.
    const bloomOn = this.enabled.bloom && g.bloom > 0;
    if (bloomOn) {
      const pu = (this.prefilter.material as THREE.ShaderMaterial).uniforms;
      pu.tMap!.value = this.sceneRT.texture;
      pu.uTexel!.value.set(1 / this.sceneRT.width, 1 / this.sceneRT.height);
      pu.uThreshold!.value = g.bloomThreshold;
      this.pass(this.prefilter, this.bloom[0]!);
      const du = (this.down.material as THREE.ShaderMaterial).uniforms;
      for (let i = 1; i < BLOOM_LEVELS; i++) {
        const src = this.bloom[i - 1]!;
        du.tMap!.value = src.texture;
        du.uTexel!.value.set(1 / src.width, 1 / src.height);
        this.pass(this.down, this.bloom[i]!);
      }
      // Each level adds the (already accumulated) level below it.
      const uu = (this.up.material as THREE.ShaderMaterial).uniforms;
      for (let i = BLOOM_LEVELS - 2; i >= 0; i--) {
        const small = this.bloom[i + 1]!;
        uu.tMap!.value = small.texture;
        uu.uTexel!.value.set(1 / small.width, 1 / small.height);
        this.pass(this.up, this.bloom[i]!, false);
      }
    }

    // Blur for the tilt-shift: quarter resolution, two separable passes.
    const tiltOn = this.enabled.tilt && g.tilt > 0;
    if (tiltOn) {
      const du = (this.down.material as THREE.ShaderMaterial).uniforms;
      du.tMap!.value = this.sceneRT.texture;
      du.uTexel!.value.set(1.5 / this.sceneRT.width, 1.5 / this.sceneRT.height);
      this.pass(this.down, this.blurA);
      const bu = (this.blur.material as THREE.ShaderMaterial).uniforms;
      bu.tMap!.value = this.blurA.texture;
      bu.uDir!.value.set(1.6 / this.blurA.width, 0);
      this.pass(this.blur, this.blurB);
      bu.tMap!.value = this.blurB.texture;
      bu.uDir!.value.set(0, 1.6 / this.blurA.height);
      this.pass(this.blur, this.blurA);
      bu.tMap!.value = this.blurA.texture;
      bu.uDir!.value.set(2.6 / this.blurA.width, 0);
      this.pass(this.blur, this.blurB);
      bu.tMap!.value = this.blurB.texture;
      bu.uDir!.value.set(0, 2.6 / this.blurA.height);
      this.pass(this.blur, this.blurA);
    }

    // Final, letterboxed onto the canvas, then the UI.
    const fu = (this.final.material as THREE.ShaderMaterial).uniforms;
    const gradeOn = this.enabled.grade;
    fu.tBlur!.value = tiltOn ? this.blurA.texture : this.sceneRT.texture;
    fu.tBloom!.value = bloomOn ? this.bloom[0]!.texture : this.blackTex;
    fu.uBloom!.value = g.bloom;
    fu.uTilt!.value = tiltOn ? g.tilt : 0;
    fu.uFocusY!.value = g.focusY;
    fu.uFocusBand!.value = g.focusBand;
    fu.uExposure!.value = gradeOn ? g.exposure : 1;
    fu.uContrast!.value = gradeOn ? g.contrast : 1;
    fu.uSaturation!.value = gradeOn ? g.saturation : 1;
    fu.uLift!.value.set(...(gradeOn ? g.lift : [0, 0, 0]));
    fu.uGain!.value.set(...(gradeOn ? g.gain : [1, 1, 1]));
    fu.uVignette!.value = gradeOn ? g.vignette : 0;
    fu.uGrain!.value = gradeOn ? g.grain : 0;
    fu.uTime!.value = this.time;
    fu.uFadeColor!.value.set(...this.screen.fadeColor);
    fu.uFade!.value = this.screen.fade;
    fu.uFlash!.value = this.screen.flash;
    fu.uAberration!.value = this.screen.aberration;
    fu.uDesaturate!.value = this.screen.desaturate;

    r.setRenderTarget(null);
    r.setViewport(0, 0, window.innerWidth, window.innerHeight);
    r.setScissorTest(false);
    r.clear();
    const b = this.box;
    r.setViewport(b.x, window.innerHeight - b.y - b.h, b.w, b.h);
    r.render(this.final, this.postCamera);
    r.render(this.ui, this.uiCamera);
  }
}
