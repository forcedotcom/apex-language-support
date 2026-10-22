/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CODE_LENS_ACTIONS } from '@salesforce/apex-lsp-client/browser';
import { CODE_LENS_SERVER_COMMANDS } from '@salesforce/apex-lsp-shared';
import type { CodeLensAction } from '@salesforce/apex-lsp-client/browser';

export const CODE_LENS_COMMAND_MAPPINGS = [
  {
    action: 'executeAnonymous',
    serverCommand: CODE_LENS_SERVER_COMMANDS.executeAnonymous,
    clientCommand: 'apex-ls-ts.codelens.executeAnonymous',
  },
  {
    action: 'debugAnonymous',
    serverCommand: CODE_LENS_SERVER_COMMANDS.debugAnonymous,
    clientCommand: 'apex-ls-ts.codelens.debugAnonymous',
  },
  {
    action: 'runTestClass',
    serverCommand: CODE_LENS_SERVER_COMMANDS.runTestClass,
    clientCommand: 'apex-ls-ts.codelens.runTestClass',
  },
  {
    action: 'debugTestClass',
    serverCommand: CODE_LENS_SERVER_COMMANDS.debugTestClass,
    clientCommand: 'apex-ls-ts.codelens.debugTestClass',
  },
  {
    action: 'runTestMethod',
    serverCommand: CODE_LENS_SERVER_COMMANDS.runTestMethod,
    clientCommand: 'apex-ls-ts.codelens.runTestMethod',
  },
  {
    action: 'debugTestMethod',
    serverCommand: CODE_LENS_SERVER_COMMANDS.debugTestMethod,
    clientCommand: 'apex-ls-ts.codelens.debugTestMethod',
  },
] as const;

export { CODE_LENS_ACTIONS, type CodeLensAction };

export const CODE_LENS_COMMAND_ACTIONS: ReadonlyMap<string, CodeLensAction> =
  new Map(
    CODE_LENS_COMMAND_MAPPINGS.map(({ clientCommand, action }) => [
      clientCommand,
      action,
    ]),
  );

export const CODE_LENS_SERVER_TO_CLIENT_COMMANDS: ReadonlyMap<string, string> =
  new Map(
    CODE_LENS_COMMAND_MAPPINGS.map(({ serverCommand, clientCommand }) => [
      serverCommand,
      clientCommand,
    ]),
  );
