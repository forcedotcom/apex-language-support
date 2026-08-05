/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CollectionValidator } from '../../../../src/semantics/validation/validators';
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
    expect(result.errors.length).toBeGreaterThan(0);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.INVALID_LIST_INITIALIZER,
    );
    expect(hasError).toBe(true);
  });

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
    expect(result.errors.length).toBeGreaterThan(0);
    const hasError = result.errors.some(
      (e: any) => e.code === ErrorCodes.INVALID_LIST_INDEX_TYPE,
    );
    expect(hasError).toBe(true);
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
      const hasIndexTypeError = result.errors.some(
        (e: any) => e.code === ErrorCodes.INVALID_LIST_INDEX_TYPE,
      );
      expect(hasIndexTypeError).toBe(true);
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
      const hasError = result.errors.some(
        (e: any) => e.code === ErrorCodes.INVALID_MAP_PUTALL,
      );
      expect(hasError).toBe(true);
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

      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: ErrorCodes.INVALID_MAP_PUTALL }),
        ]),
      );
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

      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: ErrorCodes.ILLEGAL_COMPARATOR_FOR_SORT,
          }),
        ]),
      );
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
      const hasError = result.errors.some(
        (e: any) => e.code === ErrorCodes.INVALID_SOBJECT_LIST,
      );
      expect(hasError).toBe(true);
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
      const hasError = result.errors.some(
        (e: any) => e.code === ErrorCodes.INVALID_SOBJECT_MAP,
      );
      expect(hasError).toBe(true);
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
      const hasError = result.errors.some(
        (e: any) => e.code === ErrorCodes.INVALID_INITIAL_KEY_TYPE,
      );
      expect(hasError).toBe(true);
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
      const hasError = result.errors.some(
        (e: any) => e.code === ErrorCodes.INVALID_INITIAL_VALUE_TYPE,
      );
      expect(hasError).toBe(true);
    });
  });
});
