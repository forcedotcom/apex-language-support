/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Worker-side service bootstrap (Step 11).
 *
 * Initializes processing-service singletons inside a worker thread so
 * that dispatch handlers can delegate to real business logic. Each
 * worker role gets exactly the services it needs — nothing more.
 *
 * Called from worker.platform.ts during WorkerInit handling.
 */

import { getLogger, ApexSettingsManager } from '@salesforce/apex-lsp-shared';
import {
  type ISymbolManager,
  ApexSymbolProcessingManager,
  ResourceLoaderService,
} from '@salesforce/apex-lsp-parser-ast';
import { Effect, Layer } from 'effect';
import { ApexStorageManager } from '../storage/ApexStorageManager';
import { ApexStorage } from '../storage/ApexStorage';
import {
  ServiceFactory,
  type ServiceDependencies,
} from '../factories/ServiceFactory';
import type { DocumentProcessingService } from '../services/DocumentProcessingService';
import type { DocumentCloseProcessingService } from '../services/DocumentCloseProcessingService';
import type { HoverProcessingService } from '../services/HoverProcessingService';
import type { DefinitionProcessingService } from '../services/DefinitionProcessingService';
import type { ReferencesProcessingService } from '../services/ReferencesProcessingService';
import type { ImplementationProcessingService } from '../services/ImplementationProcessingService';
import type { DocumentSymbolProcessingService } from '../services/DocumentSymbolProcessingService';
import type { CodeLensProcessingService } from '../services/CodeLensProcessingService';
import type { DiagnosticProcessingService } from '../services/DiagnosticProcessingService';

// ---------------------------------------------------------------------------
// Data-owner services
// ---------------------------------------------------------------------------

export interface DataOwnerServices {
  readonly symbolManager: ISymbolManager;
  readonly storageManager: ApexStorageManager;
  readonly documentProcessingService: DocumentProcessingService;
  readonly documentCloseProcessingService: DocumentCloseProcessingService;
  readonly factory: ServiceFactory;
}

const bootstrapSharedDeps = Effect.gen(function* () {
  const logger = getLogger();

  const storageManager = yield* Effect.sync(() =>
    ApexStorageManager.getInstance({
      storageFactory: () => ApexStorage.getInstance(),
    }),
  );
  yield* Effect.promise(() => storageManager.initialize());

  // ResourceLoaderService is a required bootstrap dependency.
  // Workers provide ResourceLoaderLive (local), ResourceLoaderRemoteLive (IPC),
  // or ResourceLoaderNoOpLive (tests) via Effect.provide() at the call site.
  const stdlibProvider = yield* ResourceLoaderService;

  const spm = yield* Effect.sync(() =>
    ApexSymbolProcessingManager.getInstance(stdlibProvider),
  );
  yield* Effect.promise(() => spm.initialize());
  const symbolManager = spm.getSymbolManager();

  const deps: ServiceDependencies = {
    logger,
    symbolManager,
    storageManager,
    settingsManager: ApexSettingsManager.getInstance(),
  };
  const factory = new ServiceFactory(deps);

  return { logger, symbolManager, storageManager, factory };
});

/**
 * Bootstrap services for the data-owner worker role as an Effect.
 * Requires ResourceLoaderService to be provided by the caller.
 */
export const bootstrapDataOwnerServicesEffect: Effect.Effect<
  DataOwnerServices,
  never,
  ResourceLoaderService
> = Effect.gen(function* () {
  const { logger, symbolManager, storageManager, factory } =
    yield* bootstrapSharedDeps;

  const { DocumentCloseProcessingService: DocClose } = yield* Effect.promise(
    () => import('../services/DocumentCloseProcessingService'),
  );

  return {
    symbolManager,
    storageManager,
    documentProcessingService: factory.createDocumentProcessingService(),
    documentCloseProcessingService: new DocClose(logger),
    factory,
  };
});

/**
 * Promise-based bootstrap for data-owner workers.
 * Caller must supply the appropriate ResourceLoaderService layer.
 */
export function bootstrapDataOwnerServices(
  resourceLoaderLayer: Layer.Layer<ResourceLoaderService>,
): Promise<DataOwnerServices> {
  return Effect.runPromise(
    Effect.provide(bootstrapDataOwnerServicesEffect, resourceLoaderLayer),
  );
}

// ---------------------------------------------------------------------------
// Enrichment/search services
// ---------------------------------------------------------------------------

export interface EnrichmentServices {
  readonly symbolManager: ISymbolManager;
  readonly storageManager: ApexStorageManager;
  readonly hoverService: HoverProcessingService;
  readonly definitionService: DefinitionProcessingService;
  readonly referencesService: ReferencesProcessingService;
  readonly implementationService: ImplementationProcessingService;
  readonly documentSymbolService: DocumentSymbolProcessingService;
  readonly codeLensService: CodeLensProcessingService;
  readonly diagnosticService: DiagnosticProcessingService;
  readonly factory: ServiceFactory;
}

/**
 * Bootstrap services for enrichment/search pool workers as an Effect.
 * Requires ResourceLoaderService to be provided by the caller.
 */
export const bootstrapEnrichmentServicesEffect: Effect.Effect<
  EnrichmentServices,
  never,
  ResourceLoaderService
> = Effect.gen(function* () {
  const { symbolManager, storageManager, factory } = yield* bootstrapSharedDeps;

  return {
    symbolManager,
    storageManager,
    hoverService: factory.createHoverService(),
    definitionService: factory.createDefinitionService(),
    referencesService: factory.createReferencesService(),
    implementationService: factory.createImplementationService(),
    documentSymbolService: factory.createDocumentSymbolService(),
    codeLensService: factory.createCodeLensService(),
    diagnosticService: factory.createDiagnosticService(),
    factory,
  };
});

/**
 * Promise-based bootstrap for enrichment/search pool workers.
 * Caller must supply the appropriate ResourceLoaderService layer.
 */
export function bootstrapEnrichmentServices(
  resourceLoaderLayer: Layer.Layer<ResourceLoaderService>,
): Promise<EnrichmentServices> {
  return Effect.runPromise(
    Effect.provide(bootstrapEnrichmentServicesEffect, resourceLoaderLayer),
  );
}
