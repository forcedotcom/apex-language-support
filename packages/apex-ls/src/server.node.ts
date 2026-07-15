/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { startApexNodeServer } from './server/nodeServer';
import { formattedError } from '@salesforce/apex-lsp-shared';

// Start the Node.js server
startApexNodeServer().catch((error) => {
  console.error('❌ Critical error starting Node.js server:');
  console.error(
    formattedError(error, {
      includeStack: true,
      includeProperties: true,
      maxStackLines: 50,
      context: 'server.node.ts startup',
    }),
  );

  // Additional diagnostics
  if (error instanceof Error) {
    console.error('\nError details:');
    console.error(`  Name: ${error.name}`);
    console.error(`  Message: ${error.message}`);
    if (error.cause) {
      console.error(`  Cause: ${error.cause}`);
    }
  } else {
    console.error(`\nNon-Error object thrown (type: ${typeof error}):`);
    console.error(JSON.stringify(error, null, 2));
  }

  process.exit(1);
});
