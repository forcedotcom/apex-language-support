/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type {
  SymbolTable,
  TypeSymbol,
  ApexSymbol,
  VariableSymbol,
  ScopeSymbol,
} from '../../../types/symbol';
import { SymbolKind } from '../../../types/symbol';
import { isBlockSymbol } from '../../../utils/symbolNarrowing';
import { ReferenceContext } from '../../../types/symbolReference';
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

/**
 * Extract the simple type name from a constructor call type (e.g., "Outer.Inner" -> "Inner")
 */
function extractInnerTypeName(typeName: string): string {
  const parts = typeName.split('.');
  return parts[parts.length - 1].trim();
}

/**
 * Check if a type extends Exception (directly or indirectly)
 */
function extendsException(
  typeSymbol: TypeSymbol,
  allSymbols: ApexSymbol[],
  symbolManager: { findSymbolByName: (name: string) => ApexSymbol[] },
): boolean {
  const visited = new Set<string>();
  let current: TypeSymbol | undefined = typeSymbol;

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (current.superClass) {
      const superName = current.superClass.toLowerCase();
      if (superName === 'exception') {
        return true;
      }
      const superSymbols = symbolManager.findSymbolByName(current.superClass);
      const fromAll = allSymbols.filter(
        (s) =>
          (s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface) &&
          s.name.toLowerCase() === superName,
      );
      const superSymbol = [...fromAll, ...superSymbols].find(
        (s: ApexSymbol) =>
          s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
      ) as TypeSymbol | undefined;
      current = superSymbol;
    } else if (
      current.interfaces?.some((i) => i.toLowerCase() === 'exception')
    ) {
      return true;
    } else {
      break;
    }
  }
  return false;
}

/**
 * Check if a class name ends with "Exception"
 */
function endsWithException(className: string): boolean {
  return className.toLowerCase().endsWith('exception');
}

/**
 * Validates new expression name conflicts:
 * - NEW_INNER_TYPE_NAME_CONFLICT_INTERFACE
 * - NEW_INNER_TYPE_NAME_CONFLICT_OUTER
 * - NEW_INNER_TYPE_NAME_CONFLICT_SUPER_TYPE
 * - NEW_NAME_CONFLICT_INNER
 * - NEW_NAME_CONFLICT_LOCAL
 * - NEW_NAME_MEMBER_CONFLICT
 */
