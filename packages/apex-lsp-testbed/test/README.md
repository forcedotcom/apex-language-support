# Testing apex-lsp-testbed

This directory contains tests for the apex-lsp-testbed package. The test suite is designed to verify that the package functions as expected and integrates properly with VS Code and language server implementations.

## Test Structure

The test suite is organized as follows:

- `index.test.ts` - Basic smoke test to ensure Jest is working properly
- `mock-structure.test.ts` - Validates the package file structure without importing code
- `vscode-compatibility.test.ts` - Tests VS Code integration via package.json settings
- `servers/jorje/javaServerLauncher.test.ts` - Unit tests for the Java server launcher
- `client/ApexJsonRpcClient.test.ts` - Unit tests for the JSON-RPC client

## Test Approach

The tests are designed to validate the package's functionality without relying on complex runtime dependencies like VS Code or Java. This is accomplished by:

1. Mocking external dependencies (child_process, fs, etc.)
2. Testing file structure rather than importing code directly when appropriate
3. Using dynamic imports when needed to avoid dependency issues
4. Using Jest's mocking capabilities to simulate runtime behavior

## Running Tests

To run the tests, use the following commands:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test files
npx jest client/ApexJsonRpcClient.test.ts
```

## Mock Dependencies

The test suite uses several mock implementations:

- `mock-package.json` - Mock project for testing workspace handling
- `mock-server.js` - Mock implementation of a language server for testing

## Adding Tests

When adding new tests, follow these guidelines:

1. Follow the existing structure by placing tests in appropriate subdirectories
2. Mock external dependencies to avoid runtime requirements
3. Test functionality, not implementation details where possible
4. Ensure tests are isolated and don't depend on global state
5. Add appropriate documentation in test files

## Troubleshooting

If tests are failing, check the following:

1. Ensure all dependencies are installed (`npm install`)
2. Make sure Jest is configured properly
3. Check if mock implementations need updating
4. Verify that the package structure hasn't changed 