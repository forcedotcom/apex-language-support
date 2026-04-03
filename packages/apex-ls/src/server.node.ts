/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { startApexNodeServer } from './server/nodeServer';

// Start the Node.js server
startApexNodeServer().catch((error) => {
  console.error('❌ Critical error starting Node.js server:', error);
  process.exit(1);
});
