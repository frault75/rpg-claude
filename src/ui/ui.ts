/**
 * The UI layer: crisp, high-resolution panels drawn with Canvas 2D over the pixel world,
 * in logical units (1280 x 720, y down). Each panel keeps its draw function so it can be
 * redrawn sharp when the window changes size.
 */

import * as THREE from 'three';
import { VIEW_H } from '../engine/view';

export const SERIF = "'Palatino Linotype', 'Book Antiqua', Palatino, 'Iowan Old Style', 'Times New Roman', serif";

export const INK = {
  text: '#F4EEE0',
  dim: '#B9B3A6',
  gold: '#E8C76A',
  goldDeep: '#9A7428',
  red: '#E0604A',
  lapisTop: '#2B4C9C',
  lapisBottom: '#0E1A44',
};

export type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

export class UiPanel {
  readonly canvas = document.createElement('canvas');
  readonly ctx: CanvasRenderingContext2D;
  readonly texture: THREE.CanvasTexture;
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  x = 0;
  y = 0;
  opacity = 1;
  visible = true;
  /** Draw order among panels (higher on top). */
  order = 0;
  /** Shown this much larger, drawn at the matching resolution so it stays sharp. */
  zoom = 1;
  /** The point of the panel that stays put when it is zoomed (0..1 across and down). */
  anchor: [number, number] = [0, 0];
  private drawFn: Draw | null = null;
  private scale = 0;

  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    // Kept on the CPU: panels are small, redrawn rarely, and uploaded as textures.
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.NoColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, depthTest: false, depthWrite: false, premultipliedAlpha: false }),
    );
    this.mesh.frustumCulled = false;
  }

  /** Replace the drawing and redraw now. */
  draw(fn: Draw): void {
    this.drawFn = fn;
    this.redraw();
  }

  redraw(): void {
    if (!this.drawFn || this.scale === 0) return;
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    c.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this.drawFn(c, this.w, this.h);
    // Make the browser carry the drawing out now. Some defer it, and a panel redrawn
    // while hidden can then show a ghost of its old drawing under the new one.
    c.getImageData(0, 0, 1, 1);
    this.texture.needsUpdate = true;
  }

  setScale(s: number): void {
    if (Math.abs(s - this.scale) < 1e-3) return;
    this.scale = s;
    this.canvas.width = Math.max(1, Math.ceil(this.w * s));
    this.canvas.height = Math.max(1, Math.ceil(this.h * s));
    this.texture.dispose();
    this.texture.image = this.canvas;
    this.redraw();
  }

  sync(): void {
    const m = this.mesh;
    m.visible = this.visible && this.opacity > 0.001;
    const z = this.zoom;
    const left = this.x + this.w * this.anchor[0] * (1 - z);
    const top = this.y + this.h * this.anchor[1] * (1 - z);
    m.scale.set(z, z, 1);
    m.position.set(left + (this.w * z) / 2, VIEW_H - (top + (this.h * z) / 2), 0);
    m.material.opacity = this.opacity;
    m.renderOrder = this.order;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.texture.dispose();
  }
}

/** What the UI needs of a renderer: a scene drawn over the game, and its resolution. */
export interface UiHost {
  ui: THREE.Scene;
  uiScale: number;
}

export class UiLayer {
  private readonly panels = new Set<UiPanel>();

  constructor(readonly r: UiHost) {}

  panel(w: number, h: number, order = 0): UiPanel {
    const p = new UiPanel(w, h);
    p.order = order;
    p.setScale(this.r.uiScale);
    this.panels.add(p);
    this.r.ui.add(p.mesh);
    return p;
  }

  remove(p: UiPanel): void {
    this.panels.delete(p);
    p.dispose();
  }

  /** Call once per frame before rendering. */
  sync(): void {
    const s = this.r.uiScale;
    for (const p of this.panels) {
      p.setScale(s * p.zoom);
      p.sync();
    }
  }

  dispose(): void {
    for (const p of this.panels) p.dispose();
    this.panels.clear();
  }
}

/** Break text into lines that fit `maxWidth` with the context's current font. */
export function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        out.push(line);
        line = word;
      } else line = test;
    }
    out.push(line);
  }
  return out;
}

/** Text with the soft dark shadow of the classic RPG windows. */
export function shadowText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color = INK.text): void {
  ctx.fillStyle = 'rgba(4, 6, 20, 0.85)';
  ctx.fillText(text, x + 1.5, y + 1.5);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A small gold fleuron for the window corners. */
function fleuron(ctx: CanvasRenderingContext2D, x: number, y: number, sx: number, sy: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, sy);
  ctx.fillStyle = INK.gold;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(9, 1.5);
  ctx.quadraticCurveTo(5, 3, 3, 5);
  ctx.quadraticCurveTo(1.5, 7, 1.5, 9);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#FFF2C0';
  ctx.beginPath();
  ctx.arc(3.2, 3.2, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * The window: a deep lapis gradient with a soft sheen, a double gold border and
 * fleurons at the corners.
 */
export function drawWindow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alpha = 0.94): void {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, x, y, w, h, 9);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, INK.lapisTop);
  g.addColorStop(1, INK.lapisBottom);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRect(ctx, x, y, w, h, 9);
  ctx.clip();
  // A sheen across the top, as on glazed lapis.
  const sheen = ctx.createRadialGradient(x + w * 0.25, y - h * 0.2, 0, x + w * 0.25, y - h * 0.2, Math.max(w, h) * 0.9);
  sheen.addColorStop(0, 'rgba(160, 190, 255, 0.22)');
  sheen.addColorStop(1, 'rgba(160, 190, 255, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  // Double border.
  const border = ctx.createLinearGradient(x, y, x + w, y + h);
  border.addColorStop(0, '#F6DC8A');
  border.addColorStop(0.5, '#C9A040');
  border.addColorStop(1, '#8E6A22');
  ctx.strokeStyle = border;
  ctx.lineWidth = 2.2;
  roundRect(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 8);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(232, 199, 106, 0.55)';
  ctx.lineWidth = 1;
  roundRect(ctx, x + 6, y + 6, w - 12, h - 12, 5);
  ctx.stroke();
  fleuron(ctx, x + 4, y + 4, 1, 1);
  fleuron(ctx, x + w - 4, y + 4, -1, 1);
  fleuron(ctx, x + 4, y + h - 4, 1, -1);
  fleuron(ctx, x + w - 4, y + h - 4, -1, -1);
}

/** The gold manicule (a pointing hand), the cursor of the menus. Points right. */
export function drawManicule(ctx: CanvasRenderingContext2D, x: number, y: number, size = 1): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.translate(1.5, 1.5);
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(-14, -5);
    ctx.lineTo(-4, -5);
    ctx.lineTo(10, -5);
    ctx.quadraticCurveTo(14, -4, 10, -2);
    ctx.lineTo(0, -2);
    ctx.lineTo(1, 0);
    ctx.quadraticCurveTo(3, 2, 1, 3);
    ctx.quadraticCurveTo(3, 5, 0, 6);
    ctx.lineTo(-14, 6);
    ctx.closePath();
  };
  shape();
  ctx.fill();
  ctx.translate(-1.5, -1.5);
  const g = ctx.createLinearGradient(0, -6, 0, 6);
  g.addColorStop(0, '#FFF0B0');
  g.addColorStop(1, '#C9952C');
  ctx.fillStyle = g;
  shape();
  ctx.fill();
  ctx.strokeStyle = '#6A4A12';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Cuff.
  ctx.fillStyle = '#F4EEE0';
  ctx.fillRect(-17, -6, 4, 13);
  ctx.restore();
}
