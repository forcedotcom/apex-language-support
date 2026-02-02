/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { FoldingRangeParams, FoldingRange } from 'vscode-languageserver';
import { getLogger } from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';

import { dispatch } from '../utils/handlerUtil';
import { ApexFoldingRangeProvider } from '../foldingRange/ApexFoldingRangeProvider';
import type { ApexStorageInterface } from '../storage/ApexStorageInterface';

const logger = getLogger();

/**
 * Process folding range request for Apex documents.
 *
 * This handler computes foldable regions in Apex code such as:
 * - Class declarations
 * - Method declarations
 * - Control flow statements (if, for, while, etc.)
 * - Code blocks
 * - Try-catch statements
 *
 * @param params - The folding range request parameters
 * @param storage - The Apex storage interface for document access
 * @returns Array of folding ranges or null if none found
 */
export async function processOnFoldingRange(
  params: FoldingRangeParams,
  storage: ApexStorageInterface,
): Promise<FoldingRange[] | null> {
  try {
    logger.debug(
      () => `Processing folding range request for: ${params.textDocument.uri}`,
    );

    const provider = new ApexFoldingRangeProvider(storage);
    const foldingRanges = await Effect.runPromise(
      provider.getFoldingRanges(params.textDocument.uri),
    );

    if (foldingRanges.length === 0) {
      logger.debug(
        () => `No folding ranges found for: ${params.textDocument.uri}`,
      );
      return null;
    }

    logger.debug(
      () =>
        `Returning ${foldingRanges.length} folding ranges for: ${params.textDocument.uri}`,
    );
    return foldingRanges;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      () =>
        `Error processing folding range request for ${params.textDocument.uri}: ${errorMessage}`,
    );
    return null;
  }
}

/**
 * Dispatch wrapper for folding range processing with error handling.
 *
 * @param params - The folding range request parameters
 * @param storage - The Apex storage interface for document access
 * @returns Promise resolving to folding ranges or null
 */
export function dispatchProcessOnFoldingRange(
  params: FoldingRangeParams,
  storage: ApexStorageInterface,
): Promise<FoldingRange[] | null> {
  return dispatch(
    processOnFoldingRange(params, storage),
    'Error processing folding range request',
  );
}
