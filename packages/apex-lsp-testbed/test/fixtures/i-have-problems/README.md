# i-have-problems SFDX Project

This Salesforce DX project demonstrates various semantic validation errors that can be detected by the Apex Language Server. It contains Apex classes that intentionally violate semantic rules to showcase error detection capabilities.

## Purpose

This project serves as a test fixture for validating semantic error detection in the Apex Language Server. Each class demonstrates a specific type of semantic validation error.

## Project Structure

```
fixtures/i-have-problems/
├── sfdx-project.json          # SFDX project configuration
├── .gitignore                 # Standard SFDX gitignore
├── README.md                  # This file
├── .vscode/
│   └── settings.json          # VS Code workspace settings
└── force-app/
    └── main/
        └── default/
            └── classes/       # Apex classes demonstrating errors
```

## Semantic Errors Demonstrated

### TIER 1 (IMMEDIATE) Validators

Fast, same-file validations that run on every keystroke:

1. **ParameterLimitExceeded.cls** - Method/constructor with >32 parameters
   - Error Code: `invalid.number.parameters`
   - Validator: ParameterLimitValidator

2. **EnumLimitExceeded.cls** - Enum with >100 values
   - Error Code: `max.enums.exceeded`
   - Validator: EnumLimitValidator

3. **DuplicateField.cls** - Class with duplicate field names
   - Error Code: `duplicate.field`
   - Validator: DuplicateSymbolValidator

4. **DuplicateMethod.cls** - Class with duplicate method signatures
   - Error Code: `method.already.exists`
   - Validator: DuplicateMethodValidator

5. **ConstructorNamingMismatch.cls** - Constructor name doesn't match class
   - Error Code: `invalid.constructor.name`
   - Validator: ConstructorNamingValidator

6. **TypeSelfReference.cls** - Class extends itself
   - Error Code: `circular.definition`
   - Validator: TypeSelfReferenceValidator

7. **AbstractMethodWithBody.cls** - Abstract method has body
   - Error Code: `abstract.methods.cannot.have.body`
   - Validator: AbstractMethodBodyValidator

8. **DuplicateVariable.cls** - Duplicate variable (parameter and local variable in same scope)
   - Error Code: `duplicate.variable`
   - Validator: DuplicateSymbolValidator (TIER 1)
   - **Note**: Same-scope duplicates (variable shadowing parameter in same method) are handled by DuplicateSymbolValidator as ERRORS.
     Cross-scope shadowing (variable shadowing class field) is handled by VariableShadowingValidator as WARNINGS.

9. **ForwardReference.cls** - Variable used before declaration
   - Error Code: `illegal.forward.reference`
   - Validator: ForwardReferenceValidator

10. **FinalMultipleAssignment.cls** - Final variable assigned multiple times
    - Error Code: `invalid.final.field.assignment`
    - Validator: FinalAssignmentValidator

11. **FinalKeywordOnClass.cls** - Invalid use of 'final' keyword on class declaration
    - Error Code: `modifier.is.not.allowed`
    - Validator: ClassModifierValidator
    - **Note**: In Apex, classes are final by default and cannot use the 'final' keyword.
      The 'final' keyword can only be used for variables (to prevent reassignment).

12. **FinalKeywordOnMethod.cls** - Invalid use of 'final' keyword on method declaration
    - Error Code: `modifier.is.not.allowed`
    - Validator: MethodModifierValidator
    - **Note**: In Apex, methods are final by default and cannot use the 'final' keyword.
      The 'final' keyword can only be used for variables (to prevent reassignment).

13. **InterfaceMethodWithAbstract.cls** - Invalid use of 'abstract' keyword on interface method
    - Error Code: `modifier.is.not.allowed` (via "Modifiers are not allowed on interface methods")
    - Validator: MethodModifierValidator.validateInterfaceMethodModifiers
    - **Note**: In Apex, interface methods are implicitly abstract and cannot have explicit modifiers.
      The 'abstract' keyword (and all other modifiers) are not allowed on interface methods.

### TIER 2 (THOROUGH) Validators

Comprehensive validations that may require cross-file analysis:

1. **MethodSignatureEquivalence.cls** - Duplicate method signatures (different return types)
   - Error Code: `method.already.exists`
   - Validator: MethodSignatureEquivalenceValidator

2. **InterfaceHierarchyIssue.cls** - Interface extends itself (self-reference)
   - Error Code: `circular.definition`
   - Validator: InterfaceHierarchyValidator

   **InterfaceA.cls** and **InterfaceB.cls** - Circular interface inheritance
   - Error Code: `circular.definition`
   - Validator: InterfaceHierarchyValidator
   - These two interfaces form a circular dependency (A extends B, B extends A)

3. **ClassHierarchyIssue.cls** - Class extends non-virtual (final-by-default) class
   - Error Code: `invalid.final.super.type`
   - Validator: ClassHierarchyValidator
   - Requires **FinalBaseClass.cls** to be present (non-virtual class that cannot be extended)
   - **Note**: In Apex, classes and methods are final by default and cannot use the `final` keyword.
     To make a class or method extensible/overridable, use the `virtual` keyword instead.
     The `final` keyword can only be used for variables (to prevent reassignment).

4. **TypeAssignmentMismatch.cls** - Type mismatch assignments
   - Error Code: `type.mismatch`
   - Validator: TypeAssignmentValidator

## Usage

### In VS Code

1. Open this project in VS Code with the Apex Language Server extension installed
2. Open any of the Apex class files in the `force-app/main/default/classes/` directory
3. The language server will detect and report semantic errors in the Problems panel
4. Each class demonstrates a specific error type with comments explaining the issue

### In Testbed

This project can be used as a workspace for the Apex LSP Testbed:

```json
{
  "setup": {
    "workspaceRoot": "fixtures/i-have-problems"
  }
}
```

Or with an absolute path:

```json
{
  "setup": {
    "workspaceRoot": "/path/to/apex-language-support/fixtures/i-have-problems"
  }
}
```

## VS Code Settings

The `.vscode/settings.json` file configures:

- `apex.trace.server`: `"verbose"` - Enable verbose server trace for debugging
- `apex.logLevel`: `"error"` - Set log level to error

## Notes

- All classes are syntactically valid Apex code (they parse correctly)
- Errors are semantic in nature (violations of Apex language rules)
- Each class focuses on demonstrating ONE primary error type for clarity
- Source size validation is excluded as it requires generating very large files

## Apex Language Rules

### Final and Virtual Keywords

In Apex:

- **Classes and methods are final by default** - they cannot be extended/overridden
- **Cannot use `final` keyword** on classes or methods (syntax error)
- **Use `virtual` keyword** to make classes/methods extensible/overridable
- **`final` keyword** can only be used for variables (to prevent reassignment)

Example:

```apex
// Correct: Normal class (final by default, cannot be extended)
public class MyClass { }

// Incorrect: Cannot use 'final' keyword on classes
public final class MyClass { }  // Syntax error!

// Correct: Virtual class (can be extended)
public virtual class MyClass { }

// Correct: Final variable (can only be assigned once)
public final Integer count = 5;
```
