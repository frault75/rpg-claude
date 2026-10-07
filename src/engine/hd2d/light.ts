/**
 * Lights for the light buffer: soft coloured pools that can flicker like a flame or
 * breathe like a lantern, and shade blobs that darken (canopies, cloud shadows).
 */

import * as THREE from 'three';
import { LIGHT_FRAG, LIGHT_VERT, SHADE_FRAG } from './shaders';

export type Flicker = 'none' | 'flame' | 'candle' | 'breathe';

export class Light {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  x = 0;
  y = 0;
  radius: number;
  /** Vertical squash: lights on the ground read as ellipses in a 3/4 view. */
  squash = 0.78;
  intensity: number;
  flicker: Flicker;
  private readonly seed = Math.random() * 100;
  private readonly color = new THREE.Vector3();

  constructor(x: number, y: number, radius: number, color: string | [number, number, number], intensity = 1, flicker: Flicker = 'none') {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.intensity = intensity;
    this.flicker = flicker;
    this.setColor(color);
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        vertexShader: LIGHT_VERT,
        fragmentShader: LIGHT_FRAG,
        uniforms: { uColor: { value: this.color }, uIntensity: { value: intensity } },
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      }),
    );
    this.mesh.frustumCulled = false;
  }

  setColor(c: string | [number, number, number]): void {
    if (typeof c === 'string') {
      const col = new THREE.Color(c);
      this.color.set(col.r, col.g, col.b);
    } else this.color.set(c[0], c[1], c[2]);
  }

  update(time: number): void {
    const t = time + this.seed;
    let k = 1;
    let rk = 1;
    if (this.flicker === 'flame') {
      k = 0.86 + 0.08 * Math.sin(t * 11.3) + 0.05 * Math.sin(t * 23.7 + 1.3) + 0.04 * Math.sin(t * 5.1);
      rk = 0.97 + 0.03 * Math.sin(t * 7.7);
    } else if (this.flicker === 'candle') {
      k = 0.92 + 0.05 * Math.sin(t * 9.1) + 0.03 * Math.sin(t * 17.9);
    } else if (this.flicker === 'breathe') {
      k = 0.85 + 0.15 * Math.sin(t * 1.4);
    }
    this.mesh.material.uniforms.uIntensity!.value = this.intensity * k;
    this.mesh.position.set(this.x, -this.y, 0);
    this.mesh.scale.set(this.radius * rk, this.radius * rk * this.squash, 1);
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

export class Shade {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  constructor(
    public x: number,
    public y: number,
    public rx: number,
    public ry: number,
    strength = 0.4,
  ) {
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        vertexShader: LIGHT_VERT,
        fragmentShader: SHADE_FRAG,
        uniforms: { uStrength: { value: strength }, uTime: { value: 0 }, uSeed: { value: Math.random() * 50 } },
        blending: THREE.MultiplyBlending,
        premultipliedAlpha: true,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1000;
  }

  update(time: number): void {
    this.mesh.material.uniforms.uTime!.value = time;
    this.mesh.position.set(this.x, -this.y, 0);
    this.mesh.scale.set(this.rx, this.ry, 1);
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

