# Custom Services

Custom language server services for the Apex Language Server that extend beyond the standard LSP specification.

## Overview

This package implements custom services and capabilities for the Apex Language Server that are not part of the standard Language Server Protocol (LSP) specification. These services provide enhanced functionality specifically tailored for Apex development.

## Features

- Custom services for Apex-specific functionality
- Extensions to standard LSP services
- Additional capabilities beyond the standard protocol

## Dependencies

- `utilities`: Core utilities from this monorepo
- `vscode-languageserver`: VSCode Language Server implementation
- `vscode-languageserver-protocol`: LSP protocol definitions

## Usage

```typescript
import {} from /* specific services */ 'custom-services';

// Use the imported services
```

## Development

```bash
# Build the package
npm run build

# Watch for changes during development
npm run dev
```
