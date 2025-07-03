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
import { getLogger, LoggerInterface } from '@salesforce/apex-lsp-logging';

import {
  DefaultApexDocumentSymbolProvider,
  ApexDocumentSymbolProvider,
} from '../../src/documentSymbol/ApexDocumentSymbolProvider';

import { ApexStorageInterface } from '../../src/storage/ApexStorageInterface';

// Mock only logging to keep test output clean
jest.mock('@salesforce/apex-lsp-logging');

const mockedGetLogger = getLogger as jest.Mock;

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
  let mockLogger: jest.Mocked<LoggerInterface>;

  beforeEach(async () => {
    // Simple in-memory storage implementation for the test
    storage = {
      getDocument: jest.fn(),
    } as any;

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
    } as any;
    mockedGetLogger.mockReturnValue(mockLogger);

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
        '    public CommunitiesLandingController(Boolean a) {',
        "        System.debug('Example');",
        '        if (a) {',
        "            System.debug('oh no');",
        '        }',
        '     }',
        '',
        ' }',
      ].join('\n');

      const docUri = 'file:///CommunitiesLandingController.cls';
      const textDocument = TextDocument.create(
        docUri,
        'apex',
        1,
        apexClassContent,
      );
      (storage.getDocument as jest.Mock).mockResolvedValue(textDocument);

      const params: DocumentSymbolParams = { textDocument: { uri: docUri } };
      const result = await symbolProvider.provideDocumentSymbols(params);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);

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
              end: { character: 5, line: 7 },
              start: { character: 25, line: 5 },
            },
            selectionRange: {
              end: { character: 43, line: 5 },
              start: { character: 25, line: 5 },
            },
          },
          {
            children: [],
            kind: 6, // SymbolKind.Method
            name: 'CommunitiesLandingController(Boolean) : void',
            range: {
              end: { character: 5, line: 14 },
              start: { character: 11, line: 9 },
            },
            selectionRange: {
              end: { character: 39, line: 9 },
              start: { character: 11, line: 9 },
            },
          },
        ],
        kind: 5, // SymbolKind.Class
        name: 'CommunitiesLandingController',
        range: {
          end: { character: 1, line: 16 },
          start: { character: 26, line: 3 },
        },
        selectionRange: {
          end: { character: 54, line: 3 },
          start: { character: 26, line: 3 },
        },
      };

      // Convert result to plain JSON for deep equality comparison
      const plainResult = JSON.parse(JSON.stringify(result![0]));

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
  });
});
