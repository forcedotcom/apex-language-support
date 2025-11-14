/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CommonTokenStream, Token, ParserRuleContext } from 'antlr4ts';
import { getLogger } from '@salesforce/apex-lsp-shared';

import { BaseApexParserListener } from './BaseApexParserListener';
import { SymbolKind, Range } from '../../types/symbol';

/**
 * Represents a comment found in the source code
 */
export interface ApexComment {
  /** The raw text content of the comment */
  text: string;
  /** The type of comment */
  type: CommentType;
  /** The range of the comment in the source code */
  range: Range;
  /** Original token index in the stream */
  tokenIndex: number;
  /** Whether this comment contains documentation patterns */
  isDocumentation?: boolean;
}

/**
 * Types of comments supported
 */
export const enum CommentType {
  /** Single-line comment starting with // */
  Line = 'line',
  /** Multi-line comment between slash-star and star-slash */
  Block = 'block',
}

/**
 * Types of associations between comments and symbols
 */
export const enum CommentAssociationType {
  /** Comment appears before the symbol (typical documentation) */
  Preceding = 'preceding',
  /** Comment appears on the same line as the symbol */
  Inline = 'inline',
  /** Comment appears inside the symbol's body */
  Internal = 'internal',
  /** Comment appears after the symbol */
  Trailing = 'trailing',
}

/**
 * Represents an association between a comment and a symbol
 */
export interface CommentAssociation {
  /** The comment being associated */
  comment: ApexComment;
  /** The symbol the comment is associated with */
  symbolKey: string;
  /** The type of association */
  associationType: CommentAssociationType;
  /** Confidence level of this association (0-1) */
  confidence: number;
  /** Distance in lines between comment and symbol */
  distance: number;
  /** Kind of the associated symbol (used for prioritization) */
  symbolKind?: SymbolKind;
}

/**
 * Configuration for comment association rules
 */
export interface CommentAssociationConfig {
  /** Maximum lines between a preceding comment and symbol */
  maxPrecedingDistance: number;
  /** Maximum lines between a trailing comment and symbol */
  maxTrailingDistance: number;
  /** Boost confidence for documentation-style comments */
  documentationBoost: number;
  /** Minimum confidence threshold for associations */
  minConfidence: number;
}

/**
 * Default configuration for comment association
 */
export const DEFAULT_ASSOCIATION_CONFIG: CommentAssociationConfig = {
  maxPrecedingDistance: 3,
  maxTrailingDistance: 1,
  documentationBoost: 0.3,
  minConfidence: 0.5,
};

/**
 * Listener that collects comments from the token stream during parsing.
 * Uses the Token Stream Analysis approach to extract comments from hidden channels.
 */
export class ApexCommentCollectorListener extends BaseApexParserListener<
  ApexComment[]
