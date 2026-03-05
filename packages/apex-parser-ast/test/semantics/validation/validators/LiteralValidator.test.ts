/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  LiteralValidator,
  validateStringLiteral,
  validateDoubleLiteral,
} from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  runValidator,
  compileFixtureWithOptions,
  createValidationOptions,
} from './helpers/validation-test-helpers';
import { Effect } from 'effect';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';
import { SymbolTable } from '../../../../src/types/symbol';
import { ReferenceContext } from '../../../../src/types/symbolReference';

describe('LiteralValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'literal';

  it('should have correct metadata', () => {
    expect(LiteralValidator.id).toBe('literal');
    expect(LiteralValidator.name).toBe('Literal Validator');
    expect(LiteralValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(LiteralValidator.priority).toBe(5);
  });

  it('should report INVALID_STRING_LITERAL_ILLEGAL_UNICODE for 4-char invalid hex in validateStringLiteral', () => {
    const result = validateStringLiteral("'\\u00GG'");
    expect(result).toBeDefined();
    expect(result?.code).toBe(
      ErrorCodes.INVALID_STRING_LITERAL_ILLEGAL_UNICODE,
    );
    expect(result?.illegalSequence).toBe('00GG');
  });

  it('should report ILLEGAL_DOUBLE_LITERAL for invalid double in validateDoubleLiteral', () => {
    expect(validateDoubleLiteral('1.5.5d')).toBe(
      ErrorCodes.ILLEGAL_DOUBLE_LITERAL,
    );
    expect(validateDoubleLiteral('1.5d')).toBeUndefined();
    expect(validateDoubleLiteral('1.5')).toBeUndefined();
  });

  it('should report INVALID_STRING_LITERAL_ILLEGAL_UNICODE_SEQUENCE for short unicode in validateStringLiteral', () => {
    const result = validateStringLiteral("'\\u00'");
    expect(result).toBeDefined();
    expect(result?.code).toBe(
      ErrorCodes.INVALID_STRING_LITERAL_ILLEGAL_UNICODE_SEQUENCE,
    );
    expect(result?.illegalSequence).toBe('\\u00');
  });

  it('should pass validation for valid unicode', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'ValidUnicode.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      LiteralValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should report ILLEGAL_DOUBLE_LITERAL for invalid double literal', async () => {
    const sourceContent = 'Double d = 1.5.5d;';
    const symbolTable = new SymbolTable('file:///test.cls');
    symbolTable.addTypeReference({
      name: '1.5',
      location: {
        symbolRange: {
          startLine: 1,
          startColumn: 11,
          endLine: 1,
          endColumn: 16,
        },
        identifierRange: {
          startLine: 1,
          startColumn: 11,
          endLine: 1,
          endColumn: 16,
        },
      },
      context: ReferenceContext.LITERAL,
      literalValue: 1.5,
      literalType: 'Decimal',
    });

    const options = createValidationOptions(symbolManager, {
      tier: ValidationTier.IMMEDIATE,
      allowArtifactLoading: false,
      sourceContent,
    });

    const refs = symbolTable.getAllReferences();
    const literalRefs = refs.filter(
      (r) => r.context === ReferenceContext.LITERAL,
    );
    expect(literalRefs.length).toBe(1);
    expect(literalRefs[0].literalType).toBe('Decimal');

    expect(options.sourceContent).toBe(sourceContent);

    const result = await Effect.runPromise(
      LiteralValidator.validate(symbolTable, options),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: ErrorCodes.ILLEGAL_DOUBLE_LITERAL }),
    );
  });
});
