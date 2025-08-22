# LSP Compliant Services Integration Plan

## Overview

Replace the basic example LSP handlers in the `apex-ls` worker with proper Apex language services from the existing `lsp-compliant-services` package to provide full production-ready Apex language server functionality.

## Current State Analysis

- **Worker Implementation**: `packages/apex-ls/src/worker.ts` currently uses basic example LSP handlers:
  - Regex-based document symbols (classes/methods/properties)
  - Hardcoded completion items (TypeScript, JavaScript, Apex)
  - Uppercase word detection for diagnostics
- **Services Available**: The repository already contains complete, production-ready services:
  - `packages/lsp-compliant-services/` - Full Apex language services with ANTLR-based parsing
  - `packages/apex-parser-ast/` - ANTLR parser integration
  - `packages/apex-lsp-shared/` - Shared utilities
  - `packages/custom-services/` - Additional custom services
- **Dependencies**: `apex-ls` package.json already includes all necessary dependencies
- **Architecture**: Consolidated monorepo structure with proper browser/worker/node builds

## Goal

- Replace example handlers with production Apex language services
- Maintain web worker compatibility and performance
- Provide real Apex parsing, completion, diagnostics, and symbols
- Keep existing architecture and build system intact

---

## Implementation Steps

The existing `lsp-compliant-services` package provides production-ready services that need to be integrated into the worker. The repository structure shows that all dependencies are already in place.

### Step 1: Initialize Service Dependencies in Worker

**Objective**: Set up proper service initialization in the worker context

**Files to modify:**
- `packages/apex-ls/src/worker.ts`

**Tasks:**

1. **Import required services at the top of worker.ts:**
   ```typescript
   // Add these imports to worker.ts
   import { 
     dispatchProcessOnDocumentSymbol,
     dispatchProcessOnChangeDocument,
     ApexStorageManager 
   } from '@salesforce/apex-lsp-compliant-services';
   ```

2. **Initialize storage manager after connection creation:**
   ```typescript
   // After connection creation, add:
   const storageManager = ApexStorageManager.getInstance();
   
   // Ensure documents are stored when opened/changed
   documents.onDidOpen(async (event) => {
     await storageManager.addDocument(event.document);
   });
   
   documents.onDidChangeContent(async (event) => {
     await storageManager.updateDocument(event.document);
   });
   
   documents.onDidClose(async (event) => {
     await storageManager.removeDocument(event.document.uri);
   });
   ```

### Step 2: Replace Document Symbol Handler

**Objective**: Replace regex-based symbol detection with ANTLR-based parsing

**Files to modify:**
- `packages/apex-ls/src/worker.ts` (lines 293-393)

**Tasks:**

1. **Replace the entire `connection.onDocumentSymbol` handler:**
   ```typescript
   // Replace existing onDocumentSymbol handler with:
   connection.onDocumentSymbol(async (params) => {
     logger.info('📋 Document symbol request received');
     
     try {
       logger.time?.('Document Symbol Processing');
       
       // Use the compliant service for document symbols
       const result = await dispatchProcessOnDocumentSymbol(params);
       
       logger.timeEnd?.('Document Symbol Processing');
       logger.info(`✅ Found ${result?.length || 0} symbols using compliant services`);
       
       return result;
     } catch (error) {
       logger.error(`❌ Error in document symbol processing: ${error}`);
       
       // Fallback to basic implementation if service fails
       const document = documents.get(params.textDocument.uri);
       if (!document) {
         return [];
       }
       
       // Keep existing regex-based fallback for safety
       return await generateFallbackSymbols(document);
     }
   });
   ```

2. **Create fallback function for error cases:**
   ```typescript
   // Add this function to handle service failures gracefully
   async function generateFallbackSymbols(document: TextDocument): Promise<DocumentSymbol[]> {
     logger.warn('🔄 Using fallback symbol detection');
     // Keep the existing regex-based logic as fallback
     // [Move existing symbol detection code here]
   }
   ```

### Step 3: Replace Diagnostic Handler  

**Objective**: Replace uppercase word detection with real Apex syntax/semantic diagnostics

**Files to modify:**
- `packages/apex-ls/src/worker.ts` (lines 185-249)

**Tasks:**

