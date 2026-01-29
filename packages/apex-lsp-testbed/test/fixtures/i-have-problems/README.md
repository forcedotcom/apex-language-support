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
   - Validator: DuplicateFieldValidator

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

8. **VariableShadowing.cls** - Variable shadows parameter/field
   - Error Code: `duplicate.variable`
   - Validator: VariableShadowingValidator

9. **ForwardReference.cls** - Variable used before declaration
   - Error Code: `illegal.forward.reference`
   - Validator: ForwardReferenceValidator

10. **FinalMultipleAssignment.cls** - Final variable assigned multiple times
    - Error Code: `invalid.final.field.assignment`
    - Validator: FinalAssignmentValidator

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

3. **ClassHierarchyIssue.cls** - Class extends final class
   - Error Code: `invalid.final.super.type`
   - Validator: ClassHierarchyValidator
   - Requires **FinalBaseClass.cls** to be present (final class that cannot be extended)

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
