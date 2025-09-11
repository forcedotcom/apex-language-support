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

    // First, try to resolve from embedded resources in the parser package
    const embeddedContent = await resolveFromEmbeddedResources(params.uri);
    if (embeddedContent) {
      logger.debug(`Successfully resolved embedded content for: ${params.uri}`);
      return { content: embeddedContent };
    }

    // Fall back to storage manager if embedded content not found
    logger.debug(`Falling back to storage for: ${params.uri}`);
    const storageManager = ApexStorageManager.getInstance();
    const storage = storageManager.getStorage();

    // Get the document content from storage
    const document = await storage.getDocument(params.uri);
    if (!document) {
      throw new Error(`Document not found: ${params.uri}`);
    }

    const content = document.getText();
    logger.debug(
      `Successfully resolved content from storage for: ${params.uri}`,
    );

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
 * Resolve content from embedded resources in the parser package
 * @param uri The URI to resolve
 * @returns Promise resolving to content or null if not found
 */
async function resolveFromEmbeddedResources(
  uri: string,
): Promise<string | null> {
  try {
    // Check if this is an apexlib:// URI
    if (!uri.startsWith('apexlib://')) {
      return null;
    }

    // Extract the class name from the URI
    // Format: apexlib://resources/StandardApexLibrary/System.cls -> StandardApexLibrary/System.cls
    const className = uri.replace('apexlib://resources/', '');

    // Import the ResourceLoader from the parser package
    const { ResourceLoader } = await import('@salesforce/apex-lsp-parser-ast');

    if (!ResourceLoader) {
      logger.debug('ResourceLoader not available from parser package');
      return null;
    }

    // Get the singleton instance
    const resourceLoader = ResourceLoader.getInstance();

    // Try to get the content for the class
    const content = await resourceLoader.getFile(className);

    if (content) {
      logger.debug(`Found embedded content for: ${className}`);
      return content;
    }

    // If the first attempt failed, try alternative paths
    if (!className.includes('/')) {
      // Try StandardApexLibrary/ClassName.cls
      const altPath = `StandardApexLibrary/${className}.cls`;
      const altContent = await resourceLoader.getFile(altPath);

      if (altContent) {
        logger.debug(
          `Found embedded content for: ${className} at alt path: ${altPath}`,
        );
        return altContent;
      }

      // Try just the class name with .cls extension
      const simplePath = `${className}.cls`;
      const simpleContent = await resourceLoader.getFile(simplePath);

      if (simpleContent) {
        logger.debug(
          `Found embedded content for: ${className} at simple path: ${simplePath}`,
        );
        return simpleContent;
      }
    }

    logger.debug(`No embedded content found for: ${className}`);
    return null;
  } catch (error) {
    logger.debug(`Error accessing embedded resources: ${error}`);
    return null;
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
