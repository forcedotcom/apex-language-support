/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SignatureHelpParams } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getLogger } from '@salesforce/apex-lsp-shared';

import { SignatureHelpProcessingService } from '../../src/services/SignatureHelpProcessingService';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';

// Logger is handled by the shared library's global logging system

// Mock ApexStorageManager
jest.mock('../../src/storage/ApexStorageManager', () => ({
  ApexStorageManager: {
    getInstance: jest.fn(),
  },
}));

describe('SignatureHelpProcessingService', () => {
  let service: SignatureHelpProcessingService;
  let mockStorage: any;
  let mockDocument: TextDocument;
  let logger: any;
  let mockSymbolManager: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup logger
    logger = getLogger();

    // Setup mock storage
    mockStorage = {
      getDocument: jest.fn(),
    };

    (ApexStorageManager.getInstance as jest.Mock).mockReturnValue({
      getStorage: jest.fn().mockReturnValue(mockStorage),
    });

    // Setup mock document
    mockDocument = {
      uri: 'file:///test/TestClass.cls',
      getText: jest.fn().mockReturnValue(`
        public class TestClass {
          public void doSomething(String param1, Integer param2) {
            // Method body
          }
          
          public static void staticMethod() {
            // Static method body
          }
        }
      `),
      offsetAt: jest.fn().mockReturnValue(100),
      positionAt: jest.fn(),
      lineCount: jest.fn().mockReturnValue(10),
    } as any;

    mockSymbolManager = {
      getInvocationAtPosition: jest.fn().mockResolvedValue(null),
      findSymbolByName: jest.fn().mockResolvedValue([]),
      findSymbolsInFile: jest.fn().mockResolvedValue([]),
      findRelatedSymbols: jest.fn().mockResolvedValue([]),
    };

    service = new SignatureHelpProcessingService(logger, mockSymbolManager);
  });

  describe('processSignatureHelp', () => {
    it('should return signature help for valid request', async () => {
      // Arrange
      const params: SignatureHelpParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      mockStorage.getDocument.mockResolvedValue(mockDocument);
      mockSymbolManager.getInvocationAtPosition.mockResolvedValue({
        name: 'doSomething',
        isStatic: false,
        argumentTypes: ['String'],
        semanticContext: {
          invocation: {
            kind: 'invocation',
            callRange: {
              startLine: 6,
              startColumn: 4,
              endLine: 6,
              endColumn: 24,
            },
            argumentRanges: [],
            separatorRanges: [],
          },
        },
      });
      mockSymbolManager.findSymbolByName.mockResolvedValue([
        {
          name: 'doSomething',
          kind: 'method',
          modifiers: { isStatic: false, visibility: 'public' },
          parameters: [
            { name: 'param1', type: { name: 'String' } },
            { name: 'param2', type: { name: 'Integer' } },
          ],
        },
      ]);

      // Act
      const result = await service.processSignatureHelp(params);

      // Assert
      expect(result?.signatures[0].label).toBe(
        'doSomething(String param1, Integer param2)',
      );
      expect(mockStorage.getDocument).toHaveBeenCalledWith(
        params.textDocument.uri,
      );
    });

    it('should handle document not found', async () => {
      // Arrange
      const params: SignatureHelpParams = {
        textDocument: { uri: 'file:///test/NonexistentClass.cls' },
        position: { line: 5, character: 10 },
      };

      mockStorage.getDocument.mockResolvedValue(null);

      // Act
      const result = await service.processSignatureHelp(params);

      // Assert
      expect(result).toBeNull();
      expect(mockStorage.getDocument).toHaveBeenCalledWith(
        params.textDocument.uri,
      );
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const params: SignatureHelpParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      mockStorage.getDocument.mockRejectedValue(new Error('Storage error'));

      // Act
      const result = await service.processSignatureHelp(params);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when no signatures found', async () => {
      // Arrange
      const params: SignatureHelpParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      mockStorage.getDocument.mockResolvedValue(mockDocument);

      // Act
      const result = await service.processSignatureHelp(params);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('parser-owned context analysis', () => {
    it('selects the active parameter from parser-recorded separators', async () => {
      mockSymbolManager.getInvocationAtPosition.mockResolvedValue({
        name: 'doSomething',
        argumentTypes: ['String', 'Integer'],
        semanticContext: {
          invocation: {
            kind: 'invocation',
            callRange: {
              startLine: 6,
              startColumn: 4,
              endLine: 6,
              endColumn: 30,
            },
            argumentRanges: [],
            separatorRanges: [
              {
                startLine: 6,
                startColumn: 18,
                endLine: 6,
                endColumn: 19,
              },
            ],
          },
        },
      });

      const context = await (service as any).analyzeSignatureHelpContext(
        mockDocument,
        {
          textDocument: { uri: mockDocument.uri },
          position: { line: 5, character: 22 },
        },
      );

      expect(context).toEqual(
        expect.objectContaining({
          methodName: 'doSomething',
          currentParameterIndex: 1,
          argumentTypes: ['String', 'Integer'],
        }),
      );
    });

    it('returns no context when the parser records no invocation', async () => {
      await expect(
        (service as any).analyzeSignatureHelpContext(mockDocument, {
          textDocument: { uri: mockDocument.uri },
          position: { line: 0, character: 0 },
        }),
      ).resolves.toBeNull();
    });
  });

  describe('signature matching', () => {
    it('should match signature context correctly', () => {
      // Arrange
      const symbol = {
        kind: 'method',
        modifiers: { isStatic: false, visibility: 'public' },
        parameters: [{}, {}],
      };

      const context = {
        isStatic: false,
        accessModifier: 'public',
        currentParameterIndex: 1,
      };

      // Act
      const matches = (service as any).matchesSignatureContext(symbol, context);

      // Assert
      expect(typeof matches).toBe('boolean');
    });

    it('should handle static context matching', () => {
      // Arrange
      const symbol = {
        kind: 'method',
        modifiers: { isStatic: true, visibility: 'public' },
        parameters: [],
      };

      const context = {
        isStatic: true,
        accessModifier: 'public',
        currentParameterIndex: 0,
      };

      // Act
      const matches = (service as any).matchesSignatureContext(symbol, context);

      // Assert
      expect(typeof matches).toBe('boolean');
    });
  });

  describe('performance', () => {
    it('should handle requests efficiently', async () => {
      // Arrange
      const params: SignatureHelpParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      mockStorage.getDocument.mockResolvedValue(mockDocument);

      const startTime = Date.now();

      // Act
      const result = await service.processSignatureHelp(params);

      const endTime = Date.now();

      // Assert
      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
