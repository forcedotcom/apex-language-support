# LSP Compliant Services

Standard Language Server Protocol (LSP) compliant services for the Apex Language Server.

## Overview

This package implements services that conform to the standard Language Server Protocol (LSP) specification. These services provide core language features for Apex development within any LSP-compatible editor or IDE.

## Features

- Text document synchronization
- Code completion
- Hover information
- Document symbols
- Document formatting
- Additional LSP-specified capabilities

## Dependencies

- `apex-parser-ast`: Apex language parser and AST functionality from this monorepo
- `custom-services`: Custom services from this monorepo
- `vscode-languageserver`: VSCode Language Server implementation
- `vscode-languageserver-protocol`: LSP protocol definitions

## Usage

```typescript
import {} from /* specific services */ 'lsp-compliant-services';

// Use the imported services
```

## Development

```bash
# Build the package
npm run build

# Watch for changes during development
npm run dev
```
