/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ParameterizedTypeValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  runValidator,
  compileFixtureWithOptions,
} from './helpers/validation-test-helpers';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

describe('ParameterizedTypeValidator', () => {
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

  const VALIDATOR_CATEGORY = 'parameterized-type';

  it('should have correct metadata', () => {
    expect(ParameterizedTypeValidator.id).toBe('parameterized-type');
    expect(ParameterizedTypeValidator.name).toBe(
      'Parameterized Type Validator',
    );
    expect(ParameterizedTypeValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(ParameterizedTypeValidator.priority).toBe(8);
  });

  it('should detect INVALID_PARAMETERIZED_TYPE_COUNT', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'InvalidCount.cls',
      undefined,
      symbolManager,
      compilerService,
      { tier: ValidationTier.IMMEDIATE },
    );

    const result = await runValidator(
      ParameterizedTypeValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const countErrors = result.errors.filter(
      (e: { code: string }) =>
        e.code === ErrorCodes.INVALID_PARAMETERIZED_TYPE_COUNT,
    );
    expect(countErrors.length).toBeGreaterThan(0);
  });

  it('should detect TYPE_ARGUMENTS_FOR_NON_PARAMETERIZED_TYPE', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'TypeArgsForNonParameterized.cls',
      undefined,
      symbolManager,
      compilerService,
      { tier: ValidationTier.IMMEDIATE },
    );

    const result = await runValidator(
      ParameterizedTypeValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const typeArgsErrors = result.errors.filter(
      (e: { code: string }) =>
        e.code === ErrorCodes.TYPE_ARGUMENTS_FOR_NON_PARAMETERIZED_TYPE,
    );
    expect(typeArgsErrors.length).toBeGreaterThan(0);
  });

  it('should detect NO_TYPE_ARGUMENTS_FOR_PARAMETERIZED_TYPE', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'NoTypeArgs.cls',
      undefined,
      symbolManager,
      compilerService,
      { tier: ValidationTier.IMMEDIATE },
    );

    const result = await runValidator(
      ParameterizedTypeValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const noArgsErrors = result.errors.filter(
      (e: { code: string }) =>
        e.code === ErrorCodes.NO_TYPE_ARGUMENTS_FOR_PARAMETERIZED_TYPE,
    );
    expect(noArgsErrors.length).toBeGreaterThan(0);
  });

  it('should detect PARAMETERIZED_TYPE_TOO_DEEP', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'TooDeep.cls',
      undefined,
      symbolManager,
      compilerService,
      { tier: ValidationTier.IMMEDIATE },
    );

    const result = await runValidator(
      ParameterizedTypeValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const tooDeepErrors = result.errors.filter(
      (e: { code: string }) =>
        e.code === ErrorCodes.PARAMETERIZED_TYPE_TOO_DEEP,
    );
    expect(tooDeepErrors.length).toBeGreaterThan(0);
  });

  it('should detect MAXIMUM_TYPE_DEPTH_EXCEEDED', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'MaximumTypeDepthExceeded.cls',
      undefined,
      symbolManager,
      compilerService,
      { tier: ValidationTier.IMMEDIATE },
    );

    const result = await runValidator(
      ParameterizedTypeValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const maxDepthErrors = result.errors.filter(
      (e: { code: string }) =>
        e.code === ErrorCodes.MAXIMUM_TYPE_DEPTH_EXCEEDED,
    );
    expect(maxDepthErrors.length).toBeGreaterThan(0);
  });

  it('should pass valid parameterized types', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'ValidParameterized.cls',
      undefined,
      symbolManager,
      compilerService,
      { tier: ValidationTier.IMMEDIATE },
    );

    const result = await runValidator(
      ParameterizedTypeValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });
});
