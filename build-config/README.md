# Build Configuration

Shared esbuild presets now live in the publishable package `@salesforce/esbuild-presets` under `packages/esbuild-presets/`.

## Usage (inside this repo)

Import from the workspace package:

```typescript
import {
  nodeBaseConfig,
  browserBaseConfig,
  configureWebWorkerPolyfills,
  runBuilds,
} from '@salesforce/esbuild-presets';
```

## Usage (published)

Install and import in another project:

```bash
npm install @salesforce/esbuild-presets esbuild
```

```typescript
import { nodeBaseConfig, runBuilds } from '@salesforce/esbuild-presets';
```

## What’s included

- `nodeBaseConfig` / `browserBaseConfig`
- `NODE_POLYFILLS` and `configureWebWorkerPolyfills`
- `runBuilds` helper for one-off or watch mode builds with hooks/logging
