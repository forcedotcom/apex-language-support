/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { FoldingRange as LSPFoldingRange } from 'vscode-languageserver-protocol';
import {
  CompilerService,
  ApexFoldingRangeListener,
  ApexComment,
  CommentType,
  FoldingRange,
} from '@salesforce/apex-lsp-parser-ast';
import { getLogger, ApexSettingsManager } from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';

import { ApexStorageInterface } from '../storage/ApexStorageInterface';
import { transformParserToLspPosition } from '../utils/positionUtils';
import { getDocumentStateCache } from '../services/DocumentStateCache';

const logger = getLogger();

/**
 * Provider for Apex folding ranges
 */
export class ApexFoldingRangeProvider {
  private compilerService: CompilerService;

  constructor(private readonly storage: ApexStorageInterface) {
    this.compilerService = new CompilerService();
  }

  /**
   * Get folding ranges for a document (Effect pattern)
   * @param documentUri - The URI of the document to analyze
   * @returns Effect that resolves to array of LSP folding ranges
   */
  public getFoldingRanges(
    documentUri: string,
  ): Effect.Effect<LSPFoldingRange[], never, never> {
    const self = this;
    return Effect.gen(function* () {
      logger.debug(
        () => `Computing folding ranges for document: ${documentUri}`,
      );

      // Get the document from storage
      const document = yield* Effect.tryPromise({
        try: () => self.storage.getDocument(documentUri),
        catch: (error: unknown) => {
          logger.error(
            () =>
              `Storage error for ${documentUri}: ${error instanceof Error ? error.message : String(error)}`,
          );
          return null; // Return null on error
        },
      }).pipe(Effect.catchAll(() => Effect.succeed(null)));

      if (!document) {
        logger.debug(() => `Document not found in storage: ${documentUri}`);
        return [];
      }

      // Check cache first
      const parseCache = getDocumentStateCache();
      const cached = parseCache.getFoldingRangeResult(
        documentUri,
        document.version,
      );

      if (cached) {
        logger.debug(
          () =>
            `Using cached folding ranges for ${documentUri} (version ${document.version})`,
        );
        return self.convertToLSPFoldingRanges(cached.foldingRanges);
      }

      // Create and use the folding range listener
      const listener = new ApexFoldingRangeListener();
      const settingsManager = ApexSettingsManager.getInstance();
      const fileSize = document.getText().length;
      const options = settingsManager.getCompilationOptions(
        'foldingRanges',
        fileSize,
      );

      // Parse the document using the compiler service
      const result = yield* Effect.try({
        try: () =>
          self.compilerService.compile(
            document.getText(),
            documentUri,
            listener,
            options,
          ),
        catch: (error) => {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.error(
            () => `Compiler error for ${documentUri}: ${errorMessage}`,
          );
          return new Error(errorMessage);
        },
      }).pipe(
        Effect.catchAll(() =>
          // Return empty result on compilation error
          Effect.succeed({
            errors: [],
            warnings: [],
            result: null,
          }),
        ),
      );

      if (result.errors.length > 0) {
        logger.debug(() => `Parse errors for ${documentUri}: ${result.errors}`);
        // Continue processing even with errors, as partial folding ranges may still be useful
      }

      const astFoldingRanges = listener.getResult();
      logger.debug(
        () => `Found ${astFoldingRanges.length} folding ranges in AST`,
      );

      // Extract block comments and convert them to folding ranges if comments are available
      let blockCommentRanges: FoldingRange[] = [];
      if ('comments' in result && result.comments) {
        blockCommentRanges = self.convertBlockCommentsToFoldingRanges(
          result.comments,
        );
        logger.debug(
          () => `Found ${blockCommentRanges.length} block comment ranges`,
        );
      }

      // Combine AST folding ranges with block comment ranges
      const allRanges = [...astFoldingRanges, ...blockCommentRanges];

      // Cache the result (merge with existing cache entry)
      parseCache.merge(documentUri, {
        foldingRanges: allRanges,
        documentVersion: document.version,
        documentLength: document.getText().length,
      });

      // Convert to LSP folding ranges
      const lspFoldingRanges = self.convertToLSPFoldingRanges(allRanges);

      logger.debug(
        () => `Converted to ${lspFoldingRanges.length} LSP folding ranges`,
      );
      return lspFoldingRanges;
    });
  }

