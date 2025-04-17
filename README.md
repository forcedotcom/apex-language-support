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

# Run tests with coverage
npm run test:coverage

# Run tests for a specific package
npm run test:packages

# Run tests with coverage for specific packages
npm run test:coverage:packages

# Generate a consolidated coverage report
npm run test:coverage:report

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## Testing and Code Coverage

This project includes comprehensive test coverage for all packages. Test coverage reports are generated using Jest and Istanbul.

### Running Tests with Coverage

```bash
# Run all tests with coverage
npm run test:coverage

# Run tests with coverage for specific packages
npm run test:coverage:packages

# Generate a consolidated coverage report for the entire repository
npm run test:coverage:report
```

### Coverage Reports

After running the test coverage commands, coverage reports are available:

- **Package-level reports**: Generated in each package's `coverage` directory
- **Consolidated repository report**: Generated in the root `coverage` directory

The coverage reports include:

- HTML reports for interactive viewing (`coverage/lcov-report/index.html`)
- LCOV reports for CI integration
- Text summaries in the console
- JSON coverage data for further processing

### Coverage Thresholds

Global coverage thresholds are set in the Jest configuration file:

- Statements: 50%
- Branches: 50%
- Functions: 50%
- Lines: 50%

These thresholds can be adjusted per package as needed.

## License

Licensed under the BSD 3-Clause license.
For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
