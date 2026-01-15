/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

export * from './notification';
export * from './types';
export * from './storage/StorageInterface';
export * from './utils/CorrelatedMessage';
export * from './utils/Environment';
export * from './utils/BrowserUtils';
export * from './utils/ErrorUtils';
export * from './utils/Logging';
export * from './factories/ConnectionFactory';
export * from './communication/Interfaces';
export * from './server/ApexLanguageServerSettings';
export {
  setLogNotificationHandler,
  getLogNotificationHandler,
} from './notification';
export type {
  LogMessageType,
  LogMessageParams,
  LogNotificationHandler,
} from './notification';
import { LogMessageType } from './notification';

// Export enum utilities
export * from './enumUtils';

// Export optimized enum utilities for memory efficiency (excluding duplicates)
export {
  defineOptimizedEnum,
  getOptimizedEnumKeys,
  getOptimizedEnumValues,
  getOptimizedEnumEntries,
  isValidOptimizedEnumKey,
  isValidOptimizedEnumValue,
  calculateOptimizedEnumSavings,
  compareEnumMemoryUsage,
} from './optimizedEnumUtils';

// Export logger functionality
export * from './logger';

// Explicitly export commonly used functions
export {
  defineEnum,
  isValidEnumKey,
  isValidEnumValue,
  getEnumKeys,
  getEnumValues,
  getEnumEntries,
} from './enumUtils';

// Export smaller numeric types for memory optimization
export * from './smallNumericTypes';

// Export capabilities management
export * from './capabilities/ApexCapabilitiesManager';
export * from './capabilities/ApexLanguageServerCapabilities';

// Export settings management
export * from './settings/ApexSettingsUtilities';
export * from './settings/ApexSettingsManager';
export * from './settings/LSPConfigurationManager';

// Export client capabilities
export * from './client/ApexClientCapabilities';

// Export priority types
export * from './types/priority';

// Export document selector utilities
export * from './document/DocumentSelectorUtils';

// Experimental protocol: Missing Artifact Resolution
export type RequestKind =
  | 'definition'
  | 'typeDefinition'
  | 'implementation'
  | 'hover'
  | 'references'
  | 'completion'
  | 'signatureHelp';

// ReferenceContext enum values for type-safe context checking
export enum ReferenceContext {
  METHOD_CALL = 0,
  CLASS_REFERENCE = 1,
  TYPE_DECLARATION = 2,
  FIELD_ACCESS = 3,
  CONSTRUCTOR_CALL = 4,
  VARIABLE_USAGE = 5,
  PARAMETER_TYPE = 6,
  VARIABLE_DECLARATION = 7,
}

// Enhanced search hints for client-side artifact resolution
export interface SearchHint {
  readonly searchPatterns: string[];
  readonly priority: 'exact' | 'high' | 'medium' | 'low';
  readonly reasoning: string;
  readonly expectedFileType: 'class' | 'trigger';
  readonly namespace?: string;
  readonly fallbackPatterns?: string[];
  readonly confidence: number; // 0.0 to 1.0
}

// TypeReference from apex-parser-ast (avoiding import to keep shared package lightweight)
export interface TypeReference {
  readonly name: string;
  readonly location: {
    readonly symbolRange: {
      readonly startLine: number;
      readonly startColumn: number;
      readonly endLine: number;
      readonly endColumn: number;
    };
    readonly identifierRange: {
      readonly startLine: number;
      readonly startColumn: number;
      readonly endLine: number;
      readonly endColumn: number;
    };
  };
  readonly context: string | number; // ReferenceContext enum value
  readonly qualifier?: string;
  readonly qualifierLocation?: {
    readonly symbolRange: {
      readonly startLine: number;
      readonly startColumn: number;
      readonly endLine: number;
      readonly endColumn: number;
    };
    readonly identifierRange: {
      readonly startLine: number;
      readonly startColumn: number;
      readonly endLine: number;
      readonly endColumn: number;
    };
  };
  readonly memberLocation?: {
    readonly symbolRange: {
      readonly startLine: number;
      readonly startColumn: number;
      readonly endLine: number;
      readonly endColumn: number;
    };
    readonly identifierRange: {
      readonly startLine: number;
      readonly startColumn: number;
      readonly endLine: number;
      readonly endColumn: number;
    };
  };
  readonly parentContext?: string;
  readonly isResolved?: boolean;
  readonly access?: 'read' | 'write' | 'readwrite';
}

