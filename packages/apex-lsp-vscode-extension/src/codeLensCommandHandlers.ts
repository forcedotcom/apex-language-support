/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import {
  createCodeLensCallbackRegistry,
  type CodeLensCallbackRegistry,
} from '@salesforce/apex-lsp-client/browser';
import { CODE_LENS_COMMAND_ACTIONS } from './codeLensCommandMappings';
import { logToOutputChannel } from './logging';

export {
  CODE_LENS_ACTIONS,
  type CodeLensAction,
} from '@salesforce/apex-lsp-client/browser';

export const createVsCodeCodeLensCallbackRegistry =
  (): CodeLensCallbackRegistry =>
    createCodeLensCallbackRegistry({
      onUnavailable: async (action) => {
        await vscode.window.showErrorMessage(
          `${action} is unavailable because no providers are registered.`,
        );
      },
      onProviderError: (action, error) => {
        logToOutputChannel(
          `CodeLens ${action} provider failed: ${String(error)}`,
          'error',
        );
      },
    });

export const registerCodeLensCommandHandlers = (
  context: vscode.ExtensionContext,
  registry: CodeLensCallbackRegistry,
): void => {
  for (const [command, action] of CODE_LENS_COMMAND_ACTIONS) {
    context.subscriptions.push(
      vscode.commands.registerCommand(command, (...arguments_) =>
        registry.dispatch(action, arguments_ as never),
      ),
    );
  }
};
