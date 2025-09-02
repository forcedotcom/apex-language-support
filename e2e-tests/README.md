# E2E Tests for Apex Language Server Extension

This directory contains end-to-end tests for the Apex Language Server VSCode extension running in a web environment. The tests use Playwright to automate browser interactions with VSCode Web and verify that the extension works correctly.

## 📁 Project Structure

```
e2e-tests/
├── fixtures/                   # Test data and sample files
│   └── apex-samples.ts         # Sample Apex files for testing
├── tests/                      # Test files
│   └── apex-extension-core.spec.ts  # Core functionality tests
├── types/                      # TypeScript type definitions
│   └── test.types.ts          # Test-related interfaces
├── utils/                      # Utility functions and helpers
│   ├── constants.ts           # Test constants and selectors
│   ├── test-helpers.ts        # Core test helper functions
│   ├── outline-helpers.ts     # Outline view specific helpers
│   └── global.ts              # Global setup and teardown functions
├── test-server.js             # VS Code Web test server
├── playwright.config.ts       # Playwright configuration
├── tsconfig.json              # TypeScript configuration
└── README.md                  # This file
```

## Overview

The e2e test suite verifies core extension functionality in VS Code Web:

- **VS Code Web startup** - Verifies the web environment loads correctly
- **Extension activation** - Confirms the extension activates when opening Apex files
- **LSP worker loading** - Ensures the language server starts without critical errors
- **File recognition** - Validates Apex files are detected in the workspace
- **Outline view** - Tests symbol parsing and outline generation
- **Stability** - Checks that VS Code remains responsive after extension activation

## Prerequisites

1. Node.js >= 20.0.0
2. npm packages installed (`npm install` from root)
3. Extension built (`npm run compile && npm run bundle` in `packages/apex-lsp-vscode-extension`)

## Running Tests

### Quick Start

```bash
# Run all e2e tests (recommended - headless, parallel, fast)
npm run test:e2e

# Run tests in debug mode with Playwright inspector and headed browser
npm run test:e2e:debug

# Run tests visually (headed browser, slower execution for watching)
npm run test:e2e:visual
```

### Current Test Status

✅ **Core Tests (`apex-extension-core.spec.ts`):**

**Test 1: Core Extension Functionality**

- VS Code Web startup and loading
- Apex file recognition in workspace (2+ files)
- Extension activation when opening .cls files
- Monaco editor integration
- Language server worker initialization
- Critical error monitoring
- Extension stability verification

**Test 2: Outline View Integration**

- Opens Apex (.cls) file in editor
- Verifies outline view loads and is accessible
- Confirms LSP parses file and generates outline structure
- Validates specific Apex symbols (HelloWorld class, sayHello/add methods) appear
- Ensures outline view functionality works correctly

**Test 3: Complex Symbol Hierarchy**

- Opens ComplexExample.cls with advanced structure
- Tests parsing of static fields, instance fields, methods, and inner classes
- Validates proper symbol nesting and hierarchy display
- Comprehensive LSP symbol recognition testing

**Browser Support:** Chromium (primary)

### Manual Testing

```bash
# Start the test server manually (for development)
npm run test:web:server

# In another terminal, run specific tests
cd e2e-tests
npx playwright test apex-extension-core.spec.ts
```

## Configuration

### Environment Configuration

- **Development**: Fast retries, parallel execution
- **CI/CD**: Conservative settings, sequential execution
- **Browser**: Chromium with debugging features enabled
- **Timeouts**: Environment-specific values

### Test Server (`test-server.js`)

Starts a VS Code Web instance with:

- Extension loaded from `../packages/apex-lsp-vscode-extension`
- Test workspace with sample Apex files
- Debug options enabled
- Fixed port (3000) for Playwright

## Test Architecture

### Core Components

#### **Utilities (`utils/`)**

- `test-helpers.ts` - Core test functions (startup, activation, monitoring)
- `outline-helpers.ts` - Outline view specific functionality  
- `constants.ts` - Centralized configuration and selectors
- `global.ts` - Combined setup/teardown logic (extension building, workspace creation)

#### **Types (`types/`)**

- Strong TypeScript typing for all test interfaces
- Console error tracking types
- Test metrics and environment configurations
- Sample file definitions

#### **Fixtures (`fixtures/`)**

- Sample Apex classes, triggers, and SOQL queries
- Follows Apex language rules (no imports, namespace resolution)
- Comprehensive examples for testing parsing and outline generation

#### **Configuration**

- Global setup/teardown combined in `utils/global.ts` - builds extension and creates test workspace  
- Main Playwright configuration in `playwright.config.ts` with environment detection
- Test server (`test-server.js`) - VS Code Web instance with pre-loaded extension

### Design Principles

Following `.cursor` TypeScript guidelines:

- ✅ Strong typing with `readonly` properties
- ✅ Arrow functions for consistency
- ✅ Descriptive naming conventions (camelCase, kebab-case)
- ✅ No enums (using string unions)
- ✅ Import type for type-only imports
- ✅ JSDoc documentation following Google Style Guide
- ✅ Error handling with proper filtering
- ✅ Constants for magic numbers
- ✅ Modular, maintainable code structure

## Test Data

The global setup creates a test workspace with sample files from `fixtures/apex-samples.ts`:

- **`HelloWorld.cls`**: Basic Apex class with static methods (sayHello, add)
- **`ComplexExample.cls`**: Advanced class with fields, methods, and inner Configuration class  
- **`AccountTrigger.trigger`**: Sample trigger with validation logic

## Debugging

### Console Errors

Tests monitor browser console for errors. Non-critical errors (favicon, sourcemaps) are filtered out using centralized patterns.

### Network Issues

Tests check for worker file loading failures and report network issues with detailed logging.

### Screenshots and Videos

- Screenshots taken on test failures
- Videos recorded on retry
- Traces captured for failed tests
- Debug screenshots in `test-results/` directory

### Manual Debugging

1. Start server: `npm run test:web:server`
2. Open browser to `http://localhost:3000`
3. Open Developer Tools
4. Monitor console and network tabs
5. Interact with the extension manually

## CI/CD Integration

The tests are configured for CI environments:

- **Retries**: 2 attempts on CI
- **Workers**: 1 (sequential execution on CI)
- **Reporting**: HTML report generated
- **Headless**: Default on CI
- **Timeout**: Extended for CI stability

## Troubleshooting

### Extension Won't Activate

1. Verify extension is built: `npm run bundle` in extension directory
2. Check `dist/` directory exists with bundled files
3. Look for console errors in browser DevTools

### Tests Timeout

1. Check timeout configuration in `playwright.config.ts`
2. Verify VS Code Web server is responding
3. Ensure network connectivity

### Worker Loading Errors

1. Check worker files exist in `dist/` directory
2. Verify file URLs are accessible
3. Look for CORS or security policy issues

### Port Conflicts

- Change port in `playwright.config.ts`
- Ensure port is not in use by other services

## Contributing

When adding new tests:

1. Follow existing patterns using utilities from `utils/`
2. Add proper TypeScript types
3. Use centralized constants and selectors
4. Add JSDoc documentation
5. Update this README if needed
6. Follow `.cursor` TypeScript guidelines

## Scripts Summary

- **`test:e2e`**: Main test runner (headless, parallel)
- **`test:e2e:debug`**: Interactive debugging with Playwright inspector
- **`test:e2e:visual`**: Headed browser with slower execution for watching tests
- **`test:web:server`**: Start VS Code Web server manually for debugging

## Known Limitations

- VS Code Web has some differences from desktop VS Code
- Extension debugging capabilities are limited in web context  
- Network-dependent features may be unreliable in test environments
