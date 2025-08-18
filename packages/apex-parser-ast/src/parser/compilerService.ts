/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CharStreams, CommonTokenStream, DefaultErrorStrategy } from 'antlr4ts';
import {
  ApexLexer,
  ApexParser,
  CaseInsensitiveInputStream,
  CompilationUnitContext,
  ParseTreeWalker,
  TriggerUnitContext,
} from '@apexdevtools/apex-parser';
import { getLogger } from '@salesforce/apex-lsp-shared';

import { BaseApexParserListener } from './listeners/BaseApexParserListener';
import {
  ApexError,
  ApexErrorListener,
  ApexLexerErrorListener,
} from './listeners/ApexErrorListener';
import {
  ApexComment,
  ApexCommentCollectorListener,
  CommentAssociation,
} from './listeners/ApexCommentCollectorListener';
import { CommentAssociator } from '../utils/CommentAssociator';
import { SymbolTable } from '../types/symbol';
import { NamespaceResolutionService } from '../namespace/NamespaceResolutionService';
import { ApexSymbolCollectorListener } from './listeners/ApexSymbolCollectorListener';

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
 * Result of a compilation process with comments included
 */
export interface CompilationResultWithComments<T> extends CompilationResult<T> {
  comments: ApexComment[];
}

/**
 * Result with comments and associations included
 */
export interface CompilationResultWithAssociations<T>
  extends CompilationResultWithComments<T> {
  commentAssociations: CommentAssociation[];
}

/**
 * Result of creating a parse tree.
 */
export interface ParseTreeResult {
  fileName: string;
  parseTree: CompilationUnitContext | TriggerUnitContext;
  errorListener: ApexErrorListener;
  lexer: ApexLexer;
  tokenStream: CommonTokenStream;
  parser: ApexParser;
}

/**
 * Options for compilation behavior
 */
export interface CompilationOptions {
  /** Optional namespace override for this compilation */
  projectNamespace?: string;
  /** Whether to collect comments during parsing (default: true) */
  includeComments?: boolean;
  /** Whether to include single-line (//) comments (default: false) */
  includeSingleLineComments?: boolean;
  /** Whether to associate comments with symbols (default: false) */
  associateComments?: boolean;
}

/**
 * Service for parsing and compiling Apex code.
 */
export class CompilerService {
  private projectNamespace?: string;
  private readonly logger = getLogger();
  private readonly namespaceResolutionService =
    new NamespaceResolutionService();

  /**
   * Create a new CompilerService instance
   * @param projectNamespace Optional namespace for the current project, used in FQN calculation
   */
  constructor(projectNamespace?: string) {
    this.projectNamespace = projectNamespace;
    this.logger.debug(
      () =>
        `CompilerService initialized with namespace: ${projectNamespace || 'none'}`,
    );
  }

  /**
   * Creates a parse tree from the given file content.
   * This method handles the setup of the lexer, parser, and error listeners.
   * @param fileContent The content of the Apex file.
   * @param fileName The name of the file, used for error reporting and trigger detection.
   * @returns A ParseTreeResult containing the parse tree and related objects.
   */
  private createParseTree(
    fileContent: string,
    fileName: string = 'unknown.cls',
  ): ParseTreeResult {
    this.logger.debug(() => `Creating parse tree for ${fileName}`);

    // Create error listener
    const errorListener = new ApexErrorListener(fileName);

    // Set up parsing infrastructure
    const inputStream = CharStreams.fromString(fileContent);
    const lexer = new ApexLexer(new CaseInsensitiveInputStream(inputStream));
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new ApexParser(tokenStream);
    parser.errorHandler = new DefaultErrorStrategy();

    // Set up error listeners
    parser.removeErrorListeners();
    lexer.removeErrorListeners();
    parser.addErrorListener(errorListener);
    const lexerErrorListener = new ApexLexerErrorListener(errorListener);
    lexer.addErrorListener(lexerErrorListener);

    // Parse the compilation unit
    const isTrigger = fileName.endsWith('.trigger');
    const parseTree = isTrigger
      ? parser.triggerUnit()
      : parser.compilationUnit();

    return {
      fileName,
      parseTree,
      errorListener,
      lexer,
      tokenStream,
      parser,
    };
  }

