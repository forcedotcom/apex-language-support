# Control Flow Analysis: Language Server Feature Opportunities

## Overview

Control Flow Analysis (CFA) is foundational for many advanced language server features. This document identifies which LSP capabilities would benefit from or require CFA infrastructure.

## Current Language Server Features

Based on codebase analysis, the Apex Language Server currently implements:

### ✅ Implemented Features

- **Completion** (`completionProvider`) - Context-aware code completion
- **Hover** (`hoverProvider`) - Symbol information on hover
- **Definition** (`definitionProvider`) - Go to definition
- **References** (`referencesProvider`) - Find all references
- **Document Symbols** (`documentSymbolProvider`) - Outline/navigation
- **Code Lens** (`codeLensProvider`) - Inline actionable insights
- **Folding Ranges** (`foldingRangeProvider`) - Code folding
- **Diagnostics** (`diagnosticProvider`) - Error/warning reporting
- **Code Actions** (`codeActionProvider`) - Quick fixes and refactorings

### ⏳ Not Yet Implemented (but planned)

- **Rename** (`renameProvider`) - Symbol renaming
- **Signature Help** (`signatureHelpProvider`) - Method signature hints
- **Semantic Tokens** (`semanticTokensProvider`) - Advanced syntax highlighting

---

## Language Server Features That Would Benefit from Control Flow Analysis

### 1. Enhanced Code Completion

**Current State**: Uses symbol table lookup and scope analysis

**With CFA Enhancement**:

- **Type Narrowing After Conditionals**: After `if (obj instanceof String)`, suggest `String` methods
  ```apex
  Object obj = getObject();
  if (obj instanceof String) {
      obj.| // Completion knows obj is String here
  }
  ```
- **Null Safety Filtering**: After `if (obj != null)`, filter out null-unsafe operations
- **Variable Availability**: Only suggest variables that are actually in scope at cursor position
- **Dead Code Detection**: Don't suggest completions in unreachable code (grayed out)
- **Context-Aware Method Filtering**: Filter methods based on control flow context (e.g., only suggest methods that can be called at this point)

**Implementation Complexity**: Medium
**Customer Value**: High

---

### 2. Enhanced Hover Information

**Current State**: Shows symbol definition, type, documentation

**With CFA Enhancement**:

- **Reaching Definitions**: Show which assignments reach this point
  ```apex
  String name = "John";
  if (condition) {
      name = "Jane";
  }
  // Hover on 'name' shows: "Defined at line 1, possibly redefined at line 3"
  ```
- **Type Narrowing Information**: Show narrowed type after conditionals
- **Reachability Status**: Indicate if code is unreachable
- **Variable Value Flow**: Show how variable values flow through control paths
- **Nullability Tracking**: Show nullability state at hover position

**Implementation Complexity**: Medium
**Customer Value**: Medium-High

---

### 3. Enhanced Go to Definition / Find References

**Current State**: Uses symbol table and reference graph

**With CFA Enhancement**:

- **Filter Unreachable References**: Option to exclude references in dead code
- **Execution Path Highlighting**: Show which references are actually executed
- **Definition Dominance**: Find the "most relevant" definition that dominates this use
- **Use-Definition Chains**: Navigate from use to definition through control flow
- **Reference Context**: Show control flow context for each reference (e.g., "only executed when flag is true")

**Implementation Complexity**: Medium
**Customer Value**: Medium

---

### 4. Advanced Code Actions & Quick Fixes

**Current State**: Basic refactoring actions (rename, extract method)

**With CFA Enhancement**:

- **Add Missing Return Statement**: Automatically add return at end of method
  ```apex
  public Integer getValue() {
      if (flag) return 1;
      // Quick fix: "Add return statement"
  }
  ```
- **Remove Unreachable Code**: Automatically remove dead code
- **Initialize Variable Before Use**: Add initialization for uninitialized variables
- **Remove Unused Variable**: Detect and remove variables that are assigned but never read
- **Extract Method Safely**: Know which variables are used/defined in selection
- **Inline Variable**: Safely inline variables (know if used multiple times)
- **Simplify Conditional**: Detect redundant conditions
- **Extract Constant**: Detect magic numbers/strings that could be constants

**Implementation Complexity**: High
**Customer Value**: High

---

### 5. Type Narrowing & Flow-Sensitive Type Analysis

**Current State**: Static type information only

**With CFA Enhancement**:

