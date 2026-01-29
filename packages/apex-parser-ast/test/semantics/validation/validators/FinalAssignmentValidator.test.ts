/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { FinalAssignmentValidator } from '../../../../src/semantics/validation/validators';
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

describe('FinalAssignmentValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'final-assignment';

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
    expect(FinalAssignmentValidator.id).toBe('final-assignment');
    expect(FinalAssignmentValidator.name).toBe('Final Assignment Validator');
    expect(FinalAssignmentValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(FinalAssignmentValidator.priority).toBe(1);
  });

  it('should pass validation for final variable assigned once', async () => {
    const symbolTable = await compileFixtureForValidator(
      'SingleAssignment.cls',
    );

    const result = await runValidator(
      FinalAssignmentValidator.validate(
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
        '[TEST] FinalAssignmentValidator errors:',
        result.errors.map((e) => getMessage(e)),
      );
    }

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail validation for final variable assigned multiple times', async () => {
    const symbolTable = await compileFixtureForValidator(
      'MultipleAssignments.cls',
    );

    const result = await runValidator(
      FinalAssignmentValidator.validate(
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
    const error = result.errors[0];
    expect(error.code).toBe(ErrorCodes.FINAL_MULTIPLE_ASSIGNMENT);
    const errorMessage = getMessage(error);
    expect(errorMessage).toContain('Final members can only be assigned');
  });
});
