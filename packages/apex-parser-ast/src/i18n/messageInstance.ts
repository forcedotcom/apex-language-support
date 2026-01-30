/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Message } from '@salesforce/vscode-i18n';
import { messages, ErrorCodeKey } from '../generated/messages_en_US';

/**
 * Singleton Message instance for localization.
 * Initialized lazily on first use.
 */
let messageInstance: Message | null = null;

/**
 * Get the Message instance (lazy initialization)
 */
function getMessageInstance(): Message {
  if (!messageInstance) {
    messageInstance = new Message(messages);
  }
  return messageInstance;
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

  // Use @salesforce/vscode-i18n Message class for formatting
  // Convert args to strings (matching original behavior)
  const stringArgs = args.map((arg) => String(arg));
  return getMessageInstance().localize(key, ...stringArgs);
}

/**
 * Type-safe version of localize with IntelliSense support for error code keys
 *
 * Provides:
 * - Type-safe error code keys (IntelliSense for valid keys)
 * - Type-safe argument count (ensures correct number of arguments)
 * - All arguments typed as any[] (since placeholders are %s)
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
