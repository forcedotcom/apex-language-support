/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ExecuteCommandParams } from 'vscode-languageserver';
import {
  LoggerInterface,
  FindApexTestsResult,
} from '@salesforce/apex-lsp-shared';
import {
  ApexSymbolProcessingManager,
  ISymbolManager,
} from '@salesforce/apex-lsp-parser-ast';
import { CommandHandler } from './commands/CommandHandler';
import { FindApexTestsCommandHandler } from './commands/FindApexTestsCommandHandler';

// Re-export for backward compatibility
export type { FindApexTestsResult };

/**
 * Interface for execute command processing functionality
 */
export interface IExecuteCommandProcessor {
  /**
   * Process an execute command request
   * @param params The execute command parameters
   * @returns The result of the command execution
   */
  processExecuteCommand(params: ExecuteCommandParams): Promise<any>;
}

/**
 * Service for processing execute command requests
 */
export class ExecuteCommandProcessingService
  implements IExecuteCommandProcessor
{
  private readonly logger: LoggerInterface;
  private readonly symbolManager: ISymbolManager;
  private readonly commandHandlers: Map<string, CommandHandler>;

  constructor(logger: LoggerInterface, symbolManager?: ISymbolManager) {
    this.logger = logger;
    this.symbolManager =
      symbolManager ||
      ApexSymbolProcessingManager.getInstance().getSymbolManager();

    // Initialize command registry
    this.commandHandlers = new Map<string, CommandHandler>();

    // Register all command handlers
    this.registerCommandHandlers();
  }

  /**
   * Register all available command handlers
   */
  private registerCommandHandlers(): void {
    // Register findApexTests command
    const findApexTestsHandler = new FindApexTestsCommandHandler();
    this.commandHandlers.set(
      findApexTestsHandler.commandName,
      findApexTestsHandler,
    );

    // Add new command handlers here as they are implemented
    // Example:
    // const newCommandHandler = new NewCommandHandler();
    // this.commandHandlers.set(newCommandHandler.commandName, newCommandHandler);
  }

  /**
   * Process an execute command request
   * @param params The execute command parameters
   * @returns The result of the command execution
   */
  public async processExecuteCommand(
    params: ExecuteCommandParams,
  ): Promise<any> {
    this.logger.debug(() => `Processing execute command: ${params.command}`);

    try {
      // Find the command handler
      const handler = this.commandHandlers.get(params.command);

      if (!handler) {
        this.logger.warn(() => `Unknown command: ${params.command}`);
        throw new Error(`Unknown command: ${params.command}`);
      }

      // Execute the command
      return await handler.execute(
        params.arguments || [],
        this.symbolManager,
        this.logger,
      );
    } catch (error) {
      this.logger.error(
        () => `Error processing execute command ${params.command}: ${error}`,
      );
      throw error;
    }
  }
}
