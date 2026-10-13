/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// Source modules retain CommonJS archive loading for bundled and compiled builds.
// Vitest evaluates them as ESM, so provide the equivalent Node loader for tests.
const nodeRequire = createRequire(import.meta.url);
(globalThis as typeof globalThis & { require?: NodeRequire }).require =
  nodeRequire;

nodeRequire.extensions['.zip'] = (module, filename) => {
  module.exports = `data:application/zip;base64,${readFileSync(filename).toString('base64')}`;
};
