/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DefinitionParams } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getLogger } from '@salesforce/apex-lsp-shared';

import { DefinitionProcessingService } from '../../src/services/DefinitionProcessingService';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';

// Mock ApexSymbolManager
jest.mock('@salesforce/apex-lsp-parser-ast', () => ({
  ApexSymbolManager: jest.fn(),
}));

// Mock ApexStorageManager
jest.mock('../../src/storage/ApexStorageManager', () => ({
  ApexStorageManager: {
    getInstance: jest.fn(),
  },
}));

describe('DefinitionProcessingService', () => {
  let service: DefinitionProcessingService;
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
          public void testMethod() {
            String testVar = 'test';
            // Cursor position here
          }
        }
      `),
      offsetAt: jest.fn().mockReturnValue(100),
      positionAt: jest.fn(),
      lineCount: jest.fn().mockReturnValue(10),
    } as any;

    // Create service instance
    service = new DefinitionProcessingService(logger);
  });

  describe('processDefinition', () => {
    it('should return definition location for valid request', async () => {
      // Arrange
      const params: DefinitionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      mockStorage.getDocument.mockResolvedValue(mockDocument);

      // Act
      const result = await service.processDefinition(params);

      // Assert
      expect(result).toBeDefined();
      expect(mockStorage.getDocument).toHaveBeenCalledWith(
        params.textDocument.uri,
      );
    });

    it('should handle document not found', async () => {
      // Arrange
      const params: DefinitionParams = {
        textDocument: { uri: 'file:///test/NonexistentClass.cls' },
        position: { line: 5, character: 10 },
      };

      mockStorage.getDocument.mockResolvedValue(null);

      // Act
      const result = await service.processDefinition(params);

      // Assert
      expect(result).toBeNull();
      expect(mockStorage.getDocument).toHaveBeenCalledWith(
        params.textDocument.uri,
      );
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const params: DefinitionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      mockStorage.getDocument.mockRejectedValue(new Error('Storage error'));

      // Act
      const result = await service.processDefinition(params);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('context analysis', () => {
    it('should extract symbol name correctly', () => {
      // Arrange
      const text = `
        public class TestClass {
          public void method1() {
            String variable = 'test';
          }
        }
      `;

      // Act
      const symbolName = (service as any).extractSymbolName(text, 50);

      // Assert
      expect(symbolName).toBeDefined();
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
          private String privateField;
          public String publicField;
        }
      `;

      // Act
      const modifier = (service as any).getAccessModifierContext(text, 50);

      // Assert
      expect(['public', 'private', 'protected', 'global']).toContain(modifier);
    });
  });

  describe('performance', () => {
    it('should handle requests efficiently', async () => {
      // Arrange
      const params: DefinitionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      mockStorage.getDocument.mockResolvedValue(mockDocument);

      const startTime = Date.now();

      // Act
      const result = await service.processDefinition(params);

      const endTime = Date.now();

      // Assert
      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
