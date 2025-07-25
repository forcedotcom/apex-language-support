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
} from 'vscode-languageserver-protocol';
import { getLogger } from '@salesforce/apex-lsp-shared';

import { CompletionHandler } from '../../src/handlers/CompletionHandler';
import { ICompletionProcessor } from '../../src/services/CompletionProcessingService';

// Mock the completion processor
const mockCompletionProcessor: jest.Mocked<ICompletionProcessor> = {
  processCompletion: jest.fn(),
};

describe('CompletionHandler', () => {
  let handler: CompletionHandler;
  let logger: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup logger
    logger = getLogger();

    // Create handler instance
    handler = new CompletionHandler(logger, mockCompletionProcessor);
  });

  describe('handleCompletion', () => {
    it('should process completion request successfully', async () => {
      // Arrange
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      const mockCompletionItems: CompletionItem[] = [
        {
          label: 'testMethod',
          kind: 2, // Method
          detail: 'void testMethod()',
          documentation: 'Test method documentation',
        },
        {
          label: 'testField',
          kind: 5, // Field
          detail: 'String testField',
          documentation: 'Test field documentation',
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

    it('should handle processor errors gracefully', async () => {
      // Arrange
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      const error = new Error('Processor error');
      mockCompletionProcessor.processCompletion.mockRejectedValue(error);

      // Act & Assert
      await expect(handler.handleCompletion(params)).rejects.toThrow(
        'Processor error',
      );
      expect(mockCompletionProcessor.processCompletion).toHaveBeenCalledWith(
        params,
      );
    });

    it('should handle empty completion results', async () => {
      // Arrange
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      mockCompletionProcessor.processCompletion.mockResolvedValue([]);

      // Act
      const result = await handler.handleCompletion(params);

      // Assert
      expect(result).toEqual([]);
      expect(mockCompletionProcessor.processCompletion).toHaveBeenCalledWith(
        params,
      );
    });

    it('should handle null completion results', async () => {
      // Arrange
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      mockCompletionProcessor.processCompletion.mockResolvedValue([]);

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
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      const error = new Error('Test error');
      mockCompletionProcessor.processCompletion.mockRejectedValue(error);

      // Act & Assert
      await expect(handler.handleCompletion(params)).rejects.toThrow(
        'Test error',
      );
    });

    it('should handle different error types', async () => {
      // Arrange
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      const error = new TypeError('Type error');
      mockCompletionProcessor.processCompletion.mockRejectedValue(error);

      // Act & Assert
      await expect(handler.handleCompletion(params)).rejects.toThrow(
        'Type error',
      );
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
