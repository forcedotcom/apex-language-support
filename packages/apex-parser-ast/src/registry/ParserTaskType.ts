/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Types of parser-side tasks that can be queued
 */
export enum ParserTaskType {
  SymbolIndexing = 'symbol-indexing',
  CommentAssociation = 'comment-association',
  DeferredReferenceProcess = 'deferred-reference-process',
  DeferredReferenceRetry = 'deferred-reference-retry',
}
