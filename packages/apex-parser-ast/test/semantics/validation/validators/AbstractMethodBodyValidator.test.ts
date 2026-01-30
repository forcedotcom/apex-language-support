/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { AbstractMethodBodyValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';
import { ApexSymbolCollectorListener } from '../../../../src/parser/listeners/ApexSymbolCollectorListener';
import {
  compileFixture,
  getMessage,
  runValidator,
  createValidationOptions,
} from './helpers/validation-test-helpers';

describe('AbstractMethodBodyValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'abstract-method-body';

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
    expect(AbstractMethodBodyValidator.id).toBe('abstract-method-body');
    expect(AbstractMethodBodyValidator.name).toBe(
      'Abstract Method Body Validator',
    );
    expect(AbstractMethodBodyValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(AbstractMethodBodyValidator.priority).toBe(1);
  });

  it('should pass validation for abstract method without body', async () => {
    const symbolTable = await compileFixtureForValidator(
      'AbstractMethodNoBody.cls',
    );

    const result = await runValidator(
      AbstractMethodBodyValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    if (!result.isValid && result.errors.length > 0) {
      console.log(
        'Validation errors:',
        result.errors.map((e) => getMessage(e)),
      );
    }

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail validation for abstract method with body', async () => {
    const symbolTable = await compileFixtureForValidator(
      'AbstractMethodWithBody.cls',
    );

    const result = await runValidator(
      AbstractMethodBodyValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const error = result.errors[0];
    expect(error.code).toBe(ErrorCodes.ABSTRACT_METHODS_CANNOT_HAVE_BODY);
    const errorMessage = getMessage(error);
    expect(errorMessage).toContain('Abstract methods cannot have a body');
  });

  it('should pass validation for interface methods without explicit abstract keyword', async () => {
    // Interface methods are implicitly abstract and should not trigger
    // REDUNDANT_ABSTRACT_MODIFIER warnings when no abstract keyword is present
    const symbolTable = await compileFixtureForValidator(
      'InterfaceMethodNoAbstract.cls',
    );

    const result = await runValidator(
      AbstractMethodBodyValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    // Should pass validation with no errors or warnings
    // Interface methods are implicitly abstract, so isAbstract will be true,
    // but we should NOT warn about redundant abstract modifier since no
    // explicit abstract keyword was present
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('should detect error when abstract keyword is used on interface method', () => {
    // When abstract keyword is explicitly used on interface method,
    // MethodModifierValidator should catch it during compilation
    // This test verifies the error is reported during compilation
    const fileContent = `
      public interface TestInterface {
        abstract void methodWithAbstract();
      }
    `;

    const listener = new ApexSymbolCollectorListener();
    const result = compilerService.compile(
      fileContent,
      'TestInterface.cls',
      listener,
    );

    // Should have semantic error for abstract modifier on interface method
    const semanticErrors = result.errors.filter(
      (e) => e.type === 'semantic' && e.severity === 'error',
    );

    expect(semanticErrors.length).toBeGreaterThan(0);
    const abstractError = semanticErrors.find((e) =>
      e.message.includes('Modifiers are not allowed on interface methods'),
    );
    expect(abstractError).toBeDefined();
    expect(abstractError?.message).toContain(
      'Modifiers are not allowed on interface methods',
    );
  });
});
