/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Apex Language Server Extension e2e tests.
 *
 * Configures test execution for VS Code Web environment with proper
 * browser settings, timeouts, and CI/CD integration.
 */
export default defineConfig({
  testDir: './tests',

  fullyParallel: !process.env.DEBUG_MODE,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI || process.env.DEBUG_MODE ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
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
            ...(process.env.DEBUG_MODE
              ? ['--no-sandbox', '--disable-dev-shm-usage']
              : []),
          ],
          headless: process.env.CI || !process.env.DEBUG_MODE ? true : false,
          slowMo: process.env.DEBUG_MODE ? 300 : 0,
        },
      },
    },
  ],

  webServer: {
    command: 'npm run test:e2e:server',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  timeout: process.env.CI ? 120_000 : 60_000,
  globalSetup: require.resolve('./utils/global.ts'),
  globalTeardown: require.resolve('./utils/global.ts'),
});
