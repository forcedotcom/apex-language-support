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
  Location,
} from 'vscode-languageserver';
import { getLogger } from '@salesforce/apex-lsp-shared';
import type {
  FindMissingArtifactParams,
  FindMissingArtifactResult,
} from '@salesforce/apex-lsp-shared';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { HandlerFactory } from './factories/HandlerFactory';
import { dispatchProcessOnDiagnostic } from './handlers/DiagnosticHandler';
import { dispatchProcessOnFoldingRange } from './handlers/FoldingRangeHandler';
import { dispatchProcessOnResolve } from './handlers/ApexLibResolveHandler';
import { HoverHandler } from './handlers/HoverHandler';

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
export * from './handlers/FoldingRangeHandler';
export * from './handlers/ApexLibResolveHandler';
export * from './handlers/LogNotificationHandler';
export * from './handlers/DiagnosticHandler';
export * from './handlers/HoverHandler';
export * from './handlers/MissingArtifactHandler';

// Export services
export * from './services/DocumentProcessingService';
export * from './services/DocumentSaveProcessingService';
export * from './services/DocumentCloseProcessingService';
export * from './services/DocumentSymbolProcessingService';
export * from './services/DiagnosticProcessingService';
export * from './services/HoverProcessingService';
export * from './services/BackgroundProcessingInitializationService';
export * from './services/CompletionProcessingService';
export * from './services/MissingArtifactResolutionService';
export * from './services/IndexingObserver';
export * from './services/SymbolManagerExtensions';

// Export factories
export * from './factories/HandlerFactory';

export type { ApexReference } from './storage/ApexStorageInterface';
export * from './storage/ApexStorageInterface';

// Export settings management
export * from './settings/ApexLanguageServerSettings';
export * from './settings/ApexSettingsManager';
export * from './settings/LSPConfigurationManager';

// Export capabilities management
export * from './capabilities/ApexLanguageServerCapabilities';
export * from './capabilities/ApexCapabilitiesManager';

// Export ApexLib
export * from './apexlib';

// Export LSP queue system
export * from './queue';

/**
 * Dispatch function for document open events
 * @param event The document open event
 * @returns Promise resolving to diagnostics or undefined
 */
export const dispatchProcessOnOpenDocument = async (
  event: TextDocumentChangeEvent<TextDocument>,
): Promise<Diagnostic[] | undefined> => {
  const handler = HandlerFactory.createDidOpenDocumentHandler();
  return await handler.handleDocumentOpen(event);
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

// Re-export the existing dispatch functions
export {
  dispatchProcessOnDiagnostic,
  dispatchProcessOnFoldingRange,
  dispatchProcessOnResolve,
};
