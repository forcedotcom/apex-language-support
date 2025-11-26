/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Priority } from '@salesforce/apex-lsp-shared';
import { ParserTaskType } from './ParserTaskType';
import { ParserTaskHandler } from './ParserTaskHandler';

/**
 * Registry for managing parser task handlers
 * Provides dynamic registration and configuration of task handlers
 */
export class ParserTaskRegistry {
  private readonly handlers = new Map<ParserTaskType, ParserTaskHandler>();
  private readonly priorities = new Map<ParserTaskType, Priority>();
  private readonly timeouts = new Map<ParserTaskType, number>();
  private readonly retryPolicies = new Map<ParserTaskType, number>();

  /**
   * Register a task handler with optional configuration overrides
   */
  register<T, R>(
    handler: ParserTaskHandler<T, R>,
    config: {
      priority?: Priority;
      timeout?: number;
      maxRetries?: number;
    } = {},
  ): void {
    this.handlers.set(handler.taskType, handler);
    this.priorities.set(handler.taskType, config.priority || handler.priority);
    this.timeouts.set(handler.taskType, config.timeout || handler.timeout);
    this.retryPolicies.set(
      handler.taskType,
      config.maxRetries || handler.maxRetries,
    );
  }

  /**
   * Get a registered handler for a task type
   */
  getHandler(type: ParserTaskType): ParserTaskHandler | undefined {
    return this.handlers.get(type);
  }

  /**
   * Get the priority for a task type
   */
  getPriority(type: ParserTaskType): Priority {
    return this.priorities.get(type) || Priority.Normal;
  }

  /**
   * Get the timeout for a task type
   */
  getTimeout(type: ParserTaskType): number {
    return this.timeouts.get(type) || 30000; // Default 30 seconds
  }

  /**
   * Get the max retries for a task type
   */
  getMaxRetries(type: ParserTaskType): number {
    return this.retryPolicies.get(type) || 3;
  }

  /**
   * Check if a task type has a registered handler
   */
  hasHandler(type: ParserTaskType): boolean {
    return this.handlers.has(type);
  }

  /**
   * Get all registered task types
   */
  getRegisteredTypes(): ParserTaskType[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Clear all registered handlers
   */
  clear(): void {
    this.handlers.clear();
    this.priorities.clear();
    this.timeouts.clear();
    this.retryPolicies.clear();
  }
}
