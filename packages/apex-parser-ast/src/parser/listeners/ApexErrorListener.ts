/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  ANTLRErrorListener,
  RecognitionException,
  Recognizer,
  Token,
} from 'antlr4ts';
import {
  ILLEGAL_DOUBLE_LITERAL,
  ILLEGAL_STRING_LITERAL,
  INVALID_APEX_IDENTIFIER,
  INVALID_APEX_SYMBOL,
  INVALID_DATE,
  INVALID_DATE_TIME,
  INVALID_TIME,
  MISSING_CLOSING_MARK,
  MISSING_CLOSING_QUOTE,
  MISMATCHED_SYNTAX,
  MISSING_SYNTAX,
  UNEXPECTED_EOF,
  UNEXPECTED_ERROR,
  UNEXPECTED_SYMBOL_EXPECTED_FOUND,
  UNEXPECTED_SYMBOL_NOT_SET,
  UNEXPECTED_SYMBOL_RANGE,
  UNEXPECTED_SYMBOL_SET,
  UNEXPECTED_SYNTAX_ERROR,
  UNEXPECTED_TOKEN,
  UNMATCHED_SYNTAX,
  UNRECOGNIZED_SYMBOL_NOT_VALID_APEX_IDENTIFIER,
} from '../../generated/ErrorCodes';

/**
 * Error types that can be captured during parsing and analysis
 */
export enum ErrorType {
  Syntax = 'syntax',
  Semantic = 'semantic',
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
}

/**
 * Structured error information for Apex parsing and analysis
 */
export interface ApexError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  fileUri?: string;
  source?: string;
  /** Error code from ErrorCodes (e.g. for syntax errors) */
  code?: string;
}

/**
 * Map ANTLR parser/lexer error message to ErrorCode.
 * Uses regex patterns on the message; fallback is UNEXPECTED_SYNTAX_ERROR.
 */
