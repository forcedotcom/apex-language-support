/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  SignatureHelpParams,
  SignatureHelp,
} from 'vscode-languageserver-protocol';
import { getLogger } from '@salesforce/apex-lsp-shared';

import { SignatureHelpHandler } from '../../src/handlers/SignatureHelpHandler';
import { ISignatureHelpProcessor } from '../../src/services/SignatureHelpProcessingService';

// Mock the signature help processor
const mockSignatureHelpProcessor: jest.Mocked<ISignatureHelpProcessor> = {
  processSignatureHelp: jest.fn(),
};

describe('SignatureHelpHandler', () => {
  let handler: SignatureHelpHandler;
  let logger: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup logger
    logger = getLogger();

    // Create handler instance
    handler = new SignatureHelpHandler(logger, mockSignatureHelpProcessor);
  });

  describe('handleSignatureHelp', () => {
    it('should process signature help request successfully', async () => {
      // Arrange
      const params: SignatureHelpParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      const mockSignatureHelp: SignatureHelp = {
        signatures: [
          {
            label: 'doSomething(String param1, Integer param2)',
            documentation: 'Test method documentation',
            parameters: [
              {
                label: [0, 1],
                documentation: 'First parameter',
              },
              {
                label: [1, 2],
                documentation: 'Second parameter',
              },
            ],
          },
        ],
        activeSignature: 0,
        activeParameter: 0,
      };

      mockSignatureHelpProcessor.processSignatureHelp.mockResolvedValue(
        mockSignatureHelp,
      );

      // Act
      const result = await handler.handleSignatureHelp(params);

      // Assert
      expect(result).toEqual(mockSignatureHelp);
      expect(
        mockSignatureHelpProcessor.processSignatureHelp,
      ).toHaveBeenCalledWith(params);
    });

    it('should handle processor errors gracefully', async () => {
      // Arrange
      const params: SignatureHelpParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      const error = new Error('Processor error');
      mockSignatureHelpProcessor.processSignatureHelp.mockRejectedValue(error);

      // Act & Assert
      await expect(handler.handleSignatureHelp(params)).rejects.toThrow(
        'Processor error',
      );
      expect(
        mockSignatureHelpProcessor.processSignatureHelp,
      ).toHaveBeenCalledWith(params);
    });

    it('should handle null signature help results', async () => {
      // Arrange
      const params: SignatureHelpParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      mockSignatureHelpProcessor.processSignatureHelp.mockResolvedValue(null);

      // Act
      const result = await handler.handleSignatureHelp(params);

      // Assert
      expect(result).toBeNull();
      expect(
        mockSignatureHelpProcessor.processSignatureHelp,
      ).toHaveBeenCalledWith(params);
    });

    it('should handle empty signature help results', async () => {
      // Arrange
      const params: SignatureHelpParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      const emptySignatureHelp: SignatureHelp = {
        signatures: [],
        activeSignature: 0,
        activeParameter: 0,
      };

      mockSignatureHelpProcessor.processSignatureHelp.mockResolvedValue(
        emptySignatureHelp,
      );

      // Act
      const result = await handler.handleSignatureHelp(params);

      // Assert
      expect(result).toEqual(emptySignatureHelp);
      expect(
        mockSignatureHelpProcessor.processSignatureHelp,
      ).toHaveBeenCalledWith(params);
    });
  });

  describe('error handling', () => {
    it('should log errors appropriately', async () => {
      // Arrange
      const params: SignatureHelpParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      const error = new Error('Test error');
      mockSignatureHelpProcessor.processSignatureHelp.mockRejectedValue(error);

      // Act & Assert
      await expect(handler.handleSignatureHelp(params)).rejects.toThrow(
        'Test error',
      );
    });

    it('should handle different error types', async () => {
      // Arrange
      const params: SignatureHelpParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      const error = new TypeError('Type error');
      mockSignatureHelpProcessor.processSignatureHelp.mockRejectedValue(error);

      // Act & Assert
      await expect(handler.handleSignatureHelp(params)).rejects.toThrow(
        'Type error',
      );
    });
  });

  describe('performance', () => {
    it('should handle requests efficiently', async () => {
      // Arrange
      const params: SignatureHelpParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      const mockSignatureHelp: SignatureHelp = {
        signatures: [
          {
            label: 'doSomething()',
            documentation: 'Test method',
            parameters: [],
          },
        ],
        activeSignature: 0,
        activeParameter: 0,
      };

      mockSignatureHelpProcessor.processSignatureHelp.mockResolvedValue(
        mockSignatureHelp,
      );

      const startTime = Date.now();

      // Act
      const result = await handler.handleSignatureHelp(params);

      const endTime = Date.now();

      // Assert
      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
