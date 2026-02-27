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
import { extractReceiverExpressionBeforeDot } from '../utils/typeUtils';

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

function positionContainedIn(
  inner: {
    identifierRange?: {
      startLine: number;
      startColumn: number;
      endLine: number;
      endColumn: number;
    };
  },
  outer: {
    identifierRange?: {
      startLine: number;
      startColumn: number;
      endLine: number;
      endColumn: number;
    };
  },
): boolean {
  const ir = inner.identifierRange;
  const or = outer.identifierRange;
  if (!ir || !or) return false;
  if (ir.startLine < or.startLine || ir.endLine > or.endLine) return false;
  if (ir.startLine === or.startLine && ir.startColumn < or.startColumn)
    return false;
  if (ir.endLine === or.endLine && ir.endColumn > or.endColumn) return false;
  return true;
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

      // Prefer top-level class (parentId null) when file has inner classes
      const containingClass = (allSymbols.find(
        (s) =>
          (s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface) &&
          s.parentId === null,
      ) ??
        allSymbols.find(
          (s) => s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
        )) as TypeSymbol | undefined;

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

      // Get both individual METHOD_CALL references and chained references that end with METHOD_CALL
      const methodCalls = allReferences.filter((r) => {
        if (r.context === ReferenceContext.METHOD_CALL) {
          return true;
        }
        // Also include chained references where the final node is a METHOD_CALL
        if (
          isChainedSymbolReference(r) &&
          r.chainNodes &&
          r.chainNodes.length > 0
        ) {
          const lastNode = r.chainNodes[r.chainNodes.length - 1];
          return lastNode?.context === ReferenceContext.METHOD_CALL;
        }
        return false;
      });
      const directFieldAccesses = allReferences.filter(
        (r) => r.context === ReferenceContext.FIELD_ACCESS,
      );
      const { fieldAccesses: chainFieldAccesses, chainRefByFieldRef } =
        extractFieldAccessesFromChains(allReferences);
      const fieldAccesses = [...directFieldAccesses, ...chainFieldAccesses];

      for (const ref of methodCalls) {
        const line = callLine(ref);
        if (!line) continue;

        const isStaticContext = isInStaticContext(line, allSymbols);

        // For chained references, check the first node to determine receiver type
        let receiverIsStatic = false;
        let isChainedRef = false;

        if (
          isChainedSymbolReference(ref) &&
          ref.chainNodes &&
          ref.chainNodes.length > 0
        ) {
          isChainedRef = true;
          const firstNode = ref.chainNodes[0];
          // If first node is VARIABLE_USAGE or FIELD_ACCESS, it's an instance receiver
          // If first node resolves to a Class/Interface, it's a static receiver
          if (firstNode?.resolvedSymbolId) {
            const firstSymbol = symbolManager.getSymbol(
              firstNode.resolvedSymbolId,
            );
            if (firstSymbol) {
              receiverIsStatic =
                firstSymbol.kind === SymbolKind.Class ||
                firstSymbol.kind === SymbolKind.Interface;
            } else {
              // Symbol ID exists but symbol not found - this shouldn't happen, but default to instance
              receiverIsStatic = false;
            }
          } else {
            // No resolution yet - check context, but be conservative
            // If context is CLASS_REFERENCE but we're in a chain, it might still be a variable
            // Default to instance receiver unless we're certain it's a class
            receiverIsStatic = false; // Conservative: assume instance unless proven static
          }
        } else {
          receiverIsStatic = isStaticReceiver(ref);
        }

        if (!ref.resolvedSymbolId) continue;

        const symbol = symbolManager.getSymbol(ref.resolvedSymbolId);
        if (!symbol || symbol.kind !== SymbolKind.Method) continue;

        const method = symbol as MethodSymbol;
        const methodIsStatic = method.modifiers?.isStatic ?? false;

        // Skip when calling instance method on instance (e.g. response.getStatusCode())
        // Check multiple ways to detect instance receiver:
        // 1. isStatic was explicitly set to true during enrichment = static call
        // 2. receiverIsStatic is true = static call (ClassName.method)
        // 3. For chained refs: if first node is VARIABLE_USAGE/FIELD_ACCESS, it's an instance call
        // 4. Otherwise, if it's a qualified call (has '.' or chainNodes), it's an instance call
        const isQualifiedCall =
          (ref.chainNodes && ref.chainNodes.length > 0) ||
          (ref.name && ref.name.includes('.'));

        // For chained references, check if first node is a variable/field access
        let hasInstanceReceiver = false;
        if (isChainedRef && ref.chainNodes && ref.chainNodes.length > 0) {
          const firstNode = ref.chainNodes[0];

          // Check if first node resolves to a variable/field (instance receiver)
          // Even if context is CLASS_REFERENCE, if it resolves to a VariableSymbol, it's an instance call
          if (firstNode?.resolvedSymbolId) {
            const firstSymbol = symbolManager.getSymbol(
              firstNode.resolvedSymbolId,
            );
            if (firstSymbol) {
              hasInstanceReceiver =
                firstSymbol.kind === SymbolKind.Variable ||
                firstSymbol.kind === SymbolKind.Field ||
                firstSymbol.kind === SymbolKind.Property;
            }
          }

          // Fallback: check context if not resolved
          if (!hasInstanceReceiver) {
            hasInstanceReceiver =
              firstNode?.context === ReferenceContext.VARIABLE_USAGE ||
              firstNode?.context === ReferenceContext.FIELD_ACCESS ||
              firstNode?.context === ReferenceContext.CHAIN_STEP;
          }
        } else {
          // Check if there's a variable/field reference at the same line before this method call
          // This indicates it's a qualified call like request.setEndpoint()
          let hasVariableBeforeMethod = false;
          if (!isQualifiedCall && line) {
            const variableRefs = allReferences.filter(
              (r) =>
                (r.context === ReferenceContext.VARIABLE_USAGE ||
                  r.context === ReferenceContext.FIELD_ACCESS ||
                  r.context === ReferenceContext.CHAIN_STEP) &&
                callLine(r) === line,
            );
            // Check if any variable ref is before this method call on the same line
            const methodCol =
              ref.location?.identifierRange?.startColumn ??
              ref.location?.symbolRange?.startColumn ??
              0;
            hasVariableBeforeMethod = variableRefs.some((vr) => {
              const varCol =
                vr.location?.identifierRange?.startColumn ??
                vr.location?.symbolRange?.startColumn ??
                0;
              return varCol < methodCol;
            });
          }
          hasInstanceReceiver = isQualifiedCall || hasVariableBeforeMethod;
        }

        const finalHasInstanceReceiver =
          ref.isStatic === true
            ? false // Explicitly marked as static during enrichment
            : receiverIsStatic
              ? false // Receiver is a class reference (static call)
              : hasInstanceReceiver
                ? true // Instance receiver detected
                : false; // Unqualified call, use static context

        if (
          isStaticContext &&
          !methodIsStatic &&
          !receiverIsStatic &&
          !finalHasInstanceReceiver
        ) {
          const methodName =
            isChainedRef && ref.chainNodes?.length
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

        // Skip when field is accessed on an instance (e.g. v1.b or property.Id)
        // When we have receiver.field and receiver is not a class (CLASS_REFERENCE),
        // we're accessing a field on an instance - valid even in static context.
        // For refs from extractFieldAccessesFromChains, ref is a chain node (no chainNodes);
        // use chainRefByFieldRef to get the parent chain.
        const chainRef = chainRefByFieldRef?.get(ref) ?? ref;
        const firstNode = chainRef.chainNodes?.[0];
        let hasInstanceReceiver =
          chainRef.chainNodes &&
          chainRef.chainNodes.length > 1 &&
          (firstNode?.context !== ReferenceContext.CLASS_REFERENCE ||
            (firstNode?.resolvedSymbolId &&
              (() => {
                const firstSymbol = symbolManager.getSymbol(
                  firstNode.resolvedSymbolId,
                );
                return (
                  firstSymbol &&
                  (firstSymbol.kind === SymbolKind.Variable ||
                    firstSymbol.kind === SymbolKind.Field ||
                    firstSymbol.kind === SymbolKind.Parameter ||
                    firstSymbol.kind === SymbolKind.Property)
                );
              })()));
        // Fallback: base of chain is a variable (chainNodes may be [field] or [base,field])
        if (
          !hasInstanceReceiver &&
          chainRef.chainNodes &&
          chainRef.chainNodes.length >= 1
        ) {
          const receiverName =
            (chainRef.name?.includes('.')
              ? chainRef.name.split('.')[0]
              : null) ?? firstNode?.name;
          if (receiverName) {
            const firstAsVar =
              symbolTable.lookup(receiverName, null) ??
              allSymbols.find(
                (s) =>
                  s.name === receiverName &&
                  (s.kind === SymbolKind.Variable ||
                    s.kind === SymbolKind.Parameter ||
                    s.kind === SymbolKind.Field),
              );
            hasInstanceReceiver =
              !!firstAsVar &&
              (firstAsVar.kind === SymbolKind.Variable ||
                firstAsVar.kind === SymbolKind.Parameter ||
                firstAsVar.kind === SymbolKind.Field);
          }
        }
        if (hasInstanceReceiver) {
          continue; // Instance receiver - field is on receiver's type, not containing class
        }
        // Fallback: direct FIELD_ACCESS ref may overlap a chained ref (e.g. duplicate from
        // different listener). If ref is contained in a chain with instance receiver, skip.
        if (!chainRefByFieldRef?.has(ref)) {
          const overlappingChain = allReferences.find(
            (r) =>
              isChainedSymbolReference(r) &&
              r.chainNodes &&
              r.chainNodes.length > 1 &&
              r.chainNodes[0]?.context !== ReferenceContext.CLASS_REFERENCE &&
              ref.location &&
              r.location &&
              positionContainedIn(ref.location, r.location),
          );
          if (overlappingChain) continue;

          // Fallback: use source to detect variable.field pattern (e.g. address.street)
          if (options.sourceContent) {
            const receiverExpr = extractReceiverExpressionBeforeDot(
              ref,
              options.sourceContent,
            );
            if (receiverExpr && !receiverExpr.includes('[')) {
              const baseName = receiverExpr.trim().split(/[.[]/)[0];
              const objectVar =
                symbolTable.lookup(baseName, null) ??
                allSymbols.find(
                  (s) =>
                    s.name === baseName &&
                    (s.kind === SymbolKind.Variable ||
                      s.kind === SymbolKind.Parameter ||
                      s.kind === SymbolKind.Field),
                );
              if (
                objectVar &&
                (objectVar.kind === SymbolKind.Variable ||
                  objectVar.kind === SymbolKind.Parameter ||
                  objectVar.kind === SymbolKind.Field)
              ) {
                continue; // Instance receiver - variable.field
              }
            }
          }
        }

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

        // Skip when field belongs to a different type than containing class (e.g. address.street
        // where street is on GeocodingService.GeocodingAddress, not GeocodingServiceTest)
        if (field.parentId) {
          const fieldParent =
            symbolManager.getSymbol(field.parentId) ??
            allSymbols.find((s) => s.id === field.parentId);
          if (
            fieldParent &&
            (fieldParent.kind === SymbolKind.Class ||
              fieldParent.kind === SymbolKind.Interface) &&
            fieldParent.id !== containingClass.id
          ) {
            continue; // Field is on another type - instance access, valid
          }
        }

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

function extractFieldAccessesFromChains(refs: SymbolReference[]): {
  fieldAccesses: SymbolReference[];
  chainRefByFieldRef: Map<SymbolReference, SymbolReference>;
} {
  const fieldAccesses: SymbolReference[] = [];
  const chainRefByFieldRef = new Map<SymbolReference, SymbolReference>();
  for (const ref of refs) {
    if (isChainedSymbolReference(ref) && ref.chainNodes) {
      for (const node of ref.chainNodes) {
        if (node.context === ReferenceContext.FIELD_ACCESS) {
          fieldAccesses.push(node);
          chainRefByFieldRef.set(node, ref);
        }
      }
    }
  }
  return { fieldAccesses, chainRefByFieldRef };
}
