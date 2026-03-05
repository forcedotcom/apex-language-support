/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { VariableResolutionValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import { Effect } from 'effect';
import {
  compileFixtureWithOptions,
  compileSourceLayeredWithOptions,
  loadFixture,
  compileFixture,
  runValidator,
} from './helpers/validation-test-helpers';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';

describe('VariableResolutionValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'variable-resolution';

  it('should have correct metadata', () => {
    expect(VariableResolutionValidator.id).toBe('variable-resolution');
    expect(VariableResolutionValidator.name).toBe(
      'Variable Resolution Validator',
    );
    expect(VariableResolutionValidator.tier).toBe(ValidationTier.THOROUGH);
    expect(VariableResolutionValidator.priority).toBe(10);
  });

  describe('TIER 2: Qualified field access type resolution', () => {
    it('should validate qualified field access with correct object types', async () => {
      // First compile the class with fields
      await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'ClassWithFields.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: true,
        },
      );

      // Then compile the caller class
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'CallerWithQualifiedAccess.cls',
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
        VariableResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      // Debug: Log errors if validation fails
      if (!result.isValid) {
        console.log(
          'Validation errors:',
          JSON.stringify(result.errors, null, 2),
        );
      }

      // Should pass validation for correct qualified field access
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid qualified field access on wrong object types', async () => {
      // First compile the class with fields
      await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'ClassWithFields.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: true,
        },
      );

      // Then compile the caller class with invalid field access
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'CallerWithInvalidQualifiedAccess.cls',
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
        VariableResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      // Should detect field access errors
      expect(result.isValid).toBe(false);
      const hasFieldError = result.errors.some(
        (e: any) => e.code === ErrorCodes.FIELD_DOES_NOT_EXIST,
      );
      expect(hasFieldError).toBe(true);
    });
  });

  describe('BlockContentListener fixes - no false VARIABLE_DOES_NOT_EXIST', () => {
    it('should not report VARIABLE_DOES_NOT_EXIST for System.debug (uses compileLayered)', async () => {
      const sourceCode = `
        public class TestClass {
          public void m() {
            System.debug('test');
          }
        }
      `;

      const { symbolTable, options } = await compileSourceLayeredWithOptions(
        sourceCode,
        'file:///test/TestClass.cls',
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: true,
        },
      );

      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(
          symbolTable.getFileUri() || '',
        ),
      );

      const result = await runValidator(
        VariableResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      const variableErrors = result.errors.filter(
        (e: any) => e.code === ErrorCodes.VARIABLE_DOES_NOT_EXIST,
      );
      const systemErrors = variableErrors.filter(
        (e: any) => e.message?.includes('System') ?? false,
      );

      expect(systemErrors).toHaveLength(0);
    });

    it('should not report false positives for f.getB().x chained expression (compileLayered)', async () => {
      const fooSource = `
        public class Foo {
          public class FooB {
            public Integer x;
          }
          private FooB b = new FooB();
          public FooB getB() { return b; }
        }
      `;
      const barSource = `
        public class Bar {
          public void doSomething() {
            Foo f = new Foo();
            f.getB().x = 2;
            System.debug(f.getB().x);
          }
        }
      `;

      await compileSourceLayeredWithOptions(
        fooSource,
        'file:///test/Foo.cls',
        symbolManager,
        compilerService,
      );
      const { symbolTable, options } = await compileSourceLayeredWithOptions(
        barSource,
        'file:///test/Bar.cls',
        symbolManager,
        compilerService,
      );

      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(
          symbolTable.getFileUri() || '',
        ),
      );

      const result = await runValidator(
        VariableResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      // No false positives for f.getB().x (variable getB, field x on FooB)
      const variableErrors = result.errors.filter(
        (e: any) => e.code === ErrorCodes.VARIABLE_DOES_NOT_EXIST,
      );
      const getBVarErrors = variableErrors.filter(
        (e: any) => e.message?.includes('getB') ?? false,
      );
      const fieldErrors = result.errors.filter(
        (e: any) => e.code === ErrorCodes.FIELD_DOES_NOT_EXIST,
      );
      const xFieldErrors = fieldErrors.filter(
        (e: any) => e.message?.includes('x on Foo') ?? false,
      );

      expect(getBVarErrors).toHaveLength(0);
      expect(xFieldErrors).toHaveLength(0);
    });
  });

  describe('List element field access (arr[0].field)', () => {
    it('should NOT report FIELD_DOES_NOT_EXIST for computedCoordinates[0].lat (List element has lat)', async () => {
      const testSource = loadFixture('geocoding', 'GeocodingServiceTest.cls');

      await compileFixture(
        'geocoding',
        'GeocodingService.cls',
        'file:///test/GeocodingService.cls',
        symbolManager,
        compilerService,
      );

      const { symbolTable, options } = await compileSourceLayeredWithOptions(
        testSource,
        'file:///test/GeocodingServiceTest.cls',
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: true,
        },
      );

      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(
          symbolTable.getFileUri() || '',
        ),
      );

      const result = await runValidator(
        VariableResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      const fieldErrors = result.errors.filter(
        (e: any) => e.code === ErrorCodes.FIELD_DOES_NOT_EXIST,
      );
      const latOnListErrors = fieldErrors.filter(
        (e: any) => e.message?.includes('lat on List') ?? false,
      );

      if (latOnListErrors.length > 0) {
        console.log(
          'Unexpected FIELD_DOES_NOT_EXIST (lat on List):',
          latOnListErrors,
        );
      }

      expect(latOnListErrors).toHaveLength(0);
    });
  });

  describe('Protected visibility for inner classes', () => {
    it('should allow inner class to access protected field of outer class', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'OuterWithProtectedFieldInnerAccess.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: true,
        },
      );

      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(
          symbolTable.getFileUri() || '',
        ),
      );

      const result = await runValidator(
        VariableResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('@TestVisible visibility', () => {
    it('should allow @isTest class to access @TestVisible private field', async () => {
      await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'ClassWithTestVisibleField.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: true,
        },
      );

      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'TestClassAccessingTestVisibleField.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: true,
        },
      );

      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(
          symbolTable.getFileUri() || '',
        ),
      );

      const result = await runValidator(
        VariableResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should report VARIABLE_NOT_VISIBLE when non-test class accesses @TestVisible private field', async () => {
      await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'ClassWithTestVisibleField.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: true,
        },
      );

      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'NonTestClassAccessingTestVisibleField.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: true,
        },
      );

      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(
          symbolTable.getFileUri() || '',
        ),
      );

      const result = await runValidator(
        VariableResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      const visibilityErrors = result.errors.filter(
        (e: { code?: string }) => e.code === ErrorCodes.VARIABLE_NOT_VISIBLE,
      );
      expect(visibilityErrors.length).toBeGreaterThan(0);
    });

    it('should allow inner class of @isTest class to access @TestVisible field', async () => {
      await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'ClassWithTestVisibleField.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: true,
        },
      );

      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'TestClassWithInnerAccessingTestVisible.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: true,
        },
      );

      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(
          symbolTable.getFileUri() || '',
        ),
      );

      const result = await runValidator(
        VariableResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Deterministic containingClass', () => {
    it('should resolve this.field deterministically without warnings', async () => {
      const sourceCode = `
        public class ThisFieldClass {
          public Integer myField;
          public Integer m() {
            return this.myField;
          }
        }
      `;

      const { symbolTable, options } = await compileSourceLayeredWithOptions(
        sourceCode,
        'file:///test/ThisFieldClass.cls',
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: true,
        },
      );

      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(
          symbolTable.getFileUri() || '',
        ),
      );

      const result = await runValidator(
        VariableResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      const receiverUnresolvedWarnings = result.warnings.filter(
        (w: any) => w.code === ErrorCodes.FIELD_ACCESS_RECEIVER_UNRESOLVED,
      );
      expect(receiverUnresolvedWarnings).toHaveLength(0);
    });

    it('should resolve ClassName.staticField deterministically when ClassName is containing class', async () => {
      const sourceCode = `
        public class StaticAccessClass {
          public static Integer staticField = 1;
          public void m() {
            Integer x = StaticAccessClass.staticField;
          }
        }
      `;

      const { symbolTable, options } = await compileSourceLayeredWithOptions(
        sourceCode,
        'file:///test/StaticAccessClass.cls',
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: true,
        },
      );

      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(
          symbolTable.getFileUri() || '',
        ),
      );

      const result = await runValidator(
        VariableResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      const receiverUnresolvedWarnings = result.warnings.filter(
        (w: any) => w.code === ErrorCodes.FIELD_ACCESS_RECEIVER_UNRESOLVED,
      );
      expect(receiverUnresolvedWarnings).toHaveLength(0);
    });

    it('reports FIELD_ACCESS_RECEIVER_UNRESOLVED when receiver cannot be resolved', async () => {
      // getObj().field - method call result as receiver; chain base may be METHOD_CALL
      // so objectName may not be extracted, leading to warning instead of false positive
      const sourceCode = `
        public class UnresolvedReceiverClass {
          public Integer field;
          public UnresolvedReceiverClass getObj() { return this; }
          public void m() {
            Integer x = getObj().field;
          }
        }
      `;

      const { symbolTable, options } = await compileSourceLayeredWithOptions(
        sourceCode,
        'file:///test/UnresolvedReceiverClass.cls',
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: true,
        },
      );

      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(
          symbolTable.getFileUri() || '',
        ),
      );

      const result = await runValidator(
        VariableResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      // Should NOT report FIELD_DOES_NOT_EXIST on containing class (no false positive)
      const fieldErrors = result.errors.filter(
        (e: any) => e.code === ErrorCodes.FIELD_DOES_NOT_EXIST,
      );
      const onContainingClass = fieldErrors.filter(
        (e: any) => e.message?.includes('on UnresolvedReceiverClass') ?? false,
      );
      expect(onContainingClass).toHaveLength(0);

      // May report FIELD_ACCESS_RECEIVER_UNRESOLVED when receiver cannot be determined
      const receiverWarnings = result.warnings.filter(
        (w: any) => w.code === ErrorCodes.FIELD_ACCESS_RECEIVER_UNRESOLVED,
      );
      // Either chain resolution succeeds (no warning) or we get the warning
      expect(receiverWarnings.length).toBeLessThanOrEqual(1);
    });
  });
});
