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
  VariableSymbol,
  TypeSymbol,
  ApexSymbol,
  ScopeSymbol,
} from '../../../types/symbol';
import { SymbolKind, SymbolVisibility } from '../../../types/symbol';
import {
  isBlockSymbol,
  isChainedSymbolReference,
} from '../../../utils/symbolNarrowing';
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
 * Validates variable and field references for:
 * - Variable/field existence (VARIABLE_DOES_NOT_EXIST, FIELD_DOES_NOT_EXIST)
 * - Variable/field visibility (VARIABLE_NOT_VISIBLE)
 *
 * This is a TIER 2 (THOROUGH) validation that requires cross-file type resolution.
 * It examines variable usage and field access references in the symbol table and
 * validates them against available variable and field symbols, including fields
 * from superclasses.
 *
 * @see SEMANTIC_SYMBOL_RULES.md - Variable and field resolution rules
 */
export const VariableResolutionValidator: Validator = {
  id: 'variable-resolution',
  name: 'Variable Resolution Validator',
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

      // Extract field accesses from chained references FIRST
      // Chained references represent dotted expressions like obj.field
      const chainedTypeRefs = allReferences.filter((ref) =>
        isChainedSymbolReference(ref),
      );
      const extractedFieldAccesses: any[] = [];
      const extractedWriteFieldAccesses: any[] = []; // Track write accesses separately

      for (const chainedRef of chainedTypeRefs) {
        if (chainedRef.chainNodes && Array.isArray(chainedRef.chainNodes)) {
          // Process intermediate nodes (read access)
          for (let i = 1; i < chainedRef.chainNodes.length - 1; i++) {
            const node = chainedRef.chainNodes[i];
            if (node.context === ReferenceContext.FIELD_ACCESS) {
              extractedFieldAccesses.push({
                ...node,
                parentContext: chainedRef.parentContext || node.parentContext,
                access: 'read', // Intermediate nodes are always read
              });
            }
          }

          // Process final node (may have write access)
          const finalNode =
            chainedRef.chainNodes[chainedRef.chainNodes.length - 1];
          if (finalNode.context === ReferenceContext.FIELD_ACCESS) {
            const isWriteAccess =
              finalNode.access === 'write' ||
              finalNode.access === 'readwrite' ||
              chainedRef.access === 'write' ||
              chainedRef.access === 'readwrite';

            if (isWriteAccess) {
              // Track write accesses separately for write visibility validation
              extractedWriteFieldAccesses.push({
                ...finalNode,
                parentContext:
                  chainedRef.parentContext || finalNode.parentContext,
                access: finalNode.access || chainedRef.access,
              });
            } else {
              // Read access - add to regular field accesses
              extractedFieldAccesses.push({
                ...finalNode,
                parentContext:
                  chainedRef.parentContext || finalNode.parentContext,
                access: 'read',
              });
            }
          }
        }
      }

      // Build a set of variable usage locations that are part of chains
      // These should be excluded from standalone variable validation
      const variableUsagesInChains = new Set<string>();
      for (const chainedRef of chainedTypeRefs) {
        if (chainedRef.chainNodes && Array.isArray(chainedRef.chainNodes)) {
          const firstNode = chainedRef.chainNodes[0];
          if (
            firstNode &&
            (firstNode.context === ReferenceContext.VARIABLE_USAGE ||
              firstNode.context === ReferenceContext.CLASS_REFERENCE ||
              firstNode.context === ReferenceContext.CHAIN_STEP ||
              firstNode.context === ReferenceContext.NAMESPACE)
          ) {
            const firstNodeLine =
              firstNode.location?.symbolRange?.startLine ??
              firstNode.location?.identifierRange?.startLine;
            const firstNodeCol =
              firstNode.location?.symbolRange?.startColumn ??
              firstNode.location?.identifierRange?.startColumn;
            if (firstNodeLine && firstNodeCol) {
              const key = `${firstNode.name}:${firstNodeLine}:${firstNodeCol}`;
              variableUsagesInChains.add(key);
            }
          }
        }
      }

      // Filter variable usages to exclude those that are part of chained references
      const variableUsages = allReferences.filter((ref) => {
        if (ref.context !== ReferenceContext.VARIABLE_USAGE) {
          return false;
        }

        // Skip if it's inside a string literal (heuristic check)
        // This handles cases where the parser incorrectly creates VARIABLE_USAGE for string literals
        if (options.sourceContent && ref.location) {
          const refLine =
            ref.location?.symbolRange?.startLine ??
            ref.location?.identifierRange?.startLine;
          const refCol =
            ref.location?.symbolRange?.startColumn ??
            ref.location?.identifierRange?.startColumn;
          if (refLine && refCol) {
            const lines = options.sourceContent.split('\n');
            const line = lines[refLine - 1];
            if (line && refCol > 0 && refCol <= line.length + 1) {
              // Check if the character at the reference start position is a quote
              // refCol is 1-based, so refCol - 1 is 0-based index
              const startIdx = refCol - 1;
              if (startIdx >= 0 && startIdx < line.length) {
                const startChar = line[startIdx];
                if (startChar === '"') {
                  return false; // Skip - reference starts with quote, it's a string literal (parser bug)
                }
              }

              // Also check if we're inside quotes by counting quotes before the reference start
              const beforeRef = line.substring(
                0,
                Math.min(refCol - 1, line.length),
              );
              // Count unescaped quotes before the reference
              let quoteCount = 0;
              let escaped = false;
              for (let i = 0; i < beforeRef.length; i++) {
                if (beforeRef[i] === '\\' && !escaped) {
                  escaped = true;
                  continue;
                }
                if (beforeRef[i] === '"' && !escaped) {
                  quoteCount++;
                }
                escaped = false;
              }
              // If odd number of quotes before, we're inside a string literal
              if (quoteCount % 2 === 1) {
                return false; // Skip - it's inside a string literal (parser bug)
              }
            }
          }
        }

        const refLine =
          ref.location?.symbolRange?.startLine ??
          ref.location?.identifierRange?.startLine;
        const refCol =
          ref.location?.symbolRange?.startColumn ??
          ref.location?.identifierRange?.startColumn;
        if (refLine && refCol) {
          const key = `${ref.name}:${refLine}:${refCol}`;
          if (variableUsagesInChains.has(key)) {
            return false; // Skip - it's part of a chain
          }
        }
        return true;
      });

      // Combine regular field accesses with extracted ones from chains
      const fieldAccesses = [
        ...allReferences.filter(
          (ref) => ref.context === ReferenceContext.FIELD_ACCESS,
        ),
        ...extractedFieldAccesses,
      ];

      // Get all symbols from the table
      const allSymbols = symbolTable.getAllSymbols();

      // Find the containing class for context
      const containingClass = allSymbols.find(
        (s) => s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
      ) as TypeSymbol | undefined;

      // Validate variable usages
      for (const variableRef of variableUsages) {
        const variableName = variableRef.name;
        const refLocation = variableRef.location;

        // Find variable in scope hierarchy
        const variable = findVariableInScope(
          variableName,
          variableRef.parentContext,
          allSymbols,
          symbolTable,
        );

        if (!variable) {
          // Variable not found - check if it might be a string literal (parser bug workaround)
          if (options.sourceContent && refLocation) {
            const refLine =
              refLocation?.symbolRange?.startLine ??
              refLocation?.identifierRange?.startLine;
            const refCol =
              refLocation?.symbolRange?.startColumn ??
              refLocation?.identifierRange?.startColumn;
            if (refLine && refCol) {
              const lines = options.sourceContent.split('\n');
              const line = lines[refLine - 1];
              if (line && refCol > 0) {
                // Check if the reference starts with a quote (parser created VARIABLE_USAGE for string literal)
                // refCol is 1-based, so refCol - 1 is 0-based index of the start character
                const startChar =
                  refCol - 1 < line.length ? line[refCol - 1] : null;
                if (startChar === '"') {
                  continue; // Skip - reference starts with quote, it's a string literal (parser bug)
                }

                // Also check if we're inside quotes by counting quotes before the reference start
                const beforeRef = line.substring(
                  0,
                  Math.min(refCol - 1, line.length),
                );
                // Count unescaped quotes before the reference
                let quoteCount = 0;
                let escaped = false;
                for (let i = 0; i < beforeRef.length; i++) {
                  if (beforeRef[i] === '\\' && !escaped) {
                    escaped = true;
                    continue;
                  }
                  if (beforeRef[i] === '"' && !escaped) {
                    quoteCount++;
                  }
                  escaped = false;
                }
                // If odd number of quotes before, we're inside a string literal
                if (quoteCount % 2 === 1) {
                  continue; // Skip - it's inside a string literal (parser bug)
                }
              }
            }
          }

          // Variable not found
          errors.push({
            message: localizeTyped(
              ErrorCodes.VARIABLE_DOES_NOT_EXIST,
              variableName,
            ),
            location: refLocation,
            code: ErrorCodes.VARIABLE_DOES_NOT_EXIST,
          });
          continue;
        }

        // Check visibility if it's a field (not a local variable or parameter)
        if (variable.kind === SymbolKind.Field && containingClass) {
          const isVisible = yield* isVariableVisible(
            variable as VariableSymbol,
            containingClass,
            symbolManager,
            allSymbols,
          );

          if (!isVisible) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.VARIABLE_NOT_VISIBLE,
                variableName,
              ),
              location: refLocation,
              code: ErrorCodes.VARIABLE_NOT_VISIBLE,
            });
          }
        }
      }

      // Validate field accesses
      for (const fieldRef of fieldAccesses) {
        // Extract just the field name (handle cases where name might be "obj.field" instead of "field")
        let fieldName = fieldRef.name;
        // If field name contains a dot, extract the part after the last dot
        if (fieldName.includes('.')) {
          const parts = fieldName.split('.');
          fieldName = parts[parts.length - 1];
        }
        const refLocation = fieldRef.location;

        if (!containingClass) {
          continue;
        }

        // TIER 2 Enhancement: For qualified field access (obj.field), resolve object type
        let targetType: TypeSymbol | null = null;

        // Try to find object name from chain context first (for field accesses extracted from chains)
        let objectName: string | null = null;
        for (const chainedRef of chainedTypeRefs) {
          if (chainedRef.chainNodes && chainedRef.chainNodes.length > 0) {
            // Check if this field access is from this chain
            const finalNode =
              chainedRef.chainNodes[chainedRef.chainNodes.length - 1];
            if (
              finalNode.name === fieldName &&
              finalNode.context === ReferenceContext.FIELD_ACCESS
            ) {
              // Found the chain - get base object name from first node
              const baseNode = chainedRef.chainNodes[0];
              if (
                baseNode.context === ReferenceContext.VARIABLE_USAGE ||
                baseNode.context === ReferenceContext.CLASS_REFERENCE
              ) {
                objectName = baseNode.name;
                break;
              }
            }
          }
        }

        // If not found in chain, try to extract from source content
        if (!objectName && options.sourceContent) {
          objectName = extractObjectNameFromFieldAccess(
            fieldRef,
            options.sourceContent,
          );
        }

        if (objectName) {
          // Resolve the object's type
          // For qualified field access like obj.field, the object variable might be
          // part of a chained reference, so we need to find it even if it's in a chain
          let objectVariable = findVariableInScope(
            objectName,
            fieldRef.parentContext,
            allSymbols,
            symbolTable,
          );

          // If not found, try to find it in chained references (as first node)
          if (!objectVariable) {
            for (const chainedRef of chainedTypeRefs) {
              if (chainedRef.chainNodes && chainedRef.chainNodes.length > 0) {
                const firstNode = chainedRef.chainNodes[0];
                if (
                  firstNode.name === objectName &&
                  firstNode.context === ReferenceContext.VARIABLE_USAGE
                ) {
                  // Found the variable as first node of a chain - resolve it
                  // Try to find it using symbol table lookup (which searches scopes)
                  objectVariable = findVariableInScope(
                    objectName,
                    fieldRef.parentContext,
                    allSymbols,
                    symbolTable,
                  );
                  if (objectVariable) {
                    break;
                  }
                }
              }
            }
          }

          if (objectVariable?.type?.name) {
            // Find the type symbol for the object's type
            const typeSymbols = symbolManager.findSymbolByName(
              objectVariable.type.name,
            );
            const typeSymbol = typeSymbols.find(
              (s: ApexSymbol) =>
                s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
            ) as TypeSymbol | undefined;

            if (typeSymbol) {
              targetType = typeSymbol;
            }
          }
        }

        // If we couldn't resolve object type, fall back to current class hierarchy
        if (!targetType) {
          targetType = containingClass;
        }

        // Find field in the target type's hierarchy
        const field = yield* findFieldInHierarchy(
          symbolManager,
          targetType,
          fieldName,
          allSymbols,
        );

        if (!field) {
          // Field not found
          const typeName =
            targetType?.name || containingClass?.name || 'unknown';
          errors.push({
            message: localizeTyped(
              ErrorCodes.FIELD_DOES_NOT_EXIST,
              fieldName,
              typeName,
            ),
            location: refLocation,
            code: ErrorCodes.FIELD_DOES_NOT_EXIST,
          });
          continue;
        }

        // Check visibility
        const isVisible = yield* isVariableVisible(
          field,
          containingClass,
          symbolManager,
          allSymbols,
        );

        if (!isVisible) {
          errors.push({
            message: localizeTyped(ErrorCodes.VARIABLE_NOT_VISIBLE, fieldName),
            location: refLocation,
            code: ErrorCodes.VARIABLE_NOT_VISIBLE,
          });
        }

        // INVALID_FIELD_TYPE_LOAD/STORE: Void type fields cannot be read/written
        if (field.type?.name?.toLowerCase() === 'void') {
          const isWrite =
            (fieldRef as { access?: string }).access === 'write' ||
            (fieldRef as { access?: string }).access === 'readwrite';
          errors.push({
            message: localizeTyped(
              isWrite
                ? ErrorCodes.INVALID_FIELD_TYPE_STORE
                : ErrorCodes.INVALID_FIELD_TYPE_LOAD,
              fieldName,
              targetType?.name || 'unknown',
            ),
            location: refLocation,
            code: isWrite
              ? ErrorCodes.INVALID_FIELD_TYPE_STORE
              : ErrorCodes.INVALID_FIELD_TYPE_LOAD,
          });
        }
      }

      // Validate write field accesses (from chains with write/readwrite access)
      // These need additional validation for write visibility
      for (const fieldRef of extractedWriteFieldAccesses) {
        const fieldName = fieldRef.name;
        const refLocation = fieldRef.location;

        if (!containingClass) {
          continue;
        }

        // Resolve object type for qualified field access
        let targetType: TypeSymbol | null = null;

        if (options.sourceContent && fieldRef.parentContext) {
          // Try to extract object name from chain context
          // For chained references, find the chain that contains this field
          for (const chainedRef of chainedTypeRefs) {
            if (
              chainedRef.chainNodes &&
              chainedRef.chainNodes.length > 0 &&
              chainedRef.chainNodes[chainedRef.chainNodes.length - 1].name ===
                fieldName
            ) {
              // Found the chain - get base object name
              const baseNode = chainedRef.chainNodes[0];
              const objectName = baseNode.name;

              if (objectName) {
                const objectVariable = findVariableInScope(
                  objectName,
                  fieldRef.parentContext,
                  allSymbols,
                  symbolTable,
                );

                if (objectVariable?.type?.name) {
                  const typeSymbols = symbolManager.findSymbolByName(
                    objectVariable.type.name,
                  );
                  const typeSymbol = typeSymbols.find(
                    (s: ApexSymbol) =>
                      s.kind === SymbolKind.Class ||
                      s.kind === SymbolKind.Interface,
                  ) as TypeSymbol | undefined;

                  if (typeSymbol) {
                    targetType = typeSymbol;
                    break; // Found the target type
                  }
                }
              }
            }
          }
        }

        // If we couldn't resolve object type, fall back to current class hierarchy
        if (!targetType) {
          targetType = containingClass;
        }

        // Find field in the target type's hierarchy
        const field = yield* findFieldInHierarchy(
          symbolManager,
          targetType,
          fieldName,
          allSymbols,
        );

        if (!field) {
          // Field not found
          const typeName =
            targetType?.name || containingClass?.name || 'unknown';
          errors.push({
            message: localizeTyped(
              ErrorCodes.FIELD_DOES_NOT_EXIST,
              fieldName,
              typeName,
            ),
            location: refLocation,
            code: ErrorCodes.FIELD_DOES_NOT_EXIST,
          });
          continue;
        }

        // Check write visibility (same as read visibility for now)
        // TODO: Add specific write visibility checks if needed (e.g., readonly fields)
        const isVisible = yield* isVariableVisible(
          field,
          containingClass,
          symbolManager,
          allSymbols,
        );

        if (!isVisible) {
          errors.push({
            message: localizeTyped(ErrorCodes.VARIABLE_NOT_VISIBLE, fieldName),
            location: refLocation,
            code: ErrorCodes.VARIABLE_NOT_VISIBLE,
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

/**
 * Extract object name from field access reference by parsing source content
 * For qualified field access like "obj.field", extracts "obj"
 */
function extractObjectNameFromFieldAccess(
  fieldRef: any, // SymbolReference with FIELD_ACCESS context
  sourceContent: string,
): string | null {
  if (!sourceContent || !fieldRef.location) {
    return null;
  }

  const location = fieldRef.location;
  const startLine =
    location.identifierRange?.startLine ?? location.symbolRange.startLine;
  const startColumn =
    location.identifierRange?.startColumn ?? location.symbolRange.startColumn;

  const lines = sourceContent.split('\n');
  if (startLine < 1 || startLine > lines.length) {
    return null;
  }

  const fieldAccessLine = lines[startLine - 1];
  if (!fieldAccessLine) {
    return null;
  }

  // Find the dot before the field name
  // Look backwards from the field name position to find the dot
  const fieldName = fieldRef.name;
  const fieldNameIndex = fieldAccessLine
    .substring(startColumn - 1)
    .toLowerCase()
    .indexOf(fieldName.toLowerCase());

  if (fieldNameIndex < 0) {
    return null;
  }

  // Look backwards from before the dot to find the object name
  const dotIndex = startColumn - 1 + fieldNameIndex - 1;
  if (dotIndex < 0 || fieldAccessLine[dotIndex] !== '.') {
    return null;
  }

  // Extract object name (everything before the dot, trimmed)
  // Handle cases like "obj.field", "obj.field.field2", etc.
  const beforeDot = fieldAccessLine.substring(0, dotIndex).trim();

  // Extract the last identifier before the dot
  // This handles cases like "myObj.field" or "this.field"
  const identifierMatch = beforeDot.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*\.?\s*$/);
  if (identifierMatch) {
    return identifierMatch[1];
  }

  // Fallback: try to extract any identifier-like string
  const parts = beforeDot.split(/[^a-zA-Z0-9_]+/);
  if (parts.length > 0) {
    const lastPart = parts[parts.length - 1];
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(lastPart)) {
      return lastPart;
    }
  }

  return null;
}

/**
 * Find a variable in the scope hierarchy
 */
function findVariableInScope(
  variableName: string,
  parentContext: string | undefined,
  allSymbols: ApexSymbol[],
  symbolTable: SymbolTable,
): VariableSymbol | null {
  // Use symbol table's lookup method which searches through scopes
  const symbol = symbolTable.lookup(variableName, null);

  if (
    symbol &&
    (symbol.kind === SymbolKind.Variable ||
      symbol.kind === SymbolKind.Parameter ||
      symbol.kind === SymbolKind.Field)
  ) {
    return symbol as VariableSymbol;
  }

  // Fallback: search allSymbols directly if lookup failed
  // This handles cases where variables might not be in the symbol table's scope tree
  const matchingSymbols = allSymbols.filter(
    (s) =>
      (s.kind === SymbolKind.Variable ||
        s.kind === SymbolKind.Parameter ||
        s.kind === SymbolKind.Field) &&
      s.name === variableName,
  );

  if (matchingSymbols.length > 0) {
    return matchingSymbols[0] as VariableSymbol;
  }

  return null;
}

/**
 * Find a field in the class hierarchy (including superclasses)
 */
function findFieldInHierarchy(
  symbolManager: ISymbolManagerInterface,
  classSymbol: TypeSymbol,
  fieldName: string,
  allSymbols: ApexSymbol[],
): Effect.Effect<VariableSymbol | null, never, never> {
  return Effect.gen(function* () {
    // Get all symbols across all files for cross-file resolution
    const allSymbolsForCompletion = symbolManager.getAllSymbolsForCompletion
      ? symbolManager.getAllSymbolsForCompletion()
      : [];
    // Combine with current file symbols (current file takes precedence)
    const combinedSymbols = [
      ...allSymbols,
      ...allSymbolsForCompletion.filter(
        (s) => !allSymbols.some((existing) => existing.id === s.id),
      ),
    ];

    // Find fields in the current class (including cross-file)
    const classFields = findFieldsInClass(classSymbol, combinedSymbols);
    const matchingField = classFields.find(
      (f) => f.name.toLowerCase() === fieldName.toLowerCase(),
    );

    if (matchingField) {
      return matchingField;
    }

    // If there's a superclass, find fields there too
    if (classSymbol.superClass) {
      const superClassField = yield* findFieldInSuperclass(
        symbolManager,
        classSymbol.superClass,
        fieldName,
      );
      if (superClassField) {
        return superClassField;
      }
    }

    return null;
  });
}

/**
 * Find all fields in a class (same file only)
 */
function findFieldsInClass(
  classSymbol: TypeSymbol,
  allSymbols: ApexSymbol[],
): VariableSymbol[] {
  const fields: VariableSymbol[] = [];

  // Find the class block (fields might have parentId pointing to class block)
  const classBlock = allSymbols.find(
    (s) =>
      isBlockSymbol(s) &&
      s.scopeType === 'class' &&
      s.parentId === classSymbol.id,
  ) as ScopeSymbol | undefined;

  // Get fields directly in this class
  for (const symbol of allSymbols) {
    if (
      symbol.kind === SymbolKind.Field &&
      (symbol.parentId === classBlock?.id || symbol.parentId === classSymbol.id)
    ) {
      fields.push(symbol as VariableSymbol);
    }
  }

  return fields;
}

/**
 * Find a field in a superclass (cross-file resolution)
 */
function findFieldInSuperclass(
  symbolManager: ISymbolManagerInterface,
  superClassName: string,
  fieldName: string,
): Effect.Effect<VariableSymbol | null, never, never> {
  return Effect.gen(function* () {
    // Find the superclass type symbol
    const superClassSymbols = symbolManager.findSymbolByName(superClassName);
    const superClassSymbol = superClassSymbols.find(
      (s: ApexSymbol) =>
        s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
    ) as TypeSymbol | undefined;

    if (!superClassSymbol) {
      // Superclass not found - might need artifact loading
      return null;
    }

    // Get all symbols for completion to find fields
    const allSymbols = symbolManager.getAllSymbolsForCompletion();

    // Find fields in the superclass
    const superClassFields = findFieldsInClass(superClassSymbol, allSymbols);
    const matchingField = superClassFields.find(
      (f) => f.name.toLowerCase() === fieldName.toLowerCase(),
    );

    if (matchingField) {
      return matchingField;
    }

    // Recursively check superclass's superclass
    if (superClassSymbol.superClass) {
      const ancestorField = yield* findFieldInSuperclass(
        symbolManager,
        superClassSymbol.superClass,
        fieldName,
      );
      if (ancestorField) {
        return ancestorField;
      }
    }

    return null;
  });
}

/**
 * Check if a variable/field is visible from the calling context
 */
function isVariableVisible(
  variable: VariableSymbol,
  callingClass: TypeSymbol,
  symbolManager: ISymbolManagerInterface,
  allSymbols: ApexSymbol[],
): Effect.Effect<boolean, never, never> {
  return Effect.gen(function* () {
    const visibility =
      variable.modifiers?.visibility ?? SymbolVisibility.Default;

    // Public, Global fields are always visible
    if (
      visibility === SymbolVisibility.Public ||
      visibility === SymbolVisibility.Global
    ) {
      return true;
    }

    // Find the declaring class for this field
    const declaringClass = findDeclaringClassForVariable(
      variable,
      allSymbols,
      symbolManager,
    );
    if (!declaringClass) {
      // Can't determine declaring class - assume visible (conservative)
      return true;
    }

    // Private fields are only visible within the same class
    if (visibility === SymbolVisibility.Private) {
      return declaringClass.id === callingClass.id;
    }

    // Protected/Default fields are visible to subclasses
    if (
      visibility === SymbolVisibility.Protected ||
      visibility === SymbolVisibility.Default
    ) {
      // Check if calling class is the same or a subclass of declaring class
      if (declaringClass.id === callingClass.id) {
        return true;
      }

      // Check if calling class extends declaring class
      return isSubclassOf(
        callingClass,
        declaringClass,
        symbolManager,
        allSymbols,
      );
    }

    // Unknown visibility - assume visible (conservative)
    return true;
  });
}

/**
 * Find the declaring class for a variable/field
 */
function findDeclaringClassForVariable(
  variable: VariableSymbol,
  allSymbols: ApexSymbol[],
  symbolManager: ISymbolManagerInterface,
): TypeSymbol | null {
  // Try to find the class in the same file first
  let current: ApexSymbol | null = variable;
  while (current) {
    if (
      current.kind === SymbolKind.Class ||
      current.kind === SymbolKind.Interface
    ) {
      return current as TypeSymbol;
    }
    if (current.parentId) {
      const parent = allSymbols.find((s) => s.id === current!.parentId);
      if (
        parent &&
        (parent.kind === SymbolKind.Class ||
          parent.kind === SymbolKind.Interface)
      ) {
        return parent as TypeSymbol;
      }
      // If parent is a block, check its parent
      if (parent && parent.kind === SymbolKind.Block && parent.parentId) {
        const grandParent = allSymbols.find((s) => s.id === parent!.parentId);
        if (
          grandParent &&
          (grandParent.kind === SymbolKind.Class ||
            grandParent.kind === SymbolKind.Interface)
        ) {
          return grandParent as TypeSymbol;
        }
      }
      current = parent ?? null;
    } else {
      break;
    }
  }

  // If not found in same file, might be from superclass
  return null;
}

/**
 * Check if a class is a subclass of another class
 */
function isSubclassOf(
  childClass: TypeSymbol,
  parentClass: TypeSymbol,
  symbolManager: ISymbolManagerInterface,
  allSymbols: ApexSymbol[],
): boolean {
  // Check direct superclass
  if (childClass.superClass === parentClass.name) {
    return true;
  }

  // Check if child's superclass extends parent (recursive)
  if (childClass.superClass) {
    const superClassSymbols = symbolManager.findSymbolByName(
      childClass.superClass,
    );
    const superClassSymbol = superClassSymbols.find(
      (s: ApexSymbol) =>
        s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
    ) as TypeSymbol | undefined;

    if (superClassSymbol) {
      return isSubclassOf(
        superClassSymbol,
        parentClass,
        symbolManager,
        allSymbols,
      );
    }
  }

  return false;
}
