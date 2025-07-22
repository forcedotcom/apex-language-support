# LSP Implementation Status

This document tracks the implementation status of Language Server Protocol (LSP) requests and notifications for the Apex Language Server.

## Overview

The Apex Language Server implements a subset of LSP features based on the capabilities defined in our platform-agnostic capabilities system. This document tracks which LSP requests and notifications are implemented, planned, or not supported.

## Implementation Status Legend

- ✅ **Implemented**: Fully implemented and tested
- 🔄 **In Progress**: Currently being implemented
- 📋 **Planned**: Planned for implementation
- 🚫 **Stub Required**: Stub implementation exists for runtime compatibility (not supported)
- ❌ **Not Supported**: Not planned for implementation

## Implementation Priority

Based on the implementation priorities:

- **Priority 0**: Core lifecycle (initialize, shutdown, exit)
- **Priority 1**: Document synchronization (didOpen, didChange, didClose, didSave)
- **Priority 2**: Document analysis (documentSymbol, foldingRange)
- **Priority 99**: Advanced features (completion, hover, definition, references, etc.)

## Released Features

| LSP Request/Notification              | Direction       | Category                 | Notes                                     |
| ------------------------------------- | --------------- | ------------------------ | ----------------------------------------- |
| `initialize`                          | Client → Server | Lifecycle                | Returns capabilities based on server mode |
| `initialized`                         | Client → Server | Lifecycle                | Handles post-initialization setup         |
| `shutdown`                            | Client → Server | Lifecycle                | Graceful shutdown handling                |
| `exit`                                | Client → Server | Lifecycle                | Immediate exit handling                   |
| `$/cancelRequest`                     | Bidirectional   | Lifecycle                | Request cancellation support              |
| `textDocument/didOpen`                | Client → Server | Document Synchronization | Document open handling                    |
| `textDocument/didChange`              | Client → Server | Document Synchronization | Document change handling                  |
| `textDocument/didClose`               | Client → Server | Document Synchronization | Document close handling                   |
| `textDocument/didSave`                | Client → Server | Document Synchronization | Document save handling                    |
| `textDocument/documentSymbol`         | Client → Server | Document Analysis        | Document symbols                          |
| `textDocument/publishDiagnostics`     | Server → Client | Diagnostics              | Diagnostic publishing                     |
| `textDocument/completion`             | Client → Server | Completion               | Completion provider                       |
| `workspace/configuration`             | Client → Server | Configuration            | Configuration support                     |
| `workspace/didChangeConfiguration`    | Client → Server | Configuration            | Configuration change handling             |
| `workspace/didChangeWorkspaceFolders` | Client → Server | Configuration            | Workspace folder changes                  |
| `window/showMessage`                  | Server → Client | Window                   | Show message                              |

## Lifecycle Messages

| LSP Request/Notification | Direction       | Status         | Released    | Notes                                     |
| ------------------------ | --------------- | -------------- | ----------- | ----------------------------------------- |
| `initialize`             | Client → Server | ✅ Implemented | ✅ Released | Returns capabilities based on server mode |
| `initialized`            | Client → Server | ✅ Implemented | ✅ Released | Handles post-initialization setup         |
| `shutdown`               | Client → Server | ✅ Implemented | ✅ Released | Graceful shutdown handling                |
| `exit`                   | Client → Server | ✅ Implemented | ✅ Released | Immediate exit handling                   |
| `$/cancelRequest`        | Bidirectional   | ✅ Implemented | ✅ Released | Request cancellation support              |

## Document Synchronization

| LSP Request/Notification         | Direction       | Status           | Released    | Notes                     |
| -------------------------------- | --------------- | ---------------- | ----------- | ------------------------- |
| `textDocument/didOpen`           | Client → Server | ✅ Implemented   | ✅ Released | Document open handling    |
| `textDocument/didChange`         | Client → Server | ✅ Implemented   | ✅ Released | Document change handling  |
| `textDocument/didClose`          | Client → Server | ✅ Implemented   | ✅ Released | Document close handling   |
| `textDocument/didSave`           | Client → Server | ✅ Implemented   | ✅ Released | Document save handling    |
| `textDocument/willSave`          | Client → Server | ❌ Not Supported | -           | Save notification support |
| `textDocument/willSaveWaitUntil` | Client → Server | ❌ Not Supported | -           | Pre-save editing support  |

## Language Features

### Document Analysis

| LSP Request/Notification      | Direction       | Status         | Released    | Notes            |
| ----------------------------- | --------------- | -------------- | ----------- | ---------------- |
| `textDocument/documentSymbol` | Client → Server | ✅ Implemented | ✅ Released | Document symbols |
| `textDocument/foldingRange`   | Client → Server | ✅ Implemented | -           | Folding ranges   |

### Diagnostics