  /**
   * Parse and compile a single Apex file.
   * @param fileContent The content of the Apex file to parse
   * @param fileName Optional filename for error reporting
   * @param listener The listener to use during parsing
   * @param options Optional compilation options
   * @returns CompilationResult with the parsed result or errors, optionally including comments
   */
  public compile<T>(
    fileContent: string,
    fileName: string = 'unknown.cls',
    listener: BaseApexParserListener<T>,
    options: CompilationOptions = {},
  ):
    | CompilationResult<T>
    | CompilationResultWithComments<T>
    | CompilationResultWithAssociations<T> {
    this.logger.debug(() => `Starting compilation of ${fileName}`);

    try {
      // Create parse tree and get associated components
      const { parseTree, errorListener, tokenStream } = this.createParseTree(
        fileContent,
        fileName,
      );

      // Create comment collector by default (opt-out behavior)
      let commentCollector: ApexCommentCollectorListener | null = null;
      if (options.includeComments !== false) {
        commentCollector = new ApexCommentCollectorListener(
          options.includeSingleLineComments || false,
        );
      }

      // Set up the main listener
      listener.setErrorListener(errorListener);
      const namespace = options.projectNamespace || this.projectNamespace;
      if (namespace && typeof listener.setProjectNamespace === 'function') {
        this.logger.debug(() => `Setting project namespace to: ${namespace}`);
        listener.setProjectNamespace(namespace);
      }

      // Set up the comment collector with the token stream if requested
      if (commentCollector) {
        commentCollector.setTokenStream(tokenStream);
      }

      // Walk the tree with the main listener
      const walker = new ParseTreeWalker();
      walker.walk(listener, parseTree);

      // Phase 4: Deferred namespace resolution
      if (listener instanceof ApexSymbolCollectorListener) {
        this.logger.debug(
          () => 'Starting Phase 4: Deferred namespace resolution',
        );
        const symbolTable = listener.getResult();

        // Create compilation context for namespace resolution
        const compilationContext = this.createCompilationContext(
          namespace,
          fileName,
        );

        // Create symbol provider for namespace resolution
        const symbolProvider = this.createSymbolProvider();

        // Perform deferred namespace resolution
        this.namespaceResolutionService.resolveDeferredReferences(
          symbolTable,
          compilationContext,
          symbolProvider,
        );

        this.logger.debug(
          () => 'Completed Phase 4: Deferred namespace resolution',
        );
      }

      // Build the result
      const baseResult = {
        fileName,
        result: listener.getResult(),
        errors: errorListener.getErrors(),
        warnings: listener.getWarnings(),
      };

      // Walk the tree with comment collector if requested
      let comments: ApexComment[] = [];
      if (commentCollector) {
        walker.walk(commentCollector, parseTree);
        comments = commentCollector.getResult();
      }

      if (options.includeComments !== false) {
        // Handle comment association if requested
        if (
          options.associateComments &&
          baseResult.result instanceof SymbolTable
        ) {
          const symbolTable = baseResult.result as SymbolTable;
          // Use all symbols in the file, not just the current scope
          const symbols = symbolTable.getAllSymbols();

          const associator = new CommentAssociator();
          const commentAssociations = associator.associateComments(
            comments,
            symbols,
          );

          const resultWithAssociations: CompilationResultWithAssociations<T> = {
            ...baseResult,
            comments,
            commentAssociations,
          };

          this.logger.debug(
            () =>
              `Compilation completed for ${fileName}. Found ${comments.length} comments, ` +
              `${commentAssociations.length} associations, ${resultWithAssociations.errors.length} errors, ` +
              `${resultWithAssociations.warnings.length} warnings`,
          );

          return resultWithAssociations;
        } else {
          const resultWithComments: CompilationResultWithComments<T> = {
            ...baseResult,
            comments,
          };

          this.logger.debug(
            () =>
              `Compilation completed for ${fileName}. Found ${comments.length} comments, ` +
              `${resultWithComments.errors.length} errors, ${resultWithComments.warnings.length} warnings`,
          );

          return resultWithComments;
        }
      } else {
        if (baseResult.errors.length > 0) {
          this.logger.debug(
            () =>
              `Compilation completed with ${baseResult.errors.length} errors in ${fileName}`,
          );
        } else if (baseResult.warnings.length > 0) {
          this.logger.debug(
            () =>
              `Compilation completed with ${baseResult.warnings.length} warnings in ${fileName}`,
          );
        } else {
          this.logger.debug(
            () => `Compilation completed successfully for ${fileName}`,
          );
        }

        return baseResult;
      }
    } catch (error) {
      this.logger.error(
        () => `Unexpected error during compilation of ${fileName}`,
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

      const baseErrorResult = {
        fileName,
        result: null,
        errors: [errorObject],
        warnings: [],
      };

      // Return with comments array by default, otherwise without
      if (options.includeComments !== false) {
        return {
          ...baseErrorResult,
          comments: [],
        };
      }

      return baseErrorResult;
    }
  }

  /**
   * Parse and compile multiple Apex files using parallel processing.
   * @param files An array of file objects containing content and name
   * @param listener The listener to use during parsing
   * @param options Optional compilation options
   * @returns Promise that resolves to array of compilation results
   */
  public async compileMultiple<T>(
    files: { content: string; fileName: string }[],
    listener: BaseApexParserListener<T>,
    options: CompilationOptions = {},
  ): Promise<(CompilationResult<T> | CompilationResultWithComments<T>)[]> {
    this.logger.debug(
      () => `Starting parallel compilation of ${files.length} files`,
    );

    // Transform the files array into the structure needed by compileMultipleWithConfigs
    const fileCompilationConfigs = files.map((file) => {
      // Create a fresh listener for each file if needed
      const fileListener = listener.createNewInstance
        ? listener.createNewInstance()
        : listener;

      return {
        content: file.content,
        fileName: file.fileName,
        listener: fileListener,
        options,
      };
    });

    // Delegate to the more flexible method
    return this.compileMultipleWithConfigs(fileCompilationConfigs);
  }

  /**
   * Parse and compile multiple Apex files with individual settings using parallel processing.
   * @param fileCompilationConfigs Array of file compilation configurations
   * @returns Promise that resolves to array of compilation results
   */
  public async compileMultipleWithConfigs<T>(
    fileCompilationConfigs: Array<{
      content: string;
      fileName: string;
      listener: BaseApexParserListener<T>;
      options?: CompilationOptions;
    }>,
  ): Promise<(CompilationResult<T> | CompilationResultWithComments<T>)[]> {
    this.logger.debug(
      () =>
        `Starting parallel compilation of ${fileCompilationConfigs.length} files with individual configurations`,
    );

    const startTime = Date.now();

    // Use Promise.allSettled to capture compilation rejections
    const settledResults = await Promise.allSettled(
      fileCompilationConfigs.map(async (config) =>
        // Use the listener as provided - assume it's already properly prepared
        this.compile(
          config.content,
          config.fileName,
          config.listener,
          config.options || {},
        ),
      ),
    );

    // Process the settled results and handle any rejections
    const results: (CompilationResult<T> | CompilationResultWithComments<T>)[] =
      [];
    let rejectedCount = 0;

    for (let i = 0; i < settledResults.length; i++) {
      const settledResult = settledResults[i];
      const config = fileCompilationConfigs[i];

      if (settledResult.status === 'fulfilled') {
        results.push(settledResult.value);
      } else {
        // Handle rejection by creating an error result
        rejectedCount++;
        this.logger.debug(() => `Compilation failed for ${config.fileName}`);

        // Create an error object for the rejection
        const errorObject: ApexError = {
          type: 'semantic' as any,
          severity: 'error' as any,
          message:
            settledResult.reason instanceof Error
              ? settledResult.reason.message
              : String(settledResult.reason),
          line: 0,
          column: 0,
          filePath: config.fileName,
        };

        const errorResult = {
          fileName: config.fileName,
          result: null,
          errors: [errorObject],
          warnings: [],
        };

        // Add comments array if comments are enabled
        const includeComments = config.options?.includeComments !== false;
        if (includeComments) {
          results.push({
            ...errorResult,
            comments: [],
          });
        } else {
          results.push(errorResult);
        }
      }
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    if (rejectedCount > 0) {
      this.logger.debug(
        () =>
          // eslint-disable-next-line max-len
          `Parallel compilation completed in ${duration.toFixed(2)}s: ${results.length} files processed, ${rejectedCount} compilation rejections captured`,
      );
    } else {
      this.logger.debug(
        () =>
          `Parallel compilation completed in ${duration.toFixed(2)}s: ${results.length} files processed`,
      );
    }

    return results;
  }

  /**
   * Create compilation context for namespace resolution
   */
  private createCompilationContext(
    namespace: string | undefined,
    fileName: string,
  ): any {
    // For now, create a basic compilation context
    // This will be enhanced when we have full CompilationContext type support
    return {
      namespace: namespace ? { toString: () => namespace } : null,
      version: 58, // Default to latest version
      isTrusted: true,
      sourceType: 'FILE',
      referencingType: null,
      enclosingTypes: [],
      parentTypes: [],
      isStaticContext: false,
    };
  }

  /**
   * Create symbol provider for namespace resolution
   */
  private createSymbolProvider(): any {
    // For now, create a basic symbol provider
    // This will be enhanced when we have full SymbolProvider type support
    return {
      find: (referencingType: any, fullName: string) => null,
      findBuiltInType: (name: string) => null,
      findSObjectType: (name: string) => null,
      findUserType: (name: string, namespace?: string) => null,
      findExternalType: (name: string, packageName: string) => null,
    };
  }
}
