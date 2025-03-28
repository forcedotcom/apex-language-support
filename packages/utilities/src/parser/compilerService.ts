/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CharStreams, CommonTokenStream } from 'antlr4ts';
import {
  ApexLexer,
  ApexParser,
  CompilationUnitContext,
  ParseTreeWalker,
} from '@apexdevtools/apex-parser';

import { BaseApexParserListener } from './listeners/BaseApexParserListener.js';

/**
 * Result of a compilation process, containing any errors, warnings, and the final result.
 */
export interface CompilationResult<T> {
  fileName: string;
  result: T | null;
  errors: Error[];
  warnings: string[];
}

/**
 * Service for parsing and compiling Apex code.
 */
export class CompilerService {
  /**
   * Parse and compile a single Apex file.
   * @param fileContent The content of the Apex file to parse
   * @param fileName Optional filename for error reporting
   * @param listener The listener to use during parsing
   * @returns CompilationResult with the parsed result or errors
   */
  public compile<T>(
    fileContent: string,
    fileName: string = 'unknown.cls',
    listener: BaseApexParserListener<T>,
  ): CompilationResult<T> {
    try {
      const compilationUnitContext = this.getCompilationUnit(fileContent);
      const walker = new ParseTreeWalker();
      walker.walk(listener, compilationUnitContext);

      // Return the result from the listener
      return {
        fileName,
        result: listener.getResult(),
        errors: [],
        warnings: [],
      };
    } catch (error) {
      // Handle any errors during parsing
      return {
        fileName,
        result: null,
        errors: [error instanceof Error ? error : new Error(String(error))],
        warnings: [],
      };
    }
  }

  /**
   * Parse and compile multiple Apex files.
   * @param files An array of file objects containing content and name
   * @param listener The listener to use during parsing
   * @returns Array of CompilationResult with the parsed result or errors for each file
   */
  public compileMultiple<T>(
    files: { content: string; fileName: string }[],
    listener: BaseApexParserListener<T>,
  ): CompilationResult<T>[] {
    const results: CompilationResult<T>[] = [];

    // Process each file
    for (const file of files) {
      try {
        const compilationUnitContext = this.getCompilationUnit(file.content);
        const walker = new ParseTreeWalker();
        // Create a fresh listener for each file if needed
        const fileListener = listener.createNewInstance
          ? listener.createNewInstance()
          : listener;

        // Use the provided listener to walk the parse tree
        walker.walk(fileListener, compilationUnitContext);

        // Collect any file-specific warnings
        const warnings: string[] = [];
        if (
          'getWarnings' in fileListener &&
          typeof fileListener.getWarnings === 'function'
        ) {
          warnings.push(...fileListener.getWarnings());
        }

        // Add the result for this file
        results.push({
          fileName: file.fileName,
          result: fileListener.getResult(),
          errors: [],
          warnings,
        });
      } catch (error) {
        // Handle any errors during parsing for this file
        results.push({
          fileName: file.fileName,
          result: null,
          errors: [error instanceof Error ? error : new Error(String(error))],
          warnings: [],
        });
      }
    }

    return results;
  }

  private getCompilationUnit(source: string): CompilationUnitContext {
    const inputStream = CharStreams.fromString(source);
    const lexer = new ApexLexer(inputStream);
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new ApexParser(tokenStream);

    // Set error handling strategy if needed
    // parser.errorHandler = new BailErrorStrategy();
    // Parse the compilation unit
    const compilationUnitContext = parser.compilationUnit();
    return compilationUnitContext;
  }
}
