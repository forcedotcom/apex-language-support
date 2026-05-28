# Completions Investigation - Symbol Manager API Surface and Prerequisite Mapping

**Work Item:** W-22698689  
**Date:** 2026-05-28  
**Status:** Research complete

---

## 1. Symbol Manager Location and Architecture

### Primary Interface

**File:** `packages/apex-parser-ast/src/types/ISymbolManager.ts`

The `ISymbolManager` interface (lines 68-209) defines the full contract for symbol management. It extends `SymbolProvider` (from `namespace/NamespaceUtils.ts`).

### Primary Implementation

**File:** `packages/apex-parser-ast/src/symbols/ApexSymbolManager.ts`

The `ApexSymbolManager` class (~6000 lines) implements `ISymbolManager` and `SymbolProvider`. It is the main production symbol/type management layer.

### Singleton Access Pattern

**File:** `packages/apex-parser-ast/src/symbols/ApexSymbolProcessingManager.ts`

`ApexSymbolProcessingManager` is a singleton that wraps `ApexSymbolManager` and adds queued background processing via `ApexSymbolIndexingIntegration`. Access pattern:

```typescript
const processingManager = ApexSymbolProcessingManager.getInstance();
const symbolManager = processingManager.getSymbolManager();
```

### GlobalTypeRegistry (O(1) Type Lookup)

**File:** `packages/apex-parser-ast/src/services/GlobalTypeRegistryService.ts`

An Effect-TS service that provides O(1) type resolution by FQN or unqualified name, with namespace-aware disambiguation. Backed by `CaseInsensitiveHashMap` indexes (fqnIndex, nameIndex, fileIndex). Used by the symbol manager to register both stdlib and user types.

---

## 2. API Surface for Completions

### 2.1 Looking Up Types by Name or Prefix

| Method | File | Line | Description |
|--------|------|------|-------------|
| `findSymbolByName(name)` | ApexSymbolManager.ts | 575 | Case-insensitive name search via `symbolRefManager.findSymbolByName()`. Returns `ApexSymbol[]`. |
| `findSymbolByFQN(fqn)` | ApexSymbolManager.ts | 610 | Lookup by fully qualified name. Returns single match. |
| `findSymbolsByFQN(fqn)` | ApexSymbolManager.ts | 627 | Returns ALL symbols with a given FQN (duplicate detection). |
| `getAllSymbolsForCompletion()` | ApexSymbolManager.ts | 1129 | Returns all symbols across all tracked files (iterates fileMetadata). |
| `resolveSymbol(name, context)` | ApexSymbolManager.ts | 938 | Context-aware resolution with disambiguation for ambiguous matches. |
| `GlobalTypeRegistry.resolveType(name, options)` | GlobalTypeRegistryService.ts | 250 | O(1) unqualified or qualified type lookup with namespace priority. |
| `GlobalTypeRegistry.getTypesInNamespace(ns)` | GlobalTypeRegistryService.ts | 302 | Get all types in a namespace (useful for namespace completions). |

**Gap:** There is no `findSymbolByPrefix(prefix)` API. The current approach either matches by exact name or returns ALL symbols. A prefix/fuzzy search would significantly improve completion performance.

### 2.2 Getting Members (Fields, Methods, Properties) of a Type

The symbol system uses a `parentId`-based containment model. Members of a type are symbols whose `parentId` equals the type's `id`.

| Method | File | Line | Description |
|--------|------|------|-------------|
| `SymbolTable.getSymbolsInScope(scopeId)` | symbol.ts | 1611 | Returns all symbols with `parentId === scopeId`. This is how you get members of a class. |
| `SymbolTable.getAllSymbols()` | symbol.ts | 1754 | Returns the flat array of all symbols; filter by `parentId` for members. |
| `findSymbolsInFile(fileUri)` | ApexSymbolManager.ts | 634 | Get all symbols in a file; filter by `parentId` to get class members. |
| `resolveMemberInContext(self, context, memberName, memberType)` | ops/chainResolution.ts | 1696 | Resolves a specific member on a type (used by chained/dot resolution). Handles variable type resolution, stdlib lazy-loading. |

**Gap:** There is no direct `getMembersOfType(typeSymbol)` method on `ISymbolManager`. You must:
1. Get the file containing the type (`findFilesForSymbol` or `symbol.fileUri`)
2. Get all symbols in that file (`findSymbolsInFile`)
3. Filter by `parentId === typeSymbol.id`

This is an essential missing API for dot-completion.

