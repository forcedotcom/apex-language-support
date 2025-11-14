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
  Diagnostic,
  HoverParams,
  Hover,
  DefinitionParams,
  ReferenceParams,
  Location,
  CodeLensParams,
  CodeLens,
} from 'vscode-languageserver';
import { getLogger } from '@salesforce/apex-lsp-shared';
import type {
  FindMissingArtifactParams,
  FindMissingArtifactResult,
} from '@salesforce/apex-lsp-shared';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { ApexSettingsManager } from '@salesforce/apex-lsp-shared';
import { HandlerFactory } from './factories/HandlerFactory';
import { dispatchProcessOnDiagnostic } from './handlers/DiagnosticHandler';
import { dispatchProcessOnFoldingRange } from './handlers/FoldingRangeHandler';
import { dispatchProcessOnResolve } from './handlers/ApexLibResolveHandler';
import { HoverHandler } from './handlers/HoverHandler';
import {
  LSPQueueManager,
  LSPQueueManagerDependencies,
} from '@salesforce/apex-lsp-parser-ast';
import { ServiceFactory } from './factories/ServiceFactory';
import { DEFAULT_SERVICE_CONFIG } from './config/ServiceConfiguration';
import { ApexStorageManager } from './storage/ApexStorageManager';
import { ISymbolManager } from '@salesforce/apex-lsp-parser-ast';

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

// Export services
export * from './services/DocumentProcessingService';
export * from './services/DocumentSaveProcessingService';
export * from './services/DocumentStateCache';
export * from './services/DocumentCloseProcessingService';
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

// Export factories
export * from './factories/HandlerFactory';

export type { ApexReference } from './storage/ApexStorageInterface';
export * from './storage/ApexStorageInterface';

// Settings and capabilities management are now exported from @salesforce/apex-lsp-shared

// Export ApexLib
export * from './apexlib';

// Export LSP queue system (re-export from apex-parser-ast)
export * from '@salesforce/apex-lsp-parser-ast';

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
 * Dispatch function for document open events
 * Routes through LSPQueueManager for throttled processing during workspace load
 * @param event The document open event
 * @returns Promise resolving to diagnostics or undefined
 */
export const dispatchProcessOnOpenDocument = async (
  event: TextDocumentChangeEvent<TextDocument>,
): Promise<Diagnostic[] | undefined> => {
  const queueManager = LSPQueueManager.getInstance();
  return await queueManager.submitDocumentOpenRequest(event);
};

/**
 * Dispatch function for document change events
 * @param event The document change event
 * @returns Promise resolving to diagnostics or undefined
 */
export const dispatchProcessOnChangeDocument = async (
  event: TextDocumentChangeEvent<TextDocument>,
): Promise<Diagnostic[] | undefined> => {
  const handler = HandlerFactory.createDidChangeDocumentHandler();
  return await handler.handleDocumentChange(event);
};

/**
 * Dispatch function for document close events
 * @param event The document close event
 * @returns Promise resolving to void
 */
export const dispatchProcessOnCloseDocument = async (
  event: TextDocumentChangeEvent<TextDocument>,
): Promise<void> => {
  const handler = HandlerFactory.createDidCloseDocumentHandler();
  return await handler.handleDocumentClose(event);
};

/**
 * Dispatch function for document save events
 * @param event The document save event
 * @returns Promise resolving to void
 */
export const dispatchProcessOnSaveDocument = async (
  event: TextDocumentChangeEvent<TextDocument>,
): Promise<void> => {
  const handler = HandlerFactory.createDidSaveDocumentHandler();
  return await handler.handleDocumentSave(event);
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
