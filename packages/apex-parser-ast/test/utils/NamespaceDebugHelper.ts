/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { setLoggerFactory } from '@salesforce/apex-lsp-shared';
import { DebugLogger, DebugLoggerFactory } from './DebugLogger';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { CompilationOptions } from '../../src/parser/compilerService';

/**
 * Helper class for debugging namespace resolution issues
 */
export class NamespaceDebugHelper {
  private debugLogger: DebugLogger;
  private compilerService: CompilerService;

  constructor() {
    this.debugLogger = DebugLoggerFactory.getLogger();
    this.compilerService = new CompilerService();

    // Set the debug logger as the global logger
    setLoggerFactory({
      getLogger: () => this.debugLogger,
    });
  }

  /**
   * Compile source code with debug logging enabled
   */
  public compileWithDebug(
    sourceCode: string,
    fileName: string = 'debug.cls',
    options: CompilationOptions = {},
  ) {
    // Clear previous captured messages
    this.debugLogger.clear();

    console.log(`\n=== Compiling ${fileName} with debug logging ===`);
    console.log('Source code:');
    console.log(sourceCode);
    console.log('Options:', options);

    const listener = new ApexSymbolCollectorListener();
    const result = this.compilerService.compile(
      sourceCode,
      fileName,
      listener,
      options,
    );

    console.log('\n=== Compilation Result ===');
    console.log('Errors:', result.errors.length);
    result.errors.forEach((error) => {
      console.log(
        `  ${error.type}: ${error.message} at ${error.line}:${error.column}`,
      );
    });

    console.log('Warnings:', result.warnings.length);
    result.warnings.forEach((warning) => {
      console.log(`  ${warning}`);
    });

    const symbolTable = listener.getResult();
    const symbols = symbolTable.getAllSymbols();

    console.log('\n=== Symbols Found ===');
    symbols.forEach((symbol) => {
      console.log(
        `  ${symbol.kind}: ${symbol.name} (namespace: ${symbol.namespace?.toString() || 'null'}, fqn: ${symbol.fqn || 'undefined'})`,
      );
    });

    console.log('\n=== Captured Log Messages ===');
    this.debugLogger.printCapturedMessages();

    return {
      result,
      symbols,
      debugMessages: this.debugLogger.getCapturedMessages(),
      debugLogger: this.debugLogger,
    };
  }

  /**
   * Analyze method name extraction specifically
   */
  public analyzeMethodNameExtraction(sourceCode: string) {
    console.log('\n=== Analyzing Method Name Extraction ===');

    const { debugMessages, symbols } = this.compileWithDebug(sourceCode);

    // Look for method-related debug messages
    const methodMessages = debugMessages.filter(
      (msg) =>
        msg.message.toLowerCase().includes('method') ||
        msg.message.toLowerCase().includes('enter') ||
        msg.message.toLowerCase().includes('id'),
    );

    console.log('\n=== Method-Related Debug Messages ===');
    methodMessages.forEach((msg) => {
      console.log(`[${msg.type.toUpperCase()}] ${msg.message}`);
    });

    // Look for method symbols
    const methodSymbols = symbols.filter((s) => s.kind === 'method');
    console.log('\n=== Method Symbols ===');
    methodSymbols.forEach((symbol) => {
      console.log(
        `  Method: "${symbol.name}" (namespace: ${symbol.namespace?.toString() || 'null'}, fqn: ${symbol.fqn || 'undefined'})`,
      );
    });

    return {
      methodMessages,
      methodSymbols,
      allSymbols: symbols,
    };
  }

  /**
   * Reset the debug logger
   */
  public reset(): void {
    DebugLoggerFactory.reset();
    this.debugLogger = DebugLoggerFactory.getLogger();
  }

  /**
   * Get debug messages by keyword
   */
  public getMessagesByKeyword(keyword: string): string[] {
    return this.debugLogger
      .getCapturedMessages()
      .filter((msg) =>
        msg.message.toLowerCase().includes(keyword.toLowerCase()),
      )
      .map((msg) => msg.message);
  }
}
