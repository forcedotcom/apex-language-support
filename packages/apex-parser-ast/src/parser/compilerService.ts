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
  BlockContext,
  CompilationUnitContext,
  ParseTreeWalker,
  TriggerUnitContext,
} from '@apexdevtools/apex-parser';
import { getLogger } from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';

/**
 * Yield to the Node.js event loop using setImmediate for immediate yielding
 * This is more effective than Effect.sleep(0) which may use setTimeout
 */
const yieldToEventLoop = Effect.async<void>((resume) => {
  setImmediate(() => resume(Effect.void));
});

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
import { FullSymbolCollectorListener } from './listeners/FullSymbolCollectorListener';
import { ApexReferenceCollectorListener } from './listeners/ApexReferenceCollectorListener';
import { ApexReferenceResolver } from './references/ApexReferenceResolver';
import {
  LayeredSymbolListenerBase,
  DetailLevel,
} from './listeners/LayeredSymbolListenerBase';
import { VisibilitySymbolListener } from './listeners/VisibilitySymbolListener';
import { DEFAULT_SALESFORCE_API_VERSION } from '../constants/constants';

export interface CompilationResult<T> {
  fileName: string;
  result: T | null;
  errors: ApexError[];
  warnings: string[];
}

export interface CompilationResultWithComments<T> extends CompilationResult<T> {
  comments: ApexComment[];
}

export interface CompilationResultWithAssociations<T>
  extends CompilationResultWithComments<T> {
  commentAssociations: CommentAssociation[];
}

export interface ParseTreeResult {
  fileName: string;
  parseTree: CompilationUnitContext | TriggerUnitContext | BlockContext;
  errorListener: ApexErrorListener;
  lexer: ApexLexer;
  tokenStream: CommonTokenStream;
  parser: ApexParser;
}

export interface CompilationOptions {
  projectNamespace?: string;
  includeComments?: boolean;
  includeSingleLineComments?: boolean;
  associateComments?: boolean;
  enableReferenceCorrection?: boolean; // New option, defaults to true
  collectReferences?: boolean; // Collect references using ApexReferenceCollectorListener
  resolveReferences?: boolean; // Resolve references using ApexReferenceResolver
}

export interface LayeredCompilationOptions extends CompilationOptions {
  cacheParseTree?: boolean; // Cache parse tree for reuse (default: true)
  enforceDependencies?: boolean; // Auto-include dependencies (default: true)
}

export class CompilerService {
  private projectNamespace?: string;
  private readonly logger = getLogger();
  private readonly namespaceResolutionService =
    new NamespaceResolutionService();

  constructor(projectNamespace?: string) {
    this.projectNamespace = projectNamespace;
    this.logger.debug(
      () =>
        `CompilerService initialized with namespace: ${projectNamespace || 'none'}`,
    );
  }

  private createParseTree(
    fileContent: string,
    fileName: string = 'unknown.cls',
  ): ParseTreeResult {
    this.logger.debug(() => `Creating parse tree for ${fileName}`);
    const errorListener = new ApexErrorListener(fileName);
    const isTrigger = fileName.endsWith('.trigger');
    const isAnonymous = fileName.endsWith('.apex');
    const contentToParse = isAnonymous ? `{${fileContent}}` : fileContent;

    const inputStream = CharStreams.fromString(contentToParse);
    const lexer = new ApexLexer(new CaseInsensitiveInputStream(inputStream));
    const tokenStream = new CommonTokenStream(lexer);
    const parser = new ApexParser(tokenStream);
    parser.errorHandler = new DefaultErrorStrategy();

    parser.removeErrorListeners();
    lexer.removeErrorListeners();
    parser.addErrorListener(errorListener);
    lexer.addErrorListener(new ApexLexerErrorListener(errorListener));

    let parseTree: CompilationUnitContext | TriggerUnitContext | BlockContext;
    if (isTrigger) {
      parseTree = parser.triggerUnit();
    } else if (isAnonymous) {
      parseTree = parser.block();
    } else {
      parseTree = parser.compilationUnit();
    }

    return { fileName, parseTree, errorListener, lexer, tokenStream, parser };
  }

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
      const { parseTree, errorListener, tokenStream } = this.createParseTree(
        fileContent,
        fileName,
      );

      let commentCollector: ApexCommentCollectorListener | null = null;
      if (options.includeComments !== false) {
        commentCollector = new ApexCommentCollectorListener(
          options.includeSingleLineComments || false,
        );
      }

      listener.setErrorListener(errorListener);
      if (typeof listener.setCurrentFileUri === 'function') {
        listener.setCurrentFileUri(fileName);
      }

