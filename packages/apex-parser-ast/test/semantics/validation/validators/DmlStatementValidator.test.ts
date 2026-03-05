/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DmlStatementValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  compileFixture,
  loadFixture,
  runValidator,
  createValidationOptions,
} from './helpers/validation-test-helpers';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';

describe('DmlStatementValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'dml-statement';

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
    expect(DmlStatementValidator.id).toBe('dml-statement');
    expect(DmlStatementValidator.name).toBe('DML Statement Validator');
    expect(DmlStatementValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(DmlStatementValidator.priority).toBe(9);
  });

  it('should pass validation for valid DML statements', async () => {
    const symbolTable = await compileFixtureForValidator(
      'ValidDmlStatements.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'ValidDmlStatements.cls',
    );

    const result = await runValidator(
      DmlStatementValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
          sourceContent,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should not report errors for DML with unknown variable types (permissive without org access)', async () => {
    // Without the stdlib loaded in the test symbol manager, primitive type names
    // like String and Integer are not in the graph. isSObjectTypeName is permissive
    // for unknown names to avoid false positives. In production (with stdlib loaded)
    // these would be identified as non-SObjects via graph lookup.
    const symbolTable = await compileFixtureForValidator(
      'InvalidDmlStatements.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'InvalidDmlStatements.cls',
    );

    const result = await runValidator(
      DmlStatementValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
          sourceContent,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
  });

  it('should pass validation for valid merge with concrete types', async () => {
    const symbolTable = await compileFixtureForValidator(
      'MergeConcreteType.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'MergeConcreteType.cls',
    );

    const result = await runValidator(
      DmlStatementValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
          sourceContent,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should report MERGE_REQUIRES_CONCRETE_TYPE and INVALID_MERGE_DUPLICATE_RECORDS', async () => {
    const symbolTable = await compileFixtureForValidator(
      'MergeInvalidTypes.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'MergeInvalidTypes.cls',
    );

    const result = await runValidator(
      DmlStatementValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
          sourceContent,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(
      result.errors.some(
        (e: any) => e.code === ErrorCodes.MERGE_REQUIRES_CONCRETE_TYPE,
      ),
    ).toBe(true);
    expect(
      result.errors.some(
        (e: any) => e.code === ErrorCodes.INVALID_MERGE_DUPLICATE_RECORDS,
      ),
    ).toBe(true);
  });

  it('should pass validation for upsert with field spec and concrete type', async () => {
    const symbolTable = await compileFixtureForValidator(
      'UpsertWithFieldSpec.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'UpsertWithFieldSpec.cls',
    );

    const result = await runValidator(
      DmlStatementValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
          sourceContent,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should report UPSERT_REQUIRES_CONCRETE_TYPE for SObject with field spec', async () => {
    const symbolTable = await compileFixtureForValidator(
      'UpsertInvalidFieldSpec.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'UpsertInvalidFieldSpec.cls',
    );

    const result = await runValidator(
      DmlStatementValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
          sourceContent,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(
      result.errors.some(
        (e: any) => e.code === ErrorCodes.UPSERT_REQUIRES_CONCRETE_TYPE,
      ),
    ).toBe(true);
  });
});
