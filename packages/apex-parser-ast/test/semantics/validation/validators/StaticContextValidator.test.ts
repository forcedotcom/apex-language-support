/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { StaticContextValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  compileFixture,
  compileFixtureWithOptions,
  compileSourceLayeredWithOptions,
  loadFixture,
  runValidator,
} from './helpers/validation-test-helpers';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

describe('StaticContextValidator', () => {
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

  const VALIDATOR_CATEGORY = 'static-context';

  it('should have correct metadata', () => {
    expect(StaticContextValidator.id).toBe('static-context');
    expect(StaticContextValidator.name).toBe('Static Context Validator');
    expect(StaticContextValidator.tier).toBe(ValidationTier.THOROUGH);
    expect(StaticContextValidator.priority).toBe(12);
  });

  it('should detect INVALID_STATIC_METHOD_CONTEXT when calling static via instance', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'StaticMethodFromInstance.cls',
      'file:///test/StaticMethodFromInstance.cls',
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
      StaticContextValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.INVALID_STATIC_METHOD_CONTEXT,
    );
    expect(hasError).toBe(true);
  });

  it('should detect INVALID_NON_STATIC_METHOD_CONTEXT when calling instance from static', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'NonStaticFromStatic.cls',
      'file:///test/NonStaticFromStatic.cls',
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
      StaticContextValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.INVALID_NON_STATIC_METHOD_CONTEXT,
    );
    expect(hasError).toBe(true);
  });

  it('should detect INVALID_SUPER_STATIC_CONTEXT', async () => {
    await compileFixture(
      VALIDATOR_CATEGORY,
      'SuperInStaticParent.cls',
      'file:///test/SuperInStaticParent.cls',
      symbolManager,
      compilerService,
    );

    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'SuperInStatic.cls',
      'file:///test/SuperInStatic.cls',
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
      StaticContextValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.INVALID_SUPER_STATIC_CONTEXT,
    );
    expect(hasError).toBe(true);
  });

  it('should detect INVALID_THIS_STATIC_CONTEXT', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'ThisInStatic.cls',
      'file:///test/ThisInStatic.cls',
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      StaticContextValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.INVALID_THIS_STATIC_CONTEXT,
    );
    expect(hasError).toBe(true);
  });

  it('should detect INVALID_STATIC_METHOD_CONTEXT in chained static call (this.staticA().staticB())', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'ChainedStaticCall.cls',
      'file:///test/ChainedStaticCall.cls',
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
      StaticContextValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: { code: string }) =>
        e.code === ErrorCodes.INVALID_STATIC_METHOD_CONTEXT,
    );
    expect(hasError).toBe(true);
  });

  it('should pass validation for valid static context', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'ValidStaticContext.cls',
      'file:///test/ValidStaticContext.cls',
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      StaticContextValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should pass validation when static method accesses obj.Id (property.Id pattern)', async () => {
    await compileFixture(
      VALIDATOR_CATEGORY,
      'HasIdField.cls',
      'file:///test/HasIdField.cls',
      symbolManager,
      compilerService,
    );

    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'PropertyIdAccess.cls',
      'file:///test/PropertyIdAccess.cls',
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
      StaticContextValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    const nonStaticVarErrors = result.errors.filter(
      (e: any) => e.code === ErrorCodes.INVALID_NON_STATIC_VARIABLE_CONTEXT,
    );
    expect(nonStaticVarErrors).toHaveLength(0);
  });

  it('should pass validation when static method accesses instance field via class instance', async () => {
    await compileFixture(
      VALIDATOR_CATEGORY,
      'InstanceFieldAndProps.cls',
      'file:///test/InstanceFieldAndProps.cls',
      symbolManager,
      compilerService,
    );

    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'StaticAccessesInstance.cls',
      'file:///test/StaticAccessesInstance.cls',
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
      StaticContextValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    const nonStaticVarErrors = result.errors.filter(
      (e: any) => e.code === ErrorCodes.INVALID_NON_STATIC_VARIABLE_CONTEXT,
    );
    expect(nonStaticVarErrors).toHaveLength(0);
  });

  it('should NOT report INVALID_NON_STATIC_VARIABLE_CONTEXT for address.street', async () => {
    const testSource = loadFixture('geocoding', 'GeocodingServiceTest.cls');

    await compileFixture(
      'geocoding',
      'GeocodingService.cls',
      'file:///test/GeocodingService.cls',
      symbolManager,
      compilerService,
    );

    const { symbolTable, options } = await compileSourceLayeredWithOptions(
      testSource,
      'file:///test/GeocodingServiceTest.cls',
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
      StaticContextValidator.validate(symbolTable, options),
      symbolManager,
    );

    const streetErrors = result.errors.filter(
      (e: any) =>
        e.code === ErrorCodes.INVALID_NON_STATIC_VARIABLE_CONTEXT &&
        (e.message?.includes('street') ?? false),
    );

    if (streetErrors.length > 0) {
      console.log('Unexpected street errors:', streetErrors);
    }

    expect(streetErrors).toHaveLength(0);
  });
});
