/**
 * The page renderer. Three layers are drawn into one off-screen target, then the post
 * pass draws that target, letterboxed, onto the window:
 *
 *   backdrop: the vellum (page camera);
 *   world:    the map or battle, scissored to the text block (its own, movable camera);
 *   frame:    the border, running titles and UI (page camera).
 */

import * as THREE from 'three';
import { fitPage, PAGE_H, PAGE_W, TEXT_BLOCK } from './page';
import { PostPass } from './post/post';
import { createVellum } from './post/vellum';

THREE.ColorManagement.enabled = false;

/** Colour of the desk around a letterboxed page. */
const DESK = 0x15110d;

export class PageRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly backdrop = new THREE.Scene();
  readonly world = new THREE.Scene();
  readonly frame = new THREE.Scene();
  readonly pageCamera = new THREE.OrthographicCamera(0, PAGE_W, PAGE_H, 0, -10, 10);
  /** Shows a text-block-sized window of the world. Move with `setWorldView`. */
  readonly worldCamera = new THREE.OrthographicCamera(0, TEXT_BLOCK.w, TEXT_BLOCK.h, 0, -10, 10);
  readonly post = new PostPass();
  private target: THREE.WebGLRenderTarget;
  /** The vellum never changes, so it is drawn once per resize and copied each frame. */
  private readonly backdropTarget: THREE.WebGLRenderTarget;
  private backdropDirty = true;
  private readonly copyScene = new THREE.Scene();
  private pxPerUnit = 1;
  private worldFlip = TEXT_BLOCK.h;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.setClearColor(DESK, 1);
    this.renderer.autoClear = false;
    this.target = new THREE.WebGLRenderTarget(1, 1, {
      depthBuffer: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
    this.backdropTarget = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
    this.backdrop.add(createVellum(Math.random() * 1000));
    const copy = new THREE.Mesh(
      new THREE.PlaneGeometry(PAGE_W, PAGE_H).translate(PAGE_W / 2, PAGE_H / 2, 0),
      new THREE.ShaderMaterial({
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'uniform sampler2D tMap; varying vec2 vUv; void main() { gl_FragColor = texture2D(tMap, vUv); }',
        uniforms: { tMap: { value: this.backdropTarget.texture } },
        depthTest: false,
        depthWrite: false,
      }),
    );
    copy.frustumCulled = false;
    this.copyScene.add(copy);
    this.setWorldView(0, 0, TEXT_BLOCK.h);
    this.resize();
  }

  /**
   * Place the world camera. (x, y) is the top-left of the visible window in world units
   * (y down); `flip` is the height used to convert the world's y-down coordinates to
   * y-up (the map height).
   */
  setWorldView(x: number, y: number, flip: number): void {
    this.worldFlip = flip;
    const cam = this.worldCamera;
    cam.left = x;
    cam.right = x + TEXT_BLOCK.w;
    cam.top = flip - y;
    cam.bottom = flip - y - TEXT_BLOCK.h;
    cam.updateProjectionMatrix();
  }

  /** The height that world sprites should use to flip their y coordinate. */
  get worldHeight(): number {
    return this.worldFlip;
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    const fit = fitPage(w, h);
    this.pxPerUnit = fit.scale * dpr;
    const tw = Math.max(1, Math.round(PAGE_W * this.pxPerUnit));
    const th = Math.max(1, Math.round(PAGE_H * this.pxPerUnit));
    this.target.setSize(tw, th);
    this.backdropTarget.setSize(tw, th);
    this.backdropDirty = true;
  }

  get pixelsPerUnit(): number {
    return this.pxPerUnit;
  }

  render(): void {
    const r = this.renderer;
    r.info.autoReset = false;
    r.info.reset();
    const t = this.target;
    const tw = t.width;
    const th = t.height;

    // While a render target is bound, three takes the viewport from the target itself.
    if (this.backdropDirty) {
      this.backdropDirty = false;
      this.backdropTarget.viewport.set(0, 0, tw, th);
      r.setRenderTarget(this.backdropTarget);
      r.clear();
      r.render(this.backdrop, this.pageCamera);
    }
    t.viewport.set(0, 0, tw, th);
    t.scissorTest = false;
    r.setRenderTarget(t);
    r.clear();
    r.render(this.copyScene, this.pageCamera);

    // The world sees only the text block.
    const k = this.pxPerUnit;
    const bx = Math.round(TEXT_BLOCK.x * k);
    const by = Math.round((PAGE_H - TEXT_BLOCK.y - TEXT_BLOCK.h) * k);
    const bw = Math.round(TEXT_BLOCK.w * k);
    const bh = Math.round(TEXT_BLOCK.h * k);
    t.viewport.set(bx, by, bw, bh);
    t.scissor.set(bx, by, bw, bh);
    t.scissorTest = true;
    r.setRenderTarget(t);
    r.render(this.world, this.worldCamera);

    t.viewport.set(0, 0, tw, th);
    t.scissorTest = false;
    r.setRenderTarget(t);
    r.render(this.frame, this.pageCamera);

    // Post-process onto the letterboxed page (the screen viewport is in CSS pixels).
    this.post.prepare(r, t.texture, tw, th, k);
    r.setRenderTarget(null);
    const fit = fitPage(window.innerWidth, window.innerHeight);
    r.setViewport(0, 0, window.innerWidth, window.innerHeight);
    r.clear();
    r.setViewport(fit.x, window.innerHeight - fit.y - fit.h, fit.w, fit.h);
    r.render(this.post.scene, this.post.camera);
  }
}
