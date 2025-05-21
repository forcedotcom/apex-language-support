import { TestLogger } from './utils/testLogger';
import { LogLevel } from '@salesforce/apex-lsp-logging';

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
