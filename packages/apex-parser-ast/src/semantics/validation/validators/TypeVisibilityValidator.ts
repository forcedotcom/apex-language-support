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
} from '../../../types/symbol';
import { SymbolKind, SymbolVisibility } from '../../../types/symbol';
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
import type { ISymbolManager as ISymbolManagerInterface } from '../../../types/ISymbolManager';

/**
 * Validates type visibility for:
 * - Type references (TYPE_NOT_VISIBLE)
 * - Method return types (METHOD_RETURN_TYPE_NOT_VISIBLE)
 * - Method parameter types (METHOD_PARAMETER_TYPE_NOT_VISIBLE)
 *
 * This is a TIER 2 (THOROUGH) validation that requires cross-file type resolution.
 * It examines type references in the symbol table and validates that referenced types
 * are visible from the current context.
 *
 * @see SEMANTIC_SYMBOL_RULES.md - Type visibility rules
 */
export const TypeVisibilityValidator: Validator = {
  id: 'type-visibility',
  name: 'Type Visibility Validator',
  tier: ValidationTier.THOROUGH,
  priority: 10,
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

      // Get symbol manager from context
      const symbolManager = yield* ISymbolManager;

      // Get all references from the symbol table
      const allReferences = symbolTable.getAllReferences();
      const typeDeclarations = allReferences.filter(
        (ref) => ref.context === ReferenceContext.TYPE_DECLARATION,
      );
      const parameterTypes = allReferences.filter(
        (ref) => ref.context === ReferenceContext.PARAMETER_TYPE,
      );
      const returnTypes = allReferences.filter(
        (ref) => ref.context === ReferenceContext.RETURN_TYPE,
      );

      // Get all symbols from the table
      const allSymbols = symbolTable.getAllSymbols();

      // Find the containing class for context
      const containingClass = allSymbols.find(
        (s) => s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
      ) as TypeSymbol | undefined;

      if (!containingClass) {
        // No class context - skip validation
        return {
          isValid: true,
          errors,
          warnings,
        };
      }

      // Validate type declarations (variable declarations, field declarations)
      for (const typeRef of typeDeclarations) {
        const typeName = typeRef.name;
        const refLocation = typeRef.location;

        // Resolve the type symbol
        const typeSymbol = yield* resolveTypeSymbol(
          symbolManager,
          typeName,
          allSymbols,
        );

        if (!typeSymbol) {
          // Type not found - skip visibility check (handled by other validators)
          continue;
        }

        // Check visibility
        const isVisible = yield* isTypeVisible(
          typeSymbol,
          containingClass,
          symbolManager,
          allSymbols,
        );

        if (!isVisible) {
          errors.push({
            message: localizeTyped(ErrorCodes.TYPE_NOT_VISIBLE, typeName),
            location: refLocation,
            code: ErrorCodes.TYPE_NOT_VISIBLE,
          });
        }

        // NOT_VISIBLE_MIN_VERSION / NOT_VISIBLE_MAX_VERSION (when version-specific validation enabled)
        if (
          options.enableVersionSpecificValidation &&
          options.apiVersion !== undefined
        ) {
          const versionCheck = yield* checkTypeVersionVisibility(
            typeSymbol,
            typeName,
            options.apiVersion,
          );
          if (versionCheck) {
            errors.push({
              message: versionCheck.message,
              location: refLocation,
              code: versionCheck.code,
            });
          }
        }
      }

      // Validate parameter types
      for (const paramTypeRef of parameterTypes) {
        const typeName = paramTypeRef.name;
        const refLocation = paramTypeRef.location;

        // Resolve the type symbol
        const typeSymbol = yield* resolveTypeSymbol(
          symbolManager,
          typeName,
          allSymbols,
        );

        if (!typeSymbol) {
          // Type not found - skip visibility check
          continue;
        }

        // Check visibility
        const isVisible = yield* isTypeVisible(
          typeSymbol,
          containingClass,
          symbolManager,
          allSymbols,
        );

        if (!isVisible) {
          errors.push({
            message: localizeTyped(
              ErrorCodes.METHOD_PARAMETER_TYPE_NOT_VISIBLE,
              typeName,
            ),
            location: refLocation,
            code: ErrorCodes.METHOD_PARAMETER_TYPE_NOT_VISIBLE,
          });
        }

        if (
          options.enableVersionSpecificValidation &&
          options.apiVersion !== undefined
        ) {
          const versionCheck = yield* checkTypeVersionVisibility(
            typeSymbol,
            typeName,
            options.apiVersion,
          );
          if (versionCheck) {
            errors.push({
              message: versionCheck.message,
              location: refLocation,
              code: versionCheck.code,
            });
          }
        }
      }

      // Validate return types
      for (const returnTypeRef of returnTypes) {
        const typeName = returnTypeRef.name;
        const refLocation = returnTypeRef.location;

        // Resolve the type symbol
        const typeSymbol = yield* resolveTypeSymbol(
          symbolManager,
          typeName,
          allSymbols,
        );

        if (!typeSymbol) {
          // Type not found - skip visibility check
          continue;
        }

        // Check visibility
        const isVisible = yield* isTypeVisible(
          typeSymbol,
          containingClass,
          symbolManager,
          allSymbols,
        );

        if (!isVisible) {
          errors.push({
            message: localizeTyped(
              ErrorCodes.METHOD_RETURN_TYPE_NOT_VISIBLE,
              typeName,
            ),
            location: refLocation,
            code: ErrorCodes.METHOD_RETURN_TYPE_NOT_VISIBLE,
          });
        }

        if (
          options.enableVersionSpecificValidation &&
          options.apiVersion !== undefined
        ) {
          const versionCheck = yield* checkTypeVersionVisibility(
            typeSymbol,
            typeName,
            options.apiVersion,
          );
          if (versionCheck) {
            errors.push({
              message: versionCheck.message,
              location: refLocation,
              code: versionCheck.code,
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

function parseMajorVersion(value: string): number | undefined {
  const cleaned = value.trim().replace(/^["']|["']$/g, '');
  const match = /^(\d+)/.exec(cleaned);
  return match ? parseInt(match[1], 10) : undefined;
}

function getDeprecatedVersionParams(typeSymbol: TypeSymbol): {
  removed?: number;
} {
  const deprecated = typeSymbol.annotations?.find((ann) =>
    ann.name.toLowerCase().startsWith('deprecated'),
  );
  if (!deprecated?.parameters) {
    return {};
  }
  for (const p of deprecated.parameters) {
    if (p.name?.toLowerCase() === 'removed' && p.value) {
      const v = parseMajorVersion(p.value);
      if (v !== undefined) return { removed: v };
    }
  }
  return {};
}

/**
 * Check if a type is visible for the given API version.
 * Uses @Deprecated(removed=X): NOT_VISIBLE_MAX_VERSION when apiVersion >= removed.
 * NOT_VISIBLE_MIN_VERSION requires package metadata (added-since) - not available from @Deprecated.
 */
function checkTypeVersionVisibility(
  typeSymbol: TypeSymbol,
  typeName: string,
  apiVersion: number,
): Effect.Effect<{ message: string; code: string } | null, never, never> {
  return Effect.gen(function* () {
    const { removed } = getDeprecatedVersionParams(typeSymbol);

    if (removed !== undefined && apiVersion >= removed) {
      return {
        message: localizeTyped(
          ErrorCodes.NOT_VISIBLE_MAX_VERSION,
          'Type',
          typeName,
          `${removed}.0`,
        ),
        code: ErrorCodes.NOT_VISIBLE_MAX_VERSION,
      };
    }

    return null;
  });
}

/**
 * Resolve a type symbol by name
 */
function resolveTypeSymbol(
  symbolManager: ISymbolManagerInterface,
  typeName: string,
  allSymbols: ApexSymbol[],
): Effect.Effect<TypeSymbol | null, never, never> {
  return Effect.gen(function* () {
    // First, try to find in same file
    const sameFileType = allSymbols.find(
      (s) =>
        (s.kind === SymbolKind.Class ||
          s.kind === SymbolKind.Interface ||
          s.kind === SymbolKind.Enum) &&
        s.name.toLowerCase() === typeName.toLowerCase(),
    ) as TypeSymbol | undefined;

    if (sameFileType) {
      return sameFileType;
    }

    // Try to find via symbol manager (cross-file)
    const symbols = symbolManager.findSymbolByName(typeName);
    const typeSymbol = symbols.find(
      (s: ApexSymbol) =>
        s.kind === SymbolKind.Class ||
        s.kind === SymbolKind.Interface ||
        s.kind === SymbolKind.Enum,
    ) as TypeSymbol | undefined;

    if (typeSymbol) {
      return typeSymbol;
    }

    // Try FQN lookup
    const fqnSymbol = symbolManager.findSymbolByFQN(typeName);
    if (
      fqnSymbol &&
      (fqnSymbol.kind === SymbolKind.Class ||
        fqnSymbol.kind === SymbolKind.Interface ||
        fqnSymbol.kind === SymbolKind.Enum)
    ) {
      return fqnSymbol as TypeSymbol;
    }

    return null;
  });
}

/**
 * Check if a type is visible from the calling context
 */
function isTypeVisible(
  typeSymbol: TypeSymbol,
  callingClass: TypeSymbol,
  symbolManager: ISymbolManagerInterface,
  allSymbols: ApexSymbol[],
): Effect.Effect<boolean, never, never> {
  return Effect.gen(function* () {
    const visibility =
      typeSymbol.modifiers?.visibility ?? SymbolVisibility.Default;

    // Public, Global types are always visible
    if (
      visibility === SymbolVisibility.Public ||
      visibility === SymbolVisibility.Global
    ) {
      return true;
    }

    // Private types are only visible within the same class/file
    if (visibility === SymbolVisibility.Private) {
      // For same-file types, check if they're in the same file
      // For now, assume same-file if found in allSymbols
      const isSameFile = allSymbols.some((s) => s.id === typeSymbol.id);
      return isSameFile;
    }

    // Protected/Default types are visible to subclasses and same package
    // For now, we'll check if they're in the same file or if calling class extends the type's class
    // (This is a simplified check - full implementation would check package membership)
    if (
      visibility === SymbolVisibility.Protected ||
      visibility === SymbolVisibility.Default
    ) {
      // Check if same file
      const isSameFile = allSymbols.some((s) => s.id === typeSymbol.id);
      if (isSameFile) {
        return true;
      }

      // Check if calling class extends the type's class (for inner classes)
      // This is a simplified check - full implementation would be more complex
      return false; // Conservative: assume not visible if not same file
    }

    // Unknown visibility - assume visible (conservative)
    return true;
  });
}
