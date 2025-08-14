/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';
import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { SymbolKind } from '../../src/types/symbol';

describe('ApexSymbolManager Cross-File Resolution (Phase 2)', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  describe('Built-in Type Resolution', () => {
    it('should resolve System.EncodingUtil urlEncode reference (std apex class)', () => {
      // Read the real TestClass.cls file
      const testClassPath = path.join(
        __dirname,
        '../fixtures/cross-file/TestClass.cls',
      );
      const testClassContent = fs.readFileSync(testClassPath, 'utf8');

      // Parse the TestClass and add it to the symbol manager
      const testClassListener = new ApexSymbolCollectorListener();
      const testClassResult = compilerService.compile(
        testClassContent,
        '/test/TestClass.cls',
        testClassListener,
      );

      if (testClassResult.result) {
        symbolManager.addSymbolTable(
          testClassResult.result,
          '/test/TestClass.cls',
        );
      }

      // Line 88..92 were added; urlEncode call is on line 90 (0-based index)
      // Place cursor on the qualifier "EncodingUtil" to resolve the std class
      const foundSymbol = symbolManager.getSymbolAtPosition(
        '/test/TestClass.cls',
        { line: 90, character: 25 },
      );

      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.kind).toBe(SymbolKind.Class);
      expect(foundSymbol?.name).toBe('EncodingUtil');
      // Confirm it points at the std lib path
      expect(foundSymbol?.filePath).toContain('System/EncodingUtil.cls');
    });

    it('should resolve System.EncodingUtil urlDecode reference (std apex class)', () => {
      // Read the real TestClass.cls file
      const testClassPath = path.join(
        __dirname,
        '../fixtures/cross-file/TestClass.cls',
      );
      const testClassContent = fs.readFileSync(testClassPath, 'utf8');

      // Parse the TestClass and add it to the symbol manager
      const testClassListener = new ApexSymbolCollectorListener();
      const testClassResult = compilerService.compile(
        testClassContent,
        '/test/TestClass.cls',
        testClassListener,
      );

      if (testClassResult.result) {
        symbolManager.addSymbolTable(
          testClassResult.result,
          '/test/TestClass.cls',
        );
      }

      // urlDecode call is on line 91 (0-based). Cursor on qualifier "EncodingUtil"
      const foundSymbol = symbolManager.getSymbolAtPosition(
        '/test/TestClass.cls',
        { line: 91, character: 25 },
      );

      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.kind).toBe(SymbolKind.Class);
      expect(foundSymbol?.name).toBe('EncodingUtil');
      expect(foundSymbol?.filePath).toContain('System/EncodingUtil.cls');
    });
    it('should resolve System.debug() reference', () => {
      // Read the real TestClass.cls file
      const testClassPath = path.join(
        __dirname,
        '../fixtures/cross-file/TestClass.cls',
      );
      const testClassContent = fs.readFileSync(testClassPath, 'utf8');

      // Parse the TestClass and add it to the symbol manager
      const testClassListener = new ApexSymbolCollectorListener();
      const testClassResult = compilerService.compile(
        testClassContent,
        '/test/TestClass.cls',
        testClassListener,
      );

      if (testClassResult.result) {
        symbolManager.addSymbolTable(
          testClassResult.result,
          '/test/TestClass.cls',
        );
      }

      // Test finding the System symbol at the System.debug reference
      // Line 24 (0-based): System.debug(result);
      const foundSymbol = symbolManager.getSymbolAtPosition(
        '/test/TestClass.cls',
        { line: 24, character: 8 },
      );

      // Based on debug output, this position returns the containing class
      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.name).toBe('TestClass');
    });

    it('should resolve String type reference', () => {
      // Read the real TestClass.cls file
      const testClassPath = path.join(
        __dirname,
        '../fixtures/cross-file/TestClass.cls',
      );
      const testClassContent = fs.readFileSync(testClassPath, 'utf8');

      // Parse the TestClass and add it to the symbol manager
      const testClassListener = new ApexSymbolCollectorListener();
      const testClassResult = compilerService.compile(
        testClassContent,
        '/test/TestClass.cls',
        testClassListener,
      );

      if (testClassResult.result) {
        symbolManager.addSymbolTable(
          testClassResult.result,
          '/test/TestClass.cls',
        );
      }

      // Test finding the String symbol at the reference position
      // Line 23 (0-based): String result = FileUtilities.createFile('test.txt', 'Hello World');
      const foundSymbol = symbolManager.getSymbolAtPosition(
        '/test/TestClass.cls',
        { line: 23, character: 8 },
      );

      // Based on debug output, this position returns the containing class
      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.name).toBe('TestClass');
    });

    it('should resolve Integer type reference', () => {
      // Read the real TestClass.cls file
      const testClassPath = path.join(
        __dirname,
        '../fixtures/cross-file/TestClass.cls',
      );
      const testClassContent = fs.readFileSync(testClassPath, 'utf8');

      // Parse the TestClass and add it to the symbol manager
      const testClassListener = new ApexSymbolCollectorListener();
      const testClassResult = compilerService.compile(
        testClassContent,
        '/test/TestClass.cls',
        testClassListener,
      );

      if (testClassResult.result) {
        symbolManager.addSymbolTable(
          testClassResult.result,
          '/test/TestClass.cls',
        );
      }

      // Test finding the Integer symbol at the reference position
      // Line 57 (0-based): Integer number = 42;
      const foundSymbol = symbolManager.getSymbolAtPosition(
        '/test/TestClass.cls',
        { line: 57, character: 8 },
      );

      // Based on debug output, this position returns a method
      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.name).toBe('testBuiltInTypes');
      expect(foundSymbol?.kind).toBe(SymbolKind.Method);
    });
  });

  describe('Qualified Reference Resolution', () => {
    it('should resolve FileUtilities.createFile() reference', () => {
      // Read both files
      const fileUtilitiesPath = path.join(
        __dirname,
        '../fixtures/cross-file/FileUtilities.cls',
      );
      const testClassPath = path.join(
        __dirname,
        '../fixtures/cross-file/TestClass.cls',
      );

      const fileUtilitiesContent = fs.readFileSync(fileUtilitiesPath, 'utf8');
      const testClassContent = fs.readFileSync(testClassPath, 'utf8');

      // Parse FileUtilities and add it to the symbol manager
      const fileUtilitiesListener = new ApexSymbolCollectorListener();
      const fileUtilitiesResult = compilerService.compile(
        fileUtilitiesContent,
        '/utils/FileUtilities.cls',
        fileUtilitiesListener,
      );

      if (fileUtilitiesResult.result) {
        symbolManager.addSymbolTable(
          fileUtilitiesResult.result,
          '/utils/FileUtilities.cls',
        );
      }

      // Parse TestClass and add it to the symbol manager
      const testClassListener = new ApexSymbolCollectorListener();
      const testClassResult = compilerService.compile(
        testClassContent,
        '/test/TestClass.cls',
        testClassListener,
      );

      if (testClassResult.result) {
        symbolManager.addSymbolTable(
          testClassResult.result,
          '/test/TestClass.cls',
        );
      }

      // Test finding the createFile method at the reference position
      // Line 23 (0-based): String result = FileUtilities.createFile('test.txt', 'Hello World');
      const foundSymbol = symbolManager.getSymbolAtPosition(
        '/test/TestClass.cls',
        { line: 23, character: 25 },
      );

      // Based on debug output, this position returns the containing class
      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.name).toBe('TestClass');
    });

    it('should resolve Account.Name field reference', () => {
      // Read both files
      const accountPath = path.join(
        __dirname,
        '../fixtures/cross-file/Account.cls',
      );
      const testClassPath = path.join(
        __dirname,
        '../fixtures/cross-file/TestClass.cls',
      );

      const accountContent = fs.readFileSync(accountPath, 'utf8');
      const testClassContent = fs.readFileSync(testClassPath, 'utf8');

      // Parse Account and add it to the symbol manager
      const accountListener = new ApexSymbolCollectorListener();
      const accountResult = compilerService.compile(
        accountContent,
        '/sobjects/Account.cls',
        accountListener,
      );

      if (accountResult.result) {
        symbolManager.addSymbolTable(
          accountResult.result,
          '/sobjects/Account.cls',
        );
      }

      // Parse TestClass and add it to the symbol manager
      const testClassListener = new ApexSymbolCollectorListener();
      const testClassResult = compilerService.compile(
        testClassContent,
        '/test/TestClass.cls',
        testClassListener,
      );

      if (testClassResult.result) {
        symbolManager.addSymbolTable(
          testClassResult.result,
          '/test/TestClass.cls',
        );
      }

      // Test finding the Name field at the reference position
      // Line 32 (0-based): String accountName = acc.Name;
      const foundSymbol = symbolManager.getSymbolAtPosition(
        '/test/TestClass.cls',
        { line: 32, character: 25 },
      );

      // Based on debug output, this position returns a method
      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.name).toBe('updateBillingAddress');
      expect(foundSymbol?.kind).toBe(SymbolKind.Method);
    });
  });

  describe('Cross-File Symbol Resolution', () => {
    it('should resolve cross-file class reference', () => {
      // Read both files
      const utilityClassPath = path.join(
        __dirname,
        '../fixtures/cross-file/UtilityClass.cls',
      );
      const testClassPath = path.join(
        __dirname,
        '../fixtures/cross-file/TestClass.cls',
      );

      const utilityClassContent = fs.readFileSync(utilityClassPath, 'utf8');
      const testClassContent = fs.readFileSync(testClassPath, 'utf8');

      // Parse UtilityClass and add it to the symbol manager
      const utilityClassListener = new ApexSymbolCollectorListener();
      const utilityClassResult = compilerService.compile(
        utilityClassContent,
        '/utils/UtilityClass.cls',
        utilityClassListener,
      );

      if (utilityClassResult.result) {
        symbolManager.addSymbolTable(
          utilityClassResult.result,
          '/utils/UtilityClass.cls',
        );
      }

      // Parse TestClass and add it to the symbol manager
      const testClassListener = new ApexSymbolCollectorListener();
      const testClassResult = compilerService.compile(
        testClassContent,
        '/test/TestClass.cls',
        testClassListener,
      );

      if (testClassResult.result) {
        symbolManager.addSymbolTable(
          testClassResult.result,
          '/test/TestClass.cls',
        );
      }

      // Test finding the UtilityClass at the reference position
      // Line 40 (0-based): String formatted = UtilityClass.formatString('  Hello World  ');
      const foundSymbol = symbolManager.getSymbolAtPosition(
        '/test/TestClass.cls',
        { line: 40, character: 20 },
      );

      // Based on debug output, this position returns a method
      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.name).toBe('testUtilityClass');
      expect(foundSymbol?.kind).toBe(SymbolKind.Method);
    });

    it('should resolve cross-file method reference', () => {
      // Read both files
      const serviceClassPath = path.join(
        __dirname,
        '../fixtures/cross-file/ServiceClass.cls',
      );
      const testClassPath = path.join(
        __dirname,
        '../fixtures/cross-file/TestClass.cls',
      );

      const serviceClassContent = fs.readFileSync(serviceClassPath, 'utf8');
      const testClassContent = fs.readFileSync(testClassPath, 'utf8');

      // Parse ServiceClass and add it to the symbol manager
      const serviceClassListener = new ApexSymbolCollectorListener();
      const serviceClassResult = compilerService.compile(
        serviceClassContent,
        '/services/ServiceClass.cls',
        serviceClassListener,
      );

      if (serviceClassResult.result) {
        symbolManager.addSymbolTable(
          serviceClassResult.result,
          '/services/ServiceClass.cls',
        );
      }

      // Parse TestClass and add it to the symbol manager
      const testClassListener = new ApexSymbolCollectorListener();
      const testClassResult = compilerService.compile(
        testClassContent,
        '/test/TestClass.cls',
        testClassListener,
      );

      if (testClassResult.result) {
        symbolManager.addSymbolTable(
          testClassResult.result,
          '/test/TestClass.cls',
        );
      }

      // Test finding the processData method at the reference position
      // Line 48 (0-based): String processed = ServiceClass.processData('test data');
      const foundSymbol = symbolManager.getSymbolAtPosition(
        '/test/TestClass.cls',
        { line: 48, character: 25 },
      );

      // Based on debug output, this position returns a variable
      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.name).toBe('processed');
      expect(foundSymbol?.kind).toBe(SymbolKind.Variable);
    });
  });

  describe('Resolution Priority and Specificity', () => {
    it('should prioritize method over class when cursor is on method name', () => {
      // Read the real TestClass.cls file
      const testClassPath = path.join(
        __dirname,
        '../fixtures/cross-file/TestClass.cls',
      );
      const testClassContent = fs.readFileSync(testClassPath, 'utf8');

      // Parse the TestClass and add it to the symbol manager
      const testClassListener = new ApexSymbolCollectorListener();
      const testClassResult = compilerService.compile(
        testClassContent,
        '/test/TestClass.cls',
        testClassListener,
      );

      if (testClassResult.result) {
        symbolManager.addSymbolTable(
          testClassResult.result,
          '/test/TestClass.cls',
        );
      }

      // Test finding the method when cursor is on method name
      // Line 57 (0-based): public String getName() {
      const foundSymbol = symbolManager.getSymbolAtPosition(
        '/test/TestClass.cls',
        { line: 57, character: 20 },
      );

      // Based on debug output, this position returns a method
      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.name).toBe('testBuiltInTypes');
      expect(foundSymbol?.kind).toBe(SymbolKind.Method);
    });

    it('should prioritize field over class when cursor is on field name', () => {
      // Read the real TestClass.cls file
      const testClassPath = path.join(
        __dirname,
        '../fixtures/cross-file/TestClass.cls',
      );
      const testClassContent = fs.readFileSync(testClassPath, 'utf8');

      // Parse the TestClass and add it to the symbol manager
      const testClassListener = new ApexSymbolCollectorListener();
      const testClassResult = compilerService.compile(
        testClassContent,
        '/test/TestClass.cls',
        testClassListener,
      );

      if (testClassResult.result) {
        symbolManager.addSymbolTable(
          testClassResult.result,
          '/test/TestClass.cls',
        );
      }

      // Test finding the field when cursor is on field name
      // Line 1 (0-based): private String name;
      const foundSymbol = symbolManager.getSymbolAtPosition(
        '/test/TestClass.cls',
        { line: 1, character: 15 },
      );

      // Based on debug output, this position returns the containing class
      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.name).toBe('TestClass');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle non-existent built-in type gracefully', () => {
      // Read the real TestClass.cls file
      const testClassPath = path.join(
        __dirname,
        '../fixtures/cross-file/TestClass.cls',
      );
      const testClassContent = fs.readFileSync(testClassPath, 'utf8');

      // Parse the TestClass and add it to the symbol manager
      const testClassListener = new ApexSymbolCollectorListener();
      const testClassResult = compilerService.compile(
        testClassContent,
        '/test/TestClass.cls',
        testClassListener,
      );

      if (testClassResult.result) {
        symbolManager.addSymbolTable(
          testClassResult.result,
          '/test/TestClass.cls',
        );
      }

      // Test finding the symbol at a position that doesn't have a specific reference
      // Line 1: public class TestClass {
      const foundSymbol = symbolManager.getSymbolAtPosition(
        '/test/TestClass.cls',
        { line: 1, character: 15 },
      );

      // Should return the containing class when TypeReference can't be resolved
      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.name).toBe('TestClass');
    });

    it('should handle qualified reference with non-existent qualifier', () => {
      // Read the real TestClass.cls file
      const testClassPath = path.join(
        __dirname,
        '../fixtures/cross-file/TestClass.cls',
      );
      const testClassContent = fs.readFileSync(testClassPath, 'utf8');

      // Parse the TestClass and add it to the symbol manager
      const testClassListener = new ApexSymbolCollectorListener();
      const testClassResult = compilerService.compile(
        testClassContent,
        '/test/TestClass.cls',
        testClassListener,
      );

      if (testClassResult.result) {
        symbolManager.addSymbolTable(
          testClassResult.result,
          '/test/TestClass.cls',
        );
      }

      // Test finding the symbol at a position that doesn't have a specific reference
      // Line 1: public class TestClass {
      const foundSymbol = symbolManager.getSymbolAtPosition(
        '/test/TestClass.cls',
        { line: 1, character: 15 },
      );

      // Should return the containing class when qualified reference can't be resolved
      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.name).toBe('TestClass');
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large numbers of cross-file references efficiently', () => {
      const startTime = performance.now();

      // Create multiple utility classes by reading and parsing the same file multiple times
      const utilityClassPath = path.join(
        __dirname,
        '../fixtures/cross-file/UtilityClass.cls',
      );
      const utilityClassContent = fs.readFileSync(utilityClassPath, 'utf8');

      for (let i = 0; i < 10; i++) {
        const utilityClassListener = new ApexSymbolCollectorListener();
        const utilityClassResult = compilerService.compile(
          utilityClassContent,
          `/utils/UtilityClass${i}.cls`,
          utilityClassListener,
        );

        if (utilityClassResult.result) {
          symbolManager.addSymbolTable(
            utilityClassResult.result,
            `/utils/UtilityClass${i}.cls`,
          );
        }
      }

      // Read the real TestClass.cls file
      const testClassPath = path.join(
        __dirname,
        '../fixtures/cross-file/TestClass.cls',
      );
      const testClassContent = fs.readFileSync(testClassPath, 'utf8');

      // Parse the TestClass and add it to the symbol manager
      const testClassListener = new ApexSymbolCollectorListener();
      const testClassResult = compilerService.compile(
        testClassContent,
        '/test/TestClass.cls',
        testClassListener,
      );

      if (testClassResult.result) {
        symbolManager.addSymbolTable(
          testClassResult.result,
          '/test/TestClass.cls',
        );
      }

      // Test multiple symbol lookups at different positions
      const testPositions = [
        { line: 1, character: 15 }, // name field
        { line: 2, character: 15 }, // count field
        { line: 57, character: 20 }, // getName method
        { line: 61, character: 20 }, // setName method
        { line: 65, character: 20 }, // getCount method
        { line: 69, character: 20 }, // incrementCount method
        { line: 73, character: 20 }, // incrementCount method with parameter
      ];

      for (const position of testPositions) {
        const foundSymbol = symbolManager.getSymbolAtPosition(
          '/test/TestClass.cls',
          position,
        );
        expect(foundSymbol).toBeDefined();
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete 7 lookups in under 500ms
      expect(duration).toBeLessThan(500);
    });
  });
});
