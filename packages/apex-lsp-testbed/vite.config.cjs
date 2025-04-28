const { defineConfig } = require('vite');

module.exports = defineConfig({
  build: {
    lib: {
      entry: './src/cli.ts',
      formats: ['cjs'],
      fileName: () => 'cli.js',
    },
    rollupOptions: {
      external: [
        'vscode-jsonrpc',
        'vscode-languageclient',
        'vscode-languageserver',
        'vscode-languageserver-protocol',
        'vscode-languageserver-textdocument',
        'benchmark',
        'glob',
        'microtime',
      ],
    },
    outDir: 'dist',
    sourcemap: true,
    minify: false,
  },
});
