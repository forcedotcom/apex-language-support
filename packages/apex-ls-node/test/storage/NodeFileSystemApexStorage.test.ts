/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { promises as fs } from 'fs';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import type { ApexClassInfo, TypeInfo } from '@salesforce/apex-lsp-parser-ast';
import type { ApexReference } from '@salesforce/apex-lsp-compliant-services';

import { NodeFileSystemApexStorage } from '../../src/storage/NodeFileSystemApexStorage';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    access: jest.fn(),
  },
}));

// Mock the logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
};

jest.mock('@salesforce/apex-lsp-shared', () => ({
  getLogger: jest.fn(() => mockLogger),
}));

describe('NodeFileSystemApexStorage', () => {
  let storage: NodeFileSystemApexStorage;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    storage = new NodeFileSystemApexStorage();
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize storage with options', async () => {
      const options = { test: 'option' };
      await storage.initialize(options);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Initializing Node.js storage with options: ${options}`,
      );
    });
  });

  describe('shutdown', () => {
    it('should shutdown storage', async () => {
      await storage.initialize();
      await storage.shutdown();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Shutting down Node.js storage',
      );
    });
  });

  describe('storeAst and retrieveAst', () => {
    it('should store and retrieve AST', async () => {
      await storage.initialize();
      const filePath = 'test.cls';
      const ast: ApexClassInfo[] = [
        {
          name: 'TestClass',
          typeInfo: {
            name: 'TestClass',
            isArray: false,
            isCollection: false,
            isPrimitive: false,
            originalTypeString: 'TestClass',
            getNamespace: () => null,
          },
        },
      ];

      const storeResult = await storage.storeAst(filePath, ast);
      expect(storeResult).toBe(true);

      const retrievedAst = await storage.retrieveAst(filePath);
      expect(retrievedAst).toEqual(ast);
    });

    it('should throw error when not initialized', async () => {
      const filePath = 'test.cls';
      const ast: ApexClassInfo[] = [
        {
          name: 'TestClass',
          typeInfo: {
            name: 'TestClass',
            isArray: false,
            isCollection: false,
            isPrimitive: false,
            originalTypeString: 'TestClass',
            getNamespace: () => null,
          },
        },
      ];

      await expect(storage.storeAst(filePath, ast)).rejects.toThrow(
        'Storage not initialized',
      );
      await expect(storage.retrieveAst(filePath)).rejects.toThrow(
        'Storage not initialized',
      );
    });
  });

  describe('storeTypeInfo and retrieveTypeInfo', () => {
    it('should store and retrieve type info', async () => {
      await storage.initialize();
      const typeName = 'TestType';
      const typeInfo: TypeInfo = {
        name: 'TestType',
        isArray: false,
        isCollection: false,
        isPrimitive: false,
        originalTypeString: 'TestType',
        getNamespace: () => null,
      };

      const storeResult = await storage.storeTypeInfo(typeName, typeInfo);
      expect(storeResult).toBe(true);

      const retrievedTypeInfo = await storage.retrieveTypeInfo(typeName);
      expect(retrievedTypeInfo).toEqual(typeInfo);
    });

    it('should throw error when not initialized', async () => {
      const typeName = 'TestType';
      const typeInfo: TypeInfo = {
        name: 'TestType',
        isArray: false,
        isCollection: false,
        isPrimitive: false,
        originalTypeString: 'TestType',
        getNamespace: () => null,
      };

      await expect(storage.storeTypeInfo(typeName, typeInfo)).rejects.toThrow(
        'Storage not initialized',
      );
      await expect(storage.retrieveTypeInfo(typeName)).rejects.toThrow(
        'Storage not initialized',
      );
    });
  });

  describe('storeReference and findReferences', () => {
    it('should store and find references', async () => {
      await storage.initialize();
      const reference: ApexReference = {
        sourceFile: 'source.cls',
        targetSymbol: 'targetSymbol',
        line: 1,
        column: 1,
        referenceType: 'method-call',
      };

      const storeResult = await storage.storeReference(reference);
      expect(storeResult).toBe(true);

      const referencesTo = await storage.findReferencesTo('targetSymbol');
      expect(referencesTo).toEqual([reference]);

      const referencesFrom = await storage.findReferencesFrom('source.cls');
      expect(referencesFrom).toEqual([reference]);
    });

    it('should throw error when not initialized', async () => {
      const reference: ApexReference = {
        sourceFile: 'source.cls',
        targetSymbol: 'targetSymbol',
        line: 1,
        column: 1,
        referenceType: 'method-call',
      };

      await expect(storage.storeReference(reference)).rejects.toThrow(
        'Storage not initialized',
      );
      await expect(storage.findReferencesTo('targetSymbol')).rejects.toThrow(
        'Storage not initialized',
      );
      await expect(storage.findReferencesFrom('source.cls')).rejects.toThrow(
        'Storage not initialized',
      );
    });
  });

  describe('clearFile', () => {
    it('should clear file data', async () => {
      await storage.initialize();
      const filePath = 'test.cls';
      const ast: ApexClassInfo[] = [
        {
          name: 'TestClass',
          typeInfo: {
            name: 'TestClass',
            isArray: false,
            isCollection: false,
            isPrimitive: false,
            originalTypeString: 'TestClass',
            getNamespace: () => null,
          },
        },
      ];
      const reference: ApexReference = {
        sourceFile: filePath,
        targetSymbol: 'targetSymbol',
        line: 1,
        column: 1,
        referenceType: 'method-call',
      };

      await storage.storeAst(filePath, ast);
      await storage.storeReference(reference);

      const clearResult = await storage.clearFile(filePath);
      expect(clearResult).toBe(true);

      const retrievedAst = await storage.retrieveAst(filePath);
      expect(retrievedAst).toBeNull();

      const referencesFrom = await storage.findReferencesFrom(filePath);
      expect(referencesFrom).toEqual([]);
    });

    it('should throw error when not initialized', async () => {
      await expect(storage.clearFile('test.cls')).rejects.toThrow(
        'Storage not initialized',
      );
    });
  });

  describe('persist', () => {
    it('should persist data', async () => {
      await storage.initialize();
      await storage.persist();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Persisting data to Node.js storage',
      );
    });

    it('should throw error when not initialized', async () => {
      await expect(storage.persist()).rejects.toThrow(
        'Storage not initialized',
      );
    });
  });

  describe('getDocument', () => {
    it('should get document from cache', async () => {
      await storage.initialize();
      const uri = 'file:///test.cls';
      const document = TextDocument.create(uri, 'apex', 0, 'test content');

      // Store document in cache
      (storage as any).documents.set(uri, document);

      const result = await storage.getDocument(uri);
      expect(result).toEqual(document);
      expect(mockFs.readFile).not.toHaveBeenCalled();
    });

    it('should get document from filesystem', async () => {
      await storage.initialize();
      const uri = 'file:///test.cls';
      const content = 'test content';
      mockFs.readFile.mockResolvedValue(content);

      const result = await storage.getDocument(uri);
      expect(result).toBeDefined();
      expect(result!.getText()).toBe(content);
      expect(mockFs.readFile).toHaveBeenCalledWith(
        URI.parse(uri).fsPath,
        'utf-8',
      );
    });

    it('should return null when file read fails', async () => {
      const uri = 'file:///test.apex';
      jest
        .spyOn(fs, 'readFile')
        .mockRejectedValueOnce(new Error('File not found'));
      await storage.initialize();
      const result = await storage.getDocument(uri);
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should throw error when not initialized', async () => {
      await expect(storage.getDocument('test.cls')).rejects.toThrow(
        'Storage not initialized',
      );
    });
  });
});
