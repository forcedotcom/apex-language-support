/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { CommonTokenStream } from 'antlr4';
import {
  ApexParser,
  ApexParserFactory,
  ApexParseTreeWalker,
  CompilationUnitContext,
  TriggerUnitContext,
  BlockContext,
  SwitchStatementContext,
  WhenControlContext,
  WhenLiteralContext,
  ExpressionContext,
  LiteralPrimaryContext,
} from '@apexdevtools/apex-parser';
import type {
  SymbolTable,
  SymbolLocation,
  ApexSymbol,
  VariableSymbol,
} from '../../../types/symbol';
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
import type { ParserRuleContext } from 'antlr4';
import { ISymbolManager } from '../ArtifactLoadingHelper';
import type { ISymbolManager as ISymbolManagerInterface } from '../../../types/ISymbolManager';
import { SymbolKind } from '../../../types/symbol';
import { isEnumSymbol, isVariableSymbol } from '../../../utils/symbolNarrowing';
import { createTypeInfoFromTypeRef } from '../../../parser/utils/createTypeInfoFromTypeRef';
import {
  resolveExpressionTypeRecursive,
  type ExpressionTypeInfo,
} from './ExpressionValidator';

/**
 * Helper function to create SymbolLocation from parse tree context
 */
function getLocationFromContext(ctx: ParserRuleContext): SymbolLocation {
  const start = ctx.start;
  const stop = ctx.stop || start;
  const textLength = stop.text?.length || 0;

  const symbolRange = {
    startLine: start.line,
    startColumn: start.column,
    endLine: stop.line,
    endColumn: stop.column + textLength,
  };

  return {
    symbolRange,
    identifierRange: symbolRange,
  };
}

/**
 * Info extracted from a when literal (id, literal type, or null)
 */
interface WhenLiteralInfo {
  literalType?: 'integer' | 'long' | 'decimal' | 'string' | 'boolean' | 'null';
  literalValue?: string;
  identifierParts?: string[];
  ctx: WhenLiteralContext;
}

/**
 * Extended when block info for validation
 */
interface WhenBlockInfo {
  ctx: WhenControlContext;
  switchCtx: SwitchStatementContext;
  isElse: boolean;
  isTypeVariable: boolean;
  typeName?: string;
  whenLiterals: WhenLiteralInfo[];
}

/**
 * Listener to collect switch statement information
 */
class SwitchListener extends BaseApexParserListener<void> {
  private switchStatements: Array<{
    ctx: SwitchStatementContext;
    expression?: ExpressionContext;
  }> = [];
  private whenBlocks: WhenBlockInfo[] = [];
  private literalTypes: Map<
    ExpressionContext,
    'integer' | 'long' | 'decimal' | 'string' | 'boolean' | 'null'
  > = new Map();

  enterLiteralPrimary(ctx: LiteralPrimaryContext): void {
    // Collect literal types for expression resolution
    const literal = ctx.literal();
    if (!literal) {
      return;
    }

    let literalType:
      'integer' | 'long' | 'decimal' | 'string' | 'boolean' | 'null' | null =
      null;

    if (literal.IntegerLiteral()) {
      literalType = 'integer';
    } else if (literal.LongLiteral()) {
      literalType = 'long';
    } else if (literal.NumberLiteral()) {
      literalType = 'decimal';
    } else if (literal.StringLiteral()) {
      literalType = 'string';
    } else if (literal.BooleanLiteral()) {
      literalType = 'boolean';
    } else if (literal.NULL()) {
      literalType = 'null';
    }

    if (literalType) {
      // Find the containing ExpressionContext
      let parent = ctx.parentCtx;
      while (parent && !(parent instanceof ExpressionContext)) {
        parent = parent.parentCtx;
      }
      if (parent instanceof ExpressionContext) {
        this.literalTypes.set(parent, literalType);
      }
    }
  }

  enterSwitchStatement(ctx: SwitchStatementContext): void {
    const expression = ctx.expression();
    this.switchStatements.push({ ctx, expression });
  }

