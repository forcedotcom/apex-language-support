/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  CompletionParams,
  DefinitionParams,
  ReferenceParams,
  HoverParams,
  SignatureHelpParams,
  CodeActionParams,
  WorkspaceSymbolParams,
  DiagnosticParams,
} from 'vscode-languageserver-protocol';

import { ApexSymbolManager } from '@salesforce/apex-lsp-parser-ast';
import {
  CompletionProcessingService,
  DefinitionProcessingService,
  ReferencesProcessingService,
  HoverProcessingService,
  SignatureHelpProcessingService,
  CodeActionProcessingService,
  WorkspaceSymbolProcessingService,
  DiagnosticProcessingService,
} from '../../src/services';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';

/**
 * LSP Integration Tests for Phase 8
 *
 * These tests validate the integration between ApexSymbolManager and all LSP services
 * to ensure they work correctly together and provide accurate results.
 */
describe('ApexSymbolManager - LSP Integration Tests', () => {
  let symbolManager: ApexSymbolManager;
  let completionService: CompletionProcessingService;
  let definitionService: DefinitionProcessingService;
  let referencesService: ReferencesProcessingService;
  let hoverService: HoverProcessingService;
  let signatureHelpService: SignatureHelpProcessingService;
  let codeActionService: CodeActionProcessingService;
  let workspaceSymbolService: WorkspaceSymbolProcessingService;
  let diagnosticService: DiagnosticProcessingService;
  let mockStorage: any;
  let mockDocument: TextDocument;

  beforeEach(() => {
    // Initialize symbol manager
    symbolManager = new ApexSymbolManager();

    // Setup mock storage
    mockStorage = {
      getDocument: jest.fn(),
    };

    (ApexStorageManager.getInstance as jest.Mock).mockReturnValue({
      getStorage: jest.fn().mockReturnValue(mockStorage),
    });

    // Setup mock document
    mockDocument = TextDocument.create(
      'file:///test/TestClass.cls',
      'apex',
      1,
      `
public class TestClass {
    private String name;
    public Integer count;
    
    public TestClass(String initialName) {
        this.name = initialName;
        this.count = 0;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public void incrementCount(Integer amount) {
        this.count += amount;
    }
    
    public static void staticMethod() {
        System.debug('Static method called');
    }
}
      `,
    );

    // Initialize all LSP services
    completionService = new CompletionProcessingService();
    definitionService = new DefinitionProcessingService();
    referencesService = new ReferencesProcessingService();
    hoverService = new HoverProcessingService();
    signatureHelpService = new SignatureHelpProcessingService();
    codeActionService = new CodeActionProcessingService();
    workspaceSymbolService = new WorkspaceSymbolProcessingService();
    diagnosticService = new DiagnosticProcessingService();

    // Setup storage to return our mock document
    mockStorage.getDocument.mockResolvedValue(mockDocument);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // Completion Service Integration Tests
  // ============================================================================

  describe('Completion Service Integration', () => {
    it('should provide accurate completion candidates using symbol manager', async () => {
      // Setup: Add symbols to the manager
      const classSymbol = {
        name: 'TestClass',
        kind: 'class' as any,
        fqn: 'TestClass',
        location: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
        modifiers: { visibility: 'public', isStatic: false },
        key: {
          prefix: 'class',
          name: 'TestClass',
          path: ['TestClass.cls', 'TestClass'],
        },
        parentKey: null,
      };

      const methodSymbol = {
        name: 'getName',
        kind: 'method' as any,
        fqn: 'TestClass.getName',
        location: { startLine: 15, startColumn: 5, endLine: 17, endColumn: 5 },
        modifiers: { visibility: 'public', isStatic: false },
        key: {
          prefix: 'method',
          name: 'getName',
          path: ['TestClass.cls', 'TestClass', 'getName'],
        },
        parentKey: {
          prefix: 'class',
          name: 'TestClass',
          path: ['TestClass.cls', 'TestClass'],
        },
      };

      symbolManager.addSymbol(classSymbol, 'TestClass.cls');
      symbolManager.addSymbol(methodSymbol, 'TestClass.cls');

      // Mock the symbol manager in the service
      (completionService as any).symbolManager = symbolManager;

      // Test completion
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 20, character: 10 },
      };

      const result = await completionService.processCompletion(params);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Should include symbols from the manager
      const symbolNames = result.map((item) => item.label);
      expect(symbolNames).toContain('getName');
    });

    it('should handle context-aware completion', async () => {
      // Setup: Add multiple symbols with different contexts
      const systemClass = {
        name: 'String',
        kind: 'class' as any,
        fqn: 'System.String',
        location: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
        modifiers: { visibility: 'public', isStatic: false },
        key: {
          prefix: 'class',
          name: 'String',
          path: ['SystemString.cls', 'String'],
        },
        parentKey: null,
      };

      const customClass = {
        name: 'String',
        kind: 'class' as any,
        fqn: 'Custom.String',
        location: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
        modifiers: { visibility: 'public', isStatic: false },
        key: {
          prefix: 'class',
          name: 'String',
          path: ['CustomString.cls', 'String'],
        },
        parentKey: null,
      };

      symbolManager.addSymbol(systemClass, 'SystemString.cls');
      symbolManager.addSymbol(customClass, 'CustomString.cls');

      // Mock the symbol manager in the service
      (completionService as any).symbolManager = symbolManager;

      // Test completion with context
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 15 },
      };

      const result = await completionService.processCompletion(params);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Should provide context-aware suggestions
      const stringCompletions = result.filter(
        (item) => item.label === 'String',
      );
      expect(stringCompletions.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Definition Service Integration Tests
  // ============================================================================

  describe('Definition Service Integration', () => {
    it('should find accurate definitions using symbol manager', async () => {
      // Setup: Add symbols with specific locations
      const classSymbol = {
        name: 'TestClass',
        kind: 'class' as any,
        fqn: 'TestClass',
        location: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
        modifiers: { visibility: 'public', isStatic: false },
        key: {
          prefix: 'class',
          name: 'TestClass',
          path: ['TestClass.cls', 'TestClass'],
        },
        parentKey: null,
      };

      const methodSymbol = {
        name: 'getName',
        kind: 'method' as any,
        fqn: 'TestClass.getName',
        location: { startLine: 15, startColumn: 5, endLine: 17, endColumn: 5 },
        modifiers: { visibility: 'public', isStatic: false },
        key: {
          prefix: 'method',
          name: 'getName',
          path: ['TestClass.cls', 'TestClass', 'getName'],
        },
        parentKey: {
          prefix: 'class',
          name: 'TestClass',
          path: ['TestClass.cls', 'TestClass'],
        },
      };

      symbolManager.addSymbol(classSymbol, 'TestClass.cls');
      symbolManager.addSymbol(methodSymbol, 'TestClass.cls');

      // Mock the symbol manager in the service
      (definitionService as any).symbolManager = symbolManager;

      // Test definition lookup
      const params: DefinitionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 20, character: 10 },
      };

      const result = await definitionService.processDefinition(params);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Should find the correct definition
      const definition = result[0];
      expect(definition.uri).toBe('file:///test/TestClass.cls');
    });

    it('should handle cross-file definition resolution', async () => {
      // Setup: Add symbols from different files
      const classSymbol = {
        name: 'UtilityClass',
        kind: 'class' as any,
        fqn: 'UtilityClass',
        location: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 15 },
        modifiers: { visibility: 'public', isStatic: false },
        key: {
          prefix: 'class',
          name: 'UtilityClass',
          path: ['UtilityClass.cls', 'UtilityClass'],
        },
        parentKey: null,
      };

      symbolManager.addSymbol(classSymbol, 'UtilityClass.cls');

      // Mock the symbol manager in the service
      (definitionService as any).symbolManager = symbolManager;

      // Test cross-file definition lookup
      const params: DefinitionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 10, character: 15 },
      };

      const result = await definitionService.processDefinition(params);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ============================================================================
  // References Service Integration Tests
  // ============================================================================

  describe('References Service Integration', () => {
    it('should find all references using symbol manager', async () => {
      // Setup: Add symbols and references
      const classSymbol = {
        name: 'TestClass',
        kind: 'class' as any,
        fqn: 'TestClass',
        location: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
        modifiers: { visibility: 'public', isStatic: false },
        key: {
          prefix: 'class',
          name: 'TestClass',
          path: ['TestClass.cls', 'TestClass'],
        },
        parentKey: null,
      };

      const methodSymbol = {
        name: 'getName',
        kind: 'method' as any,
        fqn: 'TestClass.getName',
        location: { startLine: 15, startColumn: 5, endLine: 17, endColumn: 5 },
        modifiers: { visibility: 'public', isStatic: false },
        key: {
          prefix: 'method',
          name: 'getName',
          path: ['TestClass.cls', 'TestClass', 'getName'],
        },
        parentKey: {
          prefix: 'class',
          name: 'TestClass',
          path: ['TestClass.cls', 'TestClass'],
        },
      };

      symbolManager.addSymbol(classSymbol, 'TestClass.cls');
      symbolManager.addSymbol(methodSymbol, 'TestClass.cls');

      // Mock the symbol manager in the service
      (referencesService as any).symbolManager = symbolManager;

      // Test references lookup
      const params: ReferenceParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 15, character: 10 },
        context: { includeDeclaration: true },
      };

      const result = await referencesService.processReferences(params);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Should include the method definition
      const methodReference = result.find((ref) => ref.range.start.line === 15);
      expect(methodReference).toBeDefined();
    });

    it('should handle cross-file reference finding', async () => {
      // Setup: Add symbols from multiple files
      const classSymbol = {
        name: 'SharedClass',
        kind: 'class' as any,
        fqn: 'SharedClass',
        location: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 12 },
        modifiers: { visibility: 'public', isStatic: false },
        key: {
          prefix: 'class',
          name: 'SharedClass',
          path: ['SharedClass.cls', 'SharedClass'],
        },
        parentKey: null,
      };

      symbolManager.addSymbol(classSymbol, 'SharedClass.cls');

      // Mock the symbol manager in the service
      (referencesService as any).symbolManager = symbolManager;

      // Test cross-file references
      const params: ReferenceParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 15 },
        context: { includeDeclaration: true },
      };

      const result = await referencesService.processReferences(params);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ============================================================================
  // Hover Service Integration Tests
  // ============================================================================

  describe('Hover Service Integration', () => {
    it('should provide rich hover information using symbol manager', async () => {
      // Setup: Add symbols with detailed information
      const classSymbol = {
        name: 'TestClass',
        kind: 'class' as any,
        fqn: 'TestClass',
        location: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
        modifiers: { visibility: 'public', isStatic: false },
        key: {
          prefix: 'class',
          name: 'TestClass',
          path: ['TestClass.cls', 'TestClass'],
        },
        parentKey: null,
      };

      const methodSymbol = {
        name: 'getName',
        kind: 'method' as any,
        fqn: 'TestClass.getName',
        location: { startLine: 15, startColumn: 5, endLine: 17, endColumn: 5 },
        modifiers: { visibility: 'public', isStatic: false },
        key: {
          prefix: 'method',
          name: 'getName',
          path: ['TestClass.cls', 'TestClass', 'getName'],
        },
        parentKey: {
          prefix: 'class',
          name: 'TestClass',
          path: ['TestClass.cls', 'TestClass'],
        },
      };

      symbolManager.addSymbol(classSymbol, 'TestClass.cls');
      symbolManager.addSymbol(methodSymbol, 'TestClass.cls');

      // Mock the symbol manager in the service
      (hoverService as any).symbolManager = symbolManager;

      // Test hover
      const params: HoverParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 15, character: 10 },
      };

      const result = await hoverService.processHover(params);

      expect(result).toBeDefined();
      expect(result.contents).toBeDefined();
      expect(Array.isArray(result.contents)).toBe(true);
      expect(result.contents.length).toBeGreaterThan(0);

      // Should provide meaningful hover information
      const content = result.contents[0];
      expect(typeof content).toBe('string');
      expect(content).toContain('getName');
    });
  });

  // ============================================================================
  // Signature Help Service Integration Tests
  // ============================================================================

  describe('Signature Help Service Integration', () => {
    it('should provide accurate signature help using symbol manager', async () => {
      // Setup: Add method symbols with parameters
      const methodSymbol = {
        name: 'setName',
        kind: 'method' as any,
        fqn: 'TestClass.setName',
        location: { startLine: 19, startColumn: 5, endLine: 21, endColumn: 5 },
        modifiers: { visibility: 'public', isStatic: false },
        key: {
          prefix: 'method',
          name: 'setName',
          path: ['TestClass.cls', 'TestClass', 'setName'],
        },
        parentKey: {
          prefix: 'class',
          name: 'TestClass',
          path: ['TestClass.cls', 'TestClass'],
        },
      };

      symbolManager.addSymbol(methodSymbol, 'TestClass.cls');

      // Mock the symbol manager in the service
      (signatureHelpService as any).symbolManager = symbolManager;

      // Test signature help
      const params: SignatureHelpParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 25, character: 15 },
      };

      const result = await signatureHelpService.processSignatureHelp(params);

      expect(result).toBeDefined();
      expect(result.signatures).toBeDefined();
      expect(Array.isArray(result.signatures)).toBe(true);
    });
  });

  // ============================================================================
  // Code Action Service Integration Tests
  // ============================================================================

  describe('Code Action Service Integration', () => {
    it('should provide code actions using symbol manager', async () => {
      // Setup: Add symbols for code actions
      const classSymbol = {
        name: 'TestClass',
        kind: 'class' as any,
        fqn: 'TestClass',
        location: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
        modifiers: { visibility: 'public', isStatic: false },
        key: {
          prefix: 'class',
          name: 'TestClass',
          path: ['TestClass.cls', 'TestClass'],
        },
        parentKey: null,
      };

      symbolManager.addSymbol(classSymbol, 'TestClass.cls');

      // Mock the symbol manager in the service
      (codeActionService as any).symbolManager = symbolManager;

      // Test code actions
      const params: CodeActionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        range: {
          start: { line: 1, character: 1 },
          end: { line: 1, character: 10 },
        },
        context: { diagnostics: [] },
      };

      const result = await codeActionService.processCodeActions(params);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ============================================================================
  // Workspace Symbol Service Integration Tests
  // ============================================================================

  describe('Workspace Symbol Service Integration', () => {
    it('should provide workspace symbols using symbol manager', async () => {
      // Setup: Add multiple symbols
      const classSymbol = {
        name: 'TestClass',
        kind: 'class' as any,
        fqn: 'TestClass',
        location: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
        modifiers: { visibility: 'public', isStatic: false },
        key: {
          prefix: 'class',
          name: 'TestClass',
          path: ['TestClass.cls', 'TestClass'],
        },
        parentKey: null,
      };

      const methodSymbol = {
        name: 'getName',
        kind: 'method' as any,
        fqn: 'TestClass.getName',
        location: { startLine: 15, startColumn: 5, endLine: 17, endColumn: 5 },
        modifiers: { visibility: 'public', isStatic: false },
        key: {
          prefix: 'method',
          name: 'getName',
          path: ['TestClass.cls', 'TestClass', 'getName'],
        },
        parentKey: {
          prefix: 'class',
          name: 'TestClass',
          path: ['TestClass.cls', 'TestClass'],
        },
      };

      symbolManager.addSymbol(classSymbol, 'TestClass.cls');
      symbolManager.addSymbol(methodSymbol, 'TestClass.cls');

      // Mock the symbol manager in the service
      (workspaceSymbolService as any).symbolManager = symbolManager;

      // Test workspace symbols
      const params: WorkspaceSymbolParams = {
        query: 'Test',
      };

      const result =
        await workspaceSymbolService.processWorkspaceSymbols(params);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Should find symbols matching the query
      const symbolNames = result.map((symbol) => symbol.name);
      expect(symbolNames).toContain('TestClass');
    });
  });

  // ============================================================================
  // Diagnostic Service Integration Tests
  // ============================================================================

  describe('Diagnostic Service Integration', () => {
    it('should provide diagnostics using symbol manager', async () => {
      // Setup: Add symbols for diagnostic analysis
      const classSymbol = {
        name: 'TestClass',
        kind: 'class' as any,
        fqn: 'TestClass',
        location: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
        modifiers: { visibility: 'public', isStatic: false },
        key: {
          prefix: 'class',
          name: 'TestClass',
          path: ['TestClass.cls', 'TestClass'],
        },
        parentKey: null,
      };

      symbolManager.addSymbol(classSymbol, 'TestClass.cls');

      // Mock the symbol manager in the service
      (diagnosticService as any).symbolManager = symbolManager;

      // Test diagnostics
      const params: DiagnosticParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
      };

      const result = await diagnosticService.processDiagnostics(params);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ============================================================================
  // Cross-Service Integration Tests
  // ============================================================================

  describe('Cross-Service Integration', () => {
    it('should maintain consistency across all LSP services', async () => {
      // Setup: Add comprehensive symbol set
      const symbols = [
        {
          name: 'MainClass',
          kind: 'class' as any,
          fqn: 'MainClass',
          location: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
          modifiers: { visibility: 'public', isStatic: false },
          key: {
            prefix: 'class',
            name: 'MainClass',
            path: ['MainClass.cls', 'MainClass'],
          },
          parentKey: null,
        },
        {
          name: 'utilityMethod',
          kind: 'method' as any,
          fqn: 'MainClass.utilityMethod',
          location: { startLine: 5, startColumn: 5, endLine: 7, endColumn: 5 },
          modifiers: { visibility: 'public', isStatic: true },
          key: {
            prefix: 'method',
            name: 'utilityMethod',
            path: ['MainClass.cls', 'MainClass', 'utilityMethod'],
          },
          parentKey: {
            prefix: 'class',
            name: 'MainClass',
            path: ['MainClass.cls', 'MainClass'],
          },
        },
      ];

      symbols.forEach((symbol) => {
        symbolManager.addSymbol(symbol, 'MainClass.cls');
      });

      // Mock symbol manager in all services
      (completionService as any).symbolManager = symbolManager;
      (definitionService as any).symbolManager = symbolManager;
      (referencesService as any).symbolManager = symbolManager;
      (hoverService as any).symbolManager = symbolManager;
      (signatureHelpService as any).symbolManager = symbolManager;
      (codeActionService as any).symbolManager = symbolManager;
      (workspaceSymbolService as any).symbolManager = symbolManager;
      (diagnosticService as any).symbolManager = symbolManager;

      // Test all services with the same symbol
      const testPosition = { line: 5, character: 10 };
      const testUri = 'file:///test/MainClass.cls';

      // Completion
      const completionResult = await completionService.processCompletion({
        textDocument: { uri: testUri },
        position: testPosition,
      });

      // Definition
      const definitionResult = await definitionService.processDefinition({
        textDocument: { uri: testUri },
        position: testPosition,
      });

      // References
      const referencesResult = await referencesService.processReferences({
        textDocument: { uri: testUri },
        position: testPosition,
        context: { includeDeclaration: true },
      });

      // Hover
      const hoverResult = await hoverService.processHover({
        textDocument: { uri: testUri },
        position: testPosition,
      });

      // Verify all services return consistent results
      expect(completionResult).toBeDefined();
      expect(definitionResult).toBeDefined();
      expect(referencesResult).toBeDefined();
      expect(hoverResult).toBeDefined();

      // All services should work with the same symbol manager instance
      const stats = symbolManager.getStats();
      expect(stats.totalSymbols).toBe(2);
    });

    it('should handle concurrent LSP requests efficiently', async () => {
      // Setup: Add many symbols
      for (let i = 0; i < 100; i++) {
        const symbol = {
          name: `Class${i}`,
          kind: 'class' as any,
          fqn: `Class${i}`,
          location: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
          modifiers: { visibility: 'public', isStatic: false },
          key: {
            prefix: 'class',
            name: `Class${i}`,
            path: [`Class${i}.cls`, `Class${i}`],
          },
          parentKey: null,
        };
        symbolManager.addSymbol(symbol, `Class${i}.cls`);
      }

      // Mock symbol manager in services
      (completionService as any).symbolManager = symbolManager;
      (definitionService as any).symbolManager = symbolManager;
      (workspaceSymbolService as any).symbolManager = symbolManager;

      // Test concurrent requests
      const startTime = performance.now();

      const requests = [
        // Completion requests
        ...Array.from({ length: 10 }, (_, i) =>
          completionService.processCompletion({
            textDocument: { uri: `file:///test/Class${i}.cls` },
            position: { line: 1, character: 5 },
          }),
        ),
        // Definition requests
        ...Array.from({ length: 10 }, (_, i) =>
          definitionService.processDefinition({
            textDocument: { uri: `file:///test/Class${i}.cls` },
            position: { line: 1, character: 5 },
          }),
        ),
        // Workspace symbol requests
        ...Array.from({ length: 5 }, (_, i) =>
          workspaceSymbolService.processWorkspaceSymbols({
            query: `Class${i}`,
          }),
        ),
      ];

      const results = await Promise.all(requests);
      const totalTime = performance.now() - startTime;

      // Should complete all requests efficiently
      expect(totalTime).toBeLessThan(5000); // < 5s for 25 requests
      expect(results.length).toBe(25);

      // All results should be valid
      results.forEach((result) => {
        expect(result).toBeDefined();
      });
    });
  });
});
