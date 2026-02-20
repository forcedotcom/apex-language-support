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
  EnumSymbol,
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
import type { ParserRuleContext } from 'antlr4ts';
import { ISymbolManager } from '../ArtifactLoadingHelper';
import type { ISymbolManager as ISymbolManagerInterface } from '../../../types/ISymbolManager';
import { SymbolKind } from '../../../types/symbol';
import {
  resolveExpressionTypeRecursive,
  type ExpressionTypeInfo,
} from './ExpressionValidator';

/**
 * Check if a type name represents an SObject (Account, Contact, custom __c, etc.)
 */
function isSObjectType(typeName: string): boolean {
  const lower = typeName.toLowerCase().trim();
  if (lower === 'sobject') {
    return true;
  }
  // Custom SObjects end with __c, __r, etc.
  if (lower.endsWith('__c') || lower.endsWith('__r')) {
    return true;
  }
  // Standard SObjects (common ones)
  const standardSObjects = new Set([
    'account',
    'contact',
    'lead',
    'opportunity',
    'case',
    'user',
    'profile',
    'recordtype',
    'task',
    'event',
    'campaign',
    'asset',
    'order',
    'quote',
    'contract',
    'product2',
    'pricebookentry',
    'pricebook2',
    'opportunitylineitem',
  ]);
  return standardSObjects.has(lower);
}

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
 * Info extracted from a when literal (id, literal type, or null)
 */
interface WhenLiteralInfo {
  literalType?: 'integer' | 'long' | 'decimal' | 'string' | 'boolean' | 'null';
  identifierText?: string;
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
  typeRefText?: string;
  whenValueText?: string;
  whenLiterals: WhenLiteralInfo[];
}

/**
 * Listener to collect switch statement information
 */
class SwitchListener extends BaseApexParserListener<void> {
  private switchStatements: Array<{
    ctx: SwitchStatementContext;
    expression?: ExpressionContext;
    expressionText?: string;
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
      | 'integer'
      | 'long'
      | 'decimal'
      | 'string'
      | 'boolean'
      | 'null'
      | null = null;

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
      let parent = ctx.parent;
      while (parent && !(parent instanceof ExpressionContext)) {
        parent = parent.parent;
      }
      if (parent instanceof ExpressionContext) {
        this.literalTypes.set(parent, literalType);
      }
    }
  }

  enterSwitchStatement(ctx: SwitchStatementContext): void {
    const expression = (ctx as any).expression?.() as
      | ExpressionContext
      | undefined;
    const expressionText = expression?.text || '';
    this.switchStatements.push({ ctx, expression, expressionText });
  }

  enterWhenControl(ctx: WhenControlContext): void {
    // Find the containing switch statement
    let current: ParserRuleContext | null = ctx.parent || null;
    let switchCtx: SwitchStatementContext | null = null;

    while (current) {
      if ((current as any).constructor.name === 'SwitchStatementContext') {
        switchCtx = current as SwitchStatementContext;
        break;
      }
      current = current.parent || null;
    }

    if (!switchCtx) {
      return;
    }

    const whenValue = ctx.whenValue();
    if (!whenValue) {
      return;
    }

    const isElse = !!whenValue.ELSE();
    const whenValueText = whenValue.text || '';

    // Type variable form: when Account acc (typeRef + id present)
    const typeRef = whenValue.typeRef();
    const typeVarId = whenValue.id();
    const isTypeVariable =
      !!typeRef && !!typeVarId && !whenValue.whenLiteral().length;
    const typeRefText = typeRef?.text || undefined;

    // Extract when literals
    const whenLiterals: WhenLiteralInfo[] = [];
    for (let i = 0; i < whenValue.whenLiteral().length; i++) {
      const wl = whenValue.whenLiteral(i);
      whenLiterals.push(extractWhenLiteralInfo(wl));
    }

    this.whenBlocks.push({
      ctx,
      switchCtx,
      isElse,
      isTypeVariable,
      typeRefText,
      whenValueText,
      whenLiterals,
    });
  }

  getResult(): void {
    return undefined as void;
  }

  getSwitchStatements(): Array<{
    ctx: SwitchStatementContext;
    expression?: ExpressionContext;
    expressionText?: string;
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
  if (wl.IntegerLiteral()) {
    return { literalType: 'integer', ctx: wl };
  }
  if (wl.LongLiteral()) {
    return { literalType: 'long', ctx: wl };
  }
  if (wl.StringLiteral()) {
    return { literalType: 'string', ctx: wl };
  }
  if (wl.NULL()) {
    return { literalType: 'null', ctx: wl };
  }
  const idNode = wl.id();
  if (idNode) {
    return { identifierText: idNode.text, ctx: wl };
  }
  // Parenthesized whenLiteral - recurse
  const inner = wl.whenLiteral();
  if (inner) {
    return extractWhenLiteralInfo(inner);
  }
  return { ctx: wl };
}

