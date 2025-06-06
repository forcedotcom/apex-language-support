/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { FoldingRange as LSPFoldingRange } from 'vscode-languageserver';
import { getLogger } from '@salesforce/apex-lsp-logging';
import {
  ApexFoldingRangeListener,
  type FoldingRange as ASTFoldingRange,
  CompilerService,
} from '@salesforce/apex-lsp-parser-ast';

import type { ApexStorageInterface } from '../storage/ApexStorageInterface';

const logger = getLogger();

/**
 * Provider for computing folding ranges in Apex code.
 *
 * This provider uses the Apex AST parser to identify foldable regions
 * and converts them to the LSP-compliant format.
 */
export class ApexFoldingRangeProvider {
  private compilerService: CompilerService;

  constructor(private readonly storage: ApexStorageInterface) {
    this.compilerService = new CompilerService();
  }

  /**
   * Compute folding ranges for the given Apex document.
   *
   * @param documentUri - The URI of the document to analyze
   * @returns Array of LSP folding ranges
   */
  public async getFoldingRanges(
    documentUri: string,
  ): Promise<LSPFoldingRange[]> {
    try {
      logger.debug(`Computing folding ranges for document: ${documentUri}`);

      // Get the document from storage
      const document = await this.storage.getDocument(documentUri);
      if (!document) {
        logger.warn(`Document not found in storage: ${documentUri}`);
        return [];
      }

      // Create and use the folding range listener
      const listener = new ApexFoldingRangeListener();

      // Parse the document using the compiler service
      const result = this.compilerService.compile(
        document.getText(),
        documentUri,
        listener,
      );

      if (result.errors.length > 0) {
        logger.warn(`Parse errors for ${documentUri}:`, result.errors);
        // Continue processing even with errors, as partial folding ranges may still be useful
      }

      const astFoldingRanges = listener.getResult();
      logger.debug(`Found ${astFoldingRanges.length} folding ranges in AST`);

      // Convert AST folding ranges to LSP folding ranges
      const lspFoldingRanges = this.convertToLSPFoldingRanges(astFoldingRanges);

      logger.debug(
        `Converted to ${lspFoldingRanges.length} LSP folding ranges`,
      );
      return lspFoldingRanges;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(
        `Error computing folding ranges for ${documentUri}: ${errorMessage}`,
      );
      return [];
    }
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
    return (
      range.startLine >= 0 &&
      range.endLine >= 0 &&
      range.startLine < range.endLine
    );
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
      const lspRange: LSPFoldingRange = {
        startLine: astRange.startLine - 1, // Convert from 1-based to 0-based
        endLine: astRange.endLine - 1, // Convert from 1-based to 0-based
      };

      // Add optional properties if they exist
      if (astRange.startColumn !== undefined) {
        lspRange.startCharacter = astRange.startColumn;
      }

      if (astRange.endColumn !== undefined) {
        lspRange.endCharacter = astRange.endColumn;
      }

      // Convert folding range kind
      if (astRange.kind) {
        lspRange.kind = this.convertFoldingRangeKind(astRange.kind);
      }

      return lspRange;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to convert folding range: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Convert AST folding range kind to LSP kind.
   *
   * @param astKind - The AST folding range kind
   * @returns LSP folding range kind
   */
  private convertFoldingRangeKind(astKind: string): string | undefined {
    switch (astKind) {
      case 'comment':
        return 'comment';
      case 'imports':
        return 'imports';
      case 'region':
        return 'region';
      default:
        // For unknown kinds, return undefined to let LSP use default
        logger.debug(`Unknown folding range kind: ${astKind}`);
        return undefined;
    }
  }
}
