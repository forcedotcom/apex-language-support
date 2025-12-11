# Build Configuration

This directory contains shared build configuration for the Apex Language Server monorepo.

## Files

### `esbuild.shared.ts`

Shared configuration base for all packages using esbuild bundling:

- **`COMMON_EXTERNAL`**: Dependencies that should always be external (vscode, language server packages, etc.)
- **`INTERNAL_PACKAGES`**: Internal Salesforce packages that are typically external
- **`nodeBaseConfig`**: Base configuration for Node.js builds
- **`browserBaseConfig`**: Base configuration for browser/web builds
- **`NODE_POLYFILLS`**: Standard polyfill aliases for browser/worker builds

## Usage

Import shared configuration in your package's `esbuild.config.ts`:

```typescript
import { build } from 'esbuild';
import {
  nodeBaseConfig,
  browserBaseConfig,
} from '../../build-config/esbuild.shared';

await build({
  ...nodeBaseConfig,
  entryPoints: ['src/index.ts'],
  outdir: 'dist',
});
```

## Benefits

- **Consistency**: All packages use the same base configuration
- **Maintainability**: Update external dependencies in one place
- **Clarity**: Shared helpers keep browser/worker polyfills aligned
- **Reduced Duplication**: No more copying external arrays between configs
- **Easier Debugging**: A single shared file defines the defaults