export const NewExpressionValidator: Validator = {
  id: 'new-expression',
  name: 'New Expression Validator',
  tier: ValidationTier.THOROUGH,
  priority: 14,
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

      const constructorCalls = allReferences.filter(
        (r) => r.context === ReferenceContext.CONSTRUCTOR_CALL,
      );

      const containingClass = allSymbols.find(
        (s) => s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
      ) as TypeSymbol | undefined;

      if (!containingClass) {
        return { isValid: true, errors, warnings };
      }

      for (const ref of constructorCalls) {
        const typeName = ref.name;
        const innerName = extractInnerTypeName(typeName);

        let resolvedType = allSymbols.find(
          (s) =>
            (s.kind === SymbolKind.Class ||
              s.kind === SymbolKind.Interface ||
              s.kind === SymbolKind.Enum) &&
            (s.name === innerName ||
              s.name === typeName ||
              typeName.endsWith('.' + s.name)),
        ) as TypeSymbol | undefined;

        if (!resolvedType) {
          const symbols = symbolManager.findSymbolByName(typeName);
          resolvedType = symbols.find(
            (s: ApexSymbol) =>
              s.kind === SymbolKind.Class ||
              s.kind === SymbolKind.Interface ||
              s.kind === SymbolKind.Enum,
          ) as TypeSymbol | undefined;
        }

        if (!resolvedType) continue;

        // Exception name validation: Exception types must end in "Exception", non-Exception must not
        const isExceptionType = extendsException(
          resolvedType,
          allSymbols,
          symbolManager,
        );
        if (isExceptionType && !endsWithException(innerName)) {
          errors.push({
            message: localizeTyped(ErrorCodes.NEW_NAME_INVALID_EXCEPTION),
            location: ref.location,
            code: ErrorCodes.NEW_NAME_INVALID_EXCEPTION,
          });
        } else if (!isExceptionType && endsWithException(innerName)) {
          errors.push({
            message: localizeTyped(ErrorCodes.NEW_NAME_CANNOT_END_EXCEPTION),
            location: ref.location,
            code: ErrorCodes.NEW_NAME_CANNOT_END_EXCEPTION,
          });
        }

        // Inner class parentId may point to class block; traverse to get outer type symbol
        let outerType: TypeSymbol | null = resolvedType.parentId
          ? ((allSymbols.find((s) => s.id === resolvedType.parentId) as
              | TypeSymbol
              | undefined) ?? null)
          : null;
        if (outerType && isBlockSymbol(outerType)) {
          const block = outerType as ScopeSymbol;
          const typeSymbol = allSymbols.find(
            (s) =>
              s.id === block.parentId &&
              (s.kind === SymbolKind.Class ||
                s.kind === SymbolKind.Interface ||
                s.kind === SymbolKind.Enum),
          );
          outerType = (typeSymbol as TypeSymbol | undefined) ?? null;
        }

        if (!outerType && typeName.includes('.')) {
          const outerName = typeName.split('.')[0];
          outerType =
            (allSymbols.find(
              (s) =>
                (s.kind === SymbolKind.Class ||
                  s.kind === SymbolKind.Interface) &&
                s.name === outerName,
            ) as TypeSymbol | undefined) ?? null;
        }

        if (outerType) {
          if (innerName.toLowerCase() === outerType.name.toLowerCase()) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.NEW_INNER_TYPE_NAME_CONFLICT_OUTER,
              ),
              location: ref.location,
              code: ErrorCodes.NEW_INNER_TYPE_NAME_CONFLICT_OUTER,
            });
          }
          if (
            outerType.superClass &&
            innerName.toLowerCase() === outerType.superClass.toLowerCase()
          ) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.NEW_INNER_TYPE_NAME_CONFLICT_SUPER_TYPE,
              ),
              location: ref.location,
              code: ErrorCodes.NEW_INNER_TYPE_NAME_CONFLICT_SUPER_TYPE,
            });
          }
          for (const iface of outerType.interfaces ?? []) {
            if (innerName.toLowerCase() === iface.toLowerCase()) {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.NEW_INNER_TYPE_NAME_CONFLICT_INTERFACE,
                ),
                location: ref.location,
                code: ErrorCodes.NEW_INNER_TYPE_NAME_CONFLICT_INTERFACE,
              });
              break;
            }
          }

          const otherInnerTypes = allSymbols.filter(
            (s) =>
              (s.kind === SymbolKind.Class ||
                s.kind === SymbolKind.Interface) &&
              s.parentId === outerType.id &&
              s.name.toLowerCase() === innerName.toLowerCase() &&
              s.id !== resolvedType.id,
          );
          if (otherInnerTypes.length > 0) {
            errors.push({
              message: localizeTyped(ErrorCodes.NEW_NAME_CONFLICT_INNER),
              location: ref.location,
              code: ErrorCodes.NEW_NAME_CONFLICT_INNER,
            });
          }

          const outerClassBlock = allSymbols.find(
            (s) =>
              isBlockSymbol(s) &&
              (s as any).scopeType === 'class' &&
              s.parentId === outerType.id,
          );
          const innerClassBlock = allSymbols.find(
            (s) =>
              isBlockSymbol(s) &&
              (s as any).scopeType === 'class' &&
              s.parentId === resolvedType.id,
          );
          const memberParentIds = [
            outerType.id,
            resolvedType.id,
            outerClassBlock?.id,
            innerClassBlock?.id,
          ].filter(Boolean) as string[];
          const members = allSymbols.filter(
            (s) =>
              (s.kind === SymbolKind.Field ||
                s.kind === SymbolKind.Property ||
                s.kind === SymbolKind.Method) &&
              memberParentIds.includes(s.parentId ?? '') &&
              s.name.toLowerCase() === innerName.toLowerCase(),
          );
          if (members.length > 0) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.NEW_NAME_MEMBER_CONFLICT,
                outerType.name,
              ),
              location: ref.location,
              code: ErrorCodes.NEW_NAME_MEMBER_CONFLICT,
            });
          }
        }

        const refLine =
          ref.location?.identifierRange?.startLine ??
          ref.location?.symbolRange.startLine;
        const locals = allSymbols.filter(
          (s) =>
            (s.kind === SymbolKind.Variable ||
              s.kind === SymbolKind.Parameter) &&
            s.name === innerName,
        ) as VariableSymbol[];
        for (const local of locals) {
          const locLine =
            local.location?.identifierRange?.startLine ??
            local.location?.symbolRange.startLine;
          if (refLine && locLine && refLine >= locLine) {
            errors.push({
              message: localizeTyped(ErrorCodes.NEW_NAME_CONFLICT_LOCAL),
              location: ref.location,
              code: ErrorCodes.NEW_NAME_CONFLICT_LOCAL,
            });
            break;
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
