/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CODE_LENS_ACTIONS } from '@salesforce/apex-lsp-client/browser';
import type { CodeLensAction } from '@salesforce/apex-lsp-client/browser';

export const CODE_LENS_COMMAND_MAPPINGS = [
  {
    action: 'executeAnonymous',
    serverCommand: 'sf.anon.apex.run.delegate',
    clientCommand: 'apex-ls-ts.codelens.executeAnonymous',
  },
  {
    action: 'debugAnonymous',
    serverCommand: 'sf.anon.apex.debug.delegate',
    clientCommand: 'apex-ls-ts.codelens.debugAnonymous',
  },
  {
    action: 'runTestClass',
    serverCommand: 'sf.apex.test.class.run.delegate',
    clientCommand: 'apex-ls-ts.codelens.runTestClass',
  },
  {
    action: 'debugTestClass',
    serverCommand: 'sf.apex.test.class.debug.delegate',
    clientCommand: 'apex-ls-ts.codelens.debugTestClass',
  },
  {
    action: 'runTestMethod',
    serverCommand: 'sf.apex.test.method.run.delegate',
    clientCommand: 'apex-ls-ts.codelens.runTestMethod',
  },
  {
    action: 'debugTestMethod',
    serverCommand: 'sf.apex.test.method.debug.delegate',
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
