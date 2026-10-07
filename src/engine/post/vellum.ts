/**
 * The vellum: drawn entirely on the GPU so it is crisp at any resolution. Mottled,
 * cockled, with hair-follicle specks, faint fibres, the scribe's drypoint ruling inside
 * the text block, full-height bounding lines and pricking holes in the outer margin.
 */

import * as THREE from 'three';
import { hexToRgb, PIGMENTS } from '../../art/palettes';
import { PAGE_H, PAGE_W, TEXT_BLOCK } from '../page';
import { NOISE_GLSL } from './glsl';

const VERT = /* glsl */ `
varying vec2 vPage;
void main() {
  vPage = vec2(position.x, ${PAGE_H.toFixed(1)} - position.y);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */ `
uniform vec3 uVellum;
uniform vec3 uShade;
uniform vec3 uDeep;
uniform vec4 uBlock;
uniform float uRuling;
uniform float uSeed;
varying vec2 vPage;

${NOISE_GLSL}

float hline(float y, float at, float w) {
  return smoothstep(w, 0.0, abs(y - at));
}

void main() {
  vec2 p = vPage + uSeed;
  float large = fbm(p * 0.0035 + 3.1);
  float mid = fbm(p * 0.018 + 11.0);
  vec3 c = mix(uDeep, uVellum, 0.6 + 0.4 * smoothstep(0.2, 0.8, large));
  c = mix(c, uShade, smoothstep(0.5, 0.85, mid) * 0.3);

  // Fibres: long faint streaks.
  float fib = vnoise(vec2(p.x * 0.01 + p.y * 0.003, p.y * 0.22));
  c *= 1.0 - smoothstep(0.72, 0.97, fib) * 0.03;

  // Hair follicles: sparse dark specks in loose clusters (the hair side of the skin).
  vec2 cell = floor(p / 4.0);
  float h = hash12(cell);
  float cluster = smoothstep(0.55, 0.8, fbm(p * 0.008 + 40.0));
  vec2 off = vec2(hash12(cell + 1.3), hash12(cell + 7.1)) - 0.5;
  float d = length(fract(p / 4.0) - 0.5 - off * 0.5);
  float foll = step(0.988 - cluster * 0.035, h) * smoothstep(0.22, 0.06, d);
  c = mix(c, vec3(0.56, 0.46, 0.34), foll * 0.3);

  // Fine grain.
  c *= 0.988 + vnoise(p * 0.45) * 0.024;

  // Drypoint ruling inside the text block, faint and unevenly pressed.
  vec2 q = vPage;
  float press = 0.55 + 0.45 * vnoise(q * 0.04);
  float rule = 0.0;
  if (q.x > uBlock.x - 2.0 && q.x < uBlock.x + uBlock.z + 2.0 && q.y > uBlock.y && q.y < uBlock.y + uBlock.w) {
    float r = mod(q.y - uBlock.y, 24.0);
    rule = max(rule, smoothstep(0.6, 0.0, min(r, 24.0 - r)));
  }
  // Bounding lines run the full height of the page, doubled at the sides.
  float bx = min(min(abs(q.x - uBlock.x), abs(q.x - uBlock.x + 7.0)),
                 min(abs(q.x - uBlock.x - uBlock.z), abs(q.x - uBlock.x - uBlock.z - 7.0)));
  rule = max(rule, smoothstep(0.6, 0.0, bx));
  rule = max(rule, hline(q.y, uBlock.y, 0.6) * step(uBlock.x - 30.0, q.x) * step(q.x, uBlock.x + uBlock.z + 30.0));
  rule = max(rule, hline(q.y, uBlock.y + uBlock.w, 0.6) * step(uBlock.x - 30.0, q.x) * step(q.x, uBlock.x + uBlock.z + 30.0));
  c = mix(c, vec3(0.55, 0.47, 0.38), rule * uRuling * press);

  // Pricking: little holes in the outer margins that guided the ruling.
  float pr = 0.0;
  if (q.y > uBlock.y - 1.0 && q.y < uBlock.y + uBlock.w + 1.0) {
    float r = mod(q.y - uBlock.y, 24.0);
    float py = min(r, 24.0 - r);
    float jitter = (hash12(vec2(floor((q.y - uBlock.y) / 24.0 + 0.5), 3.0)) - 0.5) * 1.6;
    pr += smoothstep(1.1, 0.4, length(vec2(q.x - 12.0 - jitter, py)));
    pr += smoothstep(1.1, 0.4, length(vec2(q.x - ${(PAGE_W - 12).toFixed(1)} + jitter, py)));
  }
  c = mix(c, vec3(0.36, 0.28, 0.2), clamp(pr, 0.0, 1.0) * 0.6);

  gl_FragColor = vec4(c, 1.0);
}
`;

export function createVellum(seed = 0): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(PAGE_W, PAGE_H);
  geo.translate(PAGE_W / 2, PAGE_H / 2, 0);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uVellum: { value: new THREE.Vector3(...hexToRgb(PIGMENTS.vellum)) },
      uShade: { value: new THREE.Vector3(...hexToRgb(PIGMENTS.vellumShade)) },
      uDeep: { value: new THREE.Vector3(...hexToRgb(PIGMENTS.vellumDeep)) },
      uBlock: { value: new THREE.Vector4(TEXT_BLOCK.x, TEXT_BLOCK.y, TEXT_BLOCK.w, TEXT_BLOCK.h) },
      uRuling: { value: 0.22 },
      uSeed: { value: seed },
    },
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return mesh;
}
