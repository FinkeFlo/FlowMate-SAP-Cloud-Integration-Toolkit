import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));

// Tests run in a zone east of UTC (set before the workers start, so every pool
// inherits it): code that mixes local and UTC days fails here, not for users.
process.env.TZ = 'Europe/Berlin';

export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: root }],
  },
  test: {
    environment: 'node',
    include: ['features/**/*.test.ts', 'entrypoints/**/*.test.ts', 'config/**/*.test.ts'],
  },
});
