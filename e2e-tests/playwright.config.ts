import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Apex Language Server Extension e2e tests.
 * These tests verify the extension works correctly in VS Code Web environment.
 */
export default defineConfig({
  testDir: './tests',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on retry */
    video: 'retain-on-failure',
    
    /* Wait for network idle by default for more stable tests */
    waitForSelectorTimeout: 30000,
    
    /* Custom timeout for actions */
    actionTimeout: 15000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Enable debugging features for extension testing
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--enable-logging=stderr',
            '--log-level=0',
            '--v=1',
          ],
        },
      },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run test:web:server',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes for server startup
  },

  /* Test timeout */
  timeout: 60 * 1000, // 1 minute per test
  
  /* Global setup and teardown */
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
});