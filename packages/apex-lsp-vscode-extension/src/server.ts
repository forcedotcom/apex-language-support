/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// This file serves as the entry point for the bundled language server
// It will be spawned as a child process by the VS Code extension

// Use require to ensure side effects are executed
// The language server starts when this module is loaded
import { createUnifiedWebWorkerLanguageServer } from '@salesforce/apex-ls/worker';

createUnifiedWebWorkerLanguageServer();
