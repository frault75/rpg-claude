// Dev-only: draws generated pixel art enlarged, for screenshots. Not part of the build.
import { CHARACTERS, characterSheet, drawCharacter, FRAMES } from '../src/pixel/characters';
import type { PixelImage } from '../src/pixel/pixel';
import { drawPortrait, type Mood } from '../src/pixel/portraits';
import { babewynArt, greatSnailArt, gryllusArt, hareArt } from '../src/pixel/enemies';
import { armarium, bench, candle, candleStand, coffer, lectern, psalter, stool, writingDesk } from '../src/pixel/furniture';

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
    imgs.push({ img: drawCharacter(c, 'down', FRAMES[5]!), label: '' });
    imgs.push({ img: drawCharacter(c, 'left', FRAMES[0]!), label: '' });
    imgs.push({ img: drawCharacter(c, 'left', FRAMES[5]!), label: '' });
    imgs.push({ img: drawCharacter(c, 'up', FRAMES[0]!), label: '' });
  }
  show(imgs, 10);
}
if (what === 'portraits') {
  const moods: Mood[] = ['neutral', 'warm', 'wry', 'sad', 'grave', 'stern', 'alarmed', 'tired'];
  const imgs = [];
  for (const c of Object.values(CHARACTERS)) for (const m of moods) imgs.push({ img: drawPortrait(c, m), label: m === 'neutral' ? c.id : m });
  show(imgs, 8);
}
if (what === 'characters') {
  show(
    Object.values(CHARACTERS).map((c) => ({ img: characterSheet(c), label: c.id })),
    1,
  );
}
if (what === 'enemies') {
  const imgs = [];
  for (const [label, art] of [
    ['gryllus', gryllusArt()],
    ['great snail', greatSnailArt()],
    ['hare', hareArt()],
    ['babewyn', babewynArt()],
  ] as const) {
    imgs.push({ img: art.a, label });
  }
  show(imgs, 1);
}
if (what === 'furniture') {
  show(
    [
      ['desk', writingDesk(1)],
      ['empty desk', writingDesk(2, { empty: true })],
      ['stool', stool()],
      ['lectern', lectern()],
      ['armarium', armarium()],
      ['stand', candleStand()],
      ['candle', candle()],
      ['bench', bench()],
      ['coffer', coffer()],
      ['psalter', psalter()],
    ].map(([label, p]) => ({ img: (p as { a: PixelImage }).a, label: label as string })),
    5,
  );
}
(window as unknown as { ready: boolean }).ready = true;
