/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ApexClientMiddleware } from '@salesforce/apex-lsp-client';
import type { Disposable } from '@salesforce/apex-lsp-shared';

import type { ApexLspTestClient } from './ApexLspTestClient';

export interface RequestResponsePair {
  id: string | number;
  method: string;
  request: any;
  response?: any;
  error?: any;
  timestamp: number;
  duration?: number;
}

/**
 * SDK-native middleware for capturing LSP requests and responses for testing.
 *
 * Implements `ApexClientMiddleware` so it can be installed via `client.use(mw)`.
 * Captures both outgoing requests (with their eventual responses/errors)
 * and outgoing notifications as fire-and-forget entries.
 */
export class RequestResponseCapturingMiddleware implements ApexClientMiddleware {
  private capturedRequests: RequestResponsePair[] = [];
  private pendingRequests = new Map<string | number, RequestResponsePair>();
  private disposable: Disposable | null = null;

  /**
   * Install this middleware on an ApexLspTestClient.
   * Returns the Disposable for uninstalling.
   */
  public installOnClient(client: ApexLspTestClient): Disposable {
    this.disposable = client.use(this);
    return this.disposable;
  }

  /**
   * Uninstall the middleware (dispose the registration).
   */
  public uninstall(): void {
    if (this.disposable) {
      this.disposable.dispose();
      this.disposable = null;
    }
  }

  // --- ApexClientMiddleware implementation ---

  sendRequest<P, R>(
    method: string,
    params: P,
    next: (p: P) => Promise<R>,
  ): Promise<R> {
    const id = Date.now() + Math.random();
    const timestamp = Date.now();
    const pair: RequestResponsePair = {
      id,
      method,
      request: params,
      timestamp,
    };
    this.pendingRequests.set(id, pair);

    return next(params).then(
      (response) => {
        pair.response = response;
        pair.duration = Date.now() - timestamp;
        this.capturedRequests.push(pair);
        this.pendingRequests.delete(id);
        return response;
      },
      (error) => {
        pair.error = error;
        pair.duration = Date.now() - timestamp;
        this.capturedRequests.push(pair);
        this.pendingRequests.delete(id);
        throw error;
      },
    );
  }

  sendNotification<P>(method: string, params: P, next: (p: P) => void): void {
    // Call next() first, then record - consistent with request path ordering
    next(params);

    // Record the notification after it's sent (notifications have no response)
    const pair: RequestResponsePair = {
      id: Date.now() + Math.random(),
      method,
      request: params,
      timestamp: Date.now(),
    };
    this.capturedRequests.push(pair);
  }

  // --- Query methods ---

  /**
   * Reset the captured requests
   */
  public clearCapturedRequests(): void {
    this.capturedRequests = [];
    this.pendingRequests.clear();
  }

  /**
   * Get all captured request-response pairs
   */
  public getCapturedRequests(): RequestResponsePair[] {
    return [...this.capturedRequests];
  }

  /**
   * Get captured request-response pairs for a specific method
   * @param method The LSP method name
   */
  public getCapturedRequestsByMethod(method: string): RequestResponsePair[] {
    return this.capturedRequests.filter((pair) => pair.method === method);
  }

  /**
   * Get the most recent request-response pair
   */
  public getLastCapturedRequest(): RequestResponsePair | undefined {
    return this.capturedRequests.length > 0
      ? this.capturedRequests[this.capturedRequests.length - 1]
      : undefined;
  }
}
