/*
 * Minimal worker to test basic execution without imports
 */

console.log('[MINIMAL-WORKER] 🚀 Script loading started - no imports');

// Master-level worker initialization
(function initializeMinimalWorker() {
  try {
    console.log('[MINIMAL-WORKER] 🚀 Initializing minimal worker');
    console.log('[MINIMAL-WORKER] Environment check:', {
      hasSelf: typeof self !== 'undefined',
      hasImportScripts: typeof importScripts !== 'undefined',
      isESModule: typeof importScripts === 'undefined',
      workerType: typeof importScripts === 'undefined' ? 'ES Module' : 'Classic'
    });

    if (typeof self !== 'undefined') {
      console.log('[MINIMAL-WORKER] ✅ Worker environment detected');
      
      // Send ready signal to parent
      if (typeof self.postMessage === 'function') {
        self.postMessage({
          type: 'apex-worker-ready',
          timestamp: new Date().toISOString(),
          capabilities: ['minimal-test']
        });
        console.log('[MINIMAL-WORKER] ✅ Ready signal sent');
      }
    } else {
      console.log('[MINIMAL-WORKER] ⚠️ Not in worker environment');
    }
  } catch (initError) {
    console.error('[MINIMAL-WORKER] 🛡️ Error during initialization:', initError);
  }
})();

console.log('[MINIMAL-WORKER] 🚀 Script fully loaded');