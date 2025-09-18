/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ISymbolManager } from '@salesforce/apex-lsp-parser-ast';
import { LSPRequestType, RequestPriority } from '../queue/LSPRequestQueue';

/**
 * Generic LSP request handler interface
 */
export interface LSPRequestHandler<T = any, R = any> {
  readonly requestType: LSPRequestType;
  readonly priority: RequestPriority;
  readonly timeout: number;
  readonly maxRetries: number;
  process(params: T, symbolManager: ISymbolManager): Promise<R>;
}

/**
 * Service registry for managing LSP request handlers
 * Provides dynamic registration and configuration of request handlers
 */
export class ServiceRegistry {
  private readonly handlers = new Map<LSPRequestType, LSPRequestHandler>();
  private readonly priorities = new Map<LSPRequestType, RequestPriority>();
  private readonly timeouts = new Map<LSPRequestType, number>();
  private readonly retryPolicies = new Map<LSPRequestType, number>();

  /**
   * Register a request handler with optional configuration overrides
   */
  register<T, R>(
    handler: LSPRequestHandler<T, R>,
    config: {
      priority?: RequestPriority;
      timeout?: number;
      maxRetries?: number;
    } = {},
  ): void {
    this.handlers.set(handler.requestType, handler);
    this.priorities.set(
      handler.requestType,
      config.priority || handler.priority,
    );
    this.timeouts.set(handler.requestType, config.timeout || handler.timeout);
    this.retryPolicies.set(
      handler.requestType,
      config.maxRetries || handler.maxRetries,
    );
  }

  /**
   * Get a registered handler for a request type
   */
  getHandler(type: LSPRequestType): LSPRequestHandler | undefined {
    return this.handlers.get(type);
  }

  /**
   * Get the priority for a request type
   */
  getPriority(type: LSPRequestType): RequestPriority {
    return this.priorities.get(type) || 'NORMAL';
  }

  /**
   * Get the timeout for a request type
   */
  getTimeout(type: LSPRequestType): number {
    return this.timeouts.get(type) || 5000;
  }

  /**
   * Get the max retries for a request type
   */
  getMaxRetries(type: LSPRequestType): number {
    return this.retryPolicies.get(type) || 0;
  }

  /**
   * Check if a request type has a registered handler
   */
  hasHandler(type: LSPRequestType): boolean {
    return this.handlers.has(type);
  }

  /**
   * Get all registered request types
   */
  getRegisteredTypes(): LSPRequestType[] {
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
