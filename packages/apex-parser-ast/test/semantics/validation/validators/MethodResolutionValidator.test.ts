/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { MethodResolutionValidator } from '../../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import { Effect } from 'effect';
import {
  compileFixture,
  compileFixtureWithOptions,
  compileSourceLayeredWithOptions,
  loadFixture,
  runValidator,
  createValidationOptions,
} from './helpers/validation-test-helpers';
import {
  initializeResourceLoaderForTests,
  resetResourceLoader,
} from '../../../helpers/testHelpers';
import {
  resolveTypeName,
  ReferenceTypeEnum,
  IdentifierContext,
} from '../../../../src/namespace/NamespaceUtils';
import { EffectTestLoggerLive } from '../../../../src/utils/EffectLspLoggerLayer';
import { SymbolTable, SymbolKind } from '../../../../src/types/symbol';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

describe('MethodResolutionValidator', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeAll(async () => {
    await initializeResourceLoaderForTests();
  });

  afterAll(() => {
    resetResourceLoader();
  });

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();

    // Enable console logging and set to debug level while debugging
    enableConsoleLogging();
    setLogLevel('error');
  });

  afterEach(() => {
    symbolManager.clear();
  });

  const VALIDATOR_CATEGORY = 'method-resolution';

  it('should have correct metadata', () => {
    expect(MethodResolutionValidator.id).toBe('method-resolution');
    expect(MethodResolutionValidator.name).toBe('Method Resolution Validator');
    expect(MethodResolutionValidator.tier).toBe(ValidationTier.THOROUGH);
    expect(MethodResolutionValidator.priority).toBe(10);
  });

  describe('TIER 2: Parameter type matching', () => {
    it('should validate method calls with correct argument types', async () => {
      // First compile the class with typed methods
      await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'ClassWithTypedMethods.cls',
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
        'CallerWithCorrectTypes.cls',
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
        MethodResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect method calls with incorrect argument types', async () => {
      // First compile the class with typed methods
      await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'ClassWithTypedMethods.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: true,
        },
      );

      // Then compile the caller class with incorrect types
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'CallerWithIncorrectTypes.cls',
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
        MethodResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      const hasParameterTypeError = result.errors.some(
        (e: any) =>
          e.code === ErrorCodes.METHOD_DOES_NOT_SUPPORT_PARAMETER_TYPE,
      );
      expect(hasParameterTypeError).toBe(true);
    });

    it('should accept String and Exception for Assert Object parameters (implicit upcast)', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'AssertObjectParams.cls',
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
        MethodResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
      const paramTypeErrors = result.errors.filter(
        (e: any) =>
          e.code === ErrorCodes.METHOD_DOES_NOT_SUPPORT_PARAMETER_TYPE,
      );
      expect(paramTypeErrors).toHaveLength(0);
    });

    it('should match Assert.isInstanceOfType by param count (2-param vs 3-param overload)', async () => {
      const source = `
        public class AssertOverloadTest {
          public static void twoParam() {
            try { throw new Exception('x'); } catch (Exception e) {
              Assert.isInstanceOfType(e, Exception.class);
            }
          }
          public static void threeParam() {
            try { throw new Exception('x'); } catch (Exception e) {
              Assert.isInstanceOfType(e, Exception.class, 'expected');
            }
          }
        }
      `;
      const { symbolTable, options } = await compileSourceLayeredWithOptions(
        source,
        'file:///test/AssertOverloadTest.cls',
        symbolManager,
        compilerService,
        { tier: ValidationTier.THOROUGH, allowArtifactLoading: true },
      );
      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(
          symbolTable.getFileUri() || '',
        ),
      );
      const result = await runValidator(
        MethodResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );
      const paramTypeErrors = result.errors.filter(
        (e: any) =>
          e.code === ErrorCodes.METHOD_DOES_NOT_SUPPORT_PARAMETER_TYPE,
      );
      expect(paramTypeErrors).toHaveLength(0);
    });

    it('reproduces dreamhouse path: compileLayered public-api->full like LayerEnrichmentService', async () => {
      const source = `
@isTest
private class FileUtilitiesTest {
    @isTest
    static void createFileSucceedsWhenCorrectInput() {
        String contentDocumentLinkId = 'test-id';
        Assert.isNotNull(contentDocumentLinkId);
    }
    @isTest
    static void createFileFailsWhenIncorrectRecordId() {
        try {
            throw new AuraHandledException('x');
        } catch (Exception e) {
            Assert.isInstanceOfType(e, AuraHandledException.class);
        }
    }
}
      `;
      const compilerService = new CompilerService();
      const table = new SymbolTable();
      const { VisibilitySymbolListener } = await import(
        '../../../../src/parser/listeners/VisibilitySymbolListener'
      );
      const initialListener = new VisibilitySymbolListener('public-api', table);
      const initialResult = compilerService.compile(
        source,
        'file:///test/FileUtilitiesTest.cls',
        initialListener,
        { collectReferences: true, resolveReferences: true },
      );
      const enrichedResult = compilerService.compileLayered(
        source,
        'file:///test/FileUtilitiesTest.cls',
        ['protected', 'private', 'full'],
        initialResult.result ?? undefined,
        { collectReferences: true, resolveReferences: true },
      );
      if (!enrichedResult.result) {
        throw new Error('Enriched compile failed');
      }
      await Effect.runPromise(
        symbolManager
          .addSymbolTable(
            enrichedResult.result,
            'file:///test/FileUtilitiesTest.cls',
          )
          .pipe(Effect.provide(EffectTestLoggerLive)),
      );
      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(
          'file:///test/FileUtilitiesTest.cls',
        ),
      );
      const options = createValidationOptions(symbolManager, {
        sourceContent: source,
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: true,
      });
      const result = await runValidator(
        MethodResolutionValidator.validate(enrichedResult.result, options),
        symbolManager,
      );
      const paramTypeErrors = result.errors.filter(
        (e: any) =>
          e.code === ErrorCodes.METHOD_DOES_NOT_SUPPORT_PARAMETER_TYPE,
      );
      expect(paramTypeErrors).toHaveLength(0);
    });

    it('should not report method.does.not.support.parameter.type for dreamhouse-style Assert calls', async () => {
      // TDD: Reproduces FileUtilitiesTest.cls false positives
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'AssertDreamhouseStyle.cls',
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
        MethodResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      const paramTypeErrors = result.errors.filter(
        (e: any) =>
          e.code === ErrorCodes.METHOD_DOES_NOT_SUPPORT_PARAMETER_TYPE,
      );
      expect(paramTypeErrors).toHaveLength(0);
    });
  });

  describe('TIER 2: Receiver type resolution (no false positives)', () => {
    it('should not report INVALID_METHOD_NOT_FOUND for f.getB() and System.debug (compileLayered)', async () => {
      // Reproduces Bar.cls false positives: getB from Foo, debug from System
      // Uses compileLayered to exercise BlockContentListener + ApexReferenceCollectorListener
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
        MethodResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      // No false positives: getB exists on Foo, debug exists on System
      const methodErrors = result.errors.filter(
        (e: any) => e.code === ErrorCodes.INVALID_METHOD_NOT_FOUND,
      );
      const getBErrors = methodErrors.filter(
        (e: any) => e.message?.includes('getB') ?? false,
      );
      const debugErrors = methodErrors.filter(
        (e: any) => e.message?.includes('debug') ?? false,
      );

      expect(getBErrors).toHaveLength(0);
      expect(debugErrors).toHaveLength(0);
    });
  });

  describe('TIER 2: Return type checking', () => {
    it('should validate method calls with correct return types', async () => {
      // First compile the class with return types
      await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'MethodWithReturnType.cls',
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
        'CallerWithCorrectReturnTypes.cls',
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
        MethodResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect method calls with incorrect return types', async () => {
      // First compile the class with return types
      await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'MethodWithReturnType.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.THOROUGH,
          allowArtifactLoading: true,
        },
      );

      // Then compile the caller class with incorrect return types
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'CallerWithIncorrectReturnTypes.cls',
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
        MethodResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      const hasReturnTypeError = result.errors.some(
        (e: any) => e.code === ErrorCodes.METHOD_DOES_NOT_SUPPORT_RETURN_TYPE,
      );
      expect(hasReturnTypeError).toBe(true);
    });
  });

  describe('Jorje-style type disambiguation', () => {
    it('should resolve Test.startTest() to System.Test in default namespace', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'TestSetMockDefaultNamespace.cls',
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
        MethodResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should resolve Test to System.Test (not Canvas.Test) in default namespace', async () => {
      const { symbolTable } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'TestSetMockDefaultNamespace.cls',
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

      const containingClass = symbolTable
        .getAllSymbols()
        .find(
          (s) => s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
        );
      expect(containingClass).toBeDefined();

      const resolutionResult = resolveTypeName(
        ['Test'],
        {
          namespace: null,
          version: 65,
          isTrusted: true,
          sourceType: 'FILE',
          referencingType: containingClass!,
          enclosingTypes: [],
          parentTypes: [],
          isStaticContext: true,
          currentSymbolTable: symbolTable,
        },
        ReferenceTypeEnum.METHOD,
        IdentifierContext.NONE,
        symbolManager as any,
      );

      expect(resolutionResult.isResolved).toBe(true);
      expect(resolutionResult.symbol).toBeDefined();
      expect(resolutionResult.symbol?.name).toBe('Test');
      expect(
        typeof resolutionResult.symbol?.namespace === 'string'
          ? resolutionResult.symbol.namespace
          : resolutionResult.symbol?.namespace?.toString?.(),
      ).toBe('System');
    });

    it('should resolve Test to Canvas.Test when namespace is Canvas', async () => {
      const source = `
@isTest
private class TestInCanvasNamespace {
    @isTest
    static void testCanvasLifecycle() {
        Test.testCanvasLifecycle(null, null);
    }
}`;
      const { symbolTable, options } = await compileSourceLayeredWithOptions(
        source,
        'file:///test/TestInCanvasNamespace.cls',
        symbolManager,
        compilerService,
        { namespace: 'Canvas' },
      );

      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(
          symbolTable.getFileUri() || '',
        ),
      );

      const result = await runValidator(
        MethodResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('TIER 2: Generic type parameter resolution for standard library methods', () => {
    it('should validate List<Coordinates>.add(coords) without false positives', async () => {
      // Tests the specific GeocodingService pattern that was causing false positives
      // List<Coordinates>.add(coords) should resolve generic type parameter T to Coordinates
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'GeocodingServiceListAdd.cls',
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
        MethodResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      // Should NOT produce method.does.not.support.parameter.type error
      const paramTypeErrors = result.errors.filter(
        (e: any) =>
          e.code === ErrorCodes.METHOD_DOES_NOT_SUPPORT_PARAMETER_TYPE,
      );
      const listAddErrors = paramTypeErrors.filter(
        (e: any) => e.message?.includes('add') ?? false,
      );
      expect(listAddErrors).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });

    it('should validate List<String>.add(string) with generic type resolution', async () => {
      // Tests generic type parameter resolution for List<String>.add()
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'ListAddGeneric.cls',
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
        MethodResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      // Should NOT produce method.does.not.support.parameter.type error for List<String>.add()
      const paramTypeErrors = result.errors.filter(
        (e: any) =>
          e.code === ErrorCodes.METHOD_DOES_NOT_SUPPORT_PARAMETER_TYPE,
      );
      const listAddErrors = paramTypeErrors.filter(
        (e: any) => e.message?.includes('add') ?? false,
      );
      expect(listAddErrors).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });

    it('should validate Set<Integer>.add(integer) with generic type resolution', async () => {
      // Tests generic type parameter resolution for Set<T>.add()
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'ListAddGeneric.cls',
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
        MethodResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      // Should NOT produce method.does.not.support.parameter.type error for Set<Integer>.add()
      const paramTypeErrors = result.errors.filter(
        (e: any) =>
          e.code === ErrorCodes.METHOD_DOES_NOT_SUPPORT_PARAMETER_TYPE,
      );
      const setAddErrors = paramTypeErrors.filter(
        (e: any) => e.message?.includes('add') ?? false,
      );
      expect(setAddErrors).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });

    it('should resolve standard library List.add method from enriched blocks', async () => {
      // Tests that standard library methods (like List.add) are correctly found
      // even when blocks have parentId with class:unknownClass (enrichment bug fix)
      const source = `
        public class TestListAdd {
          public void test() {
            List<String> strings = new List<String>();
            strings.add('test');
          }
        }
      `;
      const { symbolTable, options } = await compileSourceLayeredWithOptions(
        source,
        'file:///test/TestListAdd.cls',
        symbolManager,
        compilerService,
        { tier: ValidationTier.THOROUGH, allowArtifactLoading: true },
      );

      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(
          symbolTable.getFileUri() || '',
        ),
      );

      const result = await runValidator(
        MethodResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      // Should NOT produce INVALID_METHOD_NOT_FOUND for List.add
      const methodNotFoundErrors = result.errors.filter(
        (e: any) => e.code === ErrorCodes.INVALID_METHOD_NOT_FOUND,
      );
      const listAddNotFoundErrors = methodNotFoundErrors.filter(
        (e: any) => e.message?.includes('add') && e.message?.includes('List'),
      );
      expect(listAddNotFoundErrors).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });

    it('should validate Map<String, Integer>.put(key, value) with generic type resolution', async () => {
      // Tests generic type parameter resolution for Map.put(K, V)
      // Map.put has two parameters: K (key) and V (value)
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'MapPutGeneric.cls',
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
        MethodResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      // Should NOT produce method.does.not.support.parameter.type error for Map.put()
      const paramTypeErrors = result.errors.filter(
        (e: any) =>
          e.code === ErrorCodes.METHOD_DOES_NOT_SUPPORT_PARAMETER_TYPE,
      );
      const mapPutErrors = paramTypeErrors.filter(
        (e: any) => e.message?.includes('put') ?? false,
      );
      expect(mapPutErrors).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });

    it('should validate Map<String, Object>.put(key, value) with generic type resolution', async () => {
      // Tests Map.put with Object as value type (should accept String)
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'MapPutGeneric.cls',
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
        MethodResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      // Should NOT produce method.does.not.support.parameter.type error
      const paramTypeErrors = result.errors.filter(
        (e: any) =>
          e.code === ErrorCodes.METHOD_DOES_NOT_SUPPORT_PARAMETER_TYPE,
      );
      const mapPutErrors = paramTypeErrors.filter(
        (e: any) => e.message?.includes('put') ?? false,
      );
      expect(mapPutErrors).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });
  });

  describe('GeocodingServiceTest - method return type', () => {
    it('should NOT report return type error for geocodeAddresses', async () => {
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
        MethodResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      const returnTypeErrors = result.errors.filter(
        (e: any) => e.code === ErrorCodes.METHOD_DOES_NOT_SUPPORT_RETURN_TYPE,
      );
      const geocodeErrors = returnTypeErrors.filter(
        (e: any) => e.message?.includes('geocodeAddresses') ?? false,
      );

      if (geocodeErrors.length > 0) {
        console.log('Unexpected return type errors:', geocodeErrors);
      }

      expect(geocodeErrors).toHaveLength(0);
    });
  });

  describe('Default visibility = private (per Apex doc)', () => {
    it('should report INVALID_METHOD_NOT_FOUND when subclass accesses parent default method', async () => {
      await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'ParentWithDefaultMethod.cls',
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
        'SubclassAccessingDefaultMethod.cls',
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
        MethodResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      const visibilityError = result.errors.filter(
        (e: any) =>
          (e.code === ErrorCodes.METHOD_NOT_VISIBLE ||
            e.code === ErrorCodes.INVALID_METHOD_NOT_FOUND) &&
          e.message?.includes('getDefaultValue'),
      );
      expect(visibilityError.length).toBeGreaterThan(0);
    });

    it('should allow same-class access to default visibility method', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'ParentWithDefaultMethod.cls',
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
        MethodResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow inner class to access protected method of outer class', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'OuterWithProtectedInnerAccess.cls',
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
        MethodResolutionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
