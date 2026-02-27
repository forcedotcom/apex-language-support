/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Hypothesis validation: getReferencesAtPosition returns empty for keyword positions
 * and non-empty for resolvable positions. Reference creation is context-aware.
 */
import * as fs from 'fs';
import * as path from 'path';
import { CompilerService } from '../../src/parser/compilerService';
import { FullSymbolCollectorListener } from '../../src/parser/listeners/FullSymbolCollectorListener';
import { SymbolTable } from '../../src/types/symbol';
import { Effect } from 'effect';
import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import {
  initialize as schedulerInitialize,
  shutdown as schedulerShutdown,
  reset as schedulerReset,
} from '../../src/queue/priority-scheduler-utils';

const loadFixture = (filename: string): string => {
  const fixturePath = path.join(
    __dirname,
    '../fixtures/keyword-context',
    filename,
  );
  return fs.readFileSync(fixturePath, 'utf8');
};

/**
 * Find position of nth occurrence of searchString in source (1-based line, 0-based character)
 */
const findPosition = (
  sourceCode: string,
  searchString: string,
  occurrenceIndex: number = 1,
): { line: number; character: number } => {
  const lines = sourceCode.split('\n');
  let currentIndex = 0;
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineText = lines[lineIdx];
    let searchStart = 0;
    while (true) {
      const foundIndex = lineText.indexOf(searchString, searchStart);
      if (foundIndex < 0) break;
      currentIndex++;
      if (currentIndex === occurrenceIndex) {
        return { line: lineIdx + 1, character: foundIndex };
      }
      searchStart = foundIndex + 1;
    }
  }
  expect(currentIndex).toBeGreaterThanOrEqual(occurrenceIndex);
  return { line: 1, character: 0 };
};

describe('getReferencesAtPosition - keyword context hypothesis', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;
  const fileUri = 'file:///SystemKeywordTestClass.cls';

  beforeAll(async () => {
    await Effect.runPromise(
      schedulerInitialize({
        queueCapacity: 100,
        maxHighPriorityStreak: 50,
        idleSleepMs: 1,
      }),
    );
  });

  afterAll(async () => {
    try {
      await Effect.runPromise(schedulerShutdown());
    } catch {
      // ignore
    }
    try {
      await Effect.runPromise(schedulerReset());
    } catch {
      // ignore
    }
  });

  let symbolTable: SymbolTable;

  beforeEach(async () => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();

    const sourceCode = loadFixture('SystemKeywordTestClass.cls');
    symbolTable = new SymbolTable();
    const listener = new FullSymbolCollectorListener(symbolTable);
    listener.setCurrentFileUri(fileUri);
    const result = compilerService.compile(sourceCode, fileUri, listener, {});

    const tableToAdd = (result.result || symbolTable) as SymbolTable;
    if (tableToAdd) {
      await Effect.runPromise(
        symbolManager.addSymbolTable(tableToAdd, fileUri),
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterEach(() => {
    symbolManager.clear();
  });

  describe('resolvable positions (expect references)', () => {
    it('should have references at System in System.debug', () => {
      const sourceCode = loadFixture('SystemKeywordTestClass.cls');
      // Search for "System.debug" - position at start is System
      const position = findPosition(sourceCode, 'System.debug', 1);
      const table = symbolManager.getSymbolTableForFile(fileUri) ?? symbolTable;
      const refs = table.getReferencesAtPosition(position);
      expect(refs.length).toBeGreaterThan(0);
    });

    it('should have references at System in System.String', () => {
      const sourceCode = loadFixture('SystemKeywordTestClass.cls');
      const pos = findPosition(sourceCode, 'System.String', 1);
      const table = symbolManager.getSymbolTableForFile(fileUri) ?? symbolTable;
      const refs = table.getReferencesAtPosition(pos);
      expect(refs.length).toBeGreaterThan(0);
    });

    it('should have references at System in System.List', () => {
      const sourceCode = loadFixture('SystemKeywordTestClass.cls');
      // Second "System.List" is in "new System.List<String>()" - ref at col 39
      const pos = findPosition(sourceCode, 'System.List', 2);
      const table = symbolManager.getSymbolTableForFile(fileUri) ?? symbolTable;
      const refs = table.getReferencesAtPosition(pos);
      expect(refs.length).toBeGreaterThan(0);
    });
  });

  describe('keyword positions (expect no references)', () => {
    it('should have no references at system in system.runas', () => {
      const sourceCode = loadFixture('SystemKeywordTestClass.cls');
      const pos = findPosition(sourceCode, 'system', 1); // system in system.runas
      const refs = symbolManager.getReferencesAtPosition(fileUri, pos);
      expect(refs).toHaveLength(0);
    });

    it('should have no references at system in insert as system', () => {
      const sourceCode = loadFixture('SystemKeywordTestClass.cls');
      const pos = findPosition(sourceCode, 'system', 2); // system in insert as system
      const refs = symbolManager.getReferencesAtPosition(fileUri, pos);
      expect(refs).toHaveLength(0);
    });

    it('should have no references at system in update as system', () => {
      const sourceCode = loadFixture('SystemKeywordTestClass.cls');
      const pos = findPosition(sourceCode, 'system', 3); // system in update as system
      const refs = symbolManager.getReferencesAtPosition(fileUri, pos);
      expect(refs).toHaveLength(0);
    });

    it('should have no references at SYSTEM in WITH SYSTEM_MODE', () => {
      const sourceCode = loadFixture('SystemKeywordTestClass.cls');
      const pos = findPosition(sourceCode, 'SYSTEM_MODE');
      const refs = symbolManager.getReferencesAtPosition(fileUri, pos);
      expect(refs).toHaveLength(0);
    });
  });
});
