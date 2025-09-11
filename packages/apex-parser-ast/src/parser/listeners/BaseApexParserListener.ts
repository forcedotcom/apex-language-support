/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexParserListener } from '@apexdevtools/apex-parser';
import { ParserRuleContext } from 'antlr4ts';
import { ErrorNode } from 'antlr4ts/tree';

import { ApexErrorListener } from './ApexErrorListener';

/**
 * Base abstract class for all Apex parser listeners with typed result.
 * Extends the generated ApexParserListener with additional functionality.
 * @template T The type of result that will be produced by the listener
 */
export abstract class BaseApexParserListener<T> implements ApexParserListener {
  enterEveryRule?(ctx: ParserRuleContext): void {}

  exitEveryRule?(ctx: ParserRuleContext): void {}
  visitTerminal?(): void {}
  visitErrorNode?(node: ErrorNode): void {
    if (this.errorListener) {
      // Extract location information from the error node
      const token = node.symbol;
      this.errorListener.semanticError(
        `Invalid syntax: ${token.text}`,
        token.line,
        token.charPositionInLine,
      );
    }
  }
  protected warnings: string[] = [];
  protected errorListener: ApexErrorListener | null = null;
  /** The namespace of the current project, used for FQN calculation */
  protected projectNamespace?: string;

  /**
   * Set the error listener for this parser listener.
   * @param errorListener The error listener to use for reporting errors
   */
  setErrorListener(errorListener: ApexErrorListener): void {
    this.errorListener = errorListener;
  }

  /**
   * Get the error listener for this parser listener
   */
  getErrorListener(): ApexErrorListener | null {
    return this.errorListener;
  }

  /**
   * Set the project namespace for this parser listener.
   * Used for calculating fully qualified names.
   * @param namespace The namespace to set
   */
  setProjectNamespace(namespace: string): void {
    this.projectNamespace = namespace;
  }

  /**
   * Set the current file path for this parser listener.
   * Used for symbol creation and FQN calculation.
   * @param filePath The file path to set
   */
  setCurrentFilePath(filePath: string): void {
    // This is a no-op in the base class, but subclasses can override
    // to store the file path for symbol creation
  }

  /**
   * Get the project namespace for this parser listener
   */
  getProjectNamespace(): string | undefined {
    return this.projectNamespace;
  }

  /**
   * Get the result of the parsing process.
   * Implementation depends on the specific listener subclass.
   * @returns The result of type T
   */
  abstract getResult(): T;

  /**
   * Get any warnings that occurred during parsing.
   * @returns Array of warning messages
   */
  getWarnings(): string[] {
    return this.warnings;
  }

  /**
   * Add a warning message to the list of warnings
   */
  protected addWarning(message: string, context?: ParserRuleContext): void {
    let warningMessage = message;

    if (context) {
      warningMessage += ` at line ${context.start.line}:${context.start.charPositionInLine}`;

      // Also add to error listener if available
      if (this.errorListener) {
        this.errorListener.semanticWarning(
          message,
          context.start.line,
          context.start.charPositionInLine,
          context.stop?.line,
          context.stop?.charPositionInLine,
        );
      }
    }

    this.warnings.push(warningMessage);
  }

  /**
   * Add a semantic error through the error listener
   */
  protected addError(
    message: string,
    context:
      | ParserRuleContext
      | { line: number; column: number; endLine?: number; endColumn?: number },
  ): void {
    if (!this.errorListener) return;

    if (context instanceof ParserRuleContext) {
      this.errorListener.semanticError(
        message,
        context.start.line,
        context.start.charPositionInLine,
        context.stop?.line,
        context.stop?.charPositionInLine,
      );
    } else {
      this.errorListener.semanticError(
        message,
        context.line,
        context.column,
        context.endLine,
        context.endColumn,
      );
    }
  }

  /**
   * Create a new instance of this listener.
   * Used when processing multiple files to create a fresh listener for each file.
   * Subclasses should override this method to provide proper instantiation.
   * @returns A new instance of the listener
   */
  createNewInstance?(): BaseApexParserListener<T>;

  // Helper utility method for visiting/walking specific nodes as needed
  protected processNode(context: ParserRuleContext, nodeName: string): void {
    // Implement common node processing logic here
    // This can be used by subclasses to standardize node handling
  }

  // Error recovery method - can be overridden by subclasses
  protected handleSyntaxError(
    message: string,
    context: ParserRuleContext,
  ): void {
    /** no-op */
  }
}
