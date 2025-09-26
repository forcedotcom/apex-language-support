@ -0,0 +1,542 @@
@ -0,0 +1,541 @@
# Build Architecture Refactoring Plan

## Executive Summary

This document outlines a comprehensive plan to refactor the current build system to prioritize compilation output to the `out` directory for debugging and development, while treating bundling as a separate, optional step for distribution. Additionally, this plan includes **modularization** of `apex-ls` and `apex-lsp-vscode-extension` into Node.js and browser submodules, similar to the VSCode Language Client pattern (`vscode-languageclient/node` vs `vscode-languageclient/browser`).

## Current State Analysis

### Current Build Dependencies (Turbo.json)

```
precompile → compile → bundle → package
```

### Current Package Output Configurations

| Package                     | Compile Target | Bundle Target | Main Entry           | Module Entry     | Types Entry       |
| --------------------------- | -------------- | ------------- | -------------------- | ---------------- | ----------------- |
| `apex-ls`                   | `out/`         | `dist/`       | `dist/index.js`      | `dist/index.mjs` | `dist/index.d.ts` |
| `apex-lsp-shared`           | `out/`         | `dist/`       | `out/index.js`       | `out/index.js`   | `out/index.d.ts`  |
| `apex-lsp-vscode-extension` | `out/`         | `dist/`       | `./out/extension.js` | N/A              | N/A               |
| `apex-parser-ast`           | `out/`         | `dist/`       | `out/index.js`       | `out/index.js`   | `out/index.d.ts`  |
| `custom-services`           | `out/`         | `dist/`       | `out/index.js`       | `out/index.js`   | `out/index.d.ts`  |
| `lsp-compliant-services`    | `out/`         | `dist/`       | `out/index.js`       | `out/index.js`   | `out/index.d.ts`  |

### Current Environment Separation

**Apex-LS Package Structure:**

- Currently has **unified exports** with environment-specific builds:
  - `./` - Node.js entry point (`dist/index.js`)
  - `./browser` - Browser entry point (`dist/browser.js`)
  - `./worker` - Web Worker entry point (`dist/worker.global.js`)
- **Compilation targets**: Multiple tsconfig files (node, browser, worker)
- **Import complexity**: Dynamic imports and environment detection throughout codebase

**VSCode Extension Structure:**

- Environment detection at runtime (`detectEnvironment()`)
- Conditional imports for Node.js vs browser functionality
- Single entry point with runtime branching

### Current Launch Configuration Dependencies

The launch configurations currently expect:

- **Extension development**: Files in `out/` directory for the extension itself
- **Language server**: Files in both `dist/` and `out/` directories
- **Source mapping**: Complex path overrides to map between `dist/` and `src/` directories

## Target Architecture

### New Build Dependencies

```
precompile → compile (for development/debugging)
                ↓
            bundle (for distribution only)
                ↓
            package (for publishing)
```

### Design Principles

1. **Separation of Concerns**: Development debugging should not require bundling
2. **Faster Development Cycle**: Compilation should be sufficient for local development
3. **Simplified Debugging**: All debug configurations should use `out/` directory consistently
4. **Bundle on Demand**: Bundling only when preparing for distribution or publishing
5. **Source Map Clarity**: Simplified source mapping from `out/` to `src/`
6. **Clear Modularization**: Explicit Node.js vs browser submodules similar to VSCode Language Client pattern

## Implementation Plan

### Phase 1: Package Configuration Standardization

#### 1.1 Update Package.json Configurations

**Standardize all packages to use `out/` for development:**

```json
{
  "main": "out/index.js",
  "module": "out/index.js",
  "types": "out/index.d.ts",
  "exports": {
    "import": "./out/index.js",
    "require": "./out/index.js"
  }
}
```

**Packages to Update:**

- ✅ `apex-lsp-shared` (already uses `out/`)
- ✅ `apex-parser-ast` (already uses `out/`)
- ✅ `custom-services` (already uses `out/`)
- ✅ `lsp-compliant-services` (already uses `out/`)
- ❌ `apex-ls` (needs change from `dist/` to `out/` + modularization)

#### 1.2 Update TypeScript Configurations

**Ensure all tsconfig.json files output to `out/`:**

