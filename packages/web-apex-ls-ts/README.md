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
import * as WebApexLanguageServer from 'web-apex-ls-ts';

// Initialize and connect to the language server
```

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
