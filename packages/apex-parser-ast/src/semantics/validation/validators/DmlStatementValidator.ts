/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { CharStreams, CommonTokenStream } from 'antlr4ts';
import {
  ApexLexer,
  ApexParser,
  CaseInsensitiveInputStream,
  CompilationUnitContext,
  TriggerUnitContext,
  BlockContext,
  ParseTreeWalker,
  InsertStatementContext,
  UpdateStatementContext,
  DeleteStatementContext,
  UndeleteStatementContext,
  UpsertStatementContext,
  MergeStatementContext,
} from '@apexdevtools/apex-parser';
import type {
  SymbolTable,
  SymbolLocation,
  VariableSymbol,
} from '../../../types/symbol';
import { SymbolKind } from '../../../types/symbol';
import type {
  ValidationResult,
  ValidationErrorInfo,
  ValidationWarningInfo,
} from '../ValidationResult';
import type { ValidationOptions } from '../ValidationTier';
import { ValidationTier } from '../ValidationTier';
import { ValidationError, type Validator } from '../ValidatorRegistry';
import { localizeTyped } from '../../../i18n/messageInstance';
import { ErrorCodes } from '../../../generated/ErrorCodes';
import { BaseApexParserListener } from '../../../parser/listeners/BaseApexParserListener';
import type { ParserRuleContext } from 'antlr4ts';
import { STANDARD_SOBJECT_TYPES } from '../../../constants/constants';

/**
 * Helper function to create SymbolLocation from parse tree context
 */
function getLocationFromContext(ctx: ParserRuleContext): SymbolLocation {
  const start = ctx.start;
  const stop = ctx.stop || start;
  const textLength = stop.text?.length || 0;

  const symbolRange = {
    startLine: start.line,
    startColumn: start.charPositionInLine,
    endLine: stop.line,
    endColumn: stop.charPositionInLine + textLength,
  };

  return {
    symbolRange,
    identifierRange: symbolRange,
  };
}

/**
 * Collected DML statement with optional merge/upsert metadata
 */
type DmlStatementEntry = {
  ctx: ParserRuleContext;
  operation: string;
  expressionText: string;
  mergeRole?: 'master' | 'duplicates';
  upsertHasFieldSpec?: boolean;
};

/**
 * Listener to collect DML statement information
 */
class DmlStatementListener extends BaseApexParserListener<void> {
  private dmlStatements: DmlStatementEntry[] = [];

  enterInsertStatement(ctx: InsertStatementContext): void {
    const expr = ctx.expression();
    if (expr) {
      this.dmlStatements.push({
        ctx,
        operation: 'insert',
        expressionText: expr.text || '',
      });
    }
  }

  enterUpdateStatement(ctx: UpdateStatementContext): void {
    const expr = ctx.expression();
    if (expr) {
      this.dmlStatements.push({
        ctx,
        operation: 'update',
        expressionText: expr.text || '',
      });
    }
  }

  enterDeleteStatement(ctx: DeleteStatementContext): void {
    const expr = ctx.expression();
    if (expr) {
      this.dmlStatements.push({
        ctx,
        operation: 'delete',
        expressionText: expr.text || '',
      });
    }
  }

  enterUndeleteStatement(ctx: UndeleteStatementContext): void {
    const expr = ctx.expression();
    if (expr) {
      this.dmlStatements.push({
        ctx,
        operation: 'undelete',
        expressionText: expr.text || '',
      });
    }
  }

  enterUpsertStatement(ctx: UpsertStatementContext): void {
    const expr = ctx.expression();
    if (expr) {
      this.dmlStatements.push({
        ctx,
        operation: 'upsert',
        expressionText: expr.text || '',
        upsertHasFieldSpec: ctx.qualifiedName() !== undefined,
      });
    }
  }

  enterMergeStatement(ctx: MergeStatementContext): void {
    // Merge has two expressions - check both
    const expressions = ctx.expression();
    if (expressions && expressions.length >= 1) {
      // Check first expression (master record)
      this.dmlStatements.push({
        ctx: expressions[0],
        operation: 'merge',
        expressionText: expressions[0].text || '',
        mergeRole: 'master',
      });
      // Check second expression (duplicate records) if present
      if (expressions.length >= 2) {
        this.dmlStatements.push({
          ctx: expressions[1],
          operation: 'merge',
          expressionText: expressions[1].text || '',
          mergeRole: 'duplicates',
        });
      }
    }
  }

