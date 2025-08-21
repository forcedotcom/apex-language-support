/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Platform-agnostic message transport interface
 * 
 * This interface defines the contract for sending and receiving messages
 * between different contexts (browser ↔ worker, client ↔ server, etc.)
 */
export interface MessageTransport {
  /**
   * Sends a message to the target
   */
  send(message: any): Promise<void>;

  /**
   * Sets up message listening
   */
  listen(handler: (message: any) => void): { dispose(): void };

  /**
   * Sets up error handling
   */
  onError(handler: (error: Error) => void): { dispose(): void };

  /**
   * Disposes the transport
   */
  dispose(): void;
}

/**
 * Disposable interface for cleanup
 */
export interface Disposable {
  dispose(): void;
}