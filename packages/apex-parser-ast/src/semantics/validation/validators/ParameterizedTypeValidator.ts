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
  TypeRefContext,
} from '@apexdevtools/apex-parser';
import type {
  SymbolTable,
  SymbolLocation,
  VariableSymbol,
  MethodSymbol,
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

/** Apex parameterized types: List and Set expect 1 type arg; Map expects 2 */
const PARAMETERIZED_TYPES = new Map<string, number>([
  ['list', 1],
  ['set', 1],
  ['map', 2],
]);

const MAX_PARAMETERIZED_TYPE_DEPTH = 5;
/** Salesforce limit: maximum type depth is 10 */
const MAXIMUM_TYPE_DEPTH = 10;

interface ParsedParameterizedType {
  base: string;
  args: string[];
}

interface TypeRefWithLocation {
  typeName: string;
  location: SymbolLocation;
}

/**
 * Parse "Map<String,List<Integer>>" -> { base: "Map", args: ["String", "List<Integer>"] }
 * Handles nested generics by tracking bracket depth when splitting on comma.
 */
function parseParameterizedType(
  typeName: string,
): ParsedParameterizedType | null {
  const angleStart = typeName.indexOf('<');
  if (angleStart < 0) {
    return null;
  }
  const base = typeName.slice(0, angleStart).trim();
  const inner = typeName.slice(angleStart + 1, -1);
  const args: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (c === '<') {
      depth++;
    } else if (c === '>') {
      depth--;
    } else if (c === ',' && depth === 0) {
      args.push(inner.slice(start, i).trim());
      start = i + 1;
    }
  }
  if (start < inner.length) {
    args.push(inner.slice(start).trim());
  }
  return { base, args };
}

/**
 * Recursively compute max nesting depth of a parameterized type.
 */
function computeMaxDepthRecursive(
  parsed: ParsedParameterizedType,
  currentDepth: number,
): number {
  let max = currentDepth;
  for (const arg of parsed.args) {
    const sub = parseParameterizedType(arg);
    if (sub) {
      const subMax = computeMaxDepthRecursive(sub, currentDepth + 1);
      max = Math.max(max, subMax);
    }
  }
  return max;
}

/**
 * Listener to collect type refs from parse tree for parameterized type validation
 */
class TypeRefCollectorListener extends BaseApexParserListener<
  TypeRefWithLocation[]
> {
  private result: TypeRefWithLocation[] = [];

  enterTypeRef(ctx: TypeRefContext): void {
    const text = ctx.text || '';
    if (!text.trim()) return;

    const stop = ctx.stop || ctx.start;
    const location: SymbolLocation = {
      symbolRange: {
        startLine: ctx.start.line,
        startColumn: ctx.start.charPositionInLine,
        endLine: stop.line,
        endColumn: stop.charPositionInLine + (stop.text?.length || 0),
      },
      identifierRange: {
        startLine: ctx.start.line,
        startColumn: ctx.start.charPositionInLine,
        endLine: stop.line,
        endColumn: stop.charPositionInLine + (stop.text?.length || 0),
      },
    };
    this.result.push({ typeName: text.trim(), location });
  }

  getResult(): TypeRefWithLocation[] {
    return this.result;
  }
}

/**
 * Collect type references by walking parse tree
 */
function collectTypeRefsFromSource(
  sourceContent: string,
  isTrigger: boolean,
  isAnonymous: boolean,
): TypeRefWithLocation[] {
  const inputStream = CharStreams.fromString(sourceContent);
  const caseInsensitive = new CaseInsensitiveInputStream(inputStream);
  const lexer = new ApexLexer(caseInsensitive);
  const tokenStream = new CommonTokenStream(lexer);
  const parser = new ApexParser(tokenStream);

  let parseTree: CompilationUnitContext | TriggerUnitContext | BlockContext;
  if (isTrigger) {
    parseTree = parser.triggerUnit();
  } else if (isAnonymous) {
    parseTree = parser.block();
  } else {
    parseTree = parser.compilationUnit();
  }

  const listener = new TypeRefCollectorListener();
  const walker = new ParseTreeWalker();
  walker.walk(listener, parseTree);
  return listener.getResult();
}

/**
 * Validate a single type string and collect errors
 */