  getDmlStatements(): DmlStatementEntry[] {
    return this.dmlStatements;
  }

  getResult(): void {
    return undefined as void;
  }
}

/**
 * Check if expression text represents an SObject or SObject list type
 * Uses text-based heuristics and symbol table lookup for TIER 1 validation
 *
 * For TIER 1, we detect:
 * - Obvious non-SObject types (primitives, collections of primitives)
 * - Variable types from symbol table (if available)
 * - Method calls and complex expressions are allowed (require TIER 2 resolution)
 */
function isSObjectTypeExpression(
  expressionText: string,
  symbolTable?: SymbolTable,
): boolean {
  if (!expressionText) {
    return false;
  }

  const normalized = expressionText.trim();

  // Check for List<PrimitiveType> or Set<PrimitiveType> - these are definitely not SObject lists
  const listPattern = /^(List|Set)\s*<\s*([^>]+)\s*>$/i;
  const listMatch = normalized.match(listPattern);
  if (listMatch) {
    const elementType = listMatch[2].trim();
    // If it's a known primitive type, it's not an SObject list
    if (isPrimitiveTypeName(elementType)) {
      return false;
    }
    // If it's a known SObject type, it's valid
    if (isSObjectTypeName(elementType)) {
      return true;
    }
    // Unknown type - allow it (could be SObject, variable name, etc.)
    return true;
  }

  // Check for Map - Maps are not valid for DML
  if (normalized.match(/^Map\s*</i)) {
    return false;
  }

  // Check for direct primitive types - these are definitely not SObject
  if (isPrimitiveTypeName(normalized)) {
    return false;
  }

  // Check for direct SObject type - these are valid
  if (isSObjectTypeName(normalized)) {
    return true;
  }

  // Try to look up variable in symbol table (for simple identifier expressions)
  if (symbolTable && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(normalized)) {
    // Try case-sensitive lookup first
    let variableSymbol = symbolTable.lookup(normalized, null);

    // If not found, try case-insensitive lookup
    if (!variableSymbol) {
      const allSymbols = symbolTable.getAllSymbols();
      variableSymbol = allSymbols.find(
        (s) =>
          (s.kind === SymbolKind.Variable ||
            s.kind === SymbolKind.Parameter ||
            s.kind === SymbolKind.Field) &&
          s.name.toLowerCase() === normalized.toLowerCase(),
      );
    }

    if (
      variableSymbol &&
      (variableSymbol.kind === SymbolKind.Variable ||
        variableSymbol.kind === SymbolKind.Parameter ||
        variableSymbol.kind === SymbolKind.Field)
    ) {
      const varSymbol = variableSymbol as VariableSymbol;
      if (varSymbol.type) {
        const typeName = varSymbol.type.name || '';
        // If variable type is a primitive, it's not an SObject
        if (varSymbol.type.isPrimitive || isPrimitiveTypeName(typeName)) {
          return false;
        }
        // If variable type is a collection, check element type
        if (varSymbol.type.isCollection && varSymbol.type.typeParameters) {
          const elementType = varSymbol.type.typeParameters[0];
          if (elementType) {
            // If collection element is a primitive, it's not an SObject list
            if (
              elementType.isPrimitive ||
              isPrimitiveTypeName(elementType.name || '')
            ) {
              return false;
            }
            // If collection element is an SObject type, it's valid
            if (isSObjectTypeName(elementType.name || '')) {
              return true;
            }
          }
        }
        // If variable type is an SObject type, it's valid
        if (isSObjectTypeName(typeName)) {
          return true;
        }
      }
    }
  }

  // Everything else (method calls, complex expressions, unknown variables) - allow it
  // We can't determine type without TIER 2 resolution
  return true;
}

/**
 * Check if a type name is a primitive type
 */