  enterWhenControl(ctx: WhenControlContext): void {
    // Find the containing switch statement
    let current: ParserRuleContext | null = ctx.parentCtx || null;
    let switchCtx: SwitchStatementContext | null = null;

    while (current) {
      if (current instanceof SwitchStatementContext) {
        switchCtx = current;
        break;
      }
      current = current.parentCtx || null;
    }

    if (!switchCtx) {
      return;
    }

    const whenValue = ctx.whenValue();
    if (!whenValue) {
      return;
    }

    const isElse = !!whenValue.ELSE();
    // Type variable form: when Account acc (typeRef + id present)
    const typeRef = whenValue.typeRef();
    const typeVarId = whenValue.id();
    const isTypeVariable =
      !!typeRef && !!typeVarId && !whenValue.whenLiteral_list().length;
    const typeName = typeRef
      ? createTypeInfoFromTypeRef(typeRef).originalTypeString
      : undefined;

    // Extract when literals
    const whenLiterals: WhenLiteralInfo[] = [];
    for (let i = 0; i < whenValue.whenLiteral_list().length; i++) {
      const wl = whenValue.whenLiteral(i);
      whenLiterals.push(extractWhenLiteralInfo(wl));
    }

    this.whenBlocks.push({
      ctx,
      switchCtx,
      isElse,
      isTypeVariable,
      typeName,
      whenLiterals,
    });
  }

  getResult(): void {
    return undefined as void;
  }

  getSwitchStatements(): Array<{
    ctx: SwitchStatementContext;
    expression?: ExpressionContext;
  }> {
    return this.switchStatements;
  }

  getLiteralTypes(): Map<
    ExpressionContext,
    'integer' | 'long' | 'decimal' | 'string' | 'boolean' | 'null'
  > {
    return this.literalTypes;
  }

  getWhenBlocks(): WhenBlockInfo[] {
    return this.whenBlocks;
  }
}

/**
 * Extract literal type or identifier from WhenLiteralContext
 */
function extractWhenLiteralInfo(wl: WhenLiteralContext): WhenLiteralInfo {
  const integer = wl.IntegerLiteral();
  if (integer) {
    return { literalType: 'integer', literalValue: integer.getText(), ctx: wl };
  }
  const long = wl.LongLiteral();
  if (long) {
    return { literalType: 'long', literalValue: long.getText(), ctx: wl };
  }
  const string = wl.StringLiteral();
  if (string) {
    return { literalType: 'string', literalValue: string.getText(), ctx: wl };
  }
  if (wl.NULL()) {
    return { literalType: 'null', literalValue: 'null', ctx: wl };
  }
  const qualifiedName = wl.qualifiedName();
  if (qualifiedName) {
    return {
      identifierParts: qualifiedName.id_list().map((id) => id.getText()),
      ctx: wl,
    };
  }
  // Parenthesized whenLiteral - recurse
  const inner = wl.whenLiteral();
  if (inner) {
    return extractWhenLiteralInfo(inner);
  }
  return { ctx: wl };
}

/**
 * Resolve a when-clause identifier using the same name-resolution boundaries
 * as Apex source:
 *
 * - an unqualified name is resolved lexically at the when expression;
 * - a qualified name is an exact FQN lookup.
 *
 * An unresolved name remains unresolved. In particular, do not fall back to a
 * file-wide or last-segment search: either can bind to a shadowed declaration
 * or to an identically named constant owned by another type/namespace.
 */
async function resolveWhenIdentifier(
  identifierParts: string[],
  ctx: WhenLiteralContext,
  symbolTable: SymbolTable,
  symbolManager: ISymbolManagerInterface,
): Promise<ApexSymbol | undefined> {
  if (identifierParts.length === 0) {
    return undefined;
  }

  if (identifierParts.length === 1) {
    return symbolTable.resolveVariableAtPosition(
      identifierParts[0],
      ctx.start.line,
      ctx.start.column,
    );
  }

  return (
    (await symbolManager.findSymbolByFQN(identifierParts.join('.'))) ??
    undefined
  );
}

