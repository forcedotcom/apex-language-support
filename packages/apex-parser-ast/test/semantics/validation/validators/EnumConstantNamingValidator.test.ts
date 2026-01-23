/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { EnumConstantNamingValidator } from '../../../../src/semantics/validation/validators/EnumConstantNamingValidator';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  compileFixture,
  getMessage,
  runValidator,
  createValidationOptions,
} from './helpers/validation-test-helpers';

describe('EnumConstantNamingValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'enum-constant-naming';

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
    expect(EnumConstantNamingValidator.id).toBe('enum-constant-naming');
    expect(EnumConstantNamingValidator.name).toBe(
      'Enum Constant Naming Validator',
    );
    expect(EnumConstantNamingValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(EnumConstantNamingValidator.priority).toBe(1);
  });

  it('should pass validation for valid enum constant names', async () => {
    const symbolTable = await compileFixtureForValidator('ValidNames.cls');

    const result = await runValidator(
      EnumConstantNamingValidator.validate(
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
  });

  it('should pass validation for enum constants with valid names', async () => {
    // Enum constants must use valid identifiers (keywords are not allowed)
    const symbolTable = await compileFixtureForValidator('WithKeywords.cls');

    const result = await runValidator(
      EnumConstantNamingValidator.validate(
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
  });

  // Note: Invalid characters like hyphens are caught by the parser before validation
  // This test is skipped as syntax errors prevent the validator from running
  it.skip('should fail validation for enum constant with invalid characters', async () => {
    // Invalid characters (e.g., hyphens) are caught by the parser as syntax errors
    // before the validator can check them, so this test cannot be executed
    const symbolTable = await compileFixtureForValidator('InvalidCharacters.cls');

    const result = await runValidator(
      EnumConstantNamingValidator.validate(
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
    const errorMessage = getMessage(result.errors[0]);
    expect(errorMessage).toContain('INVALID-NAME');
    expect(errorMessage).toContain('invalid');
  });
});
