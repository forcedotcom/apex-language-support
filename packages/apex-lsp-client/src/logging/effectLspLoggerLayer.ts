/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Logger, Layer, Effect, LogLevel } from 'effect';
import { getLogger, getLogLevel } from '@salesforce/apex-lsp-shared';

/**
 * Local Effect → LSP logger bridge for the client SDK.
 *
 * Modeled on `packages/apex-parser-ast/src/utils/EffectLspLoggerLayer.ts`, but
 * deliberately kept here so the SDK depends only on `effect` + the shared
 * `getLogger`/`getLogLevel` — NOT on the heavy `apex-lsp-parser-ast` package
 * (antlr4/apex-parser/protobuf) just for a tiny layer. The bridge is fully
 * vscode-free: it forwards to whatever global logger the host has configured
 * via the shared logger factory.
 *
 * The SDK's own Effect code logs via `Effect.log*` only; the wire binding lives
 * here and is provided at the boundary when an Effect is run.
 */

/**
 * Convert an LSP log-level string to an Effect `LogLevel`.
 */
const lspLevelToEffectLevel = (lspLevel: string): LogLevel.LogLevel => {
  switch (lspLevel.toLowerCase()) {
    case 'error':
      return LogLevel.Error;
    case 'warn':
    case 'warning':
      return LogLevel.Warning;
    case 'info':
      return LogLevel.Info;
    case 'debug':
      return LogLevel.Debug;
    default:
      return LogLevel.Info;
  }
};

/**
 * Effect Logger Layer that forwards all Effect logging to the global LSP logger
 * (via the shared `getLogger()`), and pins Effect's minimum log level to the
 * current LSP level. Provide this in production code:
 *
 * ```typescript
 * await Effect.runPromise(myEffect.pipe(Effect.provide(EffectLspLoggerLive)));
 * ```
 */
export const EffectLspLoggerLive: Layer.Layer<never, never, never> =
  Layer.unwrapEffect(
    Effect.sync(() => {
      const lspLogger = getLogger();
      const currentLspLevel = getLogLevel();
      const effectMinLevel = lspLevelToEffectLevel(currentLspLevel);

      const lspEffectLogger = Logger.make(({ logLevel, message }) => {
        switch (logLevel._tag) {
          case 'Fatal':
          case 'Error':
            lspLogger.error(String(message));
            break;
          case 'Warning':
            lspLogger.warn(String(message));
            break;
          case 'Info':
            lspLogger.info(String(message));
            break;
          case 'Debug':
          case 'Trace':
            lspLogger.debug(String(message));
            break;
          case 'None':
            break;
          default:
            lspLogger.info(String(message));
        }
      });

      const loggerReplacement = Logger.replace(
        Logger.defaultLogger,
        lspEffectLogger,
      );
      const minimumLogLevel = Logger.minimumLogLevel(effectMinLevel);

      return Layer.merge(loggerReplacement, minimumLogLevel);
    }),
  );

/**
 * Minimal Effect Logger Layer for tests that logs to the console. Use this in
 * tests where the global LSP logger may not be wired to a connection:
 *
 * ```typescript
 * await Effect.runPromise(myEffect.pipe(Effect.provide(EffectTestLoggerLive)));
 * ```
 */
export const EffectTestLoggerLive: Layer.Layer<never, never, never> =
  Layer.effectDiscard(
    Effect.sync(() => {
      const testLogger = Logger.make(({ logLevel, message }) => {
        const timestamp = new Date().toISOString();
        const level = logLevel._tag;
        console.log(`[${timestamp}] [${level}] ${String(message)}`);
      });

      return Logger.replace(Logger.defaultLogger, testLogger);
    }),
  );
