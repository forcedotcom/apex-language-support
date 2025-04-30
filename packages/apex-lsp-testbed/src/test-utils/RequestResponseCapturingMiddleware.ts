/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { MessageConnection } from 'vscode-jsonrpc';

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
 * Middleware for capturing LSP requests and responses for testing purposes
 */
export class RequestResponseCapturingMiddleware {
  private capturedRequests: RequestResponsePair[] = [];
  private pendingRequests = new Map<string | number, RequestResponsePair>();
  private connection: MessageConnection | null = null;
  private originalSendRequest: Function | null = null;

  /**
   * Initialize the middleware with a connection
   * @param connection The LSP message connection to instrument
   */
  public install(connection: MessageConnection): void {
    if (this.connection) {
      throw new Error('Middleware already installed on a connection');
    }

    this.connection = connection;
    this.originalSendRequest = connection.sendRequest;
    // Replace the sendRequest method with our instrumented version
    connection.sendRequest =
      this.createInstrumentedSendRequest() as typeof connection.sendRequest;
  }

  /**
   * Uninstall the middleware, restoring the original sendRequest method
   */
  public uninstall(): void {
    if (!this.connection || !this.originalSendRequest) {
      return;
    }

    this.connection.sendRequest = this
      .originalSendRequest as typeof this.connection.sendRequest;
    this.connection = null;
    this.originalSendRequest = null;
  }

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

  /**
   * Create an instrumented version of the sendRequest method that captures requests and responses
   */
  private createInstrumentedSendRequest(): Function {
    // Store the original for use in the instrumented version
    const originalSendRequest = this.originalSendRequest!;
    const middleware = this;

    return function (
      this: MessageConnection,
      method: string,
      params?: any,
      ...additionalArgs: any[]
    ) {
      const id = typeof params?.id === 'number' ? params.id : Date.now();
      const timestamp = Date.now();

      // Create request-response pair and store it
      const requestResponsePair: RequestResponsePair = {
        id,
        method,
        request: params,
        timestamp,
      };

      middleware.pendingRequests.set(id, requestResponsePair);

      // Call the original sendRequest
      return originalSendRequest
        .call(this, method, params, ...additionalArgs)
        .then((response: any) => {
          // Record the response
          if (middleware.pendingRequests.has(id)) {
            const pendingRequest = middleware.pendingRequests.get(id)!;
            pendingRequest.response = response;
            pendingRequest.duration = Date.now() - timestamp;
            middleware.pendingRequests.delete(id);
            middleware.capturedRequests.push(pendingRequest);
          }
          return response;
        })
        .catch((error: any) => {
          // Record the error
          if (middleware.pendingRequests.has(id)) {
            const pendingRequest = middleware.pendingRequests.get(id)!;
            pendingRequest.error = error;
            pendingRequest.duration = Date.now() - timestamp;
            middleware.pendingRequests.delete(id);
            middleware.capturedRequests.push(pendingRequest);
          }
          throw error;
        });
    };
  }

  /**
   * Install the middleware on an ApexJsonRpcClient (json-rpc-2.0 based)
   * This wraps sendRequest and sendNotification to capture requests/responses
   */
  public installOnClient(client: any): void {
    // Patch sendRequest
    const origSendRequest = client.sendRequest?.bind(client);
    if (origSendRequest) {
      client.sendRequest = async (method: string, params: any) => {
        const id = Date.now() + Math.random();
        const timestamp = Date.now();
        const pair: RequestResponsePair = {
          id,
          method,
          request: params,
          timestamp,
        };
        this.pendingRequests.set(id, pair);
        try {
          const response = await origSendRequest(method, params);
          pair.response = response;
          pair.duration = Date.now() - timestamp;
          this.capturedRequests.push(pair);
          this.pendingRequests.delete(id);
          return response;
        } catch (error) {
          pair.error = error;
          pair.duration = Date.now() - timestamp;
          this.capturedRequests.push(pair);
          this.pendingRequests.delete(id);
          throw error;
        }
      };
    }
    // Patch sendNotification (capture as fire-and-forget)
    const origSendNotification = client.sendNotification?.bind(client);
    if (origSendNotification) {
      client.sendNotification = (method: string, params: any) => {
        const id = Date.now() + Math.random();
        const timestamp = Date.now();
        const pair: RequestResponsePair = {
          id,
          method,
          request: params,
          timestamp,
        };
        this.capturedRequests.push(pair);
        origSendNotification(method, params);
      };
    }
  }
}
