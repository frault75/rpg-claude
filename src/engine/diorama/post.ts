/** Post-processing shaders for the diorama: depth of field, fog, bloom, grade. */

import { NOISE_GLSL } from './glsl';

export const QUAD_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const BLOOM_PREFILTER_FRAG = /* glsl */ `
uniform sampler2D tMap;
uniform vec2 uTexel;
uniform float uThreshold;
uniform float uKnee;
varying vec2 vUv;
void main() {
  vec3 c = vec3(0.0);
  c += texture2D(tMap, vUv + uTexel * vec2(-1.0, -1.0)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2(1.0, -1.0)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2(-1.0, 1.0)).rgb;
  c += texture2D(tMap, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  c *= 0.25;
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - uThreshold + uKnee, 0.0, 2.0 * uKnee);
  soft = soft * soft / (4.0 * uKnee + 1e-4);
  float contrib = max(soft, br - uThreshold) / max(br, 1e-4);
  gl_FragColor = vec4(c * contrib, 1.0);
}
`;

export const DOWN_FRAG = /* glsl */ `
uniform sampler2D tMap;
uniform vec2 uTexel;
varying vec2 vUv;
vec3 s(vec2 o) { return texture2D(tMap, vUv + o * uTexel).rgb; }
void main() {
  vec3 a = s(vec2(-2.0, -2.0)), b = s(vec2(0.0, -2.0)), c = s(vec2(2.0, -2.0));
  vec3 d = s(vec2(-1.0, -1.0)), e = s(vec2(1.0, -1.0));
  vec3 f = s(vec2(-2.0, 0.0)), g = s(vec2(0.0, 0.0)), h = s(vec2(2.0, 0.0));
  vec3 i = s(vec2(-1.0, 1.0)), j = s(vec2(1.0, 1.0));
  vec3 k = s(vec2(-2.0, 2.0)), l = s(vec2(0.0, 2.0)), m = s(vec2(2.0, 2.0));
  vec3 o = (d + e + i + j) * 0.125;
  o += (a + b + g + f) * 0.03125;
  o += (b + c + h + g) * 0.03125;
  o += (f + g + l + k) * 0.03125;
  o += (g + h + m + l) * 0.03125;
  gl_FragColor = vec4(o, 1.0);
}
`;

export const UP_FRAG = /* glsl */ `
uniform sampler2D tMap;
uniform vec2 uTexel;
uniform float uRadius;
varying vec2 vUv;
vec3 s(vec2 o) { return texture2D(tMap, vUv + o * uTexel * uRadius).rgb; }
void main() {
  vec3 o = s(vec2(0.0)) * 4.0;
  o += (s(vec2(-1.0, 0.0)) + s(vec2(1.0, 0.0)) + s(vec2(0.0, -1.0)) + s(vec2(0.0, 1.0))) * 2.0;
  o += s(vec2(-1.0, -1.0)) + s(vec2(1.0, -1.0)) + s(vec2(-1.0, 1.0)) + s(vec2(1.0, 1.0));
  gl_FragColor = vec4(o / 16.0, 1.0);
}
`;

export const BLUR_FRAG = /* glsl */ `
uniform sampler2D tMap;
uniform vec2 uDir;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tMap, vUv).rgb * 0.227027;
  c += texture2D(tMap, vUv + uDir * 1.3846153).rgb * 0.3162162;
  c += texture2D(tMap, vUv - uDir * 1.3846153).rgb * 0.3162162;
  c += texture2D(tMap, vUv + uDir * 3.2307692).rgb * 0.0702703;
  c += texture2D(tMap, vUv - uDir * 3.2307692).rgb * 0.0702703;
  gl_FragColor = vec4(c, 1.0);
}
`;

/**
 * Final: depth of field from the real depth (near and far blur around the focus), fog by
 * distance and a mist that lies low over water, bloom, highlight shoulder, grade,
 * vignette, grain, then the screen effects of transitions and battles.
 */
