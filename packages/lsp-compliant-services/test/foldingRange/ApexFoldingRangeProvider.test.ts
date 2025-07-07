/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TextDocument } from 'vscode-languageserver-textdocument';

import { ApexFoldingRangeProvider } from '../../src/foldingRange/ApexFoldingRangeProvider';
import { ApexStorageInterface } from '../../src/storage/ApexStorageInterface';

// Mock the dependencies
jest.mock('@salesforce/apex-lsp-logging', () => ({
  getLogger: jest.fn(() => ({
    log: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  })),
  LogMessageType: {
    Error: 1,
    Warning: 2,
    Info: 3,
    Log: 4,
    Debug: 5,
  },
}));

jest.mock('../../src/settings/ApexSettingsManager', () => ({
  ApexSettingsManager: {
    getInstance: jest.fn(() => ({
      getCompilationOptions: jest.fn(() => ({})),
    })),
  },
}));

// Mock the CompilerService and related classes to return empty results
jest.mock('@salesforce/apex-lsp-parser-ast', () => ({
  CompilerService: jest.fn().mockImplementation(() => ({
    compile: jest.fn().mockReturnValue({
      errors: [],
      comments: [],
    }),
  })),
  ApexFoldingRangeListener: jest.fn().mockImplementation(() => ({
    getResult: jest.fn().mockReturnValue([]),
  })),
  CommentType: {
    Block: 'Block',
    Line: 'Line',
  },
}));

