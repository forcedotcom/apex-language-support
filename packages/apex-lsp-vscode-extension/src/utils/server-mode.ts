/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { logToOutputChannel } from '../logging';

/**
 * Server mode type
 */
export type ServerMode = 'production' | 'development';

/**
 * Determines the server mode based on environment and context.
 *
 * Priority order:
 * 1. APEX_LS_MODE environment variable (if valid)
 * 2. Extension mode (development/test vs production)
 *
 * @param context - VS Code extension context
 * @returns The determined server mode
 */
export const determineServerMode = (
  context: vscode.ExtensionContext,
): ServerMode => {
  // Check for environment variables only if process is available
  const processEnv = typeof process !== 'undefined' ? process.env : {};

  // Validate and use APEX_LS_MODE if set
  if (processEnv.APEX_LS_MODE) {
    const validModes: ServerMode[] = ['production', 'development'];
    if (validModes.includes(processEnv.APEX_LS_MODE as ServerMode)) {
      logToOutputChannel(
        `Using server mode from environment variable: ${processEnv.APEX_LS_MODE}`,
        'info',
      );
      return processEnv.APEX_LS_MODE as ServerMode;
    }

    logToOutputChannel(
      `Invalid APEX_LS_MODE value: ${processEnv.APEX_LS_MODE}. Using extension mode.`,
      'warning',
    );
  }

  // Default to extension mode
  const mode: ServerMode =
    context.extensionMode === vscode.ExtensionMode.Development ||
    context.extensionMode === vscode.ExtensionMode.Test
      ? 'development'
      : 'production';

  logToOutputChannel(`Using server mode from extension mode: ${mode}`, 'debug');

  return mode;
};