- **Instanceof Narrowing**: After `if (obj instanceof String)`, treat `obj` as `String`
- **Null Checks**: After `if (obj != null)`, treat `obj` as non-null
- **Equality Checks**: After `if (x == 5)`, narrow type if applicable
- **Pattern Matching**: Support for pattern matching (future Apex feature)
- **Type Guards**: Custom type guard methods

**Example**:

```apex
Object obj = getObject();
if (obj instanceof Account) {
    Account acc = (Account)obj; // Could eliminate cast with CFA
    acc.Name = "Test"; // Type narrowing knows acc is Account
}
```

**Implementation Complexity**: High
**Customer Value**: High

---

### 6. Null Safety Analysis

**Current State**: Basic null checks in validators

**With CFA Enhancement**:

- **Nullability Tracking**: Track which variables can be null at each point
- **Null Dereference Detection**: Detect potential `NullPointerException` before runtime
- **Null Check Propagation**: Understand that null checks protect subsequent code
- **Optional Chaining Support**: Better support for safe navigation patterns

**Example**:

```apex
Account acc = getAccount();
if (acc != null) {
    String name = acc.Name; // CFA knows acc is non-null here
} else {
    String name = acc.Name; // CFA detects potential null dereference
}
```

**Implementation Complexity**: High
**Customer Value**: Very High

---

### 7. Uninitialized Variable Detection

**Current State**: Not implemented

**With CFA Enhancement**:

- **Definite Assignment Analysis**: Ensure variables are assigned before use
- **Path-Specific Analysis**: Detect if some paths use uninitialized variables
- **Loop Analysis**: Handle initialization in loops
- **Exception Handling**: Consider exception paths

**Example**:

```apex
Integer value;
if (flag) {
    value = 10;
}
System.debug(value); // Error: value may not be initialized
```

**Implementation Complexity**: Medium-High
**Customer Value**: High

---

### 8. Unused Variable Detection

**Current State**: Not implemented

**With CFA Enhancement**:

- **Dead Assignment Detection**: Variables assigned but never read
- **Unused Parameters**: Method parameters that are never used
- **Unused Local Variables**: Local variables that are never read
- **Write-Only Variables**: Variables that are only written, never read

**Example**:

```apex
public void method(Integer param) {
    String unused = "test"; // Warning: variable 'unused' is never read
    // param is never used - could be removed
}
```

**Implementation Complexity**: Medium
**Customer Value**: Medium

---

### 9. Code Metrics & Quality Analysis

**Current State**: Not implemented

**With CFA Enhancement**:

- **Cyclomatic Complexity**: Calculate McCabe complexity metric
- **Maintainability Index**: Code quality metrics
- **Code Smell Detection**: Detect complex methods, deep nesting
- **Cognitive Complexity**: More sophisticated than cyclomatic complexity
- **Test Coverage Analysis**: Identify untested code paths

**Implementation Complexity**: Low-Medium (once CFA exists)
**Customer Value**: Medium

---

### 10. Refactoring Support

**Current State**: Basic refactoring actions

**With CFA Enhancement**:

- **Safe Rename**: Know which references are actually executed
- **Extract Method**: Understand variable usage/definition in selection
- **Inline Method**: Understand call sites and variable flow
- **Extract Variable**: Detect expressions that could be extracted
- **Move Code**: Understand dependencies before moving
- **Split Method**: Identify natural split points based on control flow

**Implementation Complexity**: High
**Customer Value**: High

---

### 11. Debugging Support

