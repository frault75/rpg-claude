/**
 * Shaders for the HD-2D renderer. World materials write two outputs (albedo and
 * emissive) so that a figure walking in front of a lit window hides its glow.
 */

import { NOISE_GLSL } from './glsl';

/** Fragment prelude for every material drawn into the world (art-resolution) pass. */
export const WORLD_OUT = /* glsl */ `
layout(location = 0) out vec4 gColor;
layout(location = 1) out vec4 gEmissive;
`;

export const QUAD_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const WORLD_VERT = /* glsl */ `
uniform vec4 uFrame;
varying vec2 vUv;
varying vec2 vWorld;
void main() {
  vUv = uFrame.xy + uv * uFrame.zw;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = vec2(wp.x, -wp.y);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

/** Pixel sprites: albedo, optional emissive, tint, white flash, fade. */
export const SPRITE_FRAG = /* glsl */ `
${WORLD_OUT}
uniform sampler2D tMap;
uniform sampler2D tEmissive;
uniform float uHasEmissive;
uniform float uGlow;
uniform float uOpacity;
uniform vec3 uTint;
uniform float uFlash;
uniform float uDissolve;
uniform float uClipY;
varying vec2 vUv;
varying vec2 vWorld;

float h12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec4 c = texture2D(tMap, vUv);
  if (c.a < 0.5) discard;
  if (vWorld.y > uClipY) discard;
  // Dissolve pixel by pixel (fraying, fading out of the world).
  if (uDissolve > 0.0 && h12(floor(vWorld / 3.0)) < uDissolve) discard;
  vec3 col = mix(c.rgb * uTint, vec3(1.0), uFlash);
  vec3 e = uHasEmissive > 0.5 ? texture2D(tEmissive, vUv).rgb * uGlow : vec3(0.0);
  gColor = vec4(col, uOpacity);
  gEmissive = vec4(e + col * uFlash * 0.8, uOpacity);
}
`;

/** Soft light for the light buffer. */
export const LIGHT_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv * 2.0 - 1.0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const LIGHT_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
varying vec2 vUv;
void main() {
  float d = length(vUv);
  if (d >= 1.0) discard;
  // A bright core with a long soft tail.
  float a = pow(1.0 - d, 2.2) * 0.75 + pow(1.0 - d, 8.0) * 0.6;
  gl_FragColor = vec4(uColor * uIntensity * a, 1.0);
}
`;

/** A darkening blob in the light buffer (canopy shade, drifting cloud shadow). */
export const SHADE_FRAG = /* glsl */ `
uniform float uStrength;
uniform float uTime;
uniform float uSeed;
varying vec2 vUv;
${NOISE_GLSL}
void main() {
  float d = length(vUv);
  float n = fbm(vUv * 2.2 + uSeed + vec2(uTime * 0.05, 0.0));
  float a = smoothstep(1.0, 0.35, d + (n - 0.5) * 0.5) * uStrength;
  gl_FragColor = vec4(vec3(1.0 - a), 1.0);
}
`;

/**
 * Composite: albedo x light + emissive, then lit fog. The art-resolution buffers are
 * sampled with a sharpened bilinear filter so pixels stay square at any scale while the
 * camera moves by fractions of a pixel.
 */
export const COMPOSITE_FRAG = /* glsl */ `
uniform sampler2D tAlbedo;
uniform sampler2D tEmissive;
uniform sampler2D tLight;
uniform vec2 uViewOrigin;
uniform vec2 uViewSize;
uniform vec2 uArtOrigin;
uniform vec2 uArtSize;
uniform float uPx;
uniform float uScreenPerArt;
uniform float uEmissiveGain;
uniform vec3 uVoid;
uniform vec3 uFogColor;
uniform float uFog;
uniform float uFogScale;
uniform vec2 uFogDrift;
uniform vec3 uFogBand;
uniform float uTime;
varying vec2 vUv;

${NOISE_GLSL}

vec2 sharpUv(vec2 ap) {
  // ap: position in art pixels from the buffer's top-left.
  vec2 p = ap - 0.5;
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = clamp((f - 0.5) * uScreenPerArt + 0.5, 0.0, 1.0);
  vec2 q = (i + 0.5 + f) / uArtSize;
  return vec2(q.x, 1.0 - q.y);
}

void main() {
  vec2 world = uViewOrigin + vec2(vUv.x, 1.0 - vUv.y) * uViewSize;
  vec2 uvA = sharpUv((world - uArtOrigin) / uPx);
  vec4 alb = texture2D(tAlbedo, uvA);
  vec3 em = texture2D(tEmissive, uvA).rgb;
  vec3 light = texture2D(tLight, vUv).rgb;
  vec3 col = mix(uVoid, alb.rgb * light, alb.a) + em * uEmissiveGain;

  if (uFog > 0.0) {
    vec2 fp = world * uFogScale;
    float n = fbm(fp + uFogDrift * uTime) * 0.65 + fbm(fp * 2.3 - uFogDrift * uTime * 1.7 + 7.0) * 0.35;
    // uFogBand: (y where fog starts thickening, y where it is full, density above that).
    float band = mix(uFogBand.z, 1.0, smoothstep(uFogBand.x, uFogBand.y, world.y));
    float a = smoothstep(0.3, 0.85, n) * uFog * band;
    // Fog catches the light around lamps and windows.
    vec3 fc = uFogColor * (0.55 + light * 0.6);
    col = mix(col, fc, a);
  }
  gl_FragColor = vec4(col, 1.0);
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

/** 13-tap downsample (Jimenez, "Next generation post processing in Call of Duty"). */
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

/** 9-tap tent upsample, added onto the larger mip. */
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
 * Final: tilt-shift depth of field, bloom, highlight shoulder, grade, vignette, grain,
 * then the screen effects used by battles and transitions.
 */
export const FINAL_FRAG = /* glsl */ `
uniform sampler2D tScene;
uniform sampler2D tBlur;
uniform sampler2D tBloom;
uniform float uBloom;
uniform float uTilt;
uniform float uFocusY;
uniform float uFocusBand;
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
  vec3 sharp;
  if (uAberration > 0.0) {
    vec2 d = (uv - 0.5) * uAberration * 0.012;
    sharp = vec3(texture2D(tScene, uv + d).r, texture2D(tScene, uv).g, texture2D(tScene, uv - d).b);
  } else {
    sharp = texture2D(tScene, uv).rgb;
  }
  vec3 blur = texture2D(tBlur, uv).rgb;
  float dy = abs(uv.y - uFocusY);
  float t = smoothstep(uFocusBand, uFocusBand + 0.28, dy) * uTilt;
  vec3 col = mix(sharp, blur, t);
  col += texture2D(tBloom, uv).rgb * uBloom;

  col *= uExposure;
  col = shoulder(col);
  col = (col - 0.5) * uContrast + 0.5;
  col = col * uGain + uLift * (1.0 - col);
  float l = luma(col);
  col = mix(vec3(l), col, uSaturation * (1.0 - uDesaturate));

  vec2 q = uv * 2.0 - 1.0;
  q.x *= 0.85;
  col *= 1.0 - dot(q, q) * 0.22 * uVignette - pow(max(abs(q.x), abs(q.y)), 6.0) * 0.25 * uVignette;
  col += (hash12(uv * uResolution + fract(uTime) * 91.0) - 0.5) * uGrain;

  col = mix(col, vec3(1.0), uFlash);
  col = mix(col, uFadeColor, uFade);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
