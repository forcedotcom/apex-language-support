/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  CodeActionParams,
  CodeAction,
  CodeActionKind,
  Range,
  Diagnostic,
} from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getLogger } from '@salesforce/apex-lsp-shared';

import { CodeActionProcessingService } from '../../src/services/CodeActionProcessingService';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';

// Logger is handled by the shared library's global logging system

// Mock ApexStorageManager
jest.mock('../../src/storage/ApexStorageManager', () => ({
  ApexStorageManager: {
    getInstance: jest.fn(),
  },
}));

describe('CodeActionProcessingService', () => {
  let service: CodeActionProcessingService;
  let mockStorage: any;
  let mockDocument: TextDocument;
  let logger: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup logger
    logger = getLogger();

    // Setup mock storage
    mockStorage = {
      getDocument: jest.fn(),
    };

    (ApexStorageManager.getInstance as jest.Mock).mockReturnValue({
      getStorage: jest.fn().mockReturnValue(mockStorage),
    });

    // Setup mock document
    mockDocument = {
      uri: 'file:///test/TestClass.cls',
      getText: jest.fn().mockReturnValue(`
        public class TestClass {
          public void doSomething() {
            String testVar = 'test';
            // Cursor position here
          }
        }
      `),
      offsetAt: jest.fn().mockReturnValue(100),
      positionAt: jest.fn(),
      lineCount: jest.fn().mockReturnValue(10),
    } as any;

    // Create service instance
    service = new CodeActionProcessingService(logger);
  });

  describe('processCodeAction', () => {
    it('should return code actions for valid request', async () => {
      // Arrange
      const params: CodeActionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        range: {
          start: { line: 5, character: 10 },
          end: { line: 5, character: 15 },
        },
        context: {
          diagnostics: [],
          only: undefined,
          triggerKind: 1,
        },
      };

      mockStorage.getDocument.mockResolvedValue(mockDocument);

      // Act
      const result = await service.processCodeAction(params);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockStorage.getDocument).toHaveBeenCalledWith(
        params.textDocument.uri,
      );
    });

    it('should handle document not found', async () => {
      // Arrange
      const params: CodeActionParams = {
        textDocument: { uri: 'file:///test/NonexistentClass.cls' },
        range: {
          start: { line: 5, character: 10 },
          end: { line: 5, character: 15 },
        },
        context: {
          diagnostics: [],
          only: undefined,
          triggerKind: 1,
        },
      };

      mockStorage.getDocument.mockResolvedValue(null);

      // Act
      const result = await service.processCodeAction(params);

      // Assert
      expect(result).toEqual([]);
      expect(mockStorage.getDocument).toHaveBeenCalledWith(
        params.textDocument.uri,
      );
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const params: CodeActionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        range: {
          start: { line: 5, character: 10 },
          end: { line: 5, character: 15 },
        },
        context: {
          diagnostics: [],
          only: undefined,
          triggerKind: 1,
        },
      };

      mockStorage.getDocument.mockRejectedValue(new Error('Storage error'));

      // Act
      const result = await service.processCodeAction(params);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle diagnostic-based actions', async () => {
      // Arrange
      const diagnostics: Diagnostic[] = [
        {
          range: {
            start: { line: 5, character: 10 },
            end: { line: 5, character: 15 },
          },
          message: 'Circular dependency detected',
          severity: 2,
          code: 'CIRCULAR_DEPENDENCY',
          source: 'apex-symbol-manager',
        },
        {
          range: {
            start: { line: 6, character: 10 },
            end: { line: 6, character: 15 },
          },
          message: 'High impact symbol',
          severity: 1,
          code: 'HIGH_IMPACT_SYMBOL',
          source: 'apex-symbol-manager',
        },
      ];

      const params: CodeActionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        range: {
          start: { line: 5, character: 10 },
          end: { line: 5, character: 15 },
        },
        context: {
          diagnostics,
          only: undefined,
          triggerKind: 1,
        },
      };

      mockStorage.getDocument.mockResolvedValue(mockDocument);

      // Act
      const result = await service.processCodeAction(params);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // Should include diagnostic-based actions
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('context analysis', () => {
    it('should extract symbol info correctly', () => {
      // Arrange
      const text = `
        public class TestClass {
          public void method1() {
            String variable = 'test';
          }
        }
      `;

      const range: Range = {
        start: { line: 3, character: 10 },
        end: { line: 3, character: 15 },
      };

      // Act
      const symbolInfo = (service as any).extractSymbolInfo(text, range);

      // Assert
      expect(symbolInfo).toBeDefined();
      expect(symbolInfo.name).toBeDefined();
      expect(symbolInfo.kind).toBeDefined();
    });

    it('should detect static context correctly', () => {
      // Arrange
      const text = `
        public class TestClass {
          public static void staticMethod() {
            // Static context
          }
        }
      `;

      // Act
      const isStatic = (service as any).isInStaticContext(text, 50);

      // Assert
      expect(typeof isStatic).toBe('boolean');
    });

    it('should extract access modifier context correctly', () => {
      // Arrange
      const text = `
        public class TestClass {
          private String privateField;
          public String publicField;
        }
      `;

      // Act
      const modifier = (service as any).getAccessModifierContext(text, 50);

      // Assert
      expect(['public', 'private', 'protected', 'global']).toContain(modifier);
    });

    it('should extract current scope correctly', () => {
      // Arrange
      const text = `
        public class TestClass {
          public void method1() {
            // Inside method1
          }
          public void method2() {
            // Inside method2
          }
        }
      `;

      // Act
      const scope = (service as any).extractCurrentScope(text, 50);

      // Assert
      expect(scope).toBeDefined();
    });
  });

  describe('code action generation', () => {
    it('should generate refactoring actions', async () => {
      // Arrange
      const context = {
        document: mockDocument,
        range: {
          start: { line: 5, character: 10 },
          end: { line: 5, character: 15 },
        },
        diagnostics: [],
        symbolName: 'doSomething',
        symbolKind: 'method',
        currentScope: 'method-scope',
        isStatic: false,
        accessModifier: 'public',
      };

      // Act
      const actions = await (service as any).getRefactoringActions(context);

      // Assert
      expect(Array.isArray(actions)).toBe(true);
    });

    it('should generate quick fix actions', async () => {
      // Arrange
      const context = {
        document: mockDocument,
        range: {
          start: { line: 5, character: 10 },
          end: { line: 5, character: 15 },
        },
        diagnostics: [],
        symbolName: 'doSomething',
        symbolKind: 'method',
        currentScope: 'method-scope',
        isStatic: false,
        accessModifier: 'public',
      };

      // Act
      const actions = await (service as any).getQuickFixActions(context);

      // Assert
      expect(Array.isArray(actions)).toBe(true);
    });

    it('should generate diagnostic actions', async () => {
      // Arrange
      const context = {
        document: mockDocument,
        range: {
          start: { line: 5, character: 10 },
          end: { line: 5, character: 15 },
        },
        diagnostics: [
          {
            range: {
              start: { line: 5, character: 10 },
              end: { line: 5, character: 15 },
            },
            message: 'Circular dependency detected',
            severity: 2,
            code: 'CIRCULAR_DEPENDENCY',
            source: 'apex-symbol-manager',
          },
        ],
        symbolName: 'doSomething',
        symbolKind: 'method',
        currentScope: 'method-scope',
        isStatic: false,
        accessModifier: 'public',
      };

      // Act
      const actions = await (service as any).getDiagnosticActions(context);

      // Assert
      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(0);
    });

    it('should generate relationship actions', async () => {
      // Arrange
      const context = {
        document: mockDocument,
        range: {
          start: { line: 5, character: 10 },
          end: { line: 5, character: 15 },
        },
        diagnostics: [],
        symbolName: 'doSomething',
        symbolKind: 'method',
        currentScope: 'method-scope',
        isStatic: false,
        accessModifier: 'public',
      };

      // Act
      const actions = await (service as any).getRelationshipActions(context);

      // Assert
      expect(Array.isArray(actions)).toBe(true);
    });
  });

  describe('extract refactorings (eager WorkspaceEdit)', () => {
    const uri = 'file:///test/Extract.cls';

    /**
     * Build a real TextDocument (so positionAt/offsetAt behave correctly) and
     * return the LSP range covering the first occurrence of `selection`.
     */
    const setupDocument = (
      source: string,
      selection: string,
    ): { params: CodeActionParams } => {
      const doc = TextDocument.create(uri, 'apex', 1, source);
      const startOffset = source.indexOf(selection);
      const range: Range = {
        start: doc.positionAt(startOffset),
        end: doc.positionAt(startOffset + selection.length),
      };
      (mockStorage.getDocument as jest.Mock).mockResolvedValue(doc);
      return {
        params: {
          textDocument: { uri },
          range,
          context: { diagnostics: [], only: undefined, triggerKind: 1 },
        },
      };
    };

    const findAction = (
      actions: CodeAction[],
      title: string,
    ): CodeAction | undefined => actions.find((a) => a.title === title);

    it('offers Extract local variable for an expression selection', async () => {
      const source = [
        'public class Extract {',
        '  public void doWork() {',
        '    Integer total = 1 + 2;',
        '  }',
        '}',
      ].join('\n');
      const { params } = setupDocument(source, '1 + 2');

      const result = await service.processCodeAction(params);
      const action = findAction(result, 'Extract local variable');

      expect(action).toBeDefined();
      expect(action?.kind).toBe(CodeActionKind.RefactorExtract);
      const edits = action?.edit?.changes?.[uri];
      expect(edits).toHaveLength(2);
      // First edit inserts a declaration; second replaces the selection.
      expect(edits?.[0].newText).toMatch(/Object v1 = 1 \+ 2;/);
      expect(edits?.[0].newText.endsWith('\n')).toBe(true);
      expect(edits?.[1].newText).toBe('v1');
      expect(edits?.[1].range).toEqual(params.range);
    });

    it('does not offer extract actions for a non-expression selection', async () => {
      const source = [
        'public class Extract {',
        '  public void doWork() {',
        '    Integer total = 1 + 2;',
        '  }',
        '}',
      ].join('\n');
      // Select across the whole statement (not a single expression).
      const { params } = setupDocument(source, 'Integer total = 1 + 2;');

      const result = await service.processCodeAction(params);

      expect(findAction(result, 'Extract local variable')).toBeUndefined();
      expect(findAction(result, 'Extract constant')).toBeUndefined();
    });

    it('avoids name collisions with existing identifiers', async () => {
      const source = [
        'public class Extract {',
        '  public void doWork() {',
        '    Integer v1 = 10;',
        '    Integer total = 1 + 2;',
        '  }',
        '}',
      ].join('\n');
      const { params } = setupDocument(source, '1 + 2');

      const result = await service.processCodeAction(params);
      const action = findAction(result, 'Extract local variable');

      expect(action).toBeDefined();
      // v1 already exists, so the generated name must skip it.
      expect(action?.edit?.changes?.[uri]?.[1].newText).toBe('v2');
    });

    it('does not throw and offers no extract actions on syntax-error input', async () => {
      const source = 'public class Extract { public void ( { @@@ }';
      const { params } = setupDocument(source, '@@@');

      const result = await service.processCodeAction(params);

      expect(Array.isArray(result)).toBe(true);
      expect(findAction(result, 'Extract local variable')).toBeUndefined();
      expect(findAction(result, 'Extract constant')).toBeUndefined();
    });
  });

  describe('performance', () => {
    it('should handle requests efficiently', async () => {
      // Arrange
      const params: CodeActionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        range: {
          start: { line: 5, character: 10 },
          end: { line: 5, character: 15 },
        },
        context: {
          diagnostics: [],
          only: undefined,
          triggerKind: 1,
        },
      };

      mockStorage.getDocument.mockResolvedValue(mockDocument);

      const startTime = Date.now();

      // Act
      const result = await service.processCodeAction(params);

      const endTime = Date.now();

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