/** Resolve the declared type only when the constant itself resolves exactly. */
async function resolveIdentifierType(
  identifierParts: string[],
  ctx: WhenLiteralContext,
  symbolTable: SymbolTable,
  symbolManager: ISymbolManagerInterface,
): Promise<string | null> {
  const symbol = await resolveWhenIdentifier(
    identifierParts,
    ctx,
    symbolTable,
    symbolManager,
  );
  return isVariableSymbol(symbol)
    ? (symbol.type?.name?.toLowerCase() ?? null)
    : null;
}

/**
 * Check if when literal type is compatible with switch expression type
 */
function isWhenTypeCompatible(whenType: string, switchType: string): boolean {
  const wt = whenType.toLowerCase();
  const st = switchType.toLowerCase();
  if (wt === st) {
    return true;
  }
  // Integer is compatible with Long
  if (wt === 'integer' && st === 'long') {
    return true;
  }
  // Long is compatible with Integer (Apex allows this for switch)
  if (wt === 'long' && st === 'integer') {
    return true;
  }
  return false;
}

type SwitchExpressionKind =
  'scalar' | 'sobject' | 'enum' | 'unsupported' | 'unknown';

async function classifySwitchExpressionType(
  typeName: string,
  symbolManager: ISymbolManagerInterface,
): Promise<SwitchExpressionKind> {
  const normalizedType = typeName.toLowerCase();
  if (['integer', 'long', 'string', 'id'].includes(normalizedType)) {
    return 'scalar';
  }
  if (normalizedType === 'sobject') {
    return 'sobject';
  }

  const symbols = await symbolManager.findSymbolByName(typeName);
  if (symbols.some(isEnumSymbol)) {
    return 'enum';
  }

  if (await symbolManager.findSObjectType(typeName)) {
    return 'sobject';
  }

  if (symbols.length > 0) {
    return 'unsupported';
  }
  return 'unknown';
}

function whenLiteralKey(literal: WhenLiteralInfo): string | undefined {
  if (literal.identifierParts?.length) {
    return `identifier:${literal.identifierParts
      .map((part) => part.toLowerCase())
      .join('.')}`;
  }
  if (literal.literalType && literal.literalValue !== undefined) {
    return `${literal.literalType}:${literal.literalValue.toLowerCase()}`;
  }
  return undefined;
}

function whenLiteralDisplay(literal: WhenLiteralInfo): string {
  return literal.identifierParts?.join('.') ?? literal.literalValue ?? '';
}

/**
 * Validate when clause identifier (field, enum, or variable)
 */
function validateWhenIdentifier(
  identifierParts: string[],
  ctx: WhenLiteralContext,
  symbolTable: SymbolTable,
  symbolManager: ISymbolManagerInterface,
  errors: ValidationErrorInfo[],
): Effect.Effect<void, never, never> {
  return Effect.gen(function* () {
    if (identifierParts.length === 0) {
      return;
    }

    const qualifiedName = identifierParts.join('.');
    // Resolve at the expression position or by exact FQN. If semantic state is
    // incomplete, preserve that uncertainty; another compilation pass can
    // validate once the declaration is available.
    const symbol = yield* Effect.promise(() =>
      resolveWhenIdentifier(identifierParts, ctx, symbolTable, symbolManager),
    );
    if (!symbol) {
      return;
    }

    if (
      symbol.kind === SymbolKind.Field ||
      symbol.kind === SymbolKind.Variable ||
      symbol.kind === SymbolKind.Parameter ||
      symbol.kind === SymbolKind.Property
    ) {
      const varSymbol = symbol as VariableSymbol;
      const mods = varSymbol.modifiers;

      // Local variable or parameter - not allowed in when
      if (
        symbol.kind === SymbolKind.Variable ||
        symbol.kind === SymbolKind.Parameter
      ) {
        errors.push({
          message: localizeTyped(
            ErrorCodes.WHEN_CLAUSE_LITERAL_OR_VALID_CONSTANT,
            qualifiedName,
          ),
          location: getLocationFromContext(ctx),
          code: ErrorCodes.WHEN_CLAUSE_LITERAL_OR_VALID_CONSTANT,
        });
        return;
      }

      // Field or property - must be static final
      if (!mods?.isStatic || !mods?.isFinal) {
        errors.push({
          message: localizeTyped(
            ErrorCodes.INVALID_WHEN_FIELD_CONSTANT,
            qualifiedName,
          ),
          location: getLocationFromContext(ctx),
          code: ErrorCodes.INVALID_WHEN_FIELD_CONSTANT,
        });
        return;
      }

      // Check for null literal (field must be non-null)
      const initType = varSymbol.initializerType;
      const initTypeIsNull =
        initType?.name?.toLowerCase() === 'null' ||
        initType?.originalTypeString?.toLowerCase().trim() === 'null';
      if (initTypeIsNull) {
        errors.push({
          message: localizeTyped(
            ErrorCodes.INVALID_WHEN_FIELD_LITERAL,
            qualifiedName,
          ),
          location: getLocationFromContext(ctx),
          code: ErrorCodes.INVALID_WHEN_FIELD_LITERAL,
        });
      }
    }
    // Enum value - valid, no error
  });
}

