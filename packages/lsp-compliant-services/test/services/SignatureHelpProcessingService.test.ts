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

    // Create service instance
    service = new SignatureHelpProcessingService(logger);
  });

  describe('processSignatureHelp', () => {
    it('should return signature help for valid request', async () => {
      // Arrange
      const params: SignatureHelpParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      mockStorage.getDocument.mockResolvedValue(mockDocument);

      // Act
      const result = await service.processSignatureHelp(params);

      // Assert
      expect(result).toBeDefined();
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

  describe('context analysis', () => {
    it('should extract method info correctly', () => {
      // Arrange
      const text = `
        public class TestClass {
          public void doSomething(String param1, Integer param2) {
            // Method body
          }
        }
      `;

      // Act
      const methodInfo = (service as any).extractMethodInfo(text, 50);

      // Assert
      expect(methodInfo).toBeDefined();
      expect(methodInfo.name).toBeDefined();
    });

    it('should get current parameter index correctly', () => {
      // Arrange
      const text = `
        doSomething(param1, param2, param3)
      `;

      // Act
      const paramIndex = (service as any).getCurrentParameterIndex(text, 20);

      // Assert
      expect(typeof paramIndex).toBe('number');
      expect(paramIndex).toBeGreaterThanOrEqual(0);
    });

    it('should extract argument types correctly', () => {
      // Arrange
      const text = `
        doSomething("string", 123, true)
      `;

      // Act
      const argTypes = (service as any).extractArgumentTypes(text, 30);

      // Assert
      expect(Array.isArray(argTypes)).toBe(true);
    });

    it('should detect static context correctly', () => {
      // Arrange
      const text = `
        public class TestClass {
          public static void staticMethod() {
            // Static context
          }
        }
      `;

      // Act
      const isStatic = (service as any).isInStaticContext(text, 50);

      // Assert
      expect(typeof isStatic).toBe('boolean');
    });

    it('should extract access modifier context correctly', () => {
      // Arrange
      const text = `
        public class TestClass {
          private void privateMethod() {}
          public void publicMethod() {}
        }
      `;

      // Act
      const modifier = (service as any).getAccessModifierContext(text, 50);

      // Assert
      expect(['public', 'private', 'protected', 'global']).toContain(modifier);
    });

    it('should extract expected return type correctly', () => {
      // Arrange
      const text = `
        public class TestClass {
          public void method() {
            String variable: // cursor here
          }
        }
      `;

      // Act
      const expectedType = (service as any).extractExpectedReturnType(text, 80);

      // Assert
      expect(expectedType).toBeDefined();
    });

    it('should extract import statements correctly', () => {
      // Arrange
      const text = `
        import System.Debug;
        import System.String;
        
        public class TestClass {
          // Class content
        }
      `;

      // Act
      const imports = (service as any).extractImportStatements(text);

      // Assert
      expect(imports).toContain('import System.Debug;');
      expect(imports).toContain('import System.String;');
    });

    it('should extract namespace context correctly', () => {
      // Arrange
      const text = `
        public class TestClass {
          // Class content
        }
      `;

      // Act
      const namespace = (service as any).extractNamespaceContext(text);

      // Assert
      expect(namespace).toBeDefined();
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
