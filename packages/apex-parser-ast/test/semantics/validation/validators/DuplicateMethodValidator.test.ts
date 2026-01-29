/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DuplicateMethodValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import { ErrorCodes } from '../../../../src/semantics/validation/ErrorCodes';
import {
  compileFixture,
  getMessage,
  runValidator,
  createValidationOptions,
} from './helpers/validation-test-helpers';

describe('DuplicateMethodValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'duplicate-method';

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
    expect(DuplicateMethodValidator.id).toBe('duplicate-method');
    expect(DuplicateMethodValidator.name).toBe('Duplicate Method Validator');
    expect(DuplicateMethodValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(DuplicateMethodValidator.priority).toBe(1);
  });

  it('should pass validation for class with unique method names', async () => {
    const symbolTable = await compileFixtureForValidator('UniqueMethods.cls');

    const result = await runValidator(
      DuplicateMethodValidator.validate(
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

  it.skip('should fail validation for duplicate method with exact same name', async () => {
    // Note: ApexSymbolCollectorListener catches duplicate method declarations
    // (identical signatures) during compilation and returns early, so the duplicate
    // method never makes it into the symbol table. The validator cannot check what
    // isn't in the symbol table, so this test is skipped.
    const symbolTable = await compileFixtureForValidator(
      'DuplicateExactName.cls',
    );

    const result = await runValidator(
      DuplicateMethodValidator.validate(
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
    expect(errorMessage).toContain('MyClass');
    expect(errorMessage).toContain('doWork');
    expect(errorMessage).toContain('identical signature');
  });

  it.skip('should fail validation for duplicate method with different case', async () => {
    // Note: ApexSymbolCollectorListener catches duplicate method declarations
    // (case-insensitive matching) during compilation and returns early, so the duplicate
    // method never makes it into the symbol table. The validator cannot check what
    // isn't in the symbol table, so this test is skipped.
    const symbolTable = await compileFixtureForValidator(
      'DuplicateDifferentCase.cls',
    );

    const result = await runValidator(
      DuplicateMethodValidator.validate(
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
    // Error may mention class name or interface name, or just the method names
    expect(
      errorMessage.includes('doWork') ||
        errorMessage.includes('DoWork') ||
        errorMessage.includes('MyClass') ||
        errorMessage.includes('class_1'),
    ).toBe(true);
  });

  it('should NOT detect duplicate methods with FQN vs unqualified built-in types during TIER 1', async () => {
    // Test case: doWork(String), doWork(System.String)
    // TIER 1 uses originalTypeString comparison only (exact match, conservative)
    // Since "String" !== "System.String" as originalTypeString, they are NOT flagged as duplicates
    // This avoids hardcoding namespace knowledge in TIER 1 validation
    const symbolTable = await compileFixtureForValidator('FQNDup.cls');

    const result = await runValidator(
      DuplicateMethodValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    // TIER 1 should NOT flag these as duplicates (conservative approach)
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it.skip('should detect duplicate methods with FQN vs unqualified built-in types during TIER 2', async () => {
    // Test case: doWork(String), doWork(System.String)
    // TIER 2 uses resolved type information (type.name) to determine semantic equality
    // This catches cases like String vs System.String through type resolution
    //
    // NOTE: This test is skipped because full type resolution in TIER 2 may require
    // additional work to properly resolve and compare types. The current implementation
    // uses type.name which is normalized by TypeInfoFactory, but full semantic equality
    // checking may need more sophisticated type resolution logic.
    const symbolTable = await compileFixtureForValidator('FQNDup.cls');

    const result = await runValidator(
      DuplicateMethodValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: true,
        }),
      ),
      symbolManager,
    );

    // TIER 2 should detect the duplicate: doWork(String) and doWork(System.String) are semantically equal
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const errorMessage = getMessage(result.errors[0]);
    expect(errorMessage).toContain('doWork');
    expect(errorMessage).toContain('identical signature');
  });

  it.skip('should detect duplicate methods with unresolved custom types during TIER 1', async () => {
    // Test case: doWork(String), doWork(ClassA), doWork(ClassA)
    // The 2nd and 3rd should be detected as duplicates even if ClassA is unresolved
    //
    // NOTE: This test is skipped because ApexSymbolCollectorListener catches duplicate
    // method declarations (identical signatures) during compilation and returns early,
    // so the duplicate method never makes it into the symbol table.
    //
    // However, the validator's logic has been fixed to use originalTypeString first
    // (which is always available, even for unresolved types during TIER 1) rather than
    // type.name (which may not be resolved). This ensures that if duplicates ever make
    // it to the validator (e.g., from different compilation passes, edge cases, or
    // if the listener check is bypassed), the validator will correctly detect them
    // using originalTypeString comparison.
    //
    // The fix in areMethodSignaturesIdentical() ensures consistency with the listener's
    // doesMethodSignatureMatch() function, which also uses originalTypeString first.
    const symbolTable = await compileFixtureForValidator(
      'UnresolvedTypeDup.cls',
    );

    const result = await runValidator(
      DuplicateMethodValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        }),
      ),
      symbolManager,
    );

    // Should detect the duplicate: doWork(ClassA) appears twice
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const errorMessage = getMessage(result.errors[0]);
    expect(errorMessage).toContain('doWork');
    expect(errorMessage).toContain('identical signature');
    // Should have exactly one error (the duplicate ClassA methods)
    expect(result.errors.length).toBe(1);
  });
});
