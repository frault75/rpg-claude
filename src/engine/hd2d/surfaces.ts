/**
 * Animated surfaces drawn in the world pass: water (depth bands, drifting ripples, foam
 * that breathes along the shore, the moon's broken reflection) and the night sky (a
 * gradient, twinkling stars, the moon and thin lit clouds). Both work on the art-pixel
 * grid, so their animation is as crisp as the sprites around them.
 */

import * as THREE from 'three';
import { PX } from '../../pixel/sprite';
import { NOISE_GLSL } from './glsl';
import { WORLD_OUT, WORLD_VERT } from './shaders';

const BAYER_GLSL = /* glsl */ `
float bayer4(vec2 p) {
  vec2 q = mod(p, 4.0);
  int i = int(q.y) * 4 + int(q.x);
  int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return (float(m[i]) + 0.5) / 16.0;
}
`;

function rgb(c: string): THREE.Vector3 {
  const k = new THREE.Color(c);
  return new THREE.Vector3(k.r, k.g, k.b);
}

const WATER_FRAG = /* glsl */ `
${WORLD_OUT}
uniform sampler2D tShore;
uniform vec2 uMapPx;
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uShallow;
uniform vec3 uRipple;
uniform vec3 uFoam;
uniform vec3 uGlint;
uniform float uMoonX;
uniform float uMoonW;
uniform float uMoonY0;
varying vec2 vUv;
varying vec2 vWorld;
${NOISE_GLSL}
${BAYER_GLSL}
void main() {
  vec2 ap = floor(vWorld / ${PX.toFixed(1)});
  vec2 suv = (ap + 0.5) / uMapPx;
  vec4 sh = texture2D(tShore, vec2(suv.x, 1.0 - suv.y));
  if (sh.g < 0.5) discard;
  float d = sh.r * 255.0;
  float b = bayer4(ap);
  float t = uTime;

  // Depth bands, dithered, with slow swells moving through them.
  float swell = vnoise(ap * vec2(0.03, 0.07) + vec2(t * 0.08, t * 0.03));
  float depth = clamp(d / 22.0, 0.0, 1.0) * 2.0 + (swell - 0.5) * 0.7;
  vec3 col = depth < 0.6 + b * 0.5 ? uShallow : depth < 1.35 + b * 0.5 ? uMid : uDeep;

  // Ripples: short thin horizontal dashes that drift and shimmer.
  float r1 = vnoise(vec2(ap.x * 0.16 + t * 0.35, ap.y * 1.3));
  float r2 = vnoise(vec2(ap.x * 0.04 - t * 0.12, ap.y * 0.22 + 9.0));
  float row = step(0.5, fract(ap.y * 0.5 + floor(ap.x / 23.0) * 0.5));
  float rip = r1 * (0.4 + r2) * row;
  if (rip > 0.62) col = mix(col, uRipple, 0.85);
  else if (rip > 0.52 && b > 0.5) col = mix(col, uRipple, 0.45);

  // Foam breathing along the shore.
  float wave = sin(t * 1.3 + ap.x * 0.07 + ap.y * 0.05) * 0.5 + 0.5;
  float edge = 1.0 + wave * 2.2 + vnoise(ap * 0.35 + t * 0.4) * 1.6;
  vec3 em = vec3(0.0);
  if (d <= edge) col = uFoam;
  else if (d <= edge + 2.0 && b > 0.6 + (d - edge) * 0.15) col = mix(col, uFoam, 0.6);
  else if (d <= edge + 5.0 && vnoise(ap * 0.5 - t * 0.3) > 0.82) col = mix(col, uFoam, 0.35);

  // The moon's reflection: a column of broken glints below it.
  if (uMoonW > 0.0 && ap.y > uMoonY0) {
    float sway = sin(ap.y * 0.45 + t * 1.6) * 1.5 + sin(ap.y * 0.13 - t * 0.7) * 2.0;
    float dist = abs(ap.x - uMoonX + sway);
    float spread = uMoonW * (0.55 + 0.45 * hash12(vec2(ap.y, floor(t * 3.0))));
    float on = step(0.45, vnoise(vec2(ap.x * 0.25, ap.y * 1.3 + t * 1.1))) * step(0.5, fract(ap.y * 0.5));
    float fall = 1.0 - clamp((ap.y - uMoonY0) / 160.0, 0.0, 0.8);
    if (dist < spread && on > 0.0) {
      col = mix(col, uGlint, 0.8);
      em = uGlint * (0.55 + 0.45 * (1.0 - dist / spread)) * fall;
    }
  }
  gColor = vec4(col, 1.0);
  gEmissive = vec4(em, 1.0);
}
`;

