# Build Configuration

This directory contains shared build configuration for the Apex Language Server monorepo.

## Files

### `tsup.shared.ts`

Shared configuration base for all packages using tsup bundling:

- **`COMMON_EXTERNAL`**: Dependencies that should always be external (vscode, language server packages, etc.)
- **`INTERNAL_PACKAGES`**: Internal Salesforce packages that are typically external
- **`nodeBaseConfig`**: Base configuration for Node.js builds
- **`browserBaseConfig`**: Base configuration for browser/web builds  
- **`BROWSER_ALIASES`**: Standard polyfill aliases for browser builds

## Usage

Import shared configuration in your package's `tsup.config.ts`:

```typescript
import { defineConfig } from 'tsup';
import { nodeBaseConfig, browserBaseConfig, BROWSER_ALIASES } from '../../build-config/tsup.shared';

export default defineConfig([
  {
    name: 'my-package',
    ...nodeBaseConfig,
    entry: ['src/index.ts'],
    // package-specific overrides
  }
]);
```

## Benefits

- **Consistency**: All packages use the same base configuration
- **Maintainability**: Update external dependencies in one place
- **Clarity**: Named builds show clearly in logs (e.g., `[DESKTOP]`, `[WEB]`)
- **Reduced Duplication**: No more copying external arrays between configs
- **Easier Debugging**: Named builds make it clear which target is building

## Named Builds

All builds now have descriptive names that appear in the build output:

- Extension: `[DESKTOP]`, `[WEB]`
- Apex-LS: `[NODE]`, `[BROWSER]`, `[WORKER]`  
- Libraries: `[SHARED]`, `[PARSER-AST]`, `[CUSTOM-SERVICES]`, etc.

This makes it much easier to understand build logs and debug issues.