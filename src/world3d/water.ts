/**
 * Water for the diorama: a plane at the water level whose shader works on the art-pixel
 * grid (depth bands, ripples, foam breathing along the shore, the moon's broken path)
 * and mixes in the mirrored scene, wobbling row by row like reflections in pixel art.
 */

import * as THREE from 'three';
import type { Mirror } from '../engine/diorama/renderer';
import { SY, SZ } from '../engine/diorama/space';
import { NOISE_GLSL } from '../engine/diorama/glsl';
import { WATER_LEVEL } from './terrain';

const VERT = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const FRAG = /* glsl */ `
uniform sampler2D tShore;
uniform sampler2D tReflect;
uniform mat4 uTexMat;
uniform float uHasReflect;
uniform float uReflectivity;
uniform vec2 uMapPx;
uniform float uSZ;
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uShallow;
uniform vec3 uRipple;
uniform vec3 uFoam;
uniform vec3 uGlint;
uniform vec3 uMoon; // x (art px), half-width, strength
varying vec3 vWorld;
${NOISE_GLSL}
float bayer4(vec2 p) {
  vec2 q = mod(p, 4.0);
  int i = int(q.y) * 4 + int(q.x);
  int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return (float(m[i]) + 0.5) / 16.0;
}
void main() {
  vec2 mp = vec2(vWorld.x, vWorld.z / uSZ);
  vec2 ap = floor(mp);
  vec2 suv = (ap + 0.5) / uMapPx;
  float d = 40.0;
  if (suv.x >= 0.0 && suv.x <= 1.0 && suv.y >= 0.0 && suv.y <= 1.0) d = texture2D(tShore, vec2(suv.x, 1.0 - suv.y)).r * 255.0;
  float b = bayer4(ap);
  float t = uTime;

  float swell = vnoise(ap * vec2(0.03, 0.07) + vec2(t * 0.08, t * 0.03));
  float depth = clamp(d / 22.0, 0.0, 1.0) * 2.0 + (swell - 0.5) * 0.7;
  vec3 col = depth < 0.6 + b * 0.5 ? uShallow : depth < 1.35 + b * 0.5 ? uMid : uDeep;

  // Reflection: the mirrored scene, each pixel row shifted a little by the waves.
  float refl = 0.0;
  if (uHasReflect > 0.5) {
    vec4 rc = uTexMat * vec4(vWorld, 1.0);
    vec2 ruv = rc.xy / rc.w;
    float wob = sin(ap.y * 0.9 + t * 2.2) * 0.6 + sin(ap.y * 0.37 - t * 1.3) * 0.8;
    ruv.x += floor(wob + 0.5) * 0.0016;
    vec3 rcol = texture2D(tReflect, ruv).rgb;
    float k = uReflectivity * clamp(d / 6.0, 0.25, 1.0);
    col = mix(col, rcol * 0.92 + col * 0.18, k);
    refl = k;
  }

  // Ripples: short thin horizontal dashes.
  float r1 = vnoise(vec2(ap.x * 0.16 + t * 0.35, ap.y * 1.3));
  float r2 = vnoise(vec2(ap.x * 0.04 - t * 0.12, ap.y * 0.22 + 9.0));
  float row = step(0.5, fract(ap.y * 0.5 + floor(ap.x / 23.0) * 0.5));
  float rip = r1 * (0.4 + r2) * row;
  if (rip > 0.62) col = mix(col, uRipple, 0.7);
  else if (rip > 0.52 && b > 0.5) col = mix(col, uRipple, 0.35);

  // Foam along the shore.
  float wave = sin(t * 1.3 + ap.x * 0.07 + ap.y * 0.05) * 0.5 + 0.5;
  float edge = 1.0 + wave * 2.2 + vnoise(ap * 0.35 + t * 0.4) * 1.6;
  if (d <= edge) col = uFoam;
  else if (d <= edge + 2.0 && b > 0.6 + (d - edge) * 0.15) col = mix(col, uFoam, 0.6);
  else if (d <= edge + 5.0 && vnoise(ap * 0.5 - t * 0.3) > 0.82) col = mix(col, uFoam, 0.35);

  // The moon's path: broken glints in a column.
  if (uMoon.z > 0.0) {
    float sway = sin(ap.y * 0.45 + t * 1.6) * 1.5 + sin(ap.y * 0.13 - t * 0.7) * 2.0;
    float dist = abs(ap.x - uMoon.x + sway);
    float spread = uMoon.y * (0.55 + 0.45 * hash12(vec2(ap.y, floor(t * 3.0))));
    float on = step(0.45, vnoise(vec2(ap.x * 0.25, ap.y * 1.3 + t * 1.1))) * step(0.5, fract(ap.y * 0.5));
    if (dist < spread && on > 0.0) col = mix(col, uGlint * 1.6, 0.85 * uMoon.z);
  }
  gl_FragColor = vec4(col, 1.0);
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
  deep: '#0E2244',
  mid: '#16325E',
  shallow: '#22507A',
  ripple: '#4E80AA',
  foam: '#AFC8DA',
  glint: '#FFF0C0',
};

function rgb(c: string): THREE.Vector3 {
  const k = new THREE.Color(c);
  return new THREE.Vector3(k.r, k.g, k.b);
}

export class Water implements Mirror {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  readonly level = WATER_LEVEL * SY;

  /** `shore`: per map pixel, distance from water to land (0 on land). */
  constructor(shore: Uint8Array, wPx: number, hPx: number, colours: WaterColours = SEA_NIGHT, margin = 600) {
    const data = new Uint8Array(wPx * hPx * 4);
    for (let y = 0; y < hPx; y++) {
      for (let x = 0; x < wPx; x++) {
        const o = ((hPx - 1 - y) * wPx + x) * 4;
        data[o] = shore[y * wPx + x]!;
        data[o + 3] = 255;
      }
    }
    const tex = new THREE.DataTexture(data, wPx, hPx, THREE.RGBAFormat);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    const w = wPx + margin * 2;
    const d = (hPx + margin) * SZ;
    const geo = new THREE.PlaneGeometry(w, d);
    geo.rotateX(-Math.PI / 2);
    geo.translate(wPx / 2, this.level, (hPx * SZ + margin * SZ) / 2);
    this.mesh = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          tShore: { value: tex },
          tReflect: { value: null },
          uTexMat: { value: new THREE.Matrix4() },
          uHasReflect: { value: 0 },
          uReflectivity: { value: 0.55 },
          uMapPx: { value: new THREE.Vector2(wPx, hPx) },
          uSZ: { value: SZ },
          uTime: { value: 0 },
          uDeep: { value: rgb(colours.deep) },
          uMid: { value: rgb(colours.mid) },
          uShallow: { value: rgb(colours.shallow) },
          uRipple: { value: rgb(colours.ripple) },
          uFoam: { value: rgb(colours.foam) },
          uGlint: { value: rgb(colours.glint) },
          uMoon: { value: new THREE.Vector3(0, 0, 0) },
        },
      }),
    );
    this.mesh.frustumCulled = false;
  }

  /** Lay the moon's path on the water under art-pixel column x. */
  moon(x: number, halfWidth: number, strength = 1): void {
    this.mesh.material.uniforms.uMoon!.value.set(x, halfWidth, strength);
  }

  setReflection(tex: THREE.Texture | null, matrix: THREE.Matrix4): void {
    const u = this.mesh.material.uniforms;
    u.tReflect!.value = tex;
    u.uHasReflect!.value = tex ? 1 : 0;
    u.uTexMat!.value.copy(matrix);
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
