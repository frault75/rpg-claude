/**
 * Illuminated sprites: a plane carrying an IlluminatedImage, drawn by one shader that
 * composes paint, gold leaf and iron-gall ink, burnishes the gold, and can run the
 * illuminator's process forwards (paint-in) or backwards (fray). DESIGN.md §6.4, §6.8.
 */

import * as THREE from 'three';
import { NOISE_GLSL } from '../engine/post/glsl';
import { hexToRgb, PIGMENTS } from './palettes';
import type { IlluminatedImage } from './illuminator';

/** Uniforms shared by every sprite (time, global toggles). */
export const spriteGlobals = {
  uTime: { value: 0 },
  uShimmer: { value: 1 },
  uInk: { value: new THREE.Vector3(...hexToRgb(PIGMENTS.ironGall)) },
  uGoldDark: { value: new THREE.Vector3(...hexToRgb(PIGMENTS.goldDark)) },
  uGold: { value: new THREE.Vector3(...hexToRgb(PIGMENTS.gold)) },
  uGoldLight: { value: new THREE.Vector3(...hexToRgb(PIGMENTS.goldLight)) },
  uVellum: { value: new THREE.Vector3(...hexToRgb(PIGMENTS.vellum)) },
  /** Direction the light falls from, tilting slowly (as if the book were turned in the hands). */
  uLight: { value: new THREE.Vector2(-0.55, 0.6) },
  /** Raking light in world space: x, y (y up), radius. Radius 0 = no light. */
  uLens: { value: new THREE.Vector3(0, 0, 0) },
};

/** How a sprite responds to raking light. */
export const LENS = { none: 0, revealed: 1, hidden: 2 } as const;

const VERT = /* glsl */ `
varying vec2 vUv;
varying vec2 vWorld;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xy;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const FRAG = /* glsl */ `
uniform sampler2D tPaint;
uniform sampler2D tMask;
uniform float uTime;
uniform float uShimmer;
uniform vec3 uInk;
uniform vec3 uGoldDark;
uniform vec3 uGold;
uniform vec3 uGoldLight;
uniform vec3 uVellum;
uniform float uStage;     // 1 = finished illumination, 0 = bare vellum
uniform float uOpacity;
uniform float uSeed;
uniform vec3 uTint;
uniform vec2 uTexel;
uniform vec2 uLight;
uniform vec3 uLens;
uniform float uLensMode;
uniform vec4 uWipe;     // enabled, top of text (uv from top), line height (uv), unused
uniform vec2 uWipeAt;   // current line, reveal edge (uv x)
varying vec2 vUv;
varying vec2 vWorld;

${NOISE_GLSL}

vec4 over(vec4 dst, vec3 c, float a) {
  float oa = a + dst.a * (1.0 - a);
  vec3 oc = (c * a + dst.rgb * dst.a * (1.0 - a)) / max(oa, 1e-4);
  return vec4(oc, oa);
}

float goldHeight(vec2 uv) {
  return texture2D(tMask, uv).b;
}

/** Burnished gold over raised gesso, lit in relief. */
vec3 goldLeaf(vec2 w, vec2 uv) {
  vec2 e = uTexel * 1.5;
  float hl = goldHeight(uv - vec2(e.x, 0.0));
  float hr = goldHeight(uv + vec2(e.x, 0.0));
  float hd = goldHeight(uv - vec2(0.0, e.y));
  float hu = goldHeight(uv + vec2(0.0, e.y));
  vec3 n = normalize(vec3((hl - hr) * 3.2, (hd - hu) * 3.2, 1.0));
  // Leaf laid in squares, each a touch differently burnished, with fine cracks.
  vec2 cell = floor(w / 11.0);
  float leaf = hash12(cell + uSeed);
  vec2 jitter = vec2(vnoise(w * 0.7 + uSeed) - 0.5, vnoise(w * 0.7 + 31.0) - 0.5) * 0.22;
  n = normalize(n + vec3(jitter, 0.0) + vec3(leaf - 0.5, 0.0, 0.0) * 0.08);
  vec3 L = normalize(vec3(uLight, 0.75));
  float diff = clamp(dot(n, L), 0.0, 1.0);
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(n, H), 0.0), 36.0) * uShimmer;
  float sheen = pow(max(dot(n, H), 0.0), 6.0);
  vec3 col = mix(uGoldDark * 0.85, uGold, smoothstep(0.15, 0.95, diff));
  col = mix(col, uGoldLight, sheen * 0.35 + spec * 0.9);
  // The occasional sparkle.
  float sp = hash12(floor(w * 0.8) + floor(uTime * 2.0));
  col += uGoldLight * step(0.997, sp) * 0.3 * uShimmer;
  return col;
}

