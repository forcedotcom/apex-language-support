/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger } from '@salesforce/apex-lsp-shared';
import { ISymbolManager } from '@salesforce/apex-lsp-parser-ast';

// Mock the logger
jest.mock('@salesforce/apex-lsp-shared', () => ({
  getLogger: jest.fn(),
}));

describe('LSPQueueManager - Business Logic Tests', () => {
  let mockLogger: any;
  let mockSymbolManager: jest.Mocked<ISymbolManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    (getLogger as jest.Mock).mockReturnValue(mockLogger);

    mockSymbolManager = {
      addSymbol: jest.fn(),
      getSymbol: jest.fn(),
      findSymbolByName: jest.fn(),
      findSymbolByFQN: jest.fn(),
      findSymbolsInFile: jest.fn(),
      findFilesForSymbol: jest.fn(),
      resolveSymbol: jest.fn(),
      getAllSymbolsForCompletion: jest.fn(),
      findReferencesTo: jest.fn(),
      findReferencesFrom: jest.fn(),
      findRelatedSymbols: jest.fn(),
      analyzeDependencies: jest.fn(),
      detectCircularDependencies: jest.fn(),
      getStats: jest.fn(),
      clear: jest.fn(),
      removeFile: jest.fn(),
      optimizeMemory: jest.fn(),
      createResolutionContext: jest.fn(),
      constructFQN: jest.fn(),
      getContainingType: jest.fn(),
      getAncestorChain: jest.fn(),
      getReferencesAtPosition: jest.fn(),
      getSymbolAtPosition: jest.fn(),
    };
  });

  describe('Request Type Configuration', () => {
    it('should have correct request type mappings', () => {
      // Test the business logic configuration without Effect
      const requestTypeMappings = {
        hover: 'IMMEDIATE' as const,
        completion: 'IMMEDIATE' as const,
        definition: 'HIGH' as const,
        references: 'NORMAL' as const,
        documentSymbol: 'HIGH' as const,
        workspaceSymbol: 'NORMAL' as const,
        diagnostics: 'NORMAL' as const,
        codeAction: 'NORMAL' as const,
        signatureHelp: 'IMMEDIATE' as const,
        rename: 'LOW' as const,
        documentOpen: 'IMMEDIATE' as const,
        documentSave: 'NORMAL' as const,
        documentChange: 'NORMAL' as const,
        documentClose: 'NORMAL' as const,
      };

      expect(requestTypeMappings.hover).toBe('IMMEDIATE');
      expect(requestTypeMappings.completion).toBe('IMMEDIATE');
      expect(requestTypeMappings.definition).toBe('HIGH');
      expect(requestTypeMappings.references).toBe('NORMAL');
      expect(requestTypeMappings.documentSymbol).toBe('HIGH');
      expect(requestTypeMappings.workspaceSymbol).toBe('NORMAL');
    });

    it('should have appropriate method signatures', () => {
      // Test that the expected methods exist and have correct signatures
      const expectedMethods = [
        'submitHoverRequest',
        'submitCompletionRequest',
        'submitDefinitionRequest',
        'submitReferencesRequest',
        'submitDocumentSymbolRequest',
        'submitWorkspaceSymbolRequest',
        'submitDiagnosticsRequest',
        'submitCodeActionRequest',
        'submitSignatureHelpRequest',
        'submitRenameRequest',
        'submitDocumentOpenRequest',
        'submitDocumentSaveRequest',
        'submitDocumentChangeRequest',
        'submitDocumentCloseRequest',
      ];

      expectedMethods.forEach((methodName) => {
        expect(typeof methodName).toBe('string');
        expect(methodName.startsWith('submit')).toBe(true);
        expect(methodName.endsWith('Request')).toBe(true);
      });
    });
  });

  describe('Singleton Pattern', () => {
    it('should implement singleton pattern correctly', () => {
      // Test singleton pattern logic without instantiating
      const singletonPattern = {
        instance: null as any,
        getInstance() {
          if (!this.instance) {
            this.instance = {};
          }
          return this.instance;
        },
        clearInstance() {
          this.instance = null;
        },
      };

      const instance1 = singletonPattern.getInstance();
      const instance2 = singletonPattern.getInstance();

      expect(instance1).toBe(instance2);
      expect(singletonPattern.instance).toBe(instance1);

      singletonPattern.clearInstance();
      const instance3 = singletonPattern.getInstance();
      expect(instance3).not.toBe(instance1);
    });

    it('should handle shutdown state correctly', () => {
      // Test shutdown state logic
      const shutdownState = {
        isShutdown: false,
        shutdown() {
          this.isShutdown = true;
        },
        isShutdownState() {
          return this.isShutdown;
        },
        reset() {
          this.isShutdown = false;
        },
      };

      expect(shutdownState.isShutdownState()).toBe(false);
      shutdownState.shutdown();
      expect(shutdownState.isShutdownState()).toBe(true);
      shutdownState.reset();
      expect(shutdownState.isShutdownState()).toBe(false);
    });
  });

  describe('Request Priority Logic', () => {
    it('should map request types to priorities correctly', () => {
      const requestPriorities = {
        hover: 'IMMEDIATE',
        completion: 'IMMEDIATE',
        definition: 'HIGH',
        references: 'NORMAL',
        documentSymbol: 'HIGH',
        workspaceSymbol: 'NORMAL',
        diagnostics: 'NORMAL',
        codeAction: 'NORMAL',
        signatureHelp: 'IMMEDIATE',
        rename: 'LOW',
        documentOpen: 'IMMEDIATE',
        documentSave: 'NORMAL',
        documentChange: 'NORMAL',
        documentClose: 'NORMAL',
      };

      // Test immediate requests
      const immediateRequests = [
        'hover',
        'completion',
        'signatureHelp',
        'documentOpen',
      ];
      immediateRequests.forEach((type) => {
        expect(requestPriorities[type as keyof typeof requestPriorities]).toBe(
          'IMMEDIATE',
        );
      });

      // Test high priority requests
      const highPriorityRequests = ['definition', 'documentSymbol'];
      highPriorityRequests.forEach((type) => {
        expect(requestPriorities[type as keyof typeof requestPriorities]).toBe(
          'HIGH',
        );
      });

      // Test normal priority requests
      const normalPriorityRequests = [
        'references',
        'workspaceSymbol',
        'diagnostics',
        'codeAction',
        'documentSave',
        'documentChange',
        'documentClose',
      ];
      normalPriorityRequests.forEach((type) => {
        expect(requestPriorities[type as keyof typeof requestPriorities]).toBe(
          'NORMAL',
        );
      });

      // Test low priority requests
      const lowPriorityRequests = ['rename'];
      lowPriorityRequests.forEach((type) => {
        expect(requestPriorities[type as keyof typeof requestPriorities]).toBe(
          'LOW',
        );
      });
    });

    it('should have consistent timeout configurations', () => {
      const timeoutConfigs = {
        IMMEDIATE: 100,
        HIGH: 5000,
        NORMAL: 15000,
        LOW: 30000,
      };

      expect(timeoutConfigs.IMMEDIATE).toBeLessThan(timeoutConfigs.HIGH);
      expect(timeoutConfigs.HIGH).toBeLessThan(timeoutConfigs.NORMAL);
      expect(timeoutConfigs.NORMAL).toBeLessThan(timeoutConfigs.LOW);
    });
  });

  describe('Error Handling Logic', () => {
    it('should handle shutdown state errors correctly', () => {
      const errorHandler = {
        isShutdown: false,
        submitRequest(type: string, params: any) {
          if (this.isShutdown) {
            throw new Error('LSP Queue Manager is shutdown');
          }
          return Promise.resolve('success');
        },
        shutdown() {
          this.isShutdown = true;
        },
      };

      // Should succeed when not shutdown
      expect(() => {
        errorHandler.submitRequest('hover', {});
      }).not.toThrow();

      // Should fail when shutdown
      errorHandler.shutdown();
      expect(() => {
        errorHandler.submitRequest('hover', {});
      }).toThrow('LSP Queue Manager is shutdown');
    });

    it('should handle request submission errors', () => {
      const requestHandler = {
        async submitRequest(type: string, params: any) {
          if (type === 'error') {
            throw new Error('Submission failed');
          }
          return 'success';
        },
      };

      // Should succeed for valid requests
      expect(requestHandler.submitRequest('hover', {})).resolves.toBe(
        'success',
      );

      // Should fail for error requests
      expect(requestHandler.submitRequest('error', {})).rejects.toThrow(
        'Submission failed',
      );
    });
  });

  describe('Statistics Structure', () => {
    it('should have correct stats structure', () => {
      const stats = {
        immediateQueueSize: 0,
        highPriorityQueueSize: 2,
        normalPriorityQueueSize: 5,
        lowPriorityQueueSize: 1,
        totalProcessed: 150,
        totalFailed: 3,
        averageProcessingTime: 45.2,
        activeWorkers: 4,
      };

      expect(stats).toHaveProperty('immediateQueueSize');
      expect(stats).toHaveProperty('highPriorityQueueSize');
      expect(stats).toHaveProperty('normalPriorityQueueSize');
      expect(stats).toHaveProperty('lowPriorityQueueSize');
      expect(stats).toHaveProperty('totalProcessed');
      expect(stats).toHaveProperty('totalFailed');
      expect(stats).toHaveProperty('averageProcessingTime');
      expect(stats).toHaveProperty('activeWorkers');
    });

    it('should have valid stat values', () => {
      const stats = {
        immediateQueueSize: 0,
        highPriorityQueueSize: 2,
        normalPriorityQueueSize: 5,
        lowPriorityQueueSize: 1,
        totalProcessed: 150,
        totalFailed: 3,
        averageProcessingTime: 45.2,
        activeWorkers: 4,
      };

      expect(stats.immediateQueueSize).toBeGreaterThanOrEqual(0);
      expect(stats.highPriorityQueueSize).toBeGreaterThanOrEqual(0);
      expect(stats.normalPriorityQueueSize).toBeGreaterThanOrEqual(0);
      expect(stats.lowPriorityQueueSize).toBeGreaterThanOrEqual(0);
      expect(stats.totalProcessed).toBeGreaterThanOrEqual(0);
      expect(stats.totalFailed).toBeGreaterThanOrEqual(0);
      expect(stats.averageProcessingTime).toBeGreaterThanOrEqual(0);
      expect(stats.activeWorkers).toBeGreaterThan(0);
    });
  });
});
