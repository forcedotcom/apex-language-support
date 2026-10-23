/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/** Host-neutral CodeLens callback registration API. */
export { createCodeLensCallbackRegistry } from './codeLensCallbacks';
export type {
  CodeLensDescriptor,
  CodeLensCallback,
  CodeLensCallbackRegistry,
  CodeLensCallbackRegistryOptions,
} from './codeLensCallbacks';
