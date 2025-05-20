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
  filePath?: string;
  source?: string;
}

/**
 * Custom error listener for ANTLR parser to capture errors in a structured way
 */
export class ApexErrorListener implements ANTLRErrorListener<Token> {
  private errors: ApexError[] = [];
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /**
   * Get the file path associated with this error listener
   * @returns The file path
   */
  public getFilePath(): string {
    return this.filePath;
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
    // Add the syntax error to our collection
    this.errors.push({
      type: ErrorType.Syntax,
      severity: ErrorSeverity.Error,
      message: msg,
      line: line,
      column: charPositionInLine,
      filePath: this.filePath,
      source: offendingSymbol?.text,
    });
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
    this.errors.push({
      type: ErrorType.Semantic,
      severity: ErrorSeverity.Error,
      message,
      line,
      column,
      endLine,
      endColumn,
      filePath: this.filePath,
      source,
    });
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
    this.errors.push({
      type: ErrorType.Semantic,
      severity: ErrorSeverity.Warning,
      message,
      line,
      column,
      endLine,
      endColumn,
      filePath: this.filePath,
      source,
    });
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
   * Called by ANTLR lexer when a syntax error occurs
   */
  syntaxError<T extends number>(
    recognizer: Recognizer<T, any>,
    offendingSymbol: T | undefined,
    line: number,
    charPositionInLine: number,
    msg: string,
    
    e: RecognitionException | undefined,
  ): void {
    // Delegate to the parser error listener
    this.errorListener.semanticError(
      msg,
      line,
      charPositionInLine,
      undefined,
      undefined,
      undefined,
    );
  }
}
