/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/*
 * Integration Tests for DefaultApexDocumentSymbolProvider
 * These use real parsing (no mocks) to detect breaking changes in document symbol generation
 */

import {
  DocumentSymbolParams,
  DocumentSymbol,
} from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  enableConsoleLogging,
  setLogLevel,
  ApexSettingsManager,
} from '@salesforce/apex-lsp-shared';

import {
  DefaultApexDocumentSymbolProvider,
  ApexDocumentSymbolProvider,
} from '../../src/documentSymbol/ApexDocumentSymbolProvider';

import { ApexStorageInterface } from '../../src/storage/ApexStorageInterface';

// Use real ApexSettingsManager instead of mock
// The real settings manager provides comprehensive configuration that the parser needs

/**
 * Integration Tests - These use real parsing to detect breaking changes
 *
 * These tests validate the complete document symbol generation pipeline
 * using realistic Apex code. They detect breaking changes in:
 * - Symbol hierarchy and nesting
 * - Range calculations (start/end positions)
 * - Symbol name formatting
 * - Method signature generation
 * - Constructor handling
 * - Interface filtering
 * - Enum handling
 *
 * Any changes to parsing logic, range calculation, or symbol formatting
 * will cause these tests to fail, making them effective regression detectors.
 */
describe('DefaultApexDocumentSymbolProvider - Integration Tests', () => {
  let symbolProvider: ApexDocumentSymbolProvider;
  let storage: ApexStorageInterface;

  beforeEach(async () => {
    // Enable console logging for the test
    enableConsoleLogging();
    // Set log level to error only
    setLogLevel('error');

    // Reset the ApexSettingsManager singleton to ensure clean state
    ApexSettingsManager.resetInstance();

    // Initialize the real ApexSettingsManager with default settings
    ApexSettingsManager.getInstance();

    // Simple in-memory storage implementation for the test
    storage = {
      getDocument: jest.fn(),
    } as any;

    symbolProvider = new DefaultApexDocumentSymbolProvider(storage);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complex Apex Class Parsing - CommunitiesLandingController', () => {
    /**
     * This test validates the complete document symbol generation pipeline
     * using a realistic Apex class. It serves as a comprehensive regression test.
     */
    it('produces the expected DocumentSymbol hierarchy with accurate ranges and formatting', async () => {
      // Test the parser directly like the parser tests do
      const { CompilerService } = require('@salesforce/apex-lsp-parser-ast');
      const {
        FullSymbolCollectorListener,
      } = require('@salesforce/apex-lsp-parser-ast');
      const { SymbolTable } = require('@salesforce/apex-lsp-parser-ast');

      const apexClassContent = [
        '/**',
        ' * An apex page controller that takes the user to the right start page based on credentials or lack thereof',
        ' */',
        'public with sharing class CommunitiesLandingController {',
        '    // Code we will invoke on page load.',
        '    public PageReference forwardToStartPage() {',
        '        return Network.communitiesLanding();',
        '     }',
        '',
        '    public CommunitiesLandingController(Boolean isTest) {',
        "        System.debug('Example');",
        '        if (isTest) {',
        "            System.debug('oh no');",
        '        }',
        '     }',
        '',
        ' }',
      ].join('\n');

      // Use the same setup as the parser tests
      const compilerService = new CompilerService();
      const table = new SymbolTable();
      const listener = new FullSymbolCollectorListener(table);

      compilerService.compile(
        apexClassContent,
        'CommunitiesLandingController.cls',
        listener,
      );

      // Now test the integration test approach
      const docUri = 'file:///CommunitiesLandingController.cls';
      const textDocument = TextDocument.create(
        docUri,
        'apex',
        1,
        apexClassContent,
      );
      (storage.getDocument as jest.Mock).mockResolvedValue(textDocument);

      const params: DocumentSymbolParams = { textDocument: { uri: docUri } };
      const integrationResult =
        await symbolProvider.provideDocumentSymbols(params);

      expect(integrationResult).not.toBeNull();
      expect(integrationResult).toHaveLength(1);

      // This expected structure serves as a regression test for:
      // 1. Symbol hierarchy correctness
      // 2. Range accuracy (critical for IDE navigation)
      // 3. Name formatting consistency
      // 4. Kind mapping correctness
      const expected = {
        children: [
          {
            children: [],
            kind: 6, // SymbolKind.Method
            name: 'forwardToStartPage() : PageReference',
            range: {
              end: { character: 6, line: 7 },
              start: { character: 11, line: 5 }, // Now includes 'public'
            },
            selectionRange: {
              end: { character: 43, line: 5 },
              start: { character: 25, line: 5 }, // Still just the method name
            },
          },
          {
            children: [],
            kind: 9, // SymbolKind.Constructor
            name: 'CommunitiesLandingController',
            range: {
              end: { character: 6, line: 14 },
              start: { character: 11, line: 9 }, // Symbol name + scope (after 'public')
            },
            selectionRange: {
              end: { character: 39, line: 9 },
              start: { character: 11, line: 9 }, // Still just the constructor name
            },
          },
        ],
        kind: 5, // SymbolKind.Class
        name: 'CommunitiesLandingController',
        range: {
          end: { character: 2, line: 16 },
          start: { character: 20, line: 3 }, // Now includes 'public with sharing'
        },
        selectionRange: {
          end: { character: 54, line: 3 },
          start: { character: 26, line: 3 }, // Still just the class name
        },
      };

      // Convert result to plain JSON for deep equality comparison
      const plainResult = JSON.parse(JSON.stringify(integrationResult![0]));

      // This assertion will fail if ANY aspect of symbol generation changes:
      // - Range calculations become inaccurate
      // - Symbol names are formatted differently
      // - Hierarchy structure changes
      // - Symbol kinds are mapped incorrectly
      expect(plainResult).toEqual(expected);
    });

    /**
     * Additional regression test for edge cases that commonly break during refactoring
     */
    it('handles complex method signatures and return types correctly', async () => {
      const complexApex = [
        'public class ComplexMethodClass {',
        '    public static final List<Account> getAccountsByType(String accType, Integer limit, Boolean isActive) {',
        '        return [SELECT Id FROM Account WHERE Type = :accountType LIMIT :limit];',
        '    }',
        '    ',
        '    @AuraEnabled',
        '    public Map<String, Object> processData(Map<Id, SObject> dataMap) {',
        '        return new Map<String, Object>();',
        '    }',
        '}',
      ].join('\n');

      const docUri = 'file:///ComplexMethodClass.cls';
      const textDocument = TextDocument.create(docUri, 'apex', 1, complexApex);
      (storage.getDocument as jest.Mock).mockResolvedValue(textDocument);

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      expect(result).not.toBeNull();
      expect((result![0] as DocumentSymbol).children).toHaveLength(2);

      // Verify complex generic types are handled correctly
      const firstMethod = (result![0] as DocumentSymbol).children![0];
      expect(firstMethod.name).toContain('getAccountsByType');
      expect(firstMethod.name).toContain('String, Integer, Boolean');
      expect(firstMethod.name).toContain('List');

      const secondMethod = (result![0] as DocumentSymbol).children![1];
      expect(secondMethod.name).toContain('processData');
      expect(secondMethod.name).toContain('Map');
    });

    /**
     * This test validates that a constructor for an inner class
     * has its name correctly identified as the class name.
     * This tests the fix for constructor name resolution.
     */
    it('correctly handles inner class constructors', async () => {
      const apexClassContent = [
        'public class OuterClass {',
        '  public class InnerClass {',
        '    public InnerClass() {', // Valid constructor syntax
        "      System.debug('Inner class constructor');",
        '    }',
        '  }',
        '}',
      ].join('\n');

      const docUri = 'file:///OuterClass.cls';
      const textDocument = TextDocument.create(
        docUri,
        'apex',
        1,
        apexClassContent,
      );
      (storage.getDocument as jest.Mock).mockResolvedValue(textDocument);

      const params: DocumentSymbolParams = { textDocument: { uri: docUri } };
      const result = await symbolProvider.provideDocumentSymbols(params);

      const expected = {
        name: 'OuterClass',
        kind: 5, // Class
        range: {
          start: { line: 0, character: 7 }, // Now includes 'public'
          end: { line: 6, character: 1 },
        },
        selectionRange: {
          start: { line: 0, character: 13 }, // Still just the class name
          end: { line: 0, character: 23 },
        },
        children: [
          {
            name: 'InnerClass',
            kind: 5, // Class
            range: {
              start: { line: 1, character: 9 }, // Now includes 'public'
              end: { line: 5, character: 3 },
            },
            selectionRange: {
              start: { line: 1, character: 15 }, // Still just the class name
              end: { line: 1, character: 25 },
            },
            children: [
              {
                name: 'InnerClass', // Constructor name now just class name
                kind: 9, // Constructor
                range: {
                  start: { line: 2, character: 11 }, // Symbol name + scope (after 'public')
                  end: { line: 4, character: 5 },
                },
                selectionRange: {
                  start: { line: 2, character: 11 }, // Still just the constructor name
                  end: { line: 2, character: 21 },
                },
                children: [],
              },
            ],
          },
        ],
      };
      const plainResult = JSON.parse(JSON.stringify(result![0]));
      expect(plainResult).toEqual(expected);
    });

    /**
     * Tests interface handling to ensure method-only filtering works correctly
     */
    it('correctly filters interface members to only include methods', async () => {
      const interfaceApex = [
        'public interface TestInterface {',
        '    String getValue();',
        '    void setValue(String value);',
        '    Integer calculate(Integer a, Integer b);',
        '}',
      ].join('\n');

      const docUri = 'file:///TestInterface.cls';
      const textDocument = TextDocument.create(
        docUri,
        'apex',
        1,
        interfaceApex,
      );
      (storage.getDocument as jest.Mock).mockResolvedValue(textDocument);

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      expect(result).not.toBeNull();
      expect((result![0] as DocumentSymbol).kind).toBe(11); // SymbolKind.Interface
      expect((result![0] as DocumentSymbol).children).toHaveLength(3);

      // All children should be methods
      (result![0] as DocumentSymbol).children!.forEach(
        (child: DocumentSymbol) => {
          expect(child.kind).toBe(6); // SymbolKind.Method
          expect(child.name).toMatch(/.*\(.*\) : .*/); // Should have method signature format
        },
      );
    });

    /**
     * Tests enum handling to ensure proper symbol hierarchy
     */
    it('correctly handles enum declarations with values', async () => {
      const enumApex = [
        'public enum AccountType {',
        '    CUSTOMER,',
        '    PARTNER,',
        '    VENDOR',
        '}',
      ].join('\n');

      const docUri = 'file:///AccountType.cls';
      const textDocument = TextDocument.create(docUri, 'apex', 1, enumApex);
      (storage.getDocument as jest.Mock).mockResolvedValue(textDocument);

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      expect(result).not.toBeNull();
      expect((result![0] as DocumentSymbol).kind).toBe(10); // SymbolKind.Enum
      expect((result![0] as DocumentSymbol).children).toHaveLength(3);

      // All children should be enum members
      (result![0] as DocumentSymbol).children!.forEach(
        (child: DocumentSymbol) => {
          expect(child.kind).toBe(22); // SymbolKind.EnumMember
        },
      );

      expect((result![0] as DocumentSymbol).children![0].name).toBe('CUSTOMER');
      expect((result![0] as DocumentSymbol).children![1].name).toBe('PARTNER');
      expect((result![0] as DocumentSymbol).children![2].name).toBe('VENDOR');
    });

    /**
     * Migrated unit-test cases to integration (real compiler) tests
     */
    it('returns null when document is not found', async () => {
      (storage.getDocument as jest.Mock).mockResolvedValue(null);

      const params: DocumentSymbolParams = {
        textDocument: { uri: 'file:///missing.cls' },
      };
      const result = await symbolProvider.provideDocumentSymbols(params);
      expect(result).toBeNull();
    });

    it('parses a simple Apex class', async () => {
      const docUri = 'file:///SimpleClass.cls';
      const content = 'public class SimpleClass {}';
      const textDocument = TextDocument.create(docUri, 'apex', 1, content);
      (storage.getDocument as jest.Mock).mockResolvedValue(textDocument);

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      const symbol = result![0] as DocumentSymbol;
      expect(symbol.name).toBe('SimpleClass');
      expect(symbol.kind).toBe(5); // Class
    });

    it('parses a class with a property and a method', async () => {
      const docUri = 'file:///ComplexClass.cls';
      const content = [
        'public class ComplexClass {',
        '  public String myProp { get; set; }',
        '  public void myMethod() {}',
        '}',
      ].join('\n');
      const textDocument = TextDocument.create(docUri, 'apex', 1, content);
      (storage.getDocument as jest.Mock).mockResolvedValue(textDocument);

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      const classSymbol = result![0] as DocumentSymbol;
      expect(classSymbol.name).toBe('ComplexClass');
      expect(classSymbol.children).toHaveLength(2);
      expect(classSymbol.children![0].name).toBe('myProp : String');
      expect(classSymbol.children![0].kind).toBe(7); // Property
      expect(classSymbol.children![1].name).toBe('myMethod() : void');
      expect(classSymbol.children![1].kind).toBe(6); // Method
    });

    it('handles documents with syntax errors gracefully', async () => {
      const docUri = 'file:///ErrorClass.cls';
      const content = 'public class ErrorClass {'; // missing closing brace
      const textDocument = TextDocument.create(docUri, 'apex', 1, content);
      (storage.getDocument as jest.Mock).mockResolvedValue(textDocument);

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });
      // The parser is resilient and can still parse partial content
      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result![0].name).toBe('ErrorClass');
    });

    /**
     * Additional test cases migrated from unit tests
     */
    it('handles method symbols with parameters and return types correctly', async () => {
      const docUri = 'file:///MethodClass.cls';
      const content = [
        'public class MethodClass {',
        '  public String getValue(Integer id, String name) {',
        "    return 'test';",
        '  }',
        '}',
      ].join('\n');
      const textDocument = TextDocument.create(docUri, 'apex', 1, content);
      (storage.getDocument as jest.Mock).mockResolvedValue(textDocument);

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      expect(result).toHaveLength(1);
      const classSymbol = result![0] as DocumentSymbol;
      expect(classSymbol.children).toHaveLength(1);
      expect(classSymbol.children![0].name).toBe(
        'getValue(Integer, String) : String',
      );
    });

    it('handles symbols with identifier location for precise ranges', async () => {
      const docUri = 'file:///PreciseClass.cls';
      const content = 'public class PreciseClass {}';
      const textDocument = TextDocument.create(docUri, 'apex', 1, content);
      (storage.getDocument as jest.Mock).mockResolvedValue(textDocument);

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      expect(result).toHaveLength(1);
      const symbol = result![0] as DocumentSymbol;
      expect(symbol.name).toBe('PreciseClass');
      expect(symbol.kind).toBe(5); // Class
      // Verify ranges are properly calculated
      expect(symbol.range).toBeDefined();
      expect(symbol.selectionRange).toBeDefined();
    });

    it('handles valid class documents correctly', async () => {
      const docUri = 'file:///ErrorClass.cls';
      const content = 'public class ErrorClass {}';
      const textDocument = TextDocument.create(docUri, 'apex', 1, content);
      (storage.getDocument as jest.Mock).mockResolvedValue(textDocument);

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      // Should parse valid classes correctly
      // NOTE: If there are duplicate declarations, they should all be shown (like TypeScript)
      // to reflect the actual file state in the outline
      expect(result).not.toBeNull();
      expect(result!.length).toBeGreaterThanOrEqual(1);
      expect(result!.some((s) => s.name === 'ErrorClass')).toBe(true);
    });

    it('shows duplicate method declarations in document symbols', async () => {
      const docUri = 'file:///DuplicateMethodClass.cls';
      const content = [
        'public class DuplicateMethodClass {',
        '  public void doWork() {',
        '    // First implementation',
        '  }',
        '',
        '  public void doWork() {',
        '    // Duplicate method with same signature',
        '  }',
        '}',
      ].join('\n');
      const textDocument = TextDocument.create(docUri, 'apex', 1, content);
      (storage.getDocument as jest.Mock).mockResolvedValue(textDocument);

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      expect(result).not.toBeNull();
      expect(result!.length).toBeGreaterThanOrEqual(1);

      // Find the class symbol
      const classSymbol = result!.find(
        (s) => s.name === 'DuplicateMethodClass',
      );
      expect(classSymbol).toBeDefined();
      expect((classSymbol as DocumentSymbol).children).toBeDefined();

      // Method names are formatted as "methodName(paramTypes) : ReturnType"
      // For void doWork() with no params, it should be "doWork() : void"
      const methods = (
        (classSymbol as DocumentSymbol).children as DocumentSymbol[]
      ).filter((s) => s.name.startsWith('doWork('));

      // Verify both duplicate methods are shown in the outline (like TypeScript)
      // This confirms that duplicate declarations are not filtered out
      expect(methods.length).toBeGreaterThanOrEqual(2);

      // Both should have the same formatted name
      expect(methods[0].name).toBe('doWork() : void');
      expect(methods[1].name).toBe('doWork() : void');

      // Verify they have different ranges (different line numbers)
      // This confirms they are distinct symbols, not the same symbol duplicated
      expect(methods[0].range.start.line).not.toBe(methods[1].range.start.line);
      expect(methods[0].range.start.line).toBe(1); // First method at line 1 (0-indexed)
      expect(methods[1].range.start.line).toBe(5); // Second method at line 5 (0-indexed)
    });

    it('handles complex class with fields, methods, and inner classes', async () => {
      const docUri = 'file:///ComplexClass.cls';
      const content = [
        'public class ComplexClass {',
        '  private String field1;',
        '  public void method1() {}',
        '  public class InnerClass {',
        '    public void innerMethod() {}',
        '  }',
        '}',
      ].join('\n');
      const textDocument = TextDocument.create(docUri, 'apex', 1, content);
      (storage.getDocument as jest.Mock).mockResolvedValue(textDocument);

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      expect(result).not.toBeNull();
      const firstSymbol = result![0] as DocumentSymbol;
      expect(Array.isArray(firstSymbol.children)).toBe(true);
      expect((firstSymbol.children as DocumentSymbol[]).length).toBeGreaterThan(
        0,
      );
    });

    it('handles interface with mixed members and filters to only methods', async () => {
      const docUri = 'file:///TestInterface.cls';
      const content = [
        'public interface TestInterface {',
        '  void method1();',
        '  String method2();',
        '  String someVariable;',
        '}',
      ].join('\n');
      const textDocument = TextDocument.create(docUri, 'apex', 1, content);
      (storage.getDocument as jest.Mock).mockResolvedValue(textDocument);

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      expect(result).not.toBeNull();
      const firstSymbol = result![0] as DocumentSymbol;
      expect(Array.isArray(firstSymbol.children)).toBe(true);
      // Should only include methods, not variables
      expect(
        (firstSymbol.children as DocumentSymbol[]).every(
          (child) => child.kind === 6, // SymbolKind.Method
        ),
      ).toBe(true);
    });

    it('handles enum with enum values correctly', async () => {
      const docUri = 'file:///TestEnum.cls';
      const content = [
        'public enum TestEnum {',
        '  VALUE1,',
        '  VALUE2',
        '}',
      ].join('\n');
      const textDocument = TextDocument.create(docUri, 'apex', 1, content);
      (storage.getDocument as jest.Mock).mockResolvedValue(textDocument);

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      expect(result).not.toBeNull();
      const enumSymbol = result![0] as DocumentSymbol;
      expect(enumSymbol.kind).toBe(10); // SymbolKind.Enum
      expect(enumSymbol.children).toHaveLength(2);
      expect(enumSymbol.children![0].name).toBe('VALUE1');
      expect(enumSymbol.children![0].kind).toBe(22); // SymbolKind.EnumMember
      expect(enumSymbol.children![1].name).toBe('VALUE2');
      expect(enumSymbol.children![1].kind).toBe(22); // SymbolKind.EnumMember
    });

    it('should not duplicate inner classes as root-level classes', async () => {
      const docUri = 'file:///ScopeExample.cls';
      const content = `public with sharing class ScopeExample {

    String a;

    static String b;

    public ScopeExample() {

    }

    public void method1() {

        String a;

        String b = a;

    }

    public void method2() {

        String a;

        String b = a;

    }

    public void method3() {

        String b = a;

        String c = ScopeExample.method4();

    }

    public static String method4() {

        return ScopeExample.b;

    }

    public class InnerClass {

        public void method5() {

            String c = ScopeExample.method4();

            String d = ScopeExample.b;

        }

    }

}`;
      const textDocument = TextDocument.create(docUri, 'apex', 1, content);
      (storage.getDocument as jest.Mock).mockResolvedValue(textDocument);

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      expect(result).not.toBeNull();
      // Should only have one root-level symbol (ScopeExample)
      expect(result).toHaveLength(1);
      expect(result![0].name).toContain('ScopeExample');

      // InnerClass should be a child of ScopeExample, not a root-level symbol
      const scopeExampleSymbol = result![0] as DocumentSymbol;
      expect(scopeExampleSymbol.children).toBeDefined();

      // Find InnerClass in children
      const innerClassSymbol = (
        scopeExampleSymbol.children as DocumentSymbol[]
      ).find((child) => child.name.includes('InnerClass'));
      expect(innerClassSymbol).toBeDefined();
      expect(innerClassSymbol!.kind).toBe(5); // SymbolKind.Class

      // Verify InnerClass is NOT in the root-level results
      const rootLevelInnerClass = result!.find((symbol) =>
        symbol.name.includes('InnerClass'),
      );
      expect(rootLevelInnerClass).toBeUndefined();
    });

    it('should deduplicate top-level class symbols if duplicates exist in symbol table', async () => {
      // This test verifies that if duplicate top-level class symbols somehow exist
      // in the symbol table (due to bugs in symbol collection), they are deduplicated
      // and only one instance appears in the document outline
      const docUri = 'file:///FileUtilitiesTest.cls';
      const content = `@isTest
private with sharing class FileUtilitiesTest {
    @isTest
    static void createFileSucceedsWhenCorrectInput() {
        // Test implementation
    }

    @isTest
    static void createFileFailsWhenIncorrectRecordId() {
        // Test implementation
    }
}`;
      const textDocument = TextDocument.create(docUri, 'apex', 1, content);
      (storage.getDocument as jest.Mock).mockResolvedValue(textDocument);

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      expect(result).not.toBeNull();
      // Should only have one top-level symbol (FileUtilitiesTest)
      // Even if the symbol table somehow contains duplicates, they should be deduplicated
      expect(result).toHaveLength(1);
      expect(result![0].name).toBe('FileUtilitiesTest');
      expect(result![0].kind).toBe(5); // SymbolKind.Class

      // Verify the class has children (the test methods)
      const classSymbol = result![0] as DocumentSymbol;
      expect(classSymbol.children).toBeDefined();
      expect(classSymbol.children!.length).toBeGreaterThan(0);

      // Verify all children are methods
      const methodNames = (classSymbol.children as DocumentSymbol[]).map(
        (child) => child.name,
      );
      // Method names are formatted with parameters and return types, so check for partial matches
      expect(
        methodNames.some((name) =>
          name.includes('createFileSucceedsWhenCorrectInput'),
        ),
      ).toBe(true);
      expect(
        methodNames.some((name) =>
          name.includes('createFileFailsWhenIncorrectRecordId'),
        ),
      ).toBe(true);
    });

    it('should deduplicate symbols with the same ID even if they are different objects', async () => {
      // This test verifies that if the same class symbol appears multiple times
      // in the symbol table (same ID, possibly different object references due to
      // enrichment or re-parsing), only one instance is shown in the outline
      const docUri = 'file:///FileUtilities.cls';
      const content = `public with sharing class FileUtilities {
    @AuraEnabled
    public static String createFile(
        String base64data,
        String filename,
        String recordId
    ) {
        return 'test';
    }
}`;
      const textDocument = TextDocument.create(docUri, 'apex', 1, content);
      (storage.getDocument as jest.Mock).mockResolvedValue(textDocument);

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      expect(result).not.toBeNull();
      // Should only have one top-level symbol (FileUtilities)
      // Even if the symbol table contains multiple symbol objects with the same ID,
      // they should be deduplicated
      expect(result).toHaveLength(1);
      expect(result![0].name).toBe('FileUtilities');
      expect(result![0].kind).toBe(5); // SymbolKind.Class

      // Verify the class has children (the createFile method)
      const classSymbol = result![0] as DocumentSymbol;
      expect(classSymbol.children).toBeDefined();
      expect(classSymbol.children!.length).toBeGreaterThan(0);

      // Verify the method is present
      const methodNames = (classSymbol.children as DocumentSymbol[]).map(
        (child) => child.name,
      );
      expect(
        methodNames.some((name) => name.includes('createFile')),
      ).toBe(true);
    });

    it('handles trigger symbols correctly', async () => {
      const docUri = 'file:///TestTrigger.trigger';
      const content = [
        'trigger TestTrigger on Account (before insert, after update) {',
        '  // trigger logic',
        '}',
      ].join('\n');
      const textDocument = TextDocument.create(docUri, 'apex', 1, content);
      (storage.getDocument as jest.Mock).mockResolvedValue(textDocument);

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      expect(result).toHaveLength(1);
      const triggerSymbol = result![0] as DocumentSymbol;
      expect(triggerSymbol.name).toBe('TestTrigger');
      expect(triggerSymbol.kind).toBe(5); // Triggers are mapped to Class
    });

    it('handles documents with parsing errors gracefully', async () => {
      const invalidApex = [
        'public class MyClass {',
        '  public String myField;',
        '  public void anotherMethod() {',
        "      System.debug('hello' // Missing semicolon",
        '  }',
        '}',
      ].join('\n');

      const docUri = 'file:///InvalidClass.cls';
      const textDocument = TextDocument.create(docUri, 'apex', 1, invalidApex);
      (storage.getDocument as jest.Mock).mockResolvedValue(textDocument);

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      // The parser is resilient and can still parse partial content
      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result![0].name).toBe('MyClass');
    });

    it('handles empty documents correctly', async () => {
      const docUri = 'file:///EmptyClass.cls';
      const content = '';
      const textDocument = TextDocument.create(docUri, 'apex', 1, content);
      (storage.getDocument as jest.Mock).mockResolvedValue(textDocument);

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      // Empty documents return empty arrays
      expect(result).toEqual([]);
    });

    it('handles documents with only whitespace correctly', async () => {
      const docUri = 'file:///WhitespaceClass.cls';
      const content = '   \n  \t  \n  ';
      const textDocument = TextDocument.create(docUri, 'apex', 1, content);
      (storage.getDocument as jest.Mock).mockResolvedValue(textDocument);

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      // Whitespace-only documents return empty arrays
      expect(result).toEqual([]);
    });
  });

  /**
   * Tests for VisibilitySymbolListener path
   * These tests ensure document symbols work correctly when using layered compilation
   * (VisibilitySymbolListener) which is used for workspace batch processing
   */
  describe('Layered Listener Path - VisibilitySymbolListener', () => {
    it('produces correct document symbols with compileLayered (VisibilitySymbolListener path)', async () => {
      const { CompilerService } = require('@salesforce/apex-lsp-parser-ast');

      const apexClassContent = [
        'public with sharing class TestLayeredClass {',
        '    private static String instanceField;',
        '',
        '    public void publicMethod() {',
        '        System.debug("hello");',
        '    }',
        '',
        '    private void privateMethod() {',
        '        System.debug("private");',
        '    }',
        '',
        '    public TestLayeredClass() {',
        '        instanceField = "test";',
        '    }',
        '}',
      ].join('\n');

      const docUri = 'file:///TestLayeredClass.cls';

      // Use compileLayered which correctly walks the same parse tree
      // with multiple VisibilitySymbolListeners (public-api, protected, private)
      const compilerService = new CompilerService();
      const result = compilerService.compileLayered(
        apexClassContent,
        docUri,
        ['public-api', 'protected', 'private'],
        undefined,
        { collectReferences: true, resolveReferences: true },
      );

      expect(result).toBeDefined();
      expect(result.result).toBeDefined();

      const table = result.result;
      const allSymbols = table.getAllSymbols();

      // Find the class symbol
      const classSymbol = allSymbols.find(
        (s: any) => s.kind === 'class' && s.name === 'TestLayeredClass',
      );
      expect(classSymbol).toBeDefined();

      // Find the class block
      const classBlock = allSymbols.find(
        (s: any) =>
          s.kind === 'block' &&
          s.scopeType === 'class' &&
          s.parentId === classSymbol.id,
      );
      expect(classBlock).toBeDefined();

      // Verify methods have parentId === classBlock.id (not classSymbol.id)
      // This is the key assertion that would have caught the regression
      const publicMethod = allSymbols.find(
        (s: any) => s.kind === 'method' && s.name === 'publicMethod',
      );
      expect(publicMethod).toBeDefined();
      expect(publicMethod.parentId).toBe(classBlock.id);

      const privateMethod = allSymbols.find(
        (s: any) => s.kind === 'method' && s.name === 'privateMethod',
      );
      expect(privateMethod).toBeDefined();
      expect(privateMethod.parentId).toBe(classBlock.id);

      // Verify constructor has parentId === classBlock.id
      const constructor = allSymbols.find(
        (s: any) => s.kind === 'constructor' && s.name === 'TestLayeredClass',
      );
      expect(constructor).toBeDefined();
      expect(constructor.parentId).toBe(classBlock.id);
    });

    it('produces correct document symbols with FullSymbolCollectorListener', async () => {
      const {
        CompilerService,
        FullSymbolCollectorListener,
      } = require('@salesforce/apex-lsp-parser-ast');

      const apexClassContent = [
        'public class TestFullCollector {',
        '    public String myField;',
        '',
        '    public void myMethod() {',
        '        System.debug("test");',
        '    }',
        '',
        '    public TestFullCollector() {}',
        '}',
      ].join('\n');

      const docUri = 'file:///TestFullCollector.cls';
      const compilerService = new CompilerService();
      const listener = new FullSymbolCollectorListener();
      listener.setCurrentFileUri(docUri);

      compilerService.compile(apexClassContent, docUri, listener);
      const table = listener.getResult();
      const allSymbols = table.getAllSymbols();

      // Find the class symbol
      const classSymbol = allSymbols.find(
        (s: any) => s.kind === 'class' && s.name === 'TestFullCollector',
      );
      expect(classSymbol).toBeDefined();

      // Find the class block
      const classBlock = allSymbols.find(
        (s: any) =>
          s.kind === 'block' &&
          s.scopeType === 'class' &&
          s.parentId === classSymbol.id,
      );
      expect(classBlock).toBeDefined();

      // Verify method has parentId === classBlock.id
      const method = allSymbols.find(
        (s: any) => s.kind === 'method' && s.name === 'myMethod',
      );
      expect(method).toBeDefined();
      expect(method.parentId).toBe(classBlock.id);

      // Verify constructor has parentId === classBlock.id
      const constructor = allSymbols.find(
        (s: any) => s.kind === 'constructor' && s.name === 'TestFullCollector',
      );
      expect(constructor).toBeDefined();
      expect(constructor.parentId).toBe(classBlock.id);
    });
  });
});
