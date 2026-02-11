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
  InstanceOfExpressionContext,
  ExpressionContext,
  TypeRefContext,
  CastExpressionContext,
} from '@apexdevtools/apex-parser';
import type {
  SymbolTable,
  SymbolLocation,
  TypeSymbol,
  ApexSymbol,
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
import { ISymbolManager } from '../ArtifactLoadingHelper';
import {
  resolveExpressionTypeRecursive,
  type ExpressionTypeInfo,
} from './ExpressionValidator';
import { BaseApexParserListener } from '../../../parser/listeners/BaseApexParserListener';
import type { ParserRuleContext } from 'antlr4ts';

/** Apex primitive types - invalid as instanceof RHS */
const PRIMITIVE_TYPES = new Set([
  'integer',
  'long',
  'decimal',
  'string',
  'boolean',
  'id',
  'blob',
  'date',
  'datetime',
  'time',
  'void',
]);

function getLocationFromContext(ctx: ParserRuleContext): SymbolLocation {
  const start = ctx.start;
  const stop = ctx.stop || start;
  const textLength = (stop as { text?: string }).text?.length ?? 0;
  const symbolRange = {
    startLine: start.line,
    startColumn: start.charPositionInLine,
    endLine: stop.line,
    endColumn: stop.charPositionInLine + textLength,
  };
  return { symbolRange, identifierRange: symbolRange };
}

function extractBaseTypeName(typeName: string): string {
  return typeName.split('<')[0].trim().split('.').pop()?.toLowerCase() ?? '';
}

/**
 * Check if leftType is assignable to rightType (left is subtype of right or same).
 * Uses symbolManager for hierarchy when available.
 */
function isAssignable(
  leftType: string,
  rightType: string,
  allSymbols: ApexSymbol[],
): boolean {
  const left = leftType.toLowerCase();
  const right = rightType.toLowerCase();

  if (left === right) return true;
  if (right === 'object') return !PRIMITIVE_TYPES.has(left);
  if (PRIMITIVE_TYPES.has(left) || PRIMITIVE_TYPES.has(right)) return false;

  const rightSymbol = allSymbols.find(
    (s) =>
      (s.kind === SymbolKind.Class ||
        s.kind === SymbolKind.Interface ||
        s.kind === SymbolKind.Enum) &&
      s.name.toLowerCase() === right,
  ) as TypeSymbol | undefined;

  const leftSymbol = allSymbols.find(
    (s) =>
      (s.kind === SymbolKind.Class ||
        s.kind === SymbolKind.Interface ||
        s.kind === SymbolKind.Enum) &&
      s.name.toLowerCase() === left,
  ) as TypeSymbol | undefined;

  if (leftSymbol && rightSymbol) {
    if (leftSymbol.superClass?.toLowerCase() === right) return true;
    if (leftSymbol.interfaces?.some((i) => i.toLowerCase() === right))
      return true;
  }
  return false;
}

/**
 * Listener to collect InstanceOfExpressionContext and build literal types
 */
class InstanceofCollectorListener extends BaseApexParserListener<
  Array<{ ctx: InstanceOfExpressionContext; typeRef: TypeRefContext }>
> {
  private instanceofExprs: Array<{
    ctx: InstanceOfExpressionContext;
    typeRef: TypeRefContext;
  }> = [];
  private literalTypes = new Map<
    ExpressionContext,
    'integer' | 'long' | 'decimal' | 'string' | 'boolean' | 'null'
  >();

  enterInstanceOfExpression(ctx: InstanceOfExpressionContext): void {
    const typeRef = ctx.typeRef?.();
    if (typeRef) {
      this.instanceofExprs.push({ ctx, typeRef });
    }
  }

  enterLiteralPrimary(ctx: {
    literal?: () => {
      IntegerLiteral?: () => unknown;
      LongLiteral?: () => unknown;
      NumberLiteral?: () => unknown;
      StringLiteral?: () => unknown;
      BooleanLiteral?: () => unknown;
      NULL?: () => unknown;
    };
    parent?: ParserRuleContext;
  }): void {
    const literal = (ctx as any).literal?.();
    if (!literal) return;
    let litType:
      | 'integer'
      | 'long'
      | 'decimal'
      | 'string'
      | 'boolean'
      | 'null'
      | null = null;
    if (literal.IntegerLiteral?.()) litType = 'integer';
    else if (literal.LongLiteral?.()) litType = 'long';
    else if (literal.NumberLiteral?.()) litType = 'decimal';
    else if (literal.StringLiteral?.()) litType = 'string';
    else if (literal.BooleanLiteral?.()) litType = 'boolean';
    else if (literal.NULL?.()) litType = 'null';
    if (litType) {
      let current: ParserRuleContext | null = (ctx as any).parent || null;
      while (current) {
        if (current instanceof ExpressionContext) {
          this.literalTypes.set(current, litType);
          break;
        }
        current = (current as any).parent || null;
      }
    }
  }

  getResult(): Array<{
    ctx: InstanceOfExpressionContext;
    typeRef: TypeRefContext;
  }> {
    return this.instanceofExprs;
  }

  getInstanceofExpressions(): Array<{
    ctx: InstanceOfExpressionContext;
    typeRef: TypeRefContext;
  }> {
    return this.instanceofExprs;
  }

  getLiteralTypes(): Map<
    ExpressionContext,
    'integer' | 'long' | 'decimal' | 'string' | 'boolean' | 'null'
  > {
    return this.literalTypes;
  }
}

/**
 * Validates instanceof expressions for:
 * - INVALID_INSTANCEOF_INVALID_TYPE: RHS is primitive (e.g. obj instanceof Integer)
 * - INVALID_INSTANCEOF_ALWAYS_FALSE: left can never be instance of right
 * - INVALID_INSTANCEOF_ALWAYS_TRUE: left always instance of right (redundant)
 *
 * TIER 2 (THOROUGH) - requires expression type resolution and cross-file type lookup.
 */
export const InstanceofValidator: Validator = {
  id: 'instanceof',
  name: 'Instanceof Validator',
  tier: ValidationTier.THOROUGH,
  priority: 6,
  prerequisites: {
    requiredDetailLevel: 'full',
    requiresReferences: true,
    requiresCrossFileResolution: true,
  },

  validate: (
    symbolTable: SymbolTable,
    options: ValidationOptions,
  ): Effect.Effect<ValidationResult, ValidationError, ISymbolManager> =>
    Effect.gen(function* () {
      const errors: ValidationErrorInfo[] = [];
      const warnings: ValidationWarningInfo[] = [];

      const sourceContent = options.sourceContent;
      const parseTree = options.parseTree;
      if (!sourceContent && !parseTree) {
        return { isValid: true, errors: [], warnings: [] };
      }

      const symbolManager = yield* ISymbolManager;
      const allSymbols = symbolTable.getAllSymbols();

      // Parse to get InstanceOfExpressionContexts
      let tree: CompilationUnitContext | TriggerUnitContext | BlockContext;
      if (parseTree) {
        tree = parseTree as
          | CompilationUnitContext
          | TriggerUnitContext
          | BlockContext;
      } else if (sourceContent) {
        const inputStream = CharStreams.fromString(sourceContent);
        const caseInsensitive = new CaseInsensitiveInputStream(inputStream);
        const lexer = new ApexLexer(caseInsensitive);
        const tokenStream = new CommonTokenStream(lexer);
        const parser = new ApexParser(tokenStream);
        tree = parser.compilationUnit();
      } else {
        return { isValid: true, errors: [], warnings: [] };
      }

      const instanceofListener = new InstanceofCollectorListener();
      const walker = new ParseTreeWalker();
      walker.walk(instanceofListener, tree);

      const instanceofExprs = instanceofListener.getInstanceofExpressions();
      const literalTypes = instanceofListener.getLiteralTypes();
      const resolvedTypes = new WeakMap<
        ExpressionContext,
        ExpressionTypeInfo
      >();

      for (const { ctx, typeRef } of instanceofExprs) {
        const leftExpr = ctx.expression();
        if (!leftExpr) continue;

        const location = getLocationFromContext(ctx);

        // Resolve left operand type
        let leftType: string | null = null;
        if (leftExpr instanceof CastExpressionContext) {
          const typeRef = leftExpr.typeRef?.();
          if (typeRef) {
            leftType =
              extractBaseTypeName(typeRef.text || '') ||
              typeRef.text?.trim().toLowerCase() ||
              null;
          }
        }
        if (!leftType) {
          const leftTypeInfo = yield* resolveExpressionTypeRecursive(
            leftExpr,
            resolvedTypes,
            literalTypes,
            symbolTable,
            symbolManager,
            ValidationTier.THOROUGH,
          );
          leftType = leftTypeInfo?.resolvedType ?? null;
        }
        const leftLiteralType = literalTypes.get(leftExpr);
        const effectiveLeftType = leftType || leftLiteralType || 'object';

        // Resolve right operand type name
        const rightTypeName = typeRef.text?.trim() ?? '';
        const rightBase = extractBaseTypeName(rightTypeName);

        // INVALID_INSTANCEOF_INVALID_TYPE: RHS must be class/interface, not primitive
        if (PRIMITIVE_TYPES.has(rightBase)) {
          errors.push({
            message: localizeTyped(
              ErrorCodes.INVALID_INSTANCEOF_INVALID_TYPE,
              rightTypeName,
            ),
            location,
            code: ErrorCodes.INVALID_INSTANCEOF_INVALID_TYPE,
          });
          continue;
        }

        // Left is primitive - invalid (primitives are not objects)
        if (PRIMITIVE_TYPES.has(effectiveLeftType.toLowerCase())) {
          errors.push({
            message: localizeTyped(
              ErrorCodes.INVALID_INSTANCEOF_INVALID_TYPE,
              effectiveLeftType,
            ),
            location,
            code: ErrorCodes.INVALID_INSTANCEOF_INVALID_TYPE,
          });
          continue;
        }

        // For non-Object RHS, ensure we can resolve (allSymbols has same-file types)
        const rightInAll = allSymbols.find(
          (s) =>
            (s.kind === SymbolKind.Class ||
              s.kind === SymbolKind.Interface ||
              s.kind === SymbolKind.Enum) &&
            s.name.toLowerCase() === rightBase,
        );
        const rightSymbols = rightInAll
          ? [rightInAll]
          : symbolManager.findSymbolByName(rightTypeName);
        if (rightBase !== 'object' && rightSymbols.length === 0) {
          continue; // Unresolved - let TypeResolutionValidator handle
        }
        const assignable = isAssignable(
          effectiveLeftType,
          rightBase,
          allSymbols.concat(rightSymbols),
        );

        if (assignable) {
          // INVALID_INSTANCEOF_ALWAYS_TRUE: redundant check (e.g. obj instanceof Object)
          if (rightBase === 'object') {
            errors.push({
              message: localizeTyped(
                ErrorCodes.INVALID_INSTANCEOF_ALWAYS_TRUE,
                effectiveLeftType,
                rightTypeName,
              ),
              location,
              code: ErrorCodes.INVALID_INSTANCEOF_ALWAYS_TRUE,
            });
          }
          // Same type or known subtype - always true
          else if (
            effectiveLeftType.toLowerCase() === rightBase ||
            (leftType && leftType.toLowerCase() === rightBase)
          ) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.INVALID_INSTANCEOF_ALWAYS_TRUE,
                effectiveLeftType,
                rightTypeName,
              ),
              location,
              code: ErrorCodes.INVALID_INSTANCEOF_ALWAYS_TRUE,
            });
          }
        } else {
          // INVALID_INSTANCEOF_ALWAYS_FALSE: only when left has concrete type (not Object)
          // and is definitely not assignable. Skip when left is Object - could be true at runtime.
          const leftLower = effectiveLeftType.toLowerCase();
          if (leftLower !== 'object' && leftType) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.INVALID_INSTANCEOF_ALWAYS_FALSE,
                effectiveLeftType,
                rightTypeName,
              ),
              location,
              code: ErrorCodes.INVALID_INSTANCEOF_ALWAYS_FALSE,
            });
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};
