# Custom Services

Custom language server services for the Apex Language Server that extend beyond the standard LSP specification.

## Overview

This package implements custom services and capabilities for the Apex Language Server that are not part of the standard Language Server Protocol (LSP) specification. These services provide enhanced functionality specifically tailored for Apex development.

## Features

- Custom services for Apex-specific functionality
- Extensions to standard LSP services
- Additional capabilities beyond the standard protocol

## Dependencies

- `@salesforce/apex-lsp-parser-ast`: Apex language parser and AST functionality from this monorepo
- `vscode-languageserver`: VSCode Language Server implementation
- `vscode-languageserver-protocol`: LSP protocol definitions

## Usage

```typescript
import {} from /* specific services */ '@salesforce/apex-lsp-custom-services';

// Use the imported services
```

## Recent Changes

- **Removed Babel References:**  
  All references to Babel have been removed from the project. The project now uses `ts-jest` exclusively for testing.

- **TypeScript Improvements:**  
  Explicit types have been added to test files to resolve TypeScript errors. For example, in `apex-lsp-testbed/test/performance/lsp-benchmarks.web.test.ts`, variables and parameters now have explicit `any` types.

- **Jest Configuration:**  
  Jest configurations have been streamlined. Each package now uses a single Jest configuration file (`jest.config.cjs`), and the `"jest"` key has been removed from `package.json` files to avoid conflicts.

## Development

```bash
# Build the package
npm run build

# Watch for changes during development
npm run dev
```
