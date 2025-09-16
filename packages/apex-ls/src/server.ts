/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { startApexWebWorker } from './server/webWorkerServer';

// Start the server
startApexWebWorker().catch((_error) => {
  console.error('❌ Critical error starting server:', _error);
  // Exit with error code to indicate failure
  process.exit(1);
});
