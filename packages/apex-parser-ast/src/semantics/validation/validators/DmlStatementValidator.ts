/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type {
  SymbolLocation,
  SymbolTable,
  VariableSymbol,
} from '../../../types/symbol';
import { SymbolKind } from '../../../types/symbol';
import type { TypeInfo } from '../../../types/typeInfo';
import type {
  DmlSemanticContext,
  SymbolReference,
} from '../../../types/symbolReference';
import type {
  ValidationErrorInfo,
  ValidationResult,
  ValidationWarningInfo,
} from '../ValidationResult';
import type { ValidationOptions } from '../ValidationTier';
import { ValidationTier } from '../ValidationTier';
import { ValidationError, type Validator } from '../ValidatorRegistry';
import { localizeTyped } from '../../../i18n/messageInstance';
import { ErrorCodes } from '../../../generated/ErrorCodes';

type DmlOperand = {
  reference: SymbolReference;
  context: DmlSemanticContext;
  type?: TypeInfo;
};

const isValueSymbol = (kind: SymbolKind): boolean =>
  kind === SymbolKind.Variable ||
  kind === SymbolKind.Parameter ||
  kind === SymbolKind.Field ||
  kind === SymbolKind.Property;

const resolveOperandType = (
  symbolTable: SymbolTable,
  reference: SymbolReference,
): TypeInfo | undefined => {
  if (!reference.resolvedSymbolId) return undefined;
  const symbol = symbolTable.getSymbolById(reference.resolvedSymbolId);
  if (!symbol || !isValueSymbol(symbol.kind) || !('type' in symbol)) {
    return undefined;
  }
  return (symbol as VariableSymbol).type;
};

const collectDmlOperands = (symbolTable: SymbolTable): DmlOperand[] =>
  symbolTable
    .getAllReferences()
    .flatMap((reference): DmlOperand[] => {
      const context = reference.semanticContext?.dml;
      if (!context?.isOperandRoot) return [];
      return [
        {
          reference,
          context,
          type: resolveOperandType(symbolTable, reference),
        },
      ];
    })
    .sort(
      (left, right) =>
        left.context.statementRange.startLine -
          right.context.statementRange.startLine ||
        left.context.statementRange.startColumn -
          right.context.statementRange.startColumn ||
        left.context.operandRange.startLine -
          right.context.operandRange.startLine ||
        left.context.operandRange.startColumn -
          right.context.operandRange.startColumn,
    );

const locationForOperand = (context: DmlSemanticContext): SymbolLocation => ({
  symbolRange: context.operandRange,
  identifierRange: context.operandRange,
});

const normalizedTypeName = (type: TypeInfo): string =>
  (type.name || type.originalTypeString || '').toLowerCase();

const collectionElementType = (type: TypeInfo): TypeInfo | undefined =>
  type.isCollection ? type.typeParameters?.[0] : undefined;

const isDmlCompatibleType = (type: TypeInfo | undefined): boolean => {
  // Preserve semantic uncertainty. A method result or unresolved chain must be
  // resolved by a later tier; the immediate validator must not invent a type.
  if (!type) return true;

  const name = normalizedTypeName(type);
  if (type.isCollection) {
    if (name === 'map') return false;
    const element = collectionElementType(type);
    return element ? isDmlCompatibleType(element) : true;
  }
  if (name === 'sobject') return true;
  return !type.isPrimitive;
};

const concreteSObjectTypeName = (
  type: TypeInfo | undefined,
): string | undefined => {
  if (!type) return undefined;
  const element = collectionElementType(type);
  if (type.isCollection) {
    return element ? concreteSObjectTypeName(element) : undefined;
  }
  const name = type.name || type.originalTypeString || '';
  if (!name || name.toLowerCase() === 'sobject' || type.isPrimitive) {
    return undefined;
  }
  return name;
};

const statementKey = (context: DmlSemanticContext): string => {
  const range = context.statementRange;
  return `${range.startLine}:${range.startColumn}:${range.endLine}:${range.endColumn}`;
};

/**
 * Validates parser-recorded DML operands. Source text is intentionally not an
 * input: operation, operand role, ranges, reference identity, and declared
 * types all originate in the parser-owned symbol table.
 */
export const DmlStatementValidator: Validator = {
  id: 'dml-statement',
  name: 'DML Statement Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 9,
  prerequisites: {
    requiredDetailLevel: 'private',
    requiresReferences: true,
    requiresCrossFileResolution: false,
  },

  validate: (
    symbolTable: SymbolTable,
    _options: ValidationOptions,
  ): Effect.Effect<ValidationResult, ValidationError> =>
    Effect.gen(function* () {
      const errors: ValidationErrorInfo[] = [];
      const warnings: ValidationWarningInfo[] = [];
      const operands = collectDmlOperands(symbolTable);
      const mergeMasterTypes = new Map<string, string>();

      for (const operand of operands) {
        const { reference, context, type } = operand;
        const displayName = reference.name;
        const location = locationForOperand(context);

        if (!isDmlCompatibleType(type)) {
          errors.push({
            message: localizeTyped(ErrorCodes.INVALID_DML_TYPE, displayName),
            location,
            code: ErrorCodes.INVALID_DML_TYPE,
          });
          continue;
        }

        if (context.operation === 'merge') {
          const key = statementKey(context);
          const concreteType = concreteSObjectTypeName(type);
          if (context.operandRole === 'master') {
            if (type && !concreteType) {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.MERGE_REQUIRES_CONCRETE_TYPE,
                  displayName,
                ),
                location,
                code: ErrorCodes.MERGE_REQUIRES_CONCRETE_TYPE,
              });
            } else if (concreteType) {
              mergeMasterTypes.set(key, concreteType);
            }
          } else if (context.operandRole === 'duplicate' && type) {
            const masterType = mergeMasterTypes.get(key);
            const elementType = collectionElementType(type);
            const duplicateType = concreteSObjectTypeName(elementType);
            const isList = normalizedTypeName(type) === 'list';
            const matchesMaster =
              !masterType ||
              (duplicateType !== undefined &&
                duplicateType.toLowerCase() === masterType.toLowerCase());
            if (!isList || !duplicateType || !matchesMaster) {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.INVALID_MERGE_DUPLICATE_RECORDS,
                ),
                location,
                code: ErrorCodes.INVALID_MERGE_DUPLICATE_RECORDS,
              });
            }
          }
        }

        if (
          context.operation === 'upsert' &&
          context.upsertFieldRange &&
          type &&
          !concreteSObjectTypeName(type)
        ) {
          errors.push({
            message: localizeTyped(ErrorCodes.UPSERT_REQUIRES_CONCRETE_TYPE),
            location,
            code: ErrorCodes.UPSERT_REQUIRES_CONCRETE_TYPE,
          });
        }
      }

      yield* Effect.logDebug(
        `DmlStatementValidator: checked ${operands.length} parser-owned DML operands, ` +
          `found ${errors.length} violations`,
      );
      return { isValid: errors.length === 0, errors, warnings };
    }),
};
