/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Interface for messages that can be correlated between extension and worker
 */
export interface CorrelatedMessage {
  correlationId: string;
  source: 'extension' | 'worker';
  operation: string;
  timestamp: number;
}

/**
 * Generates a unique correlation ID
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Creates a correlated message
 */
export function createCorrelatedMessage(
  operation: string,
  source: 'extension' | 'worker',
  correlationId?: string,
): CorrelatedMessage {
  return {
    correlationId: correlationId || generateCorrelationId(),
    source,
    operation,
    timestamp: Date.now(),
  };
}
