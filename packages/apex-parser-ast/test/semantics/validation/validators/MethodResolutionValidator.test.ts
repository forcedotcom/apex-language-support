/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { MethodResolutionValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import { Effect } from 'effect';
import {
  compileFixtureWithOptions,
  runValidator,
} from './helpers/validation-test-helpers';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

describe('MethodResolutionValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();

    // Enable console logging and set to debug level while debugging
    enableConsoleLogging();
    setLogLevel('error');
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'method-resolution';

  it('should have correct metadata', () => {
    expect(MethodResolutionValidator.id).toBe('method-resolution');
    expect(MethodResolutionValidator.name).toBe('Method Resolution Validator');
    expect(MethodResolutionValidator.tier).toBe(ValidationTier.THOROUGH);
    expect(MethodResolutionValidator.priority).toBe(10);
  });

  describe('TIER 2: Parameter type matching', () => {
    it('should validate method calls with correct argument types', async () => {
      // First compile the class with typed methods
      await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'ClassWithTypedMethods.cls',
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
        'CallerWithCorrectTypes.cls',
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
        MethodResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect method calls with incorrect argument types', async () => {
      // First compile the class with typed methods
      await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'ClassWithTypedMethods.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: true,
        },
      );

      // Then compile the caller class with incorrect types
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'CallerWithIncorrectTypes.cls',
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
        MethodResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      const hasParameterTypeError = result.errors.some(
        (e: any) =>
          e.code === ErrorCodes.METHOD_DOES_NOT_SUPPORT_PARAMETER_TYPE,
      );
      expect(hasParameterTypeError).toBe(true);
    });
  });

  describe('TIER 2: Return type checking', () => {
    it('should validate method calls with correct return types', async () => {
      // First compile the class with return types
      await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'MethodWithReturnType.cls',
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
        'CallerWithCorrectReturnTypes.cls',
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
        MethodResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect method calls with incorrect return types', async () => {
      // First compile the class with return types
      await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'MethodWithReturnType.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: true,
        },
      );

      // Then compile the caller class with incorrect return types
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'CallerWithIncorrectReturnTypes.cls',
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
        MethodResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      const hasReturnTypeError = result.errors.some(
        (e: any) => e.code === ErrorCodes.METHOD_DOES_NOT_SUPPORT_RETURN_TYPE,
      );
      expect(hasReturnTypeError).toBe(true);
    });
  });
});
