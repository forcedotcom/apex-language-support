/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { createWebConfig } from './shared/config/createWebConfig';

export default createWebConfig({
  testDir: './tests',
  baseURL: 'http://localhost:3000',
  webServerCommand: 'node test-server.js',
  port: 3000,
});
