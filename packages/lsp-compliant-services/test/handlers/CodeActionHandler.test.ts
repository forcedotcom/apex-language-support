/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CodeActionParams, CodeAction } from 'vscode-languageserver-protocol';
import { getLogger } from '@salesforce/apex-lsp-shared';

import { CodeActionHandler } from '../../src/handlers/CodeActionHandler';
import { ICodeActionProcessor } from '../../src/services/CodeActionProcessingService';

// Mock the code action processor
const mockCodeActionProcessor: jest.Mocked<ICodeActionProcessor> = {
  processCodeAction: jest.fn(),
};

describe('CodeActionHandler', () => {
  let handler: CodeActionHandler;
  let logger: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup logger
    logger = getLogger();

    // Create handler instance
    handler = new CodeActionHandler(logger, mockCodeActionProcessor);
  });

  describe('handleCodeAction', () => {
    it('should process code action request successfully', async () => {
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

      const mockCodeActions: CodeAction[] = [
        {
          title: "Rename method 'doSomething'",
          kind: 'refactor',
          command: {
            title: 'Rename method',
            command: 'apex.renameSymbol',
            arguments: [
              'doSomething',
              'file:///test/TestClass.cls',
              params.range,
            ],
          },
        },
        {
          title: "Add import for 'System.Debug'",
          kind: 'quickfix',
          edit: {
            changes: {
              'file:///test/TestClass.cls': [
                {
                  range: {
                    start: { line: 0, character: 0 },
                    end: { line: 0, character: 0 },
                  },
                  newText: 'import System.Debug;\n',
                },
              ],
            },
          },
        },
      ];

      mockCodeActionProcessor.processCodeAction.mockResolvedValue(
        mockCodeActions,
      );

      // Act
      const result = await handler.handleCodeAction(params);

      // Assert
      expect(result).toEqual(mockCodeActions);
      expect(mockCodeActionProcessor.processCodeAction).toHaveBeenCalledWith(
        params,
      );
    });

    it('should handle processor errors gracefully', async () => {
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

      const error = new Error('Processor error');
      mockCodeActionProcessor.processCodeAction.mockRejectedValue(error);

      // Act & Assert
      await expect(handler.handleCodeAction(params)).rejects.toThrow(
        'Processor error',
      );
      expect(mockCodeActionProcessor.processCodeAction).toHaveBeenCalledWith(
        params,
      );
    });

    it('should handle empty code action results', async () => {
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

      mockCodeActionProcessor.processCodeAction.mockResolvedValue([]);

      // Act
      const result = await handler.handleCodeAction(params);

      // Assert
      expect(result).toEqual([]);
      expect(mockCodeActionProcessor.processCodeAction).toHaveBeenCalledWith(
        params,
      );
    });

    it('should handle diagnostic-based code actions', async () => {
      // Arrange
      const params: CodeActionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        range: {
          start: { line: 5, character: 10 },
          end: { line: 5, character: 15 },
        },
        context: {
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
          only: undefined,
          triggerKind: 1,
        },
      };

      const mockCodeActions: CodeAction[] = [
        {
          title: 'Analyze circular dependency',
          kind: 'quickfix',
          command: {
            title: 'Analyze circular dependency',
            command: 'apex.analyzeCircularDependency',
            arguments: [
              'file:///test/TestClass.cls',
              'Circular dependency detected',
            ],
          },
        },
      ];

      mockCodeActionProcessor.processCodeAction.mockResolvedValue(
        mockCodeActions,
      );

      // Act
      const result = await handler.handleCodeAction(params);

      // Assert
      expect(result).toEqual(mockCodeActions);
      expect(mockCodeActionProcessor.processCodeAction).toHaveBeenCalledWith(
        params,
      );
    });
  });

  describe('error handling', () => {
    it('should log errors appropriately', async () => {
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

      const error = new Error('Test error');
      mockCodeActionProcessor.processCodeAction.mockRejectedValue(error);

      // Act & Assert
      await expect(handler.handleCodeAction(params)).rejects.toThrow(
        'Test error',
      );
    });

    it('should handle different error types', async () => {
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

      const error = new TypeError('Type error');
      mockCodeActionProcessor.processCodeAction.mockRejectedValue(error);

      // Act & Assert
      await expect(handler.handleCodeAction(params)).rejects.toThrow(
        'Type error',
      );
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

      mockCodeActionProcessor.processCodeAction.mockResolvedValue([]);

      const startTime = Date.now();

      // Act
      const result = await handler.handleCodeAction(params);

      const endTime = Date.now();

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
