/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  getLogger,
  LoggerInterface,
  ApexCapabilitiesManager,
} from '@salesforce/apex-lsp-shared';

import { DidChangeDocumentHandler } from '../handlers/DidChangeDocumentHandler';
import {
  IDocumentChangeProcessor,
  DocumentChangeProcessingService,
} from '../services/DocumentChangeProcessingService';
import { DocumentSymbolHandler } from '../handlers/DocumentSymbolHandler';
import {
  DocumentSymbolProcessingService,
  IDocumentSymbolProcessor,
} from '../services/DocumentSymbolProcessingService';
import { DidSaveDocumentHandler } from '../handlers/DidSaveDocumentHandler';
import {
  DocumentSaveProcessingService,
  IDocumentSaveProcessor,
} from '../services/DocumentSaveProcessingService';
import { DidCloseDocumentHandler } from '../handlers/DidCloseDocumentHandler';
import {
  DocumentCloseProcessingService,
  IDocumentCloseProcessor,
} from '../services/DocumentCloseProcessingService';
import { DidDeleteDocumentHandler } from '../handlers/DidDeleteDocumentHandler';
import {
  DocumentDeleteProcessingService,
  IDocumentDeleteProcessor,
} from '../services/DocumentDeleteProcessingService';
import { HoverHandler } from '../handlers/HoverHandler';
import {
  HoverProcessingService,
  IHoverProcessor,
} from '../services/HoverProcessingService';
import { DefinitionHandler } from '../handlers/DefinitionHandler';
import {
  DefinitionProcessingService,
  IDefinitionProcessor,
} from '../services/DefinitionProcessingService';
import { ImplementationHandler } from '../handlers/ImplementationHandler';
import {
  ImplementationProcessingService,
  IImplementationProcessor,
} from '../services/ImplementationProcessingService';
import { ReferencesHandler } from '../handlers/ReferencesHandler';
import {
  ReferencesProcessingService,
  IReferencesProcessor,
} from '../services/ReferencesProcessingService';
import { DidOpenDocumentHandler } from '../handlers/DidOpenDocumentHandler';
import { DocumentProcessingService } from '../services/DocumentProcessingService';
import { CodeLensHandler } from '../handlers/CodeLensHandler';
import {
  CodeLensProcessingService,
  ICodeLensProcessor,
} from '../services/CodeLensProcessingService';
import { QueueStateHandler } from '../handlers/QueueStateHandler';
import {
  QueueStateProcessingService,
  IQueueStateProcessor,
} from '../services/QueueStateProcessingService';
import { GraphDataHandler } from '../handlers/GraphDataHandler';
import {
  GraphDataProcessingService,
  IGraphDataProcessor,
} from '../services/GraphDataProcessingService';
import { ExecuteCommandHandler } from '../handlers/ExecuteCommandHandler';
import {
  ExecuteCommandProcessingService,
  IExecuteCommandProcessor,
} from '../services/ExecuteCommandProcessingService';
import { LayerEnrichmentService } from '../services/LayerEnrichmentService';
import { ApexSymbolProcessingManager } from '@salesforce/apex-lsp-parser-ast';

/**
 * Factory for creating handlers with proper dependency injection
 */
export class HandlerFactory {
  /**
   * Create a DidChangeDocumentHandler with default dependencies
   * @returns A configured DidChangeDocumentHandler instance
   */
  static createDidChangeDocumentHandler(): DidChangeDocumentHandler {
    const logger = getLogger();
    const documentChangeProcessor = new DocumentChangeProcessingService(logger);

    return new DidChangeDocumentHandler(logger, documentChangeProcessor);
  }

  /**
   * Create a DidOpenDocumentHandler with default dependencies
   * @returns A configured DidOpenDocumentHandler instance
   */
  static createDidOpenDocumentHandler(): DidOpenDocumentHandler {
    const logger = getLogger();
    const documentProcessingService = new DocumentProcessingService(logger);
    return new DidOpenDocumentHandler(logger, documentProcessingService);
  }