- Update `outDir` to `"out"`
- Ensure `declarationDir` is `"out"` if specified
- Update any path mappings to reference `out/` instead of `dist/`

### Phase 2: Modularization Strategy

#### 2.1 Apex-LS Package Restructuring

**Current Structure (Unified):**

```
packages/apex-ls/
├── src/
│   ├── index.ts (Node.js entry)
│   ├── index.browser.ts (Browser entry)
│   ├── server.ts (Worker entry)
│   ├── client/
│   ├── server/
│   └── communication/
├── package.json (with complex exports)
└── tsup.config.ts (multiple builds)
```

**Proposed Structure (Modularized):**

```
packages/apex-ls/
├── src/
│   ├── shared/          # Shared utilities and interfaces
│   │   ├── types/
│   │   ├── utils/
│   │   └── storage/
│   ├── node/           # Node.js-specific implementation
│   │   ├── index.ts
│   │   ├── server/
│   │   ├── client/
│   │   └── launcher/
│   ├── browser/        # Browser-specific implementation
│   │   ├── index.ts
│   │   ├── server/
│   │   ├── client/
│   │   └── worker/
│   └── worker/         # Web Worker implementation
│       ├── index.ts
│       └── server.ts
├── package.json (with submodule exports)
└── tsconfig*.json (per environment)
```

**New Package.json Exports:**

```json
{
  "name": "@salesforce/apex-ls",
  "exports": {
    ".": {
      "types": "./out/shared/index.d.ts",
      "import": "./out/shared/index.js",
      "require": "./out/shared/index.js"
    },
    "./node": {
      "types": "./out/node/index.d.ts",
      "import": "./out/node/index.js",
      "require": "./out/node/index.js"
    },
    "./browser": {
      "types": "./out/browser/index.d.ts",
      "import": "./out/browser/index.js",
      "require": "./out/browser/index.js"
    },
    "./worker": {
      "types": "./out/worker/index.d.ts",
      "import": "./out/worker/index.js",
      "require": "./out/worker/index.js"
    }
  }
}
```

#### 2.2 VSCode Extension Package Restructuring

**Current Structure (Runtime Detection):**

```
packages/apex-lsp-vscode-extension/
├── src/
│   ├── extension.ts (single entry with runtime detection)
│   ├── language-server.ts (environment branching)
│   ├── server-config.ts (Node.js only)
│   └── polyfills.ts (browser only)
└── package.json (single entry points)
```

**Proposed Structure (Explicit Separation):**

```
packages/apex-lsp-vscode-extension/
├── src/
│   ├── shared/          # Shared extension utilities
│   │   ├── constants.ts
│   │   ├── logging.ts
│   │   ├── status-bar.ts
│   │   └── configuration.ts
│   ├── node/           # Node.js extension implementation
│   │   ├── extension.ts
│   │   ├── language-server.ts
│   │   └── server-config.ts
│   ├── browser/        # Browser extension implementation
│   │   ├── extension.ts
│   │   ├── language-server.ts
│   │   └── polyfills.ts
│   └── common/         # Platform-agnostic extension logic
│       ├── commands.ts
│       └── providers.ts
├── package.json (with environment-specific entries)
└── tsconfig*.json (per environment)
```

**New Package.json Structure:**

```json
{
  "main": "./out/node/extension.js",
  "browser": "./out/browser/extension.js",
  "exports": {
    "./node": {
      "types": "./out/node/extension.d.ts",
      "import": "./out/node/extension.js",
      "require": "./out/node/extension.js"
    },
    "./browser": {
      "types": "./out/browser/extension.d.ts",
      "import": "./out/browser/extension.js",
      "require": "./out/browser/extension.js"
    }
  }
}
```

#### 2.3 Benefits of Modularization

**Development Benefits:**

- **Clear separation**: No more runtime environment detection
- **Type safety**: Environment-specific types without conflicts
- **Smaller bundles**: Only relevant code for each environment
- **Easier debugging**: Clear entry points for each environment
- **Better IntelliSense**: IDE knows exact environment context

**Maintenance Benefits:**

- **Reduced complexity**: No complex conditional imports
- **Easier testing**: Environment-specific test suites
- **Clear ownership**: Environment-specific features are isolated
- **Future-proof**: Easier to add new environments

