/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import {
  ValidatorRegistryLive,
  registerValidator,
  runValidatorsForTier,
} from '../../../src/semantics/validation/ValidatorRegistry';
import { EffectTestLoggerLive } from '../../../src/utils/EffectLspLoggerLayer';
import { AbstractMethodBodyValidator } from '../../../src/semantics/validation/validators';
import { ValidationTier } from '../../../src/semantics/validation/ValidationTier';
import { ApexSymbolManager } from '../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../src/parser/compilerService';
import { SymbolTable } from '../../../src/types/symbol';
import { createApexLibUri } from '../../../src/types/ProtocolHandler';
import {
  compileFixture,
  createValidationOptions,
} from './validators/helpers/validation-test-helpers';

describe('ValidatorRegistry', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  /**
   * Register a test validator before each test
   */
  beforeEach(async () => {
    await Effect.runPromise(
      registerValidator(AbstractMethodBodyValidator).pipe(
        Effect.provide(ValidatorRegistryLive),
      ),
    );
  });

  describe('short-circuit for standard library files', () => {
    it('should skip validation for standard library files with apexlib:// URIs', async () => {
      // Create a symbol table with a standard library URI
      const standardLibraryUri = createApexLibUri(
        'resources/StandardApexLibrary/System/String.cls',
      );
      const symbolTable = new SymbolTable();
      symbolTable.setFileUri(standardLibraryUri);

      // Run validators - should return empty array (short-circuited)
      const results = await Effect.runPromise(
        runValidatorsForTier(
          ValidationTier.IMMEDIATE,
          symbolTable,
          createValidationOptions(symbolManager, {
            tier: ValidationTier.IMMEDIATE,
          }),
        ).pipe(
          Effect.provide(ValidatorRegistryLive),
          Effect.provide(EffectTestLoggerLive),
        ),
      );

      // Should return empty array because validation was skipped
      expect(results).toHaveLength(0);
    });

    it('should skip validation for built-in classes merged into StandardApexLibrary', async () => {
      // Built-in classes like String, Integer, List are merged into StandardApexLibrary/System/
      // and get apexlib:// URIs when parsed
      const builtinMergedUri = createApexLibUri(
        'resources/StandardApexLibrary/System/Integer.cls',
      );
      const symbolTable = new SymbolTable();
      symbolTable.setFileUri(builtinMergedUri);

      // Run validators - should return empty array (short-circuited)
      const results = await Effect.runPromise(
        runValidatorsForTier(
          ValidationTier.IMMEDIATE,
          symbolTable,
          createValidationOptions(symbolManager, {
            tier: ValidationTier.IMMEDIATE,
          }),
        ).pipe(
          Effect.provide(ValidatorRegistryLive),
          Effect.provide(EffectTestLoggerLive),
        ),
      );

      // Should return empty array because validation was skipped
      expect(results).toHaveLength(0);
    });

    it('should still validate user code files with file:// URIs', async () => {
      // Create a symbol table with a user code URI
      const userCodeUri = 'file:///test/UserClass.cls';
      const symbolTable = await compileFixture(
        'integration',
        'ValidClass.cls',
        userCodeUri,
        symbolManager,
        compilerService,
      );

      // Run validators - should run normally (not short-circuited)
      const results = await Effect.runPromise(
        runValidatorsForTier(
          ValidationTier.IMMEDIATE,
          symbolTable,
          createValidationOptions(symbolManager, {
            tier: ValidationTier.IMMEDIATE,
          }),
        ).pipe(
          Effect.provide(ValidatorRegistryLive),
          Effect.provide(EffectTestLoggerLive),
        ),
      );

      // Should have results from validators (at least AbstractMethodBodyValidator)
      expect(results.length).toBeGreaterThan(0);
    });

    it('should skip validation for all standard library namespaces', async () => {
      // Test other standard library namespaces (not just System)
      const databaseUri = createApexLibUri(
        'resources/StandardApexLibrary/Database/QueryLocator.cls',
      );
      const symbolTable = new SymbolTable();
      symbolTable.setFileUri(databaseUri);

      // Run validators - should return empty array (short-circuited)
      const results = await Effect.runPromise(
        runValidatorsForTier(
          ValidationTier.IMMEDIATE,
          symbolTable,
          createValidationOptions(symbolManager, {
            tier: ValidationTier.IMMEDIATE,
          }),
        ).pipe(
          Effect.provide(ValidatorRegistryLive),
          Effect.provide(EffectTestLoggerLive),
        ),
      );

      // Should return empty array because validation was skipped
      expect(results).toHaveLength(0);
    });
  });
});
