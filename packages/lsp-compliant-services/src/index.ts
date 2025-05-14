/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Export storage interfaces and classes
export * from './storage/ApexStorageInterface';
export * from './storage/ApexStorageManager';

// Export document symbol provider
export * from './documentSymbol/ApexDocumentSymbolProvider';

// Export LSP protocol types
export * from 'vscode-languageserver-protocol';
export * from './handlers/DidOpenDocumentHandler';
export * from './handlers/DidChangeDocumentHandler';
export * from './handlers/DidCloseDocumentHandler';
export * from './handlers/DidSaveDocumentHandler';
export * from './handlers/DocumentSymbolHandler';
export * from './handlers/LogNotificationHandler';
export {
  ApexReference,
  ApexStorageInterface,
} from './storage/ApexStorageInterface';
