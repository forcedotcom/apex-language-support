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
  TriggerUnitContext,
} from '@apexdevtools/apex-parser';
import { getLogger } from '@salesforce/apex-lsp-logging';

import { BaseApexParserListener } from './listeners/BaseApexParserListener';
import {
  ApexError,
  ApexErrorListener,
  ApexLexerErrorListener,
} from './listeners/ApexErrorListener';

/**
 * Result of a compilation process, containing any errors, warnings, and the final result.
 */
export interface CompilationResult<T> {
  fileName: string;
  result: T | null;
  errors: ApexError[];
  warnings: string[];
}

/**
 * Service for parsing and compiling Apex code.
 */
export class CompilerService {
  private projectNamespace?: string;
  private readonly logger = getLogger();

  /**
   * Create a new CompilerService instance
   * @param projectNamespace Optional namespace for the current project, used in FQN calculation
   */
  constructor(projectNamespace?: string) {
    this.projectNamespace = projectNamespace;
    this.logger.debug(
      `CompilerService initialized with namespace: ${projectNamespace || 'none'}`,
    );
  }

  /**
   * Parse and compile a single Apex file.
   * @param fileContent The content of the Apex file to parse
   * @param fileName Optional filename for error reporting
   * @param listener The listener to use during parsing
   * @param projectNamespace Optional namespace override for this compilation
   * @returns CompilationResult with the parsed result or errors
   */
  public compile<T>(
    fileContent: string,
    fileName: string = 'unknown.cls',
    listener: BaseApexParserListener<T>,
    projectNamespace?: string,
  ): CompilationResult<T> {
    this.logger.debug(`Starting compilation of ${fileName}`);
    try {
      // Create an error listener
      const errorListener = new ApexErrorListener(fileName);

      // Set it on the listener
      listener.setErrorListener(errorListener);

      // Set the project namespace if provided or use the one from constructor
      const namespace = projectNamespace || this.projectNamespace;
      if (namespace && typeof listener.setProjectNamespace === 'function') {
        this.logger.debug(`Setting project namespace to: ${namespace}`);
        listener.setProjectNamespace(namespace);
      }

      // Parse the code and get the compilation unit
      const compilationUnitContext = this.getCompilationUnit(
        fileContent,
        errorListener,
      );

      // Walk the parse tree with our listener
      const walker = new ParseTreeWalker();
      walker.walk(listener, compilationUnitContext);

      const result = {
        fileName,
        result: listener.getResult(),
        errors: errorListener.getErrors(),
        warnings: listener.getWarnings(),
      };

      if (result.errors.length > 0) {
        this.logger.warn(
          `Compilation completed with ${result.errors.length} errors in ${fileName}`,
        );
      } else if (result.warnings.length > 0) {
        this.logger.info(
          `Compilation completed with ${result.warnings.length} warnings in ${fileName}`,
        );
      } else {
        this.logger.debug(`Compilation completed successfully for ${fileName}`);
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Unexpected error during compilation of ${fileName}`,
        error,
      );
      // Create an error object for any unexpected errors
      const errorObject: ApexError = {
        type: 'semantic' as any,
        severity: 'error' as any,
        message: error instanceof Error ? error.message : String(error),
        line: 0,
        column: 0,
        filePath: fileName,
      };

      // Handle any errors during parsing
      return {
        fileName,
        result: null,
        errors: [errorObject],
        warnings: [],
      };
    }
  }

  /**
   * Parse and compile multiple Apex files.
   * @param files An array of file objects containing content and name
   * @param listener The listener to use during parsing
   * @param projectNamespace Optional namespace override for this compilation
   * @returns Array of CompilationResult with the parsed result or errors for each file
   */
  public compileMultiple<T>(
    files: { content: string; fileName: string }[],
    listener: BaseApexParserListener<T>,
    projectNamespace?: string,
  ): CompilationResult<T>[] {
    const results: CompilationResult<T>[] = [];

    // Use the provided namespace or fall back to the one from constructor
    const namespace = projectNamespace || this.projectNamespace;

    // Process each file
    for (const file of files) {
      try {
        // Create an error listener for this file
        const errorListener = new ApexErrorListener(file.fileName);

        // Parse the code and get the compilation unit
        const compilationUnitContext = this.getCompilationUnit(
          file.content,
          errorListener,
        );

        // Create a fresh listener for each file if needed
        const fileListener = listener.createNewInstance
          ? listener.createNewInstance()
          : listener;

        // Set the error listener on the parser listener
        fileListener.setErrorListener(errorListener);

        // Set the project namespace if provided
        if (
          namespace &&
          typeof fileListener.setProjectNamespace === 'function'
        ) {
          fileListener.setProjectNamespace(namespace);
        }

        // Use the provided listener to walk the parse tree
        const walker = new ParseTreeWalker();
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
          errors: errorListener.getErrors(),
          warnings,
        });
      } catch (error) {
        // Create an error object for any unexpected errors
        const errorObject: ApexError = {
          type: 'semantic' as any, // Type assertion to avoid importing the enum
          severity: 'error' as any, // Type assertion to avoid importing the enum
          message: error instanceof Error ? error.message : String(error),
          line: 0,
          column: 0,
          filePath: file.fileName,
        };

        // Handle any errors during parsing for this file
        results.push({
          fileName: file.fileName,
          result: null,
          errors: [errorObject],
          warnings: [],
        });
      }
    }

    return results;
  }

  private getCompilationUnit(
    source: string,
    errorListener?: ApexErrorListener,
  ): CompilationUnitContext | TriggerUnitContext {
    this.logger.debug('Creating compilation unit');
    const inputStream = CharStreams.fromString(source);
    const lexer = new ApexLexer(inputStream);
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new ApexParser(tokenStream);

    // Add our custom error listener if provided
    if (errorListener) {
      this.logger.debug('Setting up custom error listeners');
      parser.removeErrorListeners();
      lexer.removeErrorListeners();

      // Add our custom error listener
      parser.addErrorListener(errorListener);
      // Create and add lexer-specific error listener
      const lexerErrorListener = new ApexLexerErrorListener(errorListener);
      lexer.addErrorListener(lexerErrorListener);
    }

    // Check if this is a trigger file based on the file extension
    const isTrigger =
      errorListener?.getFilePath()?.endsWith('.trigger') ?? false;

    // Parse the compilation unit or trigger based on file type
    this.logger.debug('Parsing compilation unit');
    const compilationUnitContext = isTrigger
      ? parser.triggerUnit()
      : parser.compilationUnit();
    return compilationUnitContext;
  }
}
