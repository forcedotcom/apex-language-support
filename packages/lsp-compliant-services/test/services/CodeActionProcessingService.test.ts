/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  CodeActionParams,
  Range,
  Diagnostic,
} from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getLogger } from '@salesforce/apex-lsp-shared';
import {
  ApexSymbolManager,
  CompilerService,
  FullSymbolCollectorListener,
  SymbolTable,
} from '@salesforce/apex-lsp-parser-ast';
import { Effect } from 'effect';

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

  describe('Declare Missing Method quick fix (W-23389336)', () => {
    const CALLER_URI = 'file:///test/Caller.cls';
    const TARGET_URI = 'file:///test/Target.cls';

    /**
     * Build a service backed by a real ApexSymbolManager populated with the
     * given fixtures, plus a storage mock that returns the caller document.
     */
    const buildService = async (
      callerSource: string,
      fixtures: Array<{ uri: string; source: string }>,
    ): Promise<{
      service: CodeActionProcessingService;
      document: TextDocument;
    }> => {
      const sm = new ApexSymbolManager();
      const compilerService = new CompilerService();

      for (const fixture of fixtures) {
        const table = new SymbolTable();
        compilerService.compile(
          fixture.source,
          fixture.uri,
          new FullSymbolCollectorListener(table),
          {},
        );
        await Effect.runPromise(sm.addSymbolTable(table, fixture.uri));
      }

      const callerDoc = TextDocument.create(
        CALLER_URI,
        'apex',
        1,
        callerSource,
      );
      (ApexStorageManager.getInstance as jest.Mock).mockReturnValue({
        getStorage: jest.fn().mockReturnValue({
          getDocument: jest
            .fn()
            .mockImplementation((uri: string) =>
              Promise.resolve(uri === CALLER_URI ? callerDoc : null),
            ),
        }),
      });

      return {
        service: new CodeActionProcessingService(getLogger(), sm),
        document: callerDoc,
      };
    };

    /** Find the range of a needle substring in a source (0-based LSP range). */
    const rangeOf = (source: string, needle: string): Range => {
      const lines = source.split('\n');
      for (let line = 0; line < lines.length; line++) {
        const character = lines[line].indexOf(needle);
        if (character !== -1) {
          return {
            start: { line, character },
            end: { line, character: character + needle.length },
          };
        }
      }
      throw new Error(`needle not found: ${needle}`);
    };

    const methodNotFoundDiagnostic = (range: Range): Diagnostic => ({
      range,
      message: 'Method does not exist or incorrect signature: computeValue',
      severity: 1,
      code: 'invalid.method.not.found',
      source: 'apex-semantic-validator',
    });

    const TARGET_SOURCE = [
      'public class Target {',
      '  public String existing() {',
      '    return null;',
      '  }',
      '}',
    ].join('\n');

    it('offers a stub with inferred signature into the target file (happy path, instance call)', async () => {
      const callerSource = [
        'public class Caller {',
        '  public void run() {',
        '    Target t = new Target();',
        "    Integer r = t.computeValue(42, 'label');",
        '  }',
        '}',
      ].join('\n');
      const callRange = rangeOf(callerSource, 'computeValue');

      const { service, document } = await buildService(callerSource, [
        { uri: TARGET_URI, source: TARGET_SOURCE },
        { uri: CALLER_URI, source: callerSource },
      ]);

      const params: CodeActionParams = {
        textDocument: { uri: CALLER_URI },
        range: callRange,
        context: {
          diagnostics: [methodNotFoundDiagnostic(callRange)],
          triggerKind: 1,
        },
      };

      const actions = await service.processCodeAction(params);
      const declare = actions.find((a) =>
        a.title.startsWith("Declare method 'computeValue'"),
      );

      expect(declare).toBeDefined();
      expect(declare!.title).toBe("Declare method 'computeValue' in Target");
      expect(declare!.kind).toBe('quickfix');

      // Multi-file: edit targets the Target file via documentChanges.
      const documentChanges = declare!.edit?.documentChanges as any[];
      expect(documentChanges).toBeDefined();
      expect(documentChanges[0].textDocument.uri).toBe(TARGET_URI);

      const newText: string = documentChanges[0].edits[0].newText;
      // Return type inferred from `Integer r = ...`; params typed from literals;
      // instance call -> no static modifier.
      expect(newText).toContain(
        'public Integer computeValue(Integer param1, String param2)',
      );
      expect(newText).not.toContain('static');

      // Uses the document (caller) but writes into Target — no reliance on
      // reading the (unloaded) target document.
      expect(document.uri).toBe(CALLER_URI);
    });

    it('marks the stub static when the call is on the type name', async () => {
      const callerSource = [
        'public class Caller {',
        '  public void run() {',
        '    Integer r = Target.computeValue(42);',
        '  }',
        '}',
      ].join('\n');
      const callRange = rangeOf(callerSource, 'computeValue');

      const { service } = await buildService(callerSource, [
        { uri: TARGET_URI, source: TARGET_SOURCE },
        { uri: CALLER_URI, source: callerSource },
      ]);

      const actions = await service.processCodeAction({
        textDocument: { uri: CALLER_URI },
        range: callRange,
        context: {
          diagnostics: [methodNotFoundDiagnostic(callRange)],
          triggerKind: 1,
        },
      });

      const declare = actions.find((a) =>
        a.title.startsWith("Declare method 'computeValue'"),
      );
      expect(declare).toBeDefined();
      const newText: string = (declare!.edit?.documentChanges as any[])[0]
        .edits[0].newText;
      expect(newText).toContain(
        'public static Integer computeValue(Integer param1)',
      );
    });

    it('does not offer the fix when the receiver is an interface', async () => {
      const interfaceSource = [
        'public interface Target {',
        '  String existing();',
        '}',
      ].join('\n');
      const callerSource = [
        'public class Caller {',
        '  public void run(Target t) {',
        '    Integer r = t.computeValue(42);',
        '  }',
        '}',
      ].join('\n');
      const callRange = rangeOf(callerSource, 'computeValue');

      const { service } = await buildService(callerSource, [
        { uri: TARGET_URI, source: interfaceSource },
        { uri: CALLER_URI, source: callerSource },
      ]);

      const actions = await service.processCodeAction({
        textDocument: { uri: CALLER_URI },
        range: callRange,
        context: {
          diagnostics: [methodNotFoundDiagnostic(callRange)],
          triggerKind: 1,
        },
      });

      expect(
        actions.find((a) => a.title.startsWith('Declare method')),
      ).toBeUndefined();
    });

    it('does not offer the fix when the receiver is an enum', async () => {
      const enumSource = ['public enum Target {', '  A, B, C', '}'].join('\n');
      const callerSource = [
        'public class Caller {',
        '  public void run() {',
        '    Integer r = Target.computeValue(42);',
        '  }',
        '}',
      ].join('\n');
      const callRange = rangeOf(callerSource, 'computeValue');

      const { service } = await buildService(callerSource, [
        { uri: TARGET_URI, source: enumSource },
        { uri: CALLER_URI, source: callerSource },
      ]);

      const actions = await service.processCodeAction({
        textDocument: { uri: CALLER_URI },
        range: callRange,
        context: {
          diagnostics: [methodNotFoundDiagnostic(callRange)],
          triggerKind: 1,
        },
      });

      expect(
        actions.find((a) => a.title.startsWith('Declare method')),
      ).toBeUndefined();
    });

    it('does not offer the fix when the receiver is not a user class (unresolved/builtin)', async () => {
      const callerSource = [
        'public class Caller {',
        '  public void run() {',
        '    Integer r = System.computeValue(42);',
        '  }',
        '}',
      ].join('\n');
      const callRange = rangeOf(callerSource, 'computeValue');

      // Only the caller is registered; `System` does not resolve to a user class.
      const { service } = await buildService(callerSource, [
        { uri: CALLER_URI, source: callerSource },
      ]);

      const actions = await service.processCodeAction({
        textDocument: { uri: CALLER_URI },
        range: callRange,
        context: {
          diagnostics: [methodNotFoundDiagnostic(callRange)],
          triggerKind: 1,
        },
      });

      expect(
        actions.find((a) => a.title.startsWith('Declare method')),
      ).toBeUndefined();
    });

    it('does not offer the fix for a void-context call', async () => {
      const callerSource = [
        'public class Caller {',
        '  public void run() {',
        '    Target t = new Target();',
        '    t.computeValue(42);',
        '  }',
        '}',
      ].join('\n');
      const callRange = rangeOf(callerSource, 'computeValue');

      const { service } = await buildService(callerSource, [
        { uri: TARGET_URI, source: TARGET_SOURCE },
        { uri: CALLER_URI, source: callerSource },
      ]);

      const actions = await service.processCodeAction({
        textDocument: { uri: CALLER_URI },
        range: callRange,
        context: {
          diagnostics: [methodNotFoundDiagnostic(callRange)],
          triggerKind: 1,
        },
      });

      expect(
        actions.find((a) => a.title.startsWith('Declare method')),
      ).toBeUndefined();
    });

    it('does not throw and offers nothing on syntax-error input', async () => {
      const callerSource = [
        'public class Caller {',
        '  public void run() {',
        '    Integer r = t.computeValue(42', // missing ) and ; and receiver decl
        '  ',
      ].join('\n');
      const callRange = {
        start: { line: 2, character: 18 },
        end: { line: 2, character: 30 },
      };

      const { service } = await buildService(callerSource, [
        { uri: TARGET_URI, source: TARGET_SOURCE },
      ]);

      const params: CodeActionParams = {
        textDocument: { uri: CALLER_URI },
        range: callRange,
        context: {
          diagnostics: [methodNotFoundDiagnostic(callRange)],
          triggerKind: 1,
        },
      };

      await expect(service.processCodeAction(params)).resolves.toBeDefined();
      const actions = await service.processCodeAction(params);
      expect(Array.isArray(actions)).toBe(true);
      expect(
        actions.find((a) => a.title.startsWith('Declare method')),
      ).toBeUndefined();
    });
  });
});