export interface FindMissingArtifactParams {
  readonly identifier: string;
  readonly origin: {
    readonly uri: string;
    readonly position?: { line: number; character: number };
    readonly requestKind: RequestKind;
  };
  readonly mode: 'blocking' | 'background';
  readonly maxCandidates?: number;
  readonly maxCandidatesToOpen?: number;
  readonly timeoutMsHint?: number;
  readonly workDoneToken?: unknown;
  readonly correlationId?: string;
  // Simply pass the TypeReference object directly - much cleaner!
  readonly typeReference?: TypeReference;
  // Enhanced parent context - full parent symbol data when available
  readonly parentContext?: {
    readonly containingType?: any; // ApexSymbol of immediate containing type (class/interface/enum)
    readonly ancestorChain?: any[]; // Array of ApexSymbol ancestors from top-level to closest parent
    readonly parentSymbol?: any; // Direct parent ApexSymbol if available
    readonly contextualHierarchy?: string; // Human-readable hierarchy like "MyClass.MyMethod.localVar"
  };
  // New: Pre-resolved search hints from LSP services
  readonly searchHints?: SearchHint[];
  // New: Resolved qualifier information
  readonly resolvedQualifier?: {
    readonly type: 'class' | 'interface' | 'enum' | 'variable' | 'unknown';
    readonly name: string;
    readonly namespace?: string;
    readonly isStatic: boolean;
    readonly filePath?: string; // If already known
  };
}

export type FindMissingArtifactResult =
  | { opened: string[] }
  | { notFound: true }
  | { accepted: true };

/**
 * Result type for findApexTests command
 */
export interface FindApexTestsResult {
  testClasses: Array<{
    class: {
      name: string;
      fileUri: string;
      location: {
        uri: string;
        range: {
          start: { line: number; character: number };
          end: { line: number; character: number };
        };
      };
    };
    methods: Array<{
      name: string;
      location: {
        uri: string;
        range: {
          start: { line: number; character: number };
          end: { line: number; character: number };
        };
      };
    }>;
  }>;
}

export type ProgressToken = number | string;

/**
 * @deprecated Use RequestWorkspaceLoadParams and notification-based pattern instead
 */
export interface LoadWorkspaceParams {
  readonly workDoneToken?: ProgressToken;
  readonly queryOnly?: boolean; // NEW: Query state without triggering load
}

/**
 * @deprecated Use WorkspaceLoadCompleteParams notification instead
 */
export type LoadWorkspaceResult =
  | {
      accepted: true;
      alreadyLoaded?: boolean;
      inProgress?: boolean;
      retryable?: boolean;
    }
  | { loaded: true } // NEW: For queryOnly responses
  | { loading: true } // NEW: For queryOnly responses
  | { failed: true } // NEW: For queryOnly responses
  | { loaded: false } // NEW: For queryOnly responses when not loaded and not loading
  | { error: string };

/**
 * Parameters for server-to-client workspace load request notification
 */
export interface RequestWorkspaceLoadParams {
  readonly workDoneToken?: ProgressToken;
}

/**
 * Parameters for client-to-server workspace load completion notification
 */
export interface WorkspaceLoadCompleteParams {
  readonly success: boolean;
  readonly error?: string;
}

/**
 * File metadata for workspace batch loading
 */
export interface WorkspaceFileMetadata {
  readonly uri: string;
  readonly version: number;
}

/**
 * Workspace file batch containing files and metadata
 */
export interface WorkspaceFileBatch {
  readonly batchIndex: number;
  readonly totalBatches: number;
  readonly isLastBatch: boolean;
  readonly fileMetadata: readonly WorkspaceFileMetadata[];
  readonly files: Array<{
    readonly uri: string;
    readonly version: number;
    readonly content: string;
  }>;
}

/**
 * Parameters for client-to-server workspace batch request
 */
export interface SendWorkspaceBatchParams {
  readonly batchIndex: number;
  readonly totalBatches: number;
  readonly isLastBatch: boolean;
  readonly compressedData: string; // Base64-encoded ZIP file
  readonly fileMetadata: readonly WorkspaceFileMetadata[];
}

