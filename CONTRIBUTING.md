# Contributing to Apex Language Server (TypeScript)

Thank you for your interest in contributing to the Apex Language Server project! This document provides guidelines and setup instructions to help you get started.

## Prerequisites

Before you begin, ensure your development environment meets these requirements:

- **Node.js**: v16.0.0 or higher (v22.x recommended)
- **npm**: v11.2.0 or higher
- Git

## Development Environment Setup

1. **Fork and clone the repository**:

   ```bash
   git clone https://github.com/your-username/apex-language-server-ts.git
   cd apex-language-server-ts
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

## Project Structure

The project is organized as a monorepo using npm workspaces:

- `packages/apex-parser-ast`: Apex language parser and AST functionality
- `packages/custom-services`: Custom language server services
- `packages/lsp-compliant-services`: Standard LSP-compliant services
- `packages/extension-apex-ls-ts`: VS Code extension integration
- `packages/web-apex-ls-ts`: Web-based integration

## Development Workflow

### Building

- Build all packages:

  ```bash
  npm run build
  ```

- Watch mode for development:
  ```bash
  npm run dev
  ```

### Testing

- Run tests:
  ```bash
  npm test
  ```

### Linting

- Check code style:

  ```bash
  npm run lint
  ```

- Fix code style issues:
  ```bash
  npm run lint:fix
  ```

## Code Style Guidelines

This project follows these code style practices:

- Use TypeScript for all new code
- Follow the existing patterns in the codebase
- All files must include the BSD 3-Clause license header
- Use ESLint and Prettier for code formatting

## Pull Request Process

1. Create a new branch for your feature or bugfix
2. Make your changes, including appropriate tests
3. Ensure all tests pass and linting rules are satisfied
4. Update documentation as needed
5. Submit a pull request with a clear description of the changes

## Troubleshooting

### npm Workspace Issues

If you encounter issues with npm workspaces:

- Make sure you're using npm v11.2.0+
- If you can't update npm globally, use the project's recommended approach:
  ```bash
  npx npm@11.2.0 run build
  ```

## License

By contributing to this project, you agree that your contributions will be licensed under the project's BSD 3-Clause license.
