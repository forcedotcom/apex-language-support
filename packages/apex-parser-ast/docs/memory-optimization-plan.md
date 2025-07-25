# Memory Optimization Plan for Symbol Storage

## Executive Summary

This document outlines a comprehensive plan to reduce memory usage in the Apex symbol storage system by approximately **80%** while maintaining or improving performance. The optimization targets the `ApexSymbolManager` and related components that currently consume excessive memory due to multiple cache layers, heavy object structures, and storage duplication.

**Key Innovation**: Integration of a custom `defineEnum` utility that provides memory-efficient, type-safe enum alternatives to traditional string enums.

## Current State Analysis

### Memory Consumption Issues

#### 1. Multiple Cache Layers (High Impact - 70MB waste for 10K symbols)

- **7 different HashMap caches** with 10,000 entry limits each
- Cache types: `symbolCache`, `relationshipCache`, `metricsCache`, `lazyMetrics`, `lazyAnalysis`, `symbolLookupCache`, `fqnLookupCache`, `fileLookupCache`, `relationshipTypeCache`, `patternMatchCache`, `statsCache`, `analysisCache`
- **Problem**: Each cache stores full symbol objects, creating massive duplication
- **Impact**: ~70MB memory waste for 10,000 symbols

#### 2. Heavy Symbol Objects (High Impact - 40% overhead)

- `ApexSymbol` interface with large optional fields
- `SymbolModifiers` object with 12 boolean properties (could be bit flags)
- `SymbolKind` enum as strings (could be numbers) - **CRITICAL ISSUE**
- **Problem**: String enum values consume excessive memory and lack type safety
- **Impact**: ~40% of symbol storage is overhead

#### 3. Storage Duplication (Medium Impact - 30% waste)

- Symbols stored in both `symbolCache` and `symbolGraph`
- Full `SymbolTable` objects alongside lightweight metadata
- **Problem**: Same data stored in multiple formats
- **Impact**: ~30% memory duplication

#### 4. Inefficient WeakRef Usage (Low Impact)

- `symbolReferencePool` not effectively reducing memory
- Complex reference management with minimal benefit
- **Problem**: Over-engineered solution with little payoff

#### 5. Graph Storage Overhead (Medium Impact)

- Graphology graph storing full symbol objects
- Multiple relationship caches for different query types

### Current Memory Usage Baseline

| Symbol Count | Current Memory | Heap Usage | Memory Pressure | Notes             |
| ------------ | -------------- | ---------- | --------------- | ----------------- |
| 1,000        | 66MB           | 73%        | MEDIUM          | Linear growth     |
| 10,000       | 85MB           | 78%        | HIGH            | Cache bloat       |
| 50,000       | 192MB          | 89%        | HIGH            | Critical pressure |
| 100,000      | 340MB          | 92%        | CRITICAL        | Memory exhaustion |

## Optimization Strategy

### Phase 1: Symbol Object Optimization (High Impact - 60% reduction)

#### 1.1 Custom Enum System (NEW - High Impact)

**Problem**: Traditional string enums consume excessive memory and lack type safety
**Solution**: Implement custom `defineEnum` utility for memory-efficient, type-safe enums

```typescript
import { z } from 'zod';

type EnumPrimitive = string | number | boolean | symbol;
type EnumEntry = readonly [string, EnumPrimitive?];

type EnumLike<T extends readonly EnumEntry[]> = {
  readonly [K in T[number] as K[0]]: K[1] extends undefined ? number : K[1];
} & {
  readonly [
    V in T[number] extends [any, infer Val]
      ? Val extends undefined
        ? number
        : Val
      : never
  ]: Extract<T[number], [infer K, any]> extends [infer K, any]
    ? K extends string
      ? K
      : never
    : never;
};

type EnumSchemas<T extends readonly EnumEntry[]> = {
  keySchema: z.ZodUnion<{
    [K in T[number] as K[0]]: z.ZodLiteral<K[0]>
  }[T[number] as T[number][0]][]>;
  valueSchema: z.ZodUnion<{
    [V in T[number] as V[1] extends undefined ? number : V[1]]: z.ZodLiteral<
      V[1] extends undefined ? number : V[1]
    >
  }[T[number] as T[number][1] extends undefined ? number : T[number][1]][]>;
};

export function defineEnum<
  const T extends readonly EnumEntry[]
>(entries: T): EnumLike<T> & EnumSchemas<T> {
  const result: any = {};
  const keys: string[] = [];
  const values: EnumPrimitive[] = [];

  entries.forEach(([key, val], i) => {
    const value = val ?? i;

    result[key] = value;
    result[value] = key;

    keys.push(key);
    values.push(value);
  });

  const keySchema = z.union([...keys.map(z.literal)] as any);
  const valueSchema = z.union([...values.map(z.literal)] as any);

  return Object.freeze({
    ...result,
    keySchema,
    valueSchema,
  }) as EnumLike<T> & EnumSchemas<T>;
}
```

