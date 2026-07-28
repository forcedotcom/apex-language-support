# Design: Defer Cross-File Resolution During Workspace Load

## Problem
With 600 Apex classes, cross-file reference resolution dominates workspace load time:
- Current: ~82ms avg per file for `resolveCrossFileReferencesForFile`
- At 600 files: ~49 seconds just for resolution
- Measured bottleneck: `dataOwner.update.resolveCrossFile` = 745ms / 9 files = 95% of processing time

## Root Cause
`ApexSymbolManager.addSymbolTable()` calls `resolveCrossFileReferencesForFile()` immediately when a file has unresolved supertype edges (extends/implements). During workspace batch load:
1. Files write-back one at a time to dataOwner (serial)
2. Each write-back triggers resolution
3. Resolution may trigger cascading operations (findMissingArtifact, dependency loads)
4. Total time = N files × (merge + resolve + cascades) executed serially

## Solution: Defer Resolution During Workspace Load

Track workspace load sessions and skip immediate resolution during batch operations. Resolve everything in one post-batch pass via `DrainDeferredReferences`.

### Implementation

#### 1. Add ISymbolManager interface methods
**File:** `packages/apex-parser-ast/src/types/ISymbolManager.ts`

```typescript
interface ISymbolManager {
  // ... existing methods ...
  
  /**
   * Begin a workspace load session - defers cross-file resolution
   * until endWorkspaceSession() is called.
   */
  beginWorkspaceSession(sessionId: string): void;
  
  /**
   * End workspace load session and process all deferred resolutions.
   * Returns count of files resolved.
   */
  endWorkspaceSession(sessionId: string): Promise<number>;
  
  /**
   * Check if workspace load is currently active.
   */
  isWorkspaceSessionActive(): boolean;
}
```

#### 2. Implement in ApexSymbolManager
**File:** `packages/apex-parser-ast/src/symbols/ApexSymbolManager.ts`

```typescript
export class ApexSymbolManager implements ISymbolManager {
  // ... existing fields ...
  
  private workspaceSessionId: string | null = null;
  private deferredResolutions: Set<string> = new Set();
  
  beginWorkspaceSession(sessionId: string): void {
    this.logger.info(`[SYMBOL-MANAGER] Begin workspace session: ${sessionId}`);
    this.workspaceSessionId = sessionId;
    this.deferredResolutions.clear();
  }
  
  endWorkspaceSession(sessionId: string): Promise<number> {
    if (this.workspaceSessionId !== sessionId) {
      this.logger.warn(
        `[SYMBOL-MANAGER] Session mismatch: active=${this.workspaceSessionId}, end=${sessionId}`
      );
      return Promise.resolve(0);
    }
    
    const filesCount = this.deferredResolutions.size;
    this.logger.info(
      `[SYMBOL-MANAGER] End workspace session ${sessionId}: ` +
      `resolving ${filesCount} deferred files`
    );
    
    // Resolve all deferred files
    const resolutions = Array.from(this.deferredResolutions).map(uri =>
      Effect.runPromise(this.resolveCrossFileReferencesForFile(uri))
    );
    
    this.workspaceSessionId = null;
    this.deferredResolutions.clear();
    
    return Promise.all(resolutions).then(() => filesCount);
  }
  
  isWorkspaceSessionActive(): boolean {
    return this.workspaceSessionId !== null;
  }
  
  // Modify addSymbolTable to defer during workspace load:
  async addSymbolTable(
    symbolTable: SymbolTable,
    fileUri: string,
    documentVersion?: number,
    hasErrors?: boolean,
  ): Promise<void> {
    // ... existing registration logic ...
    
    const hasUnresolvedSupertypeEdge = finalSymbolTable
      .getAllReferences()
      .some(
        (r) =>
          !r.resolvedSymbolId &&
          (r.context === ReferenceContext.INHERITANCE ||
            r.context === ReferenceContext.INTERFACE_IMPLEMENTATION),
      );
    
    if (hasUnresolvedSupertypeEdge) {
      if (this.isWorkspaceSessionActive()) {
        // Defer resolution until workspace load completes
        this.deferredResolutions.add(normalizedUri);
        this.logger.debug(
          `[SYMBOL-MANAGER] Deferred resolution for ${normalizedUri} ` +
          `(workspace session active)`
        );
      } else {
        // Immediate resolution for interactive operations
        yield* self.resolveCrossFileReferencesForFile(normalizedUri);
      }
    }
  }
}
```

