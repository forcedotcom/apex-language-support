/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { TypeResolutionValidator } from '../../../../src/semantics/validation/validators';
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

describe('TypeResolutionValidator', () => {
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

  const VALIDATOR_CATEGORY = 'type-resolution';

  it('should have correct metadata', () => {
    expect(TypeResolutionValidator.id).toBe('type-resolution');
    expect(TypeResolutionValidator.name).toBe('Type Resolution Validator');
    expect(TypeResolutionValidator.tier).toBe(ValidationTier.THOROUGH);
    expect(TypeResolutionValidator.priority).toBe(5);
  });

  it('should detect INVALID_UNRESOLVED_TYPE for unknown types', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'UnresolvedType.cls',
      'file:///test/UnresolvedType.cls',
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
      TypeResolutionValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const unresolvedErrors = result.errors.filter(
      (e: any) => e.code === ErrorCodes.INVALID_UNRESOLVED_TYPE,
    );
    expect(unresolvedErrors.length).toBeGreaterThan(0);
  });

  it('should pass validation for valid types', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'ValidType.cls',
      'file:///test/ValidType.cls',
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      TypeResolutionValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect INVALID_UNRESOLVED_TYPE for generic type arguments (List<NonExistentType>)', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'GenericUnresolved.cls',
      'file:///test/GenericUnresolved.cls',
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
      TypeResolutionValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const unresolvedErrors = result.errors.filter(
      (e: { code: string }) => e.code === ErrorCodes.INVALID_UNRESOLVED_TYPE,
    );
    expect(unresolvedErrors.length).toBeGreaterThan(0);
  });

  it('should detect INVALID_CLASS when instantiating interface', async () => {
    await compileFixture(
      VALIDATOR_CATEGORY,
      'InterfaceUsedAsClass.cls',
      'file:///test/InterfaceUsedAsClass.cls',
      symbolManager,
      compilerService,
    );

    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'NewInterface.cls',
      'file:///test/NewInterface.cls',
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
      TypeResolutionValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const invalidClassErrors = result.errors.filter(
      (e: any) => e.code === ErrorCodes.INVALID_CLASS,
    );
    expect(invalidClassErrors.length).toBeGreaterThan(0);
  });
});
