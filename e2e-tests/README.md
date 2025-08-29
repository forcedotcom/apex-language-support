# E2E Tests for Apex Language Server Extension

This directory contains end-to-end tests for the Apex Language Server VSCode extension running in a web environment. The tests use Playwright to automate browser interactions with VSCode Web and verify that the extension works correctly.

## Overview

The e2e test suite verifies:
- Extension startup and activation
- Bundle integrity and loading
- Basic language features (syntax highlighting, file recognition)
- Stability during file operations
- Web worker functionality

## Prerequisites

1. Node.js >= 20.0.0
2. npm packages installed (`npm install` from root)
3. Extension built (`npm run compile && npm run bundle` in `packages/apex-lsp-vscode-extension`)

## Test Structure

```
e2e-tests/
├── tests/                     # Test files
│   ├── extension-startup.spec.ts
│   └── language-features.spec.ts
├── playwright.config.ts       # Playwright configuration
├── global-setup.ts           # Global test setup
├── global-teardown.ts        # Global test cleanup
├── test-server.js            # VS Code Web test server
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

## Running Tests

### Quick Start
```bash
# Run all e2e tests (headless)
npm run test:e2e

# Run tests with browser visible
npm run test:e2e:headed

# Open Playwright UI for interactive testing
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug
```

### Manual Testing
```bash
# Start the test server manually (for development)
npm run test:web:server

# In another terminal, run specific tests
cd e2e-tests
npx playwright test extension-startup.spec.ts
```

## Configuration

### Playwright Config (`playwright.config.ts`)
- **Test Directory**: `./tests`
- **Base URL**: `http://localhost:3000` (VS Code Web server)
- **Browsers**: Chromium, Firefox, WebKit
- **Timeouts**: 60s per test, 30s for selectors
- **Server**: Auto-starts VS Code Web server on port 3000

### Test Server (`test-server.js`)
Starts a VS Code Web instance with:
- Extension loaded from `../packages/apex-lsp-vscode-extension`
- Test workspace with sample Apex files
- Debug options enabled
- Fixed port (3000) for Playwright

## Test Files

### `extension-startup.spec.ts`
Tests basic extension loading and startup:
- VS Code Web loads successfully
- Test workspace files are visible
- Extension appears in extensions list
- Extension activates when opening Apex files
- Output channels are available
- No critical console errors
- Web worker loads correctly

### `language-features.spec.ts`
Tests language-specific functionality:
- Syntax highlighting works
- File types are recognized correctly
- SOQL files are handled properly
- Trigger files are handled properly
- Basic editing operations work
- Multiple file operations are stable
- Extension remains stable during file operations

## Test Data

The global setup creates a test workspace with sample files:

- **`HelloWorld.cls`**: Basic Apex class with methods
- **`AccountTrigger.trigger`**: Sample trigger with validation logic
- **`query.soql`**: Sample SOQL query

## Debugging

### Console Errors
Tests monitor browser console for errors. Non-critical errors (favicon, sourcemaps) are filtered out.

### Network Issues
Tests check for worker file loading failures and report network issues.

### Screenshots and Videos
- Screenshots taken on test failures
- Videos recorded on retry
- Traces captured for failed tests

### Manual Debugging
1. Start server: `npm run test:web:server`
2. Open browser to `http://localhost:3000`
3. Open Developer Tools
4. Monitor console and network tabs
5. Interact with the extension manually

## CI/CD Integration

The tests are configured for CI environments:
- Retries: 2 attempts on CI
- Workers: 1 (sequential execution on CI)
- Reporting: HTML report generated
- Headless: Default on CI

## Troubleshooting

### Extension Won't Activate
1. Verify extension is built: `npm run bundle` in extension directory
2. Check `dist/` directory exists with bundled files
3. Look for console errors in browser DevTools

### Tests Timeout
1. Increase timeout in `playwright.config.ts`
2. Check if VS Code Web server is responding
3. Verify network connectivity

### Worker Loading Errors
1. Check worker files exist in `dist/` directory
2. Verify file URLs are accessible
3. Look for CORS or security policy issues

### Port Conflicts
- Change port in both `playwright.config.ts` and `test-server.js`
- Ensure port is not in use by other services

## Contributing

When adding new tests:
1. Follow existing test patterns
2. Use appropriate timeouts and waits
3. Add proper error handling
4. Document any new test scenarios
5. Update this README if needed

## Known Limitations

- Some VS Code Web features may not work identically to desktop
- Worker loading paths may differ between environments
- Extension debugging capabilities are limited in web context
- Some file operations may not work in browser environment