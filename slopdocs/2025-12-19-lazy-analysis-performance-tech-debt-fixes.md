# Technical Analysis: Lazy Analysis Performance Optimization Tech Debt Fixes

**Date**: December 19, 2025  
**Commits Analyzed**: `c7076ffe`, `7a52128a`, `f5c4a5ea`  
**Author**: Kyle Walker  
**Status**: Implementation Plan Ready

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Critical Issues](#critical-issues)
   - [Issue 1: SymbolTable.fromJSON() Broken](#issue-1-symboltablefromjson-broken)
   - [Issue 2: ResourceLoader Initialization Race](#issue-2-resourceloader-initialization-race)
   - [Issue 3: pendingAnalyses Race Condition](#issue-3-pendinganalyses-race-condition)
4. [High Priority Issues](#high-priority-issues)
   - [Issue 4: esbuild Binary Embedding Inefficiency](#issue-4-esbuild-binary-embedding-inefficiency)
   - [Issue 5: DocumentProcessingService Singleton Missing Lifecycle](#issue-5-documentprocessingservice-singleton-missing-lifecycle)
   - [Issue 6: NodeJS.Timeout Browser Incompatibility](#issue-6-nodejstimeout-browser-incompatibility)
5. [Medium Priority Issues](#medium-priority-issues)
   - [Issue 7: Stub Files Lack Documentation](#issue-7-stub-files-lack-documentation)
   - [Issue 8: resourceLoaderReady Status Opaque](#issue-8-resourceloaderready-status-opaque)
6. [Implementation Order](#implementation-order)
7. [Testing Strategy](#testing-strategy)

---

## Executive Summary

The last 3 commits implement a **lazy analysis pattern** to improve LSP startup performance. The core architectural change moves from eager full analysis on document open to deferred analysis with pre-compiled standard library artifacts.

**Key Changes Introduced**:
- `DocumentProcessingService` converted to singleton with lazy analysis via 5-second debounce
- `ResourceLoader` can now load pre-processed artifacts from a gzipped JSON buffer
- `SymbolTable` gains `toJSON()`/`fromJSON()` for serialization
- Build-time pre-processing script compiles standard library into artifacts
- esbuild plugin embeds pre-compiled artifacts in web worker bundle

**Problems Identified**: 8 issues across 3 severity levels requiring fixes to prevent runtime failures, race conditions, and future tech debt.

---

## Architecture Overview

### Data Flow: Document Open (Post-Changes)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        LSP Client (VS Code)                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ textDocument/didOpen
┌─────────────────────────────────────────────────────────────────────────┐
│                           LCSAdapter                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  resourceLoaderReady: Promise<void>                              │   │
│  │  - Waits for standard library to load before hover/definition   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    DocumentProcessingService (Singleton)                 │
│  ┌───────────────────┐  ┌───────────────────┐  ┌──────────────────┐    │
│  │ debounceTimers    │  │ pendingAnalyses   │  │ batcher          │    │
│  │ Map<uri, Timer>   │  │ Map<key, Promise> │  │ DocumentOpen...  │    │
│  └───────────────────┘  └───────────────────┘  └──────────────────┘    │
│                                                                          │
│  processDocumentOpenBatch():                                            │
│    1. Store document (lightweight)                                      │
│    2. Initialize cache entry                                            │
│    3. Schedule lazy analysis (5s debounce)                              │
│    4. Return empty diagnostics                                          │
│                                                                          │
│  ensureFullAnalysis():                                                  │
│    - Called on hover, definition, diagnostic request                    │
│    - Triggers immediate compilation if not already done                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         ResourceLoader (Singleton)                       │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ Standard Library Loading:                                          │ │
│  │                                                                     │ │
│  │   [Web Worker Path]              [Desktop Path]                    │ │
│  │   Embedded artifacts.gz    OR    Request ZIP from client           │ │
│  │          │                              │                           │ │
│  │          ▼                              ▼                           │ │
│  │   loadArtifactsFromBuffer()      setZipBuffer()                    │ │
│  │          │                              │                           │ │
│  │          ▼                              ▼                           │ │
│  │   SymbolTable.fromJSON()         compileAllArtifacts()             │ │
│  │          │                              │                           │ │
│  │          └──────────────┬───────────────┘                          │ │
│  │                         ▼                                           │ │
│  │              compiledArtifacts: Map<path, Artifact>                │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Build-Time Pre-Processing

```
┌────────────────────────────────────────────────────────────────────────┐
│                     Build Pipeline (turbo.json)                         │
│                                                                          │
│  1. @salesforce/apex-lsp-parser-ast#precompile                          │
│     └── scripts/pre-process-stubs.ts                                    │
│         ├── Loads StandardApexLibrary.zip                               │
│         ├── Compiles all .cls files to SymbolTables                     │
│         ├── Serializes via SymbolTable.toJSON()                         │
│         ├── Compresses with gzip                                        │
│         └── Outputs: resources/StandardApexLibrary.ast.json.gz          │
│                                                                          │
│  2. @salesforce/apex-ls#bundle                                          │
│     └── esbuild.config.ts                                               │
│         └── injectStdLibArtifactsPlugin                                 │
│             ├── Intercepts: import from 'std-lib-artifacts'             │
│             ├── Reads: StandardApexLibrary.ast.json.gz                  │
│             └── Injects: new Uint8Array([...bytes...])                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Critical Issues

### Issue 1: SymbolTable.fromJSON() Broken

**Severity**: 🔴 CRITICAL  
**File**: `packages/apex-parser-ast/src/types/symbol.ts`  
**Lines**: 1597-1622  
**Impact**: Runtime crashes when accessing deserialized symbols

#### Problem Analysis

The current `fromJSON()` implementation has multiple fundamental flaws:

```typescript
static fromJSON(json: any): SymbolTable {
  const table = new SymbolTable();
  if (!json) return table;

  if (json.fileUri) {
    table.setFileUri(json.fileUri);
  }

  // BUG 1: Array.from() always returns truthy, even for empty arrays
  // This condition will ALWAYS be true if json.symbols exists
  if (json.symbols && Array.from(json.symbols)) {
    for (const entry of json.symbols) {
      if (entry.symbol) {
        // BUG 2: entry.symbol is a plain JSON object, not an ApexSymbol
        // It lacks the correct prototype chain and may be missing required fields
        table.addSymbol(entry.symbol);
      }
    }
  }

  // BUG 3: References are assigned directly without validation
  // TypeReference objects need proper reconstruction
  if (json.references) {
    table.references = json.references;
  }

  if (json.hierarchicalReferences) {
    table.hierarchicalReferences = json.hierarchicalReferences;
  }

  return table;
}
```

**Specific Bugs**:

1. **Condition Logic Error**: `Array.from(json.symbols)` converts to array but the result is always truthy. Should be `Array.isArray(json.symbols) && json.symbols.length > 0`.

2. **Symbol Structure Not Reconstructed**: The `entry.symbol` is a plain JSON object. When code later calls `symbol.key.unifiedId` or accesses nested properties, the structure may be incomplete or have wrong types.

3. **SymbolKey Not Validated**: The `key` property in `toJSON()` has `fileUri` stripped out, but `fromJSON()` doesn't restore it from the table's `fileUri`.

4. **TypeReference Objects**: The `references` array contains `TypeReference` objects which have complex nested structures (`ReferenceContext`, `Position`) that aren't validated.

5. **No Error Handling**: If any symbol is malformed, the entire load fails silently or crashes unpredictably.

#### Implementation Plan

**Step 1**: Create symbol reconstruction helper

```typescript
// In packages/apex-parser-ast/src/types/symbol.ts

/**
 * Reconstruct a proper ApexSymbol from JSON data
 * Ensures all required fields exist and have correct types
 */
private static reconstructSymbol(
  symbolData: any,
  fileUri: string | undefined
): ApexSymbol | null {
  // Validate required fields
  if (!symbolData || typeof symbolData !== 'object') {
    return null;
  }
  
  const { id, name, kind, location } = symbolData;
  
  if (!id || typeof id !== 'string') return null;
  if (!name || typeof name !== 'string') return null;
  if (!kind || !Object.values(SymbolKind).includes(kind)) return null;
  if (!location || typeof location !== 'object') return null;
  
  // Reconstruct location with proper structure
  const reconstructedLocation = this.reconstructLocation(location);
  if (!reconstructedLocation) return null;
  
  // Reconstruct key with fileUri restored
  const reconstructedKey = this.reconstructKey(symbolData.key, fileUri, kind);
  
  // Build the symbol with all properties
  const symbol: ApexSymbol = {
    id,
    name,
    kind,
    location: reconstructedLocation,
    fileUri: fileUri ?? symbolData.fileUri,
    parentId: symbolData.parentId ?? null,
    key: reconstructedKey,
    _isLoaded: true,
    modifiers: symbolData.modifiers ?? {
      visibility: SymbolVisibility.Default,
      isStatic: false,
      isFinal: false,
      isAbstract: false,
      isVirtual: false,
      isOverride: false,
      isTransient: false,
      isTestMethod: false,
      isWebService: false,
      isBuiltIn: false,
    },
  };
  
  // Copy optional fields if present
  if (symbolData.fqn) symbol.fqn = symbolData.fqn;
  if (symbolData.namespace) symbol.namespace = symbolData.namespace;
  if (symbolData.annotations) symbol.annotations = symbolData.annotations;
  if (symbolData.identifierLocation) {
    symbol.identifierLocation = this.reconstructLocation(symbolData.identifierLocation);
  }
  if (symbolData._typeData) symbol._typeData = symbolData._typeData;
  
  // Handle kind-specific properties
  switch (kind) {
    case SymbolKind.Class:
      if (symbolData.superClass) (symbol as ClassSymbol).superClass = symbolData.superClass;
      if (symbolData.interfaces) (symbol as ClassSymbol).interfaces = symbolData.interfaces;
      if (symbolData.isInnerClass !== undefined) (symbol as ClassSymbol).isInnerClass = symbolData.isInnerClass;
      break;
    case SymbolKind.Interface:
      if (symbolData.interfaces) (symbol as InterfaceSymbol).interfaces = symbolData.interfaces;
      break;
    case SymbolKind.Method:
      if (symbolData.returnType) (symbol as MethodSymbol).returnType = symbolData.returnType;
      if (symbolData.parameters) (symbol as MethodSymbol).parameters = symbolData.parameters;
      break;
    case SymbolKind.Constructor:
      if (symbolData.parameters) (symbol as ConstructorSymbol).parameters = symbolData.parameters;
      break;
    case SymbolKind.Variable:
    case SymbolKind.Field:
    case SymbolKind.Property:
    case SymbolKind.Parameter:
      if (symbolData.type) (symbol as VariableSymbol).type = symbolData.type;
      break;
    case SymbolKind.Enum:
      if (symbolData.values) (symbol as EnumSymbol).values = symbolData.values;
      break;
    case SymbolKind.Trigger:
      if (symbolData.objectName) (symbol as TriggerSymbol).objectName = symbolData.objectName;
      if (symbolData.events) (symbol as TriggerSymbol).events = symbolData.events;
      break;
  }
  
  return symbol;
}

/**
 * Reconstruct a SymbolLocation from JSON
 */
private static reconstructLocation(locationData: any): SymbolLocation | null {
  if (!locationData || typeof locationData !== 'object') return null;
  
  const { range, identifierRange } = locationData;
  
  // At minimum we need identifierRange for position-based lookups
  if (!identifierRange || typeof identifierRange !== 'object') return null;
  
  return {
    range: range ?? identifierRange,
    identifierRange: {
      startLine: identifierRange.startLine ?? 0,
      startColumn: identifierRange.startColumn ?? 0,
      endLine: identifierRange.endLine ?? identifierRange.startLine ?? 0,
      endColumn: identifierRange.endColumn ?? identifierRange.startColumn ?? 0,
    },
  };
}

/**
 * Reconstruct a SymbolKey from JSON, restoring fileUri
 */
private static reconstructKey(
  keyData: any,
  fileUri: string | undefined,
  kind: SymbolKind
): SymbolKey {
  if (!keyData || typeof keyData !== 'object') {
    // Fallback: create minimal key
    return {
      prefix: kind,
      name: '',
      path: fileUri ? [fileUri] : [],
      unifiedId: '',
      fileUri: fileUri,
      kind,
    };
  }
  
  return {
    prefix: keyData.prefix ?? kind,
    name: keyData.name ?? '',
    path: keyData.path ?? (fileUri ? [fileUri] : []),
    unifiedId: keyData.unifiedId ?? '',
    fileUri: fileUri ?? keyData.fileUri,
    fqn: keyData.fqn,
    kind: keyData.kind ?? kind,
  };
}
```

**Step 2**: Rewrite `fromJSON()` with proper reconstruction

```typescript
/**
 * Create a new symbol table from a JSON representation
 * @param json The JSON representation of a symbol table (from toJSON())
 * @returns A new symbol table with properly reconstructed symbols
 */
static fromJSON(json: any): SymbolTable {
  const table = new SymbolTable();
  
  if (!json || typeof json !== 'object') {
    return table;
  }

  // Set fileUri first - this is needed for symbol reconstruction
  if (json.fileUri && typeof json.fileUri === 'string') {
    table.setFileUri(json.fileUri);
  }

  // Reconstruct symbols
  if (Array.isArray(json.symbols)) {
    for (const entry of json.symbols) {
      if (entry && entry.symbol) {
        const reconstructed = this.reconstructSymbol(entry.symbol, table.fileUri);
        if (reconstructed) {
          table.addSymbol(reconstructed);
        }
      }
    }
  }

  // Reconstruct references (TypeReference[])
  if (Array.isArray(json.references)) {
    table.references = json.references.map((ref: any) => {
      // Validate and reconstruct TypeReference structure
      if (!ref || typeof ref !== 'object') return null;
      return {
        name: ref.name ?? '',
        kind: ref.kind ?? 'unknown',
        context: ref.context ?? ReferenceContext.Unknown,
        location: ref.location,
        resolvedSymbolId: ref.resolvedSymbolId,
        isResolved: ref.isResolved ?? false,
      } as TypeReference;
    }).filter((ref): ref is TypeReference => ref !== null);
  }

  // Reconstruct hierarchical references
  if (Array.isArray(json.hierarchicalReferences)) {
    table.hierarchicalReferences = json.hierarchicalReferences.map((ref: any) => {
      if (!ref || typeof ref !== 'object') return null;
      return {
        name: ref.name ?? '',
        parts: Array.isArray(ref.parts) ? ref.parts : [],
        location: ref.location,
        context: ref.context,
      } as HierarchicalReference;
    }).filter((ref): ref is HierarchicalReference => ref !== null);
  }

  return table;
}
```

**Step 3**: Add unit tests

```typescript
// In packages/apex-parser-ast/test/types/symbol.fromJSON.test.ts

describe('SymbolTable.fromJSON', () => {
  it('should reconstruct a symbol table from JSON', () => {
    const original = new SymbolTable();
    original.setFileUri('file:///test/MyClass.cls');
    
    const symbol = SymbolFactory.createFullSymbol(
      'MyClass',
      SymbolKind.Class,
      { range: { startLine: 1, startColumn: 0, endLine: 10, endColumn: 1 },
        identifierRange: { startLine: 1, startColumn: 14, endLine: 1, endColumn: 21 } },
      'file:///test/MyClass.cls',
      { visibility: SymbolVisibility.Public, isStatic: false, isFinal: false,
        isAbstract: false, isVirtual: false, isOverride: false, isTransient: false,
        isTestMethod: false, isWebService: false, isBuiltIn: false },
      null,
      undefined,
      'MyClass',
    );
    original.addSymbol(symbol);
    
    const json = original.toJSON();
    const reconstructed = SymbolTable.fromJSON(json);
    
    expect(reconstructed.fileUri).toBe('file:///test/MyClass.cls');
    expect(reconstructed.getAllSymbols().length).toBe(1);
    
    const reconSymbol = reconstructed.getAllSymbols()[0];
    expect(reconSymbol.name).toBe('MyClass');
    expect(reconSymbol.kind).toBe(SymbolKind.Class);
    expect(reconSymbol.fileUri).toBe('file:///test/MyClass.cls');
    expect(reconSymbol.key.fileUri).toBe('file:///test/MyClass.cls');
  });
  
  it('should handle null/undefined input gracefully', () => {
    expect(() => SymbolTable.fromJSON(null)).not.toThrow();
    expect(() => SymbolTable.fromJSON(undefined)).not.toThrow();
    expect(SymbolTable.fromJSON(null).getAllSymbols().length).toBe(0);
  });
  
  it('should skip malformed symbols without crashing', () => {
    const json = {
      fileUri: 'file:///test.cls',
      symbols: [
        { symbol: { name: 'Valid', kind: 'class', id: '1', location: { identifierRange: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 5 } } } },
        { symbol: null },
        { symbol: { name: 'Missing kind' } },
        { symbol: { kind: 'class' } }, // Missing name
      ],
      references: [],
    };
    
    const table = SymbolTable.fromJSON(json);
    expect(table.getAllSymbols().length).toBe(1);
    expect(table.getAllSymbols()[0].name).toBe('Valid');
  });
});
```

---

### Issue 2: ResourceLoader Initialization Race

**Severity**: 🔴 CRITICAL  
**File**: `packages/apex-parser-ast/src/utils/resourceLoader.ts`  
**Lines**: 106-120 (constructor), 445-531 (loadArtifactsFromBuffer)  
**Impact**: Partial/corrupted state on load failure

#### Problem Analysis

The constructor sets `initialized = true` immediately after calling `loadArtifactsFromBuffer()`:

```typescript
constructor(options?: ResourceLoaderOptions) {
  // ...
  
  // If artifacts buffer is provided, load it
  if (options?.artifactsBuffer) {
    this.logger.debug(() => '📦 Using provided artifacts buffer directly');
    this.loadArtifactsFromBuffer(options.artifactsBuffer);  // Can throw or partially fail
    this.initialized = true;  // SET REGARDLESS OF SUCCESS
  }

  // If a ZIP buffer is provided directly, use it immediately
  if (options?.zipBuffer) {
    this.logger.debug(() => '📦 Using provided ZIP buffer directly');
    this.loadZipBuffer(options.zipBuffer);
    this.initialized = true;
  }
}
```

And `loadArtifactsFromBuffer()` has a try-catch that logs but doesn't rethrow:

```typescript
private loadArtifactsFromBuffer(buffer: Uint8Array): void {
  try {
    // ... parse JSON, iterate artifacts ...
    for (const [key, artifactData] of Object.entries(data.artifacts)) {
      // If ANY artifact fails, we've already set some artifacts
      // but we'll skip the rest and continue
      // ...
    }
  } catch (error) {
    this.logger.error(() => `❌ Failed to load artifacts from buffer: ${error}`);
    // NO THROW - caller doesn't know we failed
  }
}
```

**Failure Scenarios**:

1. **Corrupted gzip**: `gunzipSync` throws, entire load fails, but `initialized = true` is set after
2. **Malformed JSON**: `JSON.parse` throws, same issue
3. **Partial artifact failure**: Loop processes 50 of 100 artifacts, then crashes on artifact 51. Maps have partial data.

#### Implementation Plan

**Step 1**: Make `loadArtifactsFromBuffer` return success status

```typescript
/**
 * Load artifacts from a JSON buffer
 * @param buffer The JSON buffer (optionally gzip compressed)
 * @returns true if loading succeeded, false otherwise
 * @private
 */
private loadArtifactsFromBuffer(buffer: Uint8Array): boolean {
  const startTime = Date.now();
  
  // Prepare temporary maps for atomic swap
  const tempCompiledArtifacts = new CaseInsensitivePathMap<CompiledArtifact>();
  const tempFileIndex = new CaseInsensitivePathMap<boolean>();
  const tempOriginalPaths = new CaseInsensitivePathMap<string>();
  const tempNamespaces = new Map<string, CIS[]>();
  const tempNamespaceIndex = new Map<string, string>();
  const tempClassNameToNamespace = new CaseInsensitivePathMap<string>();
  
  try {
    let artifactsBuffer = buffer;

    // Check if buffer is GZIP compressed (magic bytes: 0x1f 0x8b)
    if (buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
      this.logger.debug(() => '🤐 Decompressing GZIP artifacts...');
      artifactsBuffer = gunzipSync(buffer);
    }

    const content = new TextDecoder().decode(artifactsBuffer);
    const data = JSON.parse(content);

    if (!data.artifacts || typeof data.artifacts !== 'object') {
      this.logger.error(() => 'Invalid artifacts JSON: missing or invalid "artifacts" property');
      return false;
    }

    const artifactEntries = Object.entries(data.artifacts);
    this.logger.debug(() => `📂 Loading ${artifactEntries.length} artifacts...`);
    
    let loadedCount = 0;
    let failedCount = 0;

    for (const [key, artifactData] of artifactEntries) {
      try {
        const artifact = artifactData as any;
        if (!artifact.compilationResult?.result) {
          failedCount++;
          continue;
        }

        // Reconstruct SymbolTable from JSON
        const symbolTable = SymbolTable.fromJSON(artifact.compilationResult.result);
        
        // Validate reconstruction succeeded
        if (!symbolTable || symbolTable.getAllSymbols().length === 0) {
          this.logger.debug(() => `⚠️ Empty symbol table for ${key}, skipping`);
          failedCount++;
          continue;
        }

        const storedPath = artifact.path;
        const normalizedKey = this.normalizePath(storedPath);

        tempCompiledArtifacts.set(normalizedKey, {
          path: storedPath,
          compilationResult: {
            fileName: artifact.compilationResult.fileName ?? storedPath,
            result: symbolTable,
            errors: artifact.compilationResult.errors ?? [],
            warnings: artifact.compilationResult.warnings ?? [],
          },
        });

        tempFileIndex.set(normalizedKey, true);
        tempOriginalPaths.set(normalizedKey, storedPath);

        // Populate namespace structure from path
        const pathParts = storedPath.split(/[\/\\]/);
        if (pathParts.length > 1) {
          const namespace = pathParts[0];
          const fileName = pathParts[pathParts.length - 1];
          const namespaceLower = namespace.toLowerCase();
          
          let existingNamespaceKey = namespace;
          if (tempNamespaceIndex.has(namespaceLower)) {
            existingNamespaceKey = tempNamespaceIndex.get(namespaceLower)!;
          } else {
            tempNamespaceIndex.set(namespaceLower, namespace);
          }

          if (!tempNamespaces.has(existingNamespaceKey)) {
            tempNamespaces.set(existingNamespaceKey, []);
          }
          tempNamespaces.get(existingNamespaceKey)!.push(CIS.from(fileName));

          tempClassNameToNamespace.set(normalizedKey, existingNamespaceKey);
          const classNameOnly = fileName.replace(/\.cls$/i, '');
          if (classNameOnly) {
            tempClassNameToNamespace.set(classNameOnly, existingNamespaceKey);
          }
        }
        
        loadedCount++;
      } catch (artifactError) {
        this.logger.debug(() => `⚠️ Failed to load artifact ${key}: ${artifactError}`);
        failedCount++;
        // Continue with next artifact
      }
    }

    // Check if we loaded enough artifacts to consider it successful
    const successThreshold = 0.9; // 90% success rate required
    const successRate = loadedCount / artifactEntries.length;
    
    if (successRate < successThreshold && artifactEntries.length > 10) {
      this.logger.error(
        () => `❌ Artifact loading failed: only ${loadedCount}/${artifactEntries.length} ` +
              `artifacts loaded (${(successRate * 100).toFixed(1)}% success rate)`
      );
      return false;
    }

    // ATOMIC SWAP: Only update instance maps after all artifacts are processed
    this.compiledArtifacts = tempCompiledArtifacts;
    this.fileIndex = tempFileIndex;
    this.originalPaths = tempOriginalPaths;
    this.namespaces = tempNamespaces;
    this.namespaceIndex = tempNamespaceIndex;
    this.classNameToNamespace = tempClassNameToNamespace;

    const duration = Date.now() - startTime;
    this.logger.debug(
      () => `✅ Loaded ${loadedCount} artifacts from buffer in ${duration}ms ` +
            `(${failedCount} failed)`
    );
    
    return true;
  } catch (error) {
    this.logger.error(() => `❌ Failed to load artifacts from buffer: ${error}`);
    return false;
  }
}
```

**Step 2**: Update constructor to handle failure

```typescript
constructor(options?: ResourceLoaderOptions) {
  // ... existing initialization ...
  
  this.initializeEmptyStructure();
  
  let artifactsLoaded = false;
  let zipLoaded = false;

  // If artifacts buffer is provided, try to load it
  if (options?.artifactsBuffer) {
    this.logger.debug(() => '📦 Using provided artifacts buffer directly');
    artifactsLoaded = this.loadArtifactsFromBuffer(options.artifactsBuffer);
    if (artifactsLoaded) {
      this.initialized = true;
    } else {
      this.logger.warn(() => '⚠️ Artifacts buffer loading failed, will try ZIP fallback');
    }
  }

  // If a ZIP buffer is provided, load it (even if artifacts loaded, for fallback data)
  if (options?.zipBuffer) {
    this.logger.debug(() => '📦 Using provided ZIP buffer directly');
    this.loadZipBuffer(options.zipBuffer);
    zipLoaded = true;
    // Only set initialized from ZIP if artifacts didn't work
    if (!artifactsLoaded) {
      this.initialized = true;
    }
  }
  
  // If neither succeeded, log a warning
  if (!artifactsLoaded && !zipLoaded && (options?.artifactsBuffer || options?.zipBuffer)) {
    this.logger.warn(() => '⚠️ ResourceLoader initialized without any standard library data');
  }
}
```

**Step 3**: Add `setArtifactsBuffer` return value

```typescript
/**
 * Set the pre-processed artifacts JSON buffer
 * @param buffer The artifacts JSON buffer
 * @returns true if loading succeeded, false otherwise
 */
public setArtifactsBuffer(buffer: Uint8Array): boolean {
  this.logger.debug(
    () => `📦 Setting artifacts buffer directly (${buffer.length} bytes)`,
  );
  const success = this.loadArtifactsFromBuffer(buffer);
  if (success) {
    this.initialized = true;
  }
  return success;
}
```

---

### Issue 3: pendingAnalyses Race Condition

**Severity**: 🔴 CRITICAL  
**File**: `packages/lsp-compliant-services/src/services/DocumentProcessingService.ts`  
**Lines**: 231-268  
**Impact**: Duplicate analysis work, wasted CPU, potential inconsistent state

#### Problem Analysis

The current code has a time-of-check to time-of-use (TOCTOU) race:

```typescript
public async ensureFullAnalysis(
  uri: string,
  version: number,
  options: { priority: Priority; reason: string; force?: boolean },
): Promise<Diagnostic[] | undefined> {
  // ... skip checks ...

  // CHECK: Is there a pending analysis?
  const analysisKey = `${uri}@${version}`;
  const pending = this.pendingAnalyses.get(analysisKey);
  if (pending) {
    return await pending;  // Return existing promise
  }

  // ... logging and timer cancellation ...
  // TIME PASSES - another call could reach here before we set the promise

  // SET: Start analysis and track it
  const analysisPromise = this.performFullAnalysis(uri, version, options.priority);
  this.pendingAnalyses.set(analysisKey, analysisPromise);  // TOO LATE
  
  // ...
}
```

**Race Scenario**:
1. Call A: `ensureFullAnalysis('file.cls', 1, ...)` - checks `pending`, finds nothing
2. Call B: `ensureFullAnalysis('file.cls', 1, ...)` - checks `pending`, finds nothing (A hasn't set it yet)
3. Call A: Creates promise, sets in map
4. Call B: Creates ANOTHER promise, overwrites in map
5. Both analyses run in parallel, wasting resources

#### Implementation Plan

**Step 1**: Synchronously create and store the promise

```typescript
/**
 * Ensure full analysis has been performed for a document version
 */
public async ensureFullAnalysis(
  uri: string,
  version: number,
  options: {
    priority: Priority;
    reason: string;
    force?: boolean;
  },
): Promise<Diagnostic[] | undefined> {
  // Skip standard library classes
  if (isStandardApexUri(uri)) {
    return [];
  }

  const cache = getDocumentStateCache();
  const cached = cache.get(uri, version);

  // Return cached results if available and not forcing
  if (
    !options.force &&
    cached?.fullAnalysisCompleted &&
    cached.diagnostics !== undefined
  ) {
    this.logger.debug(
      () =>
        `Full analysis already completed for ${uri} (v${version}) [Reason: ${options.reason}]`,
    );
    return cached.diagnostics;
  }

  const analysisKey = `${uri}@${version}`;
  
  // SYNCHRONOUS CHECK-AND-SET: Get or create the promise atomically
  let analysisPromise = this.pendingAnalyses.get(analysisKey);
  
  if (analysisPromise) {
    // Someone else is already analyzing this exact version
    this.logger.debug(
      () =>
        `Full analysis already in progress for ${uri} (v${version}) [Reason: ${options.reason}]`,
    );
    return analysisPromise;
  }

  // No pending analysis - we'll start one
  this.logger.debug(
    () =>
      `Performing full analysis for ${uri} (v${version}) [Reason: ${options.reason}]`,
  );

  // Cancel any pending debounce timer since we're doing it now
  const timer = this.debounceTimers.get(uri);
  if (timer) {
    clearTimeout(timer);
    this.debounceTimers.delete(uri);
  }

  // CREATE PROMISE AND SET IT IMMEDIATELY (synchronously)
  // This is the critical fix - no await between check and set
  analysisPromise = this.performFullAnalysisWithCleanup(
    analysisKey,
    uri,
    version,
    options.priority,
  );
  this.pendingAnalyses.set(analysisKey, analysisPromise);

  return analysisPromise;
}

/**
 * Wrapper that ensures cleanup happens after analysis
 */
private async performFullAnalysisWithCleanup(
  analysisKey: string,
  uri: string,
  version: number,
  priority: Priority,
): Promise<Diagnostic[] | undefined> {
  try {
    return await this.performFullAnalysis(uri, version, priority);
  } finally {
    // Clean up pending analysis regardless of success/failure
    this.pendingAnalyses.delete(analysisKey);
  }
}
```

**Key Change**: The promise is created and stored in the map SYNCHRONOUSLY before any `await`. This eliminates the race window.

---

## High Priority Issues

### Issue 4: esbuild Binary Embedding Inefficiency

**Severity**: 🟠 HIGH  
**File**: `packages/apex-ls/esbuild.config.ts`  
**Lines**: 24-46  
**Impact**: 5-6x bundle size increase, slower parsing

#### Problem Analysis

Current approach converts binary to JS array literal:

```typescript
build.onLoad({ filter: /.*/, namespace: 'binary' }, async (args) => {
  const buffer = readFileSync(args.path);
  return {
    contents: `export default new Uint8Array([${Array.from(buffer).join(',')}]);`,
    loader: 'js',
  };
});
```

For a 5MB gzip file:
- Each byte becomes 1-3 characters plus comma: `255,` = 4 chars average
- 5MB × 4 = 20MB of JavaScript text
- Plus `new Uint8Array([` prefix and `]);` suffix
- JavaScript engine must parse this giant array literal

#### Implementation Plan

**Step 1**: Use esbuild's native binary loader with base64

```typescript
const injectStdLibArtifactsPlugin: Plugin = {
  name: 'inject-std-lib-artifacts',
  setup(build) {
    build.onResolve(
      { filter: /std-lib-artifacts(\.ts)?$/ },
      (args) => {
        if (args.importer.includes('custom-services')) {
          const artifactsPath = resolve(
            __dirname,
            '../apex-parser-ast/resources/StandardApexLibrary.ast.json.gz'
          );
          
          // Validate file exists at build time
          if (!existsSync(artifactsPath)) {
            console.error(`❌ Standard library artifacts not found: ${artifactsPath}`);
            console.error('Run "npm run precompile" in apex-parser-ast first.');
            throw new Error(`Missing required file: ${artifactsPath}`);
          }
          
          return {
            path: artifactsPath,
            namespace: 'std-lib-binary',
          };
        }
        return null;
      },
    );

    build.onLoad({ filter: /.*/, namespace: 'std-lib-binary' }, async (args) => {
      const buffer = readFileSync(args.path);
      const base64 = buffer.toString('base64');
      
      // Export a function that decodes on first access (lazy)
      // This is more efficient than a giant array literal
      return {
        contents: `
          let _cached = null;
          function decode() {
            if (_cached) return _cached;
            const base64 = "${base64}";
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            _cached = bytes;
            return bytes;
          }
          export default { get value() { return decode(); } };
        `,
        loader: 'js',
      };
    });
  },
};
```

**Step 2**: Update consuming code

```typescript
// In custom-services/src/index.ts
import stdLibArtifacts from './std-lib-artifacts';

export function getEmbeddedStandardLibraryArtifacts(): Uint8Array | undefined {
  // Handle both the stub (undefined) and the injected getter object
  if (!stdLibArtifacts) return undefined;
  if (stdLibArtifacts instanceof Uint8Array) return stdLibArtifacts;
  if (typeof stdLibArtifacts === 'object' && 'value' in stdLibArtifacts) {
    return stdLibArtifacts.value;
  }
  return undefined;
}
```

**Alternative**: Use esbuild's native `binary` loader if targeting environments that support import of binary modules. This is cleaner but may have compatibility issues.

---

### Issue 5: DocumentProcessingService Singleton Missing Lifecycle

**Severity**: 🟠 HIGH  
**File**: `packages/lsp-compliant-services/src/services/DocumentProcessingService.ts`  
**Lines**: 32-69  
**Impact**: Memory leaks, test pollution, no clean shutdown

#### Problem Analysis

```typescript
export class DocumentProcessingService {
  private static instance: DocumentProcessingService | null = null;
  private readonly debounceTimers = new Map<string, NodeJS.Timeout>();
  private readonly pendingAnalyses = new Map<string, Promise<...>>();
  
  private constructor(logger: LoggerInterface) {
    this.logger = logger;
    this.storageManager = ApexStorageManager.getInstance();
  }

  public static getInstance(logger?: LoggerInterface): DocumentProcessingService {
    if (!DocumentProcessingService.instance) {
      if (!logger) {
        throw new Error('Logger must be provided when creating...');
      }
      DocumentProcessingService.instance = new DocumentProcessingService(logger);
    }
    return DocumentProcessingService.instance;
  }
  
  // NO reset() method
  // NO dispose() method
  // NO way to clean up timers
}
```

#### Implementation Plan

**Step 1**: Add lifecycle methods

```typescript
export class DocumentProcessingService {
  private static instance: DocumentProcessingService | null = null;
  private readonly logger: LoggerInterface;
  private readonly storageManager: ApexStorageManager;
  private batcher: DocumentOpenBatcherService | null = null;
  private batcherShutdown: Effect.Effect<void, never> | null = null;
  
  // Use cross-platform timer type
  private readonly debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly pendingAnalyses = new Map<string, Promise<Diagnostic[] | undefined>>();
  private readonly ANALYSIS_DEBOUNCE_MS = 5000;
  
  private isDisposed = false;

  private constructor(logger: LoggerInterface) {
    this.logger = logger;
    this.storageManager = ApexStorageManager.getInstance();
  }

  public static getInstance(logger?: LoggerInterface): DocumentProcessingService {
    if (!DocumentProcessingService.instance) {
      if (!logger) {
        throw new Error(
          'Logger must be provided when creating DocumentProcessingService instance',
        );
      }
      DocumentProcessingService.instance = new DocumentProcessingService(logger);
    }
    return DocumentProcessingService.instance;
  }

  /**
   * Reset the singleton instance (for testing)
   * This disposes the current instance and clears the singleton
   */
  public static reset(): void {
    if (DocumentProcessingService.instance) {
      DocumentProcessingService.instance.dispose();
      DocumentProcessingService.instance = null;
    }
  }

  /**
   * Dispose of all resources held by this service
   * Cancels all pending timers and clears state
   */
  public dispose(): void {
    if (this.isDisposed) {
      return;
    }
    
    this.isDisposed = true;
    this.logger.debug(() => 'Disposing DocumentProcessingService');

    // Cancel all debounce timers
    for (const [uri, timer] of this.debounceTimers) {
      clearTimeout(timer);
      this.logger.debug(() => `Cancelled debounce timer for ${uri}`);
    }
    this.debounceTimers.clear();

    // Note: We can't cancel pending analyses, but we can clear the map
    // The promises will complete but results won't be used
    this.pendingAnalyses.clear();

    // Shutdown batcher if running
    if (this.batcherShutdown) {
      Effect.runPromise(this.batcherShutdown).catch((error) => {
        this.logger.error(() => `Error shutting down batcher: ${error}`);
      });
      this.batcher = null;
      this.batcherShutdown = null;
    }
  }

  /**
   * Check if the service has been disposed
   */
  public get disposed(): boolean {
    return this.isDisposed;
  }

  // Add disposal check to public methods
  public processDocumentOpen(event: TextDocumentChangeEvent<TextDocument>): void {
    if (this.isDisposed) {
      this.logger.warn(() => 'processDocumentOpen called on disposed service');
      return;
    }
    // ... existing implementation ...
  }

  public async ensureFullAnalysis(...): Promise<Diagnostic[] | undefined> {
    if (this.isDisposed) {
      this.logger.warn(() => 'ensureFullAnalysis called on disposed service');
      return [];
    }
    // ... existing implementation ...
  }
}
```

**Step 2**: Update tests to use reset

```typescript
// In test setup/teardown
beforeEach(() => {
  DocumentProcessingService.reset();
});

afterEach(() => {
  DocumentProcessingService.reset();
});
```

---

### Issue 6: NodeJS.Timeout Browser Incompatibility

**Severity**: 🟠 HIGH  
**File**: `packages/lsp-compliant-services/src/services/DocumentProcessingService.ts`  
**Line**: 40  
**Impact**: TypeScript errors in browser-targeted builds

#### Problem Analysis

```typescript
private readonly debounceTimers = new Map<string, NodeJS.Timeout>();
```

`NodeJS.Timeout` is a Node.js-specific type. In browser environments (web workers), `setTimeout` returns a `number`.

#### Implementation Plan

**Single-line fix**:

```typescript
// Before
private readonly debounceTimers = new Map<string, NodeJS.Timeout>();

// After - Cross-platform compatible
private readonly debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
```

`ReturnType<typeof setTimeout>` resolves to the correct type in both Node.js and browser environments.

---

## Medium Priority Issues

### Issue 7: Stub Files Lack Documentation

**Severity**: 🟡 MEDIUM  
**Files**: 
- `packages/custom-services/src/std-lib-data.ts`
- `packages/custom-services/src/std-lib-artifacts.ts`  
**Impact**: Developer confusion, maintenance burden

#### Implementation Plan

**Update `std-lib-data.ts`**:

```typescript
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * STUB FILE - Build-Time Replacement Target
 * 
 * This file exports `undefined` in source/development mode.
 * During bundling (esbuild), this export is replaced with actual binary data
 * containing the StandardApexLibrary.zip contents.
 * 
 * ## How It Works
 * 
 * 1. Source code imports this module and gets `undefined`
 * 2. esbuild's `injectStdLibDataPlugin` intercepts the import
 * 3. Plugin reads `StandardApexLibrary.zip` and injects as Uint8Array
 * 4. Bundled code gets the actual ZIP data
 * 
 * ## Build Dependencies
 * 
 * - Requires: `packages/apex-parser-ast/resources/StandardApexLibrary.zip`
 * - Generated by: `npm run precompile` in apex-parser-ast
 * - Injected by: `packages/apex-ls/esbuild.config.ts`
 * 
 * ## Testing
 * 
 * - Unit tests run against source (stub returns undefined)
 * - E2E tests should verify bundled output contains real data
 * 
 * @see packages/apex-ls/esbuild.config.ts - injectStdLibDataPlugin
 * @see packages/apex-parser-ast/scripts/pre-process-stubs.ts - generates artifacts
 */
const stdLibData: Uint8Array | undefined = undefined;
export default stdLibData;
```

**Update `std-lib-artifacts.ts`** with similar documentation.

---

### Issue 8: resourceLoaderReady Status Opaque

**Severity**: 🟡 MEDIUM  
**File**: `packages/apex-ls/src/server/LCSAdapter.ts`  
**Lines**: 106-121  
**Impact**: Callers can't distinguish success from graceful degradation

#### Problem Analysis

```typescript
private resourceLoaderReady: Promise<void>;
private resolveResourceLoaderReady!: () => void;

// In constructor:
this.resourceLoaderReady = new Promise((resolve) => {
  this.resolveResourceLoaderReady = resolve;
});

// After loading (success or failure):
this.resolveResourceLoaderReady();  // Always resolves to undefined
```

#### Implementation Plan

**Step 1**: Create a status interface

```typescript
/**
 * Status of ResourceLoader initialization
 */
interface ResourceLoaderStatus {
  /** Whether initialization completed (true even on partial failure) */
  initialized: boolean;
  /** Whether standard library loaded successfully */
  standardLibraryLoaded: boolean;
  /** Number of artifacts loaded (0 if failed) */
  artifactCount: number;
  /** Error message if loading failed */
  error?: string;
}
```

**Step 2**: Update LCSAdapter

```typescript
private resourceLoaderReady: Promise<ResourceLoaderStatus>;
private resolveResourceLoaderReady!: (status: ResourceLoaderStatus) => void;

// In constructor:
this.resourceLoaderReady = new Promise((resolve) => {
  this.resolveResourceLoaderReady = resolve;
});

// Update initializeResourceLoader:
private async initializeResourceLoader(): Promise<void> {
  try {
    const resourceLoader = ResourceLoader.getInstance({
      loadMode: 'full',
      preloadStdClasses: true,
    });

    const embeddedArtifacts = getEmbeddedStandardLibraryArtifacts();
    const embeddedZip = getEmbeddedStandardLibraryZip();

    let artifactsLoaded = false;
    let artifactCount = 0;

    if (embeddedArtifacts) {
      this.logger.debug(() => '📦 Using embedded standard library artifacts');
      artifactsLoaded = resourceLoader.setArtifactsBuffer(embeddedArtifacts);
      if (artifactsLoaded) {
        artifactCount = resourceLoader.getCompiledArtifactCount();
      }
    }

    if (embeddedZip) {
      this.logger.debug(() => '📦 Using embedded standard library ZIP');
      resourceLoader.setZipBuffer(embeddedZip);
    } else if (!embeddedArtifacts) {
      this.logger.debug(() => '📦 Requesting standard library ZIP from client...');
      const zipBuffer = await this.requestStandardLibraryZip();
      resourceLoader.setZipBuffer(zipBuffer);
    }

    await resourceLoader.initialize();
    this.logger.debug('✅ ResourceLoader initialization complete');
    
    this.resolveResourceLoaderReady({
      initialized: true,
      standardLibraryLoaded: true,
      artifactCount,
    });
  } catch (error) {
    const errorMessage = formattedError(error);
    this.logger.error(() => `❌ ResourceLoader initialization failed: ${errorMessage}`);
    
    this.resolveResourceLoaderReady({
      initialized: true,
      standardLibraryLoaded: false,
      artifactCount: 0,
      error: errorMessage,
    });
  }
}

// Usage in hover handler:
this.connection.onHover(async (params: HoverParams): Promise<Hover | null> => {
  const status = await this.resourceLoaderReady;
  
  if (!status.standardLibraryLoaded) {
    this.logger.debug(() => 
      `Hover lookup may have limited standard library support: ${status.error ?? 'unknown'}`
    );
  }
  
  // ... proceed with hover handling ...
});
```

---

## Implementation Order

Execute fixes in this order to minimize interdependencies:

| Order | Issue | Estimated Effort | Dependencies |
|-------|-------|-----------------|--------------|
| 1 | Issue 6: NodeJS.Timeout type | 5 min | None |
| 2 | Issue 7: Stub file documentation | 15 min | None |
| 3 | Issue 1: SymbolTable.fromJSON() | 2 hrs | None |
| 4 | Issue 2: ResourceLoader initialization | 1 hr | Issue 1 (uses fromJSON) |
| 5 | Issue 3: pendingAnalyses race | 30 min | None |
| 6 | Issue 5: Singleton lifecycle | 45 min | Issue 3 (same file) |
| 7 | Issue 4: esbuild optimization | 1 hr | Issue 2 (changes same flow) |
| 8 | Issue 8: resourceLoaderReady status | 30 min | Issue 2 |

**Total Estimated Effort**: ~6.5 hours

---

## Testing Strategy

### Unit Tests Required

1. **SymbolTable.fromJSON()**
   - Round-trip test: toJSON → fromJSON → compare
   - Malformed input handling
   - Empty/null input handling
   - Kind-specific property preservation (class superClass, method parameters, etc.)

2. **ResourceLoader.loadArtifactsFromBuffer()**
   - Successful load from valid gzip
   - Corrupted gzip handling
   - Malformed JSON handling
   - Partial artifact failure (90% threshold)
   - Atomic swap verification (no partial state)

3. **DocumentProcessingService**
   - Race condition test: parallel calls to ensureFullAnalysis
   - dispose() clears all timers
   - reset() allows new instance creation
   - disposed service rejects new work

### Integration Tests Required

1. **Build verification**
   - Bundle contains embedded artifacts (not undefined)
   - Bundle size is within expected range (not 6x larger)
   - Base64 decoding produces valid gzip

2. **Startup time regression**
   - Measure cold start time with artifacts
   - Compare to baseline without optimization

### E2E Tests Required

1. **Web worker standard library**
   - Hover on System.debug shows documentation
   - Go-to-definition works for String methods

---

## Appendix: File Change Summary

| File | Changes Required |
|------|-----------------|
| `packages/apex-parser-ast/src/types/symbol.ts` | Add reconstructSymbol(), reconstructLocation(), reconstructKey() helpers; rewrite fromJSON() |
| `packages/apex-parser-ast/src/utils/resourceLoader.ts` | Return boolean from loadArtifactsFromBuffer(); atomic swap pattern; update constructor |
| `packages/lsp-compliant-services/src/services/DocumentProcessingService.ts` | Fix timer type; add reset()/dispose(); fix race condition |
| `packages/apex-ls/esbuild.config.ts` | Use base64 encoding; add file existence check |
| `packages/apex-ls/src/server/LCSAdapter.ts` | Add ResourceLoaderStatus type; update promise handling |
| `packages/custom-services/src/std-lib-data.ts` | Add documentation header |
| `packages/custom-services/src/std-lib-artifacts.ts` | Add documentation header |
| `packages/custom-services/src/index.ts` | Handle getter object from esbuild |

---

*Document generated: December 19, 2025*  
*Last updated: December 19, 2025*

