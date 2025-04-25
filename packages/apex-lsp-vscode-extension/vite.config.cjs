const { defineConfig } = require('vite');
const { resolve } = require('path');
const typescript = require('@rollup/plugin-typescript');

module.exports = defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/extension.ts'),
      name: 'extension',
      fileName: 'extension',
      formats: ['cjs'],
    },
    outDir: 'dist',
    rollupOptions: {
      external: [
        'vscode',
        'path',
        'fs',
        'vscode-languageclient/node',
        'node:process',
      ],
      output: {
        sourcemap: true,
        // Ensure that the extension is compatible with VS Code's extension format
        format: 'cjs',
      },
    },
    sourcemap: true,
    // Don't minify the output for better debugging
    minify: false,
  },
  plugins: [
    typescript({
      tsconfig: './tsconfig.build.json',
      sourceMap: true,
      compilerOptions: {
        module: 'ESNext',
        outDir: 'dist',
      },
    }),
  ],
});
