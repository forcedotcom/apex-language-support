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
 * Valid server modes - single source of truth
 */
const VALID_SERVER_MODES = ['production', 'development'] as const;

/**
 * Server mode type derived from valid modes
 */
export type ServerMode = (typeof VALID_SERVER_MODES)[number];

/**
 * Validates if a string is a valid server mode
 * @param mode - The mode string to validate
 * @returns True if the mode is valid
 */
const isValidServerMode = (mode: string): mode is ServerMode =>
  VALID_SERVER_MODES.includes(mode as ServerMode);

/**
 * Determines the server mode based on environment and context.
 *
 * Priority order:
 * 1. APEX_LS_MODE environment variable (if valid)
 * 2. Workspace settings (apex.environment.serverMode)
 * 3. Extension mode (development/test vs production)
 *
 * @param context - VS Code extension context
 * @returns The determined server mode
 */
export const determineServerMode = (
  context: vscode.ExtensionContext,
): ServerMode => {
  // Check for environment variables only if process is available
  const processEnv = process?.env ?? {};

  // Validate and use APEX_LS_MODE if set
  if (processEnv.APEX_LS_MODE) {
    if (isValidServerMode(processEnv.APEX_LS_MODE)) {
      logToOutputChannel(
        `Using server mode from environment variable: ${processEnv.APEX_LS_MODE}`,
        'info',
      );
      return processEnv.APEX_LS_MODE;
    }

    logToOutputChannel(
      `Invalid APEX_LS_MODE value: ${processEnv.APEX_LS_MODE}. Using extension mode.`,
      'warning',
    );
  }

  // Check workspace settings for server mode
  const config = vscode.workspace.getConfiguration('apex');
  const settingsServerMode = config.get<string>('environment.serverMode');
  if (settingsServerMode) {
    if (isValidServerMode(settingsServerMode)) {
      logToOutputChannel(
        `Using server mode from workspace settings: ${settingsServerMode}`,
        'info',
      );
      return settingsServerMode;
    }

    logToOutputChannel(
      `Invalid apex.environment.serverMode value: ${settingsServerMode}. Using extension mode.`,
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

/**
 * Compile-time bundle target, injected by esbuild `define`:
 *   - the Node bundle (dist/extension.js)  -> 'desktop'
 *   - the browser bundle (dist/extension.web.js) -> 'web'
 *
 * The bundle target IS the extension-host type, which is the correct
 * desktop-vs-web discriminator. `vscode.env.uiKind` only reports where the UI
 * renders, so it misclassifies a Node extension host with a browser-rendered
 * UI (e.g. code-server) as 'web' — sending it down the web-worker client path,
 * which a Node host cannot run. Declared loosely so unbundled runs (tests,
 * tsc-only) fall back to the uiKind heuristic below.
 */
declare const __APEX_LS_TARGET__: 'desktop' | 'web' | undefined;

/**
 * Environment detection
 */
export function detectEnvironment(): 'desktop' | 'web' {
  // Bundle target is authoritative: the Node entry point only loads in a Node
  // extension host (desktop VS Code AND code-server), the browser entry point
  // only loads in a web-worker host (vscode.dev).
  if (typeof __APEX_LS_TARGET__ !== 'undefined') {
    return __APEX_LS_TARGET__;
  }
  // Fallback for unbundled execution (no define injected): approximate via UI kind.
  return vscode.env.uiKind === vscode.UIKind.Web ? 'web' : 'desktop';
}

export const getStdApexClassesPathFromContext = (
  context: vscode.ExtensionContext,
) => {
  const packageJson = context.extension.packageJSON;
  const standardApexLibraryPath = packageJson.contributes?.standardApexLibrary;
  const absolutePath = !standardApexLibraryPath
    ? undefined
    : vscode.Uri.joinPath(context.extensionUri, standardApexLibraryPath);

  if (!absolutePath) {
    logToOutputChannel(
      'Standard Apex Library path not found in package.json',
      'warning',
    );
    throw new Error('Standard Apex Library path not found in package.json');
  }
  logToOutputChannel(
    `Standard Apex Library path: ${absolutePath?.toString()}`,
    'debug',
  );
  return absolutePath;
};
