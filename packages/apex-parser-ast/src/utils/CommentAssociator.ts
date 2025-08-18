/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger } from '@salesforce/apex-lsp-shared';

import { ApexSymbol, SymbolKind } from '../types/symbol';
import {
  ApexComment,
  CommentAssociation,
  CommentAssociationType,
  CommentAssociationConfig,
  DEFAULT_ASSOCIATION_CONFIG,
} from '../parser/listeners/ApexCommentCollectorListener';

/**
 * Handles the association of comments with symbols based on spatial analysis
 */
export class CommentAssociator {
  private readonly logger = getLogger();
  private readonly config: CommentAssociationConfig;

  constructor(config: Partial<CommentAssociationConfig> = {}) {
    this.config = { ...DEFAULT_ASSOCIATION_CONFIG, ...config };
  }

  /**
   * Associate comments with symbols based on spatial proximity and heuristics
   * @param comments Array of comments to associate
   * @param symbols Array of symbols to associate with
   * @returns Array of comment associations
   */
  public associateComments(
    comments: ApexComment[],
    symbols: ApexSymbol[],
  ): CommentAssociation[] {
    const associations: CommentAssociation[] = [];

    // Sort comments and symbols by line number for efficient processing
    const sortedComments = [...comments].sort(
      (a, b) => a.startLine - b.startLine,
    );
    const sortedSymbols = [...symbols].sort(
      (a, b) =>
        a.location.symbolRange.startLine - b.location.symbolRange.startLine,
    );

    // Debug: Log symbol information
    this.logger.debug(
      `Associating ${sortedComments.length} comments with ${sortedSymbols.length} symbols`,
    );

    // Debug: Log symbol details
    symbols.forEach((symbol, index) => {
      this.logger.debug(
        () =>
          `Symbol[${index}]: ${symbol.name} (${symbol.kind}) at lines ` +
          `${symbol.location.symbolRange.startLine}-${symbol.location.symbolRange.endLine}, ` +
          `identifier at line ${symbol.location.identifierRange.startLine}`,
      );
    });

    // Debug: Log comment details
    comments.forEach((comment, index) => {
      this.logger.debug(
        () =>
          `Comment[${index}]: "${comment.text.substring(0, 30)}..." at line ${comment.startLine}`,
      );
    });

    // For each comment, find the best symbol association
    for (const comment of sortedComments) {
      this.logger.debug(
        () =>
          `Processing comment at line ${comment.startLine}: "${comment.text.substring(0, 30)}..."`,
      );

      const candidateAssociations = this.findCandidateAssociations(
        comment,
        sortedSymbols,
      );

      // Get the best association based on confidence
      const bestAssociation = this.getBestAssociation(candidateAssociations);

      if (
        bestAssociation &&
        bestAssociation.confidence >= this.config.minConfidence
      ) {
        associations.push(bestAssociation);
        this.logger.debug(
          () =>
            `Associated comment at line ${comment.startLine} with symbol '${bestAssociation.symbolKey}' ` +
            `(${bestAssociation.associationType}, confidence: ${bestAssociation.confidence.toFixed(2)})`,
        );
      } else {
        this.logger.debug(
          () =>
            `No suitable association found for comment at line ${comment.startLine}`,
        );
      }
    }

    return associations;
  }

  /**
   * Find all candidate associations for a comment
   */
  private findCandidateAssociations(
    comment: ApexComment,
    symbols: ApexSymbol[],
  ): CommentAssociation[] {
    const candidates: CommentAssociation[] = [];

    for (const symbol of symbols) {
      const association = this.analyzeAssociation(comment, symbol);
      if (association) {
        candidates.push(association);
      }
    }

    return candidates;
  }

