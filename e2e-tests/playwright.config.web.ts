/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 *
 * Playwright web configuration for Apex Language Server Extension e2e tests.
 *
 * Environment Variables:
 * - DEBUG_MODE: Enable debug mode with slow motion and headed browser
 * - CI: Enable CI-specific settings
 * - E2E_SEQUENTIAL: Run tests sequentially (used for retry step)
 * - E2E_NO_RETRIES: Disable retries (used for try-run step)
 */
import { createWebConfig } from './shared/config/createWebConfig';

export default createWebConfig({
  testDir: './tests',
  baseURL: 'http://localhost:3000',
  webServerCommand: 'node test-server.js',
  port: 3000,
});
