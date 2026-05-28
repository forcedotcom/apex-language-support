/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  CompletionParams,
  CompletionItem,
  CompletionItemKind,
} from 'vscode-languageserver-protocol';

import {
  CompletionHandler,
  COMPLETION_TIMEOUT_MS,
  COMPLETION_TRIGGER_CHARACTERS,
} from '../../src/handlers/CompletionHandler';
import { ICompletionProcessor } from '../../src/services/CompletionProcessingService';

describe('CompletionHandler', () => {
  let handler: CompletionHandler;
  let mockLogger: any;
  let mockCompletionProcessor: jest.Mocked<ICompletionProcessor>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    mockCompletionProcessor = {
      processCompletion: jest.fn(),
    };

    handler = new CompletionHandler(mockLogger, mockCompletionProcessor);
  });

  describe('handleCompletion - basic path', () => {
    it('should return completion items for valid request', async () => {
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test.cls' },
        position: { line: 0, character: 0 },
      };

      const mockItems: CompletionItem[] = [
        { label: 'doSomething', kind: CompletionItemKind.Method },
      ];

      mockCompletionProcessor.processCompletion.mockResolvedValue(mockItems);

      const result = await handler.handleCompletion(params);
      expect(result).toEqual(mockItems);
      expect(mockCompletionProcessor.processCompletion).toHaveBeenCalledWith(
        params,
      );
    });

    it('should handle null completion results', async () => {
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test.cls' },
        position: { line: 0, character: 0 },
      };

      mockCompletionProcessor.processCompletion.mockResolvedValue(null as any);

      const result = await handler.handleCompletion(params);
      expect(result).toBeNull();
    });
  });

  describe('timeout enforcement', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return empty array when processor exceeds timeout on basic path', async () => {
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test.cls' },
        position: { line: 0, character: 0 },
      };

      mockCompletionProcessor.processCompletion.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 5000)),
      );

      const resultPromise = handler.handleCompletion(params);

      jest.advanceTimersByTime(COMPLETION_TIMEOUT_MS + 100);

      const result = await resultPromise;
      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should return {items: [], isIncomplete: true} when processor exceeds timeout on readiness path', async () => {
      mockCompletionProcessor.processCompletionWithReadiness = jest
        .fn()
        .mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () => resolve({ items: [], isIncomplete: false }),
                5000,
              ),
            ),
        );

      const handlerWithReadiness = new CompletionHandler(
        mockLogger,
        mockCompletionProcessor,
      );

      const params: CompletionParams = {
        textDocument: { uri: 'file:///test.cls' },
        position: { line: 0, character: 0 },
      };

      const resultPromise = handlerWithReadiness.handleCompletion(params);

      jest.advanceTimersByTime(COMPLETION_TIMEOUT_MS + 100);

      const result = await resultPromise;
      expect(result).toEqual({ items: [], isIncomplete: true });
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should resolve normally when processor completes before timeout', async () => {
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test.cls' },
        position: { line: 0, character: 0 },
      };

      const mockItems: CompletionItem[] = [
        { label: 'fastMethod', kind: CompletionItemKind.Method },
      ];

      mockCompletionProcessor.processCompletion.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve(mockItems), 100)),
      );

      const resultPromise = handler.handleCompletion(params);

      jest.advanceTimersByTime(200);

      const result = await resultPromise;
      expect(result).toEqual(mockItems);
    });

    it('should use custom timeout when provided', async () => {
      const customTimeout = 500;
      const customHandler = new CompletionHandler(
        mockLogger,
        mockCompletionProcessor,
        customTimeout,
      );

      const params: CompletionParams = {
        textDocument: { uri: 'file:///test.cls' },
        position: { line: 0, character: 0 },
      };

      mockCompletionProcessor.processCompletion.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 1000)),
      );

      const resultPromise = customHandler.handleCompletion(params);

      jest.advanceTimersByTime(customTimeout + 100);

      const result = await resultPromise;
      expect(result).toEqual([]);
    });
  });

  describe('progressive refinement', () => {
    it('should use processCompletionWithReadiness when available', async () => {
      mockCompletionProcessor.processCompletionWithReadiness = jest
        .fn()
        .mockResolvedValue({
          items: [{ label: 'method1', kind: CompletionItemKind.Method }],
          isIncomplete: true,
        });

      const handlerWithReadiness = new CompletionHandler(
        mockLogger,
        mockCompletionProcessor,
      );

      const params: CompletionParams = {
        textDocument: { uri: 'file:///test.cls' },
        position: { line: 0, character: 0 },
      };

      const result = await handlerWithReadiness.handleCompletion(params);

      expect(result).toEqual({
        items: [{ label: 'method1', kind: CompletionItemKind.Method }],
        isIncomplete: true,
      });
      expect(
        mockCompletionProcessor.processCompletionWithReadiness,
      ).toHaveBeenCalledWith(params);
      expect(mockCompletionProcessor.processCompletion).not.toHaveBeenCalled();
    });

    it('should return CompletionList with isIncomplete: false when fully resolved', async () => {
      mockCompletionProcessor.processCompletionWithReadiness = jest
        .fn()
        .mockResolvedValue({
          items: [
            { label: 'method1', kind: CompletionItemKind.Method },
            { label: 'method2', kind: CompletionItemKind.Method },
          ],
          isIncomplete: false,
        });

      const handlerWithReadiness = new CompletionHandler(
        mockLogger,
        mockCompletionProcessor,
      );

      const params: CompletionParams = {
        textDocument: { uri: 'file:///test.cls' },
        position: { line: 0, character: 0 },
      };

      const result = await handlerWithReadiness.handleCompletion(params);

      expect(result).toEqual({
        items: [
          { label: 'method1', kind: CompletionItemKind.Method },
          { label: 'method2', kind: CompletionItemKind.Method },
        ],
        isIncomplete: false,
      });
    });

    it('should fall back to processCompletion when processCompletionWithReadiness is undefined', async () => {
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test.cls' },
        position: { line: 0, character: 0 },
      };

      const mockItems: CompletionItem[] = [
        { label: 'fallbackMethod', kind: CompletionItemKind.Method },
      ];
      mockCompletionProcessor.processCompletion.mockResolvedValue(mockItems);

      const result = await handler.handleCompletion(params);

      expect(result).toEqual(mockItems);
      expect(mockCompletionProcessor.processCompletion).toHaveBeenCalledWith(
        params,
      );
    });
  });

  describe('error isolation', () => {
    it('should return null when processor throws', async () => {
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test.cls' },
        position: { line: 0, character: 0 },
      };

      mockCompletionProcessor.processCompletion.mockRejectedValue(
        new Error('Processor error'),
      );

      const result = await handler.handleCompletion(params);
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should return null for TypeError', async () => {
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test.cls' },
        position: { line: 0, character: 0 },
      };

      mockCompletionProcessor.processCompletion.mockRejectedValue(
        new TypeError('Type error'),
      );

      const result = await handler.handleCompletion(params);
      expect(result).toBeNull();
    });

    it('should return null when readiness processor throws', async () => {
      mockCompletionProcessor.processCompletionWithReadiness = jest
        .fn()
        .mockRejectedValue(new Error('Readiness error'));

      const handlerWithReadiness = new CompletionHandler(
        mockLogger,
        mockCompletionProcessor,
      );

      const params: CompletionParams = {
        textDocument: { uri: 'file:///test.cls' },
        position: { line: 0, character: 0 },
      };

      const result = await handlerWithReadiness.handleCompletion(params);
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('trigger characters', () => {
    it('should include dot for member access', () => {
      expect(COMPLETION_TRIGGER_CHARACTERS).toContain('.');
    });

    it('should include @ for annotation completion', () => {
      expect(COMPLETION_TRIGGER_CHARACTERS).toContain('@');
    });
  });

  describe('COMPLETION_TIMEOUT_MS', () => {
    it('should be 2000ms', () => {
      expect(COMPLETION_TIMEOUT_MS).toBe(2000);
    });
  });
});
