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
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { HandlerFactory } from './factories/HandlerFactory';
import { dispatchProcessOnDiagnostic } from './handlers/DiagnosticHandler';
import { dispatchProcessOnFoldingRange } from './handlers/FoldingRangeHandler';
import { dispatchProcessOnResolve } from './handlers/ApexLibResolveHandler';

// Export storage interfaces and classes
export * from './storage/ApexStorageInterface';
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

// Export services
export * from './services/DocumentProcessingService';
export * from './services/DocumentSaveProcessingService';
export * from './services/DocumentCloseProcessingService';
export * from './services/DocumentSymbolProcessingService';
export * from './services/DiagnosticProcessingService';

// Export factories
export * from './factories/HandlerFactory';

export type {
  ApexReference,
  ApexStorageInterface,
} from './storage/ApexStorageInterface';

// Export settings management
export * from './settings/ApexLanguageServerSettings';
export * from './settings/ApexSettingsManager';
export * from './settings/LSPConfigurationManager';

// Export capabilities management
export * from './capabilities/ApexLanguageServerCapabilities';
export * from './capabilities/ApexCapabilitiesManager';

// Export ApexLib
export * from './apexlib';

// Legacy dispatch function exports for backward compatibility
// These use the new handler architecture internally

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

// Re-export the existing dispatch functions
export {
  dispatchProcessOnDiagnostic,
  dispatchProcessOnFoldingRange,
  dispatchProcessOnResolve,
};
