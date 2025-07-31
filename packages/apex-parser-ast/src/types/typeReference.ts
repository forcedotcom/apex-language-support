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
  TYPE_DECLARATION = 1,
  FIELD_ACCESS = 2,
  CONSTRUCTOR_CALL = 3,
  VARIABLE_USAGE = 4,
  PARAMETER_TYPE = 5,
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
  /** Parent method/class context */
  parentContext?: string;
  /** Always false during parsing - used for lazy resolution */
  isResolved: boolean;
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
  ): TypeReference {
    return {
      name: methodName,
      location,
      context: ReferenceContext.METHOD_CALL,
      qualifier,
      parentContext,
      isResolved: false,
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
  ): TypeReference {
    return {
      name: fieldName,
      location,
      context: ReferenceContext.FIELD_ACCESS,
      qualifier: objectName,
      parentContext,
      isResolved: false,
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
  ): TypeReference {
    return {
      name: variableName,
      location,
      context: ReferenceContext.VARIABLE_USAGE,
      parentContext,
      isResolved: false,
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
}