1. **Replace `validateTextDocument` function:**
   ```typescript
   async function validateTextDocument(textDocument: TextDocument): Promise<void> {
     logger.debug(`🔍 Validating document: ${textDocument.uri}`);
     
     try {
       // Use compliant service for diagnostics
       const changeEvent = { document: textDocument, contentChanges: [] };
       const diagnostics = await dispatchProcessOnChangeDocument(changeEvent);
       
       if (diagnostics && diagnostics.length > 0) {
         logger.info(`📊 Found ${diagnostics.length} diagnostic issues`);
         connection.sendDiagnostics({ 
           uri: textDocument.uri, 
           diagnostics 
         });
       } else {
         // Clear any existing diagnostics
         connection.sendDiagnostics({ 
           uri: textDocument.uri, 
           diagnostics: [] 
         });
       }
     } catch (error) {
       logger.error(`❌ Error in diagnostic processing: ${error}`);
       
       // Fallback to basic diagnostics to maintain functionality
       await validateTextDocumentFallback(textDocument);
     }
   }
   
   // Keep existing validation as fallback
   async function validateTextDocumentFallback(textDocument: TextDocument): Promise<void> {
     logger.warn('🔄 Using fallback diagnostic validation');
     // [Move existing uppercase word detection here]
   }
   ```

### Step 4: Enhance Completion Handler

**Objective**: Replace hardcoded completion items with context-aware Apex completions

**Files to modify:**
- `packages/apex-ls/src/worker.ts` (lines 251-290)

**Tasks:**

1. **Import completion services:**
   ```typescript
   // Add to imports section
   import { 
     dispatchProcessOnCompletion  // If available
   } from '@salesforce/apex-lsp-compliant-services';
   ```

2. **Update completion handler (if service available):**
   ```typescript
   // Replace existing onCompletion handler
   connection.onCompletion(async (params: TextDocumentPositionParams): Promise<CompletionItem[]> => {
     logger.debug('💡 Completion request received');
     
     try {
       // Check if completion service is available
       if (typeof dispatchProcessOnCompletion === 'function') {
         const result = await dispatchProcessOnCompletion(params);
         logger.info(`✅ Generated ${result?.length || 0} completion items`);
         return result || [];
       }
     } catch (error) {
       logger.error(`❌ Error in completion processing: ${error}`);
     }
     
     // Enhanced fallback completions for Apex
     return getApexCompletionFallback(params);
   });
   
   function getApexCompletionFallback(params: TextDocumentPositionParams): CompletionItem[] {
     // Enhanced completion items with more Apex-specific suggestions
     return [
       {
         label: 'System.debug',
         kind: CompletionItemKind.Method,
         detail: 'System debugging method',
         documentation: 'Outputs a debug message to the debug log',
         data: 1,
       },
       {
         label: 'List<String>',
         kind: CompletionItemKind.Class,
         detail: 'List collection type',
         documentation: 'A generic list collection for String objects',
         data: 2,
       },
       {
         label: 'public class',
         kind: CompletionItemKind.Snippet,
         detail: 'Public class declaration',
         documentation: 'Creates a new public Apex class',
         data: 3,
       },
       // Keep existing items as additional options
       {
         label: 'Apex',
         kind: CompletionItemKind.Text,
         data: 4,
       },
     ];
   }
   ```

### Step 5: Error Handling and Configuration

**Objective**: Add proper error boundaries and configuration support

**Files to modify:**
- `packages/apex-ls/src/worker.ts`

**Tasks:**

1. **Add service configuration in `onDidChangeConfiguration`:**
   ```typescript
   connection.onDidChangeConfiguration((change) => {
     // Existing configuration handling...
     
     // Update log level from configuration
     const config = change.settings['apex-ls-ts'];
     if (config?.logLevel) {
       setLogLevel(config.logLevel);
     }
     
     // Configure compliant services if needed
     if (config?.services) {
       logger.info('🔧 Updating service configuration');
       // Apply service-specific settings
     }
     
     // Revalidate all open text documents
     documents.all().forEach(validateTextDocument);
   });
   ```

2. **Add graceful service initialization:**
   ```typescript
   // Add after connection creation
   let servicesInitialized = false;
   
   async function initializeServices(): Promise<void> {
     try {
       logger.info('🚀 Initializing compliant services...');
       
       // Initialize storage manager
       const storageManager = ApexStorageManager.getInstance();
       await storageManager.initialize();
       
       servicesInitialized = true;
       logger.info('✅ Services initialized successfully');
     } catch (error) {
       logger.error(`❌ Service initialization failed: ${error}`);
       logger.warn('🔄 Falling back to basic functionality');
       servicesInitialized = false;
     }
   }
   
   // Call during server initialization
   connection.onInitialized(async () => {
     logger.info('🎉 Server initialized');
     
     await initializeServices();
     
     // Existing initialization code...
   });
   ```

### Step 6: Testing and Validation

**Objective**: Ensure integration works correctly and provide verification steps

**Tasks:**

1. **Build and test the integration:**
   ```bash
   # Navigate to apex-ls package
   cd packages/apex-ls
   
   # Clean and rebuild
   npm run clean
   npm run build
   
   # Run tests to ensure no regressions
   npm run test
   npm run test:web
   ```

