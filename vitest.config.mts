import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/apex-ls/vitest.config.mts',
      'packages/apex-lsp-client/vitest.config.mts',
      'packages/apex-lsp-shared/vitest.config.mts',
      'packages/apex-lsp-testbed/vitest.config.mts',
      'packages/apex-lsp-vscode-extension/vitest.config.mts',
      'packages/apex-parser-ast/vitest.config.mts',
      'packages/custom-services/vitest.config.mts',
      'packages/lsp-compliant-services/vitest.config.mts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json'],
      reportsDirectory: './coverage',
      include: ['packages/*/src/**/*.ts'],
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
