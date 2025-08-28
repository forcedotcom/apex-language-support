/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type {
  MessageConnection,
  Logger,
  MessageReader,
  MessageWriter,
  DataCallback,
  PartialMessageInfo,
  Message,
  Event,
} from 'vscode-jsonrpc';
import {
  createMessageConnection,
  ResponseError,
  ErrorCodes,
} from 'vscode-jsonrpc';
import type { MessageTransport, Disposable } from '@salesforce/apex-lsp-shared';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Extracts error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (Array.isArray(error)) {
    return error[0]?.message || 'Unknown error';
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
}

/**
 * Creates a standard error handler for message connections
 */
export function createConnectionErrorHandler(
  context: string,
  logger?: Logger,
): (error: [Error, Message | undefined, number | undefined]) => void {
  return (error) => {
    const errorMessage = getErrorMessage(error[0]);
    logger?.error(`${context} message connection error: ${errorMessage}`);
  };
}

/**
 * Creates a standard close handler for message connections
 */
export function createConnectionCloseHandler(
  context: string,
  logger?: Logger,
  onClose?: () => void,
): () => void {
  return () => {
    logger?.info(`${context} message connection closed`);
    onClose?.();
  };
}

// =============================================================================
// TRANSPORT MESSAGE HANDLERS
// =============================================================================

/**
 * Creates a message reader from a transport with enhanced error handling
 */
export function createTransportMessageReader(
  transport: MessageTransport,
  logger?: Logger,
): MessageReader {
  let messageListener: Disposable | undefined;
  let errorListener: Disposable | undefined;
  let closeHandler: (() => void) | undefined;
  let partialMessageHandler: ((info: PartialMessageInfo) => void) | undefined;

  return {
    listen: (callback: DataCallback): Disposable => {
      messageListener = transport.listen((data) => {
        try {
          // Handle partial messages if needed
          if (typeof data === 'string' && data.length >= 1_000_000) {
            if (partialMessageHandler) {
              partialMessageHandler({ messageToken: 1, waitingTime: 0 });
            }
          }
          callback(data);
        } catch (error) {
          logger?.error(
            `Error processing message: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          if (error instanceof Error) {
            const errorHandler = (err: Error) => {
              logger?.error(`Transport error: ${err.message}`);
            };
            transport.onError(errorHandler);
          }
        }
      });
      return messageListener;
    },

    onError: ((listener: (e: Error) => void) => {
      errorListener = transport.onError((error) => {
        listener(error);
      });
      return errorListener;
    }) as Event<Error>,

    onClose: ((listener: () => void) => {
      closeHandler = listener;
      return {
        dispose: () => {
          closeHandler = undefined;
        },
      };
    }) as Event<void>,

    onPartialMessage: ((listener: (info: PartialMessageInfo) => void) => {
      partialMessageHandler = listener;
      return {
        dispose: () => {
          partialMessageHandler = undefined;
        },
      };
    }) as Event<PartialMessageInfo>,

    dispose: () => {
      messageListener?.dispose();
      errorListener?.dispose();
      if (closeHandler) {
        closeHandler();
      }
    },
  };
}

/**
 * Creates a message writer from a transport with enhanced error handling
 */
export function createTransportMessageWriter(
  transport: MessageTransport,
  logger?: Logger,
): MessageWriter {
  let errorHandler:
    | ((error: [Error, Message | undefined, number | undefined]) => void)
    | undefined;
  let closeHandler: (() => void) | undefined;
  let writePending = false;

  return {
    write: async (msg: Message): Promise<void> => {
      try {
        if (writePending) {
          throw new ResponseError(
            ErrorCodes.MessageWriteError,
            'Write operation already in progress',
          );
        }

        writePending = true;
        await transport.send(msg);
        writePending = false;
      } catch (error) {
        writePending = false;
        logger?.error(
          `Error writing message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );

        if (errorHandler) {
          errorHandler([
            error instanceof Error ? error : new Error('Unknown error'),
            msg,
            undefined,
          ]);
        }

        throw error;
      }
    },

    onError: ((
      listener: (e: [Error, Message | undefined, number | undefined]) => void,
    ) => {
      errorHandler = listener;
      return transport.onError((error) => {
        if (errorHandler) {
          errorHandler([error, undefined, undefined]);
        }
      });
    }) as Event<[Error, Message | undefined, number | undefined]>,

    onClose: ((listener: () => void) => {
      closeHandler = listener;
      return {
        dispose: () => {
          closeHandler = undefined;
        },
      };
    }) as Event<void>,

    end: () => {
      if (closeHandler) {
        closeHandler();
      }
    },

    dispose: () => {
      transport.dispose();
    },
  };
}

// =============================================================================
// BASE MESSAGE BRIDGE
// =============================================================================

/**
 * Base class for all message bridge implementations
 * Provides common functionality for creating and managing message connections
 */
export abstract class BaseMessageBridge {
  /**
   * Creates a message connection with standard error and close handlers
   */
  protected createConnection(
    reader: MessageReader,
    writer: MessageWriter,
    context: string,
    logger?: Logger,
    onClose?: () => void,
  ): MessageConnection {
    const connection = createMessageConnection(reader, writer, logger);

    // Set up standard error and close handlers
    connection.onError(createConnectionErrorHandler(context, logger));
    connection.onClose(createConnectionCloseHandler(context, logger, onClose));

    return connection;
  }

  /**
   * Checks if the current environment is supported
   */
  protected abstract isEnvironmentSupported(): boolean;

  /**
   * Throws an error if the environment is not supported
   */
  protected checkEnvironment(environmentName: string): void {
    if (!this.isEnvironmentSupported()) {
      throw new Error(`${environmentName} environment not available`);
    }
  }
}
