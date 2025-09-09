# E2E Tests for Apex Language Server Extension

This package provides comprehensive end-to-end testing for the Apex Language Server Extension in VS Code Web environments. The test suite validates that the extension correctly integrates with VS Code's language server protocol and provides essential Apex language features.

## Purpose

The e2e test suite ensures the Apex Language Server Extension works correctly in real-world browser environments by testing:

- **Extension Activation**: Verifies the extension properly activates when Apex files are opened
- **Language Server Integration**: Confirms the LSP worker starts and initializes without errors
- **Symbol Parsing**: Validates that Apex code is correctly parsed and symbols are identified
- **Outline View**: Tests that the VS Code outline view displays Apex class structure
- **Workspace Integration**: Ensures Apex files are recognized and handled in the workspace
- **Stability**: Confirms the extension doesn't cause VS Code crashes or performance issues

## Test Philosophy

These tests focus on critical user-facing functionality rather than internal implementation details. They simulate real user interactions with the extension in a browser environment, providing confidence that the extension will work correctly when published.

The test suite prioritizes:

- **Reliability**: Tests are designed to be stable across different environments
- **Performance**: Fast execution with parallel test runs where possible
- **Maintainability**: Clean abstractions and reusable utilities
- **Comprehensive Coverage**: Core functionality is thoroughly validated

## Prerequisites

- Node.js >= 20.0.0
- Extension must be built before running tests
- VS Code Web test server capability

## Running Tests

```bash
# Run all tests (recommended)
npm run test:e2e

# Debug mode with browser UI
npm run test:e2e:debug

# Visual mode for test development
npm run test:e2e:visual
```

## Test Environment

The tests run against a real VS Code Web instance with the extension pre-loaded. This provides high confidence that the extension will work correctly in production browser environments.

**Supported Browsers**: Chromium (primary testing target)

**Environment Support**:

- Local development with detailed debugging
- CI/CD with stability optimizations
- Debug modes for test development

## Architecture

The test suite uses Playwright for browser automation and is structured with:

- **Utilities**: Reusable functions for common test operations
- **Test Helpers**: Specialized functions for extension-specific testing
- **Configuration**: Centralized settings and selectors
- **Type Safety**: Full TypeScript support throughout

## Debugging and Development

The test suite includes comprehensive debugging capabilities:

- Console error monitoring with intelligent filtering
- Network failure tracking
- Screenshot and video capture on failures
- Detailed logging for test analysis

For manual debugging, tests can be run against a standalone VS Code Web server with full developer tools access.

## CI/CD Integration

Tests are configured for continuous integration with:

- Retry logic for flaky test handling
- Environment-specific timeouts and worker configuration
- Comprehensive reporting and artifact collection
- Headless execution with debugging artifact generation

## Contributing

When adding new tests:

1. Use existing test utilities and patterns
2. Focus on user-facing functionality
3. Ensure tests are reliable across environments
4. Include proper error handling and logging
5. Follow TypeScript best practices

The test suite is designed to grow with the extension while maintaining reliability and performance.