**Current State**: Not implemented (LSP doesn't specify debugging, but DAP does)

**With CFA Enhancement**:

- **Breakpoint Validation**: Verify breakpoints are on executable code
- **Step-Through Analysis**: Understand execution flow for stepping
- **Variable Watch**: Know which variables are in scope at breakpoint
- **Call Stack Analysis**: Understand call hierarchy and execution paths
- **Conditional Breakpoints**: Validate conditions are evaluable

**Implementation Complexity**: High
**Customer Value**: High (if debugging support is added)

---

### 12. Code Navigation & Visualization

**Current State**: Basic document symbols

**With CFA Enhancement**:

- **Call Hierarchy**: Visualize method call chains
- **Execution Flow Visualization**: Show control flow graph
- **Data Flow Visualization**: Show how data flows through code
- **Dependency Graph**: Understand code dependencies
- **Impact Analysis**: What code is affected by changes

**Implementation Complexity**: Medium-High
**Customer Value**: Medium

---

### 13. Advanced Diagnostics

**Current State**: Syntax and semantic validation

**With CFA Enhancement**:

- **Missing Return Statements**: `INVALID_RETURN_NON_VOID` (already identified)
- **Unreachable Code**: Enhanced detection beyond basic return/throw
- **Infinite Loop Detection**: Detect loops that never terminate
- **Unused Exception Variables**: Catch blocks with unused exception variables
- **Resource Leak Detection**: Variables that should be closed/cleaned up

**Implementation Complexity**: Medium-High
**Customer Value**: High

---

### 14. Code Generation & AI Assistance

**Current State**: Not implemented

**With CFA Enhancement**:

- **Smart Code Completion**: Generate code that matches control flow patterns
- **Test Case Generation**: Generate test cases covering all paths
- **Code Explanation**: Explain what code does based on control flow
- **Bug Prediction**: Identify likely bugs based on control flow patterns
- **Refactoring Suggestions**: Suggest refactorings based on complexity

**Implementation Complexity**: Very High
**Customer Value**: Medium (depends on AI integration)

---

## Priority Matrix

### High Value + Medium Complexity (Quick Wins)

1. **Type Narrowing in Completion** - Significant UX improvement
2. **Unused Variable Detection** - Common developer need
3. **Code Metrics** - Useful for code quality

### High Value + High Complexity (Strategic Investments)

1. **Missing Return Statement Detection** - Already identified need
2. **Null Safety Analysis** - Prevents common runtime errors
3. **Uninitialized Variable Detection** - Catches bugs early
4. **Advanced Code Actions** - Major productivity boost

### Medium Value + Medium Complexity

1. **Enhanced Hover Information** - Nice-to-have improvements
2. **Filter Unreachable References** - Quality-of-life feature
3. **Code Navigation Visualization** - Developer experience

### Lower Priority

1. **Debugging Support** - Requires DAP implementation
2. **Code Generation** - Future AI integration
3. **Execution Flow Visualization** - Nice but not essential

---

## Implementation Strategy

### Phase 1: Foundation (Control Flow Graph)

- Build CFG construction infrastructure
- Basic path enumeration
- Integration with existing symbol table

### Phase 2: Core Features (High Value)

- Missing return statement detection
- Type narrowing for completion
- Unused variable detection

### Phase 3: Advanced Features

- Null safety analysis
- Uninitialized variable detection
- Advanced code actions

### Phase 4: Polish & Optimization

- Performance optimization
- Caching strategies
- Incremental updates

---

## Technical Considerations

### Performance Impact

- CFG construction: O(n) where n = number of statements
- Path enumeration: Can be exponential (need heuristics)
- Caching: CFG can be cached per method
- Incremental updates: Only rebuild CFG when method changes

### Integration Points

- **Symbol Table**: CFG nodes reference symbol table entries
- **Parse Tree**: CFG built from parse tree
- **Validators**: CFG used by validators for path analysis
- **LSP Services**: CFG used by completion, hover, etc.

### Complexity Management

- Limit path enumeration depth
- Use heuristics for loop analysis
- Cache CFG per method version
- Incremental updates when possible

---

## Relationship to McCabe's Cyclomatic Complexity

As mentioned, CFA enables cyclomatic complexity calculation:

```
Complexity = E - N + 2P
```

Where:

- E = edges in CFG
- N = nodes in CFG
- P = connected components (usually 1)

This metric can be:

- **Exposed via LSP**: Code metrics provider
- **Used in Diagnostics**: Flag high-complexity methods
- **Used in Code Actions**: Suggest refactoring for complex methods
- **Used in Hover**: Show complexity on hover

---

## Summary

Control Flow Analysis would enable or significantly enhance:

1. **8+ existing LSP features** (completion, hover, references, code actions, etc.)
2. **6+ new diagnostic capabilities** (missing returns, unused vars, null safety, etc.)
3. **5+ refactoring capabilities** (extract method, inline variable, etc.)
4. **Code quality metrics** (cyclomatic complexity, maintainability)
5. **Developer experience improvements** (type narrowing, null safety, etc.)

**Estimated Impact**:

- **High Value Features**: 10-15 new/enhanced capabilities
- **Customer Satisfaction**: Significant improvement in IDE intelligence
- **Code Quality**: Better bug detection and prevention
- **Developer Productivity**: Faster development with smarter tooling

The investment in CFA infrastructure would pay dividends across the entire language server feature set.
