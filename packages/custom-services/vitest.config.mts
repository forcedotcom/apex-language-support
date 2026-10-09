import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const fromRoot = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: {
    alias: {
      '@salesforce/apex-lsp-shared': fromRoot('packages/apex-lsp-shared/src/index.ts'),
      '@salesforce/apex-lsp-parser-ast': fromRoot('packages/apex-parser-ast/src/index.ts'),
      '@salesforce/apex-lsp-compliant-services': fromRoot('packages/lsp-compliant-services/src/index.ts'),
      '@salesforce/apex-lsp-custom-services': fromRoot('packages/custom-services/src/index.ts'),
      '@salesforce/apex-ls': fromRoot('packages/apex-ls/src/index.ts'),
      '@salesforce/apex-lsp-testbed': fromRoot('packages/apex-lsp-testbed/src/index.ts'),
    },
  },
  test: {
    name: 'custom-services',
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json'],
      include: ['src/**/*.ts'],
      exclude: ['**/*.d.ts'],
      thresholds: { branches: 10, functions: 10, lines: 10, statements: 10 },
    },
  },
});
