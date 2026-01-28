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
 * Convert LSP log level to Effect LogLevel
 * @param lspLevel The LSP log level string
 * @returns Effect LogLevel
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
 * Creates an Effect Logger Layer that forwards all Effect logging
 * to the global LSP logger (via getLogger()).
 *
 * This bridges Effect's logging system with the LSP logger infrastructure,
 * ensuring that all Effect.logDebug/logInfo/logWarning/logError calls
 * appear in the VS Code Output panel via window/logMessage notifications.
 *
 * The global logger is configured at server startup via setLoggerFactory()
 * and connects to the LSP connection for sending log messages to the client.
 *
 * This layer also configures Effect's minimum log level based on the LSP
 * log level setting, ensuring that Effect doesn't emit logs below the
 * configured threshold.
 *
 * @returns Effect Logger Layer that can be provided to Effects
 *
 * @example
 * ```typescript
 * // In validators or any Effect-based code
 * const result = await Effect.runPromise(
 *   myEffect.pipe(Effect.provide(EffectLspLoggerLive))
 * );
 * ```
 */
export const EffectLspLoggerLive: Layer.Layer<never, never, never> =
  Layer.unwrapEffect(
    Effect.sync(() => {
      // Get the current global logger (set up at server startup)
      const lspLogger = getLogger();

      // Get the current LSP log level and convert to Effect LogLevel
      const currentLspLevel = getLogLevel();
      const effectMinLevel = lspLevelToEffectLevel(currentLspLevel);

      // Create a custom Effect Logger that forwards to LSP logger
      const lspEffectLogger = Logger.make(({ logLevel, message }) => {
        // Map Effect LogLevel to LSP logger methods
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
            // Don't log if level is None
            break;
          default:
            // Default to info for unknown levels
            lspLogger.info(String(message));
        }
      });

      // Replace the default Effect logger with our custom LSP logger
      // and combine with minimum log level layer
      const loggerReplacement = Logger.replace(
        Logger.defaultLogger,
        lspEffectLogger,
      );
      const minimumLogLevel = Logger.minimumLogLevel(effectMinLevel);

      return Layer.merge(loggerReplacement, minimumLogLevel);
    }),
  );

/**
 * Creates a minimal Effect Logger Layer for testing that logs to console.
 * Use this in tests where the global logger may not be set up with an LSP connection.
 *
 * @returns Effect Logger Layer for testing
 *
 * @example
 * ```typescript
 * // In test files
 * const result = await Effect.runPromise(
 *   myEffect.pipe(Effect.provide(EffectTestLoggerLive))
 * );
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
