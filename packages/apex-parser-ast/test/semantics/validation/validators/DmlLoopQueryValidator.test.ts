/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DmlLoopQueryValidator } from '../../../../src/semantics/validation/validators';
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

describe('DmlLoopQueryValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'dml-statement';

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
    expect(DmlLoopQueryValidator.id).toBe('dml-loop-query');
    expect(DmlLoopQueryValidator.name).toBe('DML Loop Query Validator');
    expect(DmlLoopQueryValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(DmlLoopQueryValidator.priority).toBe(10);
  });

  it('should report LOOP_WITH_QUERY_REQUIRES_STATEMENT for empty loop body', async () => {
    const symbolTable = await compileFixtureForValidator(
      'LoopWithQueryEmptyBody.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'LoopWithQueryEmptyBody.cls',
    );

    const result = await runValidator(
      DmlLoopQueryValidator.validate(
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
    expect(
      result.errors.some(
        (e: any) => e.code === ErrorCodes.LOOP_WITH_QUERY_REQUIRES_STATEMENT,
      ),
    ).toBe(true);
  });

  it('should pass validation for loop with query and non-empty body', async () => {
    const symbolTable = await compileFixtureForValidator(
      'LoopWithQueryValidBody.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'LoopWithQueryValidBody.cls',
    );

    const result = await runValidator(
      DmlLoopQueryValidator.validate(
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
});
