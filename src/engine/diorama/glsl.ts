/** GLSL helpers shared by the HD-2D shaders. */

export const NOISE_GLSL = /* glsl */ `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
             mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec2(17.1, 9.7);
    a *= 0.5;
  }
  return s / 0.96875;
}

float luma(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}
`;

/**
 * A colour safe to blur. One pixel that is not a number (some GPUs, Apple's among them,
 * make one of pow() with a base a hair below zero) or that overflowed the half-float
 * buffer would otherwise spread through every level of the bloom and the depth of field,
 * and come out as a flat pale rectangle over the scene. The test is on the bits, which a
 * shader compiler cannot assume away.
 */
export const SAFE_GLSL = /* glsl */ `
bool finiteF(float x) { return (floatBitsToUint(x) & 0x7F800000u) != 0x7F800000u; }
vec3 safeColor(vec3 c) {
  return finiteF(c.r) && finiteF(c.g) && finiteF(c.b) ? clamp(c, 0.0, 64.0) : vec3(0.0);
}
`;