/**
 * Resolve type of an identifier (field, variable, enum value) - sync, same-file only
 */
function resolveIdentifierType(
  identifierText: string,
  symbolTable: SymbolTable,
  symbolManager: ISymbolManagerInterface,
): string | null {
  const trimmed = identifierText?.trim();
  if (!trimmed) {
    return null;
  }
  const name = trimmed.includes('.') ? trimmed.split('.').pop()! : trimmed;
  const nameLower = name.toLowerCase();

  const symbol = symbolTable.lookup(nameLower, null);
  if (
    symbol &&
    (symbol.kind === SymbolKind.Field ||
      symbol.kind === SymbolKind.Variable ||
      symbol.kind === SymbolKind.Property)
  ) {
    const varSymbol = symbol as VariableSymbol;
    return varSymbol.type?.name?.toLowerCase() ?? null;
  }

  const found = symbolManager.findSymbolByName(trimmed);
  const enumVal = found.find(
    (s: ApexSymbol) => s.kind === SymbolKind.EnumValue,
  );
  if (enumVal) {
    const parentId = enumVal.parentId;
    const allSymbols = symbolTable.getAllSymbols();
    const parent = allSymbols.find((s) => s.id === parentId);
    if (parent && parent.kind === SymbolKind.Enum) {
      return parent.name?.toLowerCase() ?? null;
    }
  }
  return null;
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

/**
 * Find symbol by name in symbol table or symbol manager (handles fields in class scope)
 */
function findSymbolForWhenIdentifier(
  name: string,
  symbolTable: SymbolTable,
  symbolManager: ISymbolManagerInterface,
): ApexSymbol | undefined {
  const nameLower = name.toLowerCase();

  // Try symbol table lookup first (finds variables, params in scope)
  let symbol = symbolTable.lookup(nameLower, null);
  if (symbol) {
    return symbol;
  }

  // Try getAllSymbols - fields may not be found by lookup from method scope
  const allSymbols = symbolTable.getAllSymbols();
  const fileUri = symbolTable.getFileUri();
  symbol = allSymbols.find(
    (s) =>
      s.name?.toLowerCase() === nameLower &&
      (s.kind === SymbolKind.Field ||
        s.kind === SymbolKind.Variable ||
        s.kind === SymbolKind.Parameter ||
        s.kind === SymbolKind.Property ||
        s.kind === SymbolKind.EnumValue),
  ) as ApexSymbol | undefined;
  if (symbol) {
    return symbol;
  }

  // Try symbol manager (cross-file, e.g. enum values)
  const found = symbolManager.findSymbolByName(name);
  return found.find(
    (s: ApexSymbol) =>
      s.fileUri === fileUri &&
      (s.kind === SymbolKind.Field ||
        s.kind === SymbolKind.Variable ||
        s.kind === SymbolKind.Parameter ||
        s.kind === SymbolKind.Property ||
        s.kind === SymbolKind.EnumValue),
  ) as ApexSymbol | undefined;
}

/**
 * Validate when clause identifier (field, enum, or variable)
 */
function validateWhenIdentifier(
  identifierText: string,
  ctx: WhenLiteralContext,
  symbolTable: SymbolTable,
  symbolManager: ISymbolManagerInterface,
  tier: ValidationTier,
  errors: ValidationErrorInfo[],
): Effect.Effect<void, never, never> {
  return Effect.gen(function* () {
    const trimmed = identifierText?.trim();
    if (!trimmed) {
      return;
    }

    // Extract unqualified name (EnumType.VALUE -> VALUE)
    const name = trimmed.includes('.') ? trimmed.split('.').pop()! : trimmed;
    const nameLower = name.toLowerCase();

    // Look up in symbol table (field, variable, enum value)
    const symbol = findSymbolForWhenIdentifier(
      nameLower,
      symbolTable,
      symbolManager,
    );
    if (!symbol) {
      // Could be enum value from another type - try findSymbolByName
      const found = symbolManager.findSymbolByName(trimmed);
      const enumVal = found.find(
        (s: ApexSymbol) => s.kind === SymbolKind.EnumValue,
      );
      if (!enumVal) {
        errors.push({
          message: localizeTyped(
            ErrorCodes.WHEN_CLAUSE_LITERAL_OR_VALID_CONSTANT,
            trimmed,
          ),
          location: getLocationFromContext(ctx),
          code: ErrorCodes.WHEN_CLAUSE_LITERAL_OR_VALID_CONSTANT,
        });
      }
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
            trimmed,
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
            trimmed,
          ),
          location: getLocationFromContext(ctx),
          code: ErrorCodes.INVALID_WHEN_FIELD_CONSTANT,
        });
        return;
      }

      // Check for null literal (field must be non-null)
      const initVal = varSymbol.initialValue?.toLowerCase().trim();
      const initType = varSymbol.initializerType;
      const initTypeIsNull =
        initType?.name?.toLowerCase() === 'null' ||
        initType?.originalTypeString?.toLowerCase().trim() === 'null';
      if (initVal === 'null' || initTypeIsNull) {
        errors.push({
          message: localizeTyped(
            ErrorCodes.INVALID_WHEN_FIELD_LITERAL,
            trimmed,
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
        const walker = new ParseTreeWalker();
        walker.walk(listener, parseTree);

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
          { type: string; isSObject: boolean }
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
              resolvedSwitchTypes.set(switchStmt.ctx, {
                type: typeInfo.resolvedType.toLowerCase(),
                isSObject: isSObjectType(typeInfo.resolvedType),
              });
            }
          }
        }

        // Validate each switch statement
        for (const switchStmt of switchStatements) {
          const { ctx: switchCtx, expressionText } = switchStmt;
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
            if (!whenBlock.isElse && whenBlock.whenValueText) {
              const normalizedValue = whenBlock.whenValueText
                .toLowerCase()
                .trim();
              if (normalizedValue && seenWhenValues.has(normalizedValue)) {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.NOT_UNIQUE_WHEN_VALUE_OR_TYPE,
                    whenBlock.whenValueText,
                  ),
                  location: getLocationFromContext(whenBlock.ctx),
                  code: ErrorCodes.NOT_UNIQUE_WHEN_VALUE_OR_TYPE,
                });
              } else if (normalizedValue) {
                seenWhenValues.add(normalizedValue);
              }
            }
          }

          // 4. ILLEGAL_WHEN_TYPE: Non-SObject switch cannot use when type variable
          if (switchTypeInfo && !switchTypeInfo.isSObject) {
            for (const whenBlock of whenBlocks) {
              if (!whenBlock.isElse && whenBlock.isTypeVariable) {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.ILLEGAL_WHEN_TYPE,
                    whenBlock.typeRefText || 'Type',
                  ),
                  location: getLocationFromContext(whenBlock.ctx),
                  code: ErrorCodes.ILLEGAL_WHEN_TYPE,
                });
              }
            }
          }

          // 5. ILLEGAL_NON_WHEN_TYPE: SObject switch must use when type variable or when null
          if (switchTypeInfo?.isSObject) {
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
          if (switchTypeInfo?.isSObject && switchTypeInfo.type) {
            const switchTypeLower = switchTypeInfo.type.toLowerCase();
            for (const whenBlock of whenBlocks) {
              if (whenBlock.isElse || !whenBlock.isTypeVariable) {
                continue;
              }
              // Check if the when type variable type matches the switch expression type
              if (whenBlock.typeRefText) {
                const whenTypeLower = whenBlock.typeRefText
                  .toLowerCase()
                  .trim();
                // If the when type matches the switch type, it's redundant
                if (whenTypeLower === switchTypeLower) {
                  errors.push({
                    message: localizeTyped(
                      ErrorCodes.INVALID_ALREADY_MATCH_TYPE,
                      whenBlock.typeRefText,
                    ),
                    location: getLocationFromContext(whenBlock.ctx),
                    code: ErrorCodes.INVALID_ALREADY_MATCH_TYPE,
                  });
                }
              }
            }
          }

          // 6. INVALID_WHEN_EXPRESSION_TYPE: When value type must match switch type
          if (switchTypeInfo && !switchTypeInfo.isSObject) {
            for (const whenBlock of whenBlocks) {
              if (whenBlock.isElse || whenBlock.isTypeVariable) {
                continue;
              }
              for (const wl of whenBlock.whenLiterals) {
                let whenType: string | null = null;
                if (wl.literalType) {
                  whenType = wl.literalType;
                } else if (wl.identifierText) {
                  whenType = resolveIdentifierType(
                    wl.identifierText,
                    symbolTable,
                    symbolManager,
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
              if (wl.identifierText) {
                yield* validateWhenIdentifier(
                  wl.identifierText,
                  wl.ctx,
                  symbolTable,
                  symbolManager,
                  options.tier,
                  errors,
                );
              }
            }
          }

          // 8. Check switch expression type (basic validation)
          // For now, we do a simple text-based check
          // Full type resolution would require TIER 2
          if (expressionText) {
            const normalizedExpr = expressionText.toLowerCase().trim();
            // Check if it's clearly an invalid type (collections, void, etc.)
            const invalidPatterns = ['list<', 'set<', 'map<', 'void', 'null'];
            const isInvalid = invalidPatterns.some((pattern) =>
              normalizedExpr.includes(pattern),
            );

            if (isInvalid) {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.ILLEGAL_SWITCH_EXPRESSION_TYPE,
                  expressionText,
                ),
                location: switchLocation,
                code: ErrorCodes.ILLEGAL_SWITCH_EXPRESSION_TYPE,
              });
            }
          }

          // TIER 2: Enum switch validation
          if (
            options.tier === ValidationTier.THOROUGH &&
            switchStmt.expression
          ) {
            yield* validateEnumSwitch(
              switchStmt.expression,
              whenBlocks,
              switchLocation,
              symbolTable,
              symbolManager,
              errors,
            );
          } else if (
            options.tier === ValidationTier.THOROUGH &&
            expressionText
          ) {
            // Fallback to text-based enum validation
            yield* validateEnumSwitchText(
              expressionText,
              whenBlocks,
              switchLocation,
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
  whenBlocks: Array<{
    ctx: WhenControlContext;
    isElse: boolean;
    whenValueText?: string;
  }>,
  switchLocation: SymbolLocation,
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
    const enumSymbols = symbolManager.findSymbolByName(enumTypeName);
    const enumSymbol = enumSymbols.find(
      (s: ApexSymbol) => s.kind === SymbolKind.Enum,
    ) as EnumSymbol | undefined;

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
      if (whenBlock.isElse || !whenBlock.whenValueText) {
        continue; // Skip else blocks and empty when values
      }

      const whenValue = whenBlock.whenValueText.trim();

      // INVALID_FULLY_QUALIFIED_ENUM: enum switch when must be unqualified (VALUE1 not MyEnum.VALUE1)
      if (whenValue.includes('.')) {
        errors.push({
          message: localizeTyped(ErrorCodes.INVALID_FULLY_QUALIFIED_ENUM),
          location: getLocationFromContext(whenBlock.ctx),
          code: ErrorCodes.INVALID_FULLY_QUALIFIED_ENUM,
        });
        continue;
      }

      const constantNameLower = whenValue.toLowerCase();
      if (!enumConstantNames.has(constantNameLower)) {
        errors.push({
          message: localizeTyped(ErrorCodes.INVALID_SWITCH_ENUM),
          location: getLocationFromContext(whenBlock.ctx),
          code: ErrorCodes.INVALID_SWITCH_ENUM,
        });
      }
    }
  });
}