  /**
   * Create a DidChangeDocumentHandler with custom dependencies (for testing)
   * @param logger Custom logger implementation
   * @param documentChangeProcessor Custom document change processor implementation
   * @returns A configured DidChangeDocumentHandler instance
   */
  static createDidChangeDocumentHandlerWithDependencies(
    logger: LoggerInterface,
    documentChangeProcessor: IDocumentChangeProcessor,
  ): DidChangeDocumentHandler {
    return new DidChangeDocumentHandler(logger, documentChangeProcessor);
  }

  /**
   * Create a DocumentSymbolHandler with default dependencies
   * @returns A configured DocumentSymbolHandler instance
   */
  static createDocumentSymbolHandler(): DocumentSymbolHandler {
    const logger = getLogger();
    const documentSymbolProcessor = new DocumentSymbolProcessingService(logger);

    return new DocumentSymbolHandler(logger, documentSymbolProcessor);
  }

  /**
   * Create a DocumentSymbolHandler with custom dependencies (for testing)
   * @param logger Custom logger implementation
   * @param documentSymbolProcessor Custom document symbol processor implementation
   * @returns A configured DocumentSymbolHandler instance
   */
  static createDocumentSymbolHandlerWithDependencies(
    logger: LoggerInterface,
    documentSymbolProcessor: IDocumentSymbolProcessor,
  ): DocumentSymbolHandler {
    return new DocumentSymbolHandler(logger, documentSymbolProcessor);
  }

  /**
   * Create a DidSaveDocumentHandler with default dependencies
   * @returns A configured DidSaveDocumentHandler instance
   */
  static createDidSaveDocumentHandler(): DidSaveDocumentHandler {
    const logger = getLogger();
    const documentSaveProcessor = new DocumentSaveProcessingService(logger);

    return new DidSaveDocumentHandler(logger, documentSaveProcessor);
  }

  /**
   * Create a DidSaveDocumentHandler with custom dependencies (for testing)
   * @param logger Custom logger implementation
   * @param documentSaveProcessor Custom document save processor implementation
   * @returns A configured DidSaveDocumentHandler instance
   */
  static createDidSaveDocumentHandlerWithDependencies(
    logger: LoggerInterface,
    documentSaveProcessor: IDocumentSaveProcessor,
  ): DidSaveDocumentHandler {
    return new DidSaveDocumentHandler(logger, documentSaveProcessor);
  }

  /**
   * Create a DidCloseDocumentHandler with default dependencies
   * @returns A configured DidCloseDocumentHandler instance
   */
  static createDidCloseDocumentHandler(): DidCloseDocumentHandler {
    const logger = getLogger();
    const documentCloseProcessor = new DocumentCloseProcessingService(logger);

    return new DidCloseDocumentHandler(logger, documentCloseProcessor);
  }

  /**
   * Create a DidCloseDocumentHandler with custom dependencies (for testing)
   * @param logger Custom logger implementation
   * @param documentCloseProcessor Custom document close processor implementation
   * @returns A configured DidCloseDocumentHandler instance
   */
  static createDidCloseDocumentHandlerWithDependencies(
    logger: LoggerInterface,
    documentCloseProcessor: IDocumentCloseProcessor,
  ): DidCloseDocumentHandler {
    return new DidCloseDocumentHandler(logger, documentCloseProcessor);
  }

  /**
   * Create a DidDeleteDocumentHandler with default dependencies
   * @returns A configured DidDeleteDocumentHandler instance
   */
  static createDidDeleteDocumentHandler(): DidDeleteDocumentHandler {
    const logger = getLogger();
    const documentDeleteProcessor = new DocumentDeleteProcessingService(logger);

    return new DidDeleteDocumentHandler(logger, documentDeleteProcessor);
  }

