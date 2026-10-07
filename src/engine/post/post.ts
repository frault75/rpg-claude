/**
 * The post-processing chain (DESIGN.md §6.8). Two shaders:
 *
 *   ageing: computed once per resize (or when a toggle changes): paper grain, the warm
 *           page vignette, foxing, and the granulation noise. Stored in a texture.
 *   final:  every frame: ink bleed, pigment granulation, colour grade and blanch, then
 *           the stored ageing multiplied in.
 *
 * Each stage can be toggled from the debug overlay.
 */

import * as THREE from 'three';
import { type Grade, hexToRgb, PIGMENTS } from '../../art/palettes';
import { PAGE_H, PAGE_W } from '../page';
import { NOISE_GLSL } from './glsl';

export const POST_STAGES = ['bleed', 'granulation', 'grain', 'grade', 'vignette', 'foxing'] as const;
export type PostStage = (typeof POST_STAGES)[number];

/** Ageing multipliers are stored divided by this, so values above 1 survive an 8-bit target. */
const AGE_RANGE = 1.25;

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const AGEING_FRAG = /* glsl */ `
uniform float uGrain;
uniform float uVig;
uniform float uFox;
varying vec2 vUv;

${NOISE_GLSL}

void main() {
  vec2 pg = vec2(vUv.x * ${PAGE_W.toFixed(1)}, (1.0 - vUv.y) * ${PAGE_H.toFixed(1)});
  vec3 m = vec3(1.0);

  // Paper grain, so paint and vellum share one surface.
  float gr = vnoise(pg * 1.5) * 0.5 + vnoise(vec2(pg.x * 0.05, pg.y * 1.1)) * 0.5;
  m *= 1.0 + (gr - 0.5) * 0.045 * uGrain;

  // A warm darkening towards the page edges.
  vec2 q = vUv * 2.0 - 1.0;
  float v = pow(max(abs(q.x) * 0.92, abs(q.y)), 7.0) * 0.45 + dot(q, q) * 0.04;
  m *= mix(vec3(1.0), vec3(0.82, 0.72, 0.6), clamp(v, 0.0, 1.0) * uVig);

  // Foxing: brown age spots, mostly near the edges.
  float edge = smoothstep(0.6, 1.0, max(abs(q.x), abs(q.y)));
  float fx = fbm(pg * 0.025 + 5.0);
  float spot = smoothstep(0.78 - edge * 0.12, 0.84 - edge * 0.12, fx) * (0.35 + 0.65 * vnoise(pg * 0.25));
  m = mix(m, m * vec3(0.86, 0.73, 0.57), spot * 0.22 * uFox);

  // Granulation noise for the final pass, in alpha.
  float gn = vnoise(pg * 0.85) * 0.6 + vnoise(pg * 2.6) * 0.4;
  gl_FragColor = vec4(m / ${AGE_RANGE.toFixed(2)}, gn);
}
`;

const FINAL_FRAG = /* glsl */ `
uniform sampler2D tScene;
uniform sampler2D tAgeing;
uniform vec2 uRes;
uniform float uPxPerUnit;
uniform vec3 uVellum;
uniform vec3 uTint;
uniform float uLift;
uniform float uGamma;
uniform float uGain;
uniform float uSat;
uniform float uBlanch;
uniform float uBleed;
uniform float uGran;
uniform float uGrade;
varying vec2 vUv;

float luma(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

void main() {
  vec3 c = texture2D(tScene, vUv).rgb;
  vec4 age = texture2D(tAgeing, vUv);
  float gn = age.a;

  // Ink bleed: dark lines creep a little into the vellum, unevenly, like capillaries.
  if (uBleed > 0.0) {
    vec2 texel = 1.0 / uRes;
    float rad = 0.75 * uPxPerUnit;
    vec3 darkest = c;
    float base = gn * 6.283;
    for (int i = 0; i < 6; i++) {
      float a = base + float(i) * 1.0472;
      float r = rad * (0.5 + 0.9 * fract(gn * 7.31 + float(i) * 0.618));
      vec3 s = texture2D(tScene, vUv + vec2(cos(a), sin(a)) * r * texel).rgb;
      if (luma(s) < luma(darkest)) darkest = s;
    }
    float diff = max(luma(c) - luma(darkest), 0.0);
    c = mix(c, darkest, clamp(diff * 1.4, 0.0, 1.0) * 0.26 * uBleed);
  }

  // Pigment granulation where colour departs from the bare page.
  float pig = clamp(length(c - uVellum) * 1.6, 0.0, 1.0);
  c *= 1.0 + (gn - 0.5) * 0.11 * pig * uGran;

  // Colour grade and blanching.
  if (uGrade > 0.0) {
    vec3 g = c * uTint;
    g = pow(max(g * uGain + uLift, 0.0), vec3(1.0 / uGamma));
    float l = luma(g);
    g = mix(vec3(l), g, uSat);
    vec3 blanched = uVellum * mix(0.82, 1.0, smoothstep(0.15, 0.85, l));
    g = mix(g, blanched, uBlanch);
    c = mix(c, g, uGrade);
  }

  c *= age.rgb * ${AGE_RANGE.toFixed(2)};
  gl_FragColor = vec4(c, 1.0);
}
`;

