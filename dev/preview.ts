// Dev-only: draws generated pixel art enlarged, for screenshots. Not part of the build.
import { CHARACTERS, characterSheet, drawCharacter, FRAMES } from '../src/pixel/characters';
import type { PixelImage } from '../src/pixel/pixel';

const params = new URLSearchParams(location.search);
const scale = Number(params.get('scale') ?? 5);
const what = params.get('what') ?? 'characters';
const canvas = document.getElementById('c') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

function show(images: { img: PixelImage; label: string }[], cols: number): void {
  const cellW = Math.max(...images.map((i) => i.img.w)) * scale + 20;
  const cellH = Math.max(...images.map((i) => i.img.h)) * scale + 30;
  canvas.width = cellW * Math.min(cols, images.length);
  canvas.height = cellH * Math.ceil(images.length / cols);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#5a7a4a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  images.forEach(({ img, label }, i) => {
    const x = (i % cols) * cellW + 10;
    const y = Math.floor(i / cols) * cellH + 22;
    ctx.drawImage(img.toCanvas(), x, y, img.w * scale, img.h * scale);
    ctx.fillStyle = '#fff';
    ctx.font = '14px monospace';
    ctx.fillText(label, x, y - 6);
  });
}

if (what === 'faces') {
  const imgs = [];
  for (const c of Object.values(CHARACTERS)) {
    imgs.push({ img: drawCharacter(c, 'down', FRAMES[0]!), label: c.id });
    imgs.push({ img: drawCharacter(c, 'left', FRAMES[3]!), label: '' });
    imgs.push({ img: drawCharacter(c, 'up', FRAMES[0]!), label: '' });
  }
  show(imgs, 6);
}
if (what === 'characters') {
  show(
    Object.values(CHARACTERS).map((c) => ({ img: characterSheet(c), label: c.id })),
    1,
  );
}
(window as unknown as { ready: boolean }).ready = true;
