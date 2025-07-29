/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { HoverParams } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { HoverProcessingService } from '../../src/services/HoverProcessingService';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';
import {
  ApexSymbolManager,
  SymbolFactory,
  SymbolTable,
  SymbolKind,
  SymbolVisibility,
} from '@salesforce/apex-lsp-parser-ast';

// Mock the storage manager
jest.mock('../../src/storage/ApexStorageManager', () => ({
  ApexStorageManager: {
    getInstance: jest.fn(),
  },
}));

describe('Hover Step 4: Symbol Resolution & Context Analysis Integration Tests', () => {
  let hoverService: HoverProcessingService;
  let symbolManager: ApexSymbolManager;
  let mockStorage: any;

  beforeEach(() => {
    // Create a real symbol manager for integration testing
    symbolManager = new ApexSymbolManager();

    // Create test symbols with different contexts
    const globalClassSymbol = SymbolFactory.createFullSymbol(
      'TestClass',
      SymbolKind.Class,
      {
        startLine: 0,
        startColumn: 1,
        endLine: 9,
        endColumn: 1,
      },
      'TestClass.cls',
      {
        visibility: SymbolVisibility.Global,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
      },
      null,
      { interfaces: [] },
      'TestClass',
    );

    const publicClassSymbol = SymbolFactory.createFullSymbol(
      'AnotherTestClass',
      SymbolKind.Class,
      {
        startLine: 0,
        startColumn: 1,
        endLine: 9,
        endColumn: 1,
      },
      'AnotherTestClass.cls',
      {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
      },
      null,
      { interfaces: [] },
      'AnotherTestClass',
    );

    const staticMethodSymbol = SymbolFactory.createFullSymbol(
      'getValue',
      SymbolKind.Method,
      {
        startLine: 1,
        startColumn: 15,
        endLine: 1,
        endColumn: 22,
      },
      'TestClass.cls',
      {
        visibility: SymbolVisibility.Public,
        isStatic: true,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
      },
      globalClassSymbol.id,
      {
        returnType: { name: 'String', isPrimitive: true, isArray: false },
        parameters: [],
      },
      'TestClass.getValue',
    );

    const instanceMethodSymbol = SymbolFactory.createFullSymbol(
      'getValue',
      SymbolKind.Method,
      {
        startLine: 5,
        startColumn: 15,
        endLine: 5,
        endColumn: 22,
      },
      'TestClass.cls',
      {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
      },
      globalClassSymbol.id,
      {
        returnType: { name: 'Integer', isPrimitive: true, isArray: false },
        parameters: [],
      },
      'TestClass.getValue',
    );

    // Create SymbolTable and add symbols to it
    const symbolTable = new SymbolTable();
    symbolTable.addSymbol(globalClassSymbol);
    symbolTable.addSymbol(staticMethodSymbol);
    symbolTable.addSymbol(instanceMethodSymbol);

    const anotherSymbolTable = new SymbolTable();
    anotherSymbolTable.addSymbol(publicClassSymbol);

    // Register SymbolTables with the symbol manager
    symbolManager.addSymbolTable(symbolTable, 'TestClass.cls');
    symbolManager.addSymbolTable(anotherSymbolTable, 'AnotherTestClass.cls');

    // Set up mock storage
    mockStorage = {
      getDocument: jest.fn(),
    };

    // Mock the storage manager to return our mock storage
    (ApexStorageManager.getInstance as jest.Mock).mockReturnValue({
      getStorage: jest.fn().mockReturnValue(mockStorage),
    });

    // Create mock logger
    const mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
    };

    // Create HoverProcessingService with the real symbol manager
    hoverService = new HoverProcessingService(mockLogger, symbolManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Apex Namespace Context Analysis', () => {
    it('should resolve global class when in global namespace context', async () => {
      const testDocument = TextDocument.create(
        'file://TestClass.cls',
        'apex',
        1,
        `global class TestClass {
  public static String getValue() {
    return 'test';
  }
  
  public Integer getValue() {
    return 42;
  }
}`,
      );

      mockStorage.getDocument.mockResolvedValue(testDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file://TestClass.cls' },
        position: { line: 0, character: 7 }, // Position on 'TestClass' (0-indexed)
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('**Class** TestClass');
        expect(content).toContain('**Modifiers:** global');
      }
    });

    it('should resolve public class when in public namespace context', async () => {
      const testDocument = TextDocument.create(
        'file://AnotherTestClass.cls',
        'apex',
        1,
        `public class AnotherTestClass {
  public void doSomething() {
    // Test method
  }
}`,
      );

      mockStorage.getDocument.mockResolvedValue(testDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file://AnotherTestClass.cls' },
        position: { line: 0, character: 7 }, // Position on 'AnotherTestClass' (0-indexed)
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('**Class** AnotherTestClass');
        expect(content).toContain('**Modifiers:** public');
      }
    });
  });

  describe('Apex Scope Context Analysis', () => {
    it('should resolve static method when in static context', async () => {
      const testDocument = TextDocument.create(
        'file://TestClass.cls',
        'apex',
        1,
        `global class TestClass {
  public static String getValue() {
    return 'test';
  }
  
  public Integer getValue() {
    return 42;
  }
  
  public static void testStatic() {
    getValue(); // This should resolve to static method
  }
}`,
      );

      mockStorage.getDocument.mockResolvedValue(testDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file://TestClass.cls' },
        position: { line: 10, character: 5 }, // Position on 'getValue' in static context (0-indexed)
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('**Method** getValue');
        expect(content).toContain('**Returns:** String');
        expect(content).toContain('**Modifiers:** public, static');
      }
    });

    it('should resolve instance method when in instance context', async () => {
      const testDocument = TextDocument.create(
        'file://TestClass.cls',
        'apex',
        1,
        `global class TestClass {
  public static String getValue() {
    return 'test';
  }
  
  public Integer getValue() {
    return 42;
  }
  
  public void testInstance() {
    getValue(); // This should resolve to instance method
  }
}`,
      );

      mockStorage.getDocument.mockResolvedValue(testDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file://TestClass.cls' },
        position: { line: 10, character: 5 }, // Position on 'getValue' in instance context (0-indexed)
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('**Method** getValue');
        expect(content).toContain('**Returns:** Integer');
        expect(content).not.toContain('static');
      }
    });
  });

  describe('Apex Type Context Analysis', () => {
    it('should resolve symbol based on expected type context', async () => {
      const testDocument = TextDocument.create(
        'file://TestClass.cls',
        'apex',
        1,
        `global class TestClass {
  public static String getValue() {
    return 'test';
  }
  
  public Integer getValue() {
    return 42;
  }
  
  public void testTypeContext() {
    String result = getValue(); // Should resolve to String-returning method
  }
}`,
      );

      mockStorage.getDocument.mockResolvedValue(testDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file://TestClass.cls' },
        position: { line: 8, character: 17 }, // Position on 'getValue' in String context (0-indexed)
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('**Method** getValue');
        expect(content).toContain('**Returns:** String');
      }
    });
  });

  describe('Apex Inheritance Context Analysis', () => {
    it('should resolve symbol based on inheritance context', async () => {
      const testDocument = TextDocument.create(
        'file://TestClass.cls',
        'apex',
        1,
        `global class TestClass extends BaseClass {
  public static String getValue() {
    return 'test';
  }
  
  public Integer getValue() {
    return 42;
  }
}`,
      );

      mockStorage.getDocument.mockResolvedValue(testDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file://TestClass.cls' },
        position: { line: 0, character: 7 }, // Position on 'TestClass' (0-indexed)
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('**Class** TestClass');
        expect(content).toContain('**Extends:** BaseClass');
      }
    });
  });

  describe('Apex Context Integration', () => {
    it('should integrate all context analysis features', async () => {
      const testDocument = TextDocument.create(
        'file://TestClass.cls',
        'apex',
        1,
        `global class TestClass extends BaseClass implements MyInterface {
  public static String getValue() {
    return 'test';
  }
  
  public Integer getValue() {
    return 42;
  }
  
  public static void testIntegration() {
    String result = getValue(); // Should resolve to static String method
  }
}`,
      );

      mockStorage.getDocument.mockResolvedValue(testDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file://TestClass.cls' },
        position: { line: 9, character: 17 }, // Position on 'getValue' in static String context (0-indexed)
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('**Method** getValue');
        expect(content).toContain('**Returns:** String');
        expect(content).toContain('**Modifiers:** public, static');
      }
    });
  });
});