function validateTypeString(
  typeName: string,
  location: SymbolLocation,
  errors: ValidationErrorInfo[],
): void {
  const hasAngleBrackets = typeName.includes('<');
  const parsed = hasAngleBrackets ? parseParameterizedType(typeName) : null;
  const baseLower = typeName.split('<')[0].trim().toLowerCase();

  if (parsed) {
    const expectedCount = PARAMETERIZED_TYPES.get(baseLower);

    if (expectedCount !== undefined) {
      if (parsed.args.length !== expectedCount) {
        errors.push({
          message: localizeTyped(
            ErrorCodes.INVALID_PARAMETERIZED_TYPE_COUNT,
            typeName,
            expectedCount,
            parsed.args.length,
          ),
          location,
          code: ErrorCodes.INVALID_PARAMETERIZED_TYPE_COUNT,
        });
      }

      const depth = computeMaxDepthRecursive(parsed, 1);
      if (depth > MAX_PARAMETERIZED_TYPE_DEPTH) {
        errors.push({
          message: localizeTyped(
            ErrorCodes.PARAMETERIZED_TYPE_TOO_DEEP,
            typeName,
            depth,
          ),
          location,
          code: ErrorCodes.PARAMETERIZED_TYPE_TOO_DEEP,
        });
      }
      if (depth > MAXIMUM_TYPE_DEPTH) {
        errors.push({
          message: localizeTyped(ErrorCodes.MAXIMUM_TYPE_DEPTH_EXCEEDED),
          location,
          code: ErrorCodes.MAXIMUM_TYPE_DEPTH_EXCEEDED,
        });
      }
    } else {
      errors.push({
        message: localizeTyped(
          ErrorCodes.TYPE_ARGUMENTS_FOR_NON_PARAMETERIZED_TYPE,
          typeName,
        ),
        location,
        code: ErrorCodes.TYPE_ARGUMENTS_FOR_NON_PARAMETERIZED_TYPE,
      });
    }
  } else if (PARAMETERIZED_TYPES.has(baseLower)) {
    errors.push({
      message: localizeTyped(
        ErrorCodes.NO_TYPE_ARGUMENTS_FOR_PARAMETERIZED_TYPE,
        typeName,
      ),
      location,
      code: ErrorCodes.NO_TYPE_ARGUMENTS_FOR_PARAMETERIZED_TYPE,
    });
  }
}

/**
 * Validates parameterized types (List, Set, Map) for:
 * - INVALID_PARAMETERIZED_TYPE_COUNT: Wrong type arg count
 * - TYPE_ARGUMENTS_FOR_NON_PARAMETERIZED_TYPE: Type args on non-List/Set/Map
 * - NO_TYPE_ARGUMENTS_FOR_PARAMETERIZED_TYPE: List/Set/Map used without type args
 * - PARAMETERIZED_TYPE_TOO_DEEP: Nesting exceeds max depth
 *
 * Uses symbols (type.originalTypeString) and optionally sourceContent for parse-tree type refs.
 * TIER 1: Same-file only, no cross-file resolution.
 */
export const ParameterizedTypeValidator: Validator = {
  id: 'parameterized-type',
  name: 'Parameterized Type Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 8,
  prerequisites: {
    requiredDetailLevel: 'full',
    requiresReferences: true,
    requiresCrossFileResolution: false,
  },

  validate: (
    symbolTable: SymbolTable,
    options: ValidationOptions,
  ): Effect.Effect<ValidationResult, ValidationError, never> =>
    Effect.sync(() => {
      const errors: ValidationErrorInfo[] = [];
      const warnings: ValidationWarningInfo[] = [];
      const seenTypes = new Set<string>();

      // Collect type refs from symbols (variables, parameters, fields, method return types)
      const allSymbols = symbolTable.getAllSymbols();
      for (const symbol of allSymbols) {
        let typeStr: string | undefined;
        let location: SymbolLocation | undefined;

        if (
          symbol.kind === SymbolKind.Field ||
          symbol.kind === SymbolKind.Property ||
          symbol.kind === SymbolKind.Variable ||
          symbol.kind === SymbolKind.Parameter ||
          symbol.kind === SymbolKind.EnumValue
        ) {
          const v = symbol as VariableSymbol;
          typeStr = v.type?.originalTypeString;
          location = v.location;
        } else if (
          symbol.kind === SymbolKind.Method ||
          symbol.kind === SymbolKind.Constructor
        ) {
          const m = symbol as MethodSymbol;
          typeStr = m.returnType?.originalTypeString;
          location = m.location;
        }

        if (typeStr && location) {
          const key = `${typeStr}:${location.symbolRange.startLine}:${location.symbolRange.startColumn}`;
          if (!seenTypes.has(key)) {
            seenTypes.add(key);
            validateTypeString(typeStr, location, errors);
          }
        }
      }

      // Also collect from parse tree when sourceContent is available (covers constructor calls, etc.)
      const sourceContent = options.sourceContent;
      const parseTree = options.parseTree;
      if (sourceContent) {
        const isTrigger = parseTree?.constructor.name === 'TriggerUnitContext';
        const isAnonymous = parseTree?.constructor.name === 'BlockContext';
        const typeRefs = collectTypeRefsFromSource(
          sourceContent,
          !!isTrigger,
          !!isAnonymous,
        );
        for (const { typeName, location } of typeRefs) {
          const key = `${typeName}:${location.symbolRange.startLine}:${location.symbolRange.startColumn}`;
          if (!seenTypes.has(key)) {
            seenTypes.add(key);
            validateTypeString(typeName, location, errors);
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
