# Apex Language Server Extension for VSCode

This extension provides Apex language server support for VSCode, enabling rich language features for Apex code development.

## Features

- Syntax highlighting for Apex files (.cls, .trigger)
- Code completion with contextual suggestions
- Error checking and diagnostics
- Hover information for Apex code elements
- Go to definition for symbols
- Document outline and symbol navigation

## Getting Started

### Installation

#### From Marketplace

1. Open VSCode
2. Go to Extensions view (Ctrl+Shift+X or Cmd+Shift+X)
3. Search for "Apex Language Server"
4. Click Install

#### Manual Installation

1. Download the .vsix file from the [releases page](https://github.com/salesforce/apex-language-server/releases)
2. In VSCode, go to Extensions view
3. Click the "..." menu in the top right
4. Select "Install from VSIX..." and choose the downloaded file

### Development Setup

1. Clone the repository
2. Run `npm install` in the root directory
3. Open the project in VSCode
4. Press F5 to start debugging

## Commands

- `Apex: Restart Language Server` - Restart the Apex language server

## Extension Settings

This extension contributes the following settings:

- `apex.enable`: Enable/disable the Apex language server
- `apex.trace.server`: Traces the communication between VSCode and the Apex language server

## Development

### Building

```bash
npm run compile
```

### Packaging

```bash
npm run package
```

### Testing

```bash
npm test
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

BSD-3-Clause license. See the LICENSE file for details.
