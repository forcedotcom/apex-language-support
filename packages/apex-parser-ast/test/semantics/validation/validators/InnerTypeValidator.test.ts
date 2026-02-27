/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { InnerTypeValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  compileFixtureWithOptions,
  runValidator,
} from './helpers/validation-test-helpers';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

describe('InnerTypeValidator', () => {
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

  const VALIDATOR_CATEGORY = 'inner-type';

  it('should have correct metadata', () => {
    expect(InnerTypeValidator.id).toBe('inner-type');
    expect(InnerTypeValidator.name).toBe('Inner Type Validator');
    expect(InnerTypeValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(InnerTypeValidator.priority).toBe(8);
  });

  it('should detect INVALID_INNER_TYPE_NO_INNER_TYPES', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'InnerWithInner.cls',
      'file:///test/InnerWithInner.cls',
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      InnerTypeValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.INVALID_INNER_TYPE_NO_INNER_TYPES,
    );
    expect(hasError).toBe(true);
  });

  it('should detect INVALID_INNER_TYPE_NO_STATIC_BLOCKS', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'InnerWithStaticBlock.cls',
      'file:///test/InnerWithStaticBlock.cls',
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      InnerTypeValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.INVALID_INNER_TYPE_NO_STATIC_BLOCKS,
    );
    expect(hasError).toBe(true);
  });

  it('should pass validation for valid inner type', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'ValidInnerType.cls',
      'file:///test/ValidInnerType.cls',
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      InnerTypeValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
