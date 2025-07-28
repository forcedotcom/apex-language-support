/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { createTestLogger } from './utils/testLogger';

// Configure test logger for all tests
const logger = createTestLogger();

// Log test environment setup
logger.info('Test environment initialized');
logger.debug('Test logger configured for debugging');
