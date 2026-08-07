/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SwitchStatementValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import { Effect } from 'effect';
import {
  runValidator,
  compileFixtureWithOptions,
  compileSourceLayeredWithOptions,
} from './helpers/validation-test-helpers';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';
import { SymbolKind, type ApexSymbol } from '../../../../src/types/symbol';

describe('SwitchStatementValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'switch-statement';

  it('should have correct metadata', () => {
    expect(SwitchStatementValidator.id).toBe('switch-statement');
    expect(SwitchStatementValidator.name).toBe('Switch Statement Validator');
    expect(SwitchStatementValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(SwitchStatementValidator.priority).toBe(8);
  });

  // Note: "No when blocks" is a syntax error caught by the parser,
  // not a semantic error that the validator can catch, so we skip this test

  it('should detect when else not being last', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'WhenElseNotLast.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      SwitchStatementValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.WHEN_ELSE_NOT_LAST,
    );
    expect(hasError).toBe(true);
  });

  it('should detect duplicate when values', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'DuplicateWhenValues.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      SwitchStatementValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.NOT_UNIQUE_WHEN_VALUE_OR_TYPE,
    );
    expect(hasError).toBe(true);
  });

  it('should detect a duplicate literal across multi-value when clauses', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'DuplicateWhenListValue.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      SwitchStatementValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(
      result.errors.some(
        (error: any) => error.code === ErrorCodes.NOT_UNIQUE_WHEN_VALUE_OR_TYPE,
      ),
    ).toBe(true);
  });

  it('should detect when type variable already matching switch expression type', async () => {
    jest
      .spyOn(symbolManager, 'findSObjectType')
      .mockImplementation(async (name) =>
        name.toLowerCase() === 'account'
          ? ({
              kind: SymbolKind.Class,
              name: 'Account',
              namespace: 'SObject',
            } as unknown as ApexSymbol)
          : null,
      );

    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'InvalidAlreadyMatchType.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      SwitchStatementValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.INVALID_ALREADY_MATCH_TYPE,
    );
    expect(hasError).toBe(true);
  });

  it('should pass validation for valid switch statements', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'ValidSwitch.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      SwitchStatementValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect ILLEGAL_WHEN_TYPE when type variable used on String switch', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'InvalidWhenTypeVariableOnString.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      SwitchStatementValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.ILLEGAL_WHEN_TYPE,
    );
    expect(hasError).toBe(true);
  });

  it('should detect ILLEGAL_NON_WHEN_TYPE when literal used on SObject switch', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'InvalidLiteralOnSObject.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      SwitchStatementValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.ILLEGAL_NON_WHEN_TYPE,
    );
    expect(hasError).toBe(true);
  });

  it('should detect INVALID_WHEN_EXPRESSION_TYPE when type mismatch', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'InvalidWhenExpressionType.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      SwitchStatementValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.INVALID_WHEN_EXPRESSION_TYPE,
    );
    expect(hasError).toBe(true);
  });

  it('should detect INVALID_WHEN_FIELD_CONSTANT when field not static final', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'InvalidWhenFieldConstant.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      SwitchStatementValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.INVALID_WHEN_FIELD_CONSTANT,
    );
    expect(hasError).toBe(true);
  });

  it('should detect INVALID_WHEN_FIELD_LITERAL when field is null', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'InvalidWhenFieldLiteral.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      SwitchStatementValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.INVALID_WHEN_FIELD_LITERAL,
    );
    expect(hasError).toBe(true);
  });

  it('should detect WHEN_CLAUSE_LITERAL_OR_VALID_CONSTANT when local variable used', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'InvalidWhenLiteralExpression.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      SwitchStatementValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.WHEN_CLAUSE_LITERAL_OR_VALID_CONSTANT,
    );
    expect(hasError).toBe(true);
  });

  it('resolves an unqualified when constant lexically at its expression position', async () => {
    const source = `
public class ShadowedWhenConstant {
    private static final String MATCH = 'constant';

    public void runSwitch() {
        String value = 'test';
        String MATCH = 'local';
        switch on value {
            when MATCH {}
            when else {}
        }
    }
}`;
    const { symbolTable, options } = await compileSourceLayeredWithOptions(
      source,
      'file:///test/ShadowedWhenConstant.cls',
      symbolManager,
      compilerService,
      { tier: ValidationTier.THOROUGH, allowArtifactLoading: false },
    );

    const result = await runValidator(
      SwitchStatementValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(
      result.errors.some(
        (error: any) =>
          error.code === ErrorCodes.WHEN_CLAUSE_LITERAL_OR_VALID_CONSTANT,
      ),
    ).toBe(true);
  });

  it('resolves a qualified constant by its exact type and namespace FQN', async () => {
    await compileSourceLayeredWithOptions(
      `public class WhenConstants {
          public static final String MATCH = 'first';
      }`,
      'file:///test/first/WhenConstants.cls',
      symbolManager,
      compilerService,
      { namespace: 'FirstNs' },
    );
    await compileSourceLayeredWithOptions(
      `public class WhenConstants {
          public static String MATCH = 'second';
      }`,
      'file:///test/second/WhenConstants.cls',
      symbolManager,
      compilerService,
      { namespace: 'SecondNs' },
    );
    const source = `
public class QualifiedWhenConstantSwitch {
    public void runSwitch() {
        String value = 'first';
        switch on value {
            when FirstNs.WhenConstants.MATCH {}
            when else {}
        }
    }
}`;
    const { symbolTable, options } = await compileSourceLayeredWithOptions(
      source,
      'file:///test/QualifiedWhenConstantSwitch.cls',
      symbolManager,
      compilerService,
      { tier: ValidationTier.THOROUGH, allowArtifactLoading: false },
    );

    const result = await runValidator(
      SwitchStatementValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(
      result.errors.some(
        (error: any) =>
          error.code === ErrorCodes.WHEN_CLAUSE_LITERAL_OR_VALID_CONSTANT ||
          error.code === ErrorCodes.INVALID_WHEN_FIELD_CONSTANT,
      ),
    ).toBe(false);
  });

  it('preserves uncertainty for an unresolved qualified constant', async () => {
    const source = `
public class UnresolvedWhenConstant {
    public void runSwitch() {
        String value = 'test';
        switch on value {
            when MissingOwner.MATCH {}
            when else {}
        }
    }
}`;
    const { symbolTable, options } = await compileSourceLayeredWithOptions(
      source,
      'file:///test/UnresolvedWhenConstant.cls',
      symbolManager,
      compilerService,
      { tier: ValidationTier.THOROUGH, allowArtifactLoading: false },
    );

    const result = await runValidator(
      SwitchStatementValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(
      result.errors.some(
        (error: any) =>
          error.code === ErrorCodes.WHEN_CLAUSE_LITERAL_OR_VALID_CONSTANT,
      ),
    ).toBe(false);
  });

  describe('TIER 2: Enum switch validation', () => {
    it('should validate switch statements with valid enum values', async () => {
      // First compile the enum
      await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'EnumWithValues.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: true,
        },
      );

      // Then compile the switch statement class
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'SwitchWithValidEnum.cls',
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
        SwitchStatementValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid enum values in switch statements', async () => {
      // First compile the enum
      await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'EnumWithValues.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: true,
        },
      );

      // Then compile the switch statement class with invalid enum values
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'SwitchWithInvalidEnum.cls',
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
        SwitchStatementValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      const hasEnumError = result.errors.some(
        (e: any) => e.code === ErrorCodes.INVALID_SWITCH_ENUM,
      );
      expect(hasEnumError).toBe(true);
    });

    it('should detect INVALID_FULLY_QUALIFIED_ENUM when when value is qualified', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'SwitchQualifiedEnum.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        SwitchStatementValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      const hasError = result.errors.some(
        (e: any) => e.code === ErrorCodes.INVALID_FULLY_QUALIFIED_ENUM,
      );
      expect(hasError).toBe(true);
    });
  });
});
