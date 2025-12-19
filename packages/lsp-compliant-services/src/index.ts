/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  TextDocumentChangeEvent,
  DocumentSymbolParams,
  SymbolInformation,
  DocumentSymbol,
  HoverParams,
  Hover,
  DefinitionParams,
  ReferenceParams,
  Location,
  CodeLensParams,
  CodeLens,
  DeleteFilesParams,
  ExecuteCommandParams,
} from 'vscode-languageserver';
import type {
  FindMissingArtifactParams,
  FindMissingArtifactResult,
} from '@salesforce/apex-lsp-shared';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { ApexSettingsManager, getLogger } from '@salesforce/apex-lsp-shared';
import { HandlerFactory } from './factories/HandlerFactory';
import { dispatchProcessOnDiagnostic } from './handlers/DiagnosticHandler';
import { dispatchProcessOnFoldingRange } from './handlers/FoldingRangeHandler';
import { dispatchProcessOnResolve } from './handlers/ApexLibResolveHandler';
import { HoverHandler } from './handlers/HoverHandler';
import { ISymbolManager } from '@salesforce/apex-lsp-parser-ast';
import { LSPQueueManager, LSPQueueManagerDependencies } from './queue';
import { ServiceFactory } from './factories/ServiceFactory';
import { DEFAULT_SERVICE_CONFIG } from './config/ServiceConfiguration';
import { ApexStorageManager } from './storage/ApexStorageManager';
import { DocumentProcessingService } from './services/DocumentProcessingService';

// Export storage interfaces and classes
export * from './storage/ApexStorageBase';
export * from './storage/ApexStorage';
export * from './storage/ApexStorageManager';

// Export document symbol provider
export * from './documentSymbol/ApexDocumentSymbolProvider';

// Export folding range provider
export * from './foldingRange/ApexFoldingRangeProvider';

// Export LSP handlers
export * from './handlers/DidOpenDocumentHandler';
export * from './handlers/DidChangeDocumentHandler';
export * from './handlers/DidSaveDocumentHandler';
export * from './handlers/DidCloseDocumentHandler';
export * from './handlers/DidDeleteDocumentHandler';
export * from './handlers/DocumentSymbolHandler';
export * from './handlers/DefinitionHandler';
export * from './handlers/ReferencesHandler';
export * from './handlers/FoldingRangeHandler';
export * from './handlers/ApexLibResolveHandler';
export * from './handlers/LogNotificationHandler';
export * from './handlers/DiagnosticHandler';
export * from './handlers/HoverHandler';
export * from './handlers/MissingArtifactHandler';
export * from './handlers/CodeLensHandler';
export * from './handlers/QueueStateHandler';
export * from './handlers/GraphDataHandler';
export * from './handlers/ExecuteCommandHandler';

// Export services
export * from './services/DocumentProcessingService';
// DocumentOpenBatcher exports are handled via DocumentProcessingService
// to avoid duplicate exports
export * from './services/DocumentSaveProcessingService';
export * from './services/DocumentStateCache';
export * from './services/DocumentCloseProcessingService';
export * from './services/DocumentDeleteProcessingService';
export * from './services/DocumentSymbolProcessingService';
export * from './services/DefinitionProcessingService';
export * from './services/DiagnosticProcessingService';
export * from './services/HoverProcessingService';
export * from './services/BackgroundProcessingInitializationService';
export * from './services/CompletionProcessingService';
export * from './services/ReferencesProcessingService';
export * from './services/WorkspaceLoadCoordinator';
export * from './services/MissingArtifactResolutionService';
export * from './services/IndexingObserver';
export * from './services/SymbolManagerExtensions';
export * from './services/CodeLensProcessingService';
export * from './services/QueueStateProcessingService';
export * from './services/GraphDataProcessingService';
export * from './services/ExecuteCommandProcessingService';
export * from './services/commands/CommandHandler';
export * from './services/commands/FindApexTestsCommandHandler';

