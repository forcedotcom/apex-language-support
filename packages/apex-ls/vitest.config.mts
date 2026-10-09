import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { defineConfig, mergeConfig } from 'vitest/config';

const fromRoot = (path: string) =>
  fileURLToPath(new URL(`../../${path}`, import.meta.url));
const parserRequire = createRequire(
  new URL('../apex-parser-ast/package.json', import.meta.url),
);

const baseConfig = defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: {
    alias: [
      {
        find: /^@salesforce\/apex-lsp-shared$/,
        replacement: fromRoot('packages/apex-lsp-shared/src/index.ts'),
      },
      {
        find: /^@salesforce\/apex-lsp-shared\/(.+)$/,
        replacement: fromRoot('packages/apex-lsp-shared/src/$1.ts'),
      },
      {
        find: '@salesforce/apex-lsp-parser-ast',
        replacement: fromRoot('packages/apex-parser-ast/src/index.ts'),
      },
      {
        find: '@salesforce/apex-lsp-compliant-services',
        replacement: fromRoot('packages/lsp-compliant-services/src/index.ts'),
      },
      {
        find: '@salesforce/apex-lsp-custom-services',
        replacement: fromRoot('packages/custom-services/src/index.ts'),
      },
      {
        find: '@salesforce/apex-ls',
        replacement: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      },
      {
        find: '@salesforce/apex-lsp-testbed',
        replacement: fromRoot('packages/apex-lsp-testbed/src/index.ts'),
      },
    ],
  },
  test: {
    name: 'apex-ls',
    globals: true,
    environment: 'node',
    pool: 'forks',
    maxWorkers: 2,
    include: ['test/**/*.test.ts'],
    exclude: ['test/integration/BrowserCompilationPool.browser.node.test.ts'],
    setupFiles: ['./test/vitest-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json'],
      include: ['src/**/*.ts'],
      exclude: ['**/*.d.ts'],
      thresholds: { branches: 10, functions: 10, lines: 10, statements: 10 },
    },
  },
});

export default baseConfig;

export const browserConfig = mergeConfig(baseConfig, {
  resolve: {
    alias: {
      '@apexdevtools/apex-parser': parserRequire.resolve(
        '@apexdevtools/apex-parser',
      ),
      'vscode-languageserver/browser': fileURLToPath(
        new URL(
          './test/__mocks__/vscode-languageserver-browser.mock.js',
          import.meta.url,
        ),
      ),
      'vscode-languageserver': fileURLToPath(
        new URL(
          './test/__mocks__/vscode-languageserver.mock.js',
          import.meta.url,
        ),
      ),
      'vscode-languageserver-textdocument': fileURLToPath(
        new URL(
          './test/__mocks__/vscode-languageserver-textdocument.mock.js',
          import.meta.url,
        ),
      ),
      'vscode-languageserver-types': fromRoot(
        'node_modules/vscode-languageserver-types',
      ),
      '@azure/monitor-opentelemetry-exporter': fileURLToPath(
        new URL(
          './test/__mocks__/@azure/monitor-opentelemetry-exporter.mock.js',
          import.meta.url,
        ),
      ),
    },
  },
  test: {
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost' } },
    setupFiles: ['./test/setup-web.js'],
    exclude: ['test/**/*.node.test.ts'],
  },
});
