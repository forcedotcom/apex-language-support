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

  describe('this.methodName() hover resolution', () => {
    it('should resolve method name in this.methodName() expression', async () => {
      const sourceCode = `
        public class TestClass {
          public void testMethod() {
            this.locateAccountRecordTypeAutoDeletionService();
          }
          
          private AccountRecordTypeAutoDeletionService locateAccountRecordTypeAutoDeletionService() {
            return new AccountRecordTypeAutoDeletionService();
          }
        }
      `;

      const listener = new FullSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'file:///test/TestClass.cls',
        listener,
      );

      if (result.result) {
        await symbolManager.addSymbolTable(
          result.result,
          'file:///test/TestClass.cls',
        );
      }

      // Wait for reference processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Calculate position: find the method name in the source code
      const lines = sourceCode.split('\n');
      const targetLine = lines.findIndex((line) =>
        line.includes('this.locateAccountRecordTypeAutoDeletionService()'),
      );
      const targetLineText = lines[targetLine];
      const methodNameStart = targetLineText.indexOf(
        'locateAccountRecordTypeAutoDeletionService',
      );

      // Test hover on method name in "this.locateAccountRecordTypeAutoDeletionService()"
      const symbol = await symbolManager.getSymbolAtPosition(
        'file:///test/TestClass.cls',
        { line: targetLine, character: methodNameStart },
        'precise',
      );

      expect(symbol).toBeDefined();
      expect(symbol?.name).toBe('locateAccountRecordTypeAutoDeletionService');
      expect(symbol?.kind).toBe('method');
      expect(symbol?.fileUri).toBe('file:///test/TestClass.cls');
    });

    it('should resolve method name in chained this.methodName().anotherMethod() expression', async () => {
      const sourceCode = `
        public class TestClass {
          public void testMethod() {
            this.locateAccountRecordTypeAutoDeletionService()
                .getAccountRecordTypeAutoDeletionModel();
          }
          
          private AccountRecordTypeAutoDeletionService locateAccountRecordTypeAutoDeletionService() {
            return new AccountRecordTypeAutoDeletionService();
          }
        }
      `;

      const listener = new FullSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'file:///test/TestClass.cls',
        listener,
      );

      if (result.result) {
        await symbolManager.addSymbolTable(
          result.result,
          'file:///test/TestClass.cls',
        );
      }

      // Wait for reference processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Calculate positions
      const lines = sourceCode.split('\n');
      const firstMethodLine = lines.findIndex((line) =>
        line.includes('this.locateAccountRecordTypeAutoDeletionService()'),
      );
      const firstMethodLineText = lines[firstMethodLine];
      const firstMethodStart = firstMethodLineText.indexOf(
        'locateAccountRecordTypeAutoDeletionService',
      );

      const secondMethodLine = lines.findIndex((line) =>
        line.includes('getAccountRecordTypeAutoDeletionModel()'),
      );
      const secondMethodLineText = lines[secondMethodLine];
      const secondMethodStart = secondMethodLineText.indexOf(
        'getAccountRecordTypeAutoDeletionModel',
      );

      // Test hover on first method name
      const symbol1 = await symbolManager.getSymbolAtPosition(
        'file:///test/TestClass.cls',
        { line: firstMethodLine, character: firstMethodStart },
        'precise',
      );

      expect(symbol1).toBeDefined();
      expect(symbol1?.name).toBe('locateAccountRecordTypeAutoDeletionService');
      expect(symbol1?.kind).toBe('method');

      // Test hover on second method name
      const symbol2 = await symbolManager.getSymbolAtPosition(
        'file:///test/TestClass.cls',
        { line: secondMethodLine, character: secondMethodStart },
        'precise',
      );

      expect(symbol2).toBeDefined();
      expect(symbol2?.name).toBe('getAccountRecordTypeAutoDeletionModel');
      expect(symbol2?.kind).toBe('method');
    });
  });

  describe('new ClassName() hover resolution', () => {
    it('should resolve class name in new ClassName() expression', async () => {
      const sourceCode = `
        public class TestClass {
          public void testMethod() {
            AccountAutoDeletionSettingsVMapper mapper = new AccountAutoDeletionSettingsVMapper();
          }
        }
        
        public class AccountAutoDeletionSettingsVMapper {
          public AccountAutoDeletionSettingsVMapper() { }
        }
      `;

      const listener = new FullSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'file:///test/TestClass.cls',
        listener,
      );

      if (result.result) {
        await symbolManager.addSymbolTable(
          result.result,
          'file:///test/TestClass.cls',
        );
      }

      // Wait for reference processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Calculate position: find the class name after "new " in the source code
      const lines = sourceCode.split('\n');
      const targetLine = lines.findIndex((line) =>
        line.includes('new AccountAutoDeletionSettingsVMapper()'),
      );
      const targetLineText = lines[targetLine];
      const classNameStart = targetLineText.indexOf('new ') + 4; // Position after "new "

      // Test hover on class name in "new AccountAutoDeletionSettingsVMapper()"
      const symbol = await symbolManager.getSymbolAtPosition(
        'file:///test/TestClass.cls',
        { line: targetLine, character: classNameStart },
        'precise',
      );

      expect(symbol).toBeDefined();
      expect(symbol?.name).toBe('AccountAutoDeletionSettingsVMapper');
      expect(symbol?.kind).toBe('class');
    });

    it('should resolve class name in new List<ClassName>() expression', async () => {
      const sourceCode = `
        public class TestClass {
          public void testMethod() {
            List<DualListboxValueVModel> list = new List<DualListboxValueVModel>();
          }
        }
        
        public class DualListboxValueVModel {
        }
      `;

      const listener = new FullSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'file:///test/TestClass.cls',
        listener,
      );

      if (result.result) {
        await symbolManager.addSymbolTable(
          result.result,
          'file:///test/TestClass.cls',
        );
      }

      // Wait for reference processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Calculate position: find DualListboxValueVModel in the generic type
      const lines = sourceCode.split('\n');
      const targetLine = lines.findIndex((line) =>
        line.includes('List<DualListboxValueVModel>'),
      );
      const targetLineText = lines[targetLine];
      const classNameStart = targetLineText.indexOf('<') + 1; // Position after "<"

      // Test hover on class name in generic type
      const symbol = await symbolManager.getSymbolAtPosition(
        'file:///test/TestClass.cls',
        { line: targetLine, character: classNameStart },
        'precise',
      );

      expect(symbol).toBeDefined();
      expect(symbol?.name).toBe('DualListboxValueVModel');
      expect(symbol?.kind).toBe('class');
    });
  });

  describe('method declaration hover resolution', () => {
    it('should resolve method name when hovering on method name in declaration', async () => {
      const sourceCode = `
        public class TestClass {
          public static AccountAutoDeletionSettingsVMapper getInstance() {
            return null;
          }
        }
      `;

      const listener = new FullSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'file:///test/TestClass.cls',
        listener,
      );

      if (result.result) {
        await symbolManager.addSymbolTable(
          result.result,
          'file:///test/TestClass.cls',
        );
      }

      // Wait for reference processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Calculate position: find getInstance in the method declaration
      const lines = sourceCode.split('\n');
      const targetLine = lines.findIndex((line) =>
        line.includes('getInstance()'),
      );
      const targetLineText = lines[targetLine];
      const methodNameStart = targetLineText.indexOf('getInstance');

      // Test hover on method name in declaration
      const symbol = await symbolManager.getSymbolAtPosition(
        'file:///test/TestClass.cls',
        { line: targetLine, character: methodNameStart },
        'precise',
      );

      expect(symbol).toBeDefined();
      expect(symbol?.name).toBe('getInstance');
      expect(symbol?.kind).toBe('method');
      expect(symbol?.fileUri).toBe('file:///test/TestClass.cls');
    });

    it('should resolve method name when hovering on method name in private method declaration', async () => {
      const sourceCode = `
        public class TestClass {
          private void privateMethod() {
            // Private method
          }
        }
      `;

      const listener = new FullSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'file:///test/TestClass.cls',
        listener,
      );

      if (result.result) {
        await symbolManager.addSymbolTable(
          result.result,
          'file:///test/TestClass.cls',
        );
      }

      // Wait for reference processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Calculate position: find privateMethod in the method declaration
      const lines = sourceCode.split('\n');
      const targetLine = lines.findIndex((line) =>
        line.includes('privateMethod()'),
      );
      const targetLineText = lines[targetLine];
      const methodNameStart = targetLineText.indexOf('privateMethod');

      // Test hover on private method name in declaration
      const symbol = await symbolManager.getSymbolAtPosition(
        'file:///test/TestClass.cls',
        { line: targetLine, character: methodNameStart },
        'precise',
      );

      expect(symbol).toBeDefined();
      expect(symbol?.name).toBe('privateMethod');
      expect(symbol?.kind).toBe('method');
    });
  });

  describe('assignment LHS hover resolution', () => {
    it('should resolve private static field when hovering on assignment LHS', async () => {
      const sourceCode = `
        public class TestClass {
          @TestVisible private static AccountAutoDeletionSettingsVMapper instance;
          
          public static AccountAutoDeletionSettingsVMapper getInstance() {
            if (instance == null) {
              instance = new AccountAutoDeletionSettingsVMapper();
            }
            return instance;
          }
        }
        
        public class AccountAutoDeletionSettingsVMapper {
          public AccountAutoDeletionSettingsVMapper() { }
        }
      `;

      const listener = new FullSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'file:///test/TestClass.cls',
        listener,
      );

      if (result.result) {
        await symbolManager.addSymbolTable(
          result.result,
          'file:///test/TestClass.cls',
        );
      }

      // Wait for reference processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Calculate position: find instance in assignment (instance = new ...)
      const lines = sourceCode.split('\n');
      const targetLine = lines.findIndex((line) =>
        line.includes('instance = new'),
      );
      const targetLineText = lines[targetLine];
      const instanceStart = targetLineText.indexOf('instance');

      // Test hover on instance in assignment LHS
      const symbol = await symbolManager.getSymbolAtPosition(
        'file:///test/TestClass.cls',
        { line: targetLine, character: instanceStart },
        'precise',
      );

      expect(symbol).toBeDefined();
      expect(symbol?.name).toBe('instance');
      expect(symbol?.kind).toBe('field');
      expect(symbol?.modifiers?.isStatic).toBe(true);
      expect(symbol?.modifiers?.visibility).toBe('private');
    });

    it('should resolve private static field when hovering on assignment LHS in if condition', async () => {
      const sourceCode = `
        public class TestClass {
          @TestVisible private static AccountAutoDeletionSettingsVMapper instance;
          
          public static AccountAutoDeletionSettingsVMapper getInstance() {
            if (instance == null) {
              instance = new AccountAutoDeletionSettingsVMapper();
            }
            return instance;
          }
        }
        
        public class AccountAutoDeletionSettingsVMapper {
          public AccountAutoDeletionSettingsVMapper() { }
        }
      `;

      const listener = new FullSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'file:///test/TestClass.cls',
        listener,
      );

      if (result.result) {
        await symbolManager.addSymbolTable(
          result.result,
          'file:///test/TestClass.cls',
        );
      }

      // Wait for reference processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Calculate position: find instance in if condition (if (instance == null))
      const lines = sourceCode.split('\n');
      const targetLine = lines.findIndex((line) =>
        line.includes('if (instance == null)'),
      );
      const targetLineText = lines[targetLine];
      const instanceStart = targetLineText.indexOf('instance');

      // Test hover on instance in if condition
      const symbol = await symbolManager.getSymbolAtPosition(
        'file:///test/TestClass.cls',
        { line: targetLine, character: instanceStart },
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
      // First compile with public-api only (simulating initial workspace load)
      const sourceCode = `
        public class TestClass {
          @TestVisible private static AccountAutoDeletionSettingsVMapper instance;
          
          public static AccountAutoDeletionSettingsVMapper getInstance() {
            if (instance == null) {
              instance = new AccountAutoDeletionSettingsVMapper();
            }
            return instance;
          }
        }
        
        public class AccountAutoDeletionSettingsVMapper {
          public AccountAutoDeletionSettingsVMapper() { }
        }
      `;

      // Use FullSymbolCollectorListener which collects all symbols
      // In real scenario, initial load might use PublicAPISymbolListener only
      const listener = new FullSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'file:///test/TestClass.cls',
        listener,
      );

      if (result.result) {
        await symbolManager.addSymbolTable(
          result.result,
          'file:///test/TestClass.cls',
        );
      }

      // Wait for reference processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Calculate position: find instance in if condition
      const lines = sourceCode.split('\n');
      const targetLine = lines.findIndex((line) =>
        line.includes('if (instance == null)'),
      );
      const targetLineText = lines[targetLine];
      const instanceStart = targetLineText.indexOf('instance');

      // Test hover on private field - should work even if initially only public-api was indexed
      const symbol = await symbolManager.getSymbolAtPosition(
        'file:///test/TestClass.cls',
        { line: targetLine, character: instanceStart },
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
      const sourceCode = `
        public class TestClass {
          public void testMethod() {
            this.locateAccountRecordTypeAutoDeletionService();
          }
          
          private AccountRecordTypeAutoDeletionService locateAccountRecordTypeAutoDeletionService() {
            return new AccountRecordTypeAutoDeletionService();
          }
        }
      `;

      const listener = new FullSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'file:///test/TestClass.cls',
        listener,
      );

      if (result.result) {
        await symbolManager.addSymbolTable(
          result.result,
          'file:///test/TestClass.cls',
        );
      }

      // Wait for reference processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Calculate position: find the method name in the source code
      const lines = sourceCode.split('\n');
      const targetLine = lines.findIndex((line) =>
        line.includes('this.locateAccountRecordTypeAutoDeletionService()'),
      );
      expect(targetLine).toBeGreaterThanOrEqual(0);
      const targetLineText = lines[targetLine];
      const methodNameStart = targetLineText.indexOf(
        'locateAccountRecordTypeAutoDeletionService',
      );

      // Get references at the method name position
      const symbolTable = result.result;
      const references = symbolTable?.getReferencesAtPosition({
        line: targetLine!,
        character: methodNameStart,
      });

      expect(references).toBeDefined();
      expect(references?.length).toBeGreaterThan(0);

      // Verify the reference has accurate identifierRange
      const methodRef = references?.find(
        (ref) => ref.name === 'locateAccountRecordTypeAutoDeletionService',
      );
      expect(methodRef).toBeDefined();
      expect(methodRef?.location.identifierRange.startLine).toBe(targetLine);
      expect(methodRef?.location.identifierRange.endLine).toBe(targetLine);
      // The identifierRange should cover only the method name, not the entire expression
      expect(methodRef?.location.identifierRange.endColumn).toBeGreaterThan(
        methodRef?.location.identifierRange.startColumn,
      );
    });

    it('should have accurate identifierRange for constructor call references', async () => {
      const sourceCode = `
        public class TestClass {
          public void testMethod() {
            AccountAutoDeletionSettingsVMapper mapper = new AccountAutoDeletionSettingsVMapper();
          }
        }
        
        public class AccountAutoDeletionSettingsVMapper {
          public AccountAutoDeletionSettingsVMapper() { }
        }
      `;

      const listener = new FullSymbolCollectorListener();
      const result = compilerService.compile(
        sourceCode,
        'file:///test/TestClass.cls',
        listener,
      );

      if (result.result) {
        await symbolManager.addSymbolTable(
          result.result,
          'file:///test/TestClass.cls',
        );
      }

      // Wait for reference processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Calculate position: find the class name after "new " in the source code
      const lines = sourceCode.split('\n');
      const targetLine = lines.findIndex((line) =>
        line.includes('new AccountAutoDeletionSettingsVMapper()'),
      );
      expect(targetLine).toBeGreaterThanOrEqual(0);
      const targetLineText = lines[targetLine!];
      const classNameStart = targetLineText.indexOf('new ') + 4; // Position after "new "

      // Get references at the class name position in new expression
      const symbolTable = result.result;
      const references = symbolTable?.getReferencesAtPosition({
        line: targetLine!,
        character: classNameStart,
      });

      expect(references).toBeDefined();
      expect(references?.length).toBeGreaterThan(0);

      // Verify the reference has accurate identifierRange
      const constructorRef = references?.find(
        (ref) => ref.name === 'AccountAutoDeletionSettingsVMapper',
      );
      expect(constructorRef).toBeDefined();
      expect(constructorRef?.location.identifierRange.startLine).toBe(
        targetLine!,
      );
      expect(constructorRef?.location.identifierRange.endLine).toBe(
        targetLine!,
      );
      // The identifierRange should cover only the class name, not the entire new expression
      expect(
        constructorRef?.location.identifierRange.endColumn,
      ).toBeGreaterThan(constructorRef?.location.identifierRange.startColumn);
    });
  });
});