**Benefits of Custom Enum System**:

- **Memory Efficiency**: Number values instead of strings (4 bytes vs 8-16 bytes per enum)
- **Type Safety**: Full TypeScript support with bidirectional mapping
- **Validation**: Built-in Zod schemas for runtime validation
- **Performance**: Faster comparisons and lookups
- **Flexibility**: Support for custom values or auto-incrementing numbers

#### 1.2 Optimized Symbol Kinds

```typescript
// Replace current string enum
export enum SymbolKind {
  Class = 'class',
  Interface = 'interface',
  // ... more string values
}

// With memory-efficient enum
export const SymbolKind = defineEnum([
  ['Class', 0],
  ['Interface', 1],
  ['Trigger', 2],
  ['Method', 3],
  ['Constructor', 4],
  ['Property', 5],
  ['Field', 6],
  ['Variable', 7],
  ['Parameter', 8],
  ['Enum', 9],
  ['EnumValue', 10],
] as const);

// Usage: SymbolKind.Class === 0, SymbolKind[0] === 'Class'
```

#### 1.3 Optimized Symbol Visibility

```typescript
// Replace current string enum
export enum SymbolVisibility {
  Public = 'public',
  Private = 'private',
  // ... more string values
}

// With memory-efficient enum
export const SymbolVisibility = defineEnum([
  ['Public', 0],
  ['Private', 1],
  ['Protected', 2],
  ['Global', 3],
  ['Default', 4],
] as const);
```

#### 1.4 Lightweight Symbol Interface

```typescript
interface LightweightSymbol {
  id: string; // Unique identifier
  name: string; // Symbol name
  kind: number; // SymbolKind value (0-10)
  location: SymbolLocation; // Basic location info
  modifiers: number; // Bit flags for modifiers
  visibility: number; // SymbolVisibility value (0-4)
  parentId: string | null; // Parent symbol ID
  filePath: string; // File path
  fqn?: string; // Fully qualified name
  namespace?: string; // Namespace
  _lazy?: {
    // Expensive data (lazy-loaded)
    annotations?: Annotation[];
    identifierLocation?: SymbolLocation;
    superClass?: string;
    interfaces?: string[];
    returnType?: TypeInfo;
    parameters?: string[];
    type?: TypeInfo;
    initialValue?: string;
    values?: string[];
  };
}
```

#### 1.5 Modifier Bit Flags

```typescript
const ModifierFlags = {
  STATIC: 1 << 0, // 000000000001
  FINAL: 1 << 1, // 000000000010
  ABSTRACT: 1 << 2, // 000000000100
  VIRTUAL: 1 << 3, // 000000001000
  OVERRIDE: 1 << 4, // 000000010000
  TRANSIENT: 1 << 5, // 000000100000
  TEST_METHOD: 1 << 6, // 000001000000
  WEB_SERVICE: 1 << 7, // 000010000000
};
```

#### 1.6 Conversion Utilities

