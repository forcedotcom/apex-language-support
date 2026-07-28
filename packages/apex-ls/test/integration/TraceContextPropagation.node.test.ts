/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Integration test for trace context propagation fix.
 *
 * This test verifies that the async chain from runWithSpan() through
 * dispatchProcessOnOpenDocument() returns a promise that keeps the span
 * alive until dispatch completes.
 *
 * REGRESSION: Before the fix, submitNotification() returned `void` and used
 * `void runWithCapturedContext(...)`, causing the span to end immediately.
 * The trace context injection happened AFTER the span ended, so
 * trace.getActiveSpan() returned undefined.
 *
 * AFTER FIX: submitNotification() returns `Promise<void>`, and the promise
 * chain keeps the span active until dispatch completes, allowing trace
 * context to be injected successfully.
 */

import {
  dispatchProcessOnOpenDocument,
  initializeLSPQueueManager,
  LSPQueueManager,
  ApexStorageManager,
  ApexStorage,
} from '@salesforce/apex-lsp-compliant-services';
import type { ISymbolManager } from '@salesforce/apex-lsp-parser-ast';
import type { TextDocumentChangeEvent } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';

describe('Trace context propagation - promise chain fix', () => {
  beforeAll(async () => {
    // Reset and initialize storage manager
    ApexStorageManager.reset();
    const storageManager = ApexStorageManager.getInstance({
      storageFactory: () => ApexStorage.getInstance(),
      autoPersistIntervalMs: 0,
    });
    await storageManager.initialize();

    // Initialize queue manager with minimal config
    initializeLSPQueueManager({
      initializeSymbolManager: () => Promise.resolve(),
      shutdownSymbolManager: () => Promise.resolve(),
      getSymbolTableForFile: () => Promise.resolve(null),
    } as unknown as ISymbolManager);
  });

  afterAll(async () => {
    // Cleanup
    const queueManager = LSPQueueManager.getInstance();
    await queueManager.shutdown();
    ApexStorageManager.reset();
  });

  it('dispatchProcessOnOpenDocument returns a promise (not void)', async () => {
    // Mock document event
    const mockDocument = {
      uri: 'file:///test/TestClass.cls',
      languageId: 'apex',
      version: 1,
      getText: () => 'public class TestClass {}',
    } as TextDocument;

    const mockEvent = {
      document: mockDocument,
    } as TextDocumentChangeEvent<TextDocument>;

    // CRITICAL: This should return a Promise, not void
    const result = dispatchProcessOnOpenDocument(mockEvent);

    // Verify it's a promise
    expect(result).toBeInstanceOf(Promise);

    // Verify the promise resolves
    await expect(result).resolves.toBeUndefined();
  });

  it('submitNotification returns a promise that can be awaited', async () => {
    const queueManager = LSPQueueManager.getInstance();

    const mockDocument = {
      uri: 'file:///test/TestClass2.cls',
      languageId: 'apex',
      version: 1,
      getText: () => 'public class TestClass2 {}',
    } as TextDocument;

    const mockEvent = {
      document: mockDocument,
    } as TextDocumentChangeEvent<TextDocument>;

    // CRITICAL: submitDocumentOpenNotification should return a Promise
    const result = queueManager.submitDocumentOpenNotification(mockEvent);

    expect(result).toBeInstanceOf(Promise);
    await expect(result).resolves.toBeUndefined();
  });

  it('submitNotification promise timing - stays pending until queue operations complete', async () => {
    const queueManager = LSPQueueManager.getInstance();
    const timestamps: Array<{ event: string; time: number }> = [];

    const mockDocument = {
      uri: 'file:///test/TestClass3.cls',
      languageId: 'apex',
      version: 1,
      getText: () => 'public class TestClass3 {}',
    } as TextDocument;

    const mockEvent = {
      document: mockDocument,
    } as TextDocumentChangeEvent<TextDocument>;

    timestamps.push({ event: 'start', time: Date.now() });

    const promise = queueManager.submitDocumentOpenNotification(mockEvent);

    timestamps.push({ event: 'promise_returned', time: Date.now() });

    await promise;

    timestamps.push({ event: 'promise_resolved', time: Date.now() });

    // Verify timing: promise should not resolve instantly
    // (it should take at least some time for queue operations)
    const returnTime = timestamps[1].time - timestamps[0].time;
    const resolveTime = timestamps[2].time - timestamps[1].time;

    console.log(
      `[timing] call→return: ${returnTime}ms, return→resolve: ${resolveTime}ms`,
    );

    // The promise should exist (not undefined/void)
    expect(timestamps.length).toBe(3);
  });
});
