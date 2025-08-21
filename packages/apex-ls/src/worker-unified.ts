/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { isWorkerEnvironment } from './utils/EnvironmentDetector';
import { createUnifiedLanguageServer } from './server/index.worker';

/**
 * Safe worker initialization that handles both test and production environments
 */
function initializeWorker() {
  try {
    console.log('[WORKER-UNIFIED] Initializing worker...');
    
    // Check if we're actually in a worker environment
    if (!isWorkerEnvironment()) {
      console.log('[WORKER-UNIFIED] Not in worker environment, skipping initialization');
      return;
    }

    // Check if self is available
    if (typeof self === 'undefined') {
      console.log('[WORKER-UNIFIED] Self is not available, cannot initialize worker');
      return;
    }

    console.log('[WORKER-UNIFIED] Worker environment detected, starting language server...');
    
    // Initialize the unified language server
    createUnifiedLanguageServer()
      .then(() => {
        console.log('[WORKER-UNIFIED] Language server started successfully');
        
        // Send ready signal if postMessage is available
        if (typeof self.postMessage === 'function') {
          self.postMessage({
            type: 'apex-worker-ready',
            timestamp: new Date().toISOString(),
            server: 'unified-apex-ls'
          });
        }
      })
      .catch((error) => {
        console.error('[WORKER-UNIFIED] Failed to start language server:', error);
        
        // Send error signal if postMessage is available
        if (typeof self.postMessage === 'function') {
          self.postMessage({
            type: 'apex-worker-error',
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      });
      
  } catch (error) {
    console.error('[WORKER-UNIFIED] Initialization error:', error);
  }
}

// Auto-initialize only if not in test environment
if (typeof process === 'undefined' || !process.env.JEST_WORKER_ID) {
  initializeWorker();
}

// Export for manual initialization in tests
export { initializeWorker };