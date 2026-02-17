/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { defineConfig, devices } from '@playwright/test';

type WebConfigOptions = {
  /** Test directory relative to extension root (default: './tests') */
  testDir?: string;
  /** Base URL for tests (default: 'http://localhost:3000') */
  baseURL?: string;
  /** Web server command (default: 'node test-server.js') */
  webServerCommand?: string;
  /** Web server port (default: 3000) */
  port?: number;
};

/** Creates a standardized Playwright web config for VS Code extension testing */
export const createWebConfig = (options: WebConfigOptions = {}) => {
  const testDir = options.testDir ?? './tests';
  const baseURL = options.baseURL ?? 'http://localhost:3000';
  const webServerCommand = options.webServerCommand ?? 'node test-server.js';
  const port = options.port ?? 3000;

  return defineConfig({
    testDir,
    fullyParallel: !process.env.CI,
    forbidOnly: !!process.env.CI,
    ...(process.env.CI ? { workers: 1 } : {}),
    reporter: [
      ['html', { open: 'never' }],
      ['line'],
      ['junit', { outputFile: 'test-results/junit.xml' }],
      ['json', { outputFile: 'test-results/results.json' }],
    ],
    use: {
      viewport: { width: 1920, height: 1080 },
      baseURL,
      trace: process.env.CI ? 'on' : 'on-first-retry',
      screenshot: process.env.CI ? 'on' : 'only-on-failure',
      video: process.env.CI ? 'on' : 'retain-on-failure',
      actionTimeout: 15_000,
      navigationTimeout: 30_000,
      launchOptions: {
        args: [
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-features=IsolateOrigins,site-per-process',
          '--enable-clipboard-read-write',
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
        slowMo: process.env.DEBUG_MODE ? 300 : 0,
      },
    },
    timeout: process.env.DEBUG_MODE ? 0 : 360 * 1000,
    maxFailures: process.env.CI ? 3 : 0,
    retries: process.env.CI ? 2 : 0,
    expect: {
      timeout: 10_000,
    },
    webServer: {
      command: webServerCommand,
      url: baseURL,
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
      cwd: process.cwd().endsWith('e2e-tests') ? '.' : './e2e-tests',
    },
    projects: [
      {
        name: 'chromium-web',
        testMatch:
          process.env.TEST_MODE === 'desktop' ? ([/$^/] as RegExp[]) : undefined,
        use: {
          ...devices['Desktop Chrome'],
          headless: !!(process.env.CI || !process.env.DEBUG_MODE),
        },
      },
    ],
  });
};
