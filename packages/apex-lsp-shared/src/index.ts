/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

export * from './notification';
export {
  setLogNotificationHandler,
  getLogNotificationHandler,
} from './notification';
export type {
  LogMessageType,
  LogMessageParams,
  LogNotificationHandler,
} from './notification';

// Export enum utilities
export * from './enumUtils';

// Export logger functionality
export * from './logger';
