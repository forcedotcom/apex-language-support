/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { startServer } from '@salesforce/apex-ls';

// Start the language server
// This will run inside the WebContainer with full Node.js API access
startServer();
