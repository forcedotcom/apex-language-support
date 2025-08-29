/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SymbolLocation } from './symbol';

/**
 * Represents the context in which a type reference is used
 */
export enum ReferenceContext {
  METHOD_CALL = 0,
  CLASS_REFERENCE = 1, // For class names in dotted expressions
  TYPE_DECLARATION = 2,
  FIELD_ACCESS = 3,
  CONSTRUCTOR_CALL = 4,
  VARIABLE_USAGE = 5,
  PARAMETER_TYPE = 6,
  // New: declaration reference for variable/field identifiers
  VARIABLE_DECLARATION = 7,
}

/**
 * Represents a type reference captured during parsing
 */
export interface TypeReference {
  /** The referenced name (e.g., "createFile") */
  name: string;
  /** Exact position in source */
  location: SymbolLocation;
  /** How it's being used */
  context: ReferenceContext;
  /** For "FileUtilities.createFile" - the qualifier */
  qualifier?: string;
  /** Precise location of the qualifier token when qualified */
  qualifierLocation?: SymbolLocation;
  /** Precise location of the member token (method/field) when qualified */
  memberLocation?: SymbolLocation;
  /** Parent method/class context */
  parentContext?: string;
  /** Always false during parsing - used for lazy resolution */
  isResolved: boolean;
  /** Optional access semantics for reads/writes (assignments) */
  access?: 'read' | 'write' | 'readwrite';
  /** Optional: indicates a qualified reference (also derivable from qualifier) */
  isQualified?: boolean;
  /** Optional: indicates static access when known from parsing */
  isStatic?: boolean;
  /** Optional: chain metadata for future chained-call handling */
  chainIndex?: number;
  chainLength?: number;
}

/**
 * Factory for creating TypeReference instances
 */
export class TypeReferenceFactory {
  /**
   * Create a method call reference
   */
  static createMethodCallReference(
    methodName: string,
    location: SymbolLocation,
    qualifier?: string,
    parentContext?: string,
    qualifierLocation?: SymbolLocation,
    isStatic?: boolean,
  ): TypeReference {
    return {
      name: methodName,
      location,
      context: ReferenceContext.METHOD_CALL,
      qualifier,
      parentContext,
      isResolved: false,
      qualifierLocation,
      memberLocation: location,
      isQualified: !!qualifier,
      isStatic,
    };
  }

  /**
   * Create a type declaration reference
   */
  static createTypeDeclarationReference(
    typeName: string,
    location: SymbolLocation,
    parentContext?: string,
  ): TypeReference {
    return {
      name: typeName,
      location,
      context: ReferenceContext.TYPE_DECLARATION,
      parentContext,
      isResolved: false,
    };
  }

  /**
   * Create a field access reference
   */
  static createFieldAccessReference(
    fieldName: string,
    location: SymbolLocation,
    objectName: string,
    parentContext?: string,
    access?: 'read' | 'write' | 'readwrite',
    qualifierLocation?: SymbolLocation,
  ): TypeReference {
    return {
      name: fieldName,
      location,
      context: ReferenceContext.FIELD_ACCESS,
      qualifier: objectName,
      parentContext,
      isResolved: false,
      access,
      qualifierLocation,
      memberLocation: location,
      isQualified: true,
    };
  }

  /**
   * Create a constructor call reference
   */
  static createConstructorCallReference(
    typeName: string,
    location: SymbolLocation,
    parentContext?: string,
  ): TypeReference {
    return {
      name: typeName,
      location,
      context: ReferenceContext.CONSTRUCTOR_CALL,
      parentContext,
      isResolved: false,
    };
  }

  /**
   * Create a variable usage reference
   */
  static createVariableUsageReference(
    variableName: string,
    location: SymbolLocation,
    parentContext?: string,
    access?: 'read' | 'write' | 'readwrite',
  ): TypeReference {
    return {
      name: variableName,
      location,
      context: ReferenceContext.VARIABLE_USAGE,
      parentContext,
      isResolved: false,
      access,
    };
  }

  /**
   * Create a parameter type reference
   */
  static createParameterTypeReference(
    typeName: string,
    location: SymbolLocation,
    parentContext?: string,
  ): TypeReference {
    return {
      name: typeName,
      location,
      context: ReferenceContext.PARAMETER_TYPE,
      parentContext,
      isResolved: false,
    };
  }

  /**
   * Create a class reference (for dotted expressions like FileUtilities.createFile)
   */
  static createClassReference(
    className: string,
    location: SymbolLocation,
    parentContext?: string,
  ): TypeReference {
    return {
      name: className,
      location,
      context: ReferenceContext.CLASS_REFERENCE,
      parentContext,
      isResolved: false,
    };
  }

  /**
   * Create a variable/field declaration reference for the identifier token
   */
  static createVariableDeclarationReference(
    variableName: string,
    location: SymbolLocation,
    parentContext?: string,
  ): TypeReference {
    return {
      name: variableName,
      location,
      context: ReferenceContext.VARIABLE_DECLARATION,
      parentContext,
      isResolved: false,
    };
  }
}
