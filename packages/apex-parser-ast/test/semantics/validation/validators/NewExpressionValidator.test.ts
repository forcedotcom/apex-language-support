/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { NewExpressionValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  compileFixture,
  compileFixtureWithOptions,
  runValidator,
} from './helpers/validation-test-helpers';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

describe('NewExpressionValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
    enableConsoleLogging();
    setLogLevel('error');
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'new-expression';

  it('should have correct metadata', () => {
    expect(NewExpressionValidator.id).toBe('new-expression');
    expect(NewExpressionValidator.name).toBe('New Expression Validator');
    expect(NewExpressionValidator.tier).toBe(ValidationTier.THOROUGH);
    expect(NewExpressionValidator.priority).toBe(14);
  });

  it('should detect NEW_INNER_TYPE_NAME_CONFLICT_OUTER', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'ConflictOuter.cls',
      'file:///test/ConflictOuter.cls',
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
      },
    );

    await Effect.runPromise(
      symbolManager.resolveCrossFileReferencesForFile(
        symbolTable.getFileUri() || '',
      ),
    );

    const result = await runValidator(
      NewExpressionValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.NEW_INNER_TYPE_NAME_CONFLICT_OUTER,
    );
    expect(hasError).toBe(true);
  });

  it('should detect NEW_INNER_TYPE_NAME_CONFLICT_SUPER_TYPE', async () => {
    await compileFixture(
      VALIDATOR_CATEGORY,
      'SuperConflictParent.cls',
      'file:///test/SuperConflictParent.cls',
      symbolManager,
      compilerService,
    );

    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'SuperConflict.cls',
      'file:///test/SuperConflict.cls',
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
      },
    );

    await Effect.runPromise(
      symbolManager.resolveCrossFileReferencesForFile(
        symbolTable.getFileUri() || '',
      ),
    );

    const result = await runValidator(
      NewExpressionValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.NEW_INNER_TYPE_NAME_CONFLICT_SUPER_TYPE,
    );
    expect(hasError).toBe(true);
  });

  it('should detect NEW_INNER_TYPE_NAME_CONFLICT_INTERFACE', async () => {
    await compileFixture(
      VALIDATOR_CATEGORY,
      'InterfaceConflictInterface.cls',
      'file:///test/InterfaceConflictInterface.cls',
      symbolManager,
      compilerService,
    );

    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'InterfaceConflict.cls',
      'file:///test/InterfaceConflict.cls',
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
      },
    );

    await Effect.runPromise(
      symbolManager.resolveCrossFileReferencesForFile(
        symbolTable.getFileUri() || '',
      ),
    );

    const result = await runValidator(
      NewExpressionValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.NEW_INNER_TYPE_NAME_CONFLICT_INTERFACE,
    );
    expect(hasError).toBe(true);
  });

  it('should detect NEW_NAME_MEMBER_CONFLICT', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'MemberConflict.cls',
      'file:///test/MemberConflict.cls',
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
      },
    );

    await Effect.runPromise(
      symbolManager.resolveCrossFileReferencesForFile(
        symbolTable.getFileUri() || '',
      ),
    );

    const result = await runValidator(
      NewExpressionValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.NEW_NAME_MEMBER_CONFLICT,
    );
    expect(hasError).toBe(true);
  });

  it('should detect NEW_NAME_CONFLICT_LOCAL', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'LocalConflict.cls',
      'file:///test/LocalConflict.cls',
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
      },
    );

    await Effect.runPromise(
      symbolManager.resolveCrossFileReferencesForFile(
        symbolTable.getFileUri() || '',
      ),
    );

    const result = await runValidator(
      NewExpressionValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.NEW_NAME_CONFLICT_LOCAL,
    );
    expect(hasError).toBe(true);
  });

  it.skip('should detect NEW_NAME_INVALID_EXCEPTION (exception type must end in Exception)', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'NewExceptionNameInvalid.cls',
      'file:///test/NewExceptionNameInvalid.cls',
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: true,
      },
    );

    await Effect.runPromise(
      symbolManager.resolveCrossFileReferencesForFile(
        symbolTable.getFileUri() || '',
      ),
    );

    const result = await runValidator(
      NewExpressionValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.NEW_NAME_INVALID_EXCEPTION,
    );
    expect(hasError).toBe(true);
  });

  it.skip('should detect NEW_NAME_CANNOT_END_EXCEPTION (non-exception type cannot end in Exception)', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'NewNonExceptionNameEndsException.cls',
      'file:///test/NewNonExceptionNameEndsException.cls',
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: true,
      },
    );

    await Effect.runPromise(
      symbolManager.resolveCrossFileReferencesForFile(
        symbolTable.getFileUri() || '',
      ),
    );

    const result = await runValidator(
      NewExpressionValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.NEW_NAME_CANNOT_END_EXCEPTION,
    );
    expect(hasError).toBe(true);
  });

  it('should pass validation for valid new expression', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'ValidNewExpression.cls',
      'file:///test/ValidNewExpression.cls',
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      NewExpressionValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
