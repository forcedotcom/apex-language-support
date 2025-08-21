/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { createUnifiedWebWorkerLanguageServer } from './worker';

// Initialize the worker
createUnifiedWebWorkerLanguageServer()
  .then(() => {
    // Worker is ready - communication will happen through LSP protocol
    // Don't use direct postMessage as it's blocked in VS Code Web
  })
  .catch((error) => {
    console.error('Failed to start language server:', error);
    // In web worker, we don't use process.exit()
    // Instead, the worker will be terminated by the main thread
    self.close?.();
  });