```typescript
// Convert ApexSymbol to LightweightSymbol
export const toLightweightSymbol = (
  symbol: ApexSymbol,
  filePath: string,
): LightweightSymbol => {
  // Convert modifiers to bit flags
  let modifiers = 0;
  if (symbol.modifiers.isStatic) modifiers |= ModifierFlags.STATIC;
  if (symbol.modifiers.isFinal) modifiers |= ModifierFlags.FINAL;
  // ... more modifiers

  // Use enum values instead of strings
  const kind = SymbolKind[symbol.kind as keyof typeof SymbolKind];
  const visibility =
    SymbolVisibility[
      symbol.modifiers.visibility as keyof typeof SymbolVisibility
    ];

  return {
    id: symbol.key.unifiedId || generateUnifiedId(symbol.key, filePath),
    name: symbol.name,
    kind,
    visibility,
    location: symbol.location,
    modifiers,
    parentId: symbol.parentKey?.unifiedId || null,
    filePath,
    fqn: symbol.fqn,
    namespace: symbol.namespace,
    // ... lazy data
  };
};

// Convert LightweightSymbol back to ApexSymbol
export const fromLightweightSymbol = (
  lightweight: LightweightSymbol,
  symbolTable: SymbolTable,
): ApexSymbol => {
  // Convert enum values back to strings
  const kind = SymbolKind[lightweight.kind] as SymbolKind;
  const visibility = SymbolVisibility[
    lightweight.visibility
  ] as SymbolVisibility;

  // Convert modifiers back to object
  const modifiers: SymbolModifiers = {
    visibility,
    isStatic: !!(lightweight.modifiers & ModifierFlags.STATIC),
    isFinal: !!(lightweight.modifiers & ModifierFlags.FINAL),
    // ... more modifiers
  };

  // ... rest of conversion
};
```

**Expected Reduction**: 65% per symbol storage (increased from 60% due to enum optimization)

### Phase 2: Cache Consolidation (High Impact - 70% reduction)

#### 2.1 Unified Cache System

```typescript
class ApexSymbolManager {
  // Single unified cache with lightweight symbols
  private unifiedCache: HashMap<string, LightweightSymbol>;
  private cacheTimestamps: HashMap<string, number>;

  // Only essential caches
  private relationshipCache: HashMap<string, ReferenceResult[]>;
  private metricsCache: HashMap<string, SymbolMetrics>;

  // Lazy loading for expensive operations
  private lazyMetrics: HashMap<string, Promise<SymbolMetrics>>;
  private lazyAnalysis: HashMap<string, Promise<DependencyAnalysis>>;
}
```

#### 2.2 Reduced Cache Limits

- `MAX_CACHE_SIZE`: 10,000 → 5,000 (50% reduction)
- `CACHE_TTL`: 5 minutes → 3 minutes (40% reduction)
- Remove redundant caches: `symbolLookupCache`, `fqnLookupCache`, `fileLookupCache`, `patternMatchCache`, `statsCache`, `analysisCache`

#### 2.3 Smart Cache Invalidation

- Pattern-based invalidation
- Periodic cleanup (every 100 symbols added)
- LRU eviction for least-used entries

**Expected Reduction**: 70% cache memory usage

### Phase 3: Storage Deduplication (Medium Impact - 30% reduction)

#### 3.1 Single Source of Truth

- Store symbols only in lightweight cache
- Graph stores only references/IDs, not full objects
- Remove duplicate SymbolTable storage

#### 3.2 Lazy Loading Strategy

- Load full symbol objects only when needed
- Cache expensive computations (metrics, relationships)
- Background computation for non-critical data

#### 3.3 File Metadata Optimization

```typescript
interface FileMetadata {
  filePath: string;
  symbolCount: number;
  scopeCount: number;
  lastUpdated: number;
  scopeHierarchy: ScopeNode[]; // Lightweight scope info only
}
```

**Expected Reduction**: 30% storage duplication

### Phase 4: Advanced Memory Management (Low Impact - 10% reduction)

#### 4.1 Memory Pooling

- Object pooling for frequently created objects
- Efficient WeakRef usage for shared references

#### 4.2 Predictive Cache Management

- LRU eviction for least-used symbols
- Background cleanup of expired entries
- Memory pressure-based cache reduction

#### 4.3 Memory Monitoring

```typescript
interface MemoryStats {
  totalSymbols: number;
  totalCacheEntries: number;
  estimatedMemoryUsage: number;
  memoryOptimizationLevel: string;
  cacheEfficiency: number;
  recommendations: string[];
}
```

**Expected Reduction**: 10% additional optimization

## Implementation Plan

### Week 1: Phase 1 - Lightweight Symbols

#### Day 1: Custom Enum System

