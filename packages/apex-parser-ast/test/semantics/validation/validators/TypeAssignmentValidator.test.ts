/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { TypeAssignmentValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../../../src/parser/listeners/ApexSymbolCollectorListener';
import { ErrorType } from '../../../../src/parser/listeners/ApexErrorListener';
import { EffectTestLoggerLive } from '../../../../src/utils/EffectLspLoggerLayer';
import {
  compileFixture,
  getMessage,
  runValidator,
  createValidationOptions,
  loadFixture,
} from './helpers/validation-test-helpers';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

describe('TypeAssignmentValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
    enableConsoleLogging();
    setLogLevel('info');
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'type-assignment';

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
    expect(TypeAssignmentValidator.id).toBe('type-assignment');
    expect(TypeAssignmentValidator.name).toBe('Type Assignment Validator');
    expect(TypeAssignmentValidator.tier).toBe(ValidationTier.THOROUGH);
    expect(TypeAssignmentValidator.priority).toBe(10);
  });

  it('should pass validation for compatible primitive types', async () => {
    const symbolTable = await compileFixtureForValidator(
      'CompatiblePrimitive.cls',
    );

    const result = await runValidator(
      TypeAssignmentValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, { allowArtifactLoading: false }),
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

  it('should detect incompatible primitive type assignment', async () => {
    const symbolTable = await compileFixtureForValidator(
      'IncompatiblePrimitive.cls',
    );

    const result = await runValidator(
      TypeAssignmentValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, { allowArtifactLoading: false }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const errorMessage = getMessage(result.errors[0]);
    expect(errorMessage).toContain('Type mismatch');
    expect(errorMessage).toContain('String');
    // Error may mention the source type (Integer) or just the value ('123')
    expect(
      errorMessage.includes('Integer') ||
        errorMessage.includes('123') ||
        errorMessage.includes('cannot assign'),
    ).toBe(true);
  });

  it('should detect incompatible collection type assignment', async () => {
    const symbolTable = await compileFixtureForValidator(
      'IncompatibleCollection.cls',
    );

    const result = await runValidator(
      TypeAssignmentValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, { allowArtifactLoading: false }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const errorMessage = getMessage(result.errors[0]);
    expect(errorMessage).toContain('Type mismatch');
    expect(errorMessage).toContain('ContentDocumentLink');
    expect(errorMessage).toContain('List');
  });

  it('should pass validation for compatible collection types', async () => {
    const symbolTable = await compileFixtureForValidator(
      'CompatibleCollection.cls',
    );

    const result = await runValidator(
      TypeAssignmentValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, { allowArtifactLoading: false }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should skip variables without initializers', async () => {
    const symbolTable = await compileFixtureForValidator('NoInitializer.cls');

    const result = await runValidator(
      TypeAssignmentValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, { allowArtifactLoading: false }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate field declarations', async () => {
    const symbolTable = await compileFixtureForValidator(
      'FieldDeclaration.cls',
    );

    const result = await runValidator(
      TypeAssignmentValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, { allowArtifactLoading: false }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect incompatible field assignment', async () => {
    const symbolTable = await compileFixtureForValidator(
      'IncompatibleField.cls',
    );

    const result = await runValidator(
      TypeAssignmentValidator.validate(
        symbolTable,
        createValidationOptions(symbolManager, { allowArtifactLoading: false }),
      ),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    const errorMessage = getMessage(result.errors[0]);
    expect(errorMessage).toContain('Type mismatch');
  });

  describe('Cross-file method call assignments', () => {
    it('should pass validation for cross-file method call returning String', async () => {
      // First compile the dependency files
      await compileFixtureForValidator(
        'FileUtilities.cls',
        'file:///FileUtilities.cls',
      );
      await compileFixtureForValidator('Property.cls', 'file:///Property.cls');

      // Then compile the test file that uses cross-file references
      const symbolTable = await compileFixtureForValidator(
        'CrossFileMethodCall.cls',
        'file:///CrossFileMethodCall.cls',
      );

      // Resolve cross-file references before validation
      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(
          'file:///CrossFileMethodCall.cls',
        ),
      );

      // Wait for cross-file resolution to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await runValidator(
        TypeAssignmentValidator.validate(
          symbolTable,
          createValidationOptions(symbolManager, {
            allowArtifactLoading: false,
            tier: ValidationTier.THOROUGH,
          }),
        ),
        symbolManager,
      );

      if (!result.isValid && result.errors.length > 0) {
        console.log(
          '[TEST] Validation errors (should be empty for valid code):',
          result.errors.map((e) => getMessage(e)),
        );
      }

      // After fixing cross-file type resolution for method calls and property access,
      // this test should pass validation correctly
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect false positives when syntax errors are present', async () => {
      // First compile the dependency files
      await compileFixtureForValidator(
        'FileUtilities.cls',
        'file:///FileUtilities.cls',
      );
      await compileFixtureForValidator('Property.cls', 'file:///Property.cls');

      // Compile the test file with syntax error (trailing "public")
      // We need to compile manually to allow syntax errors
      const content = loadFixture(
        'type-assignment',
        'CrossFileMethodCallWithSyntaxError.cls',
      );
      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const compileResult = compilerService.compile(
        content,
        'file:///CrossFileMethodCallWithSyntaxError.cls',
        listener,
        {
          collectReferences: true,
          resolveReferences: true,
        },
      );

      const hasSyntaxErrors = compileResult.errors.some(
        (e) => e.type === ErrorType.Syntax,
      );

      expect(hasSyntaxErrors).toBe(true);

      // Even with syntax errors, we should still get a symbol table (may be partial)
      if (!compileResult.result) {
        throw new Error(
          'Failed to compile CrossFileMethodCallWithSyntaxError.cls',
        );
      }

      const symbolTable = compileResult.result;

      // Add to symbol manager even with syntax errors
      await Effect.runPromise(
        symbolManager
          .addSymbolTable(
            symbolTable,
            'file:///CrossFileMethodCallWithSyntaxError.cls',
          )
          .pipe(Effect.provide(EffectTestLoggerLive)),
      );

      // Resolve cross-file references before validation
      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(
          'file:///CrossFileMethodCallWithSyntaxError.cls',
        ),
      );

      const result = await runValidator(
        TypeAssignmentValidator.validate(
          symbolTable,
          createValidationOptions(symbolManager, {
            allowArtifactLoading: false,
            tier: ValidationTier.THOROUGH,
          }),
        ),
        symbolManager,
      );

      // Log the results for debugging
      console.log(
        `[TEST] Syntax errors present: ${hasSyntaxErrors}, ` +
          `Validation errors: ${result.errors.length}, ` +
          `Errors: ${result.errors.map((e) => getMessage(e)).join(', ')}`,
      );

      // Verify syntax errors are present (this is expected for this test)
      expect(hasSyntaxErrors).toBe(true);

      // After fixing cross-file type resolution, validation should pass correctly
      // even when syntax errors are present (as long as the cross-file references are resolved)
      // Note: Syntax errors may prevent some resolution, but if references are resolved,
      // type validation should work correctly
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