/**
 * Result for server-to-client workspace batch response
 */
export interface SendWorkspaceBatchResult {
  readonly success: boolean;
  readonly enqueuedCount: number;
  readonly stored?: boolean; // Indicates batch was stored (not processed yet)
  readonly receivedCount?: number; // Number of batches received so far
  readonly totalBatches?: number; // Total batches expected
  readonly error?: string;
}

/**
 * Parameters for processing stored workspace batches
 */
export interface ProcessWorkspaceBatchesParams {
  readonly totalBatches: number;
}

/**
 * Result for processing workspace batches request
 */
export interface ProcessWorkspaceBatchesResult {
  readonly success: boolean;
  readonly error?: string;
}

/**
 * LSP Work Done Progress interfaces
 */
export interface WorkDoneProgressBegin {
  kind: 'begin';
  title: string;
  cancellable?: boolean;
  message?: string;
  percentage?: number;
}

export interface WorkDoneProgressReport {
  kind: 'report';
  cancellable?: boolean;
  message?: string;
  percentage?: number;
}

export interface WorkDoneProgressEnd {
  kind: 'end';
  message?: string;
}

export type WorkDoneProgress =
  | WorkDoneProgressBegin
  | WorkDoneProgressReport
  | WorkDoneProgressEnd;
/**
 * Priority mapping for log levels (higher number = higher priority)
 */
const LOG_LEVEL_PRIORITY: Record<LogMessageType, number> = {
  error: 5,
  warning: 4,
  info: 3,
  log: 2,
  debug: 1,
};

/**
 * Convert string log level to LogMessageType
 * @param level String representation of log level
 * @returns LogMessageType string value
 */
const stringToLogLevel = (level: string): LogMessageType => {
  switch (level.toLowerCase()) {
    case 'error':
      return 'error';
    case 'warn':
    case 'warning':
      return 'warning';
    case 'info':
      return 'info';
    case 'log':
      return 'log';
    case 'debug':
      return 'debug';
    default:
      return 'info'; // Default to info
  }
};

/**
 * Convert LogMessageType to LogLevel
 * @param messageType The log message type
 * @returns Corresponding log level
 */
export const messageTypeToLogLevel = (
  messageType: LogMessageType,
): LogMessageType => messageType;

// Global log level setting
let currentLogLevel: LogMessageType = 'error';

/**
 * Set the global log level
 * @param level The log level to set
 */
export const setLogLevel = (level: LogMessageType | string): void => {
  currentLogLevel = typeof level === 'string' ? stringToLogLevel(level) : level;
};

/**
 * Get the current global log level
 * @returns The current log level
 */
export const getLogLevel = (): LogMessageType => currentLogLevel;

/**
 * Check if a message type should be logged based on current log level
 * @param messageType The message type to check
 * @returns True if the message should be logged
 */
export const shouldLog = (messageType: LogMessageType): boolean => {
  const messagePriority =
    LOG_LEVEL_PRIORITY[messageType] || LOG_LEVEL_PRIORITY.log;
  const currentPriority = LOG_LEVEL_PRIORITY[currentLogLevel];
  return messagePriority >= currentPriority;
};

/**
 * Interface for the logger implementation
 * Aligned with LSP window/logMessage structure while providing convenience methods
 */
export interface LoggerInterface {
  /**
   * Log a message with the specified type
   * @param messageType - The LSP message type (Error, Warning, Info, Log, Debug)
   * @param message - The message to log
   */
  log(messageType: LogMessageType, message: string): void;

  /**
   * Log a message with lazy evaluation
   * @param messageType - The LSP message type (Error, Warning, Info, Log, Debug)
   * @param messageProvider - Function that returns the message to log
   */
  log(messageType: LogMessageType, messageProvider: () => string): void;

  /**
   * Log a debug message
   * @param message - The message to log
   */
  debug(message: string): void;

  /**
   * Log a debug message with lazy evaluation
   * @param messageProvider - Function that returns the message to log
   */
  debug(messageProvider: () => string): void;

  /**
   * Log an info message
   * @param message - The message to log
   */
  info(message: string): void;

