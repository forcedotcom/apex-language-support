/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { messages } from './messages_en_US';

/**
 * Minimal I18nSupport for loading English error messages from jorje's messages_en_US.properties
 *
 * This is a simplified TypeScript version of jorje's I18nSupport.getLabel() that:
 * - Loads English messages only (no multi-language support)
 * - Performs simple template substitution ({0}, {1}, etc.)
 * - Returns !key! for missing keys (matching jorje behavior)
 *
 * Messages are loaded from a TypeScript module generated at build time from
 * messages_en_US.properties for browser/web worker compatibility.
 */
export class I18nSupport {
  /**
   * Get a localized message by key with parameter substitution
   *
   * @param key The message key (e.g., 'invalid.number.parameters')
   * @param args Arguments to substitute into placeholders ({0}, {1}, etc.)
   * @returns The formatted message, or !key! if key not found
   *
   * @example
   * I18nSupport.getLabel('invalid.number.parameters', 255)
   * // Returns: "Invalid number of parameters exceeds: 255"
   */
  static getLabel(key: string, ...args: any[]): string {
    const template = messages.get(key);
    if (!template) {
      return `!${key}!`;
    }

    // Simple substitution: replace {0}, {1}, etc. with args[0], args[1], etc.
    return template.replace(/\{(\d+)\}/g, (match, indexStr) => {
      const argIndex = parseInt(indexStr, 10);
      if (args[argIndex] != null) {
        return String(args[argIndex]);
      }
      // If argument is missing, return the placeholder as-is
      return match;
    });
  }
}
