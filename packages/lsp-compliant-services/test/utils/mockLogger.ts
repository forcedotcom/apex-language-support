/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import type {
  LogMessageType,
  LoggerInterface,
} from '@salesforce/apex-lsp-shared';
import { vi } from 'vitest';

type LoggerMessage = string | (() => string);

export interface MockLogger extends LoggerInterface {
  log: ReturnType<
    typeof vi.fn<(messageType: LogMessageType, message: LoggerMessage) => void>
  >;
  debug: ReturnType<typeof vi.fn<(message: LoggerMessage) => void>>;
  info: ReturnType<typeof vi.fn<(message: LoggerMessage) => void>>;
  warn: ReturnType<typeof vi.fn<(message: LoggerMessage) => void>>;
  error: ReturnType<typeof vi.fn<(message: LoggerMessage) => void>>;
  alwaysLog: ReturnType<typeof vi.fn<(message: LoggerMessage) => void>>;
}

export const createMockLogger = (): MockLogger => ({
  log: vi.fn<(messageType: LogMessageType, message: LoggerMessage) => void>(),
  debug: vi.fn<(message: LoggerMessage) => void>(),
  info: vi.fn<(message: LoggerMessage) => void>(),
  warn: vi.fn<(message: LoggerMessage) => void>(),
  error: vi.fn<(message: LoggerMessage) => void>(),
  alwaysLog: vi.fn<(message: LoggerMessage) => void>(),
});
