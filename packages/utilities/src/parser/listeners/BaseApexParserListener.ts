/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexParserListener } from '@apexdevtools/apex-parser';
import { ParserRuleContext } from 'antlr4ts';

/**
 * Base abstract class for all Apex parser listeners with typed result.
 * Extends the generated ApexParserListener with additional functionality.
 */
export abstract class BaseApexParserListener<T> implements ApexParserListener {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  enterEveryRule?(ctx: ParserRuleContext): void {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  exitEveryRule?(ctx: ParserRuleContext): void {}
  visitTerminal?(): void {}
  visitErrorNode?(): void {}
  protected warnings: string[] = [];

  /**
   * Get the result of the parsing process.
   * Implementation depends on the specific listener subclass.
   */
  abstract getResult(): T;

  /**
   * Get any warnings that occurred during parsing.
   */
  getWarnings(): string[] {
    return this.warnings;
  }

  /**
   * Add a warning message.
   * @param message The warning message
   * @param context Optional parser rule context for location information
   */
  protected addWarning(message: string, context?: ParserRuleContext): void {
    if (context) {
      const startToken = context.start;
      const line = startToken.line;
      const column = startToken.charPositionInLine;
      this.warnings.push(`Line ${line}:${column} - ${message}`);
    } else {
      this.warnings.push(message);
    }
  }

  /**
   * Create a new instance of this listener.
   * Used when processing multiple files to create a fresh listener for each file.
   * Subclasses should override this method to provide proper instantiation.
   */
  createNewInstance?(): BaseApexParserListener<T>;

  // Default empty implementations for all ApexParserListener methods
  // Subclasses should override the relevant methods for their specific needs

  enterCompilationUnit(): void {}
  exitCompilationUnit(): void {}

  enterTypeDeclaration(): void {}
  exitTypeDeclaration(): void {}

  enterModifier(): void {}
  exitModifier(): void {}

  enterClassOrInterfaceModifier(): void {}
  exitClassOrInterfaceModifier(): void {}

  // ... other methods from ApexParserListener would be defined here

  // Helper utility method for visiting/walking specific nodes as needed
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected processNode(context: ParserRuleContext, nodeName: string): void {
    // Implement common node processing logic here
    // This can be used by subclasses to standardize node handling
  }

  // Error recovery method - can be overridden by subclasses
  protected handleSyntaxError(
    message: string,
    context: ParserRuleContext,
  ): void {
    this.addWarning(`Syntax error: ${message}`, context);
  }
}
