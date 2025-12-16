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

## Exports

- `nodeBaseConfig` / `browserBaseConfig`
- `NODE_POLYFILLS`, `WEB_WORKER_GLOBALS`, `configureWebWorkerPolyfills`
- `runBuilds` with optional `afterBuild`, `onError`, and logging controls
