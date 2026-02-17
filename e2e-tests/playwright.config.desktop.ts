/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 *
 * Playwright desktop (Electron) configuration for Apex Language Server Extension e2e tests.
 * Uses createDesktopTest fixture for VS Code Electron launch.
 *
 * Environment Variables:
 * - DEBUG_MODE: Enable debug mode, pause on failure
 * - CI: Enable CI-specific settings
 * - E2E_SEQUENTIAL: Run tests sequentially (used for retry step)
 * - E2E_NO_RETRIES: Disable retries (used for try-run step)
 */
import { createDesktopConfig } from './shared/config/createDesktopConfig';

export default createDesktopConfig({
  testDir: './tests',
});