export function mapSyntaxErrorToCode(
  msg: string,
  _e?: RecognitionException | undefined,
): string {
  const m = msg.trim().toLowerCase();
  if (/missing closing quote|unclosed.*string/i.test(m)) {
    return MISSING_CLOSING_QUOTE;
  }
  if (/missing closing mark|unclosed.*comment|multi.line comment/i.test(m)) {
    return MISSING_CLOSING_MARK;
  }
  if (/missing\s+['""].*at\s|missing '.*' at/i.test(m)) {
    return MISSING_SYNTAX;
  }
  if (/mismatched input|expecting.*but was|expecting '.*' but was/i.test(m)) {
    return MISMATCHED_SYNTAX;
  }
  if (
    /extraneous input|extra .*at|unmatched|extra '.*'|did not expect/i.test(m)
  ) {
    return UNMATCHED_SYNTAX;
  }
  if (
    /no viable alternative|unexpected <eof>|unexpected end of file|reach.*eof/i.test(
      m,
    )
  ) {
    return UNEXPECTED_EOF;
  }
  if (
    /unexpected symbol.*was expecting|was expecting.*found|expecting.*found/i.test(
      m,
    )
  ) {
    return UNEXPECTED_SYMBOL_EXPECTED_FOUND;
  }
  if (/not expecting anything in the set|not in the set/i.test(m)) {
    return UNEXPECTED_SYMBOL_NOT_SET;
  }
  if (/expected something in the range|in the range/i.test(m)) {
    return UNEXPECTED_SYMBOL_RANGE;
  }
  if (/expecting something in the set\s*\[/i.test(m)) {
    return UNEXPECTED_SYMBOL_SET;
  }
  if (/unexpected token/i.test(m)) {
    return UNEXPECTED_TOKEN;
  }
  if (/unexpected error/i.test(m)) {
    return UNEXPECTED_ERROR;
  }
  if (/illegal string literal/i.test(m)) {
    return ILLEGAL_STRING_LITERAL;
  }
  if (/illegal double/i.test(m)) {
    return ILLEGAL_DOUBLE_LITERAL;
  }
  if (/invalid time\b/i.test(m) || /invalid time '/i.test(m)) {
    return INVALID_TIME;
  }
  if (/invalid date\b/i.test(m) || /invalid date '/i.test(m)) {
    return INVALID_DATE;
  }
  if (/invalid datetime/i.test(m) || /invalid date\.time/i.test(m)) {
    return INVALID_DATE_TIME;
  }
  if (/invalid identifier|apex identifiers must start/i.test(m)) {
    return INVALID_APEX_IDENTIFIER;
  }
  if (/punctuation symbol or operator|isn't valid in apex/i.test(m)) {
    return INVALID_APEX_SYMBOL;
  }
  if (/unrecognized symbol|not a valid apex identifier/i.test(m)) {
    return UNRECOGNIZED_SYMBOL_NOT_VALID_APEX_IDENTIFIER;
  }
  return UNEXPECTED_SYNTAX_ERROR;
}

/**
 * Custom error listener for ANTLR parser to capture errors in a structured way
 */
export class ApexErrorListener implements ANTLRErrorListener<Token> {
  private errors: ApexError[] = [];
  private fileUri: string;
  // Track seen errors to prevent duplicates from multiple parse tree walks
  private seenErrorKeys: Set<string> = new Set();

  constructor(fileUri: string) {
    this.fileUri = fileUri;
  }

  /**
   * Create a unique key for an error to detect duplicates
   * Includes all fields that uniquely identify an error:
   * - type: Distinguishes syntax vs semantic
   * - severity: Distinguishes errors vs warnings
   * - message: The error message (normalized/trimmed)
   * - line: Line number
   * - column: Column number
   * - fileUri: File path
   */
  private createErrorKey(
    type: ErrorType,
    severity: ErrorSeverity,
    message: string,
    line: number,
    column: number,
  ): string {
    // Normalize message by trimming whitespace
    const normalizedMessage = message.trim();
    return `${type}|${severity}|${normalizedMessage}|${line}|${column}|${this.fileUri}`;
  }

  /**
   * Add an error if it doesn't already exist
   * @param error The error to add
   * @returns true if the error was added, false if it was a duplicate
   */
  private addErrorIfNotDuplicate(error: ApexError): boolean {
    const key = this.createErrorKey(
      error.type,
      error.severity,
      error.message,
      error.line,
      error.column,
    );

    if (this.seenErrorKeys.has(key)) {
      return false; // Duplicate error
    }

    this.seenErrorKeys.add(key);
    this.errors.push(error);
    return true; // Error was added
  }

  /**
   * Get the file path associated with this error listener
   * @returns The file path
   */
  public getFilePath(): string {
    return this.fileUri;
  }

  /**
   * Called by ANTLR when a syntax error occurs
   */
  syntaxError<T extends Token>(
    recognizer: Recognizer<T, any>,
    offendingSymbol: T | undefined,
    line: number,
    charPositionInLine: number,
    msg: string,
    e: RecognitionException | undefined,
  ): void {
    const code = mapSyntaxErrorToCode(msg, e);
    const error: ApexError = {
      type: ErrorType.Syntax,
      severity: ErrorSeverity.Error,
      message: msg,
      line: line,
      column: charPositionInLine,
      fileUri: this.fileUri,
      source: offendingSymbol?.text,
      code,
    };
    this.addErrorIfNotDuplicate(error);
  }

  /**
   * Add a syntax error (for lexer or custom use). Lexer errors should use this
   * so they are typed as Syntax and get proper ErrorCode mapping.
   */
  addSyntaxError(
    message: string,
    line: number,
    column: number,
    endLine?: number,
    endColumn?: number,
    source?: string,
  ): void {
    const code = mapSyntaxErrorToCode(message);
    const error: ApexError = {
      type: ErrorType.Syntax,
      severity: ErrorSeverity.Error,
      message,
      line,
      column,
      endLine,
      endColumn,
      fileUri: this.fileUri,
      source,
      code,
    };
    this.addErrorIfNotDuplicate(error);
  }

  /**
   * Add a semantic error (for custom validation)
   */
  semanticError(
    message: string,
    line: number,
    column: number,
    endLine?: number,
    endColumn?: number,
    source?: string,
  ): void {
    const error: ApexError = {
      type: ErrorType.Semantic,
      severity: ErrorSeverity.Error,
      message,
      line,
      column,
      endLine,
      endColumn,
      fileUri: this.fileUri,
      source,
    };
    this.addErrorIfNotDuplicate(error);
  }

  /**
   * Add a semantic warning (for custom validation)
   */
  semanticWarning(
    message: string,
    line: number,
    column: number,
    endLine?: number,
    endColumn?: number,
    source?: string,
  ): void {
    const error: ApexError = {
      type: ErrorType.Semantic,
      severity: ErrorSeverity.Warning,
      message,
      line,
      column,
      endLine,
      endColumn,
      fileUri: this.fileUri,
      source,
    };
    this.addErrorIfNotDuplicate(error);
  }

  /**
   * Get all collected errors
   */
  getErrors(): ApexError[] {
    return this.errors;
  }

  /**
   * Get syntax errors only
   */
  getSyntaxErrors(): ApexError[] {
    return this.errors.filter((e) => e.type === ErrorType.Syntax);
  }

  /**
   * Get semantic errors only
   */
  getSemanticErrors(): ApexError[] {
    return this.errors.filter(
      (e) =>
        e.type === ErrorType.Semantic && e.severity === ErrorSeverity.Error,
    );
  }

  /**
   * Get semantic warnings only
   */
  getSemanticWarnings(): ApexError[] {
    return this.errors.filter(
      (e) =>
        e.type === ErrorType.Semantic && e.severity === ErrorSeverity.Warning,
    );
  }

  /**
   * Check if there are any errors (doesn't include warnings)
   */
  hasErrors(): boolean {
    return this.errors.some((e) => e.severity === ErrorSeverity.Error);
  }
}

/**
 * Custom error listener for ANTLR lexer to capture errors in a structured way
 */
export class ApexLexerErrorListener implements ANTLRErrorListener<number> {
  private errorListener: ApexErrorListener;

  constructor(errorListener: ApexErrorListener) {
    this.errorListener = errorListener;
  }

  /**
   * Called by ANTLR lexer when a syntax error occurs.
   * Lexer errors (e.g. unclosed string, unclosed comment) are syntax errors.
   */
  syntaxError<T extends number>(
    recognizer: Recognizer<T, any>,
    offendingSymbol: T | undefined,
    line: number,
    charPositionInLine: number,
    msg: string,
    e: RecognitionException | undefined,
  ): void {
    this.errorListener.addSyntaxError(
      msg,
      line,
      charPositionInLine,
      undefined,
      undefined,
      undefined,
    );
  }
}
