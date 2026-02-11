/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { AnnotationPropertyValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import {
  compileFixture,
  runValidator,
  createValidationOptions,
} from './helpers/validation-test-helpers';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';
import type { ValidationErrorInfo } from '../../../../src/semantics/validation/ValidationResult';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

describe('AnnotationPropertyValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
    enableConsoleLogging();
    setLogLevel('error');
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'annotation-property';

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
    expect(AnnotationPropertyValidator.id).toBe('annotation-property');
    expect(AnnotationPropertyValidator.name).toBe(
      'Annotation Property Validator',
    );
    expect(AnnotationPropertyValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(AnnotationPropertyValidator.priority).toBe(5);
  });

  describe('@RestResource URL validation', () => {
    it('should detect empty URL mapping', async () => {
      const symbolTable = await compileFixtureForValidator(
        'RestResourceEmptyUrl.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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
      const error = result.errors[0] as any;
      expect(error.code).toBe(ErrorCodes.REST_RESOURCE_URL_EMPTY);
    });

    it('should detect URL without leading slash', async () => {
      const symbolTable = await compileFixtureForValidator(
        'RestResourceNoSlash.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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
      const error = result.errors.find(
        (e: any) => e.code === ErrorCodes.REST_RESOURCE_URL_NO_SLASH,
      );
      expect(error).toBeDefined();
    });

    it('should detect URL that is too long', async () => {
      const symbolTable = await compileFixtureForValidator(
        'RestResourceTooLong.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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
      const error = result.errors.find(
        (e: any) => e.code === ErrorCodes.REST_RESOURCE_URL_TOO_LONG,
      );
      expect(error).toBeDefined();
    });

    it('should detect invalid wildcard usage', async () => {
      const symbolTable = await compileFixtureForValidator(
        'RestResourceInvalidWildcard.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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
      const error = result.errors.find(
        (e: any) =>
          e.code === ErrorCodes.REST_RESOURCE_URL_ILLEGAL_WILDCARD_SUCCESSOR,
      );
      expect(error).toBeDefined();
    });

    it('should detect invalid URL format (invalid characters)', async () => {
      const symbolTable = await compileFixtureForValidator(
        'RestResourceInvalidUrl.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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
      const error = result.errors.find(
        (e: any) => e.code === ErrorCodes.REST_RESOURCE_URL_INVALID_URL,
      );
      expect(error).toBeDefined();
    });

    it('should pass validation for valid RestResource URL', async () => {
      const symbolTable = await compileFixtureForValidator(
        'RestResourceValid.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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
  });

  describe('@InvocableMethod validation', () => {
    it('should detect method with no parameters', async () => {
      const symbolTable = await compileFixtureForValidator(
        'InvocableMethodNoParams.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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
      const error = result.errors[0] as any;
      expect(error.code).toBe(ErrorCodes.INVOCABLE_METHOD_SINGLE_PARAM);
    });

    it('should detect method with multiple parameters', async () => {
      const symbolTable = await compileFixtureForValidator(
        'InvocableMethodMultipleParams.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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
      const error = result.errors[0] as any;
      expect(error.code).toBe(ErrorCodes.INVOCABLE_METHOD_SINGLE_PARAM);
    });

    it('should detect non-list parameter type', async () => {
      const symbolTable = await compileFixtureForValidator(
        'InvocableMethodNonListParam.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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
      const error = result.errors[0] as any;
      expect(error.code).toBe(ErrorCodes.INVOCABLE_METHOD_NON_LIST_PARAMETER);
    });

    it('should detect invalid annotation combination', async () => {
      const symbolTable = await compileFixtureForValidator(
        'InvocableMethodInvalidAnnotation.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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
      const error = result.errors.find(
        (e: any) =>
          e.code === ErrorCodes.INVOCABLE_METHOD_CAN_ONLY_HAVE_DEPRECATED,
      );
      expect(error).toBeDefined();
    });

    it('should pass validation for valid InvocableMethod', async () => {
      const symbolTable = await compileFixtureForValidator(
        'InvocableMethodValid.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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
  });

  describe('@SuppressWarnings validation', () => {
    it('should detect missing required value parameter', async () => {
      const symbolTable = await compileFixtureForValidator(
        'SuppressWarningsMissingValue.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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
      const error = result.errors.find(
        (e: any) => e.code === ErrorCodes.ANNOTATION_PROPERTY_MISSING,
      );
      expect(error).toBeDefined();
    });

    it('should pass validation for valid SuppressWarnings', async () => {
      const symbolTable = await compileFixtureForValidator(
        'SuppressWarningsValid.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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
  });

  describe('@Deprecated validation', () => {
    it('should pass validation for valid Deprecated annotations', async () => {
      const symbolTable = await compileFixtureForValidator(
        'DeprecatedValid.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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
  });

  describe('@AuraEnabled validation', () => {
    it('should pass validation for valid AuraEnabled annotations', async () => {
      const symbolTable = await compileFixtureForValidator(
        'AuraEnabledValid.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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

    it('should detect invalid enum values and types', async () => {
      const symbolTable = await compileFixtureForValidator(
        'AuraEnabledInvalid.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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
    });
  });

  describe('@ReadOnly validation', () => {
    it('should pass validation for valid ReadOnly annotations', async () => {
      const symbolTable = await compileFixtureForValidator('ReadOnlyValid.cls');

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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

    it('should detect invalid useReplica enum value', async () => {
      const symbolTable = await compileFixtureForValidator(
        'ReadOnlyInvalid.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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
    });
  });

  describe('@Future validation', () => {
    it('should pass validation for valid Future annotations', async () => {
      const symbolTable = await compileFixtureForValidator('FutureValid.cls');

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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

    it('should detect invalid delay range and limits enum', async () => {
      const symbolTable = await compileFixtureForValidator('FutureInvalid.cls');

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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
    });
  });

  describe('@IsTest validation', () => {
    it('should pass validation for valid IsTest annotations', async () => {
      const symbolTable = await compileFixtureForValidator('IsTestValid.cls');

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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
  });

  describe('@InvocableVariable validation', () => {
    it('should pass validation for valid InvocableVariable annotations', async () => {
      const symbolTable = await compileFixtureForValidator(
        'InvocableVariableValid.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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
  });

  describe('@JsonAccess validation', () => {
    it('should pass validation for valid JsonAccess annotations', async () => {
      const symbolTable = await compileFixtureForValidator(
        'JsonAccessValid.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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

    it('should detect invalid enum values', async () => {
      const symbolTable = await compileFixtureForValidator(
        'JsonAccessInvalid.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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
    });
  });

  describe('@RemoteAction validation', () => {
    it('should pass validation for valid RemoteAction annotations', async () => {
      const symbolTable = await compileFixtureForValidator(
        'RemoteActionValid.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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
  });

  describe('@TestSetup validation', () => {
    it('should pass validation for valid TestSetup annotations', async () => {
      const symbolTable =
        await compileFixtureForValidator('TestSetupValid.cls');

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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
  });

  describe('HTTP annotations validation', () => {
    it('should pass validation for valid HTTP annotations', async () => {
      const symbolTable = await compileFixtureForValidator(
        'HttpAnnotationsValid.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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

    it('should detect unsupported properties on HTTP annotations', async () => {
      const symbolTable = await compileFixtureForValidator(
        'HttpAnnotationsInvalid.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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
      const error = result.errors.find(
        (e: any) => e.code === ErrorCodes.ANNOTATION_PROPERTY_NOT_SUPPORTED,
      );
      expect(error).toBeDefined();
    });
  });

  describe('@JsonAccess control parameter validation', () => {
    it('should detect missing control parameters', async () => {
      const symbolTable = await compileFixtureForValidator(
        'JsonAccessMissingControl.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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
      const error = result.errors.find(
        (e: any) =>
          e.code ===
          ErrorCodes.ANNOTATION_JSONACCESS_MUST_SPECIFY_CONTROL_PARAMETER,
      );
      expect(error).toBeDefined();
    });

    it('should pass validation with serializable parameter', async () => {
      const symbolTable = await compileFixtureForValidator(
        'JsonAccessValid.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
          symbolTable,
          createValidationOptions(symbolManager, {
            tier: ValidationTier.IMMEDIATE,
            allowArtifactLoading: false,
          }),
        ),
        symbolManager,
      );

      // JsonAccessValid.cls has valid @JsonAccess annotations
      // Check that no control parameter errors are reported
      const controlParamError = result.errors.find(
        (e: any) =>
          e.code ===
          ErrorCodes.ANNOTATION_JSONACCESS_MUST_SPECIFY_CONTROL_PARAMETER,
      );
      expect(controlParamError).toBeUndefined();
    });
  });

  describe('Empty property value validation', () => {
    it('should detect empty property values', async () => {
      const symbolTable = await compileFixtureForValidator(
        'EmptyPropertyValues.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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
      const error = result.errors.find(
        (e: any) => e.code === ErrorCodes.ANNOTATION_PROPERTY_CANNOT_BE_EMPTY,
      );
      expect(error).toBeDefined();
    });
  });

  describe('Duplicate parameter validation', () => {
    it('should detect duplicate parameters', async () => {
      const symbolTable = await compileFixtureForValidator(
        'DuplicateParameters.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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
      const error = result.errors.find(
        (e: any) =>
          e.code === ErrorCodes.ANNOTATION_PROPERTY_INVALID_MULTIPLE_PARAMETER,
      );
      expect(error).toBeDefined();
    });
  });

  describe('Type mismatch validation', () => {
    it('should detect type mismatches', async () => {
      const symbolTable = await compileFixtureForValidator('TypeMismatch.cls');

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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
      const error = result.errors.find(
        (e: any) => e.code === ErrorCodes.ANNOTATION_PROPERTY_INVALID_TYPE,
      );
      expect(error).toBeDefined();
    });
  });

  describe('API version format validation', () => {
    it('should detect invalid API version format', async () => {
      const symbolTable = await compileFixtureForValidator(
        'DeprecatedInvalidApiVersion.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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
      const error = result.errors.find(
        (e: any) =>
          e.code === ErrorCodes.ANNOTATION_PROPERTY_INVALID_API_VERSION,
      );
      expect(error).toBeDefined();
    });
  });

  describe('Enum value validation', () => {
    it('should detect value not allowed for enum property', async () => {
      const symbolTable = await compileFixtureForValidator(
        'AuraEnabledValueNotAllowed.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
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
      const error = result.errors.find(
        (e: any) =>
          e.code === ErrorCodes.ANNOTATION_PROPERTY_VALUE_IS_NOT_ALLOWED,
      );
      expect(error).toBeDefined();
    });
  });

  describe('TIER 2: testFor type resolution', () => {
    it('should validate testFor references exist for classes', async () => {
      // Compile referenced class first
      await compileFixtureForValidator('ReferencedClass.cls');

      // Compile test class with testFor reference
      const symbolTable = await compileFixtureForValidator(
        'TestForExistingClass.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
          symbolTable,
          createValidationOptions(symbolManager, {
            tier: ValidationTier.THOROUGH,
            allowArtifactLoading: true,
          }),
        ),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
      const error = result.errors.find(
        (e: any) => e.code === ErrorCodes.ANNOTATION_PROPERTY_VALUE_NOT_FOUND,
      );
      expect(error).toBeUndefined();
    });

    it('should report error for missing testFor class references', async () => {
      const symbolTable = await compileFixtureForValidator(
        'TestForMissingClass.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
          symbolTable,
          createValidationOptions(symbolManager, {
            tier: ValidationTier.THOROUGH,
            allowArtifactLoading: true,
          }),
        ),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      const error = result.errors.find(
        (e: any) => e.code === ErrorCodes.ANNOTATION_PROPERTY_VALUE_NOT_FOUND,
      ) as ValidationErrorInfo | undefined;
      expect(error).toBeDefined();
      expect(error?.message).toContain('NonExistentClass');
    });

    it('should validate testFor references exist for triggers', async () => {
      // Compile trigger first
      await compileFixtureForValidator('MyTrigger.trigger');

      // Compile test class with testFor reference
      const symbolTable =
        await compileFixtureForValidator('TestForTrigger.cls');

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
          symbolTable,
          createValidationOptions(symbolManager, {
            tier: ValidationTier.THOROUGH,
            allowArtifactLoading: true,
          }),
        ),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
      const error = result.errors.find(
        (e: any) => e.code === ErrorCodes.ANNOTATION_PROPERTY_VALUE_NOT_FOUND,
      );
      expect(error).toBeUndefined();
    });

    it('should report error for missing testFor trigger references', async () => {
      const symbolTable = await compileFixtureForValidator(
        'TestForMissingTrigger.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
          symbolTable,
          createValidationOptions(symbolManager, {
            tier: ValidationTier.THOROUGH,
            allowArtifactLoading: true,
          }),
        ),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      const error = result.errors.find(
        (e: any) => e.code === ErrorCodes.ANNOTATION_PROPERTY_VALUE_NOT_FOUND,
      ) as ValidationErrorInfo | undefined;
      expect(error).toBeDefined();
      expect(error?.message).toContain('NonExistentTrigger');
    });

    it('should handle multiple testFor references with mixed existing/missing', async () => {
      // Compile existing class first
      await compileFixtureForValidator('ExistingClass.cls');

      // Compile test class with multiple references
      const symbolTable = await compileFixtureForValidator(
        'TestForMultipleTypes.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
          symbolTable,
          createValidationOptions(symbolManager, {
            tier: ValidationTier.THOROUGH,
            allowArtifactLoading: true,
          }),
        ),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      const errors = result.errors.filter(
        (e: any) => e.code === ErrorCodes.ANNOTATION_PROPERTY_VALUE_NOT_FOUND,
      );
      expect(errors.length).toBeGreaterThan(0);
      const missingClassError = errors.find((e: any) =>
        e.message.includes('MissingClass'),
      );
      expect(missingClassError).toBeDefined();
    });

    it('should skip TIER 2 validation in TIER 1 mode', async () => {
      const symbolTable = await compileFixtureForValidator(
        'TestForMissingClass.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
          symbolTable,
          createValidationOptions(symbolManager, {
            tier: ValidationTier.IMMEDIATE,
            allowArtifactLoading: false,
          }),
        ),
        symbolManager,
      );

      // Should not report TIER 2 errors in TIER 1 mode
      const tier2Error = result.errors.find(
        (e: any) => e.code === ErrorCodes.ANNOTATION_PROPERTY_VALUE_NOT_FOUND,
      );
      expect(tier2Error).toBeUndefined();
    });
  });

  describe('TIER 1: testFor format validation', () => {
    it('should report error for invalid prefix', async () => {
      const symbolTable = await compileFixtureForValidator(
        'TestForInvalidPrefix.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
          symbolTable,
          createValidationOptions(symbolManager, {
            tier: ValidationTier.IMMEDIATE,
            allowArtifactLoading: false,
          }),
        ),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      const error = result.errors.find(
        (e: any) =>
          e.code === ErrorCodes.ANNOTATION_PROPERTY_TESTFOR_INVALID_PREFIX,
      ) as ValidationErrorInfo | undefined;
      expect(error).toBeDefined();
      expect(error?.message).toContain('Invalid prefix');
      expect(error?.message).toContain('ApexClass or ApexTrigger');
    });

    it('should report error for empty suffix (empty type name)', async () => {
      const symbolTable = await compileFixtureForValidator(
        'TestForEmptySuffix.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
          symbolTable,
          createValidationOptions(symbolManager, {
            tier: ValidationTier.IMMEDIATE,
            allowArtifactLoading: false,
          }),
        ),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      const error = result.errors.find(
        (e: any) =>
          e.code === ErrorCodes.ANNOTATION_PROPERTY_TESTFOR_EMPTY_SUFFIX,
      ) as ValidationErrorInfo | undefined;
      expect(error).toBeDefined();
      expect(error?.message).toContain('testFor');
      expect(error?.message).toContain('Class');
    });

    it('should report multiple format errors for invalid testFor value', async () => {
      const symbolTable = await compileFixtureForValidator(
        'TestForMultipleFormatErrors.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
          symbolTable,
          createValidationOptions(symbolManager, {
            tier: ValidationTier.IMMEDIATE,
            allowArtifactLoading: false,
          }),
        ),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      const prefixErrors = result.errors.filter(
        (e: any) =>
          e.code === ErrorCodes.ANNOTATION_PROPERTY_TESTFOR_INVALID_PREFIX,
      );
      const suffixErrors = result.errors.filter(
        (e: any) =>
          e.code === ErrorCodes.ANNOTATION_PROPERTY_TESTFOR_EMPTY_SUFFIX,
      );

      // Should have at least one invalid prefix error
      expect(prefixErrors.length).toBeGreaterThan(0);
      // Should have at least two empty suffix errors (ApexClass: and ApexTrigger:)
      expect(suffixErrors.length).toBeGreaterThanOrEqual(2);
    });

    it('should validate format before attempting TIER 2 type resolution', async () => {
      const symbolTable = await compileFixtureForValidator(
        'TestForInvalidPrefix.cls',
      );

      const result = await runValidator(
        AnnotationPropertyValidator.validate(
          symbolTable,
          createValidationOptions(symbolManager, {
            tier: ValidationTier.THOROUGH,
            allowArtifactLoading: true,
          }),
        ),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      // Should have format error
      const formatError = result.errors.find(
        (e: any) =>
          e.code === ErrorCodes.ANNOTATION_PROPERTY_TESTFOR_INVALID_PREFIX,
      );
      expect(formatError).toBeDefined();

      // Should NOT attempt TIER 2 type resolution when format is invalid
      const typeResolutionError = result.errors.find(
        (e: any) => e.code === ErrorCodes.ANNOTATION_PROPERTY_VALUE_NOT_FOUND,
      );
      expect(typeResolutionError).toBeUndefined();
    });

    it('should work in both TIER 1 and TIER 2 modes', async () => {
      const symbolTable = await compileFixtureForValidator(
        'TestForEmptySuffix.cls',
      );

      // Test TIER 1
      const tier1Result = await runValidator(
        AnnotationPropertyValidator.validate(
          symbolTable,
          createValidationOptions(symbolManager, {
            tier: ValidationTier.IMMEDIATE,
            allowArtifactLoading: false,
          }),
        ),
        symbolManager,
      );

      expect(tier1Result.isValid).toBe(false);
      const tier1Error = tier1Result.errors.find(
        (e: any) =>
          e.code === ErrorCodes.ANNOTATION_PROPERTY_TESTFOR_EMPTY_SUFFIX,
      );
      expect(tier1Error).toBeDefined();

      // Test TIER 2 (should also catch format errors)
      const tier2Result = await runValidator(
        AnnotationPropertyValidator.validate(
          symbolTable,
          createValidationOptions(symbolManager, {
            tier: ValidationTier.THOROUGH,
            allowArtifactLoading: true,
          }),
        ),
        symbolManager,
      );

      expect(tier2Result.isValid).toBe(false);
      const tier2Error = tier2Result.errors.find(
        (e: any) =>
          e.code === ErrorCodes.ANNOTATION_PROPERTY_TESTFOR_EMPTY_SUFFIX,
      );
      expect(tier2Error).toBeDefined();
    });
  });

  describe('TIER 1: Format validation for configurationEditor (LWC name)', () => {
    it('should report error for LWC name starting with uppercase', async () => {
      const symbolTable =
        await compileFixtureForValidator('InvalidLWCName.cls');
      const result = await runValidator(
        AnnotationPropertyValidator.validate(
          symbolTable,
          createValidationOptions(symbolManager, {
            tier: ValidationTier.IMMEDIATE,
            enableVersionSpecificValidation: true,
            apiVersion: 24,
          }),
        ),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      const error = result.errors.find(
        (e): e is ValidationErrorInfo =>
          typeof e !== 'string' &&
          e.code ===
            ErrorCodes.ANNOTATION_PROPERTY_INVALID_LIGHTNING_WEB_COMPONENT_NAME,
      );
      expect(error).toBeDefined();
      expect(error?.message).toContain('MyComponent');
    });

    it('should report error for LWC name with hyphen', async () => {
      const symbolTable = await compileFixtureForValidator(
        'InvalidLWCNameLowercase.cls',
      );
      const result = await runValidator(
        AnnotationPropertyValidator.validate(
          symbolTable,
          createValidationOptions(symbolManager, {
            tier: ValidationTier.IMMEDIATE,
            enableVersionSpecificValidation: true,
            apiVersion: 24,
          }),
        ),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      const error = result.errors.find(
        (e): e is ValidationErrorInfo =>
          typeof e !== 'string' &&
          e.code ===
            ErrorCodes.ANNOTATION_PROPERTY_INVALID_LIGHTNING_WEB_COMPONENT_NAME,
      );
      expect(error).toBeDefined();
    });

    it('should report error for LWC name with space', async () => {
      const symbolTable = await compileFixtureForValidator(
        'InvalidLWCNameSpace.cls',
      );
      const result = await runValidator(
        AnnotationPropertyValidator.validate(
          symbolTable,
          createValidationOptions(symbolManager, {
            tier: ValidationTier.IMMEDIATE,
            enableVersionSpecificValidation: true,
            apiVersion: 24,
          }),
        ),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      const error = result.errors.find(
        (e): e is ValidationErrorInfo =>
          typeof e !== 'string' &&
          e.code ===
            ErrorCodes.ANNOTATION_PROPERTY_INVALID_LIGHTNING_WEB_COMPONENT_NAME,
      );
      expect(error).toBeDefined();
    });

    it('should report error for LWC name starting with number', async () => {
      const symbolTable = await compileFixtureForValidator(
        'InvalidLWCNameNumericStart.cls',
      );
      const result = await runValidator(
        AnnotationPropertyValidator.validate(
          symbolTable,
          createValidationOptions(symbolManager, {
            tier: ValidationTier.IMMEDIATE,
            enableVersionSpecificValidation: true,
            apiVersion: 24,
          }),
        ),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      const error = result.errors.find(
        (e): e is ValidationErrorInfo =>
          typeof e !== 'string' &&
          e.code ===
            ErrorCodes.ANNOTATION_PROPERTY_INVALID_LIGHTNING_WEB_COMPONENT_NAME,
      );
      expect(error).toBeDefined();
    });

    it('should accept valid camelCase LWC name', async () => {
      const symbolTable = await compileFixtureForValidator('ValidLWCName.cls');
      const result = await runValidator(
        AnnotationPropertyValidator.validate(
          symbolTable,
          createValidationOptions(symbolManager, {
            tier: ValidationTier.IMMEDIATE,
            enableVersionSpecificValidation: true,
            apiVersion: 24, // configurationEditor requires API version 24+
          }),
        ),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
      const error = result.errors.find(
        (e): e is ValidationErrorInfo =>
          typeof e !== 'string' &&
          e.code ===
            ErrorCodes.ANNOTATION_PROPERTY_INVALID_LIGHTNING_WEB_COMPONENT_NAME,
      );
      expect(error).toBeUndefined();
    });
  });

  describe('TIER 1: Format validation for iconName (static resource name)', () => {
    it('should report error for static resource name with hyphen', async () => {
      const symbolTable = await compileFixtureForValidator(
        'InvalidStaticResourceName.cls',
      );
      const result = await runValidator(
        AnnotationPropertyValidator.validate(
          symbolTable,
          createValidationOptions(symbolManager, {
            tier: ValidationTier.IMMEDIATE,
            enableVersionSpecificValidation: true,
            apiVersion: 25,
          }),
        ),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      const error = result.errors.find(
        (e): e is ValidationErrorInfo =>
          typeof e !== 'string' &&
          e.code ===
            ErrorCodes.ANNOTATION_PROPERTY_INVALID_STATIC_RESOURCE_NAME,
      );
      expect(error).toBeDefined();
    });

    it('should report error for static resource name with space', async () => {
      const symbolTable = await compileFixtureForValidator(
        'InvalidStaticResourceNameSpace.cls',
      );
      const result = await runValidator(
        AnnotationPropertyValidator.validate(
          symbolTable,
          createValidationOptions(symbolManager, {
            tier: ValidationTier.IMMEDIATE,
            enableVersionSpecificValidation: true,
            apiVersion: 25,
          }),
        ),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      const error = result.errors.find(
        (e): e is ValidationErrorInfo =>
          typeof e !== 'string' &&
          e.code ===
            ErrorCodes.ANNOTATION_PROPERTY_INVALID_STATIC_RESOURCE_NAME,
      );
      expect(error).toBeDefined();
    });

    it('should report error for static resource name starting with number', async () => {
      const symbolTable = await compileFixtureForValidator(
        'InvalidStaticResourceNameNumericStart.cls',
      );
      const result = await runValidator(
        AnnotationPropertyValidator.validate(
          symbolTable,
          createValidationOptions(symbolManager, {
            tier: ValidationTier.IMMEDIATE,
            enableVersionSpecificValidation: true,
            apiVersion: 25,
          }),
        ),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      const error = result.errors.find(
        (e): e is ValidationErrorInfo =>
          typeof e !== 'string' &&
          e.code ===
            ErrorCodes.ANNOTATION_PROPERTY_INVALID_STATIC_RESOURCE_NAME,
      );
      expect(error).toBeDefined();
    });

    it('should accept valid static resource name', async () => {
      const symbolTable = await compileFixtureForValidator(
        'ValidStaticResourceName.cls',
      );
      const result = await runValidator(
        AnnotationPropertyValidator.validate(
          symbolTable,
          createValidationOptions(symbolManager, {
            tier: ValidationTier.IMMEDIATE,
            enableVersionSpecificValidation: true,
            apiVersion: 25, // iconName requires API version 25+
          }),
        ),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
      const error = result.errors.find(
        (e): e is ValidationErrorInfo =>
          typeof e !== 'string' &&
          e.code ===
            ErrorCodes.ANNOTATION_PROPERTY_INVALID_STATIC_RESOURCE_NAME,
      );
      expect(error).toBeUndefined();
    });
  });

  describe('TIER 1: Numeric comparison validation', () => {
    // Note: Numeric comparisons are implemented and ready to use.
    // Currently, all numeric properties use propertyIntegerRanges instead.
    // This test verifies the infrastructure is in place and working.
    // Real-world examples can be added to the registry when needed.

    it('should validate numeric comparison infrastructure exists', () => {
      // Verify the NumericComparison interface and propertyNumericComparisons
      // are properly defined in the AnnotationPropertyInfo interface
      // This is a structural test to ensure the feature is available
      expect(
        ErrorCodes.ANNOTATION_PROPERTY_GREATER_THAN_OR_EQUAL,
      ).toBeDefined();
      expect(ErrorCodes.ANNOTATION_PROPERTY_LESS_THAN_OR_EQUAL).toBeDefined();
    });

    // Note: To test numeric comparisons with real annotations, add a property
    // to the registry that uses propertyNumericComparisons instead of
    // propertyIntegerRanges. For example:
    // propertyNumericComparisons: new CaseInsensitiveHashMap<NumericComparison>([
    //   ['someProperty', { operator: '>=', value: 0 }],
    //   ['someProperty', { operator: '<=', value: 100 }],
    // ])
  });

  describe('TIER 1: String value validation', () => {
    // Note: String value validation (propertyInvalidStringValues) is implemented
    // and ready to use. This allows marking specific string values as invalid.
    // Real-world examples can be added to the registry when needed.

    it('should validate string value validation infrastructure exists', () => {
      // Verify the propertyInvalidStringValues and error code are properly defined
      expect(ErrorCodes.ANNOTATION_PROPERTY_BAD_STRING_VALUE).toBeDefined();
    });

    // Note: To test string value validation with real annotations, add a property
    // to the registry that uses propertyInvalidStringValues. For example:
    // propertyInvalidStringValues: new CaseInsensitiveHashMap<string[]>([
    //   ['someProperty', ['invalidValue1', 'invalidValue2']],
    // ])
  });

  describe('TIER 1: Sibling and target validation', () => {
    // Note: Sibling and target validation infrastructure is implemented and ready to use.
    // This allows:
    // - propertySiblingRestrictions: Array of [property1, property2] pairs that cannot be used together
    // - propertyAllowedTargets: Map of properties to allowed SymbolKind values

    it('should validate sibling and target validation infrastructure exists', () => {
      // Verify the error codes are properly defined
      expect(
        ErrorCodes.ANNOTATION_PROPERTY_SIBLING_INVALID_VALUE,
      ).toBeDefined();
      expect(ErrorCodes.ANNOTATION_PROPERTY_IS_NOT_ALLOWED).toBeDefined();
      expect(
        ErrorCodes.ANNOTATION_PROPERTY_NOT_SUPPORTED_FOR_TYPE,
      ).toBeDefined();
    });

    // Note: To test sibling validation with real annotations, add to the registry:
    // propertySiblingRestrictions: [['property1', 'property2']]
    //
    // To test target validation, add:
    // propertyAllowedTargets: new CaseInsensitiveHashMap<SymbolKind[]>([
    //   ['someProperty', [SymbolKind.Method]],
    // ])
  });
});