      const namespace = options.projectNamespace || this.projectNamespace;
      if (namespace && typeof listener.setProjectNamespace === 'function') {
        this.logger.debug(() => `Setting project namespace to: ${namespace}`);
        listener.setProjectNamespace(namespace);
      }

      if (commentCollector) {
        commentCollector.setTokenStream(tokenStream);
      }

      // Set reference correction flag BEFORE walking the tree
      // This ensures the listener uses the correct setting during parsing
      if (
        listener instanceof ApexSymbolCollectorListener ||
        listener instanceof ApexSymbolCollectorListener ||
        listener instanceof FullSymbolCollectorListener
      ) {
        listener.setEnableReferenceCorrection(
          options.enableReferenceCorrection !== false,
        );
      }

      const walker = new ParseTreeWalker();
      walker.walk(listener, parseTree);

      // Optionally collect references using dedicated listener
      const collectReferences = options.collectReferences === true;
      const resolveReferences =
        options.resolveReferences !== false && collectReferences;

      if (collectReferences && listener.getResult() instanceof SymbolTable) {
        const symbolTable = listener.getResult() as SymbolTable;
        const referenceCollector = new ApexReferenceCollectorListener(
          symbolTable,
        );
        referenceCollector.setErrorListener(errorListener);
        referenceCollector.setCurrentFileUri(fileName);
        if (
          namespace &&
          typeof referenceCollector.setProjectNamespace === 'function'
        ) {
          referenceCollector.setProjectNamespace(namespace);
        }

        // Walk parse tree again to collect references
        walker.walk(referenceCollector, parseTree);

        // Optionally resolve references
        if (resolveReferences) {
          const resolver = new ApexReferenceResolver();
          resolver.resolveSameFileReferences(symbolTable, fileName);
        }
      }

      if (
        listener instanceof ApexSymbolCollectorListener ||
        listener instanceof ApexSymbolCollectorListener ||
        listener instanceof FullSymbolCollectorListener
      ) {
        const symbolTable = listener.getResult();
        const compilationContext = this.createCompilationContext(
          namespace,
          fileName,
        );
        const symbolProvider = this.createSymbolProvider();
        this.namespaceResolutionService.resolveDeferredReferences(
          symbolTable,
          compilationContext,
          symbolProvider,
        );
      }

      const baseResult = {
        fileName,
        result: listener.getResult(),
        errors: errorListener.getErrors(),
        warnings: listener.getWarnings(),
      };

      let comments: ApexComment[] = [];
      if (commentCollector) {
        walker.walk(commentCollector, parseTree);
        comments = commentCollector.getResult();
      }

      if (options.includeComments !== false) {
        if (
          options.associateComments &&
          baseResult.result instanceof SymbolTable
        ) {
          const symbolTable = baseResult.result as SymbolTable;
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
      const errorObject: ApexError = {
        type: 'semantic' as any,
        severity: 'error' as any,
        message: error instanceof Error ? error.message : String(error),
        line: 0,
        column: 0,
        fileUri: fileName,
      };
      const baseErrorResult = {
        fileName,
        result: null,
        errors: [errorObject],
        warnings: [],
      };
      if (options.includeComments !== false) {
        return { ...baseErrorResult, comments: [] };
      }
      return baseErrorResult;
    }
  }

  public compileMultiple<T>(
    files: { content: string; fileName: string }[],
    listener: BaseApexParserListener<T>,
    options: CompilationOptions = {},
  ): Effect.Effect<
    (CompilationResult<T> | CompilationResultWithComments<T>)[],
    never,
    never
  > {
    // Create configs for each file
    const configs = files.map((file) => ({
      content: file.content,
      fileName: file.fileName,
      listener: listener.createNewInstance
        ? listener.createNewInstance()
        : listener,
      options,
    }));
    return this.compileMultipleWithConfigs(configs);
  }

