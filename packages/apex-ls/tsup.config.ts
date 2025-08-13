import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: {
    compilerOptions: {
      composite: false,
      incremental: false,
      tsBuildInfoFile: undefined,
    },
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  platform: 'neutral',
  target: 'es2020',
  outDir: 'dist',
});
