/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { VariableShadowingValidator } from '../../../../src/semantics/validation/validators';
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

describe('VariableShadowingValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'variable-shadowing';

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
    expect(VariableShadowingValidator.id).toBe('variable-shadowing');
    expect(VariableShadowingValidator.name).toBe(
      'Variable Shadowing Validator',
    );
    expect(VariableShadowingValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(VariableShadowingValidator.priority).toBe(1);
  });

  it('should pass validation for variables with different names', async () => {
    const symbolTable = await compileFixtureForValidator('DifferentNames.cls');

    const result = await runValidator(
      VariableShadowingValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('should report warning for variable shadowing class field (cross-scope)', async () => {
    // Create a test case where a local variable shadows a class field
    const apexCode = `
public class TestClass {
    public String myField;
    
    public void myMethod() {
        String myField = 'shadow'; // Local variable shadows class field
    }
}
    `;

    const listener = new ApexSymbolCollectorListener(undefined, 'full');
    compilerService.compile(apexCode, 'TestClass.cls', listener);
    const symbolTable = listener.getResult();

    // Add to symbol manager
    await symbolManager.addSymbolTable(
      symbolTable,
      'file:///test/TestClass.cls',
    );

    const validationResult = await runValidator(
      VariableShadowingValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    // Should have no errors (duplicates are handled by DuplicateSymbolValidator)
    expect(validationResult.isValid).toBe(true);
    expect(validationResult.errors).toHaveLength(0);
    // Should have a warning for cross-scope shadowing
    expect(validationResult.warnings.length).toBeGreaterThan(0);
    const warning = validationResult.warnings[0];
    expect(warning.code).toBe(ErrorCodes.DUPLICATE_VARIABLE);
    const warningMessage = getMessage(warning);
    expect(warningMessage).toContain('Duplicate variable');
  });

  it('should not report error for variable shadowing parameter (same scope)', async () => {
    // This test verifies that VariableShadowingValidator does NOT report
    // same-scope duplicates (those are handled by DuplicateSymbolValidator)
    const symbolTable = await compileFixtureForValidator(
      'ShadowingParameter.cls',
    );

    const result = await runValidator(
      VariableShadowingValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    // Should have no errors (same-scope duplicates are handled by DuplicateSymbolValidator)
    // Should have no warnings (parameter shadowing is same-scope, not cross-scope)
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });
});
