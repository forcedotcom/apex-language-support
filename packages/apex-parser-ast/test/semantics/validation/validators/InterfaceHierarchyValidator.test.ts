/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { InterfaceHierarchyValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';
import {
  compileFixture,
  getMessage,
  runValidator,
  createValidationOptions,
} from './helpers/validation-test-helpers';

describe('InterfaceHierarchyValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'interface-hierarchy';

  // Helper to compile a fixture file for this validator
  const compileFixtureForValidator = async (
    filename: string,
    fileUri?: string,
  ) =>
    compileFixture(
      VALIDATOR_CATEGORY,
      filename,
      fileUri,
      symbolManager,
      compilerService,
    );

  it('should have correct metadata', () => {
    expect(InterfaceHierarchyValidator.id).toBe('interface-hierarchy');
    expect(InterfaceHierarchyValidator.name).toBe(
      'Interface Hierarchy Validator',
    );
    expect(InterfaceHierarchyValidator.tier).toBe(ValidationTier.THOROUGH);
    expect(InterfaceHierarchyValidator.priority).toBe(1);
  });

  it('should pass validation for valid interface hierarchy', async () => {
    // Compile both interfaces
    await compileFixtureForValidator('InterfaceA.cls');
    const symbolTable = await compileFixtureForValidator('InterfaceB.cls');

    const result = await runValidator(
      InterfaceHierarchyValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect simple circular inheritance', async () => {
    // Compile both interfaces that form a circular dependency
    await compileFixtureForValidator('CircularInterfaceA.cls');
    const symbolTable = await compileFixtureForValidator(
      'CircularInterfaceB.cls',
    );

    const result = await runValidator(
      InterfaceHierarchyValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const error = result.errors[0];
    expect(error.code).toBe(ErrorCodes.CIRCULAR_DEFINITION);
    const errorMessage = getMessage(error);
    expect(errorMessage).toContain('Circular definition');
  });

  it('should detect longer circular inheritance chain', async () => {
    // Compile all three interfaces that form a circular dependency
    await compileFixtureForValidator('CircularInterfaceA.cls');
    await compileFixtureForValidator('CircularInterfaceB.cls');
    const symbolTable = await compileFixtureForValidator(
      'CircularInterfaceC.cls',
    );

    const result = await runValidator(
      InterfaceHierarchyValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const circularError = result.errors.find(
      (e) => e.code === ErrorCodes.CIRCULAR_DEFINITION,
    );
    expect(circularError).toBeDefined();
    expect(getMessage(circularError!)).toContain('Circular definition');
  });

  it('should detect duplicate extends', async () => {
    // Compile interface A first, then interface B with duplicate extends
    await compileFixtureForValidator('InterfaceA.cls');
    const symbolTable = await compileFixtureForValidator(
      'DuplicateExtends.cls',
    );

    const result = await runValidator(
      InterfaceHierarchyValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const error = result.errors[0];
    expect(error.code).toBe(ErrorCodes.GENERIC_INTERFACE_ALREADY_IMPLEMENTED);
    const errorMessage = getMessage(error);
    expect(errorMessage).toContain('Generic Interface already implemented');
  });

  it('should pass validation for interface extending multiple interfaces', async () => {
    // Compile all three interfaces
    await compileFixtureForValidator('InterfaceA.cls');
    await compileFixtureForValidator('InterfaceB.cls');
    const symbolTable = await compileFixtureForValidator('InterfaceC.cls');

    const result = await runValidator(
      InterfaceHierarchyValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect class not implementing interface method', async () => {
    // Compile interface and class that doesn't implement the method
    await compileFixtureForValidator('MyInterface.cls');
    const symbolTable = await compileFixtureForValidator(
      'MyClassMissingMethod.cls',
    );

    const result = await runValidator(
      InterfaceHierarchyValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const error = result.errors[0];
    expect(error.code).toBe(ErrorCodes.INTERFACE_IMPLEMENTATION_MISSING_METHOD);
    const errorMessage = getMessage(error);
    expect(errorMessage).toContain('must implement the method');
  });

  it('should pass validation for class implementing all interface methods', async () => {
    // Compile interface and class that implements the method
    await compileFixtureForValidator('MyInterface.cls');
    const symbolTable = await compileFixtureForValidator(
      'MyClassWithMethod.cls',
    );

    const result = await runValidator(
      InterfaceHierarchyValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // Note: Additional test cases for abstract classes, methods with parameters, etc.
  // can be added as fixtures are created. The pattern is the same:
  // 1. Create fixture files in interface-hierarchy/ folder
  // 2. Compile fixtures using compileFixtureForValidator
  // 3. Run validator using runValidator helper
});
