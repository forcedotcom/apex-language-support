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
} from '@salesforce/apex-lsp-parser-ast';
import { getLogger } from '@salesforce/apex-lsp-shared';

import { ApexStorageInterface } from '../storage/ApexStorageInterface';
import { ApexSettingsManager } from '@salesforce/apex-lsp-shared';
import { transformParserToLspPosition } from '../utils/positionUtils';

/**
 * Interface for AST folding range
 */
interface ASTFoldingRange {
  startLine: number;
  startColumn?: number;
  endLine: number;
  endColumn?: number;
  kind?: string;
  level?: number;
}

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
   * Get folding ranges for a document
   * @param documentUri - The URI of the document to analyze
   * @returns Array of LSP folding ranges
   */
  public async getFoldingRanges(
    documentUri: string,
  ): Promise<LSPFoldingRange[]> {
    try {
      logger.debug(
        () => `Computing folding ranges for document: ${documentUri}`,
      );

      // Get the document from storage
      const document = await this.storage.getDocument(documentUri);
      if (!document) {
        logger.debug(() => `Document not found in storage: ${documentUri}`);
        return [];
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
      const result = this.compilerService.compile(
        document.getText(),
        documentUri,
        listener,
        options,
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
      let blockCommentRanges: ASTFoldingRange[] = [];
      if ('comments' in result && result.comments) {
        blockCommentRanges = this.convertBlockCommentsToFoldingRanges(
          result.comments,
        );
        logger.debug(
          () => `Found ${blockCommentRanges.length} block comment ranges`,
        );
      }

      // Combine AST folding ranges with block comment ranges
      const allRanges = [...astFoldingRanges, ...blockCommentRanges];

      // Convert to LSP folding ranges
      const lspFoldingRanges = this.convertToLSPFoldingRanges(allRanges);

      logger.debug(
        () => `Converted to ${lspFoldingRanges.length} LSP folding ranges`,
      );
      return lspFoldingRanges;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(
        () =>
          `Error computing folding ranges for ${documentUri}: ${errorMessage}`,
      );
      return [];
    }
  }

  /**
   * Convert block comments to AST folding ranges.
   *
   * @param comments - Comments collected during compilation
   * @returns Array of folding ranges for block comments
   */
  private convertBlockCommentsToFoldingRanges(
    comments: ApexComment[],
  ): ASTFoldingRange[] {
    const blockCommentRanges: ASTFoldingRange[] = [];

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
    astRanges: ASTFoldingRange[],
  ): LSPFoldingRange[] {
    return astRanges
      .filter(this.isValidFoldingRange)
      .map(this.convertToLSPFoldingRange)
      .filter((range): range is LSPFoldingRange => range !== null);
  }

  /**
   * Validate that a folding range is valid for LSP.
   *
   * @param range - The AST folding range to validate
   * @returns True if the range is valid
   */
  private isValidFoldingRange(range: ASTFoldingRange): boolean {
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
    astRange: ASTFoldingRange,
  ): LSPFoldingRange | null {
    try {
      const startPosition = transformParserToLspPosition({
        line: astRange.startLine,
        character: astRange.startColumn ?? 0,
      });

      const endPosition = transformParserToLspPosition({
        line: astRange.endLine,
        character: astRange.endColumn ?? 0,
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
