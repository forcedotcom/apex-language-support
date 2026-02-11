/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DuplicateAnnotationMethodValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  compileFixture,
  getMessage,
  runValidator,
  createValidationOptions,
} from './helpers/validation-test-helpers';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';

describe('DuplicateAnnotationMethodValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'duplicate-annotation-method';

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
    expect(DuplicateAnnotationMethodValidator.id).toBe(
      'duplicate-annotation-method',
    );
    expect(DuplicateAnnotationMethodValidator.name).toBe(
      'Duplicate Annotation Method Validator',
    );
    expect(DuplicateAnnotationMethodValidator.tier).toBe(
      ValidationTier.IMMEDIATE,
    );
    expect(DuplicateAnnotationMethodValidator.priority).toBe(4);
  });

  it('should pass validation for unique annotation methods', async () => {
    const symbolTable = await compileFixtureForValidator(
      'ValidUniqueMethods.cls',
    );

    const result = await runValidator(
      DuplicateAnnotationMethodValidator.validate(
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

  it.skip('should detect duplicate RemoteAction methods with same name and param count', async () => {
    // Note: Methods with identical signatures may be filtered during compilation.
    // If both methods have the same name and parameter types, the parser may only
    // keep one in the symbol table, making it impossible to detect duplicates.
    // This test is skipped until we can verify both methods are collected.
    const symbolTable = await compileFixtureForValidator(
      'DuplicateRemoteAction.cls',
    );

    const result = await runValidator(
      DuplicateAnnotationMethodValidator.validate(
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
    expect(error.code).toBe(ErrorCodes.DUPLICATE_REMOTE_ACTION_METHODS);
    expect(getMessage(error)).toContain('Remote Action');
  });

  it('should pass validation for RemoteAction methods with different param counts', async () => {
    const symbolTable = await compileFixtureForValidator(
      'DuplicateRemoteActionDifferentParams.cls',
    );

    const result = await runValidator(
      DuplicateAnnotationMethodValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    // RemoteAction allows same name with different parameter counts
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect duplicate WebService methods with same name', async () => {
    const symbolTable = await compileFixtureForValidator(
      'DuplicateWebService.cls',
    );

    const result = await runValidator(
      DuplicateAnnotationMethodValidator.validate(
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
    expect(error.code).toBe(ErrorCodes.DUPLICATE_WEB_SERVICE_METHODS);
    expect(getMessage(error)).toContain('Web Service');
  });

  it('should detect duplicate WebService methods even with different param counts', async () => {
    const symbolTable = await compileFixtureForValidator(
      'DuplicateWebServiceDifferentParams.cls',
    );

    const result = await runValidator(
      DuplicateAnnotationMethodValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    // WebService doesn't allow any duplicates, even with different params
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const error = result.errors[0] as any;
    expect(error.code).toBe(ErrorCodes.DUPLICATE_WEB_SERVICE_METHODS);
  });
});
