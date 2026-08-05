/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import type { ValidationResult, ValidationScope } from './ValidationResult';
import type { TypeInfo } from './TypeValidator';
import type { ApexSymbol, TypeSymbol } from '../../types/symbol';
import { SymbolKind } from '../../types/symbol';
import { isNumericType, isPrimitiveType } from '../../utils/primitiveTypes';
import { isAssignable } from './utils/typeAssignability';

interface SemanticCastingScope {
  allSymbols?: ApexSymbol[];
  symbolTable?: {
    getAllSymbols?: () => ApexSymbol[];
  };
}

/**
 * Validates type casting operations
 */
export class TypeCastingValidator {
  /**
   * Validate a cast operation
   */
  static validateCast(
    sourceType: TypeInfo,
    targetType: TypeInfo,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if target type is valid for casting
    if (!this.isValidCastTarget(targetType)) {
      errors.push('invalid.cast.type');
      return { isValid: false, errors, warnings };
    }

    // Check if source type is valid for casting
    if (!this.isValidCastSource(sourceType)) {
      errors.push('invalid.cast.type');
      return { isValid: false, errors, warnings };
    }

    // Check if types are compatible for casting
    if (!this.isCompatibleForCast(sourceType, targetType, scope)) {
      errors.push('incompatible.cast.types');
      return { isValid: false, errors, warnings };
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Check if a type is a valid cast target
   */
  private static isValidCastTarget(type: TypeInfo): boolean {
    // Cannot cast to void
    if (type.name === 'void') {
      return false;
    }

    return true;
  }

  /**
   * Check if a type is a valid cast source
   */
  private static isValidCastSource(type: TypeInfo): boolean {
    // Cannot cast from void
    if (type.name === 'void') {
      return false;
    }

    return true;
  }

  /**
   * Check if types are compatible for casting
   */
  private static isCompatibleForCast(
    source: TypeInfo,
    target: TypeInfo,
    scope: ValidationScope,
  ): boolean {
    // Handle collection types first (even if same collection type, need to check elements)
    if (source.isCollection || target.isCollection) {
      return this.areCollectionTypesCompatible(source, target, scope);
    }

    // Same type is always compatible (for non-collections)
    if (source.name.toLowerCase() === target.name.toLowerCase()) {
      return true;
    }

    // Handle SObject types before Object check
    // SObject has specific rules (e.g., Object cannot be cast to SObject)
    if (source.isSObject || target.isSObject) {
      return this.areSObjectTypesCompatible(source, target);
    }

    // Handle Object type (can be cast to/from any type except SObject)
    // This must come before primitive check since Object is now considered a primitive
    if (source.name === 'Object' || target.name === 'Object') {
      return this.isObjectTypeCompatible(source, target);
    }

    // Handle primitive types
    if (
      (isPrimitiveType(source.name) || source.isPrimitive) &&
      (isPrimitiveType(target.name) || target.isPrimitive)
    ) {
      return this.arePrimitiveTypesCompatible(source.name, target.name);
    }

    return this.areClassTypesCompatible(source, target, scope);
  }

  /**
   * Check if primitive types are compatible for casting
   */
  private static arePrimitiveTypesCompatible(
    sourceName: string,
    targetName: string,
  ): boolean {
    // Numeric types can be cast between each other
    if (isNumericType(sourceName) && isNumericType(targetName)) {
      return true;
    }

    // Boolean cannot be cast to/from other primitives
    if (sourceName === 'Boolean' || targetName === 'Boolean') {
      return false;
    }

    // Date/Time types are not compatible with other primitives
    if (
      ['Date', 'DateTime', 'Time'].includes(sourceName) ||
      ['Date', 'DateTime', 'Time'].includes(targetName)
    ) {
      return false;
    }

    // Blob and Id are not compatible with other primitives
    if (
      sourceName === 'Blob' ||
      targetName === 'Blob' ||
      sourceName === 'Id' ||
      targetName === 'Id' ||
      sourceName === 'ID' ||
      targetName === 'ID'
    ) {
      return false;
    }

    return false;
  }

  /**
   * Check if SObject types are compatible for casting
   */
  private static areSObjectTypesCompatible(
    source: TypeInfo,
    target: TypeInfo,
  ): boolean {
    // SObject can be cast to Object
    if (source.isSObject && target.name === 'Object') {
      return true;
    }

    // Object cannot be cast to SObject (would need runtime check)
    if (source.name === 'Object' && target.isSObject) {
      return false;
    }

    // Generic SObject is the semantic base type for concrete SObjects. Casts
    // between it and a concrete SObject are valid in either direction.
    if (source.isSObject && target.isSObject) {
      return (
        source.name.toLowerCase() === 'sobject' ||
        target.name.toLowerCase() === 'sobject'
      );
    }

    return false;
  }

  /**
   * Check if collection types are compatible for casting
   */
  private static areCollectionTypesCompatible(
    source: TypeInfo,
    target: TypeInfo,
    scope: ValidationScope,
  ): boolean {
    // Both must be collections
    if (!source.isCollection || !target.isCollection) {
      return false;
    }

    // Same collection type
    if (source.name === target.name) {
      // Check element type compatibility
      if (source.elementType && target.elementType) {
        return this.isCompatibleForCast(
          source.elementType,
          target.elementType,
          scope,
        );
      }
      return true;
    }

    return false;
  }

  /**
   * Check if Object type is compatible for casting
   */
  private static isObjectTypeCompatible(
    source: TypeInfo,
    target: TypeInfo,
  ): boolean {
    // Object can be cast to any type
    if (source.name === 'Object') {
      return true;
    }

    // Any type can be cast to Object (including primitives like String)
    if (target.name === 'Object') {
      return true;
    }

    return false;
  }

  /** Check whether resolved class/interface hierarchy permits a cast. */
  private static areClassTypesCompatible(
    source: TypeInfo,
    target: TypeInfo,
    scope: ValidationScope,
  ): boolean {
    const semanticScope = scope as ValidationScope & SemanticCastingScope;
    const allSymbols =
      semanticScope.allSymbols ??
      semanticScope.symbolTable?.getAllSymbols?.() ??
      [];
    const sourceSymbol = findResolvedType(source.name, allSymbols);
    const targetSymbol = findResolvedType(target.name, allSymbols);

    // Missing symbols mean the semantic snapshot cannot prove that the cast
    // is invalid. Preserve that uncertainty instead of guessing from names.
    if (!sourceSymbol || !targetSymbol) {
      return true;
    }

    // A cast is possible when either side is assignable to the other: the
    // first direction covers widening casts, and the reverse covers checked
    // downcasts within one resolved hierarchy.
    return (
      isAssignable(source.name, target.name, 'assignment', { allSymbols }) ||
      isAssignable(target.name, source.name, 'assignment', { allSymbols }) ||
      isResolvedSubtype(source.name, target.name, allSymbols) ||
      isResolvedSubtype(target.name, source.name, allSymbols)
    );
  }
}

function findResolvedType(
  typeName: string,
  allSymbols: ApexSymbol[],
): TypeSymbol | undefined {
  const normalizedName = typeName.split('.').pop()?.toLowerCase();
  return allSymbols.find(
    (symbol) =>
      (symbol.kind === SymbolKind.Class ||
        symbol.kind === SymbolKind.Interface ||
        symbol.kind === SymbolKind.Enum) &&
      symbol.name.toLowerCase() === normalizedName,
  ) as TypeSymbol | undefined;
}

function isResolvedSubtype(
  sourceName: string,
  targetName: string,
  allSymbols: ApexSymbol[],
  visited = new Set<string>(),
): boolean {
  const source = findResolvedType(sourceName, allSymbols);
  const normalizedTarget = targetName.split('.').pop()?.toLowerCase();
  if (!source || !normalizedTarget || visited.has(source.name.toLowerCase())) {
    return false;
  }

  visited.add(source.name.toLowerCase());
  const parentNames = [source.superClass, ...source.interfaces].filter(
    (name): name is string => Boolean(name),
  );

  return parentNames.some((parentName) => {
    const normalizedParent = parentName.split('.').pop()?.toLowerCase();
    return (
      normalizedParent === normalizedTarget ||
      isResolvedSubtype(parentName, targetName, allSymbols, visited)
    );
  });
}