#### 3. Integrate with worker handlers
**File:** `packages/apex-ls/src/worker.platform.shared.ts`

**WorkspaceBatchIngest handler:**
```typescript
WorkspaceBatchIngest: (req) =>
  guardRole('WorkspaceBatchIngest').pipe(
    Effect.flatMap(() =>
      dataOwnerWrite(
        Effect.gen(function* () {
          const svc = yield* ensureDataOwnerServices;
          
          // Begin workspace session - defers resolution
          svc.symbolManager.beginWorkspaceSession(req.sessionId);
          
          // ... existing document storage logic ...
          
          return { processedCount: req.entries.length };
        }),
        // ... existing span config ...
      )
    )
  ),
```

**DrainDeferredReferences handler:**
```typescript
DrainDeferredReferences: (req) =>
  guardRole('DrainDeferredReferences').pipe(
    Effect.flatMap(() =>
      dataOwnerWrite(
        Effect.gen(function* () {
          const svc = yield* ensureDataOwnerServices;
          
          // End workspace session and resolve all deferred files
          const resolvedCount = yield* Effect.promise(() =>
            svc.symbolManager.endWorkspaceSession(req.sessionId)
          );
          
          yield* Effect.logInfo(
            `[DATA-OWNER] DrainDeferredReferences: session=${req.sessionId}, ` +
            `resolved=${resolvedCount} files`
          );
          
          return { processedCount: resolvedCount };
        }),
        // ... span config ...
      )
    )
  ),
```

#### 4. Wire schema changes
**File:** `packages/apex-lsp-shared/src/workerWireSchemas.ts`

DrainDeferredReferences already exists but needs sessionId:

```typescript
export class DrainDeferredReferences extends Schema.TaggedRequest<DrainDeferredReferences>()(
  'DrainDeferredReferences',
  {
    success: Schema.Struct({
      processedCount: Schema.Number,
    }),
    failure: Schema.Struct({
      _tag: Schema.Literal('DrainDeferredReferencesError'),
      message: Schema.String,
    }),
    payload: {
      sessionId: Schema.String,  // ADD THIS
    },
  },
) {}
```

#### 5. Coordinator dispatch
**File:** `packages/apex-ls/src/server/WorkspaceBatchHandler.ts` or wherever DrainDeferredReferences is called

Ensure sessionId is passed:
```typescript
await topology.dataOwner.executeEffect(
  new DrainDeferredReferences({ sessionId })
);
```

### Expected Performance Impact

**Before (600 files):**
- Serial: 600 files × 82ms avg = ~49 seconds just for resolution
- Plus cascading operations (findMissingArtifact, etc.)
- Total: 50+ seconds

**After:**
- Compile + merge: 600 files × 4ms merge = ~2.4 seconds (serial floor)
- Deferred resolution: batch process 600 files in one pass
  - No cascading operations during load
  - Can potentially parallelize resolution
  - Estimated: 5-10 seconds total

**Target: 7-12 second workspace load for 600 files (10-15x faster)**

### Testing Strategy

1. Unit tests: `ApexSymbolManager.beginWorkspaceSession()` / `endWorkspaceSession()`
2. Integration test: Verify resolution is deferred during batch, executed during drain
3. E2E test: Large workspace (100+ files) shows deferred resolution count
4. Regression: Ensure interactive operations (didOpen/didChange) still resolve immediately

### Migration Notes

- No wire protocol version bump needed (DrainDeferredReferences already exists, just adding optional sessionId)
- Backward compatible: If sessionId missing, behaves as before
- Feature flag: Could add `apex.experimental.deferWorkspaceResolution` setting if needed