### 2.3 Resolving Type Hierarchies (Supertypes, Interfaces)

| Method/Field | File | Line | Description |
|--------------|------|------|-------------|
| `TypeSymbol.superClass` | symbol.ts | 539 | String name of superclass (e.g., "Parent"). |
| `TypeSymbol.interfaces` | symbol.ts | 547 | String array of implemented/extended interfaces. |
| `getContainingType(symbol)` | ops/typeHierarchy.ts | 19 | Effect-based: walks parentId chain to find containing class/interface/enum. |
| `getAncestorChain(symbol)` | ops/typeHierarchy.ts | 39 | Gets array of ancestor symbols. |
| `constructFQN(symbol, options)` | ops/typeHierarchy.ts | 45 | Constructs FQN via parent traversal. |
| `ISymbolManager.getContainingType(symbol)` | ISymbolManager.ts | 149 | Exposed on interface. |
| `ISymbolManager.getAncestorChain(symbol)` | ISymbolManager.ts | 151 | Exposed on interface. |

**Gap:** Resolving the `superClass` string to an actual `ApexSymbol` requires a separate `findSymbolByName` call. There is no built-in `getSuperclassSymbol(type)` or `getInheritedMembers(type)` that traverses the hierarchy and aggregates inherited members. This would be critical for showing inherited methods/fields in completions.

### 2.4 Namespace/Scope Resolution

| Method | File | Line | Description |
|--------|------|------|-------------|
| `SymbolProvider.findInDefaultNamespaceOrder(name, referencingType)` | NamespaceUtils.ts | 228 | Resolve unqualified name using implicit namespace rules. |
| `SymbolProvider.findInExplicitNamespace(ns, typeName, ref)` | NamespaceUtils.ts | 236 | Resolve qualified name in explicit namespace. |
| `SymbolProvider.isBuiltInNamespace(name)` | NamespaceUtils.ts | 241 | Check if name is a builtin namespace. |
| `resolveTypeName(...)` | NamespaceUtils.ts | 544 | Full namespace resolution with rule-based strategy. |
| `resolveUnqualifiedReferenceByScope(...)` | ops/symbolRefResolution.ts | 219 | Walks scope hierarchy to resolve name in local context. |
| `createResolutionContext(text, position, fileUri)` | ApexSymbolManager.ts | 983 | Creates rich context including namespace, scope, imports, access modifiers. |

### 2.5 Getting Available Local Variables at a Position

| Method | File | Line | Description |
|--------|------|------|-------------|
| `SymbolTable.getScopeHierarchy(position)` | symbol.ts | (referenced at line 231 of symbolRefResolution.ts) | Returns scope chain from position outward. |
| `resolveUnqualifiedReferenceByScope(...)` | ops/symbolRefResolution.ts | 219 | Walks scope chain finding variables, parameters, methods visible at position. |
| `getSymbolAtPosition(fileUri, position, strategy)` | ApexSymbolManager.ts | 2589 | Returns most specific symbol at a position using scope or precise strategy. |
| `getSymbolAtPositionWithinScope(fileUri, position)` | ApexSymbolManager.ts | 2638 | Scope-based resolution with multiple fallback strategies. |

**Gap:** There is no `getVisibleSymbolsAtPosition(fileUri, position)` API that returns ALL symbols visible in scope (local variables, class members, inherited members, imported types). This is the fundamental API needed for general completions. The existing `resolveUnqualifiedReferenceByScope` resolves a single known name; completions need the inverse: all available names at a position.

---

## 3. Prerequisite State / Readiness

### 3.1 Initialization Chain

1. **ApexSymbolProcessingManager.initialize()** (line 60) - initializes scheduler
2. **SchedulerInitializationService.ensureInitialized()** - shared scheduler
3. **Symbol tables loaded via `addSymbolTable()`** - files parsed and indexed
4. **GlobalTypeRegistry populated** - types registered for O(1) lookup

### 3.2 Detail Levels (Layered Compilation)

**File:** `packages/apex-parser-ast/src/parser/listeners/LayeredSymbolListenerBase.ts`

Symbols are parsed in layers: `'public-api' → 'protected' → 'private' → 'full'`

