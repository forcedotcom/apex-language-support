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

import {
  getLogger,
  type LoggerInterface,
  ApexSettingsManager,
} from '@salesforce/apex-lsp-shared';
import {
  type ISymbolManager,
  ApexSymbolProcessingManager,
} from '@salesforce/apex-lsp-parser-ast';
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
  symbolManager: ISymbolManager;
  storageManager: ApexStorageManager;
  documentProcessingService: DocumentProcessingService;
  documentCloseProcessingService: DocumentCloseProcessingService;
  factory: ServiceFactory;
}

/**
 * Bootstrap services for the data-owner worker role.
 *
 * Initializes ApexStorageManager, ISymbolManager, and document
 * processing services. The data-owner holds authoritative state
 * for the workspace — all document mutations flow through here.
 */
export async function bootstrapDataOwnerServices(): Promise<DataOwnerServices> {
  const logger: LoggerInterface = getLogger();

  const storageManager = ApexStorageManager.getInstance({
    storageFactory: () => ApexStorage.getInstance(),
  });
  await storageManager.initialize();

  const spm = ApexSymbolProcessingManager.getInstance();
  await spm.initialize();
  const symbolManager = spm.getSymbolManager();

  const deps: ServiceDependencies = {
    logger,
    symbolManager,
    storageManager,
    settingsManager: ApexSettingsManager.getInstance(),
  };
  const factory = new ServiceFactory(deps);

  const { DocumentCloseProcessingService: DocClose } =
    await import('../services/DocumentCloseProcessingService');

  return {
    symbolManager,
    storageManager,
    documentProcessingService: factory.createDocumentProcessingService(),
    documentCloseProcessingService: new DocClose(logger),
    factory,
  };
}

// ---------------------------------------------------------------------------
// Enrichment/search services
// ---------------------------------------------------------------------------

export interface EnrichmentServices {
  symbolManager: ISymbolManager;
  hoverService: HoverProcessingService;
  definitionService: DefinitionProcessingService;
  referencesService: ReferencesProcessingService;
  implementationService: ImplementationProcessingService;
  documentSymbolService: DocumentSymbolProcessingService;
  codeLensService: CodeLensProcessingService;
  diagnosticService: DiagnosticProcessingService;
  factory: ServiceFactory;
}

/**
 * Bootstrap services for enrichment/search pool workers.
 *
 * Creates a local ISymbolManager and processing services.
 * Symbol data is populated via QuerySymbolSubset from the data-owner
 * or through local document processing.
 */
export async function bootstrapEnrichmentServices(): Promise<EnrichmentServices> {
  const logger: LoggerInterface = getLogger();

  const storageManager = ApexStorageManager.getInstance({
    storageFactory: () => ApexStorage.getInstance(),
  });
  await storageManager.initialize();

  const spm = ApexSymbolProcessingManager.getInstance();
  await spm.initialize();
  const symbolManager = spm.getSymbolManager();

  const deps: ServiceDependencies = {
    logger,
    symbolManager,
    storageManager,
    settingsManager: ApexSettingsManager.getInstance(),
  };
  const factory = new ServiceFactory(deps);

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
}
