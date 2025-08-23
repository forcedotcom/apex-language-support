/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger } from '@salesforce/apex-lsp-shared';
import { ICompilerService } from './ICompilerService';
import { CompilationResult, CompilationResultWithComments, CompilationOptions } from './compilerService';
import { BaseApexParserListener } from './listeners/BaseApexParserListener';
import { ApexError } from './listeners/ApexErrorListener';
import { ApexComment } from './listeners/ApexCommentCollectorListener';
import { SymbolTable } from '../types/symbol';

/**
 * Web-compatible stub parser that provides the same interface as CompilerService
 * but without the problematic @apexdevtools/apex-parser dependency.
 * 
 * This is used to test if the importScripts issue is caused by the apex-parser dependency.
 * It provides minimal functionality to keep the language server working in web environments.
 */
export class WebStubCompilerService implements ICompilerService {
  private projectNamespace?: string;
  private readonly logger = getLogger();

  constructor(projectNamespace?: string) {
    this.projectNamespace = projectNamespace;
    this.logger.info('🔧 WebStubCompilerService initialized - apex-parser functionality stubbed for web compatibility');
  }

  /**
   * Stub implementation of generic compile method (implements ICompilerService)
   */
  public compile<T>(
    fileContent: string,
    fileName: string = 'unknown.cls',
    listener: BaseApexParserListener<T>,
    options: CompilationOptions = {},
  ): CompilationResult<T> | CompilationResultWithComments<T> {
    this.logger.debug(`📝 [STUB] Compiling file: ${fileName}`);
    
    // Create a stub result - the listener's getResult() will be called but return minimal data
    try {
      // Simulate calling the listener
      const result = listener.getResult ? listener.getResult() : null;
      
      const baseResult: CompilationResult<T> = {
        fileName,
        result,
        errors: [],
        warnings: ['Parser functionality stubbed for web compatibility'],
      };

      // Return with comments if requested (default behavior)
      if (options.includeComments !== false) {
        const resultWithComments: CompilationResultWithComments<T> = {
          ...baseResult,
          comments: [],
        };
        return resultWithComments;
      }

      return baseResult;
    } catch (error) {
      this.logger.error(`[STUB] Error in compile: ${error}`);
      const errorResult: CompilationResult<T> = {
        fileName,
        result: null,
        errors: [{
          message: error instanceof Error ? error.message : String(error),
          line: 1,
          column: 1,
          type: 'syntax'
        } as ApexError],
        warnings: ['Parser functionality stubbed for web compatibility'],
      };

      if (options.includeComments !== false) {
        return {
          ...errorResult,
          comments: [],
        };
      }

      return errorResult;
    }
  }

  /**
   * Stub implementation of multiple file compilation
   */
  public async compileMultiple<T>(
    files: { content: string; fileName: string }[],
    listener: BaseApexParserListener<T>,
    options: CompilationOptions = {},
  ): Promise<(CompilationResult<T> | CompilationResultWithComments<T>)[]> {
    this.logger.debug(`📝 [STUB] Compiling ${files.length} files`);
    
    // Process each file individually using the compile method
    const results: (CompilationResult<T> | CompilationResultWithComments<T>)[] = [];
    
    for (const file of files) {
      // Create a fresh listener for each file if needed
      const fileListener = listener.createNewInstance 
        ? listener.createNewInstance() 
        : listener;
      
      const result = this.compile(file.content, file.fileName, fileListener, options);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Stub implementation of symbol table compilation
   */
  public compileApexClassOrInterface(
    fileName: string,
    source: string,
    options?: CompilationOptions,
  ): CompilationResultWithComments<SymbolTable> {
    this.logger.debug(`📝 [STUB] Compiling Apex class/interface: ${fileName}`);
    
    return {
      fileName,
      result: this.createStubSymbolTable(fileName, source),
      errors: [],
      warnings: ['Parser functionality stubbed for web compatibility'],
      comments: [],
    };
  }

  /**
   * Stub implementation of trigger compilation
   */
  public compileApexTrigger(
    fileName: string,
    source: string,
    options?: CompilationOptions,
  ): CompilationResultWithComments<SymbolTable> {
    this.logger.debug(`📝 [STUB] Compiling Apex trigger: ${fileName}`);
    
    return {
      fileName,
      result: this.createStubSymbolTable(fileName, source),
      errors: [],
      warnings: ['Parser functionality stubbed for web compatibility'],
      comments: [],
    };
  }

  /**
   * Stub implementation of parse tree creation
   */
  public createParseTree(
    fileName: string,
    source: string,
    options?: CompilationOptions,
  ): CompilationResult<null> {
    this.logger.debug(`🌳 [STUB] Creating parse tree for: ${fileName}`);
    
    return {
      fileName,
      result: null, // Parse tree not available in stub implementation
      errors: [],
      warnings: ['Parse tree functionality stubbed for web compatibility'],
    };
  }

  /**
   * Create a minimal stub symbol table
   */
  private createStubSymbolTable(fileName: string, source: string): SymbolTable {
    // Extract basic class name from source for minimal functionality
    const classMatch = source.match(/(?:public|private|global)?\s*class\s+(\w+)/i);
    const className = classMatch ? classMatch[1] : 'UnknownClass';
    
    // Create a proper SymbolTable instance
    const symbolTable = new SymbolTable();
    
    // Note: In a real implementation, we would parse the source and populate the symbol table
    // For stub purposes, we just create an empty but valid symbol table
    
    this.logger.debug(`📋 [STUB] Created stub symbol table for ${className} in ${fileName}`);
    
    return symbolTable;
  }

  /**
   * Stub implementation of validation
   */
  public validateSyntax(
    fileName: string,
    source: string,
  ): CompilationResult<boolean> {
    this.logger.debug(`✅ [STUB] Validating syntax for: ${fileName}`);
    
    // Basic validation - check for obvious syntax errors
    const hasBasicStructure = /class\s+\w+|interface\s+\w+|trigger\s+\w+/i.test(source);
    
    return {
      fileName,
      result: hasBasicStructure,
      errors: hasBasicStructure ? [] : [{
        message: 'No valid Apex structure found',
        line: 1,
        column: 1,
        type: 'syntax'
      } as ApexError],
      warnings: hasBasicStructure ? [] : ['Basic syntax validation only - full parser stubbed for web compatibility'],
    };
  }
}