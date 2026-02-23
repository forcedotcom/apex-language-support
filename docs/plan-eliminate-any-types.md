# Plan: Eliminate `any` Type Usage in Semantic Validation

**GUS Work Item:** [a07EE00002V8R8QYAV](https://gus.lightning.force.com/lightning/r/ADM_Work__c/a07EE00002V8R8QYAV/view)

## Problem

There are 130+ occurrences of `: any` and `as any` across the semantic validation code, undermining TypeScript's type safety. Most have straightforward replacements using existing types.

## Common Replacement Patterns

### Pattern 1: ANTLR Context Types (import from `@apexdevtools/apex-parser`)

Replace `any` with specific grammar context types. These are already available from the parser package.

**Files affected**: `ControlFlowValidator.ts`, `InnerTypeValidator.ts`, `ReturnStatementValidator.ts`, `PropertyAccessorValidator.ts`, `CollectionValidator.ts`, `ConstructorValidator.ts`, `ExceptionValidator.ts`, `InstanceofValidator.ts`, `SwitchStatementValidator.ts`

**Example**:
```typescript
// Before
enterMethodDeclaration(ctx: any): void
// After
enterMethodDeclaration(ctx: MethodDeclarationContext): void
```

### Pattern 2: Symbol Types (import from `types/symbol`)

Replace `any` with `ApexSymbol`, `TypeSymbol`, `MethodSymbol`, `VariableSymbol`, etc.

**Files affected**: `TypeAssignmentValidator.ts`, `TypeValidator.ts`, `SObjectTypeValidator.ts`, `CollectionTypeValidator.ts`, `AdvancedValidator.ts`

### Pattern 3: SymbolReference Properties

Several validators cast to `any` to access properties that already exist on `SymbolReference`.

**Files affected**: `LiteralValidator.ts`, `AssignmentAccessValidator.ts`, `VariableResolutionValidator.ts`

**Example**:
```typescript
// Before
const literalType = (ref as any).literalType;
// After
const literalType = ref.literalType;
```

### Pattern 4: `isBlockSymbol` Type Guard

Many validators check `(s as any).scopeType === 'class'`. Replace with `isBlockSymbol(s) && s.scopeType === 'class'`.

**Files affected**: `AbstractMethodBodyValidator.ts`, `InterfaceHierarchyValidator.ts`, `MethodResolutionValidator.ts`, `NewExpressionValidator.ts`, `StaticContextValidator.ts`

### Pattern 5: `ErrorCodeKey` for `localizeTyped`

Several validators cast error codes to `any` when calling `localizeTyped`. Import `ErrorCodeKey` from the generated messages module.

**Files affected**: `ControlFlowValidator.ts`, `ReturnStatementValidator.ts`, `ExpressionTypeValidator.ts`, `AnnotationPropertyValidator.ts`, `ConstructorValidator.ts`

### Pattern 6: `ISymbolManager` Interface

Several files use `any` with comment "using any to avoid circular dependency". The `ISymbolManager` interface is importable from `types/ISymbolManager`.

**Files affected**: `MethodCallValidator.ts`, `ValidationTier.ts`

### Pattern 7: `TypeInfo` for Type Information

Several older validator interfaces use `any` for type fields. Replace with `TypeInfo` from `types/typeInfo`.

**Files affected**: `AdvancedValidator.ts`, `ValidationResult.ts`

## Detailed Occurrence List

### `CollectionValidator.ts` (18 occurrences)

| Line | Current | Replacement |
|------|---------|-------------|
| 189 | `(createdName as any).typeName?.()` | Check if `CreatedNameContext` has `typeName()` |
| 190 | `let listToken: any = null` | `let listToken: TerminalNode \| null = null` |
| 191 | `let setToken: any = null` | `let setToken: TerminalNode \| null = null` |
| 192 | `let mapToken: any = null` | `let mapToken: TerminalNode \| null = null` |
| 206 | `(firstPair as any).typeName?.()` | Import `IdCreatedNamePairContext` |
| 215-217 | `(anyId as any).LIST?.()` etc. | Import `AnyIdContext`, use directly |
| 231 | `extractTypeName(typeRef: any)` | `extractTypeName(typeRef: TypeRefContext)` |
| 240 | `ids.map((id: any) => id.text)` | Remove type annotation, let TS infer |
| 251 | `let typeRefs: any[] = []` | `let typeRefs: TypeRefContext[] = []` |
| 258, 267, 274 | Various `as any` casts | Import proper context types |
| 301 | `(creator as any).classCreatorRest?.()` | Import `CreatorContext` |

### `ConstructorValidator.ts` (13 occurrences)

| Line | Current | Replacement |
|------|---------|-------------|
| 138 | `(methodCall as any).SUPER?.()` | Import `MethodCallContext`, use directly |
| 139, 426, 427 | `(methodCall as any).THIS?.()` / `.SUPER?.()` | Same |
| 555, 593, 635 | `(primary as any).literalPrimary?.()` | Check `PrimaryExpressionContext` structure |
| 639 | `(literal as any).BOOLEAN_LITERAL?.()` | Import `LiteralContext`, use directly |
| 913 | `(symbolManager as any).getSymbolTableForFile` | Use `ISymbolManager` type |
| 1464-1480 | `bodyError.code as any` | Use `ErrorCodeKey` |

### `MethodCallValidator.ts` (10 occurrences)

| Line | Current | Replacement |
|------|---------|-------------|
| 94, 104 | `(createdName as any).typeName?.()` | Import proper context type |
| 194 | `ctx: ctx as any` | Use union type of possible contexts |
| 205 | `extractReceiverName(expr: any)` | Use `ExpressionContext` |
| 248, 285, 356, 402 | `symbolManager?: any` | `symbolManager?: ISymbolManager` |
| 607 | `ctx: null as any` | Allow `null` in type |
| 742 | `receiverSymbol as any` | `receiverSymbol as VariableSymbol` |

### `MethodResolutionValidator.ts` (5 occurrences)

| Line | Current | Replacement |
|------|---------|-------------|
| 159 | `(s as any).scopeType === 'class'` | Use `isBlockSymbol` type guard |
| 724, 1343, 1427, 1636 | `methodCall: any` | `methodCall: SymbolReference` |

### `ControlFlowValidator.ts` (5 occurrences)

| Line | Current | Replacement |
|------|---------|-------------|
| 99, 103 | `ctx: any` for method declarations | `MethodDeclarationContext` |
| 107, 112 | `ctx: any` for constructors | `ConstructorDeclarationContext` |
| 254 | `code as any` | `code as ErrorCodeKey` |

### `TypeAssignmentValidator.ts` (5 occurrences)

| Line | Current | Replacement |
|------|---------|-------------|
| 352 | `elementType?: any` | `elementType?: TypeInfo` |
| 486 | `targetRef as any` | Remove cast, check chainNodes directly |
| 737, 748, 757 | `symbol: any` | `symbol: ApexSymbol` |

### `VariableResolutionValidator.ts` (4 occurrences)

| Line | Current | Replacement |
|------|---------|-------------|
| 85, 86 | `any[]` arrays | `SymbolReference[]` |
| 1000, 1031 | `fieldRef: any` | `fieldRef: SymbolReference` |

### `ExpressionTypeValidator.ts` (3 occurrences)

| Line | Current | Replacement |
|------|---------|-------------|
| 429 | `(primaryCtx as any).methodCall` | Check context structure |
| 594, 618 | `errorInfo.code as any` | `errorInfo.code as ErrorCodeKey` |

### `ReturnStatementValidator.ts` (3 occurrences)

| Line | Current | Replacement |
|------|---------|-------------|
| 173 | `ctx: any` | `ctx: TriggerUnitContext` |
| 442, 444 | `code as any` | `code as ErrorCodeKey` |

### `InstanceofValidator.ts` (3 occurrences)

| Line | Current | Replacement |
|------|---------|-------------|
| 93 | `(ctx as any).literal?.()` | Check `InstanceOfExpressionContext` |
| 110, 116 | `(ctx as any).parent` | `ctx.parent` (already on ParserRuleContext) |

### `ExceptionValidator.ts` (3 occurrences)

| Line | Current | Replacement |
|------|---------|-------------|
| 562 | `(newExpr as any).typeRef?.()` | Check `NewExpressionContext` structure |
| 586 | `typeRef: any` | `typeRef: TypeRefContext` |
| 592 | `(id: any) => id.text` | Remove annotation, let TS infer |

### Remaining Files (1-2 occurrences each)

| File | Line(s) | Replacement |
|------|---------|-------------|
| `AnnotationPropertyValidator.ts` | 739, 773, 774, 1358, 1877, 2403 | `ApexSymbol` type guards, `ErrorCodeKey` |
| `StaticContextValidator.ts` | 114, 303 | `isBlockSymbol` guard, `SymbolLocation` |
| `SwitchStatementValidator.ts` | 190 | Remove unnecessary `as any` cast |
| `InnerTypeValidator.ts` | 66, 79 | `BlockContext` |
| `NewExpressionValidator.ts` | 260, 266 | `isBlockSymbol` guard |
| `LiteralValidator.ts` | 190, 191 | Remove casts (properties exist on type) |
| `InterfaceHierarchyValidator.ts` | 319, 520 | `isBlockSymbol` guard |
| `AssignmentAccessValidator.ts` | 157, 158 | Remove casts (properties exist on type) |
| `AbstractMethodBodyValidator.ts` | 87, 127 | `isBlockSymbol` guard |
| `PropertyAccessorValidator.ts` | 179 | `CompilationUnitContext \| TriggerUnitContext` |
| `ValidationTier.ts` | 73 | `ISymbolManager` |
| `ValidationResult.ts` | 60 | `TypeInfo` |
| `TypeValidator.ts` | 37-54 | `TypeSymbol`, `MethodSymbol` |
| `SObjectTypeValidator.ts` | 17-54 | `TypeSymbol`, `MethodSymbol`, `SymbolTable` |
| `CollectionTypeValidator.ts` | 18-54 | `TypeSymbol`, `MethodSymbol`, `SymbolTable` |
| `AdvancedValidator.ts` | 31-38 | `TypeInfo` |
| `MapPutAllValidator.ts` | 293, 310, 322 | `ExpressionContext` |
| `DecimalToDoubleValidator.ts` | 155, 178, 190, 203 | `ExpressionContext` |
| `AddErrorMethodValidator.ts` | 154, 173 | `ExpressionContext` |

## Execution Strategy

1. Start with Pattern 3, 4, 5 (simple, mechanical replacements)
2. Then Pattern 2, 6, 7 (type imports)
3. Then Pattern 1 (ANTLR context types - may need grammar verification)
4. Compile and lint after each batch
5. Run tests to verify no regressions

## Notes

- Some ANTLR context method access (e.g., `typeName()`, `SUPER()`) may need verification against the grammar to confirm the method exists on the context type. The `as any` may have been used because the type definitions don't expose all grammar methods.
- The `isBlockSymbol` type guard should be imported from the symbol utilities. If it doesn't exist, create it.
- When removing `as any` for `SymbolReference` properties, verify the property exists on the `SymbolReference` interface. Some may be on subtypes like `ChainedSymbolReference`.
