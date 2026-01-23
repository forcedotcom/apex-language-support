/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { AbstractMethodBodyValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  compileFixture,
  getMessage,
  runValidator,
  createValidationOptions,
} from './helpers/validation-test-helpers';

describe('AbstractMethodBodyValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'abstract-method-body';

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
    expect(AbstractMethodBodyValidator.id).toBe('abstract-method-body');
    expect(AbstractMethodBodyValidator.name).toBe(
      'Abstract Method Body Validator',
    );
    expect(AbstractMethodBodyValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(AbstractMethodBodyValidator.priority).toBe(1);
  });

  it('should pass validation for abstract method without body', async () => {
    const symbolTable = await compileFixtureForValidator(
      'AbstractMethodNoBody.cls',
    );

    const result = await runValidator(
      AbstractMethodBodyValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    if (!result.isValid && result.errors.length > 0) {
      console.log(
        'Validation errors:',
        result.errors.map((e) => getMessage(e)),
      );
    }

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail validation for abstract method with body', async () => {
    const symbolTable = await compileFixtureForValidator(
      'AbstractMethodWithBody.cls',
    );

    const result = await runValidator(
      AbstractMethodBodyValidator.validate(
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
    expect(errorMessage).toContain('abstractMethod');
    expect(errorMessage).toContain('abstract');
    expect(errorMessage).toContain('body');
  });
});
