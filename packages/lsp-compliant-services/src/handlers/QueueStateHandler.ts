/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LoggerInterface, ApexCapabilitiesManager } from '@salesforce/apex-lsp-shared';
import { dispatch } from '../utils/handlerUtil';
import {
  IQueueStateProcessor,
  QueueStateParams,
  QueueStateResponse,
} from '../services/QueueStateProcessingService';

/**
 * Handler for queue state requests (development mode only)
 */
export class QueueStateHandler {
  constructor(
    private readonly logger: LoggerInterface,
    private readonly queueStateProcessor: IQueueStateProcessor,
    private readonly capabilitiesManager: ApexCapabilitiesManager,
  ) {}

  /**
   * Handle queue state request
   * Only available in development mode
   * @param params The queue state parameters
   * @returns Queue state response
   */
  public async handleQueueState(
    params: QueueStateParams = {},
  ): Promise<QueueStateResponse> {
    // Check if in development mode
    if (this.capabilitiesManager.getMode() !== 'development') {
      throw new Error(
        'Queue state endpoint is only available in development mode',
      );
    }

    this.logger.debug(() => 'Processing queue state request');

    return await dispatch(
      this.queueStateProcessor.processQueueState(params),
      'Error processing queue state request',
    );
  }
}

