/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Global teardown for Jest tests
 * This ensures that singletons and intervals are cleaned up after all tests
 * 
 * According to Effect-TS best practices:
 * - Shutdown queues first (causes Queue.take to fail and exit loops)
 * - Then interrupt fibers
 * - Allow a small delay for cleanup to complete
 */
module.exports = async () => {
  try {
    // Clean up ApexSymbolProcessingManager singleton
    // Use the source path since Jest transforms TypeScript
    const { ApexSymbolProcessingManager } = require('@salesforce/apex-lsp-parser-ast');
    if (ApexSymbolProcessingManager && typeof ApexSymbolProcessingManager.reset === 'function') {
      ApexSymbolProcessingManager.reset();
      
      // Give Effect-TS resources time to clean up
      // This allows fibers to complete their cleanup and queues to fully shutdown
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  } catch (error) {
    // Ignore errors during teardown - module might not be available
  }
};

