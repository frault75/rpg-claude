/**
 * The diorama renderer: HD-2D as in Octopath Traveler. The world is real 3D (ground,
 * cliffs, walls and roofs are planes textured with pixel art; figures, trees and props
 * stand as upright sprites) seen by a tilted orthographic camera. Three's lights shade
 * it: a hemisphere for the sky's ambient, the moon or sun as a directional light with
 * soft shadows, and a pool of point lights given each frame to the nearest lamps.
 * Then: planar reflections for water, depth of field from the real depth, fog by
 * distance and low mist, bloom, grade, vignette and grain; the UI is drawn last.
 *
 * Positions given to the renderer are map coordinates in art pixels (see space.ts).
 */

import * as THREE from 'three';
import { fitView, type Box, VIEW_H, VIEW_W, windowToView } from '../view';
import { BLOOM_PREFILTER_FRAG, BLUR_FRAG, DOWN_FRAG, FINAL_FRAG, QUAD_VERT, UP_FRAG } from './post';
import { FX_SCALE } from './fx';
import { AdaptiveScale, detectQuality, type Quality } from './quality';
import { PITCH, PX, SY, SZ, world } from './space';

THREE.ColorManagement.enabled = false;

export { VIEW_H, VIEW_W };

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
  /** Depth of field strength (0 = off). */
  dof: number;
  /** Distance either side of the focus that stays sharp, and the ramp to full blur (world units). */
  focusBand: number;
  focusRange: number;
}

export const NEUTRAL_GRADE: Grade = {
  exposure: 1,
  contrast: 1,
  saturation: 1,
  lift: [0, 0, 0],
  gain: [1, 1, 1],
  vignette: 1,
  grain: 0.02,
  bloom: 0.8,
  bloomThreshold: 0.8,
  dof: 1,
  focusBand: 140,
  focusRange: 260,
};

export interface Atmosphere {
  /** Sky and ground colours of the ambient light, and its strength. */
  sky: [number, number, number];
  ground: [number, number, number];
  ambient: number;
  /** The moon or sun: colour, strength, and direction it shines (towards the scene). */
  key: [number, number, number];
  keyLevel: number;
  keyDir: [number, number, number];
  fogColor: [number, number, number];
  /** View distances (world units from the camera's focus plane) where fog starts and is full. */
  fogDist: [number, number];
  fogMax: number;
  /** Mist: height in art pixels, density, noise scale. */
  mist: [number, number, number];
  mistDrift: [number, number];
  background: [number, number, number];
}

export const NEUTRAL_ATMOSPHERE: Atmosphere = {
  sky: [1, 1, 1],
  ground: [0.6, 0.6, 0.6],
  ambient: 0.6,
  key: [1, 1, 1],
  keyLevel: 0.8,
  keyDir: [0.5, -1, 0.4],
  fogColor: [0.6, 0.65, 0.75],
  fogDist: [1e5, 2e5],
  fogMax: 0,
  mist: [10, 0, 0.004],
  mistDrift: [0.02, 0.005],
  background: [0, 0, 0],
};

export type Flicker = 'none' | 'flame' | 'candle' | 'breathe';

/** A light in the game; the renderer lends it one of its point lights when it is near. */
export class GameLight {
  readonly color = new THREE.Color();
  /** Current strength after flicker. */
  level = 1;
  enabled = true;
  private readonly seed = Math.random() * 100;

  constructor(
    /** Map position in art pixels, and height above the ground. */
    public x: number,
    public y: number,
    public h: number,
    /** Reach in art pixels. */
    public radius: number,
    color: string | [number, number, number],
    public intensity = 1,
    public flicker: Flicker = 'none',
  ) {
    this.setColor(color);
  }

  setColor(c: string | [number, number, number]): void {
    if (typeof c === 'string') this.color.set(c);
    else this.color.setRGB(c[0], c[1], c[2]);
  }

  update(time: number): void {
    const t = time + this.seed;
    let k = 1;
    if (this.flicker === 'flame') k = 0.86 + 0.08 * Math.sin(t * 11.3) + 0.05 * Math.sin(t * 23.7 + 1.3) + 0.04 * Math.sin(t * 5.1);
    else if (this.flicker === 'candle') k = 0.92 + 0.05 * Math.sin(t * 9.1) + 0.03 * Math.sin(t * 17.9);
    else if (this.flicker === 'breathe') k = 0.85 + 0.15 * Math.sin(t * 1.4);
    this.level = this.intensity * k;
  }
}

