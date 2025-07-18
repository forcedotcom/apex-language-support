/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Namespace } from '../semantics/namespaces';

/**
 * Interface representing information about an Apex type
 */
export interface TypeInfo {
  /** The fully qualified name of the type */
  name: string;

  /** If this is an array type */
  isArray: boolean;

  /** If this is a collection type (List, Set, Map) */
  isCollection: boolean;

  /** If this is a primitive type (Integer, String, Boolean, etc.) */
  isPrimitive: boolean;

  /** The namespace if applicable */
  namespace?: Namespace;

  /** Generic type parameters if applicable */
  typeParameters?: TypeInfo[];

  /** For Map types, the key type */
  keyType?: TypeInfo;

  /** Original type string as seen in source code */
  originalTypeString: string;

  /**
   * Resolved type if this is a type reference
   * e.g., if there's a type alias or inner class reference
   */
  resolvedType?: TypeInfo;

  /** Source location information */
  location?: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };

  /**
   * Get the namespace of this type
   */
  getNamespace(): Namespace | null;
}

/**
 * Helper function to create a TypeInfo object for a primitive type
 */
export function createPrimitiveType(name: string): TypeInfo {
  return {
    name,
    isArray: false,
    isCollection: false,
    isPrimitive: true,
    originalTypeString: name,
    getNamespace: () => null,
  };
}

/**
 * Helper function to create a TypeInfo object for a collection type
 */
export function createCollectionType(
  name: string,
  typeParameters: TypeInfo[] = [],
): TypeInfo {
  return {
    name,
    isArray: false,
    isCollection: true,
    isPrimitive: false,
    typeParameters,
    originalTypeString: buildTypeString(name, typeParameters),
    getNamespace: () => null,
  };
}

/**
 * Helper function to create a TypeInfo object for an array type
 */
export function createArrayType(elementType: TypeInfo): TypeInfo {
  return {
    name: `${elementType.name}[]`,
    isArray: true,
    isCollection: false,
    isPrimitive: false,
    typeParameters: [elementType],
    originalTypeString: `${elementType.originalTypeString}[]`,
    getNamespace: () => elementType.getNamespace(),
  };
}

/**
 * Helper function to create a TypeInfo object for a Map type
 */
export function createMapType(
  keyType: TypeInfo,
  valueType: TypeInfo,
): TypeInfo {
  return {
    name: 'Map',
    isArray: false,
    isCollection: true,
    isPrimitive: false,
    keyType,
    typeParameters: [valueType],
    originalTypeString: `Map<${keyType.originalTypeString}, ${valueType.originalTypeString}>`,
    getNamespace: () => null,
  };
}

/**
 * Helper function to build type string with generics
 */
function buildTypeString(
  baseName: string,
  typeParameters: TypeInfo[] = [],
): string {
  if (typeParameters.length === 0) {
    return baseName;
  }

  const typeArgs = typeParameters.map((t) => t.originalTypeString).join(', ');
  return `${baseName}<${typeArgs}>`;
}
