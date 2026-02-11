/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { InstanceofValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  runValidator,
  compileFixtureWithOptions,
} from './helpers/validation-test-helpers';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

describe('InstanceofValidator', () => {
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

  const VALIDATOR_CATEGORY = 'instanceof';

  it('should have correct metadata', () => {
    expect(InstanceofValidator.id).toBe('instanceof');
    expect(InstanceofValidator.name).toBe('Instanceof Validator');
    expect(InstanceofValidator.tier).toBe(ValidationTier.THOROUGH);
    expect(InstanceofValidator.priority).toBe(6);
  });

  it('should detect INVALID_INSTANCEOF_INVALID_TYPE for primitive RHS', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'InvalidType.cls',
      undefined,
      symbolManager,
      compilerService,
      { tier: ValidationTier.THOROUGH },
    );

    const result = await runValidator(
      InstanceofValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const invalidTypeErrors = result.errors.filter(
      (e: { code: string }) =>
        e.code === ErrorCodes.INVALID_INSTANCEOF_INVALID_TYPE,
    );
    expect(invalidTypeErrors.length).toBeGreaterThan(0);
  });

  // Cast expression (String)o resolves to String; String not assignable to AlwaysFalse
  it.skip('should detect INVALID_INSTANCEOF_ALWAYS_FALSE', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'AlwaysFalse.cls',
      undefined,
      symbolManager,
      compilerService,
      { tier: ValidationTier.THOROUGH },
    );

    const result = await runValidator(
      InstanceofValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const alwaysFalseErrors = result.errors.filter(
      (e: { code: string }) =>
        e.code === ErrorCodes.INVALID_INSTANCEOF_ALWAYS_FALSE,
    );
    expect(alwaysFalseErrors.length).toBeGreaterThan(0);
  });

  it('should detect INVALID_INSTANCEOF_ALWAYS_TRUE', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'AlwaysTrue.cls',
      undefined,
      symbolManager,
      compilerService,
      { tier: ValidationTier.THOROUGH },
    );

    const result = await runValidator(
      InstanceofValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const alwaysTrueErrors = result.errors.filter(
      (e: { code: string }) =>
        e.code === ErrorCodes.INVALID_INSTANCEOF_ALWAYS_TRUE,
    );
    expect(alwaysTrueErrors.length).toBeGreaterThan(0);
  });

  it('should pass valid instanceof', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'ValidInstanceof.cls',
      undefined,
      symbolManager,
      compilerService,
      { tier: ValidationTier.THOROUGH },
    );

    const result = await runValidator(
      InstanceofValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });
});
