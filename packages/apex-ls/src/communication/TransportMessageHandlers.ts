/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type {
  MessageReader,
  MessageWriter,
  Logger,
  DataCallback,
  PartialMessageInfo,
  Message,
  Event,
} from 'vscode-jsonrpc';
import { ResponseError, ErrorCodes } from 'vscode-jsonrpc';
import type { MessageTransport } from './MessageTransport';
import type { Disposable } from './MessageTransport';

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