  /**
   * Log an info message with lazy evaluation
   * @param messageProvider - Function that returns the message to log
   */
  info(messageProvider: () => string): void;

  /**
   * Log a warning message
   * @param message - The message to log
   */
  warn(message: string): void;

  /**
   * Log a warning message with lazy evaluation
   * @param messageProvider - Function that returns the message to log
   */
  warn(messageProvider: () => string): void;

  /**
   * Log an error message
   * @param message - The message to log
   */
  error(message: string): void;

  /**
   * Log an error message with lazy evaluation
   * @param messageProvider - Function that returns the message to log
   */
  error(messageProvider: () => string): void;

  /**
   * Start a performance timer
   * @param label The label for the timer
   */
  time?(label: string): void;

  /**
   * End a performance timer and log the duration
   * @param label The label for the timer
   */
  timeEnd?(label: string): void;
}

/**
 * Interface for the logger factory
 */
export interface LoggerFactory {
  /**
   * Get a logger instance
   * @returns A logger instance
   */
  getLogger(): LoggerInterface;
}

// Default no-op logger implementation
class NoOpLogger implements LoggerInterface {
  public log(
    messageType: LogMessageType,
    message: string | (() => string),
  ): void {
    // No-op implementation - does nothing
  }

  public debug(message: string | (() => string)): void {
    // No-op implementation - does nothing
  }

  public info(message: string | (() => string)): void {
    // No-op implementation - does nothing
  }

  public warn(message: string | (() => string)): void {
    // No-op implementation - does nothing
  }

  public error(message: string | (() => string)): void {
    // No-op implementation - does nothing
  }
}

// Default no-op logger factory
class NoOpLoggerFactory implements LoggerFactory {
  private static instance: LoggerInterface = new NoOpLogger();

  public getLogger(): LoggerInterface {
    return NoOpLoggerFactory.instance;
  }
}

// Console logger implementation for standalone usage
class ConsoleLogger implements LoggerInterface {
  private getMessageTypeString(messageType: LogMessageType): string {
    switch (messageType) {
      case 'error':
        return 'ERROR';
      case 'warning':
        return 'WARN';
      case 'info':
        return 'INFO';
      case 'log':
        return 'LOG';
      case 'debug':
        return 'DEBUG';
      default:
        return 'UNKNOWN';
    }
  }

  public log(
    messageType: LogMessageType,
    message: string | (() => string),
  ): void {
    if (!shouldLog(messageType)) {
      return;
    }
    const msg = typeof message === 'function' ? message() : message;
    const timestamp = new Date().toISOString();
    const typeString = this.getMessageTypeString(messageType);
    const formatted = `[${timestamp}] [${typeString}] ${msg}`;
    switch (messageType) {
      case 'error':
        console.error(formatted);
        break;
      case 'warning':
        console.warn(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'log':
        console.log(formatted);
        break;
      case 'debug':
        console.debug(formatted);
        break;
      default:
        console.log(formatted);
        break;
    }
  }

  public debug(message: string | (() => string)): void {
    this.log('debug', message);
  }

  public info(message: string | (() => string)): void {
    this.log('info', message);
  }

  public warn(message: string | (() => string)): void {
    this.log('warning', message);
  }

  public error(message: string | (() => string)): void {
    this.log('error', message);
  }
}

// Console logger factory for standalone usage
class ConsoleLoggerFactory implements LoggerFactory {
  private static instance: LoggerInterface = new ConsoleLogger();
  public getLogger(): LoggerInterface {
    return ConsoleLoggerFactory.instance;
  }
}

// Global logger factory instance
let loggerFactory: LoggerFactory = new NoOpLoggerFactory();

/**
 * Set the logger factory
 * @param factory The logger factory to use
 */
export const setLoggerFactory = (factory: LoggerFactory): void => {
  loggerFactory = factory;
};

/**
 * Get the current logger instance
 * @returns The current logger instance
 */
export const getLogger = (): LoggerInterface => loggerFactory.getLogger();

/**
 * Enable console logging with timestamps
 */
export const enableConsoleLogging = (): void => {
  setLoggerFactory(new ConsoleLoggerFactory());
};

/**
 * Disable all logging (set to no-op logger)
 */
export const disableLogging = (): void => {
  setLoggerFactory(new NoOpLoggerFactory());
};
