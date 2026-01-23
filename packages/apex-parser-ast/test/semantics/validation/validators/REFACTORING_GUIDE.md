# Validation Test Refactoring Guide

This guide documents the refactoring of validator tests to use fixture files instead of embedded source code.

## Completed

✅ **ClassHierarchyValidator** - Fully refactored with fixtures in `test/fixtures/validation/class-hierarchy/`
✅ **InterfaceHierarchyValidator** - Fully refactored with fixtures in `test/fixtures/validation/interface-hierarchy/`
✅ **TypeAssignmentValidator** - Fully refactored with fixtures in `test/fixtures/validation/type-assignment/`
✅ **ParameterLimitValidator** - Fully refactored with fixtures in `test/fixtures/validation/parameter-limit/`
✅ **EnumLimitValidator** - Fully refactored with fixtures in `test/fixtures/validation/enum-limit/`
✅ **ConstructorNamingValidator** - Fully refactored with fixtures in `test/fixtures/validation/constructor-naming/`
✅ **DuplicateMethodValidator** - Fully refactored with fixtures in `test/fixtures/validation/duplicate-method/`
✅ **EnumConstantNamingValidator** - Fully refactored with fixtures in `test/fixtures/validation/enum-constant-naming/`
✅ **TypeSelfReferenceValidator** - Fully refactored with fixtures in `test/fixtures/validation/type-self-reference/`
✅ **FinalAssignmentValidator** - Fully refactored with fixtures in `test/fixtures/validation/final-assignment/`
✅ **AbstractMethodBodyValidator** - Fully refactored with fixtures in `test/fixtures/validation/abstract-method-body/`
✅ **VariableShadowingValidator** - Fully refactored with fixtures in `test/fixtures/validation/variable-shadowing/`
✅ **ForwardReferenceValidator** - Fully refactored with fixtures in `test/fixtures/validation/forward-reference/`
✅ **MethodSignatureEquivalenceValidator** - Fully refactored with fixtures in `test/fixtures/validation/method-signature-equivalence/`

## Pattern to Follow

### 1. Create Fixture Folder Structure

Create a subfolder under `test/fixtures/validation/` for each validator:
- `class-hierarchy/` ✅
- `interface-hierarchy/` (in progress)
- `type-assignment/` (pending)
- `abstract-method-body/` (pending)
- `constructor-naming/` (pending)
- `duplicate-method/` (pending)
- `enum-constant-naming/` (pending)
- `enum-limit/` (pending)
- `final-assignment/` (pending)
- `forward-reference/` (pending)
- `method-signature-equivalence/` (pending)
- `parameter-limit/` (pending)
- `type-self-reference/` (pending)
- `variable-shadowing/` (pending)

### 2. Create Fixture Files

Create `.cls` files in the appropriate subfolder with real Apex code that represents the test scenarios.

### 3. Update Test File

Replace manual symbol creation with fixture compilation:

**Before:**
```typescript
const symbolTable = new SymbolTable();
const ifaceA = SymbolFactory.createMinimalSymbol(...);
symbolTable.addSymbol(ifaceA, null);
```

**After:**
```typescript
import {
  compileFixture,
  getMessage,
  runValidator,
  createValidationOptions,
} from './helpers/validation-test-helpers';

const VALIDATOR_CATEGORY = 'interface-hierarchy';

const compileFixtureForValidator = async (filename: string, fileUri?: string) =>
  compileFixture(VALIDATOR_CATEGORY, filename, fileUri, symbolManager, compilerService);

const symbolTable = await compileFixtureForValidator('InterfaceA.cls');
```

### 4. Use Shared Helpers

- `compileFixture(category, filename, fileUri, symbolManager, compilerService)` - Compiles a fixture file
- `runValidator(validatorEffect, symbolManager)` - Runs validator with all required services
- `createValidationOptions(symbolManager, overrides?)` - Creates validation options
- `getMessage(errorOrWarning)` - Extracts error/warning message

### 5. Test Structure

```typescript
describe('ValidatorName', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'validator-category';

  const compileFixtureForValidator = async (filename: string, fileUri?: string) =>
    compileFixture(VALIDATOR_CATEGORY, filename, fileUri, symbolManager, compilerService);

  it('should test scenario', async () => {
    const symbolTable = await compileFixtureForValidator('TestFile.cls');
    
    const result = await runValidator(
      ValidatorName.validate(symbolTable, createValidationOptions(symbolManager)),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
  });
});
```

## Remaining Validators

See individual test files for current implementation and required fixtures.
