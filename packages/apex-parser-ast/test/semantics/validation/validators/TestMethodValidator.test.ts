/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TestMethodValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  compileFixture,
  runValidator,
  createValidationOptions,
} from './helpers/validation-test-helpers';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';

describe('TestMethodValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'test-method';

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
    expect(TestMethodValidator.id).toBe('test-method');
    expect(TestMethodValidator.name).toBe('Test Method Validator');
    expect(TestMethodValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(TestMethodValidator.priority).toBe(6);
  });

  it('should detect @isTest method with parameters', async () => {
    const symbolTable = await compileFixtureForValidator(
      'TestMethodWithParams.cls',
    );

    const result = await runValidator(
      TestMethodValidator.validate(
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
    const error = result.errors[0] as any;
    expect(error.code).toBe(ErrorCodes.TEST_METHOD_CANNOT_HAVE_PARAMS);
  });

  it('should detect @TestSetup method with parameters', async () => {
    const symbolTable = await compileFixtureForValidator(
      'TestSetupWithParams.cls',
    );

    const result = await runValidator(
      TestMethodValidator.validate(
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
    const error = result.errors[0] as any;
    expect(error.code).toBe(ErrorCodes.TEST_SETUP_CANNOT_HAVE_PARAMS);
  });

  it('should detect @TestSetup method with non-void return type', async () => {
    const symbolTable = await compileFixtureForValidator(
      'TestSetupNonVoid.cls',
    );

    const result = await runValidator(
      TestMethodValidator.validate(
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
    const error = result.errors[0] as any;
    expect(error.code).toBe(ErrorCodes.TEST_SETUP_MUST_RETURN_VOID);
  });

  it('should detect exception class marked as test', async () => {
    const symbolTable = await compileFixtureForValidator(
      'ExceptionTestClass.cls',
    );

    const result = await runValidator(
      TestMethodValidator.validate(
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
    const error = result.errors[0] as any;
    expect(error.code).toBe(ErrorCodes.TEST_CLASS_MUST_NOT_BE_EXCEPTION);
  });

  it('should pass validation for valid test class and methods', async () => {
    const symbolTable = await compileFixtureForValidator('ValidTestClass.cls');

    const result = await runValidator(
      TestMethodValidator.validate(
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
});
