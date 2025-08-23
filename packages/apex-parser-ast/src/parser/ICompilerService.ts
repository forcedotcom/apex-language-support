/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { BaseApexParserListener } from './listeners/BaseApexParserListener';
import type { CompilationResult, CompilationResultWithComments, CompilationOptions } from './compilerService';

/**
 * Interface for compiler services that can parse and compile Apex code.
 * This abstraction allows switching between the full CompilerService 
 * and web-compatible stub implementations.
 */
export interface ICompilerService {
  /**
   * Parse and compile a single Apex file.
   * @param fileContent The content of the Apex file to parse
   * @param fileName Optional filename for error reporting
   * @param listener The listener to use during parsing
   * @param options Optional compilation options
   * @returns CompilationResult with the parsed result or errors, optionally including comments
   */
  compile<T>(
    fileContent: string,
    fileName: string,
    listener: BaseApexParserListener<T>,
    options?: CompilationOptions,
  ): CompilationResult<T> | CompilationResultWithComments<T>;

  /**
   * Parse and compile multiple Apex files using parallel processing.
   * @param files An array of file objects containing content and name
   * @param listener The listener to use during parsing
   * @param options Optional compilation options
   * @returns Promise that resolves to array of compilation results
   */
  compileMultiple<T>(
    files: { content: string; fileName: string }[],
    listener: BaseApexParserListener<T>,
    options?: CompilationOptions,
  ): Promise<(CompilationResult<T> | CompilationResultWithComments<T>)[]>;
}