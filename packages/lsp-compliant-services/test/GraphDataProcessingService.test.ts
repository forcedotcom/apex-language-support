/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  GraphDataProcessingService,
  GraphDataParams,
  GraphDataResponse,
} from '../src/services/GraphDataProcessingService';
import { GraphDataHandler } from '../src/handlers/GraphDataHandler';
import { ApexSymbolManager } from '@salesforce/apex-lsp-parser-ast';
import { SymbolFactory, SymbolKind } from '@salesforce/apex-lsp-parser-ast';
import { getLogger } from '@salesforce/apex-lsp-shared';

describe('GraphDataProcessingService', () => {
  let service: GraphDataProcessingService;
  let symbolManager: ApexSymbolManager;
  let logger: any;

  beforeEach(() => {
    logger = getLogger();
    symbolManager = new ApexSymbolManager();
    service = new GraphDataProcessingService(logger, symbolManager);
  });

  afterEach(() => {
    symbolManager.clear();
  });

  describe('processGraphData', () => {
    test('should return complete graph data when type is "all"', async () => {
      // Add some test symbols
      const classSymbol = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 10,
            endColumn: 0,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 9,
          },
        },
        'file:///test/TestClass.cls',
        {
          visibility: 'public' as any,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
          isBuiltIn: false,
        },
      );

      symbolManager.addSymbol(classSymbol, 'file:///test/TestClass.cls');

      const params: GraphDataParams = { type: 'all' };
      const result: GraphDataResponse = await service.processGraphData(params);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.nodes).toBeDefined();
      expect(result.data.edges).toBeDefined();
      expect(result.metadata.requestType).toBe('all');
      expect(result.metadata.timestamp).toBeGreaterThan(0);
      expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0);
    });

    test('should return file-specific graph data when type is "file"', async () => {
      const classSymbol = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 10,
            endColumn: 0,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 9,
          },
        },
        'file:///test/TestClass.cls',
        {
          visibility: 'public' as any,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
          isBuiltIn: false,
        },
      );

      symbolManager.addSymbol(classSymbol, 'file:///test/TestClass.cls');

      const params: GraphDataParams = {
        type: 'file',
        fileUri: 'file:///test/TestClass.cls',
      };
      const result: GraphDataResponse = await service.processGraphData(params);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect('fileUri' in result.data).toBe(true);
      if ('fileUri' in result.data) {
        expect(result.data.fileUri).toBe('file:///test/TestClass.cls');
      }
      expect(result.metadata.requestType).toBe('file');
    });

    test('should return type-specific graph data when type is "type"', async () => {
      const classSymbol = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 10,
            endColumn: 0,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 9,
          },
        },
        'file:///test/TestClass.cls',
        {
          visibility: 'public' as any,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
          isBuiltIn: false,
        },
      );

      symbolManager.addSymbol(classSymbol, 'file:///test/TestClass.cls');

      const params: GraphDataParams = {
        type: 'type',
        symbolType: 'class',
      };
      const result: GraphDataResponse = await service.processGraphData(params);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect('symbolType' in result.data).toBe(true);
      if ('symbolType' in result.data) {
        expect(result.data.symbolType).toBe('class');
      }
      expect(result.metadata.requestType).toBe('type');
    });

    test('should throw error when fileUri is missing for file type', async () => {
      const params: GraphDataParams = { type: 'file' };

      await expect(service.processGraphData(params)).rejects.toThrow(
        'File URI is required for file graph data',
      );
    });

    test('should throw error when symbolType is missing for type', async () => {
      const params: GraphDataParams = { type: 'type' };

      await expect(service.processGraphData(params)).rejects.toThrow(
        'Symbol type is required for type graph data',
      );
    });

    test('should throw error for unsupported type', async () => {
      const params: GraphDataParams = { type: 'unsupported' as any };

      await expect(service.processGraphData(params)).rejects.toThrow(
        'Unsupported graph data type: unsupported',
      );
    });
  });
});

describe('GraphDataHandler', () => {
  let handler: GraphDataHandler;
  let service: GraphDataProcessingService;
  let symbolManager: ApexSymbolManager;
  let logger: any;

  beforeEach(() => {
    logger = getLogger();
    symbolManager = new ApexSymbolManager();
    service = new GraphDataProcessingService(logger, symbolManager);
    handler = new GraphDataHandler(logger, service);
  });

  afterEach(() => {
    symbolManager.clear();
  });

  describe('handleGraphData', () => {
    test('should handle complete graph data request', async () => {
      const classSymbol = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 10,
            endColumn: 0,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 9,
          },
        },
        'file:///test/TestClass.cls',
        {
          visibility: 'public' as any,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
          isBuiltIn: false,
        },
      );

      symbolManager.addSymbol(classSymbol, 'file:///test/TestClass.cls');

      const result = await handler.handleCompleteGraphData();

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.metadata.requestType).toBe('all');
    });

    test('should handle file graph data request', async () => {
      const classSymbol = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 10,
            endColumn: 0,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 9,
          },
        },
        'file:///test/TestClass.cls',
        {
          visibility: 'public' as any,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
          isBuiltIn: false,
        },
      );

      symbolManager.addSymbol(classSymbol, 'file:///test/TestClass.cls');

      const result = await handler.handleFileGraphData(
        'file:///test/TestClass.cls',
      );

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.metadata.requestType).toBe('file');
    });

    test('should handle type graph data request', async () => {
      const classSymbol = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 10,
            endColumn: 0,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 9,
          },
        },
        'file:///test/TestClass.cls',
        {
          visibility: 'public' as any,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
          isBuiltIn: false,
        },
      );

      symbolManager.addSymbol(classSymbol, 'file:///test/TestClass.cls');

      const result = await handler.handleTypeGraphData('class');

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.metadata.requestType).toBe('type');
    });
  });
});
