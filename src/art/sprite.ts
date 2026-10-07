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
};

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
varying vec2 vUv;
varying vec2 vWorld;

${NOISE_GLSL}

vec4 over(vec4 dst, vec3 c, float a) {
  float oa = a + dst.a * (1.0 - a);
  vec3 oc = (c * a + dst.rgb * dst.a * (1.0 - a)) / max(oa, 1e-4);
  return vec4(oc, oa);
}

vec3 goldLeaf(vec2 w) {
  // Leaf is laid in small squares; each catches the light a little differently.
  vec2 cell = floor(w / 9.0);
  float leaf = hash12(cell + uSeed);
  float burnish = vnoise(w * 0.35 + uSeed) * 0.6 + vnoise(w * 1.7) * 0.4;
  vec3 col = mix(uGoldDark, uGold, 0.45 + 0.4 * burnish + 0.15 * leaf);
  // A slow band of light sweeping across the page, as if the book were tilted.
  float band = sin((w.x * 0.8 + w.y * 1.3) * 0.006 - uTime * 0.55 + leaf * 0.6);
  float glint = pow(max(band, 0.0), 14.0) * uShimmer;
  col = mix(col, uGoldLight, clamp(glint * 0.85 + smoothstep(0.82, 1.0, burnish) * 0.35, 0.0, 1.0));
  // Tiny sparkles.
  float sp = hash12(floor(w * 0.9) + floor(uTime * 3.0));
  col += uGoldLight * step(0.996, sp) * 0.35 * uShimmer;
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
  // Thin ink is browner where it pools less.
  vec3 inkCol = mix(vec3(0.46, 0.33, 0.21), uInk, smoothstep(0.2, 0.85, ink));

  vec4 col = vec4(0.0);
  col = over(col, pc, pa);
  col = over(col, goldLeaf(vWorld), g);
  col = over(col, vec3(0.47, 0.45, 0.43), under);
  col = over(col, inkCol, ik);
  col.rgb *= uTint;
  gl_FragColor = vec4(col.rgb, col.a * uOpacity);
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