/** A flat reflective surface: the renderer draws the mirrored scene for it each frame. */
export interface Mirror {
  /** Height of the surface in world units. */
  level: number;
  mesh: THREE.Object3D;
  setReflection(tex: THREE.Texture | null, matrix: THREE.Matrix4): void;
}

function quad(frag: string, uniforms: Record<string, THREE.IUniform>, blending: THREE.Blending = THREE.NoBlending): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, blending, transparent: blending !== THREE.NoBlending }),
  );
  m.frustumCulled = false;
  return m;
}

function target(w: number, h: number, opts: THREE.RenderTargetOptions = {}): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(w, h, { depthBuffer: false, type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, ...opts });
}

const LIGHT_DECAY = 1.6;

export class WorldRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly ui = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 6000);
  readonly uiCamera = new THREE.OrthographicCamera(0, VIEW_W, VIEW_H, 0, -10, 10);
  quality: Quality;
  /**
   * The view: the map point the camera looks at (art pixels), zoom (1 = 427 x 240 art
   * pixels on screen), extra pitch and yaw for cinematics (radians), and screen shake.
   */
  readonly view = { x: 0, y: 0, h: 0, zoom: 1, pitch: 0, yaw: 0, shakeX: 0, shakeY: 0 };
  grade: Grade = { ...NEUTRAL_GRADE };
  atmosphere: Atmosphere = { ...NEUTRAL_ATMOSPHERE };
  readonly screen = { fade: 0, fadeColor: [0, 0, 0] as [number, number, number], flash: 0, aberration: 0, desaturate: 0 };
  readonly enabled = { shadows: true, reflections: true, bloom: true, dof: true, fog: true, grade: true };
  readonly lights = new Set<GameLight>();
  readonly mirrors = new Set<Mirror>();
  time = 0;
  /** From the settings: brightness, film grain on or off, a fixed render scale or adaptive. */
  brightness = 1;
  grainOn = true;
  fixedScale: number | null = null;
  /** Multiplies screen flashes (accessibility). */
  flashScale = 1;

  private readonly hemi = new THREE.HemisphereLight(0xffffff, 0x666666, 1);
  private readonly key = new THREE.DirectionalLight(0xffffff, 1);
  private readonly pool: THREE.PointLight[] = [];
  private sceneRT: THREE.WebGLRenderTarget;
  private readonly bloom: THREE.WebGLRenderTarget[] = [];
  private readonly blurSmall = target(1, 1);
  private readonly blurLarge = target(1, 1);
  private readonly blurTmp = target(1, 1);
  private reflectRT: THREE.WebGLRenderTarget | null = null;
  private readonly mirrorCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 6000);
  private readonly postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly prefilter: THREE.Mesh;
  private readonly down: THREE.Mesh;
  private readonly up: THREE.Mesh;
  private readonly blur: THREE.Mesh;
  private readonly final: THREE.Mesh;
  private readonly blackTex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  private box: Box = { x: 0, y: 0, w: 1, h: 1 };
  private readonly adaptive: AdaptiveScale;

  constructor(canvas: HTMLCanvasElement, q: Quality = detectQuality()) {
    this.quality = q;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.autoClear = false;
    this.renderer.shadowMap.enabled = q.shadowMap > 0;
    this.renderer.shadowMap.type = THREE.VSMShadowMap;
    // Shadow maps are drawn once per frame, not again for the reflection pass.
    this.renderer.shadowMap.autoUpdate = false;
    this.blackTex.needsUpdate = true;
    this.adaptive = new AdaptiveScale(0.55, 1);

    this.scene.add(this.hemi, this.key, this.key.target);
    if (q.shadowMap > 0) {
      this.key.castShadow = true;
      this.key.shadow.mapSize.set(q.shadowMap, q.shadowMap);
      this.key.shadow.bias = -0.0008;
      this.key.shadow.normalBias = 0.6;
      this.key.shadow.radius = 4;
      this.key.shadow.blurSamples = 8;
      const sc = this.key.shadow.camera;
      sc.near = 1;
      sc.far = 3000;
    }
    for (let i = 0; i < q.lights; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 100, LIGHT_DECAY);
      this.pool.push(l);
      this.scene.add(l);
    }

    this.sceneRT = this.makeSceneTarget(2, 2);
    for (let i = 0; i < BLOOM_LEVELS; i++) this.bloom.push(target(1, 1));
    this.prefilter = quad(BLOOM_PREFILTER_FRAG, { tMap: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: 0.8 }, uKnee: { value: 0.25 } });
    this.down = quad(DOWN_FRAG, { tMap: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.up = quad(UP_FRAG, { tMap: { value: null }, uTexel: { value: new THREE.Vector2() }, uRadius: { value: 1 } }, THREE.AdditiveBlending);
    this.blur = quad(BLUR_FRAG, { tMap: { value: null }, uDir: { value: new THREE.Vector2() } });
    this.final = quad(FINAL_FRAG, {
      tScene: { value: null },
      tDepth: { value: null },
      tBlurSmall: { value: null },
      tBlurLarge: { value: null },
      tBloom: { value: null },
      uCamWorld: { value: new THREE.Matrix4() },
      uFrustum: { value: new THREE.Vector4() },
      uNearFar: { value: new THREE.Vector2() },
      uFocusZ: { value: 0 },
      uFocusBand: { value: 100 },
      uFocusRange: { value: 200 },
      uDof: { value: 1 },
      uBloom: { value: 1 },
      uFogColor: { value: new THREE.Vector3() },
      uFogDist: { value: new THREE.Vector2(1e5, 2e5) },
      uFogMax: { value: 0 },
      uMist: { value: new THREE.Vector3(10, 0, 0.004) },
      uMistDrift: { value: new THREE.Vector2() },
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

  private makeSceneTarget(w: number, h: number): THREE.WebGLRenderTarget {
    const rt = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      samples: this.quality.msaa,
    });
    rt.depthTexture = new THREE.DepthTexture(w, h);
    rt.depthTexture.type = THREE.UnsignedIntType;
    return rt;
  }

  get viewport(): Box {
    return this.box;
  }

  /** Convert a window pixel to logical screen units (0..1280, 0..720), or null outside. */
  windowToScreen(px: number, py: number): { x: number; y: number } | null {
    return windowToView(px, py, this.box);
  }

  /** The map point (art pixels, on the ground plane h = 0) under a logical screen point. */
  screenToMap(sx: number, sy: number, h = 0): { x: number; y: number } {
    this.updateCamera();
    const ndc = new THREE.Vector3((sx / VIEW_W) * 2 - 1, 1 - (sy / VIEW_H) * 2, -1);
    const origin = ndc.clone().unproject(this.camera);
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const planeY = h * SY;
    const t = (planeY - origin.y) / dir.y;
    const p = origin.addScaledVector(dir, t);
    return { x: p.x, y: p.z / SZ };
  }

  /** Logical screen position of a map point (for UI anchored to the world). */
  mapToScreen(x: number, y: number, h = 0): { x: number; y: number } {
    this.updateCamera();
    const v = new THREE.Vector3(...world(x, y, h)).project(this.camera);
    return { x: ((v.x + 1) / 2) * VIEW_W, y: ((1 - v.y) / 2) * VIEW_H };
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, this.quality.maxDpr);
    const ww = window.innerWidth;
    const wh = window.innerHeight;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(ww, wh, false);
    this.box = fitView(ww, wh);
    const k = Math.min(1, 1440 / (this.box.h * dpr)) * (this.fixedScale ?? this.adaptive.scale);
    const iw = Math.max(2, Math.round(this.box.w * dpr * k));
    const ih = Math.max(2, Math.round(this.box.h * dpr * k));
    this.sceneRT.dispose();
    this.sceneRT = this.makeSceneTarget(iw, ih);
    let bw = Math.ceil(iw / 2);
    let bh = Math.ceil(ih / 2);
    for (let i = 0; i < BLOOM_LEVELS; i++) {
      this.bloom[i]!.setSize(Math.max(1, bw), Math.max(1, bh));
      bw = Math.ceil(bw / 2);
      bh = Math.ceil(bh / 2);
    }
    this.blurSmall.setSize(Math.ceil(iw / 2), Math.ceil(ih / 2));
    this.blurTmp.setSize(Math.ceil(iw / 4), Math.ceil(ih / 4));
    this.blurLarge.setSize(Math.ceil(iw / 4), Math.ceil(ih / 4));
    const rq = this.quality.reflections;
    if (rq > 0) {
      const rw = Math.max(2, Math.round(iw * rq));
      const rh = Math.max(2, Math.round(ih * rq));
      if (!this.reflectRT) this.reflectRT = new THREE.WebGLRenderTarget(rw, rh, { type: THREE.HalfFloatType, depthBuffer: true });
      else this.reflectRT.setSize(rw, rh);
    }
    (this.final.material as THREE.ShaderMaterial).uniforms.uResolution!.value.set(iw, ih);
  }

  /** Internal pixels per logical unit (for the UI's text resolution). */
  get uiScale(): number {
    return (this.box.h * Math.min(window.devicePixelRatio || 1, this.quality.maxDpr)) / VIEW_H;
  }

  /** Map units (art pixels) visible across the screen at the current zoom. */
  get viewWidth(): number {
    return VIEW_W / PX / Math.max(0.25, this.view.zoom);
  }

  private updateCamera(): void {
    const v = this.view;
    const cam = this.camera;
    const halfW = this.viewWidth / 2;
    const halfH = (halfW * VIEW_H) / VIEW_W;
    cam.left = -halfW;
    cam.right = halfW;
    cam.top = halfH;
    cam.bottom = -halfH;
    const pitch = PITCH + v.pitch;
    const yaw = v.yaw;
    const [tx, ty, tz] = world(v.x, v.y, v.h);
    const dist = 2500;
    const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    cam.position.set(tx + dir.x * dist, ty + dir.y * dist, tz + dir.z * dist);
    cam.up.set(0, 1, 0);
    cam.lookAt(tx, ty, tz);
    // Screen shake moves the camera in its own plane, by whole art pixels.
    if (v.shakeX || v.shakeY) {
      const right = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 0);
      const upv = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 1);
      cam.position.addScaledVector(right, v.shakeX / PX).addScaledVector(upv, -v.shakeY / PX);
    }
    cam.near = 1;
    cam.far = 6000;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }

  private assignLights(): void {
    const v = this.view;
    const cands: { l: GameLight; score: number }[] = [];
    for (const l of this.lights) {
      if (!l.enabled) continue;
      l.update(this.time);
      const dx = l.x - v.x;
      const dy = (l.y - v.y) * 1.4;
      const d = Math.hypot(dx, dy);
      const reach = this.viewWidth * 0.75 + l.radius;
      if (d > reach) continue;
      cands.push({ l, score: d - l.radius * 0.5 - l.intensity * 40 });
    }
    cands.sort((a, b) => a.score - b.score);
    this.pool.forEach((p, i) => {
      const c = cands[i];
      if (!c) {
        p.intensity = 0;
        p.visible = true;
        return;
      }
      const l = c.l;
      p.position.set(...world(l.x, l.y, l.h));
      p.color.copy(l.color);
      p.distance = l.radius * 1.6;
      // Strength 1 lights the ground at a third of the radius at full albedo.
      p.intensity = l.level * Math.PI * Math.pow(l.radius * 0.33, LIGHT_DECAY);
    });
  }

  private pass(mesh: THREE.Mesh, out: THREE.WebGLRenderTarget | null, clear = true): void {
    const r = this.renderer;
    r.setRenderTarget(out);
    if (clear) r.clear();
    r.render(mesh, this.postCamera);
  }

  /** Call once per frame with the frame time, to let the render scale adapt. */
  frameTime(ms: number): void {
    if (this.fixedScale === null && this.adaptive.frame(ms)) this.resize();
  }

  /** Switch quality tier at run time (from the settings). */
  setQuality(q: Quality): void {
    this.quality = q;
    const r = this.renderer;
    r.shadowMap.enabled = q.shadowMap > 0;
    this.key.castShadow = q.shadowMap > 0;
    if (q.shadowMap > 0) {
      this.key.shadow.mapSize.set(q.shadowMap, q.shadowMap);
      this.key.shadow.map?.dispose();
      this.key.shadow.map = null;
    }
    while (this.pool.length > q.lights) this.pool.pop()!.removeFromParent();
    while (this.pool.length < q.lights) {
      const l = new THREE.PointLight(0xffffff, 0, 100, LIGHT_DECAY);
      this.pool.push(l);
      this.scene.add(l);
    }
    if (q.reflections === 0 && this.reflectRT) {
      this.reflectRT.dispose();
      this.reflectRT = null;
    }
    this.resize();
  }

  setFixedScale(scale: number | null): void {
    this.fixedScale = scale;
    this.resize();
  }

  render(dt: number): void {
    this.time += dt;
    // Glowing particles are sized in art pixels.
    FX_SCALE.uScale.value = (this.sceneRT.height / (this.viewWidth * (VIEW_H / VIEW_W)));
    const r = this.renderer;
    const a = this.atmosphere;
    const g = this.grade;
    const q = this.quality;
    this.updateCamera();
    this.assignLights();

    this.hemi.color.setRGB(...a.sky);
    this.hemi.groundColor.setRGB(...a.ground);
    this.hemi.intensity = a.ambient * Math.PI;
    this.key.color.setRGB(...a.key);
    this.key.intensity = a.keyLevel * Math.PI;
    const [tx, ty, tz] = world(this.view.x, this.view.y, this.view.h);
    const kd = new THREE.Vector3(...a.keyDir).normalize();
    this.key.target.position.set(tx, ty, tz);
    this.key.position.set(tx - kd.x * 1500, ty - kd.y * 1500, tz - kd.z * 1500);
    this.key.target.updateMatrixWorld();
    if (this.key.castShadow) {
      const sc = this.key.shadow.camera;
      const ext = this.viewWidth * 0.75;
      sc.left = -ext;
      sc.right = ext;
      sc.top = ext;
      sc.bottom = -ext;
      sc.updateProjectionMatrix();
    }
    r.shadowMap.enabled = q.shadowMap > 0 && this.enabled.shadows;
    r.shadowMap.needsUpdate = r.shadowMap.enabled;
    this.key.castShadow = r.shadowMap.enabled;
    const bg = new THREE.Color(...a.background);

    // Reflections: the scene mirrored in each water surface, clipped at its level.
    if (this.reflectRT && this.enabled.reflections) {
      for (const m of this.mirrors) {
        this.renderMirror(m, bg);
      }
    } else for (const m of this.mirrors) m.setReflection(null, new THREE.Matrix4());

    // Main pass.
    r.setRenderTarget(this.sceneRT);
    r.setClearColor(bg, 1);
    r.clear();
    r.render(this.scene, this.camera);

    // Bloom.
    const bloomOn = q.bloom && this.enabled.bloom && g.bloom > 0;
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
      const uu = (this.up.material as THREE.ShaderMaterial).uniforms;
      for (let i = BLOOM_LEVELS - 2; i >= 0; i--) {
        const small = this.bloom[i + 1]!;
        uu.tMap!.value = small.texture;
        uu.uTexel!.value.set(1 / small.width, 1 / small.height);
        this.pass(this.up, this.bloom[i]!, false);
      }
    }

    // Blurred copies for the depth of field.
    const dofOn = q.dof && this.enabled.dof && g.dof > 0;
    if (dofOn) {
      const du = (this.down.material as THREE.ShaderMaterial).uniforms;
      const bu = (this.blur.material as THREE.ShaderMaterial).uniforms;
      du.tMap!.value = this.sceneRT.texture;
      du.uTexel!.value.set(1 / this.sceneRT.width, 1 / this.sceneRT.height);
      this.pass(this.down, this.blurSmall);
      du.tMap!.value = this.blurSmall.texture;
      du.uTexel!.value.set(1 / this.blurSmall.width, 1 / this.blurSmall.height);
      this.pass(this.down, this.blurLarge);
      for (const k of [1.5, 3]) {
        bu.tMap!.value = this.blurLarge.texture;
        bu.uDir!.value.set(k / this.blurLarge.width, 0);
        this.pass(this.blur, this.blurTmp);
        bu.tMap!.value = this.blurTmp.texture;
        bu.uDir!.value.set(0, k / this.blurLarge.height);
        this.pass(this.blur, this.blurLarge);
      }
    }

    // Final pass, letterboxed onto the canvas, then the UI.
    const fu = (this.final.material as THREE.ShaderMaterial).uniforms;
    const gradeOn = this.enabled.grade;
    const cam = this.camera;
    fu.tScene!.value = this.sceneRT.texture;
    fu.tDepth!.value = this.sceneRT.depthTexture;
    fu.tBlurSmall!.value = dofOn ? this.blurSmall.texture : this.sceneRT.texture;
    fu.tBlurLarge!.value = dofOn ? this.blurLarge.texture : this.sceneRT.texture;
    fu.tBloom!.value = bloomOn ? this.bloom[0]!.texture : this.blackTex;
    fu.uCamWorld!.value.copy(cam.matrixWorld);
    fu.uFrustum!.value.set(cam.left, cam.right, cam.bottom, cam.top);
    fu.uNearFar!.value.set(cam.near, cam.far);
    // Focus on the view target: its distance from the camera along the view axis.
    const toTarget = new THREE.Vector3(tx, ty, tz).sub(cam.position);
    const viewDir = new THREE.Vector3();
    cam.getWorldDirection(viewDir);
    fu.uFocusZ!.value = toTarget.dot(viewDir);
    fu.uFocusBand!.value = g.focusBand;
    fu.uFocusRange!.value = g.focusRange;
    fu.uDof!.value = dofOn ? g.dof : 0;
    fu.uBloom!.value = g.bloom;
    const fogOn = this.enabled.fog;
    fu.uFogColor!.value.set(...a.fogColor);
    fu.uFogDist!.value.set(fu.uFocusZ!.value + a.fogDist[0], fu.uFocusZ!.value + a.fogDist[1]);
    fu.uFogMax!.value = fogOn ? a.fogMax : 0;
    fu.uMist!.value.set(a.mist[0] * SY, fogOn ? a.mist[1] : 0, a.mist[2]);
    fu.uMistDrift!.value.set(...a.mistDrift);
    fu.uExposure!.value = (gradeOn ? g.exposure : 1) * this.brightness;
    fu.uContrast!.value = gradeOn ? g.contrast : 1;
    fu.uSaturation!.value = gradeOn ? g.saturation : 1;
    fu.uLift!.value.set(...(gradeOn ? g.lift : [0, 0, 0]));
    fu.uGain!.value.set(...(gradeOn ? g.gain : [1, 1, 1]));
    fu.uVignette!.value = gradeOn ? g.vignette : 0;
    fu.uGrain!.value = gradeOn && this.grainOn ? g.grain : 0;
    fu.uTime!.value = this.time;
    fu.uFadeColor!.value.set(...this.screen.fadeColor);
    fu.uFade!.value = this.screen.fade;
    fu.uFlash!.value = this.screen.flash * this.flashScale;
    fu.uAberration!.value = this.screen.aberration;
    fu.uDesaturate!.value = this.screen.desaturate;

    r.setRenderTarget(null);
    r.setScissorTest(false);
    r.setViewport(0, 0, window.innerWidth, window.innerHeight);
    r.setClearColor(0x000000, 1);
    r.clear();
    const b = this.box;
    r.setViewport(b.x, window.innerHeight - b.y - b.h, b.w, b.h);
    r.render(this.final, this.postCamera);
    r.render(this.ui, this.uiCamera);
  }

  private renderMirror(m: Mirror, bg: THREE.Color): void {
    const r = this.renderer;
    const cam = this.camera;
    const mc = this.mirrorCam;
    const level = m.level;
    // Reflect the camera through the plane y = level.
    mc.copy(cam);
    mc.position.y = 2 * level - cam.position.y;
    const look = new THREE.Vector3();
    cam.getWorldDirection(look);
    look.y = -look.y;
    mc.up.set(0, 1, 0);
    mc.lookAt(mc.position.clone().add(look));
    mc.updateProjectionMatrix();
    mc.updateMatrixWorld();
    // A texture matrix that maps world positions to the mirror image.
    const tm = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    tm.multiply(mc.projectionMatrix).multiply(mc.matrixWorldInverse);
    m.mesh.visible = false;
    r.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 1, 0), -level + 0.5)];
    r.setRenderTarget(this.reflectRT);
    r.setClearColor(bg, 1);
    r.clear();
    r.render(this.scene, mc);
    r.clippingPlanes = [];
    m.mesh.visible = true;
    m.setReflection(this.reflectRT!.texture, tm);
  }
}
