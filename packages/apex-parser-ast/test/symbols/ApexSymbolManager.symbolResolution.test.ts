/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';
import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../src/parser/compilerService';
import { FullSymbolCollectorListener } from '../../src/parser/listeners/FullSymbolCollectorListener';
import {
  initialize as schedulerInitialize,
  shutdown as schedulerShutdown,
  reset as schedulerReset,
} from '../../src/queue/priority-scheduler-utils';
import { Effect } from 'effect';
import * as fs from 'fs';
import * as path from 'path';

describe('ApexSymbolManager - Symbol Resolution Fixes (Parser/AST)', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeAll(async () => {
    // Initialize scheduler before all tests
    await Effect.runPromise(
      schedulerInitialize({
        queueCapacity: 100,
        maxHighPriorityStreak: 50,
        idleSleepMs: 1,
      }),
    );
  });

  afterAll(async () => {
    // Shutdown the scheduler first to stop the background loop
    try {
      await Effect.runPromise(schedulerShutdown());
    } catch (_error) {
      // Ignore errors - scheduler might not be initialized or already shut down
    }
    // Reset scheduler state after shutdown
    try {
      await Effect.runPromise(schedulerReset());
    } catch (_error) {
      // Ignore errors - scheduler might not be initialized
    }
  });

  beforeEach(() => {
    enableConsoleLogging();
    setLogLevel('error');
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(() => {
    symbolManager.clear();
  });

  /**
   * Load a fixture file from the symbol-resolution fixtures directory
   */
  const loadFixture = (filename: string): string => {
    const fixturePath = path.join(
      __dirname,
      '../fixtures/symbol-resolution',
      filename,
    );
    return fs.readFileSync(fixturePath, 'utf8');
  };

  /**
   * Find the line and character position of a search string in source code
   */
  const findPosition = (
    sourceCode: string,
    searchString: string,
    offset: number = 0,
  ): { line: number; character: number } => {
    const lines = sourceCode.split('\n');
    const targetLineIndex = lines.findIndex((line) =>
      line.includes(searchString),
    );
    expect(targetLineIndex).toBeGreaterThanOrEqual(0);
    // Convert 0-based array index to 1-based line number
    const targetLine = targetLineIndex + 1;
    const targetLineText = lines[targetLineIndex];
    const character = targetLineText.indexOf(searchString) + offset;
    return { line: targetLine, character };
  };

  describe('this.methodName() symbol resolution', () => {
    it('should resolve method name in this.methodName() expression', async () => {
      const sourceCode = loadFixture('ThisMethodCall.cls');
      const fileUri = 'file:///test/ThisMethodCall.cls';

      const listener = new FullSymbolCollectorListener();
      const result = compilerService.compile(sourceCode, fileUri, listener);

      if (result.result) {
        await symbolManager.addSymbolTable(result.result, fileUri);
      }

      // Wait for reference processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Calculate position: find the method name in the source code
      const position = findPosition(
        sourceCode,
        'locateAccountRecordTypeAutoDeletionService',
      );

      // Test symbol resolution on method name in "this.locateAccountRecordTypeAutoDeletionService()"
      const symbol = await symbolManager.getSymbolAtPosition(
        fileUri,
        position,
        'precise',
      );

      expect(symbol).toBeDefined();
      expect(symbol?.name).toBe('locateAccountRecordTypeAutoDeletionService');
      expect(symbol?.kind).toBe('method');
      expect(symbol?.fileUri).toBe(fileUri);
    });

    it('should resolve method name in chained this.methodName().anotherMethod() expression', async () => {
      const sourceCode = loadFixture('ChainedThisMethodCall.cls');
      const fileUri = 'file:///test/ChainedThisMethodCall.cls';

      const listener = new FullSymbolCollectorListener();
      const result = compilerService.compile(sourceCode, fileUri, listener);

      if (result.result) {
        await symbolManager.addSymbolTable(result.result, fileUri);
      }

      // Wait for reference processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Calculate positions - find the method calls in chained expression
      // Need to find the call (with "this.") not the declaration
      const lines = sourceCode.split('\n');
      const firstMethodLineIndex = lines.findIndex((line) =>
        line.includes('this.locateAccountRecordTypeAutoDeletionService()'),
      );
      expect(firstMethodLineIndex).toBeGreaterThanOrEqual(0);
      const firstMethodLine = firstMethodLineIndex + 1;
      const firstMethodLineText = lines[firstMethodLineIndex];
      const firstMethodStart = firstMethodLineText.indexOf(
        'locateAccountRecordTypeAutoDeletionService',
      );
      const firstMethodPosition = {
        line: firstMethodLine,
        character: firstMethodStart,
      };

      const secondMethodLineIndex = lines.findIndex((line) =>
        line.includes('.getAccountRecordTypeAutoDeletionModel()'),
      );
      expect(secondMethodLineIndex).toBeGreaterThanOrEqual(0);
      const secondMethodLine = secondMethodLineIndex + 1;
      const secondMethodLineText = lines[secondMethodLineIndex];
      const secondMethodStart = secondMethodLineText.indexOf(
        'getAccountRecordTypeAutoDeletionModel',
      );
      const secondMethodPosition = {
        line: secondMethodLine,
        character: secondMethodStart,
      };

      // Test symbol resolution on first method name
      const symbol1 = await symbolManager.getSymbolAtPosition(
        fileUri,
        firstMethodPosition,
        'precise',
      );

      expect(symbol1).toBeDefined();
      expect(symbol1?.name).toBe('locateAccountRecordTypeAutoDeletionService');
      expect(symbol1?.kind).toBe('method');

      // Test symbol resolution on second method name
      const symbol2 = await symbolManager.getSymbolAtPosition(
        fileUri,
        secondMethodPosition,
        'precise',
      );

      expect(symbol2).toBeDefined();
      expect(symbol2?.name).toBe('getAccountRecordTypeAutoDeletionModel');
      expect(symbol2?.kind).toBe('method');
    });
  });

  describe('new ClassName() symbol resolution', () => {
    it('should resolve class name in new ClassName() expression', async () => {
      const sourceCode = loadFixture('NewExpression.cls');
      const fileUri = 'file:///test/NewExpression.cls';

      const listener = new FullSymbolCollectorListener();
      const result = compilerService.compile(sourceCode, fileUri, listener);

      if (result.result) {
        await symbolManager.addSymbolTable(result.result, fileUri);
      }

      // Wait for reference processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Calculate position: find the class name after "new " in the source code
      const lines = sourceCode.split('\n');
      const targetLineIndex = lines.findIndex((line) =>
        line.includes('new AccountAutoDeletionSettingsVMapper'),
      );
      expect(targetLineIndex).toBeGreaterThanOrEqual(0);
      const targetLine = targetLineIndex + 1;
      const targetLineText = lines[targetLineIndex];
      const newPos = targetLineText.indexOf('new ');
      const classNameStart = targetLineText.indexOf(
        'AccountAutoDeletionSettingsVMapper',
        newPos,
      );
      const position = { line: targetLine, character: classNameStart };

      // Test symbol resolution on class name in "new AccountAutoDeletionSettingsVMapper()"
      const symbol = await symbolManager.getSymbolAtPosition(
        fileUri,
        position,
        'precise',
      );

      expect(symbol).toBeDefined();
      expect(symbol?.name).toBe('AccountAutoDeletionSettingsVMapper');
      expect(symbol?.kind).toBe('class');
    });

    it('should resolve class name in new List<ClassName>() expression', async () => {
      const sourceCode = loadFixture('NewGenericExpression.cls');
      const fileUri = 'file:///test/NewGenericExpression.cls';

      const listener = new FullSymbolCollectorListener();
      const result = compilerService.compile(sourceCode, fileUri, listener);

      if (result.result) {
        await symbolManager.addSymbolTable(result.result, fileUri);
      }

      // Wait for reference processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Calculate position: find DualListboxValueVModel in the generic type parameter
      // Find the first occurrence which should be in the type parameter, not a declaration
      const position = findPosition(sourceCode, 'DualListboxValueVModel');

      // Test symbol resolution on class name in generic type
      const symbol = await symbolManager.getSymbolAtPosition(
        fileUri,
        position,
        'precise',
      );

      expect(symbol).toBeDefined();
      expect(symbol?.name).toBe('DualListboxValueVModel');
      expect(symbol?.kind).toBe('class');
    });
  });

  describe('method declaration symbol resolution', () => {
    it('should resolve method name when hovering on method name in declaration', async () => {
      const sourceCode = loadFixture('MethodDeclaration.cls');
      const fileUri = 'file:///test/MethodDeclaration.cls';

      const listener = new FullSymbolCollectorListener();
      const result = compilerService.compile(sourceCode, fileUri, listener);

      if (result.result) {
        await symbolManager.addSymbolTable(result.result, fileUri);
      }

      // Wait for reference processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Calculate position: find getInstance in the method declaration
      const position = findPosition(sourceCode, 'getInstance');

      // Test symbol resolution on method name in declaration
      const symbol = await symbolManager.getSymbolAtPosition(
        fileUri,
        position,
        'precise',
      );

      expect(symbol).toBeDefined();
      expect(symbol?.name).toBe('getInstance');
      expect(symbol?.kind).toBe('method');
      expect(symbol?.fileUri).toBe(fileUri);
    });

    it('should resolve method name when hovering on method name in private method declaration', async () => {
      const sourceCode = loadFixture('PrivateMethodDeclaration.cls');
      const fileUri = 'file:///test/PrivateMethodDeclaration.cls';

      const listener = new FullSymbolCollectorListener();
      const result = compilerService.compile(sourceCode, fileUri, listener);

      if (result.result) {
        await symbolManager.addSymbolTable(result.result, fileUri);
      }

      // Wait for reference processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Calculate position: find privateMethod in the method declaration
      const position = findPosition(sourceCode, 'privateMethod');

      // Test symbol resolution on private method name in declaration
      const symbol = await symbolManager.getSymbolAtPosition(
        fileUri,
        position,
        'precise',
      );

      expect(symbol).toBeDefined();
      expect(symbol?.name).toBe('privateMethod');
      expect(symbol?.kind).toBe('method');
    });
  });

  describe('assignment LHS symbol resolution', () => {
    it('should resolve private static field when hovering on assignment LHS', async () => {
      const sourceCode = loadFixture('AssignmentLHS.cls');
      const fileUri = 'file:///test/AssignmentLHS.cls';

      const listener = new FullSymbolCollectorListener();
      const result = compilerService.compile(sourceCode, fileUri, listener);

      if (result.result) {
        await symbolManager.addSymbolTable(result.result, fileUri);
      }

      // Wait for reference processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Calculate position: find instance in assignment (instance = new ...)
      const lines = sourceCode.split('\n');
      const targetLineIndex = lines.findIndex((line) =>
        line.includes('instance = new'),
      );
      expect(targetLineIndex).toBeGreaterThanOrEqual(0);
      const targetLine = targetLineIndex + 1;
      const targetLineText = lines[targetLineIndex];
      const instanceStart = targetLineText.indexOf('instance');
      const instancePosition = { line: targetLine, character: instanceStart };

      // Test symbol resolution on instance in assignment LHS
      const symbol = await symbolManager.getSymbolAtPosition(
        fileUri,
        instancePosition,
        'precise',
      );

      expect(symbol).toBeDefined();
      expect(symbol?.name).toBe('instance');
      expect(symbol?.kind).toBe('field');
      expect(symbol?.modifiers?.isStatic).toBe(true);
      expect(symbol?.modifiers?.visibility).toBe('private');
    });

    it('should resolve private static field when hovering on assignment LHS in if condition', async () => {
      const sourceCode = loadFixture('AssignmentLHSInCondition.cls');
      const fileUri = 'file:///test/AssignmentLHSInCondition.cls';

      const listener = new FullSymbolCollectorListener();
      const result = compilerService.compile(sourceCode, fileUri, listener);

      if (result.result) {
        await symbolManager.addSymbolTable(result.result, fileUri);
      }

      // Wait for reference processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Calculate position: find instance in if condition (if (instance == null))
      const lines = sourceCode.split('\n');
      const targetLineIndex = lines.findIndex((line) =>
        line.includes('if (instance == null)'),
      );
      expect(targetLineIndex).toBeGreaterThanOrEqual(0);
      const targetLine = targetLineIndex + 1;
      const targetLineText = lines[targetLineIndex];
      const instanceStart = targetLineText.indexOf('instance');
      const instancePosition = { line: targetLine, character: instanceStart };

      // Test symbol resolution on instance in if condition
      const symbol = await symbolManager.getSymbolAtPosition(
        fileUri,
        instancePosition,
        'precise',
      );

      expect(symbol).toBeDefined();
      expect(symbol?.name).toBe('instance');
      expect(symbol?.kind).toBe('field');
      expect(symbol?.modifiers?.isStatic).toBe(true);
      expect(symbol?.modifiers?.visibility).toBe('private');
    });
  });

  describe('on-demand enrichment for private symbols', () => {
    it('should enrich SymbolTable when hovering on private field that was not initially indexed', async () => {
      const sourceCode = loadFixture('OnDemandEnrichment.cls');
      const fileUri = 'file:///test/OnDemandEnrichment.cls';

      // Use FullSymbolCollectorListener which collects all symbols
      // In real scenario, initial load might use PublicAPISymbolListener only
      const listener = new FullSymbolCollectorListener();
      const result = compilerService.compile(sourceCode, fileUri, listener);

      if (result.result) {
        await symbolManager.addSymbolTable(result.result, fileUri);
      }

      // Wait for reference processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Calculate position: find instance in if condition
      const lines = sourceCode.split('\n');
      const targetLineIndex = lines.findIndex((line) =>
        line.includes('if (instance == null)'),
      );
      expect(targetLineIndex).toBeGreaterThanOrEqual(0);
      const targetLine = targetLineIndex + 1;
      const targetLineText = lines[targetLineIndex];
      const instanceStart = targetLineText.indexOf('instance');
      const instancePosition = { line: targetLine, character: instanceStart };

      // Test symbol resolution on private field - should work even if initially only public-api was indexed
      const symbol = await symbolManager.getSymbolAtPosition(
        fileUri,
        instancePosition,
        'precise',
      );

      expect(symbol).toBeDefined();
      expect(symbol?.name).toBe('instance');
      expect(symbol?.kind).toBe('field');
      expect(symbol?.modifiers?.visibility).toBe('private');
    });
  });

  describe('identifierRange accuracy', () => {
    it('should have accurate identifierRange for method references in this.methodName()', async () => {
      const sourceCode = loadFixture('IdentifierRangeMethod.cls');
      const fileUri = 'file:///test/IdentifierRangeMethod.cls';

      const listener = new FullSymbolCollectorListener();
      const result = compilerService.compile(sourceCode, fileUri, listener);

      if (result.result) {
        await symbolManager.addSymbolTable(result.result, fileUri);
      }

      // Wait for reference processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Calculate position: find the method name in the source code
      const position = findPosition(
        sourceCode,
        'locateAccountRecordTypeAutoDeletionService',
      );

      // Get references at the method name position
      const symbolTable = result.result;
      const references = symbolTable?.getReferencesAtPosition(position);

      expect(references).toBeDefined();
      expect(references?.length).toBeGreaterThan(0);

      // Verify the reference has accurate identifierRange
      const methodRef = references?.find(
        (ref) => ref.name === 'locateAccountRecordTypeAutoDeletionService',
      );
      expect(methodRef).toBeDefined();
      expect(methodRef?.location.identifierRange.startLine).toBe(position.line);
      expect(methodRef?.location.identifierRange.endLine).toBe(position.line);
      // The identifierRange should cover only the method name, not the entire expression
      expect(methodRef?.location.identifierRange.startColumn).toBeDefined();
      expect(methodRef?.location.identifierRange.endColumn).toBeDefined();
      expect(methodRef!.location.identifierRange.endColumn).toBeGreaterThan(
        methodRef!.location.identifierRange.startColumn,
      );
    });

    it('should have accurate identifierRange for constructor call references', async () => {
      const sourceCode = loadFixture('IdentifierRangeConstructor.cls');
      const fileUri = 'file:///test/IdentifierRangeConstructor.cls';

      const listener = new FullSymbolCollectorListener();
      const result = compilerService.compile(sourceCode, fileUri, listener);

      if (result.result) {
        await symbolManager.addSymbolTable(result.result, fileUri);
      }

      // Wait for reference processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Calculate position: find the class name after "new " in the source code
      const lines = sourceCode.split('\n');
      const targetLineIndex = lines.findIndex((line) =>
        line.includes('new AccountAutoDeletionSettingsVMapper'),
      );
      expect(targetLineIndex).toBeGreaterThanOrEqual(0);
      const targetLine = targetLineIndex + 1;
      const targetLineText = lines[targetLineIndex];
      const newPos = targetLineText.indexOf('new ');
      const classNameStart = targetLineText.indexOf(
        'AccountAutoDeletionSettingsVMapper',
        newPos,
      );
      const position = { line: targetLine, character: classNameStart };

      // Get references at the class name position in new expression
      const symbolTable = result.result;
      const references = symbolTable?.getReferencesAtPosition(position);

      expect(references).toBeDefined();
      expect(references?.length).toBeGreaterThan(0);

      // Verify the reference has accurate identifierRange
      const constructorRef = references?.find(
        (ref) => ref.name === 'AccountAutoDeletionSettingsVMapper',
      );
      expect(constructorRef).toBeDefined();
      expect(constructorRef?.location.identifierRange.startLine).toBe(
        position.line,
      );
      expect(constructorRef?.location.identifierRange.endLine).toBe(
        position.line,
      );
      // The identifierRange should cover only the class name, not the entire new expression
      expect(
        constructorRef?.location.identifierRange.startColumn,
      ).toBeDefined();
      expect(constructorRef?.location.identifierRange.endColumn).toBeDefined();
      expect(
        constructorRef!.location.identifierRange.endColumn,
      ).toBeGreaterThan(constructorRef!.location.identifierRange.startColumn);
    });
  });
});
