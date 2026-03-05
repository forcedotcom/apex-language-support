/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { MethodCallValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  runValidator,
  compileFixtureWithOptions,
  compileFixture,
} from './helpers/validation-test-helpers';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

describe('MethodCallValidator', () => {
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

  const VALIDATOR_CATEGORY = 'method-call';

  it('should have correct metadata', () => {
    expect(MethodCallValidator.id).toBe('method-call');
    expect(MethodCallValidator.name).toBe('Method Call Validator');
    expect(MethodCallValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(MethodCallValidator.priority).toBe(10);
  });

  it('should detect new abstract class instantiation', async () => {
    // First compile the dependency file (AbstractClass)
    await compileFixture(
      VALIDATOR_CATEGORY,
      'NewAbstractClassAbstractClass.cls',
      'file:///test/NewAbstractClassAbstractClass.cls',
      symbolManager,
      compilerService,
    );

    // Then compile the test file that instantiates AbstractClass
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'NewAbstractClassConcreteClass.cls',
      'file:///test/NewAbstractClassConcreteClass.cls',
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      MethodCallValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.INVALID_NEW_ABSTRACT,
    );
    expect(hasError).toBe(true);
  });

  it('should detect abstract method call', async () => {
    // First compile the dependency file (AbstractClass)
    await compileFixture(
      VALIDATOR_CATEGORY,
      'AbstractClass.cls',
      'file:///test/AbstractClass.cls',
      symbolManager,
      compilerService,
    );

    // Then compile the test file that uses AbstractClass
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'ConcreteClass.cls',
      'file:///test/ConcreteClass.cls',
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      MethodCallValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.INVALID_ABSTRACT_METHOD_CALL,
    );
    expect(hasError).toBe(true);
  });

  it('should detect TYPE_NOT_CONSTRUCTABLE for enum instantiation', async () => {
    await compileFixture(
      VALIDATOR_CATEGORY,
      'MyEnum.cls',
      'file:///test/MyEnum.cls',
      symbolManager,
      compilerService,
    );

    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'NewEnum.cls',
      'file:///test/NewEnum.cls',
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      MethodCallValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.TYPE_NOT_CONSTRUCTABLE,
    );
    expect(hasError).toBe(true);
  });

  it('should detect SOBJECT_NOT_CONSTRUCTABLE for generic SObject', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'NewSObject.cls',
      'file:///test/NewSObject.cls',
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      MethodCallValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.SOBJECT_NOT_CONSTRUCTABLE,
    );
    expect(hasError).toBe(true);
  });

  it('should detect METHOD_INVALID_ADD_ERROR_NOT_SOBJECT_FIELD when addError is on variable not field', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'AddErrorInvalid.cls',
      'file:///test/AddErrorInvalid.cls',
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      MethodCallValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) =>
        e.code === ErrorCodes.METHOD_INVALID_ADD_ERROR_NOT_SOBJECT_FIELD,
    );
    expect(hasError).toBe(true);
  });

  it('should pass when addError is on SObject field reference', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'AddErrorValid.cls',
      'file:///test/AddErrorValid.cls',
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      MethodCallValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect DEPRECATE_SOBJECT_RECALCULATEFORMULAS for SObject.recalculateFormulas()', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'SObjectRecalculateFormulas.cls',
      'file:///test/SObjectRecalculateFormulas.cls',
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      MethodCallValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.DEPRECATE_SOBJECT_RECALCULATEFORMULAS,
    );
    expect(hasError).toBe(true);
  });

  it('should detect SAFE_NAVIGATION_INVALID_BETWEEN_SOBJECT_FIELD_AND_ADD_ERROR', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'SafeNavAddErrorInvalid.cls',
      'file:///test/SafeNavAddErrorInvalid.cls',
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      MethodCallValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) =>
        e.code ===
        ErrorCodes.SAFE_NAVIGATION_INVALID_BETWEEN_SOBJECT_FIELD_AND_ADD_ERROR,
    );
    expect(hasError).toBe(true);
  });

  it('should detect SAFE_NAVIGATION_INVALID_BETWEEN_SOBJECT_FIELD_AND_METHOD for getSObjectType', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'SafeNavGetSObjectTypeInvalid.cls',
      'file:///test/SafeNavGetSObjectTypeInvalid.cls',
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      MethodCallValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) =>
        e.code ===
        ErrorCodes.SAFE_NAVIGATION_INVALID_BETWEEN_SOBJECT_FIELD_AND_METHOD,
    );
    expect(hasError).toBe(true);
  });
});