describe('ApexFoldingRangeProvider', () => {
  let provider: ApexFoldingRangeProvider;
  let mockStorage: jest.Mocked<ApexStorageInterface>;

  beforeEach(() => {
    mockStorage = {
      getDocument: jest.fn(),
      addDocument: jest.fn(),
      removeDocument: jest.fn(),
      hasDocument: jest.fn(),
      getAllDocuments: jest.fn(),
      clear: jest.fn(),
      storeAst: jest.fn(),
      retrieveAst: jest.fn(),
      storeTypeInfo: jest.fn(),
      retrieveTypeInfo: jest.fn(),
      storeReferences: jest.fn(),
      retrieveReferences: jest.fn(),
      storeDefinitions: jest.fn(),
      retrieveDefinitions: jest.fn(),
    } as unknown as jest.Mocked<ApexStorageInterface>;

    provider = new ApexFoldingRangeProvider(mockStorage);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getFoldingRanges', () => {
    it('should return empty array for non-existent document', async () => {
      // Arrange
      const documentUri = 'file:///nonexistent.cls';
      mockStorage.getDocument.mockResolvedValue(null);

      // Act
      const result = await provider.getFoldingRanges(documentUri);

      // Assert
      expect(result).toEqual([]);
      expect(mockStorage.getDocument).toHaveBeenCalledWith(documentUri);
    });

    it('should return empty array when no folding ranges are found', async () => {
      // Arrange
      const apexCode = 'public class Empty {}';
      const documentUri = 'file:///Empty.cls';
      const mockDocument = TextDocument.create(
        documentUri,
        'apex',
        1,
        apexCode,
      );
      mockStorage.getDocument.mockResolvedValue(mockDocument);

      // Act
      const result = await provider.getFoldingRanges(documentUri);

      // Assert
      expect(result).toEqual([]);
      expect(mockStorage.getDocument).toHaveBeenCalledWith(documentUri);
    });

    it('should handle storage errors gracefully', async () => {
      // Arrange
      const documentUri = 'file:///error.cls';
      mockStorage.getDocument.mockRejectedValue(new Error('Storage error'));

      // Act
      const result = await provider.getFoldingRanges(documentUri);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle compiler service errors gracefully', async () => {
      // Arrange
      const apexCode = 'public class Test {}';
      const documentUri = 'file:///Test.cls';
      const mockDocument = TextDocument.create(
        documentUri,
        'apex',
        1,
        apexCode,
      );
      mockStorage.getDocument.mockResolvedValue(mockDocument);

      // Mock the CompilerService to throw an error
      const { CompilerService } = require('@salesforce/apex-lsp-parser-ast');
      const mockCompilerService = {
        compile: jest.fn().mockImplementation(() => {
          throw new Error('Compiler service error');
        }),
      };
      (CompilerService as jest.MockedClass<any>).mockImplementation(
        () => mockCompilerService,
      );

      // Recreate provider to use the new mock
      provider = new ApexFoldingRangeProvider(mockStorage);

      // Act
      const result = await provider.getFoldingRanges(documentUri);

      // Assert
      expect(result).toEqual([]);
    });

    it('should call storage.getDocument with correct URI', async () => {
      // Arrange
      const documentUri = 'file:///TestClass.cls';
      const apexCode = 'public class TestClass {}';
      const mockDocument = TextDocument.create(
        documentUri,
        'apex',
        1,
        apexCode,
      );
      mockStorage.getDocument.mockResolvedValue(mockDocument);

      // Act
      await provider.getFoldingRanges(documentUri);

      // Assert
      expect(mockStorage.getDocument).toHaveBeenCalledWith(documentUri);
      expect(mockStorage.getDocument).toHaveBeenCalledTimes(1);
    });

    it('should handle documents with different file extensions', async () => {
      // Arrange
      const testCases = [
        'file:///TestClass.cls', // Apex class
        'file:///TestTrigger.trigger', // Apex trigger
        'file:///TestApex.apex', // Anonymous Apex source
      ];

      for (const documentUri of testCases) {
        const apexCode = 'public class Test {}';
        const mockDocument = TextDocument.create(
          documentUri,
          'apex',
          1,
          apexCode,
        );
        mockStorage.getDocument.mockResolvedValue(mockDocument);

        // Act
        const result = await provider.getFoldingRanges(documentUri);

        // Assert
        expect(result).toEqual([]);
        expect(mockStorage.getDocument).toHaveBeenCalledWith(documentUri);

        // Reset mock for next iteration
        mockStorage.getDocument.mockReset();
      }
    });

    it('should handle empty document content', async () => {
      // Arrange
      const documentUri = 'file:///Empty.cls';
      const mockDocument = TextDocument.create(documentUri, 'apex', 1, '');
      mockStorage.getDocument.mockResolvedValue(mockDocument);

      // Act
      const result = await provider.getFoldingRanges(documentUri);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle very large documents', async () => {
      // Arrange
      const documentUri = 'file:///Large.cls';
      const largeApexCode =
        'public class Large {\n' + '  // comment\n'.repeat(10000) + '}';
      const mockDocument = TextDocument.create(
        documentUri,
        'apex',
        1,
        largeApexCode,
      );
      mockStorage.getDocument.mockResolvedValue(mockDocument);

      // Act
      const result = await provider.getFoldingRanges(documentUri);

      // Assert
      expect(result).toEqual([]);
      expect(mockStorage.getDocument).toHaveBeenCalledWith(documentUri);
    });

    it('should validate provider instantiation', () => {
      // Arrange & Act
      const newProvider = new ApexFoldingRangeProvider(mockStorage);

      // Assert
      expect(newProvider).toBeInstanceOf(ApexFoldingRangeProvider);
      expect(newProvider).toBeDefined();
    });

    it('should handle concurrent requests', async () => {
      // Arrange
      const documentUri1 = 'file:///Test1.cls';
      const documentUri2 = 'file:///Test2.cls';
      const apexCode = 'public class Test {}';

      const mockDocument1 = TextDocument.create(
        documentUri1,
        'apex',
        1,
        apexCode,
      );
      const mockDocument2 = TextDocument.create(
        documentUri2,
        'apex',
        1,
        apexCode,
      );

      mockStorage.getDocument
        .mockResolvedValueOnce(mockDocument1)
        .mockResolvedValueOnce(mockDocument2);

      // Act
      const [result1, result2] = await Promise.all([
        provider.getFoldingRanges(documentUri1),
        provider.getFoldingRanges(documentUri2),
      ]);

      // Assert
      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
      expect(mockStorage.getDocument).toHaveBeenCalledTimes(2);
      expect(mockStorage.getDocument).toHaveBeenCalledWith(documentUri1);
      expect(mockStorage.getDocument).toHaveBeenCalledWith(documentUri2);
    });
  });

  describe('provider configuration', () => {
    it('should use ApexSettingsManager for compilation options', async () => {
      // Arrange
      const documentUri = 'file:///Test.cls';
      const apexCode = 'public class Test {}';
      const mockDocument = TextDocument.create(
        documentUri,
        'apex',
        1,
        apexCode,
      );
      mockStorage.getDocument.mockResolvedValue(mockDocument);

      const {
        ApexSettingsManager,
      } = require('../../src/settings/ApexSettingsManager');
      const mockGetCompilationOptions = jest.fn().mockReturnValue({});
      ApexSettingsManager.getInstance.mockReturnValue({
        getCompilationOptions: mockGetCompilationOptions,
      });

      // Act
      await provider.getFoldingRanges(documentUri);

      // Assert
      expect(ApexSettingsManager.getInstance).toHaveBeenCalled();
      expect(mockGetCompilationOptions).toHaveBeenCalledWith(
        'foldingRanges',
        apexCode.length,
      );
    });
  });
});
