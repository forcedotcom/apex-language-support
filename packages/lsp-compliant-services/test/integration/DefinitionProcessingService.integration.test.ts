/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DefinitionParams } from 'vscode-languageserver-protocol';
import { readFileSync } from 'fs';
import { join } from 'path';

import { DefinitionProcessingService } from '../../src/services/DefinitionProcessingService';
import {
  ApexSymbolManager,
  CompilerService,
  FullSymbolCollectorListener,
  SymbolTable,
  ResourceLoader,
  STANDARD_APEX_LIBRARY_URI,
} from '@salesforce/apex-lsp-parser-ast';
import {
  enableConsoleLogging,
  setLogLevel,
  getLogger,
} from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';

describe('DefinitionProcessingService Integration Tests - Keyword Context', () => {
  let definitionService: DefinitionProcessingService;
  let symbolManager: ApexSymbolManager;
  let resourceLoader: ResourceLoader;

  beforeAll(async () => {
    enableConsoleLogging();
    setLogLevel('error');

    (ResourceLoader as any).instance = null;
    resourceLoader = ResourceLoader.getInstance();
    await resourceLoader.initialize();
  });

  beforeEach(async () => {
    symbolManager = new ApexSymbolManager();

    try {
      const symbolTable =
        await resourceLoader.getSymbolTable('System/System.cls');
      if (symbolTable) {
        const systemUri = `${STANDARD_APEX_LIBRARY_URI}/System/System.cls`;
        await Effect.runPromise(
          symbolManager.addSymbolTable(symbolTable, systemUri),
        );
      }
    } catch (_error) {
      // Continue
    }

    const fixturesDir = join(__dirname, '../fixtures/classes');
    const systemKeywordTestPath = join(
      fixturesDir,
      'SystemKeywordTestClass.cls',
    );
    const systemKeywordTestContent = readFileSync(
      systemKeywordTestPath,
      'utf8',
    );

    const compilerService = new CompilerService();
    const systemKeywordTestTable = new SymbolTable();
    const systemKeywordTestListener = new FullSymbolCollectorListener(
      systemKeywordTestTable,
    );
    compilerService.compile(
      systemKeywordTestContent,
      'file:///SystemKeywordTestClass.cls',
      systemKeywordTestListener,
      {},
    );
    await Effect.runPromise(
      symbolManager.addSymbolTable(
        systemKeywordTestTable,
        'file:///SystemKeywordTestClass.cls',
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 100));

    definitionService = new DefinitionProcessingService(
      getLogger(),
      symbolManager,
    );
  });

  afterAll(async () => {
    (ResourceLoader as any).instance = null;
  });

  describe('SystemKeywordTestClass fixture', () => {
    it('navigates a native sObject field to its definition target', async () => {
      const propertyUri = 'file:///Property__c.cls';
      const propertySource = [
        'public class Property__c {',
        '  public String foo__c;',
        '}',
      ].join('\n');
      const propertyTable = new SymbolTable();
      new CompilerService().compile(
        propertySource,
        propertyUri,
        new FullSymbolCollectorListener(propertyTable),
        {},
      );
      await Effect.runPromise(
        symbolManager.addSymbolTable(propertyTable, propertyUri, 1, false),
      );

      const source = [
        'public class PropertyDefinitionTest {',
        '  public String read() {',
        '    Property__c property = new Property__c();',
        '    return property.foo__c;',
        '  }',
        '}',
      ].join('\n');
      const uri = 'file:///PropertyDefinitionTest.cls';
      const initialSource = [
        'public class PropertyDefinitionTest {',
        '  public String read() {',
        '    Property__c property = new Property__c();',
        "    return '';",
        '  }',
        '}',
      ].join('\n');
      const initialTable = new SymbolTable();
      new CompilerService().compile(
        initialSource,
        uri,
        new FullSymbolCollectorListener(initialTable),
        {},
      );
      await Effect.runPromise(
        symbolManager.addSymbolTable(initialTable, uri, 1),
      );

      const consumerTable = new SymbolTable();
      const listener = new FullSymbolCollectorListener(consumerTable);
      new CompilerService().compile(source, uri, listener, {});
      await Effect.runPromise(
        symbolManager.addSymbolTable(consumerTable, uri, 2),
      );
      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(uri),
      );

      const typeResult = await definitionService.processDefinition({
        textDocument: { uri },
        position: { line: 2, character: 5 },
      });
      const result = await definitionService.processDefinition({
        textDocument: { uri },
        position: { line: 3, character: 21 },
      });

      expect(typeResult).toEqual([
        expect.objectContaining({ uri: propertyUri }),
      ]);
      expect(result).toEqual([expect.objectContaining({ uri: propertyUri })]);
    });

    it('navigates a managed class reference to its VFS-backed real source', async () => {
      const remoteUri =
        'apex-org-artifact:/apex-class/billing.remoteservice.cls';
      const remoteSource = [
        'global class RemoteService {',
        "  global String greet() { return 'hello'; }",
        '}',
      ].join('\n');
      const remoteTable = new SymbolTable();
      const remoteListener = new FullSymbolCollectorListener(remoteTable);
      new CompilerService().compile(
        remoteSource,
        remoteUri,
        remoteListener,
        {},
      );
      await Effect.runPromise(
        symbolManager.addSymbolTable(remoteTable, remoteUri),
      );

      const consumerSource = [
        'public class RemoteConsumer {',
        '  public String run() {',
        '    RemoteService service;',
        '    return service.greet();',
        '  }',
        '}',
      ].join('\n');
      const consumerUri = 'file:///RemoteConsumer.cls';
      const consumerTable = new SymbolTable();
      const consumerListener = new FullSymbolCollectorListener(consumerTable);
      new CompilerService().compile(
        consumerSource,
        consumerUri,
        consumerListener,
        {},
      );
      await Effect.runPromise(
        symbolManager.addSymbolTable(consumerTable, consumerUri),
      );
      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(consumerUri),
      );

      const classDefinition = await definitionService.processDefinition({
        textDocument: { uri: consumerUri },
        position: { line: 2, character: 8 },
      });
      const memberDefinition = await definitionService.processDefinition({
        textDocument: { uri: consumerUri },
        position: { line: 3, character: 20 },
      });

      expect(classDefinition).toEqual([
        expect.objectContaining({ uri: remoteUri }),
      ]);
      expect(memberDefinition).toEqual([
        expect.objectContaining({ uri: remoteUri }),
      ]);
    });

    it('should return [] for definition at system in insert as system', async () => {
      const content = readFileSync(
        join(__dirname, '../fixtures/classes/SystemKeywordTestClass.cls'),
        'utf8',
      );
      const lines = content.split('\n');
      const lineIndex = lines.findIndex((l) => l.includes('insert as system'));
      expect(lineIndex).toBeGreaterThanOrEqual(0);
      const line = lines[lineIndex];
      const charIndex = line.indexOf('system');

      const params: DefinitionParams = {
        textDocument: { uri: 'file:///SystemKeywordTestClass.cls' },
        position: { line: lineIndex, character: charIndex },
      };

      const result = await definitionService.processDefinition(params);

      expect(result).toEqual([]);
    });

    it('should return definition location(s) for System in System.debug', async () => {
      const content = readFileSync(
        join(__dirname, '../fixtures/classes/SystemKeywordTestClass.cls'),
        'utf8',
      );
      const lines = content.split('\n');
      const lineIndex = lines.findIndex((l) => l.includes('System.debug'));
      expect(lineIndex).toBeGreaterThanOrEqual(0);
      const line = lines[lineIndex];
      const charIndex = line.indexOf('System');

      const params: DefinitionParams = {
        textDocument: { uri: 'file:///SystemKeywordTestClass.cls' },
        position: { line: lineIndex, character: charIndex },
      };

      const result = await definitionService.processDefinition(params);

      expect(result).toBeDefined();
      expect(result!.length).toBeGreaterThan(0);
      expect(result![0]).toHaveProperty('uri');
      expect(result![0]).toHaveProperty('range');
    });
  });
});
