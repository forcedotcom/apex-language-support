/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { MethodOverrideValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  compileFixture,
  runValidator,
  createValidationOptions,
} from './helpers/validation-test-helpers';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';

describe('MethodOverrideValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'method-override';

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
    expect(MethodOverrideValidator.id).toBe('method-override');
    expect(MethodOverrideValidator.name).toBe('Method Override Validator');
    expect(MethodOverrideValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(MethodOverrideValidator.priority).toBe(9);
  });

  it('should detect missing @Override on overriding methods', async () => {
    const symbolTable = await compileFixtureForValidator('MissingOverride.cls');

    const result = await runValidator(
      MethodOverrideValidator.validate(
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
    const error = result.errors[0] as any;
    expect(error.code).toBe(ErrorCodes.METHODS_MUST_OVERRIDE);
  });

  it('should detect @Override on non-overriding methods', async () => {
    const symbolTable = await compileFixtureForValidator('InvalidOverride.cls');

    const result = await runValidator(
      MethodOverrideValidator.validate(
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
    const error = result.errors[0] as any;
    expect(error.code).toBe(ErrorCodes.METHOD_DOES_NOT_OVERRIDE);
  });

  it('should detect reduced visibility in override', async () => {
    const symbolTable = await compileFixtureForValidator(
      'ReducedVisibility.cls',
    );

    const result = await runValidator(
      MethodOverrideValidator.validate(
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
    const hasReducedVisibilityError = result.errors.some(
      (e: any) =>
        e.code === ErrorCodes.CANNOT_REDUCE_METHOD_VISIBILITY_OVERRIDE,
    );
    expect(hasReducedVisibilityError).toBe(true);
  });

  it('should detect overriding non-virtual methods', async () => {
    const symbolTable = await compileFixtureForValidator(
      'OverrideNonVirtual.cls',
    );

    const result = await runValidator(
      MethodOverrideValidator.validate(
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
    const hasNonVirtualError = result.errors.some(
      (e: any) => e.code === ErrorCodes.NON_VIRTUAL_METHODS_CANNOT_OVERRIDE,
    );
    expect(hasNonVirtualError).toBe(true);
  });

  it('should pass valid override methods', async () => {
    const symbolTable = await compileFixtureForValidator('ValidOverride.cls');

    const result = await runValidator(
      MethodOverrideValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });
});