export const FINAL_FRAG = /* glsl */ `
uniform sampler2D tScene;
uniform sampler2D tDepth;
uniform sampler2D tBlurSmall;
uniform sampler2D tBlurLarge;
uniform sampler2D tBloom;
uniform mat4 uCamWorld;
uniform vec4 uFrustum; // left, right, bottom, top
uniform vec2 uNearFar;
uniform float uFocusZ;
uniform float uFocusBand;
uniform float uFocusRange;
uniform float uDof;
uniform float uBloom;
uniform vec3 uFogColor;
uniform vec2 uFogDist;   // view distance where fog starts and is full
uniform float uFogMax;
uniform vec3 uMist;      // height (world), density, noise scale
uniform vec2 uMistDrift;
uniform float uExposure;
uniform float uContrast;
uniform float uSaturation;
uniform vec3 uLift;
uniform vec3 uGain;
uniform float uVignette;
uniform float uGrain;
uniform float uTime;
uniform vec3 uFadeColor;
uniform float uFade;
uniform float uFlash;
uniform float uAberration;
uniform float uDesaturate;
uniform vec2 uResolution;
varying vec2 vUv;

${NOISE_GLSL}

vec3 shoulder(vec3 c) {
  vec3 x = max(c - 0.86, 0.0);
  return min(c, 0.86) + x / (1.0 + x * 5.0);
}

void main() {
  vec2 uv = vUv;
  float d = texture2D(tDepth, uv).r;
  float viewZ = d * (uNearFar.x - uNearFar.y) - uNearFar.x;
  vec3 viewPos = vec3(mix(uFrustum.x, uFrustum.y, uv.x), mix(uFrustum.z, uFrustum.w, uv.y), viewZ);
  vec3 wp = (uCamWorld * vec4(viewPos, 1.0)).xyz;

  vec3 sharp;
  if (uAberration > 0.0) {
    vec2 o = (uv - 0.5) * uAberration * 0.012;
    sharp = vec3(texture2D(tScene, uv + o).r, texture2D(tScene, uv).g, texture2D(tScene, uv - o).b);
  } else sharp = texture2D(tScene, uv).rgb;

  vec3 col = sharp;
  if (uDof > 0.0) {
    float coc = smoothstep(uFocusBand, uFocusBand + uFocusRange, abs(-viewZ - uFocusZ)) * uDof;
    vec3 small = texture2D(tBlurSmall, uv).rgb;
    vec3 large = texture2D(tBlurLarge, uv).rgb;
    col = mix(col, small, smoothstep(0.0, 0.55, coc));
    col = mix(col, large, smoothstep(0.45, 1.0, coc));
  }
  vec3 bloom = texture2D(tBloom, uv).rgb;

  // Fog: by distance from the camera, and a mist lying low over the water.
  float fog = smoothstep(uFogDist.x, uFogDist.y, -viewZ) * uFogMax;
  if (uMist.y > 0.0) {
    vec2 q = wp.xz * uMist.z + uMistDrift * uTime;
    float n = fbm(q) * 0.65 + fbm(q * 2.3 + 7.0 - uMistDrift * uTime) * 0.35;
    float low = 1.0 - smoothstep(0.0, uMist.x, wp.y);
    fog = max(fog, smoothstep(0.3, 0.85, n) * low * uMist.y);
  }
  col = mix(col, uFogColor + bloom * 0.35, clamp(fog, 0.0, 1.0));
  col += bloom * uBloom;

  col *= uExposure;
  col = shoulder(col);
  col = (col - 0.5) * uContrast + 0.5;
  col = col * uGain + uLift * (1.0 - col);
  float l = luma(col);
  col = mix(vec3(l), col, uSaturation * (1.0 - uDesaturate));

  vec2 qv = uv * 2.0 - 1.0;
  qv.x *= 0.85;
  col *= 1.0 - dot(qv, qv) * 0.22 * uVignette - pow(max(abs(qv.x), abs(qv.y)), 6.0) * 0.25 * uVignette;
  col += (hash12(uv * uResolution + fract(uTime) * 91.0) - 0.5) * uGrain;

  col = mix(col, vec3(1.0), uFlash);
  col = mix(col, uFadeColor, uFade);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
