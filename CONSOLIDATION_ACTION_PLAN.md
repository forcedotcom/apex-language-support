# Apex Language Support Package Consolidation Action Plan

## Overview

This action plan consolidates multiple language server packages to simplify the architecture while maintaining web and VSCode compatibility. The goal is to reduce from 6 packages to 3 packages without disrupting turbo until completion.

## User Stories

### Phase 1: Remove Filesystem Dependencies

**Story 1.1: Remove filesystem references from apex-ls-node storage**
As a developer, I want to remove the `NodeFileSystemApexStorage` class and all filesystem imports from the apex-ls-node package, so that the node implementation doesn't depend on file system caching.

**Story 1.2: Remove filesystem caching from shared services**
As a developer, I want to remove any filesystem-based caching logic from the lsp-compliant-services package, so that shared services are platform-agnostic and don't require persistent storage.

### Phase 2: Consolidate Language Server Packages

**Story 2.1: Create new unified language server package**
As a developer, I want to create a new `apex-ls` package that combines the functionality of both `apex-ls-node` and `apex-ls-browser`, so that there's a single language server implementation.

**Story 2.2: Implement platform detection in unified server**
As a developer, I want the unified language server to automatically detect whether it's running in a browser or Node.js environment, so that it can use the appropriate message readers/writers and logging factories.

**Story 2.3: Update apex-lsp-vscode-extension to use web workers**
As a developer, I want to update the VSCode extension to spawn the unified language server in a web worker instead of directly importing apex-ls-node, so that it's compatible with both local and web environments.

### Phase 3: Consolidate VSCode Extensions

**Story 3.1: Merge web extension capabilities into main extension**
As a developer, I want to move all web-specific functionality from apex-lsp-vscode-extension-web into apex-lsp-vscode-extension, so that there's a single extension that works in both desktop and web VSCode.

**Story 3.2: Add web compatibility to main extension**
As a developer, I want to ensure the main VSCode extension can detect and adapt to web environments (vscode.dev), so that it provides the same language features regardless of the VSCode platform.

**Story 3.3: Update extension package.json for web support**
As a developer, I want to add the necessary package.json configurations for web extension support (browser entry point, web extension capabilities), so that the extension is recognized as web-compatible by VSCode.

### Phase 4: Clean Up Obsolete Packages

**Story 4.1: Remove apex-ls-browser package**
As a developer, I want to delete the apex-ls-browser package entirely, so that there are no duplicate browser implementations after consolidation is complete.

**Story 4.2: Remove apex-lsp-browser-client package**
As a developer, I want to delete the apex-lsp-browser-client package, so that there are no unused browser client implementations.

**Story 4.3: Remove apex-lsp-vscode-extension-web package**
As a developer, I want to delete the apex-lsp-vscode-extension-web package after merging its functionality, so that there's no duplicate web extension.

**Story 4.4: Update turbo configuration and dependencies**
As a developer, I want to update all package.json files and turbo configuration to remove references to deleted packages, so that the build system works correctly with the new structure.

## Final Package Structure

After completion, the packages will be:

- `apex-ls` (unified language server)
- `apex-lsp-vscode-extension` (unified VSCode extension with web support)
- All other existing packages remain unchanged

## Dependencies and Order

- Phase 1 must complete before Phase 2 (filesystem removal enables consolidation)
- Phase 2 must complete before Phase 3 (unified server needed for extension updates)
- Phase 3 must complete before Phase 4 (functionality must be merged before deletion)
- Phase 4 should be done atomically to avoid build system issues

## Success Criteria

- Extension works identically in desktop VSCode and vscode.dev
- No filesystem dependencies in shared code
- Single language server package supports both environments
- All tests pass and functionality is preserved
- Turbo build system works correctly with new structure
