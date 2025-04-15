/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ParserRuleContext } from 'antlr4ts';

/**
 * Interface for reporting errors and warnings during semantic validation
 */
export interface ErrorReporter {
  /**
   * Add a semantic error
   */
  addError(
    message: string,
    context:
      | ParserRuleContext
      | { line: number; column: number; endLine?: number; endColumn?: number },
  ): void;

  /**
   * Add a semantic warning
   */
  addWarning(message: string, context?: ParserRuleContext): void;
}
