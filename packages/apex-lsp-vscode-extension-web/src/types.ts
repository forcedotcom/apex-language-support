/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Log level type for consistent typing across the application
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/**
 * Extension mode type for consistent typing
 */
export type ExtensionMode = 'production' | 'development';

/**
 * Interface for server initialization options
 */
export interface ApexServerInitializationOptions {
  logLevel?: LogLevel;
  enableDocumentSymbols?: boolean;
  trace?: string;
  extensionMode?: ExtensionMode;
  [key: string]: any;
}
