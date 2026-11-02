/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CollectionValidator } from '../../../../src/semantics/validation/validators/CollectionValidator';
import { ValidationTier } from '../../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../src/parser/compilerService';
import { Effect } from 'effect';
import {
  runValidator,
  compileFixtureWithOptions,
} from './helpers/validation-test-helpers';
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

describe('CollectionValidator', () => {
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

  const VALIDATOR_CATEGORY = 'collection';

  it('should have correct metadata', () => {
    expect(CollectionValidator.id).toBe('collection');
    expect(CollectionValidator.name).toBe('Collection Validator');
    expect(CollectionValidator.tier).toBe(ValidationTier.IMMEDIATE);
    expect(CollectionValidator.priority).toBe(7);
  });

  it('should detect an invalid list initializer from parser literal semantics', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'InvalidListInitializer.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      CollectionValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: ErrorCodes.INVALID_LIST_INITIALIZER,
        message:
          'Invalid initializer type String found for List<String>: expected an Integer or a List of type String',
        location: {
          identifierRange: {
            startLine: 5,
            startColumn: 29,
            endLine: 5,
            endColumn: 53,
          },
          symbolRange: {
            startLine: 5,
            startColumn: 29,
            endLine: 5,
            endColumn: 53,
          },
        },
      }),
    ]);
    expect(result.warnings).toHaveLength(0);
  });

  it.each([
    {
      fixture: 'InvalidListCopyInitializer.cls',
      code: ErrorCodes.INVALID_LIST_INITIALIZER,
      message:
        'Invalid initializer type List<Integer> found for List<String>: expected an Integer or a List of type String',
      startColumn: 30,
      endColumn: 68,
    },
    {
      fixture: 'InvalidSetListInitializer.cls',
      code: ErrorCodes.INVALID_SET_INITIALIZER,
      message:
        'Invalid initializer type List<Integer> found for Set<String>: expected a List or a Set of type: String',
      startColumn: 29,
      endColumn: 65,
    },
    {
      fixture: 'InvalidSetCopyInitializer.cls',
      code: ErrorCodes.INVALID_SET_INITIALIZER,
      message:
        'Invalid initializer type Set<Integer> found for Set<String>: expected a List or a Set of type: String',
      startColumn: 29,
      endColumn: 64,
    },
    {
      fixture: 'InvalidMapInitializer.cls',
      code: ErrorCodes.INVALID_MAP_INITIALIZER,
      message:
        'Invalid initializer type Integer found for Map<String,Integer>: expected a Map ' +
        'with the same key and value types, or a valid SObject List',
      startColumn: 38,
      endColumn: 66,
    },
  ])(
    'should report $code for curated constructor fixture $fixture',
    async ({
      fixture,
      code,
      message,
      startColumn,
      endColumn,
    }: {
      fixture: string;
      code: string;
      message: string;
      startColumn: number;
      endColumn: number;
    }) => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        fixture,
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        CollectionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual([
        expect.objectContaining({
          code,
          message,
          location: {
            identifierRange: {
              startLine: 3,
              startColumn,
              endLine: 3,
              endColumn,
            },
            symbolRange: {
              startLine: 3,
              startColumn,
              endLine: 3,
              endColumn,
            },
          },
        }),
      ]);
      expect(result.warnings).toHaveLength(0);
    },
  );

  it('should detect invalid list index type', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'InvalidListIndex.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      CollectionValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: ErrorCodes.INVALID_LIST_INDEX_TYPE,
        message: 'List index must be of type Integer: String',
      }),
    ]);
    expect(result.warnings).toHaveLength(0);
  });

  it('should pass validation for valid collection constructors', async () => {
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'ValidCollections.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.IMMEDIATE,
        allowArtifactLoading: false,
      },
    );

    const result = await runValidator(
      CollectionValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  describe('TIER 2: List index type validation', () => {
    it('should validate list index expressions with correct types', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'ListIndexWithValidTypes.cls',
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
        CollectionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect list index expressions with invalid types', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'ListIndexWithInvalidTypes.cls',
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
        CollectionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual([
        expect.objectContaining({
          code: ErrorCodes.INVALID_LIST_INDEX_TYPE,
          message: 'List index must be of type Integer: String',
        }),
        expect.objectContaining({
          code: ErrorCodes.INVALID_LIST_INDEX_TYPE,
          message: 'List index must be of type Integer: Boolean',
        }),
        expect.objectContaining({
          code: ErrorCodes.INVALID_LIST_INDEX_TYPE,
          message: 'List index must be of type Integer: Double',
        }),
      ]);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('Map putAll validation', () => {
    it('should detect invalid Map putAll with incompatible types', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'InvalidMapPutAll.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        CollectionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual([
        expect.objectContaining({
          code: ErrorCodes.INVALID_MAP_PUTALL,
          message:
            'Invalid putAll type Map<String, String> found for Map<String, Integer>',
        }),
      ]);
      expect(result.warnings).toHaveLength(0);
    });

    it('compares nested Map value types from structured TypeInfo', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'InvalidNestedMapPutAll.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        CollectionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.errors).toEqual([
        expect.objectContaining({
          code: ErrorCodes.INVALID_MAP_PUTALL,
          message:
            'Invalid putAll type Map<String, List<String>> found for Map<String, List<Integer>>',
        }),
      ]);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('sort validation', () => {
    it('compares Comparator element types from structured TypeInfo', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'InvalidSortComparator.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        CollectionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.errors).toEqual([
        expect.objectContaining({
          code: ErrorCodes.ILLEGAL_COMPARATOR_FOR_SORT,
          message:
            'Incompatible Comparator argument type: Comparator<Integer>, for collection: String',
        }),
      ]);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('SObject List validation', () => {
    it('should detect invalid SObject List creation', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'InvalidSObjectList.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        CollectionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual([
        expect.objectContaining({
          code: ErrorCodes.INVALID_SOBJECT_LIST,
          message: 'Only concrete SObject lists can be created',
        }),
      ]);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('SObject Map validation', () => {
    it('should detect invalid SObject Map creation', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'InvalidSObjectMap.cls',
        undefined,
        symbolManager,
        compilerService,
        {
          tier: ValidationTier.IMMEDIATE,
          allowArtifactLoading: false,
        },
      );

      const result = await runValidator(
        CollectionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual([
        expect.objectContaining({
          code: ErrorCodes.INVALID_SOBJECT_MAP,
          message: 'Only concrete SObject maps can be created',
        }),
      ]);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('Map initializer type validation', () => {
    it('should detect an invalid Map initializer key from lexical symbol types', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'InvalidMapInitializerKeyType.cls',
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
        CollectionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual([
        expect.objectContaining({
          code: ErrorCodes.INVALID_INITIAL_KEY_TYPE,
          message: 'Invalid key type Integer for Map<String, Integer>',
        }),
      ]);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect an invalid Map initializer value from lexical symbol types', async () => {
      const { symbolTable, options } = await compileFixtureWithOptions(
        VALIDATOR_CATEGORY,
        'InvalidMapInitializerValueType.cls',
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
        CollectionValidator.validate(symbolTable, options),
        symbolManager,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual([
        expect.objectContaining({
          code: ErrorCodes.INVALID_INITIAL_VALUE_TYPE,
          message: 'Invalid value type String for Map<String, Integer>',
        }),
      ]);
      expect(result.warnings).toHaveLength(0);
    });
  });
});
