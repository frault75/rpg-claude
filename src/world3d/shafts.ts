/**
 * Light shafts: soft additive beams that make light visible in the air, falling from
 * windows onto the ground, spreading under lanterns, slanting through mist. Dust drifts
 * in them. Positions are map coordinates in art pixels.
 */

import * as THREE from 'three';
import { NOISE_GLSL } from '../engine/diorama/glsl';
import { world } from '../engine/diorama/space';

const VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uTime;
varying vec2 vUv;
varying vec3 vWorld;
${NOISE_GLSL}
void main() {
  // u across the beam, v along it (0 at the source).
  float across = 1.0 - pow(abs(vUv.x * 2.0 - 1.0), 1.6);
  float along = pow(1.0 - vUv.y, 1.3) * smoothstep(0.0, 0.12, vUv.y);
  float dust = 0.75 + 0.25 * vnoise(vWorld.xz * 0.08 + vec2(uTime * 0.15, vWorld.y * 0.05));
  float a = across * along * dust * uIntensity;
  gl_FragColor = vec4(uColor * a, 1.0);
}
`;

export class LightShaft {
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;

  /**
   * A beam from `from` (x, y, h) to `to`, `w0` pixels wide at the source and `w1` at
   * the far end. The beam's width runs east-west.
   */
  constructor(from: readonly [number, number, number], to: readonly [number, number, number], w0: number, w1: number, color: string, intensity = 0.35) {
    const a = world(from[0] - w0 / 2, from[1], from[2]);
    const b = world(from[0] + w0 / 2, from[1], from[2]);
    const c = world(to[0] + w1 / 2, to[1], to[2]);
    const d = world(to[0] - w1 / 2, to[1], to[2]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...d], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const col = new THREE.Color(color);
    this.mesh = new THREE.Mesh(
      g,
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: { uColor: { value: new THREE.Vector3(col.r, col.g, col.b) }, uIntensity: { value: intensity }, uTime: { value: 0 } },
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
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