/**
 * Validates switch statement structure and when blocks.
 *
 * Rules:
 * - Switch expression must be a valid type (Integer, Long, String, Id, Enum, or SObject)
 * - Switch statement must have at least one when block
 * - When else must be the last when block
 * - Enum switch validation (field must be enum reference)
 * - Duplicate when values/types are not allowed
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * @see APEX_SEMANTIC_VALIDATION_IMPLEMENTATION_PLAN.md Phase 4.3
 */
export const SwitchStatementValidator: Validator = {
  id: 'switch-statement',
  name: 'Switch Statement Validator',
  tier: ValidationTier.IMMEDIATE, // Supports both IMMEDIATE (TIER 1) and THOROUGH (TIER 2)
  priority: 8,
  prerequisites: {
    requiredDetailLevel: 'public-api',
    requiresReferences: false,
    requiresCrossFileResolution: false, // TIER 2 validation may require cross-file resolution
  },

  validate: (
    symbolTable: SymbolTable,
    options: ValidationOptions,
  ): Effect.Effect<ValidationResult, ValidationError, ISymbolManager> =>
    Effect.gen(function* () {
      const symbolManager = yield* ISymbolManager;
      const errors: ValidationErrorInfo[] = [];
      const warnings: ValidationWarningInfo[] = [];

      // Source content is required for this validator
      if (!options.sourceContent) {
        yield* Effect.logDebug(
          'SwitchStatementValidator: sourceContent not provided, skipping validation',
        );
        return {
          isValid: true,
          errors,
          warnings,
        };
      }

      const sourceContent = options.sourceContent;
      const fileUri = symbolTable.getFileUri() || 'unknown.cls';

      try {
        // Use cached parse tree if available, otherwise parse source content
        let parseTree:
          CompilationUnitContext | TriggerUnitContext | BlockContext;
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

          const lexer = ApexParserFactory.createLexer(contentToParse);
          const tokenStream = new CommonTokenStream(lexer);
          const parser = new ApexParser(tokenStream);

          if (isTrigger) {
            parseTree = parser.triggerUnit();
          } else if (isAnonymous) {
            parseTree = parser.block();
          } else {
            parseTree = parser.compilationUnit();
          }
        }

        // Walk the parse tree to collect switch statement information
        const listener = new SwitchListener();

        ApexParseTreeWalker.DEFAULT.walk(listener, parseTree);

        const switchStatements = listener.getSwitchStatements();
        const allWhenBlocks = listener.getWhenBlocks();
        const literalTypes = listener.getLiteralTypes();

        // Group when blocks by switch statement
        const whenBlocksBySwitch = new Map<
          SwitchStatementContext,
          WhenBlockInfo[]
        >();

        for (const whenBlock of allWhenBlocks) {
          if (!whenBlocksBySwitch.has(whenBlock.switchCtx)) {
            whenBlocksBySwitch.set(whenBlock.switchCtx, []);
          }
          whenBlocksBySwitch.get(whenBlock.switchCtx)!.push(whenBlock);
        }

        // Resolve switch expression types (for TIER 2 or when expression available)
        const resolvedSwitchTypes = new Map<
          SwitchStatementContext,
          { type: string; kind: SwitchExpressionKind }
        >();
        for (const switchStmt of switchStatements) {
          if (switchStmt.expression) {
            const resolvedTypes = new WeakMap<
              ExpressionContext,
              ExpressionTypeInfo
            >();
            const typeInfo = yield* resolveExpressionTypeRecursive(
              switchStmt.expression,
              resolvedTypes,
              literalTypes,
              symbolTable,
              symbolManager,
              options.tier,
            );
            if (typeInfo?.resolvedType) {
              const kind = yield* Effect.promise(() =>
                classifySwitchExpressionType(
                  typeInfo.resolvedType!,
                  symbolManager,
                ),
              );
              resolvedSwitchTypes.set(switchStmt.ctx, {
                type: typeInfo.resolvedType.toLowerCase(),
                kind,
              });
            }
          }
        }

        // Validate each switch statement
        for (const switchStmt of switchStatements) {
          const { ctx: switchCtx } = switchStmt;
          const switchLocation = getLocationFromContext(switchCtx);
          const whenBlocks = whenBlocksBySwitch.get(switchCtx) || [];
          const switchTypeInfo = resolvedSwitchTypes.get(switchCtx);

          // 1. Check for at least one when block
          if (whenBlocks.length === 0) {
            errors.push({
              message: localizeTyped(ErrorCodes.ILLEGAL_NO_WHEN_BLOCKS),
              location: switchLocation,
              code: ErrorCodes.ILLEGAL_NO_WHEN_BLOCKS,
            });
            continue;
          }

          // 2. Check when else placement (must be last)
          for (let i = 0; i < whenBlocks.length; i++) {
            const whenBlock = whenBlocks[i];
            if (whenBlock.isElse && i < whenBlocks.length - 1) {
              errors.push({
                message: localizeTyped(ErrorCodes.WHEN_ELSE_NOT_LAST),
                location: getLocationFromContext(whenBlock.ctx),
                code: ErrorCodes.WHEN_ELSE_NOT_LAST,
              });
            }
          }

          // 3. Check for duplicate when values/types
          const seenWhenValues = new Set<string>();
          for (const whenBlock of whenBlocks) {
            if (whenBlock.isElse) {
              continue;
            }
            const values = whenBlock.isTypeVariable
              ? whenBlock.typeName
                ? [
                    {
                      key: `type:${whenBlock.typeName.toLowerCase()}`,
                      display: whenBlock.typeName,
                    },
                  ]
                : []
              : whenBlock.whenLiterals.flatMap((literal) => {
                  const key = whenLiteralKey(literal);
                  return key
                    ? [{ key, display: whenLiteralDisplay(literal) }]
                    : [];
                });
            for (const value of values) {
              if (seenWhenValues.has(value.key)) {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.NOT_UNIQUE_WHEN_VALUE_OR_TYPE,
                    value.display,
                  ),
                  location: getLocationFromContext(whenBlock.ctx),
                  code: ErrorCodes.NOT_UNIQUE_WHEN_VALUE_OR_TYPE,
                });
              } else {
                seenWhenValues.add(value.key);
              }
            }
          }

          // 4. ILLEGAL_WHEN_TYPE: Non-SObject switch cannot use when type variable
          if (
            switchTypeInfo &&
            switchTypeInfo.kind !== 'sobject' &&
            switchTypeInfo.kind !== 'unknown'
          ) {
            for (const whenBlock of whenBlocks) {
              if (!whenBlock.isElse && whenBlock.isTypeVariable) {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.ILLEGAL_WHEN_TYPE,
                    whenBlock.typeName || 'Type',
                  ),
                  location: getLocationFromContext(whenBlock.ctx),
                  code: ErrorCodes.ILLEGAL_WHEN_TYPE,
                });
              }
            }
          }

          // 5. ILLEGAL_NON_WHEN_TYPE: SObject switch must use when type variable or when null
          if (switchTypeInfo?.kind === 'sobject') {
            for (const whenBlock of whenBlocks) {
              if (whenBlock.isElse) {
                continue;
              }
              const hasNull = whenBlock.whenLiterals.some(
                (wl) => wl.literalType === 'null',
              );
              const hasTypeVariable = whenBlock.isTypeVariable;
              if (!hasTypeVariable && !hasNull) {
                errors.push({
                  message: localizeTyped(ErrorCodes.ILLEGAL_NON_WHEN_TYPE),
                  location: getLocationFromContext(whenBlock.ctx),
                  code: ErrorCodes.ILLEGAL_NON_WHEN_TYPE,
                });
              }
            }
          }

          // 5.5. INVALID_ALREADY_MATCH_TYPE: When clause type variable already matches switch expression type
          if (switchTypeInfo?.kind === 'sobject' && switchTypeInfo.type) {
            const switchTypeLower = switchTypeInfo.type.toLowerCase();
            for (const whenBlock of whenBlocks) {
              if (whenBlock.isElse || !whenBlock.isTypeVariable) {
                continue;
              }
              // Check if the when type variable type matches the switch expression type
              if (whenBlock.typeName) {
                const whenTypeLower = whenBlock.typeName.toLowerCase();
                // If the when type matches the switch type, it's redundant
                if (whenTypeLower === switchTypeLower) {
                  errors.push({
                    message: localizeTyped(
                      ErrorCodes.INVALID_ALREADY_MATCH_TYPE,
                      whenBlock.typeName,
                    ),
                    location: getLocationFromContext(whenBlock.ctx),
                    code: ErrorCodes.INVALID_ALREADY_MATCH_TYPE,
                  });
                }
              }
            }
          }

          // 6. INVALID_WHEN_EXPRESSION_TYPE: When value type must match switch type
          if (
            switchTypeInfo &&
            switchTypeInfo.kind !== 'sobject' &&
            switchTypeInfo.kind !== 'unknown'
          ) {
            for (const whenBlock of whenBlocks) {
              if (whenBlock.isElse || whenBlock.isTypeVariable) {
                continue;
              }
              for (const wl of whenBlock.whenLiterals) {
                let whenType: string | null = null;
                if (wl.literalType) {
                  whenType = wl.literalType;
                } else if (wl.identifierParts) {
                  whenType = yield* Effect.promise(() =>
                    resolveIdentifierType(
                      wl.identifierParts!,
                      wl.ctx,
                      symbolTable,
                      symbolManager,
                    ),
                  );
                }
                if (whenType) {
                  const compatible = isWhenTypeCompatible(
                    whenType,
                    switchTypeInfo.type,
                  );
                  if (!compatible) {
                    errors.push({
                      message: localizeTyped(
                        ErrorCodes.INVALID_WHEN_EXPRESSION_TYPE,
                        whenType,
                        switchTypeInfo.type,
                      ),
                      location: getLocationFromContext(wl.ctx),
                      code: ErrorCodes.INVALID_WHEN_EXPRESSION_TYPE,
                    });
                  }
                }
              }
            }
          }

          // 7. INVALID_WHEN_FIELD_CONSTANT, INVALID_WHEN_FIELD_LITERAL,
          //    INVALID_WHEN_LITERAL_EXPRESSION, WHEN_CLAUSE_LITERAL_OR_VALID_CONSTANT
          for (const whenBlock of whenBlocks) {
            if (whenBlock.isElse || whenBlock.isTypeVariable) {
              continue;
            }
            for (const wl of whenBlock.whenLiterals) {
              if (wl.identifierParts) {
                yield* validateWhenIdentifier(
                  wl.identifierParts,
                  wl.ctx,
                  symbolTable,
                  symbolManager,
                  errors,
                );
              }
            }
          }

          // 8. Check the resolved switch expression type. If resolution is
          // incomplete, preserve that uncertainty rather than interpreting text.
          if (switchTypeInfo?.kind === 'unsupported') {
            errors.push({
              message: localizeTyped(
                ErrorCodes.ILLEGAL_SWITCH_EXPRESSION_TYPE,
                switchTypeInfo.type,
              ),
              location: switchLocation,
              code: ErrorCodes.ILLEGAL_SWITCH_EXPRESSION_TYPE,
            });
          }

          // TIER 2: Enum switch validation
          if (
            options.tier === ValidationTier.THOROUGH &&
            switchStmt.expression
          ) {
            yield* validateEnumSwitch(
              switchStmt.expression,
              whenBlocks,
              symbolTable,
              symbolManager,
              errors,
            );
          }
        }

        yield* Effect.logDebug(
          `SwitchStatementValidator: checked ${switchStatements.length} switch statements, ` +
            `found ${errors.length} violations`,
        );

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      } catch (error) {
        yield* Effect.logWarning(
          `SwitchStatementValidator: Error during validation: ${error}`,
        );
        return {
          isValid: true,
          errors: [],
          warnings: [],
        };
      }
    }),
};

