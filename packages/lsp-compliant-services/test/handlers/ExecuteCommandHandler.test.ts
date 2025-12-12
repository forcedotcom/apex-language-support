/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ExecuteCommandParams } from 'vscode-languageserver';
import { getLogger, FindApexTestsResult } from '@salesforce/apex-lsp-shared';
import { ExecuteCommandHandler } from '../../src/handlers/ExecuteCommandHandler';
import { IExecuteCommandProcessor } from '../../src/services/ExecuteCommandProcessingService';

// Mock the execute command processor
const mockExecuteCommandProcessor: jest.Mocked<IExecuteCommandProcessor> = {
  processExecuteCommand: jest.fn(),
};

describe('ExecuteCommandHandler', () => {
  let handler: ExecuteCommandHandler;
  let logger: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup logger
    logger = getLogger();

    // Create handler instance
    handler = new ExecuteCommandHandler(logger, mockExecuteCommandProcessor);
  });

  describe('handleExecuteCommand', () => {
    it('should process execute command request successfully', async () => {
      // Arrange
      const params: ExecuteCommandParams = {
        command: 'apex.findApexTests',
        arguments: [],
      };

      const mockResult: FindApexTestsResult = {
        testClasses: [
          {
            class: {
              name: 'TestClass',
              fileUri: 'file:///test/TestClass.cls',
              location: {
                uri: 'file:///test/TestClass.cls',
                range: {
                  start: { line: 0, character: 0 },
                  end: { line: 10, character: 0 },
                },
              },
            },
            methods: [
              {
                name: 'testMethod',
                location: {
                  uri: 'file:///test/TestClass.cls',
                  range: {
                    start: { line: 3, character: 0 },
                    end: { line: 5, character: 0 },
                  },
                },
              },
            ],
          },
        ],
      };

      mockExecuteCommandProcessor.processExecuteCommand.mockResolvedValue(
        mockResult,
      );

      // Act
      const result = await handler.handleExecuteCommand(params);

      // Assert
      expect(result).toEqual(mockResult);
      expect(
        mockExecuteCommandProcessor.processExecuteCommand,
      ).toHaveBeenCalledWith(params);
    });

    it('should handle processor errors gracefully', async () => {
      // Arrange
      const params: ExecuteCommandParams = {
        command: 'apex.findApexTests',
        arguments: [],
      };

      const error = new Error('Processor error');
      mockExecuteCommandProcessor.processExecuteCommand.mockRejectedValue(
        error,
      );

      // Act & Assert
      await expect(handler.handleExecuteCommand(params)).rejects.toThrow(
        'Processor error',
      );
      expect(
        mockExecuteCommandProcessor.processExecuteCommand,
      ).toHaveBeenCalledWith(params);
    });

    it('should handle different command types', async () => {
      // Arrange
      const params: ExecuteCommandParams = {
        command: 'apex.findApexTests',
        arguments: ['arg1', 'arg2'],
      };

      const mockResult = { success: true };
      mockExecuteCommandProcessor.processExecuteCommand.mockResolvedValue(
        mockResult,
      );

      // Act
      const result = await handler.handleExecuteCommand(params);

      // Assert
      expect(result).toEqual(mockResult);
      expect(
        mockExecuteCommandProcessor.processExecuteCommand,
      ).toHaveBeenCalledWith(params);
    });

    it('should pass command arguments correctly', async () => {
      // Arrange
      const params: ExecuteCommandParams = {
        command: 'apex.findApexTests',
        arguments: ['filter', 'pattern'],
      };

      mockExecuteCommandProcessor.processExecuteCommand.mockResolvedValue({
        testClasses: [],
      });

      // Act
      await handler.handleExecuteCommand(params);

      // Assert
      expect(
        mockExecuteCommandProcessor.processExecuteCommand,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'apex.findApexTests',
          arguments: ['filter', 'pattern'],
        }),
      );
    });

    it('should handle undefined arguments', async () => {
      // Arrange
      const params: ExecuteCommandParams = {
        command: 'apex.findApexTests',
        arguments: undefined,
      };

      mockExecuteCommandProcessor.processExecuteCommand.mockResolvedValue({
        testClasses: [],
      });

      // Act
      await handler.handleExecuteCommand(params);

      // Assert
      expect(
        mockExecuteCommandProcessor.processExecuteCommand,
      ).toHaveBeenCalledWith(params);
    });
  });

  describe('error handling', () => {
    it('should log errors appropriately', async () => {
      // Arrange
      const params: ExecuteCommandParams = {
        command: 'apex.findApexTests',
        arguments: [],
      };

      const error = new Error('Test error');
      mockExecuteCommandProcessor.processExecuteCommand.mockRejectedValue(
        error,
      );

      // Act & Assert
      await expect(handler.handleExecuteCommand(params)).rejects.toThrow(
        'Test error',
      );
    });

    it('should handle different error types', async () => {
      // Arrange
      const params: ExecuteCommandParams = {
        command: 'apex.findApexTests',
        arguments: [],
      };

      const error = new TypeError('Type error');
      mockExecuteCommandProcessor.processExecuteCommand.mockRejectedValue(
        error,
      );

      // Act & Assert
      await expect(handler.handleExecuteCommand(params)).rejects.toThrow(
        'Type error',
      );
    });
  });

  describe('integration with findApexTests', () => {
    it('should successfully execute findApexTests command end-to-end', async () => {
      // Arrange
      const params: ExecuteCommandParams = {
        command: 'apex.findApexTests',
        arguments: [],
      };

      const expectedResult: FindApexTestsResult = {
        testClasses: [
          {
            class: {
              name: 'MyTestClass',
              fileUri: 'file:///test/MyTestClass.cls',
              location: {
                uri: 'file:///test/MyTestClass.cls',
                range: {
                  start: { line: 0, character: 0 },
                  end: { line: 20, character: 0 },
                },
              },
            },
            methods: [
              {
                name: 'testMethod1',
                location: {
                  uri: 'file:///test/MyTestClass.cls',
                  range: {
                    start: { line: 5, character: 0 },
                    end: { line: 10, character: 0 },
                  },
                },
              },
              {
                name: 'testMethod2',
                location: {
                  uri: 'file:///test/MyTestClass.cls',
                  range: {
                    start: { line: 12, character: 0 },
                    end: { line: 17, character: 0 },
                  },
                },
              },
            ],
          },
        ],
      };

      mockExecuteCommandProcessor.processExecuteCommand.mockResolvedValue(
        expectedResult,
      );

      // Act
      const result = await handler.handleExecuteCommand(params);

      // Assert
      expect(result).toEqual(expectedResult);
      const typedResult = result as FindApexTestsResult;
      expect(typedResult.testClasses).toHaveLength(1);
      expect(typedResult.testClasses[0].class.name).toBe('MyTestClass');
      expect(typedResult.testClasses[0].methods).toHaveLength(2);
      expect(typedResult.testClasses[0].methods[0].name).toBe('testMethod1');
      expect(typedResult.testClasses[0].methods[1].name).toBe('testMethod2');
    });
  });
});
