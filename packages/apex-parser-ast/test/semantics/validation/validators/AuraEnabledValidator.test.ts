/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { AuraEnabledValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  compileFixture,
  runValidator,
  createValidationOptions,
} from './helpers/validation-test-helpers';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';

describe('AuraEnabledValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'aura-enabled';

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
    expect(AuraEnabledValidator.id).toBe('aura-enabled');
    expect(AuraEnabledValidator.name).toBe('Aura Enabled Validator');
    expect(AuraEnabledValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(AuraEnabledValidator.priority).toBe(7);
  });

  it('should detect non-static AuraEnabled method with parameters', async () => {
    const symbolTable = await compileFixtureForValidator(
      'NonStaticWithParams.cls',
    );

    const result = await runValidator(
      AuraEnabledValidator.validate(
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
    expect(error.code).toBe(
      ErrorCodes.NON_STATIC_AURA_METHOD_CANNOT_HAVE_PARAMS,
    );
  });

  it('should detect non-static AuraEnabled method not beginning with "get"', async () => {
    const symbolTable = await compileFixtureForValidator(
      'NonStaticWrongName.cls',
    );

    const result = await runValidator(
      AuraEnabledValidator.validate(
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
    expect(error.code).toBe(
      ErrorCodes.NON_STATIC_AURA_METHOD_MUST_BEGIN_WITH_GET,
    );
  });

  it('should detect overloaded AuraEnabled methods', async () => {
    const symbolTable = await compileFixtureForValidator(
      'OverloadedMethod.cls',
    );

    const result = await runValidator(
      AuraEnabledValidator.validate(
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
    expect(error.code).toBe(ErrorCodes.AURA_OVERLOADED_METHOD);
  });

  it('should detect duplicate AuraEnabled method and field names', async () => {
    const symbolTable = await compileFixtureForValidator(
      'DuplicateMethodField.cls',
    );

    const result = await runValidator(
      AuraEnabledValidator.validate(
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
    expect(error.code).toBe(ErrorCodes.AURA_DUPLICATE_METHOD_FIELD);
  });

  it('should pass validation for valid AuraEnabled methods', async () => {
    const symbolTable = await compileFixtureForValidator(
      'ValidAuraEnabled.cls',
    );

    const result = await runValidator(
      AuraEnabledValidator.validate(
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
