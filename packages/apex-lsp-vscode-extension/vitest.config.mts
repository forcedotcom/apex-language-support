import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const fromRoot = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url));
const require = createRequire(import.meta.url);

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: {
    alias: {
      vscode: fileURLToPath(new URL('./test/mocks/vscode.ts', import.meta.url)),
      '@salesforce/apex-lsp-shared': fromRoot('packages/apex-lsp-shared/out/index.js'),
      '@salesforce/apex-lsp-client/browser': fromRoot('packages/apex-lsp-client/src/browser.ts'),
      '@salesforce/apex-lsp-client': fromRoot('packages/apex-lsp-client/src/index.ts'),
      '@salesforce/apex-lsp-compliant-services': fromRoot('packages/lsp-compliant-services/src/index.ts'),
      '@salesforce/apex-ls': fromRoot('packages/apex-ls/src/index.ts'),
      '@effect/opentelemetry/NodeSdk': require.resolve('@effect/opentelemetry/NodeSdk', {
        paths: [fromRoot('packages/apex-lsp-shared')],
      }),
      './unified-language-server': fileURLToPath(new URL('./test/mocks/unified-language-server.ts', import.meta.url)),
      'vscode-languageclient/lib/common/textSynchronization': fileURLToPath(
        new URL('./test/mocks/textSynchronization.ts', import.meta.url),
      ),
    },
  },
  server: {
    deps: {
      inline: [/^vscode-languageclient/],
    },
  },
  ssr: {
    noExternal: ['vscode-languageclient'],
  },
  test: {
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
