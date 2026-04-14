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
} from '@salesforce/apex-lsp-parser-ast';
import { Effect } from 'effect';
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

  const spm = yield* Effect.sync(() =>
    ApexSymbolProcessingManager.getInstance(),
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
 */
export const bootstrapDataOwnerServicesEffect: Effect.Effect<DataOwnerServices> =
  Effect.gen(function* () {
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
 * Promise-based wrapper for backward compatibility.
 */
export function bootstrapDataOwnerServices(): Promise<DataOwnerServices> {
  return Effect.runPromise(bootstrapDataOwnerServicesEffect);
}

// ---------------------------------------------------------------------------
// Enrichment/search services
// ---------------------------------------------------------------------------

export interface EnrichmentServices {
  readonly symbolManager: ISymbolManager;
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
 */
export const bootstrapEnrichmentServicesEffect: Effect.Effect<EnrichmentServices> =
  Effect.gen(function* () {
    const { symbolManager, factory } = yield* bootstrapSharedDeps;

    return {
      symbolManager,
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
 * Promise-based wrapper for backward compatibility.
 */
export function bootstrapEnrichmentServices(): Promise<EnrichmentServices> {
  return Effect.runPromise(bootstrapEnrichmentServicesEffect);
}
