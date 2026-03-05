---
name: apex-language
description: Understand Apex language rules, ANTLR grammar structure, and how to implement parser listeners for language server features. Use when working on Apex parser implementation, creating validators, implementing listeners, or referencing parser grammar rules.
---

# Apex Language Support

## ANTLR Grammar Reference

The Apex parser uses ANTLR grammar files that are **not bundled** in the module. Reference them from GitHub:

**Grammar Files Location:**
- **Repository**: https://github.com/apex-dev-tools/apex-parser/tree/main/antlr
- **Parser Grammar**: `BaseApexParser.g4` - Defines parser rules (compilationUnit, classDeclaration, methodDeclaration, etc.)
- **Lexer Grammar**: `BaseApexLexer.g4` - Defines tokenization rules

**Key Grammar Rules:**
- `compilationUnit` - Entry point for Apex class files
- `triggerUnit` - Entry point for trigger files
- `anonymousUnit` - Entry point for anonymous Apex blocks
- `classDeclaration`, `interfaceDeclaration`, `enumDeclaration` - Type declarations
- `methodDeclaration`, `constructorDeclaration` - Method/constructor declarations
- Expression rules (left-recursive notation)

When implementing listeners or validators, reference the grammar to understand:
- Available parser rule contexts (e.g., `ClassDeclarationContext`, `MethodDeclarationContext`)
- Rule structure and child nodes
- Token types and keywords

## Core Apex Language Rules

### No Import Statements
Apex has **no import statements**—never generate or expect them. The compiler resolves types by:
1. Searching the current namespace
2. Then the global namespace
3. Then other installed namespaces

Fully qualified names (`<namespace>.<TypeName>`) are used only when a name conflict exists; otherwise, use the unqualified name.

**Important**: A namespace and a type in that namespace can share the same name (e.g., `Acme.Acme`) and this is valid. Namespace is determined by org/package metadata, not declared in code.

### Modifiers and Keywords

**Final and Virtual:**
- Classes and methods are **final by default** (cannot be extended/overridden)
- Cannot use `final` keyword on classes or methods (syntax error)
- Use `virtual` keyword to make classes/methods extensible/overridable
- `final` keyword can only be used for variables (prevents reassignment)

**Example:**
```apex
// Correct: Normal class (final by default)
public class MyClass { }

// Incorrect: Cannot use 'final' keyword on classes
public final class MyClass { }  // Syntax error!

// Correct: Virtual class (can be extended)
public virtual class MyClass { }

// Correct: Final variable
public final Integer count = 5;
```

### File Types and Entry Points
- **`.cls` files**: Use `compilationUnit` parser rule
- **`.trigger` files**: Use `triggerUnit` parser rule
- **`.apex` files**: Use `anonymousUnit` parser rule (wrapped in block)

### Test Artifacts
The Apex language grammar only allows a **single top-level type** within the same file. When creating test artifacts:

- **Do not** place more than one top-level type in a test artifact unless the test is expressly designed to test that validation condition
- Test artifacts should follow the same single-type-per-file rule as production code
- Only create multi-type test files when specifically testing the parser/validator's handling of multiple top-level types

## Parser Listener Pattern

### BaseApexParserListener

All custom listeners extend `BaseApexParserListener<T>`:

```typescript
import { BaseApexParserListener } from './BaseApexParserListener';
import { ClassDeclarationContext } from '@apexdevtools/apex-parser';

export class MyListener extends BaseApexParserListener<MyResultType> {
  enterClassDeclaration(ctx: ClassDeclarationContext): void {
    // Handle class declaration entry
  }

  exitClassDeclaration(ctx: ClassDeclarationContext): void {
    // Handle class declaration exit
  }

  // Override getResult() to return your result
  getResult(): MyResultType {
    return this.result;
  }
}
```

### Listener Methods

Listener methods correspond to parser rules:
- `enter*` methods: Called when entering a rule context
- `exit*` methods: Called when exiting a rule context
- Method names match grammar rule names (camelCase)

**Common Context Types:**
- `ClassDeclarationContext` - Class declarations
- `MethodDeclarationContext` - Method declarations
- `ConstructorDeclarationContext` - Constructor declarations
- `VariableDeclaratorContext` - Variable declarations
- `ExpressionContext` - Expressions
- `StatementContext` - Statements

### Using Listeners with CompilerService

```typescript
import { CompilerService } from '@salesforce/apex-lsp-parser-ast';
import { MyListener } from './MyListener';

const compiler = new CompilerService();
const listener = new MyListener();
const result = compiler.compile(fileContent, fileName, listener);

// Access result
const myResult = result.result;
const errors = result.errors;
const warnings = result.warnings;
```

## Leveraging Parser Rules

### Understanding Rule Contexts

Each parser rule generates a context class with:
- Child nodes accessible via properties
- Token access via `start`/`stop` tokens
- Location information for error reporting

**Example:**
```typescript
enterMethodDeclaration(ctx: MethodDeclarationContext): void {
  // Access method name
  const methodName = ctx.id()?.text;
  
  // Access return type
  const returnType = ctx.typeRef()?.text;
  
  // Access modifiers
  const modifiers = ctx.modifier();
  
  // Access location for errors
  const location = {
    start: ctx.start.line,
    end: ctx.stop?.line,
  };
}
```

