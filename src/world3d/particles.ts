/**
 * Glowing particles in the diorama: fireflies, embers rising off torches, motes,
 * snow, sparks and glints on water. Positions are map coordinates (art pixels, h up);
 * the points are drawn additively and soft, so bloom turns them into small lights.
 */

import * as THREE from 'three';
import { FX_SCALE } from '../engine/diorama/fx';
import { world } from '../engine/diorama/space';
import { Rng } from '../engine/rng';


export type ParticleKind = 'firefly' | 'ember' | 'mote' | 'snow' | 'spark' | 'glint';

export interface EmitterDef {
  kind: ParticleKind;
  /** Spawn box: x, y (ground), w, d in art pixels, and the heights h0..h1. */
  area: readonly [number, number, number, number];
  heights: readonly [number, number];
  /** Population (fireflies, motes, snow) or births per second (embers, sparks, glints). */
  count: number;
  color: string;
  /** Size in art pixels. */
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
  h: number;
  vx: number;
  vy: number;
  vh: number;
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
  private readonly continuous: boolean;
  private readonly count: number;
  private carry = 0;
  rate = 1;

  constructor(
    readonly def: EmitterDef,
    seed = 1,
    density = 1,
  ) {
    this.rng = new Rng(seed);
    this.continuous = def.kind === 'ember' || def.kind === 'spark' || def.kind === 'glint';
    const count = Math.max(1, Math.round(def.count * density));
    this.max = this.continuous ? Math.ceil(count * 3) + 2 : count;
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
      new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: FX_SCALE, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }),
    );
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
    this.count = count;
    if (!this.continuous) for (let i = 0; i < count; i++) this.ps.push(this.spawn(true));
  }

  private spawn(initial: boolean): P {
    const r = this.rng;
    const [x, y, w, d] = this.def.area;
    const [h0, h1] = this.def.heights;
    const s = this.def.size ?? 2;
    const p: P = { x: x + r.float() * w, y: y + r.float() * d, h: h0 + r.float() * (h1 - h0), vx: 0, vy: 0, vh: 0, age: 0, life: 1, phase: r.float() * 10, size: s * (0.7 + r.float() * 0.6) };
    switch (this.def.kind) {
      case 'firefly':
        p.life = 6 + r.float() * 6;
        break;
      case 'mote':
        p.life = 8 + r.float() * 8;
        p.vx = (r.float() - 0.5) * 2;
        p.vy = (r.float() - 0.5) * 1.5;
        p.vh = (r.float() - 0.3) * 1.5;
        break;
      case 'snow':
        p.life = 1e9;
        p.vh = -(7 + r.float() * 7);
        if (!initial) p.h = h1;
        break;
      case 'ember':
        p.life = 1.2 + r.float() * 1.6;
        p.vx = (r.float() - 0.5) * 6;
        p.vh = 10 + r.float() * 14;
        break;
      case 'spark':
        p.life = 0.4 + r.float() * 0.5;
        p.vx = (r.float() - 0.5) * 70;
        p.vy = (r.float() - 0.5) * 30;
        p.vh = r.float() * 60;
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
    if (this.continuous) {
      this.carry += this.count * this.rate * dt;
      while (this.carry >= 1 && this.ps.length < this.max) {
        this.ps.push(this.spawn(false));
        this.carry -= 1;
      }
      if (this.carry >= 1) this.carry = 0;
    }
    const intensity = d.intensity ?? 1;
    for (let i = this.ps.length - 1; i >= 0; i--) {
      const p = this.ps[i]!;
      p.age += dt;
      const t = time + p.phase;
      if (d.kind === 'firefly') {
        p.vx += (Math.sin(t * 0.7) * 5 - p.vx) * dt;
        p.vy += (Math.cos(t * 0.53) * 3 - p.vy) * dt;
        p.vh += (Math.sin(t * 0.9) * 2 - p.vh) * dt;
      } else if (d.kind === 'snow') {
        p.vx = Math.sin(t * 0.8) * 3;
        if (p.h < d.heights[0]) {
          p.h = d.heights[1];
          p.x = d.area[0] + this.rng.float() * d.area[2];
        }
      } else if (d.kind === 'ember') {
        p.vx += Math.sin(t * 5) * 10 * dt;
        p.vh *= 1 - 0.4 * dt;
      } else if (d.kind === 'spark') p.vh -= 120 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.h += p.vh * dt;
      if (p.age >= p.life) {
        if (this.continuous) {
          this.ps.splice(i, 1);
          continue;
        }
        Object.assign(p, this.spawn(false));
      }
    }
    let n = 0;
    for (const p of this.ps) {
      const life = p.age / p.life;
      let a = 1;
      if (d.kind === 'firefly') {
        const pulse = Math.max(0, Math.sin((time + p.phase) * 1.7));
        a = Math.min(1, life * 4, (1 - life) * 4) * (0.15 + 0.85 * pulse * pulse);
      } else if (d.kind === 'mote') a = Math.min(1, life * 3, (1 - life) * 3) * 0.5;
      else if (d.kind === 'snow') a = 0.75;
      else if (d.kind === 'ember') a = (1 - life) * (0.7 + 0.3 * Math.sin((time + p.phase) * 30));
      else if (d.kind === 'spark') a = 1 - life;
      else if (d.kind === 'glint') a = Math.sin(life * Math.PI);
      const [wx, wy, wz] = world(p.x, p.y, p.h);
      this.pos[n * 3] = wx;
      this.pos[n * 3 + 1] = wy;
      this.pos[n * 3 + 2] = wz;
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
