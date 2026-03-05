/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ConstructorValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import { Effect } from 'effect';
import {
  runValidator,
  compileFixtureWithOptions,
} from './helpers/validation-test-helpers';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

describe('ConstructorValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();

    // Enable console logging for debugging
    enableConsoleLogging();
    setLogLevel('error');
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'constructor';

  it('should have correct metadata', () => {
    expect(ConstructorValidator.id).toBe('constructor');
    expect(ConstructorValidator.name).toBe('Constructor Validator');
    expect(ConstructorValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(ConstructorValidator.priority).toBe(8);
  });

  it('should detect invalid super() call placement', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'InvalidSuperCall.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      ConstructorValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const hasSuperCallError = result.errors.some(
      (e: any) => e.code === ErrorCodes.INVALID_SUPER_CALL,
    );
    expect(hasSuperCallError).toBe(true);
  });

  it('should detect invalid this() call placement', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'InvalidThisCall.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      ConstructorValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const hasThisCallError = result.errors.some(
      (e: any) => e.code === ErrorCodes.INVALID_THIS_CALL,
    );
    expect(hasThisCallError).toBe(true);
  });

  it('should detect instance method reference in constructor call', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'InstanceMethodInConstructor.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      ConstructorValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const hasInstanceMethodError = result.errors.some(
      (e: any) =>
        e.code === ErrorCodes.ILLEGAL_INSTANCE_METHOD_REFERENCE_IN_CONSTRUCTOR,
    );
    expect(hasInstanceMethodError).toBe(true);
  });

  it('should detect instance variable reference in constructor call', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'InstanceVariableInConstructor.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      ConstructorValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const hasInstanceVarError = result.errors.some(
      (e: any) =>
        e.code ===
        ErrorCodes.ILLEGAL_INSTANCE_VARIABLE_REFERENCE_IN_CONSTRUCTOR,
    );
    expect(hasInstanceVarError).toBe(true);
  });

  it('should detect constructor return statement', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'ConstructorReturn.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      ConstructorValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const hasReturnError = result.errors.some(
      (e: any) => e.code === ErrorCodes.INVALID_CONSTRUCTOR_RETURN,
    );
    expect(hasReturnError).toBe(true);
  });

  it('should detect super() call without superclass', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'NoSuperType.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      ConstructorValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const hasNoSuperTypeError = result.errors.some(
      (e: any) => e.code === ErrorCodes.NO_SUPER_TYPE,
    );
    expect(hasNoSuperTypeError).toBe(true);
  });

  it('should pass validation for valid constructors', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'ValidConstructor.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      ConstructorValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  describe('TIER 2: Constructor signature type validation', () => {
    it('should validate super() calls with correct argument types', async () => {
      // First compile parent class
      await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'ParentWithTypedConstructors.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: true,
        },
      );

      // Then compile child class
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'ChildWithCorrectSuperTypes.cls',
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
        ConstructorValidator.validate(symbolTable, options),
        symbolManager,
      );

      if (!result.isValid) {
        console.log(
          'ConstructorValidator errors:',
          JSON.stringify(result.errors, null, 2),
        );
      }

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect super() calls with incorrect argument types', async () => {
      // First compile parent class
      await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'ParentWithTypedConstructors.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: true,
        },
      );

      // Then compile child class with incorrect types
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'ChildWithIncorrectSuperTypes.cls',
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
        ConstructorValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      const hasUnknownConstructorError = result.errors.some(
        (e: any) => e.code === ErrorCodes.UNKNOWN_CONSTRUCTOR,
      );
      expect(hasUnknownConstructorError).toBe(true);
    });

    it('should validate this() calls with correct argument types', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'ClassWithTypedThisCalls.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: true,
        },
      );

      const result = await runValidator(
        ConstructorValidator.validate(symbolTable, options),
        symbolManager,
      );

      if (result.isValid) {
        console.log(
          'ConstructorValidator result:',
          JSON.stringify(result, null, 2),
        );
      }

      // Should have errors for incorrect this() calls
      expect(result.isValid).toBe(false);
      const hasUnknownConstructorError = result.errors.some(
        (e: any) => e.code === ErrorCodes.UNKNOWN_CONSTRUCTOR,
      );
      if (!hasUnknownConstructorError) {
        console.log('Errors found:', JSON.stringify(result.errors, null, 2));
      }
      expect(hasUnknownConstructorError).toBe(true);
    });
  });
});
