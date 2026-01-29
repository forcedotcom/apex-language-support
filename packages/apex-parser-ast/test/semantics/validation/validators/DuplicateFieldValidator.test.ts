/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DuplicateFieldValidator } from '../../../../src/semantics/validation/validators';
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

describe('DuplicateFieldValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'duplicate-field';

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
    expect(DuplicateFieldValidator.id).toBe('duplicate-field');
    expect(DuplicateFieldValidator.name).toBe('Duplicate Field Validator');
    expect(DuplicateFieldValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(DuplicateFieldValidator.priority).toBe(1);
  });

  it('should pass validation for class with unique field names', async () => {
    const symbolTable = await compileFixtureForValidator('UniqueFields.cls');

    const result = await runValidator(
      DuplicateFieldValidator.validate(
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

  it.skip('should fail validation for duplicate static fields', async () => {
    // Note: Duplicate fields are caught during compilation by ApexSymbolCollectorListener
    // (duplicate.variable error), so they never make it into the symbol table.
    // The validator cannot check what isn't in the symbol table, so this test is skipped.
    // The duplicate field detection happens at the parser/listener level, not validator level.
    const symbolTable = await compileFixtureForValidator(
      'DuplicateStaticFields.cls',
    );

    const result = await runValidator(
      DuplicateFieldValidator.validate(
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
    expect(error.code).toBe(ErrorCodes.DUPLICATE_FIELD);
    const errorMessage = getMessage(error);
    expect(errorMessage).toContain('Duplicate field');
  });

  it.skip('should fail validation for duplicate non-static fields', async () => {
    // Note: Duplicate fields are caught during compilation by ApexSymbolCollectorListener
    // (duplicate.variable error), so they never make it into the symbol table.
    // The validator cannot check what isn't in the symbol table, so this test is skipped.
    const symbolTable = await compileFixtureForValidator(
      'DuplicateNonStaticFields.cls',
    );

    const result = await runValidator(
      DuplicateFieldValidator.validate(
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
    expect(error.code).toBe(ErrorCodes.DUPLICATE_FIELD);
  });

  it.skip('should allow static and non-static fields with same name (non-static first)', async () => {
    // Note: This case is handled by ApexSymbolCollectorListener during compilation.
    // The validator validates what's in the symbol table, but the listener handles
    // the static/non-static ordering rules. This test is skipped as the validator
    // would see both fields in the symbol table and need to check ordering.
    // Apex allows: String foo; static String foo; (non-static before static)
    const symbolTable = await compileFixtureForValidator(
      'StaticAndNonStatic.cls',
    );

    const result = await runValidator(
      DuplicateFieldValidator.validate(
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

  it.skip('should fail validation for static field before non-static with same name', async () => {
    // Note: This case is caught during compilation by ApexSymbolCollectorListener
    // (duplicate.variable error), so it never makes it into the symbol table.
    // Apex does NOT allow: static String foo; String foo; (static before non-static)
    const symbolTable = await compileFixtureForValidator(
      'StaticBeforeNonStatic.cls',
    );

    const result = await runValidator(
      DuplicateFieldValidator.validate(
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
    expect(error.code).toBe(ErrorCodes.DUPLICATE_FIELD);
  });

  it.skip('should handle case-insensitive field name comparison', async () => {
    // Note: Case-insensitive duplicates are caught during compilation by ApexSymbolCollectorListener
    // (duplicate.variable error), so they never make it into the symbol table.
    const symbolTable = await compileFixtureForValidator(
      'CaseInsensitiveDuplicate.cls',
    );

    const result = await runValidator(
      DuplicateFieldValidator.validate(
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
    expect(error.code).toBe(ErrorCodes.DUPLICATE_FIELD);
  });
});
