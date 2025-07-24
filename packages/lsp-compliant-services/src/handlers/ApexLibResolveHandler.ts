/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger } from '@salesforce/apex-lsp-shared';

import { dispatch } from '../utils/handlerUtil';
import { ApexStorageManager } from '../storage/ApexStorageManager';

const logger = getLogger();

/**
 * Interface for the resolve request parameters
 */
interface ResolveRequestParams {
  uri: string;
}

/**
 * Interface for the resolve response
 */
interface ResolveResponse {
  content: string;
}

/**
 * Process resolve request for apexlib URIs
 *
 * This handler resolves embedded Apex artifacts from the repository
 * when requested via the apexlib:// URI scheme.
 *
 * @param params - The resolve request parameters
 * @returns Promise resolving to the content of the requested artifact
 */
export async function processOnResolve(
  params: ResolveRequestParams,
): Promise<ResolveResponse> {
  try {
    logger.debug(`Processing resolve request for: ${params.uri}`);

    // Get the storage manager instance
    const storageManager = ApexStorageManager.getInstance();
    const storage = storageManager.getStorage();

    // Get the document content from storage
    const document = await storage.getDocument(params.uri);
    if (!document) {
      throw new Error(`Document not found: ${params.uri}`);
    }

    const content = document.getText();
    logger.debug(`Successfully resolved content for: ${params.uri}`);

    return { content };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      `Error processing resolve request for ${params.uri}: ${errorMessage}`,
    );
    throw error;
  }
}

/**
 * Dispatch wrapper for resolve processing with error handling
 *
 * @param params - The resolve request parameters
 * @returns Promise resolving to the content of the requested artifact
 */
export function dispatchProcessOnResolve(
  params: ResolveRequestParams,
): Promise<ResolveResponse> {
  return dispatch(processOnResolve(params), 'Error processing resolve request');
}