  public compileMultipleWithConfigs<T>(
    fileCompilationConfigs: ReadonlyArray<{
      content: string;
      fileName: string;
      listener: BaseApexParserListener<T>;
      options?: CompilationOptions;
    }>,
    _concurrency = 50, // Parameter kept for API compatibility but not used
  ): Effect.Effect<
    (CompilationResult<T> | CompilationResultWithComments<T>)[],
    never,
    never
  > {
    const self = this;
    return Effect.gen(function* () {
      const startTime = Date.now();
      const results: {
        index: number;
        result: CompilationResult<T> | CompilationResultWithComments<T>;
      }[] = [];

      // Yield interval to reduce setImmediate overhead for large batches
      // Yields every N files instead of every file to minimize callback queue buildup
      const YIELD_INTERVAL = 10;

      // Process files sequentially with yielding to avoid CPU issues
      // This approach avoids Effect.all overhead while still allowing event loop to process other tasks
      for (let i = 0; i < fileCompilationConfigs.length; i++) {
        const config = fileCompilationConfigs[i];

        // Compile single file with error handling
        const compileResult = yield* Effect.either(
          Effect.sync(() =>
            self.compile(
              config.content,
              config.fileName,
              config.listener,
              config.options || {},
            ),
          ),
        );

        // Process result
        if (compileResult._tag === 'Right') {
          results.push({
            index: i,
            result: compileResult.right,
          });
        } else {
          const error = compileResult.left;
          const errorObject: ApexError = {
            type: 'semantic' as any,
            severity: 'error' as any,
            message: String(error),
            line: 0,
            column: 0,
            fileUri: config.fileName,
          };
          const errorResult = {
            fileName: config.fileName,
            result: null,
            errors: [errorObject],
            warnings: [],
          };
          const includeComments = config.options?.includeComments !== false;
          results.push({
            index: i,
            result: includeComments
              ? ({
                  ...errorResult,
                  comments: [],
                } as CompilationResultWithComments<T>)
              : (errorResult as CompilationResult<T>),
          });
        }

        // Yield to event loop every YIELD_INTERVAL files (except last) to prevent blocking
        // Reduced frequency minimizes setImmediate callback overhead for large batches
        // This matches the pattern used in DocumentProcessingService for consistency
        if (
          (i + 1) % YIELD_INTERVAL === 0 &&
          i + 1 < fileCompilationConfigs.length
        ) {
          yield* yieldToEventLoop;
        }
      }

      // Results are already in order, just extract them
      const compiled = results.map((r) => r.result);
      const completedCount = results.filter(
        (item) => item.result.errors.length === 0,
      ).length;
      const rejectedCount = results.length - completedCount;

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      self.logger.debug(
        () =>
          `Sequential compilation completed in ${duration.toFixed(2)}s: ` +
          `${completedCount} files compiled successfully, ` +
          `${rejectedCount} files failed, ${compiled.length} total results`,
      );

      return compiled;
    });
  }

  private createCompilationContext(
    namespace: string | undefined,
    fileName: string,
  ): any {
    return {
      namespace: namespace ? { toString: () => namespace } : null,
      version: DEFAULT_SALESFORCE_API_VERSION,
      sourceType: 'FILE',
      referencingType: null,
      enclosingTypes: [],
      parentTypes: [],
      isStaticContext: false,
    };
  }

  private createSymbolProvider(): any {
    return {
      find: (referencingType: any, fullName: string) => null,
      findBuiltInType: (name: string) => null,
      findSObjectType: (name: string) => null,
      findUserType: (name: string, namespace?: string) => null,
      findExternalType: (name: string, packageName: string) => null,
    };
  }

