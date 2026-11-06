/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { trace } from '@opentelemetry/api';
import {
  enableTracing,
  isTracingEnabled,
  disableTracing,
  runWithSpan,
  runSyncWithSpan,
  withTracing,
  LSP_SPAN_NAMES,
} from '../../src/observability/tracing';

describe('tracing', () => {
  beforeEach(() => {
    disableTracing();
  });

  afterEach(() => {
    disableTracing();
  });

  describe('enableTracing', () => {
    it('enables tracing', () => {
      enableTracing();
      expect(isTracingEnabled()).toBe(true);
    });
  });

  describe('disableTracing', () => {
    it('disables tracing', () => {
      enableTracing();
      expect(isTracingEnabled()).toBe(true);

      disableTracing();
      expect(isTracingEnabled()).toBe(false);
    });
  });

  describe('runWithSpan (tracing disabled)', () => {
    it('executes function when tracing is disabled', async () => {
      const result = await runWithSpan('test.span', async () => 'success');

      expect(result).toBe('success');
    });

    it('propagates errors when tracing is disabled', async () => {
      await expect(
        runWithSpan('test.span', async () => {
          throw new Error('test error');
        }),
      ).rejects.toThrow('test error');
    });

    it('passes attributes to span', async () => {
      const result = await runWithSpan('test.span', async () => 'done', {
        'test.attr': 'value',
      });

      expect(result).toBe('done');
    });
  });

  describe('runWithSpan (tracing enabled)', () => {
    beforeEach(() => {
      enableTracing();
    });

    const mockActiveSpan = () => {
      const span = {
        setAttribute: vi.fn(),
        setStatus: vi.fn(),
        addEvent: vi.fn(),
        end: vi.fn(),
      };
      vi.spyOn(trace, 'getTracer').mockReturnValue({
        startActiveSpan: (
          _name: string,
          callback: (activeSpan: never) => unknown,
        ) => callback(span as never),
      } as any);
      return span;
    };

    it('executes and returns result with tracing active', async () => {
      const result = await runWithSpan('test.span', async () => 42);
      expect(result).toBe(42);
    });

    it('propagates errors with tracing active', async () => {
      await expect(
        runWithSpan('test.span', async () => {
          throw new Error('traced error');
        }),
      ).rejects.toThrow('traced error');
    });

    it('accepts attributes with tracing active', async () => {
      const result = await runWithSpan('test.span', async () => 'ok', {
        'lsp.method': 'textDocument/hover',
      });
      expect(result).toBe('ok');
    });

    it('derives span attributes from a successful result', async () => {
      const span = mockActiveSpan();
      const resultAttributes = vi.fn((value: { ready: boolean }) => ({
        'test.ready': value.ready,
      }));
      const result = await runWithSpan(
        'test.span',
        async () => ({ ready: true }),
        undefined,
        resultAttributes,
      );

      expect(result).toEqual({ ready: true });
      expect(resultAttributes).toHaveBeenCalledExactlyOnceWith({ ready: true });
      expect(span.setAttribute).toHaveBeenCalledWith('test.ready', true);
    });

    it('does not fail a successful operation when result attribution throws', async () => {
      const span = mockActiveSpan();
      const resultAttributes = vi.fn(() => {
        throw new Error('attribution failed');
      });
      const result = await runWithSpan(
        'test.span',
        async () => 'ok',
        undefined,
        resultAttributes,
      );

      expect(result).toBe('ok');
      expect(resultAttributes).toHaveBeenCalledExactlyOnceWith('ok');
      expect(span.addEvent).toHaveBeenCalledWith(
        'tracing.result_attributes_error',
        { error: 'attribution failed' },
      );
      expect(span.setStatus).toHaveBeenCalledWith({ code: 1 });
    });
  });

  describe('runSyncWithSpan (tracing disabled)', () => {
    it('executes sync function when tracing is disabled', () => {
      const result = runSyncWithSpan('test.span', () => 'sync-success');
      expect(result).toBe('sync-success');
    });

    it('propagates errors from sync function', () => {
      expect(() =>
        runSyncWithSpan('test.span', () => {
          throw new Error('sync error');
        }),
      ).toThrow('sync error');
    });
  });

  describe('runSyncWithSpan (tracing enabled)', () => {
    beforeEach(() => {
      enableTracing();
    });

    it('executes and returns result with tracing active', () => {
      const result = runSyncWithSpan('test.span', () => 'sync-traced');
      expect(result).toBe('sync-traced');
    });

    it('propagates errors with tracing active', () => {
      expect(() =>
        runSyncWithSpan('test.span', () => {
          throw new Error('sync traced error');
        }),
      ).toThrow('sync traced error');
    });
  });

  describe('withTracing', () => {
    it('creates wrapped function that executes with tracing', async () => {
      const originalFn = async (x: number, y: number) => x + y;
      const tracedFn = withTracing('math.add', originalFn);

      const result = await tracedFn(2, 3);

      expect(result).toBe(5);
    });

    it('passes attributes from getter function', async () => {
      const originalFn = async (name: string) => `Hello, ${name}!`;
      const tracedFn = withTracing('greet', originalFn, (name) => ({
        'input.name': name,
      }));

      const result = await tracedFn('World');

      expect(result).toBe('Hello, World!');
    });

    it('works with tracing enabled', async () => {
      enableTracing();
      const originalFn = async (x: number) => x * 2;
      const tracedFn = withTracing('double', originalFn);

      const result = await tracedFn(5);
      expect(result).toBe(10);
    });
  });

  describe('LSP_SPAN_NAMES', () => {
    it('has expected span names defined', () => {
      expect(LSP_SPAN_NAMES.HOVER).toBe('extension.command.hover');
      expect(LSP_SPAN_NAMES.COMPLETION).toBe('extension.command.completion');
      expect(LSP_SPAN_NAMES.DEFINITION).toBe('extension.command.definition');
      expect(LSP_SPAN_NAMES.REFERENCES).toBe('extension.command.references');
      expect(LSP_SPAN_NAMES.DOCUMENT_SYMBOL).toBe(
        'extension.command.documentSymbol',
      );
      expect(LSP_SPAN_NAMES.DIAGNOSTICS).toBe('extension.command.diagnostics');
      expect(LSP_SPAN_NAMES.PARSE).toBe('extension.parser.parse');
    });
  });
});