| LSP Request/Notification          | Direction       | Status           | Released | Notes                 |
| --------------------------------- | --------------- | ---------------- | -------- | --------------------- |
| `textDocument/diagnostic`         | Client → Server | ✅ Implemented   | -        | Pull diagnostics      |
| `workspace/diagnostic`            | Client → Server | 🚫 Stub Required | -        | Pull diagnostics      |
| `textDocument/publishDiagnostics` | Server → Client | ✅ Implemented   | -        | Diagnostic publishing |

### Completion and Hover

| LSP Request/Notification     | Direction       | Status           | Released | Notes                      |
| ---------------------------- | --------------- | ---------------- | -------- | -------------------------- |
| `textDocument/completion`    | Client → Server | 📋 Planned       | -        | Completion provider        |
| `completionItem/resolve`     | Client → Server | 📋 Planned       | -        | Completion item resolution |
| `textDocument/hover`         | Client → Server | 📋 Planned       | -        | Hover provider             |
| `textDocument/signatureHelp` | Client → Server | ❌ Not Supported | -        | Signature help             |

### Navigation

| LSP Request/Notification         | Direction       | Status           | Released | Notes                 |
| -------------------------------- | --------------- | ---------------- | -------- | --------------------- |
| `textDocument/declaration`       | Client → Server | ❌ Not Supported | -        | Go to declaration     |
| `textDocument/definition`        | Client → Server | 📋 Planned       | -        | Go to definition      |
| `textDocument/typeDefinition`    | Client → Server | ❌ Not Supported | -        | Go to type definition |
| `textDocument/implementation`    | Client → Server | ❌ Not Supported | -        | Go to implementation  |
| `textDocument/references`        | Client → Server | 📋 Planned       | -        | Find references       |
| `textDocument/documentHighlight` | Client → Server | ❌ Not Supported | -        | Document highlighting |

### Code Actions and Refactoring

| LSP Request/Notification     | Direction       | Status           | Released | Notes                |
| ---------------------------- | --------------- | ---------------- | -------- | -------------------- |
| `textDocument/codeAction`    | Client → Server | 📋 Planned       | -        | Code actions         |
| `textDocument/codeLens`      | Client → Server | ❌ Not Supported | -        | Code lens support    |
| `codeLens/resolve`           | Client → Server | ❌ Not Supported | -        | Code lens resolution |
| `textDocument/rename`        | Client → Server | 📋 Planned       | -        | Symbol renaming      |
| `textDocument/prepareRename` | Client → Server | ❌ Not Supported | -        | Prepare rename       |

### Document Links and Colors

| LSP Request/Notification         | Direction       | Status           | Released | Notes                    |
| -------------------------------- | --------------- | ---------------- | -------- | ------------------------ |
| `textDocument/documentLink`      | Client → Server | ❌ Not Supported | -        | Document links           |
| `documentLink/resolve`           | Client → Server | ❌ Not Supported | -        | Document link resolution |
| `textDocument/documentColor`     | Client → Server | ❌ Not Supported | -        | Document colors          |
| `textDocument/colorPresentation` | Client → Server | ❌ Not Supported | -        | Color presentations      |

### Formatting

| LSP Request/Notification        | Direction       | Status           | Released | Notes               |
| ------------------------------- | --------------- | ---------------- | -------- | ------------------- |
| `textDocument/formatting`       | Client → Server | ❌ Not Supported | -        | Document formatting |
| `textDocument/rangeFormatting`  | Client → Server | ❌ Not Supported | -        | Range formatting    |
| `textDocument/onTypeFormatting` | Client → Server | ❌ Not Supported | -        | On-type formatting  |

### Advanced Features

| LSP Request/Notification                 | Direction       | Status           | Released | Notes                       |
| ---------------------------------------- | --------------- | ---------------- | -------- | --------------------------- |
| `textDocument/selectionRange`            | Client → Server | ❌ Not Supported | -        | Selection ranges            |
| `textDocument/semanticTokens/full`       | Client → Server | ❌ Not Supported | -        | Full semantic tokens        |
| `textDocument/semanticTokens/full/delta` | Client → Server | ❌ Not Supported | -        | Delta semantic tokens       |
| `textDocument/semanticTokens/range`      | Client → Server | ❌ Not Supported | -        | Range semantic tokens       |
| `textDocument/linkedEditingRange`        | Client → Server | ❌ Not Supported | -        | Linked editing              |
| `textDocument/typeHierarchy`             | Client → Server | ❌ Not Supported | -        | Type hierarchy              |
| `textDocument/resolveCompletionItem`     | Client → Server | ❌ Not Supported | -        | Resolve completion item     |
| `textDocument/resolveTypeHierarchyItem`  | Client → Server | ❌ Not Supported | -        | Resolve type hierarchy item |
| `textDocument/prepareCallHierarchy`      | Client → Server | ❌ Not Supported | -        | Prepare call hierarchy      |

## Workspace Features

### Workspace Symbols and Commands