### Finding Available Rules

To discover available parser rules:
1. Check the grammar file: `BaseApexParser.g4`
2. Look for rule names (e.g., `methodDeclaration`, `classDeclaration`)
3. Generated context types follow pattern: `{RuleName}Context`
4. Import from `@apexdevtools/apex-parser`

### Common Patterns

**Scope Tracking:**
```typescript
export class ScopeTrackingListener extends BaseApexParserListener<SymbolTable> {
  private scopeStack: ApexSymbol[] = [];

  enterClassDeclaration(ctx: ClassDeclarationContext): void {
    const classSymbol = this.createClassSymbol(ctx);
    const blockSymbol = this.createBlockSymbol('class', ctx);
    this.scopeStack.push(blockSymbol);
  }

  exitClassDeclaration(): void {
    this.scopeStack.pop();
  }

  getCurrentScope(): ApexSymbol {
    return this.scopeStack[this.scopeStack.length - 1];
  }
}
```

**Error Reporting:**
```typescript
enterMethodDeclaration(ctx: MethodDeclarationContext): void {
  if (this.errorListener) {
    this.errorListener.addError({
      message: 'Custom error message',
      line: ctx.start.line,
      column: ctx.start.charPositionInLine,
    });
  }
}
```

## Validation Patterns

### TIER 1 (Immediate) Validators
Fast, same-file validations that run on every keystroke (<500ms):
- Parameter limits (max 32)
- Enum limits (max 100)
- Duplicate detection
- Naming validation
- Forward reference validation

### TIER 2 (Thorough) Validators
Comprehensive validations that may require cross-file analysis:
- Method signature equivalence
- Interface/class hierarchy validation
- Cross-file type resolution

### Error Codes and Messages

When working with semantics and validation, **error codes and messages must be aligned with the Salesforce org compiler**.

**Error Messages Reference:**
- **Source File**: `packages/apex-parser-ast/src/resources/messages/messages_en_US.properties`
  - Contains all error codes and messages (English) used by the Salesforce compiler
  - Format: `error.code.key=Error message text with {0} placeholders`
- **Generated TypeScript Files** (auto-generated, do not edit manually):
  - `packages/apex-parser-ast/src/generated/ErrorCodes.ts` - Error code constants
  - `packages/apex-parser-ast/src/generated/messages_en_US.ts` - Error message mappings

**Workflow for Adding New Error Codes:**

1. **Check for existing error code**: First, search `messages_en_US.properties` to see if an appropriate error code already exists

2. **If a new error code is needed**: **Ask the user for permission** before proceeding
   - Present the proposed error code key and message
   - Explain why a new code is needed vs. using an existing one
   - Wait for explicit user approval before making changes

3. **Edit the properties file**: After receiving permission, add your new error code to `messages_en_US.properties`
   ```properties
   my.new.error.code=Error message text with {0} placeholder
   ```

4. **Regenerate TypeScript files**: Run `npm run precompile` in `packages/apex-parser-ast`
   - This generates `ErrorCodes.ts` and `messages_en_US.ts` from the properties file
   - The generated files are used by validators for type-safe error code references

5. **Use in validators**: Import and use the generated constants
   ```typescript
   import { ErrorCodes } from '../generated/ErrorCodes';
   // Use ErrorCodes.MY_NEW_ERROR_CODE in your validator
   ```

**Critical**: When implementing validators that require error reporting, if you determine that a new error code needs to be created, **you must ask the user for permission before proceeding**. Do not create new error codes without explicit user approval.

**When to Consult This File:**
- **Before introducing a new error code**: Check if an appropriate error code already exists
- **When choosing an error code**: Search the file to find the correct code for your validation
- **When writing error messages**: Use existing messages or follow the same format/style
- **When implementing validators**: Ensure error codes match Salesforce compiler behavior

**Example Error Codes:**
- `invalid.void.parameter` - Parameters cannot be of type void
- `unreachable.statement` - Unreachable statement
- `invalid.constructor.return` - Constructors must not return a value
- `invalid.super.call` - Call to 'super()' must be the first statement in a constructor method

**Important**: Always consult `messages_en_US.properties` when:
1. Adding new validation logic that needs error reporting
2. Choosing which error code to use for a validation failure
3. Ensuring consistency with Salesforce compiler error messages
4. **Adding a new error code**: Update `.properties` file, then run `npm run precompile` to regenerate TS files

### Validator Implementation

Validators can use listeners to traverse parse trees:

```typescript
import { BaseApexParserListener } from '../../../parser/listeners/BaseApexParserListener';

class MyValidatorListener extends BaseApexParserListener<void> {
  enterMethodDeclaration(ctx: MethodDeclarationContext): void {
    // Validate method
    if (ctx.parameterList()?.parameter().length > 32) {
      this.addError('Too many parameters');
    }
  }
}
```

## Additional Resources

- **Grammar Files**: https://github.com/apex-dev-tools/apex-parser/tree/main/antlr
- **Parser Package**: `@apexdevtools/apex-parser` (v4.4.1+)
- **Project README**: `packages/apex-parser-ast/README.md` - Comprehensive architecture documentation
- **Existing Listeners**: `packages/apex-parser-ast/src/parser/listeners/` - Reference implementations
