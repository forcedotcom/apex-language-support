/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ExpressionValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import { Effect } from 'effect';
import {
  runValidator,
  compileFixtureWithOptions,
} from './helpers/validation-test-helpers';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';

describe('ExpressionValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'operator';

  it('should have correct metadata', () => {
    expect(ExpressionValidator.id).toBe('expression');
    expect(ExpressionValidator.name).toBe('Expression Validator');
    expect(ExpressionValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(ExpressionValidator.priority).toBe(6);
  });

  it('should detect invalid comparison types', async () => {
    // TIER 1 validator now uses parse tree inspection to detect literal types,
    // which can catch invalid comparisons like numeric vs string literals.
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'InvalidComparison.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      ExpressionValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.INVALID_COMPARISON_TYPES,
    );
    expect(hasError).toBe(true);
  });

  it('should detect invalid numeric arguments in arithmetic', async () => {
    // TIER 1 validator now uses parse tree inspection to detect literal types,
    // which can catch invalid arithmetic like string literals in non-concatenation operations.
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'InvalidArithmetic.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      ExpressionValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.INVALID_NUMERIC_ARGUMENTS_EXPRESSION,
    );
    expect(hasError).toBe(true);
  });

  it('should pass validation for valid operators', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'ValidOperators.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      ExpressionValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  describe('String concatenation with + operator', () => {
    it('should allow string concatenation patterns in TIER 1', async () => {
      // Test patterns:
      // String s = 'Hello'; String t = s + ' World';
      // String u = s + 123;
      // Integer i = 1; Integer j = i + 1;
      // String v = 'The value of j is: ' + j;
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'StringConcatenation.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        ExpressionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow string concatenation patterns in TIER 2', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'StringConcatenation.cls',
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
        ExpressionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('TIER 2: Variable type resolution in expressions', () => {
    it('should validate operator expressions with correct variable types', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'OperatorWithValidTypes.cls',
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
        ExpressionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect operator expressions with invalid variable types', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'OperatorWithInvalidTypes.cls',
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
        ExpressionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      const hasComparisonError = result.errors.some(
        (e: any) => e.code === ErrorCodes.INVALID_COMPARISON_TYPES,
      );
      const hasArithmeticError = result.errors.some(
        (e: any) => e.code === ErrorCodes.INVALID_NUMERIC_ARGUMENTS_EXPRESSION,
      );
      const hasBitwiseError = result.errors.some(
        (e: any) => e.code === ErrorCodes.INVALID_BITWISE_OPERATOR_ARGUMENTS,
      );
      const hasTernaryError = result.errors.some(
        (e: any) => e.code === ErrorCodes.INCOMPATIBLE_TERNARY_EXPRESSION_TYPES,
      );
      expect(
        hasComparisonError ||
          hasArithmeticError ||
          hasBitwiseError ||
          hasTernaryError,
      ).toBe(true);
    });
  });

  describe('Nested expressions and parenthetical expressions', () => {
    it('should handle nested arithmetic expressions: (a + b) * c', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'AllExpressionTypes.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        ExpressionValidator.validate(symbolTable, options),
        symbolManager,
      );

      // Should pass validation - nested expressions are valid
      expect(result.isValid).toBe(true);
    });

    it('should handle multi-term expressions: a + b + c', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'AllExpressionTypes.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        ExpressionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
    });

    it("should handle deeply nested parentheses: (('foo') + ('bar')) + ('foo')", async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'AllExpressionTypes.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        ExpressionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
    });

    it('should handle order of operations: (a + (b * c))', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'AllExpressionTypes.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        ExpressionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
    });

    it('should handle nested parentheses: ((x))', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'AllExpressionTypes.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        ExpressionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
    });
  });

  describe('All expression types', () => {
    it('should handle logical operators: &&, ||, ??', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'AllExpressionTypes.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        ExpressionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
    });

    it('should handle assignment operators: +=, -=, *=, /=', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'AllExpressionTypes.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        ExpressionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
    });

    it('should handle cast expressions: (Integer) l + a', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'AllExpressionTypes.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        ExpressionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
    });

    it('should detect invalid bitwise negate operator types', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'BitwiseNegateInvalid.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        ExpressionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      const hasError = result.errors.some(
        (e: any) => e.code === ErrorCodes.INVALID_TYPE_BITWISE_NEGATE,
      );
      expect(hasError).toBe(true);
    });

    it('should handle unary operators: ++, --, !, ~', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'AllExpressionTypes.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        ExpressionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
    });

    it('should handle instanceof expressions', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'AllExpressionTypes.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        ExpressionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
    });

    it('should handle ternary expressions with compatible types', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'AllExpressionTypes.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        ExpressionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
    });
  });

  describe('Boolean condition validation', () => {
    it('should detect invalid condition types in if statements', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        'expression-type',
        'InvalidConditionType.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        ExpressionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      const hasError = result.errors.some(
        (e: any) => e.code === ErrorCodes.INVALID_CONDITION_TYPE,
      );
      expect(hasError).toBe(true);
    });

    it('should pass validation for valid boolean conditions', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        'expression-type',
        'ValidExpressions.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        ExpressionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
    });

    it('should validate for loop conditions', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'ForLoopConditions.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        ExpressionValidator.validate(symbolTable, options),
        symbolManager,
      );

      // Should detect invalid string condition in for loop
      const hasError = result.errors.some(
        (e: any) => e.code === ErrorCodes.INVALID_CONDITION_TYPE,
      );
      expect(hasError).toBe(true);
    });
  });

  describe('Date/DateTime/Time arithmetic validation', () => {
    it('should detect invalid Date arithmetic operations', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'DateDateTimeTimeArithmetic.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        ExpressionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      const hasDateOperandError = result.errors.some(
        (e: any) => e.code === ErrorCodes.INVALID_DATE_OPERAND_EXPRESSION,
      );
      const hasNumericError = result.errors.some(
        (e: any) => e.code === ErrorCodes.INVALID_NUMERIC_ARGUMENTS_EXPRESSION,
      );
      expect(hasDateOperandError || hasNumericError).toBe(true);
    });

    it('should detect invalid DateTime arithmetic operations', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'DateDateTimeTimeArithmetic.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        ExpressionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      const hasDatetimeOperandError = result.errors.some(
        (e: any) => e.code === ErrorCodes.INVALID_DATETIME_OPERAND_EXPRESSION,
      );
      expect(hasDatetimeOperandError).toBe(true);
    });

    it('should detect invalid Time arithmetic operations', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'DateDateTimeTimeArithmetic.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        ExpressionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      const hasTimeOperandError = result.errors.some(
        (e: any) => e.code === ErrorCodes.INVALID_TIME_OPERAND_EXPRESSION,
      );
      const hasNumericError = result.errors.some(
        (e: any) => e.code === ErrorCodes.INVALID_NUMERIC_ARGUMENTS_EXPRESSION,
      );
      expect(hasTimeOperandError || hasNumericError).toBe(true);
    });
  });

  describe('Boolean arithmetic validation', () => {
    it('should detect invalid Boolean arithmetic operations', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'BooleanArithmetic.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        ExpressionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      const hasArithmeticError = result.errors.some(
        (e: any) => e.code === ErrorCodes.INVALID_NUMERIC_ARGUMENTS_EXPRESSION,
      );
      expect(hasArithmeticError).toBe(true);
    });
  });

  describe('String arithmetic validation', () => {
    it('should detect invalid String subtraction operations', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'StringArithmetic.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        ExpressionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      const hasArithmeticError = result.errors.some(
        (e: any) => e.code === ErrorCodes.INVALID_NUMERIC_ARGUMENTS_EXPRESSION,
      );
      expect(hasArithmeticError).toBe(true);
    });

    it('should detect invalid String division operations', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'StringArithmetic.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        ExpressionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      const hasArithmeticError = result.errors.some(
        (e: any) => e.code === ErrorCodes.INVALID_NUMERIC_ARGUMENTS_EXPRESSION,
      );
      expect(hasArithmeticError).toBe(true);
    });
  });

  describe('Bitwise operations validation', () => {
    it('should detect invalid bitwise operations with incompatible types', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'BitwiseOperations.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        ExpressionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      const hasBitwiseError = result.errors.some(
        (e: any) =>
          e.code === ErrorCodes.INVALID_BITWISE_OPERATOR_ARGUMENTS ||
          e.code === ErrorCodes.INVALID_NUMERIC_ARGUMENTS_EXPRESSION,
      );
      expect(hasBitwiseError).toBe(true);
    });

    it('should detect invalid Double in bitwise shift operations', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'BitwiseOperations.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        ExpressionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      const hasBitwiseError = result.errors.some(
        (e: any) => e.code === ErrorCodes.INVALID_BITWISE_OPERATOR_ARGUMENTS,
      );
      expect(hasBitwiseError).toBe(true);
    });
  });

  describe('SOQL loop variable type validation', () => {
    it('should report LOOP_VARIABLE_MISMATCH_SOBJECT_TYPE for Integer in SOQL loop', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        'dml-statement',
        'LoopVariableMismatch.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        ExpressionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e: any) => e.code === ErrorCodes.LOOP_VARIABLE_MISMATCH_SOBJECT_TYPE,
        ),
      ).toBe(true);
    });

    // TODO: LOOP_VARIABLE_MISMATCH_CONCRETE_SOBJECT_TYPE - expression structure
    // may vary; refine SOQL detection for Contact vs Account mismatch
    it.skip('should report LOOP_VARIABLE_MISMATCH_CONCRETE_SOBJECT_TYPE for Contact in Account query', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        'dml-statement',
        'LoopVariableConcreteMismatch.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        ExpressionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e: any) =>
            e.code === ErrorCodes.LOOP_VARIABLE_MISMATCH_CONCRETE_SOBJECT_TYPE,
        ),
      ).toBe(true);
    });

    it('should pass validation for valid SOQL loop variable types', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        'dml-statement',
        'LoopVariableValid.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        ExpressionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
