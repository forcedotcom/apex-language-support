/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { LogLevel } from '@salesforce/apex-lsp-logging';

import { TestLogger } from './utils/testLogger';

// Configure test logger for all tests
const logger = TestLogger.getInstance();

// Set default log level based on environment
if (process.env.TEST_LOG_LEVEL) {
  logger.setLogLevel(process.env.TEST_LOG_LEVEL as LogLevel);
} else {
  // Default to Info level in CI, Debug in local development
  logger.setLogLevel(process.env.CI ? LogLevel.Info : LogLevel.Debug);
}

// Log test environment setup
logger.info('Test environment initialized');
logger.debug('Test logger configured with level:', logger.getLogLevel());
