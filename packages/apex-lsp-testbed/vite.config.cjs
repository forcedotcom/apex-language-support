const { defineConfig } = require('vite');
const path = require('path');

module.exports = defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/cli.ts'),
      formats: ['cjs'],
      fileName: () => 'cli.js',
    },
    rollupOptions: {
      external: [
        'path',
        'fs',
        'child_process',
        'readline',
        'vscode-jsonrpc',
        'vscode-languageclient',
        'vscode-languageserver',
        'vscode-languageserver-protocol',
        'vscode-languageserver-textdocument',
      ],
    },
    sourcemap: true,
    outDir: 'dist',
  },
});
