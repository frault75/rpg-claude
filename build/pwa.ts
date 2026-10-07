/// <reference types="node" />
/**
 * Build-time plugin that makes the game installable and playable offline: it draws the
 * app icons procedurally (no image files in the repository), writes the web manifest,
 * and a service worker that precaches every file of the build.
 */

import { deflateSync } from 'node:zlib';
import type { Plugin } from 'vite';
import { bayer, hex, PixelImage, type RGBA } from '../src/pixel/pixel';

/** The icon: the abbey's tower against a night sky, a lit window, the moon on the sea. */
export function drawIcon(): PixelImage {
  const img = new PixelImage(32, 32);
  const top = hex('#0A1436');
  const bottom = hex('#2A4C9C');
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const t = y / 31 + (bayer(x, y) - 0.5) * 0.12;
      const q = Math.round(Math.max(0, Math.min(1, t)) * 5) / 5;
      img.set(x, y, [top[0] + (bottom[0] - top[0]) * q, top[1] + (bottom[1] - top[1]) * q, top[2] + (bottom[2] - top[2]) * q, 255]);
    }
  }
  for (const [x, y] of [
    [5, 4],
    [12, 3],
    [17, 7],
    [28, 13],
    [3, 11],
  ] as const)
    img.set(x, y, hex('#E8ECFF'));
  img.ellipse(23.5, 8.5, 4, 4, hex('#FFF2CC'));
  img.ellipse(24.5, 7.5, 1.2, 1.2, hex('#E8D8AA'));
  const stone = hex('#1A1C30');
  const roof = hex('#141628');
  // Tower and spire.
  img.rect(8, 13, 7, 16, stone);
  img.poly(
    [
      [7.5, 13],
      [15.5, 13],
      [11.5, 4],
    ],
    roof,
  );
  img.vline(11, 1, 4, hex('#D9B45A'));
  img.hline(10, 12, 2, hex('#D9B45A'));
  // Nave and roof.
  img.rect(15, 19, 12, 10, stone);
  img.poly(
    [
      [14, 19],
      [28, 19],
      [26, 15],
      [16, 15],
    ],
    roof,
  );
  const glow: RGBA = hex('#FFC85A');
  for (const [x, y, h] of [
    [11, 17, 3],
    [18, 22, 3],
    [21, 22, 3],
    [24, 22, 3],
  ] as const)
    img.rect(x, y, 1, h, glow);
  // The sea, with the windows' reflection.
  for (let y = 29; y < 32; y++) img.hline(0, 31, y, y === 29 ? hex('#0E1E4A') : hex('#0A1538'));
  for (const x of [11, 18, 21, 24]) img.set(x, 30, hex('#C89A40'));
  img.hline(6, 9, 31, hex('#5A78B8'));
  return img;
}

function scaleUp(img: PixelImage, size: number): PixelImage {
  const out = new PixelImage(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) out.set(x, y, img.get(Math.floor((x * img.w) / size), Math.floor((y * img.h) / size)));
  return out;
}

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 255]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Encode an RGBA image as PNG. */
export function encodePng(img: PixelImage): Uint8Array {
  const raw = new Uint8Array((img.w * 4 + 1) * img.h);
  for (let y = 0; y < img.h; y++) {
    raw[y * (img.w * 4 + 1)] = 0;
    raw.set(img.data.subarray(y * img.w * 4, (y + 1) * img.w * 4), y * (img.w * 4 + 1) + 1);
  }
  const chunk = (type: string, data: Uint8Array) => {
    const out = new Uint8Array(12 + data.length);
    const view = new DataView(out.buffer);
    view.setUint32(0, data.length);
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
    out.set(data, 8);
    view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
    return out;
  };
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, img.w);
  v.setUint32(4, img.h);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', new Uint8Array(deflateSync(raw))), chunk('IEND', new Uint8Array(0))];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const png = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    png.set(p, o);
    o += p.length;
  }
  return png;
}

const SW = (version: string, files: string[]) => `// Palimpsest service worker: everything is precached, so the game runs offline.
const CACHE = 'palimpsest-${version}';
const FILES = ${JSON.stringify(files)};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then(
      (hit) =>
        hit ||
        fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          })
          .catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())),
    ),
  );
});
`;

export function pwa(): Plugin {
  return {
    name: 'palimpsest-pwa',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const icon = drawIcon();
      const emit = (fileName: string, source: string | Uint8Array) => this.emitFile({ type: 'asset', fileName, source });
      emit('icon-192.png', encodePng(scaleUp(icon, 192)));
      emit('icon-512.png', encodePng(scaleUp(icon, 512)));
      emit('apple-touch-icon.png', encodePng(scaleUp(icon, 180)));
      emit(
        'manifest.webmanifest',
        JSON.stringify(
          {
            name: 'Palimpsest',
            short_name: 'Palimpsest',
            description: 'A story-driven, turn-based RPG in HD-2D.',
            start_url: './',
            scope: './',
            display: 'fullscreen',
            orientation: 'landscape',
            background_color: '#000000',
            theme_color: '#0E1A44',
            icons: [
              { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
              { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
            ],
          },
          null,
          2,
        ),
      );
      const files = ['./', ...Object.keys(bundle).map((f) => `./${f}`), './icon-192.png', './icon-512.png', './apple-touch-icon.png', './manifest.webmanifest'];
      const unique = [...new Set(files)].filter((f) => !f.endsWith('.map'));
      const version = String(Date.now().toString(36));
      emit('sw.js', SW(version, unique));
    },
  };
}
