/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { CodeLensAction } from '@salesforce/apex-lsp-client/browser';
import { CODE_LENS_SERVER_COMMANDS } from '@salesforce/apex-lsp-shared';

export const CODE_LENS_SERVER_ACTIONS: ReadonlyMap<string, CodeLensAction> =
  new Map<string, CodeLensAction>([
    [CODE_LENS_SERVER_COMMANDS.executeAnonymous, 'run'],
    [CODE_LENS_SERVER_COMMANDS.debugAnonymous, 'debug'],
    [CODE_LENS_SERVER_COMMANDS.runTestClass, 'run'],
    [CODE_LENS_SERVER_COMMANDS.debugTestClass, 'debug'],
    [CODE_LENS_SERVER_COMMANDS.runTestMethod, 'run'],
    [CODE_LENS_SERVER_COMMANDS.debugTestMethod, 'debug'],
  ]);