### Phase 3: Turbo Configuration Updates

#### 3.1 Modify turbo.json Dependencies

**Current:**

```json
{
  "compile": {
    "dependsOn": ["precompile", "^precompile", "^compile"],
    "outputs": ["out/**", "*.tsbuildinfo"]
  },
  "bundle": {
    "dependsOn": ["compile", "^bundle"],
    "outputs": ["dist/**", "out/**"]
  }
}
```

**Proposed:**

```json
{
  "compile": {
    "dependsOn": ["precompile", "^precompile", "^compile"],
    "outputs": ["out/**", "*.tsbuildinfo"]
  },
  "compile:node": {
    "dependsOn": ["precompile", "^precompile", "^compile"],
    "outputs": ["out/node/**", "*.tsbuildinfo"]
  },
  "compile:browser": {
    "dependsOn": ["precompile", "^precompile", "^compile"],
    "outputs": ["out/browser/**", "*.tsbuildinfo"]
  },
  "bundle": {
    "dependsOn": ["^compile"],
    "outputs": ["dist/**"]
  },
  "dev": {
    "dependsOn": ["compile"],
    "cache": false
  },
  "dev:node": {
    "dependsOn": ["compile:node"],
    "cache": false
  },
  "dev:browser": {
    "dependsOn": ["compile:browser"],
    "cache": false
  }
}
```

### Phase 4: Launch Configuration Updates

#### 4.1 Environment-Specific Launch Configurations

**Node.js Development:**

```json
{
  "name": "Run Extension (Node.js)",
  "type": "extensionHost",
  "request": "launch",
  "args": [
    "--extensionDevelopmentPath=${workspaceFolder}/packages/apex-lsp-vscode-extension"
  ],
  "outFiles": ["${workspaceFolder}/**/out/node/**/*.js"],
  "sourceMapPathOverrides": {
    "*/src/node/*": "${workspaceFolder}/packages/*/src/node/*",
    "*/src/shared/*": "${workspaceFolder}/packages/*/src/shared/*"
  },
  "preLaunchTask": "npm: dev:node"
}
```

**Browser Development:**

```json
{
  "name": "Run Extension (Browser)",
  "type": "extensionHost",
  "request": "launch",
  "args": [
    "--extensionDevelopmentPath=${workspaceFolder}/packages/apex-lsp-vscode-extension"
  ],
  "outFiles": ["${workspaceFolder}/**/out/browser/**/*.js"],
  "sourceMapPathOverrides": {
    "*/src/browser/*": "${workspaceFolder}/packages/*/src/browser/*",
    "*/src/shared/*": "${workspaceFolder}/packages/*/src/shared/*"
  },
  "preLaunchTask": "npm: dev:browser"
}
```

#### 4.2 Simplified Source Mapping

**Environment-specific mappings:**

```json
{
  "sourceMapPathOverrides": {
    "*/src/node/*": "${workspaceFolder}/packages/*/src/node/*",
    "*/src/browser/*": "${workspaceFolder}/packages/*/src/browser/*",
    "*/src/shared/*": "${workspaceFolder}/packages/*/src/shared/*",
    "*/src/worker/*": "${workspaceFolder}/packages/*/src/worker/*"
  }
}
```

### Phase 5: TypeScript Configuration Updates

#### 5.1 Environment-Specific TypeScript Configs

**packages/apex-ls/tsconfig.shared.json:**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "out/shared",
    "rootDir": "src/shared"
  },
  "include": ["src/shared/**/*"]
}
```

**packages/apex-ls/tsconfig.node.json:**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "out/node",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src/node/**/*", "src/shared/**/*"],
  "references": [{ "path": "./tsconfig.shared.json" }]
}
```

