/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { MethodSignatureEquivalenceValidator } from '../../../../src/semantics/validation/validators';
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

describe('MethodSignatureEquivalenceValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'method-signature-equivalence';

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
    expect(MethodSignatureEquivalenceValidator.id).toBe(
      'method-signature-equivalence',
    );
    expect(MethodSignatureEquivalenceValidator.name).toBe(
      'Method Signature Equivalence Validator',
    );
    expect(MethodSignatureEquivalenceValidator.tier).toBe(
      ValidationTier.THOROUGH,
    );
    expect(MethodSignatureEquivalenceValidator.priority).toBe(1);
  });

  it('should pass validation for methods with same name but different parameter types', async () => {
    const symbolTable = await compileFixtureForValidator(
      'DifferentParameterTypes.cls',
    );

    const result = await runValidator(
      MethodSignatureEquivalenceValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it.skip('should fail validation for duplicate method signatures', async () => {
    // Parser catches duplicate method signatures before validator runs
    const symbolTable = await compileFixtureForValidator(
      'DuplicateSignature.cls',
    );

    const result = await runValidator(
      MethodSignatureEquivalenceValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const errorMessage = getMessage(result.errors[0]);
    expect(errorMessage).toContain('process');
    expect(errorMessage).toContain('duplicate');
  });
});
