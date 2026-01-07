/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LoggerInterface } from '@salesforce/apex-lsp-shared';
import {
  metrics,
  SchedulerMetrics,
  resetLastSentMetrics,
} from '@salesforce/apex-lsp-parser-ast';
import { Effect } from 'effect';

/**
 * Parameters for queue state requests
 */
export interface QueueStateParams {
  /** Include request type breakdown in response */
  includeRequestTypeBreakdown?: boolean;
  /** Include queue utilization in response */
  includeUtilization?: boolean;
  /** Include active task counts in response */
  includeActiveTasks?: boolean;
}

/**
 * Response for queue state requests
 */
export interface QueueStateResponse {
  /** The scheduler metrics */
  metrics: SchedulerMetrics;
  /** Request metadata */
  metadata: {
    timestamp: number;
    processingTime: number;
  };
}

/**
 * Interface for queue state processing functionality
 */
export interface IQueueStateProcessor {
  /**
   * Process a queue state request
   * @param params The queue state parameters
   * @returns Queue state response
   */
  processQueueState(params: QueueStateParams): Promise<QueueStateResponse>;
}

/**
 * Service for processing queue state requests
 */
export class QueueStateProcessingService implements IQueueStateProcessor {
  private readonly logger: LoggerInterface;

  constructor(logger: LoggerInterface) {
    this.logger = logger;
  }

  /**
   * Process a queue state request
   */
  public async processQueueState(
    params: QueueStateParams = {},
  ): Promise<QueueStateResponse> {
    const startTime = Date.now();

    try {
      this.logger.debug(
        `Processing queue state request: ${JSON.stringify(params)}`,
      );

      // Reset lastSentMetricsRef to current metrics so future changes trigger notifications
      // This ensures that when a dashboard opens and requests current state,
      // subsequent metric changes will be sent as notifications
      await Effect.runPromise(resetLastSentMetrics());

      // Get metrics from scheduler
      const schedulerMetrics = await Effect.runPromise(metrics());

      const processingTime = Date.now() - startTime;

      this.logger.debug(
        `Queue state processed successfully in ${processingTime}ms`,
      );

      return {
        metrics: schedulerMetrics,
        metadata: {
          timestamp: Date.now(),
          processingTime,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error processing queue state request: ${errorMessage}`,
      );
      throw error;
    }
  }
}