2. **Test in VS Code extension:**
   ```bash
   # Navigate to extension package  
   cd packages/apex-lsp-vscode-extension
   
   # Build the extension
   npm run build
   
   # Test the extension works with new worker
   # Open a .cls file and verify:
   # - Document symbols show proper Apex class structure
   # - Diagnostics show real syntax errors (not uppercase words)
   # - Completion provides Apex-specific suggestions
   ```

3. **Verification checklist:**
   - [ ] Document outline shows proper Apex classes, methods, and properties
   - [ ] Syntax errors are detected in Apex files  
   - [ ] Completion suggestions are contextual and Apex-specific
   - [ ] Error fallbacks work when services fail
   - [ ] No regressions in basic worker functionality
   - [ ] Memory usage remains reasonable for typical files

### Step 7: Performance Monitoring and Optimization

**Objective**: Ensure the integrated services perform well in web worker environment

**Tasks:**

1. **Add performance monitoring:**
   ```typescript
   // Add to worker.ts for monitoring service performance
   const performanceMetrics = {
     symbolRequests: 0,
     diagnosticRequests: 0,
     completionRequests: 0,
     averageSymbolTime: 0,
     averageDiagnosticTime: 0,
   };
   
   // Update metrics in each service call
   function updateMetrics(operation: string, duration: number) {
     performanceMetrics[`${operation}Requests`]++;
     performanceMetrics[`average${operation}Time`] = 
       (performanceMetrics[`average${operation}Time`] + duration) / 2;
     
     logger.info(`📊 ${operation} completed in ${duration}ms`);
   }
   ```

2. **Memory management best practices:**
   ```typescript
   // Add periodic cleanup for large files
   setInterval(() => {
     const memoryUsage = (performance as any).memory?.usedJSHeapSize;
     if (memoryUsage > 50 * 1024 * 1024) { // 50MB threshold
       logger.warn('🧹 High memory usage detected, triggering cleanup');
       // Trigger garbage collection if available
       if (global.gc) {
         global.gc();
       }
     }
   }, 30000); // Check every 30 seconds
   ```

---

## Current Architecture Overview

### Actual Repository Structure:

```
apex-language-support/
├── packages/
│   ├── apex-ls/                    # Main language server package
│   │   ├── src/worker.ts          # Web worker implementation (TO MODIFY)
│   │   ├── src/browser.ts         # Browser entry point  
│   │   └── src/node.ts            # Node.js entry point
│   ├── lsp-compliant-services/     # Production Apex services (READY TO USE)
│   │   ├── src/documentSymbol/    # ANTLR-based symbol provider
│   │   ├── src/handlers/          # LSP protocol handlers
│   │   ├── src/services/          # Document processing services
│   │   └── src/storage/           # Document storage management
│   ├── apex-parser-ast/           # ANTLR parser integration
│   ├── apex-lsp-shared/           # Shared utilities and logging
│   └── custom-services/           # Additional custom services
```

### Current vs Target Implementation:

**Current (Example Implementation):**

```
worker.ts → Basic LSP Handlers → Regex parsing → LSP Responses
                ↓
         Simple symbol detection
         Uppercase word diagnostics  
         Hardcoded completions
```

**Target (Production Ready):**

```
worker.ts → LSP Handlers → Compliant Services → ANTLR Parser → LSP Responses
                ↓              ↓                    ↓
           Service calls   ApexStorageManager   Real Apex AST
                ↓              ↓                    ↓
           Error fallbacks  Document caching    Proper symbols
```

### Integration Pattern:

```typescript
// Current approach in worker.ts
connection.onDocumentSymbol((params) => {
  // Regex-based symbol extraction
  const symbols = extractSymbolsWithRegex(document);
  return symbols;
});

// Target approach (what needs to be implemented)
connection.onDocumentSymbol(async (params) => {
  try {
    // Use production services
    const result = await dispatchProcessOnDocumentSymbol(params);
    return result;
  } catch (error) {
    // Graceful fallback to existing logic
    return extractSymbolsWithRegex(document);
  }
});
```

---

## Risk Mitigation and Best Practices

### Implementation Risks:

1. **Service integration failures** - Services may not work as expected in web worker
2. **Performance regression** - ANTLR parsing may be slower than regex
3. **Memory usage increase** - AST parsing uses more memory than simple regex
4. **Build/bundling issues** - Services may not bundle correctly for web worker

### Mitigation Strategies:

1. **Comprehensive fallbacks** - Keep existing regex-based implementations as fallbacks
2. **Gradual integration** - Implement one service at a time with testing
3. **Performance monitoring** - Add timing and memory usage tracking  
4. **Error boundaries** - Wrap all service calls in try-catch with fallbacks
5. **Configuration flags** - Allow disabling services if issues arise

### Best Practices:

