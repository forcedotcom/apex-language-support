/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Mock implementation of apex-lsp-shared

export const getLogger = jest.fn().mockReturnValue({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
});

export const defineEnum = jest.fn((entries: [string, any][]) => {
  const result: any = {};
  entries.forEach(([key, value]) => {
    result[key] = value;
  });
  return result;
});

export const EnumValue = jest.fn();

export const CompactLocation = jest.fn();

export const toCompactLocation = jest.fn((location: any) => location);

export const fromCompactLocation = jest.fn((location: any) => location);

export const Uint16 = jest.fn();

export const toUint16 = jest.fn((value: any) => value);

export const setLogLevel = jest.fn();

export const getLogLevel = jest.fn().mockReturnValue('info');

export const shouldLog = jest.fn().mockReturnValue(true);

export const setLoggerFactory = jest.fn();

export const enableConsoleLogging = jest.fn();

export const disableLogging = jest.fn();

// Add other exports that might be needed
export const defineOptimizedEnum = jest.fn();
export const getOptimizedEnumKeys = jest.fn();
export const getOptimizedEnumValues = jest.fn();
export const getOptimizedEnumEntries = jest.fn();
export const isValidOptimizedEnumKey = jest.fn();
export const isValidOptimizedEnumValue = jest.fn();
export const calculateOptimizedEnumSavings = jest.fn();
export const compareEnumMemoryUsage = jest.fn();
