/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TypeSelfReferenceValidator } from '../../../../src/semantics/validation/validators/TypeSelfReferenceValidator';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  compileFixture,
  getMessage,
  runValidator,
  createValidationOptions,
} from './helpers/validation-test-helpers';

describe('TypeSelfReferenceValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'type-self-reference';

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
    expect(TypeSelfReferenceValidator.id).toBe('type-self-reference');
    expect(TypeSelfReferenceValidator.name).toBe(
      'Type Self-Reference Validator',
    );
    expect(TypeSelfReferenceValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(TypeSelfReferenceValidator.priority).toBe(1);
  });

  it('should pass validation for class extending different class', async () => {
    // Compile parent class first
    await compileFixtureForValidator('ParentClass.cls');
    const symbolTable = await compileFixtureForValidator(
      'ExtendsDifferentClass.cls',
    );

    const result = await runValidator(
      TypeSelfReferenceValidator.validate(
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

  it('should fail validation for class extending itself', async () => {
    const symbolTable = await compileFixtureForValidator('SelfExtending.cls');

    const result = await runValidator(
      TypeSelfReferenceValidator.validate(
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
    const errorMessage = getMessage(result.errors[0]);
    expect(errorMessage).toContain('SelfExtending');
    expect(errorMessage).toContain('cannot extend itself');
  });

  it('should fail validation for class implementing itself', async () => {
    const symbolTable = await compileFixtureForValidator(
      'SelfImplementing.cls',
    );

    const result = await runValidator(
      TypeSelfReferenceValidator.validate(
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
    const errorMessage = getMessage(result.errors[0]);
    expect(errorMessage).toContain('SelfImplementing');
    expect(errorMessage).toContain('cannot implement itself');
  });

  it('should fail validation for interface extending itself', async () => {
    const symbolTable = await compileFixtureForValidator(
      'InterfaceSelfExtending.cls',
    );

    const result = await runValidator(
      TypeSelfReferenceValidator.validate(
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
    const errorMessage = getMessage(result.errors[0]);
    expect(errorMessage).toContain('InterfaceSelfExtending');
    expect(errorMessage).toContain('cannot extend itself');
  });
});
