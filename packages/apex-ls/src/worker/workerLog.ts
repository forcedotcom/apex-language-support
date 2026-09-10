/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Thin worker-side logging helper. Maps a string level onto the shared logger,
 * so callers don't each repeat the switch. A leaf module (depends only on the
 * shared logger), safe to import from anywhere in the worker graph.
 *
 * Imported with an explicit .ts extension for tsx-in-worker resolution (see
 * runtimeContext.ts for the rationale).
 */

import { getLogger } from '@salesforce/apex-lsp-shared';

export function emitWorkerLog(level: string, message: string): void {
  const logger = getLogger();
  switch (level) {
    case 'debug':
      logger.debug(() => message);
      break;
    case 'info':
      logger.info(() => message);
      break;
    case 'warn':
    case 'warning':
      logger.warn(() => message);
      break;
    case 'error':
      logger.error(() => message);
      break;
  }
}