// Export factories
export * from './factories/HandlerFactory';

export type { ApexReference } from './storage/ApexStorageInterface';
export * from './storage/ApexStorageInterface';

// Settings and capabilities management are now exported from @salesforce/apex-lsp-shared

// Export ApexLib
export * from './apexlib';

// Export LSP queue system
export * from './queue';

// Export registry components
export * from './registry';

/**
 * Initialize LSPQueueManager with required dependencies
 * This should be called during server initialization
 */
export function initializeLSPQueueManager(
  symbolManager: ISymbolManager,
): LSPQueueManager {
  const logger = getLogger();
  const serviceFactory = new ServiceFactory({
    logger,
    symbolManager,
    storageManager: ApexStorageManager.getInstance(),
    settingsManager: ApexSettingsManager.getInstance(),
  });

  const dependencies: LSPQueueManagerDependencies = {
    serviceFactory,
    serviceConfig: DEFAULT_SERVICE_CONFIG,
    storageManager: ApexStorageManager.getInstance(),
    settingsManager: ApexSettingsManager.getInstance(),
  };

  return LSPQueueManager.getInstance(dependencies);
}

/**
 * Dispatch function for document open events (LSP notification - fire-and-forget)
 * Routes through LSPQueueManager for throttled processing during workspace load
 * @param event The document open event
 */
export const dispatchProcessOnOpenDocument = (
  event: TextDocumentChangeEvent<TextDocument>,
): void => {
  // Use DocumentProcessingService directly for lightweight initial storage
  // No need to queue a heavy notification task for a simple document open
  try {
    const logger = getLogger();
    const processingService = DocumentProcessingService.getInstance(logger);
    processingService.processDocumentOpenInternal(event).catch(() => {});
  } catch (error) {
    // Logger or service might not be available yet during very early startup
  }
};

/**
 * Dispatch function for document change events (LSP notification - fire-and-forget)
 * @param event The document change event
 */
export const dispatchProcessOnChangeDocument = (
  event: TextDocumentChangeEvent<TextDocument>,
): void => {
  const handler = HandlerFactory.createDidChangeDocumentHandler();
  // Error handling is done internally in handleDocumentChange
  handler.handleDocumentChange(event);
};

/**
 * Dispatch function for document close events (LSP notification - fire-and-forget)
 * @param event The document close event
 */
export const dispatchProcessOnCloseDocument = (
  event: TextDocumentChangeEvent<TextDocument>,
): void => {
  const handler = HandlerFactory.createDidCloseDocumentHandler();
  // Error handling is done internally in handleDocumentClose
  handler.handleDocumentClose(event);
};

/**
 * Dispatch function for document save events (LSP notification - fire-and-forget)
 * @param event The document save event
 */
export const dispatchProcessOnSaveDocument = (
  event: TextDocumentChangeEvent<TextDocument>,
): void => {
  const handler = HandlerFactory.createDidSaveDocumentHandler();
  // Error handling is done internally in handleDocumentSave
  handler.handleDocumentSave(event);
};

/**
 * Dispatch function for file delete events
 * @param event The file delete event
 * @returns Promise resolving to void
 */
export const dispatchProcessOnDeleteDocument = async (
  event: DeleteFilesParams,
): Promise<void> => {
  const handler = HandlerFactory.createDidDeleteDocumentHandler();
  return await handler.handleDocumentDelete(event);
};

/**
 * Dispatch function for document symbol requests
 * @param params The document symbol parameters
 * @returns Promise resolving to symbol information or document symbols
 */
export const dispatchProcessOnDocumentSymbol = async (
  params: DocumentSymbolParams,
): Promise<SymbolInformation[] | DocumentSymbol[] | null> => {
  const handler = HandlerFactory.createDocumentSymbolHandler();
  return await handler.handleDocumentSymbol(params);
};