function isPrimitiveTypeName(typeName: string): boolean {
  if (!typeName) {
    return false;
  }

  const normalized = typeName.trim().toLowerCase();
  const primitiveTypes = [
    'string',
    'integer',
    'long',
    'double',
    'decimal',
    'boolean',
    'date',
    'datetime',
    'time',
    'id',
    'blob',
    'object',
  ];

  return primitiveTypes.includes(normalized);
}

/**
 * Check if a type name is an SObject type
 */
function isSObjectTypeName(typeName: string): boolean {
  if (!typeName) {
    return false;
  }

  const normalized = typeName.trim();

  // Direct SObject type
  if (normalized === 'SObject') {
    return true;
  }

  // Standard SObject types
  if (STANDARD_SOBJECT_TYPES.has(normalized)) {
    return true;
  }

  // Custom SObject types (end with __c, __kav, __ka, __x)
  if (
    normalized.endsWith('__c') ||
    normalized.endsWith('__kav') ||
    normalized.endsWith('__ka') ||
    normalized.endsWith('__x')
  ) {
    return true;
  }

  // Check for qualified names (e.g., Schema.Account)
  const parts = normalized.split('.');
  if (parts.length === 2) {
    const typePart = parts[1];
    if (
      typePart === 'SObject' ||
      STANDARD_SOBJECT_TYPES.has(typePart) ||
      typePart.endsWith('__c') ||
      typePart.endsWith('__kav') ||
      typePart.endsWith('__ka') ||
      typePart.endsWith('__x')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a type name is a concrete SObject type (not generic SObject or List<SObject>).
 * Merge and upsert with field spec require concrete types.
 */
function isConcreteSObjectType(
  typeName: string,
  symbolTable?: SymbolTable,
): boolean {
  if (!typeName) {
    return false;
  }

  const normalized = typeName.trim();

  // Generic SObject is NOT concrete
  if (normalized === 'SObject') {
    return false;
  }

  // List<SObject> or Set<SObject> is NOT concrete
  const listPattern = /^(List|Set)\s*<\s*([^>]+)\s*>$/i;
  const listMatch = normalized.match(listPattern);
  if (listMatch) {
    const elementType = listMatch[2].trim();
    if (elementType === 'SObject') {
      return false;
    }
    return isConcreteSObjectType(elementType, symbolTable);
  }

  // Check for qualified names (e.g., Schema.Account)
  const parts = normalized.split('.');
  const typePart = parts.length === 2 ? parts[1] : normalized;
  if (typePart === 'SObject') {
    return false;
  }

  // Concrete: standard SObject or custom object pattern
  if (STANDARD_SOBJECT_TYPES.has(typePart)) {
    return true;
  }
  if (
    typePart.endsWith('__c') ||
    typePart.endsWith('__kav') ||
    typePart.endsWith('__ka') ||
    typePart.endsWith('__x')
  ) {
    return true;
  }

  // Variable lookup: resolve from symbol table
  if (symbolTable && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(normalized)) {
    let variableSymbol = symbolTable.lookup(normalized, null);
    if (!variableSymbol) {
      const allSymbols = symbolTable.getAllSymbols();
      variableSymbol = allSymbols.find(
        (s) =>
          (s.kind === SymbolKind.Variable ||
            s.kind === SymbolKind.Parameter ||
            s.kind === SymbolKind.Field) &&
          s.name.toLowerCase() === normalized.toLowerCase(),
      );
    }
    if (
      variableSymbol &&
      (variableSymbol.kind === SymbolKind.Variable ||
        variableSymbol.kind === SymbolKind.Parameter ||
        variableSymbol.kind === SymbolKind.Field)
    ) {
      const varSymbol = variableSymbol as VariableSymbol;
      if (varSymbol.type) {
        const name = varSymbol.type.name || '';
        if (varSymbol.type.isCollection && varSymbol.type.typeParameters?.[0]) {
          return isConcreteSObjectType(
            varSymbol.type.typeParameters[0].name || '',
            symbolTable,
          );
        }
        return isConcreteSObjectType(name, symbolTable);
      }
    }
  }

  // Unknown - allow (could be concrete from method call etc.)
  return true;
}

/**
 * Get resolved type for expression (for merge/upsert concrete type checks).
 * Returns inferred type from expression text and symbol table.
 */
function getExpressionType(
  expressionText: string,
  symbolTable?: SymbolTable,
): string | null {
  if (!expressionText) {
    return null;
  }

  const normalized = expressionText.trim();

  // List<X> or Set<X>
  const listPattern = /^(List|Set)\s*<\s*([^>]+)\s*>$/i;
  const listMatch = normalized.match(listPattern);
  if (listMatch) {
    return `List<${listMatch[2].trim()}>`;
  }

  // Simple identifier - lookup variable type
  if (symbolTable && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(normalized)) {
    let variableSymbol = symbolTable.lookup(normalized, null);
    if (!variableSymbol) {
      const allSymbols = symbolTable.getAllSymbols();
      variableSymbol = allSymbols.find(
        (s) =>
          (s.kind === SymbolKind.Variable ||
            s.kind === SymbolKind.Parameter ||
            s.kind === SymbolKind.Field) &&
          s.name.toLowerCase() === normalized.toLowerCase(),
      );
    }
    if (
      variableSymbol &&
      (variableSymbol.kind === SymbolKind.Variable ||
        variableSymbol.kind === SymbolKind.Parameter ||
        variableSymbol.kind === SymbolKind.Field)
    ) {
      const varSymbol = variableSymbol as VariableSymbol;
      if (varSymbol.type?.name) {
        if (varSymbol.type.isCollection && varSymbol.type.typeParameters?.[0]) {
          return `List<${varSymbol.type.typeParameters[0].name || 'SObject'}>`;
        }
        return varSymbol.type.name;
      }
    }
  }

  return null;
}

/**
 * Extract element type from List<X> or return as-is for single SObject
 */
function getConcreteSObjectTypeFromExpression(
  typeOrExpr: string,
  symbolTable?: SymbolTable,
): string | null {
  const listPattern = /^List\s*<\s*([^>]+)\s*>$/i;
  const match = typeOrExpr.match(listPattern);
  if (match) {
    return match[1].trim();
  }
  return typeOrExpr;
}

/**
 * Validates DML statements according to Apex semantic rules.
 *
 * Rules:
 * - INSERT, UPDATE, DELETE, UNDELETE, UPSERT require SObject or List<SObject> types
 * - MERGE requires two SObject expressions (master and duplicate records)
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * @see prioritize-missing-validations.md Phase 7.2
 */
export const DmlStatementValidator: Validator = {
  id: 'dml-statement',
  name: 'DML Statement Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 9, // Run after ExpressionTypeValidator
  prerequisites: {
    requiredDetailLevel: 'private', // Need private to access variable types
    requiresReferences: false,
    requiresCrossFileResolution: false,
  },

  validate: (
    symbolTable: SymbolTable,
    options: ValidationOptions,
  ): Effect.Effect<ValidationResult, ValidationError> =>
    Effect.gen(function* () {
      const errors: ValidationErrorInfo[] = [];
      const warnings: ValidationWarningInfo[] = [];

      // Source content is required for this validator
      if (!options.sourceContent) {
        yield* Effect.logDebug(
          'DmlStatementValidator: sourceContent not provided, skipping validation',
        );
        return {
          isValid: true,
          errors: [],
          warnings: [],
        };
      }

      const sourceContent = options.sourceContent;
      const fileUri = symbolTable.getFileUri() || 'unknown.cls';

      try {
        // Use cached parse tree if available, otherwise parse source content
        let parseTree:
          | CompilationUnitContext
          | TriggerUnitContext
          | BlockContext;
        if (options.parseTree) {
          // Use cached parse tree from DocumentStateCache
          parseTree = options.parseTree;
        } else {
          // Fallback to parsing source content
          const isTrigger = fileUri.endsWith('.trigger');
          const isAnonymous = fileUri.endsWith('.apex');
          const contentToParse = isAnonymous
            ? `{${sourceContent}}`
            : sourceContent;

          const inputStream = CharStreams.fromString(contentToParse);
          const lexer = new ApexLexer(
            new CaseInsensitiveInputStream(inputStream),
          );
          const tokenStream = new CommonTokenStream(lexer);
          const parser = new ApexParser(tokenStream);

          // Suppress error listeners to avoid console noise
          parser.removeErrorListeners();
          lexer.removeErrorListeners();

          if (isTrigger) {
            parseTree = parser.triggerUnit();
          } else if (isAnonymous) {
            parseTree = parser.block();
          } else {
            parseTree = parser.compilationUnit();
          }
        }

        // Walk the parse tree to collect DML statement information
        const listener = new DmlStatementListener();
        const walker = new ParseTreeWalker();
        walker.walk(listener, parseTree);

        // Validate each DML statement
        const dmlStatements = listener.getDmlStatements();
        let mergeMasterType: string | null = null;

        for (const entry of dmlStatements) {
          const {
            ctx,
            operation,
            expressionText,
            mergeRole,
            upsertHasFieldSpec,
          } = entry;

          // Base check: must be SObject-compatible
          if (!isSObjectTypeExpression(expressionText, symbolTable)) {
            const location = getLocationFromContext(ctx);
            errors.push({
              message: localizeTyped(
                ErrorCodes.INVALID_DML_TYPE,
                expressionText,
              ),
              location,
              code: ErrorCodes.INVALID_DML_TYPE,
            });
            continue;
          }

          // Merge: require concrete SObject types
          if (operation === 'merge' && mergeRole) {
            const resolvedType = getExpressionType(expressionText, symbolTable);
            const concreteType = resolvedType
              ? getConcreteSObjectTypeFromExpression(resolvedType, symbolTable)
              : null;

            if (mergeRole === 'master') {
              if (!isConcreteSObjectType(expressionText, symbolTable)) {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.MERGE_REQUIRES_CONCRETE_TYPE,
                    expressionText,
                  ),
                  location: getLocationFromContext(ctx),
                  code: ErrorCodes.MERGE_REQUIRES_CONCRETE_TYPE,
                });
              } else if (concreteType) {
                mergeMasterType = concreteType;
              }
            } else if (mergeRole === 'duplicates') {
              // Duplicates must be List<ConcreteSObject> matching master.
              // Only validate when we can resolve types (e.g. variable refs).
              const dupType = getExpressionType(expressionText, symbolTable);
              if (dupType) {
                const dupElementType = getConcreteSObjectTypeFromExpression(
                  dupType,
                  symbolTable,
                );
                const isList = /^List\s*<\s*[^>]+\>$/i.test(dupType);
                const isListMatch =
                  isList &&
                  dupElementType &&
                  mergeMasterType &&
                  dupElementType.toLowerCase() ===
                    mergeMasterType.toLowerCase();

                if (
                  !isList ||
                  !dupElementType ||
                  !isConcreteSObjectType(dupElementType, symbolTable) ||
                  (mergeMasterType && !isListMatch)
                ) {
                  errors.push({
                    message: localizeTyped(
                      ErrorCodes.INVALID_MERGE_DUPLICATE_RECORDS,
                    ),
                    location: getLocationFromContext(ctx),
                    code: ErrorCodes.INVALID_MERGE_DUPLICATE_RECORDS,
                  });
                }
              }
            }
          }

          // Upsert with field spec: require concrete SObject type
          if (
            operation === 'upsert' &&
            upsertHasFieldSpec &&
            !isConcreteSObjectType(expressionText, symbolTable)
          ) {
            errors.push({
              message: localizeTyped(ErrorCodes.UPSERT_REQUIRES_CONCRETE_TYPE),
              location: getLocationFromContext(ctx),
              code: ErrorCodes.UPSERT_REQUIRES_CONCRETE_TYPE,
            });
          }
        }

        yield* Effect.logDebug(
          `DmlStatementValidator: checked ${dmlStatements.length} DML statements, ` +
            `found ${errors.length} violations`,
        );

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      } catch (error) {
        yield* Effect.logWarning(
          `DmlStatementValidator: Error during validation: ${error}`,
        );
        return {
          isValid: true,
          errors: [],
          warnings: [],
        };
      }
    }),
};
