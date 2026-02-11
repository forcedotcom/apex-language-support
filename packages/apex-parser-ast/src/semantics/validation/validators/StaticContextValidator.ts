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
  PrimaryExpressionContext,
  ParseTreeWalker,
} from '@apexdevtools/apex-parser';
import type {
  SymbolTable,
  ApexSymbol,
  TypeSymbol,
  MethodSymbol,
  VariableSymbol,
  ScopeSymbol,
} from '../../../types/symbol';
import { SymbolKind } from '../../../types/symbol';
import {
  ReferenceContext,
  type SymbolReference,
} from '../../../types/symbolReference';
import { isChainedSymbolReference } from '../../../utils/symbolNarrowing';
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
import { BaseApexParserListener } from '../../../parser/listeners/BaseApexParserListener';

interface SuperThisLocation {
  isSuper: boolean;
  line: number;
  column: number;
}

/**
 * Listener to find super and this references in the parse tree
 */
class SuperThisListener extends BaseApexParserListener<void> {
  private locations: SuperThisLocation[] = [];
  private staticContextRanges: Array<{ startLine: number; endLine: number }> =
    [];

  enterPrimaryExpression(ctx: PrimaryExpressionContext): void {
    const text = ctx.text?.toLowerCase().trim() ?? '';
    const firstWord = text.split(/[.\s(]/)[0];
    if (firstWord === 'super' || firstWord === 'this') {
      this.locations.push({
        isSuper: firstWord === 'super',
        line: ctx.start.line,
        column: ctx.start.charPositionInLine,
      });
    }
  }

  setStaticContextRanges(
    ranges: Array<{ startLine: number; endLine: number }>,
  ) {
    this.staticContextRanges = ranges;
  }

  getLocationsInStaticContext(): SuperThisLocation[] {
    return this.locations.filter((loc) =>
      this.staticContextRanges.some(
        (range) => loc.line >= range.startLine && loc.line <= range.endLine,
      ),
    );
  }

  getResult(): void {
    return undefined as void;
  }
}

/**
 * Find if a location is inside a static method or static block
 */
function findStaticContextRanges(
  allSymbols: ApexSymbol[],
): Array<{ startLine: number; endLine: number }> {
  const ranges: Array<{ startLine: number; endLine: number }> = [];

  for (const symbol of allSymbols) {
    if (symbol.kind === SymbolKind.Method) {
      const method = symbol as MethodSymbol;
      if (method.modifiers?.isStatic && method.location) {
        // Use symbolRange to include full method body (super/this can appear inside body)
        const start = method.location.symbolRange?.startLine;
        const end = method.location.symbolRange?.endLine;
        if (start && end) ranges.push({ startLine: start, endLine: end });
      }
    }
    if (symbol.kind === SymbolKind.Block) {
      const block = symbol as ScopeSymbol;
      if ((block as any).scopeType === 'static' && block.location) {
        const start =
          block.location.symbolRange?.startLine ??
          block.location.identifierRange?.startLine;
        const end =
          block.location.symbolRange?.endLine ??
          block.location.identifierRange?.endLine;
        if (start && end) ranges.push({ startLine: start, endLine: end });
      }
    }
  }

  return ranges;
}

/**
 * Find containing method/block for a call location to determine static context
 */
function isInStaticContext(
  callLine: number,
  allSymbols: ApexSymbol[],
): boolean {
  const staticRanges = findStaticContextRanges(allSymbols);
  return staticRanges.some(
    (range) => callLine >= range.startLine && callLine <= range.endLine,
  );
}

/**
 * Determine if a method/field call uses static receiver (ClassName.member) vs instance (obj.member)
 */
function isStaticReceiver(ref: {
  chainNodes?: Array<{ context: ReferenceContext }>;
  context: ReferenceContext;
  name?: string;
}): boolean {
  if (ref.chainNodes && ref.chainNodes.length > 0) {
    const firstNode = ref.chainNodes[0];
    return firstNode?.context === ReferenceContext.CLASS_REFERENCE;
  }
  return false;
}

/**
 * Validates static context rules:
 * - INVALID_STATIC_METHOD_CONTEXT: Static method referenced from non-static context via instance
 * - INVALID_STATIC_VARIABLE_CONTEXT: Static field referenced from non-static context via instance
 * - INVALID_NON_STATIC_METHOD_CONTEXT: Non-static method from static context
 * - INVALID_NON_STATIC_VARIABLE_CONTEXT: Non-static field from static context
 * - INVALID_SUPER_STATIC_CONTEXT: super in static context
 * - INVALID_THIS_STATIC_CONTEXT: this in static context
 */
export const StaticContextValidator: Validator = {
  id: 'static-context',
  name: 'Static Context Validator',
  tier: ValidationTier.THOROUGH,
  priority: 12,
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

      const symbolManager = yield* ISymbolManager;
      const allReferences = symbolTable.getAllReferences();
      const allSymbols = symbolTable.getAllSymbols();

      const containingClass = allSymbols.find(
        (s) => s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
      ) as TypeSymbol | undefined;

      if (!containingClass) {
        return { isValid: true, errors, warnings };
      }

      // 1. Check super/this in static context (requires parse tree)
      if (options.sourceContent) {
        const staticRanges = findStaticContextRanges(allSymbols);
        if (staticRanges.length > 0) {
          const fileUri = symbolTable.getFileUri() || 'unknown.cls';
          const isTrigger = fileUri.endsWith('.trigger');
          const isAnonymous = fileUri.endsWith('.apex');
          const contentToParse = isAnonymous
            ? `{${options.sourceContent}}`
            : options.sourceContent;

          try {
            const inputStream = CharStreams.fromString(contentToParse);
            const lexer = new ApexLexer(
              new CaseInsensitiveInputStream(inputStream),
            );
            const tokenStream = new CommonTokenStream(lexer);
            const parser = new ApexParser(tokenStream);

            let parseTree:
              | CompilationUnitContext
              | TriggerUnitContext
              | BlockContext;
            if (isTrigger) {
              parseTree = parser.triggerUnit();
            } else if (isAnonymous) {
              parseTree = parser.block();
            } else {
              parseTree = parser.compilationUnit();
            }

            const listener = new SuperThisListener();
            listener.setStaticContextRanges(staticRanges);
            const walker = new ParseTreeWalker();
            walker.walk(listener, parseTree);

            const locationsInStatic = listener.getLocationsInStaticContext();
            for (const loc of locationsInStatic) {
              // Exclude constructor calls - ConstructorValidator handles those
              // We detect super/this as primary - if followed by .method() it's still invalid in static
              errors.push({
                message: localizeTyped(
                  loc.isSuper
                    ? ErrorCodes.INVALID_SUPER_STATIC_CONTEXT
                    : ErrorCodes.INVALID_THIS_STATIC_CONTEXT,
                ),
                location: {
                  symbolRange: {
                    startLine: loc.line,
                    startColumn: loc.column,
                    endLine: loc.line,
                    endColumn: loc.column + (loc.isSuper ? 5 : 4),
                  },
                  identifierRange: {
                    startLine: loc.line,
                    startColumn: loc.column,
                    endLine: loc.line,
                    endColumn: loc.column + (loc.isSuper ? 5 : 4),
                  },
                },
                code: loc.isSuper
                  ? ErrorCodes.INVALID_SUPER_STATIC_CONTEXT
                  : ErrorCodes.INVALID_THIS_STATIC_CONTEXT,
              });
            }
          } catch {
            // Parse failed - skip super/this check
          }
        }
      }

      // 2. Check METHOD_CALL and FIELD_ACCESS for static context violations
      const callLine = (ref: { location?: any }) =>
        ref.location?.identifierRange?.startLine ??
        ref.location?.symbolRange?.startLine;

      const methodCalls = allReferences.filter(
        (r) => r.context === ReferenceContext.METHOD_CALL,
      );
      const fieldAccesses = [
        ...allReferences.filter(
          (r) => r.context === ReferenceContext.FIELD_ACCESS,
        ),
        ...extractFieldAccessesFromChains(allReferences),
      ];

      for (const ref of methodCalls) {
        const line = callLine(ref);
        if (!line) continue;

        const isStaticContext = isInStaticContext(line, allSymbols);
        const receiverIsStatic = isStaticReceiver(ref);

        if (!ref.resolvedSymbolId) continue;

        const symbol = symbolManager.getSymbol(ref.resolvedSymbolId);
        if (!symbol || symbol.kind !== SymbolKind.Method) continue;

        const method = symbol as MethodSymbol;
        const methodIsStatic = method.modifiers?.isStatic ?? false;

        if (isStaticContext && !methodIsStatic && !receiverIsStatic) {
          const methodName = ref.chainNodes?.length
            ? (ref.chainNodes[ref.chainNodes.length - 1]?.name ?? ref.name)
            : ref.name;
          errors.push({
            message: localizeTyped(
              ErrorCodes.INVALID_NON_STATIC_METHOD_CONTEXT,
              methodName,
            ),
            location: ref.location,
            code: ErrorCodes.INVALID_NON_STATIC_METHOD_CONTEXT,
          });
        } else if (
          !isStaticContext &&
          methodIsStatic &&
          !receiverIsStatic &&
          ref.chainNodes &&
          ref.chainNodes.length > 0
        ) {
          const methodName =
            ref.chainNodes[ref.chainNodes.length - 1]?.name ?? ref.name;
          errors.push({
            message: localizeTyped(
              ErrorCodes.INVALID_STATIC_METHOD_CONTEXT,
              methodName,
            ),
            location: ref.location,
            code: ErrorCodes.INVALID_STATIC_METHOD_CONTEXT,
          });
        }
      }

      for (const ref of fieldAccesses) {
        const line = callLine(ref);
        if (!line) continue;

        const isStaticContext = isInStaticContext(line, allSymbols);
        const receiverIsStatic = isStaticReceiver(ref);

        if (!ref.resolvedSymbolId) continue;

        const symbol = symbolManager.getSymbol(ref.resolvedSymbolId);
        if (
          !symbol ||
          (symbol.kind !== SymbolKind.Field &&
            symbol.kind !== SymbolKind.Property)
        )
          continue;

        const field = symbol as VariableSymbol;
        const fieldIsStatic = field.modifiers?.isStatic ?? false;

        if (isStaticContext && !fieldIsStatic && !receiverIsStatic) {
          const fieldName = ref.chainNodes?.length
            ? (ref.chainNodes[ref.chainNodes.length - 1]?.name ?? ref.name)
            : ref.name;
          errors.push({
            message: localizeTyped(
              ErrorCodes.INVALID_NON_STATIC_VARIABLE_CONTEXT,
              fieldName,
              containingClass.name,
            ),
            location: ref.location,
            code: ErrorCodes.INVALID_NON_STATIC_VARIABLE_CONTEXT,
          });
        } else if (
          !isStaticContext &&
          fieldIsStatic &&
          !receiverIsStatic &&
          ref.chainNodes &&
          ref.chainNodes.length > 0
        ) {
          const typeName = ref.chainNodes[0]?.name ?? containingClass.name;
          const fieldName =
            ref.chainNodes[ref.chainNodes.length - 1]?.name ?? ref.name;
          errors.push({
            message: localizeTyped(
              ErrorCodes.INVALID_STATIC_VARIABLE_CONTEXT,
              fieldName,
              typeName,
            ),
            location: ref.location,
            code: ErrorCodes.INVALID_STATIC_VARIABLE_CONTEXT,
          });
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};

function extractFieldAccessesFromChains(
  refs: SymbolReference[],
): SymbolReference[] {
  const result: SymbolReference[] = [];
  for (const ref of refs) {
    if (isChainedSymbolReference(ref) && ref.chainNodes) {
      for (const node of ref.chainNodes) {
        if (node.context === ReferenceContext.FIELD_ACCESS) {
          result.push(node);
        }
      }
    }
  }
  return result;
}
