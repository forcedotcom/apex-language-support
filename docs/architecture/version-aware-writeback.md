# Version-Aware Write-Back Protocol

## Overview

The version-aware write-back protocol enables enrichment workers to enrich symbol tables locally (CPU-intensive work) and write enriched results back to the data-owner worker. This solves the single-worker performance bottleneck by distributing enrichment across multiple workers while maintaining a single data owner.

## Architecture Pattern

```
┌─────────────────┐
│  Data Owner     │ ◄─── Single Writer (version-aware cache)
│  Worker         │
└────────┬────────┘
         │
         │ QuerySymbolSubset (read)
         │ UpdateSymbolSubset (write-back)
         │
    ┌────┴─────┬──────────┬───────────┐
    │          │          │           │
┌───▼────┐ ┌──▼─────┐ ┌──▼─────┐ ┌──▼─────┐
│Enrich  │ │Enrich  │ │Enrich  │ │Enrich  │
│Worker 1│ │Worker 2│ │Worker 3│ │Worker N│
└────────┘ └────────┘ └────────┘ └────────┘
   │           │          │          │
   └───────────┴──────────┴──────────┘
         Enrichment Pool
```

## Core Concepts

### 1. Single Data Owner (Writer)

- **One** data-owner worker owns the canonical symbol data
- Maintains version-aware `DocumentStateCache`
- Tiered queue prioritizes reads over writes (prevents starvation)
- Validates all incoming write-back requests

### 2. Enrichment Workers (Readers + Enrichers)

- **Multiple** enrichment workers handle LSP requests (hover, definition, etc.)
- Load symbol data from data owner (via `QuerySymbolSubset`)
- Enrich locally using `PrerequisiteOrchestrationService` and `LayerEnrichmentService`
- Write enriched results back to data owner (via `UpdateSymbolSubset`)

### 3. Version Awareness

Every symbol table has:
- `documentVersion`: increments on document change
- `detailLevel`: tracks enrichment completeness (`public-api` → `protected` → `private` → `full`)

Write-back requests are validated:
```typescript
if (currentDoc.version !== req.documentVersion) {
  // REJECT: Document changed during enrichment
  return { accepted: false, versionMismatch: true };
}
```

### 4. Progressive Enrichment

Detail levels follow a strict ordering:
```
public-api (1) → protected (2) → private (3) → full (4)
```

Write-backs are accepted only when enriching to a **higher** level:
```typescript
if (enrichedOrder <= currentOrder) {
  // REJECT: Already have equal or better enrichment
  return { accepted: false };
}
```

## Wire Protocol

### QuerySymbolSubset (Read)

**Request:**
```typescript
{
  uris: string[]
}
```

**Response:**
```typescript
{
  entries: Record<string, SymbolTable | null>,
  versions: Record<string, number>,
  detailLevels: Record<string, DetailLevel>
}
```

### UpdateSymbolSubset (Write-Back)

**Request:**
```typescript
{
  uri: string,
  documentVersion: number,
  enrichedSymbolTable: SerializedSymbolTable,
  enrichedDetailLevel: DetailLevel,
  sourceWorkerId: string
}
```

**Response:**
```typescript
{
  accepted: boolean,
  merged: number,          // Symbol count merged
  versionMismatch: boolean // Rejection reason
}
```

## Validation Rules

Data owner **REJECTS** write-back when:

1. **Document Missing**: `!currentDoc`
   - Response: `{ accepted: false, versionMismatch: false }`

2. **Version Mismatch**: `currentDoc.version !== req.documentVersion`
   - Response: `{ accepted: false, versionMismatch: true }`
   - Document changed during enrichment

3. **Detail Level Not Higher**: `enrichedOrder <= currentOrder`
   - Response: `{ accepted: false, versionMismatch: false }`
   - Already have equal or better enrichment

Data owner **ACCEPTS** write-back when:
- Document exists
- Version matches
- Detail level is strictly higher

## Enrichment Worker Flow

```typescript
// 1. Load symbol data from data owner
const { version, detailLevel } = await loadSymbolDataForEnrichment(
  svc,
  uri,
  content
);

// 2. Process request (enrichment happens here)
const result = await svc.hoverService.processHover({ ... });

// 3. Determine required enrichment level
const requiredLevel = 'full'; // hover needs full detail
const needsEnrichment = shouldEnrich(detailLevel, requiredLevel);

// 4. Write back if enrichment occurred
if (needsEnrichment) {
  await writeBackEnrichedSymbols(svc, uri, version, requiredLevel);
}

return result;
```

## Observability

### Metrics (Data Owner)

```typescript
interface WriteBackMetrics {
  attempted: number;                 // Total write-back requests
  accepted: number;                  // Successful merges
  rejectedVersionMismatch: number;   // Stale versions
  rejectedDocumentMissing: number;   // Document not found
  rejectedDetailLevel: number;       // Already enriched
  totalSymbolsMerged: number;        // Total symbol count merged
}
```

Access via:
```typescript
import { getWriteBackMetrics } from './worker.platform';
const metrics = getWriteBackMetrics();
```

### Logging

**Data Owner:**
```
[DATA-OWNER] Write-back accepted: 42 symbols merged at full level for file:///Foo.cls (from worker-12345)
[DATA-OWNER] Write-back rejected: version mismatch (current=5, update=4) for file:///Bar.cls
```

**Enrichment Worker:**
```
[ENRICHMENT] Write-back accepted: 42 symbols, full level, file:///Foo.cls (v5, 123ms)
[ENRICHMENT] Write-back rejected: 42 symbols, full level, file:///Bar.cls (v4, 87ms) [version mismatch]
```

## Performance Characteristics

### Write-Back Latency

Typical latency: **50-150ms** (includes serialization, coordinator routing, deserialization, merge)

### Rejection Scenarios

1. **Fast Edit Cycles**: User edits document rapidly
   - Enrichment completes after document version incremented
   - Write-back rejected with `versionMismatch: true`
   - Next request will use fresh version

2. **Concurrent Enrichment**: Multiple workers enrich same file
   - First write-back accepted
   - Subsequent write-backs rejected (already have higher detail level)
   - No wasted work on data owner

3. **Document Close**: Document closed during enrichment
   - Write-back rejected with `rejectedDocumentMissing`
   - No impact on data owner state

## Testing

See `packages/apex-ls/test/server/WorkerCoordinator.test.ts`:

```typescript
it('data-owner handles UpdateSymbolSubset and rejects when document not found', ...)
it('data-owner rejects UpdateSymbolSubset when detail level is not higher', ...)
it('data-owner handles QuerySymbolSubset with version metadata', ...)
```

## Future Optimizations

### Phase 7: Performance (Not Yet Implemented)

1. **Batching**: Group multiple write-backs into single request
2. **Debouncing**: Delay write-back for fast edit cycles
3. **Selective Merge**: Only merge changed symbols (delta updates)
4. **Compression**: Compress serialized symbol tables over wire
5. **Priority Queue**: Prioritize write-backs by LSP request type

## References

- Wire schemas: `packages/apex-lsp-shared/src/workerWireSchemas.ts`
- Data owner handler: `packages/apex-ls/src/worker.platform.ts` (UpdateSymbolSubset)
- Enrichment worker: `packages/apex-ls/src/worker.platform.ts` (writeBackEnrichedSymbols)
- Coordinator routing: `packages/apex-ls/src/server/WorkerCoordinator.ts` (queryDataOwner)
- Original enrichment patterns: `packages/lsp-compliant-services/src/services/LayerEnrichmentService.ts`
