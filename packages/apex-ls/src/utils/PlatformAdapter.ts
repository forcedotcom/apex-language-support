/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Connection } from '../protocol/lsp-types';
import {
  setLoggerFactory,
  setLogNotificationHandler,
} from '@salesforce/apex-lsp-shared';

import { UnifiedLoggerFactory } from './UnifiedLoggerFactory';
import { UnifiedLogNotificationHandler } from './UnifiedLogNotificationHandler';

/**
 * Platform adapter that handles environment-specific initialization
 */
export class PlatformAdapter {
  constructor(private environment: 'node' | 'browser') {}

  /**
   * Initialize logging before connection is available
   */
  initializeLogging(): void {
    // Set the logger factory early
    setLoggerFactory(new UnifiedLoggerFactory(this.environment));
  }

  /**
   * Set up logging with connection-specific handlers
   */
  setupLogging(connection: Connection): void {
    // Set up logging with the connection
    setLogNotificationHandler(
      UnifiedLogNotificationHandler.getInstance(connection, this.environment),
    );
  }
}
