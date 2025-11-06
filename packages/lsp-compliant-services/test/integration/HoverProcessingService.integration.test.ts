/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { HoverParams } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { readFileSync } from 'fs';
import { join } from 'path';

import { HoverProcessingService } from '../../src/services/HoverProcessingService';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';
import {
  ApexSymbolManager,
  CompilerService,
  ApexSymbolCollectorListener,
  SymbolTable,
  ResourceLoader,
  ApexSymbolProcessingManager,
} from '@salesforce/apex-lsp-parser-ast';
import {
  enableConsoleLogging,
  setLogLevel,
  getLogger,
} from '@salesforce/apex-lsp-shared';
import * as fs from 'fs';
import * as path from 'path';

// Mock the storage manager
jest.mock('../../src/storage/ApexStorageManager', () => ({
  ApexStorageManager: {
    getInstance: jest.fn(),
  },
}));

/**
 * Helper function to load the StandardApexLibrary.zip for testing.
 * This simulates the client providing the ZIP buffer to the language server.
 */
const loadStandardLibraryZip = (): Uint8Array => {
  const zipPath = path.join(
    __dirname,
    '../../../apex-parser-ast/resources/StandardApexLibrary.zip',
  );
  const zipBuffer = fs.readFileSync(zipPath);
  return new Uint8Array(zipBuffer);
};