For completions, the prerequisite mapping requires:
- **Detail Level: `'private'`** (line 60 of LspRequestPrerequisiteMapping.ts)
- References: required
- Cross-file resolution: NOT required
- Execution mode: `async` (don't block completion)
- Workspace load: required (`requiresWorkspaceLoad: true`)

### 3.3 Readiness Signals

| Signal | File | Description |
|--------|------|-------------|
| `isWorkspaceLoaded()` | WorkspaceLoadCoordinator.ts:182 | True after all files indexed at public-api level. |
| `isWorkspaceLoading()` | WorkspaceLoadCoordinator.ts:191 | True during initial workspace scan. |
| `ApexSymbolProcessingManager.isSymbolProcessingAvailable()` | ApexSymbolProcessingManager.ts:183 | True after `initialize()` completes. |
| `DocumentStateCache.hasDetailLevel(uri, version, level)` | DocumentStateCache.ts | Checks if file has been enriched to required level. |
| `SymbolTable.getDetailLevel()` | symbol.ts:1833 | Returns highest detail level of any symbol in the table. |

### 3.4 Prerequisite Orchestration

**File:** `packages/lsp-compliant-services/src/services/PrerequisiteOrchestrationService.ts`

The `CompletionProcessingService` (line 102-114) calls `prerequisiteOrchestrationService.runPrerequisitesForLspRequestType('completion', fileUri)` before processing. This:
1. Checks if workspace is loaded
2. Determines if enrichment is needed (current detail level < 'private')
3. Runs enrichment asynchronously (doesn't block completion)
4. Skips cross-file resolution for completion

### 3.5 Lazy Loading Patterns

- **Stdlib types:** Loaded on-demand via `ResourceLoaderService.getSymbolTable(classPath)` when `resolveMemberInContext` encounters a stdlib type.
- **User types:** Loaded during workspace scan; enriched on-demand when a file is opened.
- **In-flight deduplication:** `inFlightStdlibHydration` map prevents redundant loads; `loadingSymbolTables` set prevents recursive loads.

---

## 4. Existing Completion Implementation

### Handler

**File:** `packages/lsp-compliant-services/src/handlers/CompletionHandler.ts`

Thin handler that delegates to `ICompletionProcessor.processCompletion(params)`.

### Processing Service

**File:** `packages/lsp-compliant-services/src/services/CompletionProcessingService.ts`

Current implementation status: **BASIC/SCAFFOLD**

The `CompletionProcessingService` implements `ICompletionProcessor` and currently:
1. Runs prerequisites (enrichment to 'private' level) - line 102
2. Gets document from storage - line 120
3. Triggers async enrichment if needed - line 134
4. Analyzes completion context (simplified) - line 163
5. Gets candidates via `getCompletionCandidates()` - line 166
6. Converts to LSP `CompletionItem[]` - line 169

**Key Limitations:**
- **Context analysis is a stub** (lines 538-621): `extractCurrentScope`, `extractNamespaceContext`, `isInStaticContext`, `getAccessModifierContext` all use naive string scanning instead of AST-based analysis.
- **Candidate generation is naive** (lines 229-323): Either returns ALL symbols (wildcard `*`) or tries `resolveSymbol(partialMatch, context)`. No dot-completion, no member filtering, no scope-aware filtering.
- **No dot-completion support**: When trigger character is `.`, it pushes `*` (line 342) which returns everything. Does not resolve the type of the expression before the dot.
- **No prefix filtering**: `getPartialMatches` returns the current word or `*`, no actual prefix search.
- **Relationship suggestions are irrelevant** (lines 366-423): Iterates all symbols in the file and looks at method-call relationships - not useful for IDE completions.

---

## 5. Dependency Map - Which APIs Unblock Which Stories

### APIs That Exist and Are Usable

| API | Usable For |
|-----|-----------|
| `findSymbolByName(name)` | Type name completions, import completions |
| `GlobalTypeRegistry.resolveType(name)` | Fast type lookup for dot-completion qualifier resolution |
| `GlobalTypeRegistry.getTypesInNamespace(ns)` | Namespace-qualified completions (e.g., after typing `System.`) |
| `findSymbolsInFile(fileUri)` + parentId filter | Getting members of a class for dot-completion |
| `getSymbolAtPosition(fileUri, pos)` | Determining what's at the cursor for context |
| `createResolutionContext(text, pos, file)` | Building context for filtering candidates |
| `SymbolTable.getScopeHierarchy(position)` | Finding enclosing scope for local completions |
| `resolveUnqualifiedReferenceByScope(...)` | Resolving a specific name in scope |
| `TypeSymbol.superClass` / `.interfaces` | Walking type hierarchy for inherited members |
| `resolveMemberInContext(self, ctx, name, type)` | Resolving a specific member on a type (existing chain resolution) |
| `LayerEnrichmentService.enrichFiles(...)` | On-demand enrichment before completion |
| `PrerequisiteOrchestrationService` | Ensuring readiness before serving completions |

### APIs That Are Missing / Insufficient

| Missing API | Needed For | Priority |
|-------------|-----------|----------|
| `findSymbolsByPrefix(prefix)` | Efficient prefix-based completion filtering | High |
| `getMembersOfType(typeSymbol)` | Dot-completion (get all fields/methods/properties of a type) | Critical |
| `getInheritedMembers(typeSymbol)` | Showing inherited members in dot-completion | High |
| `getVisibleSymbolsAtPosition(fileUri, position)` | General completion (all available names at cursor) | Critical |
| `resolveExpressionType(fileUri, position)` | Dot-completion (resolve type of expression before `.`) | Critical |
| `getCompletionCandidatesForDot(typeSymbol, isStatic, accessContext)` | Filtered dot-completion with visibility/static awareness | High |
| AST-based context analysis (not string-based) | Accurate detection of static context, expected type, trigger kind | Medium |

### Story Dependency Map

Assuming the epic contains stories like:

1. **Basic type name completions** - Unblocked by `findSymbolByName`, `GlobalTypeRegistry.resolveType`. Needs `findSymbolsByPrefix`.
2. **Dot-completion (member access)** - Needs `getMembersOfType`, `resolveExpressionType`, `getInheritedMembers`. Partially unblocked by `resolveMemberInContext` (but that resolves one name, not lists all).
3. **Local variable completions** - Needs `getVisibleSymbolsAtPosition`. Partially unblocked by `SymbolTable.getScopeHierarchy` + manual filtering.
4. **Constructor completions** - Unblocked by `findSymbolByName` + filter by kind. Needs type hierarchy for overloads.
5. **Keyword completions** - No symbol manager dependency; purely grammar/context based.
6. **Import/namespace completions** - Unblocked by `getTypesInNamespace`. Needs prefix search.
7. **Override/implement completions** - Needs `getInheritedMembers` with abstract/virtual filtering.
8. **Signature help integration** - Needs `resolveMemberInContext` for method overload resolution (already exists).

---

## 6. Summary of Key File Paths

| Purpose | Path |
|---------|------|
| Symbol Manager Interface | `packages/apex-parser-ast/src/types/ISymbolManager.ts` |
| Symbol Manager Implementation | `packages/apex-parser-ast/src/symbols/ApexSymbolManager.ts` |
| Processing Manager (singleton) | `packages/apex-parser-ast/src/symbols/ApexSymbolProcessingManager.ts` |
| GlobalTypeRegistry | `packages/apex-parser-ast/src/services/GlobalTypeRegistryService.ts` |
| Symbol Types (ApexSymbol, TypeSymbol, etc.) | `packages/apex-parser-ast/src/types/symbol.ts` |
| SymbolTable class | `packages/apex-parser-ast/src/types/symbol.ts` (line 827) |
| Completion Handler | `packages/lsp-compliant-services/src/handlers/CompletionHandler.ts` |
| Completion Processing Service | `packages/lsp-compliant-services/src/services/CompletionProcessingService.ts` |
| Prerequisite Orchestration | `packages/lsp-compliant-services/src/services/PrerequisiteOrchestrationService.ts` |
| Prerequisite Mapping | `packages/lsp-compliant-services/src/services/LspRequestPrerequisiteMapping.ts` |
| Layer Enrichment Service | `packages/lsp-compliant-services/src/services/LayerEnrichmentService.ts` |
| Workspace Load Coordinator | `packages/lsp-compliant-services/src/services/WorkspaceLoadCoordinator.ts` |
| Chain Resolution (dot access) | `packages/apex-parser-ast/src/symbols/ops/chainResolution.ts` |
| Scope-Based Resolution | `packages/apex-parser-ast/src/symbols/ops/symbolRefResolution.ts` |
| Type Hierarchy Ops | `packages/apex-parser-ast/src/symbols/ops/typeHierarchy.ts` |
| Symbol Lookup Ops | `packages/apex-parser-ast/src/symbols/ops/symbolLookup.ts` |
| Namespace Utils | `packages/apex-parser-ast/src/namespace/NamespaceUtils.ts` |
| Symbol Manager Extensions | `packages/lsp-compliant-services/src/services/SymbolManagerExtensions.ts` |
| Package exports | `packages/apex-parser-ast/src/index.ts` |
