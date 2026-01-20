/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { defineConfig, devices } from '@playwright/test';

/**
 * Test mode configuration:
 * - 'web': Tests run against VS Code Web using @vscode/test-web (default)
 * - 'desktop': Tests would run against desktop VS Code using @vscode/test-electron
 *              (not yet implemented - requires different test infrastructure)
 *
 * Set TEST_MODE environment variable to control the test mode.
 */
const TEST_MODE = (process.env.TEST_MODE as 'web' | 'desktop') ?? 'web';

/**
 * Playwright configuration for Apex Language Server Extension e2e tests.
 *
 * Currently configures test execution for VS Code Web environment with proper
 * browser settings, timeouts, and CI/CD integration.
 *
 * Future: Will support both web and desktop modes through TEST_MODE env var.
 */
export default defineConfig({
  testDir: './tests',

  fullyParallel: !process.env.DEBUG_MODE,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI || process.env.DEBUG_MODE ? 1 : undefined,
  reporter: process.env.CI
    ? [['html'], ['line'], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    screenshot: process.env.CI ? 'on' : 'only-on-failure',
    video: process.env.CI ? 'on' : 'retain-on-failure',
    actionTimeout: 15000,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--enable-logging=stderr',
            '--log-level=0',
            '--v=1',
            ...(process.env.CI || process.env.DEBUG_MODE
              ? [
                  '--no-sandbox',
                  '--disable-dev-shm-usage',
                  '--disable-background-timer-throttling',
                  '--disable-backgrounding-occluded-windows',
                  '--disable-renderer-backgrounding',
                ]
              : []),
          ],
          headless: process.env.CI || !process.env.DEBUG_MODE ? true : false,
          slowMo: process.env.DEBUG_MODE ? 300 : 0,
        },
      },
    },
  ],

  webServer: {
    command: 'node test-server.js',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    cwd: process.cwd().endsWith('e2e-tests') ? '.' : './e2e-tests',
  },

  timeout: process.env.CI ? 120_000 : 60_000,
});
