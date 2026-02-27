/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { TypeVisibilityValidator } from '../../../../src/semantics/validation/validators';
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

describe('TypeVisibilityValidator (version)', () => {
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

  const VALIDATOR_CATEGORY = 'type-visibility';

  it('should have correct metadata', () => {
    expect(TypeVisibilityValidator.id).toBe('type-visibility');
    expect(TypeVisibilityValidator.name).toBe('Type Visibility Validator');
    expect(TypeVisibilityValidator.tier).toBe(ValidationTier.THOROUGH);
  });

  it('should detect NOT_VISIBLE_MAX_VERSION when using @Deprecated(removed=57) type with apiVersion 58', async () => {
    // Compile DeprecatedRemoved57 first so it's available for cross-file resolution
    await compileFixture(
      VALIDATOR_CATEGORY,
      'DeprecatedRemoved57.cls',
      'file:///test/DeprecatedRemoved57.cls',
      symbolManager,
      compilerService,
    );

    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'DeprecatedRemoved57Consumer.cls',
      'file:///test/DeprecatedRemoved57Consumer.cls',
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
        enableVersionSpecificValidation: true,
        apiVersion: 58,
      },
    );

    await Effect.runPromise(
      symbolManager.resolveCrossFileReferencesForFile(
        symbolTable.getFileUri() || '',
      ),
    );

    const result = await runValidator(
      TypeVisibilityValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const errors = result.errors.filter(
      (e: { code: string }) => e.code === ErrorCodes.NOT_VISIBLE_MAX_VERSION,
    );
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should NOT report NOT_VISIBLE_MAX_VERSION when apiVersion < removed', async () => {
    await compileFixture(
      VALIDATOR_CATEGORY,
      'DeprecatedRemoved57.cls',
      'file:///test/DeprecatedRemoved57.cls',
      symbolManager,
      compilerService,
    );
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'DeprecatedRemoved57Consumer.cls',
      'file:///test/DeprecatedRemoved57Consumer.cls',
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
        enableVersionSpecificValidation: true,
        apiVersion: 56,
      },
    );

    await Effect.runPromise(
      symbolManager.resolveCrossFileReferencesForFile(
        symbolTable.getFileUri() || '',
      ),
    );

    const result = await runValidator(
      TypeVisibilityValidator.validate(symbolTable, options),
      symbolManager,
    );

    const versionErrors = result.errors.filter(
      (e: { code: string }) =>
        e.code === ErrorCodes.NOT_VISIBLE_MAX_VERSION ||
        e.code === ErrorCodes.NOT_VISIBLE_MIN_VERSION,
    );
    expect(versionErrors.length).toBe(0);
  });

  it('should NOT report version errors when enableVersionSpecificValidation is false', async () => {
    await compileFixture(
      VALIDATOR_CATEGORY,
      'DeprecatedRemoved57.cls',
      'file:///test/DeprecatedRemoved57.cls',
      symbolManager,
      compilerService,
    );
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'DeprecatedRemoved57Consumer.cls',
      'file:///test/DeprecatedRemoved57Consumer.cls',
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
        enableVersionSpecificValidation: false,
        apiVersion: 58,
      },
    );

    await Effect.runPromise(
      symbolManager.resolveCrossFileReferencesForFile(
        symbolTable.getFileUri() || '',
      ),
    );

    const result = await runValidator(
      TypeVisibilityValidator.validate(symbolTable, options),
      symbolManager,
    );

    const versionErrors = result.errors.filter(
      (e: { code: string }) =>
        e.code === ErrorCodes.NOT_VISIBLE_MAX_VERSION ||
        e.code === ErrorCodes.NOT_VISIBLE_MIN_VERSION,
    );
    expect(versionErrors.length).toBe(0);
  });
});
