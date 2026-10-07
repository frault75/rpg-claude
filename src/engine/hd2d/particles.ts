/**
 * Glowing particles for the high-resolution effects layer: fireflies, embers rising off
 * torches, drifting motes, snow, sparks. Simulated on the CPU (a few hundred at most) and
 * drawn as soft additive points, so bloom turns them into little lights.
 */

import * as THREE from 'three';
import { Rng } from '../rng';

/** Shared by every particle material: internal pixels per world unit. */
export const FX_GLOBALS = { uScale: { value: 1 } };

export type ParticleKind = 'firefly' | 'ember' | 'mote' | 'snow' | 'spark' | 'glint';

export interface EmitterDef {
  kind: ParticleKind;
  /** Spawn area: x, y, w, h in world units. */
  rect: readonly [number, number, number, number];
  /** Particles alive at once (fireflies, motes, snow) or per second (embers, sparks). */
  count: number;
  color: string;
  /** Size in world units. */
  size?: number;
  intensity?: number;
}

const VERT = /* glsl */ `
attribute float aSize;
attribute vec4 aColor;
uniform float uScale;
varying vec4 vColor;
void main() {
  vColor = aColor;
  gl_PointSize = max(1.0, aSize * uScale);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */ `
varying vec4 vColor;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float d = dot(q, q);
  if (d > 1.0) discard;
  float a = exp(-d * 4.0) + exp(-d * 40.0) * 0.8;
  gl_FragColor = vec4(vColor.rgb * vColor.a * a, 1.0);
}
`;

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  phase: number;
  size: number;
}

export class Emitter {
  readonly points: THREE.Points;
  private readonly ps: P[] = [];
  private readonly rng: Rng;
  private readonly max: number;
  private readonly pos: Float32Array;
  private readonly col: Float32Array;
  private readonly siz: Float32Array;
  private readonly base: THREE.Color;
  private carry = 0;
  /** Scales the spawn rate or population (0 stops new particles). */
  rate = 1;

  constructor(
    readonly def: EmitterDef,
    seed = 1,
  ) {
    this.rng = new Rng(seed);
    const continuous = def.kind === 'ember' || def.kind === 'spark';
    this.max = continuous ? Math.ceil(def.count * 3) : def.count;
    this.pos = new Float32Array(this.max * 3);
    this.col = new Float32Array(this.max * 4);
    this.siz = new Float32Array(this.max);
    this.base = new THREE.Color(def.color);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.siz, 1));
    this.points = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: FX_GLOBALS,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      }),
    );
    this.points.frustumCulled = false;
    if (!continuous) for (let i = 0; i < def.count; i++) this.ps.push(this.spawn(true));
  }

  private spawn(initial: boolean): P {
    const r = this.rng;
    const [x, y, w, h] = this.def.rect;
    const s = this.def.size ?? 6;
    const p: P = { x: x + r.float() * w, y: y + r.float() * h, vx: 0, vy: 0, age: 0, life: 1, phase: r.float() * 10, size: s * (0.7 + r.float() * 0.6) };
    switch (this.def.kind) {
      case 'firefly':
        p.life = 6 + r.float() * 6;
        break;
      case 'mote':
        p.life = 8 + r.float() * 8;
        p.vx = (r.float() - 0.5) * 6;
        p.vy = (r.float() - 0.5) * 4;
        break;
      case 'snow':
        p.life = 1e9;
        p.vy = 22 + r.float() * 20;
        p.size = s * (0.5 + r.float() * 0.8);
        if (!initial) p.y = y - 10;
        break;
      case 'ember':
        p.life = 1.2 + r.float() * 1.6;
        p.vx = (r.float() - 0.5) * 18;
        p.vy = -(30 + r.float() * 40);
        break;
      case 'spark':
        p.life = 0.4 + r.float() * 0.5;
        p.vx = (r.float() - 0.5) * 200;
        p.vy = -(r.float() * 160);
        break;
      case 'glint':
        p.life = 0.5 + r.float() * 1.2;
        break;
    }
    if (initial) p.age = r.float() * Math.min(p.life, 20);
    return p;
  }

  update(dt: number, time: number): void {
    const d = this.def;
    const continuous = d.kind === 'ember' || d.kind === 'spark' || d.kind === 'glint';
    if (continuous) {
      this.carry += d.count * this.rate * dt;
      while (this.carry >= 1 && this.ps.length < this.max) {
        this.ps.push(this.spawn(false));
        this.carry -= 1;
      }
      if (this.carry >= 1) this.carry = 0;
    }
    const [rx, ry, rw, rh] = d.rect;
    const intensity = d.intensity ?? 1;
    let n = 0;
    for (let i = this.ps.length - 1; i >= 0; i--) {
      const p = this.ps[i]!;
      p.age += dt;
      const t = time + p.phase;
      switch (d.kind) {
        case 'firefly':
          p.vx += (Math.sin(t * 0.7) * 14 - p.vx) * dt;
          p.vy += (Math.cos(t * 0.53) * 10 - p.vy) * dt;
          break;
        case 'snow':
          p.vx = Math.sin(t * 0.8) * 10;
          if (p.y > ry + rh) {
            p.y = ry - 4;
            p.x = rx + this.rng.float() * rw;
          }
          break;
        case 'ember':
          p.vx += Math.sin(t * 5) * 30 * dt;
          p.vy *= 1 - 0.4 * dt;
          break;
        case 'spark':
          p.vy += 300 * dt;
          break;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.age >= p.life) {
        if (continuous) {
          this.ps.splice(i, 1);
          continue;
        }
        Object.assign(p, this.spawn(false));
      }
    }
    for (const p of this.ps) {
      const life = p.age / p.life;
      let a = 1;
      switch (d.kind) {
        case 'firefly': {
          const pulse = Math.max(0, Math.sin((time + p.phase) * 1.7));
          a = Math.min(1, life * 4, (1 - life) * 4) * (0.15 + 0.85 * pulse * pulse);
          break;
        }
        case 'mote':
          a = Math.min(1, life * 3, (1 - life) * 3) * 0.5;
          break;
        case 'snow':
          a = 0.75;
          break;
        case 'ember':
          a = (1 - life) * (0.7 + 0.3 * Math.sin((time + p.phase) * 30));
          break;
        case 'spark':
          a = 1 - life;
          break;
        case 'glint':
          a = Math.sin(life * Math.PI);
          break;
      }
      this.pos[n * 3] = p.x;
      this.pos[n * 3 + 1] = -p.y;
      this.pos[n * 3 + 2] = 0;
      this.col[n * 4] = this.base.r;
      this.col[n * 4 + 1] = this.base.g;
      this.col[n * 4 + 2] = this.base.b;
      this.col[n * 4 + 3] = a * intensity;
      this.siz[n] = p.size * (d.kind === 'ember' ? 1 - life * 0.5 : 1);
      n++;
    }
    const geo = this.points.geometry;
    geo.setDrawRange(0, n);
    for (const k of ['position', 'aColor', 'aSize']) (geo.getAttribute(k) as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose(): void {
    this.points.removeFromParent();
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}
