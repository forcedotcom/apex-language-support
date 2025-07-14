# Web Apex Language Server

Web-based integration for the Apex Language Server.

## Overview

This package provides the integration layer for using the Apex Language Server in web-based environments. It allows web applications to connect to and utilize the language server for providing Apex language features in browser-based IDEs and code editors.

## Features

- Browser-based implementation of the language server
- Web worker compatibility
- Language server initialization for web environments
- Basic language features (completion, hover)

## Dependencies

- `vscode-languageserver`: VSCode Language Server implementation (browser version)
- `vscode-languageserver-protocol`: LSP protocol definitions

## Usage

This package can be integrated into web-based IDEs and code editors that support the Language Server Protocol.

```typescript
// Example usage in a web application
import * as WebApexLanguageServer from 'apex-ls-browser';

// Initialize and connect to the language server
```

## Recent Changes

- **Removed Babel References:**  
  All references to Babel have been removed from the project. The project now uses `ts-jest` exclusively for testing.

- **TypeScript Improvements:**  
  Explicit types have been added to test files to resolve TypeScript errors. For example, in `apex-lsp-testbed/test/performance/lsp-benchmarks.test.ts`, variables and parameters now have explicit `any` types.

- **Jest Configuration:**  
  Jest configurations have been streamlined. Each package now uses a single Jest configuration file (`jest.config.cjs`), and the `"jest"` key has been removed from `package.json` files to avoid conflicts.

## Development

```bash
# Build the package
npm run build

# Watch for changes during development
npm run dev
```

## Web Integration

To integrate this language server into a web-based editor:

1. Add this package as a dependency
2. Set up the proper message passing between your editor and the language server
3. Configure the editor to use the language server for Apex files

See the [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) documentation for more details on LSP integration in web environments.

## Bundle Outputs

Starting with v1.1.0 this package ships pre-bundled artifacts in `bundle/` that are published to npm:

| File         | Format             | Use-case                                 |
| ------------ | ------------------ | ---------------------------------------- |
| `index.mjs`  | ES Module (ES2020) | Modern browsers / bundlers (recommended) |
| `index.js`   | CommonJS           | Legacy tooling that still requires CJS   |
| `index.d.ts` | Type Declarations  | Type-safe consumption from TypeScript    |

> **Note** Because we generate a single, side-effect-free bundle (`"sideEffects": false` in `package.json`), downstream bundlers can safely tree-shake any unused code.

### Supported Browsers / ECMAScript Target

The bundle is transpiled to the `es2020` target. That means it runs natively in all evergreen browsers (Chrome 88+, Firefox 78+, Edge 90+, Safari 14+). If you need to support older environments you can continue to transpile our ESM build through your own Babel/ESBuild pipeline.
