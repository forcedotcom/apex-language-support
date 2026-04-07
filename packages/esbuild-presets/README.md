# @salesforce/esbuild-presets

Shared esbuild presets and helpers for Node, browser, and worker bundles.

## Install

```bash
npm install @salesforce/esbuild-presets esbuild
```

## Usage

```ts
import {
  nodeBaseConfig,
  browserBaseConfig,
  configureWebWorkerPolyfills,
  runBuilds,
} from '@salesforce/esbuild-presets';

await runBuilds(
  [
    { ...nodeBaseConfig, entryPoints: ['src/index.ts'], outdir: 'dist' },
    {
      ...browserBaseConfig,
      entryPoints: ['src/index.browser.ts'],
      outdir: 'dist',
    },
  ],
  { label: 'my-package' },
);
```

## Minification

`nodeBaseConfig` and `browserBaseConfig` set `minify` via `shouldMinifyEsbuild()`:

- **On** for normal one-shot `tsx esbuild.config.ts` (CI, `npm run bundle`, packaging).
- **Off** when `process.argv` includes `--watch`, or `NODE_ENV=development`.

Use `shouldMinifyEsbuild()` for any extra build blocks (e.g. webview IIFE bundles) so they follow the same rules.

## Exports

- `nodeBaseConfig` / `browserBaseConfig`
- `shouldMinifyEsbuild()`
- `NODE_POLYFILLS`, `WEB_WORKER_GLOBALS`, `configureWebWorkerPolyfills`
- `runBuilds` with optional `afterBuild`, `onError`, and logging controls
