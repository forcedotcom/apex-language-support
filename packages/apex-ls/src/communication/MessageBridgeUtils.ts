/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Utility functions for message bridge operations
 */
export class MessageBridgeUtils {
  /**
   * Validates if a message is valid
   */
  static isValidMessage(message: any): boolean {
    return message !== null && message !== undefined;
  }

  /**
   * Creates a standard error response
   */
  static createErrorResponse(error: string): { error: string } {
    return { error };
  }
}