# Plan: Add Depth Limits to Parse Tree and Symbol Chain Traversals

**GUS Work Item:** [a07EE00002V8Vn1YAF](https://gus.lightning.force.com/lightning/r/ADM_Work__c/a07EE00002V8Vn1YAF/view)

## Problem

There are 45 `while` loops that traverse parse tree parent chains or symbol `parentId` chains without depth limits. While ANTLR parse trees and well-formed symbol tables shouldn't have cycles, defensive depth limits prevent potential infinite loops from malformed input.

8 existing loops already follow the correct pattern (e.g., `while (walkParent && depth < 10)`). This plan brings the remaining 45 into alignment.

## Pattern to Follow

```typescript
// Before (no depth limit)
let current: ParserRuleContext | null = ctx.parent || null;
while (current) {
  // ... logic ...
  current = current.parent || null;
}

// After (with depth limit)
let current: ParserRuleContext | null = ctx.parent || null;
let depth = 0;
while (current && depth < 50) {
  // ... logic ...
  current = current.parent || null;
  depth++;
}
```

## Depth Limit Guidelines

- **Parse tree parent traversals**: Use `depth < 50` (Apex files rarely nest deeper than 20-30 levels)
- **Symbol parentId chains**: Use `depth < 50` (symbol hierarchies are typically < 10 deep)
- **Loops with visited sets**: Already protected from cycles; add `depth < 100` as backup

## Locations Requiring Fixes

### Parser Listeners

#### BlockContentListener.ts (7 loops)
- Line 154: `while (current)` — parse tree parent chain
- Line 500: `while (parent)` — parse tree parent chain
- Line 1014: `while (current)` — parse tree parent chain
- Line 1273: `while (parent)` — parse tree parent chain
- Line 1693: `while (current)` — parse tree parent chain
- Line 1875: `while (current)` — parse tree parent chain
- Line 2121: `while (current)` — parse tree parent chain

#### ApexSymbolCollectorListener.ts (12 loops)
- Line 2188: `while (parent)` — parse tree parent chain
- Line 3454: `while (parent)` — parse tree parent chain
- Line 4200: `while (current)` — parse tree parent chain
- Line 4400: `while (current)` — parse tree parent chain
- Line 5815: `while (current)` — parse tree parent chain
- Line 6108: `while (currentScope)` — symbol parentId chain
- Line 6182: `while (current)` — parse tree parent chain
- Line 6281: `while (current)` — parse tree parent chain
- Line 6309: `while (current)` — parse tree parent chain
- Line 6368: `while (current)` — parse tree parent chain
- Line 6423: `while (current)` — parse tree parent chain
- Line 6443: `while (current)` — parse tree parent chain
- Line 6695: `while (current)` — symbol parentId chain
- Line 7797: `while (currentScope)` — symbol parentId chain
- Line 7847: `while (currentScope)` — symbol parentId chain

#### VisibilitySymbolListener.ts (2 loops)
- Line 1285: `while (current)` — parse tree parent chain
- Line 1740: `while (type && type.parentId)` — symbol parentId chain

#### ApexReferenceCollectorListener.ts (5 loops without limits)
- Line 917: `while (parent)` — parse tree parent chain
- Line 2230: `while (current)` — parse tree parent chain
- Line 2252: `while (current)` — parse tree parent chain
- Line 2267: `while (current)` — parse tree parent chain
- Line 2320: `while (current)` — parse tree parent chain
- Line 2357: `while (current)` — parse tree parent chain (with nested loop at 2382)

### Validators

#### VariableShadowingValidator.ts (4 loops)
- Lines 157, 194, 269, 336: `while (current)` — symbol parentId chains

#### VariableResolutionValidator.ts (2 loops)
- Lines 962, 1380: `while (current)` — symbol parentId chains

#### SwitchStatementValidator.ts (2 loops)
- Lines 180, 202: `while (current/parent)` — parse tree parent chains

#### MethodResolutionValidator.ts (1 loop)
- Line 1111: `while (current)` — symbol parentId chain

#### MethodModifierRestrictionValidator.ts (1 loop)
- Line 48: `while (current)` — symbol parentId chain

#### ConstructorValidator.ts (1 loop)
- Line 1148: `while (current)` — symbol parentId chain

#### InstanceofValidator.ts (1 loop)
- Line 111: `while (current)` — parse tree parent chain

#### ExpressionValidator.ts (1 loop)
- Line 109: `while (current)` — parse tree parent chain

#### CollectionValidator.ts (1 loop)
- Line 168: `while (parent)` — parse tree parent chain

#### ReturnStatementValidator.ts (1 loop)
- Line 210: `while (parent)` — parse tree parent chain

#### RunAsStatementValidator.ts (1 loop)
- Line 116: `while (parent)` — parse tree parent chain

## Execution Strategy

1. Fix all listener files first (most traversals, highest risk)
2. Fix validator files
3. Compile and lint after each file
4. Run relevant tests to verify no behavioral changes
