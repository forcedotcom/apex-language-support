/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  CompletionParams,
  CompletionItem,
  CompletionItemKind,
} from 'vscode-languageserver-protocol';

import { CompletionHandler } from '../../src/handlers/CompletionHandler';
import { ICompletionProcessor } from '../../src/services/CompletionProcessingService';

// Mock the completion processor
const mockCompletionProcessor: jest.Mocked<ICompletionProcessor> = {
  processCompletion: jest.fn(),
};

describe('CompletionHandler', () => {
  let handler: CompletionHandler;
  let mockLogger: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    // Create handler instance
    handler = new CompletionHandler(mockLogger, mockCompletionProcessor);
  });

  describe('handleCompletion', () => {
    it('should handle processor errors gracefully', async () => {
      // Arrange
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test.cls' },
        position: { line: 0, character: 0 },
      };

      mockCompletionProcessor.processCompletion.mockRejectedValue(
        new Error('Processor error'),
      );

      // Act & Assert
      const result = await handler.handleCompletion(params);
      expect(result).toBeNull();
      expect(mockCompletionProcessor.processCompletion).toHaveBeenCalledWith(
        params,
      );
    });

    it('should return completion items for valid request', async () => {
      // Arrange
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test.cls' },
        position: { line: 0, character: 0 },
      };

      const mockCompletionItems: CompletionItem[] = [
        {
          label: 'testMethod',
          kind: CompletionItemKind.Method,
        },
      ];

      mockCompletionProcessor.processCompletion.mockResolvedValue(
        mockCompletionItems,
      );

      // Act
      const result = await handler.handleCompletion(params);

      // Assert
      expect(result).toEqual(mockCompletionItems);
      expect(mockCompletionProcessor.processCompletion).toHaveBeenCalledWith(
        params,
      );
    });

    it('should handle null completion results', async () => {
      // Arrange
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test.cls' },
        position: { line: 0, character: 0 },
      };

      mockCompletionProcessor.processCompletion.mockResolvedValue(null as any);

      // Act
      const result = await handler.handleCompletion(params);

      // Assert
      expect(result).toBeNull();
      expect(mockCompletionProcessor.processCompletion).toHaveBeenCalledWith(
        params,
      );
    });
  });

  describe('error handling', () => {
    it('should log errors appropriately', async () => {
      // Arrange
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test.cls' },
        position: { line: 0, character: 0 },
      };

      mockCompletionProcessor.processCompletion.mockRejectedValue(
        new Error('Test error'),
      );

      // Act & Assert
      const result = await handler.handleCompletion(params);
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle different error types', async () => {
      // Arrange
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test.cls' },
        position: { line: 0, character: 0 },
      };

      mockCompletionProcessor.processCompletion.mockRejectedValue(
        new TypeError('Type error'),
      );

      // Act & Assert
      const result = await handler.handleCompletion(params);
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('performance', () => {
    it('should handle requests efficiently', async () => {
      // Arrange
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      mockCompletionProcessor.processCompletion.mockResolvedValue([]);

      const startTime = Date.now();

      // Act
      const result = await handler.handleCompletion(params);

      const endTime = Date.now();

      // Assert
      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
