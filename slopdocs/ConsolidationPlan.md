# Apex Language Support Package Consolidation Action Plan

## Overview

This action plan consolidates multiple language server packages to create a unified apex language server that runs in web workers for both web and local VSCode environments. The goal is to reduce from 6 packages to 3 packages while eliminating Node.js API dependencies and creating a single codebase that works consistently across all platforms.

## Package Structure (Successfully Consolidated)

- `apex-ls` (Unified web worker-based language server that works in both browser and Node.js environments)
- `apex-lsp-vscode-extension` (Unified VSCode extension that works in both desktop and web environments)

The following packages have been successfully consolidated:

- ✅ `apex-ls-node` → Merged into `apex-ls`
- ✅ `apex-ls-browser` → Enhanced and renamed to `apex-ls`
- ✅ `apex-lsp-vscode-extension-web` → Merged into `apex-lsp-vscode-extension`
- ✅ `apex-lsp-browser-client` → Functionality merged into `apex-ls`

## User Stories

### Phase 0: Web Worker Foundation

**Story 0.1: Create web worker language server architecture**
As a developer, I want to enhance the existing apex-ls-browser package with a web worker-based language server architecture that can run in both browser and Node.js environments, so that we have a unified foundation that doesn't depend on Node.js-specific APIs and can replace both apex-ls-node and apex-ls-browser.

**Story 0.2: Implement platform-agnostic message handling**
As a developer, I want to create a communication layer that works consistently between the main thread and web worker regardless of the runtime environment, so that LSP messages are properly relayed in both web and local VSCode using a single implementation.

**Story 0.3: Create unified storage interface**
As a developer, I want to implement a storage abstraction that works in both browser (IndexedDB) and Node.js (memory) environments, so that the language server can operate without filesystem dependencies and consolidate storage logic from multiple packages.

### Phase 1: Remove Node.js Dependencies

**Story 1.1: Eliminate Node.js API usage from language server core**
As a developer, I want to remove all Node.js-specific APIs (fs, path, etc.) from the language server implementation, so that it can run purely in web workers without Node.js runtime requirements and consolidate functionality from apex-ls-node.

**Story 1.2: Replace Node.js logging with web-compatible logging**
As a developer, I want to implement a logging system that works in both browser and Node.js environments, so that the language server can provide consistent logging regardless of the runtime and eliminate platform-specific logging packages.

**Story 1.3: Remove filesystem-based caching and storage**
As a developer, I want to eliminate all filesystem-based caching and storage mechanisms, so that the language server relies only on in-memory or browser storage solutions and consolidates storage logic from multiple packages.

### Phase 2: Create Unified Language Server

**Story 2.1: Rename apex-ls-browser to apex-ls and consolidate apex-ls-node functionality**
As a developer, I want to rename the enhanced apex-ls-browser package to `apex-ls` and merge the functionality from apex-ls-node into it, so that there's one unified implementation that works in web workers and reduces the package count from 6 to 5.

**Story 2.2: Implement web worker launcher for all environments**
As a developer, I want to create a web worker launcher that can be used by both web and local VSCode extensions, so that both environments use the same language server architecture and eliminate the need for separate browser client packages.

**Story 2.3: Create unified extension client**
As a developer, I want to implement a single extension client that communicates with the web worker language server, so that both web and local VSCode extensions use identical code paths and can be consolidated into one package.

### Phase 3: Consolidate VSCode Extensions

**Story 3.1: Update main VSCode extension to use web workers**
As a developer, I want to modify the main VSCode extension to launch the language server in a web worker instead of directly importing it, so that it uses the same architecture as the web extension and enables consolidation.

**Story 3.2: Merge web extension functionality into main extension**
As a developer, I want to incorporate all web-specific capabilities from apex-lsp-vscode-extension-web into the main extension, so that there's a single extension that works in both environments and reduces the package count from 5 to 4.

**Story 3.3: Implement unified extension activation**
As a developer, I want to create a single activation mechanism that works for both desktop and web VSCode, so that the extension behaves identically regardless of the platform and eliminates the need for separate web extension logic.

### Phase 4: Clean Up and Optimize

**Story 4.1: Remove obsolete packages**
As a developer, I want to delete apex-ls-node, apex-lsp-browser-client, apex-lsp-vscode-extension-web packages, and remove the placeholder apex-ls package, so that there are no duplicate implementations and the package count is reduced from 4 to 3.

**Story 4.2: Update build system and dependencies**
As a developer, I want to update all package.json files and turbo configuration to reflect the new unified structure, so that the build system works correctly with the consolidated packages and dependencies are simplified.

**Story 4.3: Optimize web worker performance**
As a developer, I want to optimize the web worker implementation for performance and memory usage, so that the language server runs efficiently in both environments and the consolidated solution performs as well as or better than the original separate packages.

## Final Package Structure (3 packages)

After completion, the packages will be:

- `apex-ls` (unified web worker-based language server - consolidates apex-ls-node, apex-ls-browser, and apex-lsp-browser-client)
- `apex-lsp-vscode-extension` (unified VSCode extension using web workers - consolidates apex-lsp-vscode-extension and apex-lsp-vscode-extension-web)
- All other existing packages remain unchanged

## Package Consolidation Summary

**Packages to be removed:**

- `apex-ls-node` → functionality merged into enhanced `apex-ls-browser` (renamed to `apex-ls`)
- `apex-ls-browser` → enhanced and renamed to `apex-ls`
- `apex-lsp-vscode-extension-web` → functionality merged into `apex-lsp-vscode-extension`
- `apex-lsp-browser-client` → functionality merged into enhanced `apex-ls-browser` (renamed to `apex-ls`)
- `apex-ls` (placeholder) → removed

**Net result:** 6 packages → 3 packages (50% reduction)

## Dependencies and Order

- Phase 0 must complete before Phase 1 (web worker foundation enables Node.js removal)
- Phase 1 must complete before Phase 2 (Node.js removal enables unified server creation)
- Phase 2 must complete before Phase 3 (unified server needed for extension updates)
- Phase 3 must complete before Phase 4 (extensions must be updated before cleanup)
- Phase 4 should be done atomically to avoid build system issues

## Success Criteria

- Package count reduced from 6 to 3 (50% consolidation)
- Language server runs in web workers for both web and local VSCode
- No Node.js API dependencies in the language server core
- Single codebase for both web and local environments
- Extension works identically in desktop VSCode and vscode.dev
- All tests pass and functionality is preserved
- Turbo build system works correctly with new structure
- Performance is maintained or improved in both environments
- No duplicate functionality across packages