  /**
   * Compile using layered listeners for incremental symbol collection
   * @param fileContent The source code content
   * @param fileName The file name/URI
   * @param layers The detail levels to apply ('public-api', 'protected', 'private')
   * @param existingSymbolTable Optional existing SymbolTable to enrich
   * @param options Compilation options including dependency enforcement
   * @returns Compilation result with enriched SymbolTable
   */
  public compileLayered(
    fileContent: string,
    fileName: string = 'unknown.cls',
    layers: DetailLevel[],
    existingSymbolTable?: SymbolTable,
    options: LayeredCompilationOptions = {},
  ): CompilationResult<SymbolTable> {
    this.logger.debug(
      () =>
        `Starting layered compilation of ${fileName} with layers: ${layers.join(', ')}`,
    );

    try {
      // Enforce dependencies: if layer n is requested, include all layers < n
      const enforceDependencies = options.enforceDependencies !== false; // Default: true
      const requestedLayers = enforceDependencies
        ? this.ensureDependencies(layers)
        : layers;

      this.logger.debug(
        () =>
          `Layers after dependency enforcement: ${requestedLayers.join(', ')}`,
      );

      // Create or reuse parse tree
      const { parseTree, errorListener } = this.createParseTree(
        fileContent,
        fileName,
      );

      // Start with existing SymbolTable or create new one
      const symbolTable = existingSymbolTable || new SymbolTable();
      symbolTable.setFileUri(fileName);

      // Apply listeners in order (public-api -> protected -> private)
      const walker = new ParseTreeWalker();
      const namespace = options.projectNamespace || this.projectNamespace;

      for (const layer of requestedLayers) {
        const listener = this.createListenerForLayer(layer, symbolTable);

        listener.setErrorListener(errorListener);
        listener.setCurrentFileUri(fileName);

        if (namespace && typeof listener.setProjectNamespace === 'function') {
          listener.setProjectNamespace(namespace);
        }

        // Walk the same parse tree with this listener
        walker.walk(listener, parseTree);

        this.logger.debug(
          () =>
            `Applied ${layer} listener to ${fileName}, symbols: ${symbolTable.getAllSymbols().length}`,
        );
      }

      // Optionally collect references using dedicated listener
      const collectReferences = options.collectReferences === true;
      const resolveReferences =
        options.resolveReferences !== false && collectReferences;

      if (collectReferences) {
        const referenceCollector = new ApexReferenceCollectorListener(
          symbolTable,
        );
        referenceCollector.setErrorListener(errorListener);
        referenceCollector.setCurrentFileUri(fileName);
        if (
          namespace &&
          typeof referenceCollector.setProjectNamespace === 'function'
        ) {
          referenceCollector.setProjectNamespace(namespace);
        }

        // Walk parse tree again to collect references
        walker.walk(referenceCollector, parseTree);

        // Optionally resolve references
        if (resolveReferences) {
          const resolver = new ApexReferenceResolver();
          resolver.resolveSameFileReferences(symbolTable, fileName);
        }
      }

      // Handle namespace resolution if needed (similar to regular compile)
      const compilationContext = this.createCompilationContext(
        namespace,
        fileName,
      );
      const symbolProvider = this.createSymbolProvider();
      this.namespaceResolutionService.resolveDeferredReferences(
        symbolTable,
        compilationContext,
        symbolProvider,
      );

      const result: CompilationResult<SymbolTable> = {
        fileName,
        result: symbolTable,
        errors: errorListener.getErrors(),
        warnings: [],
      };

      this.logger.debug(
        () =>
          `Layered compilation completed for ${fileName}: ` +
          `${result.errors.length} errors, ` +
          `detail levels applied: ${requestedLayers.join(', ')}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        () => `Unexpected error during layered compilation of ${fileName}`,
      );
      const errorObject: ApexError = {
        type: 'semantic' as any,
        severity: 'error' as any,
        message: error instanceof Error ? error.message : String(error),
        line: 0,
        column: 0,
        fileUri: fileName,
      };
      return {
        fileName,
        result: existingSymbolTable || null,
        errors: [errorObject],
        warnings: [],
      };
    }
  }

  /**
   * Ensure all required dependency layers are included
   * Layer 1 (public-api) has no dependencies
   * Layer 2 (protected) requires Layer 1
   * Layer 3 (private) requires Layers 1 and 2
   */
  private ensureDependencies(requestedLayers: DetailLevel[]): DetailLevel[] {
    const layerOrder: Record<DetailLevel, number> = {
      'public-api': 1,
      protected: 2,
      private: 3,
      full: 4,
    };

    const includedLayers = new Set<DetailLevel>();

    // Add all requested layers and their dependencies
    for (const layer of requestedLayers) {
      const layerNum = layerOrder[layer] || 0;

      // Include all layers < layerNum
      for (const [level, num] of Object.entries(layerOrder)) {
        if (num < layerNum) {
          includedLayers.add(level as DetailLevel);
        }
      }

      // Include the requested layer itself
      includedLayers.add(layer);
    }

    // Return in order
    const ordered: DetailLevel[] = [];
    if (includedLayers.has('public-api')) ordered.push('public-api');
    if (includedLayers.has('protected')) ordered.push('protected');
    if (includedLayers.has('private')) ordered.push('private');
    if (includedLayers.has('full')) ordered.push('full');

    return ordered;
  }

  /**
   * Create the appropriate listener for a given detail level
   */
  private createListenerForLayer(
    layer: DetailLevel,
    symbolTable: SymbolTable,
  ): LayeredSymbolListenerBase {
    switch (layer) {
      case 'public-api':
        return new VisibilitySymbolListener('public-api', symbolTable);
      case 'protected':
        return new VisibilitySymbolListener('protected', symbolTable);
      case 'private':
        return new VisibilitySymbolListener('private', symbolTable);
      case 'full':
        // For 'full', use ApexSymbolCollectorListener with 'full' detail level
        // This collects all symbols (public, protected, private) in a single walk
        return new ApexSymbolCollectorListener(symbolTable, 'full') as any;
      default:
        throw new Error(`Unknown detail level: ${layer}`);
    }
  }
}