- [ ] Create `defineEnum` utility in `src/utils/enumUtils.ts`
- [ ] Add comprehensive unit tests for enum functionality
- [ ] Document enum usage patterns and benefits

#### Day 2: Enum Migration

- [ ] Replace `SymbolKind` enum with `defineEnum` implementation
- [ ] Replace `SymbolVisibility` enum with `defineEnum` implementation
- [ ] Update all references to use new enum system

#### Day 3-4: Lightweight Symbol Types

- [ ] Create `LightweightSymbol` interface
- [ ] Implement `ModifierFlags` bit flags
- [ ] Add conversion utilities to `symbol.ts`

#### Day 5: Conversion Logic

- [ ] Implement `toLightweightSymbol()` function
- [ ] Implement `fromLightweightSymbol()` function
- [ ] Add unit tests for conversion utilities

**Deliverables**: Memory-efficient enum system with 65% symbol storage reduction

### Week 2: Phase 2 - Cache Consolidation

#### Day 1-2: Unified Cache

- [ ] Replace multiple caches with `unifiedCache`
- [ ] Implement smart cache invalidation
- [ ] Update cache size limits and TTL

#### Day 3-4: Cache Optimization

- [ ] Remove redundant cache layers
- [ ] Implement LRU eviction
- [ ] Add periodic cleanup logic

#### Day 5: Performance Testing

- [ ] Benchmark cache performance
- [ ] Measure memory reduction
- [ ] Validate cache hit rates

**Deliverables**: Unified cache system with 70% cache memory reduction

### Week 3: Phase 3 - Storage Deduplication

#### Day 1-2: Single Source of Truth

- [ ] Remove duplicate symbol storage
- [ ] Update graph to use symbol IDs only
- [ ] Optimize file metadata storage

#### Day 3-4: Lazy Loading

- [ ] Implement lazy loading for expensive data
- [ ] Add background computation for metrics
- [ ] Optimize relationship storage

#### Day 5: Integration Testing

- [ ] Test with large codebases
- [ ] Validate memory reduction
- [ ] Performance regression testing

**Deliverables**: Deduplicated storage with 30% reduction

### Week 4: Phase 4 - Advanced Optimizations

#### Day 1-2: Memory Pooling

- [ ] Implement object pooling
- [ ] Optimize WeakRef usage
- [ ] Add memory pressure detection

#### Day 3-4: Predictive Management

- [ ] Implement LRU eviction
- [ ] Add background cleanup
- [ ] Memory monitoring system

#### Day 5: Final Optimization

- [ ] Performance tuning
- [ ] Memory usage validation
- [ ] Documentation updates

**Deliverables**: Advanced memory management with 10% additional reduction

### Week 5: Testing and Validation

#### Day 1-2: Comprehensive Testing

- [ ] Memory usage benchmarks
- [ ] Performance regression testing
- [ ] Large-scale codebase testing

#### Day 3-4: Optimization Tuning

- [ ] Fine-tune cache parameters
- [ ] Optimize based on test results
- [ ] Performance optimization

#### Day 5: Documentation and Rollout

- [ ] Update documentation
- [ ] Create migration guide
- [ ] Prepare for production rollout

**Deliverables**: Production-ready optimized system

## Expected Results

### Memory Reduction Targets

| Phase    | Target Reduction | Cumulative Reduction | Memory Usage (10K symbols) |
| -------- | ---------------- | -------------------- | -------------------------- |
| Baseline | -                | -                    | 85MB                       |
| Phase 1  | 65%              | 65%                  | 30MB                       |
| Phase 2  | 70%              | 84%                  | 14MB                       |
| Phase 3  | 30%              | 89%                  | 9MB                        |
| Phase 4  | 10%              | 90%                  | 9MB                        |

### Performance Impact

| Metric         | Current | Optimized | Change           |
| -------------- | ------- | --------- | ---------------- |
| Symbol Lookup  | 0.025ms | 0.018ms   | +28% faster      |
| Cache Hit Rate | 60%     | 85%       | +42% improvement |
| Memory Usage   | 85MB    | 9MB       | -89% reduction   |
| Startup Time   | 2.1s    | 1.2s      | -43% faster      |

### Memory Usage Projections

