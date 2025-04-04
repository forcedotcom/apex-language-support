# Apex Language Support

# This repository is experimental - DO NOT USE

A Language Server Protocol implementation for Salesforce Apex language, written in TypeScript.

## Overview

This project implements a Language Server Protocol (LSP) for Salesforce Apex, providing features such as code completion, hover information, and other IDE-like capabilities for Apex development. The project is structured as a monorepo with multiple packages, each serving a specific purpose in the language server ecosystem.

## Packages

- **apex-parser-ast**: Apex language parser and AST functionality
- **custom-services**: Custom language server services beyond the LSP specification
- **lsp-compliant-services**: Standard LSP-compliant services implementation
- **extension-apex-ls-ts**: VS Code extension integration for the language server
- **web-apex-ls-ts**: Web-based integration for the language server
- **apex-lsp-browser-client**: Client library for connecting to the Apex Language Server in browser environments
- **apex-lsp-vscode-client**: Client library for connecting to the Apex Language Server in VSCode extensions

## Client Libraries

### Browser Client

The `apex-lsp-browser-client` package provides a TypeScript client for connecting to the Apex Language Server in web-based environments. It handles communication with a language server running in a web worker.

```bash
npm install @salesforce/apex-lsp-browser-client
```

### VSCode Client

The `apex-lsp-vscode-client` package provides a TypeScript client for creating VSCode extensions that connect to the Apex Language Server. It simplifies the setup and management of the language client in VSCode extensions.

```bash
npm install @salesforce/apex-lsp-vscode-client
```

## Requirements

- Node.js (latest LTS recommended)
- npm

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd apex-language-server-ts

# Install dependencies
npm install
```

## Development

```bash
# Build all packages
npm run build

# Watch all packages for changes during development
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## License

Licensed under the BSD 3-Clause license.
For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
