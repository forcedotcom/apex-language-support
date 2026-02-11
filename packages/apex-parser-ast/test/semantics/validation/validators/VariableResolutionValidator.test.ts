/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { VariableResolutionValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import { Effect } from 'effect';
import {
  compileFixtureWithOptions,
  runValidator,
} from './helpers/validation-test-helpers';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';

describe('VariableResolutionValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'variable-resolution';

  it('should have correct metadata', () => {
    expect(VariableResolutionValidator.id).toBe('variable-resolution');
    expect(VariableResolutionValidator.name).toBe(
      'Variable Resolution Validator',
    );
    expect(VariableResolutionValidator.tier).toBe(ValidationTier.THOROUGH);
    expect(VariableResolutionValidator.priority).toBe(10);
  });

  describe('TIER 2: Qualified field access type resolution', () => {
    it('should validate qualified field access with correct object types', async () => {
      // First compile the class with fields
      await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'ClassWithFields.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: true,
        },
      );

      // Then compile the caller class
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'CallerWithQualifiedAccess.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: true,
        },
      );

      // Resolve cross-file references
      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(
          symbolTable.getFileUri() || '',
        ),
      );

      const result = await runValidator(
        VariableResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      // Debug: Log errors if validation fails
      if (!result.isValid) {
        console.log(
          'Validation errors:',
          JSON.stringify(result.errors, null, 2),
        );
      }

      // Should pass validation for correct qualified field access
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid qualified field access on wrong object types', async () => {
      // First compile the class with fields
      await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'ClassWithFields.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: true,
        },
      );

      // Then compile the caller class with invalid field access
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'CallerWithInvalidQualifiedAccess.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: true,
        },
      );

      // Resolve cross-file references
      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(
          symbolTable.getFileUri() || '',
        ),
      );

      const result = await runValidator(
        VariableResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      // Should detect field access errors
      expect(result.isValid).toBe(false);
      const hasFieldError = result.errors.some(
        (e: any) => e.code === ErrorCodes.FIELD_DOES_NOT_EXIST,
      );
      expect(hasFieldError).toBe(true);
    });
  });
});
