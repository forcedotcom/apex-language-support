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
import { SymbolKind } from '../../../types/symbol';
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
import { extractBaseTypeName } from '../utils/typeUtils';

/**
 * Known primitive and built-in Apex types that do not need resolution.
 * These are always available in the Apex runtime.
 */
const KNOWN_BUILTIN_TYPES = new Set([
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
  'object',
  'void',
  'list',
  'set',
  'map',
  'sobject',
]);

/**
 * Validates type resolution for:
 * - INVALID_UNRESOLVED_TYPE: Type reference cannot be resolved
 * - INVALID_CLASS: Type resolves to something that is not a class (e.g., interface where class required)
 *
 * This validator checks TYPE_DECLARATION, PARAMETER_TYPE, RETURN_TYPE, CONSTRUCTOR_CALL,
 * CAST_TYPE_REFERENCE, INSTANCEOF_TYPE_REFERENCE, and GENERIC_PARAMETER_TYPE contexts.
 *
 * TIER 1: Same-file resolution only.
 * TIER 2: Cross-file resolution via ISymbolManager.
 */
export const TypeResolutionValidator: Validator = {
  id: 'type-resolution',
  name: 'Type Resolution Validator',
  tier: ValidationTier.THOROUGH,
  priority: 5, // Run before TypeVisibilityValidator
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

      const typeRefContexts = [
        ReferenceContext.TYPE_DECLARATION,
        ReferenceContext.PARAMETER_TYPE,
        ReferenceContext.RETURN_TYPE,
        ReferenceContext.CONSTRUCTOR_CALL,
        ReferenceContext.CAST_TYPE_REFERENCE,
        ReferenceContext.INSTANCEOF_TYPE_REFERENCE,
        ReferenceContext.GENERIC_PARAMETER_TYPE,
      ];

      const typeRefs = allReferences.filter((ref) =>
        typeRefContexts.includes(ref.context),
      );

      // Class-required contexts: extends, implements, constructor call
      const classRequiredContexts = new Set([
        ReferenceContext.CONSTRUCTOR_CALL,
        // TYPE_DECLARATION for variable types can be interface too; PARAMETER_TYPE/RETURN_TYPE can be interface
        // INVALID_CLASS typically applies to extends (super class) - that's in ClassHierarchyValidator
        // For CONSTRUCTOR_CALL we need a class
      ]);

      for (const ref of typeRefs) {
        const typeName = ref.name;
        const baseName = extractBaseTypeName(typeName);

        if (KNOWN_BUILTIN_TYPES.has(baseName)) {
          continue;
        }

        // Check if System-prefixed (e.g., System.String)
        if (typeName.toLowerCase().startsWith('system.')) {
          const systemType = typeName.split('.')[1]?.toLowerCase();
          if (systemType && KNOWN_BUILTIN_TYPES.has(systemType)) {
            continue;
          }
        }

        let typeSymbol: TypeSymbol | null = null;

        // Same-file lookup
        const sameFileType = allSymbols.find(
          (s) =>
            (s.kind === SymbolKind.Class ||
              s.kind === SymbolKind.Interface ||
              s.kind === SymbolKind.Enum) &&
            s.name.toLowerCase() === baseName,
        ) as TypeSymbol | undefined;

        if (sameFileType) {
          typeSymbol = sameFileType;
        } else if (options.tier === ValidationTier.THOROUGH) {
          // Cross-file lookup via symbolManager
          const symbols = symbolManager.findSymbolByName(typeName);
          const found = symbols.find(
            (s: ApexSymbol) =>
              s.kind === SymbolKind.Class ||
              s.kind === SymbolKind.Interface ||
              s.kind === SymbolKind.Enum,
          ) as TypeSymbol | undefined;
          if (found) {
            typeSymbol = found;
          } else {
            const fqnSymbol = symbolManager.findSymbolByFQN(typeName);
            if (
              fqnSymbol &&
              (fqnSymbol.kind === SymbolKind.Class ||
                fqnSymbol.kind === SymbolKind.Interface ||
                fqnSymbol.kind === SymbolKind.Enum)
            ) {
              typeSymbol = fqnSymbol as TypeSymbol;
            }
          }
        }

        if (!typeSymbol) {
          errors.push({
            message: localizeTyped(
              ErrorCodes.INVALID_UNRESOLVED_TYPE,
              typeName,
            ),
            location: ref.location,
            code: ErrorCodes.INVALID_UNRESOLVED_TYPE,
          });
          continue;
        }

        // INVALID_CLASS: When class is required but type is interface or enum
        if (classRequiredContexts.has(ref.context)) {
          if (typeSymbol.kind === SymbolKind.Interface) {
            errors.push({
              message: localizeTyped(ErrorCodes.INVALID_CLASS, typeName),
              location: ref.location,
              code: ErrorCodes.INVALID_CLASS,
            });
          }
          // Enum and Class are both constructable in certain contexts
          // Abstract class is handled by MethodCallValidator (INVALID_NEW_ABSTRACT)
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};
