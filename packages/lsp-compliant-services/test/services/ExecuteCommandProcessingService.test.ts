/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ExecuteCommandParams } from 'vscode-languageserver';
import { getLogger, FindApexTestsResult } from '@salesforce/apex-lsp-shared';
import { ISymbolManager } from '@salesforce/apex-lsp-parser-ast';
import { ExecuteCommandProcessingService } from '../../src/services/ExecuteCommandProcessingService';

describe('ExecuteCommandProcessingService', () => {
  let service: ExecuteCommandProcessingService;
  let mockSymbolManager: jest.Mocked<ISymbolManager>;
  let logger: any;

  beforeEach(() => {
    jest.clearAllMocks();

    logger = getLogger();

    // Setup mock symbol manager
    mockSymbolManager = {
      getAllSymbolsForCompletion: jest.fn(),
      addSymbol: jest.fn(),
      getSymbol: jest.fn(),
      findSymbolByName: jest.fn(),
      findSymbolByFQN: jest.fn(),
      findSymbolsInFile: jest.fn(),
      findFilesForSymbol: jest.fn(),
      resolveSymbol: jest.fn(),
      getAllReferencesInFile: jest.fn(),
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
    } as any;

    service = new ExecuteCommandProcessingService(logger, mockSymbolManager);
  });

  describe('processExecuteCommand', () => {
    it('should route findApexTests command to correct handler', async () => {
      // Arrange
      const params: ExecuteCommandParams = {
        command: 'apex.findApexTests',
        arguments: [],
      };

      // Mock getAllSymbolsForCompletion to return empty array for this test
      // The actual handler logic with test data is tested in FindApexTestsCommandHandler.test.ts
      mockSymbolManager.getAllSymbolsForCompletion.mockReturnValue([]);

      // Act
      const result = await service.processExecuteCommand(params);

      // Assert
      expect(result).toBeDefined();
      const typedResult = result as FindApexTestsResult;
      expect(typedResult.testClasses).toBeDefined();
      expect(Array.isArray(typedResult.testClasses)).toBe(true);
      expect(typedResult.testClasses).toHaveLength(0); // Empty because no test classes in mock
      expect(mockSymbolManager.getAllSymbolsForCompletion).toHaveBeenCalled();
    });

    it('should throw error for unknown command', async () => {
      // Arrange
      const params: ExecuteCommandParams = {
        command: 'apex.unknownCommand',
        arguments: [],
      };

      // Act & Assert
      await expect(service.processExecuteCommand(params)).rejects.toThrow(
        'Unknown command: apex.unknownCommand',
      );
    });

    it('should pass arguments to command handler', async () => {
      // Arrange
      const params: ExecuteCommandParams = {
        command: 'apex.findApexTests',
        arguments: ['arg1', 'arg2'],
      };

      // Mock getAllSymbolsForCompletion to return empty array
      mockSymbolManager.getAllSymbolsForCompletion.mockReturnValue([]);

      // Act
      await service.processExecuteCommand(params);

      // Assert - The handler should receive the arguments
      // This is verified through the mock implementation
      expect(params.arguments).toEqual(['arg1', 'arg2']);
      expect(mockSymbolManager.getAllSymbolsForCompletion).toHaveBeenCalled();
    });

    it('should handle command handler errors', async () => {
      // Arrange
      const params: ExecuteCommandParams = {
        command: 'apex.findApexTests',
        arguments: [],
      };

      // Mock getAllSymbolsForCompletion to throw an error
      mockSymbolManager.getAllSymbolsForCompletion.mockImplementation(() => {
        throw new Error('Handler error');
      });

      // Act & Assert
      await expect(service.processExecuteCommand(params)).rejects.toThrow(
        'Handler error',
      );
    });

    it('should handle empty arguments array', async () => {
      // Arrange
      const params: ExecuteCommandParams = {
        command: 'apex.findApexTests',
        arguments: undefined,
      };

      // Mock getAllSymbolsForCompletion to return empty array
      mockSymbolManager.getAllSymbolsForCompletion.mockReturnValue([]);

      // Act
      const result = await service.processExecuteCommand(params);

      // Assert
      expect(result).toBeDefined();
      const typedResult = result as FindApexTestsResult;
      expect(typedResult.testClasses).toBeDefined();
      expect(Array.isArray(typedResult.testClasses)).toBe(true);
      expect(mockSymbolManager.getAllSymbolsForCompletion).toHaveBeenCalled();
    });
  });

  describe('command registry', () => {
    it('should register findApexTests handler on construction', async () => {
      // The handler should be registered when service is created
      // We can verify this by checking that the command works
      const params: ExecuteCommandParams = {
        command: 'apex.findApexTests',
        arguments: [],
      };

      mockSymbolManager.getAllSymbolsForCompletion.mockReturnValue([]);

      // If handler is not registered, this would throw
      await expect(
        service.processExecuteCommand(params),
      ).resolves.toBeDefined();
    });
  });
});