export interface WaterColours {
  deep: string;
  mid: string;
  shallow: string;
  ripple: string;
  foam: string;
  glint: string;
}

export const SEA_NIGHT: WaterColours = {
  deep: '#163460',
  mid: '#1F4778',
  shallow: '#2E6590',
  ripple: '#5E94BE',
  foam: '#C8DEEA',
  glint: '#FFF3C8',
};

export class WaterSurface {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  /** `isWater` marks the pixels that are water; elsewhere the surface is not drawn. */
  constructor(shore: Uint8Array, isWater: (i: number) => boolean, wPx: number, hPx: number, colours: WaterColours = SEA_NIGHT) {
    // Rows flipped so that texture row 0 is the top of the map.
    const data = new Uint8Array(wPx * hPx * 4);
    for (let y = 0; y < hPx; y++) {
      for (let x = 0; x < wPx; x++) {
        const s = shore[y * wPx + x]!;
        const o = ((hPx - 1 - y) * wPx + x) * 4;
        data[o] = s;
        data[o + 1] = isWater(y * wPx + x) ? 255 : 0;
        data[o + 3] = 255;
      }
    }
    const tex = new THREE.DataTexture(data, wPx, hPx, THREE.RGBAFormat);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    const w = wPx * PX;
    const h = hPx * PX;
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h).translate(w / 2, -h / 2, 0),
      new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: WORLD_VERT,
        fragmentShader: WATER_FRAG,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uFrame: { value: new THREE.Vector4(0, 0, 1, 1) },
          tShore: { value: tex },
          uMapPx: { value: new THREE.Vector2(wPx, hPx) },
          uTime: { value: 0 },
          uDeep: { value: rgb(colours.deep) },
          uMid: { value: rgb(colours.mid) },
          uShallow: { value: rgb(colours.shallow) },
          uRipple: { value: rgb(colours.ripple) },
          uFoam: { value: rgb(colours.foam) },
          uGlint: { value: rgb(colours.glint) },
          uMoonX: { value: 0 },
          uMoonW: { value: 0 },
          uMoonY0: { value: 0 },
        },
      }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 200000;
  }

  /** Lay the moon's reflection under art-pixel column `x`, starting at row `y0`. */
  moon(x: number, width: number, y0: number): void {
    const u = this.mesh.material.uniforms;
    u.uMoonX!.value = x;
    u.uMoonW!.value = width;
    u.uMoonY0!.value = y0;
  }

  update(time: number): void {
    this.mesh.material.uniforms.uTime!.value = time;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.uniforms.tShore!.value.dispose();
    this.mesh.material.dispose();
  }
}

