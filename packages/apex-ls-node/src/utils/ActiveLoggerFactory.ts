/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  Logger,
  LoggerFactory,
  LogLevel,
  LogMessageType,
  getLogNotificationHandler,
} from '@salesforce/apex-lsp-logging';

/**
 * Maps the internal LogLevel to the LogMessageType used by the notification handler.
 * @param level The internal LogLevel.
 * @returns The corresponding LogMessageType.
 */
function mapLogLevelToMessageType(level: LogLevel): LogMessageType {
  switch (level) {
    case LogLevel.Error:
      return LogMessageType.Error;
    case LogLevel.Warn:
      return LogMessageType.Warning;
    case LogLevel.Info:
      return LogMessageType.Info;
    case LogLevel.Debug: // Debug messages will be sent as 'Log' type
    default:
      return LogMessageType.Log;
  }
}

/**
 * An active logger implementation that sends log messages through the
 * configured LogNotificationHandler.
 */
class ActiveLogger implements Logger {
  /**
   * Logs a message with the specified level.
   * If an error is provided, its message is appended to the main message.
   * @param level The log level.
   * @param message The primary message to log.
   * @param error Optional error object.
   */
  public log(level: LogLevel, message: string, error?: unknown): void {
    const handler = getLogNotificationHandler();
    let fullMessage = message;

    if (error instanceof Error) {
      fullMessage += `\nError: ${error.message}`;
      if (error.stack) {
        fullMessage += `\nStack: ${error.stack}`;
      }
    } else if (error) {
      fullMessage += `\nDetails: ${String(error)}`;
    }

    if (handler && typeof handler.sendLogMessage === 'function') {
      handler.sendLogMessage({
        type: mapLogLevelToMessageType(level),
        message: fullMessage,
      });
    } else {
      const fallbackType = mapLogLevelToMessageType(level).toString();
      console.warn(
        '[ActiveLogger] LogNotificationHandler not available or invalid. ' +
          `Fallback log (${fallbackType}): ${fullMessage}`,
      );
    }
  }

  /**
   * Logs an error message.
   * @param message The message to log.
   * @param error Optional error object.
   */
  public error(message: string, error?: unknown): void {
    this.log(LogLevel.Error, message, error);
  }

  /**
   * Logs a warning message.
   * @param message The message to log.
   */
  public warn(message: string): void {
    this.log(LogLevel.Warn, message);
  }

  /**
   * Logs an info message.
   * @param message The message to log.
   */
  public info(message: string): void {
    this.log(LogLevel.Info, message);
  }

  /**
   * Logs a debug message.
   * @param message The message to log.
   */
  public debug(message: string): void {
    this.log(LogLevel.Debug, message);
  }
}

/**
 * A logger factory that creates instances of ActiveLogger.
 * This ensures that loggers obtained via getLogger() will actively send
 * messages through the configured LogNotificationHandler.
 */
export class ActiveLoggerFactory implements LoggerFactory {
  private static loggerInstance: Logger | null = null;

  /**
   * Gets a singleton instance of the ActiveLogger.
   * @returns A Logger instance.
   */
  public getLogger(): Logger {
    if (!ActiveLoggerFactory.loggerInstance) {
      ActiveLoggerFactory.loggerInstance = new ActiveLogger();
    }
    return ActiveLoggerFactory.loggerInstance;
  }
} 
