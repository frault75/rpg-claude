import { defineConfig } from 'vitest/config';

// The game is served from https://<user>.github.io/rpg-claude/, so every asset URL
// must be prefixed with the repository name.
export default defineConfig({
  base: '/rpg-claude/',
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1500,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
