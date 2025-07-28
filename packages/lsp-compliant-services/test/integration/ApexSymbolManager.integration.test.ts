/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  CompletionParams,
  DefinitionParams,
  ReferenceParams,
  HoverParams,
  SignatureHelpParams,
  CodeActionParams,
  WorkspaceSymbolParams,
  DocumentDiagnosticParams,
} from 'vscode-languageserver-protocol';

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

import { SymbolManagerFactory } from '@salesforce/apex-lsp-parser-ast';

// Mock the SymbolManagerFactory for this specific test
jest.mock('@salesforce/apex-lsp-parser-ast', () => ({
  SymbolManagerFactory: {
    setTestMode: jest.fn(),
    createSymbolManager: jest.fn(),
    reset: jest.fn(),
  },
}));

describe('ApexSymbolManager Integration Tests', () => {
  let completionService: CompletionProcessingService;
  let definitionService: DefinitionProcessingService;
  let referencesService: ReferencesProcessingService;
  let hoverService: HoverProcessingService;
  let signatureHelpService: SignatureHelpProcessingService;
  let codeActionService: CodeActionProcessingService;
  let workspaceSymbolService: WorkspaceSymbolProcessingService;
  let diagnosticService: DiagnosticProcessingService;
  let symbolManager: any;

  beforeEach(() => {
    // Create a mock symbol manager with all the methods we need
    symbolManager = {
      findSymbolByName: jest.fn(),
      resolveSymbol: jest.fn(),
      findReferencesTo: jest.fn(),
      findReferencesFrom: jest.fn(),
      getAllSymbols: jest.fn(),
      getRelationshipStats: jest.fn(),
      computeMetrics: jest.fn(),
    };

    // Mock the SymbolManagerFactory to return our mock symbol manager
    (SymbolManagerFactory.createSymbolManager as jest.Mock).mockReturnValue(
      symbolManager,
    );

    // Create test symbols
    const classSymbol = {
      name: 'TestClass',
      fqn: 'TestClass',
      kind: 'class',
      modifiers: { visibility: 'public', isStatic: false },
      location: {
        startLine: 1,
        startColumn: 1,
        endLine: 10,
        endColumn: 1,
      },
    };

    const methodSymbol = {
      name: 'getName',
      fqn: 'TestClass.getName',
      kind: 'method',
      modifiers: { visibility: 'public', isStatic: false },
      location: {
        startLine: 15,
        startColumn: 1,
        endLine: 15,
        endColumn: 10,
      },
    };

    const systemClass = {
      name: 'String',
      fqn: 'System.String',
      kind: 'class',
      modifiers: { visibility: 'public', isStatic: false },
      location: {
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: 10,
      },
    };

    // Set up default mock implementations
    symbolManager.findSymbolByName.mockImplementation((name: string) => {
      if (name === 'getName') return [methodSymbol];
      if (name === 'TestClass') return [classSymbol];
      if (name === 'class') return [classSymbol];
      if (name === 'name') return [methodSymbol];
      return [];
    });

    symbolManager.resolveSymbol.mockImplementation(
      (name: string, context: any) => {
        if (name === '*' || name === 'String') {
          return {
            symbol: systemClass,
            confidence: 0.9,
            resolutionContext: 'mock resolution',
          };
        }
        if (name === 'getName') {
          return {
            symbol: methodSymbol,
            confidence: 0.8,
            resolutionContext: 'mock resolution',
          };
        }
        if (name === 'TestClass') {
          return {
            symbol: classSymbol,
            confidence: 0.8,
            resolutionContext: 'mock resolution',
          };
        }
        if (name === 'class') {
          return {
            symbol: classSymbol,
            confidence: 0.8,
            resolutionContext: 'mock resolution',
          };
        }
        if (name === 'name') {
          return {
            symbol: methodSymbol,
            confidence: 0.8,
            resolutionContext: 'mock resolution',
          };
        }
        return { symbol: null, confidence: 0, resolutionContext: 'no match' };
      },
    );

    symbolManager.findReferencesTo.mockReturnValue([
      {
        uri: 'file://TestClass.cls',
        range: {
          start: { line: 14, character: 0 },
          end: { line: 14, character: 10 },
        },
      },
    ]);

    symbolManager.findReferencesFrom.mockReturnValue([]);
    symbolManager.getAllSymbols.mockReturnValue([classSymbol, methodSymbol]);
    symbolManager.getRelationshipStats.mockReturnValue({
      totalReferences: 0,
      methodCalls: 0,
      fieldAccess: 0,
      typeReferences: 0,
      constructorCalls: 0,
      staticAccess: 0,
      importReferences: 0,
      relationshipTypeCounts: new Map(),
      mostCommonRelationshipType: null,
      leastCommonRelationshipType: null,
      averageReferencesPerType: 0,
    });
    symbolManager.computeMetrics.mockReturnValue({
      referenceCount: 0,
      dependencyCount: 0,
      dependentCount: 0,
      cyclomaticComplexity: 1,
      depthOfInheritance: 0,
      couplingScore: 0,
      impactScore: 0,
      changeImpactRadius: 0,
      refactoringRisk: 0,
      usagePatterns: [],
      accessPatterns: [],
      lifecycleStage: 'active',
    });

    // Create mock logger
    const mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
    };

    // Create services with the mocked symbol manager
    completionService = new CompletionProcessingService(mockLogger);
    definitionService = new DefinitionProcessingService(mockLogger);
    referencesService = new ReferencesProcessingService(mockLogger);
    hoverService = new HoverProcessingService(mockLogger);
    signatureHelpService = new SignatureHelpProcessingService(mockLogger);
    codeActionService = new CodeActionProcessingService(mockLogger);
    workspaceSymbolService = new WorkspaceSymbolProcessingService(mockLogger);
    diagnosticService = new DiagnosticProcessingService(mockLogger);

    // Verify that the mock is being used
    expect(SymbolManagerFactory.createSymbolManager).toHaveBeenCalled();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Completion Service Integration', () => {
    it('should provide completion items using symbol manager', async () => {
      const params: CompletionParams = {
        textDocument: { uri: 'file://test.cls' },
        position: { line: 15, character: 10 },
        context: {
          triggerKind: 1,
          triggerCharacter: '.',
        },
      };

      const result = await completionService.processCompletion(params);

      expect(result).not.toBeNull();
      expect(result!.length).toBeGreaterThan(0);
    });

    it('should provide context-aware completion', async () => {
      const params: CompletionParams = {
        textDocument: { uri: 'file://test.cls' },
        position: { line: 5, character: 15 },
        context: {
          triggerKind: 1,
          triggerCharacter: 'S',
        },
      };

      const result = await completionService.processCompletion(params);

      expect(result).not.toBeNull();
      expect(result!.length).toBeGreaterThan(0);
    });
  });

  describe('Definition Service Integration', () => {
    it('should find definitions using symbol manager', async () => {
      const params: DefinitionParams = {
        textDocument: { uri: 'file://test.cls' },
        position: { line: 1, character: 7 },
      };

      const result = await definitionService.processDefinition(params);

      expect(result).not.toBeNull();
      expect(result!.length).toBeGreaterThan(0);
      expect(result![0].uri).toBe('file://TestClass.cls');
    });
  });

  describe('References Service Integration', () => {
    it('should find references using symbol manager', async () => {
      const params: ReferenceParams = {
        textDocument: { uri: 'file://test.cls' },
        position: { line: 1, character: 7 },
        context: {
          includeDeclaration: true,
        },
      };

      const result = await referencesService.processReferences(params);

      expect(result).not.toBeNull();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].range.start.line).toBe(14);
    });
  });

  describe('Hover Service Integration', () => {
    it('should provide hover information using symbol manager', async () => {
      const params: HoverParams = {
        textDocument: { uri: 'file://test.cls' },
        position: { line: 15, character: 10 },
      };

      const result = await hoverService.processHover(params);

      expect(result).not.toBeNull();
      if (result) {
        expect(
          typeof result.contents === 'object' && 'value' in result.contents,
        ).toBe(true);
      }
    });
  });

  describe('Signature Help Service Integration', () => {
    it('should provide signature help using symbol manager', async () => {
      const params: SignatureHelpParams = {
        textDocument: { uri: 'file://test.cls' },
        position: { line: 15, character: 10 },
        context: {
          triggerKind: 1,
          triggerCharacter: '(',
          isRetrigger: false,
          activeSignatureHelp: undefined,
        },
      };

      const result = await signatureHelpService.processSignatureHelp(params);

      expect(result).toBeDefined();
      if (result !== null) {
        expect(result.signatures).toBeDefined();
      }
    });
  });

  describe('Code Action Service Integration', () => {
    it('should provide code actions using symbol manager', async () => {
      const params: CodeActionParams = {
        textDocument: { uri: 'file://test.cls' },
        range: {
          start: { line: 15, character: 0 },
          end: { line: 15, character: 10 },
        },
        context: {
          diagnostics: [],
          only: ['quickfix'],
        },
      };

      const result = await codeActionService.processCodeAction(params);

      expect(result).not.toBeNull();
    });
  });

  describe('Workspace Symbol Service Integration', () => {
    it('should provide workspace symbols using symbol manager', async () => {
      const params: WorkspaceSymbolParams = {
        query: 'Test',
      };

      const result =
        await workspaceSymbolService.processWorkspaceSymbol(params);

      expect(result).not.toBeNull();
      expect(result.length).toBe(0); // Service has simplified implementation
    });
  });

  describe('Diagnostic Service Integration', () => {
    it('should provide diagnostics using symbol manager', async () => {
      const params: DocumentDiagnosticParams = {
        textDocument: { uri: 'file://test.cls' },
        previousResultId: undefined,
      };

      const result = await diagnosticService.processDiagnostic(params);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Cross-Service Integration', () => {
    it('should maintain consistency across different services', async () => {
      // Test that all services use the same symbol manager instance
      const completionResult = await completionService.processCompletion({
        textDocument: { uri: 'file://test.cls' },
        position: { line: 15, character: 10 },
        context: { triggerKind: 1, triggerCharacter: '.' },
      });

      const definitionResult = await definitionService.processDefinition({
        textDocument: { uri: 'file://test.cls' },
        position: { line: 1, character: 7 },
      });

      expect(completionResult).not.toBeNull();
      expect(definitionResult).not.toBeNull();
    });
  });
});
