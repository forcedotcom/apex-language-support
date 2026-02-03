# Modifier Validation Strategy

## Philosophy: Option 2 - Sanitize to Semantic Correctness

The symbol table represents **semantically correct** state, not raw source code. Invalid modifiers are prevented from entering the symbol table whenever possible, and sanitized if they somehow get through.

## Principles

1. **Early Prevention**: Validate modifiers in `enterModifier` before applying them when context is clear
2. **Defensive Sanitization**: Validators clean up invalid modifiers as a safety net
3. **Error Tracking**: Invalid modifiers are reported as errors, but don't pollute the symbol table
4. **Consumer Trust**: Downstream consumers (hover, completion, type checking) can trust symbol table state

## Implementation Pattern

### Early Validation (enterModifier)

For modifiers that can be validated with parse tree context:

```typescript
// In enterModifier: validate BEFORE applying
if (modifier === 'final') {
  // Check parse tree context
  if (isInMethodOrClassDeclaration(ctx)) {
    addError(...);
    return; // Don't apply - prevents isFinal from being set
  }
}
```

**Currently implemented:**
- `final` on methods/classes (prevented early)

**Could be extended to:**
- `virtual` on fields (requires field declaration context detection)
- `abstract` on fields (requires field declaration context detection)

### Defensive Sanitization (Validators)

For modifiers that require semantic context (type information, class hierarchy, etc.):

```typescript
// In validators: defensive cleanup
if (modifiers.isVirtual && isInvalidForSymbol()) {
  addError(...);
  modifiers.isVirtual = false; // Clean up if it somehow got through
}
```

**Currently implemented:**
- `final` on methods/classes (sanitized in MethodModifierValidator, ClassModifierValidator)
- `virtual` on fields (sanitized in FieldModifierValidator)
- `abstract` on fields (sanitized in BaseModifierValidator)
- `override` on fields (sanitized in BaseModifierValidator)
- `webService` on classes (sanitized in ClassModifierValidator)
- `testMethod` on properties (sanitized in PropertyModifierValidator)
- Conflicting modifiers (abstract+virtual, abstract+final, etc.)

## Why This Approach?

1. **Symbol Table Integrity**: The symbol table is a semantic model, not a source representation
2. **Consumer Safety**: Hover, completion, and type checking rely on valid state
3. **Error Preservation**: Errors are tracked separately via ErrorReporter, so diagnostic info isn't lost
4. **Source Preservation**: The parse tree/AST preserves source state for diagnostics

## Trade-offs

**Pros:**
- Symbol table always semantically correct
- Consumers can trust the data
- Simpler downstream code
- Errors tracked separately

**Cons:**
- Requires careful validation logic
- Some context-dependent validation must happen later
- Need defensive sanitization as safety net

## Future Considerations

If we need to preserve source modifiers for advanced diagnostics:
- Could add optional `sourceModifiers` field to symbols
- Would be used only for error reporting/diagnostics
- Main `modifiers` field remains semantically correct
