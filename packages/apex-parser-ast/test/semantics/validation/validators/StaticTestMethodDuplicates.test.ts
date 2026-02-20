/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import {
  DuplicateMethodValidator,
  DuplicateSymbolValidator,
  DuplicateTypeNameValidator,
  InterfaceHierarchyValidator,
  MethodResolutionValidator,
} from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';
import {
  loadFixture,
  compileFixture,
  compileSourceLayeredWithOptions,
  runValidator,
  createValidationOptions,
  getMessage,
} from './helpers/validation-test-helpers';

describe('Static test method duplicate false positives', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  describe('compileLayered (public-api -> full) - simulates real diagnostic flow', () => {
    it('should NOT report method.already.exists for static @isTest methods', async () => {
      const source = loadFixture('duplicate-method', 'StaticTestMethods.cls');
      const fileUri = 'file:///test/StaticTestMethods.cls';

      const { symbolTable, options } = await compileSourceLayeredWithOptions(
        source,
        fileUri,
        symbolManager,
        compilerService,
        { tier: ValidationTier.IMMEDIATE, allowArtifactLoading: false },
      );

      const result = await runValidator(
        DuplicateMethodValidator.validate(symbolTable, options),
        symbolManager,
      );

      const methodErrors = result.errors.filter(
        (e) =>
          typeof e !== 'string' && e.code === ErrorCodes.METHOD_ALREADY_EXISTS,
      );

      if (methodErrors.length > 0) {
        console.log(
          'Unexpected method.already.exists errors:',
          methodErrors.map((e) => getMessage(e)),
        );
      }

      expect(methodErrors).toHaveLength(0);
    });

    it('should NOT report duplicate.variable for same names in different static methods', async () => {
      const source = loadFixture('duplicate-method', 'StaticTestMethods.cls');
      const fileUri = 'file:///test/StaticTestMethods.cls';

      const { symbolTable, options } = await compileSourceLayeredWithOptions(
        source,
        fileUri,
        symbolManager,
        compilerService,
        { tier: ValidationTier.IMMEDIATE, allowArtifactLoading: false },
      );

      const result = await runValidator(
        DuplicateSymbolValidator.validate(symbolTable, options),
        symbolManager,
      );

      const dupVarErrors = result.errors.filter(
        (e) =>
          typeof e !== 'string' && e.code === ErrorCodes.DUPLICATE_VARIABLE,
      );

      if (dupVarErrors.length > 0) {
        console.log(
          'Unexpected duplicate.variable errors:',
          dupVarErrors.map((e) => getMessage(e)),
        );
      }

      expect(dupVarErrors).toHaveLength(0);
    });
  });

  describe('single full compilation (baseline - should pass)', () => {
    it('should pass DuplicateMethodValidator with full compilation only', async () => {
      const symbolTable = await compileFixture(
        'duplicate-method',
        'StaticTestMethods.cls',
        undefined,
        symbolManager,
        compilerService,
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

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass DuplicateSymbolValidator with full compilation only', async () => {
      const symbolTable = await compileFixture(
        'duplicate-method',
        'StaticTestMethods.cls',
        undefined,
        symbolManager,
        compilerService,
      );

      const result = await runValidator(
        DuplicateSymbolValidator.validate(
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

  describe('GeocodingServiceTest-style (static methods + inner classes)', () => {
    it('should NOT report duplicate.variable when static methods + inner classes', async () => {
      const testSource = loadFixture('geocoding', 'GeocodingServiceTest.cls');

      // Compile GeocodingService first for cross-file resolution
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
        { tier: ValidationTier.IMMEDIATE, allowArtifactLoading: false },
      );

      const result = await runValidator(
        DuplicateSymbolValidator.validate(symbolTable, options),
        symbolManager,
      );

      const dupVarErrors = result.errors.filter(
        (e) =>
          typeof e !== 'string' && e.code === ErrorCodes.DUPLICATE_VARIABLE,
      );

      if (dupVarErrors.length > 0) {
        console.log(
          'Unexpected duplicate.variable errors:',
          dupVarErrors.map((e) => getMessage(e)),
        );
      }

      expect(dupVarErrors).toHaveLength(0);
    });

    it('should NOT report inner-class errors (duplicate type, method, interface, setBody)', async () => {
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
        { tier: ValidationTier.THOROUGH, allowArtifactLoading: true },
        { layers: ['public-api', 'full'] },
      );

      const innerClassErrorCodes = [
        ErrorCodes.DUPLICATE_TYPE_NAME,
        ErrorCodes.METHOD_ALREADY_EXISTS,
        ErrorCodes.INTERFACE_IMPLEMENTATION_MISSING_METHOD,
        ErrorCodes.METHOD_DOES_NOT_SUPPORT_PARAMETER_TYPE,
      ];

      for (const validator of [
        DuplicateTypeNameValidator,
        DuplicateMethodValidator,
        InterfaceHierarchyValidator,
        MethodResolutionValidator,
      ]) {
        const result = await runValidator(
          validator.validate(symbolTable, options),
          symbolManager,
        );
        const relevantErrors = result.errors.filter(
          (e) =>
            typeof e !== 'string' &&
            innerClassErrorCodes.includes(e.code as string),
        );
        if (relevantErrors.length > 0) {
          console.log(
            `${validator.name} unexpected errors:`,
            relevantErrors.map((e) => getMessage(e)),
          );
        }
        expect(relevantErrors).toHaveLength(0);
      }
    });
  });
});
