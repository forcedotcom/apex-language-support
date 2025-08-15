/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// This file contains Node.js-specific functionality
// It should only be imported in Node.js environments

export {
  createAndStartClient,
  startLanguageServer,
  restartLanguageServer,
  stopLanguageServer,
  getLanguageClient,
} from './language-server';

export {
  getDebugOptions,
  createServerOptions,
  createClientOptions,
} from './server-config';
