/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Generic utility function to handle async operations in a fire-and-forget pattern
 * @param operation - The async operation to execute
 * @param errorMessage - The error message to log if the operation fails
 */
export const dispatch = async (
  operation: Promise<void>,
  errorMessage: string,
): Promise<void> => {
  operation.catch((error: unknown) => {
    console.error(`${errorMessage}: ${error}`);
  });
};