// Singleton HoverHandler instance to ensure consistent symbol manager usage
let hoverHandlerInstance: HoverHandler | null = null;

/**
 * Dispatch function for hover requests
 * @param params The hover parameters
 * @returns Promise resolving to hover information or null
 */
export const dispatchProcessOnHover = async (
  params: HoverParams,
): Promise<Hover | null> => {
  const logger = getLogger();
  logger.debug(
    `🔍 [dispatchProcessOnHover] Dispatching hover request for ${
      params.textDocument.uri
    } at ${params.position.line}:${params.position.character}`,
  );

  // Use singleton pattern to ensure same symbol manager instance
  // Creating new handlers every time causes empty symbol managers
  if (!hoverHandlerInstance) {
    logger.debug(
      '🔧 [dispatchProcessOnHover] Creating new hover handler instance',
    );
    hoverHandlerInstance = HandlerFactory.createHoverHandler();
  }
  const result = await hoverHandlerInstance.handleHover(params);
  logger.debug(
    `✅ [dispatchProcessOnHover] Hover dispatch completed for ${
      params.textDocument.uri
    }: ${result ? 'success' : 'null'}`,
  );
  return result;
};

/**
 * Dispatch function for definition requests
 * @param params The definition parameters
 * @returns Promise resolving to definition locations or null
 */
export const dispatchProcessOnDefinition = async (
  params: DefinitionParams,
): Promise<Location[] | null> => {
  const handler = HandlerFactory.createDefinitionHandler();
  return await handler.handleDefinition(params);
};

/**
 * Dispatch function for references requests
 * @param params The references parameters
 * @returns Promise resolving to reference locations or null
 */
export const dispatchProcessOnReferences = async (
  params: ReferenceParams,
): Promise<Location[] | null> => {
  const handler = HandlerFactory.createReferencesHandler();
  return await handler.handleReferences(params);
};

/**
 * Dispatch function for apex/findMissingArtifact custom requests
 * @param params The missing artifact parameters
 * @returns Promise resolving to missing artifact result
 */
export const dispatchProcessOnFindMissingArtifact = async (
  params: FindMissingArtifactParams,
): Promise<FindMissingArtifactResult> => {
  // Import the function dynamically to avoid circular dependencies
  const { processApexFindMissingArtifact } = await import(
    './handlers/MissingArtifactHandler'
  );
  return await processApexFindMissingArtifact(params);
};

/**
 * Dispatch function for code lens requests
 * @param params The code lens parameters
 * @returns Promise resolving to array of code lenses
 */
export const dispatchProcessOnCodeLens = async (
  params: CodeLensParams,
): Promise<CodeLens[]> => {
  const logger = getLogger();
  logger.debug(
    () => `Dispatching code lens request for ${params.textDocument.uri}`,
  );
  const handler = HandlerFactory.createCodeLensHandler();
  const result = await handler.handleCodeLens(params);
  logger.debug(() => `Handler returned ${result.length} code lenses`);
  return result;
};

// Re-export the existing dispatch functions
export {
  dispatchProcessOnDiagnostic,
  dispatchProcessOnFoldingRange,
  dispatchProcessOnResolve,
};

// Export dispatch functions from handlerUtil
export { dispatchProcessOnQueueState } from './utils/handlerUtil';

/**
 * Dispatch graph data processing request
 * @param params The graph data parameters
 * @returns Graph data response
 */
export const dispatchProcessOnGraphData = async (params: any): Promise<any> => {
  const handler = HandlerFactory.createGraphDataHandler();
  return await handler.handleGraphData(params);
};

/**
 * Dispatch function for execute command requests
 * @param params The execute command parameters
 * @returns Promise resolving to command execution result
 */
export const dispatchProcessOnExecuteCommand = async (
  params: ExecuteCommandParams,
): Promise<any> => {
  const handler = HandlerFactory.createExecuteCommandHandler();
  return await handler.handleExecuteCommand(params);
};
