# Contributing to Apex Language Server (TypeScript)

Thank you for your interest in contributing to the Apex Language Server project! This document provides guidelines and setup instructions to help you get started.

## Prerequisites

Before you begin, ensure your development environment meets these requirements:

- **Node.js**: v20.0.0 or higher (v22.x recommended)
- **npm**: v10.2.0 or higher
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
- `packages/apex-ls-browser`: Browser-based implementation for the language server
- `packages/apex-ls-node`: Node.js implementation for the language server

## TypeScript Declaration Files

Each package generates TypeScript declaration files (`.d.ts`) to provide type information for consumers of the libraries. These declarations are:

- Generated during the build process
- Located in the `dist` directory of each package
- Referenced by the `types` field in each package's `package.json`

When creating new modules or modifying existing ones, ensure your code is properly typed so the declaration files are accurate and useful for consumers.

## Development Workflow

### Building

This project uses [wireit](https://github.com/google/wireit) for smart incremental builds. Wireit only rebuilds what has changed, making development much faster.

- Build all packages:

  ```bash
  npm run build
  ```

- Build a specific package (will also build its dependencies):

  ```bash
  cd packages/custom-services
  npm run build
  ```

- Watch mode for development:
  ```bash
  npm run dev
  ```

Wireit automatically:

- Tracks dependencies between packages
- Only rebuilds what's necessary
- Caches build results to avoid redundant work
- Runs builds in parallel when possible

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

## Commit Guidelines

This project follows [Conventional Commits](https://www.conventionalcommits.org/) to standardize commit messages and make the development history clear and readable.

### Commit Format

Each commit message consists of a **header**, a **body**, and a **footer**. The header has a specific format that includes a **type**, a **scope**, and a **subject**:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Examples:

```
feat(apex-lsp-parser-ast): Add support for custom annotations

fix(apex-lsp-compliant-services): Correct hover information display

docs(repo): Update README with new installation instructions
```

### Using the Commit Tool

We've integrated Commitizen to help you format your commits correctly:

```bash
npm run commit
```

This will start an interactive prompt that guides you through creating a properly formatted commit message.

### Commit Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (formatting, etc.)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

### Scopes

The scope specifies the part of the codebase your change affects. For this project, valid scopes include:

- **apex-lsp-parser-ast**: Changes to the parser/AST package
- **apex-lsp-custom-services**: Changes to custom language services
- **apex-lsp-compliant-services**: Changes to standard LSP services
- **apex-lsp-extension**: Changes to VS Code extension integration
- **apex-lsp-web**: Changes to web-based integration
- **docs**: Documentation changes
- **infra**: Infrastructure changes
- **build**: Build system changes
- **ci**: CI/CD changes
- **deps**: Dependency updates
- **repo**: Repository-level changes

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
