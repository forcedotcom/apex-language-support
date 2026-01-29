/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { SourceSizeValidator } from '../../../../src/semantics/validation/validators/SourceSizeValidator';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ErrorCodes } from '../../../../src/semantics/validation/ErrorCodes';
import type {
  ValidationResult,
  ValidationErrorInfo,
} from '../../../../src/semantics/validation/ValidationResult';
import type { ValidationError } from '../../../../src/semantics/validation/ValidatorRegistry';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  compileFixture,
  createValidationOptions,
} from './helpers/validation-test-helpers';
import { EffectTestLoggerLive } from '../../../../src/utils/EffectLspLoggerLayer';
import { ValidatorRegistryLive } from '../../../../src/semantics/validation/ValidatorRegistry';

describe('SourceSizeValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'source-size';

  it('should pass validation for class within size limit', async () => {
    const smallClass = 'public class TestClass { }';
    const symbolTable = await compileFixture(
      VALIDATOR_CATEGORY,
      'SmallClass.cls',
      undefined,
      symbolManager,
      compilerService,
    );

    const result = await Effect.runPromise(
      SourceSizeValidator.validate(symbolTable, {
        ...createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
        sourceContent: smallClass,
      }).pipe(
        Effect.provide(ValidatorRegistryLive),
        Effect.provide(EffectTestLoggerLive),
      ) as Effect.Effect<ValidationResult, ValidationError, never>,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect class exceeding size limit', async () => {
    // Create a class that exceeds 1M character limit
    // Note: Using a smaller size for test performance (still exceeds limit)
    const largeClass =
      'public class LargeClass { ' + 'a'.repeat(1000001) + ' }';

    // Compile a small class first to get a valid symbol table structure
    const baseSymbolTable = await compileFixture(
      VALIDATOR_CATEGORY,
      'SmallClass.cls',
      undefined,
      symbolManager,
      compilerService,
    );

    const result = await Effect.runPromise(
      SourceSizeValidator.validate(baseSymbolTable, {
        ...createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
        sourceContent: largeClass,
      }).pipe(
        Effect.provide(ValidatorRegistryLive),
        Effect.provide(EffectTestLoggerLive),
      ) as Effect.Effect<ValidationResult, ValidationError, never>,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const firstError = result.errors[0];
    if (typeof firstError === 'string') {
      expect(firstError).toContain('Script too large');
    } else {
      expect((firstError as ValidationErrorInfo).code).toBe(
        ErrorCodes.SCRIPT_TOO_LARGE,
      );
      expect((firstError as ValidationErrorInfo).message).toContain(
        'Script too large',
      );
    }
  });

  it('should pass validation for interface within size limit', async () => {
    const smallInterface = 'public interface TestInterface { }';
    const symbolTable = await compileFixture(
      VALIDATOR_CATEGORY,
      'SmallInterface.cls',
      undefined,
      symbolManager,
      compilerService,
    );

    const result = await Effect.runPromise(
      SourceSizeValidator.validate(symbolTable, {
        ...createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
        sourceContent: smallInterface,
      }).pipe(
        Effect.provide(ValidatorRegistryLive),
        Effect.provide(EffectTestLoggerLive),
      ) as Effect.Effect<ValidationResult, ValidationError, never>,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should pass validation for enum within size limit', async () => {
    const smallEnum = 'public enum TestEnum { VALUE1, VALUE2 }';
    const symbolTable = await compileFixture(
      VALIDATOR_CATEGORY,
      'SmallEnum.cls',
      undefined,
      symbolManager,
      compilerService,
    );

    const result = await Effect.runPromise(
      SourceSizeValidator.validate(symbolTable, {
        ...createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
        sourceContent: smallEnum,
      }).pipe(
        Effect.provide(ValidatorRegistryLive),
        Effect.provide(EffectTestLoggerLive),
      ) as Effect.Effect<ValidationResult, ValidationError, never>,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should skip validation when sourceContent is not provided', async () => {
    const symbolTable = await compileFixture(
      VALIDATOR_CATEGORY,
      'SmallClass.cls',
      undefined,
      symbolManager,
      compilerService,
    );

    const result = await Effect.runPromise(
      SourceSizeValidator.validate(symbolTable, {
        ...createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
        // sourceContent not provided
      }).pipe(
        Effect.provide(ValidatorRegistryLive),
        Effect.provide(EffectTestLoggerLive),
      ) as Effect.Effect<ValidationResult, ValidationError, never>,
    );

    // Should pass when sourceContent is not available
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should handle anonymous block size limit', async () => {
    // Anonymous blocks have 32K limit
    const smallAnonymous = 'System.debug("test");';
    const symbolTable = new (
      await import('../../../../src/types/symbol')
    ).SymbolTable();

    const result = await Effect.runPromise(
      SourceSizeValidator.validate(symbolTable, {
        ...createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
        sourceContent: smallAnonymous,
      }).pipe(
        Effect.provide(ValidatorRegistryLive),
        Effect.provide(EffectTestLoggerLive),
      ) as Effect.Effect<ValidationResult, ValidationError, never>,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect anonymous block exceeding size limit', async () => {
    // Create anonymous block exceeding 32K limit
    const largeAnonymous = 'System.debug("' + 'a'.repeat(32001) + '");';
    const symbolTable = new (
      await import('../../../../src/types/symbol')
    ).SymbolTable();

    const result = await Effect.runPromise(
      SourceSizeValidator.validate(symbolTable, {
        ...createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
        sourceContent: largeAnonymous,
      }).pipe(
        Effect.provide(ValidatorRegistryLive),
        Effect.provide(EffectTestLoggerLive),
      ) as Effect.Effect<ValidationResult, ValidationError, never>,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const firstError = result.errors[0];
    if (typeof firstError === 'string') {
      expect(firstError).toContain('Script too large');
    } else {
      expect((firstError as ValidationErrorInfo).code).toBe(
        ErrorCodes.SCRIPT_TOO_LARGE,
      );
    }
  });
});
