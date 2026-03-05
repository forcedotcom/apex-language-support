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