  /**
   * Create a DidDeleteDocumentHandler with custom dependencies (for testing)
   * @param logger Custom logger implementation
   * @param documentDeleteProcessor Custom document delete processor implementation
   * @returns A configured DidDeleteDocumentHandler instance
   */
  static createDidDeleteDocumentHandlerWithDependencies(
    logger: LoggerInterface,
    documentDeleteProcessor: IDocumentDeleteProcessor,
  ): DidDeleteDocumentHandler {
    return new DidDeleteDocumentHandler(logger, documentDeleteProcessor);
  }

  /**
   * Create a HoverHandler with default dependencies
   * @returns A configured HoverHandler instance
   */
  static createHoverHandler(): HoverHandler {
    const logger = getLogger();
    const symbolManager =
      ApexSymbolProcessingManager.getInstance().getSymbolManager();
    const hoverProcessor = new HoverProcessingService(logger, symbolManager);

    // Inject LayerEnrichmentService for on-demand SymbolTable enrichment
    const layerEnrichmentService = new LayerEnrichmentService(
      logger,
      symbolManager,
    );
    hoverProcessor.setLayerEnrichmentService(layerEnrichmentService);

    return new HoverHandler(logger, hoverProcessor);
  }

  /**
   * Create a HoverHandler with custom dependencies (for testing)
   * @param logger Custom logger implementation
   * @param hoverProcessor Custom hover processor implementation
   * @returns A configured HoverHandler instance
   */
  static createHoverHandlerWithDependencies(
    logger: LoggerInterface,
    hoverProcessor: IHoverProcessor,
  ): HoverHandler {
    return new HoverHandler(logger, hoverProcessor);
  }

  /**
   * Create a DefinitionHandler with default dependencies
   * @returns A configured DefinitionHandler instance
   */
  static createDefinitionHandler(): DefinitionHandler {
    const logger = getLogger();
    const definitionProcessor = new DefinitionProcessingService(logger);

    return new DefinitionHandler(logger, definitionProcessor);
  }

  /**
   * Create a DefinitionHandler with custom dependencies (for testing)
   * @param logger Custom logger implementation
   * @param definitionProcessor Custom definition processor implementation
   * @returns A configured DefinitionHandler instance
   */
  static createDefinitionHandlerWithDependencies(
    logger: LoggerInterface,
    definitionProcessor: IDefinitionProcessor,
  ): DefinitionHandler {
    return new DefinitionHandler(logger, definitionProcessor);
  }

  /**
   * Create an ImplementationHandler with default dependencies
   * @returns A configured ImplementationHandler instance
   */
  static createImplementationHandler(): ImplementationHandler {
    const logger = getLogger();
    const implementationProcessor = new ImplementationProcessingService(logger);

    return new ImplementationHandler(logger, implementationProcessor);
  }

  /**
   * Create an ImplementationHandler with custom dependencies (for testing)
   * @param logger Custom logger implementation
   * @param implementationProcessor Custom implementation processor implementation
   * @returns A configured ImplementationHandler instance
   */
  static createImplementationHandlerWithDependencies(
    logger: LoggerInterface,
    implementationProcessor: IImplementationProcessor,
  ): ImplementationHandler {
    return new ImplementationHandler(logger, implementationProcessor);
  }

  /**
   * Create a ReferencesHandler with default dependencies
   * @returns A configured ReferencesHandler instance
   */
  static createReferencesHandler(): ReferencesHandler {
    const logger = getLogger();
    const referencesProcessor = new ReferencesProcessingService(logger);

    return new ReferencesHandler(logger, referencesProcessor);
  }

  /**
   * Create a ReferencesHandler with custom dependencies (for testing)
   * @param logger Custom logger implementation
   * @param referencesProcessor Custom references processor implementation
   * @returns A configured ReferencesHandler instance
   */
  static createReferencesHandlerWithDependencies(
    logger: LoggerInterface,
    referencesProcessor: IReferencesProcessor,
  ): ReferencesHandler {
    return new ReferencesHandler(logger, referencesProcessor);
  }

