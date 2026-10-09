import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const fromRoot = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: {
    alias: [
      {
        find: /\.zip$/,
        replacement: fromRoot('packages/apex-parser-ast/test/__mocks__/zipMock.cjs'),
      },
      { find: '@salesforce/apex-lsp-shared', replacement: fromRoot('packages/apex-lsp-shared/src/index.ts') },
      { find: '@salesforce/apex-lsp-parser-ast', replacement: fileURLToPath(new URL('./src/index.ts', import.meta.url)) },
      { find: '@salesforce/apex-lsp-compliant-services', replacement: fromRoot('packages/lsp-compliant-services/src/index.ts') },
      { find: '@salesforce/apex-lsp-custom-services', replacement: fromRoot('packages/custom-services/src/index.ts') },
      { find: '@salesforce/apex-lsp-testbed', replacement: fromRoot('packages/apex-lsp-testbed/src/index.ts') },
    ],
  },
  test: {
    name: 'apex-parser-ast',
    globals: true,
    environment: 'node',
    setupFiles: ['./test/vitest-setup.ts'],
    include: ['test/**/*.test.ts', 'test/**/generate-Standard-Apex-Library.ts'],
    exclude: ['dist/**', '.wireit/**'],
    testTimeout: 120_000,
    pool: 'forks',
    maxWorkers: Number(process.env.VITEST_MAX_WORKERS ?? 2),
    isolate: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json'],
      include: ['src/**/*.ts'],
      exclude: ['src/generated/**', '**/*.d.ts'],
      thresholds: { branches: 10, functions: 10, lines: 10, statements: 10 },
    },
  },
});
