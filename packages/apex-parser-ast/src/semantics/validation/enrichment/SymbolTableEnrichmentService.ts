/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ParserRuleContext } from 'antlr4ts';
import { ExpressionContext } from '@apexdevtools/apex-parser';
import type { SymbolTable, SymbolLocation } from '../../../types/symbol';
import type { SymbolReference } from '../../../types/symbolReference';
import { ReferenceContext } from '../../../types/symbolReference';
import { getLogger } from '@salesforce/apex-lsp-shared';
import type { ExpressionTypeInfo } from '../validators/ExpressionValidator';

const logger = getLogger();

/**
 * Validation data that can be used to enrich symbol tables
 */
export interface ValidationEnrichmentData {
  /**
   * Map of ExpressionContext to literal type discovered during validation
   */
  expressionLiteralTypes?: Map<
    ExpressionContext,
    'integer' | 'long' | 'decimal' | 'string' | 'boolean' | 'null'
  >;
  /**
   * Map of SymbolLocation JSON string to ExpressionTypeInfo
   * Converted from WeakMap<ExpressionContext, ExpressionTypeInfo> for serialization
   */
  resolvedExpressionTypes?: Map<string, ExpressionTypeInfo>;
}

/**
 * Service to enrich SymbolReference objects with validation data
 */
export class SymbolTableEnrichmentService {
  /**
   * Get SymbolLocation from a parse tree context
   */
  private static getLocationFromContext(
    ctx: ParserRuleContext,
  ): SymbolLocation {
    const start = ctx.start;
    const stop = ctx.stop || start;
    const textLength = stop.text?.length || 0;

    return {
      symbolRange: {
        startLine: start.line,
        startColumn: start.charPositionInLine,
        endLine: stop.line,
        endColumn: stop.charPositionInLine + textLength,
      },
      identifierRange: {
        startLine: start.line,
        startColumn: start.charPositionInLine,
        endLine: stop.line,
        endColumn: stop.charPositionInLine + textLength,
      },
    };
  }

  /**
   * Check if a location overlaps with another location
   */
  private static locationsOverlap(
    loc1: SymbolLocation,
    loc2: SymbolLocation,
  ): boolean {
    const range1 = loc1.identifierRange;
    const range2 = loc2.identifierRange;

    // Check if ranges overlap
    return (
      range1.startLine <= range2.endLine &&
      range1.endLine >= range2.startLine &&
      range1.startColumn <= range2.endColumn &&
      range1.endColumn >= range2.startColumn
    );
  }

  /**
   * Find SymbolReference objects that match a given location
   */
  private static findMatchingReferences(
    symbolTable: SymbolTable,
    location: SymbolLocation,
    context?: ReferenceContext,
  ): SymbolReference[] {
    const allReferences = symbolTable.getAllReferences();
    const matchingRefs: SymbolReference[] = [];

    for (const ref of allReferences) {
      if (this.locationsOverlap(ref.location, location)) {
        // If context is specified, only match references with that context
        if (context === undefined || ref.context === context) {
          matchingRefs.push(ref);
        }
      }
    }

    return matchingRefs;
  }

  /**
   * Convert validation literal type to SymbolReference literal type
   */
  private static toSymbolReferenceLiteralType(
    type: 'integer' | 'long' | 'decimal' | 'string' | 'boolean' | 'null',
  ): 'Integer' | 'Long' | 'Decimal' | 'String' | 'Boolean' | 'Null' {
    switch (type) {
      case 'integer':
        return 'Integer';
      case 'long':
        return 'Long';
      case 'decimal':
        return 'Decimal';
      case 'string':
        return 'String';
      case 'boolean':
        return 'Boolean';
      case 'null':
        return 'Null';
    }
  }

  /**
   * Enrich symbol table with validation data
   */
  static enrich(
    symbolTable: SymbolTable,
    enrichmentData: ValidationEnrichmentData,
  ): void {
    let enrichedCount = 0;

    // Enrich with literal types from expressions
    if (enrichmentData.expressionLiteralTypes) {
      for (const [
        exprContext,
        literalType,
      ] of enrichmentData.expressionLiteralTypes.entries()) {
        const location = this.getLocationFromContext(exprContext);
        const matchingRefs = this.findMatchingReferences(
          symbolTable,
          location,
          ReferenceContext.LITERAL,
        );

        if (matchingRefs.length > 0) {
          const refLiteralType = this.toSymbolReferenceLiteralType(literalType);
          for (const ref of matchingRefs) {
            // Only enrich if not already set or if this is more specific
            if (!ref.literalType) {
              ref.literalType = refLiteralType;
              enrichedCount++;
              logger.debug(
                () =>
                  `[SymbolTableEnrichment] Enriched literal type for "${ref.name}" at ` +
                  `${location.identifierRange.startLine}:${location.identifierRange.startColumn} ` +
                  `with type ${refLiteralType}`,
              );
            }
          }
        } else {
          // Try to find any reference at this location (might be part of an expression)
          const anyRefs = this.findMatchingReferences(symbolTable, location);
          if (anyRefs.length > 0) {
            // Check if any of these references are in a chain that contains a literal
            for (const ref of anyRefs) {
              if (ref.chainNodes) {
                // Look for literal nodes in the chain
                for (const node of ref.chainNodes) {
                  if (
                    node.context === ReferenceContext.LITERAL &&
                    !node.literalType
                  ) {
                    const refLiteralType =
                      this.toSymbolReferenceLiteralType(literalType);
                    node.literalType = refLiteralType;
                    enrichedCount++;
                    logger.debug(
                      () =>
                        `[SymbolTableEnrichment] Enriched chain node literal type for "${node.name}" ` +
                        `with type ${refLiteralType}`,
                    );
                  }
                }
              }
            }
          }
        }
      }
    }

    // Enrich with resolved expression types from validation
    const resolvedTypes = enrichmentData.resolvedExpressionTypes;
    if (resolvedTypes && resolvedTypes.size > 0) {
      for (const [locationKey, typeInfo] of resolvedTypes.entries()) {
        try {
          const location: SymbolLocation = JSON.parse(locationKey);
          const matchingRefs = this.findMatchingReferences(
            symbolTable,
            location,
          );
          for (const ref of matchingRefs) {
            // Store expression type information in SymbolReference
            // Note: We may need to extend SymbolReference interface to store this
            // For now, we'll use resolvedTypeId if available
            if (typeInfo.resolvedType && !ref.resolvedTypeId) {
              // Could store in a new field like ref.expressionType = typeInfo.resolvedType
              // For now, just log it
              logger.debug(
                () =>
                  `[SymbolTableEnrichment] Expression type "${typeInfo.resolvedType}" ` +
                  `(source: ${typeInfo.source}) available for "${ref.name}" at ` +
                  `${location.identifierRange.startLine}:${location.identifierRange.startColumn}`,
              );
            }
          }
        } catch (error) {
          logger.debug(
            () =>
              `[SymbolTableEnrichment] Failed to parse location key: ${error}`,
          );
        }
      }
      logger.debug(
        () =>
          `[SymbolTableEnrichment] Processed ${resolvedTypes.size} resolved expression types`,
      );
    }

    logger.debug(
      () =>
        `[SymbolTableEnrichment] Enriched ${enrichedCount} SymbolReference objects`,
    );
  }
}