| LSP Request/Notification   | Direction       | Status           | Released | Notes                |
| -------------------------- | --------------- | ---------------- | -------- | -------------------- |
| `workspace/symbol`         | Client → Server | ❌ Not Supported | -        | Workspace symbols    |
| `workspace/executeCommand` | Client → Server | ❌ Not Supported | -        | Command execution    |
| `workspace/applyEdit`      | Client → Server | ❌ Not Supported | -        | Apply workspace edit |

### Configuration and Workspace Management

| LSP Request/Notification              | Direction       | Status           | Released    | Notes                         |
| ------------------------------------- | --------------- | ---------------- | ----------- | ----------------------------- |
| `workspace/configuration`             | Client → Server | ✅ Implemented   | ✅ Released | Configuration support         |
| `workspace/didChangeConfiguration`    | Client → Server | ✅ Implemented   | ✅ Released | Configuration change handling |
| `workspace/didChangeWorkspaceFolders` | Client → Server | ✅ Implemented   | ✅ Released | Workspace folder changes      |
| `workspace/didChangeWatchedFiles`     | Client → Server | ❌ Not Supported | -           | File change notifications     |

### File Operations

| LSP Request/Notification    | Direction       | Status           | Released | Notes             |
| --------------------------- | --------------- | ---------------- | -------- | ----------------- |
| `workspace/willCreateFiles` | Client → Server | ❌ Not Supported | -        | Will create files |
| `workspace/didCreateFiles`  | Client → Server | ❌ Not Supported | -        | Did create files  |
| `workspace/willRenameFiles` | Client → Server | ❌ Not Supported | -        | Will rename files |
| `workspace/didRenameFiles`  | Client → Server | ❌ Not Supported | -        | Did rename files  |
| `workspace/willDeleteFiles` | Client → Server | ❌ Not Supported | -        | Will delete files |
| `workspace/didDeleteFiles`  | Client → Server | ❌ Not Supported | -        | Did delete files  |

## Window Features

| LSP Request/Notification         | Direction       | Status           | Released | Notes                     |
| -------------------------------- | --------------- | ---------------- | -------- | ------------------------- |
| `window/showMessage`             | Server → Client | 📋 Planned       | -        | Show message              |
| `window/showMessageRequest`      | Server → Client | ❌ Not Supported | -        | Show message request      |
| `window/logMessage`              | Server → Client | 📋 Planned       | -        | Log message               |
| `window/workDoneProgress/create` | Client → Server | 📋 Planned       | -        | Create work done progress |
| `window/workDoneProgress/cancel` | Client → Server | ❌ Not Supported | -        | Cancel work done progress |
| `telemetry/event`                | Server → Client | 📋 Planned       | -        | Telemetry events          |

## Progress Support

| LSP Request/Notification | Direction     | Status           | Released | Notes              |
| ------------------------ | ------------- | ---------------- | -------- | ------------------ |
| `$/progress`             | Bidirectional | ❌ Not Supported | -        | Progress reporting |

## Implementation Summary

### ✅ Implemented (9 features)

- Core lifecycle: initialize, initialized, shutdown, exit, cancelRequest
- Document sync: didOpen, didChange, didClose, didSave
- Document analysis: documentSymbol, foldingRange
- Diagnostics: publishDiagnostics
- Completion: completion provider
- Configuration: workspace configuration and change handling
- Workspace folders: change notifications
- Window: showMessage

### 📋 Planned (8 features)

- textDocument/diagnostic (Pull diagnostics)
- textDocument/hover (Hover provider)
- textDocument/definition (Go to definition)
- textDocument/references (Find references)
- textDocument/codeAction (Code actions)
- textDocument/rename (Symbol renaming)
- window/logMessage (Log message)
- window/workDoneProgress/create (Create progress)
- telemetry/event (Telemetry events)

### 🔄 In Progress (1 feature)

- completionItem/resolve (Completion item resolution)

### 🚫 Stub Required (1 feature)

- workspace/diagnostic (Pull diagnostics - stub for runtime compatibility)

### ❌ Not Supported (All other LSP features)

- Advanced navigation (declaration, typeDefinition, implementation)
- Code quality (codeLens, documentHighlight, formatting)
- Advanced features (semantic tokens, call hierarchy, type hierarchy)
- File operations (create, rename, delete files)
- Advanced workspace features (symbols, commands, file watching)

## Notes

- **Platform Agnostic**: All implementations work across Node.js and browser environments
- **Mode-Based**: Features are enabled/disabled based on server mode (Production/Development/Test)
- **LSP Compliance**: Uses official LSP types from `vscode-languageserver-protocol`
- **Inheritance**: Capabilities use inheritance structure (Test → Development → Production)

## Contributing

When implementing new LSP features:

1. **Update this document** with the implementation status
2. **Add to capabilities** if the feature should be mode-dependent
3. **Write tests** for the new feature
4. **Update documentation** with usage examples
5. **Follow LSP specification** for proper implementation
