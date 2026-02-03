/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect, Layer } from 'effect';
import * as fs from 'fs';
import * as path from 'path';
import { SymbolTable } from '../../../../../src/types/symbol';
import {
  ArtifactLoadingHelperLive,
  ISymbolManager,
} from '../../../../../src/semantics/validation/ArtifactLoadingHelper';
import { EffectTestLoggerLive } from '../../../../../src/utils/EffectLspLoggerLayer';
import { ApexSymbolManager } from '../../../../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../../../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../../../../src/parser/listeners/ApexSymbolCollectorListener';
import type { ValidationOptions } from '../../../../../src/semantics/validation/ValidationTier';
import { ValidationTier } from '../../../../../src/semantics/validation/ValidationTier';

/**
 * Helper to load a fixture file from a validator-specific subfolder
 */
export const loadFixture = (
  validatorCategory: string,
  filename: string,
): string => {
  const fixturePath = path.join(
    __dirname,
    '../../../../fixtures/validation',
    validatorCategory,
    filename,
  );
  return fs.readFileSync(fixturePath, 'utf8');
};

/**
 * Helper to compile a fixture file and return the SymbolTable
 * Also adds it to the symbol manager for cross-file resolution
 */
export const compileFixture = async (
  validatorCategory: string,
  filename: string,
  fileUri: string | undefined,
  symbolManager: ApexSymbolManager,
  compilerService: CompilerService,
): Promise<SymbolTable> => {
  const content = loadFixture(validatorCategory, filename);
  const uri = fileUri || `file:///test/${filename}`;
  const listener = new ApexSymbolCollectorListener(undefined, 'full');
  const result = compilerService.compile(content, uri, listener, {
    collectReferences: true,
    resolveReferences: true,
  });

  // Note: Some validators (like DuplicateSymbolValidator) check for errors that are
  // caught during compilation. In those cases, compilation errors are expected and
  // should be handled by the test, not thrown here.
  // For now, we allow compilation errors to pass through - tests can check for them
  // if needed. If a test requires clean compilation, it should check result.errors.length === 0

  if (!result.result) {
    throw new Error(`Failed to compile ${filename}`);
  }

  // Add to symbol manager for cross-file resolution
  await Effect.runPromise(
    symbolManager
      .addSymbolTable(result.result, uri)
      .pipe(Effect.provide(EffectTestLoggerLive)),
  );

  return result.result;
};

/**
 * Helper to create services layer with real implementations
 */
export const createServicesLayer = (
  symbolManager: ApexSymbolManager,
): Layer.Layer<
  typeof ISymbolManager | typeof ArtifactLoadingHelperLive,
  never,
  never
> =>
  Layer.mergeAll(
    Layer.succeed(ISymbolManager, symbolManager),
    ArtifactLoadingHelperLive,
    EffectTestLoggerLive,
  );

/**
 * Helper to run a validator Effect with all required services
 */
export const runValidator = async <T>(
  validatorEffect: Effect.Effect<T, any, any>,
  symbolManager: ApexSymbolManager,
): Promise<T> => {
  // Create base layer with ISymbolManager and Logger
  const baseLayer = Layer.mergeAll(
    Layer.succeed(ISymbolManager, symbolManager),
    EffectTestLoggerLive,
  );
  // Provide base layer to ArtifactLoadingHelperLive (which requires ISymbolManager)
  const artifactLayer = Layer.provide(ArtifactLoadingHelperLive, baseLayer);
  // Merge everything together
  const fullLayer = Layer.mergeAll(baseLayer, artifactLayer);
  return Effect.runPromise(
    Effect.provide(validatorEffect, fullLayer) as Effect.Effect<T, any, never>,
  );
};

/**
 * Helper to extract error/warning message (handles both string and object formats)
 */
export const getMessage = (
  errorOrWarning: string | { message: string },
): string =>
  typeof errorOrWarning === 'string' ? errorOrWarning : errorOrWarning.message;

/**
 * Create default validation options for tests
 */
export const createValidationOptions = (
  symbolManager: ApexSymbolManager,
  overrides?: Partial<ValidationOptions>,
): ValidationOptions => ({
  tier: ValidationTier.THOROUGH,
  allowArtifactLoading: true,
  maxDepth: 1,
  maxArtifacts: 5,
  timeout: 5000,
  symbolManager,
  ...overrides,
});
