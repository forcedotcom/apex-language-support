/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { VariableShadowingValidator } from '../../../../src/semantics/validation/validators/VariableShadowingValidator';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  compileFixture,
  getMessage,
  runValidator,
  createValidationOptions,
} from './helpers/validation-test-helpers';

describe('VariableShadowingValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'variable-shadowing';

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
    expect(VariableShadowingValidator.id).toBe('variable-shadowing');
    expect(VariableShadowingValidator.name).toBe(
      'Variable Shadowing Validator',
    );
    expect(VariableShadowingValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(VariableShadowingValidator.priority).toBe(1);
  });

  it('should pass validation for variables with different names', async () => {
    const symbolTable = await compileFixtureForValidator('DifferentNames.cls');

    const result = await runValidator(
      VariableShadowingValidator.validate(
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

  it('should fail validation for variable shadowing parameter', async () => {
    const symbolTable = await compileFixtureForValidator(
      'ShadowingParameter.cls',
    );

    const result = await runValidator(
      VariableShadowingValidator.validate(
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
    expect(errorMessage).toContain('param1');
    expect(errorMessage).toContain('shadow');
  });
});