const SKY_FRAG = /* glsl */ `
${WORLD_OUT}
uniform float uTime;
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec2 uSizePx;
uniform vec2 uMoon;
uniform float uMoonR;
uniform vec3 uMoonColor;
uniform float uStars;
uniform float uClouds;
uniform vec3 uCloudColor;
varying vec2 vUv;
varying vec2 vWorld;
${NOISE_GLSL}
${BAYER_GLSL}
void main() {
  vec2 ap = floor(vWorld / ${PX.toFixed(1)});
  vec2 lp = ap - floor(vec2(0.0));
  float b = bayer4(ap);
  float v = clamp(1.0 - vUv.y, 0.0, 1.0); // 0 top, 1 horizon
  // Banded gradient, dithered at the band edges.
  float bands = 7.0;
  float q = floor(v * bands + b * 0.999) / bands;
  vec3 col = mix(uTop, uHorizon, pow(q, 1.4));

  // Stars, denser and brighter high up, each twinkling on its own clock.
  float h = hash12(ap);
  vec3 em = col;
  if (h > 1.0 - 0.006 * uStars * (1.2 - v)) {
    float tw = 0.55 + 0.45 * sin(uTime * (1.5 + h * 40.0) + h * 300.0);
    vec3 sc = mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.92, 0.78), fract(h * 91.0));
    em = mix(em, sc, tw * (1.0 - v * 0.7));
  }
  // A few bright crosses.
  float hb = hash12(floor(ap / 3.0) * 7.31);
  if (hb > 0.9975 && v < 0.75) {
    vec2 c = floor(ap / 3.0) * 3.0 + 1.0;
    vec2 dd = abs(ap - c);
    float tw = 0.6 + 0.4 * sin(uTime * 2.3 + hb * 50.0);
    if ((dd.x < 0.5 && dd.y < 1.5) || (dd.y < 0.5 && dd.x < 1.5)) em = mix(em, vec3(1.0, 0.97, 0.9), tw);
  }

  // Thin clouds, lit from the moon's side.
  if (uClouds > 0.0) {
    float n = fbm(vec2(ap.x * 0.012 + uTime * 0.004, ap.y * 0.05));
    float m = smoothstep(0.55, 0.7, n) * uClouds * smoothstep(0.0, 0.3, v);
    float lit = clamp(1.0 - length((ap - uMoon) / vec2(160.0, 70.0)), 0.0, 1.0);
    if (m > b * 0.9) em = mix(em, uCloudColor * (0.6 + lit * 0.8), 0.7);
  }

  // The moon: a disc with dark seas, a lit limb and a dithered halo.
  vec2 mq = ap - uMoon;
  float md = length(mq);
  if (md < uMoonR) {
    float sea = fbm(mq * 0.22 + 3.0);
    vec3 mc = uMoonColor * (sea > 0.58 ? 0.82 : 1.0);
    if (dot(mq, vec2(0.7, 0.7)) > uMoonR * 0.55) mc *= 0.9;
    em = mc;
  } else {
    float halo = exp(-(md - uMoonR) * 0.09);
    if (halo * 0.9 > b) em = mix(em, uMoonColor * 0.55 + col * 0.45, 0.35 * halo + 0.1);
  }
  gColor = vec4(0.0, 0.0, 0.0, 1.0);
  gEmissive = vec4(em, 1.0);
}
`;

export interface SkyDef {
  top: string;
  horizon: string;
  moon: [number, number] | null;
  moonR?: number;
  moonColor?: string;
  stars?: number;
  clouds?: number;
  cloudColor?: string;
}

export const NIGHT_SKY: SkyDef = {
  top: '#060A1C',
  horizon: '#2A3C6E',
  moon: [0, 0],
  moonR: 9,
  moonColor: '#FFF4D6',
  stars: 1,
  clouds: 0.8,
  cloudColor: '#5A6C9C',
};

/** A sky panel covering world rect (x, y, w, h); the moon position is in art pixels. */
export class SkySurface {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  constructor(x: number, y: number, w: number, h: number, def: SkyDef = NIGHT_SKY) {
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h).translate(x + w / 2, -(y + h / 2), 0),
      new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: WORLD_VERT,
        fragmentShader: SKY_FRAG,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uFrame: { value: new THREE.Vector4(0, 0, 1, 1) },
          uTime: { value: 0 },
          uTop: { value: rgb(def.top) },
          uHorizon: { value: rgb(def.horizon) },
          uSizePx: { value: new THREE.Vector2(w / PX, h / PX) },
          uMoon: { value: new THREE.Vector2(def.moon ? def.moon[0] : -9999, def.moon ? def.moon[1] : -9999) },
          uMoonR: { value: def.moonR ?? 9 },
          uMoonColor: { value: rgb(def.moonColor ?? '#FFF4D6') },
          uStars: { value: def.stars ?? 1 },
          uClouds: { value: def.clouds ?? 0 },
          uCloudColor: { value: rgb(def.cloudColor ?? '#5A6C9C') },
        },
      }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 0;
  }

  update(time: number): void {
    this.mesh.material.uniforms.uTime!.value = time;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
