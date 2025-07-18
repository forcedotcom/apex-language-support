/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import type { LogMessageType } from '@salesforce/apex-lsp-logging';

import { TestLogger } from './utils/testLogger';

// Configure test logger for all tests
const logger = TestLogger.getInstance();

// Set default log level based on environment
if (process.env.TEST_LOG_LEVEL) {
  // Convert string env to log level, fallback to info if invalid
  const logLevel = process.env.TEST_LOG_LEVEL as LogMessageType;
  const validLevels: LogMessageType[] = [
    'error',
    'warning',
    'info',
    'log',
    'debug',
  ];
  logger.setLogLevel(validLevels.includes(logLevel) ? logLevel : 'info');
} else {
  // Default to error level for better test performance
  // Use info level in CI for more verbose output when needed
  logger.setLogLevel(process.env.CI ? 'info' : 'error');
}

// Log test environment setup
logger.info('Test environment initialized');
logger.debug(`Test logger configured with level: ${logger.getLogLevel()}`);
