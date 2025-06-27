/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { LogMessageType } from '@salesforce/apex-lsp-logging';

import { TestLogger } from './utils/testLogger';

// Configure test logger for all tests
const logger = TestLogger.getInstance();

// Set default log level based on environment
if (process.env.TEST_LOG_LEVEL) {
  // Convert string env to number, fallback to Info if invalid
  const logLevel = parseInt(process.env.TEST_LOG_LEVEL, 10);
  logger.setLogLevel(
    logLevel in LogMessageType
      ? (logLevel as LogMessageType)
      : LogMessageType.Info,
  );
} else {
  // Default to Info level in CI, Debug in local development
  logger.setLogLevel(
    process.env.CI ? LogMessageType.Info : LogMessageType.Debug,
  );
}

// Log test environment setup
logger.info('Test environment initialized');
logger.debug(`Test logger configured with level: ${logger.getLogLevel()}`);
