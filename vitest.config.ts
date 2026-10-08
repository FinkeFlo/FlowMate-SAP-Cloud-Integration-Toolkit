import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: root }],
  },
  test: {
    environment: 'node',
    include: ['features/**/*.test.ts', 'entrypoints/**/*.test.ts', 'config/**/*.test.ts'],
  },
});