function fullscreenTriangle(): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  return geo;
}

export class PostPass {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  readonly enabled: Record<PostStage, boolean> = {
    bleed: true,
    granulation: true,
    grain: true,
    grade: true,
    vignette: true,
    foxing: true,
  };
  private readonly final: THREE.ShaderMaterial;
  private readonly ageingMat: THREE.ShaderMaterial;
  private readonly ageingScene = new THREE.Scene();
  private readonly ageing = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
  private ageingKey = '';

  constructor() {
    const tri = fullscreenTriangle();
    this.final = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FINAL_FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tScene: { value: null },
        tAgeing: { value: this.ageing.texture },
        uRes: { value: new THREE.Vector2(1, 1) },
        uPxPerUnit: { value: 1 },
        uVellum: { value: new THREE.Vector3(...hexToRgb(PIGMENTS.vellum)) },
        uTint: { value: new THREE.Vector3(1, 1, 1) },
        uLift: { value: 0 },
        uGamma: { value: 1 },
        uGain: { value: 1 },
        uSat: { value: 1 },
        uBlanch: { value: 0 },
        uBleed: { value: 1 },
        uGran: { value: 1 },
        uGrade: { value: 1 },
      },
    });
    const mesh = new THREE.Mesh(tri, this.final);
    mesh.frustumCulled = false;
    this.scene.add(mesh);

    this.ageingMat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: AGEING_FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: { uGrain: { value: 1 }, uVig: { value: 1 }, uFox: { value: 1 } },
    });
    const ageMesh = new THREE.Mesh(tri, this.ageingMat);
    ageMesh.frustumCulled = false;
    this.ageingScene.add(ageMesh);
  }

  private get u() {
    return this.final.uniforms;
  }

  setGrade(g: Grade): void {
    (this.u.uTint!.value as THREE.Vector3).set(...g.tint);
    this.u.uLift!.value = g.lift;
    this.u.uGamma!.value = g.gamma;
    this.u.uGain!.value = g.gain;
    this.u.uSat!.value = g.saturation;
    this.u.uBlanch!.value = g.blanch;
  }

  /** Blend between two grades (for location transitions). */
  setGradeMix(a: Grade, b: Grade, t: number): void {
    const l = (x: number, y: number) => x + (y - x) * t;
    this.setGrade({
      tint: [l(a.tint[0], b.tint[0]), l(a.tint[1], b.tint[1]), l(a.tint[2], b.tint[2])],
      lift: l(a.lift, b.lift),
      gamma: l(a.gamma, b.gamma),
      gain: l(a.gain, b.gain),
      saturation: l(a.saturation, b.saturation),
      blanch: l(a.blanch, b.blanch),
    });
  }

  /**
   * Bind this frame's scene texture, and refresh the stored ageing if the size or a
   * toggle changed. Leaves the renderer's target as it found it (null).
   */
  prepare(renderer: THREE.WebGLRenderer, scene: THREE.Texture, width: number, height: number, pxPerUnit: number): void {
    const e = this.enabled;
    const key = `${width}x${height}:${e.grain}:${e.vignette}:${e.foxing}`;
    if (key !== this.ageingKey) {
      this.ageingKey = key;
      this.ageing.setSize(width, height);
      const au = this.ageingMat.uniforms;
      au.uGrain!.value = e.grain ? 1 : 0;
      au.uVig!.value = e.vignette ? 1 : 0;
      au.uFox!.value = e.foxing ? 1 : 0;
      this.ageing.viewport.set(0, 0, width, height);
      renderer.setRenderTarget(this.ageing);
      renderer.render(this.ageingScene, this.camera);
      renderer.setRenderTarget(null);
    }
    this.u.tScene!.value = scene;
    (this.u.uRes!.value as THREE.Vector2).set(width, height);
    this.u.uPxPerUnit!.value = pxPerUnit;
    this.u.uBleed!.value = e.bleed ? 1 : 0;
    this.u.uGran!.value = e.granulation ? 1 : 0;
    this.u.uGrade!.value = e.grade ? 1 : 0;
  }
}