**packages/apex-ls/tsconfig.browser.json:**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "out/browser",
    "rootDir": "src",
    "lib": ["dom", "dom.iterable", "es2022"],
    "types": ["webworker"]
  },
  "include": ["src/browser/**/*", "src/shared/**/*"],
  "references": [{ "path": "./tsconfig.shared.json" }]
}
```

### Phase 6: Package Scripts Updates

#### 6.1 Environment-Specific Build Scripts

**packages/apex-ls/package.json:**

```json
{
  "scripts": {
    "compile": "npm run compile:shared && npm run compile:node && npm run compile:browser && npm run compile:worker",
    "compile:shared": "tsc --build tsconfig.shared.json",
    "compile:node": "tsc --build tsconfig.node.json",
    "compile:browser": "tsc --build tsconfig.browser.json",
    "compile:worker": "tsc --build tsconfig.worker.json",
    "dev": "npm run compile",
    "dev:node": "npm run compile:shared && npm run compile:node",
    "dev:browser": "npm run compile:shared && npm run compile:browser",
    "dev:worker": "npm run compile:shared && npm run compile:worker",
    "bundle": "tsup",
    "clean": "rimraf out dist .turbo coverage tsconfig.tsbuildinfo"
  }
}
```

#### 6.2 Root Package Scripts

**package.json:**

```json
{
  "scripts": {
    "dev": "turbo run compile --parallel",
    "dev:node": "turbo run compile:node --parallel",
    "dev:browser": "turbo run compile:browser --parallel",
    "build": "turbo run compile bundle",
    "debug": "turbo run compile",
    "debug:node": "turbo run compile:node",
    "debug:browser": "turbo run compile:browser"
  }
}
```

## Migration Strategy

### Phase 1: Foundation (Week 1-2)

1. **Update output directories**: Change all packages to use `out/` for development
2. **Simplify existing configs**: Remove complex bundling dependencies for development
3. **Test current functionality**: Ensure nothing breaks with `out/` standardization

### Phase 2: Apex-LS Modularization (Week 3-4)

1. **Create modular structure**: Split src into `shared/`, `node/`, `browser/`, `worker/`
2. **Update TypeScript configs**: Create environment-specific tsconfig files
3. **Update package exports**: Add submodule exports (`/node`, `/browser`, `/worker`)
4. **Migrate existing code**: Move code to appropriate environment directories
5. **Update imports**: Change internal imports to use new structure

### Phase 3: Extension Modularization (Week 5)

1. **Create extension structure**: Split into `shared/`, `node/`, `browser/`
2. **Remove runtime detection**: Replace with explicit entry points
3. **Update extension manifest**: Add environment-specific entries
4. **Test both environments**: Ensure Node.js and browser builds work

### Phase 4: Integration & Validation (Week 6)

1. **Update launch configs**: Add environment-specific debug configurations
2. **Update build scripts**: Add environment-specific build targets
3. **Comprehensive testing**: Test all environments and build targets
4. **Documentation**: Update README and contribution guides

## Migration Checklist

### Package Structure Updates

- [ ] Create modular directory structure for `apex-ls`
- [ ] Create modular directory structure for `apex-lsp-vscode-extension`
- [ ] Update TypeScript configurations for all environments
- [ ] Update package.json exports for submodules

### Code Migration

- [ ] Move shared utilities to `shared/` directories
- [ ] Move Node.js-specific code to `node/` directories
- [ ] Move browser-specific code to `browser/` directories
- [ ] Move worker-specific code to `worker/` directories
- [ ] Update all import statements to new structure

### Build System Updates

- [ ] Update `turbo.json` with environment-specific tasks
- [ ] Update package scripts for modular builds
- [ ] Remove complex bundling dependencies from development workflow
- [ ] Add environment-specific development tasks

### Launch Configuration Updates

- [ ] Add Node.js-specific launch configurations
- [ ] Add browser-specific launch configurations
- [ ] Simplify source map path overrides
- [ ] Test debugging with new configurations

### Validation

- [ ] Verify Node.js extension works in VS Code desktop
- [ ] Verify browser extension works in VS Code web
- [ ] Verify all tests pass with new structure
- [ ] Verify bundling still works for distribution
- [ ] Verify packaging works for publishing

## Success Criteria

1. ✅ `turbo run compile` produces working development environment
2. ✅ `turbo run dev:node` builds only Node.js components
3. ✅ `turbo run dev:browser` builds only browser components
4. ✅ VS Code debugging works without bundling step
5. ✅ Clear separation between Node.js and browser codebases
6. ✅ Extension works in both desktop and web VS Code environments
7. ✅ Source maps correctly map to environment-specific source files
8. ✅ Distribution bundling remains functional
9. ✅ Performance improvement in development build times
10. ✅ Reduced bundle sizes for each environment