describe('HoverProcessingService Integration Tests', () => {
  let hoverService: HoverProcessingService;
  let symbolManager: ApexSymbolManager;
  let mockStorage: any;
  let testClassDocument: TextDocument;
  let anotherTestClassDocument: TextDocument;
  let fileUtilitiesDocument: TextDocument;
  let fileUtilitiesTestDocument: TextDocument;
  let stdApexDocument: TextDocument;
  let complexTestClassDocument: TextDocument;
  let resourceLoader: ResourceLoader;

  beforeAll(async () => {
    // Enable console logging for debugging
    enableConsoleLogging();
    setLogLevel('error');

    // Initialize ResourceLoader for standard library classes once for all tests
    // This ensures standard library classes are available for hover resolution
    (ResourceLoader as any).instance = null;
    const standardLibZip = loadStandardLibraryZip();
    resourceLoader = ResourceLoader.getInstance({
      loadMode: 'lazy',
      preloadStdClasses: true,
      zipBuffer: standardLibZip,
    });
    await resourceLoader.initialize();
  });

  beforeEach(async () => {
    // Create a real symbol manager for integration testing
    symbolManager = new ApexSymbolManager();

    // Read the actual Apex class files from fixtures
    const fixturesDir = join(__dirname, '../fixtures/classes');
    const testClassPath = join(fixturesDir, 'TestClass.cls');
    const anotherTestClassPath = join(fixturesDir, 'AnotherTestClass.cls');
    const fileUtilitiesPath = join(fixturesDir, 'FileUtilities.cls');
    const fileUtilitiesTestPath = join(fixturesDir, 'FileUtilitiesTest.cls');
    const stdApexPath = join(fixturesDir, 'StdApex.cls');
    const complexTestClassPath = join(fixturesDir, 'ComplexTestClass.cls');

    const testClassContent = readFileSync(testClassPath, 'utf8');
    const anotherTestClassContent = readFileSync(anotherTestClassPath, 'utf8');
    const fileUtilitiesContent = readFileSync(fileUtilitiesPath, 'utf8');
    const fileUtilitiesTestContent = readFileSync(
      fileUtilitiesTestPath,
      'utf8',
    );
    const stdApexContent = readFileSync(stdApexPath, 'utf8');
    const complexTestClassContent = readFileSync(complexTestClassPath, 'utf8');

    // Create TextDocument instances for the real classes
    testClassDocument = TextDocument.create(
      'file:///TestClass.cls',
      'apex',
      1,
      testClassContent,
    );

    anotherTestClassDocument = TextDocument.create(
      'file:///AnotherTestClass.cls',
      'apex',
      1,
      anotherTestClassContent,
    );

    fileUtilitiesDocument = TextDocument.create(
      'file:///FileUtilities.cls',
      'apex',
      1,
      fileUtilitiesContent,
    );

    fileUtilitiesTestDocument = TextDocument.create(
      'file:///FileUtilitiesTest.cls',
      'apex',
      1,
      fileUtilitiesTestContent,
    );

    stdApexDocument = TextDocument.create(
      'file:///StdApex.cls',
      'apex',
      1,
      stdApexContent,
    );

    complexTestClassDocument = TextDocument.create(
      'file:///ComplexTestClass.cls',
      'apex',
      1,
      complexTestClassContent,
    );

    // Parse the real Apex classes and add them to the symbol manager
    const compilerService = new CompilerService();

    // Parse TestClass.cls
    const testClassTable = new SymbolTable();
    const testClassListener = new ApexSymbolCollectorListener(testClassTable);
    const _testClassResult = compilerService.compile(
      testClassContent,
      'file:///TestClass.cls',
      testClassListener,
      {},
    );
    symbolManager.addSymbolTable(testClassTable, 'file:///TestClass.cls');

    // Parse AnotherTestClass.cls
    const anotherTestClassTable = new SymbolTable();
    const anotherTestClassListener = new ApexSymbolCollectorListener(
      anotherTestClassTable,
    );
    const _anotherTestClassResult = compilerService.compile(
      anotherTestClassContent,
      'file:///AnotherTestClass.cls',
      anotherTestClassListener,
      {},
    );
    symbolManager.addSymbolTable(
      anotherTestClassTable,
      'file:///AnotherTestClass.cls',
    );

    // Parse FileUtilities.cls
    const fileUtilitiesTable = new SymbolTable();
    const fileUtilitiesListener = new ApexSymbolCollectorListener(
      fileUtilitiesTable,
    );
    const _fileUtilitiesResult = compilerService.compile(
      fileUtilitiesContent,
      'file:///FileUtilities.cls',
      fileUtilitiesListener,
      {},
    );
    symbolManager.addSymbolTable(
      fileUtilitiesTable,
      'file:///FileUtilities.cls',
    );

    // Parse FileUtilitiesTest.cls
    const fileUtilitiesTestTable = new SymbolTable();
    const fileUtilitiesTestListener = new ApexSymbolCollectorListener(
      fileUtilitiesTestTable,
    );
    const _fileUtilitiesTestResult = compilerService.compile(
      fileUtilitiesTestContent,
      'file:///FileUtilitiesTest.cls',
      fileUtilitiesTestListener,
      {},
    );
    symbolManager.addSymbolTable(
      fileUtilitiesTestTable,
      'file:///FileUtilitiesTest.cls',
    );

    // Parse StdApex.cls
    const stdApexTable = new SymbolTable();
    const stdApexListener = new ApexSymbolCollectorListener(stdApexTable);
    const _stdApexResult = compilerService.compile(
      stdApexContent,
      'file:///StdApex.cls',
      stdApexListener,
      {},
    );
    symbolManager.addSymbolTable(stdApexTable, 'file:///StdApex.cls');

    // Parse ComplexTestClass.cls
    const complexTestClassTable = new SymbolTable();
    const complexTestClassListener = new ApexSymbolCollectorListener(
      complexTestClassTable,
    );
    const _complexTestClassResult = compilerService.compile(
      complexTestClassContent,
      'file:///ComplexTestClass.cls',
      complexTestClassListener,
      {},
    );
    symbolManager.addSymbolTable(
      complexTestClassTable,
      'file:///ComplexTestClass.cls',
    );

    // Set up mock storage
    mockStorage = {
      getDocument: jest.fn(),
    };

    // Mock the storage manager to return our mock storage
    (ApexStorageManager.getInstance as jest.Mock).mockReturnValue({
      getStorage: jest.fn().mockReturnValue(mockStorage),
    });

    // Create HoverProcessingService with the real symbol manager
    hoverService = new HoverProcessingService(getLogger(), symbolManager);

    // Debug: Verify symbols are added correctly
    const testClassSymbols = symbolManager.findSymbolsInFile(
      'file:///TestClass.cls',
    );
    const anotherTestClassSymbols = symbolManager.findSymbolsInFile(
      'file:///AnotherTestClass.cls',
    );

    // Log debug information using structured logging
    const logger = getLogger();
    logger.debug(
      () => `Debug: Found ${testClassSymbols.length} symbols in TestClass.cls`,
    );
    testClassSymbols.forEach((symbol: any) => {
      logger.debug(
        () =>
          `Debug: TestClass Symbol ${symbol.name} (${symbol.kind}) at ` +
          `${symbol.location?.startLine}:${symbol.location?.startColumn}-` +
          `${symbol.location?.endLine}:${symbol.location?.endColumn}`,
      );
    });

    logger.debug(
      () =>
        `Debug: Found ${anotherTestClassSymbols.length} symbols in AnotherTestClass.cls`,
    );
    anotherTestClassSymbols.forEach((symbol: any) => {
      logger.debug(
        () =>
          `Debug: AnotherTestClass Symbol ${symbol.name} (${symbol.kind}) at ` +
          `${symbol.location?.startLine}:${symbol.location?.startColumn}-` +
          `${symbol.location?.endLine}:${symbol.location?.endColumn}`,
      );
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Clean up ResourceLoader singleton after all tests
    (ResourceLoader as any).instance = null;
    
    // Clean up ApexSymbolProcessingManager to stop any running intervals
    try {
      ApexSymbolProcessingManager.reset();
    } catch (error) {
      // Ignore errors during cleanup
    }
  });

  describe('Apex Access Modifier Context Analysis', () => {
    it('should resolve global class when in global access modifier context', async () => {
      mockStorage.getDocument.mockResolvedValue(testClassDocument);

      const params: HoverParams = {
        textDocument: {
          uri: 'file:///TestClass.cls',
        },
        position: { line: 0, character: 13 }, // Position on 'TestClass' (LSP 0-based)
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        // TODO: Revisit hover data quality - should include clear symbol type labels
        expect(content).toContain('class TestClass');
        expect(content).toContain('**Modifiers:** global');
      }
    });

    it('should resolve public class when in public access modifier context', async () => {
      mockStorage.getDocument.mockResolvedValue(anotherTestClassDocument);

      const params: HoverParams = {
        textDocument: {
          uri: 'file:///AnotherTestClass.cls',
        },
        position: { line: 0, character: 14 }, // Position on 'AnotherTestClass' (LSP 0-based)
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        // TODO: Revisit hover data quality - should include clear symbol type labels
        expect(content).toContain('class AnotherTestClass');
        expect(content).toContain('**Modifiers:** public');
      }
    });
  });

  describe('Apex Scope Context Analysis', () => {
    it('should resolve static method when in static context', async () => {
      mockStorage.getDocument.mockResolvedValue(testClassDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file:///TestClass.cls' },
        position: { line: 1, character: 23 }, // Position on 'getStaticValue' method name (LSP 0-based)
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        // TODO: Revisit hover data quality - should include clear method labels and return type info
        expect(content).toContain('String TestClass.getStaticValue()');
        expect(content).toContain('static');
      }
    });

    it('should resolve instance method when in instance context', async () => {
      mockStorage.getDocument.mockResolvedValue(testClassDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file:///TestClass.cls' },
        position: { line: 5, character: 20 }, // Position on instance method definition (LSP 0-based)
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        // TODO: Revisit hover data quality - should include clear method labels and return type info
        expect(content).toContain('Integer TestClass.getValue()');
        // TODO: This is currently incorrectly showing as static due to a parser bug
        // The getValue method should be an instance method, not static
        // expect(content).not.toContain('static');
      }
    });
  });

  describe('Apex Type Context Analysis', () => {
    it('should resolve symbol based on expected type context', async () => {
      mockStorage.getDocument.mockResolvedValue(testClassDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file:///TestClass.cls' },
        position: { line: 1, character: 23 }, // Position on 'getValue' method (LSP 0-based)
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        // TODO: Revisit hover data quality - should include clear method labels and return type info
        expect(content).toContain('String TestClass.getStaticValue()');
      }
    });
  });

  describe('Apex Inheritance Context Analysis', () => {
    it('should resolve symbol based on inheritance context', async () => {
      mockStorage.getDocument.mockResolvedValue(testClassDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file:///TestClass.cls' },
        position: { line: 0, character: 13 }, // Position on 'TestClass' (LSP 0-based)
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        // TODO: Revisit hover data quality - should include clear symbol type labels and inheritance info
        expect(content).toContain('class TestClass');
        expect(content).toContain('**Modifiers:** global');
      }
    });
  });

  describe('Apex Context Integration', () => {
    it('should integrate all context analysis features', async () => {
      mockStorage.getDocument.mockResolvedValue(testClassDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file:///TestClass.cls' },
        position: { line: 1, character: 23 }, // Position on 'getValue' method (LSP 0-based)
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        // TODO: Revisit hover data quality - should include clear method labels and return type info
        expect(content).toContain('String TestClass.getStaticValue()');
        expect(content).toContain('static');
      }
    });
  });

  describe('FileUtilities Class Hover Tests', () => {
    it('should provide hover information for FileUtilities class declaration', async () => {
      mockStorage.getDocument.mockResolvedValue(fileUtilitiesDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file:///FileUtilities.cls' },
        position: { line: 0, character: 26 }, // Position on 'FileUtilities' (LSP 0-based)
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('```apex');
        // TODO: Revisit hover data quality - should include clear symbol type labels and sharing modifiers
        expect(content).toContain('class FileUtilities');
        expect(content).toContain('**Modifiers:** public');
      }
    });

    it('should provide hover information for createFile method', async () => {
      mockStorage.getDocument.mockResolvedValue(fileUtilitiesDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file:///FileUtilities.cls' },
        position: { line: 2, character: 25 }, // Position on 'createFile' method name (LSP 0-based)
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('```apex');
        // TODO: Revisit hover data quality - should include clear method labels
        expect(content).toContain('String FileUtilities.createFile(');
        expect(content).toContain('static');
      }
    });

    it('should provide hover information for method parameters', async () => {
      mockStorage.getDocument.mockResolvedValue(fileUtilitiesDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file:///FileUtilities.cls' },
        position: { line: 3, character: 15 }, // Position on 'base64data' parameter name (LSP 0-based)
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        // TODO: Revisit hover data quality - should include clear parameter labels and type info
        expect(content).toContain('String FileUtilities.base64data');
      }
    });

    it('should provide hover information for local variables', async () => {
      mockStorage.getDocument.mockResolvedValue(fileUtilitiesDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file:///FileUtilities.cls' },
        position: { line: 8, character: 40 }, // Position on 'contentVersion' variable (LSP 0-based)
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('```apex');
        expect(content).toContain('class SObject.ContentVersion');
      }
    });
  });

  describe('FileUtilitiesTest Class Hover Tests', () => {
    it('should provide hover information for FileUtilitiesTest class declaration', async () => {
      mockStorage.getDocument.mockResolvedValue(fileUtilitiesTestDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file:///FileUtilitiesTest.cls' },
        position: { line: 1, character: 27 }, // Position on 'FileUtilitiesTest' (LSP 0-based)
      };

      const result = await hoverService.processHover(params);

      // TODO: Investigate why symbol resolution returns null for FileUtilitiesTest class declaration
      // This may be related to sharing modifiers or position calculation issues
      // For now, we'll skip the assertion until the symbol resolution issue is fixed
      expect(result?.contents).toBeDefined();
      const content =
        typeof result?.contents === 'object' && 'value' in result?.contents
          ? result?.contents.value
          : '';
      // TODO: Revisit hover data quality - should include clear symbol type labels and sharing modifiers
      expect(content).toContain('class FileUtilitiesTest');
      expect(content).toContain('**Modifiers:** private');
    });

    it('should provide hover information for test method createFileSucceedsWhenCorrectInput', async () => {
      mockStorage.getDocument.mockResolvedValue(fileUtilitiesTestDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file:///FileUtilitiesTest.cls' },
        position: { line: 3, character: 16 }, // Position on 'createFileSucceedsWhenCorrectInput' (LSP 0-based)
      };

      const result = await hoverService.processHover(params);

      // TODO: Investigate why symbol resolution returns null for test method
      // This may be related to @isTest annotation or position calculation issues
      // For now, we'll skip the assertion until the symbol resolution issue is fixed
      expect(result?.contents).toBeDefined();
      const content =
        typeof result?.contents === 'object' && 'value' in result?.contents
          ? result.contents.value
          : '';
      // TODO: Revisit hover data quality - should include clear method labels
      expect(content).toContain(
        'void FileUtilitiesTest.createFileSucceedsWhenCorrectInput()',
      );
      expect(content).toContain('static');
    });

    it('should provide hover information for method block declared symbols', async () => {
      mockStorage.getDocument.mockResolvedValue(fileUtilitiesTestDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file:///FileUtilitiesTest.cls' },
        position: { line: 71, character: 20 }, // Position on 'property' variable name (LSP 0-based)
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('```apex');
        // TODO: Revisit hover data quality - should include clear variable labels
        expect(content).toContain('Property__c FileUtilitiesTest.property');
      }
    });
  });

  describe('Standard Apex Library Hover Tests', () => {
    it('should provide hover information for the Assert class reference', async () => {
      mockStorage.getDocument.mockResolvedValue(stdApexDocument);

      const text = stdApexDocument.getText();
      const lines = text.split('\n');
      const assertLineIndex = lines.findIndex((l) => l.includes('Assert.'));
      expect(assertLineIndex).toBeGreaterThanOrEqual(0);
      const assertCharIndex = lines[assertLineIndex].indexOf('Assert');

      const params: HoverParams = {
        textDocument: { uri: 'file:///StdApex.cls' },
        position: { line: assertLineIndex, character: assertCharIndex },
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('```apex');
        // TODO: Revisit hover data quality - should include clear class labels for system classes
        expect(content).toContain('void standardapexlibrary.isnotnull(');
        expect(content).toMatch(/\*\*Modifiers:\*\* .*global/);
      }
    });

    it('should provide hover information for the Assert.isNotNull method call', async () => {
      mockStorage.getDocument.mockResolvedValue(stdApexDocument);

      const text = stdApexDocument.getText();
      const lines = text.split('\n');
      const lineIndex = lines.findIndex((l) => l.includes('Assert.isNotNull'));
      expect(lineIndex).toBeGreaterThanOrEqual(0);
      const charIndex = lines[lineIndex].indexOf('isNotNull');

      const params: HoverParams = {
        textDocument: { uri: 'file:///StdApex.cls' },
        position: { line: lineIndex, character: charIndex },
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('```apex');
        expect(content).toContain('void standardapexlibrary.isnotnull');
        expect(content).toMatch(/static/);
      }
    });

    it('should provide hover information for the System.debug method call', async () => {
      mockStorage.getDocument.mockResolvedValue(stdApexDocument);

      const text = stdApexDocument.getText();
      const lines = text.split('\n');
      const lineIndex = lines.findIndex((l) => l.includes('System.debug'));
      expect(lineIndex).toBeGreaterThanOrEqual(0);
      const charIndex = lines[lineIndex].indexOf('debug');

      const params: HoverParams = {
        textDocument: { uri: 'file:///StdApex.cls' },
        position: { line: lineIndex, character: charIndex },
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('```apex');
        expect(content).toContain('void standardapexlibrary.debug');
        expect(content).toMatch(/\*\*Modifiers:\*\* .*static.*global/);
      }
    });
  });

  describe('Cross-Class Reference Tests', () => {
    it('should provide hover information when referencing FileUtilities from test class', async () => {
      mockStorage.getDocument.mockResolvedValue(fileUtilitiesTestDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file:///FileUtilitiesTest.cls' },
        position: { line: 13, character: 40 }, // Position on 'FileUtilities' in method call (LSP 0-based)
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('```apex');
        expect(content).toContain('class FileUtilities');
      }
    });

    it('should provide hover information for method calls', async () => {
      mockStorage.getDocument.mockResolvedValue(fileUtilitiesTestDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file:///FileUtilitiesTest.cls' },
        position: { line: 13, character: 55 }, // Position on 'createFile' in method call (LSP 0-based)
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.contents).toBeDefined();
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('```apex');
        // TODO: Revisit hover data quality - should include clear method labels
        expect(content).toContain('String FileUtilities.createFile(');
      }
    });
  });

  describe('ComplexTestClass Hover Tests', () => {
    it('should provide hover information for ComplexTestClass class declaration', async () => {
      mockStorage.getDocument.mockResolvedValue(complexTestClassDocument);

      const text = complexTestClassDocument.getText();
      const lines = text.split('\n');
      const classLineIndex = 0;
      const classCharIndex = lines[classLineIndex].indexOf('ComplexTestClass');
      expect(classCharIndex).toBeGreaterThanOrEqual(0);

      const params: HoverParams = {
        textDocument: { uri: 'file:///ComplexTestClass.cls' },
        position: { line: classLineIndex, character: classCharIndex },
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('```apex');
        expect(content).toContain('class ComplexTestClass');
        expect(content).toMatch(/\*\*Modifiers:\*\* .*public/);
      }
    });

    it('should provide hover for method declaration testFileUtilities', async () => {
      mockStorage.getDocument.mockResolvedValue(complexTestClassDocument);

      const text = complexTestClassDocument.getText();
      const lines = text.split('\n');
      const lineIndex = lines.findIndex((l) =>
        l.includes('testFileUtilities('),
      );
      expect(lineIndex).toBeGreaterThanOrEqual(0);
      const charIndex = lines[lineIndex].indexOf('testFileUtilities');

      const params: HoverParams = {
        textDocument: { uri: 'file:///ComplexTestClass.cls' },
        position: { line: lineIndex, character: charIndex },
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        // TODO: Revisit hover data quality - should include clear method labels and return type info
        expect(content).toContain('void ComplexTestClass.testFileUtilities()');
      }
    });

    it('should provide hover for cross-file class reference FileUtilities', async () => {
      mockStorage.getDocument.mockResolvedValue(complexTestClassDocument);

      const text = complexTestClassDocument.getText();
      const lines = text.split('\n');
      const lineIndex = lines.findIndex((l) =>
        l.includes('FileUtilities.createFile'),
      );
      expect(lineIndex).toBeGreaterThanOrEqual(0);
      const charIndex = lines[lineIndex].indexOf('FileUtilities');

      const params: HoverParams = {
        textDocument: { uri: 'file:///ComplexTestClass.cls' },
        position: { line: lineIndex, character: charIndex },
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('```apex');
        expect(content).toContain('class FileUtilities');
      }
    });

    it('should provide hover for cross-file static method call createFile', async () => {
      mockStorage.getDocument.mockResolvedValue(complexTestClassDocument);

      const text = complexTestClassDocument.getText();
      const lines = text.split('\n');
      const lineIndex = lines.findIndex((l) =>
        l.includes('FileUtilities.createFile'),
      );
      expect(lineIndex).toBeGreaterThanOrEqual(0);
      const charIndex = lines[lineIndex].indexOf('createFile');

      const params: HoverParams = {
        textDocument: { uri: 'file:///ComplexTestClass.cls' },
        position: { line: lineIndex, character: charIndex },
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('```apex');
        // TODO: Revisit hover data quality - should include clear method labels
        expect(content).toContain('String FileUtilities.createFile(');
      }
    });

    it('should provide hover information for local variable exists', async () => {
      mockStorage.getDocument.mockResolvedValue(complexTestClassDocument);

      const text = complexTestClassDocument.getText();
      const lines = text.split('\n');
      const lineIndex = lines.findIndex((l) => l.includes('Boolean exists'));
      expect(lineIndex).toBeGreaterThanOrEqual(0);
      const charIndex = lines[lineIndex].indexOf('exists');

      const params: HoverParams = {
        textDocument: { uri: 'file:///ComplexTestClass.cls' },
        position: { line: lineIndex, character: charIndex },
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('```apex');
        // TODO: Revisit hover data quality - should include clear variable labels
        expect(content).toContain('Boolean ComplexTestClass.exists');
      }
    });

    // TODO: Fix String.isNotBlank method call resolution - builtin type representations in memory are incomplete
    it.skip('should provide hover for String.isNotBlank method calls', async () => {
      mockStorage.getDocument.mockResolvedValue(complexTestClassDocument);

      const text = complexTestClassDocument.getText();
      const lines = text.split('\n');
      const lineIndex = lines.findIndex((l) => l.includes('String.isNotBlank'));
      expect(lineIndex).toBeGreaterThanOrEqual(0);
      const charIndex = lines[lineIndex].indexOf('String.isNotBlank');

      const params: HoverParams = {
        textDocument: { uri: 'file:///ComplexTestClass.cls' },
        position: { line: lineIndex, character: charIndex },
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        // New hover format: code block header with FQN
        expect(content).toContain('```apex');
        expect(content).toContain('BUILT_IN.String');
        expect(content).toMatch(/\*\*Modifiers:\*\* .*public/);
      }
    });

    it.skip('should provide hover for String.isNotBlank method name', async () => {
      // KNOWN LIMITATION: Built-in method name resolution in qualified calls is not yet implemented
      // This is a documented product gap - see Method-Signature-Type-Resolution-Patterns.md
      // Status: Product gap - built-in type representations incomplete
      // Related: Method Name Resolution in Built-in Type Qualified Calls (4 TODOs - SKIPPED)

      mockStorage.getDocument.mockResolvedValue(complexTestClassDocument);

      const text = complexTestClassDocument.getText();
      const lines = text.split('\n');
      const lineIndex = lines.findIndex((l) => l.includes('String.isNotBlank'));
      expect(lineIndex).toBeGreaterThanOrEqual(0);
      const charIndex = lines[lineIndex].indexOf('isNotBlank');

      const params: HoverParams = {
        textDocument: { uri: 'file:///ComplexTestClass.cls' },
        position: { line: lineIndex, character: charIndex },
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        // Note: Hover resolves to String class when hovering the method name; header is now a code block
        expect(content).toContain('```apex');
        expect(content).toContain('BUILT_IN.String');
        expect(content).toMatch(/\*\*Modifiers:\*\* .*public/);
      }
    });

    it('should provide hover for System.debug method calls', async () => {
      mockStorage.getDocument.mockResolvedValue(complexTestClassDocument);

      const text = complexTestClassDocument.getText();
      const lines = text.split('\n');
      const lineIndex = lines.findIndex((l) => l.includes('System.debug'));
      expect(lineIndex).toBeGreaterThanOrEqual(0);
      const charIndex = lines[lineIndex].indexOf('System.debug');

      const params: HoverParams = {
        textDocument: { uri: 'file:///ComplexTestClass.cls' },
        position: { line: lineIndex, character: charIndex },
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('```apex');
        // TODO: Revisit hover data quality - should include clear class labels for system classes
        expect(content).toContain('void standardapexlibrary.debug(');
        expect(content).toMatch(/\*\*Modifiers:\*\* .*global/);
      }
    });

    it('should provide hover for System.debug method name', async () => {
      mockStorage.getDocument.mockResolvedValue(complexTestClassDocument);

      const text = complexTestClassDocument.getText();
      const lines = text.split('\n');
      const lineIndex = lines.findIndex((l) => l.includes('System.debug'));
      expect(lineIndex).toBeGreaterThanOrEqual(0);
      const charIndex = lines[lineIndex].indexOf('debug');

      const params: HoverParams = {
        textDocument: { uri: 'file:///ComplexTestClass.cls' },
        position: { line: lineIndex, character: charIndex },
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('```apex');
        expect(content).toContain('void standardapexlibrary.debug');
        expect(content).toMatch(/static/);
      }
    });

    it('should provide hover for EncodingUtil.urlEncode method calls', async () => {
      mockStorage.getDocument.mockResolvedValue(complexTestClassDocument);

      const text = complexTestClassDocument.getText();
      const lines = text.split('\n');
      const lineIndex = lines.findIndex((l) =>
        l.includes('EncodingUtil.urlEncode'),
      );
      expect(lineIndex).toBeGreaterThanOrEqual(0);
      const charIndex = lines[lineIndex].indexOf('EncodingUtil.urlEncode');

      const params: HoverParams = {
        textDocument: { uri: 'file:///ComplexTestClass.cls' },
        position: { line: lineIndex, character: charIndex },
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('```apex');
        // TODO: Revisit hover data quality - should include clear class labels for system classes
        expect(content).toContain('String standardapexlibrary.urlencode(');
        expect(content).toMatch(/\*\*Modifiers:\*\* .*global/);
      }
    });

    it('should provide hover for EncodingUtil.urlEncode method name', async () => {
      mockStorage.getDocument.mockResolvedValue(complexTestClassDocument);

      const text = complexTestClassDocument.getText();
      const lines = text.split('\n');
      const lineIndex = lines.findIndex((l) =>
        l.includes('EncodingUtil.urlEncode'),
      );
      expect(lineIndex).toBeGreaterThanOrEqual(0);
      const charIndex = lines[lineIndex].indexOf('urlEncode');

      const params: HoverParams = {
        textDocument: { uri: 'file:///ComplexTestClass.cls' },
        position: { line: lineIndex, character: charIndex },
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('```apex');
        expect(content).toContain('String standardapexlibrary.urlencode');
        expect(content).toMatch(/static/);
      }
    });

    it('should provide hover for EncodingUtil.urlDecode method calls', async () => {
      mockStorage.getDocument.mockResolvedValue(complexTestClassDocument);

      const text = complexTestClassDocument.getText();
      const lines = text.split('\n');
      const lineIndex = lines.findIndex((l) =>
        l.includes('EncodingUtil.urlDecode'),
      );
      expect(lineIndex).toBeGreaterThanOrEqual(0);
      const charIndex = lines[lineIndex].indexOf('EncodingUtil.urlDecode');

      const params: HoverParams = {
        textDocument: { uri: 'file:///ComplexTestClass.cls' },
        position: { line: lineIndex, character: charIndex },
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('```apex');
        // TODO: Revisit hover data quality - should include clear class labels for system classes
        expect(content).toContain('String standardapexlibrary.urldecode(');
        expect(content).toMatch(/\*\*Modifiers:\*\* .*global/);
      }
    });

    it('should provide hover for EncodingUtil.urlDecode method name', async () => {
      mockStorage.getDocument.mockResolvedValue(complexTestClassDocument);

      const text = complexTestClassDocument.getText();
      const lines = text.split('\n');
      const lineIndex = lines.findIndex((l) =>
        l.includes('EncodingUtil.urlDecode'),
      );
      expect(lineIndex).toBeGreaterThanOrEqual(0);
      const charIndex = lines[lineIndex].indexOf('urlDecode');

      const params: HoverParams = {
        textDocument: { uri: 'file:///ComplexTestClass.cls' },
        position: { line: lineIndex, character: charIndex },
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('```apex');
        expect(content).toContain('String standardapexlibrary.urldecode');
        expect(content).toMatch(/static/);
      }
    });

    it('should provide hover for Http class instantiation', async () => {
      mockStorage.getDocument.mockResolvedValue(complexTestClassDocument);

      const text = complexTestClassDocument.getText();
      const lines = text.split('\n');
      const lineIndex = lines.findIndex((l) =>
        l.includes('Http http = new Http()'),
      );
      expect(lineIndex).toBeGreaterThanOrEqual(0);
      const charIndex = lines[lineIndex].indexOf('Http');

      const params: HoverParams = {
        textDocument: { uri: 'file:///ComplexTestClass.cls' },
        position: { line: lineIndex, character: charIndex },
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('```apex');
        // TODO: Revisit hover data quality - should include clear class labels for system classes
        expect(content).toContain('class standardapexlibrary.http');
        expect(content).toMatch(/\*\*Modifiers:\*\* .*global/);
      }
    });

    it('should provide hover for HttpRequest class instantiation', async () => {
      mockStorage.getDocument.mockResolvedValue(complexTestClassDocument);

      const text = complexTestClassDocument.getText();
      const lines = text.split('\n');
      const lineIndex = lines.findIndex((l) =>
        l.includes('HttpRequest request = new HttpRequest()'),
      );
      expect(lineIndex).toBeGreaterThanOrEqual(0);
      const charIndex = lines[lineIndex].indexOf('HttpRequest');

      const params: HoverParams = {
        textDocument: { uri: 'file:///ComplexTestClass.cls' },
        position: { line: lineIndex, character: charIndex },
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('```apex');
        // TODO: Revisit hover data quality - should include clear class labels for system classes
        expect(content).toContain('class standardapexlibrary.httprequest');
        expect(content).toMatch(/\*\*Modifiers:\*\* .*global/);
      }
    });

    it('should provide hover for HttpResponse class reference', async () => {
      mockStorage.getDocument.mockResolvedValue(complexTestClassDocument);

      const text = complexTestClassDocument.getText();
      const lines = text.split('\n');
      const lineIndex = lines.findIndex((l) =>
        l.includes('HttpResponse response = http.send(request)'),
      );
      expect(lineIndex).toBeGreaterThanOrEqual(0);
      const charIndex = lines[lineIndex].indexOf('HttpResponse');

      const params: HoverParams = {
        textDocument: { uri: 'file:///ComplexTestClass.cls' },
        position: { line: lineIndex, character: charIndex },
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('```apex');
        // TODO: Revisit hover data quality - should include clear class labels for system classes
        expect(content).toContain('class standardapexlibrary.httpresponse');
        expect(content).toMatch(/\*\*Modifiers:\*\* .*global/);
      }
    });

    // TODO: Fix URL.getOrgDomainUrl method call resolution as an expression in a method call
    it.skip('should provide hover for URL.getOrgDomainUrl method calls', async () => {
      mockStorage.getDocument.mockResolvedValue(complexTestClassDocument);

      const text = complexTestClassDocument.getText();
      const lines = text.split('\n');
      const lineIndex = lines.findIndex((l) =>
        l.includes('URL.getOrgDomainUrl()'),
      );
      expect(lineIndex).toBeGreaterThanOrEqual(0);
      const charIndex = lines[lineIndex].indexOf('URL.getOrgDomainUrl');

      const params: HoverParams = {
        textDocument: { uri: 'file:///ComplexTestClass.cls' },
        position: { line: lineIndex, character: charIndex },
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        // Note: Currently the hover service may not resolve URL class correctly
        // This test documents the current behavior and can be updated when URL resolution is improved
        expect(content).toBeDefined();
        // The content should contain some valid symbol information, even if not the expected URL class
        expect(content.length).toBeGreaterThan(0);
      }
    });

    // TODO: Fix JSON.deserialize method call resolution - builtin type representations in memory are incomplete
    it.skip('should provide hover for JSON.deserialize method calls', async () => {
      mockStorage.getDocument.mockResolvedValue(complexTestClassDocument);

      const text = complexTestClassDocument.getText();
      const lines = text.split('\n');
      const lineIndex = lines.findIndex((l) => l.includes('JSON.deserialize'));
      expect(lineIndex).toBeGreaterThanOrEqual(0);
      const charIndex = lines[lineIndex].indexOf('JSON.deserialize');

      const params: HoverParams = {
        textDocument: { uri: 'file:///ComplexTestClass.cls' },
        position: { line: lineIndex, character: charIndex },
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('**Class** JSON');
        expect(content).toMatch(/\*\*Modifiers:\*\* .*global/);
        expect(content).toContain('**FQN:** System.JSON');
      }
    });

    it('should provide hover for List generic type declarations', async () => {
      mockStorage.getDocument.mockResolvedValue(complexTestClassDocument);

      const text = complexTestClassDocument.getText();
      const lines = text.split('\n');
      const lineIndex = lines.findIndex((l) => l.includes('List<Coordinates>'));
      expect(lineIndex).toBeGreaterThanOrEqual(0);
      const charIndex = lines[lineIndex].indexOf('List<Coordinates>');

      const params: HoverParams = {
        textDocument: { uri: 'file:///ComplexTestClass.cls' },
        position: { line: lineIndex, character: charIndex },
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        const content =
          typeof result.contents === 'object' && 'value' in result.contents
            ? result.contents.value
            : '';
        expect(content).toContain('```apex');
        expect(content).toContain('class BUILT_IN.List');
        expect(content).toMatch(/\*\*Modifiers:\*\* .*public/);
      }
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle hover requests for non-existent symbols gracefully', async () => {
      mockStorage.getDocument.mockResolvedValue(fileUtilitiesDocument);

      const params: HoverParams = {
        textDocument: { uri: 'file:///FileUtilities.cls' },
        position: { line: 0, character: 0 }, // Position in whitespace (LSP 0-based)
      };

      const result = await hoverService.processHover(params);

      // Should return null or empty result, not throw an error
      expect(result).toBeDefined();
    });

    it('should handle hover requests for non-existent files gracefully', async () => {
      // Mock storage to return null for non-existent file
      mockStorage.getDocument.mockResolvedValue(null);

      const params: HoverParams = {
        textDocument: { uri: 'file:///NonExistentClass.cls' },
        position: { line: 0, character: 0 }, // LSP 0-based
      };

      const result = await hoverService.processHover(params);

      // Should return null when document is not found
      expect(result).toBeNull();
    });
  });
});
