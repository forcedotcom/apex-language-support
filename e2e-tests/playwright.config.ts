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
 * Supports both VS Code Web and Desktop testing environments:
 * - Web mode (default): Tests in browser-based VS Code Web
 * - Desktop mode: Tests with native OS integrations and desktop features
 *
 * Environment Variables:
 * - TEST_MODE: 'web' (default) or 'desktop'
 * - DEBUG_MODE: Enable debug mode with slow motion and headed browser
 * - CI: Enable CI-specific settings (retries, parallel workers, etc.)
 */

const isDesktopMode = process.env.TEST_MODE === 'desktop';
const isDebugMode = !!process.env.DEBUG_MODE;
const isCI = !!process.env.CI;

/**
 * Common browser arguments for all environments
 */
const commonBrowserArgs = [
  '--disable-web-security',
  '--disable-features=VizDisplayCompositor',
  '--enable-logging=stderr',
  '--log-level=0',
  '--v=1',
];

/**
 * CI-specific browser arguments for stability
 */
const ciBrowserArgs = [
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
];

/**
 * Desktop-specific browser arguments for native behavior
 */
const desktopBrowserArgs = [
  '--enable-features=SharedArrayBuffer',
  '--enable-precise-memory-info',
  '--js-flags=--expose-gc',
];

export default defineConfig({
  testDir: './tests',

  // Test execution settings
  fullyParallel: !isDebugMode && !isDesktopMode, // Disable parallel for desktop mode
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // Limit workers to avoid overwhelming the single VS Code Web server.
  // Desktop mode uses 2 workers due to higher resource requirements.
  // Web mode uses 3 workers to balance speed and stability.
  workers: isCI || isDebugMode ? 1 : isDesktopMode ? 2 : 3,

  // Test reporting
  reporter: isCI
    ? [
        ['html', { outputFolder: 'playwright-report' }],
        ['line'],
        ['junit', { outputFile: 'test-results/junit.xml' }],
        ['json', { outputFile: 'test-results/results.json' }],
      ]
    : [['html'], ['line']],

  // Global test settings
  use: {
    baseURL: 'http://localhost:3000',
    trace: isCI ? 'retain-on-failure' : 'on-first-retry',
    screenshot: isCI ? 'on' : 'only-on-failure',
    video: isCI ? 'on' : 'retain-on-failure',
    actionTimeout: 15000,
  },

  // Test projects - different browser/environment configurations
  projects: [
    // ========================================
    // WEB MODE PROJECTS (Default)
    // ========================================
    {
      name: 'chromium-web',
      testMatch: isDesktopMode ? [] : undefined, // Skip in desktop mode
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            ...commonBrowserArgs,
            ...(isCI || isDebugMode ? ciBrowserArgs : []),
          ],
          headless: isCI || !isDebugMode,
          slowMo: isDebugMode ? 300 : 0,
        },
      },
    },
    {
      name: 'firefox-web',
      testMatch: isDesktopMode ? [] : undefined, // Skip in desktop mode
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: {
          args: commonBrowserArgs,
          headless: isCI || !isDebugMode,
          slowMo: isDebugMode ? 300 : 0,
        },
      },
    },

    // ========================================
    // DESKTOP MODE PROJECTS
    // ========================================
    {
      name: 'chromium-desktop',
      testMatch: isDesktopMode ? undefined : [], // Only run in desktop mode
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }, // Larger desktop viewport
        launchOptions: {
          args: [
            ...commonBrowserArgs,
            ...desktopBrowserArgs,
            ...(isCI || isDebugMode ? ciBrowserArgs : []),
          ],
          headless: isCI || !isDebugMode,
          slowMo: isDebugMode ? 300 : 0,
        },
      },
    },
    {
      name: 'firefox-desktop',
      testMatch: isDesktopMode ? undefined : [], // Only run in desktop mode
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          args: [...commonBrowserArgs, ...desktopBrowserArgs],
          headless: isCI || !isDebugMode,
          slowMo: isDebugMode ? 300 : 0,
        },
      },
    },
    {
      name: 'webkit-desktop',
      testMatch: isDesktopMode ? undefined : [], // Only run in desktop mode
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          headless: isCI || !isDebugMode,
          slowMo: isDebugMode ? 300 : 0,
        },
      },
    },

    // ========================================
    // OS-SPECIFIC DESKTOP CONFIGURATIONS
    // ========================================
    {
      name: 'chromium-macos',
      testMatch: isDesktopMode && process.platform === 'darwin' ? undefined : [],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          args: [...commonBrowserArgs, ...desktopBrowserArgs],
          headless: isCI || !isDebugMode,
        },
      },
    },
    {
      name: 'chromium-windows',
      testMatch: isDesktopMode && process.platform === 'win32' ? undefined : [],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          args: [...commonBrowserArgs, ...desktopBrowserArgs],
          headless: isCI || !isDebugMode,
        },
      },
    },
    {
      name: 'chromium-linux',
      testMatch: isDesktopMode && process.platform === 'linux' ? undefined : [],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          args: [...commonBrowserArgs, ...desktopBrowserArgs, ...ciBrowserArgs],
          headless: isCI || !isDebugMode,
        },
      },
    },
  ],

  // Test server configuration
  webServer: {
    command: 'node test-server.js',
    port: 3000,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    cwd: process.cwd().endsWith('e2e-tests') ? '.' : './e2e-tests',
  },

  // Test timeout (longer for desktop mode and CI)
  timeout: isCI ? 180_000 : isDesktopMode ? 120_000 : 60_000,

  // Global setup/teardown
  globalSetup: undefined, // Can add global setup file if needed
  globalTeardown: undefined, // Can add global teardown file if needed

  // Expect settings
  expect: {
    timeout: 10000,
    toHaveScreenshot: {
      maxDiffPixels: 100,
    },
  },
});
