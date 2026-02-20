/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ControlFlowValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  compileFixture,
  getMessage,
  runValidator,
  createValidationOptions,
  loadFixture,
} from './helpers/validation-test-helpers';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';

describe('ControlFlowValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'control-flow';

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
    expect(ControlFlowValidator.id).toBe('control-flow');
    expect(ControlFlowValidator.name).toBe('Control Flow Validator');
    expect(ControlFlowValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(ControlFlowValidator.priority).toBe(3);
  });

  it('should pass validation for valid break statement in loop', async () => {
    const symbolTable = await compileFixtureForValidator(
      'ValidBreakInLoop.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'ValidBreakInLoop.cls',
    );

    const result = await runValidator(
      ControlFlowValidator.validate(
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

  it('should pass validation for valid continue statement in loop', async () => {
    const symbolTable = await compileFixtureForValidator(
      'ValidContinueInLoop.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'ValidContinueInLoop.cls',
    );

    const result = await runValidator(
      ControlFlowValidator.validate(
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

  it('should pass validation for valid return statement in method', async () => {
    const symbolTable = await compileFixtureForValidator(
      'ValidReturnInMethod.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'ValidReturnInMethod.cls',
    );

    const result = await runValidator(
      ControlFlowValidator.validate(
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

  it('should detect break statement outside loop', async () => {
    const symbolTable = await compileFixtureForValidator(
      'BreakOutsideLoop.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'BreakOutsideLoop.cls',
    );

    const result = await runValidator(
      ControlFlowValidator.validate(
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
    const error = result.errors[0] as any;
    expect(error.code).toBe(ErrorCodes.INVALID_BREAK);
    expect(getMessage(error)).toContain('loop');
  });

  it('should detect continue statement outside loop', async () => {
    const symbolTable = await compileFixtureForValidator(
      'ContinueOutsideLoop.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'ContinueOutsideLoop.cls',
    );

    const result = await runValidator(
      ControlFlowValidator.validate(
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
    const error = result.errors[0] as any;
    expect(error.code).toBe(ErrorCodes.INVALID_CONTINUE);
    expect(getMessage(error)).toContain('loop');
  });

  it('should detect return statement outside method', async () => {
    const symbolTable = await compileFixtureForValidator(
      'ReturnOutsideMethod.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'ReturnOutsideMethod.cls',
    );

    const result = await runValidator(
      ControlFlowValidator.validate(
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
    const error = result.errors[0] as any;
    expect(error.code).toBe(ErrorCodes.INVALID_RETURN_FROM_NON_METHOD);
    expect(getMessage(error)).toContain('method');
  });

  it('should pass validation for break in nested loop', async () => {
    const symbolTable = await compileFixtureForValidator(
      'BreakInNestedLoop.cls',
    );
    const sourceContent = loadFixture(
      VALIDATOR_CATEGORY,
      'BreakInNestedLoop.cls',
    );

    const result = await runValidator(
      ControlFlowValidator.validate(
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

  it('should skip validation when sourceContent is not provided', async () => {
    const symbolTable = await compileFixtureForValidator(
      'BreakOutsideLoop.cls',
    );

    const result = await runValidator(
      ControlFlowValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
          // sourceContent not provided
        }),
      ),
      symbolManager,
    );

    // Should skip validation and return valid result
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
