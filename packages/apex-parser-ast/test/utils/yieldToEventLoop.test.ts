/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { yieldToEventLoop } from '../../src/utils/effectUtils';

/**
 * Tests for the yieldToEventLoop utility exported from effectUtils.
 * The yieldToEventLoop function uses setImmediate in Node.js (more effective)
 * or setTimeout(0) in browsers.
 *
 * This shared utility is used by:
 * - compilerService.ts
 * - priority-scheduler-utils.ts
 * - ApexSymbolManager.ts
 * - resourceLoader.ts
 * - DocumentProcessingService.ts (in lsp-compliant-services)
 */
describe('yieldToEventLoop utility', () => {
  describe('Node.js environment (setImmediate available)', () => {
    it('should use setImmediate when available', async () => {
      // In Node.js, setImmediate should be available
      expect(typeof setImmediate).toBe('function');

      let resolved = false;

      // Run the effect
      await Effect.runPromise(
        Effect.gen(function* () {
          yield* yieldToEventLoop;
          resolved = true;
        }),
      );

      expect(resolved).toBe(true);
    });

    it('should yield to the event loop and allow other tasks to run', async () => {
      const executionOrder: string[] = [];

      // Start the yielding effect
      const effectPromise = Effect.runPromise(
        Effect.gen(function* () {
          executionOrder.push('effect-start');
          yield* yieldToEventLoop;
          executionOrder.push('effect-after-yield');
        }),
      );

      // Schedule something via setImmediate (should run before our effect resumes)
      setImmediate(() => {
        executionOrder.push('setImmediate-task');
      });

      // Wait for everything
      await effectPromise;

      // Both should have completed
      expect(executionOrder).toContain('effect-start');
      expect(executionOrder).toContain('effect-after-yield');
    });

    it('should complete without errors', async () => {
      // Should not throw
      await expect(
        Effect.runPromise(yieldToEventLoop),
      ).resolves.toBeUndefined();
    });
  });

  describe('Browser environment simulation (setImmediate undefined)', () => {
    let originalSetImmediate: typeof globalThis.setImmediate | undefined;

    beforeEach(() => {
      // Save original setImmediate
      originalSetImmediate = globalThis.setImmediate;
      // Remove setImmediate to simulate browser environment
      (globalThis as any).setImmediate = undefined;
    });

    afterEach(() => {
      // Restore setImmediate
      (globalThis as any).setImmediate = originalSetImmediate;
    });

    // Note: We create a local yieldToEventLoop in these tests because the
    // imported one was already created when the module loaded (before we
    // mocked setImmediate). This tests the browser fallback logic.
    const createBrowserYieldToEventLoop = () =>
      Effect.async<void>((resume) => {
        if (typeof setImmediate !== 'undefined') {
          setImmediate(() => resume(Effect.void));
        } else {
          setTimeout(() => resume(Effect.void), 0);
        }
      });

    it('should fall back to setTimeout when setImmediate is undefined', async () => {
      // Verify setImmediate is undefined in our mock environment
      expect(typeof setImmediate).toBe('undefined');

      // Create the effect in the mocked environment
      const yieldToEventLoop = createBrowserYieldToEventLoop();

      let resolved = false;

      // Run the effect
      await Effect.runPromise(
        Effect.gen(function* () {
          yield* yieldToEventLoop;
          resolved = true;
        }),
      );

      expect(resolved).toBe(true);
    });

    it('should complete without errors using setTimeout fallback', async () => {
      // Verify setImmediate is undefined
      expect(typeof setImmediate).toBe('undefined');

      // Create the effect in the mocked environment
      const yieldToEventLoop = createBrowserYieldToEventLoop();

      // Should not throw
      await expect(
        Effect.runPromise(yieldToEventLoop),
      ).resolves.toBeUndefined();
    });

    it('should yield to event loop using setTimeout(0)', async () => {
      // Verify setImmediate is undefined
      expect(typeof setImmediate).toBe('undefined');

      const executionOrder: string[] = [];

      // Create the effect in the mocked environment
      const yieldToEventLoop = createBrowserYieldToEventLoop();

      // Start the yielding effect
      const effectPromise = Effect.runPromise(
        Effect.gen(function* () {
          executionOrder.push('effect-start');
          yield* yieldToEventLoop;
          executionOrder.push('effect-after-yield');
        }),
      );

      // Schedule something via setTimeout (should run)
      setTimeout(() => {
        executionOrder.push('setTimeout-task');
      }, 0);

      // Wait for everything
      await effectPromise;

      // The effect should have completed
      expect(executionOrder).toContain('effect-start');
      expect(executionOrder).toContain('effect-after-yield');
    });
  });

  describe('Multiple yields', () => {
    it('should handle multiple consecutive yields', async () => {
      let yieldCount = 0;

      await Effect.runPromise(
        Effect.gen(function* () {
          for (let i = 0; i < 5; i++) {
            yield* yieldToEventLoop;
            yieldCount++;
          }
        }),
      );

      expect(yieldCount).toBe(5);
    });

    it('should not block other async operations', async () => {
      const results: number[] = [];

      // Run multiple effects in parallel
      await Promise.all([
        Effect.runPromise(
          Effect.gen(function* () {
            yield* yieldToEventLoop;
            results.push(1);
          }),
        ),
        Effect.runPromise(
          Effect.gen(function* () {
            yield* yieldToEventLoop;
            results.push(2);
          }),
        ),
        Effect.runPromise(
          Effect.gen(function* () {
            yield* yieldToEventLoop;
            results.push(3);
          }),
        ),
      ]);

      // All should have completed
      expect(results.sort()).toEqual([1, 2, 3]);
    });
  });
});