  /**
   * Analyze the spatial relationship between a comment and symbol
   */
  private analyzeAssociation(
    comment: ApexComment,
    symbol: ApexSymbol,
  ): CommentAssociation | null {
    const commentLine = comment.startLine;
    const symbolLine = symbol.location.symbolRange.startLine;
    const distance = Math.abs(commentLine - symbolLine);

    // Determine association type and calculate base confidence
    let associationType: CommentAssociationType;
    let baseConfidence: number;

    // Check if comment is on the same line as the symbol identifier
    if (commentLine === symbol.location.identifierRange.startLine) {
      // Inline comment (same line as symbol name)
      associationType = CommentAssociationType.Inline;
      baseConfidence = 0.9;
    } else if (commentLine < symbolLine) {
      // Preceding comment
      if (distance > this.config.maxPrecedingDistance) {
        return null; // Too far away
      }
      associationType = CommentAssociationType.Preceding;
      baseConfidence = Math.max(
        0.3,
        1.0 - (distance / this.config.maxPrecedingDistance) * 0.5,
      );
    } else {
      // Comment is after the symbol
      // Check if comment is inside the symbol's body first
      if (this.isCommentInsideSymbol(comment, symbol)) {
        // Check if it's a trailing comment (same line as symbol end)
        if (commentLine === symbol.location.symbolRange.endLine) {
          associationType = CommentAssociationType.Trailing;
          baseConfidence = 0.6;
        } else {
          associationType = CommentAssociationType.Internal;
          baseConfidence = 0.4;
        }
      } else {
        // Trailing comment (after symbol but not inside)
        if (distance > this.config.maxTrailingDistance) {
          return null; // Too far away
        }
        associationType = CommentAssociationType.Trailing;
        baseConfidence = Math.max(
          0.2,
          1.0 - (distance / this.config.maxTrailingDistance) * 0.3,
        );
      }
    }

    // Calculate final confidence with boosts
    let finalConfidence = baseConfidence;

    // Boost for documentation comments
    if (
      comment.isDocumentation &&
      associationType === CommentAssociationType.Preceding
    ) {
      finalConfidence = Math.min(
        1.0,
        finalConfidence + this.config.documentationBoost,
      );
    }

    // Boost for symbol importance (classes and methods get higher priority)
    if (symbol.kind === SymbolKind.Class || symbol.kind === SymbolKind.Method) {
      finalConfidence = Math.min(1.0, finalConfidence + 0.1);
    }

    // Penalty for very short comments (likely not documentation)
    if (
      comment.text.trim().length < 10 &&
      associationType === CommentAssociationType.Preceding
    ) {
      finalConfidence *= 0.7;
    }

    return {
      comment,
      symbolKey: symbol.name, // Use symbol.name instead of symbol.key.name for consistency
      associationType,
      confidence: finalConfidence,
      distance,
    };
  }

  /**
   * Check if a comment is inside a symbol's body (for classes and methods)
   */
  private isCommentInsideSymbol(
    comment: ApexComment,
    symbol: ApexSymbol,
  ): boolean {
    // Use the full symbol range to determine if comment is inside
    const { startLine, endLine } = symbol.location.symbolRange;

    // Check if comment is within the symbol's scope
    return comment.startLine >= startLine && comment.startLine <= endLine;
  }

  /**
   * Get the best association from a list of candidates
   */
  private getBestAssociation(
    candidates: CommentAssociation[],
  ): CommentAssociation | null {
    if (candidates.length === 0) {
      return null;
    }

    // Sort by confidence (highest first), then by distance (closest first)
    candidates.sort((a, b) => {
      if (Math.abs(a.confidence - b.confidence) < 0.01) {
        return a.distance - b.distance;
      }
      return b.confidence - a.confidence;
    });

    return candidates[0];
  }

  /**
   * Get associations for a specific symbol
   */
  public getAssociationsForSymbol(
    symbolKey: string,
    associations: CommentAssociation[],
  ): CommentAssociation[] {
    return associations.filter((assoc) => assoc.symbolKey === symbolKey);
  }

  /**
   * Get associations of a specific type
   */
  public getAssociationsByType(
    type: CommentAssociationType,
    associations: CommentAssociation[],
  ): CommentAssociation[] {
    return associations.filter((assoc) => assoc.associationType === type);
  }

  /**
   * Get documentation comments for a symbol (preceding + high confidence)
   */
  public getDocumentationForSymbol(
    symbolKey: string,
    associations: CommentAssociation[],
  ): ApexComment[] {
    return associations
      .filter(
        (assoc) =>
          assoc.symbolKey === symbolKey &&
          assoc.associationType === CommentAssociationType.Preceding &&
          assoc.comment.isDocumentation &&
          assoc.confidence >= 0.7,
      )
      .sort((a, b) => a.comment.startLine - b.comment.startLine)
      .map((assoc) => assoc.comment);
  }
}
