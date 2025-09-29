/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { startApexWebWorker } from './server/webWorkerServer';

// Add immediate console.log to verify worker script execution
console.log('🔧 DEBUG WORKER: Worker script loaded and executing');

// Start the server - remove the custom message handler since LSP will handle communication
startApexWebWorker().catch((_error) => {
  console.error('❌ Critical error starting server:', _error);
  console.log(
    '🔧 DEBUG WORKER: Error details:',
    JSON.stringify(_error, Object.getOwnPropertyNames(_error)),
  );

  // In web worker environment, we can't use process.exit, so we'll post an error message
  if (process?.exit) {
    process.exit(1);
  } else {
    // For web worker environment, we'll post the error back to the main thread
    if (typeof self !== 'undefined' && self.postMessage) {
      console.log('🔧 DEBUG WORKER: Posting error message to main thread');
      self.postMessage({
        type: 'error',
        message: 'Critical error starting server',
        error: _error,
      });
    }
    throw _error; // Re-throw to ensure the worker terminates
  }
});
