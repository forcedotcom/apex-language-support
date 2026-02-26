/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Layer } from 'effect';
import {
  initializeTracing,
  isTracingEnabled,
  disableTracing,
  shutdownTracing,
  runWithSpan,
  runSyncWithSpan,
  withTracing,
  LSP_SPAN_NAMES,
} from '../../src/observability/tracing';

const mockLayer = Layer.empty as unknown as Layer.Layer<never, never, never>;

describe('tracing', () => {
  beforeEach(async () => {
    await shutdownTracing();
  });

  afterEach(async () => {
    await shutdownTracing();
  });

  describe('initializeTracing', () => {
    it('enables tracing when a layer is provided', () => {
      initializeTracing(mockLayer);
      expect(isTracingEnabled()).toBe(true);
    });
  });

  describe('disableTracing', () => {
    it('disables tracing', () => {
      initializeTracing(mockLayer);
      expect(isTracingEnabled()).toBe(true);

      disableTracing();
      expect(isTracingEnabled()).toBe(false);
    });
  });

  describe('runWithSpan', () => {
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

  describe('runSyncWithSpan', () => {
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
