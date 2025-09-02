import { defineConfig, devices } from '@playwright/test';
import { getTestEnvironment, getBrowserConfig, getWebServerConfig } from './environments';

/**
 * Playwright configuration for Apex Language Server Extension e2e tests.
 * 
 * Configures test execution for VS Code Web environment with proper
 * browser settings, timeouts, and CI/CD integration following
 * TypeScript best practices from .cursor guidelines.
 */
const testEnv = getTestEnvironment();
const browserConfig = getBrowserConfig();
const webServerConfig = getWebServerConfig();

export default defineConfig({
  testDir: './tests',
  
  /* Run tests in files in parallel - except in debug mode */
  fullyParallel: !process.env.DEBUG_MODE,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!testEnv.isCI,
  
  /* Retry configuration from environment */
  retries: testEnv.retries,
  
  /* Worker configuration from environment */
  workers: testEnv.workers,
  
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
        ...browserConfig,
        // In debug mode, use the same browser context for all tests
        ...(process.env.DEBUG_MODE && {
          contextOptions: {
            // Try to minimize new browser windows in debug mode
          },
        }),
      },
    },

    // Firefox and WebKit disabled for core tests to avoid browser compatibility issues
    // Use test:e2e:all to run on all browsers if needed
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: webServerConfig,

  /* Test timeout from environment configuration */
  timeout: testEnv.timeout,
  
  /* Global setup and teardown */
  globalSetup: require.resolve('./global-setup.ts'),
  globalTeardown: require.resolve('./global-teardown.ts'),
});