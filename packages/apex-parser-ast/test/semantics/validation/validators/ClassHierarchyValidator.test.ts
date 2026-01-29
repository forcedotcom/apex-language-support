/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ClassHierarchyValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import { ErrorCodes } from '../../../../src/semantics/validation/ErrorCodes';
import {
  compileFixture,
  getMessage,
  runValidator,
  createValidationOptions,
} from './helpers/validation-test-helpers';

describe('ClassHierarchyValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'class-hierarchy';

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
    expect(ClassHierarchyValidator.id).toBe('class-hierarchy');
    expect(ClassHierarchyValidator.name).toBe('Class Hierarchy Validator');
    expect(ClassHierarchyValidator.tier).toBe(ValidationTier.THOROUGH);
    expect(ClassHierarchyValidator.priority).toBe(1);
  });

  it('should pass validation for valid class hierarchy', async () => {
    // Compile both parent and child classes
    await compileFixtureForValidator('ParentClass.cls');
    const symbolTable = await compileFixtureForValidator('ChildClass.cls');

    const result = await runValidator(
      ClassHierarchyValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect simple circular inheritance', async () => {
    // Compile all classes that form a circular dependency
    // ClassA extends ClassB, ClassB extends ClassC, ClassC extends ClassA
    await compileFixtureForValidator('CircularA.cls');
    await compileFixtureForValidator('CircularB.cls');
    const symbolTable = await compileFixtureForValidator('CircularC.cls');

    const result = await runValidator(
      ClassHierarchyValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const circularError = result.errors.find(
      (e) => e.code === ErrorCodes.CIRCULAR_INHERITANCE,
    );
    expect(circularError).toBeDefined();
    expect(getMessage(circularError!)).toContain('Circular definition');
  });

  it('should detect three-class circular inheritance', async () => {
    // Compile all three classes that form a circular dependency
    await compileFixtureForValidator('CircularA.cls');
    await compileFixtureForValidator('CircularB.cls');
    const symbolTable = await compileFixtureForValidator('CircularC.cls');

    const result = await runValidator(
      ClassHierarchyValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const circularError = result.errors.find(
      (e) => e.code === ErrorCodes.CIRCULAR_INHERITANCE,
    );
    expect(circularError).toBeDefined();
    expect(getMessage(circularError!)).toContain('Circular definition');
  });

  it('should detect extending final class', async () => {
    // Compile final parent and child that extends it
    await compileFixtureForValidator('FinalParent.cls');
    const symbolTable = await compileFixtureForValidator(
      'ChildExtendsFinal.cls',
    );

    const result = await runValidator(
      ClassHierarchyValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const error = result.errors.find(
      (e) => e.code === ErrorCodes.INVALID_FINAL_SUPER_TYPE,
    );
    expect(error).toBeDefined();
    const errorMessage = getMessage(error!);
    expect(errorMessage).toContain('Non-virtual and non-abstract type cannot be extended');
  });

  it('should warn for missing superclass', async () => {
    // Compile class that extends non-existent parent
    const symbolTable = await compileFixtureForValidator(
      'MissingSuperclass.cls',
    );

    const result = await runValidator(
      ClassHierarchyValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          allowArtifactLoading: false, // Disable to test missing superclass warning
        }),
      ),
      symbolManager,
    );

    // Missing superclass should generate a warning, not an error
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(
      result.warnings.some((w) => {
        const msg = getMessage(w);
        return (
          msg.includes('Superclass') &&
          msg.includes('NonExistentParent') &&
          msg.includes('not found')
        );
      }),
    ).toBe(true);
  });

  it('should pass validation for class without extends', async () => {
    // Compile standalone class with no extends clause
    const symbolTable = await compileFixtureForValidator('StandaloneClass.cls');

    const result = await runValidator(
      ClassHierarchyValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, { allowArtifactLoading: false }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should handle multi-level inheritance correctly', async () => {
    // Compile grandparent, parent, and child classes
    await compileFixtureForValidator('Grandparent.cls');
    await compileFixtureForValidator('Parent.cls');
    const symbolTable = await compileFixtureForValidator('Child.cls');

    const result = await runValidator(
      ClassHierarchyValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