  /**
   * Convert block comments to folding ranges.
   *
   * @param comments - Comments collected during compilation
   * @returns Array of folding ranges for block comments
   */
  private convertBlockCommentsToFoldingRanges(
    comments: ApexComment[],
  ): FoldingRange[] {
    const blockCommentRanges: FoldingRange[] = [];

    for (const comment of comments) {
      // Only process block comments that span multiple lines
      if (
        comment.type === CommentType.Block &&
        comment.range.endLine > comment.range.startLine
      ) {
        blockCommentRanges.push({
          startLine: comment.range.startLine,
          startColumn: comment.range.startColumn,
          endLine: comment.range.endLine,
          endColumn: comment.range.endColumn,
          kind: 'comment',
          level: 0,
        });

        logger.debug(
          () =>
            `Added block comment folding range: ${comment.range.startLine}-${comment.range.endLine}`,
        );
      }
    }

    return blockCommentRanges;
  }

  /**
   * Convert AST folding ranges to LSP folding ranges.
   *
   * @param astRanges - Folding ranges from the AST
   * @returns LSP-compliant folding ranges
   */
  private convertToLSPFoldingRanges(
    astRanges: FoldingRange[],
  ): LSPFoldingRange[] {
    return astRanges
      .filter((range) => this.isValidFoldingRange(range))
      .map((range) => this.convertToLSPFoldingRange(range))
      .filter((range): range is LSPFoldingRange => range !== null);
  }

  /**
   * Validate that a folding range is valid for LSP.
   *
   * @param range - The AST folding range to validate
   * @returns True if the range is valid
   */
  private isValidFoldingRange(range: FoldingRange): boolean {
    // LSP folding ranges must have start line less than end line
    // and both must be non-negative
    const isValidRange =
      range.startLine >= 0 &&
      range.endLine >= 0 &&
      range.startLine < range.endLine;

    // Log validation for comment ranges
    if (range.kind === 'comment') {
      logger.debug(
        () =>
          `Validating comment folding range: ${range.startLine}-${range.endLine} (valid: ${isValidRange})`,
      );
    }

    return isValidRange;
  }

  /**
   * Convert a single AST folding range to LSP format.
   *
   * @param astRange - The AST folding range
   * @returns LSP folding range or null if invalid
   */
  private convertToLSPFoldingRange(
    astRange: FoldingRange,
  ): LSPFoldingRange | null {
    try {
      const startPosition = transformParserToLspPosition({
        line: astRange.startLine,
        character: astRange.startColumn,
      });

      const endPosition = transformParserToLspPosition({
        line: astRange.endLine,
        character: astRange.endColumn,
      });

      const lspRange: LSPFoldingRange = {
        startLine: startPosition.line,
        endLine: endPosition.line,
      };

      // Add optional properties if they exist
      if (astRange.startColumn !== undefined) {
        lspRange.startCharacter = startPosition.character;
      }

      if (astRange.endColumn !== undefined) {
        lspRange.endCharacter = endPosition.character;
      }

      // Convert folding range kind
      if (astRange.kind) {
        lspRange.kind = this.convertFoldingRangeKind(astRange.kind);
      }

      // Log conversion for comment ranges
      if (astRange.kind === 'comment') {
        logger.debug(
          () =>
            `Converting comment folding range: ${astRange.startLine}-${astRange.endLine} -> ` +
            `${lspRange.startLine}-${lspRange.endLine}`,
        );
      }

      return lspRange;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(() => `Failed to convert folding range: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Convert AST folding range kind to LSP folding range kind.
   *
   * @param astKind - The AST folding range kind
   * @returns LSP folding range kind or undefined
   */
  private convertFoldingRangeKind(astKind: string): string | undefined {
    switch (astKind.toLowerCase()) {
      case 'comment':
        return 'comment';
      case 'region':
        return 'region';
      case 'imports':
        return 'imports';
      default:
        logger.debug(() => `Unknown folding range kind: ${astKind}`);
        return undefined;
    }
  }
}
