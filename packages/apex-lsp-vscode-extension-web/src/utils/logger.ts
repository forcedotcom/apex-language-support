/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';

/**
 * Enhanced logger for the Apex Language Server extension
 */
export class ExtensionLogger {
  private outputChannel: vscode.OutputChannel;
  private isDebugMode: boolean;

  constructor(channelName: string, debugMode = false) {
    this.outputChannel = vscode.window.createOutputChannel(channelName);
    this.isDebugMode = debugMode;
  }

  /**
   * Shows the output channel
   */
  show(): void {
    this.outputChannel.show();
  }

  /**
   * Logs a section header
   */
  section(title: string): void {
    this.outputChannel.appendLine('═'.repeat(50));
    this.outputChannel.appendLine(`🚀 ${title}`);
    this.outputChannel.appendLine('═'.repeat(50));
  }

  /**
   * Logs a subsection header
   */
  subsection(title: string): void {
    this.outputChannel.appendLine('─'.repeat(40));
    this.outputChannel.appendLine(`🔄 ${title}`);
    this.outputChannel.appendLine('─'.repeat(40));
  }

  /**
   * Logs an info message
   */
  info(message: string): void {
    this.outputChannel.appendLine(`ℹ️  ${message}`);
  }

  /**
   * Logs a success message
   */
  success(message: string): void {
    this.outputChannel.appendLine(`✅ ${message}`);
  }

  /**
   * Logs a warning message
   */
  warn(message: string): void {
    this.outputChannel.appendLine(`⚠️  ${message}`);
  }

  /**
   * Logs an error message
   */
  error(message: string, error?: Error): void {
    this.outputChannel.appendLine(`❌ ${message}`);
    if (error && this.isDebugMode) {
      this.outputChannel.appendLine(`   Error: ${error.message}`);
      this.outputChannel.appendLine(
        `   Stack: ${error.stack || 'No stack trace'}`,
      );
    }
  }

  /**
   * Logs a debug message (only in debug mode)
   */
  debug(message: string): void {
    if (this.isDebugMode) {
      this.outputChannel.appendLine(`🔍 ${message}`);
    }
  }

  /**
   * Logs step information
   */
  step(stepNumber: number, message: string): void {
    this.outputChannel.appendLine(`${stepNumber}️⃣ ${message}`);
  }

  /**
   * Logs LSP-related messages
   */
  lsp(level: 'error' | 'warn' | 'info' | 'log', message: string): void {
    this.outputChannel.appendLine(`[LSP-${level.toUpperCase()}] ${message}`);
  }

  /**
   * Gets the underlying output channel
   */
  getOutputChannel(): vscode.OutputChannel {
    return this.outputChannel;
  }
}
