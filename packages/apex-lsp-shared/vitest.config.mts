import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    name: 'apex-lsp-shared',
    globals: true,
    include: ['test/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json'],
      include: ['src/**/*.ts'],
      exclude: ['**/*.d.ts'],
      thresholds: {
        branches: 10,
        functions: 10,
        lines: 10,
        statements: 10,
      },
    },
  },
});
