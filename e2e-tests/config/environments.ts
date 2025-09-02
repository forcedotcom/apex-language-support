/**
 * Environment-specific configurations for e2e tests.
 * 
 * Provides different configurations based on the execution environment
 * following TypeScript best practices from .cursor guidelines.
 */

import type { TestEnvironment } from '../types/test.types';
import { BROWSER_ARGS } from '../utils/constants';

/**
 * Gets test environment configuration based on current environment.
 * 
 * @returns Test environment configuration
 */
export const getTestEnvironment = (): TestEnvironment => ({
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI || process.env.DEBUG_MODE ? 1 : undefined, // Sequential in debug mode
  timeout: process.env.CI ? 120_000 : 60_000,
  isCI: Boolean(process.env.CI),
});

/**
 * Gets browser-specific configuration for different environments.
 */
export const getBrowserConfig = () => ({
  launchOptions: {
    args: [
      ...BROWSER_ARGS,
      // In debug mode, add extra args for better stability
      ...(process.env.DEBUG_MODE ? [
        '--no-sandbox',
        '--disable-dev-shm-usage',
      ] : [])
    ],
    headless: process.env.CI || !process.env.DEBUG_MODE ? true : false,
    slowMo: process.env.DEBUG_MODE ? 300 : 0,
  },
});

/**
 * Gets web server configuration for different environments.
 */
export const getWebServerConfig = () => ({
  command: 'npm run test:web:server',
  port: 3000,
  reuseExistingServer: !process.env.CI,
  timeout: 120_000, // 2 minutes for server startup
});