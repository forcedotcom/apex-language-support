# Namespace Resolution

Resolves Apex type references during and after compilation. Two phases:

1. **Immediate** — during symbol collection in the listener
2. **Deferred** — post-compilation with full symbol graph

## Components

### NamespaceResolutionService

Deferred resolution service. Single public method:

- `resolveDeferredReferences(symbolTable, compilationContext, symbolProvider)` — iterates all symbols, resolves type references via `resolveTypeName()`, then (placeholder) expression references

### NamespaceUtils

Core types and the main resolver function:

- **`Namespace`** — descriptor with `global` and `module` parts; `Namespaces` factory/interning via `create()`, `parse()`, `intern()`
- **`CompilationContext`** — namespace, version, source type, referencing/enclosing/parent types, static context
- **`SymbolProvider`** — interface for symbol lookup: `find()`, `findScalarKeywordType()`, `findSObjectType()`, `findInDefaultNamespaceOrder()`, `findInImplicitFileNamespaceSlot()`, `findInExplicitNamespace()`, `isBuiltInNamespace()`, `isSObjectContainerNamespace()`
- **`SymbolProviderWithStandardNamespace`** — extends `SymbolProvider` with `findInAnyStandardNamespace()`
- **`ReferenceTypeEnum`** — `LOAD | STORE | METHOD | CLASS | NONE`
- **`IdentifierContext`** — `STATIC | OBJECT | NONE`
- **`ResolutionRule`** — `{ name, priority, appliesTo(), resolve() }`
- **`resolveTypeName(nameParts, compilationContext, referenceType, identifierContext, symbolProvider)`** — main resolver; validates input, selects rule order by reference type, applies rules sequentially

### ResolutionRules

Named rule objects applied in priority order. Two rule sets selected by `getResolutionOrder(referenceType)`:

**One-part rules** (unqualified names):

| Rule | Priority | Resolves |
|------|----------|----------|
| NamedScalarOrVoid | 1 | Scalar keywords (void, null) |
| TopLevelTypeInSameNamespace | 6 | Types in current namespace |
| BuiltInSystemSchema | 7 | System/Schema via default namespace order |
| SObject | 8 | SObject types |
| FileBaseSystemNamespace | 9 | Implicit System namespace (slot 0) |
| FileBaseSchemaNamespace | 10 | Implicit Schema namespace (slot 1) |
| BuiltInMethodNamespace | 11 | Other built-in namespaces; METHOD context only |
| WorkspaceType | 12 | User classes (fallback) |

**Two-part rules** (qualified names):

| Rule | Priority | Resolves |
|------|----------|----------|
| NamespaceAndTopLevelType | 4 | Explicit namespace + type |
| BuiltInNamespace | 5 | Built-in namespace types |
| SchemaSObject | 6 | Schema.SObjectName |

Rule order differs for `METHOD` vs default contexts (see `METHOD_ONE_PART_ORDER` / `DEFAULT_ONE_PART_ORDER`).

### NamespaceResolutionPolicy

Namespace ordering and implicit resolution configuration:

- `getImplicitNamespaceOrder()` — `[System, Schema]`
- `getRegistryNamespacePreference()` — `[System, Database]`
- `getFoundationNamespaceOrder()` — `[System, Database, Schema]`
- `getImplicitQualifiedCandidates(typeName, currentNamespace?)` — generates FQN candidates in priority order
- `isPrimaryImplicitNamespace(namespace)` — whether namespace is System or Schema

## Tests

- `test/namespace/NamespaceResolutionService.test.ts`
- `test/namespace/NamespaceResolutionPolicy.test.ts`
- `test/namespace/ResolutionRules.test.ts`
- `test/types/SymbolFactory.namespace.test.ts`
- `test/integration/NamespaceResolution.integration.test.ts`
- `test/parser/ApexSymbolCollectorListener.namespace.test.ts`
