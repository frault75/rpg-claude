/**
 * The sky: a backdrop standing at the far edge of the map, drawn on the art-pixel grid
 * (banded gradient, twinkling stars, thin clouds lit by the moon, the moon and its halo).
 * It is seen above the horizon and in the water's reflection.
 */

import * as THREE from 'three';
import { SY } from '../engine/diorama/space';
import { NOISE_GLSL } from '../engine/diorama/glsl';

const VERT = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform float uSY;
uniform float uHeight;
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec2 uMoon;
uniform float uMoonR;
uniform vec3 uMoonColor;
uniform float uStars;
uniform float uClouds;
uniform vec3 uCloudColor;
varying vec3 vWorld;
${NOISE_GLSL}
float bayer4(vec2 p) {
  vec2 q = mod(p, 4.0);
  int i = int(q.y) * 4 + int(q.x);
  int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return (float(m[i]) + 0.5) / 16.0;
}
void main() {
  // Art pixels: x across, y = height above the horizon.
  vec2 ap = floor(vec2(vWorld.x, vWorld.y / uSY));
  float b = bayer4(ap);
  float v = clamp(1.0 - ap.y / uHeight, 0.0, 1.0); // 0 at the top, 1 at the horizon
  float q = floor(v * 8.0 + b * 0.999) / 8.0;
  vec3 col = mix(uTop, uHorizon, pow(q, 1.5));

  float h = hash12(ap);
  if (h > 1.0 - 0.006 * uStars * (1.2 - v)) {
    float tw = 0.55 + 0.45 * sin(uTime * (1.5 + h * 40.0) + h * 300.0);
    vec3 sc = mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.92, 0.78), fract(h * 91.0));
    col = mix(col, sc * 1.2, tw * (1.0 - v * 0.7));
  }
  float hb = hash12(floor(ap / 3.0) * 7.31);
  if (hb > 0.9975 && v < 0.75) {
    vec2 c = floor(ap / 3.0) * 3.0 + 1.0;
    vec2 dd = abs(ap - c);
    float tw = 0.6 + 0.4 * sin(uTime * 2.3 + hb * 50.0);
    if ((dd.x < 0.5 && dd.y < 1.5) || (dd.y < 0.5 && dd.x < 1.5)) col = mix(col, vec3(1.3, 1.25, 1.15), tw);
  }
  if (uClouds > 0.0) {
    float n = fbm(vec2(ap.x * 0.012 + uTime * 0.004, ap.y * 0.05));
    float m = smoothstep(0.55, 0.7, n) * uClouds * smoothstep(0.0, 0.3, v);
    float lit = clamp(1.0 - length((ap - uMoon) / vec2(160.0, 70.0)), 0.0, 1.0);
    if (m > b * 0.9) col = mix(col, uCloudColor * (0.6 + lit * 0.9), 0.7);
  }
  vec2 mq = ap - uMoon;
  float md = length(mq);
  if (md < uMoonR) {
    float sea = fbm(mq * 0.22 + 3.0);
    vec3 mc = uMoonColor * (sea > 0.58 ? 0.82 : 1.0);
    if (dot(mq, vec2(0.7, -0.7)) > uMoonR * 0.55) mc *= 0.9;
    col = mc * 1.6;
  } else {
    float halo = exp(-(md - uMoonR) * 0.09);
    if (halo * 0.9 > b) col = mix(col, uMoonColor * 0.55 + col * 0.45, 0.35 * halo + 0.1);
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

export interface SkyDef {
  top: string;
  horizon: string;
  /** Moon position in art pixels: x, and height above the horizon. */
  moon: [number, number] | null;
  moonR?: number;
  moonColor?: string;
  stars?: number;
  clouds?: number;
  cloudColor?: string;
}

export const NIGHT_SKY: SkyDef = {
  top: '#03061A',
  horizon: '#22346A',
  moon: null,
  moonR: 10,
  moonColor: '#FFF4D6',
  stars: 1,
  clouds: 0.8,
  cloudColor: '#4A5C8C',
};

function rgb(c: string): THREE.Vector3 {
  const k = new THREE.Color(c);
  return new THREE.Vector3(k.r, k.g, k.b);
}

export class Sky {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

  /** A backdrop from x0 to x1 (art pixels) standing at world z, `height` pixels tall. */
  constructor(x0: number, x1: number, z: number, height: number, def: SkyDef = NIGHT_SKY) {
    const geo = new THREE.PlaneGeometry(x1 - x0, height * SY);
    geo.translate((x0 + x1) / 2, (height * SY) / 2 - 20, z);
    this.mesh = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          uTime: { value: 0 },
          uSY: { value: SY },
          uHeight: { value: height },
          uTop: { value: rgb(def.top) },
          uHorizon: { value: rgb(def.horizon) },
          uMoon: { value: new THREE.Vector2(...(def.moon ?? [-9999, -9999])) },
          uMoonR: { value: def.moonR ?? 10 },
          uMoonColor: { value: rgb(def.moonColor ?? '#FFF4D6') },
          uStars: { value: def.stars ?? 1 },
          uClouds: { value: def.clouds ?? 0 },
          uCloudColor: { value: rgb(def.cloudColor ?? '#4A5C8C') },
        },
      }),
    );
    this.mesh.frustumCulled = false;
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
