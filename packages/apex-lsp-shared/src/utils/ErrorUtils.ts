/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Normalizes any error-like value into a proper Error instance
 * Handles unknown types, strings, objects, and ensures consistent error handling
 */
export const normalizeError = (error: unknown): Error => {
  // Already an Error instance
  if (error instanceof Error) {
    return error;
  }

  // String error
  if (typeof error === 'string') {
    return new Error(error);
  }

  // Object with message property
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String(error.message);
    const normalizedError = new Error(message);

    // Preserve stack if available
    if ('stack' in error && typeof error.stack === 'string') {
      normalizedError.stack = error.stack;
    }

    // Preserve other properties (including symbol keys)
    const allKeys = [
      ...Object.keys(error),
      ...Object.getOwnPropertySymbols(error),
    ];
    allKeys.forEach((key) => {
      if (key !== 'message' && key !== 'stack') {
        (normalizedError as any)[key] = (error as any)[key];
      }
    });

    return normalizedError;
  }

  // Object with toString method
  if (
    error &&
    typeof error === 'object' &&
    typeof error.toString === 'function'
  ) {
    return new Error(error.toString());
  }

  // Fallback for any other type
  return new Error(String(error));
};

/**
 * Creates a detailed error message string with stack trace and properties
 * @param error - The error to format (any type - will be normalized)
 * @param options - Formatting options
 * @returns Detailed error message string
 */
export const formattedError = (
  error: Error | unknown,
  options: {
    includeStack?: boolean;
    includeProperties?: boolean;
    maxStackLines?: number;
    context?: string;
  } = {},
): string => {
  // Normalize the error to ensure we have a proper Error instance
  const normalizedError = normalizeError(error);

  const {
    includeStack = true,
    includeProperties = true,
    maxStackLines = 10,
    context,
  } = options;

  const parts: string[] = [];

  // Add context if provided
  if (context) {
    parts.push(`[${context}]`);
  }

  // Add main error message
  parts.push(`Error: ${normalizedError.message}`);

  // Add error name if it's not the default "Error"
  if (normalizedError.name && normalizedError.name !== 'Error') {
    parts.push(`Type: ${normalizedError.name}`);
  }

  // Add custom properties if requested
  if (includeProperties) {
    const customProps = Object.getOwnPropertyNames(normalizedError)
      .filter((prop) => !['name', 'message', 'stack'].includes(prop))
      .map((prop) => {
        const value = (normalizedError as any)[prop];
        let stringValue: string;

        try {
          // Handle circular references and special values
          if (value === undefined) {
            stringValue = 'undefined';
          } else if (value === null) {
            stringValue = 'null';
          } else if (typeof value === 'function') {
            stringValue = '[Function]';
          } else if (typeof value === 'object') {
            // Try JSON.stringify with circular reference handling
            try {
              stringValue = JSON.stringify(value);
            } catch {
              stringValue = '[Circular Object]';
            }
          } else {
            stringValue = JSON.stringify(value);
          }
        } catch {
          stringValue = '[Unstringifiable]';
        }

        return `${prop}: ${stringValue}`;
      })
      .join(', ');

    if (customProps) {
      parts.push(`Properties: {${customProps}}`);
    }
  }

  // Add stack trace if requested
  if (includeStack && normalizedError.stack) {
    const stackLines = normalizedError.stack.split('\n');
    const relevantStack =
      maxStackLines > 0
        ? stackLines.slice(0, maxStackLines + 1) // +1 for the error message line
        : stackLines;

    parts.push(`Stack:\n${relevantStack.join('\n')}`);
  }

  return parts.join('\n');
};
