/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { FoldingRangeParams, FoldingRange } from 'vscode-languageserver';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';

import { ApexFoldingRangeProvider } from '../foldingRange/ApexFoldingRangeProvider';
import { ApexStorageManager } from '../storage/ApexStorageManager';

/**
 * Queue-compatible processing service for folding range requests.
 * Wraps ApexFoldingRangeProvider and internally obtains storage
 * so the caller doesn't need to pass it.
 */
export class FoldingRangeProcessingService {
  constructor(private readonly logger: LoggerInterface) {}

  async processFoldingRange(
    params: FoldingRangeParams,
  ): Promise<FoldingRange[] | null> {
    this.logger.debug(
      () => `Processing folding range request for: ${params.textDocument.uri}`,
    );

    const storage = ApexStorageManager.getInstance().getStorage();
    const provider = new ApexFoldingRangeProvider(storage);
    const foldingRanges = await Effect.runPromise(
      provider.getFoldingRanges(params.textDocument.uri),
    );

    if (foldingRanges.length === 0) {
      return null;
    }

    this.logger.debug(
      () =>
        `Returning ${foldingRanges.length} folding ranges for: ${params.textDocument.uri}`,
    );
    return foldingRanges;
  }
}