| Symbol Count | Current Memory | Optimized Memory | Reduction |
| ------------ | -------------- | ---------------- | --------- |
| 1,000        | 66MB           | 7MB              | 89%       |
| 10,000       | 85MB           | 9MB              | 89%       |
| 50,000       | 192MB          | 21MB             | 89%       |
| 100,000      | 340MB          | 37MB             | 89%       |

## Risk Assessment

### Low Risk

- ✅ Custom enum system (backward compatible with conversion utilities)
- ✅ Lightweight symbol conversion (gradual migration)
- ✅ Cache consolidation (non-breaking)
- ✅ Memory monitoring (non-breaking)

### Medium Risk

- ⚠️ Graph storage changes (requires testing)
- ⚠️ Cache invalidation logic (performance impact)
- ⚠️ Enum migration (requires careful testing of all enum usages)

### High Risk

- 🔴 Breaking changes in symbol access patterns
- 🔴 Performance regression in edge cases

### Mitigation Strategies

#### 1. Gradual Migration

- Implement alongside existing system
- Feature flags for progressive rollout
- A/B testing for performance validation

#### 2. Comprehensive Testing

- Memory usage benchmarks
- Performance regression testing
- Large-scale codebase validation
- Enum usage validation across all code paths

#### 3. Rollback Plan

- Keep old implementation as fallback
- Quick rollback mechanism
- Monitoring and alerting

#### 4. Documentation

- Migration guide for users
- Performance tuning guide
- Troubleshooting documentation
- Enum usage documentation

## Success Criteria

### Primary Metrics

- [ ] **Memory Reduction**: ≥85% reduction in memory usage
- [ ] **Performance**: No regression in symbol lookup performance
- [ ] **Cache Efficiency**: ≥80% cache hit rate
- [ ] **Startup Time**: ≤50% reduction in startup time

### Secondary Metrics

- [ ] **Code Quality**: Maintain or improve code maintainability
- [ ] **Backward Compatibility**: 100% compatibility with existing APIs
- [ ] **Documentation**: Complete documentation updates
- [ ] **Test Coverage**: ≥90% test coverage for new code

### Acceptance Criteria

- [ ] Memory usage stays below 50MB for 10K symbols
- [ ] Symbol lookup performance < 1ms for 100K symbols
- [ ] No memory leaks in 24-hour stress test
- [ ] Successful migration of existing codebases
- [ ] All enum usages work correctly with new system

## Monitoring and Validation

### Memory Monitoring

```typescript
interface MemoryMetrics {
  totalSymbols: number;
  totalCacheEntries: number;
  estimatedMemoryUsage: number;
  memoryOptimizationLevel: string;
  cacheEfficiency: number;
  heapUsage: number;
  garbageCollectionCount: number;
  memoryPressureLevel: string;
  enumMemorySavings: number; // NEW: Track enum optimization benefits
}
```

### Performance Monitoring

```typescript
interface PerformanceMetrics {
  symbolLookupTime: number;
  cacheHitRate: number;
  startupTime: number;
  memoryAllocationRate: number;
  garbageCollectionTime: number;
  enumConversionTime: number; // NEW: Track enum conversion performance
}
```

### Alerting Thresholds

- Memory usage > 100MB for 10K symbols
- Cache hit rate < 70%
- Symbol lookup time > 1ms
- Memory pressure level = CRITICAL
- Enum conversion time > 0.1ms

## Conclusion

This memory optimization plan targets a **90% reduction** in memory usage while improving performance and maintaining backward compatibility. The integration of the custom `defineEnum` utility provides significant memory savings and type safety improvements.

The optimization will enable the system to handle much larger codebases efficiently, improve startup times, and reduce resource consumption across all deployment scenarios.

**Key Benefits of Custom Enum System**:

- **Memory Efficiency**: 50-75% reduction in enum storage
- **Type Safety**: Full TypeScript support with bidirectional mapping
- **Performance**: Faster comparisons and lookups
- **Validation**: Built-in Zod schemas for runtime validation
- **Flexibility**: Support for custom values or auto-incrementing numbers

**Next Steps**:

1. Review and approve this plan
2. Begin Phase 1 implementation with custom enum system
3. Set up monitoring and validation framework
4. Execute phased rollout with testing at each stage
