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
  TypeRefContext,
} from '@apexdevtools/apex-parser';
import type { SymbolTable, SymbolLocation } from '../../../types/symbol';
import type { TypeInfo } from '../../../types/typeInfo';
import {
  isVariableSymbol,
  isMethodSymbol,
  isConstructorSymbol,
} from '../../../utils/symbolNarrowing';
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
import { createTypeInfoFromTypeRef } from '../../../parser/utils/createTypeInfoFromTypeRef';

/** Apex parameterized types: List and Set expect 1 type arg; Map expects 2 */
const PARAMETERIZED_TYPES = new Map<string, number>([
  ['list', 1],
  ['set', 1],
  ['map', 2],
]);

const MAX_PARAMETERIZED_TYPE_DEPTH = 5;
/** Salesforce limit: maximum type depth is 10 */
const MAXIMUM_TYPE_DEPTH = 10;

interface TypeRefWithLocation {
  typeInfo: TypeInfo;
  baseName: string;
  typeArguments: TypeRefWithLocation[];
  location: SymbolLocation;
}

function computeMaxDepthRecursive(
  typeRef: TypeRefWithLocation,
  currentDepth: number,
): number {
  let max = currentDepth;
  for (const argument of typeRef.typeArguments) {
    if (argument.typeArguments.length > 0) {
      const subMax = computeMaxDepthRecursive(argument, currentDepth + 1);
      max = Math.max(max, subMax);
    }
  }
  return max;
}

const grammarTypeName = (ctx: TypeRefContext): string => {
  const typeNames = ctx.typeName_list() ?? [];
  const genericOwner = typeNames.find((typeName) => typeName.typeArguments());
  const typeName = genericOwner ?? typeNames[typeNames.length - 1];
  if (!typeName) return 'Object';
  if (typeName.LIST()) return 'List';
  if (typeName.SET()) return 'Set';
  if (typeName.MAP()) return 'Map';
  return typeName.id()?.getText() ?? 'Object';
};

const locationFromTypeRef = (ctx: TypeRefContext): SymbolLocation => {
  const stop = ctx.stop || ctx.start;
  const range = {
    startLine: ctx.start.line,
    startColumn: ctx.start.column,
    endLine: stop.line,
    endColumn: stop.column + (stop.text?.length || 0),
  };
  return { symbolRange: range, identifierRange: range };
};

const semanticTypeRef = (ctx: TypeRefContext): TypeRefWithLocation => {
  const genericOwner = (ctx.typeName_list() ?? []).find((typeName) =>
    typeName.typeArguments(),
  );
  const typeArguments =
    genericOwner
      ?.typeArguments()
      ?.typeList()
      ?.typeRef_list()
      .map(semanticTypeRef) ?? [];
  return {
    typeInfo: createTypeInfoFromTypeRef(ctx),
    baseName: grammarTypeName(ctx),
    typeArguments,
    location: locationFromTypeRef(ctx),
  };
};

/**
 * Listener to collect type refs from parse tree for parameterized type validation
 */
class TypeRefCollectorListener extends BaseApexParserListener<
  TypeRefWithLocation[]
> {
  private result: TypeRefWithLocation[] = [];

  enterTypeRef(ctx: TypeRefContext): void {
    this.result.push(semanticTypeRef(ctx));
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
  const lexer = ApexParserFactory.createLexer(sourceContent);
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

  ApexParseTreeWalker.DEFAULT.walk(listener, parseTree);
  return listener.getResult();
}

function collectTypeRefsFromParseTree(
  parseTree: CompilationUnitContext | TriggerUnitContext | BlockContext,
): TypeRefWithLocation[] {
  const listener = new TypeRefCollectorListener();
  ApexParseTreeWalker.DEFAULT.walk(listener, parseTree);
  return listener.getResult();
}

function typeRefFromTypeInfo(
  typeInfo: TypeInfo,
  location: SymbolLocation,
): TypeRefWithLocation {
  if (typeInfo.isArray && typeInfo.typeParameters?.[0]) {
    return typeRefFromTypeInfo(typeInfo.typeParameters[0], location);
  }

  const typeArguments =
    typeInfo.name.toLowerCase() === 'map' && typeInfo.keyType
      ? [typeInfo.keyType, ...(typeInfo.typeParameters ?? [])]
      : (typeInfo.typeParameters ?? []);
  return {
    typeInfo,
    baseName: typeInfo.name,
    typeArguments: typeArguments.map((argument) =>
      typeRefFromTypeInfo(argument, location),
    ),
    location,
  };
}

/** Validate one parser-owned type structure and collect errors. */
function validateTypeRef(
  typeRef: TypeRefWithLocation,
  errors: ValidationErrorInfo[],
): void {
  const { typeInfo, baseName, typeArguments, location } = typeRef;
  const typeName = typeInfo.originalTypeString;
  const baseLower = baseName.toLowerCase();

  if (typeArguments.length > 0) {
    const expectedCount = PARAMETERIZED_TYPES.get(baseLower);

    if (expectedCount !== undefined) {
      if (typeArguments.length !== expectedCount) {
        errors.push({
          message: localizeTyped(
            ErrorCodes.INVALID_PARAMETERIZED_TYPE_COUNT,
            typeName,
            expectedCount,
            typeArguments.length,
          ),
          location,
          code: ErrorCodes.INVALID_PARAMETERIZED_TYPE_COUNT,
        });
      }

      const depth = computeMaxDepthRecursive(typeRef, 1);
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
 * Uses symbol TypeInfo and parse-tree type refs; sourceContent is only input to the parser.
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
        let typeInfo: TypeInfo | undefined;
        let location: SymbolLocation | undefined;

        if (isVariableSymbol(symbol)) {
          const v = symbol;
          typeInfo = v.type;
          location = v.location;
        } else if (isMethodSymbol(symbol) || isConstructorSymbol(symbol)) {
          const m = symbol;
          typeInfo = m.returnType;
          location = m.location;
        }

        if (typeInfo && location) {
          const { startLine, startColumn } = location.symbolRange;
          const key = `${typeInfo.originalTypeString}:${startLine}:${startColumn}`;
          if (!seenTypes.has(key)) {
            seenTypes.add(key);
            validateTypeRef(typeRefFromTypeInfo(typeInfo, location), errors);
          }
        }
      }

      // Parse-tree type refs cover constructor calls and retain malformed argument
      // counts that normalized symbol TypeInfo cannot represent.
      const sourceContent = options.sourceContent;
      const parseTree = options.parseTree;
      const typeRefs = parseTree
        ? collectTypeRefsFromParseTree(parseTree)
        : sourceContent
          ? collectTypeRefsFromSource(sourceContent, false, false)
          : [];
      for (const typeRef of typeRefs) {
        const { typeInfo, location } = typeRef;
        const typeName = typeInfo.originalTypeString;
        const { startLine, startColumn } = location.symbolRange;
        const key = `${typeName}:${startLine}:${startColumn}`;
        if (!seenTypes.has(key)) {
          seenTypes.add(key);
          validateTypeRef(typeRef, errors);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};