void main() {
  vec4 p = texture2D(tPaint, vUv);
  vec4 m = texture2D(tMask, vUv);
  vec3 paintCol = p.a > 0.001 ? p.rgb / p.a : vec3(0.0);
  float ink = m.r;
  float gold = m.g;

  // Local stage: noise makes the paint-in and fray patchy instead of a uniform fade.
  float n = vnoise(vWorld * 0.07 + uSeed * 7.0) * 0.65 + vnoise(vWorld * 0.31) * 0.35;
  float amp = 0.32 * smoothstep(0.0, 0.06, uStage) * (1.0 - smoothstep(0.94, 1.0, uStage));
  float s = clamp(uStage + (n - 0.5) * amp, 0.0, 1.0);

  // The illuminator's order: underdrawing, gold, paint (thin tint first), final ink.
  float under = ink * smoothstep(0.02, 0.16, s) * (1.0 - smoothstep(0.72, 0.95, s)) * 0.5;
  float g = gold * smoothstep(0.24, 0.42, s);
  float pa = p.a * smoothstep(0.34, 0.6, s);
  float tintStage = smoothstep(0.55, 0.8, s);
  vec3 thin = mix(uVellum, mix(vec3(luma(paintCol)), paintCol, 0.7), 0.45);
  vec3 pc = mix(thin, paintCol, tintStage);
  float ik = ink * smoothstep(0.7, 0.95, s);

  // Text being written: lines before the current one are done, later ones not yet begun.
  if (uWipe.x > 0.5) {
    float yy = 1.0 - vUv.y;
    if (yy >= uWipe.y) {
      float line = floor((yy - uWipe.y) / uWipe.z);
      float shown = line < uWipeAt.x ? 1.0 : (line > uWipeAt.x ? 0.0 : 1.0 - smoothstep(uWipeAt.y - 0.004, uWipeAt.y + 0.004, vUv.x));
      ik *= shown;
      under *= shown;
    }
  }
  // Thin ink is browner where it pools less.
  vec3 inkCol = mix(vec3(0.46, 0.33, 0.21), uInk, smoothstep(0.2, 0.85, ink));

  vec4 col = vec4(0.0);
  col = over(col, pc, pa);
  col = over(col, goldLeaf(vWorld, vUv), g);
  col = over(col, vec3(0.47, 0.45, 0.43), under);
  col = over(col, inkCol, ik);
  col.rgb *= uTint;

  // Raking light: underwriting shows only inside the candle's circle (and some paint hides).
  float vis = 1.0;
  if (uLensMode > 0.5) {
    float flicker = 1.0 + 0.03 * sin(uTime * 13.0) + 0.02 * sin(uTime * 7.3);
    float r = uLens.z * flicker;
    float inside = r > 0.0 ? 1.0 - smoothstep(r * 0.5, r, distance(vWorld, uLens.xy)) : 0.0;
    vis = uLensMode < 1.5 ? inside : 1.0 - inside;
  }
  gl_FragColor = vec4(col.rgb, col.a * uOpacity * vis);
}
`;

export class IlluminatedMaterial extends THREE.ShaderMaterial {
  constructor(image: IlluminatedImage, seed = Math.random() * 100) {
    const paint = new THREE.CanvasTexture(image.paint);
    const mask = new THREE.CanvasTexture(image.mask);
    for (const t of [paint, mask]) {
      t.colorSpace = THREE.NoColorSpace;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.anisotropy = 1;
    }
    // Premultiplied upload avoids dark fringes where paint meets transparent vellum.
    paint.premultiplyAlpha = true;
    super({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        ...spriteGlobals,
        tPaint: { value: paint },
        tMask: { value: mask },
        uStage: { value: 1 },
        uOpacity: { value: 1 },
        uSeed: { value: seed },
        uTint: { value: new THREE.Vector3(1, 1, 1) },
        uLensMode: { value: 0 },
        uTexel: { value: new THREE.Vector2(1 / image.mask.width, 1 / image.mask.height) },
        uWipe: { value: new THREE.Vector4(0, 0, 1, 0) },
        uWipeAt: { value: new THREE.Vector2(0, 0) },
      },
    });
  }

  get stage(): number {
    return this.uniforms.uStage!.value as number;
  }

  set stage(v: number) {
    this.uniforms.uStage!.value = v;
  }

  setOpacity(v: number): void {
    this.uniforms.uOpacity!.value = v;
  }

  set lensMode(v: number) {
    this.uniforms.uLensMode!.value = v;
  }

  /** Enable the text wipe: `top` and `lineHeight` as fractions of the image height. */
  setWipe(top: number, lineHeight: number): void {
    (this.uniforms.uWipe!.value as THREE.Vector4).set(1, top, lineHeight, 0);
  }

  /** Reveal up to `x` (fraction of image width) on line `line`. */
  setWipeAt(line: number, x: number): void {
    (this.uniforms.uWipeAt!.value as THREE.Vector2).set(line, x);
  }

  override dispose(): void {
    (this.uniforms.tPaint!.value as THREE.Texture).dispose();
    (this.uniforms.tMask!.value as THREE.Texture).dispose();
    super.dispose();
  }
}

/**
 * A plane showing an illuminated image, positioned in page coordinates (y down, origin
 * top-left of the page) by its anchor.
 */
export class Sprite {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, IlluminatedMaterial>;
  readonly image: IlluminatedImage;
  /** Page position of the anchor. */
  x = 0;
  y = 0;
  /** Extra vertical offset (bobbing), in page units, negative is up. */
  lift = 0;
  flip = false;
  rotation = 0;
  scale = 1;
  /** Sorting depth inside a layer: larger draws later. Defaults to y. */
  depth: number | null = null;

  constructor(image: IlluminatedImage, seed?: number) {
    this.image = image;
    const geo = new THREE.PlaneGeometry(image.width, image.height);
    this.mesh = new THREE.Mesh(geo, new IlluminatedMaterial(image, seed));
    this.mesh.frustumCulled = false;
  }

  get material(): IlluminatedMaterial {
    return this.mesh.material;
  }

  /** Write page-space transform into the mesh. `pageHeight` converts y-down to y-up. */
  sync(pageHeight: number, layerOrder: number): void {
    const { width: w, height: h, anchor } = this.image;
    // Offset from the anchor to the plane centre, in image space (y down).
    const ox = (w / 2 - anchor[0]) * (this.flip ? -1 : 1) * this.scale;
    const oy = (h / 2 - anchor[1]) * this.scale;
    const c = Math.cos(this.rotation);
    const s = Math.sin(this.rotation);
    const rx = ox * c - oy * s;
    const ry = ox * s + oy * c;
    this.mesh.position.set(this.x + rx, pageHeight - (this.y + this.lift + ry), 0);
    this.mesh.rotation.z = -this.rotation;
    this.mesh.scale.set((this.flip ? -1 : 1) * this.scale, this.scale, 1);
    this.mesh.renderOrder = layerOrder * 100000 + Math.round((this.depth ?? this.y) * 10);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

/**
 * A candle's glow: a soft warm disc added onto the page. Flickers a little.
 */
export class Glow {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  x = 0;
  y = 0;

  constructor(
    readonly radius: number,
    seed = Math.random() * 10,
    strength = 0.13,
  ) {
    const geo = new THREE.PlaneGeometry(radius * 2, radius * 2);
    const mat = new THREE.ShaderMaterial({
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform float uTime; uniform float uSeed; uniform float uStrength;
        varying vec2 vUv;
        void main() {
          float d = length(vUv - 0.5) * 2.0;
          float flicker = 0.9 + 0.06 * sin(uTime * 9.0 + uSeed) + 0.04 * sin(uTime * 23.0 + uSeed * 3.0);
          float a = pow(max(1.0 - d, 0.0), 2.2) * uStrength * flicker;
          gl_FragColor = vec4(vec3(1.0, 0.78, 0.42) * a, 1.0);
        }`,
      uniforms: { uTime: spriteGlobals.uTime, uSeed: { value: seed }, uStrength: { value: strength } },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
  }

  sync(pageHeight: number, layerOrder: number): void {
    this.mesh.position.set(this.x, pageHeight - this.y, 0);
    this.mesh.renderOrder = layerOrder * 100000 + 99999;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

/**
 * A soft contact shadow pooled under a figure or prop, so things sit on the ground.
 */
export class Shadow {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  x = 0;
  y = 0;

  constructor(rx: number, ry: number, strength = 0.32) {
    const geo = new THREE.PlaneGeometry(rx * 2, ry * 2);
    const mat = new THREE.ShaderMaterial({
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform float uStrength;
        varying vec2 vUv;
        void main() {
          float d = length((vUv - 0.5) * 2.0);
          float a = pow(max(1.0 - d, 0.0), 1.6) * uStrength;
          gl_FragColor = vec4(0.16, 0.11, 0.07, a);
        }`,
      uniforms: { uStrength: { value: strength } },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
  }

  sync(pageHeight: number, layerOrder: number): void {
    this.mesh.position.set(this.x, pageHeight - this.y, 0);
    this.mesh.renderOrder = layerOrder * 100000 + 99998;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
