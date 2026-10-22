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
import { logToOutputChannel } from './logging';

export {
  CODE_LENS_ACTIONS,
  type CodeLensAction,
} from '@salesforce/apex-lsp-client/browser';

export const createVsCodeCodeLensCallbackRegistry =
  (): CodeLensCallbackRegistry<vscode.CodeLens> =>
    createCodeLensCallbackRegistry({
      onCallbackError: (action, error) => {
        logToOutputChannel(
          `CodeLens ${action} callback failed: ${String(error)}`,
          'error',
        );
      },
    });
