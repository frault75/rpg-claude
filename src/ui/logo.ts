/**
 * The title logo: an illuminated initial P in a lapis square with gold vines, then the
 * rest of the name in gold capitals, and the Abbey's motto beneath. It writes itself in
 * from left to right as if inked, and a glint of light runs across the gold now and then.
 */

import { SERIF } from './ui';

export function paintLogo(w: number, h: number, motto: string, scale: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * scale);
  c.height = Math.ceil(h * scale);
  const g = c.getContext('2d')!;
  g.scale(scale, scale);
  const gold = (y0: number, y1: number) => {
    const gr = g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, '#FFF6D2');
    gr.addColorStop(0.35, '#F2CF6A');
    gr.addColorStop(0.7, '#C9952C');
    gr.addColorStop(1, '#8E6418');
    return gr;
  };
  // The initial: a lapis square framed in gold, with vines in its corners.
  const S = 150;
  const ix = 70;
  const iy = 34;
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.6)';
  g.shadowBlur = 18;
  g.shadowOffsetY = 6;
  const lap = g.createLinearGradient(ix, iy, ix + S, iy + S);
  lap.addColorStop(0, '#3A62C0');
  lap.addColorStop(1, '#0E1A44');
  g.fillStyle = lap;
  g.fillRect(ix, iy, S, S);
  g.restore();
  g.strokeStyle = gold(iy, iy + S);
  g.lineWidth = 5;
  g.strokeRect(ix + 2.5, iy + 2.5, S - 5, S - 5);
  g.lineWidth = 1.5;
  g.strokeStyle = 'rgba(242, 207, 106, 0.7)';
  g.strokeRect(ix + 10, iy + 10, S - 20, S - 20);
  g.strokeStyle = '#E8C76A';
  g.lineWidth = 2.2;
  g.lineCap = 'round';
  for (const [cx, cy, sx, sy] of [
    [ix + 14, iy + 14, 1, 1],
    [ix + S - 14, iy + 14, -1, 1],
    [ix + 14, iy + S - 14, 1, -1],
    [ix + S - 14, iy + S - 14, -1, -1],
  ] as const) {
    g.beginPath();
    g.moveTo(cx, cy);
    g.bezierCurveTo(cx + sx * 26, cy + sy * 2, cx + sx * 30, cy + sy * 24, cx + sx * 14, cy + sy * 26);
    g.bezierCurveTo(cx + sx * 4, cy + sy * 27, cx + sx * 6, cy + sy * 16, cx + sx * 14, cy + sy * 17);
    g.stroke();
    g.fillStyle = '#F6DC8A';
    g.beginPath();
    g.ellipse(cx + sx * 24, cy + sy * 8, 4, 2.2, sx * sy * 0.7, 0, Math.PI * 2);
    g.fill();
  }
  g.font = `700 ${S * 0.82}px ${SERIF}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 6;
  g.strokeStyle = '#2A1A06';
  g.strokeText('P', ix + S / 2, iy + S / 2 + 6);
  g.fillStyle = gold(iy + 20, iy + S - 20);
  g.fillText('P', ix + S / 2, iy + S / 2 + 6);
  // The rest of the name.
  g.textAlign = 'left';
  g.font = `600 98px ${SERIF}`;
  const word = 'ALIMPSEST';
  let x = ix + S + 14;
  const base = iy + S - 40;
  for (const ch of word) {
    g.lineWidth = 6;
    g.strokeStyle = 'rgba(20, 12, 4, 0.95)';
    g.strokeText(ch, x, base);
    g.save();
    g.shadowColor = 'rgba(255, 196, 90, 0.45)';
    g.shadowBlur = 22;
    g.fillStyle = gold(base - 80, base + 6);
    g.fillText(ch, x, base);
    g.restore();
    x += g.measureText(ch).width + 7;
  }
  // A rule and the motto.
  const rx0 = ix + S + 20;
  const rx1 = x - 8;
  const rg = g.createLinearGradient(rx0, 0, rx1, 0);
  rg.addColorStop(0, 'rgba(232,199,106,0)');
  rg.addColorStop(0.2, 'rgba(232,199,106,0.9)');
  rg.addColorStop(0.8, 'rgba(232,199,106,0.9)');
  rg.addColorStop(1, 'rgba(232,199,106,0)');
  g.fillStyle = rg;
  g.fillRect(rx0, base + 22, rx1 - rx0, 1.6);
  g.font = `italic 30px ${SERIF}`;
  g.textAlign = 'center';
  g.fillStyle = 'rgba(0,0,0,0.75)';
  g.fillText(motto, (rx0 + rx1) / 2 + 2, base + 56 + 2);
  g.fillStyle = '#EDE3CC';
  g.fillText(motto, (rx0 + rx1) / 2, base + 56);
  return c;
}

/**
 * Draw the logo revealed up to `reveal` (0–1), with an inked edge, and a glint passing
 * at `glint` (0–1 across, or < 0 for none).
 */
export function drawLogo(ctx: CanvasRenderingContext2D, logo: HTMLCanvasElement, w: number, h: number, reveal: number, glint: number): void {
  const edge = reveal * (w + 80) - 40;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, Math.max(0, edge), h);
  ctx.clip();
  ctx.drawImage(logo, 0, 0, w, h);
  ctx.restore();
  // A soft wet edge where the ink is still going down.
  if (reveal < 1) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(edge, 0, 40, h);
    ctx.clip();
    ctx.globalAlpha = 0.35;
    ctx.drawImage(logo, 0, 0, w, h);
    ctx.restore();
    const gl = ctx.createRadialGradient(edge, h * 0.5, 0, edge, h * 0.5, 70);
    gl.addColorStop(0, 'rgba(255, 230, 160, 0.55)');
    gl.addColorStop(1, 'rgba(255, 230, 160, 0)');
    ctx.fillStyle = gl;
    ctx.fillRect(edge - 70, 0, 140, h);
  }
  if (glint >= 0 && reveal >= 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    const gx = glint * (w + 300) - 150;
    const gg = ctx.createLinearGradient(gx - 60, 0, gx + 60, h);
    gg.addColorStop(0, 'rgba(255,255,255,0)');
    gg.addColorStop(0.5, 'rgba(255,250,225,0.65)');
    gg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gg;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}
