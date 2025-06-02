# Extension Apex Language Server

VS Code extension integration for the Apex Language Server.

## Overview

This package provides the integration layer between the Apex Language Server and VS Code. It enables VS Code to communicate with the language server using Node.js IPC and provides the necessary configuration for VS Code to recognize and use the language server for Apex files.

## Features

- VS Code extension integration
- Node.js IPC-based communication
- Language server initialization and configuration
- VS Code-specific functionality

## Dependencies

- `vscode-languageserver`: VSCode Language Server implementation
- `vscode-languageserver-protocol`: LSP protocol definitions

## Recent Changes

- **Removed Babel References:**  
  All references to Babel have been removed from the project. The project now uses `ts-jest` exclusively for testing.

- **TypeScript Improvements:**  
  Explicit types have been added to test files to resolve TypeScript errors. For example, in `apex-lsp-testbed/test/performance/lsp-benchmarks.web.test.ts`, variables and parameters now have explicit `any` types.

- **Jest Configuration:**  
  Jest configurations have been streamlined. Each package now uses a single Jest configuration file (`jest.config.cjs`), and the `"jest"` key has been removed from `package.json` files to avoid conflicts.

## Usage

This package is typically used as part of a VS Code extension. Once built, it can be included in a VS Code extension package that provides Apex language support.

## Development

```bash
# Build the package
npm run build

# Watch for changes during development
npm run dev
```

## Extension Configuration

When integrating this package into a VS Code extension, you'll need to configure the extension's `package.json` to recognize Apex files and activate the language server appropriately. See the [VS Code Extension API documentation](https://code.visualstudio.com/api) for more details.
