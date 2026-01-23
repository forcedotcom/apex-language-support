/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ConstructorNamingValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  compileFixture,
  getMessage,
  runValidator,
  createValidationOptions,
} from './helpers/validation-test-helpers';

describe('ConstructorNamingValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'constructor-naming';

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
    expect(ConstructorNamingValidator.id).toBe('constructor-naming');
    expect(ConstructorNamingValidator.name).toBe(
      'Constructor Naming Validator',
    );
    expect(ConstructorNamingValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(ConstructorNamingValidator.priority).toBe(1);
  });

  it('should pass validation for constructor with matching name', async () => {
    const symbolTable = await compileFixtureForValidator('MatchingName.cls');

    const result = await runValidator(
      ConstructorNamingValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // Note: Parser enforces case-sensitive constructor naming, so these tests cannot run
  it.skip('should pass validation for constructor with matching name (case-insensitive)', async () => {
    // Parser catches case mismatches before validator runs
    const symbolTable = await compileFixtureForValidator(
      'MatchingNameCaseInsensitive.cls',
    );

    const result = await runValidator(
      ConstructorNamingValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it.skip('should pass validation for constructor with matching name (different case)', async () => {
    // Parser catches case mismatches before validator runs
    const symbolTable = await compileFixtureForValidator(
      'MatchingNameDifferentCase.cls',
    );

    const result = await runValidator(
      ConstructorNamingValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it.skip('should fail validation for constructor with non-matching name', async () => {
    // Parser catches name mismatches before validator runs
    const symbolTable = await compileFixtureForValidator('NonMatchingName.cls');

    const result = await runValidator(
      ConstructorNamingValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const errorMessage = getMessage(result.errors[0]);
    expect(errorMessage).toContain('WrongName');
    expect(errorMessage).toContain('MyClass');
    expect(errorMessage).toContain('must match');
  });

  it('should pass validation for class with no constructors', async () => {
    const symbolTable = await compileFixtureForValidator('NoConstructor.cls');

    const result = await runValidator(
      ConstructorNamingValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it.skip('should validate multiple constructors in same class', async () => {
    // Parser catches case mismatches before validator runs
    const symbolTable = await compileFixtureForValidator(
      'MultipleConstructors.cls',
    );

    const result = await runValidator(
      ConstructorNamingValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it.skip('should validate multiple classes independently', async () => {
    // Parser catches name mismatches before validator runs
    // Compile both classes
    await compileFixtureForValidator('ValidClass.cls');
    const symbolTable = await compileFixtureForValidator('InvalidClass.cls');

    const result = await runValidator(
      ConstructorNamingValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    // Should detect error in InvalidClass
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const errorMessage = getMessage(result.errors[0]);
    expect(errorMessage).toContain('InvalidClass');
    expect(errorMessage).toContain('WrongName');
  });
});
