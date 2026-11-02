/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { messages, ErrorCodeKey } from '../generated/messages_en_US';

/**
 * Format the MessageFormat subset used by the legacy Java diagnostic catalog.
 *
 * Java MessageFormat uses indexed placeholders and apostrophe escaping, unlike
 * printf's sequential placeholders. Keeping this small formatter local avoids
 * rewriting the source catalog during generation.
 */
function formatMessage(template: string, args: readonly unknown[]): string {
  let result = '';
  let quoted = false;

  for (let index = 0; index < template.length; index += 1) {
    const character = template[index];
    if (character === "'") {
      if (template[index + 1] === "'") {
        result += "'";
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && character === '{') {
      const end = template.indexOf('}', index + 1);
      const placeholder = end === -1 ? '' : template.slice(index + 1, end);
      if (/^\d+$/.test(placeholder)) {
        const argument = args[Number(placeholder)];
        result +=
          argument === undefined ? `{${placeholder}}` : String(argument);
        index = end;
        continue;
      }
    }

    result += character;
  }

  return result;
}

/**
 * Localize a message by key with parameter substitution
 *
 * @param key The message key (e.g., 'invalid.number.parameters')
 * @param args Arguments to substitute into placeholders
 * @returns The formatted message, or !key! if key not found
 *
 * @example
 * localize('invalid.number.parameters', '255')
 * // Returns: "Invalid number of parameters exceeds: 255"
 */
export function localize(key: string, ...args: any[]): string {
  // Check if key exists in messages (matching original behavior)
  if (!messages[key]) {
    return `!${key}!`;
  }

  return formatMessage(messages[key], args);
}

/**
 * Type-safe version of localize with IntelliSense support for error code keys
 *
 * Provides:
 * - Type-safe error code keys (IntelliSense for valid keys)
 * - Type-safe argument count (ensures correct number of arguments)
 * - All arguments typed as any[] (MessageFormat indexes are catalog-defined)
 *
 * @param key The message key (must be a valid ErrorCodeKey)
 * @param args Arguments to substitute into placeholders
 * @returns The formatted message, or !key! if key not found
 *
 * @example
 * localizeTyped('invalid.number.parameters', '255')
 * // Returns: "Invalid number of parameters exceeds: 255"
 */
export function localizeTyped<K extends ErrorCodeKey>(
  key: K,
  ...args: any[]
): string {
  return localize(key, ...args);
}
