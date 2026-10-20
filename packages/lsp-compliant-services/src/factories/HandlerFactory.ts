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
import { DidOpenDocumentHandler } from '../handlers/DidOpenDocumentHandler';
import { DocumentProcessingService } from '../services/DocumentProcessingService';
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
}
