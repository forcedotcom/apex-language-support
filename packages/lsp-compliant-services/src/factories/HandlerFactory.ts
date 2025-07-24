/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger, LoggerInterface } from '@salesforce/apex-lsp-shared';

import {
  DidChangeDocumentHandler,
  IDocumentProcessor,
} from '../handlers/DidChangeDocumentHandler';
import { DocumentProcessingService } from '../services/DocumentProcessingService';
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
    const documentProcessor = new DocumentProcessingService(logger);

    return new DidChangeDocumentHandler(logger, documentProcessor);
  }

  /**
   * Create a DidChangeDocumentHandler with custom dependencies (for testing)
   * @param logger Custom logger implementation
   * @param documentProcessor Custom document processor implementation
   * @returns A configured DidChangeDocumentHandler instance
   */
  static createDidChangeDocumentHandlerWithDependencies(
    logger: LoggerInterface,
    documentProcessor: IDocumentProcessor,
  ): DidChangeDocumentHandler {
    return new DidChangeDocumentHandler(logger, documentProcessor);
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
}
