/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger } from '@salesforce/apex-lsp-shared';

import { ApexSymbol, SymbolKind } from '../types/symbol';
import { isBlockSymbol } from './symbolNarrowing';
import {
  ApexComment,
  CommentAssociation,
  CommentAssociationType,
  CommentAssociationConfig,
  DEFAULT_ASSOCIATION_CONFIG,
  CommentType,
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

    // Filter out block symbols - comments should only be associated with semantic symbols
    const semanticSymbols = symbols.filter((s) => !isBlockSymbol(s));

    // Sort comments and symbols by line number for efficient processing
    const sortedComments = [...comments].sort(
      (a, b) => a.range.startLine - b.range.startLine,
    );
    const sortedSymbols = [...semanticSymbols].sort(
      (a, b) =>
        a.location.symbolRange.startLine - b.location.symbolRange.startLine,
    );

    // Log basic association info
    this.logger.debug(
      `Associating ${sortedComments.length} comments with ${sortedSymbols.length} symbols`,
    );

    // For each comment, find the best symbol association
    for (const comment of sortedComments) {
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
    const commentLine = comment.range.startLine;
    const symbolLine = symbol.location.symbolRange.startLine;
    const distance = Math.abs(commentLine - symbolLine);
    const isBlockComment = comment.type === CommentType.Block;

    // Determine association type and calculate base confidence
    let associationType: CommentAssociationType;
    let baseConfidence: number;

    if (commentLine === symbol.location.identifierRange.startLine) {
      // Inline comment (same line as symbol name)
      associationType = CommentAssociationType.Inline;
      baseConfidence = 0.9;
    } else if (commentLine < symbolLine) {
      // Preceding comment
      // For block comments, allow a slightly larger preceding window since
      // documentation blocks commonly sit several lines above the symbol.
      const allowedPrecedingDistance = this.config.maxPrecedingDistance;
      if (distance > allowedPrecedingDistance) {
        return null;
      }
      associationType = CommentAssociationType.Preceding;
      // Give block comments a higher baseline and gentler distance penalty
      baseConfidence = isBlockComment
        ? Math.max(0.8, 1.0 - (distance / allowedPrecedingDistance) * 0.2)
        : Math.max(0.6, 1.0 - (distance / allowedPrecedingDistance) * 0.3);
    } else {
      // Comment after or inside symbol
      if (this.isCommentInsideSymbol(comment, symbol)) {
        associationType = CommentAssociationType.Internal;
        baseConfidence = 0.7;
      } else {
        // Trailing comment
        if (distance > this.config.maxTrailingDistance) {
          return null;
        }
        associationType = CommentAssociationType.Trailing;
        // Penalize trailing associations for block comments to prefer following symbols
        baseConfidence = isBlockComment ? 0.2 : 0.4;
      }
    }

    // Calculate final confidence with boosts
    let finalConfidence = baseConfidence;

    // Boost for documentation comments
    if (comment.isDocumentation) {
      finalConfidence = Math.min(
        1.0,
        finalConfidence + this.config.documentationBoost,
      );
    }

    // Boost for symbol importance (classes and methods get higher priority)
    if (symbol.kind === SymbolKind.Class || symbol.kind === SymbolKind.Method) {
      finalConfidence = Math.min(1.0, finalConfidence + 0.1);
    }

    const result: CommentAssociation = {
      comment,
      symbolKey: symbol.name,
      associationType,
      confidence: finalConfidence,
      distance,
      symbolKind: symbol.kind,
    };

    return result;
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
    return (
      comment.range.startLine >= startLine && comment.range.startLine <= endLine
    );
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

    // Sort by specificity first, then by confidence, then by distance
    candidates.sort((a, b) => {
      // Priority 1: Same-line associations (Inline, Trailing) get highest priority
      const aIsSameLine =
        a.associationType === CommentAssociationType.Inline ||
        a.associationType === CommentAssociationType.Trailing;
      const bIsSameLine =
        b.associationType === CommentAssociationType.Inline ||
        b.associationType === CommentAssociationType.Trailing;

      if (aIsSameLine !== bIsSameLine) {
        return aIsSameLine ? -1 : 1;
      }

      // Priority 2: Internal associations get priority over preceding ones
      if (
        a.associationType === CommentAssociationType.Internal &&
        b.associationType === CommentAssociationType.Preceding
      ) {
        return -1;
      }
      if (
        b.associationType === CommentAssociationType.Internal &&
        a.associationType === CommentAssociationType.Preceding
      ) {
        return 1;
      }

      // Priority 3: A preceding association for a non-class symbol (e.g., method/field)
      // should outrank an internal association for the class. This ensures method/field
      // documentation is associated with the specific symbol rather than the enclosing class.
      if (
        a.associationType === CommentAssociationType.Preceding &&
        b.associationType === CommentAssociationType.Internal &&
        a.symbolKind !== SymbolKind.Class &&
        b.symbolKind === SymbolKind.Class
      ) {
        return -1;
      }
      if (
        b.associationType === CommentAssociationType.Preceding &&
        a.associationType === CommentAssociationType.Internal &&
        b.symbolKind !== SymbolKind.Class &&
        a.symbolKind === SymbolKind.Class
      ) {
        return 1;
      }

      // Priority 4: Among internal associations, prefer the one with smaller scope (more specific)
      if (
        a.associationType === CommentAssociationType.Internal &&
        b.associationType === CommentAssociationType.Internal
      ) {
        // Calculate scope size (endLine - startLine) - smaller scope means more specific
        const aScopeSize = a.distance; // distance is already calculated
        const bScopeSize = b.distance;
        if (aScopeSize !== bScopeSize) {
          return aScopeSize - bScopeSize; // Smaller scope (distance) gets priority
        }
      }

      // Priority 5: Sort by confidence (highest first)
      if (Math.abs(a.confidence - b.confidence) < 0.01) {
        // Priority 6: Sort by distance (closest first)
        return a.distance - b.distance;
      }
      return b.confidence - a.confidence;
    });

    const best = candidates[0];
    return best;
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
      .sort((a, b) => a.comment.range.startLine - b.comment.range.startLine)
      .map((assoc) => assoc.comment);
  }
}
