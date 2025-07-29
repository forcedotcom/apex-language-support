/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { baselineCollector } from './baseline-measurement';
import { saveBaselineStats } from './language-server';
import { enableBaselineTesting, disableBaselineTesting } from './commands';

export interface BaselineTestConfig {
  numberOfTests: number;
  delayBetweenTests: number; // milliseconds
  saveAfterEachTest: boolean;
}

export class BaselineTestRunner {
  private isRunning = false;
  private context?: vscode.ExtensionContext;

  /**
   * Runs baseline performance tests
   */
  async runBaselineTests(config: BaselineTestConfig): Promise<void> {
    if (this.isRunning) {
      vscode.window.showWarningMessage('Baseline tests are already running');
      return;
    }

    this.isRunning = true;

    try {
      // Enable baseline testing mode (disables restart cooldown)
      enableBaselineTesting();

      // Check if extension is active
      console.log('[BASELINE TEST] Checking if Apex extension is active...');
      const allCommands = await vscode.commands.getCommands();
      const apexCommands = allCommands.filter((cmd) => cmd.startsWith('apex.'));
      console.log('[BASELINE TEST] Available Apex commands:', apexCommands);

      // Clear previous results
      baselineCollector.clear();

      vscode.window.showInformationMessage(
        `Starting baseline performance tests: ${config.numberOfTests} restart operations`,
      );

      for (let i = 1; i <= config.numberOfTests; i++) {
        console.log(
          `[BASELINE TEST] Running test ${i}/${config.numberOfTests}`,
        );

        try {
          // Execute restart command and wait for completion
          console.log('[BASELINE TEST] Executing restart command...');
          const restartCommandExists = apexCommands.includes(
            'apex-ls-ts.restart.server',
          );
          console.log(
            '[BASELINE TEST] Restart command exists:',
            restartCommandExists,
          );
          await vscode.commands.executeCommand('apex-ls-ts.restart.server');

          // Wait a bit longer for the restart to fully complete and be measured
          console.log('[BASELINE TEST] Waiting for restart to complete...');
          await this.delay(1000); // Extra 1 second for restart to complete

          if (config.saveAfterEachTest) {
            console.log('[BASELINE TEST] Saving intermediate stats...');
            const context = this.getContext();
            if (context) {
              await saveBaselineStats(context);
            }
          }

          // Wait between tests (except for the last one)
          if (i < config.numberOfTests) {
            console.log(
              `[BASELINE TEST] Waiting ${config.delayBetweenTests}ms before next test...`,
            );
            await this.delay(config.delayBetweenTests);
          }
        } catch (error) {
          console.error(`[BASELINE TEST] Test ${i} failed:`, error);
          // Continue with remaining tests
        }
      }

      // Save final results
      const context = this.getContext();
      if (context) {
        await saveBaselineStats(context);
      }

      const stats = baselineCollector.generateStats();
      console.log('[BASELINE TEST] Final stats:', stats);
      vscode.window.showInformationMessage(
        `Baseline tests completed! ${stats.totalSamples} samples, ` +
          `${stats.averageDuration}ms average, ${stats.successRate}% success rate`,
      );
    } finally {
      // Disable baseline testing mode (re-enable cooldown)
      disableBaselineTesting();
      this.isRunning = false;
    }
  }

  /**
   * Creates a delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Sets the extension context for saving stats
   */
  setContext(context: vscode.ExtensionContext): void {
    this.context = context;
  }

  /**
   * Gets the extension context
   */
  private getContext(): vscode.ExtensionContext | undefined {
    return this.context;
  }

  /**
   * Checks if tests are currently running
   */
  isTestRunning(): boolean {
    return this.isRunning;
  }
}

// Global test runner instance
export const baselineTestRunner = new BaselineTestRunner();

/**
 * Register baseline testing commands
 */
export const registerBaselineTestCommands = (
  context: vscode.ExtensionContext,
): void => {
  // Set context in test runner
  baselineTestRunner.setContext(context);

  // Quick test command (5 restarts)
  const quickTestCommand = vscode.commands.registerCommand(
    'apex.baseline.quickTest',
    async () => {
      await baselineTestRunner.runBaselineTests({
        numberOfTests: 5,
        delayBetweenTests: 2000, // 2 seconds between tests
        saveAfterEachTest: false,
      });
      await saveBaselineStats(context);
    },
  );

  // Full test command (15 restarts)
  const fullTestCommand = vscode.commands.registerCommand(
    'apex.baseline.fullTest',
    async () => {
      await baselineTestRunner.runBaselineTests({
        numberOfTests: 15,
        delayBetweenTests: 3000, // 3 seconds between tests
        saveAfterEachTest: false,
      });
      await saveBaselineStats(context);
    },
  );

  // Save stats command
  const saveStatsCommand = vscode.commands.registerCommand(
    'apex.baseline.saveStats',
    async () => {
      await saveBaselineStats(context);
      vscode.window.showInformationMessage(
        'Baseline stats saved to baselineStats.json',
      );
    },
  );

  // Clear stats command
  const clearStatsCommand = vscode.commands.registerCommand(
    'apex.baseline.clearStats',
    () => {
      baselineCollector.clear();
      vscode.window.showInformationMessage('Baseline stats cleared');
    },
  );

  context.subscriptions.push(
    quickTestCommand,
    fullTestCommand,
    saveStatsCommand,
    clearStatsCommand,
  );
};
