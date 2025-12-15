/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LoggerInterface } from '@salesforce/apex-lsp-shared';
import { ISymbolManager } from '@salesforce/apex-lsp-parser-ast';

/**
 * Base interface for command handlers
 */
export interface CommandHandler {
  /**
   * The command name this handler processes
   */
  readonly commandName: string;

  /**
   * Execute the command
   * @param args Command arguments
   * @param symbolManager Symbol manager instance
   * @param logger Logger instance
   * @returns Command execution result
   */
  execute(
    args: any[],
    symbolManager: ISymbolManager,
    logger: LoggerInterface,
  ): Promise<any>;
}