```typescript
// Always provide fallbacks
async function safeServiceCall<T>(
  serviceCall: () => Promise<T>,
  fallback: () => T,
  operationName: string
): Promise<T> {
  try {
    const startTime = performance.now();
    const result = await serviceCall();
    const duration = performance.now() - startTime;
    
    logger.info(`✅ ${operationName} completed in ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    logger.error(`❌ ${operationName} failed: ${error}`);
    logger.warn(`🔄 Using fallback for ${operationName}`);
    return fallback();
  }
}
```

---

## Configuration and Extension Settings

The extension should support configuration to control service behavior:

### VS Code Settings (add to extension package.json):

```json
{
  "apex-ls-ts.services.enableAdvancedParsing": {
    "type": "boolean", 
    "default": true,
    "description": "Enable ANTLR-based Apex parsing for better language features"
  },
  "apex-ls-ts.services.maxFileSize": {
    "type": "number",
    "default": 1048576,
    "description": "Maximum file size (bytes) for advanced parsing (1MB default)"
  },
  "apex-ls-ts.services.fallbackOnError": {
    "type": "boolean",
    "default": true, 
    "description": "Fall back to basic functionality when advanced services fail"
  },
  "apex-ls-ts.performance.enableMetrics": {
    "type": "boolean",
    "default": false,
    "description": "Log performance metrics for debugging"
  }
}
```

---

## Success Criteria and Validation

### Functional Requirements:

- [ ] Document symbols show proper Apex class hierarchy (classes, methods, properties)
- [ ] Diagnostics detect real Apex syntax errors instead of uppercase words
- [ ] Code completion provides Apex-specific suggestions and context
- [ ] Error fallbacks maintain basic functionality when services fail
- [ ] No regressions in existing worker functionality

### Performance Requirements:

- [ ] Symbol extraction completes within 500ms for typical Apex classes
- [ ] Memory usage remains under 100MB for normal operation
- [ ] Diagnostic validation completes within 200ms for typical files
- [ ] Service failures fall back to basic functionality within 50ms

### Quality Requirements:

- [ ] All tests pass after integration
- [ ] Extension loads and works in VS Code
- [ ] No console errors or unhandled exceptions
- [ ] Service errors are logged appropriately 
- [ ] Build process completes successfully

---

## Implementation Notes

### Key Dependencies (Already Available):

- ✅ `@salesforce/apex-lsp-compliant-services` - Available in packages/lsp-compliant-services/
- ✅ `@salesforce/apex-lsp-parser-ast` - Available in packages/apex-parser-ast/
- ✅ `@salesforce/apex-lsp-shared` - Available in packages/apex-lsp-shared/
- ✅ All dependencies already included in apex-ls package.json

### Build System:

- ✅ TypeScript configuration supports multiple targets (browser/worker/node)
- ✅ tsup bundling configuration in place
- ✅ Polyfills already configured for web worker environment
- ✅ Testing infrastructure supports web worker testing

### Development Workflow:

1. Make changes to `packages/apex-ls/src/worker.ts`
2. Build: `cd packages/apex-ls && npm run build`
3. Test: `npm run test && npm run test:web`
4. Test in extension: `cd ../apex-lsp-vscode-extension && npm run build`
5. Validate functionality in VS Code with .cls files

---

## IMPORTANT IMPLEMENTATION SUMMARY

This plan has been updated to reflect the **actual current state** of the repository as of the consolidation work completed. The key points for implementation are:

### What Already Exists ✅
- Complete `lsp-compliant-services` package with production-ready Apex language services
- ANTLR-based document symbol provider with proper AST parsing
- All necessary dependencies and build configuration
- Working web worker architecture with browser/node/worker builds

### What Needs To Be Done 🔧
- **ONLY ONE FILE needs modification**: `packages/apex-ls/src/worker.ts`
- Replace 3 basic LSP handlers with calls to existing production services:
  1. `connection.onDocumentSymbol` - Replace regex with `dispatchProcessOnDocumentSymbol`
  2. `validateTextDocument` - Replace uppercase detection with `dispatchProcessOnChangeDocument`  
  3. `connection.onCompletion` - Enhance with better Apex completions (optional)
- Add proper error handling and fallbacks
- Initialize `ApexStorageManager` for document caching

### What NOT To Do ❌
- Do not create new packages or services (they already exist)
- Do not modify build configuration (it's already correct)
- Do not add external dependencies (they're already included)
- Do not rewrite the entire worker (only replace specific handlers)

### Success Criteria 🎯
After implementation, users should see:
- **Document outline** showing real Apex class structure instead of regex-based detection
- **Error diagnostics** for actual Apex syntax errors instead of uppercase words
- **Better completion** suggestions with Apex-specific items
- **Fallback behavior** when advanced services fail

This is a **focused integration task**, not a major architectural change. The heavy lifting has already been done in the consolidation work.
