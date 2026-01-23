/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DuplicateMethodValidator } from '../../../../src/semantics/validation/validators/DuplicateMethodValidator';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  compileFixture,
  getMessage,
  runValidator,
  createValidationOptions,
} from './helpers/validation-test-helpers';

describe('DuplicateMethodValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'duplicate-method';

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
    expect(DuplicateMethodValidator.id).toBe('duplicate-method');
    expect(DuplicateMethodValidator.name).toBe('Duplicate Method Validator');
    expect(DuplicateMethodValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(DuplicateMethodValidator.priority).toBe(1);
  });

  it('should pass validation for class with unique method names', async () => {
    const symbolTable = await compileFixtureForValidator('UniqueMethods.cls');

    const result = await runValidator(
      DuplicateMethodValidator.validate(
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

  it('should fail validation for duplicate method with exact same name', async () => {
    const symbolTable = await compileFixtureForValidator('DuplicateExactName.cls');

    const result = await runValidator(
      DuplicateMethodValidator.validate(
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
    expect(errorMessage).toContain('MyClass');
    expect(errorMessage).toContain('doWork');
    expect(errorMessage).toContain('case-insensitive');
  });

  it('should fail validation for duplicate method with different case', async () => {
    const symbolTable = await compileFixtureForValidator('DuplicateDifferentCase.cls');

    const result = await runValidator(
      DuplicateMethodValidator.validate(
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
    // Error may mention class name or interface name, or just the method names
    expect(
      errorMessage.includes('doWork') ||
        errorMessage.includes('DoWork') ||
        errorMessage.includes('MyClass') ||
        errorMessage.includes('class_1'),
    ).toBe(true);
  });
});