  /**
   * Create a CodeLensHandler with default dependencies
   * @returns A configured CodeLensHandler instance
   */
  static createCodeLensHandler(): CodeLensHandler {
    const logger = getLogger();
    const codeLensProcessor = new CodeLensProcessingService(logger);

    return new CodeLensHandler(logger, codeLensProcessor);
  }

  /**
   * Create a CodeLensHandler with custom dependencies (for testing)
   * @param logger Custom logger implementation
   * @param codeLensProcessor Custom code lens processor implementation
   * @returns A configured CodeLensHandler instance
   */
  static createCodeLensHandlerWithDependencies(
    logger: LoggerInterface,
    codeLensProcessor: ICodeLensProcessor,
  ): CodeLensHandler {
    return new CodeLensHandler(logger, codeLensProcessor);
  }

  /**
   * Create a QueueStateHandler with default dependencies
   * @returns A configured QueueStateHandler instance
   */
  static createQueueStateHandler(): QueueStateHandler {
    const logger = getLogger();
    const capabilitiesManager = ApexCapabilitiesManager.getInstance();
    const queueStateProcessor = new QueueStateProcessingService(logger);

    return new QueueStateHandler(
      logger,
      queueStateProcessor,
      capabilitiesManager,
    );
  }

  /**
   * Create a QueueStateHandler with custom dependencies (for testing)
   * @param logger Custom logger implementation
   * @param queueStateProcessor Custom queue state processor implementation
   * @param capabilitiesManager Custom capabilities manager implementation
   * @returns A configured QueueStateHandler instance
   */
  static createQueueStateHandlerWithDependencies(
    logger: LoggerInterface,
    queueStateProcessor: IQueueStateProcessor,
    capabilitiesManager: ApexCapabilitiesManager,
  ): QueueStateHandler {
    return new QueueStateHandler(
      logger,
      queueStateProcessor,
      capabilitiesManager,
    );
  }

  /**
   * Create a GraphDataHandler with default dependencies
   * @returns A configured GraphDataHandler instance
   */
  static createGraphDataHandler(): GraphDataHandler {
    const logger = getLogger();
    const capabilitiesManager = ApexCapabilitiesManager.getInstance();
    const graphDataProcessor = new GraphDataProcessingService(logger);

    return new GraphDataHandler(
      logger,
      graphDataProcessor,
      capabilitiesManager,
    );
  }

  /**
   * Create a GraphDataHandler with custom dependencies (for testing)
   * @param logger Custom logger implementation
   * @param graphDataProcessor Custom graph data processor implementation
   * @param capabilitiesManager Custom capabilities manager implementation
   * @returns A configured GraphDataHandler instance
   */
  static createGraphDataHandlerWithDependencies(
    logger: LoggerInterface,
    graphDataProcessor: IGraphDataProcessor,
    capabilitiesManager: ApexCapabilitiesManager,
  ): GraphDataHandler {
    return new GraphDataHandler(
      logger,
      graphDataProcessor,
      capabilitiesManager,
    );
  }

  /**
   * Create an ExecuteCommandHandler with default dependencies
   * @returns A configured ExecuteCommandHandler instance
   */
  static createExecuteCommandHandler(): ExecuteCommandHandler {
    const logger = getLogger();
    const executeCommandProcessor = new ExecuteCommandProcessingService(logger);

    return new ExecuteCommandHandler(logger, executeCommandProcessor);
  }

  /**
   * Create an ExecuteCommandHandler with custom dependencies (for testing)
   * @param logger Custom logger implementation
   * @param executeCommandProcessor Custom execute command processor implementation
   * @returns A configured ExecuteCommandHandler instance
   */
  static createExecuteCommandHandlerWithDependencies(
    logger: LoggerInterface,
    executeCommandProcessor: IExecuteCommandProcessor,
  ): ExecuteCommandHandler {
    return new ExecuteCommandHandler(logger, executeCommandProcessor);
  }
}
