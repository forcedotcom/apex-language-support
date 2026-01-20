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

## Test Modes

The test suite supports different execution modes:

### Web Mode (Default)
Tests run against VS Code Web using `@vscode/test-web`. This is the default mode and tests the browser-based extension.

```bash
TEST_MODE=web npm run test -w e2e-tests
```

### Desktop Mode (Future)
Desktop mode testing using `@vscode/test-electron` is planned but not yet implemented.

## Prerequisites

- Node.js >= 20.0.0
- Extension must be built before running tests:
  ```bash
  npm run compile
  npm run bundle
  npm run build -w packages/apex-lsp-vscode-extension
  ```
- A `test-workspace` directory must exist in `e2e-tests/`

## Running Tests

```bash
# Build extension first (from repo root)
npm run compile && npm run bundle

# Run all tests (recommended)
npm run test:e2e

# Or from within e2e-tests directory
cd e2e-tests
npm test

# Debug mode with browser UI visible
npm run test:e2e:debug

# Visual mode for test development
npm run test:e2e:visual
```

## Test Suite

The test suite includes the following tests:

1. **Core Functionality Test**: Validates extension activation, LCS integration, and worker initialization
2. **Symbol Parsing Test**: Verifies Apex symbols are parsed and appear in the outline view
3. **Hover Test** (skipped): Tests hover functionality for Apex symbols (currently skipped due to VS Code Web keyboard shortcut complexity)

## Troubleshooting

### Tests Fail with "No symbols found"
- Ensure the extension is properly built with `npm run bundle`
- Verify `extension.web.js` exists in `packages/apex-lsp-vscode-extension/dist/`
- Check that `test-workspace` directory exists

### Tests Timeout
- Increase timeout in `playwright.config.ts`
- Run with `DEBUG_MODE=true` to slow down execution
- Check for network issues affecting the web server

### Extension Not Loading
- Verify the extension build completed successfully
- Check the test-server.js logs for errors
- Ensure port 3000 is available

### setImmediate Errors in Web Mode
- This was a known issue where Node.js-specific `setImmediate` was used
- Fixed by adding browser-compatible fallback using `setTimeout(0)`
- If you see this error, ensure you have the latest code changes

### Console Errors During Tests
- Some console errors are expected and filtered (see `NON_CRITICAL_ERROR_PATTERNS`)
- If blocked errors appear, they indicate real issues that need investigation

## Test Environment

The tests run against a real VS Code Web instance with the extension pre-loaded. This provides high confidence that the extension will work correctly in production browser environments.

**Supported Browsers**: Chromium (primary testing target)

**Environment Support**:
- Local development with detailed debugging
- CI/CD with stability optimizations
- Debug modes for test development

## Architecture

The test suite uses Playwright for browser automation and is structured with:

- **`tests/`**: Test specifications
- **`utils/`**: Reusable functions for common test operations
  - `constants.ts`: Shared constants and selectors
  - `lsp-testing.ts`: LSP functionality testing utilities
  - `outline-helpers.ts`: Outline view interaction helpers
  - `setup.ts`: Test setup utilities
  - `vscode-interaction.ts`: VS Code Web interaction helpers
- **`test-server.js`**: VS Code Web server for running tests
- **`playwright.config.ts`**: Playwright configuration

## CI/CD Integration

Tests are configured for continuous integration with:

- Retry logic for flaky test handling (2 retries in CI)
- Environment-specific timeouts (20 minute job timeout)
- Comprehensive reporting (HTML, line, JUnit)
- Artifact collection (screenshots, videos, traces)
- Headless execution with debugging artifact generation

## Known Limitations

1. **Hover Testing**: The hover test is currently skipped because triggering hover via keyboard shortcuts in VS Code Web is unreliable in automated tests. The hover functionality works correctly when tested manually.

2. **Desktop Mode**: Desktop VS Code testing is not yet implemented. The current tests only cover the web extension.

3. **Standard Library Hover**: Hover for standard Apex library types (System, UserInfo, etc.) may not work as the standard library isn't fully loaded in the test environment.

## Contributing

When adding new tests:

1. Use existing test utilities and patterns
2. Focus on user-facing functionality
3. Ensure tests are reliable across environments
4. Include proper error handling and logging
5. Follow TypeScript best practices
6. Never use `waitForTimeout` - always wait for specific elements

The test suite is designed to grow with the extension while maintaining reliability and performance.
