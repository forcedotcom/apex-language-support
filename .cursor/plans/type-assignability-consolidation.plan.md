# Type Assignability Consolidation Plan

## Problem

Four separate implementations of type assignability exist across the codebase:

| Location | Function | Input Types | Key Semantics |
|----------|----------|-------------|---------------|
| [MethodResolutionValidator.ts](packages/apex-parser-ast/src/semantics/validation/validators/MethodResolutionValidator.ts) | `isArgumentAssignableToParameter` | string, string | Object accepts all except void; subtype via superClass/interfaces |
| [InstanceofValidator.ts](packages/apex-parser-ast/src/semantics/validation/validators/InstanceofValidator.ts) | `isAssignable` | string, string | Object rejects primitives (String, Id, etc.) as RHS; subtype check |
| [StatementValidator.ts](packages/apex-parser-ast/src/semantics/validation/StatementValidator.ts) | `isCompatibleType`, `isCompatibleAssignment` | StatementExpressionType | Object accepts all; Id→String; primitive promotion; subtype not implemented |
| [ConstructorExpressionValidator.ts](packages/apex-parser-ast/src/semantics/validation/ConstructorExpressionValidator.ts) | `isCompatibleType` | ExpressionType | Hardcoded sObject inheritance map; Object accepts all |

**Maintenance impact**: Bug fixes (e.g. Id→String) and new rules must be applied in multiple places. Subtype logic is duplicated. Semantics are undocumented and inconsistent.

---

## Proposed Solution

### 1. Create shared module

**File**: [packages/apex-parser-ast/src/semantics/validation/utils/typeAssignability.ts](packages/apex-parser-ast/src/semantics/validation/utils/typeAssignability.ts)

**API**:

```typescript
export type AssignabilityContext =
  | 'method-parameter'   // Object accepts all reference types (Assert.isNotNull(String))
  | 'instanceof-rhs'     // Object rejects primitives as RHS type (x instanceof String invalid)
  | 'assignment';        // Object accepts all; Id→String; primitive promotion

export interface AssignabilityOptions {
  allSymbols?: ApexSymbol[];
}

export function isAssignable(
  sourceType: string,
  targetType: string,
  context: AssignabilityContext,
  options?: AssignabilityOptions
): boolean;
```

**Core logic (order of checks)**:

1. **Exact match** (case-insensitive)
2. **null** → compatible with any object type
3. **Unknown/fallback** (empty or 'object' source) → compatible (skip strict check)
4. **Context-specific Object target**:
   - `method-parameter`: `target === 'object'` → `source !== 'void'`
   - `instanceof-rhs`: `target === 'object'` → `!PRIMITIVE_TYPES.has(source)`
   - `assignment`: `target === 'object'` → true
5. **Id → String** (assignment context only)
6. **Primitive promotion** (assignment context only; delegate to existing `canPromotePrimitive` logic or inline)
7. **Subtype check** (superClass, interfaces) when both are reference types and `allSymbols` provided

**Dependencies**: `SymbolKind`, `TypeSymbol`, `ApexSymbol` from types; `PRIMITIVE_TYPES` from TypeInfoFactory or inline.

---

### 2. Migration steps

#### Phase 1: Add shared module and tests

- Create `typeAssignability.ts` with `isAssignable` and all three contexts
- Add `typeAssignability.test.ts` with tests for:
  - Object param: String, Exception, Id → Object (method-parameter)
  - Object RHS: String, Id → Object rejected (instanceof-rhs)
  - Assignment: Object accepts all, Id→String, primitive promotion
  - Subtype: AuraHandledException → Exception
  - null, exact match, unknown fallback

#### Phase 2: Migrate MethodResolutionValidator

- Replace `isArgumentAssignableToParameter` with `isAssignable(..., 'method-parameter', { allSymbols })`
- Remove local function
- Run MethodResolutionValidator tests

#### Phase 3: Migrate InstanceofValidator

- Replace `isAssignable` with import from `typeAssignability`
- Remove local `isAssignable` and `PRIMITIVE_TYPES`
- Run InstanceofValidator tests

#### Phase 4: Migrate StatementValidator

- Add thin adapter: extract `sourceType.name`, `targetType.name` (and handle `isNullType`, `isPrimitiveType`)
- Replace `isCompatibleType` / `isCompatibleAssignment` body with call to `isAssignable(..., 'assignment', { allSymbols })` plus:
  - `canPromotePrimitive` for numeric widening (keep in StatementValidator or move to typeAssignability)
  - Id→String (in typeAssignability for assignment context)
- StatementValidator retains `canPromotePrimitive` if it uses `StatementExpressionType`-specific logic; otherwise move to typeAssignability
- Run TypeAssignmentValidator, AdvancedValidator, and related tests

#### Phase 5: ConstructorExpressionValidator (optional / deferred)

- Uses `ExpressionType` and hardcoded sObject map
- Either: (a) add adapter and use `isAssignable` for Object/class cases, keep sObject map for now, or (b) leave as-is and document as future work
- Lower priority: different input type, sObject-specific rules

---

### 3. File structure

```
packages/apex-parser-ast/src/semantics/validation/
├── utils/
│   ├── typeAssignability.ts      # NEW: shared isAssignable
│   └── typeAssignability.test.ts # NEW
├── StatementValidator.ts         # Refactor to use typeAssignability
└── validators/
    ├── MethodResolutionValidator.ts   # Refactor
    ├── InstanceofValidator.ts        # Refactor
    └── ConstructorExpressionValidator.ts  # Optional refactor
```

---

### 4. Edge cases to handle

| Case | method-parameter | instanceof-rhs | assignment |
|------|------------------|----------------|------------|
| String → Object | yes | no | yes |
| Exception → Object | yes | yes | yes |
| Id → Object | yes | no | yes |
| Id → String | N/A | N/A | yes |
| Integer → Long | no | no | yes (promotion) |
| null → Object | yes | yes | yes |
| void as source | no | no | no |

---

### 5. Risks and mitigations

- **StatementValidator complexity**: Uses `StatementExpressionType` with `isPrimitiveType`, `isNullType`, `canPromotePrimitive`. Mitigation: adapter extracts string names; keep `canPromotePrimitive` in StatementValidator and call it before/after `isAssignable` for assignment context, or move promotion rules into typeAssignability.
- **ConstructorExpressionValidator**: Different domain (sObject field init). Mitigation: defer; document as out-of-scope for initial consolidation.
- **Circular imports**: typeAssignability imports from types/; validators import from utils/. Ensure no cycle (utils should not import validators).

---

### 6. Success criteria

- Single source of truth for assignability rules
- All existing tests pass after migration
- New `typeAssignability.test.ts` covers all three contexts
- No duplicate subtype-check logic in validators