> {
  private readonly logger = getLogger();
  private comments: ApexComment[] = [];
  private tokenStream: CommonTokenStream | null = null;
  private processedTokens = new Set<number>();
  private includeSingleLineComments: boolean;

  /**
   * Create a new comment collector listener
   * @param includeSingleLineComments Whether to include single-line (//) comments (default: false)
   */
  constructor(includeSingleLineComments: boolean = false) {
    super();
    this.includeSingleLineComments = includeSingleLineComments;
  }

  /**
   * Set the token stream to extract comments from.
   * This should be called before walking the parse tree.
   * @param tokenStream The CommonTokenStream containing all tokens including hidden ones
   */
  setTokenStream(tokenStream: CommonTokenStream): void {
    this.tokenStream = tokenStream;
  }

  /**
   * Called when entering any rule - use this to collect nearby comments
   */
  enterEveryRule(ctx: ParserRuleContext): void {
    if (!this.tokenStream) {
      return;
    }

    try {
      // Get hidden tokens to the left of the current context's start token
      const startTokenIndex = ctx.start.tokenIndex;
      const hiddenTokens =
        this.tokenStream.getHiddenTokensToLeft(startTokenIndex);

      if (hiddenTokens) {
        for (const token of hiddenTokens) {
          this.processCommentToken(token);
        }
      }

      // Also check for hidden tokens to the right of the stop token
      if (ctx.stop) {
        const stopTokenIndex = ctx.stop.tokenIndex;
        const rightHiddenTokens =
          this.tokenStream.getHiddenTokensToRight(stopTokenIndex);

        if (rightHiddenTokens) {
          for (const token of rightHiddenTokens) {
            this.processCommentToken(token);
          }
        }
      }
    } catch (error) {
      this.logger.warn(
        () => `Error collecting comments in enterEveryRule: ${error}`,
      );
    }
  }

  /**
   * Called when exiting the root rule - collect any remaining comments
   */
  exitEveryRule(ctx: ParserRuleContext): void {
    if (!this.tokenStream || ctx.parent !== null) {
      return; // Only process at the root level to avoid duplication
    }

    try {
      // Get all tokens and process any remaining comment tokens
      const allTokens = this.tokenStream.getTokens();
      for (const token of allTokens) {
        if (
          this.isCommentToken(token) &&
          !this.processedTokens.has(token.tokenIndex)
        ) {
          this.processCommentToken(token);
        }
      }

      this.logger.debug(
        () => `Collected ${this.comments.length} total comments`,
      );
    } catch (error) {
      this.logger.error(() => `Error collecting remaining comments: ${error}`);
    }
  }

  /**
   * Process a single token that might be a comment
   */
  private processCommentToken(token: Token): void {
    if (
      !this.isCommentToken(token) ||
      this.processedTokens.has(token.tokenIndex)
    ) {
      return;
    }

    try {
      this.processedTokens.add(token.tokenIndex);

      const text = token.text || '';
      const isBlockComment = text.startsWith('/*');

      // Skip single-line comments if not requested
      if (!isBlockComment && !this.includeSingleLineComments) {
        return;
      }

      const lines = text.split('\n');

      const comment: ApexComment = {
        text: text,
        type: isBlockComment ? CommentType.Block : CommentType.Line,
        range: {
          startLine: token.line,
          startColumn: token.charPositionInLine,
          endLine: token.line + lines.length - 1,
          endColumn:
            lines.length > 1
              ? lines[lines.length - 1].length
              : token.charPositionInLine + text.length,
        },
        tokenIndex: token.tokenIndex,
        isDocumentation: this.isDocumentationComment(text),
      };

      this.comments.push(comment);
    } catch (error) {
      this.logger.error(() => `Error processing comment token: ${error}`);
    }
  }

  /**
   * Check if a token represents a comment
   */
  private isCommentToken(token: Token): boolean {
    const text = token.text || '';
    return text.startsWith('//') || text.startsWith('/*');
  }

  /**
   * Determine if a comment appears to be documentation based on common patterns
   */
  private isDocumentationComment(text: string): boolean {
    // Common documentation patterns
    const docPatterns = [
      /^\/\*\*/, // JavaDoc style /** */
      /^\/\*!/, // Some documentation tools use /*! */
      /^\/\/\//, // Triple slash comments
      /^\/\/\s*@/, // Comments starting with @annotations
      /^\/\*\s*@/, // Block comments with @annotations
    ];

    return docPatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Get all collected comments
   */
  getResult(): ApexComment[] {
    return structuredClone(this.comments); // Return a copy to prevent external modification
  }

  /**
   * Create a new instance for processing multiple files
   */
  createNewInstance(): BaseApexParserListener<ApexComment[]> {
    return new ApexCommentCollectorListener(this.includeSingleLineComments);
  }

  /**
   * Get comments filtered by type
   */
  getCommentsByType(type: CommentType): ApexComment[] {
    return this.comments.filter((comment) => comment.type === type);
  }

  /**
   * Get only documentation comments
   */
  getDocumentationComments(): ApexComment[] {
    return this.comments.filter((comment) => comment.isDocumentation === true);
  }

  /**
   * Get comments within a specific line range
   */
  getCommentsInRange(startLine: number, endLine: number): ApexComment[] {
    return this.comments.filter(
      (comment) =>
        comment.range.startLine >= startLine &&
        comment.range.endLine <= endLine,
    );
  }
}