/**
 * Validate enum switch statement (TIER 2) using expression type resolution
 * Checks if switch expression is an enum and validates when values match enum constants
 */
function validateEnumSwitch(
  expression: ExpressionContext,
  whenBlocks: WhenBlockInfo[],
  symbolTable: SymbolTable,
  symbolManager: ISymbolManagerInterface,
  errors: ValidationErrorInfo[],
): Effect.Effect<void, never, never> {
  return Effect.gen(function* () {
    // Resolve expression type using comprehensive type resolution
    const literalTypes = new Map<
      ExpressionContext,
      'integer' | 'long' | 'decimal' | 'string' | 'boolean' | 'null'
    >();
    const resolvedExpressionTypes = new WeakMap<
      ExpressionContext,
      ExpressionTypeInfo
    >();

    const typeInfo = yield* resolveExpressionTypeRecursive(
      expression,
      resolvedExpressionTypes,
      literalTypes,
      symbolTable,
      symbolManager,
      ValidationTier.THOROUGH,
    );

    if (!typeInfo?.resolvedType) {
      // Could not resolve type - skip enum validation
      return;
    }

    const enumTypeName = typeInfo.resolvedType;
    const enumSymbols = yield* Effect.promise(() =>
      symbolManager.findSymbolByName(enumTypeName),
    );
    const enumSymbol = enumSymbols.find(isEnumSymbol);

    if (!enumSymbol) {
      // Not an enum type - skip validation
      return;
    }

    // Get enum constants
    const enumConstants = enumSymbol.values || [];
    const enumConstantNames = new Set(
      enumConstants.map((c) => c.name.toLowerCase()),
    );

    // Validate when values match enum constants
    for (const whenBlock of whenBlocks) {
      if (whenBlock.isElse || whenBlock.isTypeVariable) {
        continue;
      }

      for (const literal of whenBlock.whenLiterals) {
        const parts = literal.identifierParts;
        if (!parts?.length) {
          continue;
        }

        // Enum switch constants are grammar-level qualified names. More than
        // one identifier means the constant was explicitly qualified.
        if (parts.length > 1) {
          errors.push({
            message: localizeTyped(ErrorCodes.INVALID_FULLY_QUALIFIED_ENUM),
            location: getLocationFromContext(literal.ctx),
            code: ErrorCodes.INVALID_FULLY_QUALIFIED_ENUM,
          });
          continue;
        }

        if (!enumConstantNames.has(parts[0].toLowerCase())) {
          errors.push({
            message: localizeTyped(ErrorCodes.INVALID_SWITCH_ENUM),
            location: getLocationFromContext(literal.ctx),
            code: ErrorCodes.INVALID_SWITCH_ENUM,
          });
        }
      }
    }
  });
}
