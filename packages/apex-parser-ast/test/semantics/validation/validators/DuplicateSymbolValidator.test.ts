/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DuplicateSymbolValidator } from '../../../../src/semantics/validation/validators';
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

describe('DuplicateSymbolValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'duplicate-field'; // Using same fixture directory

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

  // Helper to compile variable shadowing fixture
  const compileVariableFixture = async (filename: string, fileUri?: string) =>
    compileFixture(
      'variable-shadowing',
      filename,
      fileUri,
      symbolManager,
      compilerService,
    );

  it('should have correct metadata', () => {
    expect(DuplicateSymbolValidator.id).toBe('duplicate-symbol');
    expect(DuplicateSymbolValidator.name).toBe('Duplicate Symbol Validator');
    expect(DuplicateSymbolValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(DuplicateSymbolValidator.priority).toBe(1);
  });

  describe('Field duplicate detection', () => {
    it('should pass validation for class with unique field names', async () => {
      const symbolTable = await compileFixtureForValidator('UniqueFields.cls');

      const result = await runValidator(
        DuplicateSymbolValidator.validate(
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
        DuplicateSymbolValidator.validate(
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
        DuplicateSymbolValidator.validate(
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
        DuplicateSymbolValidator.validate(
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
        DuplicateSymbolValidator.validate(
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
        DuplicateSymbolValidator.validate(
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

  describe('Variable duplicate detection', () => {
    it('should fail validation for variable shadowing parameter (same scope duplicate)', async () => {
      const symbolTable = await compileVariableFixture(
        'ShadowingParameter.cls',
      );

      const result = await runValidator(
        DuplicateSymbolValidator.validate(
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
      expect(error.code).toBe(ErrorCodes.DUPLICATE_VARIABLE);
      const errorMessage = getMessage(error);
      expect(errorMessage).toContain('Duplicate variable');
    });

    it('should report only one error for variable shadowing parameter (not duplicate)', async () => {
      // This test verifies that we don't get duplicate errors:
      // - One from the listener during symbol collection
      // - One from the validator
      // The listener should NOT report parameter shadowing (only true duplicate variables)
      const symbolTable = await compileVariableFixture(
        'ShadowingParameter.cls',
      );

      const result = await runValidator(
        DuplicateSymbolValidator.validate(
          symbolTable,
          createValidationOptions(symbolManager, {
            tier: ValidationTier.IMMEDIATE,
            allowArtifactLoading: false,
          }),
        ),
        symbolManager,
      );

      // Should have exactly one error (from validator, not listener)
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(1);
      const error = result.errors[0];
      expect(error.code).toBe(ErrorCodes.DUPLICATE_VARIABLE);
      // Error location should use identifierRange (just the variable name, not the full declaration)
      expect(error.location).toBeDefined();
      expect(error.location?.identifierRange).toBeDefined();
    });
  });
});
