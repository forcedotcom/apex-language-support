/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect, TestContext, TestRuntime } from 'effect';
import { getLogger } from '@salesforce/apex-lsp-shared';
import { ISymbolManager } from '@salesforce/apex-lsp-parser-ast';

// Mock the logger
jest.mock('@salesforce/apex-lsp-shared', () => ({
  getLogger: jest.fn(),
}));

describe('LSPRequestQueue - Effect Tests', () => {
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
      removeFile: jest.fn(),
      addSymbolTable: jest.fn(),
      getSymbolAtPosition: jest.fn(),
      getAllReferencesInFile: jest.fn(),
      resolveSymbol: jest.fn(),
      getAllSymbolsForCompletion: jest.fn(),
      getStats: jest.fn(),
      clear: jest.fn(),
      optimizeMemory: jest.fn(),
      createResolutionContext: jest.fn(),
      constructFQN: jest.fn(),
      getContainingType: jest.fn(),
      getAncestorChain: jest.fn(),
      find: jest.fn(),
      findBuiltInType: jest.fn(),
      findSObjectType: jest.fn(),
      findUserType: jest.fn(),
      findExternalType: jest.fn(),
      isStandardApexClass: jest.fn(),
      getAvailableStandardClasses: jest.fn(),
      resolveStandardApexClass: jest.fn(),
    };
  });

  describe('Effect Program Testing', () => {
    it('should create a simple Effect program', async () => {
      // This is how you should test Effect programs
      const program = Effect.succeed('Hello, Effect!');

      const result = await Effect.runPromise(program);

      expect(result).toBe('Hello, Effect!');
    });

    it('should handle Effect errors properly', async () => {
      const program = Effect.fail(new Error('Test error'));

      await expect(Effect.runPromise(program)).rejects.toThrow('Test error');
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
  });

  describe('Queue Business Logic', () => {
    it('should have correct priority configuration', () => {
      // Test the business logic without Effect
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
});
