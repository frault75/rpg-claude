// Dev-only: draws generated pixel art enlarged, for screenshots. Not part of the build.
import { CHARACTERS, characterSheet, drawCharacter, FRAMES } from '../src/pixel/characters';
import type { PixelImage } from '../src/pixel/pixel';
import { drawPortrait, type Mood } from '../src/pixel/portraits';
import { babewynArt, bishopFishArt, blotArt, blotletArt, caladriusArt, greatSnailArt, gryllusArt, hareArt } from '../src/pixel/enemies';
import { blanch, ghostFacade, MURAL_ORDER, muralPanel, ninefoldGate, outlineBird, woodTree } from '../src/world3d/blanchwood';
import { acanthus, catchwordArch, goldBar, goose, hen, ivy, pageSky } from '../src/world3d/margin';
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
  const ids = params.get('ids')?.split(',');
  for (const c of Object.values(CHARACTERS).filter((c) => !ids || ids.includes(c.id))) {
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
    ['blot', blotArt()],
    ['blotlet', blotletArt()],
    ['caladrius', caladriusArt()],
    ['bishop-fish', bishopFishArt()],
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

if (what === 'blanchwood') {
  const imgs: { img: PixelImage; label: string }[] = [];
  for (const k of [0, 0.25, 0.5, 0.7, 0.82, 0.94]) imgs.push({ img: blanch(woodTree(1), k, 3), label: `k ${k}` });
  imgs.push({ img: outlineBird(2), label: 'bird' });
  imgs.push({ img: ghostFacade(40, 44, 3), label: 'facade' });
  imgs.push({ img: ninefoldGate().a, label: 'gate' });
  for (const f of MURAL_ORDER) imgs.push({ img: muralPanel(f), label: f });
  show(imgs, 6);
  (window as unknown as { ready: boolean }).ready = true;
}

if (what === 'margin') {
  const imgs: { img: PixelImage; label: string }[] = [];
  imgs.push({ img: acanthus(1, 'malachite'), label: 'acanthus' });
  imgs.push({ img: acanthus(2, 'vermilion'), label: 'acanthus 2' });
  imgs.push({ img: acanthus(3, 'lapis', 0.8), label: 'acanthus 3' });
  imgs.push({ img: catchwordArch('WRITTEN', 2), label: 'arch' });
  imgs.push({ img: goldBar(80), label: 'bar' });
  imgs.push({ img: ivy(80), label: 'ivy' });
  imgs.push({ img: goose(1), label: 'goose' });
  imgs.push({ img: hen(), label: 'hen' });
  imgs.push({ img: pageSky(260, 80), label: 'page' });
  show(imgs, 5);
  (window as unknown as { ready: boolean }).ready = true;
}
