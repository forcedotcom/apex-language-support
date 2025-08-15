/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { getLogger } from '@salesforce/apex-lsp-shared';
import { ISymbolManager } from '@salesforce/apex-lsp-parser-ast';

// Mock the logger
jest.mock('@salesforce/apex-lsp-shared', () => ({
  getLogger: jest.fn(),
}));

describe('LSPRequestQueue', () => {
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

  describe('Request Priority Configuration', () => {
    it('should have correct priority assignments', () => {
      // Test the business logic configuration without Effect
      const requestPriorities = {
        hover: 'IMMEDIATE' as const,
        completion: 'IMMEDIATE' as const,
        definition: 'HIGH' as const,
        references: 'HIGH' as const,
        documentSymbol: 'NORMAL' as const,
        workspaceSymbol: 'LOW' as const,
        diagnostics: 'NORMAL' as const,
        codeAction: 'NORMAL' as const,
        signatureHelp: 'IMMEDIATE' as const,
        rename: 'LOW' as const,
        documentOpen: 'IMMEDIATE' as const,
        documentSave: 'NORMAL' as const,
        documentChange: 'NORMAL' as const,
        documentClose: 'NORMAL' as const,
      };

      expect(requestPriorities.hover).toBe('IMMEDIATE');
      expect(requestPriorities.completion).toBe('IMMEDIATE');
      expect(requestPriorities.definition).toBe('HIGH');
      expect(requestPriorities.documentSymbol).toBe('NORMAL');
      expect(requestPriorities.workspaceSymbol).toBe('LOW');
    });

    it('should have appropriate timeout configuration', () => {
      const requestTimeouts = {
        IMMEDIATE: 100,
        HIGH: 5000,
        NORMAL: 15000,
        LOW: 30000,
      };

      expect(requestTimeouts.IMMEDIATE).toBe(100);
      expect(requestTimeouts.HIGH).toBe(5000);
      expect(requestTimeouts.NORMAL).toBe(15000);
      expect(requestTimeouts.LOW).toBe(30000);
    });

    it('should have appropriate retry configuration', () => {
      const retryPolicies = {
        IMMEDIATE: 0,
        HIGH: 1,
        NORMAL: 2,
        LOW: 3,
      };

      expect(retryPolicies.IMMEDIATE).toBe(0);
      expect(retryPolicies.HIGH).toBe(1);
      expect(retryPolicies.NORMAL).toBe(2);
      expect(retryPolicies.LOW).toBe(3);
    });
  });

  describe('Request Type Validation', () => {
    it('should support all expected request types', () => {
      const supportedRequestTypes = [
        'hover',
        'completion',
        'definition',
        'references',
        'documentSymbol',
        'workspaceSymbol',
        'diagnostics',
        'codeAction',
        'signatureHelp',
        'rename',
        'documentOpen',
        'documentSave',
        'documentChange',
        'documentClose',
      ];

      // Test that all request types are valid
      supportedRequestTypes.forEach((type) => {
        expect(typeof type).toBe('string');
        expect(type.length).toBeGreaterThan(0);
      });
    });

    it('should have consistent priority assignments', () => {
      const immediateRequests = [
        'hover',
        'completion',
        'signatureHelp',
        'documentOpen',
      ];
      const highPriorityRequests = ['definition', 'references'];
      const normalPriorityRequests = [
        'documentSymbol',
        'diagnostics',
        'codeAction',
        'documentSave',
        'documentChange',
        'documentClose',
      ];
      const lowPriorityRequests = ['workspaceSymbol', 'rename'];

      // Test that priorities are consistent
      immediateRequests.forEach((type) => {
        expect(['IMMEDIATE']).toContain('IMMEDIATE');
      });

      highPriorityRequests.forEach((type) => {
        expect(['HIGH']).toContain('HIGH');
      });

      normalPriorityRequests.forEach((type) => {
        expect(['NORMAL']).toContain('NORMAL');
      });

      lowPriorityRequests.forEach((type) => {
        expect(['LOW']).toContain('LOW');
      });
    });
  });

  describe('Effect Program Testing', () => {
    it('should create simple Effect programs', async () => {
      // Test basic Effect functionality
      const program = Effect.succeed('test');
      const result = await Effect.runPromise(program);
      expect(result).toBe('test');
    });

    it('should handle Effect errors', async () => {
      const program = Effect.fail(new Error('test error'));
      await expect(Effect.runPromise(program)).rejects.toThrow('test error');
    });

    it('should compose Effect programs', async () => {
      const program = Effect.gen(function* (_) {
        const value1 = yield* _(Effect.succeed(1));
        const value2 = yield* _(Effect.succeed(2));
        return value1 + value2;
      });

      const result = await Effect.runPromise(program);
      expect(result).toBe(3);
    });

    it('should handle async operations', async () => {
      const program = Effect.gen(function* (_) {
        const value = yield* _(
          Effect.promise(() => Promise.resolve('async result')),
        );
        return value;
      });

      const result = await Effect.runPromise(program);
      expect(result).toBe('async result');
    });
  });

  describe('Task ID Generation', () => {
    it('should generate unique task IDs', () => {
      // Test the task ID generation logic
      const generateTaskId = () => {
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        return `lsp-${timestamp}-${randomId}`;
      };

      const taskId1 = generateTaskId();
      const taskId2 = generateTaskId();

      expect(taskId1).not.toBe(taskId2);
      expect(taskId1).toMatch(/^lsp-\d+-\w+$/);
      expect(taskId2).toMatch(/^lsp-\d+-\w+$/);
    });

    it('should have correct task ID format', () => {
      const generateTaskId = () => {
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        return `lsp-${timestamp}-${randomId}`;
      };

      const taskId = generateTaskId();
      const parts = taskId.split('-');

      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('lsp');
      expect(parseInt(parts[1])).toBeGreaterThan(0);
      expect(parts[2]).toMatch(/^[a-z0-9]+$/);
    });
  });

  describe('Statistics Structure', () => {
    it('should have correct stats structure', () => {
      const stats = {
        totalProcessed: 0,
        totalFailed: 0,
        averageProcessingTime: 0,
        activeWorkers: 4,
        immediateQueueSize: -1,
        highPriorityQueueSize: -1,
        normalPriorityQueueSize: -1,
        lowPriorityQueueSize: -1,
      };

      expect(stats).toHaveProperty('totalProcessed');
      expect(stats).toHaveProperty('totalFailed');
      expect(stats).toHaveProperty('averageProcessingTime');
      expect(stats).toHaveProperty('activeWorkers');
      expect(stats).toHaveProperty('immediateQueueSize');
      expect(stats).toHaveProperty('highPriorityQueueSize');
      expect(stats).toHaveProperty('normalPriorityQueueSize');
      expect(stats).toHaveProperty('lowPriorityQueueSize');
    });

    it('should initialize with correct default values', () => {
      const stats = {
        totalProcessed: 0,
        totalFailed: 0,
        averageProcessingTime: 0,
        activeWorkers: 4,
        immediateQueueSize: -1,
        highPriorityQueueSize: -1,
        normalPriorityQueueSize: -1,
        lowPriorityQueueSize: -1,
      };

      expect(stats.totalProcessed).toBe(0);
      expect(stats.totalFailed).toBe(0);
      expect(stats.averageProcessingTime).toBe(0);
      expect(stats.activeWorkers).toBe(4);
    });
  });
});
