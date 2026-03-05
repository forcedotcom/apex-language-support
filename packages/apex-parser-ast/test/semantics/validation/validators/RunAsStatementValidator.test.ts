/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { RunAsStatementValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  compileFixture,
  loadFixture,
  runValidator,
  createValidationOptions,
} from './helpers/validation-test-helpers';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';

describe('RunAsStatementValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'runas-statement';

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
    expect(RunAsStatementValidator.id).toBe('runas-statement');
    expect(RunAsStatementValidator.name).toBe('RunAs Statement Validator');
    expect(RunAsStatementValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(RunAsStatementValidator.priority).toBe(10);
  });

  it('should pass validation for valid runAs statements', async () => {
    const symbolTable = await compileFixtureForValidator(
      'ValidRunAsStatements.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'ValidRunAsStatements.cls',
    );

    const result = await runValidator(
      RunAsStatementValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
          sourceContent,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should report error for invalid runAs statement types', async () => {
    const symbolTable = await compileFixtureForValidator(
      'InvalidRunAsStatements.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'InvalidRunAsStatements.cls',
    );

    const result = await runValidator(
      RunAsStatementValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
          sourceContent,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    // Should have errors for invalid runAs statements
    const hasInvalidRunAsError = result.errors.some(
      (e: any) => e.code === ErrorCodes.INVALID_RUNAS,
    );
    expect(hasInvalidRunAsError).toBe(true);
  });
});
