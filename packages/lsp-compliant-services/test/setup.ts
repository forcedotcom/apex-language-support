/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Global mock setup for logging and enum utilities
jest.mock('@salesforce/apex-lsp-shared', () => ({
  getLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  }),
  setLogLevel: jest.fn(),
  getLogLevel: jest.fn().mockReturnValue('info'),
  shouldLog: jest.fn().mockReturnValue(true),
  setLoggerFactory: jest.fn(),
  enableConsoleLogging: jest.fn(),
  disableLogging: jest.fn(),
  defineEnum: jest.fn((entries) => {
    const result: any = {};
    entries.forEach(([key, value]: [string, any], index: number) => {
      const val = value !== undefined ? value : index;
      result[key] = val;
      result[val] = key;
    });
    result.keySchema = {
      safeParse: jest.fn().mockReturnValue({ success: true }),
    };
    result.valueSchema = {
      safeParse: jest.fn().mockReturnValue({ success: true }),
    };
    return Object.freeze(result);
  }),
  isValidEnumKey: jest.fn().mockReturnValue(true),
  isValidEnumValue: jest.fn().mockReturnValue(true),
  getEnumKeys: jest.fn().mockReturnValue([]),
  getEnumValues: jest.fn().mockReturnValue([]),
  getEnumEntries: jest.fn().mockReturnValue([]),
  defineOptimizedEnum: jest.fn(),
  getOptimizedEnumKeys: jest.fn().mockReturnValue([]),
  getOptimizedEnumValues: jest.fn().mockReturnValue([]),
  getOptimizedEnumEntries: jest.fn().mockReturnValue([]),
  isValidOptimizedEnumKey: jest.fn().mockReturnValue(true),
  isValidOptimizedEnumValue: jest.fn().mockReturnValue(true),
  calculateOptimizedEnumSavings: jest.fn().mockReturnValue(0),
  compareEnumMemoryUsage: jest.fn().mockReturnValue(0),
  setLogNotificationHandler: jest.fn(),
  getLogNotificationHandler: jest.fn(),
  messageTypeToLogLevel: jest.fn((level) => level),
  // Add any other exports that might be needed
  CompactLocation: jest.fn(),
  toCompactLocation: jest.fn(),
  fromCompactLocation: jest.fn(),
  Uint16: jest.fn(),
  toUint16: jest.fn(),
}));