/**
 * Validate enum switch statement (TIER 2) - fallback text-based approach
 * Used when ExpressionContext is not available
 */
function validateEnumSwitchText(
  expressionText: string,
  whenBlocks: Array<{
    ctx: WhenControlContext;
    isElse: boolean;
    whenValueText?: string;
  }>,
  switchLocation: SymbolLocation,
  symbolTable: SymbolTable,
  symbolManager: ISymbolManagerInterface,
  errors: ValidationErrorInfo[],
): Effect.Effect<void, never, never> {
  return Effect.gen(function* () {
    // Try to resolve the switch expression type
    // For now, we'll try to extract a variable name or simple expression
    const trimmedExpr = expressionText.trim();

    // Check if it's a simple variable identifier
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedExpr)) {
      // Complex expression - skip enum validation for now
      return;
    }

    // Look up the variable in the symbol table
    const variable = symbolTable.lookup(trimmedExpr, null);
    if (!variable || variable.kind !== SymbolKind.Variable) {
      // Not a variable or not found - skip
      return;
    }

    const varSymbol = variable as VariableSymbol;
    if (!varSymbol.type?.name) {
      return;
    }

    // Check if the variable type is an enum
    const enumTypeName = varSymbol.type.name;
    const enumSymbols = symbolManager.findSymbolByName(enumTypeName);
    const enumSymbol = enumSymbols.find(
      (s: ApexSymbol) => s.kind === SymbolKind.Enum,
    ) as EnumSymbol | undefined;

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
      if (whenBlock.isElse || !whenBlock.whenValueText) {
        continue; // Skip else blocks and empty when values
      }

      const whenValue = whenBlock.whenValueText.trim();

      // INVALID_FULLY_QUALIFIED_ENUM: enum switch when must be unqualified (VALUE1 not MyEnum.VALUE1)
      if (whenValue.includes('.')) {
        errors.push({
          message: localizeTyped(ErrorCodes.INVALID_FULLY_QUALIFIED_ENUM),
          location: getLocationFromContext(whenBlock.ctx),
          code: ErrorCodes.INVALID_FULLY_QUALIFIED_ENUM,
        });
        continue;
      }

      const constantNameLower = whenValue.toLowerCase();
      if (!enumConstantNames.has(constantNameLower)) {
        errors.push({
          message: localizeTyped(ErrorCodes.INVALID_SWITCH_ENUM),
          location: getLocationFromContext(whenBlock.ctx),
          code: ErrorCodes.INVALID_SWITCH_ENUM,
        });
      }
    }
  });
}
