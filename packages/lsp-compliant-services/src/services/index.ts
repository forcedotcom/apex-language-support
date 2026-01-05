/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Export services
export * from './DocumentProcessingService';
// DocumentOpenBatcher types are re-exported via DocumentProcessingService to avoid duplicates
export type {
  DocumentOpenBatcherService,
  DocumentOpenBatcher,
  DocumentOpenBatchConfig,
} from './DocumentOpenBatcher';
export {
  makeDocumentOpenBatcher,
  DEFAULT_BATCH_CONFIG,
} from './DocumentOpenBatcher';
export * from './DocumentSaveProcessingService';
export * from './DocumentStateCache';
export * from './DocumentCloseProcessingService';
export * from './DocumentSymbolProcessingService';
export * from './DiagnosticProcessingService';
export * from './HoverProcessingService';
export * from './BackgroundProcessingInitializationService';
export * from './CompletionProcessingService';
export * from './LayerEnrichmentService';

// Queue and registry are now exported from @salesforce/apex-lsp-parser-ast
export * from '../factories';
export * from '../config';
